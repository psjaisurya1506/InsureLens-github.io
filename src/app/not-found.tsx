import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Page not found</h1>
        <p style={{ color: '#475569', margin: '8px 0 16px' }}>That page does not exist.</p>
        <Link href="/dashboard" style={{ color: '#2563EB', fontWeight: 700 }}>Go to dashboard →</Link>
      </div>
    </div>
  );
}
