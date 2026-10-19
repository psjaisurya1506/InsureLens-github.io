@echo off
rem One-step start for Windows: installs dependencies if needed, then runs the dev server.
cd /d "%~dp0"
if not exist node_modules\next call npm install
call npm run dev
pause
