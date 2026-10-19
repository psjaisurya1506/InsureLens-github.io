// Eligibility analysis: decides, for one treatment at one hospital under one policy,
// whether the patient is ELIGIBLE, ELIGIBLE WITH LIMITS, or NOT ELIGIBLE, and lists every
// check that led to that verdict. Pure functions only (no browser access) so results are
// deterministic and easy to test. Like the rest of InsureLens these are estimates, not an
// insurer decision.

import type { HospitalEstimate } from '@/lib/hospitalPlanner';
import type { Treatment } from '@/lib/hospitalPlanner';
import type { StoredPolicy } from '@/lib/store';

export type Verdict = 'eligible' | 'partial' | 'not_eligible';
export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface EligibilityCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** A "material" warning means part of the bill will not be paid, so the verdict becomes "eligible with limits". */
  material?: boolean;
}

export interface EligibilityReport {
  verdict: Verdict;
  headline: string;
  checks: EligibilityCheck[];
  /** Share of the bill the insurer is expected to pay, 0–100. */
  coveragePct: number;
}

const DAY = 86400000;

export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

/** Parses YYYY-MM-DD as a local-time date at 00:00. Returns NaN-time Date when invalid. */
function parseDay(s: string | undefined): Date {
  if (!s) return new Date(NaN);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(NaN);
}
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Local YYYY-MM-DD (toISOString would shift the day in time zones ahead of UTC). */
const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Checks that depend only on the policy and the treatment (identical for every hospital).
 * Kept separate so the page can explain a blanket "not eligible" once instead of per hospital.
 */
export function policyLevelChecks(t: Treatment, policy: StoredPolicy, used: number, now: Date): EligibilityCheck[] {
  const today = startOfDay(now);
  const checks: EligibilityCheck[] = [];

  // 1. Is the policy in force?
  const from = parseDay(policy.validFrom);
  const to = parseDay(policy.validTo);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
    checks.push({ id: 'period', label: 'Policy period', status: 'fail', detail: 'The policy start or end date is missing or invalid. Fix it in Policies & Claims.' });
  } else if (today < from) {
    checks.push({ id: 'period', label: 'Policy period', status: 'fail', detail: `The policy starts on ${policy.validFrom}, so it does not cover admissions today.` });
  } else if (today > to) {
    checks.push({ id: 'period', label: 'Policy period', status: 'fail', detail: `The policy expired on ${policy.validTo}. Renew it before admission.` });
  } else {
    const stayEnd = addDays(today, Math.max(0, t.days - 1));
    if (stayEnd > to) {
      checks.push({ id: 'period', label: 'Policy period', status: 'warn', detail: `Policy is active, but a ${t.days}-day stay would run past its end date (${policy.validTo}). Confirm continuity of cover with your insurer.` });
    } else {
      checks.push({ id: 'period', label: 'Policy period', status: 'pass', detail: `Policy is active (${policy.validFrom} to ${policy.validTo}).` });
    }
  }

  // 2. Is the treatment covered at all?
  if (t.covered === false) {
    checks.push({ id: 'covered', label: 'Treatment covered', status: 'fail', detail: `${t.label} is marked as excluded from standard health policies.` });
  } else {
    checks.push({ id: 'covered', label: 'Treatment covered', status: 'pass', detail: 'Not listed as an excluded treatment.' });
  }

  // 3. Waiting period
  const wait = Math.max(0, Math.round(t.waitingDays ?? 0));
  if (wait > 0) {
    const inception = parseDay(policy.inceptionDate || policy.validFrom);
    if (!Number.isFinite(inception.getTime())) {
      checks.push({ id: 'waiting', label: 'Waiting period', status: 'warn', detail: `A ${wait}-day waiting period applies but the policy start date is unknown, so it cannot be verified.` });
    } else {
      const elapsed = Math.floor((today.getTime() - inception.getTime()) / DAY);
      if (elapsed < wait) {
        const eligibleOn = addDays(inception, wait);
        checks.push({ id: 'waiting', label: 'Waiting period', status: 'fail', detail: `${wait}-day waiting period not complete (${Math.max(0, elapsed)} days served). Cover for this treatment starts on ${localIso(eligibleOn)}.` });
      } else {
        checks.push({ id: 'waiting', label: 'Waiting period', status: 'pass', detail: `${wait}-day waiting period completed (${elapsed} days since ${localIso(inception)}).` });
      }
    }
  } else {
    checks.push({ id: 'waiting', label: 'Waiting period', status: 'pass', detail: 'No waiting period applies to this treatment.' });
  }

  // 4. Any cover left?
  const remaining = Math.max(0, policy.sumInsured - used);
  if (remaining <= 0) {
    checks.push({ id: 'cover', label: 'Sum insured available', status: 'fail', detail: `The sum insured of ${inr(policy.sumInsured)} is fully used.` });
  } else {
    checks.push({ id: 'cover', label: 'Sum insured available', status: 'pass', detail: `${inr(remaining)} of ${inr(policy.sumInsured)} is still available.` });
  }

  return checks;
}

/** Full analysis of one hospital estimate. */
export function assessEligibility(est: HospitalEstimate, t: Treatment, policy: StoredPolicy, used: number, now: Date): EligibilityReport {
  const checks: EligibilityCheck[] = policyLevelChecks(t, policy, used, now);
  const bill = est.result.totalBill;
  const covered = est.covered;
  const youPay = est.youPay;
  const remaining = est.result.remainingCoverage;
  const coveragePct = bill > 0 ? Math.round((covered / bill) * 100) : 0;

  // 5. Does the bill fit in the remaining cover?
  const shortfall = est.result.deductions.find((d) => d.label === 'Sum Insured Exhaustion')?.amount ?? 0;
  if (remaining > 0) {
    if (shortfall > 0) {
      checks.push({ id: 'fits', label: 'Bill fits remaining cover', status: 'warn', material: true, detail: `The payable amount exceeds your remaining cover by about ${inr(shortfall)}; you would pay that part yourself.` });
    } else {
      checks.push({ id: 'fits', label: 'Bill fits remaining cover', status: 'pass', detail: `The insurer's share (${inr(covered)}) is within your remaining cover (${inr(remaining)}).` });
    }
  }

  // 6. Room rent limit
  if (policy.roomRentLimit > 0 && est.hospital.roomPerDay > policy.roomRentLimit) {
    checks.push({ id: 'room', label: 'Room rent limit', status: 'warn', material: true, detail: `Room costs ${inr(est.hospital.roomPerDay)}/day here but the policy allows ${inr(policy.roomRentLimit)}/day, so room charges are capped.` });
  } else {
    checks.push({ id: 'room', label: 'Room rent limit', status: 'pass', detail: `Room rent (${inr(est.hospital.roomPerDay)}/day) is within the policy limit.` });
  }

  // 7. Procedure sub-limit
  const proc = est.bill.procedure;
  if (policy.treatmentLimit > 0 && proc > policy.treatmentLimit) {
    checks.push({ id: 'sublimit', label: 'Procedure sub-limit', status: 'warn', material: true, detail: `Procedure charges of ${inr(proc)} exceed the policy sub-limit of ${inr(policy.treatmentLimit)}.` });
  } else {
    checks.push({ id: 'sublimit', label: 'Procedure sub-limit', status: 'pass', detail: 'Procedure charges are within the sub-limit.' });
  }

  // 8. Is anything actually payable?
  if (covered <= 0) {
    checks.push({ id: 'payable', label: 'Insurer payable amount', status: 'fail', detail: `After deductible, co-pay and limits the insurer is expected to pay nothing (bill ${inr(bill)}).` });
  } else {
    checks.push({ id: 'payable', label: 'Insurer payable amount', status: 'pass', detail: `The insurer is expected to pay about ${inr(covered)} (${coveragePct}% of the bill).` });
  }

  // 9. How big is your own share?
  const copay = policy.copayPercentage > 0 ? ` Includes a ${policy.copayPercentage}% co-pay` + (policy.deductible > 0 ? ' and deductible.' : '.') : '';
  if (bill > 0 && youPay / bill > 0.5 && covered > 0) {
    checks.push({ id: 'oop', label: 'Your share of the bill', status: 'warn', material: true, detail: `You would pay about ${inr(youPay)} (${100 - coveragePct}% of the bill).${copay}` });
  } else {
    checks.push({ id: 'oop', label: 'Your share of the bill', status: 'pass', detail: `You would pay about ${inr(youPay)} (${Math.max(0, 100 - coveragePct)}% of the bill).${copay}` });
  }

  // 10. Cashless or reimbursement (advisory only)
  if (est.hospital.network) {
    checks.push({ id: 'network', label: 'Cashless facility', status: 'pass', detail: 'Network hospital: cashless admission is available.' });
  } else {
    checks.push({ id: 'network', label: 'Cashless facility', status: 'warn', detail: 'Non-network hospital: you pay upfront and claim by reimbursement.' });
  }

  const firstFail = checks.find((c) => c.status === 'fail');
  const material = checks.filter((c) => c.status === 'warn' && c.material);
  let verdict: Verdict;
  let headline: string;
  if (firstFail) {
    verdict = 'not_eligible';
    headline = firstFail.detail;
  } else if (material.length > 0) {
    verdict = 'partial';
    headline = `Eligible with limits: the insurer pays about ${inr(covered)} (${coveragePct}%); ${material.length} limit${material.length === 1 ? '' : 's'} reduce${material.length === 1 ? 's' : ''} the payout.`;
  } else {
    verdict = 'eligible';
    headline = `Eligible: the insurer is expected to pay about ${inr(covered)} (${coveragePct}%).`;
  }
  return { verdict, headline, checks, coveragePct };
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  eligible: 'Eligible',
  partial: 'Eligible with limits',
  not_eligible: 'Not eligible',
};

export const VERDICT_STYLE: Record<Verdict, { bg: string; fg: string; border: string }> = {
  eligible: { bg: '#F0FDF4', fg: '#15803D', border: '#BBF7D0' },
  partial: { bg: '#FFFBEB', fg: '#B45309', border: '#FDE68A' },
  not_eligible: { bg: '#FEF2F2', fg: '#B91C1C', border: '#FECACA' },
};

export interface OverallSummary {
  verdict: Verdict;
  headline: string;
  counts: Record<Verdict, number>;
  total: number;
  minBill: number;
  maxBill: number;
  avgBill: number;
  /** Id of the hospital with the lowest out-of-pocket among those that are not "not eligible". */
  bestHospitalId: string | null;
}

/** Rolls individual hospital reports up into one answer for the selected treatment. */
export function summarize(items: { est: HospitalEstimate; report: EligibilityReport }[]): OverallSummary {
  const counts: Record<Verdict, number> = { eligible: 0, partial: 0, not_eligible: 0 };
  items.forEach((i) => { counts[i.report.verdict] += 1; });
  const bills = items.map((i) => i.est.result.totalBill);
  const minBill = bills.length ? Math.min(...bills) : 0;
  const maxBill = bills.length ? Math.max(...bills) : 0;
  const avgBill = bills.length ? Math.round(bills.reduce((a, b) => a + b, 0) / bills.length) : 0;

  const ok = items.filter((i) => i.report.verdict !== 'not_eligible').sort((a, b) => a.est.youPay - b.est.youPay);
  const best = ok[0] ?? null;
  let verdict: Verdict;
  let headline: string;
  if (items.length === 0) {
    verdict = 'not_eligible';
    headline = 'No hospital matches these filters, so no estimate could be made.';
  } else if (!best) {
    verdict = 'not_eligible';
    headline = `Not eligible: ${items[0].report.headline}`;
  } else if (counts.eligible > 0) {
    verdict = 'eligible';
    headline = `Eligible at ${counts.eligible + counts.partial} of ${items.length} hospital${items.length === 1 ? '' : 's'}. Lowest out-of-pocket: ${best.est.hospital.name} (about ${inr(best.est.youPay)}).`;
  } else {
    verdict = 'partial';
    headline = `Eligible with limits at ${counts.partial} of ${items.length} hospital${items.length === 1 ? '' : 's'}. Lowest out-of-pocket: ${best.est.hospital.name} (about ${inr(best.est.youPay)}).`;
  }
  return { verdict, headline, counts, total: items.length, minBill, maxBill, avgBill, bestHospitalId: best ? best.est.hospital.id : null };
}
