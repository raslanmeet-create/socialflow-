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

    // Scroll as booster_service does:
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
    await new Promise(r => setTimeout(r, 2000));

    const result = await page.evaluate(() => {
        const container = document.querySelector('div[role="dialog"]') || document.querySelector('div[role="main"]') || document.body;
        const buttons = Array.from(container.querySelectorAll('div[role="button"], span[role="button"]'));
        
        const logs = [];
        logs.push(`Container tagName: ${container.tagName}, role: ${container.getAttribute('role')}, buttons: ${buttons.length}`);

        let likeDecision = null;

        for (const b of buttons) {
            const r = b.getBoundingClientRect();
            const aria = (b.getAttribute('aria-label') || '').trim();
            const text = (b.innerText || '').trim();

            if (aria.includes('أعجب') || aria.toLowerCase().includes('like') || text.includes('أعجب') || text.toLowerCase().includes('like')) {
                logs.push(`Found candidate: aria="${aria}", text="${text}", w=${r.width}, h=${r.height}, top=${r.top}`);
            }

            if (r.width < 40 || r.height < 25) continue;

            const isAlreadyLiked = 
                aria.includes('إزالة') || aria.includes('إلغاء') || aria.toLowerCase().includes('unlike') || 
                aria.toLowerCase().includes('remove') || aria.includes('أعجبك');
            if (isAlreadyLiked) {
                likeDecision = { alreadyLiked: true, aria, text };
                break;
            }

            const isLikeBtn = 
                aria === 'أعجبني' || aria.toLowerCase() === 'like' || aria === 'إعجاب' ||
                text === 'أعجبني' || text.toLowerCase() === 'like';

            if (isLikeBtn) {
                likeDecision = { clicked: true, aria, text };
                break;
            }
        }

        return { logs, likeDecision };
    });

    console.log('Result:', JSON.stringify(result, null, 2));
    await browser.close();
})();
