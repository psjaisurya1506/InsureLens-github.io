'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { buildInsights } from '@/lib/insights';
import { useInsureStore, useIsClient } from '@/lib/store';

const COLORS = { critical: '#DC2626', warning: '#D97706', info: '#2563EB' } as const;

/** Live alerts computed from the saved policies and claims. */
export default function SmartAlerts() {
  const { policies, claims } = useInsureStore();
  const isClient = useIsClient();
  const items = useMemo(() => (isClient ? buildInsights(policies, claims, new Date()) : []), [isClient, policies, claims]);
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Live alerts from your policies</h2>
      {items.length === 0 ? (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 16, fontSize: 14 }}>All clear — plenty of cover left and no policies expiring soon.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((i, idx) => (
            <div key={idx} style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #E2E8F0', borderLeft: `5px solid ${COLORS[i.level]}` }}>
              <div style={{ fontWeight: 800 }}>{i.title}</div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{i.message}</div>
              {i.href && <Link href={i.href} style={{ color: '#2563EB', fontWeight: 700, fontSize: 13 }}>Take action →</Link>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
