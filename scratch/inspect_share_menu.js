const puppeteer = require('puppeteer-core');
const { loadAccounts, cleanPostUrl } = require('../booster_service');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const postUrl = cleanPostUrl('https://www.facebook.com/RaslansMarketing/posts/pfbid0STwobHs7WSNEDJY2wG4MR1QzKGZY8HP8SZ2PFzH6K9TGNMwwevPDz9CLLSfUFVEol');

(async () => {
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.name === 'fares10');
    console.log('Inspecting Share Menu for:', acc.name);

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

    // Click Share button
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
            const aria = (b.getAttribute('aria-label') || '').trim();
            const isShare = aria.includes('شارك') || aria.includes('مشاركة') || aria.toLowerCase().includes('share');
            if (isShare) {
                b.scrollIntoView({ behavior: 'instant', block: 'center' });
                b.click();
                break;
            }
        }
    });

    await new Promise(r => setTimeout(r, 2500));

    // Detailed inspection of all elements in the share popup
    const popupElements = await page.evaluate(() => {
        // Find all clickable elements that appeared
        const candidates = Array.from(document.querySelectorAll('[role="menuitem"], [role="button"], div[tabindex="0"], div[tabindex="-1"], span'));
        return candidates.map(el => {
            const r = el.getBoundingClientRect();
            const text = (el.innerText || '').trim();
            const aria = (el.getAttribute('aria-label') || '').trim();
            return {
                tagName: el.tagName,
                role: el.getAttribute('role'),
                tabIndex: el.getAttribute('tabindex'),
                aria,
                text: text.slice(0, 50),
                w: Math.round(r.width),
                h: Math.round(r.height),
                top: Math.round(r.top),
                left: Math.round(r.left),
                hasOnClick: typeof el.onclick === 'function'
            };
        }).filter(el => {
            return (el.text.includes('مشاركة الآن') || el.aria.includes('مشاركة الآن') || 
                    el.text.toLowerCase().includes('share now') || el.aria.toLowerCase().includes('share now')) &&
                   el.w > 20 && el.h > 15;
        });
    });

    console.log('Share Now Elements Detail:', JSON.stringify(popupElements, null, 2));

    await browser.close();
})();
