const puppeteer = require('puppeteer-core');
const path = require('path');
const os = require('os');
const fs = require('fs');
const readline = require('readline');

const ACCOUNTS_FILE = path.join(__dirname, 'fb_booster_accounts.json');
const COMMENTS_FILE = path.join(__dirname, 'booster_comments.txt');

const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome SxS\\Application\\chrome.exe')
];
const CHROME_PATH = CHROME_PATHS.find(p => fs.existsSync(p)) || CHROME_PATHS[0];

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans.trim());
    }));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let sendTelegramAlert = null;
try {
    const worker = require('./fb_auto_worker');
    sendTelegramAlert = worker.sendTelegramAlert;
} catch (e) {}

async function notifyTelegram(html) {
    if (typeof sendTelegramAlert === 'function') {
        try {
            await sendTelegramAlert(html);
        } catch (e) {}
    }
}

function loadAccounts() {
    if (!fs.existsSync(ACCOUNTS_FILE)) return [];
    try {
        const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
        return JSON.parse(data).filter(a => a.enabled !== false);
    } catch (e) {
        return [];
    }
}

function loadComments() {
    if (!fs.existsSync(COMMENTS_FILE)) {
        return ['Great work, wishing you all the best! 👏', 'Excellent professional service! 🔥', 'Keep up the amazing work! 🌟'];
    }
    const lines = fs.readFileSync(COMMENTS_FILE, 'utf8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));
    return lines.length > 0 ? lines : ['Great job! 👏'];
}

// Realistic human typing
async function humanType(page, text) {
    for (const char of text) {
        await page.keyboard.type(char);
        await sleep(randomBetween(40, 110));
    }
}

// Perform Like
async function performLike(page) {
    try {
        console.log('    👍 Checking Like button...');
        await sleep(randomBetween(1500, 2500));

        const likedResult = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('div[role="button"], span[role="button"]'));
            for (const b of buttons) {
                const label = (b.getAttribute('aria-label') || '').trim();
                const text = (b.innerText || '').trim();

                if (label.includes('إلغاء إعجاب') || label.includes('Unlike') || label.includes('أعجبك هذا') || label.includes('Remove reaction')) {
                    return { alreadyLiked: true };
                }

                if (label === 'أعجبني' || label === 'إعجاب' || label === 'Like' || text === 'أعجبني' || text === 'Like') {
                    b.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    b.click();
                    return { clicked: true, label: label || text };
                }
            }
            return { notFound: true };
        });

        if (likedResult.alreadyLiked) {
            console.log('    ℹ️ Account already liked this post.');
            return true;
        }

        if (likedResult.clicked) {
            console.log(`    ✅ Clicked Like (${likedResult.label}) successfully!`);
            return true;
        }

        const fallbackBtn = await page.$('div[aria-label="إعجاب"], div[aria-label="أعجبني"], div[aria-label="Like"]');
        if (fallbackBtn) {
            await fallbackBtn.click();
            console.log('    ✅ Clicked Like via fallback selector!');
            return true;
        }

        console.log('    ⚠️ Like button not found.');
        return false;
    } catch (e) {
        console.log(`    ⚠️ Error performing Like: ${e.message}`);
        return false;
    }
}

// Perform Comment
async function performComment(page, commentText) {
    try {
        console.log(`    💬 Typing comment: "${commentText}"...`);
        await sleep(randomBetween(1500, 3000));

        let commentBox = await page.$('div[role="textbox"][contenteditable="true"]');
        
        if (!commentBox) {
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('div[role="button"], span[role="button"]'));
                for (const b of buttons) {
                    const label = (b.getAttribute('aria-label') || '').trim();
                    const text = (b.innerText || '').trim();
                    if (label.includes('تعليق') || label.includes('Comment') || text === 'تعليق' || text === 'Comment') {
                        b.click();
                        break;
                    }
                }
            });
            await sleep(2000);
            commentBox = await page.$('div[role="textbox"][contenteditable="true"]');
        }

        if (commentBox) {
            await commentBox.click();
            await sleep(800);
            await humanType(page, commentText);
            await sleep(randomBetween(1200, 2200));
            await page.keyboard.press('Enter');
            console.log('    ✅ Comment published successfully!');
            await sleep(3000);
            return true;
        } else {
            console.log('    ⚠️ Comment input box not found.');
            return false;
        }
    } catch (e) {
        console.log(`    ⚠️ Error writing comment: ${e.message}`);
        return false;
    }
}

// Perform Share
async function performShare(page) {
    try {
        console.log('    🔄 Checking Share button...');
        await sleep(randomBetween(1500, 2500));

        const shareFound = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('div[role="button"], span[role="button"]'));
            for (const b of buttons) {
                const label = (b.getAttribute('aria-label') || '').trim();
                const text = (b.innerText || '').trim();

                if (label.includes('مشاركة') || label.includes('شارك') || label.includes('Share') || text === 'مشاركة' || text === 'Share') {
                    b.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    b.click();
                    return true;
                }
            }
            return false;
        });

        if (!shareFound) {
            console.log('    ⚠️ Share button not found on this post.');
            return false;
        }

        await sleep(2500);

        const sharedNow = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="button"], span'));
            for (const item of items) {
                const t = (item.innerText || '').trim();
                if (t.includes('مشاركة الآن') || t.includes('Share now') || t.includes('المشاركة الآن') || t.includes('المشاركة في آخر الأخبار') || t.includes('Share to feed')) {
                    item.click();
                    return t;
                }
            }
            return null;
        });

        if (sharedNow) {
            console.log(`    ✅ Executed: "${sharedNow}" successfully!`);
            await sleep(4000);
            return true;
        } else {
            console.log('    ⚠️ "Share now" option not found in menu.');
            return false;
        }
    } catch (e) {
        console.log(`    ⚠️ Error performing Share: ${e.message}`);
        return false;
    }
}

// Execute engagement for one account
async function boostWithAccount(account, postUrl, options, commentText) {
    console.log(`\n======================================================`);
    console.log(`👤 Active Account: [${account.name}]`);
    console.log(`📁 Profile Path: ${account.profileFolder}`);
    console.log(`======================================================`);

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            userDataDir: account.profileFolder,
            headless: options.headless,
            defaultViewport: null,
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-notifications',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-blink-features=AutomationControlled',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--window-size=1280,900'
            ]
        });

        const pages = await browser.pages();
        const page = pages[0] || await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        console.log(`🌐 Navigating to post URL...`);
        await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(randomBetween(3500, 6000));

        // Pre-flight session check
        const curUrl = page.url();
        const cookies = await page.cookies();
        const cUser = cookies.find(c => c.name === 'c_user');
        if (!cUser || !cUser.value || curUrl.includes('/login') || curUrl.includes('checkpoint')) {
            console.log(`⚠️ Session expired or requires login for [${account.name}]. Skipping.`);
            await browser.close();
            return false;
        }

        // Simulate human scrolling
        await page.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
        await sleep(randomBetween(1000, 2000));

        // 1. Like
        if (options.doLike) {
            await performLike(page);
            await sleep(randomBetween(2500, 5000));
        }

        // 2. Comment
        if (options.doComment && commentText) {
            await performComment(page, commentText);
            await sleep(randomBetween(3000, 6000));
        }

        // 3. Share
        if (options.doShare) {
            await performShare(page);
            await sleep(randomBetween(3000, 5000));
        }

        console.log(`🎉 Engagement completed for account: [${account.name}]`);
        await sleep(2000);
        await browser.close();
        return true;
    } catch (err) {
        console.error(`❌ Error with account [${account.name}]:`, err.message);
        if (browser) {
            try { await browser.close(); } catch (e) {}
        }
        return false;
    }
}

async function main() {
    const accounts = loadAccounts();
    if (accounts.length === 0) {
        console.log('\n❌ No registered accounts found!');
        console.log('👉 Please first add accounts using: node manage_fb_accounts.js');
        console.log('   Select option [2] to add accounts and save their sessions.\n');
        process.exit(1);
    }

    console.log('\n======================================================');
    console.log('🚀 Facebook Post Multi-Account Booster');
    console.log(`👥 Ready Accounts: ${accounts.length}`);
    console.log('======================================================\n');

    // 1. Post URL
    let postUrl = process.argv[2];
    if (!postUrl) {
        postUrl = await askQuestion('🔗 Enter Facebook Post URL: ');
    }
    if (!postUrl || !postUrl.includes('facebook.com')) {
        console.log('❌ Invalid or empty Facebook Post URL.');
        process.exit(1);
    }

    // 2. Engagement options
    const likeAns = await askQuestion('👍 Like post from accounts? (y/n) [Default: y]: ');
    const doLike = likeAns.toLowerCase() !== 'n';

    const commentAns = await askQuestion('💬 Add comments from accounts? (y/n) [Default: y]: ');
    const doComment = commentAns.toLowerCase() !== 'n';

    const shareAns = await askQuestion('🔄 Share post on account profiles? (y/n) [Default: y]: ');
    const doShare = shareAns.toLowerCase() !== 'n';

    const randAns = await askQuestion('🎲 Randomize tasks per account (natural human behavior)? (y/n) [Default: y]: ');
    const randomizeTasks = randAns.toLowerCase() !== 'n';

    const viewAns = await askQuestion('👁️ Show visible browser window? (y/n) [Default: y]: ');
    const isHeadless = viewAns.toLowerCase() === 'n' ? 'new' : false;

    const availableComments = loadComments();
    console.log(`\n📝 Loaded ${availableComments.length} comments from booster_comments.txt`);

    console.log('\n⏳ Starting multi-account engagement cycle with safety intervals...');
    console.log('🛡️ Safety delay between accounts is enabled to mimic human behavior.\n');

    let successCount = 0;
    const activeAccounts = randomizeTasks ? [...accounts].sort(() => Math.random() - 0.5) : accounts;

    await notifyTelegram(
        `🚀 <b>بدء تعزيز المنشور بالحسابات المتعددة!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🔗 <b>رابط المنشور:</b> <a href="${postUrl}">اضغط هنا لفتح المنشور</a>\n` +
        `👥 <b>عدد الحسابات:</b> ${activeAccounts.length} حساب (${activeAccounts.map(a => a.name).join(', ')})\n` +
        `🎲 <b>التوزيع:</b> مهام عشوائية ذكية بفواصل زمنية أمنية`
    );

    for (let i = 0; i < activeAccounts.length; i++) {
        const account = activeAccounts[i];

        let accountDoLike = doLike;
        let accountDoComment = doComment;
        let accountDoShare = doShare;

        if (randomizeTasks) {
            accountDoLike = doLike ? (Math.random() < 0.85) : false;
            accountDoComment = doComment ? (Math.random() < 0.55) : false;
            accountDoShare = doShare ? (Math.random() < 0.35) : false;

            if (!accountDoLike && !accountDoComment && !accountDoShare) {
                const pool = [];
                if (doLike) pool.push('like');
                if (doComment) pool.push('comment');
                if (doShare) pool.push('share');
                if (pool.length > 0) {
                    const picked = pool[Math.floor(Math.random() * pool.length)];
                    if (picked === 'like') accountDoLike = true;
                    if (picked === 'comment') accountDoComment = true;
                    if (picked === 'share') accountDoShare = true;
                }
            }
        }

        const tasksStr = [];
        if (accountDoLike) tasksStr.push('👍 Like');
        if (accountDoComment) tasksStr.push('💬 Comment');
        if (accountDoShare) tasksStr.push('🔄 Share');

        console.log(`\n▶️ [${i + 1}/${activeAccounts.length}] Account: ${account.name} | Assigned Tasks: [${tasksStr.join(' + ') || 'Skip'}]`);

        const commentForThisAcc = accountDoComment ? availableComments[i % availableComments.length] : '';

        await notifyTelegram(
            `⏳ <b>جاري تفاعل الحساب:</b> 👤 <b>${account.name}</b> (${i + 1}/${activeAccounts.length})\n` +
            `🎯 <b>المهام المجدولة:</b> [${tasksStr.join(' + ') || 'تصفح'}]`
        );

        const ok = await boostWithAccount(account, postUrl, {
            doLike: accountDoLike,
            doComment: accountDoComment,
            doShare: accountDoShare,
            headless: isHeadless
        }, commentForThisAcc);

        if (ok) {
            successCount++;
            await notifyTelegram(
                `✅ <b>تفاعل الحساب بنجاح!</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `👤 <b>الحساب:</b> <b>${account.name}</b> (${i + 1}/${activeAccounts.length})\n` +
                `🎯 <b>العمليات المنفذة:</b> [${tasksStr.join(' + ')}]\n` +
                (commentForThisAcc ? `💬 <b>التعليق:</b> <i>"${commentForThisAcc}"</i>\n` : '') +
                `📊 <b>الحالة:</b> الحساب يعمل بكفاءة 🟢`
            );
        } else {
            await notifyTelegram(
                `⚠️ <b>تعذر تفاعل الحساب:</b> 👤 <b>${account.name}</b> (${i + 1}/${activeAccounts.length})\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `ℹ️ <b>الحالة:</b> الجلسة غير متصلة أو تتطلب تأكيد أمان`
            );
        }

        // Delay between accounts
        if (i < activeAccounts.length - 1) {
            const waitSeconds = randomBetween(25, 45);
            console.log(`\n⏱️ [Safety Delay]: Waiting ${waitSeconds} seconds before next account...`);
            await sleep(waitSeconds * 1000);
        }
    }

    await notifyTelegram(
        `🏁 <b>اكتمل تعزيز المنشور بنجاح تام!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎉 <b>عدد الحسابات المتفاعلة:</b> ${successCount} من أصل ${activeAccounts.length}\n` +
        `🔗 <a href="${postUrl}">عرض المنشور على فيسبوك</a>`
    );

    console.log('\n======================================================');
    console.log(`🏁 Operation completed!`);
    console.log(`🎯 Successful accounts: ${successCount} out of ${activeAccounts.length}`);
    console.log('======================================================\n');
}

main().catch(console.error);
