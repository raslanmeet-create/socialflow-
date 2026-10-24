require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;



// إعداد Cloudinary السحابي
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// إعداد التخزين بالذاكرة (Memory Storage) متوافق 100% مع Vercel Serverless وبدون استهلاك للقرص
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // حد 50 ميجابايت للصور والفيديوهات
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// مسار حفظ المنشورات المجدولة (يدعم Vercel /tmp أو Upstash Redis سحابياً مجاناً)
const DB_FILE = process.env.VERCEL 
    ? path.join('/tmp', 'scheduled_posts.json') 
    : path.join(__dirname, 'scheduled_posts.json');

async function getScheduledPosts() {
    // 1. دعم قاعدة بيانات Upstash Redis السحابية إذا توفرت في إعدادات Vercel
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
            const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/socialflow_scheduled_posts`, {
                headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
            });
            const data = await res.json();
            if (data.result) {
                return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
            }
            return [];
        } catch (e) {
            console.error('Error reading from Upstash Redis:', e);
        }
    }

    // 2. استخدام التخزين المؤقت
    if (!fs.existsSync(DB_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
        return [];
    }
}

async function saveScheduledPosts(posts) {
    // 1. حفظ في Upstash Redis إذا وُجد
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
            await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/socialflow_scheduled_posts`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(posts)
            });
            return;
        } catch (e) {
            console.error('Error saving to Upstash Redis:', e);
        }
    }

    // 2. حفظ في الملف
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(posts, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving DB_FILE:', e);
    }
}

// ========================================================
// 🤖 إدارة إعدادات وسجلات الرد التلقائي الذكي (AI Auto-Reply)
// ========================================================
const AUTOREPLY_CONFIG_FILE = process.env.VERCEL 
    ? path.join('/tmp', 'auto_reply_config.json') 
    : path.join(__dirname, 'auto_reply_config.json');

const AUTOREPLY_LOGS_FILE = process.env.VERCEL 
    ? path.join('/tmp', 'auto_reply_activity.json') 
    : path.join(__dirname, 'auto_reply_activity.json');

// ذاكرة سريعة لحفظ توكنات الصفحات وكابشن البوستات للربط الفوري وتفادي استهلاك الكوتا
const pageTokensCache = new Map();
const postCaptionsCache = new Map();

const DEFAULT_AUTOREPLY_CONFIG = {
    enabled: true,
    pageId: '',
    projectName: '',
    niche: '',
    services: [], // [ { name: '', price: '', details: '' } ]
    phones: [],   // [ '010...' ]
    email: '',
    socialLinks: [], // [ { platform: '', url: '' } ]
    customPrompt: '', // البرومبت المخصص المولد بالذكاء الاصطناعي
    targetAllPosts: true, // true: جميع المنشورات، false: منشورات محددة فقط
    targetPostIds: [],   // مصفوفة بمعرفات المنشورات المشمولة بالخدمة
    groqApiKey: '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',
    groqModel: 'openai/gpt-oss-120b',
    likeComment: true,
    replyComment: true,
    sendDm: true,
    lastScrapedUrl: ''
};

function readAutoReplyStore() {
    if (!fs.existsSync(AUTOREPLY_CONFIG_FILE)) {
        return { pages: {}, global: { ...DEFAULT_AUTOREPLY_CONFIG } };
    }
    try {
        const raw = JSON.parse(fs.readFileSync(AUTOREPLY_CONFIG_FILE, 'utf8'));
        if (raw.pages || raw.global) {
            return {
                pages: raw.pages || {},
                global: { ...DEFAULT_AUTOREPLY_CONFIG, ...(raw.global || {}) }
            };
        }
        return { pages: {}, global: { ...DEFAULT_AUTOREPLY_CONFIG, ...raw } };
    } catch {
        return { pages: {}, global: { ...DEFAULT_AUTOREPLY_CONFIG } };
    }
}

async function getAutoReplyConfig(pageId) {
    const store = readAutoReplyStore();
    if (pageId && store.pages && store.pages[pageId]) {
        return { ...DEFAULT_AUTOREPLY_CONFIG, ...store.pages[pageId] };
    }
    return { ...DEFAULT_AUTOREPLY_CONFIG, ...(store.global || {}) };
}

async function saveAutoReplyConfig(config, pageId) {
    const store = readAutoReplyStore();
    const targetPageId = pageId || config.pageId;

    if (targetPageId) {
        if (!store.pages) store.pages = {};
        store.pages[targetPageId] = { ...(store.pages[targetPageId] || DEFAULT_AUTOREPLY_CONFIG), ...config, pageId: targetPageId };
    } else {
        store.global = { ...(store.global || DEFAULT_AUTOREPLY_CONFIG), ...config };
    }

    try {
        fs.writeFileSync(AUTOREPLY_CONFIG_FILE, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving AUTOREPLY_CONFIG_FILE:', e);
    }
}

async function getAutoReplyLogs() {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
            const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/socialflow_autoreply_logs`, {
                headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
            });
            const data = await res.json();
            if (data.result) {
                return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
            }
        } catch (e) {
            console.error('Error reading autoreply logs from Upstash:', e);
        }
    }

    if (!fs.existsSync(AUTOREPLY_LOGS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(AUTOREPLY_LOGS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

async function addAutoReplyLog(entry) {
    try {
        const logs = await getAutoReplyLogs();
        logs.unshift(entry);
        if (logs.length > 50) logs.pop();

        if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
            try {
                await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/socialflow_autoreply_logs`, {
                    method: 'POST',
                    headers: { 
                        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(logs)
                });
            } catch (e) {
                console.error('Error saving logs to Upstash:', e);
            }
        }

        fs.writeFileSync(AUTOREPLY_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving log entry:', e);
    }
}

// 1. مسار جلب صفحات فيسبوك وحسابات انستجرام المرتبطة باللوجو والاسم (يدعم المفتاح العام أو مفتاح المستخدم)
app.get('/api/accounts', async (req, res) => {
    try {
        const token = req.query.metaToken;
        if (!token || !token.trim()) {
            return res.json({ success: true, accounts: [] });
        }

        const url = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,picture{url},access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${token.trim()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ success: false, error: data.error });
        }

        const accounts = (data.data || []).map(acc => ({
            id: acc.id,
            name: acc.name,
            picture: acc.picture?.data?.url || null,
            access_token: acc.access_token,
            instagram: acc.instagram_business_account ? {
                id: acc.instagram_business_account.id,
                username: acc.instagram_business_account.username,
                picture: acc.instagram_business_account.profile_picture_url || null
            } : null
        }));

        // تسجيل توكنات الصفحات في الذاكرة لتسهيل الرد التلقائي السحابي
        accounts.forEach(acc => {
            if (acc.id && acc.access_token) {
                pageTokensCache.set(acc.id, { token: acc.access_token, name: acc.name, igUserId: acc.instagram?.id || null });
            }
            if (acc.instagram?.id && acc.access_token) {
                pageTokensCache.set(acc.instagram.id, { token: acc.access_token, name: acc.name, pageId: acc.id, igUserId: acc.instagram.id });
            }
        });

        res.json({ success: true, accounts });
    } catch (err) {
        console.error('Error fetching accounts:', err);
        res.status(500).json({ success: false, message: 'تعذر جلب الحسابات' });
    }
});

// مسار فحص رمز Meta وجلب الصفحات المتاحة بحساب المستخدم (SaaS BYOK)
app.post('/api/verify-meta', async (req, res) => {
    try {
        const { metaToken } = req.body;
        if (!metaToken || !metaToken.trim()) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال رمز Meta Access Token أولاً.' });
        }

        const url = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,picture{url},access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${metaToken.trim()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ success: false, message: data.error.message || 'رمز Meta غير صالح أو تنقصه الصلاحيات.' });
        }

        const pages = (data.data || []).map(acc => ({
            id: acc.id,
            name: acc.name,
            picture: acc.picture?.data?.url || null,
            access_token: acc.access_token,
            instagram: acc.instagram_business_account ? {
                id: acc.instagram_business_account.id,
                username: acc.instagram_business_account.username,
                picture: acc.instagram_business_account.profile_picture_url || null
            } : null
        }));

        // تسجيل الصفحات في الذاكرة والاشتراك التلقائي في الويبهوك
        for (const acc of pages) {
            if (acc.id && acc.access_token) {
                pageTokensCache.set(acc.id, { token: acc.access_token, name: acc.name, igUserId: acc.instagram?.id || null });
                // استدعاء تلقائي لربط الصفحة بتطبيق الميتا واستقبال التعليقات والرسائل
                fetch(`https://graph.facebook.com/v21.0/${acc.id}/subscribed_apps?subscribed_fields=feed,messages&access_token=${acc.access_token}`, { method: 'POST' })
                    .then(r => r.json())
                    .then(d => console.log(`[Auto-Subscribe Webhook] Page (${acc.name} - ${acc.id}):`, d))
                    .catch(e => console.warn(`[Auto-Subscribe Webhook Error]:`, e.message));
            }
            if (acc.instagram?.id && acc.access_token) {
                pageTokensCache.set(acc.instagram.id, { token: acc.access_token, name: acc.name, pageId: acc.id, igUserId: acc.instagram.id });
            }
        }

        res.json({ success: true, count: pages.length, pages });
    } catch (err) {
        console.error('Error in /api/verify-meta:', err);
        res.status(500).json({ success: false, message: err.message || 'تعذر الاتصال بخوادم Meta.' });
    }
});

// مسار فحص اتصال Cloudinary المخصص للمستخدم
app.post('/api/verify-cloudinary', async (req, res) => {
    try {
        const { cloudName, apiKey, apiSecret } = req.body;
        if (!cloudName || !apiKey || !apiSecret) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال كافة بيانات Cloudinary الثلاثة.' });
        }

        const pingRes = await cloudinary.api.ping({
            cloud_name: cloudName.trim(),
            api_key: apiKey.trim(),
            api_secret: apiSecret.trim()
        });

        if (pingRes && pingRes.status === 'ok') {
            return res.json({ success: true, message: 'الاتصال بحساب Cloudinary ناجح 100%!' });
        }
        res.status(400).json({ success: false, message: 'فشل التحقق من بيانات Cloudinary.' });
    } catch (err) {
        console.error('Error verifying Cloudinary:', err);
        res.status(400).json({ success: false, message: err.message || 'بيانات Cloudinary غير صحيحة.' });
    }
});

// ========================================================
// مسارات الويبهوك لـ Meta (Webhooks Verification & Events)
// ========================================================
const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'socialflow_webhook_2026';

// 1. مسار التحقق من الويبهوك عندما تطلبه Meta لأول مرة (GET /api/webhook)
app.get('/api/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`[Meta Webhook GET] Mode: ${mode}, Token: ${token}`);

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('✅ [Meta Webhook] تم التحقق بنجاح من Webhook Verify Token!');
        res.status(200).send(challenge);
    } else {
        console.warn('❌ [Meta Webhook] فشل التحقق: رمز Verify Token غير متطابق.');
        res.sendStatus(403);
    }
});

// 2. مسار استقبال ومعالجة أحداث الويبهوك التلقائية (POST /api/webhook)
app.post('/api/webhook', async (req, res) => {
    try {
        const body = req.body;
        if (!body || !body.entry || !Array.isArray(body.entry)) {
            return res.status(200).send('EVENT_RECEIVED');
        }

        console.log('\n🔔 [Meta Webhook] استلام حدث جديد من Meta:');

        for (const entry of body.entry) {
            const pageOrIgId = entry.id;
            const changes = entry.changes || [];

            for (const change of changes) {
                const field = change.field;
                const value = change.value;
                if (!value) continue;

                let platform = 'facebook';
                let commentId = null;
                let commentText = null;
                let postId = null;
                let senderId = null;
                let senderName = 'عميلنا العزيز';

                // فيسبوك: التعليق على المنشورات (field === 'feed')
                if (field === 'feed' && value.item === 'comment' && value.verb === 'add') {
                    platform = 'facebook';
                    commentId = value.comment_id;
                    commentText = value.message;
                    postId = value.post_id || value.parent_id;
                    senderId = value.sender_id || value.from?.id;
                    senderName = value.sender_name || value.from?.name || 'عميل فيسبوك';
                }
                // انستجرام: التعليق على المنشورات (field === 'comments')
                else if (field === 'comments') {
                    platform = 'instagram';
                    commentId = value.id;
                    commentText = value.text;
                    postId = value.media?.id;
                    senderId = value.from?.id;
                    senderName = value.from?.username || 'عميل انستجرام';
                }

                if (!commentId || !commentText) continue;

                // حماية من الحلقات التكرارية اللانهائية: تجاهل إذا كان المعلق هو الصفحة أو الحساب نفسه
                const cachedAcc = pageTokensCache.get(pageOrIgId);
                if (senderId && (senderId === pageOrIgId || (cachedAcc && (senderId === cachedAcc.pageId || senderId === cachedAcc.igUserId)))) {
                    console.log(`[Auto-Reply] تم تجاهل تعليق صادر من الصفحة نفسها: ${senderId}`);
                    continue;
                }

                console.log(`[Auto-Reply] تعليق جديد مستلم على ${platform}: "${commentText}" من: ${senderName} (Post: ${postId})`);

                // تنفيذ دورة الرد التلقائي وانتظار اكتمالها بالكامل (Like -> Public Reply -> DM) لضمان عدم تجميد السيرفر في Vercel
                try {
                    await handleIncomingComment({
                        platform,
                        pageOrIgId,
                        commentId,
                        commentText,
                        postId,
                        senderId,
                        senderName
                    });
                } catch (err) {
                    console.error('[Auto-Reply Processing Error]:', err);
                }
            }
        }
    } catch (err) {
        console.error('Error handling webhook event:', err);
    }

    res.status(200).send('EVENT_RECEIVED');
});

// 3. مسار جلب معلومات الويبهوك لمساعدة المستخدمين في الربط
app.get('/api/webhook-info', (req, res) => {
    const host = req.get('host');
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const callbackUrl = `${protocol}://${host}/api/webhook`;

    res.json({
        success: true,
        callbackUrl,
        verifyToken: WEBHOOK_VERIFY_TOKEN
    });
});

// ========================================================
// 🤖 مسارات واجهة برمجة تطبيقات الرد التلقائي الذكي (Auto-Reply API)
// ========================================================

// ========================================================
// 🤖 مسارات واجهة برمجة تطبيقات الرد التلقائي الذكي (Auto-Reply API)
// ========================================================

// 1. جلب إعدادات وقاعدة معرفة الرد التلقائي (يدعم تخصيص الصفحة)
app.get('/api/autoreply/config', async (req, res) => {
    try {
        const pageId = req.query.pageId;
        const config = await getAutoReplyConfig(pageId);
        res.json({ success: true, config });
    } catch (err) {
        console.error('Error in GET /api/autoreply/config:', err);
        res.status(500).json({ success: false, message: 'تعذر جلب الإعدادات' });
    }
});

// 2. حفظ إعدادات وقاعدة معرفة الرد التلقائي (تخصيص الصفحة المحددة)
app.post('/api/autoreply/config', async (req, res) => {
    try {
        const pageId = req.body.pageId || req.query.pageId;
        const currentConfig = await getAutoReplyConfig(pageId);
        const updatedConfig = { ...currentConfig, ...req.body };
        await saveAutoReplyConfig(updatedConfig, pageId);
        res.json({ success: true, config: updatedConfig, message: 'تم حفظ قاعدة المعرفة والإعدادات بنجاح للمشروع المحدد!' });
    } catch (err) {
        console.error('Error in POST /api/autoreply/config:', err);
        res.status(500).json({ success: false, message: 'تعذر حفظ الإعدادات' });
    }
});

// مسار يدوي/فوري لربط واشتراك الصفحة بتطبيق الميتا (Subscribed Apps)
app.post('/api/autoreply/subscribe-page', async (req, res) => {
    try {
        const { pageId, token } = req.body;
        const targetPageId = pageId;
        const cached = pageTokensCache.get(targetPageId) || {};
        const pageToken = token || cached.token || process.env.META_ACCESS_TOKEN;

        if (!targetPageId || !pageToken) {
            return res.status(400).json({ success: false, message: 'يرجى تحديد الصفحة وتوفير رمز Access Token صالح.' });
        }

        const url = `https://graph.facebook.com/v21.0/${targetPageId}/subscribed_apps?subscribed_fields=feed,messages&access_token=${pageToken.trim()}`;
        const subRes = await fetch(url, { method: 'POST' });
        const subData = await subRes.json();

        if (subData.error) {
            return res.status(400).json({ success: false, message: subData.error.message });
        }

        res.json({
            success: true,
            message: 'تم ربط الصفحة بالويبهوك بنجاح! ستصل أي تعليقات جديدة للسيرفر فوراً.',
            result: subData
        });
    } catch (err) {
        console.error('Error in /api/autoreply/subscribe-page:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. مسار جلب منشورات الصفحة لتحديد المنشورات المستهدفة بالخدمة
app.get('/api/page-posts', async (req, res) => {
    try {
        const { pageId, metaToken } = req.query;
        if (!pageId) {
            return res.status(400).json({ success: false, message: 'يرجى تحديد الصفحة أولاً.' });
        }

        const cached = pageTokensCache.get(pageId) || {};
        const token = cached.token || metaToken || META_ACCESS_TOKEN;

        let posts = [];

        // أ) جلب أحدث المنشورات من Graph API
        if (token) {
            try {
                const url = `https://graph.facebook.com/v21.0/${pageId}/published_posts?fields=id,message,created_time,full_picture,attachments{media}&limit=20&access_token=${token.trim()}`;
                const apiRes = await fetch(url);
                const apiData = await apiRes.json();
                if (apiData.data && Array.isArray(apiData.data)) {
                    posts = apiData.data.map(p => ({
                        id: p.id,
                        caption: p.message || 'منشور بدون كابشن',
                        picture: p.full_picture || p.attachments?.data?.[0]?.media?.image?.src || null,
                        createdTime: p.created_time
                    }));
                }
            } catch (e) {
                console.error('Error fetching published posts from Graph API:', e);
            }
        }

        // ب) دمج المنشورات المحلية الخاصة بالصفحة
        const localPosts = await getScheduledPosts();
        for (const lp of localPosts) {
            if (lp.pageId === pageId && !posts.some(p => p.id === lp.id)) {
                posts.unshift({
                    id: lp.id,
                    caption: lp.content || 'منشور مجدول',
                    picture: lp.mediaUrl || null,
                    createdTime: lp.publishedAt || lp.scheduledTime || lp.createdAt
                });
            }
        }

        res.json({ success: true, count: posts.length, posts });
    } catch (err) {
        console.error('Error in /api/page-posts:', err);
        res.status(500).json({ success: false, message: 'تعذر جلب المنشورات' });
    }
});

// 4. توليد برومبت النظام المخصص بالذكاء الاصطناعي (AI Custom System Prompt Builder)
app.post('/api/autoreply/generate-prompt', async (req, res) => {
    try {
        const { projectName, niche, services, phones, email, socialLinks, groqApiKey } = req.body;

        let servicesFormatted = '';
        if (Array.isArray(services) && services.length > 0) {
            servicesFormatted = services.map((s, idx) => `
${idx + 1}. الخدمة/المنتج: ${s.name || 'بدون اسم'}
   - السعر: ${s.price ? s.price : 'حسب المواصفات والطلب'}
   - التفاصيل والمميزات: ${s.details || 'خدمة متميزة واحترافية'}
`).join('\n');
        } else if (typeof services === 'string') {
            servicesFormatted = services;
        }

        const phonesFormatted = Array.isArray(phones) ? phones.filter(p => p && p.trim()).join('، ') : (phones || 'عبر رسائل الصفحة أو الواتساب');
        const socialsFormatted = Array.isArray(socialLinks) 
            ? socialLinks.map(s => `${s.platform || 'رابط'}: ${s.url}`).join(' | ') 
            : '';

        console.log(`[AI Prompt Builder] جاري صياغة برومبت النظام المخصص لـ: ${projectName || 'مشروع جديد'}`);

        const architectPrompt = `أنت كبير مهندسي برومبتات الذكاء الاصطناعي (Lead AI Prompt Engineer) واستراتيجي مبيعات رقمية لخدمة العملاء.
مهمتك: صياغة برومبت نظام احترافي مخصص وشامل (Custom System Prompt) لنموذج ذكاء اصطناعي يعمل لدى شركة/مشروع (${projectName || 'مشروعنا'}).

بيانات ومعلومات النشاط:
- اسم المشروع: ${projectName || 'مشروعنا'}
- مجال وتخصص النشاط: ${niche || 'خدمات متميزة'}
- قائمة الخدمات والمنتجات مع أسعارها وتفاصيلها:
${servicesFormatted || 'خدمات متنوعة'}
- أرقام الهاتف والواتساب: ${phonesFormatted}
- البريد الإلكتروني: ${email || 'غير محدد'}
- روابط السوشيال ميديا والتواصل: ${socialsFormatted || 'عبر الصفحة'}

المطلوب صياغة البرومبت النهائي الكامل الذي سيوضع في الـ System Role للذكاء الاصطناعي، ويجب أن يشمل بدقة:
1. الشخصية والنبرة: موظف خدمة عملاء ومبيعات مصري محترف ولطيف جداً وودود، يتحدث بلهجة مصرية عامية طبيعية إنسانية.
2. قاعدة المعرفة التفصيلية: تضمين كافة الخدمات والمنتجات وأسعارها ومميزاتها بدقة كما ذُكرت في البيانات أعلاه.
3. التفاعل مع اسم العميل: تحية العميل باسمه الشخصي دائماً في بداية الرد العام والرسالة الخاصة.
4. الرد العام على التعليق في البوست (publicReply): مختصر جداً (جملة أو جملتين)، يجيب تحديداً على سؤال العميل بذكاء، وينبهه أنه تم إرسال رسالة خاصة على الـ DM 📩.
5. الرسالة الخاصة في الـ DM (privateMessage) - التنسيق والتقسيم الجمالي الإلزامي:
   - شرط أساسي: ممنوع نهائياً جعل الرسالة كتلة نصية واحدة مصمتة أو دمج الكلام في سطر واحد طويل.
   - يجب أن تكون الرسالة منسقة ومقسمة بدقة باستخدام فواصل أسطر جديدة ونقاط وإيموجي منظمة:
     * سطر مستقل للتحية باسم العميل مع ترحيب ودود.
     * فقرة مستقلة للإجابة عن سؤاله بالتفصيل وربطها بالخدمة المذكورة.
     * فقرة منظمة بنقاط (مثل 🔹، ✨) لتفاصيل الأسعار والباقات والمميزات.
     * فقرة أرقام الواتساب وروابط التواصل في أسطر مستقلة واضحة ومريحة للقراءة.
     * سطر مستقل ختامي بسؤال لطيف لتشجيع العميل على تأكيد الحجز.
قواعد حاسمة وممنوعات قطعية:
- ممنوع منعاً باتاً وضع أي نصوص نائبة أو أقواس مربعة مثل [أدخل رابط الحجز] أو [ضع الرابط] أو [السعر] أو [أي نص بين أقواس].
- إذا لم يتوفر رابط حجز مخصص، اطلب من العميل التواصل عبر الواتساب أو رسائل الصفحة لتحديد الميعاد والاتفاق فوراً دون وضع أي نصوص نائبة إطلاقاً.

اكتب نص البرومبت النهائي مباشرة باللغة العربية ليكون جاهزاً للاستخدام فوراً كنص برومبت أساسي.`;

        const apiKey = groqApiKey || process.env.GROQ_API_KEY || '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';

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: 'You are an elite AI Prompt Engineer. Output the finalized comprehensive Arabic system prompt directly without introductory filler.' },
                    { role: 'user', content: architectPrompt }
                ],
                temperature: 0.4,
                max_tokens: 2200
            })
        });

        const groqData = await groqRes.json();
        if (groqData.error) throw new Error(groqData.error.message || 'Groq prompt builder error');

        const customPrompt = groqData.choices?.[0]?.message?.content || '';

        res.json({
            success: true,
            customPrompt,
            tokensUsed: groqData.usage?.total_tokens || 0
        });
    } catch (err) {
        console.error('Error in /api/autoreply/generate-prompt:', err);
        res.status(500).json({ success: false, message: err.message || 'تعذر توليد البرومبت المخصص.' });
    }
});

// 5. فحص صفحة معينة من موقع العميل (ضمن خطة الـ 4 صفحات المتتابعة)
app.post('/api/autoreply/scrape-page', async (req, res) => {
    try {
        const { baseUrl, pageType, customUrl, groqApiKey } = req.body;
        if (!baseUrl && !customUrl) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال رابط الموقع.' });
        }

        let targetUrl = customUrl || baseUrl.trim();
        if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);

        if (!customUrl) {
            if (pageType === 'services') targetUrl = `${targetUrl}/services`;
            else if (pageType === 'about') targetUrl = `${targetUrl}/about`;
            else if (pageType === 'contact') targetUrl = `${targetUrl}/contact`;
        }

        console.log(`[AI Scraper Page] جاري فحص صفحة (${pageType}): ${targetUrl}`);

        let html = '';
        try {
            const resp = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                signal: AbortSignal.timeout(12000)
            });
            if (resp.ok) {
                html = await resp.text();
            } else if (pageType !== 'home') {
                const altUrl = pageType === 'services' ? `${baseUrl}/products` 
                             : pageType === 'about' ? `${baseUrl}/about-us`
                             : `${baseUrl}/contact-us`;
                const altResp = await fetch(altUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(10000)
                });
                if (altResp.ok) html = await altResp.text();
            }
        } catch (e) {
            console.warn(`[AI Scraper Page] Fetch failed for ${targetUrl}:`, e.message);
        }

        if (!html && baseUrl) {
            try {
                const baseResp = await fetch(baseUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(10000)
                });
                if (baseResp.ok) html = await baseResp.text();
            } catch {}
        }

        if (!html) {
            return res.status(400).json({ success: false, message: `تعذر الاتصال بصفحة (${pageType}).` });
        }

        // 1. استخراج مباشر ودقيق للبيانات من كود الـ HTML والفوتر (Direct Regex Scraper for Footer & Attributes)
        const discoveredTels = Array.from(new Set([
            ...Array.from(html.matchAll(/href=["']tel:([^"'>\s]+)["']/gi)).map(m => m[1].replace(/[\s-]/g, '')),
            ...Array.from(html.matchAll(/(?:wa\.me\/|phone=)([0-9+]{8,16})/gi)).map(m => m[1].replace(/[\s-]/g, ''))
        ])).filter(t => t.length >= 7);

        const discoveredEmails = Array.from(new Set([
            ...Array.from(html.matchAll(/href=["']mailto:([^"'>?\s]+)["']/gi)).map(m => m[1].trim()),
            ...Array.from(html.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi)).map(m => m[0].trim())
        ])).filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.webp') && !e.includes('example.com') && !e.includes('sentry') && !e.includes('wixpress') && !e.includes('cloudflare'));

        const discoveredSocials = Array.from(new Set([
            ...Array.from(html.matchAll(/(?:href=["']|\b)\/?(https?:\/\/(?:www\.)?(facebook|instagram|tiktok|youtube|linkedin|x|twitter)\.com\/[a-zA-Z0-9._\-\/]+)["']?/gi)).map(m => {
                const rawUrl = m[1].replace(/^\/+/, '').trim();
                const p = m[2].toLowerCase();
                return {
                    platform: p === 'facebook' ? 'فيسبوك' 
                            : p === 'instagram' ? 'انستجرام'
                            : p === 'tiktok' ? 'تيك توك'
                            : p === 'youtube' ? 'يوتيوب'
                            : p === 'linkedin' ? 'لينكد إن'
                            : 'منصة إكس',
                    url: rawUrl
                };
            })
        ]));

        // 2. تنظيف المحتوى النصي مع الحفاظ التام على نصوص الفوتر (Footer) والترويسة (Header)
        let cleanText = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
            .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // تحليل فائق العمق والجودة: رفع استيعاب النص إلى 14,500 حرف (~3,800 توكن مدخلات) ليبقى المجموع الكلي مع المخرجات في حدود 5,500 إلى 6,000 توكن كحد أقصى لضمان أعلى جودة
        if (cleanText.length > 14500) cleanText = cleanText.substring(0, 14500);

        // إرفاق بيانات الفوتر والروابط المكتشفة نصياً للنموذج
        let footerContext = '\n\n[بيانات وروابط مكتشفة من الفوتر وكود الصفحة]:\n';
        if (discoveredTels.length) footerContext += `- أرقام الاتصال والواتساب: ${discoveredTels.join('، ')}\n`;
        if (discoveredEmails.length) footerContext += `- البريد الإلكتروني: ${discoveredEmails.join('، ')}\n`;
        if (discoveredSocials.length) footerContext += `- روابط السوشيال ميديا: ${discoveredSocials.map(s => `${s.platform}: ${s.url}`).join(' | ')}\n`;
        cleanText += footerContext;

        const apiKey = groqApiKey || process.env.GROQ_API_KEY || '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';

        let promptForPage = '';
        if (pageType === 'home') {
            promptForPage = `أنت في وضع "التحليل الاستقصائي فائق العمق والجودة" (Ultra-Deep Business Analysis Mode).
حلل نص الصفحة والفوتر تحليلاً عميقاً واستخرج بدقة استقصائية بصيغة JSON:
- projectName: اسم الشركة أو المركز أو المشروع التجاري الرسمي
- niche: المجال والتخصص الدقيق للنشاط
- overview: نبذة تعريفية شاملة وعميقة عن رسالة المشروع وتاريخه والقيمة المضافة التي يقدمها
- phones: مصفوفة أرقام الهواتف أو الواتساب المتاحة في الصفحة أو الفوتر
- email: البريد الإلكتروني إن وجد
- socialLinks: مصفوفة كائنات { platform: اسم المنصة, url: الرابط } لروابط المنصات المذكورة بالفوتر أو الموقع`;
        } else if (pageType === 'services') {
            promptForPage = `أنت في وضع "التحليل الاستقصائي فائق العمق للخدمات والمنتجات" (Ultra-Deep Services Analysis Mode).
حلل نص صفحة الخدمات والفوتر بأعلى درجات التفصيل والاستقصاء، واستخرج كل خدمة أو منتج أو باقة مذكورة بدقة بصيغة JSON:
- services: مصفوفة كائنات شاملة تضم كافة الخدمات أو المنتجات المستخرجة بدون استثناء. لكل خدمة استخرج:
  * name: اسم الخدمة أو الباقة بدقة
  * price: السعر المذكور أو نسبة الخصم أو خطة التقسيط المتاحة (أو "حسب الطلب والمواصفات")
  * details: تفاصيل ومميزات الخدمة وكيفية الاستفادة منها والضمان أو شروط الاستفادة
- phones: مصفوفة أرقام الهواتف المذكورة
- email: البريد الإلكتروني إن وجد`;
        } else if (pageType === 'about') {
            promptForPage = `أنت في وضع "التحليل الاستقصائي فائق العمق لهوية الشركة" (Ultra-Deep Persona Analysis Mode).
حلل نص صفحة من نحن والفوتر بعمق استقصائي شامل، واستخرج بصيغة JSON:
- companyStory: قصة التأسيس، سنوات الخبرة، الرؤية، والاعتمادات أو الشهادات المذكورة
- strengths: مصفوفة بأبرز نقاط القوة والميزات التنافسية للشركة
- branches: عناوين الفروع أو المقرات إن ذكرت
- phones: مصفوفة أرقام الهواتف المذكورة
- email: البريد الإلكتروني إن وجد`;
        } else if (pageType === 'contact') {
            promptForPage = `أنت في وضع "التحليل الاستقصائي فائق العمق لقنوات التواصل" (Ultra-Deep Contact Channels Mode).
حلل نص صفحة التواصل والفوتر تحليلاً استقصائياً كاملاً لكافة قنوات الاتصال، واستخرج بدقة بصيغة JSON:
- phones: مصفوفة شاملة لكافة أرقام الهواتف المحمولة والأرضية وأرقام الواتساب المتاحة
- email: البريد الإلكتروني المذكور للتواصل أو الدعم
- socialLinks: مصفوفة كائنات { platform: اسم المنصة, url: الرابط } لكافة منصات السوشيال ميديا
- address: عناوين الفروع أو المقرات وساعات ومواعيد العمل المذكورة`;
        }

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: `أنت خبير استخراج بيانات أعمال استقصائي رفيع المستوى لضمان أعلى درجات الجودة والشمول. استخرج البيانات المطلوبة بأقصى دقة وتفصيل وبصيغة JSON حصراً باللغة العربية.\n${promptForPage}` },
                    { role: 'user', content: `إليك نص الصفحة ومحتوى الفوتر المكتشف كاملاً:\n\n${cleanText}` }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
                max_tokens: 2000
            })
        });

        const groqData = await groqRes.json();
        if (groqData.error) throw new Error(groqData.error.message || 'Groq API error');

        let parsed = JSON.parse(groqData.choices?.[0]?.message?.content || '{}');

        // دمج أرقام الهواتف والإيميل وروابط السوشيال المكتشفة كودياً لضمان عدم إفلات أي رقم أو إيميل
        if (!parsed.phones || !Array.isArray(parsed.phones) || parsed.phones.length === 0) {
            parsed.phones = discoveredTels;
        } else if (discoveredTels.length > 0) {
            parsed.phones = Array.from(new Set([...parsed.phones, ...discoveredTels]));
        }

        if (!parsed.email && discoveredEmails.length > 0) {
            parsed.email = discoveredEmails[0];
        }

        if (!parsed.socialLinks || !Array.isArray(parsed.socialLinks) || parsed.socialLinks.length === 0) {
            parsed.socialLinks = discoveredSocials;
        } else if (discoveredSocials.length > 0) {
            const existingUrls = new Set(parsed.socialLinks.map(s => String(s.url || '').replace(/^\/+/, '').trim()));
            discoveredSocials.forEach(ds => {
                if (!existingUrls.has(ds.url)) parsed.socialLinks.push(ds);
            });
        }

        if (Array.isArray(parsed.socialLinks)) {
            parsed.socialLinks = parsed.socialLinks.map(s => {
                const u = String(s.url || '').replace(/^\/+/, '').trim();
                let plat = s.platform || 'فيسبوك';
                const lower = (u + ' ' + (s.platform || '')).toLowerCase();
                if (lower.includes('facebook') || lower.includes('fb.com')) plat = 'فيسبوك';
                else if (lower.includes('instagram') || lower.includes('instagr.am')) plat = 'انستجرام';
                else if (lower.includes('linkedin')) plat = 'لينكد إن';
                else if (lower.includes('x.com') || lower.includes('twitter')) plat = 'منصة إكس';
                else if (lower.includes('tiktok')) plat = 'تيك توك';
                else if (lower.includes('youtube') || lower.includes('youtu.be')) plat = 'يوتيوب';
                else if (lower.includes('wa.me') || lower.includes('whatsapp')) plat = 'واتساب';
                return { platform: plat, url: u };
            }).filter(s => s.url);
        }

        res.json({
            success: true,
            pageType,
            data: parsed,
            tokensUsed: groqData.usage?.total_tokens || 0
        });
    } catch (err) {
        console.error('Error in /api/autoreply/scrape-page:', err);
        res.status(500).json({ success: false, message: err.message || 'تعذر فحص الصفحة.' });
    }
});

// 6. استوديو تجربة ومحاكاة الرد الفوري (Live Simulator)
app.post('/api/autoreply/test-simulate', async (req, res) => {
    try {
        const { postCaption, commentText, config, senderName } = req.body;
        if (!commentText || !commentText.trim()) {
            return res.status(400).json({ success: false, message: 'يرجى كتابة تعليق تجريبي لتجربة الرد عليه.' });
        }

        const effectiveConfig = config || await getAutoReplyConfig(config?.pageId);
        const replyResult = await generateAutoReplyWithGroq({
            postCaption: postCaption || '',
            commentText: commentText.trim(),
            config: effectiveConfig,
            senderName: senderName || 'أحمد علي'
        });

        res.json({
            success: true,
            publicReply: replyResult.publicReply,
            privateMessage: replyResult.privateMessage,
            actions: ['like', 'reply', 'dm'],
            tokensUsed: replyResult.tokensUsed
        });
    } catch (err) {
        console.error('Error in /api/autoreply/test-simulate:', err);
        res.status(500).json({ success: false, message: err.message || 'تعذر توليد الرد التجريبي.' });
    }
});

// 5. جلب سجل النشاط والردود الحية (Live Logs)
app.get('/api/autoreply/logs', async (req, res) => {
    try {
        const logs = await getAutoReplyLogs();
        res.json({ success: true, logs });
    } catch (err) {
        console.error('Error in GET /api/autoreply/logs:', err);
        res.status(500).json({ success: false, logs: [] });
    }
});

// ========================================================
// 🧠 محرك الذكاء الاصطناعي لتوليد الردود (Groq gpt-oss-120b)
// ========================================================
async function generateAutoReplyWithGroq({ postCaption, commentText, config, senderName }) {
    const apiKey = config?.groqApiKey || process.env.GROQ_API_KEY || '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';
    const model = 'openai/gpt-oss-120b';

    const projectName = (typeof config?.projectName === 'string' ? config.projectName.trim() : '') || 'مشروعنا';
    const niche = (typeof config?.niche === 'string' ? config.niche.trim() : '') || 'خدمات وأعمال عامة';

    let servicesFormatted = 'خدمات ومنتجات متميزة ومبتكرة';
    if (Array.isArray(config?.services) && config.services.length > 0) {
        servicesFormatted = config.services.map((s, idx) => `
${idx + 1}. الخدمة/المنتج: ${s.name || 'خدمة'}
   - السعر: ${s.price ? s.price : 'حسب المواصفات والطلب'}
   - التفاصيل والمميزات: ${s.details || 'متاح بأعلى جودة واحترافية'}`).join('\n');
    } else if (typeof config?.services === 'string' && config.services.trim()) {
        servicesFormatted = config.services.trim();
    }

    let contactsFormatted = 'عبر رسائل الصفحة أو الواتساب';
    const phonesList = Array.isArray(config?.phones) ? config.phones.filter(Boolean) : [];
    if (phonesList.length > 0) {
        contactsFormatted = `أرقام الهاتف والواتساب: ${phonesList.join('، ')}`;
    } else if (typeof config?.contactInfo === 'string' && config.contactInfo.trim()) {
        contactsFormatted = config.contactInfo.trim();
    }
    if (config?.email && typeof config.email === 'string' && config.email.trim()) {
        contactsFormatted += ` | البريد الإلكتروني: ${config.email.trim()}`;
    }

    // تنظيف اسم العميل واستخراجه لمناداته به في التحية
    const rawName = (senderName && typeof senderName === 'string' && senderName.trim()) ? senderName.trim() : '';
    let customerName = rawName.replace(/[@_.]/g, ' ').trim();
    if (!customerName || customerName === 'عميل' || customerName === 'عميلنا العزيز') {
        customerName = 'يا فندم';
    }

    const customPromptHeader = (config?.customPrompt && typeof config.customPrompt === 'string' && config.customPrompt.trim())
        ? `برومبت النظام المخصص المعتمد للمشروع:\n${config.customPrompt.trim()}\n\nمعلومات وتفاصيل الخدمات والاتصال:\n`
        : `أنت موظف خدمة عملاء ومبيعات مصري محترف ودود جداً، تتحدث بلهجة مصرية عامية طبيعية إنسانية ولطيفة للغاية، تعمل لدى (${projectName}).\nمجال وتخصص العمل: ${niche}\n`;

    const systemPrompt = `${customPromptHeader}
قائمة الخدمات والمنتجات وتفاصيلها:
${servicesFormatted}
بيانات التواصل وطرق الحجز:
${contactsFormatted}

القواعد الذهبية الصارمة للرد:
1. تحية العميل باسمه الشخصي (شرط إلزامي ورئيسي):
   - يجب عليك في بداية الرد على الكومنت (publicReply) وأيضاً في بداية الرسالة الخاصة (privateMessage) أن تحيي العميل باسمه الشخصي ("${customerName}") بود مصري أصيل (مثال: "أهلاً يا أستاذ ${customerName}" أو "نورتنا يا ${customerName} يا فندم" أو "يا ${customerName} أهلاً بيك").
   - مناداة العميل باسمه تجعل التجربة إنسانية وشخصية 100% وتبعدها تماماً عن الردود الآلية المكررة.

2. الرد العام على التعليق في البوست (publicReply):
   - إلزامي وحاسم: ممنوع نهائياً استخدام قالب ثابت أو رد مكرر ومحفوظ لكل العملاء! الرد يجب أن يُفصّل مخصوص على حسب سؤال العميل بالظبط في تعليقه ("${commentText}"):
     * ابدأ بتحية العميل باسمه ("${customerName}").
     * أجب مباشرة وبشكل مختصر جداً على جوهر سؤاله (إذا سأل عن السعر تلمح للسعر أو الخصم، إذا سأل عن ميزة أو شحن أو مقاسات أو فروع أو مواعيد تجاوبه فوراً على سؤاله المحدد، وإذا كتب "تفاصيل" تربط الرد باسم الخدمة المذكورة في كابشن البوست).
     * نبّهه بلطف لمراجعة رسائل الخاص على الـ DM 📩 لأنك أرسلت له الشرح الكامل هناك.
   - حافظ تماماً على أن يكون الرد العام مختصراً جداً (جملة واحدة أو جملتين كحد أقصى).
   - لهجة مصرية عامية طبيعية إنسانية محبوبة.

3. الرسالة الخاصة في الـ DM (privateMessage) - التنسيق والتوزيع الجمالي الإلزامي:
   - شرط حاسم وأساسي: ممنوع منعاً باتاً كتابة الرسالة كلها في سطر واحد أو ككتلة كلام واحدة مضغوطة!
   - يجب أن تكون الرسالة منسقة ومرتبة بشكل احترافي، ومقسمة بدقة باستخدام فواصل أسطر جديدة (\n\n) وتوزيع كل فكرة في سطر مستقل مع إيموجي لطيفة ومنظمة:
     * سطر التحية المستقل: ابدأ بتحية العميل باسمه الشخصي ("${customerName}") بود مصري في سطر مستقل (مثال: أهلاً بحضرتك يا أستاذ ${customerName}، نورتنا يا فندم! 🌸).
     * فقرة الإجابة والشرح: اشرح إجابة استفساره وسؤاله بالتفصيل الوافي بناءً على كابشن المنشور ومميزات الخدمة.
     * فقرة الأسعار والعرض بنقاط واضحة (كل نقطة في سطر مستقل):
       🔹 السعر/الباقة: اذكر السعر أو الخصم بدقة.
       🔹 المميزات: اذكر أهم ما يميز الخدمة أو المنتج.
     * فقرة أرقام وطرق التواصل (في أسطر واضحة ومستقلة مريحة للعين):
       📲 واتساب للتواصل المباشر: اذكر أرقام الواتساب.
       📧 البريد الإلكتروني أو الروابط المتاحة إن وجدت.
     * سطر الختام المستقل: سؤال تحفيزي لطيف في سطر بمفرده لتشجيع العميل على إتمام الحجز أو الشراء.

4. منع الأقواس والنصوص النائبة نهائياً (Strict Zero-Placeholders Policy):
   - ممنوع نهائياً كتابة أي نصوص بين أقواس مربعة مثل [أدخل رابط الحجز] أو [ضع الرابط هنا] أو [السعر].
   - إذا لم يوجد رابط حجز مخصص بالبيانات، ادعُ العميل بلطف للتواصل على الواتساب أو عبر رسائل الصفحة لحجز ميعاده ومكالمته. كل كلمة يجب أن تكون جاهزة وموجهة للعميل مباشرة دون قوالب فارغة.

أجب بصيغة JSON حصراً بالشكل التالي:
{
  "publicReply": "الرد العام المختصر على الكومنت متضمناً اسم العميل وإجابة سؤاله والتنبيه للخاص",
  "privateMessage": "الرسالة التفصيلية الشاملة المقسمة بدقة لفقرات وأسطر مستقلة ونقاط وبفواصل أسطر"
}`;

    const userMessage = `كابشن المنشور: "${postCaption || 'بدون كابشن'}"\nاسم العميل: "${customerName}"\nتعليق العميل: "${commentText}"`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
            max_tokens: 1200
        })
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message || 'فشل في الاتصال بنموذج Groq');
    }

    const content = data.choices?.[0]?.message?.content || '{}';
    let parsed = {};
    try {
        parsed = JSON.parse(content);
    } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
    }

    // تنظيف صارم لأي نصوص نائبة أو أقواس مربعة مع الحفاظ الكامل على الأسطر الجديدة والفقرات
    const cleanPlaceholders = (text) => {
        if (!text || typeof text !== 'string') return '';
        return text
            .replace(/\[(?:أدخل|ضع|اضف)?\s*رابط[^\]]*\]/gi, 'عبر رسائل الصفحة أو الواتساب مباشرة')
            .replace(/\[(?:أدخل|ضع)?\s*السعر[^\]]*\]/gi, 'حسب تفاصيل العرض')
            .replace(/\[[^\]]+\]/g, '') // إزالة أي أقواس مربعة متبقية
            .replace(/[^\S\r\n]{2,}/g, ' ') // دمج المسافات الأفقية المتتالية فقط مع الحفاظ على فواصل الأسطر \n
            .replace(/\n{3,}/g, '\n\n') // تنظيم فواصل الأسطر بحد أقصى سطرين فارغين بين الفقرات
            .trim();
    };

    const publicReply = cleanPlaceholders(parsed.publicReply || 'أهلاً بحضرتك يا فندم! نورتنا، تم إرسال كافة التفاصيل لحضرتك في رسالة خاصة على الـ DM 📩');
    const privateMessage = cleanPlaceholders(parsed.privateMessage || `أهلاً بحضرتك يا فندم! بخصوص استفسارك، يسعدنا خدمتك دائماً في ${projectName}. تواصل معنا لأي تفاصيل إضافية.`);

    return {
        publicReply,
        privateMessage,
        tokensUsed: data.usage?.total_tokens || 0
    };
}

// ========================================================
// ⚡ دوال التفاعل التلقائي الثلاثة مع Meta (Like -> Reply -> DM)
// ========================================================

// 1. الإعجاب بالتعليق أولاً (Auto-Like Comment)
async function executeLikeComment(commentId, token, platform, igUserId) {
    try {
        let url;
        if (platform === 'facebook') {
            url = `https://graph.facebook.com/v21.0/${commentId}/likes?access_token=${token}`;
        } else {
            // انستجرام: Like عبر معرف المستخدم وحقل comment_id
            const targetUser = igUserId || 'me';
            url = `https://graph.facebook.com/v21.0/${targetUser}/likes?access_token=${token}&comment_id=${commentId}`;
        }

        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return { success: true };
    } catch (err) {
        console.error(`[Meta Like Error] (${platform}):`, err.message);
        return { success: false, error: err.message };
    }
}

// 2. الرد العام على التعليق في المنشور (Public Reply)
async function executePublicReply(commentId, text, token, platform) {
    try {
        let url;
        if (platform === 'facebook') {
            url = `https://graph.facebook.com/v21.0/${commentId}/comments`;
        } else {
            url = `https://graph.facebook.com/v21.0/${commentId}/replies`;
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                access_token: token
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return { success: true, id: data.id };
    } catch (err) {
        console.error(`[Meta Public Reply Error] (${platform}):`, err.message);
        return { success: false, error: err.message };
    }
}

// 3. إرسال الرسالة الخاصة في الـ DM (Private Message)
async function executePrivateDm(commentId, text, token, platform, igUserId) {
    try {
        let url;
        if (platform === 'facebook') {
            url = `https://graph.facebook.com/v21.0/me/messages`;
        } else {
            const targetUser = igUserId || 'me';
            url = `https://graph.facebook.com/v21.0/${targetUser}/messages`;
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { comment_id: commentId },
                message: { text: text },
                access_token: token
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return { success: true, id: data.message_id || data.recipient_id };
    } catch (err) {
        console.error(`[Meta Private DM Error] (${platform}):`, err.message);
        return { success: false, error: err.message };
    }
}

// المعالج الشامل لدورة الرد التلقائي عند استلام تعليق
async function handleIncomingComment({ platform, pageOrIgId, commentId, commentText, postId, senderId, senderName }) {
    // 1. جلب إعدادات وقاعدة معرفة العميل للصفحة المحددة
    const config = await getAutoReplyConfig(pageOrIgId);
    if (!config.enabled) {
        console.log('[Auto-Reply] نظام الرد التلقائي معطل حالياً.');
        return;
    }

    // 2. الحصول على توكن الصفحة
    const cached = pageTokensCache.get(pageOrIgId) || {};
    const token = cached.token || config.pageToken || META_ACCESS_TOKEN;
    const igUserId = cached.igUserId || (platform === 'instagram' ? pageOrIgId : null);

    if (!token) {
        console.warn(`[Auto-Reply] لا يوجد Access Token متاح للصفحة: ${pageOrIgId}`);
        return;
    }

    // 3. استخراج كابشن المنشور لفهم سياق استفسار العميل بدقة
    let postCaption = postCaptionsCache.get(postId) || '';
    if (!postCaption && postId && token) {
        try {
            const postRes = await fetch(`https://graph.facebook.com/v21.0/${postId}?fields=message,caption&access_token=${token}`);
            const postData = await postRes.json();
            postCaption = postData.message || postData.caption || '';
            if (postCaption) {
                postCaptionsCache.set(postId, postCaption);
            }
        } catch (e) {
            console.error('Could not fetch post caption from Graph API:', e);
        }
    }

    // 4. توليد الردود بذكاء اصطناعي Groq (باللهجة المصرية الإنسانية)
    const replyData = await generateAutoReplyWithGroq({
        postCaption,
        commentText,
        config,
        senderName
    });

    const actionsTaken = [];

    // الخطوة 1 الصارمة: الإعجاب بالتعليق أولاً (Auto-Like Comment)
    if (config.likeComment) {
        const likeRes = await executeLikeComment(commentId, token, platform, igUserId);
        if (likeRes.success) {
            actionsTaken.push('like');
            console.log(`[Auto-Reply] ❤️ تم وضع إعجاب بالتعليق بنجاح: ${commentId}`);
        }
    }

    // الخطوة 2: الرد العام على المنشور (Public Reply)
    if (config.replyComment && replyData.publicReply) {
        const replyRes = await executePublicReply(commentId, replyData.publicReply, token, platform);
        if (replyRes.success) {
            actionsTaken.push('reply');
            console.log(`[Auto-Reply] 💬 تم الرد العام على المنشور: "${replyData.publicReply}"`);
        }
    }

    // الخطوة 3: إرسال الرسالة الخاصة في الـ DM (Private Message)
    if (config.sendDm && replyData.privateMessage) {
        const dmRes = await executePrivateDm(commentId, replyData.privateMessage, token, platform, igUserId);
        if (dmRes.success) {
            actionsTaken.push('dm');
            console.log(`[Auto-Reply] 📩 تم إرسال الرسالة الخاصة في الـ DM بنجاح!`);
        }
    }

    // 5. تسجيل الحدث في سجل النشاط والردود الحية (Live Activity Log)
    await addAutoReplyLog({
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        platform,
        senderName,
        senderId,
        commentText,
        postCaption: postCaption ? (postCaption.length > 80 ? postCaption.substring(0, 80) + '...' : postCaption) : 'بدون كابشن',
        publicReply: replyData.publicReply,
        privateMessage: replyData.privateMessage,
        actions: actionsTaken,
        timestamp: new Date().toISOString()
    });
}


// دالة ذكية لضمان مطابقة أبعاد الصورة لمعايير انستجرام الصارمة (بين 4:5 و 1.91:1)
function getInstagramSafeImageUrl(cloudUrl, width, height, userRatio) {
    if (!cloudUrl || !cloudUrl.includes('/image/upload/')) return cloudUrl;
    let transformation = '';

    if (userRatio === '1:1') {
        transformation = 'ar_1:1,c_pad,b_auto/';
    } else if (userRatio === '4:5') {
        transformation = 'ar_4:5,c_pad,b_auto/';
    } else if (userRatio === 'original') {
        const ratio = width && height ? (width / height) : 1;
        if (ratio < 0.8) transformation = 'ar_4:5,c_pad,b_auto/';
        else if (ratio > 1.91) transformation = 'ar_1.91:1,c_pad,b_auto/';
    } else {
        // الوضع التلقائي الذكي Smart Fit: يتدخل فقط إذا كانت الصورة خارج النطاق المسموح (0.8 إلى 1.91)
        const ratio = width && height ? (width / height) : 1;
        if (ratio < 0.8) {
            transformation = 'ar_4:5,c_pad,b_auto/';
        } else if (ratio > 1.91) {
            transformation = 'ar_1.91:1,c_pad,b_auto/';
        }
    }

    return transformation ? cloudUrl.replace('/image/upload/', `/image/upload/${transformation}`) : cloudUrl;
}

// 2. مسار النشر والجدولة (POST /api/publish)
app.post('/api/publish', upload.single('media'), async (req, res) => {
    try {
        const { 
            content, 
            platforms, 
            isScheduled, 
            scheduledTime, 
            pageId, 
            pageAccessToken,
            igUserId,
            metaToken,
            customCaptions, 
            aspectRatio, 
            firstComment,
            userCloudinary
        } = req.body;

        const parsedPlatforms = JSON.parse(platforms || '[]');
        let parsedCustomCaptions = null;
        try {
            if (customCaptions) parsedCustomCaptions = JSON.parse(customCaptions);
        } catch {}

        let cloudUrl = null;
        let mediaWidth = null;
        let mediaHeight = null;

        // إذا كان هناك ملف مرفوع (صورة أو فيديو)، نرفعه للسحابة مباشرة من الذاكرة (Memory Buffer) دون كتابة على القرص
        if (req.file) {
            console.log(`[Cloudinary] جاري رفع الميديا للسحابة من الذاكرة: ${req.file.originalname}`);
            const isVideo = req.file.mimetype.startsWith('video/');
            
            const uploadOptions = {
                resource_type: isVideo ? 'video' : 'image',
                folder: 'socialflow_uploads'
            };

            // دعم استخدام بيانات Cloudinary المخصصة للمستخدم إذا وُجدت
            if (userCloudinary) {
                try {
                    const uc = JSON.parse(userCloudinary);
                    if (uc.cloudName && uc.apiKey && uc.apiSecret) {
                        uploadOptions.cloud_name = uc.cloudName.trim();
                        uploadOptions.api_key = uc.apiKey.trim();
                        uploadOptions.api_secret = uc.apiSecret.trim();
                    }
                } catch (e) {}
            }

            // تحويل البفر في الذاكرة إلى Data URI لرفعه مباشرة لسحابة Cloudinary
            const base64Data = req.file.buffer.toString('base64');
            const dataUri = `data:${req.file.mimetype};base64,${base64Data}`;

            const uploadRes = await cloudinary.uploader.upload(dataUri, uploadOptions);
            cloudUrl = uploadRes.secure_url;
            mediaWidth = uploadRes.width;
            mediaHeight = uploadRes.height;
            console.log(`[Cloudinary] تم الرفع بنجاح! الرابط: ${cloudUrl} (أبعاد: ${mediaWidth}x${mediaHeight})`);
        }

        const postData = {
            id: 'post_' + Date.now(),
            content: content || '',
            customCaptions: parsedCustomCaptions,
            aspectRatio: aspectRatio || 'auto',
            firstComment: (firstComment || '').trim(),
            mediaPath: null,
            mediaUrl: cloudUrl,
            mediaWidth,
            mediaHeight,
            mediaType: req.file ? req.file.mimetype : null,
            platforms: parsedPlatforms,
            pageId: pageId,
            pageAccessToken: pageAccessToken || null,
            igUserId: igUserId || null,
            metaToken: metaToken || null,
            createdAt: new Date().toISOString()
        };

        // إذا كان المنشور مجدولاً:
        if (isScheduled === 'true' || isScheduled === true) {
            postData.scheduledTime = scheduledTime;
            postData.status = 'PENDING';

            const posts = await getScheduledPosts();
            posts.push(postData);
            await saveScheduledPosts(posts);

            return res.json({
                success: true,
                message: 'تم حفظ المنشور في جدول الانتظار السحابي بنجاح!',
                post: postData
            });
        }

        // إذا كان نشراً فورياً:
        console.log(`[نشر فوري] جاري النشر إلى المنصات: ${parsedPlatforms.join(', ')}`);
        const results = await executePublish(postData);

        return res.json({
            success: true,
            message: 'تمت معالجة النشر بنجاح!',
            results
        });

    } catch (err) {
        console.error('Error publishing:', err);
        return res.status(500).json({ success: false, message: err.message || 'حدث خطأ أثناء معالجة النشر.' });
    }
});

// 3. مسار جلب المنشورات المجدولة (GET /api/scheduled)
app.get('/api/scheduled', async (req, res) => {
    try {
        const all = await getScheduledPosts();
        if (req.query.all === 'true') {
            return res.json(all);
        }
        const posts = all.filter(p => p.status === 'PENDING');
        res.json(posts);
    } catch {
        res.json([]);
    }
});

// 4. مسار حذف منشور مجدول (DELETE /api/scheduled/:id)
app.delete('/api/scheduled/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let posts = await getScheduledPosts();
        posts = posts.filter(p => p.id !== id);
        await saveScheduledPosts(posts);
        res.json({ success: true, message: 'تم حذف المنشور المجدول.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'تعذر حذف المنشور.' });
    }
});

// 5. مسار تنفيذ الجدولة التلقائية لـ Vercel Cron (GET /api/cron)
app.get('/api/cron', async (req, res) => {
    console.log('[⏰ Vercel Cron] فحص المنشورات المجدولة...');
    try {
        const posts = await getScheduledPosts();
        const now = new Date();
        let updated = false;
        let publishedCount = 0;

        for (const post of posts) {
            if (post.status === 'PENDING' && new Date(post.scheduledTime) <= now) {
                console.log(`[⏰ Cron] نشر البوست المستحق: ${post.id}`);
                try {
                    await executePublish(post);
                    post.status = 'PUBLISHED';
                    post.publishedAt = now.toISOString();
                    updated = true;
                    publishedCount++;
                } catch (err) {
                    console.error('Error in Cron publishing:', err);
                }
            }
        }

        if (updated) {
            await saveScheduledPosts(posts);
        }

        res.json({ success: true, publishedCount, timestamp: now.toISOString() });
    } catch (err) {
        console.error('Cron error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// دالة النشر الفعلية لجميع المنصات مع دعم الكابشن المخصص والتعليق الأول
async function executePublish(post) {
    const results = {};

    let pageAccessToken = post.pageAccessToken || META_ACCESS_TOKEN;
    let igUserId = post.igUserId || null;

    if (post.pageId && (!pageAccessToken || !igUserId)) {
        try {
            const tokenToUse = post.metaToken || META_ACCESS_TOKEN;
            if (tokenToUse) {
                const accRes = await fetch(`https://graph.facebook.com/v21.0/${post.pageId}?fields=access_token,instagram_business_account&access_token=${tokenToUse.trim()}`);
                const accData = await accRes.json();
                if (accData.access_token) {
                    pageAccessToken = accData.access_token;
                }
                if (accData.instagram_business_account) {
                    igUserId = accData.instagram_business_account.id;
                }
            }
        } catch (e) {
            console.error('Could not fetch page details:', e);
        }
    }

    // استخراج الكابشن المخصص لكل منصة
    const fbCaption = (post.customCaptions && post.customCaptions.facebook) ? post.customCaptions.facebook : post.content;
    const igCaption = (post.customCaptions && post.customCaptions.instagram) ? post.customCaptions.instagram : post.content;
    const firstComment = (post.firstComment || '').trim();

    // 1. فيسبوك (Facebook)
    if (post.platforms.includes('facebook') && post.pageId) {
        try {
            results.facebook = await publishToFacebookPage(post.pageId, pageAccessToken, post, fbCaption);
            if (firstComment && results.facebook.success) {
                const targetId = results.facebook.post_id || results.facebook.id;
                results.facebook.firstComment = await postFacebookComment(targetId, firstComment, pageAccessToken);
            }
        } catch (err) {
            results.facebook = { success: false, error: err.message };
        }
    }

    // 2. انستجرام (Instagram)
    if (post.platforms.includes('instagram')) {
        try {
            if (!igUserId) {
                results.instagram = { success: false, error: 'هذه الصفحة غير مربوطة بحساب انستجرام احترافي.' };
            } else {
                results.instagram = await publishToInstagram(igUserId, pageAccessToken, post, igCaption);
                if (firstComment && results.instagram.success) {
                    results.instagram.firstComment = await postInstagramComment(results.instagram.id, firstComment, pageAccessToken);
                }
            }
        } catch (err) {
            results.instagram = { success: false, error: err.message };
        }
    }

    // حفظ كابشن البوست في ذاكرة الكاش ليفهم الرد التلقائي سياق الكومنتات لاحقاً
    const fullCaption = fbCaption || igCaption || post.content || '';
    if (fullCaption) {
        if (post.id) postCaptionsCache.set(post.id, fullCaption);
        if (results.facebook?.id) postCaptionsCache.set(results.facebook.id, fullCaption);
        if (results.facebook?.post_id) postCaptionsCache.set(results.facebook.post_id, fullCaption);
        if (results.instagram?.id) postCaptionsCache.set(results.instagram.id, fullCaption);
    }

    return results;
}

// دالة النشر على صفحة فيسبوك
async function publishToFacebookPage(pageId, token, post, caption) {
    const textCaption = caption || post.content || '';

    // حالة 1: يوجد صورة سحابية (Cloudinary) أو محلية
    if (post.mediaUrl && (!post.mediaType || post.mediaType.startsWith('image/'))) {
        const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: post.mediaUrl,
                caption: textCaption,
                access_token: token
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return { success: true, id: data.id, post_id: data.post_id };
    } else if (post.mediaPath && post.mediaType && post.mediaType.startsWith('image/')) {
        const formData = new FormData();
        const fileBlob = await fs.openAsBlob(post.mediaPath);
        formData.append('source', fileBlob, path.basename(post.mediaPath));
        if (textCaption) formData.append('caption', textCaption);
        formData.append('access_token', token);

        const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return { success: true, id: data.id, post_id: data.post_id };
    }

    // حالة 2: يوجد فيديو سحابي (Cloudinary) أو محلي
    if (post.mediaUrl && post.mediaType && post.mediaType.startsWith('video/')) {
        const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/videos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file_url: post.mediaUrl,
                description: textCaption,
                access_token: token
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return { success: true, id: data.id };
    } else if (post.mediaPath && post.mediaType && post.mediaType.startsWith('video/')) {
        const formData = new FormData();
        const fileBlob = await fs.openAsBlob(post.mediaPath);
        formData.append('source', fileBlob, path.basename(post.mediaPath));
        if (textCaption) formData.append('description', textCaption);
        formData.append('access_token', token);

        const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/videos`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return { success: true, id: data.id };
    }

    // حالة 3: منشور نصي فقط
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: textCaption,
            access_token: token
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { success: true, id: data.id };
}

// دالة النشر على انستجرام مع حماية أبعاد الصورة والكابشن المخصص
async function publishToInstagram(igUserId, token, post, caption) {
    if (!post.mediaUrl) {
        throw new Error('انستجرام يشترط إرفاق صورة أو فيديو لنشر البوست.');
    }

    const isVideo = post.mediaType && post.mediaType.startsWith('video/');
    const textCaption = caption || post.content || '';

    // الخطوة 1: إنشاء حاوية الميديا (Container)
    const containerParams = new URLSearchParams({
        caption: textCaption,
        access_token: token
    });

    if (isVideo) {
        containerParams.append('media_type', 'REELS');
        containerParams.append('video_url', post.mediaUrl);
    } else {
        // حماية الصورة الذكية: ضبط النسبة لتكون مقبولة 100% من انستجرام (بين 0.8 و 1.91)
        const safeImageUrl = getInstagramSafeImageUrl(post.mediaUrl, post.mediaWidth, post.mediaHeight, post.aspectRatio);
        console.log(`[Instagram Safe URL] الرابط المرسل لإنستجرام: ${safeImageUrl}`);
        containerParams.append('image_url', safeImageUrl);
    }

    const createRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
        method: 'POST',
        body: containerParams
    });
    const containerData = await createRes.json();
    if (containerData.error) throw new Error(containerData.error.message);

    const creationId = containerData.id;

    // إذا كان فيديو، ننتظر بضع ثوانٍ لمعالجة الفيديو من قِبل سيرفرات انستجرام
    if (isVideo) {
        console.log(`[Instagram] جاري انتظار معالجة الفيديو في انستجرام... الحاوية: ${creationId}`);
        let ready = false;
        for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${token}`);
            const statusData = await statusRes.json();
            if (statusData.status_code === 'FINISHED') {
                ready = true;
                break;
            }
            if (statusData.status_code === 'ERROR') {
                throw new Error('تعذر على انستجرام معالجة صيغة الفيديو.');
            }
        }
        if (!ready) {
            throw new Error('استغرق انستجرام وقتاً أطول من المعتاد لمعالجة الفيديو.');
        }
    }

    // الخطوة 2: نشر الحاوية (Publish)
    const pubParams = new URLSearchParams({
        creation_id: creationId,
        access_token: token
    });
    const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
        method: 'POST',
        body: pubParams
    });
    const pubData = await pubRes.json();
    if (pubData.error) throw new Error(pubData.error.message);

    return { success: true, id: pubData.id };
}



// دالة التعليق الأول على منشور فيسبوك
async function postFacebookComment(targetId, message, token) {
    try {
        console.log(`[Facebook Comment] جاري إضافة التعليق الأول على: ${targetId}`);
        const res = await fetch(`https://graph.facebook.com/v21.0/${targetId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                access_token: token
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        console.log(`[Facebook Comment] تم إضافة التعليق بنجاح! ID: ${data.id}`);
        return { success: true, id: data.id };
    } catch (err) {
        console.error('Error in Facebook first comment:', err);
        return { success: false, error: err.message };
    }
}

// دالة التعليق الأول على منشور انستجرام
async function postInstagramComment(mediaId, message, token) {
    try {
        console.log(`[Instagram Comment] جاري إضافة التعليق الأول على: ${mediaId}`);
        const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                access_token: token
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        console.log(`[Instagram Comment] تم إضافة التعليق بنجاح! ID: ${data.id}`);
        return { success: true, id: data.id };
    } catch (err) {
        console.error('Error in Instagram first comment:', err);
        return { success: false, error: err.message };
    }
}



// منبه دوري محلي يفحص كل 30 ثانية إذا كان هناك بوست حان وقته (يعمل فقط في البيئة المحلية)
if (!process.env.VERCEL) {
    setInterval(async () => {
        try {
            const posts = await getScheduledPosts();
            const now = new Date();
            let updated = false;

            for (const post of posts) {
                if (post.status === 'PENDING' && new Date(post.scheduledTime) <= now) {
                    console.log(`[⏰ منبه الجدولة المحلي] حان وقت نشر البوست: ${post.id}`);
                    try {
                        await executePublish(post);
                        post.status = 'PUBLISHED';
                        post.publishedAt = now.toISOString();
                        updated = true;
                    } catch (err) {
                        console.error('Error publishing scheduled post:', err);
                    }
                }
            }

            if (updated) {
                await saveScheduledPosts(posts);
            }
        } catch (e) {
            console.error('Error in local scheduler interval:', e);
        }
    }, 30000);
}

// تشغيل الخادم محلياً أو تصديره لـ Vercel Serverless
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n==============================================`);
        console.log(`🚀 تطبيق SocialFlow يعمل بنجاح!`);
        console.log(`🌐 افتح المتصفح على الرابط التالي:`);
        console.log(`👉 http://localhost:${PORT}`);
        console.log(`==============================================\n`);
    });
}

// تصدير تطبيق Express ليعمل كـ Serverless Function على Vercel
module.exports = app;

