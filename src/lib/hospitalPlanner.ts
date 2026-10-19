// Pre-admission planner: estimates, BEFORE admission, how much of a hospital's
// expected bill the policy will pay, what is left of the sum insured afterwards,
// and which billing areas the claim will be spread over.
// All figures are illustrative estimates built on the deterministic calculateClaim engine.

import { BillData, PolicyData, ClaimCalculationResult } from '@/types';
import { calculateClaim } from '@/lib/calculateClaim';

export type AreaKey = 'room' | 'doctor' | 'medicines' | 'diagnostics' | 'procedure' | 'consumables' | 'other';

export const AREA_LABELS: Record<AreaKey, string> = {
  room: 'Room & nursing',
  doctor: 'Doctor / surgeon fees',
  medicines: 'Medicines',
  diagnostics: 'Diagnostics & lab',
  procedure: 'Procedure / OT',
  consumables: 'Consumables & implants',
  other: 'Other charges',
};

export interface Treatment {
  key: string;
  label: string;
  days: number;
  /** Waiting period in days, counted from the policy inception date. Missing/0 = none. */
  waitingDays?: number;
  /** false = excluded from standard health policies (always not eligible). Missing = covered. */
  covered?: boolean;
}

export const DEFAULT_TREATMENTS: Treatment[] = [
  { key: 'knee', label: 'Knee Replacement Surgery', days: 5, waitingDays: 730 },
  { key: 'appendectomy', label: 'Appendectomy (Laparoscopic)', days: 2, waitingDays: 30 },
  { key: 'cataract', label: 'Cataract Surgery (per eye)', days: 1, waitingDays: 730 },
  { key: 'cholecystectomy', label: 'Gallbladder Removal', days: 3, waitingDays: 730 },
  { key: 'angioplasty', label: 'Angioplasty (1 stent)', days: 3 },
  { key: 'hernia', label: 'Hernia Repair', days: 2, waitingDays: 365 },
  { key: 'rhinoplasty', label: 'Cosmetic Rhinoplasty', days: 1, covered: false },
];
export const TREATMENTS = DEFAULT_TREATMENTS;

export interface Hospital {
  id: string;
  name: string;
  city: string;
  network: boolean; // cashless network hospital
  /** false = hidden from every estimate (kept on file). Missing = active. */
  active?: boolean;
  roomPerDay: number;
  /** Expected bill by area per treatment, at this hospital (room is per-day, others are totals) */
  /** Missing treatment = no price data; the hospital is skipped for that treatment. */
  prices: Record<string, Omit<Record<AreaKey, number>, 'room'>>;
}

export const DEFAULT_HOSPITALS: Hospital[] = [
  {
    id: 'h1', name: 'Apollo Hospitals', city: 'Chennai', network: true, roomPerDay: 7500,
    prices: {
      knee: { doctor: 70000, medicines: 60000, diagnostics: 30000, procedure: 100000, consumables: 90000, other: 20000 },
      appendectomy: { doctor: 20000, medicines: 12000, diagnostics: 10000, procedure: 40000, consumables: 8000, other: 5000 },
      cataract: { doctor: 8000, medicines: 3000, diagnostics: 4000, procedure: 30000, consumables: 6000, other: 2000 },
      cholecystectomy: { doctor: 22000, medicines: 14000, diagnostics: 12000, procedure: 50000, consumables: 10000, other: 6000 },
      angioplasty: { doctor: 60000, medicines: 30000, diagnostics: 25000, procedure: 110000, consumables: 180000, other: 10000 },
      hernia: { doctor: 22000, medicines: 9000, diagnostics: 8000, procedure: 45000, consumables: 14000, other: 5000 },
      rhinoplasty: { doctor: 60000, medicines: 8000, diagnostics: 6000, procedure: 120000, consumables: 15000, other: 5000 },
    },
  },
  {
    id: 'h2', name: 'Fortis Healthcare', city: 'Chennai', network: true, roomPerDay: 5500,
    prices: {
      knee: { doctor: 60000, medicines: 50000, diagnostics: 25000, procedure: 85000, consumables: 70000, other: 15000 },
      appendectomy: { doctor: 17000, medicines: 10000, diagnostics: 8000, procedure: 35000, consumables: 6000, other: 4000 },
      cataract: { doctor: 6000, medicines: 2500, diagnostics: 3000, procedure: 24000, consumables: 5000, other: 1500 },
      cholecystectomy: { doctor: 18000, medicines: 12000, diagnostics: 10000, procedure: 42000, consumables: 8000, other: 5000 },
      angioplasty: { doctor: 50000, medicines: 26000, diagnostics: 22000, procedure: 95000, consumables: 150000, other: 8000 },
      hernia: { doctor: 18000, medicines: 8000, diagnostics: 7000, procedure: 38000, consumables: 11000, other: 4000 },
      rhinoplasty: { doctor: 50000, medicines: 7000, diagnostics: 5000, procedure: 100000, consumables: 12000, other: 4000 },
    },
  },
  {
    id: 'h3', name: 'Max Super Speciality', city: 'Chennai', network: true, roomPerDay: 4800,
    prices: {
      knee: { doctor: 55000, medicines: 45000, diagnostics: 22000, procedure: 80000, consumables: 60000, other: 12000 },
      appendectomy: { doctor: 15000, medicines: 9000, diagnostics: 7000, procedure: 32000, consumables: 5000, other: 3500 },
      cataract: { doctor: 5500, medicines: 2000, diagnostics: 2500, procedure: 20000, consumables: 4500, other: 1200 },
      cholecystectomy: { doctor: 16000, medicines: 11000, diagnostics: 9000, procedure: 38000, consumables: 7000, other: 4500 },
      angioplasty: { doctor: 46000, medicines: 24000, diagnostics: 20000, procedure: 88000, consumables: 140000, other: 7000 },
      hernia: { doctor: 16000, medicines: 7000, diagnostics: 6500, procedure: 34000, consumables: 9500, other: 3500 },
      rhinoplasty: { doctor: 45000, medicines: 6000, diagnostics: 4500, procedure: 90000, consumables: 10000, other: 3500 },
    },
  },
  {
    id: 'h4', name: 'City Care Hospital', city: 'Chennai', network: false, roomPerDay: 3500,
    prices: {
      knee: { doctor: 45000, medicines: 38000, diagnostics: 18000, procedure: 70000, consumables: 55000, other: 10000 },
      appendectomy: { doctor: 12000, medicines: 7000, diagnostics: 6000, procedure: 26000, consumables: 4000, other: 3000 },
      cataract: { doctor: 4500, medicines: 1800, diagnostics: 2000, procedure: 16000, consumables: 3500, other: 1000 },
      cholecystectomy: { doctor: 13000, medicines: 9000, diagnostics: 7500, procedure: 30000, consumables: 6000, other: 3500 },
      angioplasty: { doctor: 38000, medicines: 20000, diagnostics: 16000, procedure: 75000, consumables: 120000, other: 6000 },
      hernia: { doctor: 13000, medicines: 6000, diagnostics: 5000, procedure: 28000, consumables: 8000, other: 3000 },
      rhinoplasty: { doctor: 38000, medicines: 5000, diagnostics: 4000, procedure: 75000, consumables: 8000, other: 3000 },
    },
  },
];

export interface AreaRow {
  area: AreaKey;
  label: string;
  billed: number;
  covered: number;
  youPay: number;
  note: string;
}

export interface HospitalEstimate {
  hospital: Hospital;
  bill: BillData;
  result: ClaimCalculationResult;
  covered: number;
  youPay: number;
  remainingAfter: number;
  /** Share of currently remaining cover this admission would consume (0–1) */
  usageOfRemaining: number;
  areas: AreaRow[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function estimateHospital(h: Hospital, t: Treatment, policy: PolicyData): HospitalEstimate {
  const p = h.prices[t.key];
  const roomCharges = h.roomPerDay * t.days;
  const base = { room: roomCharges, ...p } as Record<AreaKey, number>;
  const totalBill = sum(Object.values(base));

  // Consumables + other are treated as the non-admissible bucket for estimation.
  const nonAdm = Math.round(base.consumables * 0.2 + base.other * 0.5);
  const hospitalPolicy: PolicyData = { ...policy, nonAdmissibleExpenses: nonAdm };

  const bill: BillData = {
    totalBill,
    hospitalName: h.name,
    treatment: t.label,
    roomCharges,
    doctorCharges: base.doctor,
    medicines: base.medicines,
    diagnostics: base.diagnostics,
    procedure: base.procedure,
    consumables: base.consumables,
    other: base.other,
    admissionDate: '2026-01-01',
    dischargeDate: `2026-01-${String(1 + t.days).padStart(2, '0')}`,
  };

  const result = calculateClaim({ bill, policy: hospitalPolicy });

  // Per-area view: apply area-level rules, then scale so rows add up to the engine's total.
  const roomAllowed = Math.min(roomCharges, policy.roomRentLimit * t.days);
  const procAllowed = policy.treatmentLimit > 0 ? Math.min(base.procedure, policy.treatmentLimit) : base.procedure;
  const eligible: Record<AreaKey, number> = {
    room: roomAllowed,
    doctor: base.doctor,
    medicines: base.medicines,
    diagnostics: base.diagnostics,
    procedure: procAllowed,
    consumables: base.consumables * 0.8,
    other: base.other * 0.5,
  };
  const eligibleTotal = sum(Object.values(eligible)) || 1;
  const scale = result.estimatedInsuranceContribution / eligibleTotal;

  const notes: Record<AreaKey, string> = {
    room: roomCharges > roomAllowed ? `Capped at ${policy.roomRentLimit.toLocaleString('en-IN')}/day` : 'Within room-rent limit',
    doctor: 'Covered, after co-pay',
    medicines: 'Covered, after co-pay',
    diagnostics: 'Covered, after co-pay',
    procedure: base.procedure > procAllowed ? 'Capped at treatment sub-limit' : 'Within sub-limit',
    consumables: '~20% non-admissible items',
    other: '~50% non-admissible items',
  };

  const areas: AreaRow[] = (Object.keys(base) as AreaKey[]).map((area) => {
    const covered = Math.round(eligible[area] * scale);
    return { area, label: AREA_LABELS[area], billed: base[area], covered, youPay: Math.max(0, base[area] - covered), note: notes[area] };
  });

  const remaining = result.remainingCoverage;
  return {
    hospital: h,
    bill,
    result,
    covered: result.estimatedInsuranceContribution,
    youPay: result.estimatedPatientContribution,
    remainingAfter: Math.max(0, remaining - result.estimatedInsuranceContribution),
    usageOfRemaining: remaining > 0 ? result.estimatedInsuranceContribution / remaining : 1,
    areas,
  };
}

export function compareHospitals(t: Treatment, policy: PolicyData, hospitals: Hospital[] = DEFAULT_HOSPITALS): HospitalEstimate[] {
  return hospitals
    .filter((h) => h.active !== false && h.prices[t.key])
    .map((h) => estimateHospital(h, t, policy))
    .sort((a, b) => a.youPay - b.youPay);
}
