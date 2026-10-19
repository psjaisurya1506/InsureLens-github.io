'use client';

// Local (browser) store for the client's insurance policies and claims.
// Kept in localStorage so the app works on static hosting (GitHub Pages / Vercel)
// without a backend. Swap these functions for API/Supabase calls later.

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { DEFAULT_HOSPITALS, DEFAULT_TREATMENTS } from '@/lib/hospitalPlanner';
import type { AreaKey, Hospital, Treatment } from '@/lib/hospitalPlanner';
import type { PolicyData } from '@/types';

export type ClaimStatus = 'Settled' | 'In Progress' | 'Needs Clarification' | 'Rejected';

export interface StoredPolicy {
  id: string;
  name: string;
  insurer: string;
  holder: string;
  sumInsured: number;
  copayPercentage: number;
  deductible: number;
  roomRentLimit: number;
  treatmentLimit: number;
  validFrom: string;
  validTo: string;
  /** First-ever start with this insurer; waiting periods count from here. Blank = validFrom. */
  inceptionDate?: string;
}

export interface StoredClaim {
  id: string;
  policyId: string;
  date: string; // YYYY-MM-DD
  hospital: string;
  treatment: string;
  patient: string;
  status: ClaimStatus;
  /** Amount the insurer paid / is paying, by billing area */
  areas: Record<AreaKey, number>;
  billed: number;
}

export interface StoreData {
  policies: StoredPolicy[];
  claims: StoredClaim[];
  hospitals: Hospital[];
  treatments: Treatment[];
}

const KEY = 'insurelens.store.v1';
const EMPTY_AREAS: Record<AreaKey, number> = { room: 0, doctor: 0, medicines: 0, diagnostics: 0, procedure: 0, consumables: 0, other: 0 };

export const blankAreas = (): Record<AreaKey, number> => ({ ...EMPTY_AREAS });

export const SEED: StoreData = {
  hospitals: DEFAULT_HOSPITALS,
  treatments: DEFAULT_TREATMENTS,
  policies: [
    { id: 'p1', name: 'Family Floater 10L', insurer: 'HealthShield Insurance Co.', holder: 'Jack', sumInsured: 1000000, copayPercentage: 10, deductible: 15000, roomRentLimit: 5000, treatmentLimit: 100000, validFrom: '2026-01-01', validTo: '2026-12-31', inceptionDate: '2022-01-01' },
    { id: 'p2', name: 'Senior Citizen 5L', insurer: 'CarePlus Insurance', holder: 'John (Father)', sumInsured: 500000, copayPercentage: 20, deductible: 0, roomRentLimit: 4000, treatmentLimit: 60000, validFrom: '2026-03-01', validTo: '2027-02-28' },
  ],
  claims: [
    { id: 'c1', policyId: 'p1', date: '2026-06-15', hospital: 'XYZ Hospital', treatment: 'Appendectomy', patient: 'Queen (Spouse)', status: 'Settled', billed: 120000, areas: { room: 12000, doctor: 18000, medicines: 10000, diagnostics: 9000, procedure: 40000, consumables: 6000, other: 5000 } },
    { id: 'c2', policyId: 'p1', date: '2025-11-14', hospital: 'Fortis Healthcare', treatment: 'Gallbladder Removal', patient: 'John (Father)', status: 'Settled', billed: 85000, areas: { room: 9000, doctor: 14000, medicines: 8000, diagnostics: 7000, procedure: 20000, consumables: 4000, other: 3000 } },
    { id: 'c3', policyId: 'p1', date: '2026-08-28', hospital: 'ABC Hospital', treatment: 'Cataract Surgery', patient: 'Jack (Self)', status: 'In Progress', billed: 60000, areas: { room: 2000, doctor: 6000, medicines: 2000, diagnostics: 3000, procedure: 18000, consumables: 3000, other: 1000 } },
    { id: 'c4', policyId: 'p2', date: '2026-07-02', hospital: 'City Care Hospital', treatment: 'Knee Replacement', patient: 'John (Father)', status: 'Settled', billed: 280000, areas: { room: 12000, doctor: 30000, medicines: 22000, diagnostics: 12000, procedure: 60000, consumables: 30000, other: 4000 } },
  ],
};

// ── external-store plumbing ──────────────────────────────────────────────────
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try { return window.localStorage.getItem(KEY); } catch { return null; }
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
}
function getSnapshot(): string | null {
  return readRaw();
}
function getServerSnapshot(): string | null { return null; }

function parse(raw: string | null): StoreData {
  if (!raw) return SEED;
  try {
    const d = JSON.parse(raw) as StoreData;
    if (d && Array.isArray(d.policies) && Array.isArray(d.claims)) {
      // Older saves have no hospital directory: fall back to the defaults.
      return { ...d, hospitals: Array.isArray(d.hospitals) ? d.hospitals : DEFAULT_HOSPITALS, treatments: Array.isArray(d.treatments) ? d.treatments : DEFAULT_TREATMENTS };
    }
  } catch { /* fall through */ }
  return SEED;
}
function write(d: StoreData) {
  try { window.localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

export const claimedAmount = (c: StoredClaim) => Object.values(c.areas).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
/** Rejected claims do not consume sum insured. */
export const countsAgainstCover = (c: StoredClaim) => c.status !== 'Rejected';

export function policyUsed(policyId: string, claims: StoredClaim[]): number {
  return claims.filter((c) => c.policyId === policyId && countsAgainstCover(c)).reduce((a, c) => a + claimedAmount(c), 0);
}

export function toPolicyData(p: StoredPolicy, used: number): PolicyData {
  return {
    sumInsured: p.sumInsured, copayPercentage: p.copayPercentage,
    // Annual deductible is already (partly) satisfied by earlier claims this year.
    deductible: Math.max(0, p.deductible - used),
    roomRentLimit: p.roomRentLimit, treatmentLimit: p.treatmentLimit, nonAdmissibleExpenses: 0,
    waitingPeriod: 0, exclusions: [], previousUtilization: used, policyClauses: [],
    insurerName: p.insurer, policyHolder: p.holder, validFrom: p.validFrom, validTo: p.validTo, policyNumber: p.id,
  };
}

// ── import validation (admin "Import catalog") ──────────────────────────────
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const PRICE_KEYS = ['doctor', 'medicines', 'diagnostics', 'procedure', 'consumables', 'other'] as const;

/** Rebuilds a StoreData from untrusted JSON, skipping rows that are not usable. Returns null when the file is not a catalog. */
export function sanitizeImport(raw: unknown): StoreData | null {
  if (!isObj(raw) || !Array.isArray(raw.policies) || !Array.isArray(raw.hospitals) || !Array.isArray(raw.treatments)) return null;

  const treatments: Treatment[] = [];
  for (const t of raw.treatments) {
    if (!isObj(t) || !str(t.key).trim() || !str(t.label).trim() || treatments.some((x) => x.key === t.key)) continue;
    const out: Treatment = { key: str(t.key).trim(), label: str(t.label).trim(), days: Math.min(60, Math.max(1, Math.round(num(t.days, 2)))) };
    if (num(t.waitingDays) > 0) out.waitingDays = Math.round(num(t.waitingDays));
    if (t.covered === false) out.covered = false;
    treatments.push(out);
  }

  const hospitals: Hospital[] = [];
  for (const h of raw.hospitals) {
    if (!isObj(h) || !str(h.name).trim()) continue;
    const prices: Hospital['prices'] = {};
    if (isObj(h.prices)) {
      for (const [k, p] of Object.entries(h.prices)) {
        if (!treatments.some((t) => t.key === k) || !isObj(p)) continue;
        const row = Object.fromEntries(PRICE_KEYS.map((a) => [a, num(p[a])])) as Hospital['prices'][string];
        if (Object.values(row).some((v) => v > 0)) prices[k] = row;
      }
    }
    hospitals.push({
      id: str(h.id).trim() && !hospitals.some((x) => x.id === h.id) ? str(h.id).trim() : uid('h'),
      name: str(h.name).trim(), city: str(h.city, '—').trim() || '—', network: h.network !== false,
      roomPerDay: num(h.roomPerDay, 0), prices, ...(h.active === false ? { active: false } : {}),
    });
  }

  const policies: StoredPolicy[] = [];
  for (const p of raw.policies) {
    if (!isObj(p) || !str(p.name).trim() || !(num(p.sumInsured) > 0)) continue;
    policies.push({
      id: str(p.id).trim() && !policies.some((x) => x.id === p.id) ? str(p.id).trim() : uid('p'),
      name: str(p.name).trim(), insurer: str(p.insurer, 'Insurer').trim() || 'Insurer', holder: str(p.holder, 'Self').trim() || 'Self',
      sumInsured: num(p.sumInsured), copayPercentage: Math.min(100, num(p.copayPercentage)), deductible: num(p.deductible),
      roomRentLimit: num(p.roomRentLimit), treatmentLimit: num(p.treatmentLimit),
      validFrom: str(p.validFrom), validTo: str(p.validTo),
      ...(str(p.inceptionDate) ? { inceptionDate: str(p.inceptionDate) } : {}),
    });
  }

  const STATUSES: ClaimStatus[] = ['Settled', 'In Progress', 'Needs Clarification', 'Rejected'];
  const claims: StoredClaim[] = [];
  if (Array.isArray(raw.claims)) {
    for (const c of raw.claims) {
      if (!isObj(c) || !policies.some((p) => p.id === c.policyId) || !isObj(c.areas)) continue;
      const areas = blankAreas();
      for (const k of Object.keys(areas) as AreaKey[]) areas[k] = num((c.areas as Record<string, unknown>)[k]);
      claims.push({
        id: str(c.id).trim() && !claims.some((x) => x.id === c.id) ? str(c.id).trim() : uid('c'),
        policyId: str(c.policyId), date: str(c.date), hospital: str(c.hospital), treatment: str(c.treatment), patient: str(c.patient),
        status: STATUSES.includes(c.status as ClaimStatus) ? (c.status as ClaimStatus) : 'In Progress', areas, billed: num(c.billed),
      });
    }
  }
  return { policies, claims, hospitals, treatments };
}

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const noopSubscribe = () => () => {};
/** True only after hydration; use for anything that depends on the current date or browser state. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function useInsureStore() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const data = useMemo(() => parse(raw), [raw]);

  const addPolicy = useCallback((p: Omit<StoredPolicy, 'id'>) => write({ ...parse(readRaw()), policies: [...parse(readRaw()).policies, { ...p, id: uid('p') }] }), []);
  const deletePolicy = useCallback((id: string) => { const d = parse(readRaw()); write({ ...d, policies: d.policies.filter((p) => p.id !== id), claims: d.claims.filter((c) => c.policyId !== id) }); }, []);
  const addClaim = useCallback((c: Omit<StoredClaim, 'id'>) => { const d = parse(readRaw()); write({ ...d, claims: [{ ...c, id: uid('c') }, ...d.claims] }); }, []);
  const deleteClaim = useCallback((id: string) => { const d = parse(readRaw()); write({ ...d, claims: d.claims.filter((c) => c.id !== id) }); }, []);
  const setClaimStatus = useCallback((id: string, status: ClaimStatus) => { const d = parse(readRaw()); write({ ...d, claims: d.claims.map((c) => (c.id === id ? { ...c, status } : c)) }); }, []);
  const addHospital = useCallback((h: Omit<Hospital, 'id'>) => { const d = parse(readRaw()); write({ ...d, hospitals: [...d.hospitals, { ...h, id: uid('h') }] }); }, []);
  const deleteHospital = useCallback((id: string) => { const d = parse(readRaw()); write({ ...d, hospitals: d.hospitals.filter((h) => h.id !== id) }); }, []);
  const addTreatment = useCallback((t: Treatment) => { const d = parse(readRaw()); write({ ...d, treatments: [...d.treatments, t] }); }, []);
  const deleteTreatment = useCallback((key: string) => { const d = parse(readRaw()); write({ ...d, treatments: d.treatments.filter((t) => t.key !== key), hospitals: d.hospitals.map((h) => { const prices = { ...h.prices }; delete prices[key]; return { ...h, prices }; }) }); }, []);
  const updateHospital = useCallback((h: Hospital) => { const d = parse(readRaw()); write({ ...d, hospitals: d.hospitals.map((x) => (x.id === h.id ? h : x)) }); }, []);
  const updateTreatment = useCallback((t: Treatment) => { const d = parse(readRaw()); write({ ...d, treatments: d.treatments.map((x) => (x.key === t.key ? t : x)) }); }, []);
  const updatePolicy = useCallback((p: StoredPolicy) => { const d = parse(readRaw()); write({ ...d, policies: d.policies.map((x) => (x.id === p.id ? p : x)) }); }, []);
  /** Replaces everything with an imported catalog. Returns false (and changes nothing) when the file is not a valid catalog. */
  const importData = useCallback((raw: unknown): boolean => { const next = sanitizeImport(raw); if (!next) return false; write(next); return true; }, []);
  const reset = useCallback(() => write(SEED), []);

  return { ...data, addPolicy, deletePolicy, addClaim, deleteClaim, setClaimStatus, addHospital, deleteHospital, addTreatment, deleteTreatment, updateHospital, updateTreatment, updatePolicy, importData, reset };
}
