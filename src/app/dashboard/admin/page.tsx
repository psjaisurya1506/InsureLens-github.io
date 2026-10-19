'use client';

import { useState } from 'react';
import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { useIsClient } from '@/lib/store';
import DataTab from './DataTab';
import HospitalsTab from './HospitalsTab';
import OverviewTab from './OverviewTab';
import PoliciesTab from './PoliciesTab';
import TreatmentsTab from './TreatmentsTab';
import { card } from './ui';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'hospitals', label: 'Hospitals & prices' },
  { id: 'treatments', label: 'Treatments & rules' },
  { id: 'policies', label: 'Policies' },
  { id: 'data', label: 'Backup & reset' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function AdminPage() {
  const isClient = useIsClient();
  const [tab, setTab] = useState<TabId>('overview');

  if (!isClient) return <div style={card}>Loading…</div>;

  if (!isAdmin()) {
    return (
      <div style={{ ...card, background: '#FEF2F2', borderColor: '#FECACA', maxWidth: 560 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#B91C1C' }}>Administrators only</h1>
        <p style={{ fontSize: 14, color: '#7F1D1D', margin: '8px 0 14px' }}>You are signed in as a regular user, so the administration area is not available. Sign out and sign in with the administrator account to manage hospitals, treatments and rules.</p>
        <Link href="/dashboard/estimate" style={{ color: '#2563EB', fontWeight: 700, fontSize: 14 }}>Go to the cost estimator →</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Administration</h1>
        <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>Manage the hospitals, treatment prices and eligibility rules used by the cost estimator.</p>
      </div>
      <div role="tablist" aria-label="Administration sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, borderBottom: '1px solid #E2E8F0' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: `3px solid ${tab === t.id ? '#2563EB' : 'transparent'}`, color: tab === t.id ? '#1D4ED8' : '#475569', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <OverviewTab />}
      {tab === 'hospitals' && <HospitalsTab />}
      {tab === 'treatments' && <TreatmentsTab />}
      {tab === 'policies' && <PoliciesTab />}
      {tab === 'data' && <DataTab />}
    </div>
  );
}
