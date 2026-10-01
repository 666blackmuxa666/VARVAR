@echo off
title VARVAR print - install
echo.
echo  === VARVAR print: install ===
echo.
if not exist "%~dp0varvar-print.ps1" goto nozip
if not exist "%~dp0varvar-print.config.json" goto nozip
set D=%LOCALAPPDATA%\VARVAR-print
if not exist "%D%" mkdir "%D%"
copy /Y "%~dp0varvar-print.ps1" "%D%\" >nul
copy /Y "%~dp0varvar-print.config.json" "%D%\" >nul
echo  [1/3] Files copied to %D%
echo.
echo  [2/3] Test print (errors will be shown here)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%D%\varvar-print.ps1" -Test
echo.
set S=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\VARVAR-print.vbs
> "%S%" echo CreateObject("WScript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%D%\varvar-print.ps1""", 0, False
wscript "%S%"
echo  [3/3] Started in background and added to Windows startup.
echo.
echo  DONE. In Telegram write to the bot: printer
echo.
pause
exit /b

:nozip
echo  ERROR: files not found next to install.cmd.
echo  Please EXTRACT the ZIP first (right click - Extract All), then run install.cmd from the extracted folder.
echo.
pause
