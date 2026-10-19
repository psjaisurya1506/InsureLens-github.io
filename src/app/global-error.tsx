'use client';

// Last-resort error page (replaces the root layout if it fails).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', padding: 40 }}>
        <h1>InsureLens could not load</h1>
        <p>Please refresh the page. If it keeps happening, run <code>npm run clean</code> and restart the dev server.</p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
