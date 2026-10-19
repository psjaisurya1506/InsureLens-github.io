'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AREA_LABELS, AreaKey } from '@/lib/hospitalPlanner';
import { buildInsights } from '@/lib/insights';
import { claimedAmount, countsAgainstCover, policyUsed, useInsureStore, useIsClient } from '@/lib/store';

const INR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 };
const LEVEL: Record<string, { bg: string; border: string; color: string }> = {
  critical: { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309' },
  info: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8' },
};

export default function Overview() {
  const { policies, claims } = useInsureStore();
  const isClient = useIsClient();
  const totals = useMemo(() => {
    const sum = policies.reduce((a, p) => a + p.sumInsured, 0);
    const used = policies.reduce((a, p) => a + policyUsed(p.id, claims), 0);
    const areas = (Object.keys(AREA_LABELS) as AreaKey[]).map((a) => ({
      area: a,
      total: claims.filter(countsAgainstCover).reduce((s, c) => s + (c.areas[a] || 0), 0),
    })).sort((a, b) => b.total - a.total);
    return { sum, used, left: Math.max(0, sum - used), areas };
  }, [policies, claims]);
  const insights = useMemo(() => (isClient ? buildInsights(policies, claims, new Date()) : []), [isClient, policies, claims]);
  const recent = [...claims].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const maxArea = Math.max(1, ...totals.areas.map((a) => a.total));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {[['Total sum insured', INR(totals.sum), '#0F172A'], ['Claimed so far', INR(totals.used), '#DC2626'], ['Can still claim', INR(totals.left), '#16A34A'], ['Policies', String(policies.length), '#2563EB']].map(([l, v, c]) => (
          <div key={l} style={card}><div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 24, fontWeight: 800, color: c }}>{v}</div></div>
        ))}
      </div>

      <Link href="/dashboard/hospitals" style={{ textDecoration: 'none', background: '#2563EB', color: '#fff', borderRadius: 12, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span><b style={{ fontSize: 16 }}>Planning a hospital admission?</b><br /><span style={{ fontSize: 13, opacity: 0.9 }}>See how much you can claim and compare hospitals by what you pay and what cover is left.</span></span>
        <span style={{ background: '#fff', color: '#2563EB', fontWeight: 800, padding: '10px 18px', borderRadius: 8, fontSize: 14 }}>Open Hospital Planner →</span>
      </Link>

      {insights.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.slice(0, 4).map((i, idx) => (
            <div key={idx} style={{ background: LEVEL[i.level].bg, border: `1px solid ${LEVEL[i.level].border}`, borderRadius: 10, padding: '12px 16px' }}>
              <b style={{ color: LEVEL[i.level].color }}>{i.title}</b>
              <div style={{ fontSize: 13, color: '#475569' }}>{i.message}{i.href && <> <Link href={i.href} style={{ color: LEVEL[i.level].color, fontWeight: 700 }}>Open →</Link></>}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Claimed by area (all policies)</h3>
          {totals.areas.map((a) => (
            <div key={a.area} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 90px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12 }}>{AREA_LABELS[a.area]}</span>
              <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4 }}><div style={{ width: `${(a.total / maxArea) * 100}%`, height: '100%', background: '#2563EB', borderRadius: 4 }} /></div>
              <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{INR(a.total)}</span>
            </div>
          ))}
        </div>
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Recent claims</h3>
          {recent.length === 0 && <p style={{ fontSize: 13, color: '#64748B' }}>No claims recorded yet.</p>}
          {recent.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: '1px solid #F1F5F9', fontSize: 13 }}>
              <span><b>{c.hospital}</b><br /><span style={{ color: '#64748B', fontSize: 12 }}>{c.treatment} · {c.date} · {c.status}</span></span>
              <b style={{ color: '#16A34A' }}>{INR(claimedAmount(c))}</b>
            </div>
          ))}
          <Link href="/dashboard/manage" style={{ color: '#2563EB', fontWeight: 700, fontSize: 13 }}>Manage policies & claims →</Link>
        </div>
      </div>
    </div>
  );
}
