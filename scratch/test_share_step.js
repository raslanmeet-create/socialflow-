const puppeteer = require('puppeteer-core');
const path = require('path');
const { loadAccounts, cleanPostUrl } = require('../booster_service');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const postUrl = cleanPostUrl('https://www.facebook.com/RaslansMarketing/posts/pfbid0STwobHs7WSNEDJY2wG4MR1QzKGZY8HP8SZ2PFzH6K9TGNMwwevPDz9CLLSfUFVEol');

(async () => {
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.name === 'fares10');
    console.log('Testing Post Share with account:', acc.name);

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

    // Get initial share count
    const initialStats = await page.evaluate(() => {
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
                return { found: true, aria, text, width: r.width, height: r.height };
            }
        }
        return { found: false };
    });

    console.log('Initial Share Button:', JSON.stringify(initialStats, null, 2));

    // Click Share button
    const clickShareResult = await page.evaluate(() => {
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

    console.log('Share Button Clicked:', JSON.stringify(clickShareResult, null, 2));
    await new Promise(r => setTimeout(r, 2500));

    // Inspect menu items that appeared
    const menuOptions = await page.evaluate(() => {
        const allItems = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="menu"] div[role="button"], div[role="menuitemcheckbox"], div[role="dialog"] div[role="button"], span'));
        return allItems.map(it => {
            const t = (it.innerText || '').trim();
            const aria = (it.getAttribute('aria-label') || '').trim();
            const r = it.getBoundingClientRect();
            return {
                text: t.slice(0, 40),
                aria: aria.slice(0, 40),
                w: Math.round(r.width),
                h: Math.round(r.height),
                top: Math.round(r.top)
            };
        }).filter(it => (it.text.includes('مشارك') || it.aria.includes('مشارك') || it.text.toLowerCase().includes('share') || it.aria.toLowerCase().includes('share')) && it.w > 30);
    });

    console.log('Share Menu Options found:', JSON.stringify(menuOptions, null, 2));

    // Click "Share Now"
    const confirmResult = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="button"], span[role="button"], div[role="dialog"] div[role="button"], span, div'));
        for (const it of items) {
            const t = (it.innerText || '').trim();
            const aria = (it.getAttribute('aria-label') || '').trim();

            const isShareNow = 
                t === 'مشاركة الآن' || t.startsWith('مشاركة الآن') || t === 'المشاركة الآن' ||
                aria === 'مشاركة الآن' ||
                t.toLowerCase().startsWith('share now') || aria.toLowerCase().startsWith('share now') ||
                t.toLowerCase().includes('share to feed') || aria.toLowerCase().includes('share to feed');

            if (isShareNow) {
                const r = it.getBoundingClientRect();
                it.click();
                return { clickedShareNow: true, text: t, aria: aria, w: r.width, h: r.height };
            }
        }
        return { clickedShareNow: false };
    });

    console.log('Confirm Share Now:', JSON.stringify(confirmResult, null, 2));
    await new Promise(r => setTimeout(r, 4000));

    // Check for toasts or confirmation messages
    const toastInfo = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('div[role="alert"], div[role="status"], span, div'));
        return alerts.map(a => (a.innerText || '').trim())
            .filter(t => t.includes('تمت المشاركة') || t.includes('مشاركة') || t.toLowerCase().includes('shared') || t.toLowerCase().includes('posted'))
            .slice(0, 5);
    });

    console.log('Toast / Status messages:', JSON.stringify(toastInfo, null, 2));

    await page.screenshot({ path: path.join(__dirname, 'scratch', 'share_test_fares10.png'), fullPage: false });
    await browser.close();
    console.log('Share test completed!');
})();
