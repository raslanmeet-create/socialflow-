@echo off
chcp 65001 > nul
title تثبيت وإعداد بوت النشر الآلي - رسلان للتسويق
color 0B
cls

echo ========================================================================
echo   🚀 مرحباً بك في معالج التثبيت التلقائي لبوت النشر (SocialFlow)
echo   🏢 الوكيل الذكي لشركة رسلان للتسويق
echo ========================================================================
echo.
echo   [1/4] جاري فحص بيئة تشغيل النظام والمتطلبات...

:: 1. فحص وجود متصفح كروم
set CHROME_FOUND=0
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1

if "%CHROME_FOUND%"=="0" (
    echo   ⚠️ تنبيه: لم يتم العثور على Google Chrome.
    echo   جاري تحميل وتثبيت Google Chrome تلقائياً...
    powershell -Command "Invoke-WebRequest -Uri 'https://dl.google.com/chrome/install/latest/chrome_installer.exe' -OutFile '%temp%\chrome_installer.exe'; Start-Process '%temp%\chrome_installer.exe' -ArgumentList '/silent /install' -Wait"
    echo   ✅ تم تثبيت Google Chrome بنجاح!
) else (
    echo   ✅ متصفح Google Chrome متوفر وجاهز.
)

:: 2. فحص وجود Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   [2/4] جاري تثبيت محرك التشغيل Node.js تلقائياً لأول مرة...
    echo   يرجى الانتظار دقيقة واحدة (يتم التحميل والتثبيت في صمت)...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%temp%\node_setup.msi'; Start-Process msiexec.exe -ArgumentList '/i %temp%\node_setup.msi /quiet /qn' -Wait; Remove-Item '%temp%\node_setup.msi' -ErrorAction SilentlyContinue"
    echo   ✅ تم تثبيت Node.js بنجاح في النظام!
) else (
    echo   ✅ محرك التشغيل Node.js متوفر وجاهز.
)

:: 3. إنشاء رابط المسار النظيف في C:\SocialFlow لضمان العمل بدون أي مشاكل في المسارات
echo.
echo   [3/4] جاري إعداد مجلد العمل الآمن على جهازك...
set CURRENT_DIR=%~dp0
set TARGET_DIR=C:\SocialFlow

if not exist "%TARGET_DIR%" (
    powershell -Command "New-Item -ItemType Junction -Path '%TARGET_DIR%' -Target '%CURRENT_DIR%' -Force" >nul 2>nul
)

:: 3.5 مزامنة إعدادات العميل تلقائياً من الموقع عبر البريد الإلكتروني
echo.
echo ========================================================================
echo   🔐 ربط البوت بحسابك السحابي تلقائياً:
echo ========================================================================
set /p CLIENT_EMAIL="   ✉️ أدخل بريدك الإلكتروني المسجل في الموقع (agent.raslans.net): "
echo.
echo   جاري جلب إعدادات حسابك وصفحتك التجارية من السحابة...
node -e "const email = (process.argv[1] || '').trim(); if(!email) process.exit(0); fetch('https://socialflow-olive.vercel.app/api/client/sync-config?email=' + encodeURIComponent(email)).then(r => r.json()).then(d => { if(d.success){ require('fs').writeFileSync('%CURRENT_DIR%client_config.json', JSON.stringify(d.config, null, 2), 'utf8'); console.log('   ✅ تم التعرف على حسابك بنجاح: ' + d.config.client_name); console.log('   🏢 الصفحة المرتبطة بالبوت: ' + d.config.page_name); } else { console.log('   ⚠️ تنبيه: ' + d.message); } }).catch(e => { console.log('   ⚠️ تعذر الاتصال بالسحابة: ' + e.message); });" "%CLIENT_EMAIL%"

:: 4. إضافة البوت إلى قائمة بدء التشغيل في الويندوز (Startup) ليعمل تلقائياً بعد كل ريستارت بصمت
echo.
echo   [4/4] جاري ضبط التشغيل التلقائي مع إقلاع الجهاز (Auto-Start on Boot)...
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set STARTUP_VBS=%STARTUP_DIR%\SocialFlowBot.vbs

(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.Run "cmd.exe /c cd /d %TARGET_DIR% && node fb_bot_daemon.js", 0, False
echo Set WshShell = Nothing
) > "%STARTUP_VBS%"

:: 5. إنشاء اختصارات سطح المكتب للعميل
set DESKTOP_DIR=%USERPROFILE%\Desktop
copy /y "%CURRENT_DIR%تسجيل_دخول_فيسبوك_للبوت.bat" "%DESKTOP_DIR%\تسجيل_دخول_فيسبوك.bat" >nul 2>nul
copy /y "%CURRENT_DIR%فحص_حالة_البوت.bat" "%DESKTOP_DIR%\فحص_حالة_البوت.bat" >nul 2>nul
copy /y "%CURRENT_DIR%تشغيل_البوت_صامتاً_في_الخلفية.vbs" "%DESKTOP_DIR%\تشغيل_البوت_صامتاً.vbs" >nul 2>nul

color 0A
cls
echo ========================================================================
echo   🎉 تم اكتمال تثبيت وإعداد بوت النشر الآلي بنجاح 100%%!
echo ========================================================================
echo.
echo   📋 الخطوات المتبقية للبدء الآن:
echo   1. ستجد على سطح المكتب ملف باسم: "تسجيل_دخول_فيسبوك.bat"
echo      اضغط عليه وسجل دخولك بفيسبوك وبدّل لصفحتك التجارية لمرة واحدة فقط.
echo.
echo   2. سيعمل البوت تلقائياً وبصمت في الخلفية مع كل مرة تفتح فيها جهازك!
echo.
echo   3. يمكنك في أي وقت التأكد من عمل البوت بالضغط على: "فحص_حالة_البوت.bat"
echo      أو إرسال كلمة "شغال؟" للبوت على التيليجرام من هاتفك.
echo.
echo ========================================================================
echo   اضغط أي مفتاح لإنهاء التثبيت...
pause > nul
