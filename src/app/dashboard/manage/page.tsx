'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AREA_LABELS, AreaKey } from '@/lib/hospitalPlanner';
import { csvEscape } from '@/lib/insights';
import { ClaimStatus, StoredPolicy, blankAreas, claimedAmount, countsAgainstCover, policyUsed, useInsureStore } from '@/lib/store';

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 };
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', padding: '8px 10px', letterSpacing: 0.5 };
const td: React.CSSProperties = { fontSize: 13, padding: '9px 10px', borderTop: '1px solid #F1F5F9', color: '#0F172A', verticalAlign: 'top' };
const input: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, width: '100%' };
const btn: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const ghost: React.CSSProperties = { ...btn, background: '#F1F5F9', color: '#0F172A', border: '1px solid #CBD5E1' };
const AREAS = Object.keys(AREA_LABELS) as AreaKey[];
const STATUSES: ClaimStatus[] = ['In Progress', 'Settled', 'Needs Clarification', 'Rejected'];

function exportCsv(policies: StoredPolicy[], claims: ReturnType<typeof useInsureStore>['claims']) {
  const head = ['Policy', 'Date', 'Hospital', 'Treatment', 'Patient', 'Status', 'Billed', 'Claimed', ...AREAS.map((a) => AREA_LABELS[a])];
  const rows = claims.map((c) => [policies.find((p) => p.id === c.policyId)?.name ?? '', c.date, c.hospital, c.treatment, c.patient, c.status, c.billed, claimedAmount(c), ...AREAS.map((a) => c.areas[a] || 0)]);
  const csv = [head, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'insurelens-claims.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function ManagePage() {
  const store = useInsureStore();
  const [selectedId, setSelectedId] = useState<string>('');
  const selected = store.policies.find((p) => p.id === selectedId) ?? store.policies[0];
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);

  if (!selected) {
    return (
      <div style={card}>
        <p>No policies yet.</p>
        <button style={btn} onClick={() => setShowPolicyForm(true)}>Add a policy</button>
        {showPolicyForm && <PolicyForm onSave={(p) => { store.addPolicy(p); setShowPolicyForm(false); }} onCancel={() => setShowPolicyForm(false)} />}
        <button style={{ ...ghost, marginLeft: 8 }} onClick={store.reset}>Restore demo data</button>
      </div>
    );
  }

  const claims = store.claims.filter((c) => c.policyId === selected.id);
  const counted = claims.filter(countsAgainstCover);
  const used = policyUsed(selected.id, store.claims);
  const remaining = Math.max(0, selected.sumInsured - used);
  const usedPct = Math.min(100, Math.round((used / selected.sumInsured) * 100));
  const areaTotals = AREAS.map((a) => ({ area: a, total: counted.reduce((s, c) => s + (c.areas[a] || 0), 0) }));
  const maxArea = Math.max(1, ...areaTotals.map((a) => a.total));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Policies &amp; Claims</h1>
          <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>Manage your insurance policies, record claims by billing area, and see exactly how much cover is left.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <button style={btn} onClick={() => setShowPolicyForm((v) => !v)}>{showPolicyForm ? 'Close' : '+ Add policy'}</button>
          <button style={ghost} onClick={() => exportCsv(store.policies, store.claims)}>Export claims (CSV)</button>
          <button style={ghost} onClick={() => { if (confirm('Replace all your data with the demo data?')) store.reset(); }}>Reset demo data</button>
        </div>
      </div>

      {showPolicyForm && <div style={card}><PolicyForm onSave={(p) => { store.addPolicy(p); setShowPolicyForm(false); }} onCancel={() => setShowPolicyForm(false)} /></div>}

      {/* Policy cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {store.policies.map((p) => {
          const u = policyUsed(p.id, store.claims);
          const active = p.id === selected.id;
          return (
            <button key={p.id} onClick={() => setSelectedId(p.id)} style={{ ...card, textAlign: 'left', cursor: 'pointer', borderColor: active ? '#2563EB' : '#E2E8F0', boxShadow: active ? '0 0 0 2px #BFDBFE' : 'none' }}>
              <div style={{ fontWeight: 800 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{p.insurer} · {p.holder}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A', marginTop: 8 }}>{INR(Math.max(0, p.sumInsured - u))} <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>left of {INR(p.sumInsured)}</span></div>
            </button>
          );
        })}
      </div>

      {/* Selected policy summary */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>{selected.name}</h2>
          <button style={{ ...ghost, color: '#DC2626' }} onClick={() => { if (confirm(`Delete ${selected.name} and its claims?`)) { store.deletePolicy(selected.id); setSelectedId(''); } }}>Delete policy</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, margin: '14px 0' }}>
          <Stat label="Sum insured" value={INR(selected.sumInsured)} />
          <Stat label="Claimed so far" value={INR(used)} color="#DC2626" />
          <Stat label="Can still claim" value={INR(remaining)} color="#16A34A" />
          <Stat label="Co-pay" value={`${selected.copayPercentage}%`} />
          <Stat label="Room rent / day" value={INR(selected.roomRentLimit)} />
          <Stat label="Valid" value={`${selected.validFrom} → ${selected.validTo}`} small />
        </div>
        <div style={{ height: 10, background: '#E2E8F0', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${usedPct}%`, height: '100%', background: usedPct > 80 ? '#DC2626' : '#2563EB' }} /></div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{usedPct}% used{usedPct > 80 ? ' — running low, compare hospitals before your next admission' : ''}</div>
        <div style={{ marginTop: 12 }}><Link href="/dashboard/hospitals" style={{ color: '#2563EB', fontWeight: 700, fontSize: 13 }}>Compare hospitals for this policy →</Link></div>
      </div>

      {/* Claimed by area */}
      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Where your cover has been claimed</h2>
        {areaTotals.map((a) => (
          <div key={a.area} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 110px', gap: 10, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13 }}>{AREA_LABELS[a.area]}</span>
            <div style={{ height: 10, background: '#F1F5F9', borderRadius: 5 }}><div style={{ width: `${(a.total / maxArea) * 100}%`, height: '100%', background: '#2563EB', borderRadius: 5 }} /></div>
            <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{INR(a.total)}</span>
          </div>
        ))}
      </div>

      {/* Claims */}
      <div style={{ ...card, overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Claims ({claims.length})</h2>
          <button style={btn} onClick={() => setShowClaimForm((v) => !v)}>{showClaimForm ? 'Close' : '+ Record claim'}</button>
        </div>
        {showClaimForm && <ClaimForm policy={selected} remaining={remaining} onSave={(c) => { store.addClaim(c); setShowClaimForm(false); }} />}
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr><th style={th}>Date</th><th style={th}>Hospital / treatment</th><th style={th}>Patient</th><th style={th}>Billed</th><th style={th}>Claimed</th><th style={th}>Status</th><th style={th} /></tr></thead>
          <tbody>
            {claims.length === 0 && <tr><td style={td} colSpan={7}>No claims recorded for this policy.</td></tr>}
            {claims.map((c) => (
              <tr key={c.id}>
                <td style={td}>{c.date}</td>
                <td style={td}><b>{c.hospital}</b><div style={{ fontSize: 11, color: '#64748B' }}>{c.treatment}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{AREAS.filter((a) => c.areas[a] > 0).map((a) => `${AREA_LABELS[a]}: ${INR(c.areas[a])}`).join(' · ')}</div></td>
                <td style={td}>{c.patient}</td>
                <td style={td}>{INR(c.billed)}</td>
                <td style={{ ...td, color: '#16A34A', fontWeight: 700 }}>{INR(claimedAmount(c))}</td>
                <td style={td}>
                  <select value={c.status} onChange={(e) => store.setClaimStatus(c.id, e.target.value as ClaimStatus)} style={{ ...input, width: 'auto' }}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td style={td}><button style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12, fontWeight: 700 }} onClick={() => store.deleteClaim(c.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>Rejected claims do not reduce your remaining cover. Data is stored in this browser only.</p>
      </div>
    </div>
  );
}

function Stat({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return <div><div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: small ? 14 : 20, fontWeight: 800, color: color ?? '#0F172A' }}>{value}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block' }}>{label}<div style={{ marginTop: 4 }}>{children}</div></label>;
}

function PolicyForm({ onSave, onCancel }: { onSave: (p: Omit<StoredPolicy, 'id'>) => void; onCancel: () => void }) {
  const [f, setF] = useState({ name: '', insurer: '', holder: '', sumInsured: '500000', copayPercentage: '0', deductible: '0', roomRentLimit: '5000', treatmentLimit: '100000', validFrom: '', validTo: '' });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    const si = Number(f.sumInsured), cp = Number(f.copayPercentage);
    if (!f.name.trim() || !f.insurer.trim()) return setErr('Policy name and insurer are required.');
    if (!(si > 0)) return setErr('Sum insured must be greater than 0.');
    if (!(cp >= 0 && cp <= 100)) return setErr('Co-pay must be between 0 and 100.');
    if (!f.validFrom || !f.validTo || f.validTo < f.validFrom) return setErr('Enter valid start and end dates (end after start).');
    onSave({ name: f.name.trim(), insurer: f.insurer.trim(), holder: f.holder.trim() || 'Self', sumInsured: si, copayPercentage: cp, deductible: Math.max(0, Number(f.deductible) || 0), roomRentLimit: Math.max(0, Number(f.roomRentLimit) || 0), treatmentLimit: Math.max(0, Number(f.treatmentLimit) || 0), validFrom: f.validFrom, validTo: f.validTo });
  };
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Field label="Policy name"><input style={input} value={f.name} onChange={set('name')} /></Field>
        <Field label="Insurer"><input style={input} value={f.insurer} onChange={set('insurer')} /></Field>
        <Field label="Policy holder"><input style={input} value={f.holder} onChange={set('holder')} /></Field>
        <Field label="Sum insured (₹)"><input style={input} type="number" min={0} value={f.sumInsured} onChange={set('sumInsured')} /></Field>
        <Field label="Co-pay (%)"><input style={input} type="number" min={0} max={100} value={f.copayPercentage} onChange={set('copayPercentage')} /></Field>
        <Field label="Deductible (₹)"><input style={input} type="number" min={0} value={f.deductible} onChange={set('deductible')} /></Field>
        <Field label="Room rent limit / day (₹)"><input style={input} type="number" min={0} value={f.roomRentLimit} onChange={set('roomRentLimit')} /></Field>
        <Field label="Procedure sub-limit (₹)"><input style={input} type="number" min={0} value={f.treatmentLimit} onChange={set('treatmentLimit')} /></Field>
        <Field label="Valid from"><input style={input} type="date" value={f.validFrom} onChange={set('validFrom')} /></Field>
        <Field label="Valid to"><input style={input} type="date" value={f.validTo} onChange={set('validTo')} /></Field>
      </div>
      {err && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>{err}</p>}
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}><button style={btn} onClick={submit}>Save policy</button><button style={ghost} onClick={onCancel}>Cancel</button></div>
    </div>
  );
}

function ClaimForm({ policy, remaining, onSave }: { policy: StoredPolicy; remaining: number; onSave: (c: { policyId: string; date: string; hospital: string; treatment: string; patient: string; status: ClaimStatus; areas: Record<AreaKey, number>; billed: number }) => void }) {
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), hospital: '', treatment: '', patient: policy.holder, status: 'In Progress' as ClaimStatus, billed: '' });
  const [areas, setAreas] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const claimed = AREAS.reduce((s, a) => s + (Number(areas[a]) || 0), 0);
  const submit = () => {
    if (!f.hospital.trim() || !f.treatment.trim()) return setErr('Hospital and treatment are required.');
    if (claimed <= 0) return setErr('Enter the claimed amount for at least one area.');
    if (AREAS.some((a) => (Number(areas[a]) || 0) < 0)) return setErr('Amounts cannot be negative.');
    const billed = Number(f.billed) || claimed;
    if (billed < claimed) return setErr('Billed amount cannot be less than the claimed amount.');
    const out = blankAreas();
    AREAS.forEach((a) => { out[a] = Number(areas[a]) || 0; });
    onSave({ policyId: policy.id, date: f.date, hospital: f.hospital.trim(), treatment: f.treatment.trim(), patient: f.patient.trim() || 'Self', status: f.status, areas: out, billed });
  };
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Field label="Date"><input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Hospital"><input style={input} value={f.hospital} onChange={(e) => setF({ ...f, hospital: e.target.value })} /></Field>
        <Field label="Treatment"><input style={input} value={f.treatment} onChange={(e) => setF({ ...f, treatment: e.target.value })} /></Field>
        <Field label="Patient"><input style={input} value={f.patient} onChange={(e) => setF({ ...f, patient: e.target.value })} /></Field>
        <Field label="Total bill (₹)"><input style={input} type="number" min={0} value={f.billed} onChange={(e) => setF({ ...f, billed: e.target.value })} /></Field>
        <Field label="Status"><select style={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ClaimStatus })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', margin: '14px 0 6px' }}>AMOUNT CLAIMED, BY AREA (₹)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {AREAS.map((a) => <Field key={a} label={AREA_LABELS[a]}><input style={input} type="number" min={0} value={areas[a] ?? ''} onChange={(e) => setAreas({ ...areas, [a]: e.target.value })} /></Field>)}
      </div>
      <div style={{ marginTop: 10, fontSize: 13 }}>Total claimed: <b>{INR(claimed)}</b>{f.status !== 'Rejected' && claimed > remaining && <span style={{ color: '#DC2626' }}> — exceeds your remaining cover of {INR(remaining)}</span>}</div>
      {err && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 6 }}>{err}</p>}
      <button style={{ ...btn, marginTop: 10 }} onClick={submit}>Save claim</button>
    </div>
  );
}
