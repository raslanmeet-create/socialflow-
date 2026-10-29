const puppeteer = require('puppeteer-core');
const { loadAccounts, cleanPostUrl } = require('../booster_service');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const postUrl = cleanPostUrl('https://www.facebook.com/RaslansMarketing/posts/pfbid0STwobHs7WSNEDJY2wG4MR1QzKGZY8HP8SZ2PFzH6K9TGNMwwevPDz9CLLSfUFVEol');

(async () => {
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.name === 'fares10');

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
    await new Promise(r => setTimeout(r, 4500));

    const checkStats = await page.evaluate(() => {
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
        
        let likeBtn = null;
        let shareBtn = null;

        for (const b of buttons) {
            const r = b.getBoundingClientRect();
            if (r.width < 40 || r.height < 25) continue;
            const aria = (b.getAttribute('aria-label') || '').trim();
            const text = (b.innerText || '').trim();

            if (aria.includes('أعجب') || aria.toLowerCase().includes('like') || text.includes('أعجب')) {
                likeBtn = { aria, text };
            }
            if (aria.includes('شارك') || aria.includes('مشاركة') || aria.toLowerCase().includes('share')) {
                shareBtn = { aria, text };
            }
        }

        // Also find share count from the stats row if any
        const allText = container.innerText;
        return { likeBtn, shareBtn, allTextSnippet: allText.slice(0, 500) };
    });

    console.log('Current Post Stats on FB:', JSON.stringify(checkStats, null, 2));
    await browser.close();
})();
