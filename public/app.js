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
        showAlert('يرجى اختيار الصفحة المستهدفة من القائمة أولاً!', 'error');
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

// 6. تحميل وإدارة المنشورات المجدولة
async function loadScheduledPosts() {
    try {
        const response = await fetch('/api/scheduled');
        const posts = await response.json();

        scheduledCount.textContent = `${posts.length} منشورات`;

        if (posts.length === 0) {
            scheduledList.innerHTML = `
                <div class="empty-scheduled">
                    <p>لا توجد منشورات مجدولة حالياً. اكتب منشوراً وحدد وقتاً لجدولته!</p>
                </div>
            `;
            return;
        }

        scheduledList.innerHTML = '';
        posts.forEach(post => {
            const item = document.createElement('div');
            item.className = 'scheduled-item';
            
            const dateStr = new Date(post.scheduledTime).toLocaleString('ar-EG', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const platformsBadges = (post.platforms || []).map(p => 
                `<span class="platform-mini-badge">${p}</span>`
            ).join(' ');

            item.innerHTML = `
                <div class="scheduled-info">
                    <div class="scheduled-date">⏰ ${dateStr}</div>
                    <div class="scheduled-snippet">${post.content || (post.media ? '📁 وسائط بدون نص' : '')}</div>
                    <div class="scheduled-platforms">${platformsBadges}</div>
                </div>
                <button class="btn-delete-scheduled" data-id="${post.id}" title="إلغاء المنشور">🗑️</button>
            `;

            scheduledList.appendChild(item);
        });

        // ربط أزرار الحذف
        document.querySelectorAll('.btn-delete-scheduled').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('هل أنت متأكد من إلغاء هذا المنشور المجدول؟')) {
                    await fetch(`/api/scheduled/${id}`, { method: 'DELETE' });
                    loadScheduledPosts();
                }
            });
        });

    } catch (err) {
        console.error('فشل في جلب المنشورات المجدولة', err);
    }
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
        currentAccounts = activePages;
        pageSelector.innerHTML = '';
        currentAccounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.id;
            const hasIg = acc.instagram ? ' 📸 (مربوط بانستجرام)' : '';
            opt.textContent = `${acc.name}${hasIg}`;
            pageSelector.appendChild(opt);
        });
        updateMockupHeader();
        headerStatusText.textContent = `متصل: ${currentAccounts.length} صفحة مفعلة`;
    } else {
        // محاولة جلب الصفحات الافتراضية من السيرفر
        fetchServerDefaultAccounts();
    }
}

// جلب الصفحات من السيرفر كخيار احتياطي
async function fetchServerDefaultAccounts() {
    try {
        const res = await fetch('/api/accounts');
        const data = await res.json();
        if (data.success && data.accounts && data.accounts.length > 0) {
            currentAccounts = data.accounts;
            pageSelector.innerHTML = '';
            currentAccounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.id;
                const hasIg = acc.instagram ? ' 📸 (مربوط بانستجرام)' : '';
                opt.textContent = `${acc.name}${hasIg}`;
                pageSelector.appendChild(opt);
            });
            updateMockupHeader();
            headerStatusText.textContent = `متصل بالسحابة (${currentAccounts.length} صفحة)`;
        } else {
            pageSelector.innerHTML = '<option value="">⚠️ لم تقم بربط صفحات بعد - اضغط على إدارة وربط الصفحات</option>';
            headerStatusText.textContent = 'في انتظار ربط الحسابات';
        }
    } catch (e) {
        pageSelector.innerHTML = '<option value="">تعذر جلب الصفحات</option>';
    }
}

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

// التحميل المبدئي عند تشغيل الموقع
populateActiveAccounts();
loadScheduledPosts();


