const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const os = require('os');

const CLIENT_CONFIG_PATH = path.join(__dirname, 'client_config.json');
let clientCfg = {};
if (fs.existsSync(CLIENT_CONFIG_PATH)) {
    try { clientCfg = JSON.parse(fs.readFileSync(CLIENT_CONFIG_PATH, 'utf8')); } catch (e) {}
}

const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe')
];
const CHROME_PATH = CHROME_PATHS.find(p => fs.existsSync(p)) || CHROME_PATHS[0];
const SESSION_DIR = path.join(os.homedir(), '.fb_bot_profile');
const CLEAN_GROUPS_PATH = path.join(__dirname, 'clean_groups.json');
const CONFIG_PATH = path.join(__dirname, 'auto_reply_config.json');

const isClient = Boolean(clientCfg.client_id);
const BOT_TOKEN = clientCfg.telegram_bot_token || (!isClient ? (process.env.TELEGRAM_BOT_TOKEN || '8946209406:AAFBRxNoA-bqkymvDddkOik2I6QUjMvRaa8') : '');
const CHAT_ID = clientCfg.telegram_chat_id || (!isClient ? (process.env.TELEGRAM_CHAT_ID || '1077637435') : '');
const GROQ_API_KEY = clientCfg.groq_api_key || (!isClient ? (process.env.GROQ_API_KEY || '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') : '');
const PAGE_NAME = clientCfg.page_name || (!isClient ? 'Raslans Marketing - رسلان للتسويق' : 'صفحتك على فيسبوك');

let isAbortRequested = false;
let activeBrowser = null;

function abortCurrentSharing() {
    isAbortRequested = true;
    console.log('🛑 [Abort Signal] تم استلام أمر إيقاف النشر من المستخدم.');
    if (activeBrowser) {
        try { activeBrowser.close(); } catch (e) {}
    }
}

async function sendTelegramAlert(text) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.log('[Telegram Alert Skipped]: لم يتم ضبط توكن البوت أو معرف الدردشة في إعدادات العميل.');
        return false;
    }
    // 1. استخدام الخادم السحابي لضمان سرعة الوصول وتخطي حجب التيليجرام في بعض شبكات مصر
    try {
        let relayRes = await fetch('https://agent.raslans.net/api/telegram/relay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, bot_token: BOT_TOKEN, text: text, parse_mode: 'HTML' })
        }).catch(() => null);

        if (!relayRes || !relayRes.ok) {
            relayRes = await fetch('https://socialflow-olive.vercel.app/api/telegram/relay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, bot_token: BOT_TOKEN, text: text, parse_mode: 'HTML' })
            }).catch(() => null);
        }

        if (relayRes && relayRes.ok) {
            const relayData = await relayRes.json();
            if (relayData.success) return true;
        }
    } catch (e) {
        // إذا كان هناك أي مشكلة في الاتصال بالخادم، نجرب الإرسال المباشر
    }

    // 2. المحاولة المباشرة كبديل
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' })
        });
        return true;
    } catch (e) {
        console.error('Telegram direct error:', e.message);
    }
    return false;
}


// دالة توليد الخطاف التسويقي المشوق بالذكاء الاصطناعي عبر Groq (openai/gpt-oss-120b)
async function generateViralHookWithGroq(postCaption) {
    if (!postCaption || postCaption.trim().length < 10) {
        return 'ارتقِ بنشاطك التجاري وزود مبيعاتك بخطوات تسويقية مدروسة 🚀';
    }

    try {
        console.log('🤖 جاري توليد خطاف تسويقي مشوق عبر ذكاء Groq (openai/gpt-oss-120b)...');
        const systemPrompt = `أنت خبير تسويق رقمي وكتابة إعلانية (Copywriting) متخصص في كتابة منشورات مجموعات فيسبوك في مصر والعالم العربي.
المهمة: اقرأ كابشن المنشور التالي، واستخرج "خطاف تسويقي مشوق" (Viral Marketing Hook) ليتم وضعه كعنوان للمنشور عند مشاركته في جروبات فيسبوك.

الشروط الإلزامية:
1. الجملة يجب أن تكون سؤالاً ذكياً ومثيراً للاهتمام أو جملة مشوقة تجذب انتباه أصحاب الأعمال والتجار وتدفعهم للتفاعل وفتح المنشور الأصلي.
2. لا تضع أي روابط (لا روابط صفحات ولا مواقع ولا أرقام هواتف نهائياً).
3. لا تضع هاشتاجات.
4. استخدم نبرة تسويقية احترافية وجذابة باللهجة المصرية أو الفصحى المبسطة مع إيموجي تسويقي مميز.
5. أخرج فقط نص الخطاف التسويقي في سطر أو سطرين بدون أي مقدمات أو شروحات.`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: postCaption }
                ],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        const data = await res.json();
        let generated = data.choices?.[0]?.message?.content?.trim();
        if (generated && generated.length > 10) {
            generated = generated.replace(/https?:\/\/\S+/g, '').replace(/#\S+/g, '').replace(/[\\*\\_]/g, '').trim();
            console.log(`✨ تم توليد الخطاف التسويقي بنجاح بواسطة Groq:\n"${generated}"`);
            return generated;
        }
    } catch (err) {
        console.warn('⚠️ تعذر استدعاء Groq، سيتم استخدام بديل ذكي:', err.message);
    }

    const firstLine = (postCaption || '').split('\n').map(l => l.trim()).filter(Boolean)[0] || '';
    return firstLine.replace(/https?:\/\/\S+/g, '').replace(/#\S+/g, '').trim() || 'خدمات تسويق وتوثيق الحسابات الإعلانية على Meta 🚀';
}

// دالة التأكد من تفعيل الملف الشخصي للصفحة التجارية (Raslans Marketing)
async function ensurePageProfileActive(page) {
    try {
        await page.goto('https://www.facebook.com/RaslansMarketing', { waitUntil: 'domcontentloaded', timeout: 35000 });
        await new Promise(r => setTimeout(r, 3500));

        const needsSwitch = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('div[role="button"]'));
            const btn = btns.find(b => {
                const aria = b.getAttribute('aria-label') || '';
                const txt = (b.innerText || '').trim();
                return aria === 'تبديل الآن' || txt === 'تبديل الآن' || aria === 'تبديل' || txt === 'تبديل';
            });
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });

        if (needsSwitch) {
            console.log('🔄 جاري التبديل لهوية الصفحة التجارية (Raslans Marketing)...');
            await new Promise(r => setTimeout(r, 2500));
            await page.evaluate(() => {
                const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                const sDialog = dialogs.find(d => (d.innerText || '').includes('تبديل الملفات الشخصية') || (d.innerText || '').includes('بدّل إلى Raslans Marketing'));
                if (sDialog) {
                    const btns = Array.from(sDialog.querySelectorAll('div[role="button"], div[tabindex="0"]'));
                    const switchBtn = btns.find(b => (b.innerText || '').trim() === 'تبديل');
                    if (switchBtn) switchBtn.click();
                }
            });
            await new Promise(r => setTimeout(r, 6000));
            console.log('✅ تم التبديل بنجاح للصفحة التجارية!');
        }
    } catch (e) {
        console.warn('Profile check note:', e.message);
    }
}

async function shareToGroups(post) {
    console.log(`\n======================================================`);
    console.log(`🚀 بدء المشاركة الرسمية في المجموعات باسم (Raslans Marketing)...`);
    console.log(`📌 رابط المنشور الأصلي: ${post.url}`);
    console.log(`======================================================\n`);

    if (!fs.existsSync(CLEAN_GROUPS_PATH)) {
        console.error('❌ لم يتم العثور على clean_groups.json');
        return { success: false };
    }

    const allGroups = JSON.parse(fs.readFileSync(CLEAN_GROUPS_PATH, 'utf8'));
    let cfg = {};
    try {
        cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (e) {}

    let startIndex = cfg.last_rotation_index || 0;
    if (startIndex >= allGroups.length) startIndex = 0;

    // تحديد هدف عدد المشاركات عشوائياً بين 10 إلى 15 مشاركة ناجحة ومؤكدة (متفاوت وليس ثابتاً)
    const TARGET_SUCCESS_COUNT = Math.floor(Math.random() * (15 - 10 + 1)) + 10;
    const MAX_ATTEMPTS = Math.min(50, allGroups.length);

    // 1. 🤖 توليد الخطاف التسويقي الذكي بالذكاء الاصطناعي من كابشن المنشور
    const headline = await generateViralHookWithGroq(post.content || post.hook);

    // 2. 📢 إشعار تيليجرام: "سأبدأ النشر الآن" مع تأكيد هدف المشاركات المتفاوت
    const startMsg = `🚀 <b>سأبدأ الآن النشر في مجموعات فيسبوك...</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏢 <b>الناشر:</b> Raslans Marketing - رسلان للتسويق\n` +
        `🎯 <b>الهدف المجدول لهذه الدفعة:</b> ${TARGET_SUCCESS_COUNT} مشاركة ناجحة ومؤكدة (متفاوتة بين 10 إلى 15) ✅\n` +
        `⏱️ <b>فاصل الأمان الذكي:</b> عشوائي بين 30 إلى 60 ثانية لحماية الحساب تماماً 🛡️\n` +
        `💡 <b>الخطاف التسويقي (من Groq AI):</b>\n<code>${headline}</code>\n\n` +
        `🛡️ <b>نظام المحاولات:</b> سيستمر البوت في المحاولة تباعاً حتى يصل إلى ${TARGET_SUCCESS_COUNT} مجموعة ناجحة تماماً.\n` +
        `⏳ <i>سأرسل لك إشعاراً فورياً بعد كل نشر ناجح...</i>`;
    await sendTelegramAlert(startMsg);

    isAbortRequested = false;
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        userDataDir: SESSION_DIR,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-notifications',
            '--window-size=1280,1000'
        ]
    });
    activeBrowser = browser;

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0');

    // 3. ضمان التصرف كهوية الصفحة التجارية Raslans Marketing
    await ensurePageProfileActive(page);

    let successCount = 0;
    let attemptCount = 0;
    let currentGroupIndex = startIndex;
    const sharedGroupNames = [];
    const targetPostUrl = post.url;

    // حلقة تكرارية مستمرة حتى نصل إلى الهدف
    while (successCount < TARGET_SUCCESS_COUNT && attemptCount < MAX_ATTEMPTS) {
        if (isAbortRequested) {
            console.log('\n🛑 [إيقاف فوري] تم استلام أمر إيقاف النشر في المجموعات من المستخدم.');
            break;
        }

        const group = allGroups[currentGroupIndex % allGroups.length];
        currentGroupIndex++;
        attemptCount++;

        // تجنب تكرار النشر في نفس الجروب في نفس الجلسة
        if (sharedGroupNames.some(g => g.name === group.name)) {
            continue;
        }

        console.log(`\n------------------------------------------------------`);
        console.log(`[محاولة ${attemptCount} | نجاح ${successCount}/${TARGET_SUCCESS_COUNT}] جاري المشاركة في: ${group.name}`);

        try {
            // الانتقال لصفحة Raslans Marketing الرسمية لتحديد منشور الصفحة الحقيقي ومنع أي التباس مع الفيد العام
            const targetPageUrl = 'https://www.facebook.com/RaslansMarketing';
            if (!page.url().includes('facebook.com/RaslansMarketing')) {
                await page.goto(targetPageUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
                await new Promise(r => setTimeout(r, 4000));
            } else {
                await page.reload({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
                await new Promise(r => setTimeout(r, 3000));
            }

            // إغلاق أي نوافذ عائمة قديمة
            await page.keyboard.press('Escape');
            await new Promise(r => setTimeout(r, 500));
            await page.evaluate(() => {
                const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                for (const d of dialogs) {
                    const closeBtn = d.querySelector('div[aria-label="إغلاق"], div[aria-label="Close"]');
                    if (closeBtn) closeBtn.click();
                }
            });
            await new Promise(r => setTimeout(r, 1000));

            // التمرير في الصفحة لتفعيل تحميل المنشورات
            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise(r => setTimeout(r, 1500));

            // الخطوة 1: البحث عن منشور الصفحة المستهدف بالتحديد والضغط على زر المشاركة داخله حصراً
            const shareCoords = await page.evaluate((targetUrl, postText) => {
                const articles = Array.from(document.querySelectorAll('div[role="feed"] > div, div[role="article"]'));
                
                let postIdentifier = null;
                const match = (targetUrl || '').match(/posts\/([a-zA-Z0-9]+)/);
                if (match) postIdentifier = match[1];

                let matchedArt = null;

                // 1. البحث حسب معرف المنشور في الروابط
                if (postIdentifier) {
                    matchedArt = articles.find(art => {
                        const links = Array.from(art.querySelectorAll('a')).map(a => a.href || '');
                        return links.some(l => l.includes(postIdentifier));
                    });
                }

                // 2. إذا لم نجد بالمعرف، نطابق بنص المنشور أو الكلمات الدلالية
                if (!matchedArt && postText && postText.length >= 8) {
                    const cleanWords = postText.replace(/[^\u0621-\u064A\w\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4).slice(0, 3);
                    matchedArt = articles.find(art => {
                        const t = (art.innerText || '').trim();
                        return cleanWords.length > 0 && cleanWords.every(word => t.includes(word));
                    });
                }

                // 3. كخيار أخير: نأخذ أول منشور رسمي لـ Raslans Marketing
                if (!matchedArt) {
                    matchedArt = articles.find(art => {
                        const t = (art.innerText || '').trim();
                        return t.includes('Raslans Marketing') && (t.includes('س') || t.includes('د') || t.includes('SocialBot'));
                    });
                }

                if (matchedArt) {
                    const btns = Array.from(matchedArt.querySelectorAll('div[role="button"]'));
                    const shareBtn = btns.find(b => {
                        const aria = (b.getAttribute('aria-label') || '');
                        const txt = (b.innerText || '').trim();
                        return aria.includes('شارك') || aria.includes('مشاركة') || txt === 'مشاركة';
                    });
                    if (shareBtn) {
                        shareBtn.scrollIntoView({ block: 'center', behavior: 'instant' });
                        const r = shareBtn.getBoundingClientRect();
                        if (r.width > 0 && r.height > 0) {
                            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
                        }
                    }
                }
                return null;
            }, targetPostUrl, post.content || post.hook);

            if (!shareCoords) {
                console.warn('⚠️ تعذر العثور على زر المشاركة بالمنشور، الانتقال للمحاولة التالية...');
                await new Promise(r => setTimeout(r, 2500));
                continue;
            }
            await page.mouse.click(shareCoords.x, shareCoords.y);

            // الخطوة 2: الضغط على خيار "مجموعة" داخل قائمة المشاركة مع الانتظار
            let groupCoords = null;
            for (let w = 0; w < 6; w++) {
                await new Promise(r => setTimeout(r, 800));
                groupCoords = await page.evaluate(() => {
                    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"], div[role="menu"]'));
                    for (const d of dialogs) {
                        const spans = Array.from(d.querySelectorAll('span, div'));
                        const target = spans.find(s => (s.innerText || '').trim() === 'مجموعة' && s.children.length === 0);
                        if (target) {
                            const btn = target.closest('div[role="button"]') || target.parentElement;
                            btn.scrollIntoView({ block: 'center' });
                            const r = btn.getBoundingClientRect();
                            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
                        }
                    }
                    return null;
                });
                if (groupCoords) break;
            }

            if (!groupCoords) {
                console.warn('⚠️ تعذر العثور على زر "مجموعة"، الانتقال للمحاولة التالية...');
                await new Promise(r => setTimeout(r, 2500));
                continue;
            }
            await page.mouse.click(groupCoords.x, groupCoords.y);
            await new Promise(r => setTimeout(r, 3500));

            // الخطوة 3: اختيار المجموعة من نافذة "مشاركة في مجموعة"
            let pickerFound = false;
            for (let w = 0; w < 6; w++) {
                pickerFound = await page.evaluate(() => {
                    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                    return dialogs.some(d => (d.innerText || '').includes('مشاركة في مجموعة') || (d.innerText || '').includes('كل المجموعات'));
                });
                if (pickerFound) break;
                await new Promise(r => setTimeout(r, 800));
            }

            const cleanSearchQuery = (group.name || '').replace(/مجموعة \d+/g, '').replace(/[\(\)\d]/g, '').trim();

            let selected = await page.evaluate((targetQuery, attemptNum) => {
                const clean = (t) => (t || '').replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '').trim();
                const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                const picker = dialogs.find(d => {
                    const t = clean(d.innerText);
                    return t.includes('مشاركة في مجموعة') || t.includes('كل المجموعات');
                });
                if (!picker) return { found: false };

                const allSpans = Array.from(picker.querySelectorAll('span, div'));
                const badges = allSpans.filter(el => {
                    const t = clean(el.innerText);
                    return (t === 'مجموعة عامة' || t === 'مجموعة خاصة' || t.includes('مجموعة عامة') || t.includes('مجموعة خاصة')) && el.children.length === 0;
                });

                const rows = [];
                for (const badge of badges) {
                    let container = badge.parentElement;
                    while (container && container !== picker) {
                        const lines = clean(container.innerText).split('\n').map(l => l.trim()).filter(Boolean);
                        if (lines.length >= 2 && !lines.includes('كل المجموعات') && !lines.includes('بحث عن مجموعات')) {
                            const rect = container.getBoundingClientRect();
                            if (rect.height > 30 && rect.height < 140 && rect.width > 200) {
                                rows.push({
                                    el: container,
                                    name: lines[0],
                                    badge: lines[1]
                                });
                                break;
                            }
                        }
                        container = container.parentElement;
                    }
                }

                let chosen = null;
                if (targetQuery && targetQuery.length >= 3) {
                    chosen = rows.find(r => r.name.includes(targetQuery) || targetQuery.includes(r.name));
                }
                if (!chosen && rows.length > 0) {
                    chosen = rows[attemptNum % rows.length];
                }

                if (chosen) {
                    chosen.el.scrollIntoView({ block: 'center', behavior: 'instant' });
                    const rect = chosen.el.getBoundingClientRect();
                    return { found: true, name: chosen.name, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                }

                return { found: false };
            }, cleanSearchQuery, attemptCount);

            if (!selected.found && cleanSearchQuery.length >= 3) {
                const searchInput = await page.$('input[placeholder*="بحث عن مجموعات"]');
                if (searchInput) {
                    await searchInput.click();
                    await page.keyboard.down('Control');
                    await page.keyboard.press('KeyA');
                    await page.keyboard.up('Control');
                    await page.keyboard.press('Backspace');
                    await page.keyboard.type(cleanSearchQuery, { delay: 35 });
                    await new Promise(r => setTimeout(r, 2000));

                    selected = await page.evaluate((targetQuery) => {
                        const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                        const picker = dialogs.find(d => (d.innerText || '').includes('مشاركة في مجموعة') || (d.innerText || '').includes('كل المجموعات'));
                        if (!picker) return { found: false };

                        const badges = Array.from(picker.querySelectorAll('span, div')).filter(el => {
                            const t = (el.innerText || '').trim();
                            return (t.includes('مجموعة عامة') || t.includes('مجموعة خاصة')) && el.children.length === 0;
                        });

                        for (const badge of badges) {
                            let container = badge.parentElement;
                            while (container && container !== picker) {
                                const text = container.innerText || '';
                                const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                                if (lines.length >= 2) {
                                    const rect = container.getBoundingClientRect();
                                    return {
                                        found: true,
                                        name: lines[0],
                                        x: rect.left + rect.width / 2,
                                        y: rect.top + rect.height / 2
                                    };
                                }
                                container = container.parentElement;
                            }
                        }
                        return { found: false };
                    }, cleanSearchQuery);
                }
            }

            if (!selected.found) {
                console.warn(`⚠️ تعذر العثور على مجموعة لاختيارها، إغلاق النافذة والانتقال للتالي...`);
                await page.keyboard.press('Escape');
                await new Promise(r => setTimeout(r, 1500));
                continue;
            }

            console.log(`🎯 تم اختيار المجموعة: [${selected.name}] عند (${Math.round(selected.x)}, ${Math.round(selected.y)})`);
            await page.mouse.click(selected.x, selected.y);
            await new Promise(r => setTimeout(r, 4000));

            // الخطوة 4: كتابة الخطاف التسويقي داخل محرر المنشور
            let compInfo = null;
            for (let wait = 0; wait < 8; wait++) {
                compInfo = await page.evaluate(() => {
                    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                    const comp = dialogs.find(d => {
                        const txt = d.innerText || '';
                        return txt.includes('إنشاء منشور') && (txt.includes('نشر') || txt.includes('Post'));
                    });
                    if (!comp) return null;

                    // البحث عن صندوق الكتابة المرئي الحقيقي (تجاهل أي عناصر خفية ذات عرض 0)
                    const allBoxes = Array.from(comp.querySelectorAll('div[contenteditable="true"], div[role="textbox"]'));
                    let visibleBox = allBoxes.find(b => {
                        const r = b.getBoundingClientRect();
                        return r.width > 50 && r.height > 20;
                    });

                    let boxCoords = null;
                    if (visibleBox) {
                        const r = visibleBox.getBoundingClientRect();
                        boxCoords = { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height };
                    } else {
                        // بديل: البحث عن العنصر المحتوي على placeholder "إنشاء منشور عام"
                        const spans = Array.from(comp.querySelectorAll('span, div'));
                        const ph = spans.find(s => (s.innerText || '').includes('إنشاء منشور عام') && s.children.length === 0);
                        if (ph) {
                            const r = ph.getBoundingClientRect();
                            boxCoords = { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height };
                        }
                    }

                    const btns = Array.from(comp.querySelectorAll('div[role="button"], button'));
                    const postBtn = btns.find(b => {
                        const t = (b.innerText || '').trim();
                        return t === 'نشر' || t === 'Post';
                    });
                    let postCoords = null;
                    if (postBtn) {
                        const r = postBtn.getBoundingClientRect();
                        postCoords = {
                            x: r.left + r.width / 2,
                            y: r.top + r.height / 2,
                            disabled: postBtn.getAttribute('aria-disabled') === 'true'
                        };
                    }

                    return { boxCoords, postCoords };
                });

                if (compInfo && compInfo.boxCoords && compInfo.postCoords) break;
                await new Promise(r => setTimeout(r, 800));
            }

            if (!compInfo || !compInfo.boxCoords) {
                console.warn('⚠️ تعذر العثور على نافذة محرر المنشور أو مربع النص المرئي، إغلاق المحاولة...');
                await page.keyboard.press('Escape');
                await new Promise(r => setTimeout(r, 1500));
                continue;
            }

            // كتابة الهوك في محرر المنشور
            console.log(`✍️ جاري كتابة الخطاف التسويقي: "${headline.substring(0, 60)}..."`);
            await page.mouse.click(compInfo.boxCoords.x, compInfo.boxCoords.y);
            await new Promise(r => setTimeout(r, 600));
            await page.keyboard.type(headline, { delay: 20 });
            await new Promise(r => setTimeout(r, 1500));

            // حفظ screenshot لحالة المحرر بعد كتابة النص للتشخيص
            try { await page.screenshot({ path: path.join(__dirname, `debug_composer_${attemptCount}.png`) }); } catch(e){}

            // البحث عن إحداثيات زر النشر المحدثة بعد الكتابة
            const freshPostBtn = await page.evaluate(() => {
                const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                for (const d of dialogs) {
                    const btns = Array.from(d.querySelectorAll('div[role="button"], button'));
                    const postBtn = btns.find(b => {
                        const txt = (b.innerText || '').trim();
                        return txt === 'نشر' || txt === 'Post';
                    });
                    if (postBtn) {
                        const r = postBtn.getBoundingClientRect();
                        return { x: r.left + r.width / 2, y: r.top + r.height / 2, disabled: postBtn.getAttribute('aria-disabled') === 'true' };
                    }
                }
                return null;
            });

            const postX = freshPostBtn ? freshPostBtn.x : compInfo.postCoords.x;
            const postY = freshPostBtn ? freshPostBtn.y : compInfo.postCoords.y;
            
            console.log(`🚀 الضغط على زر نشر عند (${Math.round(postX)}, ${Math.round(postY)})${freshPostBtn?.disabled ? ' [الزر معطل!]' : ''}...`);
            await page.mouse.click(postX, postY);

            // === تأكيد النشر: ننتظر ظهور toast نجاح حصرياً ===
            let isReallyPublished = false;
            let postPermalink = null;

            // ننتظر حتى 25 ثانية لظهور تأكيد النشر
            for (let wait = 0; wait < 25; wait++) {
                await new Promise(r => setTimeout(r, 1000));
                
                const check = await page.evaluate(() => {
                    // 1. هل الـ composer مازال مفتوح؟
                    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                    const composerStillOpen = dialogs.some(d => {
                        const txt = d.innerText || '';
                        return txt.includes('إنشاء منشور') && (txt.includes('نشر') || txt.includes('مشاركة في'));
                    });

                    // 2. البحث عن toast النجاح فقط في عناصر ARIA المخصصة للإشعارات
                    let toastFound = false;
                    let toastLink = null;
                    let toastText = '';
                    
                    // فقط العناصر المحددة كـ toast/alert (ليس كل divs الصفحة!)
                    const toastContainers = Array.from(document.querySelectorAll(
                        'div[role="alert"], div[aria-live="assertive"]'
                    ));
                    
                    for (const toast of toastContainers) {
                        const txt = (toast.innerText || '').trim();
                        // فقط نصوص قصيرة (التوست بيكون جملة أو اتنين، مش فيد كامل)
                        if (txt.length > 3 && txt.length < 200) {
                            if (txt.includes('تمت مشاركة') || txt.includes('تم نشر') || 
                                txt.includes('تمت المشاركة') || txt.includes('Posted') ||
                                txt.includes('Shared to') || txt.includes('Your post is now')) {
                                toastFound = true;
                                toastText = txt;
                                // التقاط الرابط من داخل التوست نفسه فقط
                                const links = Array.from(toast.querySelectorAll('a'));
                                for (const a of links) {
                                    const href = a.href || '';
                                    if (href.includes('/permalink/') || (href.includes('/groups/') && href.includes('/posts/'))) {
                                        toastLink = href;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }

                    return { composerStillOpen, toastFound, toastLink, toastText };
                });

                // لو لقينا toast نجاح → تأكيد حقيقي!
                if (check.toastFound) {
                    isReallyPublished = true;
                    if (check.toastLink) postPermalink = check.toastLink;
                    console.log(`🎉 تأكيد حقيقي! فيسبوك عرض toast نجاح: "${check.toastText}"`);
                    if (postPermalink) console.log(`🔗 رابط المنشور: ${postPermalink}`);
                    break;
                }

                // لو الـ composer مازال مفتوح → نستنى
                if (check.composerStillOpen) {
                    if (wait === 15) {
                        console.log('⏳ مازال الـ composer مفتوح بعد 15 ثانية...');
                        try { await page.screenshot({ path: path.join(__dirname, `debug_still_open_${attemptCount}.png`) }); } catch(e){}
                    }
                    continue;
                }

                // الـ composer أغلق → نتحقق من وجود toast نجاح أو إغلاق نظيف بدون أخطاء
                console.log('🔍 النافذة أغلقت - جاري فحص إشعار التأكيد وسلامة النشر...');
                let foundLateToast = false;
                for (let extra = 0; extra < 6; extra++) {
                    await new Promise(r => setTimeout(r, 1000));
                    const lateCheck = await page.evaluate(() => {
                        let found = false;
                        let link = null;
                        let text = '';
                        const toasts = Array.from(document.querySelectorAll(
                            'div[role="alert"], div[aria-live="assertive"]'
                        ));
                        for (const toast of toasts) {
                            const txt = (toast.innerText || '').trim();
                            if (txt.length > 3 && txt.length < 200 && 
                                (txt.includes('تمت مشاركة') || txt.includes('تم نشر') || 
                                 txt.includes('تمت المشاركة') || txt.includes('Posted') ||
                                 txt.includes('Shared to') || txt.includes('Your post is now') ||
                                 txt.includes('قيد المراجعة') || txt.includes('بانتظار موافقة'))) {
                                found = true;
                                text = txt;
                                const links = Array.from(toast.querySelectorAll('a'));
                                for (const a of links) {
                                    const href = a.href || '';
                                    if (href.includes('/permalink/') || (href.includes('/groups/') && href.includes('/posts/'))) {
                                        link = href;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                        return { found, link, text };
                    });
                    if (lateCheck.found) {
                        isReallyPublished = true;
                        if (lateCheck.link) postPermalink = lateCheck.link;
                        console.log(`🎉 تأكيد إشعار فيسبوك بعد ${extra + 1} ثانية: "${lateCheck.text}"`);
                        if (postPermalink) console.log(`🔗 رابط المنشور: ${postPermalink}`);
                        foundLateToast = true;
                        break;
                    }
                }
                
                // إذا أغلقت النافذة بدون toast، نتأكد أنه لم يظهر أي حظر أو خطأ
                if (!foundLateToast) {
                    const errorCheck = await page.evaluate(() => {
                        const bodyTxt = document.body.innerText || '';
                        const alerts = Array.from(document.querySelectorAll('div[role="alert"]')).map(a => a.innerText || '').join(' ');
                        const combined = bodyTxt + ' ' + alerts;
                        const isBlocked = combined.includes('تم تقييد حسابك') || combined.includes('أنت ممنوع مؤقتاً') || combined.includes('تعذر إكمال هذا الإجراء');
                        return { isBlocked };
                    });

                    if (errorCheck.isBlocked) {
                        console.warn(`❌ تم رصد رسالة تقييد أو خطأ من فيسبوك.`);
                        isReallyPublished = false;
                    } else {
                        // إغلاق سليم للمحرر بعد كتابة النص والضغط على نشر = نجاح الإرسال للمجموعة
                        isReallyPublished = true;
                        console.log(`✅ تم تأكيد إغلاق المحرر بنجاح وإرسال المشاركة إلى المجموعة [${selected.name}].`);
                    }
                }
                break;
            }

            // إذا لم يتم التأكيد
            if (!isReallyPublished) {
                console.warn(`❌ فشل النشر في هذه المجموعة، الانتقال للتالية...`);
                try { await page.screenshot({ path: path.join(__dirname, `debug_failed_${attemptCount}.png`) }); } catch(e){}
                await page.keyboard.press('Escape');
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            // تم النشر الفعلي الحقيقي المؤكد بنجاح
            successCount++;
            const finalGroupName = selected.name || group.name;

            // التقاط رابط الجروب الحقيقي من الصفحة الحالية بعد النشر
            let capturedGroupUrl = null;
            try {
                const currentPageUrl = page.url();
                if (currentPageUrl.includes('/groups/') && !currentPageUrl.includes('/search/')) {
                    // استخلاص رابط الجروب النظيف (بدون query params)
                    const groupMatch = currentPageUrl.match(/(https:\/\/www\.facebook\.com\/groups\/[^/?]+)/);
                    if (groupMatch) capturedGroupUrl = groupMatch[1] + '/';
                }
            } catch (e) {}

            // ترتيب الأولوية: permalink المنشور > رابط الجروب من الصفحة الحالية > رابط الجروب من JSON > رابط بحث
            const realGroupUrl = capturedGroupUrl 
                || (group.url && group.url.includes('/groups/') && !group.url.includes('/search/') ? group.url : null)
                || `https://www.facebook.com/groups/search/?q=${encodeURIComponent(finalGroupName)}`;
            const groupTrackingLink = postPermalink || realGroupUrl;

            if (postPermalink) {
                console.log(`🔗 رابط المنشور في الجروب: ${postPermalink}`);
            } else {
                console.log(`🔗 رابط الجروب (لم يتم التقاط permalink المنشور): ${realGroupUrl}`);
            }

            sharedGroupNames.push({
                name: finalGroupName,
                groupUrl: realGroupUrl,
                postUrl: groupTrackingLink
            });

            // 📢 إشعار تيليجرام نظيف ومؤكد بدون روابط معاينة مضللة
            const singleProgressMsg = `✅ <b>[${successCount}/${TARGET_SUCCESS_COUNT}] تم النشر بنجاح!</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `👥 <b>المجموعة:</b> ${finalGroupName}\n` +
                `🏢 <b>الناشر:</b> Raslans Marketing - رسلان للتسويق\n` +
                `🎯 <b>حالة التقدم:</b> (${successCount} من ${TARGET_SUCCESS_COUNT} مجموعات ناجحة)\n` +
                `⏰ <b>الوقت:</b> ${new Date().toLocaleTimeString('ar-EG')}\n` +
                `🛡️ تم إرسال المشاركة الرسمية بنجاح إلى فيسبوك.\n\n` +
                (successCount < TARGET_SUCCESS_COUNT 
                    ? `⏳ <i>جاري الانتظار كفاصل أمان ذكي (30-60 ثانية) قبل المجموعة التالية...</i>` 
                    : `🎉 <i>تم اكتمال هدف الـ ${TARGET_SUCCESS_COUNT} منشورات بنجاح تام!</i>`);
            await sendTelegramAlert(singleProgressMsg);


            await new Promise(r => setTimeout(r, 3000));

            // فاصل أمان عشوائي متفاوت بين 30 إلى 60 ثانية بين كل نشر ناجح لحماية الحساب
            if (successCount < TARGET_SUCCESS_COUNT) {
                const randomSec = Math.floor(Math.random() * (60 - 30 + 1)) + 30; // 30 إلى 60 ثانية عشوائياً
                console.log(`⏳ انتظار فاصل أمان عشوائي ${randomSec} ثانية قبل الانتقال للمجموعة التالية...`);
                for (let s = 0; s < randomSec; s++) {
                    if (isAbortRequested) break;
                    await new Promise(r => setTimeout(r, 1000));
                }
                if (isAbortRequested) break;
            }


        } catch (err) {
            console.error(`❌ خطأ أثناء مشاركة ${group.name}:`, err.message);
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    // تحديث مؤشر التدوير
    cfg.last_rotation_index = currentGroupIndex % allGroups.length;
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {}

    try { await browser.close(); } catch (e) {}
    activeBrowser = null;

    if (isAbortRequested) {
        console.log(`\n🛑 تم إيقاف المشاركة يدوياً بواسطة المستخدم. تم التوقف بعد ${successCount} مجموعة.`);
        const abortMsg = `🛑 <b>تم إيقاف المشاركة في مجموعات فيسبوك بنجاح!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⏹️ تم إيقاف العملية فوراً بناءً على طلبك.\n` +
            `📊 <b>ما تم إنجازه قبل الإيقاف:</b> نُشر في <b>${successCount} مجموعات</b> بنجاح.\n` +
            `🛡️ تم إغلاق المتصفح وحفظ التقدم بأمان.\n\n` +
            `💡 <i>عندما تريد النشر مجدداً، أرسل كلمة <b>انشر</b> أو <b>شغل</b>.</i>`;
        await sendTelegramAlert(abortMsg);
        return { success: true, count: successCount, stoppedByUser: true };
    }

    console.log(`\n🎉 اكتملت المهمة! نجحت المشاركة في ${successCount} مجموعات من أصل ${attemptCount} محاولات.`);

    // حفظ سجل التتبع في ملف share_history.json
    try {
        const HISTORY_FILE = path.join(__dirname, 'share_history.json');
        let history = [];
        if (fs.existsSync(HISTORY_FILE)) {
            try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch (e) {}
        }
        history.unshift({
            date: new Date().toISOString(),
            targetPostUrl,
            headline,
            successCount,
            totalAttempts: attemptCount,
            targetGoal: TARGET_SUCCESS_COUNT,
            groups: sharedGroupNames
        });
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 100), null, 2), 'utf8');
    } catch (e) {}

    // 4. 📢 إشعار الانتهاء الشامل النظيف
    const groupsList = sharedGroupNames.map((g, idx) => `${idx + 1}️⃣ ${g.name}`).join('\n');

    const finalReportMsg = `🎉 <b>انتهيت من مهمة النشر بنجاح 100%!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎯 <b>الهدف المحقق:</b> تم النشر بنجاح في <b>${successCount} مجموعات</b> (خلال ${attemptCount} محاولة).\n` +
        `🏢 جميع المشاركات تمت باسم: <b>Raslans Marketing - رسلان للتسويق</b>.\n` +
        `💡 <b>الخطاف التسويقي:</b>\n<code>${headline}</code>\n\n` +
        `👥 <b>قائمة المجموعات التي تم النشر فيها:</b>\n${groupsList || 'تم النشر في المجموعات بنجاح'}\n\n` +
        `🛡️ تم تحديث مؤشر التدوير تلقائياً لضمان مجموعات جديدة في المرة القادمة.\n` +
        `📊 <i>يمكنك التأكد مباشرة من زيادة عداد المشاركات على المنشور بصفحتك على فيسبوك.</i>`;
    await sendTelegramAlert(finalReportMsg);


    return { success: true, count: successCount, attempts: attemptCount, groups: sharedGroupNames, headline };

}

module.exports = { shareToGroups, generateViralHookWithGroq, sendTelegramAlert, abortCurrentSharing };

if (require.main === module) {
    const samplePost = {
        url: 'https://www.facebook.com/photo/?fbid=122107818032889779&set=a.122102545322889779',
        content: 'عايز نشاطك التجاري يظهر بشكل أقوى على خرائط جوجل؟ السر مش بس إنك تعمل Google Business Profile… السر إنك تعمله صح.'
    };
    shareToGroups(samplePost).catch(console.error);
}
