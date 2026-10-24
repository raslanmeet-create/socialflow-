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

// 2. مسار استقبال أحداث وتحديثات الويبهوك (POST /api/webhook)
app.post('/api/webhook', (req, res) => {
    try {
        const body = req.body;
        console.log('\n🔔 [Meta Webhook POST] استلام إشعار جديد من Meta:');
        console.log(JSON.stringify(body, null, 2));

        // الاستجابة الفورية لـ Meta بنجاح خلال 20 ثانية لتجنب إعادة الإرسال
        res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
        console.error('Error handling webhook event:', err);
        res.sendStatus(500);
    }
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

