@echo off
del "%ProgramData%\Microsoft\Windows\Start Menu\Programs\StartUp\VARVAR-print.vbs" 2>nul
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\VARVAR-print.vbs" 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%ProgramData%\VARVAR-print\varvar-print.ps1" -Stop
echo VARVAR print stopped and removed from startup.
pause
