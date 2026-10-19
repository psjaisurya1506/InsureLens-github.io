'use client';

import { useState } from 'react';
import { AREA_LABELS, AreaKey, Hospital } from '@/lib/hospitalPlanner';
import { useInsureStore } from '@/lib/store';

const INR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 };
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', padding: '8px 10px' };
const td: React.CSSProperties = { fontSize: 13, padding: '9px 10px', borderTop: '1px solid #F1F5F9' };
const input: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, width: '100%' };
const btn: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const ghost: React.CSSProperties = { ...btn, background: '#F1F5F9', color: '#0F172A', border: '1px solid #CBD5E1' };
const PRICE_AREAS = (Object.keys(AREA_LABELS) as AreaKey[]).filter((a) => a !== 'room') as Exclude<AreaKey, 'room'>[];

export default function DirectoryPage() {
  const store = useInsureStore();
  const [showHospital, setShowHospital] = useState(false);
  const [showTreatment, setShowTreatment] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Hospital Directory</h1>
        <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>The hospitals and treatment prices the planner compares. Add your local hospitals with their quoted prices to get estimates that match your area.</p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Treatments ({store.treatments.length})</h2>
          <button style={btn} onClick={() => setShowTreatment((v) => !v)}>{showTreatment ? 'Close' : '+ Add treatment'}</button>
        </div>
        {showTreatment && <TreatmentForm existing={store.treatments.map((t) => t.key)} onSave={(t) => { store.addTreatment(t); setShowTreatment(false); }} />}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {store.treatments.map((t) => (
            <span key={t.key} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 20, padding: '4px 12px', fontSize: 13 }}>
              {t.label} · {t.days}d{' '}
              <button aria-label={`Remove ${t.label}`} onClick={() => { if (confirm(`Remove ${t.label} and its prices?`)) store.deleteTreatment(t.key); }} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 800 }}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Hospitals ({store.hospitals.length})</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn} onClick={() => setShowHospital((v) => !v)}>{showHospital ? 'Close' : '+ Add hospital'}</button>
            <button style={ghost} onClick={() => { if (confirm('Replace ALL data (policies, claims, hospitals) with the demo data?')) store.reset(); }}>Reset demo data</button>
          </div>
        </div>
        {showHospital && <HospitalForm treatments={store.treatments} onSave={(h) => { store.addHospital(h); setShowHospital(false); }} />}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead><tr><th style={th}>Hospital</th><th style={th}>Room / day</th><th style={th}>Priced treatments</th><th style={th} /></tr></thead>
            <tbody>
              {store.hospitals.length === 0 && <tr><td style={td} colSpan={4}>No hospitals yet.</td></tr>}
              {store.hospitals.map((h) => (
                <tr key={h.id}>
                  <td style={td}><b>{h.name}</b><div style={{ fontSize: 11, color: '#64748B' }}>{h.city} · {h.network ? 'Cashless network' : 'Non-network'}</div></td>
                  <td style={td}>{INR(h.roomPerDay)}</td>
                  <td style={td}>{store.treatments.filter((t) => h.prices[t.key]).map((t) => t.label).join(', ') || <span style={{ color: '#D97706' }}>No prices — won&apos;t appear in comparisons</span>}</td>
                  <td style={td}><button style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700, fontSize: 12 }} onClick={() => { if (confirm(`Delete ${h.name}?`)) store.deleteHospital(h.id); }}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>Prices are your own estimates or hospital quotations. Data is stored in this browser only.</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block' }}>{label}<div style={{ marginTop: 4 }}>{children}</div></label>;
}

function TreatmentForm({ existing, onSave }: { existing: string[]; onSave: (t: { key: string; label: string; days: number }) => void }) {
  const [label, setLabel] = useState('');
  const [days, setDays] = useState('2');
  const [err, setErr] = useState('');
  const submit = () => {
    const key = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!key) return setErr('Enter a treatment name.');
    if (existing.includes(key)) return setErr('That treatment already exists.');
    const d = Number(days);
    if (!(d >= 1 && d <= 60)) return setErr('Stay must be 1–60 days.');
    onSave({ key, label: label.trim(), days: Math.round(d) });
  };
  return (
    <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10, marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
      <Field label="Treatment name"><input style={input} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
      <Field label="Typical stay (days)"><input style={input} type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
      <button style={btn} onClick={submit}>Save treatment</button>
      {err && <span style={{ color: '#DC2626', fontSize: 13 }}>{err}</span>}
    </div>
  );
}

function HospitalForm({ treatments, onSave }: { treatments: { key: string; label: string; days: number }[]; onSave: (h: Omit<Hospital, 'id'>) => void }) {
  const [f, setF] = useState({ name: '', city: '', roomPerDay: '5000', network: true });
  const [tKey, setTKey] = useState(treatments[0]?.key ?? '');
  const [prices, setPrices] = useState<Record<string, Record<string, string>>>({});
  const [err, setErr] = useState('');
  const cur = prices[tKey] ?? {};
  const setPrice = (a: string, v: string) => setPrices({ ...prices, [tKey]: { ...cur, [a]: v } });

  const submit = () => {
    if (!f.name.trim()) return setErr('Hospital name is required.');
    const room = Number(f.roomPerDay);
    if (!(room >= 0)) return setErr('Room rent must be 0 or more.');
    const out: Hospital['prices'] = {};
    for (const [k, p] of Object.entries(prices)) {
      const vals = PRICE_AREAS.map((a) => Number(p[a]) || 0);
      if (vals.some((v) => v < 0)) return setErr('Prices cannot be negative.');
      if (vals.some((v) => v > 0)) out[k] = Object.fromEntries(PRICE_AREAS.map((a, i) => [a, vals[i]])) as Hospital['prices'][string];
    }
    if (Object.keys(out).length === 0) return setErr('Enter prices for at least one treatment.');
    onSave({ name: f.name.trim(), city: f.city.trim() || '—', network: f.network, roomPerDay: room, prices: out });
  };
  return (
    <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Field label="Hospital name"><input style={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="City"><input style={input} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        <Field label="Room rent per day (₹)"><input style={input} type="number" min={0} value={f.roomPerDay} onChange={(e) => setF({ ...f, roomPerDay: e.target.value })} /></Field>
        <Field label="Cashless network?"><select style={input} value={f.network ? 'y' : 'n'} onChange={(e) => setF({ ...f, network: e.target.value === 'y' })}><option value="y">Yes</option><option value="n">No (reimbursement)</option></select></Field>
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', margin: '14px 0 6px' }}>PRICES FOR</div>
      <select style={{ ...input, width: 'auto', marginBottom: 10 }} value={tKey} onChange={(e) => setTKey(e.target.value)}>
        {treatments.map((t) => <option key={t.key} value={t.key}>{t.label}{prices[t.key] ? ' ✓' : ''}</option>)}
      </select>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {PRICE_AREAS.map((a) => <Field key={a} label={`${AREA_LABELS[a]} (₹)`}><input style={input} type="number" min={0} value={cur[a] ?? ''} onChange={(e) => setPrice(a, e.target.value)} /></Field>)}
      </div>
      <p style={{ fontSize: 12, color: '#64748B', margin: '8px 0' }}>Switch the treatment above to price more than one. Room charges are calculated from the room rent and the stay length.</p>
      {err && <p style={{ color: '#DC2626', fontSize: 13 }}>{err}</p>}
      <button style={btn} onClick={submit}>Save hospital</button>
    </div>
  );
}
