@echo off
chcp 65001 > nul
node "%~dp0check_status.js"
pause
