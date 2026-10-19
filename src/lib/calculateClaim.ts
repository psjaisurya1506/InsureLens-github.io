// Financial Calculation Engine for InsureLens
// IMPORTANT: All AI extraction happens before this function.
// This module performs deterministic, rule-based financial calculations only.
// Results are clearly labelled as ESTIMATES.

import { PolicyData, BillData, ClaimCalculationResult, DeductionItem } from '@/types';

export interface CalculationInput {
  bill: BillData;
  policy: PolicyData;
  treatmentCategory?: string;
}

/**
 * Main claim calculation function.
 * Applies insurance rules deterministically in this order:
 * 1. Identify non-admissible expenses
 * 2. Apply treatment-specific limits
 * 3. Apply room-rent restrictions
 * 4. Apply annual deductible
 * 5. Apply co-payment
 */
export function calculateClaim(input: CalculationInput): ClaimCalculationResult {
  const { bill, policy } = input;
  const deductions: DeductionItem[] = [];
  const warnings: string[] = [];
  const confidenceFlags: string[] = [];

  // Normalize external/document-derived numbers before calculating. OCR and manual
  // inputs can be missing, negative, or non-finite; never let them produce NaN.
  const safeMoney = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const totalBill = safeMoney(bill.totalBill);
  let workingAmount = totalBill;

  // Step 1: Non-admissible expenses
  const nonAdmissibleAmount = Math.min(safeMoney(policy.nonAdmissibleExpenses), workingAmount);
  if (nonAdmissibleAmount > 0) {
    workingAmount -= nonAdmissibleAmount;
    deductions.push({
      label: 'Non-admissible Expenses',
      amount: nonAdmissibleAmount,
      reason: `Certain expenses in your bill are not covered under the available policy terms. These typically include registration/admission charges, attendant charges, over-the-counter medicines, and administrative fees.`,
      policyReference: policy.policyClauses.find(c => c.rule === 'Non-admissible Expenses')?.clause || 'Section 7.1',
      clauseText: policy.policyClauses.find(c => c.rule === 'Non-admissible Expenses')?.explanation || 'Non-admissible expenses as per policy terms.',
      category: 'non_admissible',
    });
  }

  // Step 2: Treatment limits
  const treatmentLimitClause = policy.policyClauses.find(c => c.rule === 'Treatment Limit');
  if (safeMoney(policy.treatmentLimit) > 0 && safeMoney(bill.procedure) > policy.treatmentLimit) {
    const excess = safeMoney(bill.procedure) - policy.treatmentLimit;
    const treatmentDeduction = Math.min(excess, workingAmount);
    workingAmount -= treatmentDeduction;
    deductions.push({
      label: 'Treatment Sub-limit Deduction',
      amount: treatmentDeduction,
      reason: `Your policy applies a specific sub-limit for this type of procedure. The total procedure cost exceeded the policy sub-limit of ${formatCurrency(policy.treatmentLimit)}, resulting in this deduction.`,
      policyReference: treatmentLimitClause?.clause || 'Section 5.3',
      clauseText: treatmentLimitClause?.explanation || `Treatment sub-limit of ${formatCurrency(policy.treatmentLimit)} applies.`,
      category: 'treatment_limit',
    });
    confidenceFlags.push('Treatment category classification is an estimate based on available bill information');
  }

  // Step 3: Room rent restrictions
  const roomRentClause = policy.policyClauses.find(c => c.rule === 'Room Rent Limit');
  if (safeMoney(policy.roomRentLimit) > 0 && safeMoney(bill.roomCharges) > 0) {
    // Estimate days from room charges
    const estimatedDays = bill.admissionDate && bill.dischargeDate
      ? Math.max(1, daysBetween(bill.admissionDate, bill.dischargeDate))
      : Math.ceil(bill.roomCharges / 6000); // estimate 1 day per ₹6000
    
    const allowedRoomTotal = policy.roomRentLimit * estimatedDays;
    if (bill.roomCharges > allowedRoomTotal) {
      const roomExcess = bill.roomCharges - allowedRoomTotal;
      // Room rent excess also causes proportionate reduction in other expenses
      const roomRentDeduction = Math.min(roomExcess, workingAmount);
      workingAmount -= roomRentDeduction;
      warnings.push(`Room rent exceeds policy limit of ${formatCurrency(policy.roomRentLimit)}/day. Proportionate deductions may apply to other charges.`);
      deductions.push({
        label: 'Room Rent Limit Deduction',
        amount: roomRentDeduction,
        reason: `Your policy restricts room rent to ${formatCurrency(policy.roomRentLimit)} per day. The actual room charges exceed this limit. Under most policies, this also results in proportionate reduction of associated charges.`,
        policyReference: roomRentClause?.clause || 'Section 6.1',
        clauseText: roomRentClause?.explanation || `Room rent limit of ${formatCurrency(policy.roomRentLimit)} per day applies.`,
        category: 'room_rent',
      });
    }
  }

  // Step 4: Annual deductible
  const deductibleClause = policy.policyClauses.find(c => c.rule === 'Deductible');
  if (safeMoney(policy.deductible) > 0) {
    const deductibleApplied = Math.min(safeMoney(policy.deductible), workingAmount);
    workingAmount -= deductibleApplied;
    deductions.push({
      label: 'Annual Deductible',
      amount: deductibleApplied,
      reason: `Your policy has an annual deductible of ${formatCurrency(policy.deductible)}. This is the amount you must pay each policy year before the insurance contribution begins. The deductible is applied once per policy year regardless of the number of claims.`,
      policyReference: deductibleClause?.clause || 'Section 3.1',
      clauseText: deductibleClause?.explanation || `Annual deductible of ${formatCurrency(policy.deductible)} applies.`,
      category: 'deductible',
    });
  }

  // Step 5: Co-payment
  const copayClause = policy.policyClauses.find(c => c.rule === 'Co-payment');
  const copayPercentage = Math.min(100, safeMoney(policy.copayPercentage));
  if (copayPercentage > 0) {
    const copayAmount = Math.min(workingAmount, Math.round(workingAmount * (copayPercentage / 100)));
    workingAmount -= copayAmount;
    deductions.push({
      label: `Co-payment (${copayPercentage}%)`,
      amount: copayAmount,
      reason: `Your policy contains a ${copayPercentage}% co-payment clause. This means you are responsible for ${copayPercentage}% of all admissible expenses, regardless of the claim amount.`,
      policyReference: copayClause?.clause || 'Section 4.2',
      clauseText: copayClause?.explanation || `A ${copayPercentage}% co-payment applies to all admissible expenses.`,
      category: 'copay',
    });
  }

  // Check remaining sum insured
  const remainingCoverage = Math.max(0, safeMoney(policy.sumInsured) - safeMoney(policy.previousUtilization));
  const actualInsuranceContribution = Math.min(workingAmount, remainingCoverage);

  if (workingAmount > remainingCoverage) {
    const coverageShortfall = workingAmount - remainingCoverage;
    deductions.push({
      label: 'Sum Insured Exhaustion',
      amount: coverageShortfall,
      reason: `The estimated insurance contribution exceeds your remaining sum insured of ${formatCurrency(remainingCoverage)}. Previous claims of ${formatCurrency(policy.previousUtilization)} have reduced your available coverage.`,
      policyReference: 'Policy Schedule',
      clauseText: 'The maximum liability of the insurer shall not exceed the Sum Insured as stated in the Policy Schedule.',
      category: 'treatment_limit',
    });
    warnings.push(`Remaining coverage (${formatCurrency(remainingCoverage)}) may be insufficient to cover the full estimated insurance contribution.`);
  }

  // Add clarification item for uncertain amounts
  const otherExpenses = safeMoney(bill.other);
  const clarificationAmount = Math.max(0, otherExpenses * 0.3);
  if (clarificationAmount > 0) {
    deductions.push({
      label: 'Needs Clarification',
      amount: clarificationAmount,
      reason: 'Some charges in the bill could not be definitively classified based on available policy information. These may be covered or excluded depending on insurer/TPA review.',
      policyReference: 'Refer insurer for review',
      clauseText: 'These items require review by the insurer/TPA to determine admissibility.',
      category: 'clarification',
    });
    confidenceFlags.push('Some expense categories could not be definitively classified');
    warnings.push('Final settlement subject to TPA/insurer review and document verification.');
  }

  // The patient and insurer portions must never exceed the bill in aggregate.
  // Deductions are explanatory line items and can overlap; do not sum them as a
  // second financial total.
  const estimatedInsuranceContribution = Math.min(totalBill, actualInsuranceContribution);
  const estimatedPatientContribution = Math.max(0, totalBill - estimatedInsuranceContribution);

  return {
    totalBill,
    admissibleAmount: Math.max(0, totalBill - nonAdmissibleAmount),
    estimatedInsuranceContribution,
    estimatedPatientContribution,
    financialGap: estimatedPatientContribution,
    deductions,
    warnings,
    confidenceFlags,
    remainingCoverage,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function daysBetween(start: string, end: string): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return 1;
  }
  // Same-day admission/discharge is still at least one billable room day.
  return Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)));
}

export function formatIndianCurrency(amount: number): string {
  // Format as ₹X,XX,XXX (Indian number format)
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    if (Number.isInteger(lakhs)) {
      return `₹${lakhs} Lakh`;
    }
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
