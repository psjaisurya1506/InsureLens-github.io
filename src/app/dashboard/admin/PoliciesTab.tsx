'use client';

import { useState } from 'react';
import { inr } from '@/lib/eligibility';
import { policyUsed, useInsureStore } from '@/lib/store';
import type { StoredPolicy } from '@/lib/store';
import Field from './Field';
import { btn, card, danger, ghost, input, link, panel, td, th } from './ui';

export default function PoliciesTab() {
  const store = useInsureStore();
  const [editing, setEditing] = useState<StoredPolicy | null>(null);

  return (
    <div style={card}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Policies ({store.policies.length})</h2>

      {editing && (
        <PolicyForm
          key={editing.id}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(p) => { store.updatePolicy(p); setEditing(null); }}
        />
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr><th style={th}>Policy</th><th style={th}>Sum insured</th><th style={th}>Used</th><th style={th}>Co-pay</th><th style={th}>Limits</th><th style={th}>Valid</th><th style={th} /></tr></thead>
          <tbody>
            {store.policies.length === 0 && <tr><td style={td} colSpan={7}>No policies yet. Users add policies under Policies &amp; Claims.</td></tr>}
            {store.policies.map((p) => (
              <tr key={p.id}>
                <td style={td}><b>{p.name}</b><div style={{ fontSize: 11, color: '#64748B' }}>{p.insurer} · {p.holder}</div></td>
                <td style={td}>{inr(p.sumInsured)}</td>
                <td style={td}>{inr(policyUsed(p.id, store.claims))}</td>
                <td style={td}>{p.copayPercentage}%</td>
                <td style={td}><div style={{ fontSize: 12 }}>Room {inr(p.roomRentLimit)}/day</div><div style={{ fontSize: 12 }}>Procedure {inr(p.treatmentLimit)}</div><div style={{ fontSize: 12 }}>Deductible {inr(p.deductible)}</div></td>
                <td style={td}>{p.validFrom} → {p.validTo}{p.inceptionDate && <div style={{ fontSize: 11, color: '#64748B' }}>Inception {p.inceptionDate}</div>}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  <button style={link} onClick={() => setEditing(p)}>Edit</button>{' '}
                  <button style={danger} onClick={() => { if (confirm(`Delete ${p.name} and all its claims?`)) { store.deletePolicy(p.id); if (editing?.id === p.id) setEditing(null); } }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>These rules (validity, waiting-period start, room-rent limit, sub-limit, co-pay, deductible and sum insured) feed the eligibility check. New policies are added from the Policies &amp; Claims page.</p>
    </div>
  );
}

function PolicyForm({ initial, onSave, onCancel }: { initial: StoredPolicy; onSave: (p: StoredPolicy) => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: initial.name, insurer: initial.insurer, holder: initial.holder, sumInsured: String(initial.sumInsured),
    copayPercentage: String(initial.copayPercentage), deductible: String(initial.deductible), roomRentLimit: String(initial.roomRentLimit),
    treatmentLimit: String(initial.treatmentLimit), validFrom: initial.validFrom, validTo: initial.validTo, inceptionDate: initial.inceptionDate ?? '',
  });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = () => {
    const si = Number(f.sumInsured), cp = Number(f.copayPercentage), ded = Number(f.deductible), room = Number(f.roomRentLimit), sub = Number(f.treatmentLimit);
    if (!f.name.trim() || !f.insurer.trim()) return setErr('Policy name and insurer are required.');
    if (!(si > 0)) return setErr('Sum insured must be greater than 0.');
    if (!(cp >= 0 && cp <= 100)) return setErr('Co-pay must be between 0 and 100.');
    if ([ded, room, sub].some((n) => !Number.isFinite(n) || n < 0)) return setErr('Deductible and limits must be 0 or more.');
    if (!f.validFrom || !f.validTo || f.validTo < f.validFrom) return setErr('Enter valid start and end dates (end after start).');
    if (f.inceptionDate && f.inceptionDate > f.validFrom) return setErr('Inception date cannot be after the current policy start date.');
    const { inceptionDate: _drop, ...rest } = initial;
    void _drop;
    onSave({ ...rest, name: f.name.trim(), insurer: f.insurer.trim(), holder: f.holder.trim() || 'Self', sumInsured: si, copayPercentage: cp, deductible: ded, roomRentLimit: room, treatmentLimit: sub, validFrom: f.validFrom, validTo: f.validTo, ...(f.inceptionDate ? { inceptionDate: f.inceptionDate } : {}) });
  };

  return (
    <div style={panel}>
      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Edit {initial.name}</h3>
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
        <Field label="Inception date (optional)" hint="First-ever start with this insurer. Used for waiting periods; blank = Valid from."><input style={input} type="date" value={f.inceptionDate} onChange={set('inceptionDate')} /></Field>
      </div>
      {err && <p role="alert" style={{ color: '#DC2626', fontSize: 13, margin: '8px 0' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button style={btn} onClick={submit}>Save changes</button><button style={ghost} onClick={onCancel}>Cancel</button></div>
    </div>
  );
}
