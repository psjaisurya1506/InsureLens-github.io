'use client';

import { useState } from 'react';
import { AREA_LABELS } from '@/lib/hospitalPlanner';
import type { AreaKey, Hospital, Treatment } from '@/lib/hospitalPlanner';
import { inr } from '@/lib/eligibility';
import { useInsureStore } from '@/lib/store';
import Field from './Field';
import { btn, card, danger, ghost, input, link, panel, td, th } from './ui';

const PRICE_AREAS = (Object.keys(AREA_LABELS) as AreaKey[]).filter((a) => a !== 'room') as Exclude<AreaKey, 'room'>[];
const MAX_AMOUNT = 100_000_000;

export default function HospitalsTab() {
  const store = useInsureStore();
  const [editing, setEditing] = useState<Hospital | 'new' | null>(null);

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800 }}>Hospitals ({store.hospitals.length})</h2>
        {editing === null && <button style={btn} onClick={() => setEditing('new')}>+ Add hospital</button>}
      </div>

      {editing !== null && (
        <HospitalForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          treatments={store.treatments}
          others={store.hospitals.filter((h) => editing === 'new' || h.id !== editing.id)}
          onCancel={() => setEditing(null)}
          onSave={(h) => {
            if (editing === 'new') store.addHospital(h);
            else store.updateHospital({ ...h, id: editing.id });
            setEditing(null);
          }}
        />
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead><tr><th style={th}>Hospital</th><th style={th}>Room / day</th><th style={th}>Priced treatments</th><th style={th}>Status</th><th style={th} /></tr></thead>
          <tbody>
            {store.hospitals.length === 0 && <tr><td style={td} colSpan={5}>No hospitals yet. Add one to start estimating costs.</td></tr>}
            {store.hospitals.map((h) => {
              const priced = store.treatments.filter((t) => h.prices[t.key]);
              const active = h.active !== false;
              return (
                <tr key={h.id} style={{ opacity: active ? 1 : 0.6 }}>
                  <td style={td}><b>{h.name}</b><div style={{ fontSize: 11, color: '#64748B' }}>{h.city} · {h.network ? 'Cashless network' : 'Non-network'}</div></td>
                  <td style={td}>{inr(h.roomPerDay)}</td>
                  <td style={td}>{priced.length === 0 ? <span style={{ color: '#D97706' }}>None: will not appear in estimates</span> : `${priced.length} of ${store.treatments.length}: ${priced.map((t) => t.label).join(', ')}`}</td>
                  <td style={td}>{active ? <span style={{ color: '#15803D', fontWeight: 700 }}>Active</span> : <span style={{ color: '#B45309', fontWeight: 700 }}>Hidden</span>}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button style={link} onClick={() => setEditing(h)}>Edit</button>{' '}
                    <button style={link} onClick={() => store.updateHospital({ ...h, active: !active })}>{active ? 'Hide' : 'Show'}</button>{' '}
                    <button style={danger} onClick={() => { if (confirm(`Delete ${h.name} and all its prices?`)) { store.deleteHospital(h.id); if (editing !== null && editing !== 'new' && editing.id === h.id) setEditing(null); } }}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>Hidden hospitals stay on file but are left out of every estimate. Changes apply to the cost estimator and hospital planner immediately.</p>
    </div>
  );
}

function HospitalForm({ initial, treatments, others, onSave, onCancel }: {
  initial?: Hospital; treatments: Treatment[]; others: Hospital[];
  onSave: (h: Omit<Hospital, 'id'>) => void; onCancel: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? '', city: initial?.city === '—' ? '' : initial?.city ?? '',
    roomPerDay: String(initial?.roomPerDay ?? 5000), network: initial?.network ?? true, active: initial?.active !== false,
  });
  const [tKey, setTKey] = useState(treatments[0]?.key ?? '');
  const [prices, setPrices] = useState<Record<string, Record<string, string>>>(() => {
    const out: Record<string, Record<string, string>> = {};
    for (const [k, p] of Object.entries(initial?.prices ?? {})) out[k] = Object.fromEntries(Object.entries(p).map(([a, v]) => [a, String(v)]));
    return out;
  });
  const [err, setErr] = useState('');
  const cur = prices[tKey] ?? {};
  const setPrice = (a: string, v: string) => setPrices({ ...prices, [tKey]: { ...cur, [a]: v } });
  const hasPrice = (k: string) => PRICE_AREAS.some((a) => Number(prices[k]?.[a]) > 0);

  const submit = () => {
    const name = f.name.trim();
    if (!name) return setErr('Hospital name is required.');
    const city = f.city.trim() || '—';
    if (others.some((h) => h.name.trim().toLowerCase() === name.toLowerCase() && h.city.toLowerCase() === city.toLowerCase())) return setErr('A hospital with this name already exists in that city.');
    const room = Number(f.roomPerDay);
    if (!Number.isFinite(room) || room < 0 || room > MAX_AMOUNT) return setErr('Room rent must be a number from 0 to 10,00,00,000.');
    const out: Hospital['prices'] = {};
    for (const t of treatments) {
      const p = prices[t.key];
      if (!p) continue;
      const vals = PRICE_AREAS.map((a) => (p[a] === undefined || p[a] === '' ? 0 : Number(p[a])));
      if (vals.some((v) => !Number.isFinite(v) || v < 0 || v > MAX_AMOUNT)) return setErr(`Check the prices for ${t.label}: every amount must be a number from 0 to 10,00,00,000.`);
      if (vals.some((v) => v > 0)) out[t.key] = Object.fromEntries(PRICE_AREAS.map((a, i) => [a, vals[i]])) as Hospital['prices'][string];
    }
    // Keep prices for treatments that no longer exist out of the record.
    if (Object.keys(out).length === 0) return setErr('Enter prices for at least one treatment.');
    onSave({ name, city, network: f.network, roomPerDay: room, prices: out, ...(f.active ? {} : { active: false }) });
  };

  return (
    <div style={panel}>
      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{initial ? `Edit ${initial.name}` : 'Add hospital'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Field label="Hospital name"><input style={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="City"><input style={input} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        <Field label="Room rent per day (₹)"><input style={input} type="number" min={0} value={f.roomPerDay} onChange={(e) => setF({ ...f, roomPerDay: e.target.value })} /></Field>
        <Field label="Cashless network?"><select style={input} value={f.network ? 'y' : 'n'} onChange={(e) => setF({ ...f, network: e.target.value === 'y' })}><option value="y">Yes</option><option value="n">No (reimbursement)</option></select></Field>
        <Field label="Shown in estimates?"><select style={input} value={f.active ? 'y' : 'n'} onChange={(e) => setF({ ...f, active: e.target.value === 'y' })}><option value="y">Yes</option><option value="n">No (hidden)</option></select></Field>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', margin: '16px 0 6px' }}>PRICES FOR</div>
      {treatments.length === 0 ? (
        <p style={{ fontSize: 13, color: '#B45309' }}>Add a treatment on the Treatments tab first.</p>
      ) : (
        <>
          <select aria-label="Treatment to price" style={{ ...input, width: 'auto', marginBottom: 10 }} value={tKey} onChange={(e) => setTKey(e.target.value)}>
            {treatments.map((t) => <option key={t.key} value={t.key}>{t.label}{hasPrice(t.key) ? ' ✓' : ''}</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {PRICE_AREAS.map((a) => <Field key={a} label={`${AREA_LABELS[a]} (₹)`}><input style={input} type="number" min={0} value={cur[a] ?? ''} onChange={(e) => setPrice(a, e.target.value)} /></Field>)}
          </div>
          <p style={{ fontSize: 12, color: '#64748B', margin: '8px 0' }}>Switch the treatment above to price more than one (a ✓ marks priced ones). Leave all amounts empty to remove a treatment from this hospital. Room charges come from the room rent and the stay length.</p>
        </>
      )}
      {err && <p role="alert" style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8 }}><button style={btn} onClick={submit}>{initial ? 'Save changes' : 'Save hospital'}</button><button style={ghost} onClick={onCancel}>Cancel</button></div>
    </div>
  );
}
