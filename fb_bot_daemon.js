const { shareToGroups, sendTelegramAlert, abortCurrentSharing } = require('./fb_auto_worker');
const boosterService = require('./booster_service');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logStream = fs.createWriteStream(path.join(__dirname, 'daemon_out.log'), { flags: 'a' });
const errStream = fs.createWriteStream(path.join(__dirname, 'daemon_err.log'), { flags: 'a' });
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

const POSTS_FILE = path.join(__dirname, 'scheduled_posts.json');
const LOCK_FILE = path.join(__dirname, 'bot.lock');
const CHECK_INTERVAL_MS = 30000; // فحص ومزامنة كل 30 ثانية
const CRON_INTERVAL_MS = 60000;  // فحص وجدولة المنشورات السحابية كل 60 ثانية
const START_TIME = new Date();

let isProcessing = false;
let currentProcessingPostId = null;
let isShuttingDown = false;
let lastTelegramUpdateId = 0;

const CLIENT_CONFIG_PATH = path.join(__dirname, 'client_config.json');
let clientCfg = {};
if (fs.existsSync(CLIENT_CONFIG_PATH)) {
    try { clientCfg = JSON.parse(fs.readFileSync(CLIENT_CONFIG_PATH, 'utf8')); } catch (e) {}
}

function isGroupSharingEnabled() {
    try {
        if (fs.existsSync(CLIENT_CONFIG_PATH)) {
            const cfg = JSON.parse(fs.readFileSync(CLIENT_CONFIG_PATH, 'utf8'));
            return cfg.groups_sharing_enabled !== false;
        }
    } catch (e) {}
    return true;
}

function setGroupSharingEnabled(enabled) {
    try {
        let cfg = {};
        if (fs.existsSync(CLIENT_CONFIG_PATH)) {
            cfg = JSON.parse(fs.readFileSync(CLIENT_CONFIG_PATH, 'utf8'));
        }
        cfg.groups_sharing_enabled = enabled;
        fs.writeFileSync(CLIENT_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
        clientCfg = cfg;
        console.log(`⚙️ [إعدادات المجموعات] تم ضبط ميزة مشاركة الجروبات: ${enabled ? 'مفعلة ✅' : 'موقوفة مؤقتاً ⏸️'}`);
    } catch (e) {}
}
const PAGE_NAME = clientCfg.page_name || 'Raslans Marketing - رسلان للتسويق';

console.log('======================================================');
console.log('🤖 بوت النشر الآلي في مجموعات فيسبوك (SocialFlow Bot)');
console.log('🚀 البوت نشط الآن ويعمل بصمت في الخلفية...');
console.log(`🏢 الصفحة الرسمية: ${PAGE_NAME}`);
console.log('======================================================\n');

// فحص وحفظ معرف العملية لمنع التشغيل المزدوج التلقائي
try {
    if (fs.existsSync(LOCK_FILE)) {
        try {
            const oldLock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
            if (oldLock && oldLock.pid && oldLock.pid !== process.pid) {
                try {
                    process.kill(oldLock.pid, 0); // فحص إذا كانت العملية السابقة ما زالت حية
                    console.log(`⚠️ [قفل التشغيل] هناك مثيل آخر للبوت يعمل بالفعل (PID: ${oldLock.pid}). إنهاء هذه العملية لمنع التضارب.`);
                    process.exit(0);
                } catch (e) {
                    console.log(`ℹ️ [قفل التشغيل] العملية السابقة (${oldLock.pid}) منتهية، سيتم بدء الجلسة الجديدة الآن.`);
                }
            }
        } catch (e) {}
    }
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, startedAt: START_TIME.toISOString() }), 'utf8');
} catch (e) {}

// حساب مدة التشغيل بصيغة مقروءة
function formatUptime() {
    const diffMs = Date.now() - START_TIME.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
        return `${hours} ساعة و ${mins % 60} دقيقة`;
    }
    return `${mins} دقيقة`;
}

// 1. 🟢 إشعار بدء التشغيل الفوري على تيليجرام
async function notifyStartup() {
    const startupMsg = `🟢 <b>بوت النشر الآلي لجروبات فيسبوك بدأ العمل الآن!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💻 <b>حالة اللابتوب:</b> متصل ويعمل في الخلفية بنجاح.\n` +
        `🏢 <b>الصفحة الرسمية:</b> ${PAGE_NAME}\n` +
        `🤖 <b>الذكاء الاصطناعي:</b> Groq (openai/gpt-oss-120b) متصل وجاهز.\n` +
        `⏳ <b>نظام المراقبة:</b> يفحص المنشورات الجديدة والمجدولة كل 30 ثانية.\n\n` +
        `📢 <b>نظام المتابعة:</b> سأرسل لك إشعاراً قبل النشر، وتحديثاً فورياً مع كل جروب، وتقرير الإنجاز عند الانتهاء.\n\n` +
        `📱 <i>يمكنك إرسال كلمة <b>شغال؟</b> أو <b>/status</b> للبوت على تيليجرام للتأكد في أي وقت من هاتفك!</i>`;
    await sendTelegramAlert(startupMsg);
}

// 2. 🔴 إشعار التوقف المفاجئ أو الإغلاق
async function notifyShutdown(reason) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    try {
        if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
    } catch (e) {}

    const shutdownMsg = `🔴 <b>تنبيه: تم إيقاف بوت فيسبوك أو إغلاقه!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⚠️ <b>الحالة:</b> متوقف حالياً عن العمل.\n` +
        `📌 <b>السبب:</b> ${reason}\n` +
        `⏰ <b>مدة التشغيل السابقة:</b> ${formatUptime()}\n\n` +
        `🔄 <b>لإعادة التشغيل:</b> اضغط نقرتين على أيقونة <code>تشغيل_بوت_الجروبات_التلقائي.bat</code> على سطح المكتب.`;
    
    console.log(`\n🛑 جاري إرسال إشعار التوقف للتيليجرام: ${reason}...`);
    await sendTelegramAlert(shutdownMsg);
}

// الاستماع لأحداث الإغلاق
async function handleExit(signal, reason) {
    console.log(`\n[${signal}] ${reason}...`);
    try {
        await notifyShutdown(reason);
    } catch (e) {
        console.error('Error sending shutdown notification:', e.message);
    }
    await new Promise(r => setTimeout(r, 1200));
    process.exit(0);
}

process.on('SIGINT', () => handleExit('SIGINT', 'تم إغلاق البوت يدوياً من المستخدم.'));
process.on('SIGTERM', () => handleExit('SIGTERM', 'تم إيقاف تشغيل اللابتوب أو إعادة التشغيل.'));
process.on('SIGHUP', () => handleExit('SIGHUP', 'تم تسجيل خروج المستخدم أو إغلاق الجلسة.'));

process.on('uncaughtException', async (err) => {
    console.error('\n💥 خطأ غير متوقع:', err);
    try {
        await notifyShutdown(`خطأ تقني غير متوقع: ${err.message || 'Error'}`);
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1200));
    process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
    console.warn('\n⚠️ تحذير unhandledRejection:', reason);
});

// 3. 💬 الرد التفاعلي على تيليجرام
async function pollTelegramCommands() {
    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN || '8946209406:AAFBRxNoA-bqkymvDddkOik2I6QUjMvRaa8';
        let res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastTelegramUpdateId + 1}&timeout=0`).catch(() => null);
        if (!res || !res.ok) {
            res = await fetch(`https://agent.raslans.net/api/telegram/updates?offset=${lastTelegramUpdateId + 1}`).catch(() => null);
        }
        if (!res || !res.ok) return;

        const data = await res.json();

        if (data && data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
                lastTelegramUpdateId = update.update_id;
                const msg = update.message;
                if (!msg || !msg.text) continue;

                const text = msg.text.trim();
                console.log(`📩 رسالة جديدة على تيليجرام: "${text}" من ${msg.from?.first_name || 'مستخدم'}`);

                if (text === '/status' || text.includes('شغال') || text.includes('حالة') || text === 'status' || text === 'ازيك' || text === '/start' || text === '/help') {
                    const runningStatus = isProcessing 
                        ? `⏳ <b>جاري النشر في المجموعات حالياً!</b>` 
                        : `🟢 في وضع المراقبة التلقائية لأي منشور جديد`;

                    const statusReply = `🟢 <b>أنا شغال تمام ومستعد للمنشور القادم! 🚀</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `💻 اللابتوب متصل والبوت يعمل بصمت في الخلفية.\n` +
                        `⏱️ <b>مدة العمل:</b> ${formatUptime()}\n` +
                        `🏢 <b>الهوية النشطة:</b> ${PAGE_NAME}\n` +
                        `👥 <b>نشر الجروبات:</b> 🟢 مفعل وتلقائي مع أي منشور جديد.\n` +
                        `⚙️ <b>الوضع الحالي:</b> ${runningStatus}\n\n` +
                        `💡 <b>ملاحظة:</b> إذا أردت إيقاف أي منشور أثناء نشره، أرسل كلمة (<b>وقف</b>)، وسيتوقف فوراً ويتخطاه، ويكمل عمله التلقائي للمنشورات القادمة بدون أي تدخل منك!`;
                    await sendTelegramAlert(statusReply);
                    console.log('✅ تم الرد على استفسار الحالة على تيليجرام.');
                } else if (text === '/stop' || text.includes('وقف') || text.includes('توقف') || text.includes('ايقاف') || text.includes('إيقاف') || text === 'stop' || text === 'بس' || text === '/pause' || text.includes('الغاء') || text.includes('إلغاء')) {
                    const wasBoosterRunning = boosterService.getBoosterStatus().isRunning;
                    boosterService.stopBoosterCycle();

                    if (isProcessing || wasBoosterRunning) {
                        if (isProcessing) abortCurrentSharing();
                        if (currentProcessingPostId && fs.existsSync(POSTS_FILE)) {
                            try {
                                const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
                                const p = posts.find(x => x.id === currentProcessingPostId);
                                if (p) {
                                    p.groups_auto_shared = true;
                                    p.stopped_by_user = true;
                                    p.booster_auto_done = true;
                                    p.groups_shared_at = new Date().toISOString();
                                    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
                                }
                            } catch (e) {}
                        }
                        await sendTelegramAlert(
                            `🛑 <b>تم إيقاف العمليات وتخطي المنشور الحالي فوراً!</b>\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n` +
                            `🚫 <b>المنشور الحالي:</b> تم إيقاف نشر الجروبات وتعزيز الحسابات وتخطيه نهائياً.\n` +
                            `🟢 <b>حالة البوت:</b> مستمر في العمل والمراقبة بالخلفية.\n` +
                            `🚀 <b>المنشورات القادمة:</b> بمجرد نزول أي منشور جديد، سيتولى البوت التعامل معه تلقائياً في موعده.`
                        );
                    } else {
                        if (fs.existsSync(POSTS_FILE)) {
                            try {
                                const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
                                const unshared = posts.find(p => p.status === 'PUBLISHED' && !p.groups_auto_shared);
                                if (unshared) {
                                    unshared.groups_auto_shared = true;
                                    unshared.stopped_by_user = true;
                                    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
                                }
                            } catch (e) {}
                        }
                        await sendTelegramAlert(
                            `🛑 <b>تم تأكيد إيقاف وتخطي المنشور!</b>\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n` +
                            `🟢 <b>البوت يعمل بصورة طبيعية 100%:</b>\n` +
                            `سيتولى البوت نشر أي منشور جديد قادم تلقائياً في موعده دون أي تدخل منك.`
                        );
                    }
                    setGroupSharingEnabled(true);
                    console.log('🛑 تم استقبال أمر إيقاف المنشور الحالي وتخطيه، مع بقاء البوت فعالاً للمنشورات القادمة.');
                } else if (text === '/resume' || text.includes('شغل') || text.includes('تفعيل') || text.includes('استئناف') || text === '/enable') {
                    setGroupSharingEnabled(true);
                    await sendTelegramAlert(
                        `🟢 <b>البوت يعمل بنشاط وجاهز تماماً!</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `ℹ️ <b>تأكيد:</b> المنشور السابق الذي تم إيقافه <b>لن يُعاد نشره</b> نهائياً.\n` +
                        `🚀 البوت مستمر في مراقبة الجدولة، وبمجرد نزول أي منشور جديد سينشره في الجروبات تلقائياً في موعده بدون تدخل منك.`
                    );
                    console.log('▶️ تم الرد على استفسار resume / شغل.');
                } else if (text === '/share' || text.includes('انشر') || text === '/share_latest') {
                    if (isProcessing) {
                        await sendTelegramAlert('⚠️ <b>تنبيه:</b> البوت يقوم بعملية نشر حالياً بالفعل! يرجى الانتظار حتى تنتهي.');
                    } else {
                        setGroupSharingEnabled(true);
                        await sendTelegramAlert('⏳ <b>تم استلام أمر النشر!</b> جاري جلب المنشور وتجهيز الخطاف التسويقي لبدء المشاركة في الجروبات...');
                        try {
                            await syncPostsFromCloud();
                            const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
                            const validPosts = [...posts].filter(p => p.content && p.content.length > 20)
                                .sort((a,b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0));
                            if (validPosts.length > 0) {
                                const target = validPosts[0];
                                const postUrl = getValidPostUrl(target);
                                isProcessing = true;
                                shareToGroups({ url: postUrl, content: target.content, hook: target.content })
                                    .finally(() => { isProcessing = false; });
                            } else {
                                await sendTelegramAlert('❌ لم يتم العثور على منشورات متاحة للنشر.');
                            }
                        } catch (err) {
                            await sendTelegramAlert('❌ خطأ أثناء بدء النشر: ' + err.message);
                            isProcessing = false;
                        }
                    }
                }
            }
        }
    } catch (e) {}
}

// دالة مساعدة لاستخراج رابط فيسبوك الصحيح للمنشور
function getValidPostUrl(post) {
    if (post.postUrl && post.postUrl.startsWith('http') && !post.postUrl.includes('post_')) {
        return post.postUrl;
    }
    const fbPostId = post.publishResults?.facebook?.post_id || post.publishResults?.facebook?.id || post.publishResults?.facebook?.feed?.id || post.id;
    const cleanId = String(fbPostId).includes('_') ? String(fbPostId).split('_')[1] : fbPostId;
    if (/^\d+$/.test(cleanId)) {
        return `https://www.facebook.com/RaslansMarketing/posts/${cleanId}`;
    }
    return post.postUrl || `https://www.facebook.com/RaslansMarketing/posts/122138622938889779`;
}

// 4. 🔄 مزامنة المنشورات من السيرفر السحابي (Supabase عبر API)
async function syncPostsFromCloud() {
    try {
        const res = await fetch('https://agent.raslans.net/api/scheduled?all=true', { timeout: 10000 });
        if (!res.ok) return;
        const cloudPosts = await res.json();
        if (!Array.isArray(cloudPosts) || cloudPosts.length === 0) return;

        let localPosts = [];
        if (fs.existsSync(POSTS_FILE)) {
            try { localPosts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8')); } catch (e) {}
        }

        let updated = false;
        for (const cp of cloudPosts) {
            const idx = localPosts.findIndex(lp => lp.id === cp.id);
            if (idx === -1) {
                localPosts.unshift(cp);
                updated = true;
            } else {
                const current = localPosts[idx];
                const wasShared = current.groups_auto_shared || cp.groups_auto_shared;
                localPosts[idx] = {
                    ...cp,
                    groups_auto_shared: wasShared,
                    groups_shared_at: current.groups_shared_at || cp.groups_shared_at,
                    groups_shared_count: current.groups_shared_count || cp.groups_shared_count,
                    postUrl: cp.postUrl || current.postUrl || getValidPostUrl(cp)
                };
                if (current.status !== cp.status || current.groups_auto_shared !== wasShared) {
                    updated = true;
                }
            }
        }

        if (updated) {
            fs.writeFileSync(POSTS_FILE, JSON.stringify(localPosts, null, 2), 'utf8');
            console.log(`🔄 [Cloud Sync] تم تحديث وتزامن المنشورات من السيرفر السحابي.`);
        }
    } catch (e) {}
}

// 5. ⏰ تحفيز الجدولة السحابية لنشر أي بوست حان وقته تلقائياً في السيرفر
async function triggerCloudScheduler() {
    try {
        const res = await fetch('https://agent.raslans.net/api/cron', { timeout: 15000 });
        const data = await res.json();
        if (data && data.publishedCount > 0) {
            console.log(`⏰ [Cloud Cron] تم نشر ${data.publishedCount} منشور مجدول في وقته تلقائياً!`);
            await syncPostsFromCloud();
        }
    } catch (e) {}
}

// 6. 🔍 فحص ومشاركة المنشورات المنشورة في الجروبات تلقائياً
async function checkAndSharePendingPosts() {
    if (isProcessing) return;
    if (!isGroupSharingEnabled()) {
        return;
    }

    // مزامنة أحدث حالة من السحابة أولاً
    await syncPostsFromCloud();

    if (!fs.existsSync(POSTS_FILE)) return;

    try {
        const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
        const now = Date.now();
        const MAX_POST_AGE_MS = 3 * 60 * 60 * 1000; // معالجة المنشورات الحديثة فقط (آخر 3 ساعات)

        // البحث عن أي منشور جديد منشور رسمياً ولم يُعزز أو لم يُشارك بعد
        const targetPost = posts.find(p => {
            if (p.status !== 'PUBLISHED') return false;
            const postTime = new Date(p.publishedAt || p.createdAt || 0).getTime();
            const isRecent = (now - postTime) < MAX_POST_AGE_MS;

            // إذا كان المنشور قديماً جداً (أكثر من 3 ساعات)، نعلّمه كمكتمل لتفادي تكراره
            if (!isRecent) {
                p.booster_auto_done = true;
                p.groups_auto_shared = true;
                return false;
            }

            return (!p.groups_auto_shared || !p.booster_auto_done);
        });

        if (targetPost) {
            isProcessing = true;
            currentProcessingPostId = targetPost.id;
            console.log(`\n📢 تم اكتشاف منشور جديد: ${targetPost.id}`);

            const postUrl = getValidPostUrl(targetPost);
            const postContent = targetPost.content || '';

            console.log(`🔗 رابط المنشور: ${postUrl}`);

            // 1. 🚀 تشغيل معزز التفاعل التلقائي بالحسابات المتعددة وتوليد تعليقات Groq AI
            const boosterCfg = boosterService.loadBoosterConfig();
            if (boosterCfg.autoBoostNewPosts && !targetPost.booster_auto_done) {
                console.log(`🚀 [Auto-Booster] بدء تعزيز المنشور تلقائياً بالحسابات المتعددة وتوليد تعليقات Groq AI...`);
                try {
                    await sendTelegramAlert(
                        `🚀 <b>تم اكتشاف منشور جديد!</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `🤖 <b>بدء التفاعل الآلي الذكي:</b>\n` +
                        `👍 إعجابات + 💬 تعليقات فريدة بذكاء Groq AI + 🔄 مشاركات للحسابات الشخصية.`
                    );
                    await boosterService.startBoosterCycle({
                        postUrls: [postUrl],
                        postContent: postContent,
                        useGroqAi: boosterCfg.useGroqAi !== false,
                        doLike: boosterCfg.doLike !== false,
                        doComment: boosterCfg.doComment !== false,
                        doShare: boosterCfg.doShare !== false,
                        randomizeTasks: boosterCfg.randomizeTasks !== false,
                        conversationThreads: boosterCfg.conversationThreads !== false,
                        isHeadless: !boosterCfg.showBrowser
                    });
                    targetPost.booster_auto_done = true;
                    targetPost.booster_done_at = new Date().toISOString();
                    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
                } catch (bErr) {
                    console.warn('⚠️ تعذر تشغيل المعزز التلقائي:', bErr.message);
                }
            }

            // 2. 📢 النشر في مجموعات فيسبوك (AI Hunter Groups)
            if (!targetPost.groups_auto_shared && isGroupSharingEnabled()) {
                const result = await shareToGroups({
                    url: postUrl,
                    content: postContent,
                    hook: postContent
                });

                if (result && result.success) {
                    targetPost.groups_auto_shared = true;
                    targetPost.groups_shared_at = new Date().toISOString();
                    targetPost.groups_shared_count = result.count;
                    if (result.stoppedByUser) targetPost.stopped_by_user = true;
                    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
                    console.log(`✅ تم تحديث حالة المنشور بنجاح (تم النشر في الجروبات).`);

                    // مزامنة حالة النشر في قاعدة بيانات Supabase أيضاً
                    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                        try {
                            const { createClient } = require('@supabase/supabase-js');
                            const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
                            const { data: dbRow } = await sb.from('scheduled_posts').select('post_results').eq('id', targetPost.id).maybeSingle();
                            if (dbRow) {
                                const updatedPostResults = {
                                    ...(dbRow.post_results || {}),
                                    groups_auto_shared: true,
                                    groups_shared_at: targetPost.groups_shared_at,
                                    groups_shared_count: result.count,
                                    booster_auto_done: targetPost.booster_auto_done
                                };
                                await sb.from('scheduled_posts').update({ post_results: updatedPostResults }).eq('id', targetPost.id);
                            }
                        } catch (sbErr) {
                            console.warn('Could not sync group share to Supabase:', sbErr.message);
                        }
                    }
                }
            } else if (!isGroupSharingEnabled()) {
                targetPost.groups_auto_shared = true;
                fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
            }
        }
    } catch (err) {
        console.error('❌ خطأ أثناء فحص ومشاركة المنشورات:', err.message);
    } finally {
        isProcessing = false;
        currentProcessingPostId = null;
    }
}

// بدء التشغيل وإرسال إشعار الترحيب
notifyStartup().then(() => {
    console.log('✅ تم إرسال إشعار بدء التشغيل إلى التيليجرام.');
});

// تفعيل الفحص الدوري
setInterval(checkAndSharePendingPosts, CHECK_INTERVAL_MS);
setInterval(triggerCloudScheduler, CRON_INTERVAL_MS);
setInterval(pollTelegramCommands, 6000);

// تشغيل دورة الفحص الأولى فوراً
checkAndSharePendingPosts();
triggerCloudScheduler();
