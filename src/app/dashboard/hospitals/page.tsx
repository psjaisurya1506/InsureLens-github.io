'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { compareHospitals, HospitalEstimate } from '@/lib/hospitalPlanner';
import { daysUntil } from '@/lib/insights';
import { policyUsed, toPolicyData, useInsureStore, useIsClient } from '@/lib/store';

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 };
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', padding: '8px 10px', letterSpacing: 0.5 };
const td: React.CSSProperties = { fontSize: 13, padding: '9px 10px', borderTop: '1px solid #F1F5F9', color: '#0F172A' };
const select: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, marginLeft: 8 };

type SortKey = 'youPay' | 'remaining' | 'bill';

export default function HospitalPlannerPage() {
  const store = useInsureStore();
  const [policyId, setPolicyId] = useState('');
  const [treatmentKey, setTreatmentKey] = useState('');
  const isClient = useIsClient();
  const [networkOnly, setNetworkOnly] = useState(false);
  const [budget, setBudget] = useState('');
  const [sort, setSort] = useState<SortKey>('youPay');
  const [openId, setOpenId] = useState<string | null>(null);

  const stored = store.policies.find((p) => p.id === policyId) ?? store.policies[0];
  const treatment = store.treatments.find((t) => t.key === treatmentKey) ?? store.treatments[0];
  const used = stored ? policyUsed(stored.id, store.claims) : 0;
  const policy = useMemo(() => (stored ? toPolicyData(stored, used) : null), [stored, used]);
  const hospitals = store.hospitals;

  const estimates = useMemo(() => {
    if (!policy || !treatment) return [];
    const list = compareHospitals(treatment, policy, hospitals);
    const max = Number(budget);
    return list
      .filter((e) => (networkOnly ? e.hospital.network : true))
      .filter((e) => (max > 0 ? e.youPay <= max : true))
      .sort((a, b) => (sort === 'youPay' ? a.youPay - b.youPay : sort === 'remaining' ? b.remainingAfter - a.remainingAfter : a.result.totalBill - b.result.totalBill));
  }, [policy, treatment, hospitals, networkOnly, budget, sort]);

  if (!stored || !policy || !treatment) {
    return <div style={card}>Add a policy on the <Link href="/dashboard/manage" style={{ color: '#2563EB', fontWeight: 700 }}>Policies &amp; Claims</Link> page and a treatment on the <Link href="/dashboard/directory" style={{ color: '#2563EB', fontWeight: 700 }}>Hospital Directory</Link> page to start planning.</div>;
  }

  const remaining = Math.max(0, stored.sumInsured - used);
  const usedPct = Math.min(100, Math.round((used / stored.sumInsured) * 100));
  const best = estimates[0];
  const daysLeft = isClient ? daysUntil(stored.validTo, new Date()) : NaN;
  const policyWarning = !Number.isFinite(daysLeft) ? '' : daysLeft < 0
    ? `This policy expired on ${stored.validTo}. These estimates will not apply until it is renewed.`
    : daysLeft <= 60 ? `This policy expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${stored.validTo}). If your admission runs past that date, confirm continuity of cover with your insurer.` : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
       <div>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Hospital Planner</h1>
        <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>
          Check how much of your cover a treatment will use <b>before</b> you are admitted, and compare hospitals by what you would pay and what is left of your sum insured.
        </p>
       </div>
       <button className="no-print" onClick={() => window.print()} style={{ alignSelf: 'flex-start', padding: '9px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Print / save as PDF</button>
      </div>

      {policyWarning && <div style={{ ...card, background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E', fontSize: 14 }}>{policyWarning}</div>}

      <div style={card}>
        <label style={{ fontSize: 13, fontWeight: 700 }}>Policy
          <select style={select} value={stored.id} onChange={(e) => { setPolicyId(e.target.value); setOpenId(null); }}>
            {store.policies.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.holder}</option>)}
          </select>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-end', marginTop: 16 }}>
          <Stat label="Sum insured" value={INR(stored.sumInsured)} />
          <Stat label="Already claimed" value={INR(used)} color="#DC2626" />
          <Stat label="Can still claim" value={INR(remaining)} color="#16A34A" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ height: 10, background: '#E2E8F0', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${usedPct}%`, height: '100%', background: '#DC2626' }} /></div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{usedPct}% of cover used · <Link href="/dashboard/manage" style={{ color: '#2563EB' }}>see claims by area</Link></div>
          </div>
        </div>
      </div>

      <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }} className="no-print">
        <label style={{ fontSize: 13, fontWeight: 700 }}>Treatment
          <select style={select} value={treatment.key} onChange={(e) => { setTreatmentKey(e.target.value); setOpenId(null); }}>
            {store.treatments.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 13, fontWeight: 700 }}>Max you can pay (₹)
          <input style={{ ...select, width: 120 }} type="number" min={0} placeholder="any" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 700 }}>Sort by
          <select style={select} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="youPay">Lowest you pay</option><option value="remaining">Most cover left</option><option value="bill">Lowest bill</option>
          </select>
        </label>
        <label style={{ fontSize: 13, fontWeight: 700 }}><input type="checkbox" checked={networkOnly} onChange={(e) => setNetworkOnly(e.target.checked)} /> Cashless network only</label>
        <span style={{ fontSize: 12, color: '#64748B' }}>Assumes a {treatment.days}-day stay</span>
      </div>

      {best ? (
        <div style={{ ...card, background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <b>Top pick: {best.hospital.name}</b> — the insurer pays about {INR(best.covered)}, you pay about {INR(best.youPay)}, and {INR(best.remainingAfter)} of cover stays available for the rest of the policy year.
        </div>
      ) : (
        <div style={{ ...card, background: '#FFFBEB', borderColor: '#FDE68A' }}>No hospital matches these filters. Raise the budget, turn off the network filter, or add prices for this treatment in the <Link href="/dashboard/directory" style={{ color: '#2563EB', fontWeight: 700 }}>Hospital Directory</Link>.</div>
      )}

      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead><tr><th style={th}>Hospital</th><th style={th}>Expected bill</th><th style={th}>Insurer pays</th><th style={th}>You pay</th><th style={th}>Cover left after</th><th style={th}>Uses of remaining</th><th style={th} /></tr></thead>
          <tbody>
            {estimates.map((e, i) => <Row key={e.hospital.id} e={e} best={i === 0 && sort === 'youPay'} open={openId === e.hospital.id} onToggle={() => setOpenId(openId === e.hospital.id ? null : e.hospital.id)} />)}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: '#64748B' }}>
        Estimates for {treatment.label} under {stored.name}. Estimates use sample hospital price ranges and your policy rules (room-rent limit, procedure sub-limit, deductible already met, co-payment, non-admissible items). Actual bills and insurer/TPA decisions can differ; confirm with your insurer before admission.
      </p>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return <div><div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div></div>;
}

function Row({ e, best, open, onToggle }: { e: HospitalEstimate; best: boolean; open: boolean; onToggle: () => void }) {
  const pct = Math.round(e.usageOfRemaining * 100);
  const exhausted = e.result.deductions.some((d) => d.label === 'Sum Insured Exhaustion');
  return (
    <>
      <tr>
        <td style={td}>
          <b>{e.hospital.name}</b>{best && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, background: '#16A34A', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>BEST</span>}
          <div style={{ fontSize: 11, color: '#64748B' }}>{e.hospital.city} · {e.hospital.network ? 'Cashless network' : 'Non-network (reimbursement)'}</div>
          {exhausted && <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>Bill exceeds your remaining cover</div>}
        </td>
        <td style={td}>{INR(e.result.totalBill)}</td>
        <td style={{ ...td, color: '#16A34A', fontWeight: 700 }}>{INR(e.covered)}</td>
        <td style={{ ...td, color: '#DC2626', fontWeight: 700 }}>{INR(e.youPay)}</td>
        <td style={td}>{INR(e.remainingAfter)}</td>
        <td style={td}>{pct}%</td>
        <td style={td}><button onClick={onToggle} style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>{open ? 'Hide areas' : 'Claim areas'}</button></td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} style={{ background: '#F8FAFC', padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Claim area</th><th style={th}>Billed</th><th style={th}>Claimed</th><th style={th}>You pay</th><th style={th}>Why</th></tr></thead>
              <tbody>
                {e.areas.map((a) => (
                  <tr key={a.area}>
                    <td style={td}>{a.label}</td><td style={td}>{INR(a.billed)}</td>
                    <td style={{ ...td, color: '#16A34A', fontWeight: 600 }}>{INR(a.covered)}</td>
                    <td style={{ ...td, color: '#DC2626' }}>{INR(a.youPay)}</td>
                    <td style={{ ...td, color: '#64748B' }}>{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
