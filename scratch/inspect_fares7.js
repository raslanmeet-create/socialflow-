const puppeteer = require('puppeteer-core');
const path = require('path');
const { loadAccounts, cleanPostUrl } = require('../booster_service');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const postUrl = cleanPostUrl('https://www.facebook.com/RaslansMarketing/posts/pfbid0STwobHs7WSNEDJY2wG4MR1QzKGZY8HP8SZ2PFzH6K9TGNMwwevPDz9CLLSfUFVEol');

(async () => {
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.name === 'fares7');
    console.log('Testing inspect on:', acc.name, 'folder:', acc.profileFolder);

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        userDataDir: acc.profileFolder,
        headless: 'new',
        defaultViewport: { width: 1280, height: 900 },
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-notifications',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,900'
        ]
    });

    const page = (await browser.pages())[0];
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000));

    // Inspect dialog vs main vs body
    const debugInfo = await page.evaluate(() => {
        const hasDialog = !!document.querySelector('div[role="dialog"]');
        const hasMain = !!document.querySelector('div[role="main"]');
        const container = document.querySelector('div[role="dialog"]') || document.querySelector('div[role="main"]') || document.body;

        const allButtons = Array.from(document.querySelectorAll('div[role="button"], span[role="button"], [role="button"]'));
        const btnList = allButtons.map(b => {
            const r = b.getBoundingClientRect();
            return {
                aria: b.getAttribute('aria-label') || '',
                text: (b.innerText || '').slice(0, 50).replace(/\n/g, ' '),
                w: Math.round(r.width),
                h: Math.round(r.height),
                top: Math.round(r.top),
                left: Math.round(r.left),
                inDialog: !!b.closest('div[role="dialog"]'),
                inMain: !!b.closest('div[role="main"]')
            };
        }).filter(b => b.aria || b.text);

        return {
            title: document.title,
            url: window.location.href,
            hasDialog,
            hasMain,
            btnCount: allButtons.length,
            buttons: btnList
        };
    });

    console.log('Page Title:', debugInfo.title);
    console.log('Page URL:', debugInfo.url);
    console.log('hasDialog:', debugInfo.hasDialog);
    const dialogButtons = debugInfo.buttons.filter(b => b.inDialog);
    console.log('Dialog buttons count:', dialogButtons.length);
    for (const b of dialogButtons) {
        if (b.w >= 20 || b.text) {
            console.log(`[Dialog Btn] aria="${b.aria}" text="${b.text}" w=${b.w} h=${b.h} top=${b.top} left=${b.left}`);
        }
    }

    await page.screenshot({ path: path.join(__dirname, 'fares7_inspect.png'), fullPage: false });
    await browser.close();
})();
