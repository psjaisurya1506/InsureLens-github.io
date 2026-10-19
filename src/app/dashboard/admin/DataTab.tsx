'use client';

import { useRef, useState } from 'react';
import { useInsureStore } from '@/lib/store';
import { btn, card, ghost } from './ui';

const MAX_BYTES = 5 * 1024 * 1024;

export default function DataTab() {
  const store = useInsureStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const exportJson = () => {
    const payload = { app: 'insurelens', version: 1, exportedAt: new Date().toISOString(), policies: store.policies, claims: store.claims, hospitals: store.hospitals, treatments: store.treatments };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `insurelens-catalog-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    setMsg({ ok: true, text: 'Catalog exported.' });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) return setMsg({ ok: false, text: 'That file is larger than 5 MB.' });
    let parsed: unknown;
    try { parsed = JSON.parse(await file.text()); } catch { return setMsg({ ok: false, text: 'That file is not valid JSON.' }); }
    if (!confirm('Replace ALL current policies, claims, hospitals and treatments with the contents of this file?')) return;
    const ok = store.importData(parsed);
    setMsg(ok ? { ok: true, text: 'Catalog imported. Invalid rows, if any, were skipped.' } : { ok: false, text: 'Import failed: the file needs "policies", "hospitals" and "treatments" lists. Nothing was changed.' });
  };

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800 }}>Backup, restore &amp; reset</h2>
      <p style={{ fontSize: 13, color: '#475569' }}>
        InsureLens keeps its data in this browser. Export a JSON backup to move the hospital catalog to another browser or computer, or to keep a copy before making big changes.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button style={btn} onClick={exportJson}>Export catalog (JSON)</button>
        <button style={ghost} onClick={() => fileRef.current?.click()}>Import catalog (JSON)</button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display: 'none' }} aria-label="Import catalog file" />
        <button style={{ ...ghost, color: '#DC2626' }} onClick={() => { if (confirm('Replace ALL data (policies, claims, hospitals, treatments) with the demo data?')) { store.reset(); setMsg({ ok: true, text: 'Demo data restored.' }); } }}>Reset to demo data</button>
      </div>
      {msg && <p role="status" style={{ fontSize: 13, fontWeight: 700, color: msg.ok ? '#15803D' : '#DC2626' }}>{msg.text}</p>}
    </div>
  );
}
