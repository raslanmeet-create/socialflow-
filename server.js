require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gmddkphzgjufnkaoppie.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZGRrcGh6Z2p1Zm5rYW9wcGllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5Mjg5NDY0MCwiZXhwIjoyMTA4NDcwNjQwfQ.A6zscs1ygB3_jQXGfNo0TmzLAOacQGbk73P_uMO_7SI';

let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
        supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } catch (e) {
        console.warn('Could not initialize supabaseAdmin:', e.message);
    }
}



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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// مسار حفظ المنشورات المجدولة (يدعم Vercel /tmp أو Upstash Redis سحابياً مجاناً)
const DB_FILE = process.env.VERCEL 
    ? path.join('/tmp', 'scheduled_posts.json') 
    : path.join(__dirname, 'scheduled_posts.json');

async function getScheduledPosts() {
    // 1. جلب المنشورات المجدولة سحابياً بشكل دائم من Supabase (لا يتم حذفها نهائياً عند ريستارت Vercel)
    if (supabaseAdmin) {
        try {
            const { data, error } = await supabaseAdmin
                .from('scheduled_posts')
                .select('*')
                .order('publish_time', { ascending: true });

            if (data && !error && data.length > 0) {
                return data.map(row => {
                    const fullPost = (row.post_results && typeof row.post_results === 'object') ? row.post_results : {};
                    return {
                        ...fullPost,
                        id: String(row.id),
                        userId: row.user_id || fullPost.userId,
                        content: row.content || fullPost.content || '',
                        scheduledTime: row.publish_time || fullPost.scheduledTime,
                        status: row.status || fullPost.status || 'PENDING',
                        platforms: (Array.isArray(row.platforms) && row.platforms.length > 0) ? row.platforms : (fullPost.platforms || []),
                        firstComment: row.first_comment || fullPost.firstComment || '',
                        mediaUrl: (Array.isArray(row.media_urls) && row.media_urls.length > 0) ? row.media_urls[0] : (fullPost.mediaUrl || null),
                        mediaType: row.media_types || fullPost.mediaType || 'image',
                        createdAt: row.created_at || fullPost.createdAt
                    };
                });
            }
        } catch (e) {
            console.error('Error fetching scheduled_posts from Supabase:', e.message);
        }
    }

    // 2. دعم قاعدة بيانات Upstash Redis السحابية إذا توفرت في إعدادات Vercel
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
            const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/socialflow_scheduled_posts`, {
                headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
            });
            const data = await res.json();
            if (data.result) {
                return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
            }
        } catch (e) {
            console.error('Error reading from Upstash Redis:', e);
        }
    }

    // 3. التخزين المؤقت المحلي
    if (!fs.existsSync(DB_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
        return [];
    }
}

async function saveScheduledPosts(posts) {
    // 1. حفظ سحابي دائم في Supabase لمنع فقدان أو حذف المنشورات عند تدوير سيرفرات Vercel
    if (supabaseAdmin && Array.isArray(posts)) {
        try {
            const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
            const defaultAdminId = '36a81f14-e396-4670-9cc5-3206c55f2596';
            for (const post of posts) {
                if (!post || !post.id) continue;
                const postUserId = isUuid(post.userId) ? post.userId : defaultAdminId;

                const row = {
                    id: String(post.id),
                    user_id: postUserId,
                    content: post.content || '',
                    first_comment: post.firstComment || post.comments?.[0]?.text || '',
                    media_urls: post.mediaUrl ? [post.mediaUrl] : [],
                    media_types: post.mediaType || 'image',
                    publish_time: post.scheduledTime || post.publishedAt || post.createdAt || new Date().toISOString(),
                    platforms: Array.isArray(post.platforms) ? post.platforms : [],
                    status: post.status || 'PENDING',
                    post_results: post,
                    is_story: (post.facebookPlacements || []).includes('story') || (post.instagramPlacements || []).includes('story'),
                    created_at: post.createdAt || new Date().toISOString()
                };

                await supabaseAdmin
                    .from('scheduled_posts')
                    .upsert(row, { onConflict: 'id' });
            }
        } catch (e) {
            console.error('Error saving scheduled_posts to Supabase:', e.message);
        }
    }

    // 2. حفظ في Upstash Redis إذا وُجد
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

    // 3. حفظ في الملف المحلي
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
    projectName: 'رسلان للتسويق - Raslans Marketing',
    niche: 'تسويق رقمي، إدارة صفحات سوشيال ميديا، تصميم مواقع، وإعلانات ممولة',
    services: [
        { name: 'تجهيز وتوثيق الحساب الإعلاني على Meta (Meta Business Verification)', price: 'باقات خاصة تبدأ من 500 جنيه حسب حالة الحساب وجاهزية المستندات', details: 'توثيق رسمي للحساب الإعلاني وبناء مصداقية قوية واستقرار الحملات الإعلانية وحماية الحسابات من الإغلاق؛ يتطلب توفير سجل تجاري ساري وبطاقة ضريبية مع مساعدة وإشراف خطوة بخطوة حتى اكتمال التوثيق' },
        { name: 'باقة إدارة السوشيال ميديا الشاملة', price: '2000 جنيه شهرياً (قبل الخصم 2500)', details: 'إدارة كاملة، 15 بوست احترافي، كتابة إعلانية، وتصاميم إبداعية' },
        { name: 'الحملات الإعلانية الممولة (Facebook & Instagram Ads)', price: 'حسب الميزانية والجمهور المستهدف', details: 'استهداف دقيق للمبيعات وزيادة العائد على الاستثمار' },
        { name: 'تصميم وبرمجة المواقع والمتاجر', price: 'حسب المواصفات والطلب مع خصم خاص', details: 'مواقع سريعة ومتجاوبة مع محركات البحث وتجربة مستخدم عصرية' }
    ],
    callPhone: '01020942335',
    whatsapp: 'https://wa.me/201020942335',
    phones: ['01020942335', 'https://wa.me/201020942335'],
    email: 'Raslan.dp@gmail.com',
    socialLinks: [
        { platform: 'فيسبوك', url: 'https://www.facebook.com/RaslansMarketing' },
        { platform: 'انستجرام', url: 'https://www.instagram.com/raslan_marketing' }
    ],
    customPrompt: '',
    targetAllPosts: true, // true: جميع المنشورات، false: منشورات محددة فقط
    targetPostIds: [],   // مصفوفة بمعرفات المنشورات المشمولة بالخدمة
    groqApiKey: '',
    groqModel: 'openai/gpt-oss-120b',
    likeComment: true,
    replyComment: true,
    sendDm: true,
    hideComments: false,
    lastScrapedUrl: ''
};

function readAutoReplyStore() {
    // 1. أولاً: فحص الملف في /tmp (الذي يتم تحديثه ديناميكياً عند حفظ أي إعدادات جديدة)
    if (fs.existsSync(AUTOREPLY_CONFIG_FILE)) {
        try {
            const raw = JSON.parse(fs.readFileSync(AUTOREPLY_CONFIG_FILE, 'utf8'));
            if (raw.pages || raw.global) {
                return {
                    pages: raw.pages || {},
                    global: { ...DEFAULT_AUTOREPLY_CONFIG, ...(raw.global || {}) }
                };
            }
            return { pages: {}, global: { ...DEFAULT_AUTOREPLY_CONFIG, ...raw } };
        } catch (e) {
            console.error('Error reading AUTOREPLY_CONFIG_FILE:', e);
        }
    }

    // 2. ثانياً: إذا لم يوجد في /tmp بعد (بداية تشغيل الحاوية السحابية على Vercel)، نقرأ الملف الأساسي المرفوع في المشروع
    const bundledFile = path.join(__dirname, 'auto_reply_config.json');
    if (fs.existsSync(bundledFile)) {
        try {
            const raw = JSON.parse(fs.readFileSync(bundledFile, 'utf8'));
            if (process.env.VERCEL) {
                try {
                    fs.writeFileSync(AUTOREPLY_CONFIG_FILE, JSON.stringify(raw, null, 2), 'utf8');
                } catch {}
            }
            return {
                pages: raw.pages || {},
                global: { ...DEFAULT_AUTOREPLY_CONFIG, ...(raw.global || {}) }
            };
        } catch (e) {
            console.error('Error reading bundled auto_reply_config.json:', e);
        }
    }

    return { pages: {}, global: { ...DEFAULT_AUTOREPLY_CONFIG } };
}

async function getAutoReplyConfig(pageOrIgId) {
    // 1. فحص سحابي مباشر من Supabase لمعرفة المستخدم المالك لهذه الصفحة وإعداداته ومفتاحه الخاص
    if (supabaseAdmin && pageOrIgId) {
        try {
            const { data: users } = await supabaseAdmin
                .from('user_profiles')
                .select('id, email, groq_api_key, auto_reply_config, selected_pages');
            if (users && users.length > 0) {
                for (const u of users) {
                    const ownsPage = Array.isArray(u.selected_pages) && u.selected_pages.some(p => p.id === pageOrIgId || p.instagram?.id === pageOrIgId);
                    if (ownsPage) {
                        const uConfig = u.auto_reply_config || {};
                        let matchedPageConfig = pageOrIgId ? (uConfig.pages?.[pageOrIgId] || null) : (uConfig.global || null);
                        if (matchedPageConfig) {
                            return {
                                ...DEFAULT_AUTOREPLY_CONFIG,
                                ...matchedPageConfig,
                                groqApiKey: matchedPageConfig.groqApiKey || u.groq_api_key || ''
                            };
                        }
                    }
                }
            }
        } catch (dbErr) {
            console.warn('Error fetching auto reply config from Supabase:', dbErr.message);
        }
    }

    const store = readAutoReplyStore();
    if (pageOrIgId) {
        // مطابقة مباشرة بالمعرف
        if (store.pages && store.pages[pageOrIgId]) {
            return { ...DEFAULT_AUTOREPLY_CONFIG, ...store.pages[pageOrIgId] };
        }
        // إذا كان المعرف لحساب انستجرام، البحث بالصفحة المرتبطة في الكاش
        const cached = pageTokensCache.get(pageOrIgId);
        if (cached?.pageId && store.pages && store.pages[cached.pageId]) {
            return { ...DEFAULT_AUTOREPLY_CONFIG, ...store.pages[cached.pageId] };
        }
        // البحث في الصفحات عن الصفحة المطابقة
        for (const [pId, pConf] of Object.entries(store.pages || {})) {
            if (pConf.instagramId === pageOrIgId || pConf.pageId === pageOrIgId) {
                return { ...DEFAULT_AUTOREPLY_CONFIG, ...pConf };
            }
        }
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

// مسار فحص رمز Meta وجلب الصفحات المتاحة بحساب المستخدم (SaaS BYOK) مع منع تكرار الصفحات
app.post('/api/verify-meta', async (req, res) => {
    try {
        const { metaToken, userId } = req.body;
        if (!metaToken || !metaToken.trim()) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال رمز Meta Access Token أولاً.' });
        }

        const url = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,picture{url},access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${metaToken.trim()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ success: false, message: data.error.message || 'رمز Meta غير صالح أو تنقصه الصلاحيات.' });
        }

        // 1. فلترة وتفادي أي تكرار لنفس الصفحة في استجابة Meta
        const rawPages = data.data || [];
        const seenIds = new Set();
        const uniquePagesList = [];
        for (const acc of rawPages) {
            if (!acc.id || seenIds.has(acc.id)) continue;
            seenIds.add(acc.id);
            uniquePagesList.push(acc);
        }

        // 2. فحص الملكية الحصرية عبر Supabase لمنع ربط نفس الصفحة في حسابات جيميل متعددة
        const claimedPagesMap = new Map(); // pageId -> { claimedBy: email }
        if (supabaseAdmin) {
            try {
                let query = supabaseAdmin.from('user_profiles').select('id, email, selected_pages');
                if (userId) {
                    query = query.neq('id', userId);
                }
                const { data: otherUsers } = await query;
                if (otherUsers && Array.isArray(otherUsers)) {
                    for (const u of otherUsers) {
                        const pages = u.selected_pages || [];
                        for (const p of pages) {
                            if (p && p.id) {
                                claimedPagesMap.set(p.id, { claimedBy: u.email || 'حساب آخر' });
                            }
                        }
                    }
                }
            } catch (dbErr) {
                console.warn('Error checking claimed pages from Supabase:', dbErr.message);
            }
        }

        const pages = uniquePagesList.map(acc => {
            const isClaimed = claimedPagesMap.has(acc.id);
            return {
                id: acc.id,
                name: acc.name,
                picture: acc.picture?.data?.url || null,
                access_token: acc.access_token,
                instagram: acc.instagram_business_account ? {
                    id: acc.instagram_business_account.id,
                    username: acc.instagram_business_account.username,
                    picture: acc.instagram_business_account.profile_picture_url || null
                } : null,
                alreadyClaimed: isClaimed,
                claimedBy: isClaimed ? claimedPagesMap.get(acc.id).claimedBy : null
            };
        });

        // تسجيل الصفحات غير المحجوزة في الذاكرة والاشتراك التلقائي في الويبهوك
        for (const acc of pages) {
            if (acc.alreadyClaimed) continue; // لا نشترك في صفحات محجوزة لحساب آخر
            if (acc.id && acc.access_token) {
                pageTokensCache.set(acc.id, { token: acc.access_token, name: acc.name, igUserId: acc.instagram?.id || null });
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
// 🛡️ حارس تنشيط Supabase لمنع الإيقاف بسبب الخمول (Keep-Alive Cron / Worker)
// ========================================================
async function pingSupabaseKeepAlive() {
    if (!supabaseAdmin) {
        return { success: false, message: 'supabaseAdmin غير مهيأ' };
    }
    const startTime = Date.now();
    const { data, count, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, updated_at', { count: 'exact' })
        .limit(1);

    const latency = Date.now() - startTime;
    if (error) {
        console.warn('[Keep-Alive Warning]:', error.message);
        return { success: false, error: error.message, latency: `${latency}ms` };
    }

    return {
        success: true,
        status: 'ACTIVE_AND_AWAKE',
        message: 'تم إرسال طلب تنشيط لـ Supabase بنجاح لمنع الإيقاف بسبب الخمول 🚀',
        userCount: count,
        sampleUser: data?.[0]?.email || 'none',
        latency: `${latency}ms`,
        timestamp: new Date().toISOString()
    };
}

// مسار Cron اليومي لـ Vercel وأي أداة مراقبة خارجية (Keep-Alive Endpoint)
app.get(['/api/cron/keep-alive', '/api/keep-alive'], async (req, res) => {
    try {
        const result = await pingSupabaseKeepAlive();
        console.log('[Supabase Keep-Alive Cron Fired]:', JSON.stringify(result));
        return res.json(result);
    } catch (err) {
        console.error('[Supabase Keep-Alive Cron Error]:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ========================================================
// 🤖 مسارات واجهة برمجة تطبيقات الرد التلقائي الذكي (Auto-Reply API)
// ========================================================

// 1. جلب إعدادات وقاعدة معرفة الرد التلقائي (يدعم تخصيص الصفحة والمستخدم سحابياً)
app.get('/api/autoreply/config', async (req, res) => {
    try {
        const pageId = req.query.pageId;
        const userId = req.query.userId;
        let config = null;

        // إذا تم إرسال userId و supabaseAdmin متاح، نجلب مباشرة من سحابة Supabase
        if (userId && supabaseAdmin) {
            try {
                const { data: userRow } = await supabaseAdmin
                    .from('user_profiles')
                    .select('auto_reply_config, groq_api_key')
                    .eq('id', userId)
                    .maybeSingle();

                const uConfig = userRow?.auto_reply_config || {};
                if (pageId) {
                    config = uConfig.pages?.[pageId] || null;
                } else {
                    config = uConfig.global || null;
                }
                if (config && userRow?.groq_api_key && !config.groqApiKey) {
                    config.groqApiKey = userRow.groq_api_key;
                }
            } catch (dbErr) {
                console.warn('Error fetching config from Supabase in GET:', dbErr.message);
            }
        }

        if (!config && !pageId) {
            config = await getAutoReplyConfig();
        }

        res.json({ success: true, config });
    } catch (err) {
        console.error('Error in GET /api/autoreply/config:', err);
        res.status(500).json({ success: false, message: 'تعذر جلب الإعدادات' });
    }
});

// 2. حفظ إعدادات وقاعدة معرفة الرد التلقائي (تخصيص الصفحة المحددة وحفظ سحابي دائم)
app.post('/api/autoreply/config', async (req, res) => {
    try {
        const pageId = req.body.pageId || req.query.pageId;
        const userId = req.body.userId;
        const currentConfig = await getAutoReplyConfig(pageId);
        const updatedConfig = { ...currentConfig, ...req.body };
        await saveAutoReplyConfig(updatedConfig, pageId);

        // حفظ مباشر سحابي عبر SupabaseAdmin لضمان استقرار وديمومة البيانات 100%
        if (userId && supabaseAdmin) {
            try {
                const { data: userRow } = await supabaseAdmin
                    .from('user_profiles')
                    .select('auto_reply_config, groq_api_key')
                    .eq('id', userId)
                    .maybeSingle();

                let userAutoReply = userRow?.auto_reply_config || {};
                if (typeof userAutoReply !== 'object') userAutoReply = {};

                if (pageId) {
                    if (!userAutoReply.pages) userAutoReply.pages = {};
                    userAutoReply.pages[pageId] = updatedConfig;
                } else {
                    userAutoReply.global = updatedConfig;
                }

                // عزل تام: لا يتم تعديل أو دمج بيانات الصفحة المحددة في global حتى لا ترث الصفحات الأخرى بياناتها نهائياً

                const updatePayload = {
                    auto_reply_config: userAutoReply,
                    updated_at: new Date().toISOString()
                };
                if (updatedConfig.groqApiKey) {
                    updatePayload.groq_api_key = updatedConfig.groqApiKey;
                }

                await supabaseAdmin
                    .from('user_profiles')
                    .update(updatePayload)
                    .eq('id', userId);
                console.log(`[Supabase Admin] تم حفظ وتأكيد قاعدة المعرفة سحابياً بنجاح للمستخدم: ${userId}`);
            } catch (dbErr) {
                console.warn('[Supabase Admin] Error saving auto_reply_config:', dbErr.message);
            }
        }

        res.json({ success: true, config: updatedConfig, message: 'تم حفظ وتثبيت قاعدة المعرفة والإعدادات بنجاح للمشروع!' });
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
        let pageToken = token || cached.token;
        if (!pageToken) {
            pageToken = await resolvePageToken(targetPageId);
        }

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

// مسار فحص والتحقق من صحة مفتاح Groq API Key الخاص بكل عميل
app.post('/api/autoreply/verify-groq-key', async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey || !apiKey.trim()) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال مفتاح Groq API Key أولاً.' });
        }

        const verifyRes = await fetch('https://api.groq.com/openai/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`
            }
        });
        const verifyData = await verifyRes.json();
        if (verifyData.error) {
            return res.status(400).json({ success: false, message: verifyData.error.message || 'المفتاح غير صالح أو منتهي الصلاحية.' });
        }

        res.json({
            success: true,
            message: 'مفتاح Groq API Key صالح وفعال بنجاح! جاهز للاستخدام.',
            modelCount: Array.isArray(verifyData.data) ? verifyData.data.length : 0
        });
    } catch (err) {
        console.error('Error verifying Groq key:', err);
        res.status(500).json({ success: false, message: err.message || 'تعذر الاتصال بخوادم Groq.' });
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
2. المرجعية الأولى والأساسية للرد (Primary Reference): كابشن المنشور (Post Caption)!
   - كابشن المنشور هو المحور الأول للرد وسياق الحديث؛ تفهم منه الخدمة أو الموضوع الذي يدور حوله البوست بدقة.
   - الربط الذكي بالخدمات: ربط الخدمة المعنية في كابشن البوست بتفاصيلها ومميزاتها المطابقة المستخرجة من تحليل الموقع وقاعدة المعرفة، وممنوع خلط خدمات غير ذات صلة.
3. التفاعل مع اسم العميل: تحية العميل باسمه الشخصي دائماً في بداية الرد العام والرسالة الخاصة.
4. الرد العام على التعليق في البوست (publicReply) - مختصر جداً، حيوي وبدون أي تفاصيل أو أسعار:
   - جملة واحدة خفيفة وحيوية وودودة، ممنوع منعاً باتاً ذكر أي تفاصيل أو أسعار أو أرقام في الكومنت العام.
   - ردود حيوية ومتنوعة (ممنوع القوالب المعلبة الثابتة) ترحب بالعميل وتؤكد له بود أنه تم إرسال كل التفاصيل والشرح على الخاص في الـ DM 📩.
5. الرسالة الخاصة في الـ DM (privateMessage) - التنسيق والشرح الوافي:
   - هنا المكان المخصص للشرح الكامل والتفاصيل والأسعار والمميزات المنسقة، بناءً على كابشن البوست والخدمة المرتبطة به.
   - مقسمة لفقرات وأسطر مستقلة تفصل بينها فواصل أسطر ونقاط منظمة (🔹)، وبيانات التواصل والواتساب في أسطر مستقلة، وسؤال ختامي ودود.
قواعد حاسمة وممنوعات قطعية:
- ممنوع منعاً باتاً وضع أي نصوص نائبة أو أقواس مربعة مثل [أدخل رابط الحجز] أو [ضع الرابط] أو [السعر] أو [أي نص بين أقواس].
- إذا لم يتوفر رابط حجز مخصص، اطلب من العميل التواصل عبر الواتساب أو رسائل الصفحة لتحديد الميعاد والاتفاق فوراً دون وضع أي نصوص نائبة إطلاقاً.

اكتب نص البرومبت النهائي مباشرة باللغة العربية ليكون جاهزاً للاستخدام فوراً كنص برومبت أساسي.`;

        const apiKey = groqApiKey;
        if (!apiKey || !apiKey.trim()) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال مفتاح Groq API Key الخاص بك في إعدادات المشروع لتوليد البرومبت.'
            });
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

        // تحليل فائق العمق والجودة تحت سقف 8,000 توكن كحد أقصى للطلب بالكامل
        const MAX_INPUT_CHARS = 13500; // ~4,500 توكن مدخلات كحد أقصى
        if (cleanText.length > MAX_INPUT_CHARS) cleanText = cleanText.substring(0, MAX_INPUT_CHARS);

        // إرفاق بيانات الفوتر والروابط المكتشفة نصياً للنموذج
        let footerContext = '\n\n[بيانات وروابط مكتشفة من الفوتر وكود الصفحة]:\n';
        if (discoveredTels.length) footerContext += `- أرقام الاتصال والواتساب: ${discoveredTels.join('، ')}\n`;
        if (discoveredEmails.length) footerContext += `- البريد الإلكتروني: ${discoveredEmails.join('، ')}\n`;
        if (discoveredSocials.length) footerContext += `- روابط السوشيال ميديا: ${discoveredSocials.map(s => `${s.platform}: ${s.url}`).join(' | ')}\n`;
        cleanText += footerContext;

        const apiKey = groqApiKey;
        if (!apiKey || !apiKey.trim()) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال مفتاح Groq API Key الخاص بك في إعدادات المشروع لتحليل موقع الويب.'
            });
        }

        let promptForPage = '';
        if (pageType === 'home') {
            promptForPage = `أنت في وضع "التحليل التجاري الاستقصائي فائق العمق" (Ultra-Deep Business & Brand Analysis Mode).
حلل نص الصفحة الرئيسية والفوتر تحليلاً دقيقاً وشاملاً، واستخرج بصيغة JSON حصراً:
- projectName: الاسم التجاري الرسمي للشركة أو المشروع
- slogan: الشعار التسويقي أو الجملة الترويجية الرئيسية للنشاط
- niche: التخصص الدقيق ومجال النشاط بالتفصيل
- overview: نبذة تعريفية عميقة وشاملة عن رسالة المشروع وتاريخه والقيمة المضافة التي يقدمها
- targetAudience: الشريحة والعملاء المستهدفين بدقة
- keyHighlights: مصفوفة بأبرز 3 إلى 5 ميزات تنافسية رئيسية تميز هذا النشاط
- phones: مصفوفة أرقام الهواتف أو الواتساب المتاحة
- email: البريد الإلكتروني المذكور
- socialLinks: مصفوفة كائنات { platform, url } لروابط المنصات المذكورة`;
        } else if (pageType === 'services') {
            promptForPage = `أنت في وضع "التحليل الاستقصائي فائق العمق للخدمات والمنتجات" (Ultra-Deep Services & Packages Analysis Mode).
حلل نص صفحة الخدمات والفوتر بأعلى درجات التفصيل والاستقصاء، واستخرج كل خدمة أو منتج أو باقة مذكورة بدقة بصيغة JSON:
- services: مصفوفة كائنات شاملة تضم كافة الخدمات أو المنتجات المستخرجة بدون استثناء. لكل خدمة استخرج:
  * name: اسم الخدمة أو الباقة بدقة
  * price: السعر المذكور أو نسبة الخصم أو خطة التقسيط المتاحة (أو "حسب الطلب والمواصفات")
  * details: شرح وافٍ وشامل لمميزات الخدمة وكيفية الاستفادة منها وما الذي يحصل عليه العميل بالضبط
- phones: مصفوفة أرقام الهواتف المذكورة
- email: البريد الإلكتروني إن وجد`;
        } else if (pageType === 'about') {
            promptForPage = `أنت في وضع "التحليل الاستقصائي فائق العمق لهوية وخبرات الشركة" (Ultra-Deep Company Persona & Credibility Mode).
حلل نص صفحة من نحن والفوتر بعمق استقصائي شامل، واستخرج بصيغة JSON:
- companyStory: قصة التأسيس، سنوات الخبرة، الرؤية، والاعتمادات أو التراخيص والشهادات الرسمية
- strengths: مصفوفة بأبرز نقاط القوة والميزات التنافسية للشركة
- branches: عناوين الفروع أو المقرات إن ذكرت
- phones: مصفوفة أرقام الهواتف المذكورة
- email: البريد الإلكتروني إن وجد`;
        } else if (pageType === 'contact') {
            promptForPage = `أنت في وضع "التحليل الاستقصائي فائق العمق لقنوات التواصل والتفاعل" (Ultra-Deep Omnichannel Contact Mode).
حلل نص صفحة التواصل والفوتر تحليلاً استقصائياً كاملاً لكافة قنوات الاتصال، واستخرج بدقة بصيغة JSON:
- callPhone: رقم الهاتف الأساسي للاتصال الهاتفي المباشر
- whatsapp: رقم أو رابط محادثة الواتساب المباشرة
- phones: مصفوفة شاملة لكافة أرقام الهواتف المتاحة (محمول، أرضي، خط ساخن)
- email: البريد الإلكتروني المذكور للتواصل أو الدعم أو المبيعات
- socialLinks: مصفوفة كائنات { platform, url } لكافة منصات السوشيال ميديا المتاحة
- address: عناوين المقرات والفروع وساعات ومواعيد العمل الرسمية`;
        }

        let groqData = null;
        const candidateModels = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'qwen/qwen3.8-27b'];

        for (const candidateModel of candidateModels) {
            try {
                const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey.trim()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: candidateModel,
                        messages: [
                            { role: 'system', content: `أنت خبير استخراج بيانات أعمال استقصائي رفيع المستوى لضمان أعلى درجات الجودة والشمول. استخرج البيانات المطلوبة بأقصى دقة وتفصيل وبصيغة JSON حصراً باللغة العربية.\n${promptForPage}` },
                            { role: 'user', content: `إليك نص الصفحة ومحتوى الفوتر المكتشف كاملاً:\n\n${cleanText}` }
                        ],
                        response_format: { type: 'json_object' },
                        temperature: 0.2,
                        max_tokens: 2200
                    })
                });

                const resJson = await groqRes.json();
                if (resJson.choices?.[0]?.message?.content) {
                    groqData = resJson;
                    break;
                } else if (resJson.error) {
                    console.warn(`[Groq Model ${candidateModel} scrape failed]:`, resJson.error.message);
                }
            } catch (errM) {
                console.warn(`[Groq Model ${candidateModel} scrape exception]:`, errM.message);
            }
        }

        if (!groqData) {
            throw new Error('تعذر معالجة فحص الصفحة عبر نماذج Groq.');
        }

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

        const actions = ['like', 'reply'];
        if (replyResult.sendDm && replyResult.privateMessage) {
            actions.push('dm');
        }

        res.json({
            success: true,
            intent: replyResult.intent,
            publicReply: replyResult.publicReply,
            privateMessage: replyResult.privateMessage || (replyResult.intent === 'compliment' ? '✨ (تم تصنيف التعليق كإطراء/تشجيع: تم توليد الرد العام المناسب بلطف، وتخطي الرسالة الخاصة لعدم إزعاج العميل)' : ''),
            sendDm: replyResult.sendDm,
            actions: actions,
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
    const apiKey = config?.groqApiKey;
    if (!apiKey || !apiKey.trim()) {
        console.warn('[Auto-Reply] No Groq API Key configured for this page/user. Skipping reply.');
        throw new Error('لم يتم تعيين مفتاح Groq API Key لهذه الصفحة. يرجى إدخال مفتاحك الخاص في إعدادات الرد التلقائي.');
    }
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

    function formatWhatsAppLink(input) {
        if (!input || typeof input !== 'string') return '';
        let clean = input.trim();
        if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
        if (clean.includes('wa.me/')) return 'https://' + clean.replace(/^https?:\/\//, '');
        let digits = clean.replace(/[^0-9]/g, '');
        if (!digits) return clean;
        if (digits.startsWith('01') && digits.length === 11) {
            digits = '20' + digits.substring(1);
        }
        return `https://wa.me/${digits}`;
    }

    let contactsFormatted = 'عبر رسائل الصفحة أو الواتساب';
    const contactLines = [];

    // 1. رابط محادثة الواتساب التلقائي الذكي (يحول الرقم لرابط wa.me فوري)
    const rawWhatsapp = config?.whatsapp || config?.whatsappPhone || '';
    if (rawWhatsapp) {
        const waLink = formatWhatsAppLink(rawWhatsapp);
        contactLines.push(`📲 رابط محادثة واتساب مباشر (يفتح الشات بنقرة واحدة): ${waLink}`);
    }

    // 2. رقم هاتف الاتصال والمكالمات الصوتية المباشرة
    const rawCall = config?.callPhone || config?.phone || '';
    if (rawCall) {
        contactLines.push(`📞 هاتف للاتصال والمكالمات: ${rawCall.trim()}`);
    }

    // 3. أي أرقام هواتف إضافية إن وجدت
    const phonesList = Array.isArray(config?.phones) ? config.phones.filter(Boolean) : [];
    phonesList.forEach(p => {
        const pStr = String(p).trim();
        if (!pStr) return;
        if (pStr === rawCall || pStr === rawWhatsapp || pStr === formatWhatsAppLink(rawWhatsapp)) return;
        if (pStr.includes('wa.me') || pStr.toLowerCase().includes('whatsapp')) {
            contactLines.push(`📲 واتساب إضافي: ${formatWhatsAppLink(pStr)}`);
        } else {
            contactLines.push(`📞 هاتف إضافي: ${pStr}`);
        }
    });

    if (config?.email && typeof config.email === 'string' && config.email.trim()) {
        contactLines.push(`📧 البريد الإلكتروني: ${config.email.trim()}`);
    }

    if (contactLines.length > 0) {
        contactsFormatted = contactLines.join('\n');
    } else if (typeof config?.contactInfo === 'string' && config.contactInfo.trim()) {
        contactsFormatted = config.contactInfo.trim();
    }

    // تنظيف اسم العميل واستخراجه لمناداته به في التحية
    const rawName = (senderName && typeof senderName === 'string' && senderName.trim()) ? senderName.trim() : '';
    let customerName = rawName.replace(/[@_.]/g, ' ').trim();
    if (!customerName || customerName === 'عميل' || customerName === 'عميلنا العزيز') {
        customerName = 'يا فندم';
    }

    const systemPrompt = `أنت موظف خدمة عملاء وسوشيال ميديا مصري ذكي ومحترف وودود للغاية، تتحدث بلهجة مصرية عامية طبيعية إنسانية دافئة، تعمل لدى شركة (${projectName}).
مجال وتخصص النشاط: ${niche}

قاعدة المعرفة وتفاصيل الخدمات والمنتجات المستخرجة من تحليل الموقع:
${servicesFormatted}

بيانات التواصل المعتمدة:
${contactsFormatted}

${config?.customPrompt && typeof config.customPrompt === 'string' && config.customPrompt.trim() ? `توجيهات إضافية خاصة بالمشروع:\n${config.customPrompt.trim()}\n` : ''}

المرجعية والقواعد الذهبية الإلزامية للردود:
1. المرجعية الأولى والأساسية للرد (Primary Context): كابشن المنشور (Post Caption)!
   - كابشن المنشور هو المحور الأول لتحديد الخدمة أو الموضوع الذي يدور حوله الحديث وسياق العميل.
   - الربط الذكي الدائم بين كابشن البوست وتفاصيل الموقع: إذا كان العميل يستفسر، اربط استفساره بالخدمة المعروضة في كابشن المنشور وتفاصيلها المعتمدة أعلاه بدقة.

2. تصنيف نية التعليق بدقة فائقة (Comment Intent Detection):
   عليك قراءة تعليق العميل وفهم نيته وتصنيفه لأحد نوعين:

   النوع الأول: إطراء / تشجيع / دعاء / شكر / تحية / إيموجي فقط (intent = "compliment"):
   - أمثلة: (بالتوفيق، ربنا يوفقكم، الله ينور، عاش، تسلم إيدكم، تسلم، ما شاء الله، روعة، جميل، شكراً، منورين، صباح الخير، إيموجيات فقط...).
   - هنا العميل لم يسأل عن تفاصيل أو أسعار ولم يطلب شيئاً!
   - publicReply: رد قصير جداً ومختصر بلهجة مصرية دافئة ولطيفة يناسب كلمته مع إيموجي محبب (قلب أو ابتسامة أو وردة).
     * ممنوع منعاً باتاً أن تقول له "بعتنالك التفاصيل على الخاص" أو تنبهه للـ DM!
     * أمثلة:
       - إذا قال "بالتوفيق": "حبيبي تسلم، ربنا يوفقك ويكرمك يا رب ❤️😊" أو "شكراً لحضرتك جداً نورتنا 🤍"
       - إذا قال "الله ينور": "وعليك يا غالي تسلم، كلك ذوق والله 🌸" أو "حبيبي الله ينور عليك، نورتنا ✨"
       - إذا قال "ما شاء الله" أو "جميل" أو "روعة": "تسلم يا فندم ويسعدنا دائماً كلامك الطيب وذوقك الراقي ❤️"
       - إذا شكر أو سلّم: "العفو يا فندم نورتنا دايماً 🌸" أو "أهلاً بحضرتك يا فندم نورتنا ✨"
   - sendDm: false (ممنوع إرسال رسالة خاصة في الـ DM حتى لا نزعجه بإعلانات دون أن يطلب).
   - privateMessage: اتركها فارغة تماماً "".

   النوع الثاني: استفسار / طلب تفاصيل / سؤال عن سعر أو حجز (intent = "inquiry"):
   - أمثلة: (تفاصيل، بكام، عايز، السعر، فين، خدمة، طريقة الحجز، أو إطراء متبوع بسؤال مثل "عاش ما شاء الله بكام؟").
   - publicReply: جملة واحدة خفيفة ومختصرة وحيوية بدون أي تفاصيل أو أسعار، ترحب بالعميل وتخبره أنه تم إرسال التفاصيل في رسالة خاصة على الـ DM 📩.
     * مثال: "أهلاً يا أستاذ ${customerName}! نورتنا 🌸 كل تفاصيل الخدمة بعتناهالك في رسالة خاصة على الـ DM 📩 شيك عليها وهكون معاك!"
   - sendDm: true.
   - privateMessage: الرسالة الشاملة المرتبة بالخاص، وتلزم قاعدة المسافات والأسطر الفارغة بدقة:
     * قاعدة المسافات الصارمة: اترك سطراً فارغاً بالكامل (\\n\\n) بين كل سطر وسطر، بحيث يظهر كل سطر وكل نقطة بشكل منفصل ومريح تماماً للعين.
     * هيكل الرسالة بالخاص:
       أهلاً بحضرتك يا أستاذ ${customerName}! نورتنا 🌸

       بخصوص استفسارك عن الخدمة...

       🔹 المميزات: ...

       🔹 الأسعار والباقات: ...

       📲 للتواصل المباشر والطلب عبر واتساب:
       ${formatWhatsAppLink(rawWhatsapp) || 'عبر رسائل الصفحة'}

       📞 هاتف الاتصال المباشر:
       ${rawCall || 'عبر رسائل الصفحة'}

       سؤال ختامي لطيف يشجعه على اتخاذ الخطوة التالية.

   النوع الثالث: تعليق سلبي / سب / اتهام بالنصب / شكوى مسيئة أو تشهير (intent = "negative"):
   - أمثلة: (نصابين، خدمة سيئة جداً، أسوأ تعامل، حرامية، كذابين، ألفاظ نابية، احذروا منهم، نصب، قلة أدب...).
   - publicReply: ""
   - sendDm: false
   - privateMessage: ""

3. منع الأقواس والنصوص النائبة نهائياً:
   - ممنوع كتابة [أدخل الرابط] أو [السعر] أو أي نص بين أقواس مربعة.

يجب الرد بصيغة JSON حصراً بالشكل التالي:
{
  "intent": "compliment",
  "publicReply": "شكراً لحضرتك جداً نورتنا ❤️😊",
  "sendDm": false,
  "privateMessage": ""
}
أو في حالة الاستفسار:
{
  "intent": "inquiry",
  "publicReply": "أهلاً بحضرتك يا فندم! نورتنا 🌸 كل تفاصيل الخدمة بعتناهالك في رسالة خاصة على الـ DM 📩",
  "sendDm": true,
  "privateMessage": "نص الرسالة الخاصة مع ترك سطر فارغ بين كل سطر"
}
أو في حالة التعليق السلبي:
{
  "intent": "negative",
  "publicReply": "",
  "sendDm": false,
  "privateMessage": ""
}`;

    const userMessage = `كابشن المنشور: "${postCaption || 'بدون كابشن'}"\nاسم العميل: "${customerName}"\nتعليق العميل: "${commentText}"`;

    let data = null;
    const candidateModels = [model, 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
    for (const candidateModel of candidateModels) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: candidateModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.3,
                    max_tokens: 1200
                })
            });

            const resJson = await response.json();
            if (resJson.choices?.[0]?.message?.content) {
                data = resJson;
                break;
            } else if (resJson.error) {
                console.warn(`[Groq Model ${candidateModel} failed]:`, resJson.error.message);
            }
        } catch (mErr) {
            console.warn(`[Groq Model ${candidateModel} exception]:`, mErr.message);
        }
    }

    if (!data) {
        throw new Error('فشل في الاتصال بنماذج Groq الذكية');
    }

    const content = data.choices?.[0]?.message?.content || '{}';
    let parsed = {};
    try {
        parsed = JSON.parse(content);
    } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
    }

    // تنظيف صارم لأي نصوص نائبة مع فرض قاعدة المسافات والأسطر الفارغة \n\n بين كل الأسطر
    const cleanPlaceholders = (text, isPrivate = false) => {
        if (!text || typeof text !== 'string') return '';
        let cleaned = text
            .replace(/\[(?:أدخل|ضع|اضف)?\s*رابط[^\]]*\]/gi, 'عبر رسائل الصفحة أو الواتساب مباشرة')
            .replace(/\[(?:أدخل|ضع)?\s*السعر[^\]]*\]/gi, 'حسب تفاصيل العرض')
            .replace(/\[[^\]]+\]/g, '') // إزالة أي أقواس مربعة متبقية
            .replace(/[^\S\r\n]{2,}/g, ' ') // دمج المسافات الأفقية المتتالية فقط
            .trim();

        if (isPrivate) {
            // التنسيق الأنيق المتباعد: ترك سطر فارغ \n\n بين كل سطر وسطر حتى لا يتداخل الكلام
            const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            cleaned = lines.join('\n\n');
        } else {
            // الرد العام في سطر واحد مختصر بدون كسر أسطر
            cleaned = cleaned.replace(/\r?\n+/g, ' ').trim();
        }
        return cleaned.trim();
    };

    // فحص التعليق السلبي أو المسيء (Negative Sentiment)
    if (parsed.intent === 'negative' || isNegativeComment(commentText)) {
        return {
            intent: 'negative',
            publicReply: '',
            privateMessage: '',
            sendDm: false,
            tokensUsed: data?.usage?.total_tokens || 0
        };
    }

    // فحص ذكي حاسم لطبيعة التعليق (إطراء/تشجيع vs استفسار)
    const normalizedComment = commentText.trim().toLowerCase();
    const isPureCompliment = /^(بالتوفيق|الله ينور|عاش|تسلم|تسلموا|ما شاء الله|ماشاء الله|روعة|جميل|شكرا|شكرًا|منور|منورين|مبروك|تحياتي|صباح الخير|مساء الخير|جمعة مباركة|❤️|🌸|✨|👏|🔥|👍)+/i.test(normalizedComment)
        && !/(بكام|سعر|أسعار|اسعار|تكلفة|تفاصيل|عايز|اريد|احجز|حجز|شحن|طريقة|فين|ازاي|إزاي|\?|؟)/i.test(normalizedComment);

    const isCompliment = isPureCompliment || parsed.intent === 'compliment' || parsed.intent === 'complaint' || parsed.sendDm === false || (!parsed.privateMessage && !/(بكام|سعر|تكلفة|تفاصيل|عايز|ازاي|إزاي|\?|؟)/i.test(normalizedComment));

    let publicReply = '';
    if (isCompliment) {
        if (parsed.publicReply && !parsed.publicReply.includes('الخاص') && !parsed.publicReply.includes('DM') && !parsed.publicReply.includes('رسالة')) {
            publicReply = cleanPlaceholders(parsed.publicReply, false);
        } else if (normalizedComment.includes('ينور')) {
            publicReply = 'وعليك يا غالي تسلم، كلك ذوق والله 🌸';
        } else if (normalizedComment.includes('توفيق')) {
            publicReply = 'حبيبي تسلم، ربنا يوفقك ويكرمك يا رب ❤️😊';
        } else if (normalizedComment.includes('تسلم') || normalizedComment.includes('عاش')) {
            publicReply = 'تسلم يا غالي ويسعدنا دائماً كلامك الطيب وذوقك الراقي ❤️';
        } else {
            publicReply = 'شكراً لحضرتك جداً نورتنا وكلك ذوق ❤️😊';
        }
    } else {
        publicReply = cleanPlaceholders(parsed.publicReply || `أهلاً يا أستاذ ${customerName}! نورتنا 🌸 كل تفاصيل الخدمة بعتناهالك في رسالة خاصة على الـ DM 📩 شيك عليها وهكون معاك!`, false);
    }

    let privateMessage = '';
    let shouldSendDm = false;

    if (!isCompliment && (parsed.sendDm !== false || parsed.privateMessage)) {
        const rawDm = parsed.privateMessage || `أهلاً بحضرتك يا فندم! نورتنا في ${projectName}.\nبخصوص استفسارك، يسعدنا خدمتك وتوفير كل التفاصيل لحضرتك بأعلى جودة.\n📞 هاتف الاتصال: ${config.callPhone || 'عبر رسائل الصفحة'}\n📲 محادثة واتساب: ${formatWhatsAppLink(config.whatsapp) || 'عبر رسائل الصفحة'}\nتشرفنا بحضرتك دائماً!`;
        privateMessage = cleanPlaceholders(rawDm, true);
        shouldSendDm = !!privateMessage;
    }

    return {
        intent: isCompliment ? 'compliment' : 'inquiry',
        publicReply,
        privateMessage,
        sendDm: shouldSendDm,
        tokensUsed: data.usage?.total_tokens || 0
    };
}

// ========================================================
// ⚡ دوال التفاعل التلقائي الثلاثة مع Meta (Like -> Reply -> DM)
// ========================================================

// 1. الإعجاب بالتعليق أولاً (Auto-Like Comment)
async function executeLikeComment(commentId, token, platform, igUserId) {
    if (platform === 'instagram') {
        // تنبيه تقني: Meta تشترط مراجعة تطبيق متقدمة (App Review: instagram_manage_engagement) لوضع لايك للتعليقات على انستجرام، لذا يتم تخطيها لعدم حظر الرد أو إعطاء أخطاء
        console.log(`[Meta Like Skipped] (${platform}): تتطلب مراجعة تطبيق متقدمة (App Review: instagram_manage_engagement)، يتم تخطي اللايك والتركيز على الرد العام والـ DM.`);
        return { success: false, skipped: true, reason: 'Requires instagram_manage_engagement app review' };
    }

    try {
        const url = `https://graph.facebook.com/v21.0/${commentId}/likes?access_token=${token}`;
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
async function executePrivateDm(commentId, text, token, platform, pageId) {
    try {
        // كلاً من فيسبوك وانستجرام يرسلان الرسائل الخاصة عبر مسار رسائل الصفحة المرتبطة (me/messages أو pageId/messages)
        const targetEndpoint = pageId || 'me';
        const url = `https://graph.facebook.com/v21.0/${targetEndpoint}/messages`;

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
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
        return { success: true, id: data.message_id || data.recipient_id };
    } catch (err) {
        console.error(`[Meta Private DM Error] (${platform}):`, err.message);
        return { success: false, error: err.message };
    }
}

// 4. إخفاء التعليق (Hide Comment) - ميزة اختيارية تتفعل من لوحة التحكم لحماية العملاء والمنافسة
async function executeHideComment(commentId, token, platform) {
    try {
        let url;
        let body;
        if (platform === 'facebook') {
            url = `https://graph.facebook.com/v21.0/${commentId}`;
            body = { is_hidden: true, access_token: token };
        } else {
            url = `https://graph.facebook.com/v21.0/${commentId}`;
            body = { hide: true, access_token: token };
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return { success: true };
    } catch (err) {
        console.error(`[Meta Hide Comment Error] (${platform}):`, err.message);
        return { success: false, error: err.message };
    }
}

// 5. حذف التعليق نهائياً (Delete Comment) - ميزة ثابتة ودائمة لحذف التعليقات السلبية والمسيئة فورياً
async function executeDeleteComment(commentId, token, platform) {
    try {
        const url = `https://graph.facebook.com/v21.0/${commentId}?access_token=${token}`;
        const res = await fetch(url, { method: 'DELETE' });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return { success: true };
    } catch (err) {
        console.error(`[Meta Delete Comment Error] (${platform}):`, err.message);
        return { success: false, error: err.message };
    }
}

// دالة فحص الكلمات السلبية والمسيئة بالعربية
function isNegativeComment(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase().trim();
    const negativeKeywords = [
        'نصابين', 'نصاب', 'نصب', 'احتيال', 'حرامية', 'حرامي', 'سرقة', 'سارقين',
        'كذابين', 'كدابين', 'كذاب', 'كداب', 'فاشلين', 'فاشل', 'فاشلة', 'فشل',
        'زفت', 'سيء', 'سيئة', 'أسوأ', 'وحش', 'وحشة', 'مقرف', 'قرف',
        'اشتغالة', 'مقلب', 'ضحكوا عليا', 'بيضحكوا', 'بلاغ', 'حظر', 'بلوك',
        'قلة أدب', 'غشاشين', 'غش', 'نصابين كبار', 'أوعوا تصدقوهم', 'حسبي الله',
        'خرا', 'لعنة', 'يلعن', 'تفو', 'شحاتين', 'أوساخ', 'حقيرين', 'قذرين'
    ];
    return negativeKeywords.some(keyword => lower.includes(keyword));
}

// دالة حساب موعد التكرار القادم للمنشور المجدول
function calculateNextScheduledTime(baseTime, interval, repeatEvery = 1) {
    const d = new Date(baseTime);
    if (isNaN(d.getTime())) return new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const count = parseInt(repeatEvery, 10) || 1;

    if (interval === 'daily') {
        d.setUTCDate(d.getUTCDate() + count);
    } else if (interval === 'weekly') {
        d.setUTCDate(d.getUTCDate() + (7 * count));
    } else if (interval === 'monthly') {
        d.setUTCMonth(d.getUTCMonth() + count);
    } else if (interval === 'custom_days') {
        d.setUTCDate(d.getUTCDate() + count);
    } else {
        d.setUTCDate(d.getUTCDate() + 1);
    }
    return d.toISOString();
}

// دالة حل واستخراج Page Access Token تلقائياً من خوادم Meta عند الحاجة لضمان صلاحية الرد
async function resolvePageToken(pageOrIgId) {
    if (!pageOrIgId) return null;
    const cached = pageTokensCache.get(pageOrIgId);
    if (cached && cached.token) return cached.token;

    const userToken = META_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
    if (!userToken) return null;

    try {
        // 1. محاولة مباشرة لجلب توكن الصفحة
        const pageRes = await fetch(`https://graph.facebook.com/v21.0/${pageOrIgId}?fields=access_token,name&access_token=${userToken.trim()}`);
        const pageData = await pageRes.json();
        if (pageData.access_token) {
            pageTokensCache.set(pageOrIgId, { token: pageData.access_token, name: pageData.name });
            return pageData.access_token;
        }

        // 2. إذا كان المعرف لحساب انستجرام، البحث في صفحات المستخدم
        const accRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken.trim()}`);
        const accData = await accRes.json();
        for (const acc of accData.data || []) {
            if (acc.id) {
                pageTokensCache.set(acc.id, { token: acc.access_token, name: acc.name });
            }
            if (acc.instagram_business_account?.id) {
                pageTokensCache.set(acc.instagram_business_account.id, { token: acc.access_token, name: acc.name, pageId: acc.id });
                if (acc.instagram_business_account.id === pageOrIgId) {
                    return acc.access_token;
                }
            }
            if (acc.id === pageOrIgId) {
                return acc.access_token;
            }
        }
    } catch (err) {
        console.error('Error in resolvePageToken:', err.message);
    }

    return null;
}

// المعالج الشامل لدورة الرد التلقائي عند استلام تعليق
async function handleIncomingComment({ platform, pageOrIgId, commentId, commentText, postId, senderId, senderName }) {
    // 1. جلب إعدادات وقاعدة معرفة العميل للصفحة المحددة
    const config = await getAutoReplyConfig(pageOrIgId);
    if (!config.enabled) {
        console.log('[Auto-Reply] نظام الرد التلقائي معطل حالياً.');
        return;
    }

    // 2. الحصول على توكن الصفحة (حل ديناميكي لضمان صلاحية الرد كصفحة وليس كمستخدم)
    let token = config.pageToken;
    if (!token) {
        const cachedPre = pageTokensCache.get(pageOrIgId);
        token = cachedPre?.token;
    }
    if (!token) {
        token = await resolvePageToken(pageOrIgId);
    }
    const cached = pageTokensCache.get(pageOrIgId) || {};
    token = cached.token || token;
    const igUserId = cached.igUserId || (platform === 'instagram' ? pageOrIgId : null);
    const pageIdForDm = cached.pageId || (platform === 'facebook' ? pageOrIgId : null);

    if (!token) {
        console.warn(`[Auto-Reply] لا يوجد Access Token متاح للصفحة: ${pageOrIgId}`);
        return;
    }

    // 3. استخراج كابشن المنشور لفهم سياق استفسار العميل بدقة
    let postCaption = postCaptionsCache.get(postId) || '';
    if (!postCaption && postId && token) {
        try {
            // Meta Graph API v3.3+ ترفض حقل 'caption' لمنشورات فيسبوك وتعطي خطأ 12
            // فيسبوك: fields=message | انستجرام: fields=caption
            const graphField = platform === 'instagram' ? 'caption' : 'message';
            const postRes = await fetch(`https://graph.facebook.com/v21.0/${postId}?fields=${graphField}&access_token=${token.trim()}`);
            const postData = await postRes.json();
            if (postData.error) {
                console.warn(`[Auto-Reply Graph API] تعذر جلب كابشن البوست (${platform}):`, postData.error.message);
                // محاولة بديلة إذا كان المعرف مختلفاً
                if (platform !== 'instagram') {
                    const fallbackRes = await fetch(`https://graph.facebook.com/v21.0/${postId}?fields=message&access_token=${token.trim()}`);
                    const fallbackData = await fallbackRes.json();
                    postCaption = fallbackData.message || '';
                }
            } else {
                postCaption = postData.message || postData.caption || '';
            }

            // فحص إضافي في المنشورات المحلية المجدولة إن لم يُعثر عليه
            if (!postCaption) {
                try {
                    const localPosts = await getScheduledPosts();
                    const matchedPost = localPosts.find(p => p.id === postId || p.publishedPostId === postId);
                    if (matchedPost?.content) postCaption = matchedPost.content;
                } catch {}
            }

            if (postCaption) {
                postCaptionsCache.set(postId, postCaption);
                console.log(`[Auto-Reply] تم جلب كابشن المنشور بنجاح: "${postCaption.substring(0, 60)}..."`);
            }
        } catch (e) {
            console.error('Could not fetch post caption from Graph API:', e);
        }
    }

    // 2. فحص فوري وحذف التعليقات السلبية والمسيئة تلقائياً (ميزة ثابتة دائمة)
    if (isNegativeComment(commentText)) {
        console.log(`🚨 [Auto-Reply] تم اكتشاف تعليق سلبي/مسيء فورياً: "${commentText}"`);
        const delRes = await executeDeleteComment(commentId, token, platform);
        const actionsTaken = ['delete'];
        if (delRes.success) {
            console.log(`🗑️ [Auto-Reply] تم حذف التعليق السلبي فورياً بنجاح لحماية سمعة الصفحة!`);
        }
        await addAutoReplyLog({
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            platform,
            senderName,
            senderId,
            commentText,
            postCaption: postCaption ? (postCaption.length > 80 ? postCaption.substring(0, 80) + '...' : postCaption) : 'بدون كابشن',
            publicReply: '[تم حذف التعليق السلبي تلقائياً لحماية الصفحة 🛡️]',
            privateMessage: '',
            actions: actionsTaken,
            timestamp: new Date().toISOString()
        });
        return;
    }

    // 4. توليد الردود بذكاء اصطناعي Groq مع آلية احتياطية ذكية تضمن عدم توقف الردود نهائياً
    let replyData;
    try {
        replyData = await generateAutoReplyWithGroq({
            postCaption,
            commentText,
            config,
            senderName
        });
    } catch (aiErr) {
        console.error('[Auto-Reply AI Warning]:', aiErr.message);
        const displayName = senderName && !senderName.includes('عميل') ? `يا ${senderName}` : 'يا فندم';
        const isComplimentFallback = commentText && (
            commentText.includes('توفيق') || commentText.includes('ينور') || 
            commentText.includes('عاش') || commentText.includes('تسلم') || 
            commentText.includes('جميل') || commentText.includes('روعة') ||
            commentText.includes('شكرا') || commentText.includes('ما شاء الله')
        ) && !commentText.includes('بكام') && !commentText.includes('تفاصيل') && !commentText.includes('سعر');

        if (isComplimentFallback) {
            replyData = {
                intent: 'compliment',
                publicReply: `شكراً جداً لحضرتك ${displayName}! نورتنا وكلك ذوق ❤️😊`,
                privateMessage: '',
                sendDm: false,
                tokensUsed: 0
            };
        } else {
            replyData = {
                intent: 'inquiry',
                publicReply: `أهلاً بحضرتك ${displayName}! نورتنا، تم إرسال كافة التفاصيل لحضرتك في رسالة خاصة على الـ DM 📩`,
                privateMessage: `أهلاً بحضرتك ${displayName}! نورتنا جداً في ${config.projectName || 'صفحتنا'}.\n\nبخصوص استفسارك، يسعدنا خدمتك وتوفير كل التفاصيل لحضرتك بأعلى جودة.\n\n📞 هاتف الاتصال: ${config.callPhone || 'عبر رسائل الصفحة'}\n\n📲 محادثة واتساب: ${config.whatsapp || 'عبر رسائل الصفحة'}\n\nتشرفنا بحضرتك ويسعدنا تواصلك معنا دائماً!`,
                sendDm: true,
                tokensUsed: 0
            };
        }
    }

    // إذا صنف الذكاء الاصطناعي التعليق كتعليق سلبي، يتم حذفه فورياً
    if (replyData.intent === 'negative') {
        console.log(`🚨 [Auto-Reply] الذكاء الاصطناعي صنّف التعليق كتعليق سلبي: "${commentText}"`);
        const delRes = await executeDeleteComment(commentId, token, platform);
        const actionsTaken = ['delete'];
        if (delRes.success) {
            console.log(`🗑️ [Auto-Reply] تم حذف التعليق السلبي بواسطة الذكاء الاصطناعي بنجاح!`);
        }
        await addAutoReplyLog({
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            platform,
            senderName,
            senderId,
            commentText,
            postCaption: postCaption ? (postCaption.length > 80 ? postCaption.substring(0, 80) + '...' : postCaption) : 'بدون كابشن',
            publicReply: '[تم حذف التعليق السلبي تلقائياً بواسطة الذكاء الاصطناعي 🛡️]',
            privateMessage: '',
            actions: actionsTaken,
            timestamp: new Date().toISOString()
        });
        return;
    }

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

    // الخطوة 3: إرسال الرسالة الخاصة في الـ DM (Private Message) فقط في حالة وجود استفسار
    if (config.sendDm && replyData.sendDm && replyData.privateMessage) {
        const dmRes = await executePrivateDm(commentId, replyData.privateMessage, token, platform, pageIdForDm);
        if (dmRes.success) {
            actionsTaken.push('dm');
            console.log(`[Auto-Reply] 📩 تم إرسال الرسالة الخاصة في الـ DM بنجاح!`);
        }
    }

    // الخطوة 4 الاختيارية: إخفاء التعليق بعد الرد لحماية المنافسة ومنع سرقة العملاء (من لوحة التحكم)
    if (config.hideComments) {
        const hideRes = await executeHideComment(commentId, token, platform);
        if (hideRes.success) {
            actionsTaken.push('hide');
            console.log(`🔒 [Auto-Reply] تم إخفاء التعليق بنجاح بناءً على إعدادات لوحة التحكم: ${commentId}`);
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

// ========================================================
// 📢 نظام إشعارات التيليجرام الذكي ومستكشف الجروبات (Telegram & AI Group Hunter)
// ========================================================

// 1. اختبار اتصال بوت التيليجرام
app.post('/api/telegram/test', async (req, res) => {
    try {
        const { botToken, chatId } = req.body;
        if (!botToken || !chatId) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال توكن البوت ومعرف المحادثة (Chat ID).' });
        }

        const testMsg = `🎉 <b>تم ربط بوت التيليجرام بنجاح!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🚀 <b>الوكيل الذكي لشركة رسلان للتسويق</b>\n` +
            `✅ نظام الإشعارات السحابية وأزرار النشر في الجروبات نشط وجاهز الآن.\n` +
            `📱 ستصلك إشعارات فورية مع أزرار المشاركة الذكية فور نشر أو جدولة أي منشور فيسبوك وانستجرام!`;

        const testKeyboard = [
            [
                { text: '🌐 زيارة لوحة التحكم (agent.raslans.net)', url: 'https://agent.raslans.net' }
            ],
            [
                { text: '📘 صفحة رسلان للتسويق', url: 'https://www.facebook.com/RaslansMarketing' }
            ]
        ];

        const teleRes = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId.trim(),
                text: testMsg,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: testKeyboard }
            })
        });

        const teleData = await teleRes.json();
        if (!teleData.ok) {
            return res.status(400).json({ success: false, message: `فشل التحقق من تيليجرام: ${teleData.description || 'تأكد من صحة التوكن وChat ID'}` });
        }

        res.json({ success: true, message: 'تم إرسال الرسالة التجريبية بنجاح إلى التيليجرام! تفقد هاتفك الآن 🚀' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'حدث خطأ أثناء اختبار التيليجرام.' });
    }
});

// ترحيل إشعارات بوت فيسبوك المباشرة إلى تيليجرام لتجاوز حجب مزودي الخدمة المحليين في مصر
app.post('/api/telegram/relay', async (req, res) => {
    try {
        const { text, parse_mode = 'HTML', chat_id, bot_token } = req.body;
        const targetChatId = (chat_id || '').trim() || '1077637435';
        const botToken = (bot_token || '').trim() || '8946209406:AAFBRxNoA-bqkymvDddkOik2I6QUjMvRaa8';

        const teleRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: targetChatId, text, parse_mode })
        });
        const teleData = await teleRes.json();
        return res.json({ success: teleData.ok, data: teleData });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// جلب رسائل وتحديثات التيليجرام للرد التفاعلي
app.get('/api/telegram/updates', async (req, res) => {
    try {
        const offset = req.query.offset || 0;
        const botToken = '8946209406:AAFBRxNoA-bqkymvDddkOik2I6QUjMvRaa8';
        const teleRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=0`);
        const teleData = await teleRes.json();
        return res.json(teleData);
    } catch (e) {
        return res.status(500).json({ ok: false, error: e.message });
    }
});



// 1.5 تجربة إشعار تدوير الجروبات الخمسة والعنوان اليومي الذكي
app.post('/api/telegram/test-rotation', async (req, res) => {
    try {
        const { userId, post: customPost, results: customResults } = req.body;
        const mockPost = customPost || {
            id: '1036372629556993_122107818044889779',
            pageId: '1036372629556993',
            postUrl: 'https://www.facebook.com/RaslansMarketing/posts/pfbid02Sb3NGJTu4iaivwASRLQ2ry866ydDUeLebu4tzRQiZ9b4neAxQcGu9X7dP16aLcJAl',
            content: 'عايز نشاطك التجاري يظهر بشكل أقوى على خرائط جوجل؟ السر مش بس إنك تعمل Google Business Profile… السر إنك تعمله صح.\n\nفي رسلان للتسويق بنساعدك تجهز ملف نشاطك التجاري على جوجل بشكل احترافي علشان تزود فرص الظهور على Google Maps، وتكسب ثقة العملاء.',
            mediaUrl: 'https://scontent-hbe1-2.xx.fbcdn.net/v/t39.30808-6/662656561_122102597150889779_3903172382890224914_n.jpg?stp=dst-jpg_s720x720_tt6&_nc_cat=101&ccb=1-7&_nc_sid=127cfc&_nc_ohc=hy3vUZHUO30Q7kNvwHJs7o_&_nc_oc=AdpIuOlAhhO9uezzgUEE9HgMs0d9LYBrIiEGHBYNSMiElbANIEnl8R-KZTfi5x1PVus&_nc_zt=23&_nc_ht=scontent-hbe1-2.xx&edm=APyxFHYEAAAA&_nc_gid=M-Rs_7zEQ_l4pmTMiFdSfQ&_nc_tpa=Q5bMBQLhl4xx92ypGj0rt6esZReK2Lw40xY6ph54Zkc9FtrOXrLr-Fr6oSYzEskgqlzVDFczIn93CwFE&oh=00_AQOfjENmvlwPS0oVKJcgTWPSJdZ4SoVLCfnzr4DpU5YxGw&oe=6AE52A81',
            mediaType: 'image/jpeg'
        };
        const mockResults = customResults || {
            facebook: { 
                success: true, 
                id: '1036372629556993_122107818044889779', 
                post_id: '122107818044889779',
                permalink_url: 'https://www.facebook.com/RaslansMarketing/posts/pfbid02Sb3NGJTu4iaivwASRLQ2ry866ydDUeLebu4tzRQiZ9b4neAxQcGu9X7dP16aLcJAl',
                firstComment: { success: true }
            },
            instagram: { success: true }
        };

        const notifResult = await sendTelegramGroupNotification(mockPost, mockResults, userId);
        if (notifResult && !notifResult.success) {
            return res.status(400).json({ success: false, message: notifResult.error || 'تعذر إرسال إشعار التجربة للتليجرام.' });
        }
        res.json({ success: true, message: 'تم إرسال إشعار التجربة مع الـ 5 جروبات والعنوان الذكي إلى هاتفك بنجاح! تفقد تيليجرام الآن 🚀' });
    } catch (err) {
        console.error('Error in /api/telegram/test-rotation:', err);
        res.status(500).json({ success: false, message: err.message || 'تعذر إرسال إشعار التجربة.' });
    }
});

// 2. جلب إعدادات التيليجرام لكل مستخدم بشكل معزول ومحمي 100%
app.get('/api/telegram/config', async (req, res) => {
    try {
        const userId = req.query.userId;
        let telegramConfig = { enabled: false, botToken: '', chatId: '' };

        if (userId && supabaseAdmin) {
            try {
                const { data: userRow } = await supabaseAdmin
                    .from('user_profiles')
                    .select('email, auto_reply_config')
                    .eq('id', userId)
                    .maybeSingle();

                if (userRow?.auto_reply_config?.telegram) {
                    telegramConfig = { ...userRow.auto_reply_config.telegram };
                }
            } catch (e) {}
        }

        res.json({ success: true, telegram: telegramConfig });
    } catch (err) {
        res.status(500).json({ success: false, message: 'تعذر جلب إعدادات التيليجرام.' });
    }
});

// 2.5 مزامنة إعدادات العميل التلقائية إلى جهازه عبر البريد الإلكتروني (Cloud Sync)
app.get('/api/client/sync-config', async (req, res) => {
    try {
        const email = (req.query.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال البريد الإلكتروني المسجل في الموقع.' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ success: false, message: 'قاعدة البيانات غير متصلة حالياً.' });
        }

        const { data: userRow, error } = await supabaseAdmin
            .from('user_profiles')
            .select('id, email, full_name, selected_pages, auto_reply_config, groq_api_key')
            .ilike('email', email)
            .maybeSingle();

        if (error || !userRow) {
            return res.status(404).json({ 
                success: false, 
                message: `لم يتم العثور على حساب مسجل بهذا الإيميل: ${email}. يرجى تسجيل الدخول في الموقع (agent.raslans.net) أولاً.` 
            });
        }

        // فحص حالة اشتراك العميل قبل مزامنة وتشغيل البوت
        const userStatus = userRow.status || userRow.auto_reply_config?.account_status || 'pending';
        const userSub = userRow.auto_reply_config?.subscription;
        if (userRow.email !== 'raslan.meet@gmail.com') {
            if (userStatus === 'pending') {
                return res.status(403).json({ 
                    success: false, 
                    message: '⚠️ حسابك ما زال قيد المراجعة بانتظار تفعيل الاشتراك من قِبل إدارة المنصة.' 
                });
            }
            if (userStatus === 'suspended') {
                return res.status(403).json({ 
                    success: false, 
                    message: '⚠️ تم إيقاف حسابك مؤقتاً من قِبل إدارة المنصة. تواصل مع الدعم للمتابعة.' 
                });
            }
            if (userSub?.expires_at && new Date(userSub.expires_at) <= new Date()) {
                return res.status(403).json({ 
                    success: false, 
                    message: '⚠️ انتهت فترة اشتراكك في المنصة. يرجى تجديد الاشتراك لتشغيل البوت.' 
                });
            }
        }

        const teleCfg = userRow.auto_reply_config?.telegram || {};
        const selectedPage = Array.isArray(userRow.selected_pages) && userRow.selected_pages.length > 0 
            ? userRow.selected_pages[0] 
            : null;

        const clientConfig = {
            client_id: userRow.id,
            client_name: userRow.full_name || userRow.email,
            page_name: selectedPage?.name || 'Raslans Marketing - رسلان للتسويق',
            page_id: selectedPage?.id || null,
            telegram_bot_token: teleCfg.botToken || '',
            telegram_chat_id: teleCfg.chatId || '',
            groq_api_key: userRow.groq_api_key || (userRow.email === 'raslan.meet@gmail.com' ? (process.env.GROQ_API_KEY || '') : ''),
            synced_at: new Date().toISOString()
        };

        return res.json({
            success: true,
            message: `تم العثور على حسابك بنجاح (${userRow.full_name || userRow.email})!`,
            config: clientConfig
        });
    } catch (err) {
        console.error('Error in /api/client/sync-config:', err);
        return res.status(500).json({ success: false, message: err.message || 'حدث خطأ أثناء مزامنة الإعدادات.' });
    }
});

// =========================================================================
// 🌐 منصة الـ SaaS: واجهات ربط برنامج الكمبيوتر بالخادم (Desktop Agent APIs)
// =========================================================================

// خريطة في الذاكرة لتتبع الأجهزة المتصلة وحالتها اللحظية
const activeAgentsMap = new Map();

// دالة مساعدة للتحقق من هوية المشترك عبر مفتاح الربط الخاص ببرنامجه (Agent Key)
async function findUserByAgentKey(agentKey) {
    if (!agentKey || typeof agentKey !== 'string') return null;
    const cleanKey = agentKey.trim();
    if (!cleanKey) return null;

    if (supabaseAdmin) {
        try {
            // 1. البحث بمفتاح الربط المخزن في إعدادات المستخدم
            const { data: userByConfig, error: errConfig } = await supabaseAdmin
                .from('user_profiles')
                .select('*')
                .filter('auto_reply_config->>agent_key', 'eq', cleanKey)
                .maybeSingle();

            if (userByConfig && !errConfig) return userByConfig;

            // 2. البحث المباشر إذا كان المفتاح هو معرف UUID للمستخدم
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey);
            if (isUuid) {
                const { data: userById } = await supabaseAdmin
                    .from('user_profiles')
                    .select('*')
                    .eq('id', cleanKey)
                    .maybeSingle();
                if (userById) return userById;
            }
        } catch (e) {
            console.error('Error finding user by agent key in Supabase:', e.message);
        }
    }

    // دعم الحساب المحلي الرئيسي أثناء التطوير
    if (cleanKey === 'local_dev_key' || cleanKey === 'admin') {
        return {
            id: 'admin_local',
            email: 'raslan.meet@gmail.com',
            full_name: 'رسلان للتسويق',
            role: 'admin',
            status: 'active'
        };
    }

    return null;
}

// 1. توليد أو جلب مفتاح الربط (Agent Connection Key) للمشترك
app.post('/api/agent/get-or-create-key', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'معرف المستخدم (userId) مطلوب.' });
        }

        if (!supabaseAdmin) {
            return res.json({ success: true, agentKey: `sf_dev_${userId.substring(0, 12)}` });
        }

        const { data: userRow, error } = await supabaseAdmin
            .from('user_profiles')
            .select('id, email, status, auto_reply_config')
            .eq('id', userId)
            .maybeSingle();

        if (error || !userRow) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
        }

        let cfg = userRow.auto_reply_config || {};
        if (typeof cfg !== 'object') cfg = {};

        let agentKey = cfg.agent_key;
        if (!agentKey) {
            const randomHex = crypto.randomBytes(16).toString('hex');
            agentKey = `sf_live_${randomHex}`;
            cfg.agent_key = agentKey;

            await supabaseAdmin
                .from('user_profiles')
                .update({ auto_reply_config: cfg, updated_at: new Date().toISOString() })
                .eq('id', userId);
        }

        return res.json({ success: true, agentKey });
    } catch (err) {
        console.error('Error in /api/agent/get-or-create-key:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 2. التحقق من صلاحية مفتاح الربط وجلب إعدادات العميل (Verify & Handshake)
app.get('/api/agent/verify', async (req, res) => {
    try {
        const key = (req.query.key || req.headers['x-agent-key'] || '').trim();
        if (!key) {
            return res.status(401).json({ success: false, message: 'مفتاح الربط (Agent Key) غير متوفر.' });
        }

        const userRow = await findUserByAgentKey(key);
        if (!userRow) {
            return res.status(401).json({ success: false, message: 'مفتاح الربط غير صالح أو منتهي.' });
        }

        const userStatus = userRow.status || userRow.auto_reply_config?.account_status || 'pending';
        const userSub = userRow.auto_reply_config?.subscription;
        const now = new Date();
        const isExpired = userSub?.expires_at && new Date(userSub.expires_at) <= now;

        if (userRow.email !== 'raslan.meet@gmail.com') {
            if (userStatus === 'pending') {
                return res.status(403).json({ success: false, message: 'حسابك بانتظار تفعيل الاشتراك من قِبل إدارة المنصة.' });
            }
            if (userStatus === 'suspended') {
                return res.status(403).json({ success: false, message: 'تم إيقاف حسابك مؤقتاً من قِبل إدارة المنصة.' });
            }
            if (isExpired) {
                return res.status(403).json({ success: false, message: 'انتهت صلاحية اشتراكك في المنصة، يرجى التجديد.' });
            }
        }

        // تسجيل نبضة النشاط
        activeAgentsMap.set(userRow.id, {
            lastSeen: Date.now(),
            clientVersion: req.query.version || '1.0.0',
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });

        const selectedPage = Array.isArray(userRow.selected_pages) && userRow.selected_pages.length > 0 
            ? userRow.selected_pages[0] 
            : null;
        const teleCfg = userRow.auto_reply_config?.telegram || {};

        return res.json({
            success: true,
            user: {
                id: userRow.id,
                email: userRow.email,
                name: userRow.full_name || userRow.email,
                pageName: selectedPage?.name || 'Raslans Marketing - رسلان للتسويق',
                pageId: selectedPage?.id || null,
                telegramBotToken: teleCfg.botToken || '',
                telegramChatId: teleCfg.chatId || '',
                groqApiKey: userRow.groq_api_key || (userRow.email === 'raslan.meet@gmail.com' ? (process.env.GROQ_API_KEY || '') : ''),
                subscriptionStatus: userStatus,
                expiresAt: userSub?.expires_at || null
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 3. استعلام البوت عن المهام المجدولة المستحقة لحساب هذا العميل (Pending Tasks)
app.get('/api/agent/pending-tasks', async (req, res) => {
    try {
        const key = (req.query.key || req.headers['x-agent-key'] || '').trim();
        const userRow = await findUserByAgentKey(key);
        if (!userRow) {
            return res.status(401).json({ success: false, message: 'مفتاح الربط غير صالح.' });
        }

        const posts = await getScheduledPosts();
        const now = Date.now();
        const MAX_POST_AGE_MS = 6 * 60 * 60 * 1000; // معالجة المنشورات الحديثة (آخر 6 ساعات)

        const targetPosts = [];
        for (const p of posts) {
            const isOwner = p.userId === userRow.id || (userRow.email === 'raslan.meet@gmail.com' && (!p.userId || p.userId === userRow.id));
            if (!isOwner) continue;
            if (p.status !== 'PUBLISHED') continue;

            const postTime = new Date(p.publishedAt || p.createdAt || 0).getTime();
            if (now - postTime > MAX_POST_AGE_MS) continue;

            const needsBooster = !p.booster_auto_done;
            const needsGroups = !p.groups_auto_shared;

            if (needsBooster || needsGroups) {
                targetPosts.push({
                    id: p.id,
                    postUrl: p.postUrl || (p.publishResults?.facebook?.post_id ? `https://www.facebook.com/posts/${String(p.publishResults.facebook.post_id).replace(/.*_/, '')}` : null),
                    content: p.content || '',
                    publishedAt: p.publishedAt,
                    needsBooster,
                    needsGroups
                });
            }
        }

        return res.json({ success: true, count: targetPosts.length, tasks: targetPosts });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 4. استلام تقرير إنجاز المهمة وتحديث حالة المنشور في قاعدة البيانات
app.post('/api/agent/report-task', async (req, res) => {
    try {
        const { key, postId, taskType, success, count, logs, error } = req.body;
        const userRow = await findUserByAgentKey(key);
        if (!userRow) {
            return res.status(401).json({ success: false, message: 'مفتاح الربط غير صالح.' });
        }

        if (!postId || !taskType) {
            return res.status(400).json({ success: false, message: 'postId و taskType مطلوبان.' });
        }

        const posts = await getScheduledPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'المنشور غير موجود.' });
        }

        const isOwner = post.userId === userRow.id || (userRow.email === 'raslan.meet@gmail.com' && (!post.userId || post.userId === userRow.id));
        if (!isOwner) {
            return res.status(403).json({ success: false, message: 'غير مصرح بتعديل هذا المنشور.' });
        }

        const nowIso = new Date().toISOString();
        if (taskType === 'booster') {
            post.booster_auto_done = true;
            post.booster_done_at = nowIso;
            post.booster_success = Boolean(success);
            if (logs) post.booster_logs = logs;
        } else if (taskType === 'groups') {
            post.groups_auto_shared = true;
            post.groups_shared_at = nowIso;
            post.groups_shared_count = count || 0;
            if (error) post.groups_error = error;
        }

        await saveScheduledPosts(posts);

        if (supabaseAdmin) {
            try {
                const { data: dbRow } = await supabaseAdmin.from('scheduled_posts').select('post_results').eq('id', postId).maybeSingle();
                if (dbRow) {
                    const updated = {
                        ...(dbRow.post_results || {}),
                        groups_auto_shared: post.groups_auto_shared,
                        groups_shared_at: post.groups_shared_at,
                        groups_shared_count: post.groups_shared_count,
                        booster_auto_done: post.booster_auto_done,
                        booster_done_at: post.booster_done_at
                    };
                    await supabaseAdmin.from('scheduled_posts').update({ post_results: updated }).eq('id', postId);
                }
            } catch (e) {
                console.warn('Sync report to Supabase warning:', e.message);
            }
        }

        return res.json({ success: true, message: 'تم حفظ تقرير المهمة بنجاح.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 5. استقبال نبضة النشاط اللحظية (Heartbeat) من جهاز العميل
app.post('/api/agent/heartbeat', async (req, res) => {
    try {
        const { key, clientVersion, accountsCount, groupsCount, status, currentTask } = req.body;
        const userRow = await findUserByAgentKey(key);
        if (!userRow) {
            return res.status(401).json({ success: false, message: 'مفتاح الربط غير صالح.' });
        }

        activeAgentsMap.set(userRow.id, {
            lastSeen: Date.now(),
            clientVersion: clientVersion || '1.0.0',
            accountsCount: accountsCount || 0,
            groupsCount: groupsCount || 0,
            status: status || 'IDLE',
            currentTask: currentTask || null,
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });

        return res.json({ success: true, timestamp: Date.now() });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 6. استعلام لوحة تحكم الموقع عن حالة اتصال جهاز العميل (Online / Offline Status)
app.get('/api/agent/status-summary', async (req, res) => {
    try {
        const userId = (req.query.userId || '').trim();
        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId مطلوب.' });
        }

        const agentInfo = activeAgentsMap.get(userId);
        const isOnline = agentInfo && (Date.now() - agentInfo.lastSeen < 75000);

        return res.json({
            success: true,
            online: Boolean(isOnline),
            lastSeen: agentInfo?.lastSeen ? new Date(agentInfo.lastSeen).toISOString() : null,
            accountsCount: agentInfo?.accountsCount || 0,
            groupsCount: agentInfo?.groupsCount || 0,
            status: isOnline ? (agentInfo?.status || 'IDLE') : 'OFFLINE',
            currentTask: isOnline ? agentInfo?.currentTask : null
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 7. توليد وتحميل حزمة البوت المخصصة للعميل (One-Click Dynamic Client Package ZIP)
app.get('/api/agent/download-client-pack', async (req, res) => {
    try {
        const key = (req.query.key || '').trim();
        const userId = (req.query.userId || '').trim();

        let userRow = null;
        if (key) {
            userRow = await findUserByAgentKey(key);
        } else if (userId && supabaseAdmin) {
            const { data } = await supabaseAdmin.from('user_profiles').select('*').eq('id', userId).maybeSingle();
            userRow = data;
        }

        if (!userRow) {
            return res.status(401).send('مفتاح الربط أو معرف المستخدم غير صالح.');
        }

        const agentKey = userRow.auto_reply_config?.agent_key || key || `sf_live_${userRow.id.substring(0, 16)}`;
        let archiverModule;
        try {
            archiverModule = require('archiver');
        } catch (e) {
            const dynamicImport = new Function('specifier', 'return import(specifier)');
            const mod = await dynamicImport('archiver');
            archiverModule = mod.default || mod;
        }

        let archive;
        if (typeof archiverModule === 'function') {
            archive = archiverModule('zip', { zlib: { level: 9 } });
        } else if (archiverModule && archiverModule.ZipArchive) {
            archive = new archiverModule.ZipArchive({ zlib: { level: 9 } });
        } else if (archiverModule && archiverModule.default && typeof archiverModule.default === 'function') {
            archive = archiverModule.default('zip', { zlib: { level: 9 } });
        } else {
            throw new Error('تعذر تهيئة مكتبة ضغط الملفات.');
        }

        const zipFilename = `SocialFlow-Bot-${(userRow.full_name || 'Client').replace(/[^\w\u0621-\u064A]/g, '_')}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`);

        archive.on('error', err => {
            console.error('Archive error:', err);
            if (!res.headersSent) res.status(500).end();
        });

        archive.pipe(res);

        // 1. ملف الإعدادات المخصص للعميل
        const clientCfg = {
            server_url: process.env.BASE_URL || 'https://agent.raslans.net',
            agent_key: agentKey,
            client_name: userRow.full_name || userRow.email,
            page_name: (userRow.selected_pages && userRow.selected_pages[0]?.name) || 'صفحتك على فيسبوك',
            groups_sharing_enabled: true
        };
        archive.append(JSON.stringify(clientCfg, null, 2), { name: 'client_config.json' });

        // 2. ملفات المحرك الأساسية
        const filesToCopy = [
            'agent_runner.js',
            'booster_service.js',
            'fb_auto_worker.js',
            'manage_fb_accounts.js',
            'clean_groups.json',
            'booster_comments.txt'
        ];

        for (const f of filesToCopy) {
            const p = path.join(__dirname, f);
            if (fs.existsSync(p)) {
                archive.file(p, { name: f });
            }
        }

        // 3. package.json مبسط للعميل
        const clientPackageJson = {
            name: "socialflow-desktop-agent",
            version: "1.2.0",
            description: "SocialFlow Desktop Automation Agent",
            main: "agent_runner.js",
            dependencies: {
                "puppeteer-core": "^25.16.0",
                "dotenv": "^16.4.5"
            }
        };
        archive.append(JSON.stringify(clientPackageJson, null, 2), { name: 'package.json' });

        // 4. سكربتات التشغيل باللغة العربية بنقرة واحدة
        const batAccountManager = `@echo off
title SocialFlow - ادارة حسابات التفاعل
color 0b
cd /d "%~dp0"
echo ========================================================
echo   SocialFlow - مدير حسابات التفاعل لفيسبوك
echo ========================================================
if not exist node_modules (
    echo جاري فحص وتثبيت المتطلبات لاول مرة، يرجى الانتظار...
    call npm install --omit=dev
)
node manage_fb_accounts.js
pause
`;
        archive.append(batAccountManager, { name: '1-إدارة_حسابات_التفاعل.bat' });

        const batRunner = `@echo off
title SocialFlow Bot Agent
color 0a
cd /d "%~dp0"
echo ========================================================
echo   SocialFlow Desktop Agent - البوت نشط وفي وضع المراقبة
echo ========================================================
if not exist node_modules (
    echo جاري فحص وتثبيت المتطلبات لاول مرة، يرجى الانتظار...
    call npm install --omit=dev
)
node agent_runner.js
pause
`;
        archive.append(batRunner, { name: '2-تشغيل_البوت_التلقائي.bat' });

        const vbsSilent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c ""%~dp02-تشغيل_البوت_التلقائي.bat""", 0, False
`;
        archive.append(vbsSilent, { name: '3-تشغيل_صامت_بالخلفية.vbs' });

        // 5. سكربت تفعيل التشغيل التلقائي مع فتح الويندوز
        const batEnableStartup = `@echo off
title SocialFlow - تفعيل التشغيل التلقائي مع الويندوز
color 0a
cd /d "%~dp0"
echo ========================================================
echo   🚀 تفعيل تشغيل البوت تلقائياً مع فتح الويندوز
echo ========================================================
echo.
echo جاري إضافة اختصار تشغيل البوت في مجلد بدء تشغيل الويندوز (Startup)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $target = Join-Path '%~dp0' '3-تشغيل_صامت_بالخلفية.vbs'; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Startup') + '\\SocialFlowAgent.lnk'); $s.TargetPath = $target; $s.WorkingDirectory = '%~dp0'; $s.Description = 'SocialFlow Desktop Agent'; $s.Save()"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] تم تفعيل التشغيل التلقائي بنجاح!
    echo من الان، كلما فتحت جهاز الكمبيوتر سيبدأ البوت العمل في الخلفية بصمت تام.
    echo وسيرسل لك اشعاراً على التيليجرام بان جهازك متصل ومستعد للمنشورات.
) else (
    echo [ERROR] حدث خطأ اثناء تفعيل التشغيل التلقائي.
)
echo.
pause
`;
        archive.append(batEnableStartup, { name: '4-تفعيل_التشغيل_التلقائي_مع_الويندوز.bat' });

        // 6. سكربت إلغاء التشغيل التلقائي
        const batDisableStartup = `@echo off
title SocialFlow - الغاء التشغيل التلقائي
color 0c
cd /d "%~dp0"
echo ========================================================
echo   الغاء تشغيل البوت تلقائياً مع فتح الويندوز
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$link = [Environment]::GetFolderPath('Startup') + '\\SocialFlowAgent.lnk'; if (Test-Path $link) { Remove-Item $link -Force; Write-Host '[OK] تم حذف الاختصار والغاء التشغيل التلقائي بنجاح.' } else { Write-Host '[INFO] لم يتم العثور على اختصار مسبق.' }"
echo.
pause
`;
        archive.append(batDisableStartup, { name: '5-إلغاء_التشغيل_التلقائي.bat' });

        const instructions = `========================================================
   دليل تشغيل بوت النشر والتفاعل الآلي (SocialFlow Agent)
========================================================

أهلاً بك! لقد تم تجهيز هذه الحزمة برمز الربط الخاص باشتراكك تلقائياً.

خطوات البدء السريع:
----------------------------------------
1. فك ضغط هذا الملف على جهاز الكمبيوتر الخاص بك.
2. اضغط مرتين على: "1-إدارة_حسابات_التفاعل.bat"
   - سيفتح لك متصفح Chrome لتسجيل دخول حسابات فيسبوك الخاصة بك بأمان تام.
3. اضغط مرتين على: "2-تشغيل_البوت_التلقائي.bat"
   - سيتصل البوت تلقائياً بحسابك على موقع SocialFlow.
   - بمجرد نشر أو جدولة أي منشور في الموقع، سيتولى البوت تعزيزه ونشره في الجروبات من جهازك في موعده!

* للتشغيل الصامت بدون ظهور أي شاشة:
  يمكنك تشغيل "3-تشغيل_صامت_بالخلفية.vbs".

* للتشغيل التلقائي بدون أن تتذكر فتح البوت:
  اضغط مرتين على "4-تفعيل_التشغيل_التلقائي_مع_الويندوز.bat"، وسيبدأ البوت العمل تلقائياً بصمت فور فتح جهاز الكمبيوتر ويرسل لك إشعاراً على التيليجرام!
`;
        archive.append(instructions, { name: 'تعليمات_البدء_السريع.txt' });

        await archive.finalize();
    } catch (err) {
        console.error('Error generating client pack:', err);
        if (!res.headersSent) res.status(500).send('تعذر إنشاء حزمة البوت: ' + err.message);
    }
});

// 3. حفظ إعدادات التيليجرام
app.post('/api/telegram/config', async (req, res) => {
    try {
        let { userId, botToken, chatId, enabled } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'يجب تسجيل الدخول لحفظ إعدادات التيليجرام.' });
        }

        const newTelegramConfig = {
            botToken: (botToken || '').trim(),
            chatId: (chatId || '').trim(),
            enabled: enabled !== false
        };

        if (supabaseAdmin) {
            try {
                const { data: userRow } = await supabaseAdmin
                    .from('user_profiles')
                    .select('auto_reply_config')
                    .eq('id', userId)
                    .maybeSingle();

                let uConfig = userRow?.auto_reply_config || {};
                if (typeof uConfig !== 'object') uConfig = {};
                uConfig.telegram = newTelegramConfig;

                await supabaseAdmin
                    .from('user_profiles')
                    .update({ auto_reply_config: uConfig, updated_at: new Date().toISOString() })
                    .eq('id', userId);
            } catch (e) {
                console.warn('Error saving telegram config to Supabase:', e.message);
            }
        }

        res.json({ success: true, message: 'تم حفظ إعدادات التيليجرام بنجاح!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'تعذر حفظ إعدادات التيليجرام.' });
    }
});

// ========================================================
// 🚀 مسارات معزز تفاعل فيسبوك بالحسابات المتعددة (Post Booster)
let rawBoosterService = null;
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
        const boosterMod = './booster_service';
        rawBoosterService = require(boosterMod);
    } catch (e) {
        console.warn('Booster service could not be loaded locally:', e.message);
    }
}

const boosterService = rawBoosterService || {
    getBoosterStatus: () => ({ accounts: [], activeCount: 0, isServerless: true, message: 'معزز التفاعل يعمل عبر تطبيق الديسكتوب الخاص بك (SocialFlow Desktop Agent).' }),
    addAccountWizard: async () => ({ success: false, message: 'إدارة حسابات التفاعل تتم عبر تطبيق الديسكتوب المحمول.' }),
    toggleAccount: () => ({ success: false, message: 'إدارة حسابات التفاعل تتم عبر تطبيق الديسكتوب المحمول.' }),
    deleteAccount: () => ({ success: false, message: 'إدارة حسابات التفاعل تتم عبر تطبيق الديسكتوب المحمول.' }),
    openAccountBrowser: async () => ({ success: false, message: 'فتح المتصفح يتم محلياً على جهاز الديسكتوب فقط.' }),
    loadAccounts: () => [],
    saveAccounts: () => false,
    checkAccountSession: async () => ({ status: 'UNKNOWN', message: 'الفحص يتم محلياً عبر جهاز الديسكتوب.' }),
    checkAllAccountsHealth: async () => ({ success: false, message: 'الفحص يتم محلياً عبر جهاز الديسكتوب.' }),
    loadComments: () => [],
    saveComments: () => ({ success: false, message: 'حفظ التعليقات يتم محلياً أو عبر لوحة العميل.' }),
    loadBoosterConfig: () => ({ doLike: true, doComment: true, doShare: false, useGroqAi: true, isHeadless: true }),
    saveBoosterConfig: () => ({ success: true }),
    startBoosterCycle: async () => ({ success: false, message: 'تشغيل المعزز يتم عبر البوت المكتبي المربوط بحسابك.' }),
    stopBoosterCycle: () => ({ success: true })
};

app.get('/api/booster/status', (req, res) => {
    try {
        res.json({ success: true, data: boosterService.getBoosterStatus() });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/booster/add-account', async (req, res) => {
    try {
        const { name } = req.body;
        const result = await boosterService.addAccountWizard(name);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/booster/toggle-account', (req, res) => {
    try {
        const { accountId, enabled } = req.body;
        const result = boosterService.toggleAccount(accountId, enabled);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/booster/delete-account', (req, res) => {
    try {
        const { accountId } = req.body;
        const result = boosterService.deleteAccount(accountId);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/booster/open-browser', async (req, res) => {
    try {
        const { accountId } = req.body;
        const result = await boosterService.openAccountBrowser(accountId);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/booster/comments', (req, res) => {
    try {
        const comments = boosterService.loadComments();
        res.json({ success: true, comments });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/booster/comments', (req, res) => {
    try {
        const { comments } = req.body;
        boosterService.saveComments(comments);
        res.json({ success: true, message: 'تم حفظ قائمة التعليقات بنجاح!' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/booster/config', (req, res) => {
    try {
        res.json({ success: true, config: boosterService.loadBoosterConfig() });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/booster/config', (req, res) => {
    try {
        boosterService.saveBoosterConfig(req.body.config || {});
        res.json({ success: true, message: 'تم حفظ إعدادات المعزز بنجاح!' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/booster/start', async (req, res) => {
    try {
        const { postUrls, postUrl, postContent, useGroqAi, doLike, doComment, doShare, randomizeTasks, isHeadless } = req.body;
        const result = await boosterService.startBoosterCycle({ 
            postUrls, 
            postUrl, 
            postContent, 
            useGroqAi, 
            doLike, 
            doComment, 
            doShare, 
            randomizeTasks: randomizeTasks !== false,
            isHeadless 
        });
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/booster/stop', (req, res) => {
    try {
        const result = boosterService.stopBoosterCycle();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/booster/check-health', async (req, res) => {
    try {
        const result = await boosterService.checkAllAccountsHealth();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/booster/check-single-health', async (req, res) => {
    try {
        const { accountId } = req.body;
        const accounts = boosterService.loadAccounts();
        const acc = accounts.find(a => a.id === accountId);
        if (!acc) return res.status(404).json({ success: false, message: 'الحساب غير موجود' });
        const checkRes = await boosterService.checkAccountSession(acc);
        acc.sessionStatus = checkRes.status;
        acc.sessionMessage = checkRes.message;
        acc.lastCheckedAt = checkRes.lastCheckedAt;
        boosterService.saveAccounts(accounts);
        res.json({ success: true, result: checkRes, account: acc });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 3.5 فحص حالة الحساب والاشتراك وقائمة المفاتيح المطلوبة
app.get('/api/user/account-status', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId || !supabaseAdmin) {
            return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب.' });
        }

        const { data: userRow } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (!userRow) {
            return res.status(404).json({ success: false, message: 'المستخدم غير مسجل.' });
        }

        const isSuperAdmin = userRow.email === 'raslan.meet@gmail.com';
        if (isSuperAdmin) {
            return res.json({
                success: true,
                status: 'active',
                role: 'admin',
                isSuperAdmin: true,
                subscription: {
                    period: 'lifetime',
                    expires_at: null,
                    is_expired: false,
                    days_remaining: 9999
                },
                keys_checklist: {
                    meta: Boolean(userRow.meta_access_token),
                    groq: Boolean(userRow.groq_api_key),
                    cloudinary: Boolean(userRow.auto_reply_config?.cloudinary?.cloudName && userRow.auto_reply_config?.cloudinary?.apiKey),
                    telegram: Boolean(userRow.auto_reply_config?.telegram?.botToken && userRow.auto_reply_config?.telegram?.chatId)
                },
                needs_onboarding: false
            });
        }

        let status = userRow.status || userRow.auto_reply_config?.account_status || 'pending';
        let sub = userRow.auto_reply_config?.subscription || {
            period: userRow.subscription_period || '1_month',
            expires_at: userRow.subscription_expires_at || null
        };

        let isExpired = false;
        let daysRemaining = 0;
        let hoursRemaining = 0;
        if (sub.expires_at) {
            const expDate = new Date(sub.expires_at);
            const now = new Date();
            const diffMs = expDate.getTime() - now.getTime();
            daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
            if (diffMs <= 0 && status === 'active') {
                status = 'expired';
                isExpired = true;
            }
        }

        const keysChecklist = {
            meta: Boolean(userRow.meta_access_token),
            groq: Boolean(userRow.groq_api_key),
            cloudinary: Boolean(userRow.auto_reply_config?.cloudinary?.cloudName && userRow.auto_reply_config?.cloudinary?.apiKey),
            telegram: Boolean(userRow.auto_reply_config?.telegram?.botToken && userRow.auto_reply_config?.telegram?.chatId)
        };

        return res.json({
            success: true,
            status,
            role: 'client',
            isSuperAdmin: false,
            subscription: {
                period: sub.period || '1_month',
                expires_at: sub.expires_at,
                is_expired: isExpired,
                days_remaining: Math.max(0, daysRemaining),
                hours_remaining: hoursRemaining
            },
            keys_checklist: keysChecklist,
            needs_onboarding: status === 'active' && (!keysChecklist.meta || !keysChecklist.groq || !keysChecklist.cloudinary)
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 3.6 لوحة الإدارة: جلب كافة المشتركين (خاص بـ raslan.meet@gmail.com)
app.get('/api/admin/users', async (req, res) => {
    try {
        const adminUserId = req.query.adminUserId;
        if (!adminUserId || !supabaseAdmin) {
            return res.status(401).json({ success: false, message: 'غير مصرح.' });
        }

        const { data: adminRow } = await supabaseAdmin
            .from('user_profiles')
            .select('email')
            .eq('id', adminUserId)
            .maybeSingle();

        if (adminRow?.email !== 'raslan.meet@gmail.com') {
            return res.status(403).json({ success: false, message: 'هذه اللوحة مخصصة فقط لمدير المنصة (رسلان للتسويق).' });
        }

        const { data: allUsers, error } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const usersList = (allUsers || []).map(u => {
            const isSelf = u.email === 'raslan.meet@gmail.com';
            let status = isSelf ? 'active' : (u.status || u.auto_reply_config?.account_status || 'pending');
            const sub = u.auto_reply_config?.subscription || {
                period: u.subscription_period || '1_month',
                expires_at: u.subscription_expires_at || null
            };

            let daysRemaining = null;
            let hoursRemaining = null;
            if (sub.expires_at) {
                const diffMs = new Date(sub.expires_at).getTime() - Date.now();
                daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
                if (diffMs <= 0 && status === 'active' && !isSelf) {
                    status = 'expired';
                }
            }

            return {
                id: u.id,
                email: u.email,
                full_name: u.full_name || 'بدون اسم',
                avatar_url: u.avatar_url || '',
                created_at: u.created_at,
                status,
                role: isSelf ? 'admin' : 'client',
                is_super_admin: isSelf,
                subscription: {
                    period: isSelf ? 'lifetime' : (sub.period || '1_month'),
                    expires_at: sub.expires_at,
                    days_remaining: daysRemaining,
                    hours_remaining: hoursRemaining
                },
                keys_checklist: {
                    meta: Boolean(u.meta_access_token),
                    groq: Boolean(u.groq_api_key),
                    cloudinary: Boolean(u.auto_reply_config?.cloudinary?.cloudName),
                    telegram: Boolean(u.auto_reply_config?.telegram?.botToken && u.auto_reply_config?.telegram?.chatId),
                    selected_pages_count: Array.isArray(u.selected_pages) ? u.selected_pages.length : 0,
                    groups_count: Array.isArray(u.auto_reply_config?.target_groups) ? u.auto_reply_config.target_groups.length : 0
                }
            };
        });

        return res.json({ success: true, users: usersList, total: usersList.length });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 3.7 لوحة الإدارة: تفعيل / إيقاف / تحديد مدة اشتراك أي مستخدم
app.post('/api/admin/user-status', async (req, res) => {
    try {
        const { adminUserId, targetUserId, action, period = '1_month' } = req.body;
        if (!adminUserId || !targetUserId || !supabaseAdmin) {
            return res.status(400).json({ success: false, message: 'بيانات غير مكتملة.' });
        }

        const { data: adminRow } = await supabaseAdmin
            .from('user_profiles')
            .select('email')
            .eq('id', adminUserId)
            .maybeSingle();

        if (adminRow?.email !== 'raslan.meet@gmail.com') {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بتنفيذ هذا الإجراء.' });
        }

        const { data: targetUser } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', targetUserId)
            .maybeSingle();

        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
        }

        if (targetUser.email === 'raslan.meet@gmail.com') {
            return res.status(400).json({ success: false, message: 'لا يمكن تعديل أو إيقاف حساب المشرف الأساسي.' });
        }

        if (action === 'delete') {
            await supabaseAdmin.from('user_profiles').delete().eq('id', targetUserId);
            return res.json({ success: true, message: `تم حذف حساب المستخدم ${targetUser.email} بنجاح.` });
        }

        let newStatus = 'pending';
        let expiresAt = null;

        if (action === 'activate') {
            newStatus = 'active';
            const now = new Date();
            if (period === '1_day') {
                now.setDate(now.getDate() + 1);
                expiresAt = now.toISOString();
            } else if (period === '1_month') {
                now.setDate(now.getDate() + 30);
                expiresAt = now.toISOString();
            } else if (period === '3_months') {
                now.setDate(now.getDate() + 90);
                expiresAt = now.toISOString();
            } else if (period === '6_months') {
                now.setDate(now.getDate() + 180);
                expiresAt = now.toISOString();
            } else if (period === '1_year') {
                now.setDate(now.getDate() + 365);
                expiresAt = now.toISOString();
            } else if (period === 'lifetime') {
                now.setFullYear(now.getFullYear() + 100);
                expiresAt = now.toISOString();
            }
        } else if (action === 'suspend') {
            newStatus = 'suspended';
        }

        let uConfig = targetUser.auto_reply_config || {};
        if (typeof uConfig !== 'object') uConfig = {};
        uConfig.account_status = newStatus;
        uConfig.subscription = {
            period: period,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
        };

        const updateData = {
            auto_reply_config: uConfig,
            updated_at: new Date().toISOString()
        };

        try {
            updateData.status = newStatus;
            updateData.subscription_period = period;
            updateData.subscription_expires_at = expiresAt;
        } catch (e) {}

        const { error } = await supabaseAdmin
            .from('user_profiles')
            .update(updateData)
            .eq('id', targetUserId);

        if (error) {
            await supabaseAdmin
                .from('user_profiles')
                .update({ auto_reply_config: uConfig, updated_at: new Date().toISOString() })
                .eq('id', targetUserId);
        }

        const actionName = action === 'activate' ? `تفعيل الحساب بنجاح لمدة (${period})` : 'إيقاف الحساب';
        return res.json({
            success: true,
            message: `تم ${actionName} للمستخدم (${targetUser.email})!`,
            status: newStatus,
            subscription: uConfig.subscription
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 3.8 معالج التهيئة والربط الأولي للعميل (Onboarding Wizard)
app.post('/api/user/onboarding-setup', async (req, res) => {
    try {
        const { userId, groqApiKey, metaToken, cloudinary, telegram, selectedPages } = req.body;
        if (!userId || !supabaseAdmin) {
            return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب.' });
        }

        const { data: userRow } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (!userRow) {
            return res.status(404).json({ success: false, message: 'المستخدم غير مسجل.' });
        }

        let uConfig = userRow.auto_reply_config || {};
        if (typeof uConfig !== 'object') uConfig = {};

        if (cloudinary && typeof cloudinary === 'object') {
            uConfig.cloudinary = {
                cloudName: (cloudinary.cloudName || '').trim(),
                apiKey: (cloudinary.apiKey || '').trim(),
                apiSecret: (cloudinary.apiSecret || '').trim()
            };
        }

        if (telegram && typeof telegram === 'object') {
            uConfig.telegram = {
                botToken: (telegram.botToken || '').trim(),
                chatId: (telegram.chatId || '').trim(),
                enabled: telegram.enabled !== false
            };
        }

        const cleanGroqKey = (groqApiKey || '').trim();
        const cleanMetaToken = (metaToken || '').trim();
        if (cleanGroqKey) {
            uConfig.groq_api_key = cleanGroqKey;
        }

        const updatePayload = {
            auto_reply_config: uConfig,
            updated_at: new Date().toISOString()
        };

        if (cleanGroqKey) updatePayload.groq_api_key = cleanGroqKey;
        if (cleanMetaToken) updatePayload.meta_access_token = cleanMetaToken;
        if (Array.isArray(selectedPages) && selectedPages.length > 0) {
            updatePayload.selected_pages = selectedPages;
        }

        await supabaseAdmin
            .from('user_profiles')
            .update(updatePayload)
            .eq('id', userId);

        return res.json({
            success: true,
            message: 'تم حفظ كافة المفاتيح والإعدادات بنجاح! حسابك جاهز تماماً 🚀'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 4. مستكشف الكلمات المفتاحية والجروبات الكبرى بالذكاء الاصطناعي (AI Group Hunter)
app.post('/api/groups/ai-discover', async (req, res) => {
    try {
        const { niche, pageName, groqApiKey, userId } = req.body;
        const targetNiche = niche || 'تسويق رقمي، إدارة صفحات سوشيال ميديا، إعلانات ممولة، وتصميم مواقع';

        let apiKey = (groqApiKey || '').trim();
        if (!apiKey && userId && supabaseAdmin) {
            try {
                const { data: uRow } = await supabaseAdmin
                    .from('user_profiles')
                    .select('groq_api_key, email')
                    .eq('id', userId)
                    .maybeSingle();
                if (uRow?.groq_api_key) apiKey = uRow.groq_api_key;
                else if (uRow?.email === 'raslan.meet@gmail.com') {
                    apiKey = process.env.GROQ_API_KEY || '';
                }
            } catch (e) {}
        }

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال مفتاح Groq API الخاص بك من الإعدادات لتشغيل ميزات الذكاء الاصطناعي.'
            });
        }

        const prompt = `أنت خبير تسويق فيسبوك متخصص في المجموعات (Facebook Groups Growth Expert).
المجال والنشاط المستهدف: "${targetNiche}".
اسم النشاط: "${pageName || 'رسلان للتسويق'}".

المطلوب:
1. استخراج أفضل 10 كلمات مفتاحية دقيقة وشائعة يبحث بها رواد الأعمال وأصحاب المجموعات الكبرى على فيسبوك وتجذب عملاء محتملين مهتمين بهذا المجال.
2. ترشيح 6 جروبات افتراضية كبرى (+100 ألف عضو) ذات اهتمام حقيقي بالخدمة (3 مجموعات أساسية و 3 مجموعات احتياطية).
3. صياغة 3 مقدمات/صيغ مشاركة تفاعلية ذكية (Hooks) لا تُرفض من مشرفي الجروبات (تبدأ بفائدة أو استفسار أو قصة نجاح).

أخرج النتيجة كـ JSON صالح ومضبوط 100% فقط بالهيكل التالي بدون أي مقدمات أو كلام خارجي:
{
  "keywords": [
    { "keyword": "كلمة البحث 1" },
    { "keyword": "كلمة البحث 2" }
  ],
  "candidateGroups": [
    { "id": "grp_1", "name": "اسم الجروب المقترح", "members": "180k عضو", "category": "رواد أعمال وتجارة", "isBackup": false },
    { "id": "grp_2", "name": "اسم الجروب المقترح", "members": "150k عضو", "category": "أصحاب شركات ومشاريع", "isBackup": false },
    { "id": "grp_3", "name": "اسم الجروب المقترح", "members": "210k عضو", "category": "تسويق ومبيعات إلكترونية", "isBackup": false },
    { "id": "grp_4", "name": "اسم الجروب الاحتياطي", "members": "140k عضو", "category": "تجارة جملة واستيراد", "isBackup": true },
    { "id": "grp_5", "name": "اسم الجروب الاحتياطي", "members": "120k عضو", "category": "شركات ناشئة مصر والخليج", "isBackup": true },
    { "id": "grp_6", "name": "اسم الجروب الاحتياطي", "members": "165k عضو", "category": "أصحاب المتاجر والمشاريع", "isBackup": true }
  ],
  "hooks": [
    "صيغة مشاركة تفاعلية 1 تبدأ بسؤال لأصحاب المشاريع...",
    "صيغة مشاركة تفاعلية 2 تبدأ بنصيحة وتجربة عملية...",
    "صيغة مشاركة تفاعلية 3 تبدأ بدراسة حالة سريعة..."
  ]
}`;

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: 'You are an expert social media growth strategist. Respond with strictly valid JSON only.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' }
            })
        });

        const groqData = await groqRes.json();
        if (groqData.error) throw new Error(groqData.error.message);

        const content = groqData.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);

        if (Array.isArray(parsed.keywords)) {
            parsed.keywords = parsed.keywords.map(k => ({
                keyword: k.keyword,
                searchUrl: `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(k.keyword)}`
            }));
        }

        res.json({ success: true, data: parsed });
    } catch (err) {
        console.error('Error in /api/groups/ai-discover:', err);
        res.status(500).json({ success: false, message: err.message || 'تعذر استخراج الكلمات والجروبات بالذكاء الاصطناعي.' });
    }
});

// 5. جلب قائمة الجروبات المستهدفة والتدوير (معزولة لكل مستخدم 100%)
app.get('/api/groups/target-list', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.json({ success: true, groups: [], total: 0 });
        }

        let groups = [];
        if (supabaseAdmin) {
            try {
                const { data: userRow } = await supabaseAdmin
                    .from('user_profiles')
                    .select('email, auto_reply_config')
                    .eq('id', userId)
                    .maybeSingle();

                if (Array.isArray(userRow?.auto_reply_config?.target_groups) && userRow.auto_reply_config.target_groups.length > 0) {
                    groups = userRow.auto_reply_config.target_groups;
                } else if (userRow?.email === 'raslan.meet@gmail.com') {
                    // فقط المشرف الأساسي يسترجع قائمته الافتراضية إذا كانت فارغة
                    try {
                        const cleanGroups = JSON.parse(fs.readFileSync(path.join(__dirname, 'clean_groups.json'), 'utf8'));
                        if (Array.isArray(cleanGroups)) groups = cleanGroups;
                    } catch (e) {}
                }
            } catch (e) {}
        }

        res.json({ success: true, groups, total: groups.length });
    } catch (err) {
        res.status(500).json({ success: false, message: 'تعذر جلب قائمة الجروبات.' });
    }
});

// 6. حفظ قائمة الجروبات المستهدفة (معزولة لحساب المستخدم فقط)
app.post('/api/groups/target-list', async (req, res) => {
    try {
        const { userId, groups } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'يجب تسجيل الدخول لحفظ قائمة المجموعات.' });
        }

        const validGroups = Array.isArray(groups) ? groups : [];

        if (supabaseAdmin) {
            try {
                const { data: userRow } = await supabaseAdmin
                    .from('user_profiles')
                    .select('auto_reply_config')
                    .eq('id', userId)
                    .maybeSingle();

                let uConfig = userRow?.auto_reply_config || {};
                if (typeof uConfig !== 'object') uConfig = {};
                uConfig.target_groups = validGroups;

                await supabaseAdmin
                    .from('user_profiles')
                    .update({ auto_reply_config: uConfig, updated_at: new Date().toISOString() })
                    .eq('id', userId);
            } catch (e) {
                console.warn('Error saving target groups to Supabase:', e.message);
            }
        }

        res.json({ success: true, message: 'تم حفظ وتحديث قائمة الجروبات لحسابك بنجاح!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'تعذر حفظ قائمة الجروبات.' });
    }
});

// 7. دالة إرسال إشعار النشر للتيليجرام مع أزرار الجروبات الذكية والتدوير غير المكرر
async function sendTelegramGroupNotification(post, publishResults, userId) {
    try {
        let telegramConfig = null;
        let targetGroups = [];
        let uConfig = {};
        let targetUserId = userId;
        let isSuperAdmin = false;

        if (targetUserId && supabaseAdmin) {
            try {
                const { data: userRow } = await supabaseAdmin
                    .from('user_profiles')
                    .select('email, status, auto_reply_config')
                    .eq('id', targetUserId)
                    .maybeSingle();

                if (userRow) {
                    isSuperAdmin = userRow.email === 'raslan.meet@gmail.com';
                    uConfig = userRow.auto_reply_config || {};
                    telegramConfig = uConfig.telegram;
                    targetGroups = Array.isArray(uConfig.target_groups) ? uConfig.target_groups : [];

                    // إذا لم يكن المدير الأساسي، التأكد من أن اشتراكه نشط
                    if (!isSuperAdmin) {
                        const uStatus = userRow.status || uConfig.account_status || 'pending';
                        const uSub = uConfig.subscription;
                        const isExpired = uSub?.expires_at && new Date(uSub.expires_at) <= new Date();
                        if (uStatus !== 'active' || isExpired) {
                            console.log(`[Telegram Bot] تم تخطي إرسال إشعار تيليجرام لأن حساب المستخدم (${userRow.email}) غير نشط أو اشتراكه منتهٍ.`);
                            return { success: false, reason: 'subscription_inactive' };
                        }
                    }
                }
            } catch (e) {
                console.warn('Error fetching user config for Telegram from Supabase:', e.message);
            }
        }

        // إذا لم يكن هناك مستخدم محدد، الافتراض أنه حساب المشرف
        if (!targetUserId) {
            isSuperAdmin = true;
        }

        // فقط المشرف الأساسي يسترجع القائمة الاحتياطية والتكوين الافتراضي لشركة رسلان
        if (isSuperAdmin) {
            if (!telegramConfig) {
                const localCfg = await getAutoReplyConfig(post.pageId);
                telegramConfig = localCfg?.telegram;
                if (!uConfig.last_rotation_index) uConfig.last_rotation_index = localCfg?.last_rotation_index || 0;
            }
            if (targetGroups.length === 0) {
                try {
                    const fs = require('fs');
                    const p = path.join(__dirname, 'clean_groups.json');
                    if (fs.existsSync(p)) targetGroups = JSON.parse(fs.readFileSync(p, 'utf8'));
                } catch (e) {}
            }
        }

        // تحديد التوكن ومعرف الدردشة
        let botToken = telegramConfig?.botToken?.trim();
        let chatId = telegramConfig?.chatId?.trim();

        if (isSuperAdmin) {
            if (!botToken) botToken = '8946209406:AAFBRxNoA-bqkymvDddkOik2I6QUjMvRaa8';
            if (!chatId) chatId = '1077637435';
        }

        if (!botToken || !chatId) {
            console.log('[Telegram Bot] لا يوجد بوت تيليجرام مهيأ لهذا المستخدم، تم تخطي إرسال الإشعار.');
            return { success: false, skipped: true, reason: 'No telegram bot configured for this user' };
        }

        // استخراج رابط البوست على فيسبوك
        const fbFeedResult = publishResults?.facebook?.feed || publishResults?.facebook;
        const fbPostId = fbFeedResult?.post_id || fbFeedResult?.id;
        let fbPostUrl = '';
        if (fbFeedResult?.permalink_url) {
            fbPostUrl = fbFeedResult.permalink_url;
        } else if (post.postUrl) {
            fbPostUrl = post.postUrl;
        } else if (fbPostId) {
            const cleanId = String(fbPostId).includes('_') ? String(fbPostId).split('_')[1] : fbPostId;
            fbPostUrl = isSuperAdmin 
                ? `https://www.facebook.com/RaslansMarketing/posts/${cleanId}`
                : `https://www.facebook.com/${cleanId}`;
        } else {
            fbPostUrl = post.pageId ? `https://www.facebook.com/${post.pageId}` : 'https://www.facebook.com';
        }

        // رابط المشاركة السريعة الرسمي لفيسبوك
        const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fbPostUrl)}`;

        // خوارزمية تدوير 5 جروبات يومياً بدون أي تكرار لأيام متتالية
        const BATCH_SIZE = 5;
        let startIndex = typeof uConfig.last_rotation_index === 'number' ? uConfig.last_rotation_index : 0;
        if (startIndex >= targetGroups.length) startIndex = 0;

        const currentBatch = [];
        const total = targetGroups.length;
        const countToPick = Math.min(BATCH_SIZE, total);

        for (let i = 0; i < countToPick; i++) {
            const pickIndex = (startIndex + i) % total;
            currentBatch.push(targetGroups[pickIndex]);
        }

        // تحديث المؤشر للمنشور القادم لضمان عدم التكرار نهائياً
        const nextIndex = total > 0 ? (startIndex + countToPick) % total : 0;
        uConfig.last_rotation_index = nextIndex;

        // حفظ المؤشر في السحابة ومحلياً
        if (targetUserId && supabaseAdmin) {
            try {
                await supabaseAdmin
                    .from('user_profiles')
                    .update({ auto_reply_config: uConfig, updated_at: new Date().toISOString() })
                    .eq('id', targetUserId);
            } catch (e) {}
        }
        try {
            const localCfg = await getAutoReplyConfig(post.pageId);
            localCfg.last_rotation_index = nextIndex;
            await saveAutoReplyConfig(localCfg);
        } catch (e) {}

        // بنك العناوين اليومية الذكية (30 صيغة تفاعلية لشهر كامل بدون تكرار)
        const dailyViralHooks = [
            'هل تواجه صعوبة في تنظيم مبيعات وعمليات شركتك؟ شاركنا التحديات وسنقترح لك حلولاً عملية لتحسين الأداء 🚀',
            'نصيحة اليوم لأصحاب المشاريع: دمج إدارة العملاء مع أدوات التسويق على فيسبوك يزيد مبيعاتك بنسبة تصل إلى 30%! 🔥',
            'قصة نجاح: كيف استطاعت شركة زيادة إنتاجيتها ومبيعاتها باستخدام نظام أتمتة بسيط؟ تفاصيل التجربة 👇',
            'تنبيه هام لأصحاب الحملات الإعلانية: كيف تحمي حسابك الإعلاني على Meta من الإغلاق وتوثقه رسمياً؟ 🛡️',
            'سؤال لأصحاب الشركات والتجار: ما هي أكبر عقبة تواجهك حالياً في وصول إعلاناتك للعملاء المهتمين فعلاً؟ 💡',
            'سر مضاعفة عائد إعلانات فيسبوك (ROAS): 3 معايير لتحديد الجمهور المستهدف بدقة دون حرق ميزانيتك 🎯',
            'خطوة واحدة تفرق بين صفحة أعمال ناجحة وصفحة مهملة: جدول نشر منضبط وتصميمات بهوية بصرية واضحة ✨',
            'أصحاب المتاجر والمشاريع: هل تعتمد على الرسائل فقط للمبيعات أم لديك موقع يبيع 24 ساعة؟ شاركنا رأيك 🛒',
            'تجربة عملية: لماذا تفشل 80% من الحملات الإعلانية الممولة؟ وكيف تحول إعلانك لماكينة مبيعات؟ 📊',
            'استشارة سريعة: إذا كنت تبدأ نشاطاً تجارياً جديداً اليوم، ما أول منصة يجب أن تركز عليها ولماذا؟ 🤔',
            'نصيحة اليوم في التسويق بالمحتوى: المنشورات التي تحل مشكلة حقيقية للعميل تحقق 5 أضعاف تفاعل الإعلانات المباشرة 📝',
            'توثيق الحساب الإعلاني (Meta Business Verification): الشروط، المستندات، وكيف تتجنب رفض فيسبوك لطلبك ✅',
            'لكل رائد أعمال ومدير تسويق: كيف تختار المؤثرين أو صناع المحتوى المناسبين لنشاطك التجاري؟ 🌟',
            'فكرة تسويقية للأسبوع: كيف تحول العميل الذي يسأل عن السعر فقط إلى عميل دائم يشتري منك باستمرار؟ 💬',
            'تحديثات خوارزميات فيسبوك وانستجرام 2026: كيف تضمن ظهور منشوراتك في الصفحة الأولى بدون إعلانات؟ 📈',
            'هل جربت الرد الآلي الذكي على رسائل صفحتك؟ إليك كيف يضاعف سرعة تحويل الاستفسارات إلى مبيعات مؤكدة ⚡',
            'أخطاء شائعة في تصميم صفحات الهبوط والمواقع الإلكترونية تتسبب في هروب 60% من الزوار فوراً 🚫',
            'سؤال للنقاش: في رأيك، ما الأكثر تأثيراً في قرار شراء العميل: قوة التصميم أم نص الإعلان المقنع (Copywriting)؟ 🎨',
            'خطة شهرية بسيطة لإدارة محتوى منصات التواصل الاجتماعي لأي نشاط تجاري بميزانية مرنة 📅',
            'كيف تصنع هوية بصرية وتصميمات تعبر عن احترافية شركتك وتبني الثقة من النظرة الأولى؟ 👁️',
            'درس تسويقي مهم: الجمهور المستهدف الصغير والمتفاعل أفضل 10 مرات من جمهور ضخم لا يشتري! 🎯',
            'طريقة إعداد إعلانات إعادة الاستهداف (Retargeting) للعملاء الذين زاروا صفحتك ولم يشتروا 🔄',
            'تحليل الأداء: ما هي أهم 3 أرقام وإحصائيات يجب أن تتابعها أسبوعياً في لوحة تحكم إعلاناتك؟ 📉',
            'كيف تدير صفحات شركتك باحترافية وتتفرغ لتطوير منتجاتك وخدماتك بدون تشتت؟ ⏱️',
            'نصيحة لأصحاب الأنشطة الخدمية: كيف تسوّق لخدمتك بالنتائج وقصص العملاء وليس بالكلام النظري؟ 💼',
            'سؤال اليوم: ما الذي يجعل عميلك يختارك أنت تحديداً دون منافسيك؟ شاركنا ميزتك التنافسية 👇',
            'أهمية بناء قائمة عملاء وبيانات خاصة بنشاطك (CRM) بدلاً من الاعتماد الكلي على خوارزميات السوشيال ميديا 📁',
            'استراتيجية التسويق بالفيديو (Reels & Short Videos): كيف تجعل فيديوهاتك تنتشر وتجلب عملاء جدد مجاناً 🎥',
            'كيف تحسب العائد على الاستثمار الإعلاني (ROI) لتعرف بدقة هل حملتك رابحة أم خاسرة؟ 💰',
            'تحدي الأسبوع: طبق هذه النصيحة التسويقية في صفحتك اليوم وراقب التفاعل خلال 48 ساعة! 🚀'
        ];

        // استخراج عنوان تفاعلي ذكي مرتبط مباشرة بكابشن المنشور الحالي
        let chosenHook = '';
        if (post.groupHook && post.groupHook.trim()) {
            chosenHook = post.groupHook.trim();
        } else if (post.content && post.content.trim().length > 15) {
            // استخراج أول جملة أو أول سؤال جذاب من صلب كابشن المنشور
            const rawLines = post.content.split('\n').map(l => l.trim()).filter(Boolean);
            const firstLine = rawLines[0] || '';
            const secondLine = rawLines[1] || '';
            
            let combined = firstLine;
            if (firstLine.length < 50 && secondLine && !secondLine.startsWith('http') && !secondLine.startsWith('#')) {
                combined = `${firstLine} ${secondLine}`;
            }
            // تنظيف الهاشتاجات والروابط من جملة الخطاف
            combined = combined.replace(/#\S+/g, '').replace(/https?:\/\/\S+/g, '').replace(/[\\*\\_]/g, '').trim();
            if (combined.length > 130) combined = combined.substring(0, 127) + '...';

            if (combined.length >= 15) {
                // إلحاق رقم التواصل الحقيقي والدعوة لاتخاذ إجراء تلقائياً
                chosenHook = `${combined} 📍 تواصل معنا: 01020942335 🚀`;
            }
        }

        // إذا لم يكن هناك كابشن كافٍ، نلجأ تلقائياً لبنك العناوين اليومية بالتناوب
        if (!chosenHook) {
            const hookDayIndex = Math.floor(startIndex / 5);
            chosenHook = (Array.isArray(uConfig.hooks) && uConfig.hooks.length > 0)
                ? uConfig.hooks[hookDayIndex % uConfig.hooks.length]
                : dailyViralHooks[hookDayIndex % dailyViralHooks.length];
        }

        const postSnippet = post.content ? (post.content.length > 80 ? post.content.substring(0, 80) + '...' : post.content) : 'منشور وسائط';

        let msgText = `🚀 <b>تم نشر المنشور الجديد بنجاح بالسحابة!</b>\n`;
        msgText += `━━━━━━━━━━━━━━━━━━━━\n`;
        msgText += `📊 <b>حالة النشر:</b>\n`;
        if (publishResults?.facebook?.success) msgText += `📘 فيسبوك: تم النشر بنجاح ✅\n`;
        if (publishResults?.instagram?.success) msgText += `📸 انستجرام: تم النشر بنجاح ✅\n`;
        msgText += `💡 <b>عنوان وجملة المشاركة (المس لنسخها نظيفة فوراً):</b>\n`;
        msgText += `<code>${chosenHook}</code>\n`;
        msgText += `━━━━━━━━━━━━━━━━━━━━\n`;

        if (currentBatch.length > 0) {
            msgText += `🎯 <b>جروبات اليوم الـ 5 (المجموعة المجدولة من أصل ${total} جروب):</b>\n`;
            currentBatch.forEach((g, idx) => {
                msgText += `${idx + 1}️⃣ ${g.name || 'مجموعة مستهدفة'}\n`;
            });
        }

        msgText += `\n👇 <b>طريقة المشاركة الاحترافية النظيفة (بدون روابط):</b>\n`;
        msgText += `اضغط على الزر بالأسفل لفتح المنشور، ثم اضغط <b>مشاركة ⬅️ مشاركة في مجموعة</b>، والمس العنوان أعلاه والصقه!`;

        // بناء الأزرار التفاعلية (Inline Keyboard)
        const inlineKeyboard = [];

        // زر مستقل لكل جروب من الـ 5 يفتح الجروب مباشرة
        currentBatch.forEach((g, idx) => {
            const targetUrl = (g.url && g.url.trim()) ? g.url.trim() : fbPostUrl;
            inlineKeyboard.push([
                { text: `👥 ${(idx + 1)}. ${(g.name || 'جروب ' + (idx + 1)).substring(0, 32)}`, url: targetUrl }
            ]);
        });

        // زر فتح المنشور على الصفحة
        inlineKeyboard.push([
            { text: isSuperAdmin ? `🔗 فتح المنشور الأصلي على صفحة رسلان للتسويق` : `🔗 فتح المنشور على فيسبوك`, url: fbPostUrl }
        ]);

        console.log(`[Telegram Bot] جاري إرسال إشعار النشر للدردشة: ${chatId}`);

        let photoOk = false;
        let lastErrorDesc = '';

        if (post.mediaUrl && (!post.mediaType || post.mediaType.startsWith('image/')) && msgText.length < 1000) {
            try {
                const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        photo: post.mediaUrl,
                        caption: msgText,
                        parse_mode: 'HTML',
                        reply_markup: { inline_keyboard: inlineKeyboard }
                    })
                });
                const photoData = await photoRes.json();
                if (photoData.ok) {
                    console.log('[Telegram Bot] تم إرسال الإشعار مع صورة البوست بنجاح!');
                    return { success: true };
                } else {
                    lastErrorDesc = photoData.description || '';
                    console.warn('[Telegram Bot Photo Fallback]:', lastErrorDesc);
                }
            } catch (pErr) {
                console.warn('[Telegram Bot Photo Err]:', pErr.message);
            }
        }

        const textRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: msgText,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: { inline_keyboard: inlineKeyboard }
            })
        });
        const textData = await textRes.json();
        if (textData.ok) {
            console.log('[Telegram Bot] تم إرسال الإشعار بنجاح!');
            return { success: true };
        } else {
            console.warn('[Telegram Bot Warning] خطأ في الإرسال:', textData.description);
            return { success: false, error: textData.description || lastErrorDesc };
        }

    } catch (err) {
        console.error('Error in sendTelegramGroupNotification:', err);
        return { success: false, error: err.message };
    }
}

// 2. مسار النشر والجدولة (POST /api/publish)
app.post('/api/publish', upload.any(), async (req, res) => {
    try {
        const { 
            userId,
            content, 
            platforms, 
            facebookPlacements,
            instagramPlacements,
            isScheduled, 
            scheduledTime, 
            pageId, 
            pageAccessToken,
            igUserId,
            metaToken,
            customCaptions, 
            aspectRatio, 
            firstComment,
            comments,
            userCloudinary
        } = req.body;

        // فحص صلاحية واشتراك المستخدم قبل النشر أو الجدولة
        if (userId && supabaseAdmin) {
            try {
                const { data: userRow } = await supabaseAdmin
                    .from('user_profiles')
                    .select('email, status, auto_reply_config')
                    .eq('id', userId)
                    .maybeSingle();

                if (userRow && userRow.email !== 'raslan.meet@gmail.com') {
                    const uStatus = userRow.status || userRow.auto_reply_config?.account_status || 'pending';
                    const sub = userRow.auto_reply_config?.subscription;
                    const now = new Date();
                    const isExpired = sub?.expires_at && new Date(sub.expires_at) <= now;

                    if (uStatus === 'pending') {
                        return res.status(403).json({
                            success: false,
                            message: '⚠️ حسابك ما زال قيد المراجعة بانتظار موافقة الإدارة وتفعيل الاشتراك.'
                        });
                    }
                    if (uStatus === 'suspended') {
                        return res.status(403).json({
                            success: false,
                            message: '⚠️ تم إيقاف حسابك مؤقتاً. يرجى التواصل مع إدارة المنصة للمتابعة.'
                        });
                    }
                    if (isExpired || uStatus === 'expired') {
                        return res.status(403).json({
                            success: false,
                            message: '⚠️ انتهت فترة اشتراكك في المنصة. يرجى تجديد الاشتراك لتتمكن من النشر والجدولة.'
                        });
                    }
                }
            } catch (authErr) {
                console.warn('Subscription check error in /api/publish:', authErr.message);
            }
        }

        const parsedPlatforms = JSON.parse(platforms || '[]');
        let parsedCustomCaptions = null;
        try {
            if (customCaptions) parsedCustomCaptions = JSON.parse(customCaptions);
        } catch {}

        let parsedFbPlacements = ['feed'];
        if (facebookPlacements) {
            try {
                parsedFbPlacements = typeof facebookPlacements === 'string' ? JSON.parse(facebookPlacements) : facebookPlacements;
            } catch {
                parsedFbPlacements = [facebookPlacements];
            }
        }
        if (!Array.isArray(parsedFbPlacements) || parsedFbPlacements.length === 0) parsedFbPlacements = ['feed'];

        let parsedIgPlacements = ['feed'];
        if (instagramPlacements) {
            try {
                parsedIgPlacements = typeof instagramPlacements === 'string' ? JSON.parse(instagramPlacements) : instagramPlacements;
            } catch {
                parsedIgPlacements = [instagramPlacements];
            }
        }
        if (!Array.isArray(parsedIgPlacements) || parsedIgPlacements.length === 0) parsedIgPlacements = ['feed'];

        let cloudUrl = null;
        let mediaWidth = null;
        let mediaHeight = null;

        // استخراج ملف الميديا الرئيسي للبوست إن وجد
        const mainMediaFile = (req.files && Array.isArray(req.files))
            ? req.files.find(f => f.fieldname === 'media')
            : req.file;

        // استخراج ملفات صور التعليقات إن وجدت
        const commentFiles = (req.files && Array.isArray(req.files))
            ? req.files.filter(f => f.fieldname && f.fieldname.startsWith('comment_image_'))
            : [];

        // تحليل مصفوفة التعليقات المتعددة
        let parsedComments = [];
        if (comments) {
            try {
                parsedComments = typeof comments === 'string' ? JSON.parse(comments) : comments;
            } catch (e) {
                console.warn('Could not parse comments JSON:', e);
            }
        }
        if (!Array.isArray(parsedComments)) parsedComments = [];
        if (parsedComments.length === 0 && firstComment && firstComment.trim()) {
            parsedComments = [{ text: firstComment.trim() }];
        }

        // إذا كان هناك ملف ميديا رئيسي أو صور تعليقات، نحتاج بيانات Cloudinary الخاصة بالمستخدم
        if (mainMediaFile || commentFiles.length > 0) {
            let customCloudinary = null;
            if (userCloudinary) {
                try {
                    const uc = typeof userCloudinary === 'string' ? JSON.parse(userCloudinary) : userCloudinary;
                    if (uc.cloudName && uc.apiKey && uc.apiSecret) {
                        customCloudinary = uc;
                    }
                } catch (e) {}
            }

            if (!customCloudinary && userId && supabaseAdmin) {
                try {
                    const { data: userRow } = await supabaseAdmin
                        .from('user_profiles')
                        .select('auto_reply_config')
                        .eq('id', userId)
                        .maybeSingle();
                    if (userRow?.auto_reply_config?.cloudinary?.cloudName && 
                        userRow?.auto_reply_config?.cloudinary?.apiKey && 
                        userRow?.auto_reply_config?.cloudinary?.apiSecret) {
                        customCloudinary = userRow.auto_reply_config.cloudinary;
                    }
                } catch (dbErr) {
                    console.warn('Error fetching user Cloudinary from DB:', dbErr.message);
                }
            }

            if (!customCloudinary || !customCloudinary.cloudName || !customCloudinary.apiKey || !customCloudinary.apiSecret) {
                return res.status(400).json({
                    success: false,
                    message: '⚠️ لرفع الصور والفيديوهات أو إرفاق صور في التعليقات، يرجى إدخال بيانات حساب Cloudinary السحابي المجاني الخاص بك في نافذة الإعدادات أولاً (Cloud Name, API Key, API Secret).'
                });
            }

            // رفع الميديا الرئيسية للبوست
            if (mainMediaFile) {
                console.log(`[Cloudinary] جاري رفع الميديا لسحابة المستخدم (${customCloudinary.cloudName}) من الذاكرة: ${mainMediaFile.originalname}`);
                const isVideo = mainMediaFile.mimetype.startsWith('video/');
                
                const uploadOptions = {
                    resource_type: isVideo ? 'video' : 'image',
                    folder: 'socialflow_uploads',
                    cloud_name: customCloudinary.cloudName.trim(),
                    api_key: customCloudinary.apiKey.trim(),
                    api_secret: customCloudinary.apiSecret.trim()
                };

                const base64Data = mainMediaFile.buffer.toString('base64');
                const dataUri = `data:${mainMediaFile.mimetype};base64,${base64Data}`;

                const uploadRes = await cloudinary.uploader.upload(dataUri, uploadOptions);
                cloudUrl = uploadRes.secure_url;
                mediaWidth = uploadRes.width;
                mediaHeight = uploadRes.height;
                console.log(`[Cloudinary] تم الرفع بنجاح على سحابة المستخدم! الرابط: ${cloudUrl} (أبعاد: ${mediaWidth}x${mediaHeight})`);
            }

            // رفع صور التعليقات التلقائية
            if (commentFiles.length > 0) {
                for (const cFile of commentFiles) {
                    const idxMatch = cFile.fieldname.match(/comment_image_(\d+)/);
                    if (idxMatch) {
                        const cIdx = parseInt(idxMatch[1], 10);
                        console.log(`[Cloudinary] جاري رفع صورة التعليق #${cIdx + 1}: ${cFile.originalname}`);
                        const base64CData = cFile.buffer.toString('base64');
                        const dataUriC = `data:${cFile.mimetype};base64,${base64CData}`;
                        const upCRes = await cloudinary.uploader.upload(dataUriC, {
                            resource_type: 'image',
                            folder: 'socialflow_comments',
                            cloud_name: customCloudinary.cloudName.trim(),
                            api_key: customCloudinary.apiKey.trim(),
                            api_secret: customCloudinary.apiSecret.trim()
                        });
                        if (!parsedComments[cIdx]) {
                            parsedComments[cIdx] = { text: '', imageUrl: upCRes.secure_url };
                        } else {
                            parsedComments[cIdx].imageUrl = upCRes.secure_url;
                        }
                        console.log(`[Cloudinary] تم رفع صورة التعليق #${cIdx + 1} بنجاح: ${upCRes.secure_url}`);
                    }
                }
            }
        }

        const postData = {
            id: 'post_' + Date.now(),
            userId: userId || null,
            content: content || '',
            customCaptions: parsedCustomCaptions,
            aspectRatio: aspectRatio || 'auto',
            firstComment: parsedComments[0]?.text || (firstComment || '').trim(),
            comments: parsedComments,
            mediaPath: null,
            mediaUrl: cloudUrl,
            mediaWidth,
            mediaHeight,
            mediaType: mainMediaFile ? mainMediaFile.mimetype : null,
            platforms: parsedPlatforms,
            facebookPlacements: parsedFbPlacements,
            instagramPlacements: parsedIgPlacements,
            pageId: pageId,
            pageAccessToken: pageAccessToken || null,
            igUserId: igUserId || null,
            metaToken: metaToken || null,
            isRecurring: req.body.isRecurring === 'true' || req.body.isRecurring === true,
            repeatInterval: req.body.repeatInterval || 'none',
            repeatEvery: parseInt(req.body.repeatEvery, 10) || 1,
            createdAt: new Date().toISOString()
        };

        // إذا كان المنشور مجدولاً:
        if (isScheduled === 'true' || isScheduled === true) {
            let normalizedTime = scheduledTime;
            if (scheduledTime && typeof scheduledTime === 'string') {
                if (!scheduledTime.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(scheduledTime)) {
                    const offsetMinutes = parseInt(req.body.timezoneOffset, 10);
                    if (!isNaN(offsetMinutes)) {
                        const localMs = new Date(scheduledTime + 'Z').getTime();
                        const utcDate = new Date(localMs + offsetMinutes * 60 * 1000);
                        if (!isNaN(utcDate.getTime())) normalizedTime = utcDate.toISOString();
                    } else {
                        const localMs = new Date(scheduledTime + 'Z').getTime();
                        const utcDate = new Date(localMs - 3 * 60 * 60 * 1000);
                        if (!isNaN(utcDate.getTime())) normalizedTime = utcDate.toISOString();
                    }
                }
            }
            postData.scheduledTime = normalizedTime;
            postData.status = 'PENDING';

            const posts = await getScheduledPosts();
            posts.push(postData);

            // إذا طلب المستخدم تكرار المنشور مسبقاً على جدول ومخطط المواعيد مباشرة
            const repeatGridCount = parseInt(req.body.repeatGridCount, 10) || 0;
            if (postData.isRecurring && repeatGridCount > 0) {
                let lastTime = postData.scheduledTime;
                for (let r = 1; r <= repeatGridCount; r++) {
                    const nextTime = calculateNextScheduledTime(lastTime, postData.repeatInterval, postData.repeatEvery);
                    lastTime = nextTime;
                    const repeatedPost = {
                        ...postData,
                        id: 'post_' + (Date.now() + r) + '_' + Math.random().toString(36).substr(2, 5),
                        scheduledTime: nextTime,
                        status: 'PENDING',
                        isRecurring: false,
                        createdAt: new Date().toISOString()
                    };
                    posts.push(repeatedPost);
                }
                console.log(`[Repeat on Grid] تم إنشاء ${repeatGridCount} منشورات مكررة على الجدول مباشرة.`);
            }

            await saveScheduledPosts(posts);

            return res.json({
                success: true,
                message: repeatGridCount > 0 
                    ? `تم حفظ المنشور وتكراره لـ ${repeatGridCount} مواعيد قادمة على الجدول مباشرة!`
                    : 'تم حفظ المنشور في جدول الانتظار السحابي بنجاح!',
                post: postData
            });
        }

        // إذا كان نشراً فورياً:
        console.log(`[نشر فوري] جاري النشر إلى المنصات: ${parsedPlatforms.join(', ')}`);
        const results = await executePublish(postData);

        // حفظ المنشور المنشور فوراً في السجل ليظهر في الكالندر وجدول المواعيد
        postData.status = 'PUBLISHED';
        postData.scheduledTime = new Date().toISOString();
        postData.publishedAt = new Date().toISOString();
        postData.publishResults = results;
        try {
            const allPosts = await getScheduledPosts();
            allPosts.push(postData);
            await saveScheduledPosts(allPosts);
        } catch (e) {
            console.warn('Could not save published post to history:', e.message);
        }

        return res.json({
            success: true,
            message: 'تمت معالجة النشر وحفظه في سجل المواعيد بنجاح!',
            post: postData,
            results
        });

    } catch (err) {
        console.error('Error publishing:', err);
        return res.status(500).json({ success: false, message: err.message || 'حدث خطأ أثناء معالجة النشر.' });
    }
});

// 3. مسار جلب المنشورات المجدولة وسجل المنشورات (GET /api/scheduled)
app.get('/api/scheduled', async (req, res) => {
    try {
        const userId = req.query.userId;
        let all = await getScheduledPosts();
        if (userId) {
            all = all.filter(p => !p.userId || p.userId === userId);
        }
        if (req.query.all === 'true') {
            return res.json(all);
        }
        const posts = all.filter(p => p.status === 'PENDING');
        res.json(posts);
    } catch {
        res.json([]);
    }
});

// 4. مسار تعديل المنشور (سواء مجدول PENDING أو منشور بالفعل PUBLISHED)
app.put('/api/scheduled/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { 
            content, 
            scheduledTime, 
            customCaptions, 
            firstComment, 
            comments,
            platforms,
            facebookPlacements,
            instagramPlacements
        } = req.body;
        const posts = await getScheduledPosts();
        const post = posts.find(p => p.id === id);

        if (!post) {
            return res.status(404).json({ success: false, message: 'المنشور غير موجود.' });
        }

        if (content !== undefined) post.content = content;
        if (customCaptions !== undefined) post.customCaptions = customCaptions;
        if (firstComment !== undefined) post.firstComment = firstComment;
        if (comments !== undefined) post.comments = comments;

        // تعديل المنصات المستهدفة
        if (platforms !== undefined) {
            let parsedPlats = platforms;
            if (typeof parsedPlats === 'string') {
                try { parsedPlats = JSON.parse(parsedPlats); } catch { parsedPlats = [parsedPlats]; }
            }
            if (Array.isArray(parsedPlats)) {
                post.platforms = parsedPlats;
            }
        }

        // تعديل أماكن النشر على فيسبوك (بوست / ستوري)
        if (facebookPlacements !== undefined) {
            let parsedFb = facebookPlacements;
            if (typeof parsedFb === 'string') {
                try { parsedFb = JSON.parse(parsedFb); } catch { parsedFb = [parsedFb]; }
            }
            if (Array.isArray(parsedFb)) {
                post.facebookPlacements = parsedFb;
            }
        }

        // تعديل أماكن النشر على انستجرام (بوست / ستوري)
        if (instagramPlacements !== undefined) {
            let parsedIg = instagramPlacements;
            if (typeof parsedIg === 'string') {
                try { parsedIg = JSON.parse(parsedIg); } catch { parsedIg = [parsedIg]; }
            }
            if (Array.isArray(parsedIg)) {
                post.instagramPlacements = parsedIg;
            }
        }

        // تعديل إعدادات تكرار المنشور
        if (req.body.isRecurring !== undefined) post.isRecurring = req.body.isRecurring === 'true' || req.body.isRecurring === true;
        if (req.body.repeatInterval !== undefined) post.repeatInterval = req.body.repeatInterval;
        if (req.body.repeatEvery !== undefined) post.repeatEvery = parseInt(req.body.repeatEvery, 10) || 1;

        // إذا كان مجدولاً، يمكن تعديل وقت الجدولة
        if (post.status === 'PENDING' && scheduledTime) {
            let normalizedTime = scheduledTime;
            if (typeof scheduledTime === 'string') {
                if (!scheduledTime.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(scheduledTime)) {
                    const offsetMinutes = parseInt(req.body.timezoneOffset, 10);
                    if (!isNaN(offsetMinutes)) {
                        const localMs = new Date(scheduledTime + 'Z').getTime();
                        const utcDate = new Date(localMs + offsetMinutes * 60 * 1000);
                        if (!isNaN(utcDate.getTime())) normalizedTime = utcDate.toISOString();
                    } else {
                        const localMs = new Date(scheduledTime + 'Z').getTime();
                        const utcDate = new Date(localMs - 3 * 60 * 60 * 1000);
                        if (!isNaN(utcDate.getTime())) normalizedTime = utcDate.toISOString();
                    }
                }
            }
            post.scheduledTime = normalizedTime;
        }

        // إذا كان تم نشره، محاولة تحديث نصه مباشرة على فيسبوك
        let liveUpdated = false;
        if (post.status === 'PUBLISHED' && post.pageId && content) {
            try {
                let token = post.pageAccessToken;
                if (!token) token = await resolvePageToken(post.pageId);
                const fbTargetId = post.publishResults?.facebook?.feed?.id || post.publishResults?.facebook?.post_id || post.publishResults?.facebook?.id || (post.id.startsWith('post_') ? null : post.id);

                if (fbTargetId && token) {
                    const fbRes = await fetch(`https://graph.facebook.com/v21.0/${fbTargetId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: content,
                            access_token: token.trim()
                        })
                    });
                    const fbData = await fbRes.json();
                    if (fbData.success) liveUpdated = true;
                }
            } catch (e) {
                console.warn('Could not update live post on Facebook:', e.message);
            }
        }

        await saveScheduledPosts(posts);

        const msg = liveUpdated 
            ? 'تم تحديث المنشور بنجاح على فيسبوك وفي سجل المواعيد!'
            : 'تم تحديث المنشور بنجاح في سجل المواعيد!';

        res.json({ success: true, message: msg, post, liveUpdated });
    } catch (err) {
        console.error('Error updating post:', err);
        res.status(500).json({ success: false, message: 'تعذر تعديل المنشور.' });
    }
});

// 5. مسار حذف المنشور (مجدول أو منشور) مع خيار الحذف الحي من فيسبوك وإنستجرام
app.delete('/api/scheduled/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const deleteFromMeta = req.query.deleteFromMeta === 'true';
        let posts = await getScheduledPosts();
        const post = posts.find(p => p.id === id);

        if (post && post.status === 'PUBLISHED' && deleteFromMeta && post.pageId) {
            try {
                let token = post.pageAccessToken;
                if (!token) token = await resolvePageToken(post.pageId);

                // حذف من فيسبوك
                const fbId = post.publishResults?.facebook?.feed?.id || post.publishResults?.facebook?.post_id || post.publishResults?.facebook?.id || (post.id.startsWith('post_') ? null : post.id);
                if (fbId && token) {
                    await fetch(`https://graph.facebook.com/v21.0/${fbId}?access_token=${token.trim()}`, { method: 'DELETE' });
                }

                // حذف من إنستجرام
                const igId = post.publishResults?.instagram?.feed?.id || post.publishResults?.instagram?.id;
                if (igId && token) {
                    await fetch(`https://graph.facebook.com/v21.0/${igId}?access_token=${token.trim()}`, { method: 'DELETE' });
                }
            } catch (metaErr) {
                console.warn('Could not delete post from Meta:', metaErr.message);
            }
        }

        posts = posts.filter(p => p.id !== id);
        if (supabaseAdmin) {
            try {
                await supabaseAdmin.from('scheduled_posts').delete().eq('id', id);
            } catch (supaErr) {
                console.warn('Error deleting post from Supabase:', supaErr.message);
            }
        }
        await saveScheduledPosts(posts);
        res.json({ success: true, message: deleteFromMeta ? 'تم حذف المنشور من السجل ومن السوشيال ميديا بنجاح.' : 'تم حذف المنشور من جدول المواعيد.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'تعذر حذف المنشور.' });
    }
});

// 5.5 مسار تكرار المنشور المجدول على جدول ومخطط المواعيد (Repeat Scheduled Post on Schedule Grid)
app.post('/api/scheduled/repeat', async (req, res) => {
    try {
        const { postId, daysCount, intervalDays, targetDates, targetTime, timezoneOffset } = req.body;
        if (!postId) {
            return res.status(400).json({ success: false, message: 'معرف المنشور مطلوب للتكرار.' });
        }

        const posts = await getScheduledPosts();
        const basePost = posts.find(p => String(p.id) === String(postId));
        if (!basePost) {
            return res.status(404).json({ success: false, message: 'المنشور المطلوب تكراره غير موجود.' });
        }

        const baseTimeIso = basePost.scheduledTime || basePost.publishedAt || basePost.createdAt || new Date().toISOString();
        const baseDate = new Date(baseTimeIso);

        const newPosts = [];
        let scheduledTimes = [];

        if (Array.isArray(targetDates) && targetDates.length > 0) {
            for (const dStr of targetDates) {
                const [y, m, day] = dStr.split('-').map(Number);
                let d = new Date(baseDate);
                d.setUTCFullYear(y, m - 1, day);

                if (targetTime && typeof targetTime === 'string' && targetTime.includes(':')) {
                    const [h, min] = targetTime.split(':').map(Number);
                    const offset = parseInt(timezoneOffset, 10);
                    if (!isNaN(offset)) {
                        const localD = new Date(Date.UTC(y, m - 1, day, h, min, 0));
                        d = new Date(localD.getTime() + offset * 60 * 1000);
                    } else {
                        d.setUTCHours(h, min, 0, 0);
                    }
                }
                scheduledTimes.push(d.toISOString());
            }
        } else {
            const count = Math.min(Math.max(parseInt(daysCount, 10) || 1, 1), 60);
            const step = Math.max(parseInt(intervalDays, 10) || 1, 1);

            let current = new Date(baseDate);
            for (let i = 0; i < count; i++) {
                current = new Date(current);
                current.setUTCDate(current.getUTCDate() + step);
                scheduledTimes.push(current.toISOString());
            }
        }

        for (let i = 0; i < scheduledTimes.length; i++) {
            const timeIso = scheduledTimes[i];
            const newId = 'post_' + (Date.now() + i) + '_' + Math.random().toString(36).substr(2, 5);
            const clone = {
                ...basePost,
                id: newId,
                scheduledTime: timeIso,
                status: 'PENDING',
                isRecurring: false,
                createdAt: new Date().toISOString()
            };
            delete clone.publishedAt;
            delete clone.publishResults;

            newPosts.push(clone);
            posts.push(clone);
        }

        await saveScheduledPosts(posts);

        console.log(`[Repeat on Grid] تم تكرار المنشور ${postId} لـ ${newPosts.length} مواعيد جديدة على الجدول بنجاح.`);

        return res.json({
            success: true,
            message: `تم تكرار المنشور على الجدول بنجاح لـ ${newPosts.length} موعد قادم!`,
            count: newPosts.length,
            posts: newPosts
        });
    } catch (err) {
        console.error('Error repeating post on schedule grid:', err);
        return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تكرار المنشور: ' + err.message });
    }
});

// 6. مسار مزامنة المنشورات المنشورة سابقاً من صفحة فيسبوك لإظهارها في الكالندر
app.post('/api/posts/sync-page', async (req, res) => {
    try {
        const { pageId } = req.body;
        if (!pageId) return res.status(400).json({ success: false, message: 'يرجى تحديد الصفحة.' });

        let token = await resolvePageToken(pageId);
        if (!token) token = META_ACCESS_TOKEN;

        const url = `https://graph.facebook.com/v21.0/${pageId}/published_posts?fields=id,message,created_time,full_picture,attachments{media}&limit=30&access_token=${token.trim()}`;
        const fbRes = await fetch(url);
        const fbData = await fbRes.json();

        if (fbData.error) throw new Error(fbData.error.message);

        const currentPosts = await getScheduledPosts();
        let addedCount = 0;

        for (const item of (fbData.data || [])) {
            const exists = currentPosts.some(p => p.id === item.id || p.publishResults?.facebook?.id === item.id || p.publishResults?.facebook?.post_id === item.id);
            if (!exists) {
                currentPosts.push({
                    id: item.id,
                    content: item.message || '',
                    mediaUrl: item.full_picture || item.attachments?.data?.[0]?.media?.image?.src || null,
                    platforms: ['facebook'],
                    facebookPlacements: ['feed'],
                    instagramPlacements: [],
                    pageId: pageId,
                    status: 'PUBLISHED',
                    scheduledTime: item.created_time,
                    publishedAt: item.created_time,
                    createdAt: item.created_time
                });
                addedCount++;
            }
        }

        if (addedCount > 0) {
            await saveScheduledPosts(currentPosts);
        }

        res.json({ success: true, addedCount, total: currentPosts.length });
    } catch (err) {
        console.error('Error in /api/posts/sync-page:', err);
        res.status(500).json({ success: false, message: err.message || 'تعذر مزامنة منشورات الصفحة.' });
    }
});

// 5. مسار تنفيذ الجدولة التلقائية لـ Vercel Cron (GET /api/cron) مع قفل مانع للتكرار
const activePublishingIds = new Set();

app.get('/api/cron', async (req, res) => {
    console.log('[⏰ Vercel Cron] فحص المنشورات المجدولة...');
    try {
        const posts = await getScheduledPosts();
        const now = new Date();
        let updated = false;
        let publishedCount = 0;

        for (const post of posts) {
            if (post.status === 'PENDING' && new Date(post.scheduledTime) <= now) {
                // 1. قفل فوري في الذاكرة لمنع تكرار النشر في نفس العملية
                if (activePublishingIds.has(post.id)) {
                    console.log(`[⏰ Cron Lock] المنشور ${post.id} قيد المعالجة حالياً، تم تخطيه.`);
                    continue;
                }
                activePublishingIds.add(post.id);

                // 2. قفل ذري في Supabase لمنع أي خادم أو طلب متزامن من النشر المزدوج
                if (supabaseAdmin) {
                    try {
                        const { data: lockRows, error: lockErr } = await supabaseAdmin
                            .from('scheduled_posts')
                            .update({ status: 'PROCESSING' })
                            .eq('id', post.id)
                            .eq('status', 'PENDING')
                            .select('id');

                        if (lockErr || !lockRows || lockRows.length === 0) {
                            console.log(`[⏰ DB Lock] تم التقاط المنشور ${post.id} بواسطة طلب متزامن آخر، تم التخطي بأمان.`);
                            activePublishingIds.delete(post.id);
                            continue;
                        }
                    } catch (lockEx) {
                        console.warn('[⏰ Lock DB Note]:', lockEx.message);
                    }
                }

                post.status = 'PROCESSING';
                console.log(`[⏰ Cron] معالجة البوست المستحق: ${post.id}`);

                try {
                    // فحص اشتراك المستخدم صاحب البوست
                    if (post.userId && supabaseAdmin) {
                        try {
                            const { data: uRow } = await supabaseAdmin
                                .from('user_profiles')
                                .select('email, status, auto_reply_config')
                                .eq('id', post.userId)
                                .maybeSingle();

                            if (uRow && uRow.email !== 'raslan.meet@gmail.com') {
                                const uStatus = uRow.status || uRow.auto_reply_config?.account_status || 'pending';
                                const sub = uRow.auto_reply_config?.subscription;
                                const isExpired = sub?.expires_at && new Date(sub.expires_at) <= now;

                                if (uStatus !== 'active' || isExpired) {
                                    console.warn(`[⏰ Cron] تم إلغاء نشر المنشور ${post.id} لأن حساب المستخدم (${uRow.email}) معلق أو اشتراكه منتهٍ.`);
                                    post.status = 'CANCELLED';
                                    post.error = 'تم إلغاء النشر لعدم وجود اشتراك نشط.';
                                    updated = true;
                                    continue;
                                }
                            }
                        } catch (chkErr) {
                            console.warn('[⏰ Cron] خطأ فحص اشتراك المستخدم:', chkErr.message);
                        }
                    }

                    const results = await executePublish(post);
                    post.status = 'PUBLISHED';
                    post.publishedAt = now.toISOString();
                    post.publishResults = results;
                    if (results?.facebook?.post_id || results?.facebook?.id) {
                        const fbId = results.facebook.post_id || results.facebook.id;
                        const cleanId = String(fbId).includes('_') ? String(fbId).split('_')[1] : fbId;
                        post.postUrl = `https://www.facebook.com/RaslansMarketing/posts/${cleanId}`;
                    }

                    // إذا كان المنشور معداً للتكرار (Recurring Post)، يتم جدولة النسخة القادمة فورياً
                    if (post.isRecurring && post.repeatInterval && post.repeatInterval !== 'none') {
                        const nextScheduledIso = calculateNextScheduledTime(post.scheduledTime || post.publishedAt, post.repeatInterval, post.repeatEvery);
                        const nextPost = {
                            ...post,
                            id: 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                            status: 'PENDING',
                            scheduledTime: nextScheduledIso,
                            publishedAt: null,
                            publishResults: null,
                            postUrl: null,
                            groups_auto_shared: false,
                            groups_shared_at: null,
                            groups_shared_count: 0,
                            createdAt: new Date().toISOString()
                        };
                        posts.push(nextPost);
                        console.log(`🔄 [Cron تكرار] تم إنشاء الجدولة القادمة للمنشور ${post.id} بتاريخ: ${nextScheduledIso} (${post.repeatInterval})`);
                    }

                    updated = true;
                    publishedCount++;
                } catch (err) {
                    console.error('Error in Cron publishing:', err);
                    post.status = 'FAILED';
                    post.error = err.message;
                    updated = true;
                } finally {
                    activePublishingIds.delete(post.id);
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
    // استخراج قائمة التعليقات التلقائية بالكامل (تدعم التعليقات المتعددة والصور)
    const allComments = (Array.isArray(post.comments) && post.comments.length > 0)
        ? post.comments.filter(c => (c && c.text && c.text.trim()) || (c && c.imageUrl))
        : (firstComment ? [{ text: firstComment }] : []);

    // استخراج أماكن النشر المحددة (منشور عادي / ستوري / كلاهما)
    const fbPlacements = Array.isArray(post.facebookPlacements) && post.facebookPlacements.length > 0
        ? post.facebookPlacements 
        : (post.facebookPlacement === 'story' ? ['story'] : (post.facebookPlacement === 'both' ? ['feed', 'story'] : ['feed']));

    const igPlacements = Array.isArray(post.instagramPlacements) && post.instagramPlacements.length > 0
        ? post.instagramPlacements 
        : (post.instagramPlacement === 'story' ? ['story'] : (post.instagramPlacement === 'both' ? ['feed', 'story'] : ['feed']));

    // 1. فيسبوك (Facebook)
    if (post.platforms.includes('facebook') && post.pageId) {
        results.facebook = {};
        // أ. منشور عادي في الصفحة (Feed)
        if (fbPlacements.includes('feed')) {
            try {
                results.facebook.feed = await publishToFacebookPage(post.pageId, pageAccessToken, post, fbCaption);
                if (allComments.length > 0 && results.facebook.feed.success) {
                    const targetId = results.facebook.feed.post_id || results.facebook.feed.id;
                    results.facebook.comments = [];
                    for (let ci = 0; ci < allComments.length; ci++) {
                        const c = allComments[ci];
                        if (ci > 0) {
                            // انتظار 1.5 ثانية بين كل تعليق والآخر
                            await new Promise(r => setTimeout(r, 1500));
                        }
                        const cRes = await postFacebookComment(targetId, c.text, c.imageUrl, pageAccessToken);
                        results.facebook.comments.push(cRes);
                    }
                    results.facebook.firstComment = results.facebook.comments[0] || { success: true };
                }
            } catch (err) {
                results.facebook.feed = { success: false, error: err.message };
            }
        }
        // ب. ستوري في الصفحة (Story)
        if (fbPlacements.includes('story')) {
            try {
                results.facebook.story = await publishToFacebookStory(post.pageId, pageAccessToken, post);
            } catch (err) {
                results.facebook.story = { success: false, error: err.message };
            }
        }
        results.facebook.success = !!(results.facebook.feed?.success || results.facebook.story?.success);
        results.facebook.id = results.facebook.feed?.id || results.facebook.story?.id;
        results.facebook.post_id = results.facebook.feed?.post_id || results.facebook.story?.post_id;
        if (!results.facebook.success) {
            results.facebook.error = results.facebook.feed?.error || results.facebook.story?.error || 'فشل نشر محتوى فيسبوك';
        }
    }

    // 2. انستجرام (Instagram)
    if (post.platforms.includes('instagram')) {
        results.instagram = {};
        if (!igUserId) {
            results.instagram = { success: false, error: 'هذه الصفحة غير مربوطة بحساب انستجرام احترافي.' };
        } else {
            // أ. منشور عادي في الحساب (Feed)
            if (igPlacements.includes('feed')) {
                try {
                    results.instagram.feed = await publishToInstagram(igUserId, pageAccessToken, post, igCaption);
                    if (allComments.length > 0 && results.instagram.feed.success) {
                        results.instagram.comments = [];
                        for (let ci = 0; ci < allComments.length; ci++) {
                            const c = allComments[ci];
                            if (!c || !c.text || !c.text.trim()) continue;
                            if (ci > 0) {
                                // انتظار 2.5 ثانية بين تعليقات انستجرام
                                await new Promise(r => setTimeout(r, 2500));
                            }
                            const cRes = await postInstagramComment(results.instagram.feed.id, c.text.trim(), pageAccessToken);
                            results.instagram.comments.push(cRes);
                        }
                        results.instagram.firstComment = results.instagram.comments[0] || { success: true };
                    }
                } catch (err) {
                    results.instagram.feed = { success: false, error: err.message };
                }
            }
            // ب. ستوري في الحساب (Story)
            if (igPlacements.includes('story')) {
                try {
                    results.instagram.story = await publishToInstagramStory(igUserId, pageAccessToken, post);
                } catch (err) {
                    results.instagram.story = { success: false, error: err.message };
                }
            }
            results.instagram.success = !!(results.instagram.feed?.success || results.instagram.story?.success);
            results.instagram.id = results.instagram.feed?.id || results.instagram.story?.id;
            if (!results.instagram.success) {
                results.instagram.error = results.instagram.feed?.error || results.instagram.story?.error || 'فشل نشر محتوى انستجرام';
            }
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

    // إرسال إشعار التيليجرام الفوري مع أزرار النشر في الجروبات فقط إذا تم النشر الفعلي بنجاح
    const hasPublished = !!(results.facebook?.success || results.instagram?.success);
    if (hasPublished) {
        sendTelegramGroupNotification(post, results, post.userId).catch(e => {
            console.warn('[Telegram Dispatch Warning]:', e.message);
        });
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
    console.log(`[Instagram Container Created] تم إنشاء الحاوية: ${creationId} (نوع: ${isVideo ? 'فيديو' : 'صورة'})`);

    // الخطوة 2: فحص وتأكيد جهوزية انستجرام للوسائط (سواء صورة أو فيديو) لتجنب خطأ Media ID is not available
    const maxRetries = isVideo ? 25 : 12; // 50 ثانية للفيديو، 24 ثانية للصور
    let ready = false;
    for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
            const statusRes = await fetch(`https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${token}`);
            const statusData = await statusRes.json();
            console.log(`[Instagram Container Status] فحص ${i + 1}/${maxRetries} للحاوية ${creationId} - الحالة: ${statusData.status_code || 'جاري المعالجة'}`);
            if (statusData.status_code === 'FINISHED') {
                ready = true;
                break;
            }
            if (statusData.status_code === 'ERROR') {
                throw new Error('تعذر على انستجرام معالجة الوسائط (أبعاد أو صيغة غير مدعومة).');
            }
        } catch (err) {
            if (err.message && err.message.includes('تعذر على انستجرام معالجة الوسائط')) {
                throw err;
            }
            console.warn(`[Instagram Status Warning] محاولة ${i + 1}:`, err.message);
        }
    }

    // الخطوة 3: نشر الحاوية (Publish) مع إعادة المحاولة الذكية لتفادي أي تأخير لحظي في شبكة Meta
    let pubData = null;
    let publishError = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
        try {
            const pubParams = new URLSearchParams({
                creation_id: creationId,
                access_token: token
            });
            const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
                method: 'POST',
                body: pubParams
            });
            pubData = await pubRes.json();
            
            if (pubData.error) {
                const errMsg = pubData.error.message || '';
                // إذا كان الخطأ أن Media ID غير متاح بعد، ننتظر 3 ثوانٍ ونعيد المحاولة
                if (errMsg.includes('Media ID is not available') || errMsg.includes('Please wait') || pubData.error.code === 9007) {
                    console.warn(`[Instagram Publish Lag] محاولة ${attempt}/4: ${errMsg}. جاري الانتظار 3 ثوانٍ لإعادة المحاولة...`);
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }
                throw new Error(errMsg);
            }

            // تم النشر بنجاح
            console.log(`[Instagram Published Successfully] تم نشر بوست انستجرام بنجاح! ID: ${pubData.id}`);
            break;
        } catch (err) {
            publishError = err;
            if (err.message && (err.message.includes('Media ID is not available') || err.message.includes('Please wait')) && attempt < 4) {
                await new Promise(r => setTimeout(r, 3000));
                continue;
            }
            throw err;
        }
    }

    if (!pubData || !pubData.id) {
        throw publishError || new Error('تعذر نشر البوست على انستجرام.');
    }

    return { success: true, id: pubData.id };
}

// دالة النشر كـ Story على صفحة فيسبوك (Facebook Page Story)
async function publishToFacebookStory(pageId, token, post) {
    if (!post.mediaUrl && !post.mediaPath) {
        throw new Error('فيسبوك يشترط إرفاق صورة أو فيديو لنشر الستوري.');
    }

    const isVideo = post.mediaType && post.mediaType.startsWith('video/');

    if (isVideo) {
        console.log(`[Facebook Story] جاري نشر فيديو ستوري على صفحة فيسبوك: ${pageId}`);
        const initRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_stories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                upload_phase: 'start',
                access_token: token
            })
        });
        const initData = await initRes.json();
        if (initData.error) throw new Error(initData.error.message);

        const videoId = initData.video_id;
        const uploadUrl = initData.upload_url;

        let fileBuffer;
        if (post.mediaPath && fs.existsSync(post.mediaPath)) {
            fileBuffer = fs.readFileSync(post.mediaPath);
        } else if (post.mediaUrl) {
            const vidFetch = await fetch(post.mediaUrl);
            fileBuffer = Buffer.from(await vidFetch.arrayBuffer());
        }

        const upRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `OAuth ${token}`,
                'offset': '0',
                'file_size': String(fileBuffer.length)
            },
            body: fileBuffer
        });
        const upData = await upRes.json();
        if (upData.error) throw new Error(upData.error.message);

        const finishRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_stories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                upload_phase: 'finish',
                video_id: videoId,
                access_token: token
            })
        });
        const finishData = await finishRes.json();
        if (finishData.error) throw new Error(finishData.error.message);
        return { success: true, id: finishData.id || videoId, post_id: finishData.post_id };
    } else {
        console.log(`[Facebook Story] جاري نشر صورة ستوري على صفحة فيسبوك: ${pageId}`);
        let photoId = null;
        if (post.mediaUrl) {
            const upRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: post.mediaUrl,
                    published: false,
                    access_token: token
                })
            });
            const upData = await upRes.json();
            if (upData.error) throw new Error(upData.error.message);
            photoId = upData.id;
        } else if (post.mediaPath && fs.existsSync(post.mediaPath)) {
            const formData = new FormData();
            const fileBlob = await fs.openAsBlob(post.mediaPath);
            formData.append('source', fileBlob, path.basename(post.mediaPath));
            formData.append('published', 'false');
            formData.append('access_token', token);
            const upRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
                method: 'POST',
                body: formData
            });
            const upData = await upRes.json();
            if (upData.error) throw new Error(upData.error.message);
            photoId = upData.id;
        }

        if (!photoId) throw new Error('تعذر رفع صورة الستوري إلى فيسبوك.');

        const storyRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photo_stories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                photo_id: photoId,
                access_token: token
            })
        });
        const storyData = await storyRes.json();
        if (storyData.error) throw new Error(storyData.error.message);
        return { success: true, id: storyData.id || photoId, post_id: storyData.post_id };
    }
}

// دالة النشر كـ Story على انستجرام (Instagram Story)
async function publishToInstagramStory(igUserId, token, post) {
    if (!post.mediaUrl) {
        throw new Error('انستجرام يشترط إرفاق صورة أو فيديو لنشر الستوري.');
    }

    const isVideo = post.mediaType && post.mediaType.startsWith('video/');
    console.log(`[Instagram Story] جاري إنشاء حاوية ستوري لإنستجرام: ${igUserId}`);

    const params = new URLSearchParams({
        media_type: 'STORIES',
        access_token: token
    });

    if (isVideo) {
        params.append('video_url', post.mediaUrl);
    } else {
        const safeImageUrl = getInstagramSafeImageUrl(post.mediaUrl, post.mediaWidth, post.mediaHeight, post.aspectRatio);
        params.append('image_url', safeImageUrl);
    }

    const createRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
        method: 'POST',
        body: params
    });
    const createData = await createRes.json();
    if (createData.error) throw new Error(createData.error.message);

    const creationId = createData.id;

    // انتظار معالجة انستجرام للستوري
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
            throw new Error('تعذر على انستجرام معالجة وسائط الستوري.');
        }
    }

    if (!ready) {
        throw new Error('استغرق انستجرام وقتاً أطول من المعتاد لتجهيز الستوري.');
    }

    // نشر ستوري انستجرام مع إعادة المحاولة لتجنب التأخير
    let pubData = null;
    let publishError = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
        try {
            const pubParams = new URLSearchParams({
                creation_id: creationId,
                access_token: token
            });
            const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
                method: 'POST',
                body: pubParams
            });
            pubData = await pubRes.json();
            if (pubData.error) {
                const errMsg = pubData.error.message || '';
                if ((errMsg.includes('Media ID is not available') || errMsg.includes('Please wait')) && attempt < 4) {
                    console.warn(`[Instagram Story Lag] محاولة ${attempt}/4: ${errMsg}. جاري الانتظار 3 ثوانٍ...`);
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }
                throw new Error(errMsg);
            }
            break;
        } catch (err) {
            publishError = err;
            if (err.message && (err.message.includes('Media ID is not available') || err.message.includes('Please wait')) && attempt < 4) {
                await new Promise(r => setTimeout(r, 3000));
                continue;
            }
            throw err;
        }
    }

    if (!pubData || !pubData.id) {
        throw publishError || new Error('تعذر نشر ستوري انستجرام.');
    }

    return { success: true, id: pubData.id };
}



// دالة نشر تعليق على منشور فيسبوك (تدعم النص وإرفاق صورة اختيارية عبر attachment_url)
async function postFacebookComment(targetId, message, imageUrlOrToken, maybeToken) {
    let actualToken = maybeToken;
    let actualImageUrl = null;

    if (!maybeToken) {
        // تم استدعاء الدالة بـ 3 معاملات قديمة: (targetId, message, token)
        actualToken = imageUrlOrToken;
    } else {
        // تم استدعاء الدالة بـ 4 معاملات: (targetId, message, imageUrl, token)
        actualImageUrl = imageUrlOrToken;
        actualToken = maybeToken;
    }

    try {
        console.log(`[Facebook Comment] جاري إضافة تعليق على: ${targetId}${actualImageUrl ? ' مع صورة مرفقة' : ''}`);
        const payload = {
            access_token: actualToken
        };
        if (message) payload.message = message;
        if (actualImageUrl) payload.attachment_url = actualImageUrl;

        const res = await fetch(`https://graph.facebook.com/v21.0/${targetId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        console.log(`[Facebook Comment] تم إضافة التعليق بنجاح! ID: ${data.id}`);
        return { success: true, id: data.id };
    } catch (err) {
        console.error('Error in Facebook comment:', err);
        return { success: false, error: err.message };
    }
}

// دالة التعليق الأول على منشور انستجرام مع تأخير ذكي وإعادة المحاولة التلقائية
async function postInstagramComment(mediaId, message, token) {
    if (!mediaId || !message) {
        return { success: false, error: 'معرف المنشور أو نص التعليق غير موجود' };
    }

    // ننتظر 3 ثوانٍ للسماح لسيرفرات انستجرام بتسجيل المنشور على شبكتها قبل كتابة التعليق الأول
    console.log(`[Instagram Comment] انتظار 3 ثوانٍ لتأكيد جهوزية المنشور (${mediaId}) لاستقبال التعليق الأول...`);
    await new Promise(r => setTimeout(r, 3000));

    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            console.log(`[Instagram Comment] محاولة ${attempt}/3 لإضافة التعليق الأول على المنشور: ${mediaId}`);
            const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    access_token: token
                })
            });
            const data = await res.json();
            if (data.error) {
                const errMsg = data.error.message || 'خطأ غير معروف في تعليق انستجرام';
                console.warn(`[Instagram Comment Warning] محاولة ${attempt}/3 فشلت: ${errMsg}`);
                lastError = new Error(errMsg);
                if (attempt < 3) {
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }
                throw lastError;
            }
            console.log(`[Instagram Comment] تم إضافة التعليق بنجاح على انستجرام! ID: ${data.id}`);
            return { success: true, id: data.id };
        } catch (err) {
            lastError = err;
            if (attempt < 3) {
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }
    return { success: false, error: lastError?.message || 'تعذر إضافة التعليق الأول على انستجرام بعد 3 محاولات' };
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

                    // فحص اشتراك المستخدم
                    if (post.userId && supabaseAdmin) {
                        try {
                            const { data: uRow } = await supabaseAdmin
                                .from('user_profiles')
                                .select('email, status, auto_reply_config')
                                .eq('id', post.userId)
                                .maybeSingle();

                            if (uRow && uRow.email !== 'raslan.meet@gmail.com') {
                                const uStatus = uRow.status || uRow.auto_reply_config?.account_status || 'pending';
                                const sub = uRow.auto_reply_config?.subscription;
                                const isExpired = sub?.expires_at && new Date(sub.expires_at) <= now;

                                if (uStatus !== 'active' || isExpired) {
                                    console.warn(`[⏰ محلي] تم إلغاء نشر المنشور ${post.id} لعدم وجود اشتراك نشط.`);
                                    post.status = 'CANCELLED';
                                    post.error = 'تم إلغاء النشر لعدم وجود اشتراك نشط.';
                                    updated = true;
                                    continue;
                                }
                            }
                        } catch (chkErr) {}
                    }

                    try {
                        await executePublish(post);
                        post.status = 'PUBLISHED';
                        post.publishedAt = now.toISOString();

                        // إذا كان المنشور معداً للتكرار (Recurring Post)، يتم جدولة النسخة القادمة فورياً
                        if (post.isRecurring && post.repeatInterval && post.repeatInterval !== 'none') {
                            const nextScheduledIso = calculateNextScheduledTime(post.scheduledTime || post.publishedAt, post.repeatInterval, post.repeatEvery);
                            const nextPost = {
                                ...post,
                                id: 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                                status: 'PENDING',
                                scheduledTime: nextScheduledIso,
                                publishedAt: null,
                                publishResults: null,
                                postUrl: null,
                                groups_auto_shared: false,
                                groups_shared_at: null,
                                groups_shared_count: 0,
                                createdAt: new Date().toISOString()
                            };
                            posts.push(nextPost);
                            console.log(`🔄 [Local تكرار] تم إنشاء الجدولة القادمة للمنشور ${post.id} بتاريخ: ${nextScheduledIso} (${post.repeatInterval})`);
                        }

                        updated = true;
                    } catch (err) {
                        console.error('Error publishing scheduled post:', err);
                        post.status = 'FAILED';
                        post.error = err.message;
                        updated = true;
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

    // وركر تنشيط دوري لـ Supabase كل 12 ساعة في بيئة التشغيل المستمر (VPS / Local)
    if (supabaseAdmin) {
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        setInterval(async () => {
            try {
                console.log('[⏰ Supabase Keep-Alive Worker] تشغيل الفحص الدوري لتنشيط Supabase...');
                const result = await pingSupabaseKeepAlive();
                console.log('[⏰ Supabase Keep-Alive Result]:', result.success ? `نشط ومستيقظ (${result.latency})` : result.error);
            } catch (e) {
                console.error('Error in Keep-Alive worker:', e);
            }
        }, TWELVE_HOURS);
    }
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

