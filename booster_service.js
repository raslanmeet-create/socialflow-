let puppeteerInstance = null;
async function getPuppeteer() {
    if (!puppeteerInstance) {
        try {
            const dynamicImport = new Function('specifier', 'return import(specifier)');
            const mod = await dynamicImport('puppeteer-core');
            puppeteerInstance = mod.default || mod;
        } catch (e) {
            console.error('Puppeteer dynamic load failed:', e.message);
            throw new Error('تعذر تحميل محرك المتصفح Puppeteer.');
        }
    }
    return puppeteerInstance;
}
const path = require('path');
const os = require('os');
const fs = require('fs');
require('dotenv').config();

const ACCOUNTS_FILE = path.join(__dirname, 'fb_booster_accounts.json');
const COMMENTS_FILE = path.join(__dirname, 'booster_comments.txt');
const BOOSTER_CONFIG_FILE = path.join(__dirname, 'fb_booster_config.json');
const PROFILES_DIR = path.join(__dirname, 'fb_profiles');

if (!process.env.VERCEL) {
    try {
        if (!fs.existsSync(PROFILES_DIR)) {
            fs.mkdirSync(PROFILES_DIR, { recursive: true });
        }
    } catch (e) {}
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
        conversationThreads: true,
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
        'إشادة قوية بالخدمة وتشجيع ودعاء بالبركة والنجاح للشباب وفريق العمل',
        'سؤال ذكي وعفوي عن تفاصيل الباقات أو الأسعار بلهجة عامية مصرية سريعة زي "بكام يا شباب؟"',
        'تأكيد عن تجربة سابقة ممتازة والثناء على سرعة استجابة فريق العمل واحترافيتهم',
        'تشجيع وإعجاب بالشغل بلهجة مصرية زي "عاش يا رجالة" و"شغل عالي تسلم ايديكم"',
        'دعوة حلوة وبركة للشباب وفريق العمل وتقدير لمجهودهم'
    ];
    const chosenTone = tones[toneIndex % tones.length];

    const systemPrompt = `أنت مستخدم مصري حقيقي وعادي جداً بتعلق من الموبايل على فيسبوك.
المهمة: اكتب تعليقاً عفوياً وواقعياً ومختصراً جداً (سطر واحد فقط) على منشور فيسبوك.
الأسلوب المطلوب لهذا الحساب: (${chosenTone}).
الشروط الصارمة جداً:
1. اللهجة: مصرية عامية 100% طبيعية زي ما المصريين بيكتبوا لبعض على الفيس (ممنوع منعاً باتاً أي كلمة لغة عربية فصحى مثل: متقن، باهر، أرجو، نرجو، إلى الأمام، حيال، تبارك، تفاصيلكم، مزيداً، دوام).
2. إذا ذكرت الجهة، اذكر دائماً "فريق العمل" أو "الشباب" أو "يا رجالة" أو "يا هندسة"، وممنوع تماماً كتابة اسم "Raslans" أو أي أسماء شركات رسمية.
3. ممنوع منعاً باتاً استخدام أي إيموجي أو رموز تعبيرية نهائياً (حروف وكلمات فقط).
4. لا تضع أي علامات تنصيص، واكتب جملة واحدة فقط كأنك داخل تعلق بسرعة وتمشي.`;

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

// أزواج محادثات تفاعلية ذكية معدة مسبقاً باللهجة المصرية كبديل فوري في حال انقطاع الذكاء الاصطناعي
const DEFAULT_CONVERSATION_PAIRS = [
    {
        question: 'ممكن تفاصيل أكتر عن باقات التسويق وإدارة الصفحات وطريقة الاشتراك؟',
        review: 'أنا اتعاملت مع فريق العمل من شهرين وبجد مجهودهم ممتاز والنتائج فرقت معايا جداً في المبيعات'
    },
    {
        question: 'هو العرض ده لسه شغال يا شباب؟ وبكام الباقة الشهرية لو سمحت؟',
        review: 'عن تجربة يا غالي شغلهم محترم جداً وسريعين في الرد وهيفيدوك جداً، اتواصل معاهم'
    },
    {
        question: 'خدمة توثيق الحسابات الإعلانية دي بتاخد وقت قد إيه وبتتطلب إيه؟',
        review: 'الشباب وثقولي الحساب الإعلاني في وقت قياسي ومرتبين جداً، اتوكل على الله تعاملهم ممتاز'
    },
    {
        question: 'لو سمحت في باقات مخصصة للشركات والأنشطة الصغيرة لسه بتبدأ؟',
        review: 'الناس دي شاطرة أوي وعندهم باقات بتناسب كل الأحجام، عن تجربة هتستفاد منهم كتير'
    },
    {
        question: 'بكام تفاصيل العرض ده يا رجالة وهل شامل الإعلانات الممولة؟',
        review: 'أنا مجرب شغلهم في الإعلانات والتصاميم، بصراحة ناس أمينة وملتزمة بالمواعيد على الفرازة'
    },
    {
        question: 'ممكن أعرف تفاصيل أكتر عن خطة العمل وهل في تقارير دورية؟',
        review: 'بيبعتوا تقارير مفصلة بالأرقام ومتابعين أول بأول، فريق عمل مجتهد ومحترف'
    }
];

// توليد حوار تفاعلي ثنائي (سؤال بيعي استفساري + رد بتجربة عميل إيجابية حقيقية)
async function generateGroqConversationPair(postContent = '') {
    const apiKey = getGroqApiKey();
    if (!apiKey) {
        return DEFAULT_CONVERSATION_PAIRS[Math.floor(Math.random() * DEFAULT_CONVERSATION_PAIRS.length)];
    }

    const systemPrompt = `أنت خبير سيكولوجية مبيعات وسوشيال ميديا في السوق المصري.
المهمة: ابتكر "حواراً تفاعلياً ثنائياً واقعياً وذكياً جداً" (2-Person Social Proof Thread) بين شخصين مصريين عاديين على منشور فيسبوك لصفحة تجارية/تسويقية.

- الشخص الأول (حساب أ - استفسار بيعي فضولي): يسأل سؤالاً ذكياً بلهجة مصرية عامية عادية عن الأسعار أو الباقات أو تفاصيل الخدمة المطروحة في كابشن المنشور، يثير اهتمام المتابعين.
- الشخص الثاني (حساب ب - عميل سابق جرب الخدمة): يرد عليه في نفس التعليق بلهجة مصرية عامية طبيعية 100% يشهد بجودة الشغل وتجربته الناجحة مع فريق العمل وسرعة ردهم ويوصيه بالتواصل معهم.

الشروط الصارمة:
1. لهجة مصرية عامية 100% طبيعية عفوية بدون أي كلمات فصحى نهائياً (ممنوع: متقن، باهر، أرجو، نرجو، إلى الأمام، حيال، تبارك، تفاصيلكم).
2. عدم ذكر اسم "Raslans" نهائياً، واستخدام "فريق العمل" أو "الشباب" أو "الناس دي" أو "شغلهم".
3. ممنوع منعاً باتاً أي إيموجي أو رموز تعبيرية نهائياً (حروف وكلمات فقط).
4. الرد بصيغة JSON حصراً بالشكل:
{
  "question": "نص استفسار الحساب أ",
  "review": "نص شهادة وتجربة الحساب ب رداً عليه"
}`;

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: postContent ? `كابشن المنشور:\n${postContent.substring(0, 350)}` : 'منشور عن خدمات التسويق وتوثيق الحسابات الإعلانية' }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.9,
                max_tokens: 800
            })
        });

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
            const parsed = JSON.parse(content);
            if (parsed.question && parsed.review) {
                return {
                    question: removeEmojis(parsed.question.replace(/^["']|["']$/g, '').trim()),
                    review: removeEmojis(parsed.review.replace(/^["']|["']$/g, '').trim())
                };
            }
        }
    } catch (e) {
        console.warn('[Groq AI Conversation Pair Error]:', e.message);
    }

    return DEFAULT_CONVERSATION_PAIRS[Math.floor(Math.random() * DEFAULT_CONVERSATION_PAIRS.length)];
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
        const puppeteer = await getPuppeteer();
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
        const puppeteer = await getPuppeteer();
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

        let reactionTypeDone = 'like';

        // 1. التفاعل (Reaction: Like 👍 أو Love ❤️ عشوائياً)
        if (options.doLike && !boosterState.isAbortRequested) {
            const requestedReaction = options.reactionType || (Math.random() < 0.45 ? 'love' : 'like');
            const reactionName = requestedReaction === 'love' ? 'أحببته (Love ❤️)' : 'إعجاب (Like 👍)';
            addLog(`[${account.name}] 🎯 جاري فحص والتفاعل بـ [${reactionName}]...`);

            const btnInfo = await page.evaluate(() => {
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

                    const isAlreadyLiked = 
                        aria.includes('إزالة') || aria.includes('إلغاء') || aria.toLowerCase().includes('unlike') || 
                        aria.toLowerCase().includes('remove') || aria.includes('أعجبك') || aria.includes('أحببته') ||
                        aria.toLowerCase().includes('love') || aria.toLowerCase().includes('reaction');
                    if (isAlreadyLiked) {
                        return { alreadyLiked: true, aria, text };
                    }

                    const isLikeBtn = 
                        aria === 'أعجبني' || aria.toLowerCase() === 'like' || aria === 'إعجاب' ||
                        text === 'أعجبني' || text.toLowerCase() === 'like' ||
                        aria.toLowerCase().includes('react to this post');

                    if (isLikeBtn) {
                        b.scrollIntoView({ behavior: 'instant', block: 'center' });
                        const rect = b.getBoundingClientRect();
                        return { 
                            found: true, 
                            x: rect.left + rect.width / 2, 
                            y: rect.top + rect.height / 2 
                        };
                    }
                }
                return { notFound: true };
            });

            if (btnInfo?.alreadyLiked) {
                wasAlreadyLiked = true;
                addLog(`[${account.name}] ℹ️ تم التفاعل مع المنشور مسبقاً بهذا الحساب.`);
            } else if (btnInfo?.found) {
                let reactedSuccessfully = false;

                if (requestedReaction === 'love') {
                    // تحريك مؤشر الفأرة فوق زر الإعجاب لإظهار شريط التفاعلات المنبثق
                    await page.mouse.move(btnInfo.x, btnInfo.y);
                    await sleep(1500);

                    // البحث عن أيقونة تفاعل أحببته (Love)
                    const loveCoords = await page.evaluate(() => {
                        const candidates = Array.from(document.querySelectorAll('div[role="button"], span[role="button"], div[aria-label], span[aria-label]'));
                        const loveBtn = candidates.find(el => {
                            const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                            return aria === 'أحببته' || aria === 'love' || aria.includes('أحببته') || aria.includes('love');
                        });
                        if (loveBtn) {
                            const r = loveBtn.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0) {
                                return { found: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
                            }
                        }
                        return { found: false };
                    });

                    if (loveCoords?.found) {
                        await page.mouse.click(loveCoords.x, loveCoords.y);
                        reactedSuccessfully = true;
                        reactionTypeDone = 'love';
                        addLog(`[${account.name}] ❤️ تم اختيار والضغط على تفاعل "أحببته" (Love) بنجاح!`, 'success');
                    } else {
                        // في حال تعذر ظهور شريط التفاعلات، النقر المباشر على زر الإعجاب
                        await page.mouse.click(btnInfo.x, btnInfo.y);
                        reactedSuccessfully = true;
                        reactionTypeDone = 'like';
                        addLog(`[${account.name}] 👍 تم الضغط على زر الإعجاب (Like) بنجاح!`, 'success');
                    }
                } else {
                    // إعجاب عادي (Like)
                    await page.mouse.click(btnInfo.x, btnInfo.y);
                    reactedSuccessfully = true;
                    reactionTypeDone = 'like';
                    addLog(`[${account.name}] 👍 تم الضغط على زر الإعجاب (Like) بنجاح!`, 'success');
                }

                if (reactedSuccessfully) {
                    didLike = true;
                    await sleep(2000);
                }
            } else {
                addLog(`[${account.name}] ⚠️ تعذر تحديد زر التفاعل على المنشور.`, 'warning');
            }
            await sleep(randomBetween(2000, 3500));
        }

        // 2. التعليق (Comment or Nested Reply in Thread)
        if (options.doComment && commentText && !boosterState.isAbortRequested) {
            commentText = removeEmojis(commentText);
            let isNestedReplyDone = false;

            // إذا كان هذا الحساب يقوم بدور الرد التفاعلي على تعليق حساب آخر في نفس الخيط (Thread Mode)
            if (options.replyToSnippet) {
                addLog(`[${account.name}] 🎭 [محادثة تفاعلية] البحث عن استفسار العميل للرد عليه مباشرة في نفس الخيط...`);
                try {
                    // التمرير لرؤية قسم التعليقات جيداً
                    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
                    await sleep(1500);

                    const replyCoords = await page.evaluate((targetSnippet) => {
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
                        const snippet = (targetSnippet || '').substring(0, 25).trim();

                        // البحث عن عنصر التعليق المطابق للنص تحديداً
                        const allNodes = Array.from(container.querySelectorAll('div[dir="auto"], span[dir="auto"], div[role="article"]'));
                        let matchedEl = null;
                        if (snippet) {
                            matchedEl = allNodes.find(el => (el.innerText || '').includes(snippet));
                        }

                        // إذا لم يتم العثور على التعليق المطابق، لا نضغط على رد في أي تعليق عشوائي آخر!
                        if (!matchedEl) {
                            return { found: false, reason: 'snippet_not_matched' };
                        }

                        const searchScope = matchedEl.closest('div[role="article"]') || matchedEl.parentElement?.parentElement || matchedEl.parentElement;
                        if (!searchScope) return { found: false };

                        // البحث عن زر "رد" أو "Reply" الخاص بهذا التعليق المطابق فقط
                        const buttons = Array.from(searchScope.querySelectorAll('div[role="button"], span[role="button"], span, div'));
                        const replyBtn = buttons.find(b => {
                            const txt = (b.innerText || '').trim().toLowerCase();
                            const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
                            return (txt === 'رد' || txt === 'reply' || aria.includes('رد على') || aria.includes('reply to')) && b.children.length === 0;
                        });

                        if (replyBtn) {
                            const clickable = replyBtn.closest('div[role="button"]') || replyBtn;
                            clickable.scrollIntoView({ behavior: 'instant', block: 'center' });
                            const r = clickable.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0) {
                                return { found: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
                            }
                        }
                        return { found: false };
                    }, options.replyToSnippet);

                    if (replyCoords && replyCoords.found) {
                        await page.mouse.click(replyCoords.x, replyCoords.y);
                        await sleep(1500);

                        // البحث عن صندوق الرد الفرعي المتفرع
                        let replyInput = await page.$('div[role="dialog"] div[role="textbox"][contenteditable="true"]:focus, div[role="textbox"][contenteditable="true"]:focus, div[role="textbox"][contenteditable="true"]');
                        if (replyInput) {
                            await replyInput.click();
                            await sleep(500);
                            await humanType(page, commentText);
                            await sleep(randomBetween(1200, 2000));
                            await page.keyboard.press('Enter');
                            didComment = true;
                            isNestedReplyDone = true;
                            addLog(`[${account.name}] 🎭 ✅ تم نشر الرد التفاعلي بنجاح تحت استفسار العميل مباشرة!`, 'success');
                            await sleep(3500);
                        }
                    }
                } catch (repErr) {
                    addLog(`[${account.name}] ℹ️ تعذر الرد الفرعي داخل الخيط، جاري النشر كتعليق رئيسي...`, 'info');
                }
            }

            // إذا لم يكن رداً فرعياً أو تعذر النقر على "رد"، ننشره في صندوق التعليقات العام
            if (!isNestedReplyDone) {
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
            reaction: reactionTypeDone,
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
    conversationThreads = true,
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
    if (conversationThreads) {
        addLog(`🎭 ميزة الخيوط التفاعلية مفعّلة: حساب (أ) يطرح استفساراً بيعياً وحساب (ب) يرد بتجربة عميل إيجابية.`);
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

            // إعداد خيط المحادثة التفاعلية (استفسار بيعي + رد بتجربة عميل إيجابية)
            let conversationPair = null;
            let lastQuestionSnippet = '';
            if (conversationThreads && doComment && postAccounts.length >= 2) {
                if (useGroqAi) {
                    addLog(`🎭 جاري استدعاء Groq AI لتوليد محادثة تفاعلية مصرية واقعية (سؤال بيعي + تزكية عميل)...`);
                    conversationPair = await generateGroqConversationPair(postContent);
                }
                if (!conversationPair) {
                    const pick = DEFAULT_CONVERSATION_PAIRS[Math.floor(Math.random() * DEFAULT_CONVERSATION_PAIRS.length)];
                    conversationPair = { question: pick.q, review: pick.a };
                }
                addLog(`🎭 تم تجهيز الخيط التفاعلي بنجاح:\n   👤 [حساب أ - استفسار]: "${conversationPair.question}"\n   👤 [حساب ب - تزكية]: "${conversationPair.review}"`);
            }

            await notifyTelegram(
                `🚀 <b>بدء تعزيز المنشور بالحسابات المتعددة!</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🔗 <b>رابط المنشور:</b> <a href="${currentUrl}">اضغط هنا لفتح المنشور</a>\n` +
                `👥 <b>عدد الحسابات:</b> ${postAccounts.length} حساب (${postAccounts.map(a => a.name).join(', ')})\n` +
                `🎭 <b>المحادثة التفاعلية:</b> ${conversationPair ? 'مفعّلة (سؤال بيعي + تزكية عميل)' : 'تعليقات فردية'}\n` +
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
                let accountReplyToSnippet = '';
                let isThreadAccount = false;

                if (randomizeTasks) {
                    // التوزيع الذكي الواقعي المحدث:
                    // 1. التفاعل (Like 👍 أو Love ❤️): النسبة الأكبر والأعلى محاكاة للتفاعل الطبيعي (~88%)
                    accountDoLike = doLike ? (Math.random() < 0.88) : false;
                    // 2. المشاركة (Share 🔄): النسبة الكبيرة التالية لنشر البوست وتوسيعه (~65%)
                    accountDoShare = doShare ? (Math.random() < 0.65) : false;
                    // 3. التعليقات: قليلة جداً ومحصورة حصرياً لحسابين فقط لتفادي تكرار نفس الحسابات
                    accountDoComment = false;
                }

                // تخصيص أدوار المحادثة التفاعلية لحساب 0 وحساب 1 فقط (للحفاظ على قلة التعليقات وتفادي تكرار المعلقين)
                let commentText = '';
                if (conversationPair && aIdx === 0) {
                    // حساب (أ): استفسار العميل البيعي
                    isThreadAccount = true;
                    accountDoComment = true;
                    commentText = conversationPair.question;
                    lastQuestionSnippet = conversationPair.question;
                    accountReplyToSnippet = '';
                    addLog(`[${acc.name}] 🎭 [حساب أ]: مخصص لطرح استفسار بيعي جذاب: "${commentText}"`);
                } else if (conversationPair && aIdx === 1) {
                    // حساب (ب): الرد بتجربة إيجابية مباشرة داخل نفس الخيط
                    isThreadAccount = true;
                    accountDoComment = true;
                    commentText = conversationPair.review;
                    accountReplyToSnippet = lastQuestionSnippet || conversationPair.question;
                    addLog(`[${acc.name}] 🎭 [حساب ب]: مخصص للرد بتزكية إيجابية تحت استفسار حساب أ مباشرة: "${commentText}"`);
                } else if (!conversationPair && aIdx < 2 && doComment) {
                    // في حال عدم تفعيل المحادثات التفاعلية: حد أقصى تعليق أو تعليقين فقط للمنشور بالكامل
                    accountDoComment = Math.random() < 0.35;
                    if (accountDoComment) {
                        if (useGroqAi) {
                            addLog(`[${acc.name}] 🤖 جاري استدعاء Groq AI لتوليد تعليق ذكي فريد...`);
                            let candidate = await generateGroqComment(postContent, aIdx);
                            if (candidate && !usedCommentsThisPost.has(candidate)) {
                                commentText = candidate;
                            } else if (candidate) {
                                candidate = await generateGroqComment(postContent, aIdx + 7);
                                if (candidate && !usedCommentsThisPost.has(candidate)) {
                                    commentText = candidate;
                                }
                            }
                            if (commentText) {
                                addLog(`[${acc.name}] ✨ تعليق Groq AI الفريد: "${commentText}"`);
                            }
                        }

                        if (!commentText) {
                            const availableManual = manualComments.filter(c => !usedCommentsThisPost.has(c));
                            if (availableManual.length > 0) {
                                const pickIdx = Math.floor(Math.random() * availableManual.length);
                                commentText = availableManual[pickIdx];
                            } else if (manualComments.length > 0) {
                                const base = manualComments[aIdx % manualComments.length];
                                const variations = ['بالتوفيق يا رب', 'عاش والله', 'تحياتي لكم', 'كل الدعم والتقدير', 'ألف مبروك', 'دمتم متميزين'];
                                const v = variations[aIdx % variations.length];
                                commentText = `${base} - ${v}`;
                            }
                        }
                    }
                }

                if (commentText) {
                    commentText = removeEmojis(commentText);
                    usedCommentsThisPost.add(commentText);
                }

                const assignedTasksSummary = [];
                if (accountDoLike) assignedTasksSummary.push('👍 إعجاب');
                if (accountDoComment) {
                    if (conversationPair && aIdx === 0) assignedTasksSummary.push('🎭 استفسار بيعي (أ)');
                    else if (conversationPair && aIdx === 1) assignedTasksSummary.push('🎭 رد بتزكية إيجابية (ب)');
                    else assignedTasksSummary.push('💬 تعليق');
                }
                if (accountDoShare) assignedTasksSummary.push('🔄 مشاركة');

                addLog(`[${acc.name}] 🎯 مهام الحساب في هذا المنشور: [${assignedTasksSummary.join(' + ') || 'تخطي'}]`);

                // إشعار بدء تنفيذ مهام الحساب
                await notifyTelegram(
                    `⏳ <b>جاري تفاعل الحساب:</b> 👤 <b>${acc.name}</b> (${aIdx + 1}/${postAccounts.length})\n` +
                    `🎯 <b>المهام المجدولة:</b> [${assignedTasksSummary.join(' + ') || 'تصفح'}]`
                );

                // اختيار نوع التفاعل عشوائياً بين أحببته (Love ❤️) وإعجاب (Like 👍)
                let reactionType = 'like';
                if (accountDoLike) {
                    // توزيع عشوائي متوازن: ~45% احتمال أحببته (Love ❤️) و ~55% احتمال إعجاب (Like 👍)
                    reactionType = Math.random() < 0.45 ? 'love' : 'like';
                }

                const boostRes = await boostOneAccountOnPost(acc, currentUrl, {
                    doLike: accountDoLike,
                    reactionType: reactionType,
                    doComment: accountDoComment,
                    doShare: accountDoShare,
                    headless: isHeadless ? 'new' : false,
                    replyToSnippet: accountReplyToSnippet
                }, commentText);

                if (boostRes && boostRes.success) {
                    postSuccessCount++;
                    const executedTasks = [];
                    if (boostRes.didLike) {
                        executedTasks.push(boostRes.reaction === 'love' ? '❤️ أحببته (Love)' : '👍 إعجاب (Like)');
                    } else if (boostRes.wasAlreadyLiked) {
                        executedTasks.push('👍 تم التفاعل مسبقاً');
                    }
                    if (boostRes.didComment) {
                        if (conversationPair && aIdx === 0) executedTasks.push('🎭 استفسار بيعي (حساب أ)');
                        else if (conversationPair && aIdx === 1) executedTasks.push('🎭 رد بتزكية إيجابية (حساب ب)');
                        else executedTasks.push('💬 تعليق');
                    }
                    if (boostRes.didShare) executedTasks.push('🔄 مشاركة');

                    await notifyTelegram(
                        `✅ <b>تفاعل الحساب بنجاح!</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `👤 <b>الحساب:</b> <b>${acc.name}</b> (${aIdx + 1}/${postAccounts.length})\n` +
                        `🎯 <b>العمليات المنفذة:</b> ${executedTasks.length > 0 ? executedTasks.join(' + ') : 'تصفح المنشور'}\n` +
                        (boostRes.commentText ? `💬 <b>التعليق المكتوب:</b> <i>"${boostRes.commentText}"</i>\n` : '') +
                        (conversationPair && aIdx === 0 ? `💡 <i>تم طرح الاستفسار وفي انتظار رد الحساب التفاعلي والصفحة...</i>\n` : '') +
                        (conversationPair && aIdx === 1 ? `⭐ <i>تم الرد بتجربة إيجابية لدعم المصداقية الاجتماعية بنجاح!</i>\n` : '') +
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
        const puppeteer = await getPuppeteer();
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
    generateGroqConversationPair,
    DEFAULT_CONVERSATION_PAIRS,
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
