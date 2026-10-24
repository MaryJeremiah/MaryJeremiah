@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22 or newer from https://nodejs.org then try again.
 pause
 exit /b 1
)
where ollama >nul 2>nul
if errorlevel 1 (
 echo Install Ollama from https://ollama.com/download/windows
 echo Then close this window and open setup-free.bat again.
 pause
 exit /b 1
)
echo Downloading the local model. This needs internet the first time.
echo Keep the Ollama app open while using Maya.
ollama pull llama3.2:3b
if errorlevel 1 (
 echo Open the Ollama app and try again. Check your internet connection.
 pause
 exit /b 1
)
echo Starting Maya. In Settings choose Ollama - free on this laptop.
node launch.mjs
pause
