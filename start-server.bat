@echo off
REM party crashers redrawn - double-click to host!!
REM Keep this window open while you play. Close it to stop/Delete.
REM pulls updates on start and every day at UPDATE_TIME (see .env)
cd /d "%~dp0"
python autoupdate.py %*
pause
