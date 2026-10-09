@echo off
title VARVAR print - install
net session >nul 2>&1
if errorlevel 1 goto elevate
if not exist "%~dp0varvar-print.ps1" goto nozip
if not exist "%~dp0varvar-print.config.json" goto nozip
set D=%ProgramData%\VARVAR-print
if not exist "%D%" mkdir "%D%"
icacls "%D%" /grant *S-1-5-32-545:(OI)(CI)M >nul 2>&1
copy /Y "%~dp0varvar-print.ps1" "%D%\" >nul
copy /Y "%~dp0varvar-print.config.json" "%D%\" >nul
echo  [1/3] Files copied to %D%
powershell -NoProfile -ExecutionPolicy Bypass -File "%D%\varvar-print.ps1" -Stop
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\VARVAR-print.vbs" 2>nul
echo  [2/3] Searching printers (USB, network, Bluetooth) and printing a test receipt...
powershell -NoProfile -ExecutionPolicy Bypass -File "%D%\varvar-print.ps1" -Test
set S=%ProgramData%\Microsoft\Windows\Start Menu\Programs\StartUp\VARVAR-print.vbs
> "%S%" echo CreateObject("WScript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%D%\varvar-print.ps1""", 0, False
wscript "%S%"
echo  [3/3] Started and added to Windows startup.
echo.
pause
exit /b
:elevate
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b
:nozip
echo  ERROR: files not found next to install.cmd. Extract the ZIP first, or use the one-file installer from the owner cabinet.
pause
