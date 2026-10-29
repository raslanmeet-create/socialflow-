@echo off
chcp 65001 > nul
title إيقاف المشاركة في المجموعات - رسلان للتسويق
color 0C
cls
echo ========================================================
echo   🛑 جاري إيقاف المشاركة في مجموعات فيسبوك...
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
cfg.groups_sharing_enabled = false;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
console.log('  ✅ تم إيقاف ميزة المشاركة في المجموعات بنجاح في الإعدادات.');

const { abortCurrentSharing, sendTelegramAlert } = require('./fb_auto_worker');
try { abortCurrentSharing(); } catch(e){}
sendTelegramAlert('⏸️ <b>تم إيقاف المشاركة في الجروبات!</b>\n━━━━━━━━━━━━━━━━━━━━\nتم إيقاف النشر في المجموعات مؤقتاً بأمرك.\n\n💡 <i>لإعادة التشغيل، أرسل (شغل) أو اضغط على ملف تفعيل المشاركة.</i>');
"

echo.
echo ========================================================
echo   ⏸️ تم إيقاف نشر المجموعات بنجاح!
echo   (لن يقوم البوت بالنشر في أي مجموعة حتى تعيد تفعيله)
echo ========================================================
echo.
pause
