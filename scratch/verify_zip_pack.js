const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../server.js');

async function verifyZipPack() {
    console.log('🧪 [ZIP Inspection Test] فحص محتويات حزمة العميل المضغوطة...');

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const serverUrl = `http://localhost:${port}`;

    try {
        const res = await fetch(`${serverUrl}/api/agent/download-client-pack?key=local_dev_key`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const buf = Buffer.from(await res.arrayBuffer());
        console.log(`📦 تم تحميل حزمة البوت بنجاح: ${buf.length} بايت`);

        // فحص الملفات المدمجة داخل الـ ZIP
        const expectedFiles = [
            'client_config.json',
            'agent_runner.js',
            'booster_service.js',
            'fb_auto_worker.js',
            'manage_fb_accounts.js',
            '1-إدارة_حسابات_التفاعل.bat',
            '2-تشغيل_البوت_التلقائي.bat',
            '3-تشغيل_صامت_بالخلفية.vbs',
            '4-تفعيل_التشغيل_التلقائي_مع_الويندوز.bat',
            '5-إلغاء_التشغيل_التلقائي.bat',
            'تعليمات_البدء_السريع.txt'
        ];

        let foundCount = 0;
        const bufStr = buf.toString('binary');
        for (const f of expectedFiles) {
            // أسماء الملفات تكون مخزنة بنص عادي داخل ترويسة ملف الـ ZIP
            const exists = buf.includes(Buffer.from(f, 'utf8')) || bufStr.includes(f);
            if (exists) {
                console.log(`  ✅ [FOUND]: ${f}`);
                foundCount++;
            } else {
                console.error(`  ❌ [MISSING]: ${f}`);
            }
        }

        console.log(`\n📊 النتيجة: تم التحقق من وجود ${foundCount} من أصل ${expectedFiles.length} ملف أساسي.`);
        if (foundCount === expectedFiles.length) {
            console.log('🎉 حزمة العميل متكاملة وجاهزة للتشغيل بنقرة واحدة بدون أي نقص!');
        } else {
            throw new Error('بعض الملفات مفقودة في حزمة الـ ZIP');
        }

    } finally {
        server.close();
    }
}

verifyZipPack().catch(err => {
    console.error('💥 فشل فحص الحزمة:', err);
    process.exit(1);
});
