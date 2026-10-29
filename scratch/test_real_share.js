const puppeteer = require('puppeteer-core');
const { loadAccounts, cleanPostUrl } = require('../booster_service');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const postUrl = cleanPostUrl('https://www.facebook.com/RaslansMarketing/posts/pfbid0STwobHs7WSNEDJY2wG4MR1QzKGZY8HP8SZ2PFzH6K9TGNMwwevPDz9CLLSfUFVEol');

(async () => {
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.name === 'fares10');
    console.log('Testing Real Mouse Share on:', acc.name);

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

    // 1. Locate and click Share button
    const shareBtnCoords = await page.evaluate(() => {
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
                return {
                    x: r.left + r.width / 2,
                    y: r.top + r.height / 2,
                    aria,
                    text
                };
            }
        }
        return null;
    });

    if (!shareBtnCoords) {
        console.error('Could not find share button!');
        await browser.close();
        return;
    }

    console.log('Clicking Share button at:', shareBtnCoords);
    await page.mouse.click(shareBtnCoords.x, shareBtnCoords.y);
    await new Promise(r => setTimeout(r, 2500));

    // 2. Locate the EXACT "Share Now" / "مشاركة الآن" button (role="button" or role="menuitem")
    const shareNowTarget = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('div[role="button"], div[role="menuitem"], span[role="button"]'));
        for (const b of buttons) {
            const r = b.getBoundingClientRect();
            if (r.width < 30 || r.height < 20) continue;
            const aria = (b.getAttribute('aria-label') || '').trim();
            const text = (b.innerText || '').trim();

            const isShareNow = 
                aria === 'مشاركة الآن' || aria.startsWith('مشاركة الآن') ||
                text === 'مشاركة الآن' || text.startsWith('مشاركة الآن') ||
                aria === 'المشاركة الآن' || text === 'المشاركة الآن' ||
                aria.toLowerCase().startsWith('share now') || text.toLowerCase().startsWith('share now') ||
                aria.toLowerCase().includes('share to feed') || text.toLowerCase().includes('share to feed');

            if (isShareNow) {
                return {
                    x: r.left + r.width / 2,
                    y: r.top + r.height / 2,
                    aria,
                    text,
                    w: r.width,
                    h: r.height
                };
            }
        }
        return null;
    });

    if (!shareNowTarget) {
        console.error('Could not find Share Now button in popup!');
        await browser.close();
        return;
    }

    console.log('Clicking Share Now button at:', shareNowTarget);
    await page.mouse.click(shareNowTarget.x, shareNowTarget.y);
    await new Promise(r => setTimeout(r, 4500));

    // 3. Check for confirmation toast or message
    const confirmation = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const hasToast = bodyText.includes('تمت المشاركة') || bodyText.includes('تم النشر') || bodyText.toLowerCase().includes('shared');
        return { hasToast };
    });

    console.log('Confirmation:', confirmation);

    // 4. Check updated share count
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000));

    const finalShare = await page.evaluate(() => {
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
            const isShare = aria.includes('شارك') || aria.includes('مشاركة') || aria.toLowerCase().includes('share');
            if (isShare) {
                return { aria, text };
            }
        }
        return null;
    });

    console.log('Final Share Button Status:', finalShare);
    await browser.close();
})();
