'use client';

import { useState } from 'react';
import type { Treatment } from '@/lib/hospitalPlanner';
import { useInsureStore } from '@/lib/store';
import Field from './Field';
import { btn, card, danger, ghost, input, link, panel, td, th } from './ui';

export default function TreatmentsTab() {
  const store = useInsureStore();
  const [editing, setEditing] = useState<Treatment | 'new' | null>(null);

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800 }}>Treatments ({store.treatments.length})</h2>
        {editing === null && <button style={btn} onClick={() => setEditing('new')}>+ Add treatment</button>}
      </div>

      {editing !== null && (
        <TreatmentForm
          key={editing === 'new' ? 'new' : editing.key}
          initial={editing === 'new' ? undefined : editing}
          existingKeys={store.treatments.map((t) => t.key)}
          onCancel={() => setEditing(null)}
          onSave={(t) => { if (editing === 'new') store.addTreatment(t); else store.updateTreatment(t); setEditing(null); }}
        />
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead><tr><th style={th}>Treatment</th><th style={th}>Typical stay</th><th style={th}>Waiting period</th><th style={th}>Covered by policies</th><th style={th}>Hospitals priced</th><th style={th} /></tr></thead>
          <tbody>
            {store.treatments.length === 0 && <tr><td style={td} colSpan={6}>No treatments yet.</td></tr>}
            {store.treatments.map((t) => (
              <tr key={t.key}>
                <td style={td}><b>{t.label}</b></td>
                <td style={td}>{t.days} day{t.days === 1 ? '' : 's'}</td>
                <td style={td}>{t.waitingDays && t.waitingDays > 0 ? `${t.waitingDays} days` : 'None'}</td>
                <td style={td}>{t.covered === false ? <span style={{ color: '#B91C1C', fontWeight: 700 }}>Excluded</span> : <span style={{ color: '#15803D', fontWeight: 700 }}>Covered</span>}</td>
                <td style={td}>{store.hospitals.filter((h) => h.prices[t.key]).length} of {store.hospitals.length}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  <button style={link} onClick={() => setEditing(t)}>Edit</button>{' '}
                  <button style={danger} onClick={() => { if (confirm(`Remove ${t.label} and its prices at every hospital?`)) { store.deleteTreatment(t.key); if (editing !== null && editing !== 'new' && editing.key === t.key) setEditing(null); } }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>
        The waiting period and the “excluded” flag drive the eligibility verdict: a treatment inside its waiting period, or marked excluded, is shown as <b>Not eligible</b> at every hospital.
      </p>
    </div>
  );
}

function TreatmentForm({ initial, existingKeys, onSave, onCancel }: { initial?: Treatment; existingKeys: string[]; onSave: (t: Treatment) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [days, setDays] = useState(String(initial?.days ?? 2));
  const [wait, setWait] = useState(String(initial?.waitingDays ?? 0));
  const [covered, setCovered] = useState(initial?.covered !== false);
  const [err, setErr] = useState('');

  const submit = () => {
    const name = label.trim();
    if (!name) return setErr('Enter a treatment name.');
    const key = initial ? initial.key : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!key) return setErr('The name must contain letters or numbers.');
    if (!initial && existingKeys.includes(key)) return setErr('That treatment already exists.');
    const d = Number(days);
    if (!Number.isFinite(d) || d < 1 || d > 60) return setErr('Stay must be 1–60 days.');
    const w = Number(wait);
    if (!Number.isFinite(w) || w < 0 || w > 3650) return setErr('Waiting period must be 0–3650 days.');
    const out: Treatment = { key, label: name, days: Math.round(d) };
    if (w > 0) out.waitingDays = Math.round(w);
    if (!covered) out.covered = false;
    onSave(out);
  };

  return (
    <div style={panel}>
      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{initial ? `Edit ${initial.label}` : 'Add treatment'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <Field label="Treatment name"><input style={input} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
        <Field label="Typical stay (days)"><input style={input} type="number" min={1} max={60} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
        <Field label="Waiting period (days)" hint="0 = none. Counted from the policy start date."><input style={input} type="number" min={0} value={wait} onChange={(e) => setWait(e.target.value)} /></Field>
        <Field label="Covered by health policies?"><select style={input} value={covered ? 'y' : 'n'} onChange={(e) => setCovered(e.target.value === 'y')}><option value="y">Yes, covered</option><option value="n">No, excluded (e.g. cosmetic)</option></select></Field>
      </div>
      {err && <p role="alert" style={{ color: '#DC2626', fontSize: 13, margin: '8px 0' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button style={btn} onClick={submit}>{initial ? 'Save changes' : 'Save treatment'}</button><button style={ghost} onClick={onCancel}>Cancel</button></div>
    </div>
  );
}
