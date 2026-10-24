@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22 or newer from https://nodejs.org then launch again.
 pause
 exit /b 1
)
node launch.mjs
pause
