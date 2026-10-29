const puppeteer = require('puppeteer-core');
const { loadAccounts, cleanPostUrl } = require('../booster_service');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const postUrl = cleanPostUrl('https://www.facebook.com/RaslansMarketing/posts/pfbid0STwobHs7WSNEDJY2wG4MR1QzKGZY8HP8SZ2PFzH6K9TGNMwwevPDz9CLLSfUFVEol');

(async () => {
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.name === 'fares7');

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

    const dialogsInfo = await page.evaluate(() => {
        const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
        return dialogs.map((d, i) => {
            const btns = Array.from(d.querySelectorAll('div[role="button"], span[role="button"]'));
            const labels = btns.map(b => (b.getAttribute('aria-label') || b.innerText || '').slice(0, 30).trim()).filter(Boolean);
            const r = d.getBoundingClientRect();
            return {
                index: i,
                ariaLabel: d.getAttribute('aria-label'),
                w: r.width,
                h: r.height,
                top: r.top,
                buttonCount: btns.length,
                sampleLabels: labels.slice(0, 10)
            };
        });
    });

    console.log('Dialogs found:', JSON.stringify(dialogsInfo, null, 2));
    await browser.close();
})();
