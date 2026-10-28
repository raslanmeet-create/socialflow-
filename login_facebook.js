const puppeteer = require('puppeteer-core');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function loginFlow() {
    const CHROME_PATHS = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
    ];
    const chromePath = CHROME_PATHS.find(p => fs.existsSync(p)) || CHROME_PATHS[0];
    const sessionDir = path.join(os.homedir(), '.fb_bot_profile');

    console.log('\n======================================================');
    console.log('🚀 جاري فتح متصفح Chrome الآن...');
    console.log('👉 يرجى الضغط على أيقونة Chrome في شريط المهام بالأسفل.');
    console.log('👉 سجّل دخولك إلى فيسبوك وسيقوم البوت باكتشاف الجلسة فوراً!');
    console.log('======================================================\n');

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        userDataDir: sessionDir,
        headless: false,
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-notifications',
            '--start-maximized',
            '--window-position=0,0'
        ]
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });

    console.log('⏳ المتصفح مفتوح الآن وفي انتظار تسجيل الدخول...');

    const maxWaitTime = 10 * 60 * 1000; // 10 دقائق
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        try {
            const cookies = await page.cookies();
            const cUser = cookies.find(c => c.name === 'c_user');
            if (cUser && cUser.value) {
                console.log(`\n🎉 مبروك! تم تسجيل الدخول بنجاح! معرف الحساب: ${cUser.value}`);
                console.log(`💾 جاري تثبيت وحفظ الجلسة...`);
                await new Promise(r => setTimeout(r, 4000));
                await browser.close();
                console.log(`✅ تم حفظ الجلسة بنجاح دائم! البوت جاهز تماماً للنشر الآلي.\n`);
                process.exit(0);
            }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('⚠️ انتهت مهلة الانتظار.');
    await browser.close();
}

loginFlow().catch(console.error);
