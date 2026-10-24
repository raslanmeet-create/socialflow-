// دوال مساعدة عامة
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

// عناصر واجهة المستخدم
const pageSelector = document.getElementById('pageSelector');
const postContent = document.getElementById('postContent');
const charCounter = document.getElementById('charCounter');
const dropzone = document.getElementById('dropzone');
const mediaInput = document.getElementById('mediaInput');
const dropzonePrompt = document.getElementById('dropzonePrompt');
const mediaPreviewContainer = document.getElementById('mediaPreviewContainer');
const previewMediaWrapper = document.getElementById('previewMediaWrapper');
const btnRemoveMedia = document.getElementById('btnRemoveMedia');

const timingNow = document.getElementById('timingNow');
const timingSchedule = document.getElementById('timingSchedule');
const scheduleInputs = document.getElementById('scheduleInputs');
const scheduleDateTime = document.getElementById('scheduleDateTime');
const btnSubmit = document.getElementById('btnSubmit');
const btnSubmitText = document.getElementById('btnSubmitText');
const postForm = document.getElementById('postForm');
const statusAlert = document.getElementById('statusAlert');

// عناصر المعاينة الحية
const mockupText = document.getElementById('mockupText');
const mockupMedia = document.getElementById('mockupMedia');
const mockupProfileName = document.getElementById('mockupProfileName');
const mockupAvatar = document.getElementById('mockupAvatar');
const socialMockup = document.getElementById('socialMockup');
const tabButtons = document.querySelectorAll('.tab-btn');

// عناصر نافذة الإعدادات (SaaS Workspace)
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnQuickManagePages = document.getElementById('btnQuickManagePages');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const btnCancelSettings = document.getElementById('btnCancelSettings');
const settingsModal = document.getElementById('settingsModal');

const inputMetaToken = document.getElementById('inputMetaToken');
const btnFetchPages = document.getElementById('btnFetchPages');
const btnFetchPagesText = document.getElementById('btnFetchPagesText');
const metaStatusMsg = document.getElementById('metaStatusMsg');
const discoveredPagesContainer = document.getElementById('discoveredPagesContainer');
const btnToggleAllPages = document.getElementById('btnToggleAllPages');
const pagesChecklist = document.getElementById('pagesChecklist');

const inputCloudName = document.getElementById('inputCloudName');
const inputCloudApiKey = document.getElementById('inputCloudApiKey');
const inputCloudApiSecret = document.getElementById('inputCloudApiSecret');
const btnTestCloudinary = document.getElementById('btnTestCloudinary');
const cloudStatusMsg = document.getElementById('cloudStatusMsg');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const headerStatusText = document.getElementById('headerStatusText');

const webhookCallbackUrl = document.getElementById('webhookCallbackUrl');
const webhookVerifyToken = document.getElementById('webhookVerifyToken');
const btnCopyWebhookUrl = document.getElementById('btnCopyWebhookUrl');
const btnCopyWebhookToken = document.getElementById('btnCopyWebhookToken');

const onboardingBanner = document.getElementById('onboardingBanner');
const btnBannerConnect = document.getElementById('btnBannerConnect');

// عناصر التبويبات والمخطط (Meta Planner & Navigation Tabs)
const tabBtnComposer = document.getElementById('tabBtnComposer');
const tabBtnPlanner = document.getElementById('tabBtnPlanner');
const tabBtnAutoReply = document.getElementById('tabBtnAutoReply');
const plannerBadgeCount = document.getElementById('plannerBadgeCount');
const composerSection = document.getElementById('composerSection');
const plannerSection = document.getElementById('plannerSection');
const autoReplySection = document.getElementById('autoReplySection');

// عناصر الرد التلقائي الذكي (AI Auto-Reply Bot)
const autoReplyMasterToggle = document.getElementById('toggleAutoReplyMaster') || document.getElementById('autoReplyMasterToggle');
const toggleMasterText = document.getElementById('autoReplyToggleLabel') || document.getElementById('toggleMasterText');
const arTargetPageSelector = document.getElementById('arTargetPageSelector');

// أدوات الفحص العميق (4 مراحل مع فاصل 60 ثانية)
const arWebsiteUrl = document.getElementById('inputWebsiteUrl') || document.getElementById('arWebsiteUrl');
const btnStartDeepCrawl = document.getElementById('btnStartDeepCrawl') || document.getElementById('btnScrapeWebsite');
const btnCrawlText = document.getElementById('btnCrawlText') || document.getElementById('btnScrapeText');
const deepCrawlProgressWrapper = document.getElementById('deepCrawlProgressWrapper');
const stepPillHome = document.getElementById('stepPillHome');
const stepPillServices = document.getElementById('stepPillServices');
const stepPillAbout = document.getElementById('stepPillAbout');
const stepPillContact = document.getElementById('stepPillContact');
const crawlerProgressBar = document.getElementById('crawlerProgressBar');
const crawlerStatusText = document.getElementById('crawlerStatusText');
const crawlerProgressPercent = document.getElementById('crawlerProgressPercent');
const crawlerCountdownCard = document.getElementById('crawlerCountdownCard');
const crawlerSecondsLeft = document.getElementById('crawlerSecondsLeft');
const scrapeStatus = document.getElementById('scrapeStatus');

// عناصر الإدخال اليدوي وقاعدة المعرفة
const arProjectName = document.getElementById('arProjectName');
const arNiche = document.getElementById('arNiche');
const servicesListContainer = document.getElementById('servicesListContainer');
const btnAddServiceRow = document.getElementById('btnAddServiceRow');
const phonesListContainer = document.getElementById('phonesListContainer');
const btnAddPhoneRow = document.getElementById('btnAddPhoneRow');
const arEmailInput = document.getElementById('arEmailInput');
const socialLinksContainer = document.getElementById('socialLinksContainer');
const btnAddSocialRow = document.getElementById('btnAddSocialRow');

// نطاق المنشورات المستهدفة
const radioTargetAll = document.getElementById('radioTargetAll');
const radioTargetSpecific = document.getElementById('radioTargetSpecific');
const targetPostsWrapper = document.getElementById('targetPostsWrapper');
const btnRefreshPagePosts = document.getElementById('btnRefreshPagePosts');
const postsChecklistContainer = document.getElementById('postsChecklistContainer');

// توليد برومبت النظام بالذكاء الاصطناعي
const btnGenerateCustomPrompt = document.getElementById('btnGenerateCustomPrompt');
const btnGeneratePromptText = document.getElementById('btnGeneratePromptText');
const arCustomSystemPrompt = document.getElementById('arCustomSystemPrompt');

const btnSaveAutoReplyConfig = document.getElementById('btnSaveAutoReplyConfig');
const saveConfigStatus = document.getElementById('saveConfigStatus');

const arGroqApiKey = document.getElementById('arGroqApiKey');
const checkLikeComment = document.getElementById('checkLikeComment');
const checkReplyComment = document.getElementById('checkReplyComment');
const checkSendDm = document.getElementById('checkSendDm');

const simSenderName = document.getElementById('simSenderName');
const simPostCaption = document.getElementById('simPostCaption');
const simComment = document.getElementById('simComment');
const btnRunSimulation = document.getElementById('btnRunSimulation');
const simResultsContainer = document.getElementById('simResultsContainer');
const simPublicReplyOutput = document.getElementById('simPublicReplyOutput');
const simPrivateMsgOutput = document.getElementById('simPrivateMsgOutput');

const btnRefreshLogs = document.getElementById('btnRefreshLogs');
const activityLogsList = document.getElementById('activityLogsList');

// عناصر شريط حجز الموعد من الجدول
const selectedSlotBanner = document.getElementById('selectedSlotBanner');
const selectedSlotText = document.getElementById('selectedSlotText');
const btnClearSlot = document.getElementById('btnClearSlot');

// عناصر مخطط ميتا التفاعلي
const btnOpenPlannerCta = document.getElementById('btnOpenPlannerCta');
const btnPlannerQuickAdd = document.getElementById('btnPlannerQuickAdd');
const btnPrevWeek = document.getElementById('btnPrevWeek');
const btnToday = document.getElementById('btnToday');
const btnNextWeek = document.getElementById('btnNextWeek');
const plannerDateDisplay = document.getElementById('plannerDateDisplay');
const plannerGrid = document.getElementById('plannerGrid');

// عناصر نافذة معاينة المنشور المجدول
const postPreviewModal = document.getElementById('postPreviewModal');
const btnClosePreviewModal = document.getElementById('btnClosePreviewModal');
const btnClosePreviewModalBtn = document.getElementById('btnClosePreviewModalBtn');
const btnDeleteFromPreviewModal = document.getElementById('btnDeleteFromPreviewModal');
const previewModalTitle = document.getElementById('previewModalTitle');
const previewModalSubtitle = document.getElementById('previewModalSubtitle');
const previewModalBody = document.getElementById('previewModalBody');

// متغيرات حالة مخطط ميتا
let plannerCurrentDate = new Date();
let plannerPlatformFilter = 'all';
let cachedScheduledPosts = [];
let activePreviewPostId = null;
// حالة إعدادات المستخدم والصفحات
let userConfig = {
    metaToken: '',
    selectedPageIds: [],
    pages: [],
    cloudinary: {
        cloudName: '',
        apiKey: '',
        apiSecret: ''
    }
};

let tempDiscoveredPages = [];
let currentAccounts = [];
let activePlatform = 'facebook';


// عناصر تخصيص الكابشن
const toggleCustomCaptions = document.getElementById('toggleCustomCaptions');
const generalCaptionBox = document.getElementById('generalCaptionBox');
const customCaptionsContainer = document.getElementById('customCaptionsContainer');
const captionTabButtons = document.querySelectorAll('.caption-tab-btn');
const customFb = document.getElementById('customFb');
const customIg = document.getElementById('customIg');
const counterFb = document.getElementById('counterFb');
const counterIg = document.getElementById('counterIg');

// عناصر استوديو تحريك وقص الصورة (Meta Style)
const imageStudioGroup = document.getElementById('imageStudioGroup');
const cropperSourceImage = document.getElementById('cropperSourceImage');
const btnApplyCrop = document.getElementById('btnApplyCrop');
const studioRatioBtns = document.querySelectorAll('.studio-ratio-btn');
const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');
const btnRotateLeft = document.getElementById('btnRotateLeft');
const btnRotateRight = document.getElementById('btnRotateRight');
const btnResetCrop = document.getElementById('btnResetCrop');

let cropperInstance = null;
let croppedImageBlob = null;
let currentAspectRatio = 1; // الافتراضي مربع 1:1

// عناصر التعليق الأول التلقائي (First Comment)
const enableFirstComment = document.getElementById('enableFirstComment');
const firstCommentContainer = document.getElementById('firstCommentContainer');
const firstCommentContent = document.getElementById('firstCommentContent');
const counterFc = document.getElementById('counterFc');
const mockupFirstComment = document.getElementById('mockupFirstComment');
const mockupCommentText = document.getElementById('mockupCommentText');



// عناصر قائمة الجدولة
const scheduledList = document.getElementById('scheduledList');
const scheduledCount = document.getElementById('scheduledCount');

// الحالة المؤقتة للميديا المرفوعة
let selectedMediaFile = null;
let selectedMediaUrl = null;
let isVideo = false;

// 1. تحديث النص الحي والعداد
postContent.addEventListener('input', () => {
    const text = postContent.value.trim();
    const length = postContent.value.length;
    charCounter.textContent = `${length} حرف`;
    updateMockupText();
});

// تفعيل أو تعطيل تخصيص الكابشن لكل منصة
toggleCustomCaptions.addEventListener('change', () => {
    if (toggleCustomCaptions.checked) {
        generalCaptionBox.style.display = 'none';
        customCaptionsContainer.style.display = 'block';

        // نسخ النص العام للحقول المخصصة إذا كانت فارغة
        const currentVal = postContent.value.trim();
        if (!customFb.value && currentVal) customFb.value = currentVal;
        if (!customIg.value && currentVal) customIg.value = currentVal;

        updateCustomCounters();
    } else {
        generalCaptionBox.style.display = 'block';
        customCaptionsContainer.style.display = 'none';
    }
    updateMockupText();
});

// التعامل مع تفعيل وكتابة التعليق الأول التلقائي
enableFirstComment.addEventListener('change', () => {
    firstCommentContainer.style.display = enableFirstComment.checked ? 'block' : 'none';
    updateMockupFirstComment();
});

firstCommentContent.addEventListener('input', () => {
    counterFc.textContent = `${firstCommentContent.value.length} حرف`;
    updateMockupFirstComment();
});

function updateMockupFirstComment() {
    if (enableFirstComment.checked && firstCommentContent.value.trim()) {
        mockupCommentText.textContent = firstCommentContent.value.trim();
        mockupFirstComment.style.display = 'flex';
    } else {
        mockupFirstComment.style.display = 'none';
    }
}


// تبديل تابات الكابشن المخصص
captionTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        captionTabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const target = btn.dataset.target;
        document.querySelectorAll('.caption-pane').forEach(p => p.style.display = 'none');
        document.getElementById(`pane-${target}`).style.display = 'block';

        // تفعيل نفس المنصة في المعاينة
        const platMap = {
            'cap-facebook': 'facebook',
            'cap-instagram': 'instagram',
            'cap-twitter': 'twitter',
            'cap-linkedin': 'linkedin'
        };
        const plat = platMap[target];
        if (plat) {
            const correspondingTab = document.querySelector(`.tab-btn[data-platform="${plat}"]`);
            if (correspondingTab) correspondingTab.click();
        }
    });
});

// تحديث عدادات الكابشن المخصص
function updateCustomCounters() {
    if (counterFb && customFb) counterFb.textContent = `${customFb.value.length} حرف`;
    if (counterIg && customIg) counterIg.textContent = `${customIg.value.length} حرف`;
}

[customFb, customIg].filter(Boolean).forEach(textarea => {
    textarea.addEventListener('input', () => {
        updateCustomCounters();
        updateMockupText();
    });
});

function updateMockupText() {
    if (toggleCustomCaptions.checked) {
        if (activePlatform === 'facebook') {
            mockupText.textContent = customFb.value.trim() || 'كابشن فيسبوك فارغ...';
        } else if (activePlatform === 'instagram') {
            mockupText.textContent = customIg.value.trim() || 'كابشن انستجرام فارغ...';
        } else if (activePlatform === 'twitter') {
            mockupText.textContent = customTw.value.trim() || 'تغريدة تويتر فارغة...';
        } else if (activePlatform === 'linkedin') {
            mockupText.textContent = customLi.value.trim() || 'منشور لينكيد إن فارغ...';
        }
    } else {
        mockupText.textContent = postContent.value.trim() || 'هنا ستظهر معاينة حية لنص المنشور كما سيراه المتابعون في خلاصتهم...';
    }
}

// 2. التحكم في السحب والإفلات للميديا (Drag & Drop)
dropzone.addEventListener('click', (e) => {
    if (e.target !== btnRemoveMedia) {
        mediaInput.click();
    }
});

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

mediaInput.addEventListener('change', () => {
    if (mediaInput.files && mediaInput.files[0]) {
        handleFileSelect(mediaInput.files[0]);
    }
});

function handleFileSelect(file) {
    selectedMediaFile = file;
    isVideo = file.type.startsWith('video/');
    selectedMediaUrl = URL.createObjectURL(file);
    croppedImageBlob = null;

    // إظهار المعاينة في منطقة الرفع
    dropzonePrompt.style.display = 'none';
    mediaPreviewContainer.style.display = 'flex';
    previewMediaWrapper.innerHTML = '';

    if (isVideo) {
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }
        imageStudioGroup.style.display = 'none';
        const video = document.createElement('video');
        video.src = selectedMediaUrl;
        video.controls = true;
        previewMediaWrapper.appendChild(video);

        // المعاينة الحية في الكارت
        mockupMedia.innerHTML = `<video src="${selectedMediaUrl}" controls></video>`;
    } else {
        const img = document.createElement('img');
        img.src = selectedMediaUrl;
        previewMediaWrapper.appendChild(img);

        // تشغيل استوديو القص والتحريك التفاعلي مثل ميتا
        initCropper(selectedMediaUrl);
    }
}

// تشغيل استوديو التحريك والقص
function initCropper(imageUrl) {
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }

    imageStudioGroup.style.display = 'block';
    cropperSourceImage.src = imageUrl;

    cropperSourceImage.onload = () => {
        if (cropperInstance) {
            cropperInstance.destroy();
        }
        cropperInstance = new Cropper(cropperSourceImage, {
            aspectRatio: currentAspectRatio,
            viewMode: 1, // حصر الإطار داخل أبعاد الصورة
            dragMode: 'move', // تحريك وسحب الصورة بالماوس لمعرفة ما سيظهر وما سيختفي
            autoCropArea: 0.95,
            restore: false,
            guides: true, // شبكة الثلثين
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            ready() {
                applyCropToMockup();
            },
            cropend() {
                applyCropToMockup();
            },
            zoom() {
                applyCropToMockup();
            }
        });
    };
}

// تطبيق القص وتحديث المعاينة الحية
function applyCropToMockup(showNotification = false) {
    if (!cropperInstance) return;

    const canvas = cropperInstance.getCroppedCanvas({
        maxWidth: 2048,
        maxHeight: 2048,
        imageSmoothingQuality: 'high'
    });

    if (!canvas) return;

    // تحديث المعاينة الحية فوراً
    const previewDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    mockupMedia.innerHTML = `<img src="${previewDataUrl}" alt="Preview" style="width:100%; height:auto; object-fit:contain;">`;

    // تحويل الكانفاس إلى Blob لإرساله للسيرفر
    canvas.toBlob((blob) => {
        croppedImageBlob = blob;
    }, 'image/jpeg', 0.92);

    if (showNotification) {
        showAlert('✨ تم اعتماد وتطبيق أبعاد الصورة بنجاح! شاهد المعاينة الحية في الكارت الجانبي.', 'success');
    }
}

// التحكم في نسب الأبعاد (1:1، 4:5، 1.91:1، حر)
studioRatioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        studioRatioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const ratio = btn.dataset.ratio;
        if (ratio === 'free') {
            currentAspectRatio = NaN;
            if (cropperInstance) cropperInstance.setAspectRatio(NaN);
        } else {
            currentAspectRatio = parseFloat(ratio);
            if (cropperInstance) cropperInstance.setAspectRatio(currentAspectRatio);
        }
        setTimeout(applyCropToMockup, 100);
    });
});

// أزرار التكبير والتدوير والاسترجاع
btnZoomIn.addEventListener('click', () => {
    if (cropperInstance) {
        cropperInstance.zoom(0.1);
        applyCropToMockup();
    }
});

btnZoomOut.addEventListener('click', () => {
    if (cropperInstance) {
        cropperInstance.zoom(-0.1);
        applyCropToMockup();
    }
});

btnRotateLeft.addEventListener('click', () => {
    if (cropperInstance) {
        cropperInstance.rotate(-90);
        applyCropToMockup();
    }
});

btnRotateRight.addEventListener('click', () => {
    if (cropperInstance) {
        cropperInstance.rotate(90);
        applyCropToMockup();
    }
});

btnResetCrop.addEventListener('click', () => {
    if (cropperInstance) {
        cropperInstance.reset();
        applyCropToMockup();
    }
});

btnApplyCrop.addEventListener('click', () => {
    applyCropToMockup(true);
});

// حذف الميديا المرفوعة
btnRemoveMedia.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedMediaFile = null;
    selectedMediaUrl = null;
    croppedImageBlob = null;
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    imageStudioGroup.style.display = 'none';
    mediaInput.value = '';
    dropzonePrompt.style.display = 'block';
    mediaPreviewContainer.style.display = 'none';
    previewMediaWrapper.innerHTML = '';
    mockupMedia.innerHTML = `
        <div class="empty-media-placeholder">
            <span>لم يتم اختيار صورة أو فيديو بعد</span>
        </div>
    `;
});

// 3. تبديل خيار التوقيت (نشر فوري / جدولة)
timingNow.addEventListener('change', () => {
    scheduleInputs.style.display = 'none';
    btnSubmitText.textContent = 'نشر البوست الآن';
});

timingSchedule.addEventListener('change', () => {
    scheduleInputs.style.display = 'block';
    btnSubmitText.textContent = '⏰ حفظ وجدولة المنشور بالسحابة';

    // تعيين التاريخ الأدنى ليكون بعد 5 دقائق من الآن
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    scheduleDateTime.min = localIso;
    if (!scheduleDateTime.value) {
        scheduleDateTime.value = localIso;
    }
});

// 4. تغيير تابات المعاينة للمنصات
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePlatform = btn.dataset.platform;

        socialMockup.className = 'social-mockup';
        socialMockup.classList.add(`${activePlatform}-mode`);

        updateMockupHeader();
        updateMockupText();
    });
});

// 5. إرسال النموذج (نشر أو جدولة)
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isCustom = toggleCustomCaptions.checked;
    const content = postContent.value.trim();

    if (!isCustom && !content && !selectedMediaFile) {
        showAlert('يرجى كتابة نص أو اختيار صورة/فيديو على الأقل!', 'error');
        return;
    }

    // تجميع المنصات المختارة
    const selectedPlatforms = [];
    ['facebook', 'instagram', 'twitter', 'linkedin'].forEach(plat => {
        const checkbox = document.getElementById(`plat-${plat}`);
        if (checkbox && checkbox.checked) {
            selectedPlatforms.push(plat);
        }
    });

    if (selectedPlatforms.length === 0) {
        showAlert('يرجى تحديد منصة واحدة على الأقل للنشر!', 'error');
        return;
    }

    const isScheduled = timingSchedule.checked;
    const scheduleTime = scheduleDateTime.value;

    if (isScheduled && !scheduleTime) {
        showAlert('يرجى تحديد وقت وتاريخ الجدولة!', 'error');
        return;
    }

    const selectedPageId = pageSelector.value;
    if ((selectedPlatforms.includes('facebook') || selectedPlatforms.includes('instagram')) && !selectedPageId) {
        showAlert('⚠️ يرجى ربط صفحاتك أولاً عبر نافذة الإعدادات لاختيار الصفحة المستهدفة!', 'error');
        openSettingsModal();
        return;
    }

    // الكابشن المخصص لكل منصة
    const customCaptions = isCustom ? {
        facebook: customFb.value.trim(),
        instagram: customIg.value.trim()
    } : null;

    const selectedRatio = document.querySelector('input[name="aspectRatio"]:checked')?.value || 'auto';

    // استخراج التعليق الأول إذا تم تفعيله
    const isFcEnabled = enableFirstComment.checked;
    const fcVal = firstCommentContent.value.trim();

    // استخراج بيانات الصفحة المحددة حالياً
    const targetAccount = currentAccounts.find(a => a.id === selectedPageId);

    // تجهيز البيانات
    const formData = new FormData();
    formData.append('content', content);
    formData.append('platforms', JSON.stringify(selectedPlatforms));
    formData.append('pageId', selectedPageId);
    if (targetAccount && targetAccount.access_token) {
        formData.append('pageAccessToken', targetAccount.access_token);
    }
    if (targetAccount && targetAccount.instagram && targetAccount.instagram.id) {
        formData.append('igUserId', targetAccount.instagram.id);
    }
    if (userConfig.metaToken) {
        formData.append('metaToken', userConfig.metaToken);
    }
    if (userConfig.cloudinary && userConfig.cloudinary.cloudName) {
        formData.append('userCloudinary', JSON.stringify(userConfig.cloudinary));
    }
    formData.append('isScheduled', isScheduled);
    formData.append('isCustomCaptions', isCustom);
    formData.append('customCaptions', JSON.stringify(customCaptions));
    formData.append('aspectRatio', selectedRatio);
    if (isFcEnabled && fcVal) {
        formData.append('firstComment', fcVal);
    }
    if (isScheduled) {
        formData.append('scheduledTime', scheduleTime);
    }
    if (croppedImageBlob) {
        formData.append('media', croppedImageBlob, selectedMediaFile ? selectedMediaFile.name : 'post-image.jpg');
    } else if (selectedMediaFile) {
        formData.append('media', selectedMediaFile);
    }

    btnSubmit.disabled = true;
    const originalText = btnSubmitText.textContent;
    btnSubmitText.textContent = isScheduled ? 'جاري الجدولة بالسحابة...' : 'جاري الإرسال للمنصات...';

    try {
        const response = await fetch('/api/publish', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            let msg = '';
            let alertType = 'success';

            if (isScheduled) {
                msg = `✅ تم جدولة المنشور بنجاح لينشر تلقائياً في: <strong>${new Date(scheduleTime).toLocaleString('ar-EG')}</strong>`;
            } else {
                const details = [];
                if (result.results) {
                    if (result.results.facebook) {
                        if (result.results.facebook.success) {
                            details.push(`📘 <strong>فيسبوك:</strong> تم النشر بنجاح على الصفحة!`);
                        } else {
                            alertType = 'error';
                            details.push(`📘 <strong>فيسبوك:</strong> خطأ: ${result.results.facebook.error}`);
                        }
                    }
                    if (result.results.instagram) {
                        if (result.results.instagram.success) {
                            details.push(`📸 <strong>انستجرام:</strong> تم النشر بنجاح!`);
                        } else {
                            details.push(`📸 <strong>انستجرام:</strong> ${result.results.instagram.message || result.results.instagram.error}`);
                        }
                    }

                    // تنبيهات التعليق الأول التلقائي
                    if (result.results.facebook?.firstComment) {
                        if (result.results.facebook.firstComment.success) {
                            details.push(`💬 <strong>فيسبوك (التعليق الأول):</strong> تم إضافة التعليق بنجاح!`);
                        } else {
                            details.push(`⚠️ <strong>فيسبوك (التعليق الأول):</strong> ${result.results.facebook.firstComment.error}`);
                        }
                    }
                    if (result.results.instagram?.firstComment) {
                        if (result.results.instagram.firstComment.success) {
                            details.push(`💬 <strong>انستجرام (التعليق الأول):</strong> تم إضافة التعليق بنجاح!`);
                        } else {
                            details.push(`⚠️ <strong>انستجرام (التعليق الأول):</strong> ${result.results.instagram.firstComment.error}`);
                        }
                    }
                }
                msg = details.length > 0 ? details.join('<br>') : '🎉 تم النشر بنجاح على المنصات!';
            }

            showAlert(msg, alertType);

            // تصفير النموذج
            postContent.value = '';
            charCounter.textContent = '0 حرف';
            firstCommentContent.value = '';
            counterFc.textContent = '0 حرف';
            enableFirstComment.checked = false;
            enableFirstComment.dispatchEvent(new Event('change'));
            btnRemoveMedia.click();
            timingNow.checked = true;
            timingNow.dispatchEvent(new Event('change'));

            // تحديث قائمة المنشورات المجدولة
            loadScheduledPosts();
        } else {
            showAlert(result.message || 'حدث خطأ أثناء المعالجة', 'error');
        }
    } catch (err) {
        console.error(err);
        showAlert('تعذر الاتصال بالخادم، تأكد من تشغيل المشروع.', 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmitText.textContent = originalText;
    }
});

function showAlert(message, type) {
    statusAlert.innerHTML = message;
    statusAlert.className = `status-alert ${type}`;
    statusAlert.style.display = 'block';
    setTimeout(() => {
        statusAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// 6. تحميل وإدارة المنشورات المجدولة ومخطط ميتا (Meta Planner)
async function loadScheduledPosts() {
    try {
        const response = await fetch('/api/scheduled?all=true');
        const posts = await response.json();
        cachedScheduledPosts = Array.isArray(posts) ? posts : [];

        // تصفية المنشورات قيد الانتظار للعدادات
        const pendingPosts = cachedScheduledPosts.filter(p => p.status === 'PENDING');
        const countText = `${pendingPosts.length} منشورات`;
        if (scheduledCount) scheduledCount.textContent = countText;
        if (plannerBadgeCount) plannerBadgeCount.textContent = pendingPosts.length;

        // 1. تحديث القائمة الجانبية السريعة
        if (scheduledList) {
            if (pendingPosts.length === 0) {
                scheduledList.innerHTML = `
                    <div class="empty-scheduled">
                        <p>لا توجد منشورات مجدولة حالياً. اكتب منشوراً أو اضغط على جدول المخطط لجدولته في أي ساعة!</p>
                    </div>
                `;
            } else {
                scheduledList.innerHTML = '';
                pendingPosts.forEach(post => {
                    const item = document.createElement('div');
                    item.className = 'scheduled-item';
                    
                    const dateStr = new Date(post.scheduledTime).toLocaleString('ar-EG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const platformsBadges = (post.platforms || []).map(p => 
                        `<span class="platform-mini-badge">${p === 'facebook' ? '📘 فيسبوك' : (p === 'instagram' ? '📸 انستجرام' : p)}</span>`
                    ).join(' ');

                    item.innerHTML = `
                        <div class="scheduled-info">
                            <div class="scheduled-date">⏰ ${dateStr}</div>
                            <div class="scheduled-snippet">${post.content || (post.mediaUrl ? '📁 وسائط بدون نص' : '')}</div>
                            <div class="scheduled-platforms">${platformsBadges}</div>
                        </div>
                        <div class="scheduled-item-actions">
                            <button type="button" class="btn-quick-preview-list" data-id="${post.id}" title="معاينة تفاصيل المنشور">👁️</button>
                            <button type="button" class="btn-delete-scheduled" data-id="${post.id}" title="إلغاء المنشور">🗑️</button>
                        </div>
                    `;

                    scheduledList.appendChild(item);
                });

                // ربط أزرار المعاينة بالقائمة الجانبية
                document.querySelectorAll('.btn-quick-preview-list').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = e.currentTarget.dataset.id;
                        const post = cachedScheduledPosts.find(p => p.id === id);
                        if (post) openPostPreviewModal(post);
                    });
                });

                // ربط أزرار الحذف بالقائمة الجانبية
                document.querySelectorAll('.btn-delete-scheduled').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.dataset.id;
                        if (confirm('هل أنت متأكد من إلغاء هذا المنشور المجدول؟')) {
                            await fetch(`/api/scheduled/${id}`, { method: 'DELETE' });
                            loadScheduledPosts();
                        }
                    });
                });
            }
        }

        // 2. تحديث جدول مخطط ميتا الأسبوعي
        renderMetaPlanner();

    } catch (err) {
        console.error('فشل في جلب المنشورات المجدولة', err);
    }
}

// ========================================================
// نظام التبويبات والمخطط الأسبوعي التفاعلي (Meta Planner)
// ========================================================

// 1. دالة التبديل بين التبويبات الثلاثة
function switchTab(tabName) {
    if (tabBtnComposer) tabBtnComposer.classList.remove('active');
    if (tabBtnPlanner) tabBtnPlanner.classList.remove('active');
    if (tabBtnAutoReply) tabBtnAutoReply.classList.remove('active');

    if (composerSection) composerSection.style.display = 'none';
    if (plannerSection) plannerSection.style.display = 'none';
    if (autoReplySection) autoReplySection.style.display = 'none';

    if (tabName === 'planner') {
        if (tabBtnPlanner) tabBtnPlanner.classList.add('active');
        if (plannerSection) {
            plannerSection.style.display = 'block';
            plannerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        renderMetaPlanner();
    } else if (tabName === 'autoreply') {
        if (tabBtnAutoReply) tabBtnAutoReply.classList.add('active');
        if (autoReplySection) {
            autoReplySection.style.display = 'block';
            autoReplySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        loadAutoReplyConfigUI();
        loadAutoReplyLogsUI();
    } else {
        if (tabBtnComposer) tabBtnComposer.classList.add('active');
        if (composerSection) {
            composerSection.style.display = 'grid';
            composerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// ربط أزرار التبويبات
if (tabBtnComposer) tabBtnComposer.addEventListener('click', () => switchTab('composer'));
if (tabBtnPlanner) tabBtnPlanner.addEventListener('click', () => switchTab('planner'));
if (tabBtnAutoReply) tabBtnAutoReply.addEventListener('click', () => switchTab('autoreply'));
if (btnOpenPlannerCta) btnOpenPlannerCta.addEventListener('click', () => switchTab('planner'));

// زر إضافة سريعة من رأس المخطط
if (btnPlannerQuickAdd) {
    btnPlannerQuickAdd.addEventListener('click', () => {
        // تحديد موعد الساعة القادمة
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        scheduleDateTime.value = formatLocalDateTime(nextHour);
        timingSchedule.checked = true;
        timingSchedule.dispatchEvent(new Event('change'));
        if (selectedSlotBanner && selectedSlotText) {
            selectedSlotText.textContent = formatArabicSlot(nextHour);
            selectedSlotBanner.style.display = 'flex';
        }
        switchTab('composer');
        postContent.focus();
    });
}

// زر إلغاء حجز الموعد المحدد
if (btnClearSlot) {
    btnClearSlot.addEventListener('click', () => {
        if (selectedSlotBanner) selectedSlotBanner.style.display = 'none';
        timingNow.checked = true;
        timingNow.dispatchEvent(new Event('change'));
    });
}

// 2. دوال معالجة وتنسيق التواريخ
function formatLocalDateTime(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function formatArabicSlot(d) {
    const dayName = ARABIC_DAYS[d.getDay()];
    const dayNum = d.getDate();
    const monthName = ARABIC_MONTHS[d.getMonth()];
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
    hours = hours % 12 || 12;
    const formattedHours = String(hours).padStart(2, '0');
    return `${dayName} ${dayNum} ${monthName} — الساعة ${formattedHours}:00 ${ampm}`;
}

function formatHour12(h) {
    const ampm = h >= 12 ? 'م' : 'ص';
    const hour12 = h % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:00 ${ampm}`;
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

// استخراج أيام الأسبوع السبعة بدءاً من السبت
function getWeekDays(baseDate) {
    const d = new Date(baseDate);
    d.setHours(0, 0, 0, 0);
    // السبت = 6، الأحد = 0، الإثنين = 1 ...
    const dayOfWeek = d.getDay();
    const diffToSaturday = (dayOfWeek + 1) % 7;
    const saturday = new Date(d);
    saturday.setDate(d.getDate() - diffToSaturday);

    const week = [];
    for (let i = 0; i < 7; i++) {
        const current = new Date(saturday);
        current.setDate(saturday.getDate() + i);
        week.push(current);
    }
    return week;
}

// 3. دالة حجز موعد والنقل لاستوديو الكتابة فور الضغط على أي خانة بالجدول
function scheduleAtSlot(dateStr, hour) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d, hour, 0, 0, 0);

    // 1. ضبط حقل التاريخ والوقت
    scheduleDateTime.value = formatLocalDateTime(target);

    // 2. تفعيل خيار الجدولة
    timingSchedule.checked = true;
    timingSchedule.dispatchEvent(new Event('change'));

    // 3. إظهار بنر تأكيد حجز الموعد
    if (selectedSlotBanner && selectedSlotText) {
        selectedSlotText.textContent = formatArabicSlot(target);
        selectedSlotBanner.style.display = 'flex';
    }

    // 4. الانتقال لتبويب الإنشاء
    switchTab('composer');

    // 5. التركيز والتنبيه البصري
    setTimeout(() => {
        postContent.focus();
        if (scheduleInputs) {
            scheduleInputs.scrollIntoView({ behavior: 'smooth', block: 'center' });
            scheduleInputs.style.boxShadow = '0 0 25px rgba(88, 166, 255, 0.8)';
            setTimeout(() => {
                scheduleInputs.style.boxShadow = '';
            }, 1200);
        }
    }, 150);
}

// 4. التنقل في أسابيع المخطط
if (btnPrevWeek) {
    btnPrevWeek.addEventListener('click', () => {
        plannerCurrentDate.setDate(plannerCurrentDate.getDate() - 7);
        renderMetaPlanner();
    });
}

if (btnNextWeek) {
    btnNextWeek.addEventListener('click', () => {
        plannerCurrentDate.setDate(plannerCurrentDate.getDate() + 7);
        renderMetaPlanner();
    });
}

if (btnToday) {
    btnToday.addEventListener('click', () => {
        plannerCurrentDate = new Date();
        renderMetaPlanner();
    });
}

// أزرار فلترة المنصات في المخطط
document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        plannerPlatformFilter = e.currentTarget.dataset.filter;
        renderMetaPlanner();
    });
});

// 5. رسم وتوليد جدول مخطط ميتا (Render Meta Planner Grid)
function renderMetaPlanner() {
    if (!plannerGrid) return;

    const today = new Date();
    const weekDays = getWeekDays(plannerCurrentDate);

    // تحديث نص نطاق الأسبوع في الرأس
    if (plannerDateDisplay) {
        const startDay = weekDays[0];
        const endDay = weekDays[6];
        plannerDateDisplay.textContent = `${startDay.getDate()} ${ARABIC_MONTHS[startDay.getMonth()]} — ${endDay.getDate()} ${ARABIC_MONTHS[endDay.getMonth()]} ${endDay.getFullYear()}`;
    }

    plannerGrid.innerHTML = '';

    // أ) توليد صف الرأس (رأس عمود الوقت + رؤوس أيام الأسبوع السبعة)
    const timeHeader = document.createElement('div');
    timeHeader.className = 'grid-header-cell time-header';
    timeHeader.textContent = '⏰ الوقت';
    plannerGrid.appendChild(timeHeader);

    weekDays.forEach(day => {
        const isCurrentDay = isSameDay(day, today);
        const dayHeader = document.createElement('div');
        dayHeader.className = `grid-header-cell ${isCurrentDay ? 'is-today' : ''}`;
        
        const dayName = ARABIC_DAYS[day.getDay()];
        const dayNum = day.getDate();
        const monthName = ARABIC_MONTHS[day.getMonth()];

        dayHeader.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-date">${dayNum} ${monthName}</div>
            ${isCurrentDay ? '<span class="today-badge">اليوم</span>' : ''}
        `;
        plannerGrid.appendChild(dayHeader);
    });

    // ب) توليد صفوف الساعات (24 ساعة كاملة من 00:00 إلى 23:00)
    for (let hour = 0; hour < 24; hour++) {
        // خلية الساعة (العمود الأيمن)
        const timeCell = document.createElement('div');
        timeCell.className = 'grid-time-cell';
        timeCell.textContent = formatHour12(hour);
        plannerGrid.appendChild(timeCell);

        // خلايا الأيام السبعة لهذه الساعة
        weekDays.forEach(day => {
            const isCurrentDay = isSameDay(day, today);
            const slotCell = document.createElement('div');
            const yearStr = day.getFullYear();
            const monthStr = String(day.getMonth() + 1).padStart(2, '0');
            const dayStr = String(day.getDate()).padStart(2, '0');
            const dateKey = `${yearStr}-${monthStr}-${dayStr}`;

            slotCell.className = `grid-slot-cell ${isCurrentDay ? 'is-today-col' : ''}`;
            slotCell.dataset.date = dateKey;
            slotCell.dataset.hour = hour;

            // البحث عن منشورات تطابق هذا اليوم والساعة
            const matchingPosts = cachedScheduledPosts.filter(post => {
                if (!post.scheduledTime) return false;
                const postDate = new Date(post.scheduledTime);
                const isMatchingTime = isSameDay(postDate, day) && postDate.getHours() === hour;
                if (!isMatchingTime) return false;

                if (plannerPlatformFilter === 'all') return true;
                return (post.platforms || []).includes(plannerPlatformFilter);
            });

            if (matchingPosts.length > 0) {
                // الخانة تحتوي على منشورات مجدولة
                slotCell.classList.add('has-posts');

                matchingPosts.forEach(post => {
                    const postDate = new Date(post.scheduledTime);
                    const minutesStr = String(postDate.getMinutes()).padStart(2, '0');
                    const timeTag = `${formatHour12(hour).replace(':00', `:${minutesStr}`)}`;

                    const isFb = (post.platforms || []).includes('facebook');
                    const isIg = (post.platforms || []).includes('instagram');
                    const platformsHtml = `${isFb ? '📘' : ''} ${isIg ? '📸' : ''}`;
                    const isPublished = post.status === 'PUBLISHED';

                    const chip = document.createElement('div');
                    chip.className = `planner-post-chip ${isPublished ? 'status-published' : ''}`;
                    chip.title = 'اضغط لمعاينة المنشور';

                    let thumbHtml = '';
                    if (post.mediaUrl) {
                        const isVideo = post.mediaType && post.mediaType.startsWith('video');
                        if (isVideo) {
                            thumbHtml = '<div class="chip-thumbnail" style="display:flex;align-items:center;justify-content:center;background:#000;font-size:16px;">🎬</div>';
                        } else {
                            thumbHtml = `<img src="${post.mediaUrl}" class="chip-thumbnail" alt="Thumb">`;
                        }
                    }

                    const snippet = post.content ? post.content.slice(0, 45) + (post.content.length > 45 ? '...' : '') : 'وسائط بدون نص';

                    chip.innerHTML = `
                        <div class="chip-top">
                            <span class="chip-platforms">${platformsHtml}</span>
                            <span class="chip-time-badge">${timeTag}</span>
                        </div>
                        <div class="chip-content">
                            ${thumbHtml}
                            <p class="chip-text">${snippet}</p>
                        </div>
                        <div class="chip-actions">
                            <button type="button" class="btn-chip-action btn-chip-view" title="معاينة كاملة">👁️</button>
                            ${!isPublished ? `<button type="button" class="btn-chip-action delete btn-chip-del" title="إلغاء المنشور">🗑️</button>` : '<span style="font-size:10px;color:#3fb950;">✓ تم</span>'}
                        </div>
                    `;

                    // عند الضغط على الكارت تفتح المعاينة
                    chip.addEventListener('click', (e) => {
                        if (e.target.closest('.btn-chip-del')) return;
                        openPostPreviewModal(post);
                    });

                    // زر الحذف السريع
                    const delBtn = chip.querySelector('.btn-chip-del');
                    if (delBtn) {
                        delBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            if (confirm('هل أنت متأكد من إلغاء هذا المنشور المجدول؟')) {
                                await fetch(`/api/scheduled/${post.id}`, { method: 'DELETE' });
                                loadScheduledPosts();
                            }
                        });
                    }

                    slotCell.appendChild(chip);
                });

            } else {
                // الخانة فارغة ومتاحة للجدولة
                slotCell.classList.add('empty-slot');
                slotCell.title = `اضغط لجدولة منشور في: ${ARABIC_DAYS[day.getDay()]} الساعة ${hour}:00`;
                slotCell.innerHTML = `
                    <div class="slot-hover-action">
                        <span class="slot-hover-icon">+</span>
                        <span>جدولة ${hour}:00</span>
                    </div>
                `;

                // عند الضغط على أي خانة فارغة: فتح استوديو الكتابة وجدولة المنشور في ذلك الوقت فوراً!
                slotCell.addEventListener('click', () => {
                    scheduleAtSlot(dateKey, hour);
                });
            }

            plannerGrid.appendChild(slotCell);
        });
    }
}

// 6. نافذة تفاصيل ومعاينة المنشور المجدول (Post Preview Modal)
function openPostPreviewModal(post) {
    if (!postPreviewModal || !previewModalBody) return;
    activePreviewPostId = post.id;

    const postDate = new Date(post.scheduledTime);
    const dateFormatted = formatArabicSlot(postDate);
    const isPublished = post.status === 'PUBLISHED';

    if (previewModalTitle) {
        previewModalTitle.textContent = isPublished ? 'معاينة منشور تم نشره' : 'معاينة منشور مجدول بالسحابة';
    }
    if (previewModalSubtitle) {
        previewModalSubtitle.textContent = `موعد النشر: ${dateFormatted} (${isPublished ? '✅ تم النشر' : '⏳ قيد الانتظار'})`;
    }

    const isFb = (post.platforms || []).includes('facebook');
    const isIg = (post.platforms || []).includes('instagram');
    const platformsText = `${isFb ? '📘 فيسبوك' : ''} ${isIg ? '📸 انستجرام' : ''}`;

    let mediaHtml = '';
    if (post.mediaUrl) {
        const isVideo = post.mediaType && post.mediaType.startsWith('video');
        if (isVideo) {
            mediaHtml = `
                <div class="preview-media-frame">
                    <video src="${post.mediaUrl}" controls></video>
                </div>
            `;
        } else {
            mediaHtml = `
                <div class="preview-media-frame">
                    <img src="${post.mediaUrl}" alt="Media Preview">
                </div>
            `;
        }
    }

    let firstCommentHtml = '';
    if (post.firstComment) {
        firstCommentHtml = `
            <div class="preview-first-comment-box">
                <strong>💬 التعليق الأول التلقائي:</strong>
                <p style="margin:0;color:var(--text-primary);font-size:13px;">${post.firstComment}</p>
            </div>
        `;
    }

    previewModalBody.innerHTML = `
        <div class="preview-post-card">
            <div class="preview-meta-row">
                <div>
                    <span style="font-size:13px;color:var(--text-secondary);">المنصات المستهدفة: </span>
                    <strong style="color:var(--accent);">${platformsText}</strong>
                </div>
                <div>
                    <span style="font-size:12px;background:rgba(88,166,255,0.15);color:var(--accent);padding:3px 10px;border-radius:12px;">
                        ${isPublished ? '✅ تم النشر' : '⏳ مجدول بالسحابة'}
                    </span>
                </div>
            </div>

            <div style="font-size:14px;color:var(--text-primary);white-space:pre-wrap;line-height:1.6;margin:12px 0;">
                ${post.content ? post.content : '<em style="color:var(--text-secondary);">منشور وسائط بدون نص</em>'}
            </div>

            ${mediaHtml}
            ${firstCommentHtml}
        </div>
    `;

    if (btnDeleteFromPreviewModal) {
        btnDeleteFromPreviewModal.style.display = isPublished ? 'none' : 'block';
    }

    postPreviewModal.style.display = 'flex';
}

function closePostPreviewModal() {
    if (postPreviewModal) postPreviewModal.style.display = 'none';
    activePreviewPostId = null;
}

if (btnClosePreviewModal) btnClosePreviewModal.addEventListener('click', closePostPreviewModal);
if (btnClosePreviewModalBtn) btnClosePreviewModalBtn.addEventListener('click', closePostPreviewModal);

// إغلاق النافذة عند الضغط على الخلفية
if (postPreviewModal) {
    postPreviewModal.addEventListener('click', (e) => {
        if (e.target === postPreviewModal) closePostPreviewModal();
    });
}

// زر حذف المنشور من داخل نافذة المعاينة
if (btnDeleteFromPreviewModal) {
    btnDeleteFromPreviewModal.addEventListener('click', async () => {
        if (!activePreviewPostId) return;
        if (confirm('هل أنت متأكد من إلغاء هذا المنشور المجدول؟')) {
            await fetch(`/api/scheduled/${activePreviewPostId}`, { method: 'DELETE' });
            closePostPreviewModal();
            loadScheduledPosts();
        }
    });
}


// ========================================================
// 7. إدارة الإعدادات وحسابات المستخدم (SaaS BYOK Workspace)
// ========================================================

function loadUserSettings() {
    try {
        const saved = localStorage.getItem('socialflow_user_config');
        if (saved) {
            userConfig = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading config:', e);
    }
}

function openSettingsModal() {
    loadUserSettings();

    // تعبئة الحقول
    inputMetaToken.value = userConfig.metaToken || '';
    if (userConfig.cloudinary) {
        inputCloudName.value = userConfig.cloudinary.cloudName || '';
        inputCloudApiKey.value = userConfig.cloudinary.apiKey || '';
        inputCloudApiSecret.value = userConfig.cloudinary.apiSecret || '';
    }

    metaStatusMsg.style.display = 'none';
    cloudStatusMsg.style.display = 'none';

    // إذا كانت هناك صفحات محفوظة بالفعل، نعرضها في القائمة
    if (userConfig.pages && userConfig.pages.length > 0) {
        tempDiscoveredPages = [...userConfig.pages];
        renderPagesChecklist(tempDiscoveredPages, userConfig.selectedPageIds || []);
        discoveredPagesContainer.style.display = 'block';
    } else {
        discoveredPagesContainer.style.display = 'none';
    }

    settingsModal.style.display = 'flex';
    loadWebhookInfo();
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
}

// فحص رمز Meta وجلب الصفحات
btnFetchPages.addEventListener('click', async () => {
    const token = inputMetaToken.value.trim();
    if (!token) {
        showMetaStatus('يرجى لصق رمز Meta Access Token أولاً.', 'error');
        return;
    }

    btnFetchPages.disabled = true;
    btnFetchPagesText.textContent = 'جاري الفحص وجلب الصفحات...';
    metaStatusMsg.style.display = 'none';

    try {
        const res = await fetch('/api/verify-meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metaToken: token })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            tempDiscoveredPages = data.pages;
            if (tempDiscoveredPages.length === 0) {
                showMetaStatus('الرمز صحيح ولكن لم يتم العثور على أي صفحات فيسبوك تابعة له.', 'error');
                discoveredPagesContainer.style.display = 'none';
            } else {
                showMetaStatus(`🎉 تم التحقق بنجاح! تم العثور على ${tempDiscoveredPages.length} صفحة وحساب.`, 'success');
                // تحديد الكل افتراضياً إذا لم يكن محدد
                const currentSelected = userConfig.selectedPageIds && userConfig.selectedPageIds.length > 0 
                    ? userConfig.selectedPageIds 
                    : tempDiscoveredPages.map(p => p.id);
                renderPagesChecklist(tempDiscoveredPages, currentSelected);
                discoveredPagesContainer.style.display = 'block';
            }
        } else {
            showMetaStatus(`خطأ: ${data.message || 'رمز Meta غير صالح.'}`, 'error');
            discoveredPagesContainer.style.display = 'none';
        }
    } catch (err) {
        console.error(err);
        showMetaStatus('تعذر الاتصال بالخادم لفحص الرمز.', 'error');
    } finally {
        btnFetchPages.disabled = false;
        btnFetchPagesText.textContent = '🔍 جلب وفحص الصفحات';
    }
});

function showMetaStatus(msg, type) {
    metaStatusMsg.textContent = msg;
    metaStatusMsg.className = `settings-status-msg ${type}`;
    metaStatusMsg.style.display = 'block';
}

// عرض قائمة الصفحات لاختيار المطلوب منها
function renderPagesChecklist(pages, selectedIds) {
    pagesChecklist.innerHTML = '';
    pages.forEach(p => {
        const card = document.createElement('label');
        card.className = 'page-check-card';

        const isChecked = selectedIds.includes(p.id) ? 'checked' : '';
        const igInfo = p.instagram ? `<span class="page-check-ig">📸 @${p.instagram.username}</span>` : '<span style="font-size:11px; color:var(--text-secondary);">غير مربوط بانستجرام</span>';
        const avatarHtml = p.picture ? `<img src="${p.picture}" class="page-check-avatar" alt="">` : `<div class="page-check-avatar">📄</div>`;

        card.innerHTML = `
            <input type="checkbox" value="${p.id}" ${isChecked} class="chk-page-item">
            ${avatarHtml}
            <div class="page-check-details">
                <span class="page-check-title">${p.name}</span>
                ${igInfo}
            </div>
        `;
        pagesChecklist.appendChild(card);
    });
}

// تحديد أو إلغاء تحديد الكل
btnToggleAllPages.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.chk-page-item');
    const allChecked = Array.from(checkboxes).every(c => c.checked);
    checkboxes.forEach(c => c.checked = !allChecked);
    btnToggleAllPages.textContent = allChecked ? 'تحديد الكل' : 'إلغاء التحديد';
});

// فحص اتصال Cloudinary
btnTestCloudinary.addEventListener('click', async () => {
    const cloudName = inputCloudName.value.trim();
    const apiKey = inputCloudApiKey.value.trim();
    const apiSecret = inputCloudApiSecret.value.trim();

    if (!cloudName || !apiKey || !apiSecret) {
        cloudStatusMsg.textContent = '⚠️ يرجى إدخال كافة بيانات Cloudinary الثلاثة.';
        cloudStatusMsg.className = 'cloud-status-msg error';
        cloudStatusMsg.style.display = 'block';
        return;
    }

    btnTestCloudinary.disabled = true;
    btnTestCloudinary.textContent = 'جاري الاختبار...';
    cloudStatusMsg.style.display = 'none';

    try {
        const res = await fetch('/api/verify-cloudinary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cloudName, apiKey, apiSecret })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            cloudStatusMsg.textContent = '✅ الاتصال ناجح 100%!';
            cloudStatusMsg.className = 'cloud-status-msg success';
        } else {
            cloudStatusMsg.textContent = `❌ ${data.message || 'بيانات خاطئة'}`;
            cloudStatusMsg.className = 'cloud-status-msg error';
        }
        cloudStatusMsg.style.display = 'block';
    } catch (e) {
        cloudStatusMsg.textContent = '❌ تعذر اختبار الاتصال';
        cloudStatusMsg.className = 'cloud-status-msg error';
        cloudStatusMsg.style.display = 'block';
    } finally {
        btnTestCloudinary.disabled = false;
        btnTestCloudinary.textContent = '⚡ اختبار اتصال Cloudinary';
    }
});

// حفظ وتطبيق الإعدادات
btnSaveSettings.addEventListener('click', () => {
    const selectedIds = Array.from(document.querySelectorAll('.chk-page-item:checked')).map(c => c.value);

    userConfig.metaToken = inputMetaToken.value.trim();
    userConfig.selectedPageIds = selectedIds;
    userConfig.pages = tempDiscoveredPages.length > 0 ? tempDiscoveredPages : (userConfig.pages || []);
    userConfig.cloudinary = {
        cloudName: inputCloudName.value.trim(),
        apiKey: inputCloudApiKey.value.trim(),
        apiSecret: inputCloudApiSecret.value.trim()
    };

    localStorage.setItem('socialflow_user_config', JSON.stringify(userConfig));
    closeSettingsModal();

    // تحديث لوحة التحكم
    populateActiveAccounts();
    showAlert('🎉 تم حفظ الإعدادات وتحديث صفحاتك بنجاح!', 'success');
});

// إغلاق المودال عند الضغط على أزرار الإلغاء أو الخلفية
btnOpenSettings.addEventListener('click', openSettingsModal);
btnQuickManagePages.addEventListener('click', openSettingsModal);
btnCloseSettings.addEventListener('click', closeSettingsModal);
btnCancelSettings.addEventListener('click', closeSettingsModal);
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
});

// تحميل بيانات الويبهوك التلقائية
async function loadWebhookInfo() {
    try {
        const res = await fetch('/api/webhook-info');
        const data = await res.json();
        if (data && data.success) {
            webhookCallbackUrl.value = data.callbackUrl;
            webhookVerifyToken.value = data.verifyToken;
        }
    } catch {
        webhookCallbackUrl.value = `${window.location.origin}/api/webhook`;
        webhookVerifyToken.value = 'socialflow_webhook_2026';
    }
}

function setupCopyButton(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
        navigator.clipboard.writeText(input.value).then(() => {
            const originalText = btn.textContent;
            btn.textContent = '✓ تم النسخ!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('copied');
            }, 2000);
        }).catch(() => {
            input.select();
            document.execCommand('copy');
            btn.textContent = '✓ تم النسخ!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '📋 نسخ';
                btn.classList.remove('copied');
            }, 2000);
        });
    });
}
setupCopyButton(btnCopyWebhookUrl, webhookCallbackUrl);
setupCopyButton(btnCopyWebhookToken, webhookVerifyToken);

// ملء قائمة الاختيار بالصفحات المفعلة فقط
function populateActiveAccounts() {
    loadUserSettings();

    let activePages = [];

    if (userConfig.pages && userConfig.pages.length > 0) {
        const allowedIds = userConfig.selectedPageIds || [];
        activePages = userConfig.pages.filter(p => allowedIds.includes(p.id));
        // إذا لم يكن هناك تحديد، نأخذ جميع الصفحات المكتشفة
        if (activePages.length === 0 && allowedIds.length === 0) {
            activePages = userConfig.pages;
        }
    }

    if (activePages.length > 0) {
        if (onboardingBanner) onboardingBanner.style.display = 'none';
        currentAccounts = activePages;
        pageSelector.innerHTML = '';
        if (arTargetPageSelector) {
            const currentSelected = arTargetPageSelector.value;
            arTargetPageSelector.innerHTML = '<option value="">⚙️ الإعدادات العامة الافتراضية (Global Default)</option>';
            currentAccounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.id;
                const hasIg = acc.instagram ? ' 📸 (مربوط بانستجرام)' : '';
                opt.textContent = `🏢 صفحة: ${acc.name}${hasIg}`;
                arTargetPageSelector.appendChild(opt);
            });
            if (currentSelected) arTargetPageSelector.value = currentSelected;
        }

        currentAccounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.id;
            const hasIg = acc.instagram ? ' 📸 (مربوط بانستجرام)' : '';
            opt.textContent = `${acc.name}${hasIg}`;
            pageSelector.appendChild(opt);
        });
        updateMockupHeader();
        headerStatusText.textContent = `🟢 متصل: ${currentAccounts.length} صفحة مفعلة`;
    } else {
        // حالة البداية النظيفة لأي عميل أو زائر جديد للمنصة
        currentAccounts = [];
        if (onboardingBanner) onboardingBanner.style.display = 'flex';
        pageSelector.innerHTML = '<option value="">⚠️ لم تقم بربط صفحاتك بعد — اضغط هنا لربط الحساب</option>';
        if (arTargetPageSelector) {
            arTargetPageSelector.innerHTML = '<option value="">⚙️ الإعدادات العامة الافتراضية (Global Default)</option>';
        }
        headerStatusText.textContent = '⚪ غير متصل (بانتظار ربط الحساب)';
        mockupProfileName.textContent = 'اسم صفحتك هنا';
        mockupAvatar.innerHTML = '👤';
    }
}

// فتح نافذة الإعدادات عند الضغط على زر الترحيب أو القائمة الفارغة
if (btnBannerConnect) {
    btnBannerConnect.addEventListener('click', openSettingsModal);
}
pageSelector.addEventListener('click', () => {
    if (currentAccounts.length === 0) {
        openSettingsModal();
    }
});


// دالة تحديث اسم ولوجو المنصة في المعاينة الحية
function updateMockupHeader() {
    const selectedId = pageSelector.value;
    const account = currentAccounts.find(a => a.id === selectedId);

    if (!account) return;

    if (activePlatform === 'facebook') {
        mockupProfileName.textContent = account.name;
        if (account.picture) {
            mockupAvatar.innerHTML = `<img src="${account.picture}" alt="${account.name}">`;
        } else {
            mockupAvatar.innerHTML = '👤';
        }
    } else if (activePlatform === 'instagram') {
        if (account.instagram) {
            mockupProfileName.textContent = `@${account.instagram.username}`;
            if (account.instagram.picture) {
                mockupAvatar.innerHTML = `<img src="${account.instagram.picture}" alt="${account.instagram.username}">`;
            } else if (account.picture) {
                mockupAvatar.innerHTML = `<img src="${account.picture}" alt="${account.name}">`;
            } else {
                mockupAvatar.innerHTML = '📸';
            }
        } else {
            mockupProfileName.textContent = `${account.name} (غير مربوط بانستجرام)`;
            if (account.picture) {
                mockupAvatar.innerHTML = `<img src="${account.picture}" alt="${account.name}">`;
            } else {
                mockupAvatar.innerHTML = '📸';
            }
        }
    }
}

pageSelector.addEventListener('change', updateMockupHeader);

// ========================================================
// 🤖 وظائف وإدارة الرد التلقائي الذكي للعملاء (Multi-Client AI Bot)
// ========================================================

const STORAGE_AUTOREPLY_KEY = 'socialflow_autoreply_client_config';
let currentSelectedTargetPostIds = new Set();
let isDeepCrawlingActive = false;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ----------------------------------------------------
// 1. مكرر قائمة الخدمات والمنتجات وعروض الأسعار (Services Repeater)
// ----------------------------------------------------
function renderServicesList(services = []) {
    if (!servicesListContainer) return;
    servicesListContainer.innerHTML = '';

    if (!Array.isArray(services) || services.length === 0) {
        addServiceRow({ name: '', price: '', details: '' });
        return;
    }

    services.forEach(item => {
        addServiceRow(item);
    });
}

function addServiceRow(data = { name: '', price: '', details: '' }) {
    if (!servicesListContainer) return;

    const row = document.createElement('div');
    row.className = 'service-repeater-card';
    row.innerHTML = `
        <div class="repeater-row-top">
            <input type="text" class="settings-input service-name" placeholder="اسم الخدمة أو المنتج (مثال: تنظيف وتبييض الأسنان)" value="${escapeHtml(data.name || '')}">
            <input type="text" class="settings-input service-price" placeholder="السعر (اختياري: 1500 ج)" value="${escapeHtml(data.price || '')}">
            <button type="button" class="btn-del-repeater" title="حذف الخدمة">🗑️</button>
        </div>
        <div>
            <textarea rows="2" class="settings-input text-area service-details" placeholder="تفاصيل ومميزات الخدمة وشروط الاستفادة منها...">${escapeHtml(data.details || '')}</textarea>
        </div>
    `;

    const btnDel = row.querySelector('.btn-del-repeater');
    btnDel.addEventListener('click', () => {
        const totalRows = servicesListContainer.querySelectorAll('.service-repeater-card').length;
        if (totalRows <= 1) {
            // تفريغ الحقول فقط إذا كان السطر الوحيد
            row.querySelector('.service-name').value = '';
            row.querySelector('.service-price').value = '';
            row.querySelector('.service-details').value = '';
        } else {
            row.remove();
        }
    });

    servicesListContainer.appendChild(row);
}

function collectServicesData() {
    if (!servicesListContainer) return [];
    const rows = servicesListContainer.querySelectorAll('.service-repeater-card');
    const list = [];
    rows.forEach(r => {
        const name = r.querySelector('.service-name')?.value.trim() || '';
        const price = r.querySelector('.service-price')?.value.trim() || '';
        const details = r.querySelector('.service-details')?.value.trim() || '';
        if (name || price || details) {
            list.push({ name, price, details });
        }
    });
    return list;
}

// ----------------------------------------------------
// 2. مكرر أرقام الهواتف والواتساب (Phones Repeater)
// ----------------------------------------------------
function renderPhonesList(phones = []) {
    if (!phonesListContainer) return;
    phonesListContainer.innerHTML = '';

    if (!Array.isArray(phones) || phones.length === 0) {
        addPhoneRow('');
        return;
    }

    phones.forEach(p => addPhoneRow(p));
}

function addPhoneRow(phone = '') {
    if (!phonesListContainer) return;

    const row = document.createElement('div');
    row.className = 'phone-repeater-row';
    row.innerHTML = `
        <input type="text" class="settings-input phone-number-input" placeholder="رقم الهاتف أو الواتساب (مثال: 01012345678)" value="${escapeHtml(phone || '')}">
        <button type="button" class="btn-del-repeater" title="حذف الرقم">✕</button>
    `;

    const btnDel = row.querySelector('.btn-del-repeater');
    btnDel.addEventListener('click', () => {
        const count = phonesListContainer.querySelectorAll('.phone-repeater-row').length;
        if (count <= 1) {
            row.querySelector('.phone-number-input').value = '';
        } else {
            row.remove();
        }
    });

    phonesListContainer.appendChild(row);
}

function collectPhonesData() {
    if (!phonesListContainer) return [];
    const inputs = phonesListContainer.querySelectorAll('.phone-number-input');
    const result = [];
    inputs.forEach(inp => {
        const val = inp.value.trim();
        if (val) result.push(val);
    });
    return result;
}

// ----------------------------------------------------
// 3. مكرر روابط منصات السوشيال ميديا (Social Links Repeater)
// ----------------------------------------------------
function renderSocialLinks(links = []) {
    if (!socialLinksContainer) return;
    socialLinksContainer.innerHTML = '';

    if (!Array.isArray(links) || links.length === 0) {
        addSocialRow({ platform: 'فيسبوك', url: '' });
        return;
    }

    links.forEach(l => addSocialRow(l));
}

function addSocialRow(item = { platform: 'فيسبوك', url: '' }) {
    if (!socialLinksContainer) return;

    const row = document.createElement('div');
    row.className = 'social-repeater-row';
    row.innerHTML = `
        <select class="settings-select social-select">
            <option value="فيسبوك" ${item.platform === 'فيسبوك' ? 'selected' : ''}>📘 فيسبوك</option>
            <option value="انستجرام" ${item.platform === 'انستجرام' ? 'selected' : ''}>📸 انستجرام</option>
            <option value="واتساب" ${item.platform === 'واتساب' ? 'selected' : ''}>💬 واتساب</option>
            <option value="تيك توك" ${item.platform === 'تيك توك' ? 'selected' : ''}>🎵 تيك توك</option>
            <option value="يوتيوب" ${item.platform === 'يوتيوب' ? 'selected' : ''}>▶️ يوتيوب</option>
            <option value="لينكد إن" ${item.platform === 'لينكد إن' ? 'selected' : ''}>💼 لينكد إن</option>
            <option value="منصة إكس" ${item.platform === 'منصة إكس' ? 'selected' : ''}>✖️ منصة X</option>
            <option value="موقع إلكتروني" ${item.platform === 'موقع إلكتروني' ? 'selected' : ''}>🌐 موقع إلكتروني</option>
            <option value="أخرى" ${item.platform === 'أخرى' ? 'selected' : ''}>🔗 أخرى</option>
        </select>
        <input type="url" class="settings-input social-url-input" placeholder="https://..." value="${escapeHtml(item.url || '')}">
        <button type="button" class="btn-del-repeater" title="حذف الرابط">✕</button>
    `;

    const btnDel = row.querySelector('.btn-del-repeater');
    btnDel.addEventListener('click', () => {
        const count = socialLinksContainer.querySelectorAll('.social-repeater-row').length;
        if (count <= 1) {
            row.querySelector('.social-url-input').value = '';
        } else {
            row.remove();
        }
    });

    socialLinksContainer.appendChild(row);
}

function collectSocialData() {
    if (!socialLinksContainer) return [];
    const rows = socialLinksContainer.querySelectorAll('.social-repeater-row');
    const result = [];
    rows.forEach(r => {
        const platform = r.querySelector('.social-select')?.value || 'رابط';
        const url = r.querySelector('.social-url-input')?.value.trim() || '';
        if (url) {
            result.push({ platform, url });
        }
    });
    return result;
}

// ----------------------------------------------------
// 4. جلب وعرض منشورات الصفحة لتحديد نطاق الخدمة (Target Posts Scope)
// ----------------------------------------------------
async function loadPagePostsUI(pageId) {
    if (!postsChecklistContainer) return;
    const targetId = pageId || (arTargetPageSelector ? arTargetPageSelector.value : '') || (pageSelector ? pageSelector.value : '');

    if (!targetId) {
        postsChecklistContainer.innerHTML = '<div class="loading-posts-hint">⚠️ يرجى تحديد صفحة أولاً لجلب منشوراتها.</div>';
        return;
    }

    postsChecklistContainer.innerHTML = '<div class="loading-posts-hint">⏳ جاري جلب منشورات الصفحة...</div>';

    try {
        const res = await fetch(`/api/page-posts?pageId=${encodeURIComponent(targetId)}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
            renderPostsChecklist(data.posts);
        } else {
            postsChecklistContainer.innerHTML = '<div class="loading-posts-hint">لا توجد منشورات منشورة لهذه الصفحة بعد. عند عدم تحديد أي منشور، سيتم تطبيق الخدمة على كافة المنشورات تلقائياً.</div>';
        }
    } catch (err) {
        console.error('Error in loadPagePostsUI:', err);
        postsChecklistContainer.innerHTML = `<div class="loading-posts-hint">تعذر جلب المنشورات (${escapeHtml(err.message)}). ستعمل الخدمة على كافة المنشورات بشكل افتراضي.</div>`;
    }
}

function renderPostsChecklist(posts) {
    if (!postsChecklistContainer) return;
    postsChecklistContainer.innerHTML = '';

    posts.forEach(p => {
        const isChecked = currentSelectedTargetPostIds.has(p.id);
        const item = document.createElement('label');
        item.className = `post-checklist-item ${isChecked ? 'selected' : ''}`;
        
        const dateStr = p.createdTime ? new Date(p.createdTime).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) : '';
        const thumbHtml = p.picture ? `<img src="${p.picture}" class="post-thumb" alt="Post">` : `<div class="post-thumb" style="display:flex;align-items:center;justify-content:center;color:#666;font-size:16px;">📝</div>`;

        item.innerHTML = `
            <input type="checkbox" value="${p.id}" ${isChecked ? 'checked' : ''} style="margin-top: 4px; accent-color: #3b82f6;">
            ${thumbHtml}
            <div class="post-info-box">
                <span class="post-caption-snippet" title="${escapeHtml(p.caption)}">${escapeHtml(p.caption)}</span>
                <span class="post-date-tag">📅 ${dateStr}</span>
            </div>
        `;

        const chk = item.querySelector('input[type="checkbox"]');
        chk.addEventListener('change', () => {
            if (chk.checked) {
                currentSelectedTargetPostIds.add(p.id);
                item.classList.add('selected');
            } else {
                currentSelectedTargetPostIds.delete(p.id);
                item.classList.remove('selected');
            }
        });

        postsChecklistContainer.appendChild(item);
    });
}

// ----------------------------------------------------
// 5. فحص الـ 4 صفحات بفاصل 60 ثانية (4-Stage Deep Website Crawler)
// ----------------------------------------------------
async function startDeepCrawl() {
    if (isDeepCrawlingActive) return;

    const rawUrl = arWebsiteUrl ? arWebsiteUrl.value.trim() : '';
    if (!rawUrl) {
        showScrapeStatus('يرجى إدخال رابط الموقع أولاً (مثال: https://mywebsite.com)', 'error');
        if (arWebsiteUrl) arWebsiteUrl.focus();
        return;
    }

    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        showScrapeStatus('يجب أن يبدأ رابط الموقع بـ https:// أو http://', 'error');
        return;
    }

    isDeepCrawlingActive = true;
    if (btnStartDeepCrawl) btnStartDeepCrawl.disabled = true;
    if (deepCrawlProgressWrapper) deepCrawlProgressWrapper.style.display = 'block';

    // إعادة تعيين المؤشرات
    resetCrawlerPills();
    updateCrawlerProgress(0, 'جاري تهيئة الفحص الذكي للـ 4 صفحات...');

    const stages = [
        { type: 'home', pill: stepPillHome, label: 'الصفحة الرئيسية', pct: 25 },
        { type: 'services', pill: stepPillServices, label: 'صفحة الخدمات والمنتجات', pct: 50 },
        { type: 'about', pill: stepPillAbout, label: 'صفحة من نحن والخبرات', pct: 75 },
        { type: 'contact', pill: stepPillContact, label: 'صفحة تواصل معنا وبيانات الاتصال', pct: 100 }
    ];

    try {
        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];

            // 1. تنشيط مؤشر المرحلة
            setCrawlerPillState(stage.pill, 'active');
            updateCrawlerProgress(stage.pct - 15, `جاري فحص وتحليل: ${stage.label}...`);

            // 2. طلب الفحص من السيرفر
            const apiKey = arGroqApiKey ? arGroqApiKey.value.trim() : '';
            const res = await fetch('/api/autoreply/scrape-page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baseUrl: rawUrl, pageType: stage.type, groqApiKey: apiKey })
            });

            const data = await res.json();
            if (data.success && data.data) {
                applyCrawledDataToUI(stage.type, data.data);
            }

            // إتمام المرحلة
            setCrawlerPillState(stage.pill, 'done');
            const tokensMsg = data.tokensUsed ? ` (${data.tokensUsed} توكن • استهلاك آمن تحت 6,000 TPM)` : '';
            updateCrawlerProgress(stage.pct, `اكتمل التحليل العميق لـ: ${stage.label}${tokensMsg}`);

            // 3. إذا لم تكن هذه آخر مرحلة، نبدأ عداد الانتظار 60 ثانية لحماية الحصة
            if (i < stages.length - 1) {
                const nextStage = stages[i + 1];
                setCrawlerPillState(nextStage.pill, 'waiting');
                await runCrawlerCountdown(60, `تم التحليل العميق لـ ${stage.label}. ننتظر 60 ثانية لتجديد كوتا الـ 6,000 TPM بالكامل قبل بدء ${nextStage.label}...`);
            }
        }

        // نجاح الفحص بالكامل
        updateCrawlerProgress(100, '🎉 اكتمل فحص الصفحات الـ 4 بنجاح! تم استخراج كافة الخدمات وبيانات التواصل.');
        showScrapeStatus('🎉 تم فحص الصفحات الـ 4 واستخراج الخدمات وبيانات التواصل بنجاح! جاري توليد برومبت النظام المخصص...', 'success');

        // صياغة برومبت النظام تلقائياً بعد اكتمال الفحص
        await generateCustomPromptUI();

    } catch (err) {
        console.error('Error in startDeepCrawl:', err);
        showScrapeStatus('حدث خطأ أثناء فحص الصفحات: ' + err.message, 'error');
    } finally {
        isDeepCrawlingActive = false;
        if (btnStartDeepCrawl) {
            btnStartDeepCrawl.disabled = false;
            btnStartDeepCrawl.innerHTML = '<span class="btn-icon">🚀</span><span>بدء الفحص والتحليل الذكي (4 صفحات)</span>';
        }
    }
}

function resetCrawlerPills() {
    [stepPillHome, stepPillServices, stepPillAbout, stepPillContact].forEach(p => {
        if (!p) return;
        p.className = 'crawler-step-pill';
        const icon = p.querySelector('.step-status-icon');
        if (icon) icon.textContent = '⚪';
    });
}

function setCrawlerPillState(pill, state) {
    if (!pill) return;
    pill.className = `crawler-step-pill ${state}`;
    const icon = pill.querySelector('.step-status-icon');
    if (icon) {
        if (state === 'active') icon.textContent = '⏳';
        else if (state === 'waiting') icon.textContent = '⏱️';
        else if (state === 'done') icon.textContent = '✅';
        else icon.textContent = '⚪';
    }
}

function updateCrawlerProgress(pct, statusText) {
    if (crawlerProgressBar) crawlerProgressBar.style.width = `${pct}%`;
    if (crawlerProgressPercent) crawlerProgressPercent.textContent = `${pct}%`;
    if (crawlerStatusText) crawlerStatusText.textContent = statusText;
}

function runCrawlerCountdown(seconds, message) {
    return new Promise(resolve => {
        if (crawlerCountdownCard) crawlerCountdownCard.style.display = 'flex';
        let remaining = seconds;
        if (crawlerSecondsLeft) crawlerSecondsLeft.textContent = remaining;
        if (crawlerStatusText) crawlerStatusText.textContent = message;

        const interval = setInterval(() => {
            remaining--;
            if (crawlerSecondsLeft) crawlerSecondsLeft.textContent = remaining;

            if (remaining <= 0) {
                clearInterval(interval);
                if (crawlerCountdownCard) crawlerCountdownCard.style.display = 'none';
                resolve();
            }
        }, 1000);
    });
}

function cleanEmptyInitialPhoneRow() {
    if (!phonesListContainer) return;
    const rows = phonesListContainer.querySelectorAll('.phone-repeater-row');
    if (rows.length > 1) {
        const firstInput = rows[0].querySelector('.phone-number-input');
        if (firstInput && !firstInput.value.trim()) {
            rows[0].remove();
        }
    }
}

function cleanEmptyInitialSocialRow() {
    if (!socialLinksContainer) return;
    const rows = socialLinksContainer.querySelectorAll('.social-repeater-row');
    if (rows.length > 1) {
        const firstUrl = rows[0].querySelector('.social-url-input');
        if (firstUrl && !firstUrl.value.trim()) {
            rows[0].remove();
        }
    }
}

function applyCrawledDataToUI(pageType, data) {
    if (!data) return;

    if (pageType === 'home') {
        if (arProjectName && data.projectName && !arProjectName.value) {
            arProjectName.value = data.projectName;
        }
        if (arNiche && data.niche && !arNiche.value) {
            arNiche.value = data.niche;
        }
    } else if (pageType === 'services') {
        if (Array.isArray(data.services) && data.services.length > 0) {
            renderServicesList(data.services);
        }
    }

    // دمج أرقام الهواتف والواتساب المكتشفة في محتوى أو فوتر أي صفحة تلقائياً
    if (Array.isArray(data.phones) && data.phones.length > 0) {
        const existingPhones = new Set(collectPhonesData());
        data.phones.forEach(p => {
            const cleanP = String(p).trim();
            if (cleanP && !existingPhones.has(cleanP)) {
                addPhoneRow(cleanP);
                existingPhones.add(cleanP);
            }
        });
        cleanEmptyInitialPhoneRow();
    }

    // دمج البريد الإلكتروني المكتشف في الفوتر أو المحتوى
    if (arEmailInput && data.email && !arEmailInput.value.trim()) {
        arEmailInput.value = data.email.trim();
    }

    // دمج روابط السوشيال ميديا المكتشفة بالفوتر
    if (Array.isArray(data.socialLinks) && data.socialLinks.length > 0) {
        const existingUrls = new Set(collectSocialData().map(s => s.url));
        data.socialLinks.forEach(item => {
            if (item && item.url && !existingUrls.has(item.url)) {
                addSocialRow(item);
                existingUrls.add(item.url);
            }
        });
        cleanEmptyInitialSocialRow();
    }
}

function showScrapeStatus(msg, type) {
    if (!scrapeStatus) return;
    scrapeStatus.textContent = msg;
    scrapeStatus.style.display = 'block';
    scrapeStatus.className = `scrape-status-box ${type}`;
}

// ----------------------------------------------------
// 6. توليد برومبت النظام المخصص بالذكاء الاصطناعي (Custom System Prompt Builder)
// ----------------------------------------------------
async function generateCustomPromptUI() {
    const projectName = arProjectName ? arProjectName.value.trim() : '';
    const niche = arNiche ? arNiche.value.trim() : '';
    const services = collectServicesData();
    const phones = collectPhonesData();
    const email = arEmailInput ? arEmailInput.value.trim() : '';
    const socialLinks = collectSocialData();
    const groqApiKey = arGroqApiKey ? arGroqApiKey.value.trim() : '';

    if (btnGenerateCustomPrompt) {
        btnGenerateCustomPrompt.disabled = true;
        if (btnGeneratePromptText) btnGeneratePromptText.textContent = '⏳ جاري تحليل البيانات وصياغة برومبت النظام المخصص...';
    }

    try {
        const res = await fetch('/api/autoreply/generate-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectName,
                niche,
                services,
                phones,
                email,
                socialLinks,
                groqApiKey
            })
        });

        const data = await res.json();
        if (data.success && data.customPrompt) {
            if (arCustomSystemPrompt) {
                arCustomSystemPrompt.value = data.customPrompt;
                arCustomSystemPrompt.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            showAlert('✨ تم توليد برومبت النظام المخصص بنجاح! راجعه ثم اضغط حفظ.', 'success');
        } else {
            showAlert('❌ تعذر توليد البرومبت: ' + (data.message || 'خطأ غير معروف'), 'error');
        }
    } catch (err) {
        console.error('Error in generateCustomPromptUI:', err);
        showAlert('تعذر الاتصال بالخادم لتوليد البرومبت: ' + err.message, 'error');
    } finally {
        if (btnGenerateCustomPrompt) {
            btnGenerateCustomPrompt.disabled = false;
            if (btnGeneratePromptText) btnGeneratePromptText.textContent = 'إرسال إلى الذكاء الاصطناعي لتحليل البيانات وتوليد البرومبت';
        }
    }
}

// ----------------------------------------------------
// 7. تحميل وحفظ إعدادات وقاعدة معرفة المشروع (Per-Page Config)
// ----------------------------------------------------
async function loadAutoReplyConfigUI(pageId) {
    const targetPageId = pageId || (arTargetPageSelector ? arTargetPageSelector.value : '');

    let config = null;
    try {
        const url = targetPageId ? `/api/autoreply/config?pageId=${encodeURIComponent(targetPageId)}` : '/api/autoreply/config';
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.config) {
            config = data.config;
        }
    } catch (e) {
        console.error('Error loading config from server:', e);
    }

    if (!config) {
        config = {
            enabled: true,
            pageId: targetPageId || '',
            projectName: '',
            niche: '',
            services: [],
            phones: [],
            email: '',
            socialLinks: [],
            customPrompt: '',
            targetAllPosts: true,
            targetPostIds: [],
            groqApiKey: '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',
            likeComment: true,
            replyComment: true,
            sendDm: true
        };
    }

    // تعبئة الحقول الأساسية
    if (autoReplyMasterToggle) autoReplyMasterToggle.checked = config.enabled !== false;
    updateMasterToggleLabel();

    if (arProjectName) arProjectName.value = config.projectName || '';
    if (arNiche) arNiche.value = config.niche || '';
    if (arEmailInput) arEmailInput.value = config.email || '';
    if (arCustomSystemPrompt) arCustomSystemPrompt.value = config.customPrompt || '';
    if (arGroqApiKey) arGroqApiKey.value = config.groqApiKey || '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';

    // تعبئة المكررات
    renderServicesList(config.services || []);
    renderPhonesList(config.phones || []);
    renderSocialLinks(config.socialLinks || []);

    // نطاق المنشورات
    currentSelectedTargetPostIds = new Set(Array.isArray(config.targetPostIds) ? config.targetPostIds : []);
    const isAll = config.targetAllPosts !== false;
    if (radioTargetAll) radioTargetAll.checked = isAll;
    if (radioTargetSpecific) radioTargetSpecific.checked = !isAll;
    if (targetPostsWrapper) targetPostsWrapper.style.display = isAll ? 'none' : 'block';

    if (!isAll) {
        loadPagePostsUI(targetPageId);
    }

    // خيارات التفاعل
    if (checkLikeComment) checkLikeComment.checked = config.likeComment !== false;
    if (checkReplyComment) checkReplyComment.checked = config.replyComment !== false;
    if (checkSendDm) checkSendDm.checked = config.sendDm !== false;
}

function updateMasterToggleLabel() {
    if (!toggleMasterText || !autoReplyMasterToggle) return;
    if (autoReplyMasterToggle.checked) {
        toggleMasterText.innerHTML = 'الحالة: <strong style="color: #10b981;">مفعّل وجاهز 🟢</strong>';
    } else {
        toggleMasterText.innerHTML = 'الحالة: <strong style="color: #94a3b8;">متوقف مؤقتاً ⚪</strong>';
    }
}

async function saveAutoReplyConfigUI() {
    const targetPageId = arTargetPageSelector ? arTargetPageSelector.value : '';
    const isTargetAll = radioTargetAll ? radioTargetAll.checked : true;

    const config = {
        enabled: autoReplyMasterToggle ? autoReplyMasterToggle.checked : true,
        pageId: targetPageId,
        projectName: arProjectName ? arProjectName.value.trim() : '',
        niche: arNiche ? arNiche.value.trim() : '',
        services: collectServicesData(),
        phones: collectPhonesData(),
        email: arEmailInput ? arEmailInput.value.trim() : '',
        socialLinks: collectSocialData(),
        customPrompt: arCustomSystemPrompt ? arCustomSystemPrompt.value.trim() : '',
        targetAllPosts: isTargetAll,
        targetPostIds: Array.from(currentSelectedTargetPostIds),
        groqApiKey: arGroqApiKey ? arGroqApiKey.value.trim() : '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',
        likeComment: checkLikeComment ? checkLikeComment.checked : true,
        replyComment: checkReplyComment ? checkReplyComment.checked : true,
        sendDm: checkSendDm ? checkSendDm.checked : true
    };

    if (btnSaveAutoReplyConfig) {
        btnSaveAutoReplyConfig.disabled = true;
        btnSaveAutoReplyConfig.innerHTML = '<span>⏳ جاري الحفظ...</span>';
    }

    try {
        const res = await fetch('/api/autoreply/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const data = await res.json();
        if (data.success) {
            showSaveConfigStatus('✓ تم حفظ قاعدة المعرفة والإعدادات والبرومبت بنجاح للمشروع!', 'success');
        } else {
            showSaveConfigStatus('❌ تعذر الحفظ: ' + (data.message || ''), 'error');
        }
    } catch (err) {
        console.error('Error saving config:', err);
        showSaveConfigStatus('❌ تعذر الاتصال بالخادم لحفظ الإعدادات', 'error');
    } finally {
        if (btnSaveAutoReplyConfig) {
            btnSaveAutoReplyConfig.disabled = false;
            btnSaveAutoReplyConfig.innerHTML = '<span>💾 حفظ قاعدة المعرفة والبرومبت لهذا المشروع</span>';
        }
    }
}

function showSaveConfigStatus(msg, type) {
    if (!saveConfigStatus) return;
    saveConfigStatus.textContent = msg;
    saveConfigStatus.style.display = 'inline-block';
    saveConfigStatus.style.color = type === 'success' ? '#10b981' : '#ef4444';
    setTimeout(() => {
        saveConfigStatus.style.display = 'none';
    }, 4500);
}

// ----------------------------------------------------
// 8. استوديو تجربة ومحاكاة الرد الفوري (Live Simulator)
// ----------------------------------------------------
async function runAutoReplySimulation() {
    const postCaption = simPostCaption ? simPostCaption.value.trim() : '';
    const comment = simComment ? simComment.value.trim() : '';

    if (!comment) {
        alert('يرجى كتابة تعليق تجريبي في خانة "تعليق العميل" لتجربة رد الذكاء الاصطناعي عليه.');
        if (simComment) simComment.focus();
        return;
    }

    const currentConfig = {
        projectName: arProjectName ? arProjectName.value.trim() : '',
        niche: arNiche ? arNiche.value.trim() : '',
        services: collectServicesData(),
        phones: collectPhonesData(),
        email: arEmailInput ? arEmailInput.value.trim() : '',
        socialLinks: collectSocialData(),
        customPrompt: arCustomSystemPrompt ? arCustomSystemPrompt.value.trim() : '',
        groqApiKey: arGroqApiKey ? arGroqApiKey.value.trim() : '',
        likeComment: checkLikeComment ? checkLikeComment.checked : true,
        replyComment: checkReplyComment ? checkReplyComment.checked : true,
        sendDm: checkSendDm ? checkSendDm.checked : true
    };

    if (btnRunSimulation) {
        btnRunSimulation.disabled = true;
        btnRunSimulation.innerHTML = '<span class="spinner-small"></span> <span>جاري التوليد...</span>';
    }

    const senderName = simSenderName && simSenderName.value.trim() ? simSenderName.value.trim() : 'أحمد علي';

    try {
        const res = await fetch('/api/autoreply/test-simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postCaption,
                commentText: comment,
                config: currentConfig,
                senderName: senderName
            })
        });

        const data = await res.json();
        if (data.success) {
            if (simPublicReplyOutput) {
                simPublicReplyOutput.innerHTML = `
                    <div style="margin-bottom: 6px;">
                        <span style="color: #ef4444; font-weight: 700; margin-left: 6px;">❤️ تم الإعجاب بالتعليق أولاً</span>
                        <span style="color: var(--text-secondary); font-size: 11px;">(Auto-Like)</span>
                    </div>
                    <div>${escapeHtml(data.publicReply)}</div>
                `;
            }

            if (simPrivateMsgOutput) {
                simPrivateMsgOutput.textContent = data.privateMessage;
            }

            if (simResultsContainer) {
                simResultsContainer.style.display = 'flex';
                simResultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            alert('تعذر تجربة الرد: ' + (data.message || 'خطأ غير معروف'));
        }
    } catch (err) {
        console.error('Error running simulation:', err);
        alert('تعذر الاتصال بالخادم لتجربة الرد: ' + err.message);
    } finally {
        if (btnRunSimulation) {
            btnRunSimulation.disabled = false;
            btnRunSimulation.innerHTML = '<span class="btn-icon">⚡</span><span>تجربة الرد الذكي باسم وسؤال العميل</span>';
        }
    }
}

// ----------------------------------------------------
// 9. جلب وعرض سجل النشاط والردود الحية (Live Logs)
// ----------------------------------------------------
async function loadAutoReplyLogsUI() {
    if (!activityLogsList) return;

    try {
        const res = await fetch('/api/autoreply/logs');
        const data = await res.json();
        const logs = data.logs || [];

        if (logs.length === 0) {
            activityLogsList.innerHTML = `
                <div class="empty-logs">
                    <span>لا توجد تعليقات جديدة حتى الآن. النظام بانتظار أحداث الويبهوك من فيسبوك وانستجرام!</span>
                </div>
            `;
            return;
        }

        activityLogsList.innerHTML = logs.map(entry => {
            const timeStr = new Date(entry.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            const isFb = entry.platform === 'facebook';
            const platformTag = isFb ? '<span class="log-platform-tag facebook">فيسبوك</span>' : '<span class="log-platform-tag instagram">انستجرام</span>';

            const actionsPills = (entry.actions || []).map(a => {
                if (a === 'like') return '<span>❤️ إعجاب</span>';
                if (a === 'reply') return '<span>💬 رد بالبوست</span>';
                if (a === 'dm') return '<span>📩 رسالة خاصة</span>';
                return '';
            }).join(' ');

            return `
                <div class="log-entry-card">
                    <div class="log-entry-top">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            ${platformTag}
                            <span class="log-comment-text">${escapeHtml(entry.senderName || 'عميل')}: "${escapeHtml(entry.commentText)}"</span>
                        </div>
                        <span class="log-time">${timeStr}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                        📌 سياق كابشن البوست: <em>${escapeHtml(entry.postCaption || 'بدون كابشن')}</em>
                    </div>
                    <div class="log-actions-taken">
                        ${actionsPills}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading logs:', err);
    }
}

// ----------------------------------------------------
// 10. ربط أحداث واجهة الرد التلقائي
// ----------------------------------------------------
if (autoReplyMasterToggle) {
    autoReplyMasterToggle.addEventListener('change', () => {
        updateMasterToggleLabel();
        saveAutoReplyConfigUI();
    });
}

if (arTargetPageSelector) {
    arTargetPageSelector.addEventListener('change', () => {
        loadAutoReplyConfigUI(arTargetPageSelector.value);
    });
}

if (btnAddServiceRow) {
    btnAddServiceRow.addEventListener('click', () => addServiceRow());
}

if (btnAddPhoneRow) {
    btnAddPhoneRow.addEventListener('click', () => addPhoneRow());
}

if (btnAddSocialRow) {
    btnAddSocialRow.addEventListener('click', () => addSocialRow());
}

if (radioTargetAll) {
    radioTargetAll.addEventListener('change', () => {
        if (targetPostsWrapper) targetPostsWrapper.style.display = 'none';
    });
}

if (radioTargetSpecific) {
    radioTargetSpecific.addEventListener('change', () => {
        if (targetPostsWrapper) {
            targetPostsWrapper.style.display = 'block';
            loadPagePostsUI(arTargetPageSelector ? arTargetPageSelector.value : '');
        }
    });
}

if (btnRefreshPagePosts) {
    btnRefreshPagePosts.addEventListener('click', () => {
        loadPagePostsUI(arTargetPageSelector ? arTargetPageSelector.value : '');
    });
}

if (btnStartDeepCrawl) {
    btnStartDeepCrawl.addEventListener('click', startDeepCrawl);
}

if (btnGenerateCustomPrompt) {
    btnGenerateCustomPrompt.addEventListener('click', generateCustomPromptUI);
}

if (btnSaveAutoReplyConfig) {
    btnSaveAutoReplyConfig.addEventListener('click', saveAutoReplyConfigUI);
}

if (btnRunSimulation) {
    btnRunSimulation.addEventListener('click', runAutoReplySimulation);
}

if (btnRefreshLogs) {
    btnRefreshLogs.addEventListener('click', loadAutoReplyLogsUI);
}

// التحميل المبدئي عند تشغيل الموقع
populateActiveAccounts();
loadScheduledPosts();
loadAutoReplyConfigUI();



