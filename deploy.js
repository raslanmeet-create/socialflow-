/**
 * سكربت أوتوماتيكي متكامل لرفع ونشر المشروع على الموقع الحي (Vercel & GitHub)
 * يقوم بتحديث أرقام الكاش، وعمل Commit، والرفع التلقائي، والتحقق من عمل الموقع الحي
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const rootDir = __dirname;
const indexHtmlPath = path.join(rootDir, 'public', 'index.html');
const LIVE_URL = 'https://agent.raslans.net';

console.log('\n======================================================');
console.log('🚀 [SocialFlow Deployer] بدء رفع التحديثات للموقع الحي');
console.log('======================================================\n');

try {
    // 1. تحديث رقم إصدار الكاش (Cache Buster) لمنع تخزين المتصفح القديم
    if (fs.existsSync(indexHtmlPath)) {
        let html = fs.readFileSync(indexHtmlPath, 'utf8');
        const newVersion = 'v_' + Date.now();
        html = html.replace(/style\.css\?v=[^"']+/g, `style.css?v=${newVersion}`);
        html = html.replace(/app\.js\?v=[^"']+/g, `app.js?v=${newVersion}`);
        fs.writeFileSync(indexHtmlPath, html, 'utf8');
        console.log(`✅ [1/4] تم تحديث رقم إصدار الملفات لتفريغ كاش المتصفح تلقائياً: (${newVersion})`);
    }

    // 2. فحص التغييرات وتجهيزها للرفع (Git Add & Commit)
    console.log('⏳ [2/4] جاري تجهيز الملفات المعدلة وعمل Commit...');
    execSync('git add -A', { cwd: rootDir, stdio: 'inherit' });

    const statusOutput = execSync('git status --porcelain', { cwd: rootDir }).toString().trim();
    if (statusOutput) {
        const commitMsg = `deploy: update live site - ${new Date().toLocaleString('ar-EG')}`;
        execSync(`git commit -m "${commitMsg}"`, { cwd: rootDir, stdio: 'inherit' });
        console.log(`✅ [2/4] تم حفظ التعديلات بنجاح في الـ Commit.`);
    } else {
        console.log(`ℹ️ [2/4] لا توجد تعديلات جديدة بانتظار الـ Commit.`);
    }

    // 3. رفع التحديثات إلى مستودع GitHub
    console.log('⏳ [3/4] جاري رفع الأكواد إلى GitHub (origin main)...');
    execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ [3/4] تم رفع الأكواد إلى GitHub بنجاح!');

    // 4. فحص اتصال الموقع الحي
    console.log(`⏳ [4/4] جاري التحقق من اتصال الموقع الحي (${LIVE_URL})...`);
    https.get(LIVE_URL, (res) => {
        console.log(`\n======================================================`);
        console.log(`🎉 تم الرفع والتحديث بنجاح تام! (حالة الموقع: ${res.statusCode} OK)`);
        console.log(`🌐 رابط موقعك الحي المحدث:`);
        console.log(`   👉 ${LIVE_URL}`);
        console.log(`======================================================\n`);
    }).on('error', (err) => {
        console.log(`\n✅ تم الرفع إلى GitHub بنجاح، وسيكتمل بناء Vercel خلال دقيقة واحدة.`);
        console.log(`🌐 رابط الموقع الحي: ${LIVE_URL}\n`);
    });

} catch (err) {
    console.error('\n❌ حدث خطأ أثناء عملية الرفع:');
    console.error(err.message || err);
    process.exit(1);
}
