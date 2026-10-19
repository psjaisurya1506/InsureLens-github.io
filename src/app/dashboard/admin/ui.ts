import type { CSSProperties } from 'react';

export const card: CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 };
export const th: CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', padding: '8px 10px', letterSpacing: 0.5 };
export const td: CSSProperties = { fontSize: 13, padding: '10px', borderTop: '1px solid #F1F5F9', color: '#0F172A', verticalAlign: 'top' };
export const input: CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, width: '100%', boxSizing: 'border-box', background: '#fff' };
export const btn: CSSProperties = { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
export const ghost: CSSProperties = { ...btn, background: '#F1F5F9', color: '#0F172A', border: '1px solid #CBD5E1' };
export const danger: CSSProperties = { background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700, fontSize: 12, padding: '2px 6px' };
export const link: CSSProperties = { background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontWeight: 700, fontSize: 12, padding: '2px 6px' };
export const panel: CSSProperties = { background: '#F8FAFC', padding: 14, borderRadius: 10, marginBottom: 14 };
