@echo off
rem VARVAR - встановлення програми друку: копіює у %LOCALAPPDATA%\VARVAR-print, додає в автозапуск і запускає
chcp 65001 >nul
set D=%LOCALAPPDATA%\VARVAR-print
mkdir "%D%" 2>nul
copy /Y "%~dp0varvar-print.ps1" "%D%\" >nul
copy /Y "%~dp0varvar-print.config.json" "%D%\" >nul
set S=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\VARVAR-print.vbs
> "%S%" echo CreateObject("WScript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%D%\varvar-print.ps1""", 0, False
wscript "%S%"
echo.
echo  Готово! Програма друку VARVAR запущена і стартуватиме разом з Windows.
echo  Перевірка: напишіть боту "принтер" і натисніть "Тестовий друк".
echo.
pause
