'use client';

import { useEffect } from 'react';

// Shown instead of a blank "Internal Server Error" when a page throws while rendering.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#F8FAFC' }}>
      <div style={{ maxWidth: 520, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 14 }}>
          This page hit an error. Your saved policies and claims are not lost. Try again, or reset the saved browser data if the problem keeps coming back.
        </p>
        <pre style={{ background: '#F1F5F9', padding: 10, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap', marginBottom: 14 }}>{error.message}</pre>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={reset} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
          <button
            onClick={() => {
              try { window.localStorage.removeItem('insurelens.store.v1'); } catch { /* ignore */ }
              reset();
            }}
            style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            Reset saved data &amp; retry
          </button>
        </div>
      </div>
    </div>
  );
}
