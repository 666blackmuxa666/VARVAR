@echo off
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\VARVAR-print.vbs" 2>nul
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" | Where-Object { $_.CommandLine -like '*varvar-print.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo VARVAR print stopped and removed from startup.
pause
