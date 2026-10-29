const fs = require('fs');
const path = require('path');

console.clear();
console.log('========================================================================');
console.log('  🔍 فحص حالة بوت النشر الآلي (SocialFlow Bot) - رسلان للتسويق');
console.log('========================================================================\n');

const lockFile = path.join(__dirname, 'bot.lock');
const cfgFile = path.join(__dirname, 'client_config.json');

let isRunning = false;
let pid = null;
let startedAt = null;

if (fs.existsSync(lockFile)) {
    try {
        const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
        if (lock && lock.pid) {
            try {
                process.kill(lock.pid, 0);
                isRunning = true;
                pid = lock.pid;
                startedAt = lock.startedAt;
            } catch (e) {
                isRunning = false;
            }
        }
    } catch (e) {}
}

let groupsEnabled = true;
let clientName = 'رسلان للتسويق';
let pageName = 'Raslans Marketing - رسلان للتسويق';

if (fs.existsSync(cfgFile)) {
    try {
        const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
        if (cfg.groups_sharing_enabled === false) groupsEnabled = false;
        if (cfg.client_name) clientName = cfg.client_name;
        if (cfg.page_name) pageName = cfg.page_name;
    } catch (e) {}
}

if (isRunning) {
    console.log('  🟢 حالة البوت العام: شغال ويعمل بنشاط في الخلفية (PID: ' + pid + ')');
    console.log('  🏢 الصفحة الرسمية: ' + pageName);
    console.log('  👥 حالة نشر المجموعات: ' + (groupsEnabled ? '🟢 مفعلة ونشطة تلقائياً' : '⏸️ موقوفة مؤقتاً بأمرك (لن ينشر في المجموعات)'));
    console.log('\n========================================================================');
    console.log('  📱 التحكم المباشر من تيليجرام من هاتفك:');
    console.log('     🛑 أرسل "وقف" لإيقاف نشر الجروبات فوراً');
    console.log('     ▶️ أرسل "شغل" لإعادة تفعيل نشر الجروبات');
    console.log('     🚀 أرسل "انشر" لنشر أحدث منشور يدوياً في الجروبات');
    console.log('     🟢 أرسل "شغال؟" للتأكد من الحالة');
    console.log('========================================================================\n');
} else {
    console.log('  🔴 حالة البوت: متوقف حالياً عن العمل!');
    console.log('\n  👉 لتشغيله بنقرة واحدة: اضغط على "تشغيل_البوت_صامتاً.vbs" أو افتح "run_daemon.bat"');
    console.log('========================================================================\n');
}
