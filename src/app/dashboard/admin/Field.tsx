import type { ReactNode } from 'react';

export default function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block' }}>
      {label}
      <div style={{ marginTop: 4 }}>{children}</div>
      {hint && <div style={{ fontSize: 11, fontWeight: 500, color: '#64748B', marginTop: 3 }}>{hint}</div>}
    </label>
  );
}
