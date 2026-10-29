const puppeteer = require('puppeteer-core');
const path = require('path');
const os = require('os');
const fs = require('fs');
require('dotenv').config();

const ACCOUNTS_FILE = path.join(__dirname, 'fb_booster_accounts.json');
const COMMENTS_FILE = path.join(__dirname, 'booster_comments.txt');
const BOOSTER_CONFIG_FILE = path.join(__dirname, 'fb_booster_config.json');
const PROFILES_DIR = path.join(__dirname, 'fb_profiles');

if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome SxS\\Application\\chrome.exe')
];
const CHROME_PATH = CHROME_PATHS.find(p => fs.existsSync(p)) || CHROME_PATHS[0];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let sendTelegramAlert = null;
try {
    const worker = require('./fb_auto_worker');
    sendTelegramAlert = worker.sendTelegramAlert;
} catch (e) {}

async function notifyTelegram(html) {
    if (typeof sendTelegramAlert === 'function') {
        try {
            await sendTelegramAlert(html);
        } catch (e) {}
    }
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// استخراج مفتاح Groq API
function getGroqApiKey() {
    if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
    try {
        const autoCfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'auto_reply_config.json'), 'utf8'));
        const pId = Object.keys(autoCfg.pages || {})[0];
        if (pId && autoCfg.pages[pId]?.groqApiKey) return autoCfg.pages[pId].groqApiKey;
    } catch (e) {}
    try {
        const clientCfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'client_config.json'), 'utf8'));
        if (clientCfg.groq_api_key) return clientCfg.groq_api_key;
    } catch (e) {}
    return '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';
}

// قراءة إعدادات المعزز
function loadBoosterConfig() {
    const defaults = {
        autoBoostNewPosts: true,
        randomizeTasks: true,
        useGroqAi: true,
        doLike: true,
        doComment: true,
        doShare: true,
        showBrowser: false,
        minDelaySec: 25,
        maxDelaySec: 45
    };
    if (!fs.existsSync(BOOSTER_CONFIG_FILE)) return defaults;
    try {
        return { ...defaults, ...JSON.parse(fs.readFileSync(BOOSTER_CONFIG_FILE, 'utf8')) };
    } catch (e) {
        return defaults;
    }
}

function saveBoosterConfig(cfg) {
    fs.writeFileSync(BOOSTER_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

// حالة المعزز الحالية
let boosterState = {
    isRunning: false,
    isAbortRequested: false,
    currentPostUrl: '',
    totalPosts: 0,
    currentPostIndex: 0,
    totalAccounts: 0,
    currentAccountIndex: 0,
    currentAccountName: '',
    statusText: 'جاهز للاستخدام',
    logs: []
};

let activeBrowser = null;

function addLog(msg, type = 'info') {
    const time = new Date().toLocaleTimeString('ar-EG', { hour12: false });
    const logItem = { time, message: msg, type };
    boosterState.logs.unshift(logItem);
    if (boosterState.logs.length > 150) boosterState.logs.pop();
    console.log(`[Booster ${time}] ${msg}`);
}

function loadAccounts() {
    if (!fs.existsSync(ACCOUNTS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

function saveAccounts(accounts) {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

function removeEmojis(text) {
    if (!text) return '';
    return text
        .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F?/gu, '')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}\u{FE0F}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function loadComments() {
    if (!fs.existsSync(COMMENTS_FILE)) {
        return ['ما شاء الله بالتوفيق والنجاح دائماً', 'شغل احترافي وممتاز جداً'];
    }
    const lines = fs.readFileSync(COMMENTS_FILE, 'utf8')
        .split('\n')
        .map(l => removeEmojis(l.trim()))
        .filter(l => l.length > 0 && !l.startsWith('#'));
    return lines;
}

function saveComments(commentsList) {
    const text = (commentsList || []).map(c => removeEmojis(c)).join('\n');
    fs.writeFileSync(COMMENTS_FILE, text, 'utf8');
}

// توليد تعليق ذكي وطبيعي عشوائياً عبر Groq AI بدون أي إيموجي نهائياً
async function generateGroqComment(postContent = '', toneIndex = 0) {
    const apiKey = getGroqApiKey();
    if (!apiKey) return null;

    const tones = [
        'إشادة قوية بالخدمة أو المحتوى وثقة بالتعامل ودعاء بالبركة والنجاح والتوفيق',
        'سؤال ذكي ومهتم عن التفاصيل أو الأسعار أو طريقة الاشتراك والحجز',
        'تأكيد عن تجربة سابقة ممتازة والثناء على سرعة الاستجابة والاحترافية',
        'تشجيع وإعجاب بالتصميم أو الفكرة وطلب الاستمرار في هذا المستوى الرائع',
        'مباركة بالعمل وشكر على تقديم قيمة مفيدة لأصحاب الأعمال والشركات'
    ];
    const chosenTone = tones[toneIndex % tones.length];

    const systemPrompt = `أنت مستخدم مصري/عربي حقيقي ونشط على فيسبوك.
المهمة: اكتب تعليقاً عفوياً وواقعياً ومختصراً جداً (سطر واحد فقط) على منشور فيسبوك لصفحة تجارية/تسويقية.
الأسلوب المطلوب لهذا الحساب: (${chosenTone}).
الشروط الصارمة:
1. اكتب بلهجة مصرية أو عربية عامية بسيطة واقعية وطبيعية تماماً كأنك شخص حقيقي يكتب من هاتفه.
2. ممنوع منعاً باتاً استخدام أي إيموجي أو رموز تعبيرية نهائياً (اكتب كلاماً وحروفاً فقط بدون أي رموز أو إيموجي).
3. لا تضع أي علامات تنصيص نهائياً، ولا تذكر كلمة "ذكاء اصطناعي" أو "برومبت".
4. أخرج فقط نص التعليق بدون أي مقدمات أو شروحات.`;

    const modelsToTry = [
        { model: 'openai/gpt-oss-120b', max_tokens: 300 },
        { model: 'qwen/qwen3.8-27b', max_tokens: 200 }
    ];

    for (const conf of modelsToTry) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: conf.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: postContent ? `كابشن المنشور:\n${postContent.substring(0, 350)}` : 'منشور عن خدمات التسويق وتوثيق الحسابات الإعلانية' }
                    ],
                    temperature: 0.95,
                    max_tokens: conf.max_tokens
                })
            });

            const data = await res.json();
            let comment = data.choices?.[0]?.message?.content?.trim();
            if (comment && comment.length > 2) {
                comment = comment.replace(/^["'«»]+|["'«»]+$/g, '').trim();
                comment = removeEmojis(comment);
                if (!comment.includes('AI') && !comment.includes('sorry')) {
                    return comment;
                }
            }
        } catch (e) {
            console.warn(`[Groq AI ${conf.model}] error:`, e.message);
        }
    }
    return null;
}

// محاكاة كتابة إنسانية واقعية
async function humanType(page, text) {
    for (const char of text) {
        await page.keyboard.type(char);
        await sleep(randomBetween(45, 115));
    }
}

// إضافة حساب جديد
async function addAccountWizard(name) {
    const accountId = 'acc_' + Date.now();
    const profileFolder = path.join(PROFILES_DIR, accountId);
    if (!fs.existsSync(profileFolder)) fs.mkdirSync(profileFolder, { recursive: true });

    addLog(`🚀 جاري فتح نافذة Chrome للحساب الجديد: "${name}"...`);

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            userDataDir: profileFolder,
            headless: false,
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-notifications',
                '--start-maximized',
                '--window-position=50,50'
            ]
        });

        const pages = await browser.pages();
        const page = pages[0] || await browser.newPage();
        await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });

        const maxWaitTime = 12 * 60 * 1000;
        const startTime = Date.now();
        let loggedInUid = null;

        while (Date.now() - startTime < maxWaitTime) {
            try {
                const cookies = await page.cookies();
                const cUser = cookies.find(c => c.name === 'c_user');
                if (cUser && cUser.value) {
                    loggedInUid = cUser.value;
                    break;
                }
            } catch (e) {}
            await sleep(2000);
        }

        if (loggedInUid) {
            await sleep(3500);
            await browser.close();

            const accounts = loadAccounts();
            const newAccount = {
                id: accountId,
                name: name || 'حساب فيسبوك',
                uid: loggedInUid,
                profileFolder: profileFolder,
                createdAt: new Date().toISOString(),
                enabled: true
            };
            accounts.push(newAccount);
            saveAccounts(accounts);
            addLog(`✅ تم حفظ الحساب "${name}" بنجاح! UID: ${loggedInUid}`, 'success');
            return { success: true, account: newAccount };
        } else {
            try { await browser.close(); } catch (e) {}
            addLog(`⚠️ انتهت مهلة الانتظار أو تم إغلاق المتصفح قبل تسجيل الدخول.`, 'warning');
            return { success: false, message: 'انتهت المهلة أو تم إغلاق المتصفح دون تسجيل دخول.' };
        }
    } catch (err) {
        if (browser) try { await browser.close(); } catch (e) {}
        addLog(`❌ فشل فتح المتصفح: ${err.message}`, 'error');
        return { success: false, message: err.message };
    }
}

// فتح متصفح لحساب مسجل مسبقاً
async function openAccountBrowser(accountId) {
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return { success: false, message: 'الحساب غير موجود' };

    try {
        const { exec } = require('child_process');
        exec(`start "" "${CHROME_PATH}" --user-data-dir="${acc.profileFolder}" "https://www.facebook.com"`);
        addLog(`🌐 تم فتح متصفح Chrome الأصلي للحساب "${acc.name}".`);
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

// تبديل حالة الحساب (تفعيل/تعطيل)
function toggleAccount(accountId, enabled) {
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return { success: false, message: 'الحساب غير موجود' };
    acc.enabled = enabled;
    saveAccounts(accounts);
    return { success: true, account: acc };
}

// حذف حساب
function deleteAccount(accountId) {
    const accounts = loadAccounts();
    const idx = accounts.findIndex(a => a.id === accountId);
    if (idx === -1) return { success: false, message: 'الحساب غير موجود' };

    const acc = accounts[idx];
    accounts.splice(idx, 1);
    saveAccounts(accounts);

    try {
        if (fs.existsSync(acc.profileFolder)) {
            fs.rmSync(acc.profileFolder, { recursive: true, force: true });
        }
    } catch (e) {}

    addLog(`🗑️ تم حذف الحساب "${acc.name}".`);
    return { success: true };
}

// تنفيذ التفاعل لمنشور واحد عبر حساب واحد
// تنفيذ التفاعل لمنشور واحد عبر حساب واحد
async function boostOneAccountOnPost(account, postUrl, options, commentText) {
    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            userDataDir: account.profileFolder,
            headless: options.headless,
            defaultViewport: null,
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-notifications',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-blink-features=AutomationControlled',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--window-size=1280,900'
            ]
        });
        activeBrowser = browser;

        const pages = await browser.pages();
        const page = pages[0] || await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        addLog(`[${account.name}] 🌐 جاري تحميل رابط المنشور...`);
        await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(randomBetween(3500, 5000));

        // التحقق من صلاحية الجلسة قبل محاولة التفاعل
        const curUrl = page.url();
        const cookies = await page.cookies();
        const cUser = cookies.find(c => c.name === 'c_user');

        if (!cUser || !cUser.value || curUrl.includes('/login') || curUrl.includes('checkpoint') || curUrl.includes('disabled')) {
            const isCheckpoint = curUrl.includes('checkpoint');
            const status = isCheckpoint ? 'CHECKPOINT' : 'EXPIRED';
            const msg = isCheckpoint 
                ? 'الحساب يطلب تأكيد أمان أو كود تحقق (Checkpoint) 🟡' 
                : 'الجلسة منتهية، يرجى تسجيل الدخول مجدداً 🔴';
            
            addLog(`[${account.name}] ⚠️ ${msg}. تم تخطيه تلقائياً لتفادي توقف السكربت.`, 'warning');
            account.sessionStatus = status;
            account.sessionMessage = msg;
            try {
                const accs = loadAccounts();
                const idx = accs.findIndex(a => a.id === account.id);
                if (idx !== -1) {
                    accs[idx].sessionStatus = status;
                    accs[idx].sessionMessage = msg;
                    saveAccounts(accs);
                }
            } catch (e) {}
            await browser.close();
            activeBrowser = null;
            return { success: false, sessionExpired: true, sessionStatus: status, sessionMessage: msg };
        }

        // محاكاة قراءة المنشور والتمرير الخفيف نحو أزرار التفاعل
        await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
        await sleep(randomBetween(1500, 2500));

        let didLike = false;
        let wasAlreadyLiked = false;
        let didComment = false;
        let didShare = false;

        // 1. الإعجاب (Like)
        if (options.doLike && !boosterState.isAbortRequested) {
            addLog(`[${account.name}] 👍 جاري فحص والضغط على زر الإعجاب (Like)...`);
            const likeRes = await page.evaluate(() => {
                function getPostContainer() {
                    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                    for (let i = dialogs.length - 1; i >= 0; i--) {
                        const d = dialogs[i];
                        const r = d.getBoundingClientRect();
                        const aria = (d.getAttribute('aria-label') || '').toLowerCase();
                        if (aria.includes('إشعار') || aria.includes('notif') || aria.includes('messenger') || aria.includes('chat')) continue;
                        if (r.width > 250 && r.height > 250) return d;
                    }
                    return document.querySelector('div[role="main"]') || document.body;
                }

                const container = getPostContainer();
                const buttons = Array.from(container.querySelectorAll('div[role="button"], span[role="button"]'));
                for (const b of buttons) {
                    const r = b.getBoundingClientRect();
                    // أزرار شريط المنشور الرئيسية عرضها أكبر من 40 بكسل
                    if (r.width < 40 || r.height < 25) continue;
                    const aria = (b.getAttribute('aria-label') || '').trim();
                    const text = (b.innerText || '').trim();

                    const isAlreadyLiked = 
                        aria.includes('إزالة') || aria.includes('إلغاء') || aria.toLowerCase().includes('unlike') || 
                        aria.toLowerCase().includes('remove') || aria.includes('أعجبك');
                    if (isAlreadyLiked) {
                        return { alreadyLiked: true, aria, text };
                    }

                    const isLikeBtn = 
                        aria === 'أعجبني' || aria.toLowerCase() === 'like' || aria === 'إعجاب' ||
                        text === 'أعجبني' || text.toLowerCase() === 'like' ||
                        aria.toLowerCase().includes('react to this post');

                    if (isLikeBtn) {
                        b.scrollIntoView({ behavior: 'instant', block: 'center' });
                        b.focus();
                        b.click();
                        return { clicked: true, aria, text };
                    }
                }
                return { notFound: true };
            });

            if (likeRes?.alreadyLiked) {
                wasAlreadyLiked = true;
                addLog(`[${account.name}] ℹ️ تم الإعجاب بالمنشور مسبقاً بهذا الحساب.`);
            } else if (likeRes?.clicked) {
                await sleep(2500);
                const isVerified = await page.evaluate(() => {
                    function getPostContainer() {
                        const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                        for (let i = dialogs.length - 1; i >= 0; i--) {
                            const d = dialogs[i];
                            const r = d.getBoundingClientRect();
                            const aria = (d.getAttribute('aria-label') || '').toLowerCase();
                            if (aria.includes('إشعار') || aria.includes('notif') || aria.includes('messenger') || aria.includes('chat')) continue;
                            if (r.width > 250 && r.height > 250) return d;
                        }
                        return document.querySelector('div[role="main"]') || document.body;
                    }
                    const container = getPostContainer();
                    const buttons = Array.from(container.querySelectorAll('div[role="button"], span[role="button"]'));
                    for (const b of buttons) {
                        const r = b.getBoundingClientRect();
                        if (r.width < 40 || r.height < 25) continue;
                        const aria = (b.getAttribute('aria-label') || '').trim();
                        if (aria.includes('إزالة') || aria.includes('إلغاء') || aria.toLowerCase().includes('unlike') || aria.toLowerCase().includes('remove') || aria.includes('أعجبك')) {
                            return true;
                        }
                    }
                    return false;
                });
                didLike = true;
                if (isVerified) {
                    addLog(`[${account.name}] ✅ تم تأكيد الضغط وتفعيل الإعجاب على المنشور بنجاح!`, 'success');
                } else {
                    addLog(`[${account.name}] ✅ تم الضغط على زر الإعجاب بنجاح!`, 'success');
                }
            } else {
                addLog(`[${account.name}] ⚠️ تعذر تحديد زر الإعجاب على المنشور الرئيسي.`, 'warning');
            }
            await sleep(randomBetween(2000, 3500));
        }

        // 2. التعليق (Comment)
        if (options.doComment && commentText && !boosterState.isAbortRequested) {
            commentText = removeEmojis(commentText);
            addLog(`[${account.name}] 💬 كتابة تعليق: "${commentText}"...`);
            let commentBox = await page.$('div[role="dialog"] div[role="textbox"][contenteditable="true"], div[role="main"] div[role="textbox"][contenteditable="true"], div[role="textbox"][contenteditable="true"]');
            
            if (!commentBox) {
                // الضغط على زر "كتابة تعليق" بشريط المنشور لإظهار صندوق التعليق
                await page.evaluate(() => {
                    function getPostContainer() {
                        const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                        for (let i = dialogs.length - 1; i >= 0; i--) {
                            const d = dialogs[i];
                            const r = d.getBoundingClientRect();
                            const aria = (d.getAttribute('aria-label') || '').toLowerCase();
                            if (aria.includes('إشعار') || aria.includes('notif') || aria.includes('messenger') || aria.includes('chat')) continue;
                            if (r.width > 250 && r.height > 250) return d;
                        }
                        return document.querySelector('div[role="main"]') || document.body;
                    }
                    const container = getPostContainer();
                    const buttons = Array.from(container.querySelectorAll('div[role="button"], span[role="button"]'));
                    for (const b of buttons) {
                        const r = b.getBoundingClientRect();
                        if (r.width < 40 || r.height < 25) continue;
                        const label = (b.getAttribute('aria-label') || '').trim().toLowerCase();
                        const text = (b.innerText || '').trim().toLowerCase();
                        if (label.includes('كتابة تعليق') || label.includes('comment') || label.includes('تعليق') || text === 'comment' || text === 'تعليق') {
                            b.scrollIntoView({ behavior: 'instant', block: 'center' });
                            b.click();
                            break;
                        }
                    }
                });
                await sleep(2000);
                commentBox = await page.$('div[role="dialog"] div[role="textbox"][contenteditable="true"], div[role="main"] div[role="textbox"][contenteditable="true"], div[role="textbox"][contenteditable="true"]');
            }

            if (commentBox) {
                await commentBox.click();
                await sleep(700);
                await humanType(page, commentText);
                await sleep(randomBetween(1200, 2000));
                await page.keyboard.press('Enter');
                didComment = true;
                addLog(`[${account.name}] ✅ تم نشر التعليق بنجاح!`, 'success');
                await sleep(3500);
            } else {
                addLog(`[${account.name}] ⚠️ تعذر العثور على صندوق التعليق.`, 'warning');
            }
        }

        // 3. المشاركة (Share)
        if (options.doShare && !boosterState.isAbortRequested) {
            addLog(`[${account.name}] 🔄 جاري عمل مشاركة (Share)...`);
            const shareClicked = await page.evaluate(() => {
                function getPostContainer() {
                    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                    for (let i = dialogs.length - 1; i >= 0; i--) {
                        const d = dialogs[i];
                        const r = d.getBoundingClientRect();
                        const aria = (d.getAttribute('aria-label') || '').toLowerCase();
                        if (aria.includes('إشعار') || aria.includes('notif') || aria.includes('messenger') || aria.includes('chat')) continue;
                        if (r.width > 250 && r.height > 250) return d;
                    }
                    return document.querySelector('div[role="main"]') || document.body;
                }

                const container = getPostContainer();
                const buttons = Array.from(container.querySelectorAll('div[role="button"], span[role="button"]'));
                for (const b of buttons) {
                    const r = b.getBoundingClientRect();
                    if (r.width < 40 || r.height < 25) continue;
                    const aria = (b.getAttribute('aria-label') || '').trim();
                    const text = (b.innerText || '').trim();

                    const isShare = 
                        aria.includes('شارك') || aria.includes('مشاركة') ||
                        aria.toLowerCase().includes('share') || text.toLowerCase() === 'share' ||
                        aria.toLowerCase().includes('send this to friends');

                    if (isShare) {
                        b.scrollIntoView({ behavior: 'instant', block: 'center' });
                        b.focus();
                        b.click();
                        return true;
                    }
                }
                return false;
            });

            if (shareClicked) {
                await sleep(2500);
                const shareSubmitted = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('div[role="button"], div[role="menuitem"], span[role="button"]'));
                    for (const b of buttons) {
                        const aria = (b.getAttribute('aria-label') || '').trim();
                        const text = (b.innerText || '').trim();

                        const isShareNow = 
                            aria === 'مشاركة الآن' || aria.startsWith('مشاركة الآن') ||
                            text === 'مشاركة الآن' || text.startsWith('مشاركة الآن') ||
                            aria === 'المشاركة الآن' || text === 'المشاركة الآن' ||
                            aria.toLowerCase().startsWith('share now') || text.toLowerCase().startsWith('share now') ||
                            aria.toLowerCase().includes('share to feed') || text.toLowerCase().includes('share to feed');

                        if (isShareNow) {
                            b.scrollIntoView({ behavior: 'instant', block: 'center' });
                            b.focus();
                            b.click();
                            return true;
                        }
                    }
                    return false;
                });
                if (shareSubmitted) {
                    didShare = true;
                    addLog(`[${account.name}] ✅ تم الضغط على "مشاركة الآن" ونشر المشاركة بنجاح!`, 'success');
                } else {
                    addLog(`[${account.name}] ⚠️ تم فتح قائمة المشاركة ولكن لم يتم العثور على زر "مشاركة الآن".`, 'warning');
                }
                await sleep(3000);
            } else {
                addLog(`[${account.name}] ⚠️ تعذر العثور على زر المشاركة في المنشور.`, 'warning');
            }
        }

        await sleep(1500);
        await browser.close();
        activeBrowser = null;
        
        const anyTaskCompleted = didLike || wasAlreadyLiked || didComment || didShare;
        return {
            success: anyTaskCompleted,
            didLike,
            wasAlreadyLiked,
            didComment,
            didShare,
            commentText: didComment ? commentText : ''
        };
    } catch (e) {
        if (browser) try { await browser.close(); } catch (err) {}
        activeBrowser = null;
        addLog(`[${account.name}] ❌ خطأ: ${e.message}`, 'error');
        return { success: false, sessionExpired: false, error: e.message };
    }
}

function cleanPostUrl(u) {
    if (!u) return '';
    let str = String(u).trim();
    if (str.includes('/posts/') || str.includes('/permalink/')) {
        str = str.split('?')[0];
    }
    return str;
}

// استخراج الروابط كقائمة
function parseUrlsList(input) {
    if (!input) return [];
    const rawList = Array.isArray(input) ? input : String(input).split(/[\n,]+/);
    return rawList
        .map(u => cleanPostUrl(u))
        .filter(u => u.length > 5 && u.includes('facebook.com'));
}

// تشغيل دورة المعزز (تدعم منشوراً واحداً أو روابط متعددة)
async function startBoosterCycle({ 
    postUrls = [], 
    postUrl = '', 
    postContent = '', 
    useGroqAi = true, 
    doLike = true, 
    doComment = true, 
    doShare = true, 
    randomizeTasks = true,
    isHeadless = false 
}) {
    if (boosterState.isRunning) {
        return { success: false, message: 'هناك عملية تفاعل جارية بالفعل حالياً.' };
    }

    const allUrls = parseUrlsList(postUrls.length > 0 ? postUrls : postUrl);
    if (allUrls.length === 0) {
        return { success: false, message: 'يرجى تقديم رابط واحد صالح على الأقل لمنشور فيسبوك.' };
    }

    const initialAccounts = loadAccounts().filter(a => a.enabled !== false);
    if (initialAccounts.length === 0) {
        return { success: false, message: 'لا توجد حسابات مفعّلة في النظام. أضف حسابات أولاً.' };
    }

    const manualComments = loadComments();

    boosterState.isRunning = true;
    boosterState.isAbortRequested = false;
    boosterState.totalPosts = allUrls.length;
    boosterState.currentPostIndex = 0;
    boosterState.totalAccounts = initialAccounts.length;
    boosterState.currentAccountIndex = 0;
    boosterState.statusText = 'جاري بدء العملية...';

    addLog(`🚀 بدأت عملية تعزيز التفاعل على ${allUrls.length} منشور عبر ${initialAccounts.length} حساب`);
    if (randomizeTasks) {
        addLog(`🎲 ميزة التوزيع العشوائي للمهام مفعّلة: كل حساب سينفذ تشكيلة مهام مختلفة (إعجاب/تعليق/مشاركة) بنسب عشوائية واقعية.`);
    }

    // تشغيل غير متزامن
    (async () => {
        for (let pIdx = 0; pIdx < allUrls.length; pIdx++) {
            if (boosterState.isAbortRequested) break;

            const currentUrl = allUrls[pIdx];
            boosterState.currentPostUrl = currentUrl;
            boosterState.currentPostIndex = pIdx + 1;
            addLog(`\n📌 المنشور [${pIdx + 1}/${allUrls.length}]: ${currentUrl}`);

            // مجموعة لضمان عدم تكرار أي تعليق نهائياً بين الحسابات على نفس المنشور
            const usedCommentsThisPost = new Set();

            // مزامنة فورية للحسابات من القرص قبل كل منشور
            const activeAccounts = loadAccounts().filter(a => a.enabled !== false);
            boosterState.totalAccounts = activeAccounts.length;

            // خلط ترتيب الحسابات عشوائياً لكل منشور لكسر أي نمط تكراري
            const postAccounts = randomizeTasks 
                ? [...activeAccounts].sort(() => Math.random() - 0.5) 
                : activeAccounts;

            let postSuccessCount = 0;

            await notifyTelegram(
                `🚀 <b>بدء تعزيز المنشور بالحسابات المتعددة!</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🔗 <b>رابط المنشور:</b> <a href="${currentUrl}">اضغط هنا لفتح المنشور</a>\n` +
                `👥 <b>عدد الحسابات:</b> ${postAccounts.length} حساب (${postAccounts.map(a => a.name).join(', ')})\n` +
                `🎲 <b>التوزيع:</b> مهام عشوائية ذكية بفواصل زمنية أمنية`
            );

            for (let aIdx = 0; aIdx < postAccounts.length; aIdx++) {
                if (boosterState.isAbortRequested) {
                    addLog('🛑 تم استلام أمر إيقاف التفاعل.', 'warning');
                    break;
                }

                const acc = postAccounts[aIdx];
                boosterState.currentAccountIndex = aIdx + 1;
                boosterState.currentAccountName = acc.name;
                boosterState.statusText = `المنشور (${pIdx + 1}/${allUrls.length}) | حساب (${aIdx + 1}/${postAccounts.length}): ${acc.name}`;

                // تحديد المهام المخصصة لهذا الحساب تحديداً (عشوائية أو ثابتة)
                let accountDoLike = doLike;
                let accountDoComment = doComment;
                let accountDoShare = doShare;

                if (randomizeTasks) {
                    // احتمالات واقعية تحاكي السلوك البشري الطبيعي
                    accountDoLike = doLike ? (Math.random() < 0.85) : false;     // ~85% احتمال إعجاب
                    accountDoComment = doComment ? (Math.random() < 0.55) : false; // ~55% احتمال تعليق
                    accountDoShare = doShare ? (Math.random() < 0.35) : false;     // ~35% احتمال مشاركة

                    // ضمان تنفيذ مهمة واحدة على الأقل لكل حساب طالما يوجد خيار مفعّل
                    if (!accountDoLike && !accountDoComment && !accountDoShare) {
                        const enabledPool = [];
                        if (doLike) enabledPool.push('like');
                        if (doComment) enabledPool.push('comment');
                        if (doShare) enabledPool.push('share');

                        if (enabledPool.length > 0) {
                            const picked = enabledPool[Math.floor(Math.random() * enabledPool.length)];
                            if (picked === 'like') accountDoLike = true;
                            if (picked === 'comment') accountDoComment = true;
                            if (picked === 'share') accountDoShare = true;
                        }
                    }
                }

                const assignedTasksSummary = [];
                if (accountDoLike) assignedTasksSummary.push('👍 إعجاب');
                if (accountDoComment) assignedTasksSummary.push('💬 تعليق');
                if (accountDoShare) assignedTasksSummary.push('🔄 مشاركة');

                addLog(`[${acc.name}] 🎯 مهام الحساب في هذا المنشور: [${assignedTasksSummary.join(' + ') || 'تخطي'}]`);

                // تحديد نص التعليق: فقط إذا كان الحساب مخصصاً له التعليق مع منع التكرار قطيعاً
                let commentText = '';
                if (accountDoComment) {
                    if (useGroqAi) {
                        addLog(`[${acc.name}] 🤖 جاري استدعاء Groq AI لتوليد تعليق ذكي وغير مكرر...`);
                        let candidate = await generateGroqComment(postContent, aIdx);
                        if (candidate && !usedCommentsThisPost.has(candidate)) {
                            commentText = candidate;
                        } else if (candidate) {
                            // محاولة ثانية بنمط مختلف لتجنب أي تشابه
                            candidate = await generateGroqComment(postContent, aIdx + 7);
                            if (candidate && !usedCommentsThisPost.has(candidate)) {
                                commentText = candidate;
                            }
                        }
                        if (commentText) {
                            addLog(`[${acc.name}] ✨ تعليق Groq AI الفريد: "${commentText}"`);
                        }
                    }

                    // في حال عدم استخدام الذكاء أو فشله، نأخذ تعليقاً يدوياً غير مستخدم نهائياً على هذا المنشور
                    if (!commentText) {
                        const availableManual = manualComments.filter(c => !usedCommentsThisPost.has(c));
                        if (availableManual.length > 0) {
                            const pickIdx = Math.floor(Math.random() * availableManual.length);
                            commentText = availableManual[pickIdx];
                            // إذا استُنفذت جميع التعليقات الـ 30، نضيف تنويعاً نصياً طبيعياً بدون أي إيموجي
                            const base = manualComments[aIdx % manualComments.length];
                            const variations = ['بالتوفيق يا رب', 'عاش والله', 'تحياتي لكم', 'كل الدعم والتقدير', 'ألف مبروك', 'دمتم متميزين'];
                            const v = variations[aIdx % variations.length];
                            commentText = `${base} - ${v}`;
                        }
                    }

                    if (commentText) {
                        commentText = removeEmojis(commentText);
                        usedCommentsThisPost.add(commentText);
                    }
                }

                // إشعار بدء تنفيذ مهام الحساب
                await notifyTelegram(
                    `⏳ <b>جاري تفاعل الحساب:</b> 👤 <b>${acc.name}</b> (${aIdx + 1}/${postAccounts.length})\n` +
                    `🎯 <b>المهام المجدولة:</b> [${assignedTasksSummary.join(' + ') || 'تصفح'}]`
                );

                const boostRes = await boostOneAccountOnPost(acc, currentUrl, {
                    doLike: accountDoLike,
                    doComment: accountDoComment,
                    doShare: accountDoShare,
                    headless: isHeadless ? 'new' : false
                }, commentText);

                if (boostRes && boostRes.success) {
                    postSuccessCount++;
                    const executedTasks = [];
                    if (boostRes.didLike) executedTasks.push('👍 إعجاب');
                    else if (boostRes.wasAlreadyLiked) executedTasks.push('👍 تم الإعجاب مسبقاً');
                    if (boostRes.didComment) executedTasks.push('💬 تعليق');
                    if (boostRes.didShare) executedTasks.push('🔄 مشاركة');

                    await notifyTelegram(
                        `✅ <b>تفاعل الحساب بنجاح!</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `👤 <b>الحساب:</b> <b>${acc.name}</b> (${aIdx + 1}/${postAccounts.length})\n` +
                        `🎯 <b>العمليات المنفذة:</b> ${executedTasks.length > 0 ? executedTasks.join(' + ') : 'تصفح المنشور'}\n` +
                        (boostRes.commentText ? `💬 <b>التعليق المكتوب:</b> <i>"${boostRes.commentText}"</i>\n` : '') +
                        `📊 <b>الحالة:</b> الحساب يعمل بكفاءة 🟢`
                    );
                } else if (boostRes && boostRes.sessionExpired) {
                    await notifyTelegram(
                        `⚠️ <b>تنبيه لحساب:</b> 👤 <b>${acc.name}</b> (${aIdx + 1}/${postAccounts.length})\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `🔒 <b>الحالة:</b> ${boostRes.sessionMessage || 'الجلسة تحتاج تسجيل دخول مجدداً'}\n` +
                        `⏭️ <i>تم تخطي الحساب والمتابعة تلقائياً للحساب التالي.</i>`
                    );
                } else {
                    await notifyTelegram(
                        `⚠️ <b>تعذر تفاعل الحساب:</b> 👤 <b>${acc.name}</b> (${aIdx + 1}/${postAccounts.length})\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `❌ <b>الخطأ:</b> ${boostRes?.error || 'تعذر استكمال العملية'}`
                    );
                }

                // تأخير أمان بين كل حساب والآخر
                if (aIdx < postAccounts.length - 1 && !boosterState.isAbortRequested) {
                    const waitSec = randomBetween(25, 42);
                    boosterState.statusText = `⏱️ انتظار أمان (${waitSec} ثانية) قبل الحساب التالي...`;
                    addLog(`⏱️ انتظار أمان ${waitSec} ثانية لتفادي كشف السلوك الآلي...`);
                    await sleep(waitSec * 1000);
                }
            }

            await notifyTelegram(
                `🏁 <b>اكتمل تعزيز المنشور بنجاح تام!</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🎉 <b>عدد الحسابات المتفاعلة:</b> ${postSuccessCount} من أصل ${postAccounts.length}\n` +
                `🔗 <a href="${currentUrl}">عرض المنشور على فيسبوك</a>`
            );

            // تأخير إضافي بين المنشورات إذا كان هناك أكثر من منشور
            if (pIdx < allUrls.length - 1 && !boosterState.isAbortRequested) {
                const postWait = randomBetween(40, 70);
                addLog(`⏸️ استراحة أمان ${postWait} ثانية قبل الانتقال للمنشور التالي...`);
                await sleep(postWait * 1000);
            }
        }

        boosterState.isRunning = false;
        boosterState.isAbortRequested = false;
        boosterState.statusText = 'اكتملت جميع المهام بنجاح!';
        addLog('🏁 اكتمل تعزيز جميع المنشورات والحسابات بنجاح!', 'success');
    })().catch(err => {
        boosterState.isRunning = false;
        boosterState.statusText = 'حدث خطأ غير متوقع';
        addLog(`❌ خطأ عام: ${err.message}`, 'error');
    });

    return { success: true, message: `بدأت عملية التفاعل على ${allUrls.length} منشور في الخلفية بنجاح.` };
}

// إيقاف التعزيز
function stopBoosterCycle() {
    if (!boosterState.isRunning) {
        return { success: false, message: 'لا توجد عملية تعزيز قيد التشغيل حالياً.' };
    }
    boosterState.isAbortRequested = true;
    boosterState.statusText = 'جاري الإيقاف فوراً...';
    if (activeBrowser) {
        try { activeBrowser.close(); } catch (e) {}
    }
    addLog('🛑 تم استلام أمر إيقاف العملية.', 'warning');
    return { success: true };
}

function getBoosterStatus() {
    return {
        ...boosterState,
        accounts: loadAccounts(),
        comments: loadComments(),
        config: loadBoosterConfig()
    };
}

// فحص صلاحية جلسة حساب واحد
async function checkAccountSession(account) {
    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            userDataDir: account.profileFolder,
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-notifications',
                '--window-size=1280,800'
            ]
        });
        const pages = await browser.pages();
        const page = pages[0] || await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
        await sleep(2500);

        const curUrl = page.url();
        const cookies = await page.cookies();
        const cUser = cookies.find(c => c.name === 'c_user');

        let status = 'ACTIVE';
        let message = 'الجلسة نشطة ومتصل بنجاح 🟢';

        if (curUrl.includes('checkpoint') || curUrl.includes('disabled') || curUrl.includes('two_step_verification')) {
            status = 'CHECKPOINT';
            message = 'يتطلب تأكيد أمان أو كود تحقق من فيسبوك 🟡';
        } else if (!cUser || !cUser.value || curUrl.includes('/login')) {
            status = 'EXPIRED';
            message = 'الجلسة منتهية، يرجى تسجيل الدخول مجدداً 🔴';
        }

        await browser.close();
        return { accountId: account.id, status, message, lastCheckedAt: new Date().toISOString() };
    } catch (e) {
        if (browser) try { await browser.close(); } catch (err) {}
        return { accountId: account.id, status: 'ERROR', message: `تعذر الفحص: ${e.message}`, lastCheckedAt: new Date().toISOString() };
    }
}

// فحص صلاحية جميع الحسابات
async function checkAllAccountsHealth() {
    const accounts = loadAccounts();
    if (accounts.length === 0) {
        return { success: false, message: 'لا توجد حسابات مسجلة لفحصها.' };
    }

    addLog(`🩺 بدء فحص صلاحية جلسات ${accounts.length} حساب...`);
    const results = [];

    for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i];
        addLog(`[${i + 1}/${accounts.length}] ⏳ فحص الحساب: "${acc.name}"...`);
        const res = await checkAccountSession(acc);
        acc.sessionStatus = res.status;
        acc.sessionMessage = res.message;
        acc.lastCheckedAt = res.lastCheckedAt;
        results.push({ id: acc.id, name: acc.name, ...res });
        addLog(`[${acc.name}] ${res.message}`, res.status === 'ACTIVE' ? 'success' : 'warning');
    }

    saveAccounts(accounts);
    addLog(`🏁 اكتمل فحص الصلاحية لجميع الحسابات بنجاح.`, 'success');
    return { success: true, results, accounts };
}

module.exports = {
    loadAccounts,
    saveAccounts,
    loadComments,
    saveComments,
    loadBoosterConfig,
    saveBoosterConfig,
    generateGroqComment,
    addAccountWizard,
    openAccountBrowser,
    toggleAccount,
    deleteAccount,
    checkAccountSession,
    checkAllAccountsHealth,
    startBoosterCycle,
    stopBoosterCycle,
    getBoosterStatus,
    boostOneAccountOnPost,
    cleanPostUrl,
    notifyTelegram
};
