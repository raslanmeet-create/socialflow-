const http = require('http');
const app = require('../server.js');

async function runTests() {
    console.log('🧪 [SaaS Agent API Test Suite] بدء فحص واجهات ربط برنامج الكمبيوتر...');

    // 1. تشغيل الخادم على منفذ عشوائي مؤقت للاختبار
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`🌐 تم تشغيل سيرفر الاختبار على المنفذ: ${port}`);

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ [PASS]: ${message}`);
            passed++;
        } else {
            console.error(`  ❌ [FAIL]: ${message}`);
            failed++;
        }
    }

    try {
        // اختبار 1: فحص مفتاح غير صالح
        console.log('\n--- Test 1: مفتاح غير صالح (Invalid Key) ---');
        const resInvalid = await fetch(`${baseUrl}/api/agent/verify?key=invalid_key_12345`);
        const dataInvalid = await resInvalid.json();
        assert(resInvalid.status === 401, 'الحالة يجب أن تكون 401 عند إرسال مفتاح غير صالح');
        assert(dataInvalid.success === false, 'success يجب أن تكون false');

        // اختبار 2: فحص مفتاح صالح (Admin / Local Dev Key)
        console.log('\n--- Test 2: مفتاح صالح والتحقق من المستخدم (Handshake) ---');
        const resValid = await fetch(`${baseUrl}/api/agent/verify?key=local_dev_key`);
        const dataValid = await resValid.json();
        assert(resValid.status === 200, 'الحالة يجب أن تكون 200 للمفتاح الصالح');
        assert(dataValid.success === true, 'نجاح استعلام الحساب');
        assert(dataValid.user && dataValid.user.email === 'raslan.meet@gmail.com', 'التحقق من صحة بريد المستخدم');
        const testUserId = dataValid.user.id;

        // اختبار 3: إرسال نبضة النشاط (Heartbeat)
        console.log('\n--- Test 3: إرسال نبضة النشاط (Heartbeat) ---');
        const resHb = await fetch(`${baseUrl}/api/agent/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: 'local_dev_key',
                clientVersion: '1.2.0',
                accountsCount: 5,
                groupsCount: 42,
                status: 'IDLE'
            })
        });
        const dataHb = await resHb.json();
        assert(resHb.status === 200 && dataHb.success === true, 'تسجيل نبضة النشاط بنجاح');

        // اختبار 4: استعلام لوحة تحكم الموقع عن حالة الاتصال (Status Summary)
        console.log('\n--- Test 4: استعلام الموقع عن اتصال جهاز العميل (Online Status) ---');
        const resStatus = await fetch(`${baseUrl}/api/agent/status-summary?userId=${testUserId}`);
        const dataStatus = await resStatus.json();
        assert(resStatus.status === 200, 'استجابة فحص حالة الجهاز');
        assert(dataStatus.online === true, 'جهاز العميل يظهر كـ Online (متصل 🟢)');
        assert(dataStatus.accountsCount === 5, 'تطابق عدد الحسابات المسجلة');
        assert(dataStatus.groupsCount === 42, 'تطابق عدد المجموعات المسجلة');

        // اختبار 5: استعلام المهام المجدولة (Pending Tasks)
        console.log('\n--- Test 5: استعلام المهام المجدولة المعلقة (Pending Tasks) ---');
        const resTasks = await fetch(`${baseUrl}/api/agent/pending-tasks?key=local_dev_key`);
        const dataTasks = await resTasks.json();
        assert(resTasks.status === 200, 'استجابة جلب المهام المستحقة');
        assert(dataTasks.success === true && Array.isArray(dataTasks.tasks), 'إرجاع مصفوفة المهام بنجاح');
        console.log(`    ℹ️ تم العثور على ${dataTasks.count} مهمة معلقة لحساب العميل`);

        // اختبار 6: محاولة إرسال تقرير بمهمة بدون معطيات كافية
        console.log('\n--- Test 6: اختبار التحقق من مدخلات تقرير المهمة ---');
        const resBadReport = await fetch(`${baseUrl}/api/agent/report-task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'local_dev_key' })
        });
        const dataBadReport = await resBadReport.json();
        assert(resBadReport.status === 400 && dataBadReport.success === false, 'رفض إرسال تقرير ناقص المعطيات');

    } catch (err) {
        console.error('💥 خطأ غير متوقع أثناء الفحص:', err);
        failed++;
    } finally {
        server.close();
        console.log('\n======================================================');
        console.log(`📊 النتيجة النهائية: ${passed} ناجح | ${failed} فاشل`);
        console.log('======================================================\n');
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests();
