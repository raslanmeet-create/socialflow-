@echo off
chcp 65001 > nul
title فحص حالة البوت - رسلان للتسويق
node "%~dp0check_status.js"
pause
