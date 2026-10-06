@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Orca Windows Quick Setup
echo.
echo Orca Windows Quick Setup
echo ========================
echo Installs Git, Node.js LTS, GitHub CLI, and the official stable Orca desktop app.
echo Existing installations are reused. Windows may ask you to approve installers.
echo You will sign in yourself; this setup does not copy passwords or API keys.
echo.
choice /C YN /N /M "Continue? [Y/N] "
if errorlevel 2 exit /b 0

where winget.exe >nul 2>nul
if errorlevel 1 goto missingwinget
where node.exe >nul 2>nul
if not errorlevel 1 goto nodeavailable
winget.exe install --id OpenJS.NodeJS.LTS --exact --source winget --accept-source-agreements --accept-package-agreements
if errorlevel 1 goto failed
:nodeavailable
set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%ProgramFiles%\Git\cmd;%ProgramFiles%\GitHub CLI;%APPDATA%\npm;%LOCALAPPDATA%\Programs\Ollama;%PATH%"
node.exe -e "if (Number(process.versions.node.split('.')[0]) < 22) { console.error('Node.js 22 or newer is required. Update Node.js LTS, then rerun setup.'); process.exit(1); }"
if errorlevel 1 goto failed
where git.exe >nul 2>nul
if not errorlevel 1 goto gitavailable
winget.exe install --id Git.Git --exact --source winget --accept-source-agreements --accept-package-agreements
if errorlevel 1 goto failed
:gitavailable
where gh.exe >nul 2>nul
if not errorlevel 1 goto ghavailable
winget.exe install --id GitHub.cli --exact --source winget --accept-source-agreements --accept-package-agreements
if errorlevel 1 goto failed
:ghavailable

echo.
choice /C YN /N /M "Install or update Orca Desktop? [Y/N] "
if errorlevel 2 goto agent
set "ORCA_SETUP_DOWNLOAD=%LOCALAPPDATA%\OrcaQuickSetup"
node.exe "%~dp0download-orca.mjs" "%ORCA_SETUP_DOWNLOAD%"
if errorlevel 1 goto failed
start "" /wait "%ORCA_SETUP_DOWNLOAD%\orca-windows-setup.exe"
if errorlevel 1 goto failed

:agent
echo.
choice /C YN /N /M "Install Codex CLI? You will sign in after setup. [Y/N] "
if errorlevel 2 goto ollama
where codex.cmd >nul 2>nul
if not errorlevel 1 goto ollama
call npm.cmd install --global @openai/codex
if errorlevel 1 goto failed

:ollama
echo.
choice /C YN /N /M "Install Ollama for optional local models? [Y/N] "
if errorlevel 2 goto report
where ollama.exe >nul 2>nul
if not errorlevel 1 goto report
winget.exe install --id Ollama.Ollama --exact --source winget --accept-source-agreements --accept-package-agreements
if errorlevel 1 goto failed

:report
echo.
echo Installed tool checks
echo ---------------------
git.exe --version
if errorlevel 1 goto failed
node.exe --version
if errorlevel 1 goto failed
gh.exe --version
if errorlevel 1 goto failed
echo.
echo Setup steps finished. Close and reopen Orca so it sees the new tools.
echo Open README.md in this folder for the short sign-in and first-project checklist.
echo If you chose Codex: open a NEW terminal and run codex login.
echo For GitHub: open a NEW terminal and run gh auth login.
echo Ollama alone is not a coding agent; choose a compatible agent and model separately.
echo.
pause
exit /b 0

:missingwinget
echo.
echo Windows App Installer / WinGet is missing. Install App Installer from Microsoft Store,
echo then run this file again. See README.md for manual download links.
pause
exit /b 1

:failed
echo.
echo Setup stopped because a step failed. Read the error directly above.
echo Fix that step and run this file again; installed tools will be reused.
echo See README.md for manual installation links. Do not disable Windows security.
pause
exit /b 1
