// Pre-flight check run automatically before `npm run dev` / `npm run build`.
// Catches the usual reasons a Next.js app shows "Internal Server Error" on a new machine.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const cwd = process.cwd();
const problems = [];
const warnings = [];

// 1. Node version (Next.js 16 needs >= 20.9)
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  problems.push(`Node.js ${process.versions.node} is too old. Install Node 22 LTS from https://nodejs.org (minimum 20.9).`);
}

// 2. Running from the right folder
if (!fs.existsSync(path.join(cwd, 'package.json')) || !fs.existsSync(path.join(cwd, 'src', 'app'))) {
  problems.push(`Wrong folder: ${cwd}\n   Open a terminal in the folder that contains package.json and the "src" folder (zips often extract to InsureLens/InsureLens).`);
}

// 3. Dependencies installed
if (!fs.existsSync(path.join(cwd, 'node_modules', 'next'))) {
  problems.push('Dependencies are not installed. Run:  npm install');
}

// 4. Folder location problems (common on Windows)
if (/onedrive|dropbox|google drive|icloud/i.test(cwd)) {
  warnings.push('This folder is inside a cloud-synced directory (OneDrive/Dropbox/etc.). Syncing can lock files and crash the dev server. Move the project to a plain folder such as C:\\dev\\InsureLens.');
}
if (/\s/.test(cwd) || /[^\x00-\x7F]/.test(cwd)) {
  warnings.push(`The path contains spaces or non-English characters (${cwd}). Some tools fail on this; a short path like C:\\dev\\InsureLens is safer.`);
}
if (cwd.length > 150) warnings.push('The folder path is very long; Windows may fail on deep node_modules paths. Move the project closer to the drive root.');

// 5. Port 3000 busy?
const portFree = await new Promise((resolve) => {
  const s = net.createServer();
  s.once('error', () => resolve(false));
  s.once('listening', () => s.close(() => resolve(true)));
  s.listen(3000);
});
if (!portFree) warnings.push('Port 3000 is already in use (an old dev server may still be running). Close it, or run:  npm run dev -- -p 3001');

for (const w of warnings) console.warn(`\n⚠  ${w}`);
if (problems.length) {
  console.error('\n✖ InsureLens cannot start yet:\n');
  for (const p of problems) console.error(` - ${p}`);
  console.error('\nSee SETUP.md for step-by-step help.\n');
  process.exit(1);
}
console.log('✔ InsureLens pre-flight check passed.');
