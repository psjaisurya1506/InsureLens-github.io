'use client';

import { inr } from '@/lib/eligibility';
import { useInsureStore } from '@/lib/store';
import { card, td, th } from './ui';

export default function OverviewTab() {
  const store = useInsureStore();
  const active = store.hospitals.filter((h) => h.active !== false);
  const tiles = [
    { label: 'Hospitals', value: `${active.length} active`, sub: `${store.hospitals.length} total` },
    { label: 'Treatments', value: String(store.treatments.length), sub: `${store.treatments.filter((t) => t.covered === false).length} excluded` },
    { label: 'Policies', value: String(store.policies.length), sub: `${store.claims.length} claims on file` },
  ];
  const avg = (key: string) => {
    const ps = active.map((h) => h.prices[key]).filter(Boolean);
    if (ps.length === 0) return null;
    const totals = ps.map((p) => Object.values(p).reduce((a, b) => a + b, 0));
    return Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {tiles.map((t) => (
          <div key={t.label} style={card}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{t.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{t.value}</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{t.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, overflowX: 'auto' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Price coverage</h2>
        <p style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>A ✓ means the hospital has a price for that treatment. Gaps mean the hospital is skipped for that treatment.</p>
        {store.treatments.length === 0 || active.length === 0 ? (
          <p style={{ fontSize: 13 }}>Add at least one active hospital and one treatment to see the matrix.</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr><th style={th}>Treatment</th><th style={th}>Avg. bill</th>{active.map((h) => <th key={h.id} style={{ ...th, textAlign: 'center' }}>{h.name}</th>)}</tr>
            </thead>
            <tbody>
              {store.treatments.map((t) => {
                const a = avg(t.key);
                return (
                  <tr key={t.key}>
                    <td style={td}><b>{t.label}</b></td>
                    <td style={td}>{a === null ? '—' : inr(a)}</td>
                    {active.map((h) => <td key={h.id} style={{ ...td, textAlign: 'center', color: h.prices[t.key] ? '#16A34A' : '#CBD5E1', fontWeight: 800 }}>{h.prices[t.key] ? '✓' : '–'}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>How the eligibility verdict is decided</h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li><b>Not eligible</b> if the policy is expired or not yet started, the treatment is excluded or still inside its waiting period, the sum insured is used up, or the insurer would pay nothing.</li>
          <li><b>Eligible with limits</b> if cover applies but part of the bill is not paid: the bill exceeds remaining cover, the room rent or procedure sub-limit is exceeded, or you would pay more than half.</li>
          <li><b>Eligible</b> if none of the above apply. Co-pay and deductible are always shown in the cost split.</li>
        </ul>
      </div>
    </div>
  );
}
