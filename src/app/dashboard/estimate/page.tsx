'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { compareHospitals } from '@/lib/hospitalPlanner';
import { assessEligibility, inr, summarize, VERDICT_LABEL, VERDICT_STYLE } from '@/lib/eligibility';
import type { CheckStatus, EligibilityReport, Verdict } from '@/lib/eligibility';
import type { HospitalEstimate } from '@/lib/hospitalPlanner';
import { policyUsed, toPolicyData, useInsureStore, useIsClient } from '@/lib/store';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 };
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', padding: '8px 10px', letterSpacing: 0.5 };
const td: React.CSSProperties = { fontSize: 13, padding: '10px', borderTop: '1px solid #F1F5F9', color: '#0F172A', verticalAlign: 'top' };
const field: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, marginLeft: 8, background: '#fff' };
const label: React.CSSProperties = { fontSize: 13, fontWeight: 700 };

type SortKey = 'youPay' | 'bill' | 'coverage';

const CHECK_ICON: Record<CheckStatus, { icon: string; color: string }> = {
  pass: { icon: '✓', color: '#16A34A' },
  warn: { icon: '!', color: '#D97706' },
  fail: { icon: '✕', color: '#DC2626' },
};

function Badge({ verdict }: { verdict: Verdict }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span style={{ display: 'inline-block', background: s.bg, color: s.fg, border: `1px solid ${s.border}`, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

function Stat({ label: l, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{l}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color ?? '#0F172A' }}>{value}</div>
    </div>
  );
}

export default function CostEstimatorPage() {
  const store = useInsureStore();
  const isClient = useIsClient();
  const [policyId, setPolicyId] = useState('');
  const [treatmentKey, setTreatmentKey] = useState('');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [networkOnly, setNetworkOnly] = useState(false);
  const [budget, setBudget] = useState('');
  const [sort, setSort] = useState<SortKey>('youPay');
  const [openId, setOpenId] = useState<string | null>(null);

  const stored = store.policies.find((p) => p.id === policyId) ?? store.policies[0];
  const treatment = store.treatments.find((t) => t.key === treatmentKey) ?? store.treatments[0];
  const used = stored ? policyUsed(stored.id, store.claims) : 0;
  const policy = useMemo(() => (stored ? toPolicyData(stored, used) : null), [stored, used]);

  const visibleTreatments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? store.treatments.filter((t) => t.label.toLowerCase().includes(q)) : store.treatments;
  }, [store.treatments, query]);

  const cities = useMemo(() => Array.from(new Set(store.hospitals.filter((h) => h.active !== false).map((h) => h.city))).sort(), [store.hospitals]);

  // Date-dependent analysis only runs after hydration so server and client output always match.
  const analysis = useMemo(() => {
    if (!isClient || !stored || !policy || !treatment) return null;
    const now = new Date();
    const all = compareHospitals(treatment, policy, store.hospitals);
    const max = Number(budget);
    const items = all
      .filter((e) => (city ? e.hospital.city === city : true))
      .filter((e) => (networkOnly ? e.hospital.network : true))
      .filter((e) => (max > 0 ? e.youPay <= max : true))
      .map((est) => ({ est, report: assessEligibility(est, treatment, stored, used, now) }));
    items.sort((a, b) => (sort === 'youPay' ? a.est.youPay - b.est.youPay : sort === 'bill' ? a.est.result.totalBill - b.est.result.totalBill : b.report.coveragePct - a.report.coveragePct));
    const unpriced = store.hospitals.filter((h) => h.active !== false && !h.prices[treatment.key]).map((h) => h.name);
    return { items, summary: summarize(items), unpriced, matched: all.length };
  }, [isClient, stored, policy, treatment, store.hospitals, city, networkOnly, budget, sort, used]);

  if (store.policies.length === 0 || store.treatments.length === 0 || !stored || !treatment) {
    return (
      <div style={card}>
        Add a policy on the <Link href="/dashboard/manage" style={{ color: '#2563EB', fontWeight: 700 }}>Policies &amp; Claims</Link> page, and make sure at least one treatment exists in the{' '}
        <Link href="/dashboard/directory" style={{ color: '#2563EB', fontWeight: 700 }}>Hospital Directory</Link>, to estimate costs.
      </div>
    );
  }

  const remaining = Math.max(0, stored.sumInsured - used);
  const sty = analysis ? VERDICT_STYLE[analysis.summary.verdict] : VERDICT_STYLE.partial;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Treatment Cost Estimator</h1>
          <p style={{ color: '#475569', fontSize: 14, marginTop: 4, maxWidth: 720 }}>
            Choose a treatment to see what it is expected to cost at each hospital, how much your policy will pay, and whether you are <b>eligible</b> after a full check of your policy.
          </p>
        </div>
        <button className="no-print" onClick={() => window.print()} style={{ alignSelf: 'flex-start', padding: '9px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Print / save as PDF
        </button>
      </div>

      {/* Policy */}
      <div style={card}>
        <label style={label}>
          Policy
          <select aria-label="Policy" style={field} value={stored.id} onChange={(e) => { setPolicyId(e.target.value); setOpenId(null); }}>
            {store.policies.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.holder}</option>)}
          </select>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, marginTop: 14 }}>
          <Stat label="Sum insured" value={inr(stored.sumInsured)} />
          <Stat label="Already claimed" value={inr(used)} color="#DC2626" />
          <Stat label="Can still claim" value={inr(remaining)} color="#16A34A" />
          <Stat label="Co-pay" value={`${stored.copayPercentage}%`} />
          <Stat label="Valid until" value={stored.validTo} />
        </div>
      </div>

      {/* Treatment filter */}
      <div style={card} className="no-print">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <label style={label}>
            Find a treatment
            <input aria-label="Search treatments" style={{ ...field, width: 240 }} type="search" placeholder="e.g. knee, cataract" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <span style={{ fontSize: 12, color: '#64748B' }}>{visibleTreatments.length} of {store.treatments.length} treatments</span>
        </div>
        <div role="radiogroup" aria-label="Treatment" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
          {visibleTreatments.length === 0 && <span style={{ fontSize: 13, color: '#64748B' }}>No treatment matches “{query}”.</span>}
          {visibleTreatments.map((t) => {
            const active = t.key === treatment.key;
            return (
              <button
                key={t.key}
                role="radio"
                aria-checked={active}
                onClick={() => { setTreatmentKey(t.key); setOpenId(null); }}
                style={{ padding: '7px 14px', borderRadius: 999, border: `1px solid ${active ? '#2563EB' : '#CBD5E1'}`, background: active ? '#2563EB' : '#fff', color: active ? '#fff' : '#0F172A', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
          <label style={label}>
            City
            <select aria-label="City" style={field} value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={label}>
            Max you can pay (₹)
            <input aria-label="Maximum you can pay" style={{ ...field, width: 120 }} type="number" min={0} placeholder="any" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </label>
          <label style={label}>
            Sort by
            <select aria-label="Sort by" style={field} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="youPay">Lowest you pay</option>
              <option value="bill">Lowest bill</option>
              <option value="coverage">Highest insurer share</option>
            </select>
          </label>
          <label style={label}><input type="checkbox" checked={networkOnly} onChange={(e) => setNetworkOnly(e.target.checked)} /> Cashless network only</label>
        </div>
      </div>

      {!analysis ? (
        <div style={card}>Preparing your estimate…</div>
      ) : (
        <>
          {/* Overall verdict */}
          <div style={{ ...card, background: sty.bg, borderColor: sty.border }} aria-live="polite">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: sty.fg, textTransform: 'uppercase', letterSpacing: 0.6 }}>Overall result for {treatment.label}</span>
              <Badge verdict={analysis.summary.verdict} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: sty.fg, marginTop: 8 }}>{analysis.summary.headline}</p>
            {analysis.summary.total > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, marginTop: 14 }}>
                <Stat label="Lowest estimate" value={inr(analysis.summary.minBill)} />
                <Stat label="Average estimate" value={inr(analysis.summary.avgBill)} />
                <Stat label="Highest estimate" value={inr(analysis.summary.maxBill)} />
                <Stat label="Hospitals compared" value={String(analysis.summary.total)} />
              </div>
            )}
          </div>

          {/* Hospitals */}
          {analysis.items.length === 0 ? (
            <div style={{ ...card, background: '#FFFBEB', borderColor: '#FDE68A' }}>
              {analysis.matched === 0
                ? <>No hospital has a price for {treatment.label} yet. Add prices in the <Link href="/dashboard/directory" style={{ color: '#2563EB', fontWeight: 700 }}>Hospital Directory</Link> or ask your administrator.</>
                : 'No hospital matches these filters. Clear the city or budget filter, or turn off the network filter.'}
            </div>
          ) : (
            <div style={{ ...card, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                <thead>
                  <tr><th style={th}>Hospital</th><th style={th}>Estimated cost</th><th style={th}>Insurer pays</th><th style={th}>You pay</th><th style={th}>Eligibility</th><th style={th} className="no-print" /></tr>
                </thead>
                <tbody>
                  {analysis.items.map(({ est, report }) => (
                    <HospitalRow key={est.hospital.id} est={est} report={report} best={est.hospital.id === analysis.summary.bestHospitalId} open={openId === est.hospital.id} onToggle={() => setOpenId(openId === est.hospital.id ? null : est.hospital.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {analysis.unpriced.length > 0 && (
            <p style={{ fontSize: 12, color: '#64748B' }}>No price on file for {treatment.label} at: {analysis.unpriced.join(', ')}. These hospitals are left out of the comparison.</p>
          )}
        </>
      )}

      <p style={{ fontSize: 12, color: '#64748B' }}>
        Estimates for a {treatment.days}-day stay under {stored.name}, using the hospital prices maintained by your administrator and your policy rules (waiting period, room-rent limit, procedure sub-limit, deductible already met, co-payment, remaining sum insured). Eligibility here is an estimate, not an insurer decision; confirm with your insurer or TPA before admission.
      </p>
    </div>
  );
}

function HospitalRow({ est, report, best, open, onToggle }: { est: HospitalEstimate; report: EligibilityReport; best: boolean; open: boolean; onToggle: () => void }) {
  return (
    <Fragment>
      <tr>
        <td style={td}>
          <b>{est.hospital.name}</b>
          {best && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, background: '#16A34A', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>LOWEST OUT-OF-POCKET</span>}
          <div style={{ fontSize: 11, color: '#64748B' }}>{est.hospital.city} · {est.hospital.network ? 'Cashless network' : 'Non-network (reimbursement)'}</div>
        </td>
        <td style={td}>{inr(est.result.totalBill)}</td>
        <td style={{ ...td, color: '#16A34A', fontWeight: 700 }}>{inr(est.covered)}<div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{report.coveragePct}% of bill</div></td>
        <td style={{ ...td, color: '#DC2626', fontWeight: 700 }}>{inr(est.youPay)}</td>
        <td style={td}><Badge verdict={report.verdict} /></td>
        <td style={td} className="no-print">
          <button onClick={onToggle} aria-expanded={open} style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>
            {open ? 'Hide analysis' : 'Full analysis'}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ background: '#F8FAFC', padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{report.headline}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
              <div>
                <div style={{ ...th, padding: '0 0 6px' }}>Eligibility checks</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {report.checks.map((c) => (
                    <li key={c.id} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                      <span aria-label={c.status} style={{ flex: '0 0 20px', height: 20, borderRadius: 10, background: CHECK_ICON[c.status].color, color: '#fff', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{CHECK_ICON[c.status].icon}</span>
                      <span><b>{c.label}.</b> <span style={{ color: '#475569' }}>{c.detail}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div style={{ ...th, padding: '0 0 6px' }}>Where the cost goes</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Area</th><th style={th}>Billed</th><th style={th}>Insurer</th><th style={th}>You</th></tr></thead>
                  <tbody>
                    {est.areas.map((a) => (
                      <tr key={a.area}><td style={td}>{a.label}</td><td style={td}>{inr(a.billed)}</td><td style={{ ...td, color: '#16A34A' }}>{inr(a.covered)}</td><td style={{ ...td, color: '#DC2626' }}>{inr(a.youPay)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
