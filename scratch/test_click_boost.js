const puppeteer = require('puppeteer-core');
const { loadAccounts, cleanPostUrl } = require('../booster_service');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const postUrl = cleanPostUrl('https://www.facebook.com/RaslansMarketing/posts/pfbid0STwobHs7WSNEDJY2wG4MR1QzKGZY8HP8SZ2PFzH6K9TGNMwwevPDz9CLLSfUFVEol');

(async () => {
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.name === 'fares8');
    console.log('Testing full Like & Share on:', acc.name);

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

    // 1. Like
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
            if (r.width < 40 || r.height < 25) continue;

            const aria = (b.getAttribute('aria-label') || '').trim();
            const text = (b.innerText || '').trim();

            const isAlreadyLiked = 
                aria.includes('إزالة') || aria.includes('إلغاء') || aria.toLowerCase().includes('unlike') || 
                aria.toLowerCase().includes('remove') || aria.includes('أعجبك');

            if (isAlreadyLiked) {
                return { status: 'already_liked', aria, text };
            }

            const isLike = 
                aria === 'أعجبني' || aria.toLowerCase() === 'like' || aria === 'إعجاب' ||
                text === 'أعجبني' || text.toLowerCase() === 'like';

            if (isLike) {
                b.scrollIntoView({ behavior: 'instant', block: 'center' });
                b.focus();
                b.click();
                return { status: 'clicked', aria, text };
            }
        }
        return { status: 'not_found' };
    });

    console.log('Like result:', likeRes);
    await new Promise(r => setTimeout(r, 3000));

    // 2. Share
    const shareRes = await page.evaluate(() => {
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
                return { status: 'opened_share_menu', aria, text };
            }
        }
        return { status: 'not_found' };
    });

    console.log('Share button clicked:', shareRes);
    await new Promise(r => setTimeout(r, 2500));

    // 3. Confirm Share Now
    const confirmShare = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="button"], span[role="button"], span, div'));
        for (const it of items) {
            const t = (it.innerText || '').trim();
            const aria = (it.getAttribute('aria-label') || '').trim();

            const isShareNow = 
                t === 'مشاركة الآن' || t.startsWith('مشاركة الآن') || t === 'المشاركة الآن' ||
                aria === 'مشاركة الآن' ||
                t.toLowerCase().startsWith('share now') || aria.toLowerCase().startsWith('share now') ||
                t.toLowerCase().includes('share to feed') || aria.toLowerCase().includes('share to feed');

            if (isShareNow) {
                it.click();
                return { status: 'confirmed_share_now', matchedText: t, matchedAria: aria };
            }
        }
        return { status: 'share_now_not_found' };
    });

    console.log('Share Now confirmation:', confirmShare);
    await new Promise(r => setTimeout(r, 4000));

    await browser.close();
    console.log('Test completed!');
})();
