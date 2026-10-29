const http = require('http');
const app = require('../server.js');

async function testRunner() {
    console.log('🧪 [Test Suite] اختبار محرك مشغل الديسكتوب (Agent Runner)...');

    // 1. تشغيل السيرفر على منفذ ديناميكي
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const serverUrl = `http://localhost:${port}`;
    console.log(`🌐 سيرفر الاختبار يعمل على المنفذ: ${port}`);

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
        const testKey = 'local_dev_key';

        // اختبار 1: التحقق من المصافحة (Handshake)
        console.log('\n--- 1. اختبار مصافحة العميل مع السيرفر ---');
        const vRes = await fetch(`${serverUrl}/api/agent/verify?key=${testKey}`);
        const vData = await vRes.json();
        assert(vRes.status === 200, 'السيرفر يرد بـ 200 للمفتاح الصالح');
        assert(vData.success === true, 'نجاح استعلام البيانات');
        assert(vData.user && vData.user.name, 'استلام اسم الصفحة وصاحب الحساب');

        // اختبار 2: إرسال نبضة نشاط من المحرك
        console.log('\n--- 2. اختبار إرسال نبضة النشاط (Heartbeat) وتحديث الواجهة ---');
        const hbRes = await fetch(`${serverUrl}/api/agent/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: testKey,
                clientVersion: '1.2.0',
                accountsCount: 8,
                groupsCount: 15,
                status: 'IDLE'
            })
        });
        const hbData = await hbRes.json();
        assert(hbData.success === true, 'تم قبول نبضة النشاط من المحرك');

        const statusRes = await fetch(`${serverUrl}/api/agent/status-summary?userId=${vData.user.id}`);
        const statusData = await statusRes.json();
        assert(statusData.online === true, 'الواجهة ترى أن البرنامج متصل (Online: true)');
        assert(statusData.accountsCount === 8, 'تطابق عدد الحسابات (8)');

        // اختبار 3: استعلام المهام
        console.log('\n--- 3. اختبار استعلام المهام المعلقة ---');
        const tasksRes = await fetch(`${serverUrl}/api/agent/pending-tasks?key=${testKey}`);
        const tasksData = await tasksRes.json();
        assert(tasksData.success === true && Array.isArray(tasksData.tasks), 'استجابة صحيحة لمصفوفة المهام');

        // اختبار 4: إرسال تقرير إنجاز مهمة
        console.log('\n--- 4. اختبار إرسال تقرير إنجاز المهمة للسيرفر السحابي ---');
        // نختبر مع منشور وهمي لمعاينة الرد الصحيح
        const reportRes = await fetch(`${serverUrl}/api/agent/report-task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: testKey,
                postId: 'non_existent_test_id',
                taskType: 'booster',
                success: true
            })
        });
        assert(reportRes.status === 404, 'تم التحقق من وجود المنشور قبل تعديل حالته في السحابة');

        // اختبار 5: توليد وتحميل حزمة العميل المخصصة (ZIP Package)
        console.log('\n--- 5. اختبار توليد وتحميل حزمة البوت للمشترك بنقرة واحدة (ZIP) ---');
        const packRes = await fetch(`${serverUrl}/api/agent/download-client-pack?key=${testKey}`);
        assert(packRes.status === 200, 'السيرفر يرجع 200 لطلب تحميل الحزمة');
        assert(packRes.headers.get('content-type') === 'application/zip', 'نوع الملف المرسل هو ZIP سليم');
        const zipBuffer = await packRes.arrayBuffer();
        assert(zipBuffer.byteLength > 20000, `تم إنشاء حزمة الـ ZIP بنجاح بحجم: ${Math.round(zipBuffer.byteLength / 1024)} كيلوبايت`);
        console.log(`    📦 تم استلام حزمة البوت المخصصة بنجاح (${Math.round(zipBuffer.byteLength / 1024)} KB)`);

    } catch (err) {
        console.error('💥 خطأ غير متوقع:', err);
        failed++;
    } finally {
        server.close();
        console.log('\n======================================================');
        console.log(`📊 النتيجة: ${passed} ناجح | ${failed} فاشل`);
        console.log('======================================================\n');
        process.exit(failed > 0 ? 1 : 0);
    }
}

testRunner();
