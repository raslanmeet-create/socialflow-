const puppeteer = require('puppeteer-core');
const path = require('path');
const { loadAccounts, cleanPostUrl } = require('../booster_service');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const postUrl = cleanPostUrl('https://www.facebook.com/RaslansMarketing/posts/pfbid0STwobHs7WSNEDJY2wG4MR1QzKGZY8HP8SZ2PFzH6K9TGNMwwevPDz9CLLSfUFVEol');

(async () => {
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.name === 'fares10');
    console.log('Testing share menu click on:', acc.name);

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

    // 1. Click Share on Post
    const openedMenu = await page.evaluate(() => {
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
                return { clicked: true, aria, text };
            }
        }
        return { clicked: false };
    });

    console.log('Opened Share Menu:', openedMenu);
    await new Promise(r => setTimeout(r, 2500));

    // 2. Click the specific button in the popup
    const clickedNow = await page.evaluate(() => {
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
                return { clicked: true, aria, text, tagName: b.tagName, role: b.getAttribute('role') };
            }
        }
        return { clicked: false };
    });

    console.log('Clicked Share Now:', clickedNow);
    await new Promise(r => setTimeout(r, 4000));

    // Capture screenshot after clicking
    await page.screenshot({ path: path.join(__dirname, 'after_share_click.png'), fullPage: false });

    // Check if dialog closed or toast appeared
    const afterCheck = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
            hasSharedToast: text.includes('تمت المشاركة') || text.includes('Shared'),
            bodySnippet: text.slice(0, 300)
        };
    });

    console.log('After Share Check:', afterCheck);
    await browser.close();
})();
