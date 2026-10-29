/**
 * SocialFlow - Desktop SaaS Agent Runner
 * مشغّل الأتمتة المكتبي المرتبط بالسيرفر السحابي لحساب المشترك
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const boosterService = require('./booster_service');
const { shareToGroups, sendTelegramAlert, abortCurrentSharing } = require('./fb_auto_worker');

const CONFIG_FILE = path.join(__dirname, 'client_config.json');
const LOCK_FILE = path.join(__dirname, 'bot.lock');
const LOG_OUT_FILE = path.join(__dirname, 'daemon_out.log');
const LOG_ERR_FILE = path.join(__dirname, 'daemon_err.log');

// توجيه سجلات الـ Console إلى الملفات للتشغيل في الخلفية
const logStream = fs.createWriteStream(LOG_OUT_FILE, { flags: 'a' });
const errStream = fs.createWriteStream(LOG_ERR_FILE, { flags: 'a' });
const origLog = console.log;
console.log = (...args) => {
    try { origLog(...args); } catch (e) {}
    try { logStream.write(`[${new Date().toLocaleTimeString('ar-EG')}] ` + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n'); } catch (e) {}
};
const origErr = console.error;
console.error = (...args) => {
    try { origErr(...args); } catch (e) {}
    try { errStream.write(`[${new Date().toLocaleTimeString('ar-EG')}] ` + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n'); } catch (e) {}
};

// قراءة إعدادات الربط للعميل
function loadClientConfig() {
    let cfg = {
        server_url: process.env.SERVER_URL || 'https://socialflow-olive.vercel.app',
        agent_key: process.env.AGENT_KEY || 'local_dev_key',
        groups_sharing_enabled: true
    };
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            cfg = { ...cfg, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
        } catch (e) {}
    }
    return cfg;
}

let clientConfig = loadClientConfig();
let activeServerUrl = (clientConfig.server_url || 'https://socialflow-olive.vercel.app').replace(/\/+$/, '');
let agentKey = clientConfig.agent_key || 'local_dev_key';

let isProcessingTask = false;
let currentTaskId = null;
let clientProfile = null;
const START_TIME = new Date();

console.log('======================================================');
console.log('🚀 SocialFlow Desktop Agent - مشغّل الأتمتة المكتبي');
console.log(`🌐 السيرفر المتصل به: ${activeServerUrl}`);
console.log(`🔑 مفتاح الربط: ${agentKey.substring(0, 10)}...`);
console.log('======================================================\n');

// التحقق من ملف القفل لمنع تكرار التشغيل
try {
    if (fs.existsSync(LOCK_FILE)) {
        try {
            const oldLock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
            if (oldLock && oldLock.pid && oldLock.pid !== process.pid) {
                try {
                    process.kill(oldLock.pid, 0);
                    console.log(`⚠️ مثيل آخر يعمل بالفعل (PID: ${oldLock.pid}). إغلاق هذه العملية.`);
                    process.exit(0);
                } catch (e) {}
            }
        } catch (e) {}
    }
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, startedAt: START_TIME.toISOString() }), 'utf8');
} catch (e) {}

// تنظيف ملف القفل عند الإغلاق
function cleanupLock() {
    try {
        if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
    } catch (e) {}
}
process.on('exit', cleanupLock);
process.on('SIGINT', () => { cleanupLock(); process.exit(0); });
process.on('SIGTERM', () => { cleanupLock(); process.exit(0); });

// 1. التحقق من صلاحية المفتاح والاتصال بالسيرفر (Handshake)
async function handshakeWithServer() {
    try {
        console.log('⏳ جاري التحقق من هوية المشترك وصلاحية الاشتراك مع السيرفر...');
        const res = await fetch(`${activeServerUrl}/api/agent/verify?key=${encodeURIComponent(agentKey)}`, {
            headers: { 'x-agent-key': agentKey }
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            console.error(`❌ فشل المصادقة: ${data.message || 'مفتاح الربط غير صالح'}`);
            if (data.message && data.message.includes('اشتراك')) {
                console.error('⚠️ يرجى تجديد أو تفعيل الاشتراك من لوحة تحكم المنصة للمتابعة.');
            }
            return false;
        }

        clientProfile = data.user;
        console.log(`✅ تم تأكيد الاتصال بنجاح!`);
        console.log(`👤 صاحب الحساب: ${clientProfile.name} (${clientProfile.email})`);
        console.log(`🏢 الصفحة المرتبطة: ${clientProfile.pageName}`);
        console.log(`📊 حالة الاشتراك: ${clientProfile.subscriptionStatus || 'active'} 🟢\n`);

        // تحديث إعدادات العميل المحلية تلقائياً ببيانات التيليجرام والـ Groq واسم صفحته
        try {
            let localCfg = {};
            if (fs.existsSync(CONFIG_FILE)) {
                try { localCfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch (e) {}
            }
            localCfg.client_id = clientProfile.id;
            localCfg.client_name = clientProfile.name;
            localCfg.page_name = clientProfile.pageName;
            localCfg.page_id = clientProfile.pageId;
            if (clientProfile.telegramBotToken) localCfg.telegram_bot_token = clientProfile.telegramBotToken;
            if (clientProfile.telegramChatId) localCfg.telegram_chat_id = clientProfile.telegramChatId;
            if (clientProfile.groqApiKey) localCfg.groq_api_key = clientProfile.groqApiKey;

            fs.writeFileSync(CONFIG_FILE, JSON.stringify(localCfg, null, 2), 'utf8');
            clientConfig = localCfg;
        } catch (syncErr) {
            console.warn('Config local sync note:', syncErr.message);
        }

        return true;
    } catch (err) {
        console.warn(`⚠️ تعذر الاتصال بالسيرفر (${activeServerUrl}): ${err.message}. سيتم إعادة المحاولة لاحقاً.`);
        return false;
    }
}

// 2. إرسال نبضة النشاط (Heartbeat)
async function sendHeartbeat() {
    try {
        const accounts = boosterService.loadAccounts();
        const activeAccountsCount = accounts.filter(a => a.enabled !== false).length;
        
        let groupsCount = 0;
        try {
            const grpPath = path.join(__dirname, 'clean_groups.json');
            if (fs.existsSync(grpPath)) {
                groupsCount = JSON.parse(fs.readFileSync(grpPath, 'utf8')).length;
            }
        } catch (e) {}

        await fetch(`${activeServerUrl}/api/agent/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: agentKey,
                clientVersion: '1.2.0',
                accountsCount: activeAccountsCount,
                groupsCount: groupsCount,
                status: isProcessingTask ? 'BUSY' : 'IDLE',
                currentTask: currentTaskId
            })
        });
    } catch (e) {}
}

// 3. فحص المهام المستحقة وتنفيذها
async function checkAndExecutePendingTasks() {
    if (isProcessingTask) return;

    try {
        const res = await fetch(`${activeServerUrl}/api/agent/pending-tasks?key=${encodeURIComponent(agentKey)}`, {
            headers: { 'x-agent-key': agentKey }
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!data.success || !Array.isArray(data.tasks) || data.tasks.length === 0) {
            return;
        }

        const task = data.tasks[0];
        isProcessingTask = true;
        currentTaskId = task.id;

        console.log(`\n📢 [مهمة جديدة] اكتشاف منشور مستحق للأتمتة: ID=${task.id}`);
        console.log(`🔗 الرابط: ${task.postUrl}`);
        console.log(`🎯 العمليات المطلوبة: ${task.needsBooster ? '[معزز الحسابات]' : ''} ${task.needsGroups ? '[نشر الجروبات]' : ''}`);

        // أ. تنفيذ تعزيز المنشور بالحسابات المتعددة (Booster)
        if (task.needsBooster && task.postUrl) {
            const boosterCfg = boosterService.loadBoosterConfig();
            console.log('🚀 [Booster] بدء دورة التفاعل بالحسابات المتعددة...');
            try {
                const bRes = await boosterService.startBoosterCycle({
                    postUrls: [task.postUrl],
                    postContent: task.content,
                    useGroqAi: boosterCfg.useGroqAi !== false,
                    doLike: boosterCfg.doLike !== false,
                    doComment: boosterCfg.doComment !== false,
                    doShare: boosterCfg.doShare !== false,
                    randomizeTasks: boosterCfg.randomizeTasks !== false,
                    isHeadless: !boosterCfg.showBrowser
                });

                // إرسال تقرير إتمام التعزيز
                await fetch(`${activeServerUrl}/api/agent/report-task`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        key: agentKey,
                        postId: task.id,
                        taskType: 'booster',
                        success: bRes.success !== false,
                        logs: boosterService.getBoosterStatus().logs.slice(0, 5)
                    })
                });
                console.log('✅ تم إرسال تقرير إتمام التعزيز للسيرفر.');
            } catch (bErr) {
                console.error('❌ خطأ أثناء تنفيذ التعزيز:', bErr.message);
            }
        }

        // ب. تنفيذ المشاركة في الجروبات المستهدفة (Groups Sharing)
        if (task.needsGroups && clientConfig.groups_sharing_enabled !== false && task.postUrl) {
            console.log('📢 [Groups] بدء نشر المنشور في مجموعات فيسبوك المستهدفة...');
            try {
                const gRes = await shareToGroups({
                    url: task.postUrl,
                    content: task.content,
                    hook: task.content
                });

                // إرسال تقرير إتمام نشر الجروبات
                await fetch(`${activeServerUrl}/api/agent/report-task`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        key: agentKey,
                        postId: task.id,
                        taskType: 'groups',
                        success: gRes.success !== false,
                        count: gRes.count || 0
                    })
                });
                console.log(`✅ تم إرسال تقرير مشاركة الجروبات للسيرفر (إجمالي: ${gRes.count || 0} جروب).`);
            } catch (gErr) {
                console.error('❌ خطأ أثناء مشاركة الجروبات:', gErr.message);
            }
        }

    } catch (err) {
        console.error('❌ خطأ أثناء فحص وتنفيذ المهام:', err.message);
    } finally {
        isProcessingTask = false;
        currentTaskId = null;
    }
}

// تشغيل البرنامج
async function startAgent() {
    const isReady = await handshakeWithServer();
    if (!isReady) {
        console.log('⏳ سيتم الاستمرار في محاولة الاتصال كل دقيقة...');
    } else {
        // إشعار بدء التشغيل الفوري على تيليجرام
        try {
            const pageTitle = clientProfile?.pageName || 'صفحتك على فيسبوك';
            await sendTelegramAlert(
                `🟢 <b>بوت النشر والتفاعل بدأ العمل الآن!</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `💻 <b>حالة الكمبيوتر:</b> متصل بالإنترنت ويعمل بصمت في الخلفية.\n` +
                `🏢 <b>الصفحة المرتبطة:</b> ${pageTitle}\n` +
                `🤖 <b>الوضع:</b> مراقبة أي بوست جديد وتلقي الأوامر من الموقع تلقائياً.`
            );
        } catch (e) {}
    }

    // إرسال النبضة الدورية كل 30 ثانية
    setInterval(sendHeartbeat, 30000);

    // فحص المهام كل 30 ثانية
    setInterval(checkAndExecutePendingTasks, 30000);

    // تنفيذ الفحص الأولي فوراً
    sendHeartbeat();
    if (isReady) {
        checkAndExecutePendingTasks();
    }
}

// إشعار الإغلاق عند إطفاء الكمبيوتر
process.on('SIGINT', async () => {
    try {
        await sendTelegramAlert('🔴 <b>تنبيه: تم إيقاف بوت فيسبوك أو إغلاق الجهاز.</b>');
    } catch (e) {}
    cleanupLock();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    try {
        await sendTelegramAlert('🔴 <b>تنبيه: تم إيقاف تشغيل الكمبيوتر.</b>');
    } catch (e) {}
    cleanupLock();
    process.exit(0);
});

startAgent();

