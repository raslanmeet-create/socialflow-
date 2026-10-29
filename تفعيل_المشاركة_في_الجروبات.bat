@echo off
chcp 65001 > nul
title تفعيل المشاركة في المجموعات - رسلان للتسويق
color 0A
cls
echo ========================================================
echo   ▶️ جاري تفعيل المشاركة في مجموعات فيسبوك...
echo ========================================================
echo.

node -e "
const fs = require('fs');
const path = require('path');
const cfgPath = path.join(__dirname, 'client_config.json');
let cfg = {};
if (fs.existsSync(cfgPath)) {
    try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch(e){}
}
cfg.groups_sharing_enabled = true;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
console.log('  ✅ تم تفعيل ميزة المشاركة في المجموعات بنجاح!');

const { sendTelegramAlert } = require('./fb_auto_worker');
sendTelegramAlert('▶️ <b>تم إعادة تفعيل المشاركة التلقائية في الجروبات!</b>\n━━━━━━━━━━━━━━━━━━━━\nسيتولى البوت الآن مشاركة أي منشور جديد تلقائياً في المجموعات.');
"

echo.
echo ========================================================
echo   🎉 تم إعادة تفعيل مشاركة المجموعات بنجاح!
echo ========================================================
echo.
pause
