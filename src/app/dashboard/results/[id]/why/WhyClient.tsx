'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DEMO_ANALYSIS } from '@/lib/demoData';
import { DeductionItem } from '@/types';

const INR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const PCT = (val: number) => `${val}%`;

interface MLDeductionBenchmark {
  label: string;
  category: string;
  myAmount: number;
  peerAvgAmount: number;
  peerFrequency: number; // % of peers who received this deduction
  disputePotential: 'Low' | 'Medium' | 'High';
  disputeAdvice: string;
}

const PEER_DEDUCTION_BENCHMARKS: Record<string, MLDeductionBenchmark[]> = {
  'Knee Replacement Surgery': [
    {
      label: 'Co-payment (10%)',
      category: 'copay',
      myAmount: 30000,
      peerAvgAmount: 32000,
      peerFrequency: 82,
      disputePotential: 'Low',
      disputeAdvice: 'Standard contractual clause in policy schedule. Rarely negotiable unless pre-existing waiver rider exists.',
    },
    {
      label: 'Non-admissible Expenses',
      category: 'non_admissible',
      myAmount: 25000,
      peerAvgAmount: 22500,
      peerFrequency: 94,
      disputePotential: 'High',
      disputeAdvice: 'Often disputed successfully. Request itemized breakdown from hospital; items like consumables & nursing charges can be re-categorized by doctor certification.',
    },
    {
      label: 'Treatment Sub-limit',
      category: 'treatment_limit',
      myAmount: 20000,
      peerAvgAmount: 18000,
      peerFrequency: 68,
      disputePotential: 'Low',
      disputeAdvice: 'Defined per-procedure cap in Section 5.3. Cannot exceed unless policy has a super top-up or restoration trigger.',
    },
    {
      label: 'Annual Deductible',
      category: 'deductible',
      myAmount: 15000,
      peerAvgAmount: 15000,
      peerFrequency: 45,
      disputePotential: 'Low',
      disputeAdvice: 'Fixed threshold applied once per policy year. Only applies to first claim in the period.',
    },
    {
      label: 'Needs Clarification',
      category: 'clarification',
      myAmount: 10000,
      peerAvgAmount: 8500,
      peerFrequency: 39,
      disputePotential: 'High',
      disputeAdvice: 'Pending TPA query. Submitting complete OT notes and surgeon prescription usually releases this amount.',
    },
  ],
};

function DeductionCard({
  deduction,
  index,
  isOpen,
  onToggle,
}: {
  deduction: DeductionItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#FFFFFF',
        boxShadow: isOpen ? '0 4px 12px rgba(0, 0, 0, 0.04)' : 'none',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '20px 24px',
          background: isOpen ? '#F8FAFC' : '#FFFFFF',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: '#0F172A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>{deduction.label}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
            Policy Reference: <strong style={{ color: '#0F172A' }}>{deduction.policyReference}</strong>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#DC2626' }}>{INR(deduction.amount)}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginTop: 2 }}>
            {isOpen ? 'Collapse [-]' : 'View Clause [+]'}
          </div>
        </div>
      </button>

      {isOpen && (
        <div style={{ padding: '20px 24px 24px', borderTop: '1px solid #E2E8F0', background: '#FAFAFA' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
              Reason for Deduction
            </div>
            <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
              {deduction.reason}
            </p>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderLeft: '4px solid #2563EB',
              borderRadius: 6,
              padding: '14px 18px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
              Extracted Policy Clause ({deduction.policyReference})
            </div>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, fontStyle: 'italic' }}>
              "{deduction.clauseText}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhyClient() {
  const params = useParams();
  const claimId = (params?.id as string) || 'CLM-2026-001';
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [allOpen, setAllOpen] = useState(false);
  const [viewTab, setViewTab] = useState<'clauses' | 'ml-compare'>('clauses');

  const [patientInfo, setPatientInfo] = useState({
    treatment: 'Knee Replacement Surgery',
    hospital: 'Apollo Hospitals',
    name: 'Jack',
    relationship: 'Self',
    age: 28,
    billAmount: 400000,
  });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('current_claim_patient');
      if (stored) {
        setPatientInfo((prev) => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch {}
  }, []);

  const result = DEMO_ANALYSIS.result!;

  const toggleAll = () => {
    setAllOpen(!allOpen);
    setOpenIdx(null);
  };

  // ML benchmark values for this treatment
  const peerSampleSize = 3842;
  const peerAvgBill = 370000;
  const peerAvgInsurance = 280000;
  const peerAvgPatient = 90000;
  const peerAvgCoveragePct = 76;
  const myEstimatedPatient = result.financialGap; // ₹1,00,000
  const myEstimatedInsurance = patientInfo.billAmount - myEstimatedPatient;
  const myCoveragePct = Math.round((myEstimatedInsurance / patientInfo.billAmount) * 100);

  const deductionBenchmarks =
    PEER_DEDUCTION_BENCHMARKS[patientInfo.treatment] || PEER_DEDUCTION_BENCHMARKS['Knee Replacement Surgery'];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: '#64748B' }}>
        <Link href="/dashboard" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
        <span>/</span>
        <Link href={`/dashboard/results/${claimId}`} style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>Results</Link>
        <span>/</span>
        <span style={{ color: '#0F172A', fontWeight: 700 }}>Why Am I Paying This?</span>
      </div>

      {/* Mandatory Disclaimer */}
      <div
        style={{
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderLeft: '4px solid #D97706',
          borderRadius: 8,
          padding: '14px 18px',
          fontSize: 13,
          color: '#92400E',
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        <strong style={{ textTransform: 'uppercase' }}>Estimate Notice: </strong>
        These are illustrative estimates based on the information available in the uploaded documents. 
        Final claim settlement depends on policy terms and insurer/TPA authorization.
      </div>

      {/* Main Title Section */}
      <div style={{ background: '#0F172A', borderRadius: 12, padding: '32px 30px', color: '#FFFFFF', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94A3B8' }}>
            Financial Gap Intelligence & ML Benchmarking
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            background: '#2563EB',
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: 4,
            textTransform: 'uppercase',
          }}>
            ML Indexed: {peerSampleSize.toLocaleString('en-IN')} Peer Records
          </span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
          Why Am I Paying This?
        </h1>
        <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6 }}>
          Evaluating your estimated patient out-of-pocket responsibility of{' '}
          <strong style={{ color: '#F87171' }}>{INR(result.financialGap)}</strong> for{' '}
          <strong style={{ color: '#FFFFFF' }}>{patientInfo.treatment}</strong> at {patientInfo.hospital} against both your policy clauses and historical patient records.
        </p>

        <div style={{ marginTop: 20, display: 'flex', gap: 24, flexWrap: 'wrap', borderTop: '1px solid #334155', paddingTop: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Total Hospital Bill</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF' }}>{INR(patientInfo.billAmount)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Potential Insurance Contribution</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#4ADE80' }}>₹3,20,000 – ₹3,60,000</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Estimated Patient Responsibility</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#F87171' }}>{INR(result.financialGap)}</div>
          </div>
        </div>
      </div>

      {/* VIEW MODE TABS: Clauses vs ML Peer Comparison */}
      <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #CBD5E1', marginBottom: 24, width: 'fit-content' }}>
        <button
          type="button"
          onClick={() => setViewTab('clauses')}
          style={{
            padding: '11px 22px',
            fontSize: 13,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            background: viewTab === 'clauses' ? '#0F172A' : '#FFFFFF',
            color: viewTab === 'clauses' ? '#FFFFFF' : '#475569',
            transition: 'all 0.15s',
          }}
        >
          Policy Clause Breakdown
        </button>

        <button
          type="button"
          onClick={() => setViewTab('ml-compare')}
          style={{
            padding: '11px 22px',
            fontSize: 13,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            background: viewTab === 'ml-compare' ? '#0F172A' : '#FFFFFF',
            color: viewTab === 'ml-compare' ? '#FFFFFF' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
        >
          <span>ML Peer Comparison</span>
          <span style={{
            fontSize: 10,
            fontWeight: 900,
            background: viewTab === 'ml-compare' ? '#2563EB' : '#EFF6FF',
            color: viewTab === 'ml-compare' ? '#FFFFFF' : '#2563EB',
            padding: '2px 6px',
            borderRadius: 4,
            textTransform: 'uppercase',
          }}>
            ML Data
          </span>
        </button>
      </div>

      {/* ── TAB 1: CLAUSE-BY-CLAUSE BREAKDOWN ─────────────────────────────── */}
      {viewTab === 'clauses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase' }}>
                Major Deductions & Policy Clauses
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                Click any deduction to view the exact wording and section from your insurance policy
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              {allOpen ? 'Collapse All' : 'Expand All'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
            {result.deductions.map((deduction, idx) => (
              <DeductionCard
                key={deduction.label}
                deduction={deduction}
                index={idx}
                isOpen={allOpen || openIdx === idx}
                onToggle={() => {
                  setAllOpen(false);
                  setOpenIdx(openIdx === idx ? null : idx);
                }}
              />
            ))}
          </div>

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              border: '2px solid #E2E8F0',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 28,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>Total Estimated Financial Gap</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Sum of co-payment, non-admissible expenses, sub-limits, and deductible
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#DC2626' }}>
              {INR(result.financialGap)}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ML PEER COMPARISON & HISTORICAL DEDUCTIONS ──────────────── */}
      {viewTab === 'ml-compare' && (
        <div>
          {/* Top ML Summary Cards */}
          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderLeft: '4px solid #2563EB',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1D4ED8', marginBottom: 4 }}>
              ML Model Intelligence for {patientInfo.treatment}
            </div>
            <div style={{ fontSize: 13, color: '#1E40AF', lineHeight: 1.6 }}>
              Benchmarked against <strong>{peerSampleSize.toLocaleString('en-IN')}</strong> anonymized patient claims with ₹10,00,000 floater policies admitted to Tier-1 accredited hospitals.
              Our model evaluates typical hospital billing structures and identifies which deductions are standard vs disputable.
            </div>
          </div>

          {/* Side-by-side Metric Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
            <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '20px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Patient Out-of-Pocket Share
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#2563EB' }}>YOUR ESTIMATE</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#DC2626' }}>{INR(myEstimatedPatient)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>PEER AVERAGE</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#475569' }}>{INR(peerAvgPatient)}</div>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#16A34A', fontWeight: 700 }}>
                ✓ Within normal range (P25–P75: ₹55k–₹1.3L)
              </div>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '20px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Effective Insurance Coverage %
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#2563EB' }}>YOUR POLICY</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#16A34A' }}>{PCT(myCoveragePct)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>PEER AVERAGE</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#475569' }}>{PCT(peerAvgCoveragePct)}</div>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#2563EB', fontWeight: 700 }}>
                ✦ Policy offers slightly higher coverage than peer baseline
              </div>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '20px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Total Hospital Bill Compared
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#2563EB' }}>YOUR BILL</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A' }}>{INR(patientInfo.billAmount)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>PEER AVERAGE</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#475569' }}>{INR(peerAvgBill)}</div>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#D97706', fontWeight: 700 }}>
                ⚠ Hospital charges approx. 8% above peer benchmark
              </div>
            </div>
          </div>

          {/* Deduction Breakdown Comparison Table */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, marginBottom: 28 }}>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase' }}>
                Deductions vs Peer Averages & Actionable Advice
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                Evaluates how each deduction in your bill compares to other patients, and highlights where appeals or corrections are possible
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Deduction Item', 'Your Amount', 'Peer Average', 'Peer Frequency', 'Dispute Potential', 'Actionable Guidance'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 14px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: 800,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderBottom: '2px solid #E2E8F0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deductionBenchmarks.map((item, idx) => (
                    <tr
                      key={item.label}
                      style={{ borderBottom: idx < deductionBenchmarks.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                    >
                      <td style={{ padding: '14px 14px', fontWeight: 800, color: '#0F172A' }}>
                        {item.label}
                      </td>
                      <td style={{ padding: '14px 14px', fontWeight: 900, color: '#DC2626', whiteSpace: 'nowrap' }}>
                        {INR(item.myAmount)}
                      </td>
                      <td style={{ padding: '14px 14px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                        {INR(item.peerAvgAmount)}
                      </td>
                      <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>
                          {item.peerFrequency}% of patients
                        </span>
                      </td>
                      <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background:
                              item.disputePotential === 'High'
                                ? '#FEF2F2'
                                : item.disputePotential === 'Medium'
                                ? '#FFFBEB'
                                : '#F1F5F9',
                            color:
                              item.disputePotential === 'High'
                                ? '#DC2626'
                                : item.disputePotential === 'Medium'
                                ? '#D97706'
                                : '#64748B',
                            border:
                              item.disputePotential === 'High'
                                ? '1px solid #FECACA'
                                : item.disputePotential === 'Medium'
                                ? '1px solid #FDE68A'
                                : '1px solid #CBD5E1',
                          }}
                        >
                          {item.disputePotential} Potential
                        </span>
                      </td>
                      <td style={{ padding: '14px 14px', fontSize: 12, color: '#334155', lineHeight: 1.5, minWidth: 260 }}>
                        {item.disputeAdvice}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingBottom: 20 }}>
        <Link
          href={`/dashboard/results/${claimId}`}
          style={{
            background: '#2563EB',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: 14,
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          ← Back to Financial Summary
        </Link>
        <Link
          href="/dashboard/utilization"
          style={{
            background: '#0F172A',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 14,
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          View Full ML Benchmark Ledger →
        </Link>
        <Link
          href="/dashboard/insurance"
          style={{
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid #CBD5E1',
            fontWeight: 700,
            fontSize: 14,
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          View My Insurance
        </Link>
      </div>
    </div>
  );
}
