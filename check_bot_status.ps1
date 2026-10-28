[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "فحص حالة بوت فيسبوك - رسلان للتسويق"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host " 🔍 جاري فحص حالة بوت النشر التلقائي في المجموعات..." -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

$proc = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*fb_bot_daemon.js*" }

if ($proc) {
    Clear-Host
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host "  🟢 حالة البوت: شغال ويعمل بنشاط في الخلفية الآن!" -ForegroundColor Green
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  💻 حالة النظام: عملية البوت نشطة وتراقب أي منشور جديد كل 30 ثانية." -ForegroundColor White
    Write-Host "  🏢 الصفحة المعتمدة: Raslans Marketing - رسلان للتسويق" -ForegroundColor White
    Write-Host "  🤖 الذكاء الاصطناعي: Groq AI (openai/gpt-oss-120b) جاهز لتوليد الخطافات." -ForegroundColor White
    Write-Host ""
    Write-Host "  📢 دورة المتابعة على تيليجرام:" -ForegroundColor Yellow
    Write-Host "     1. يرسل لك إشعاراً فورياً: 'سأبدأ النشر الآن مع أسماء المجموعات'." -ForegroundColor Gray
    Write-Host "     2. يرسل لك إشعار نجاح فوري بعد كل جروب يتم النشر فيه." -ForegroundColor Gray
    Write-Host "     3. يرسل لك تقريراً شاملاً: 'انتهيت من مهمة اليوم بنجاح 100%'." -ForegroundColor Gray
    Write-Host "     4. إذا أُغلق البوت فجأة، يرسل لك تنبيهاً فورياً بأنه توقف." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  📱 فحص من الهاتف:" -ForegroundColor Magenta
    Write-Host "     يمكنك في أي وقت فتح تطبيق تيليجرام وإرسال 'شغال؟' أو '/status'" -ForegroundColor Gray
    Write-Host "     ليرد عليك البوت في ثانية واحدة بحالته ومدة تشغيله!" -ForegroundColor Gray
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Green
} else {
    Clear-Host
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host "  🔴 حالة البوت: متوقف حالياً!" -ForegroundColor Red
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  ⚠️ البوت لا يعمل في الخلفية في هذه اللحظة." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  👉 لتشغيله بنقرة واحدة الآن:" -ForegroundColor Cyan
    Write-Host "     اضغط على ملف 'تشغيل_بوت_الجروبات_التلقائي.bat' على سطح المكتب." -ForegroundColor White
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Red
}

Write-Host "اضغط Enter للإغلاق..." -ForegroundColor DarkGray
Read-Host
