# InsureLens — setup, run & troubleshooting

## 1. One-time setup
1. Install **Node.js 22 LTS** from https://nodejs.org (minimum 20.9). Check with `node -v`.
2. Unzip the project to a **short, plain folder**, e.g. `C:\dev\InsureLens` (avoid OneDrive/Desktop-sync folders, spaces and non-English characters).
3. Open a terminal **in the folder that contains `package.json` and `src`** (not one level above).

## 2. Run it
- Windows: double-click `start.bat`  ·  macOS/Linux: `./start.sh`
- Or manually: `npm install` then `npm run dev`, and open http://localhost:3000
- On the login page use **Register** to create a demo profile (stored only in your browser).

`npm run dev` first runs an automatic pre-flight check (`npm run doctor`) that tells you in plain words what is wrong.

## 2b. Administrator sign-in
Sign in with **admin@insurelens.ai** / **Admin@123** to open *Administration* (sidebar). Any other email signs in as a regular user. Change the account by copying `.env.example` to `.env.local` and setting `NEXT_PUBLIC_ADMIN_EMAIL` / `NEXT_PUBLIC_ADMIN_PASSWORD`, then restart. This is demo-level, browser-only protection: replace it with real authentication (e.g. Supabase) before real use.

## 3. If you see "Internal Server Error"
Try in this order — each takes under a minute:
1. `npm run doctor` — fixes the folder / Node version / port problems it reports.
2. Stop the dev server (Ctrl+C), then `npm run clean` and `npm run dev` again.
3. `npm run dev:webpack` — uses the older bundler, which avoids a class of Turbopack crashes on some Windows setups.
4. `npm run reset` then `npm install` — full clean reinstall.
5. In the browser, clear this site's data (DevTools → Application → Clear storage) or click **Reset saved data & retry** on the error page.
6. Still failing? Copy the red error text from the **terminal** (not the browser) — that is the real cause.

## 4. Check before deploying
```
npm run typecheck && npm run lint && npm run build
```

## 5. Deploy
**GitHub Pages:** push to `main` → repository **Settings → Pages → Source: GitHub Actions**. The workflow builds with the right base path automatically. Live at `https://<username>.github.io/<repo>/`.

**Vercel:** push to GitHub → vercel.com → *Add New → Project* → import the repo → *Deploy*. No environment variables needed.

## 6. What still needs your manual action before real clients use it
- Replace sample hospital prices (Hospital Directory page) with real quotations.
- Data lives in each user's browser. For multi-device / multi-user use, add a database (e.g. Supabase) and real authentication.
- Do not enter real medical or identity documents until that backend, privacy policy and access controls exist.
