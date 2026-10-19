// Turns the stored policies and claims into plain-language alerts.
import { StoredClaim, StoredPolicy, policyUsed } from '@/lib/store';

export interface Insight {
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  href?: string;
}

const INR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const DAY = 86400000;

export function daysUntil(date: string, now: Date): number {
  const t = new Date(date).getTime();
  return Number.isFinite(t) ? Math.ceil((t - now.getTime()) / DAY) : NaN;
}

export function buildInsights(policies: StoredPolicy[], claims: StoredClaim[], now: Date): Insight[] {
  const out: Insight[] = [];
  for (const p of policies) {
    const used = policyUsed(p.id, claims);
    const left = Math.max(0, p.sumInsured - used);
    const leftPct = p.sumInsured > 0 ? left / p.sumInsured : 0;
    if (leftPct <= 0.1) out.push({ level: 'critical', title: `${p.name}: cover almost exhausted`, message: `Only ${INR(left)} (${Math.round(leftPct * 100)}%) of ${INR(p.sumInsured)} is left. Check the Hospital Planner before any admission.`, href: '/dashboard/hospitals' });
    else if (leftPct <= 0.25) out.push({ level: 'warning', title: `${p.name}: cover running low`, message: `${INR(left)} left (${Math.round(leftPct * 100)}%). A large admission could use most of it.`, href: '/dashboard/hospitals' });

    const d = daysUntil(p.validTo, now);
    if (Number.isFinite(d)) {
      if (d < 0) out.push({ level: 'critical', title: `${p.name}: policy expired`, message: `This policy ended on ${p.validTo}. Renew it before planning an admission.`, href: '/dashboard/manage' });
      else if (d <= 60) out.push({ level: 'warning', title: `${p.name}: expires in ${d} day${d === 1 ? '' : 's'}`, message: `Valid until ${p.validTo}. Cover resets on renewal, and waiting periods may apply to a new policy.`, href: '/dashboard/manage' });
    }
  }
  for (const c of claims) {
    if (c.status === 'Needs Clarification') out.push({ level: 'info', title: `Claim needs clarification: ${c.hospital}`, message: `${c.treatment} (${c.date}) is waiting on information for the insurer/TPA.`, href: '/dashboard/manage' });
  }
  const order = { critical: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

export function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
