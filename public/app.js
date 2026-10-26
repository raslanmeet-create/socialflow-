// ═══════════════════════════════════════════════════════════════
// تكامل Supabase والمصادقة (Google Sign-In)
// ═══════════════════════════════════════════════════════════════
const SUPABASE_URL = 'https://gmddkphzgjufnkaoppie.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZGRrcGh6Z2p1Zm5rYW9wcGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4OTQ2NDAsImV4cCI6MjEwODQ3MDY0MH0.Kg_0Fp4skPokoTS5ilOBPhUEKhuNz-pG2qE88C24INo';

let supabaseClient = null;
let currentAuthUser = null;

if (window.supabase) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.warn('تعذر تهيئة Supabase في الواجهة:', e);
    }
}

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
const tabBtnTelegramGroups = document.getElementById('tabBtnTelegramGroups');
const plannerBadgeCount = document.getElementById('plannerBadgeCount');
const composerSection = document.getElementById('composerSection');
const plannerSection = document.getElementById('plannerSection');
const autoReplySection = document.getElementById('autoReplySection');
const telegramGroupsSection = document.getElementById('telegramGroupsSection');

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
const arCallPhoneInput = document.getElementById('arCallPhoneInput');
const arWhatsappPhoneInput = document.getElementById('arWhatsappPhoneInput');
const waAutoConvertHint = document.getElementById('waAutoConvertHint');
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
const btnOpenGroqHelpModal = document.getElementById('btnOpenGroqHelpModal');
const groqHelpModal = document.getElementById('groqHelpModal');
const btnCloseGroqHelpModal = document.getElementById('btnCloseGroqHelpModal');
const btnCloseGroqHelpModalBtn = document.getElementById('btnCloseGroqHelpModalBtn');
const btnToggleGroqVisibility = document.getElementById('btnToggleGroqVisibility');
const btnVerifyGroqKey = document.getElementById('btnVerifyGroqKey');
const groqKeyStatusMsg = document.getElementById('groqKeyStatusMsg');
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
let plannerStatusFilter = 'all';
let cachedScheduledPosts = [];
let activePreviewPostId = null;

// عناصر نافذة تعديل المنشور ومزامنة المنشورات ودليل المقاسات
const editPostModal = document.getElementById('editPostModal');
const btnCloseEditModal = document.getElementById('btnCloseEditModal');
const btnCancelEditModal = document.getElementById('btnCancelEditModal');
const btnSaveEditedPost = document.getElementById('btnSaveEditedPost');
const editPostId = document.getElementById('editPostId');
const editPostContent = document.getElementById('editPostContent');
const editScheduleTimeGroup = document.getElementById('editScheduleTimeGroup');
const editScheduledTime = document.getElementById('editScheduledTime');
const editPublishedNote = document.getElementById('editPublishedNote');
const btnEditFromPreviewModal = document.getElementById('btnEditFromPreviewModal');
const btnSyncPagePosts = document.getElementById('btnSyncPagePosts');
const btnToggleSizesGuide = document.getElementById('btnToggleSizesGuide');
const btnCloseSizesGuide = document.getElementById('btnCloseSizesGuide');
const imageSizesGuideCard = document.getElementById('imageSizesGuideCard');
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

// عناصر نظام التعليقات التلقائية المتعددة وإرفاق الصور
const enableFirstComment = document.getElementById('enableFirstComment');
const firstCommentContainer = document.getElementById('firstCommentContainer');
const commentsRepeaterList = document.getElementById('commentsRepeaterList');
const btnAddCommentRow = document.getElementById('btnAddCommentRow');
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

// ==========================================================
// إدارة نظام التعليقات التلقائية المتعددة (Smart Auto-Comments Manager)
// ==========================================================
function createCommentCard(index, defaultText = '') {
    const card = document.createElement('div');
    card.className = 'comment-card-item';
    const isFirst = index === 0;

    card.innerHTML = `
        <div class="comment-card-header">
            <span class="comment-num-badge">
                💬 <span class="badge-title">${isFirst ? 'التعليق الأول (#1)' : `تعليق إضافي (#${index + 1})`}</span>
            </span>
            <div class="comment-card-actions">
                <span class="comment-char-counter">0 حرف</span>
                ${!isFirst ? `<button type="button" class="btn-del-comment" title="حذف هذا التعليق">🗑️ حذف</button>` : ''}
            </div>
        </div>
        <textarea class="comment-textarea" rows="2" placeholder="${isFirst ? 'اكتب التعليق الأول هنا... (الهاشتاجات تعمل 100% كنصوص تفاعلية)' : `اكتب التعليق الإضافي #${index + 1}...`}">${defaultText}</textarea>
        
        <input type="file" class="comment-file-input" accept="image/png, image/jpeg, image/webp" style="display: none;">
        
        <div class="comment-tools-bar">
            <div class="comment-quick-helpers">
                <button type="button" class="btn-comment-tool btn-insert-hash" title="إضافة هاشتاج سريع">#️⃣ هاشتاج</button>
                <button type="button" class="btn-comment-tool btn-insert-link" title="إضافة رابط">🔗 رابط</button>
            </div>
            <div>
                <button type="button" class="btn-upload-comment-img" title="إرفاق صورة تظهر داخل التعليق في فيسبوك">
                    <span>📸 إرفاق صورة (فيسبوك)</span>
                </button>
            </div>
        </div>

        <div class="comment-img-preview-box" style="display: none;">
            <img class="comment-img-thumb" src="" alt="Comment Attachment">
            <div class="comment-img-info">
                <span class="comment-img-name"></span>
                <span class="comment-img-badge">📘 مرفقة مع تعليق فيسبوك</span>
            </div>
            <button type="button" class="btn-remove-comment-img" title="إزالة الصورة">✕</button>
        </div>
    `;

    // العناصر الداخلية للكارت
    const textarea = card.querySelector('.comment-textarea');
    const counter = card.querySelector('.comment-char-counter');
    const fileInput = card.querySelector('.comment-file-input');
    const btnUpload = card.querySelector('.btn-upload-comment-img');
    const previewBox = card.querySelector('.comment-img-preview-box');
    const imgThumb = card.querySelector('.comment-img-thumb');
    const imgName = card.querySelector('.comment-img-name');
    const btnRemoveImg = card.querySelector('.btn-remove-comment-img');
    const btnDel = card.querySelector('.btn-del-comment');
    const btnHash = card.querySelector('.btn-insert-hash');
    const btnLink = card.querySelector('.btn-insert-link');

    // تحديث العداد الحي والمعاينة
    textarea.addEventListener('input', () => {
        counter.textContent = `${textarea.value.length} حرف`;
        updateCommentsMockup();
    });

    // إدراج نص عند موضع المؤشر
    function insertAtCursor(val) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        textarea.value = text.substring(0, start) + val + text.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + val.length;
        textarea.dispatchEvent(new Event('input'));
    }

    if (btnHash) {
        btnHash.addEventListener('click', () => {
            insertAtCursor('#');
        });
    }

    if (btnLink) {
        btnLink.addEventListener('click', () => {
            const url = prompt('أدخل الرابط المراد إضافته في التعليق:', 'https://');
            if (url) insertAtCursor(' ' + url + ' ');
        });
    }

    // إرفاق صورة بالتعليق
    if (btnUpload && fileInput) {
        btnUpload.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    imgThumb.src = e.target.result;
                    imgName.textContent = file.name;
                    previewBox.style.display = 'inline-flex';
                    btnUpload.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnRemoveImg && fileInput) {
        btnRemoveImg.addEventListener('click', () => {
            fileInput.value = '';
            previewBox.style.display = 'none';
            btnUpload.style.display = 'inline-flex';
        });
    }

    // زر حذف التعليق (للتعليقات بعد الأول)
    if (btnDel) {
        btnDel.addEventListener('click', () => {
            card.remove();
            reindexCommentCards();
            updateCommentsMockup();
        });
    }

    return card;
}

function reindexCommentCards() {
    if (!commentsRepeaterList) return;
    const cards = commentsRepeaterList.querySelectorAll('.comment-card-item');
    cards.forEach((card, idx) => {
        const badgeTitle = card.querySelector('.badge-title');
        const textarea = card.querySelector('.comment-textarea');
        const actions = card.querySelector('.comment-card-actions');
        let btnDel = card.querySelector('.btn-del-comment');

        if (idx === 0) {
            if (badgeTitle) badgeTitle.textContent = 'التعليق الأول (#1)';
            if (textarea && !textarea.value) textarea.placeholder = 'اكتب التعليق الأول هنا... (الهاشتاجات تعمل 100% كنصوص تفاعلية)';
            if (btnDel) btnDel.remove();
        } else {
            if (badgeTitle) badgeTitle.textContent = `تعليق إضافي (#${idx + 1})`;
            if (textarea && !textarea.value) textarea.placeholder = `اكتب التعليق الإضافي #${idx + 1}...`;
            if (!btnDel && actions) {
                const newDelBtn = document.createElement('button');
                newDelBtn.type = 'button';
                newDelBtn.className = 'btn-del-comment';
                newDelBtn.title = 'حذف هذا التعليق';
                newDelBtn.textContent = '🗑️ حذف';
                newDelBtn.addEventListener('click', () => {
                    card.remove();
                    reindexCommentCards();
                    updateCommentsMockup();
                });
                actions.appendChild(newDelBtn);
            }
        }
    });
}

function updateCommentsMockup() {
    if (!mockupFirstComment || !mockupCommentText) return;
    if (!enableFirstComment || !enableFirstComment.checked) {
        mockupFirstComment.style.display = 'none';
        return;
    }
    const firstTextarea = commentsRepeaterList?.querySelector('.comment-card-item:first-child .comment-textarea');
    const firstVal = firstTextarea ? firstTextarea.value.trim() : '';
    if (firstVal) {
        mockupCommentText.textContent = firstVal;
        mockupFirstComment.style.display = 'flex';
    } else {
        mockupFirstComment.style.display = 'none';
    }
}

function collectAllComments() {
    if (!enableFirstComment || !enableFirstComment.checked || !commentsRepeaterList) {
        return [];
    }
    const cards = commentsRepeaterList.querySelectorAll('.comment-card-item');
    const list = [];
    cards.forEach((card, idx) => {
        const textarea = card.querySelector('.comment-textarea');
        const fileInput = card.querySelector('.comment-file-input');
        const text = textarea ? textarea.value.trim() : '';
        const file = (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0] : null;

        if (text || file) {
            list.push({
                index: idx,
                text: text,
                file: file
            });
        }
    });
    return list;
}

// تهيئة نظام التعليقات التلقائية
if (enableFirstComment) {
    enableFirstComment.addEventListener('change', () => {
        if (firstCommentContainer) {
            firstCommentContainer.style.display = enableFirstComment.checked ? 'block' : 'none';
        }
        if (enableFirstComment.checked && commentsRepeaterList && commentsRepeaterList.children.length === 0) {
            commentsRepeaterList.appendChild(createCommentCard(0));
        }
        updateCommentsMockup();
    });
}

if (btnAddCommentRow && commentsRepeaterList) {
    btnAddCommentRow.addEventListener('click', () => {
        const currentCount = commentsRepeaterList.querySelectorAll('.comment-card-item').length;
        const newCard = createCommentCard(currentCount);
        commentsRepeaterList.appendChild(newCard);
        reindexCommentCards();
        const txt = newCard.querySelector('.comment-textarea');
        if (txt) txt.focus();
    });
}

// إنشاء الكارت الافتراضي للتعليق الأول
if (commentsRepeaterList && commentsRepeaterList.children.length === 0) {
    commentsRepeaterList.appendChild(createCommentCard(0));
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

    // فحص وسائط Cloudinary: إذا تم رفع وسائط (صورة أو فيديو)، يلزم توفر بيانات Cloudinary الخاصة بالمستخدم
    const hasMedia = selectedMediaFile || croppedImageBlob;
    if (hasMedia) {
        const cConfig = userConfig.cloudinary;
        if (!cConfig || !cConfig.cloudName || !cConfig.apiKey || !cConfig.apiSecret) {
            showAlert('⚠️ لرفع الصور والفيديوهات، يرجى إدخال بيانات حساب Cloudinary السحابي المجاني الخاص بك أولاً في نافذة الإعدادات.', 'error');
            openSettingsModal();
            return;
        }
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

    // تجميع أماكن النشر المحددة (بوست في الفيد / ستوري / كلاهما)
    const fbPlacements = [];
    if (document.getElementById('fb-opt-feed')?.checked) fbPlacements.push('feed');
    if (document.getElementById('fb-opt-story')?.checked) fbPlacements.push('story');
    if (selectedPlatforms.includes('facebook') && fbPlacements.length === 0) fbPlacements.push('feed');

    const igPlacements = [];
    if (document.getElementById('ig-opt-feed')?.checked) igPlacements.push('feed');
    if (document.getElementById('ig-opt-story')?.checked) igPlacements.push('story');
    if (selectedPlatforms.includes('instagram') && igPlacements.length === 0) igPlacements.push('feed');

    // فحص شرط الستوري: إذا كان النشر كـ Story فقط بدون Feed، يلزم إرفاق وسائط
    const onlyStoryFb = selectedPlatforms.includes('facebook') && fbPlacements.length === 1 && fbPlacements[0] === 'story';
    const onlyStoryIg = selectedPlatforms.includes('instagram') && igPlacements.length === 1 && igPlacements[0] === 'story';
    const hasAnyFeed = (selectedPlatforms.includes('facebook') && fbPlacements.includes('feed')) || 
                       (selectedPlatforms.includes('instagram') && igPlacements.includes('feed'));

    if ((onlyStoryFb || onlyStoryIg) && !hasAnyFeed && !selectedMediaFile && !croppedImageBlob) {
        showAlert('⚠️ نشر الستوري (Story) يشترط إرفاق صورة أو فيديو! يرجى رفع ملف وسائط أولاً.', 'error');
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

    // استخراج التعليقات التلقائية المتعددة إذا تم تفعيلها
    const collectedComments = collectAllComments();
    const isFcEnabled = enableFirstComment && enableFirstComment.checked && collectedComments.length > 0;

    // إذا كانت هناك صور مرفقة بالتعليقات، يلزم توفر بيانات Cloudinary
    const hasCommentImages = collectedComments.some(c => c.file);
    if (hasCommentImages) {
        const cConfig = userConfig.cloudinary;
        if (!cConfig || !cConfig.cloudName || !cConfig.apiKey || !cConfig.apiSecret) {
            showAlert('⚠️ لإرفاق صور داخل التعليقات، يرجى إدخال بيانات حساب Cloudinary السحابي المجاني الخاص بك أولاً في نافذة الإعدادات.', 'error');
            openSettingsModal();
            return;
        }
    }

    // استخراج بيانات الصفحة المحددة حالياً
    const targetAccount = currentAccounts.find(a => a.id === selectedPageId);

    // تجهيز البيانات
    const formData = new FormData();
    formData.append('content', content);
    formData.append('platforms', JSON.stringify(selectedPlatforms));
    formData.append('facebookPlacements', JSON.stringify(fbPlacements));
    formData.append('instagramPlacements', JSON.stringify(igPlacements));
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
    if (currentAuthUser) {
        formData.append('userId', currentAuthUser.id);
    }
    formData.append('isScheduled', isScheduled);
    formData.append('isCustomCaptions', isCustom);
    formData.append('customCaptions', JSON.stringify(customCaptions));
    formData.append('aspectRatio', selectedRatio);
    if (isFcEnabled) {
        const commentsJson = collectedComments.map(c => ({ text: c.text }));
        formData.append('comments', JSON.stringify(commentsJson));
        if (collectedComments[0]?.text) {
            formData.append('firstComment', collectedComments[0].text);
        }
        collectedComments.forEach(c => {
            if (c.file) {
                formData.append(`comment_image_${c.index}`, c.file, c.file.name);
            }
        });
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
                            const fbParts = [];
                            if (result.results.facebook.feed?.success) fbParts.push('منشور في الصفحة 📝');
                            if (result.results.facebook.story?.success) fbParts.push('ستوري (Story) 📸');
                            details.push(`📘 <strong>فيسبوك:</strong> تم النشر بنجاح (${fbParts.join(' + ') || 'تمت العملية'})!`);
                        } else {
                            alertType = 'error';
                            details.push(`📘 <strong>فيسبوك:</strong> خطأ: ${result.results.facebook.error}`);
                        }
                    }
                    if (result.results.instagram) {
                        if (result.results.instagram.success) {
                            const igParts = [];
                            if (result.results.instagram.feed?.success) igParts.push('منشور في الحساب 📝');
                            if (result.results.instagram.story?.success) igParts.push('ستوري (Story) 📸');
                            details.push(`📸 <strong>انستجرام:</strong> تم النشر بنجاح (${igParts.join(' + ') || 'تمت العملية'})!`);
                        } else {
                            details.push(`📸 <strong>انستجرام:</strong> ${result.results.instagram.message || result.results.instagram.error}`);
                        }
                    }

                    // تنبيهات التعليقات التلقائية
                    if (result.results.facebook?.comments && Array.isArray(result.results.facebook.comments)) {
                        const fbCount = result.results.facebook.comments.length;
                        const fbSuccess = result.results.facebook.comments.filter(c => c.success).length;
                        if (fbSuccess === fbCount) {
                            details.push(`💬 <strong>فيسبوك (التعليقات التلقائية):</strong> تم نشر ${fbCount} تعليق بنجاح بالتتابع مع الصور المرفقة!`);
                        } else {
                            details.push(`⚠️ <strong>فيسبوك (التعليقات التلقائية):</strong> تم نشر ${fbSuccess} من أصل ${fbCount} تعليق.`);
                        }
                    } else if (result.results.facebook?.firstComment) {
                        if (result.results.facebook.firstComment.success) {
                            details.push(`💬 <strong>فيسبوك (التعليق الأول):</strong> تم إضافة التعليق بنجاح!`);
                        } else {
                            details.push(`⚠️ <strong>فيسبوك (التعليق الأول):</strong> ${result.results.facebook.firstComment.error}`);
                        }
                    }

                    if (result.results.instagram?.comments && Array.isArray(result.results.instagram.comments)) {
                        const igCount = result.results.instagram.comments.length;
                        const igSuccess = result.results.instagram.comments.filter(c => c.success).length;
                        if (igSuccess === igCount) {
                            details.push(`💬 <strong>انستجرام (التعليقات التلقائية):</strong> تم نشر ${igCount} تعليق بنجاح بالتتابع!`);
                        } else {
                            details.push(`⚠️ <strong>انستجرام (التعليقات التلقائية):</strong> تم نشر ${igSuccess} من أصل ${igCount} تعليق.`);
                        }
                    } else if (result.results.instagram?.firstComment) {
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

            // تصفير النموذج والتعليقات
            postContent.value = '';
            charCounter.textContent = '0 حرف';
            if (commentsRepeaterList) {
                commentsRepeaterList.innerHTML = '';
                commentsRepeaterList.appendChild(createCommentCard(0));
            }
            if (enableFirstComment) {
                enableFirstComment.checked = false;
                enableFirstComment.dispatchEvent(new Event('change'));
            }
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
    if (!currentAuthUser) {
        cachedScheduledPosts = [];
        if (scheduledList) {
            scheduledList.innerHTML = `
                <div class="empty-scheduled">
                    <p>يرجى تسجيل الدخول لعرض منشوراتك وجدولتها.</p>
                </div>
            `;
        }
        if (scheduledCount) scheduledCount.textContent = '0 منشورات';
        if (plannerBadgeCount) plannerBadgeCount.textContent = '0';
        renderPlannerView();
        return;
    }

    try {
        const userIdParam = currentAuthUser ? `&userId=${encodeURIComponent(currentAuthUser.id)}` : '';
        const response = await fetch(`/api/scheduled?all=true${userIdParam}`);
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

                    const platformsBadges = (post.platforms || []).map(p => {
                        let placementText = '';
                        if (p === 'facebook') {
                            const hasFeed = (post.facebookPlacements || []).includes('feed');
                            const hasStory = (post.facebookPlacements || []).includes('story');
                            placementText = (hasFeed && hasStory) ? ' (بوست + ستوري)' : (hasStory ? ' (ستوري 📸)' : '');
                            return `<span class="platform-mini-badge facebook">📘 فيسبوك${placementText}</span>`;
                        }
                        if (p === 'instagram') {
                            const hasFeed = (post.instagramPlacements || []).includes('feed');
                            const hasStory = (post.instagramPlacements || []).includes('story');
                            placementText = (hasFeed && hasStory) ? ' (بوست + ستوري)' : (hasStory ? ' (ستوري 📸)' : '');
                            return `<span class="platform-mini-badge instagram">📸 انستجرام${placementText}</span>`;
                        }
                        return `<span class="platform-mini-badge">${p}</span>`;
                    }).join(' ');

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

// 1. دالة التبديل بين التبويبات الأربعة
function switchTab(tabName) {
    if (tabBtnComposer) tabBtnComposer.classList.remove('active');
    if (tabBtnPlanner) tabBtnPlanner.classList.remove('active');
    if (tabBtnAutoReply) tabBtnAutoReply.classList.remove('active');
    if (tabBtnTelegramGroups) tabBtnTelegramGroups.classList.remove('active');

    if (composerSection) composerSection.style.display = 'none';
    if (plannerSection) plannerSection.style.display = 'none';
    if (autoReplySection) autoReplySection.style.display = 'none';
    if (telegramGroupsSection) telegramGroupsSection.style.display = 'none';

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
    } else if (tabName === 'telegram-groups') {
        if (tabBtnTelegramGroups) tabBtnTelegramGroups.classList.add('active');
        if (telegramGroupsSection) {
            telegramGroupsSection.style.display = 'block';
            telegramGroupsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        loadTelegramConfigUI();
        loadTargetGroupsUI();
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
if (tabBtnTelegramGroups) tabBtnTelegramGroups.addEventListener('click', () => switchTab('telegram-groups'));
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

// أزرار فلترة الحالة في المخطط (الكل، مجدول، منشورة)
document.querySelectorAll('.status-filter-btn[data-status]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.status-filter-btn[data-status]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        plannerStatusFilter = e.currentTarget.dataset.status;
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

            // البحث عن منشورات تطابق هذا اليوم والساعة (سواء مجدولة أو تم نشرها)
            const matchingPosts = cachedScheduledPosts.filter(post => {
                const targetTime = post.scheduledTime || post.publishedAt || post.createdAt;
                if (!targetTime) return false;
                const postDate = new Date(targetTime);
                const isMatchingTime = isSameDay(postDate, day) && postDate.getHours() === hour;
                if (!isMatchingTime) return false;

                if (plannerPlatformFilter !== 'all' && !(post.platforms || []).includes(plannerPlatformFilter)) {
                    return false;
                }
                if (plannerStatusFilter !== 'all' && post.status !== plannerStatusFilter) {
                    return false;
                }
                return true;
            });

            if (matchingPosts.length > 0) {
                // الخانة تحتوي على منشورات
                slotCell.classList.add('has-posts');

                matchingPosts.forEach(post => {
                    const targetTime = post.scheduledTime || post.publishedAt || post.createdAt;
                    const postDate = new Date(targetTime);
                    const minutesStr = String(postDate.getMinutes()).padStart(2, '0');
                    const timeTag = `${formatHour12(hour).replace(':00', `:${minutesStr}`)}`;

                    const isFb = (post.platforms || []).includes('facebook');
                    const isIg = (post.platforms || []).includes('instagram');
                    const platformsHtml = `${isFb ? '📘' : ''} ${isIg ? '📸' : ''}`;
                    const isPublished = post.status === 'PUBLISHED';

                    const chip = document.createElement('div');
                    chip.className = `planner-post-chip ${isPublished ? 'status-published' : ''}`;
                    chip.title = isPublished ? 'منشور تم نشره — اضغط للمعاينة والتعديل' : 'منشور مجدول بالسحابة — اضغط للمعاينة';

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
                    const statusTag = isPublished ? '<span style="font-size:10px;color:#3fb950;font-weight:bold;">✅ منشور</span>' : '<span style="font-size:10px;color:var(--accent);">⏳ مجدول</span>';

                    chip.innerHTML = `
                        <div class="chip-top">
                            <span class="chip-platforms">${platformsHtml} ${statusTag}</span>
                            <span class="chip-time-badge">${timeTag}</span>
                        </div>
                        <div class="chip-content">
                            ${thumbHtml}
                            <p class="chip-text">${snippet}</p>
                        </div>
                        <div class="chip-actions">
                            <button type="button" class="btn-chip-action btn-chip-view" title="معاينة كاملة">👁️</button>
                            <button type="button" class="btn-chip-action btn-chip-edit" title="تعديل المنشور">✏️</button>
                            <button type="button" class="btn-chip-action delete btn-chip-del" title="حذف المنشور">🗑️</button>
                        </div>
                    `;

                    // عند الضغط على الكارت تفتح المعاينة
                    chip.addEventListener('click', (e) => {
                        if (e.target.closest('.btn-chip-edit') || e.target.closest('.btn-chip-del')) return;
                        openPostPreviewModal(post);
                    });

                    // زر التعديل السريع
                    const editBtn = chip.querySelector('.btn-chip-edit');
                    if (editBtn) {
                        editBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            openEditPostModal(post);
                        });
                    }

                    // زر الحذف
                    const delBtn = chip.querySelector('.btn-chip-del');
                    if (delBtn) {
                        delBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            handleDeletePost(post);
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

// 6. نافذة تفاصيل ومعاينة المنشور (Post Preview Modal)
function openPostPreviewModal(post) {
    if (!postPreviewModal || !previewModalBody) return;
    activePreviewPostId = post.id;

    const targetTime = post.scheduledTime || post.publishedAt || post.createdAt;
    const postDate = new Date(targetTime);
    const dateFormatted = formatArabicSlot(postDate);
    const isPublished = post.status === 'PUBLISHED';

    if (previewModalTitle) {
        previewModalTitle.textContent = isPublished ? 'معاينة منشور تم نشره' : 'معاينة منشور مجدول بالسحابة';
    }
    if (previewModalSubtitle) {
        previewModalSubtitle.textContent = `توقيت النشر: ${dateFormatted} (${isPublished ? '✅ تم النشر' : '⏳ قيد الانتظار'})`;
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
    if (Array.isArray(post.comments) && post.comments.length > 0) {
        firstCommentHtml = `
            <div class="preview-first-comment-box" style="margin-top:14px;background:rgba(88,166,255,0.06);border:1px solid rgba(88,166,255,0.2);border-radius:8px;padding:12px;">
                <strong style="color:var(--accent);display:block;margin-bottom:8px;">💬 التعليقات التلقائية المتتابعة (${post.comments.length}):</strong>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${post.comments.map((c, i) => `
                        <div style="background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);font-size:13px;">
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                                <span style="color:#58a6ff;font-weight:700;font-size:12px;">تعليق #${i + 1}</span>
                                ${c.imageUrl ? '<span style="font-size:11px;color:#3fb950;">📸 صورة مرفقة (فيسبوك)</span>' : ''}
                            </div>
                            ${c.text ? `<p style="margin:0;color:var(--text-primary);line-height:1.4;">${c.text}</p>` : ''}
                            ${c.imageUrl ? `<div style="margin-top:6px;"><img src="${c.imageUrl}" style="max-height:90px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (post.firstComment) {
        firstCommentHtml = `
            <div class="preview-first-comment-box" style="margin-top:14px;background:rgba(88,166,255,0.06);border:1px solid rgba(88,166,255,0.2);border-radius:8px;padding:12px;">
                <strong style="color:var(--accent);display:block;margin-bottom:4px;">💬 التعليق الأول التلقائي:</strong>
                <p style="margin:0;color:var(--text-primary);font-size:13px;line-height:1.4;">${post.firstComment}</p>
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

    if (btnEditFromPreviewModal) {
        btnEditFromPreviewModal.onclick = () => {
            closePostPreviewModal();
            openEditPostModal(post);
        };
    }

    if (btnDeleteFromPreviewModal) {
        btnDeleteFromPreviewModal.onclick = () => {
            handleDeletePost(post);
        };
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

// دالة حذف المنشور (مجدول أو منشور مع خيار الحذف من ميتا)
async function handleDeletePost(post) {
    if (!post) return;
    const isPub = post.status === 'PUBLISHED';
    let deleteFromMeta = false;

    if (isPub) {
        const confirmMsg = 'هذا المنشور تم نشره بالفعل على المنصات!\n\nهل تريد حذفه من فيسبوك وانستجرام أيضاً؟\n- اضغط (OK / موافق) لحذفه نهائياً من فيسبوك وإنستجرام ومن المخطط.\n- اضغط (Cancel / إلغاء) لحذفه من جدول المواعيد فقط.';
        deleteFromMeta = confirm(confirmMsg);
    } else {
        if (!confirm('هل أنت متأكد من إلغاء هذا المنشور المجدول؟')) return;
    }

    try {
        const url = `/api/scheduled/${post.id}${deleteFromMeta ? '?deleteFromMeta=true' : ''}`;
        const res = await fetch(url, { method: 'DELETE' });
        const data = await res.json();
        showAlert(data.message || 'تم حذف المنشور بنجاح.', 'success');
        closePostPreviewModal();
        loadScheduledPosts();
    } catch (e) {
        showAlert('حدث خطأ أثناء محاولة حذف المنشور.', 'error');
    }
}

// دالة فتح نافذة تعديل المنشور
function openEditPostModal(post) {
    if (!post || !editPostModal) return;
    if (editPostId) editPostId.value = post.id;
    if (editPostContent) editPostContent.value = post.content || '';

    const isPub = post.status === 'PUBLISHED';
    if (editScheduleTimeGroup) {
        editScheduleTimeGroup.style.display = isPub ? 'none' : 'block';
    }
    if (editPublishedNote) {
        editPublishedNote.style.display = isPub ? 'block' : 'none';
    }
    if (editScheduledTime && !isPub && post.scheduledTime) {
        try {
            const d = new Date(post.scheduledTime);
            editScheduledTime.value = formatLocalDateTime(d);
        } catch {}
    }

    editPostModal.style.display = 'flex';
}

function closeEditPostModal() {
    if (editPostModal) editPostModal.style.display = 'none';
}

if (btnCloseEditModal) btnCloseEditModal.addEventListener('click', closeEditPostModal);
if (btnCancelEditModal) btnCancelEditModal.addEventListener('click', closeEditPostModal);
if (editPostModal) {
    editPostModal.addEventListener('click', (e) => {
        if (e.target === editPostModal) closeEditPostModal();
    });
}

// حفظ تعديل المنشور
if (btnSaveEditedPost) {
    btnSaveEditedPost.addEventListener('click', async () => {
        const id = editPostId ? editPostId.value : null;
        if (!id) return;
        const newContent = editPostContent ? editPostContent.value.trim() : '';
        const newTime = editScheduledTime ? editScheduledTime.value : null;

        btnSaveEditedPost.disabled = true;
        const originalText = btnSaveEditedPost.textContent;
        btnSaveEditedPost.textContent = 'جاري الحفظ...';

        try {
            const res = await fetch(`/api/scheduled/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newContent,
                    scheduledTime: newTime ? new Date(newTime).toISOString() : undefined
                })
            });
            const data = await res.json();
            if (data.success) {
                showAlert(data.message || 'تم حفظ التعديلات بنجاح!', 'success');
                closeEditPostModal();
                loadScheduledPosts();
            } else {
                showAlert(data.message || 'تعذر تعديل المنشور.', 'error');
            }
        } catch (e) {
            showAlert('فشل الاتصال بالخادم لحفظ التعديلات.', 'error');
        } finally {
            btnSaveEditedPost.disabled = false;
            btnSaveEditedPost.textContent = originalText;
        }
    });
}

// زر مزامنة منشورات الصفحة من فيسبوك
if (btnSyncPagePosts) {
    btnSyncPagePosts.addEventListener('click', async () => {
        const selectedPageId = pageSelector ? pageSelector.value : '';
        if (!selectedPageId) {
            showAlert('يرجى اختيار الصفحة أولاً من القائمة العلوية لمزامنة منشوراتها.', 'error');
            return;
        }

        btnSyncPagePosts.classList.add('loading');
        btnSyncPagePosts.disabled = true;
        const origContent = btnSyncPagePosts.innerHTML;
        btnSyncPagePosts.innerHTML = '<span class="sync-icon">🔄</span><span>جاري مزامنة المنشورات من فيسبوك...</span>';

        try {
            const res = await fetch('/api/posts/sync-page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageId: selectedPageId })
            });
            const data = await res.json();
            if (data.success) {
                showAlert(`✨ تمت المزامنة بنجاح! تم استيراد ${data.addedCount} منشور وإضافتها لجدول المواعيد.`, 'success');
                loadScheduledPosts();
            } else {
                showAlert(data.message || 'تعذر مزامنة منشورات الصفحة.', 'error');
            }
        } catch (e) {
            showAlert('حدث خطأ أثناء الاتصال بميتا لمزامنة المنشورات.', 'error');
        } finally {
            btnSyncPagePosts.classList.remove('loading');
            btnSyncPagePosts.disabled = false;
            btnSyncPagePosts.innerHTML = origContent;
        }
    });
}

// دليل المقاسات التفاعلي
if (btnToggleSizesGuide && imageSizesGuideCard) {
    btnToggleSizesGuide.addEventListener('click', () => {
        const isHidden = imageSizesGuideCard.style.display === 'none' || !imageSizesGuideCard.style.display;
        imageSizesGuideCard.style.display = isHidden ? 'block' : 'none';
        if (isHidden) imageSizesGuideCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}
if (btnCloseSizesGuide && imageSizesGuideCard) {
    btnCloseSizesGuide.addEventListener('click', () => {
        imageSizesGuideCard.style.display = 'none';
    });
}


// ========================================================
// 7. إدارة الإعدادات وحسابات المستخدم (SaaS BYOK Workspace)
// ========================================================

async function loadUserSettings() {
    if (!currentAuthUser) {
        userConfig = { pages: [], selectedPageIds: [], metaToken: '', cloudinary: {} };
        return;
    }

    const userKey = 'socialflow_user_' + currentAuthUser.id;
    // مسح المفتاح المشترك القديم تماماً لمنع أي تداخل بين الحسابات
    localStorage.removeItem('socialflow_user_config');

    userConfig = { pages: [], selectedPageIds: [], metaToken: '', cloudinary: {} };
    try {
        const saved = localStorage.getItem(userKey);
        if (saved) {
            userConfig = JSON.parse(saved);
        }
    } catch (e) {
        userConfig = { pages: [], selectedPageIds: [], metaToken: '', cloudinary: {} };
    }

    // مزامنة البيانات الحية من سحابة Supabase الخاصة بهذا المستخدم تحديداً
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('user_profiles')
                .select('*')
                .eq('id', currentAuthUser.id)
                .maybeSingle();

            if (data) {
                userConfig.metaToken = data.meta_access_token || '';
                userConfig.pages = Array.isArray(data.selected_pages) ? data.selected_pages : [];
                userConfig.selectedPageIds = userConfig.pages.map(p => p.id);
                userConfig.groqApiKey = data.groq_api_key || '';
                userConfig.autoReplyConfig = data.auto_reply_config || null;
                // جلب بيانات Cloudinary الخاصة بهذا المستخدم من auto_reply_config
                userConfig.cloudinary = data.auto_reply_config?.cloudinary || { cloudName: '', apiKey: '', apiSecret: '' };
                localStorage.setItem(userKey, JSON.stringify(userConfig));
            } else if (!error) {
                // مستخدم جديد نظيف بدون أي صفحات أو مفاتيح سابقة
                userConfig = { pages: [], selectedPageIds: [], metaToken: '', cloudinary: { cloudName: '', apiKey: '', apiSecret: '' } };
                localStorage.setItem(userKey, JSON.stringify(userConfig));
            }
        } catch (err) {
            console.warn('تعذر تحميل إعدادات المستخدم من Supabase:', err);
        }
    }
}

async function openSettingsModal() {
    await loadUserSettings();

    // تعبئة الحقول الخاصة بهذا المستخدم فقط
    inputMetaToken.value = userConfig.metaToken || '';
    if (userConfig.cloudinary) {
        inputCloudName.value = userConfig.cloudinary.cloudName || '';
        inputCloudApiKey.value = userConfig.cloudinary.apiKey || '';
        inputCloudApiSecret.value = userConfig.cloudinary.apiSecret || '';
    }

    metaStatusMsg.style.display = 'none';
    cloudStatusMsg.style.display = 'none';

    // إذا كانت هناك صفحات محفوظة لهذا المستخدم، نعرضها في القائمة
    if (userConfig.pages && userConfig.pages.length > 0) {
        tempDiscoveredPages = [...userConfig.pages];
        renderPagesChecklist(tempDiscoveredPages, userConfig.selectedPageIds || []);
        discoveredPagesContainer.style.display = 'block';
    } else {
        tempDiscoveredPages = [];
        pagesChecklist.innerHTML = '';
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
            body: JSON.stringify({ 
                metaToken: token,
                userId: currentAuthUser ? currentAuthUser.id : null
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            tempDiscoveredPages = data.pages;
            if (tempDiscoveredPages.length === 0) {
                showMetaStatus('الرمز صحيح ولكن لم يتم العثور على أي صفحات فيسبوك تابعة له.', 'error');
                discoveredPagesContainer.style.display = 'none';
            } else {
                showMetaStatus(`🎉 تم التحقق بنجاح! تم العثور على ${tempDiscoveredPages.length} صفحة. حدد الصفحات التي تريد تفعيلها للخدمة يدوياً ثم اضغط حفظ.`, 'success');
                // لا يتم تحديد الصفحات تلقائياً، بل يختار المستخدم بنفسه الصفحات المطلوبة (عدم إضافة الصفحات تلقائياً)
                const currentSelected = (userConfig.selectedPageIds && userConfig.selectedPageIds.length > 0) 
                    ? userConfig.selectedPageIds 
                    : [];
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

// عرض قائمة الصفحات لاختيار المطلوب منها مع منع تكرار الصفحات المحجوزة
function renderPagesChecklist(pages, selectedIds) {
    pagesChecklist.innerHTML = '';

    // إلغاء أي تكرار مكرر لنفس الصفحة
    const seen = new Set();
    const uniquePages = [];
    (pages || []).forEach(p => {
        if (p && p.id && !seen.has(p.id)) {
            seen.add(p.id);
            uniquePages.push(p);
        }
    });

    uniquePages.forEach(p => {
        const card = document.createElement('label');
        const isClaimed = !!p.alreadyClaimed;
        card.className = 'page-check-card' + (isClaimed ? ' page-claimed-disabled' : '');

        const isChecked = !isClaimed && selectedIds.includes(p.id) ? 'checked' : '';
        const disabledAttr = isClaimed ? 'disabled' : '';
        const igInfo = p.instagram ? `<span class="page-check-ig">📸 @${p.instagram.username}</span>` : '<span style="font-size:11px; color:var(--text-secondary);">غير مربوط بانستجرام</span>';
        const avatarHtml = p.picture ? `<img src="${p.picture}" class="page-check-avatar" alt="">` : `<div class="page-check-avatar">📄</div>`;

        const claimedNotice = isClaimed ? `
            <div style="font-size: 11px; color: #ef4444; margin-top: 4px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <span>🔒</span>
                <span>مربوطة بالفعل بحساب آخر (${escapeHtml(p.claimedBy || 'مستخدم آخر')}) — ممنوع التكرار</span>
            </div>
        ` : '';

        card.innerHTML = `
            <input type="checkbox" value="${p.id}" ${isChecked} ${disabledAttr} class="chk-page-item">
            ${avatarHtml}
            <div class="page-check-details">
                <span class="page-check-title">${escapeHtml(p.name)}</span>
                ${igInfo}
                ${claimedNotice}
            </div>
        `;
        pagesChecklist.appendChild(card);
    });
}

// تحديد أو إلغاء تحديد الكل (مع استثناء الصفحات المحجوزة لحساب آخر)
btnToggleAllPages.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.chk-page-item:not([disabled])');
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

// حفظ وتطبيق الإعدادات مع منع تكرار الصفحات
btnSaveSettings.addEventListener('click', async () => {
    const selectedIds = Array.from(document.querySelectorAll('.chk-page-item:checked:not([disabled])')).map(c => c.value);
    
    // استبعاد أي صفحات محجوزة لحساب آخر وتفادي أي تكرار لنفس الصفحة
    const seen = new Set();
    const activePages = [];
    tempDiscoveredPages.forEach(p => {
        if (selectedIds.includes(p.id) && !p.alreadyClaimed && !seen.has(p.id)) {
            seen.add(p.id);
            activePages.push(p);
        }
    });

    userConfig.metaToken = inputMetaToken.value.trim();
    userConfig.selectedPageIds = activePages.map(p => p.id);
    userConfig.pages = activePages;
    userConfig.cloudinary = {
        cloudName: inputCloudName.value.trim(),
        apiKey: inputCloudApiKey.value.trim(),
        apiSecret: inputCloudApiSecret.value.trim()
    };

    if (currentAuthUser && supabaseClient) {
        btnSaveSettings.disabled = true;
        btnSaveSettings.textContent = 'جاري الحفظ في حسابك...';
        try {
            // حفظ بيانات Cloudinary داخل auto_reply_config الخاصة بهذا المستخدم
            let currentAutoReply = userConfig.autoReplyConfig || {};
            if (typeof currentAutoReply !== 'object') currentAutoReply = {};
            const updatedAutoReply = {
                ...currentAutoReply,
                cloudinary: userConfig.cloudinary
            };
            userConfig.autoReplyConfig = updatedAutoReply;

            await supabaseClient.from('user_profiles').update({
                meta_access_token: userConfig.metaToken,
                selected_pages: activePages,
                auto_reply_config: updatedAutoReply,
                updated_at: new Date().toISOString()
            }).eq('id', currentAuthUser.id);
        } catch (e) {
            console.error('Failed to save to Supabase:', e);
        } finally {
            btnSaveSettings.disabled = false;
            btnSaveSettings.textContent = '💾 حفظ وتطبيق الإعدادات';
        }
        localStorage.setItem('socialflow_user_' + currentAuthUser.id, JSON.stringify(userConfig));
    }

    closeSettingsModal();
    populateActiveAccounts();
    showAlert('🎉 تم حفظ صفحات وإعدادات حسابك بنجاح!', 'success');
});

// زر حذف وفصل الصفحات يدوياً من الحساب الحالي
const btnClearAllPages = document.getElementById('btnClearAllPages');
if (btnClearAllPages) {
    btnClearAllPages.addEventListener('click', async () => {
        if (!confirm('هل أنت متأكد من رغبتك في حذف وفصل كافة الصفحات المربوطة بهذا الجيميل؟ لن تتأثر أي حسابات أخرى.')) {
            return;
        }
        tempDiscoveredPages = [];
        pagesChecklist.innerHTML = '';
        discoveredPagesContainer.style.display = 'none';
        inputMetaToken.value = '';
        userConfig.pages = [];
        userConfig.selectedPageIds = [];
        userConfig.metaToken = '';

        if (currentAuthUser && supabaseClient) {
            try {
                await supabaseClient.from('user_profiles').update({
                    meta_access_token: null,
                    selected_pages: [],
                    updated_at: new Date().toISOString()
                }).eq('id', currentAuthUser.id);
            } catch (e) {
                console.error('Error clearing pages in Supabase:', e);
            }
            localStorage.setItem('socialflow_user_' + currentAuthUser.id, JSON.stringify(userConfig));
        }

        populateActiveAccounts();
        showAlert('🗑️ تم حذف وفصل جميع الصفحات والمفاتيح من حسابك بنجاح!', 'success');
    });
}

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

// إعدادات حارس تنشيط Supabase (Keep-Alive Cron UI)
const btnCopyKeepAliveUrl = document.getElementById('btnCopyKeepAliveUrl');
const keepAliveUrl = document.getElementById('keepAliveUrl');
const btnTestKeepAlive = document.getElementById('btnTestKeepAlive');
const keepAliveStatusText = document.getElementById('keepAliveStatusText');

if (btnCopyKeepAliveUrl && keepAliveUrl) {
    setupCopyButton(btnCopyKeepAliveUrl, keepAliveUrl);
}

if (btnTestKeepAlive) {
    btnTestKeepAlive.addEventListener('click', async () => {
        btnTestKeepAlive.disabled = true;
        btnTestKeepAlive.textContent = '⏳ جاري تنشيط Supabase...';
        if (keepAliveStatusText) keepAliveStatusText.style.display = 'none';

        try {
            const res = await fetch('/api/cron/keep-alive');
            const data = await res.json();
            if (data.success) {
                if (keepAliveStatusText) {
                    keepAliveStatusText.style.display = 'inline-block';
                    keepAliveStatusText.innerHTML = `✅ <strong>قاعدة البيانات نشطة ومستيقظة!</strong> (زمن الاستجابة: <span style="color: #38bdf8;">${data.latency || 'سريع'}</span> | الحسابات: ${data.userCount || 0})`;
                }
            } else {
                if (keepAliveStatusText) {
                    keepAliveStatusText.style.display = 'inline-block';
                    keepAliveStatusText.innerHTML = `⚠️ <span style="color: #ef4444;">${data.error || data.message || 'تعذر التنشيط'}</span>`;
                }
            }
        } catch (err) {
            if (keepAliveStatusText) {
                keepAliveStatusText.style.display = 'inline-block';
                keepAliveStatusText.innerHTML = `❌ <span style="color: #ef4444;">تعذر الاتصال بالخادم: ${err.message}</span>`;
            }
        } finally {
            btnTestKeepAlive.disabled = false;
            btnTestKeepAlive.textContent = '⚡ اختبار تنشيط Supabase فوراً';
        }
    });
}

// ملء قائمة الاختيار بالصفحات المفعلة لهذا الحساب فقط مع ضمان عدم تكرار أي صفحة
function populateActiveAccounts() {
    let activePages = [];

    if (userConfig.pages && userConfig.pages.length > 0) {
        const allowedIds = userConfig.selectedPageIds || [];
        activePages = userConfig.pages.filter(p => allowedIds.includes(p.id));
        if (activePages.length === 0 && allowedIds.length === 0) {
            activePages = userConfig.pages;
        }
    }

    // تنظيف وضمان عدم تكرار أي صفحة مطلقاً
    const seen = new Set();
    const uniquePages = [];
    activePages.forEach(p => {
        if (p && p.id && !seen.has(p.id)) {
            seen.add(p.id);
            uniquePages.push(p);
        }
    });
    activePages = uniquePages;

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
            if (currentSelected && Array.from(arTargetPageSelector.options).some(o => o.value === currentSelected)) {
                arTargetPageSelector.value = currentSelected;
            } else if (currentAccounts.length > 0) {
                arTargetPageSelector.value = currentAccounts[0].id;
            }
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
        renderEmptyAccountsState();
    }

    function renderEmptyAccountsState() {
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

pageSelector.addEventListener('change', () => {
    updateMockupHeader();
    if (arTargetPageSelector && pageSelector.value) {
        arTargetPageSelector.value = pageSelector.value;
        loadAutoReplyConfigUI(pageSelector.value);
    }
});

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
// 2. مكرر أرقام الهواتف والواتساب (Phones Repeater) ودالة تحويل روابط الواتساب التلقائية
// ----------------------------------------------------
function formatWhatsAppLink(input) {
    if (!input || typeof input !== 'string') return '';
    let clean = input.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.includes('wa.me/')) return 'https://' + clean.replace(/^https?:\/\//, '');
    let digits = clean.replace(/[^0-9]/g, '');
    if (!digits) return clean;
    if (digits.startsWith('01') && digits.length === 11) {
        digits = '20' + digits.substring(1);
    }
    return `https://wa.me/${digits}`;
}

function renderPhonesList(phones = []) {
    if (!phonesListContainer) return;
    phonesListContainer.innerHTML = '';

    const currentCall = arCallPhoneInput ? arCallPhoneInput.value.trim() : '';
    const currentWa = arWhatsappPhoneInput ? arWhatsappPhoneInput.value.trim() : '';
    const currentWaLink = formatWhatsAppLink(currentWa);

    const extraPhones = (Array.isArray(phones) ? phones : []).filter(p => {
        const str = String(p).trim();
        return str && str !== currentCall && str !== currentWa && str !== currentWaLink;
    });

    extraPhones.forEach(p => addPhoneRow(p));
}

function addPhoneRow(phone = '') {
    if (!phonesListContainer) return;

    const row = document.createElement('div');
    row.className = 'phone-repeater-row';
    row.innerHTML = `
        <input type="text" class="settings-input phone-number-input" placeholder="رقم هاتف إضافي (مثال: 01012345678)" value="${escapeHtml(phone || '')}">
        <button type="button" class="btn-del-repeater" title="حذف الرقم">✕</button>
    `;

    const btnDel = row.querySelector('.btn-del-repeater');
    btnDel.addEventListener('click', () => {
        row.remove();
    });

    phonesListContainer.appendChild(row);
}

function collectPhonesData() {
    const result = [];
    const callVal = arCallPhoneInput ? arCallPhoneInput.value.trim() : '';
    const waVal = arWhatsappPhoneInput ? arWhatsappPhoneInput.value.trim() : '';
    const waLink = formatWhatsAppLink(waVal);

    if (callVal) result.push(callVal);
    if (waLink && !result.includes(waLink)) result.push(waLink);

    if (phonesListContainer) {
        const inputs = phonesListContainer.querySelectorAll('.phone-number-input');
        inputs.forEach(inp => {
            const val = inp.value.trim();
            if (val && !result.includes(val)) result.push(val);
        });
    }
    return result;
}

// ----------------------------------------------------
// ----------------------------------------------------
// 3. مكرر روابط منصات السوشيال ميديا (Social Links Repeater)
// ----------------------------------------------------
function cleanSocialUrl(url = '') {
    if (!url) return '';
    let cleaned = String(url).trim();
    // إزالة أي سلاشات زائدة في البداية مثل /https://...
    cleaned = cleaned.replace(/^\/+/, '');
    return cleaned;
}

function detectPlatformFromUrl(url = '') {
    const u = String(url).toLowerCase();
    if (u.includes('facebook.com') || u.includes('fb.com') || u.includes('fb.watch')) return 'فيسبوك';
    if (u.includes('instagram.com') || u.includes('instagr.am')) return 'انستجرام';
    if (u.includes('linkedin.com')) return 'لينكد إن';
    if (u.includes('x.com') || u.includes('twitter.com')) return 'منصة إكس';
    if (u.includes('tiktok.com')) return 'تيك توك';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'يوتيوب';
    if (u.includes('wa.me') || u.includes('whatsapp.com')) return 'واتساب';
    return null;
}

function normalizePlatform(platform = '', url = '') {
    const fromUrl = detectPlatformFromUrl(url);
    if (fromUrl) return fromUrl;
    const p = String(platform).trim().toLowerCase();
    if (p.includes('facebook') || p.includes('فيسبوك') || p.includes('fb')) return 'فيسبوك';
    if (p.includes('instagram') || p.includes('انستجرام') || p.includes('انستا')) return 'انستجرام';
    if (p.includes('linkedin') || p.includes('لينكد')) return 'لينكد إن';
    if (p.includes('twitter') || p.includes('تويتر') || p.includes('إكس') || p === 'x') return 'منصة إكس';
    if (p.includes('tiktok') || p.includes('تيك')) return 'تيك توك';
    if (p.includes('youtube') || p.includes('يوتيوب')) return 'يوتيوب';
    if (p.includes('whatsapp') || p.includes('واتساب') || p.includes('واتس')) return 'واتساب';
    if (p.includes('site') || p.includes('موقع') || p.includes('web')) return 'موقع إلكتروني';
    return 'فيسبوك';
}

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

    const cleanedUrl = cleanSocialUrl(item.url || '');
    const activePlatform = normalizePlatform(item.platform, cleanedUrl);

    const row = document.createElement('div');
    row.className = 'social-repeater-row';
    row.innerHTML = `
        <select class="settings-select social-select">
            <option value="فيسبوك" ${activePlatform === 'فيسبوك' ? 'selected' : ''}>📘 فيسبوك</option>
            <option value="انستجرام" ${activePlatform === 'انستجرام' ? 'selected' : ''}>📸 انستجرام</option>
            <option value="واتساب" ${activePlatform === 'واتساب' ? 'selected' : ''}>💬 واتساب</option>
            <option value="تيك توك" ${activePlatform === 'تيك توك' ? 'selected' : ''}>🎵 تيك توك</option>
            <option value="يوتيوب" ${activePlatform === 'يوتيوب' ? 'selected' : ''}>▶️ يوتيوب</option>
            <option value="لينكد إن" ${activePlatform === 'لينكد إن' ? 'selected' : ''}>💼 لينكد إن</option>
            <option value="منصة إكس" ${activePlatform === 'منصة إكس' ? 'selected' : ''}>✖️ منصة X</option>
            <option value="موقع إلكتروني" ${activePlatform === 'موقع إلكتروني' ? 'selected' : ''}>🌐 موقع إلكتروني</option>
            <option value="أخرى" ${activePlatform === 'أخرى' ? 'selected' : ''}>🔗 أخرى</option>
        </select>
        <input type="url" class="settings-input social-url-input" placeholder="https://..." value="${escapeHtml(cleanedUrl)}">
        <button type="button" class="btn-del-repeater" title="حذف الرابط">✕</button>
    `;

    const selectEl = row.querySelector('.social-select');
    const inputEl = row.querySelector('.social-url-input');

    // كشف تلقائي فوري للمنصة عند كتابة أو لصق الرابط + إزالة أي سلاش زائد في البداية
    inputEl.addEventListener('input', () => {
        const cleaned = cleanSocialUrl(inputEl.value);
        if (cleaned !== inputEl.value) {
            inputEl.value = cleaned;
        }
        const detected = detectPlatformFromUrl(cleaned);
        if (detected && selectEl) {
            selectEl.value = detected;
        }
    });

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
        const url = cleanSocialUrl(r.querySelector('.social-url-input')?.value || '');
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

    const crawlApiKey = arGroqApiKey ? arGroqApiKey.value.trim() : (userConfig.groqApiKey || '');
    if (!crawlApiKey) {
        showScrapeStatus('⚠️ يرجى إدخال مفتاح Groq API الخاص بك أولاً في الحقل أدناه لبدء فحص وتحليل الموقع.', 'error');
        if (arGroqApiKey) arGroqApiKey.focus();
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
            const tokensMsg = data.tokensUsed ? ` (${data.tokensUsed} توكن • استهلاك آمن تحت 8,000 Max Tokens)` : '';
            updateCrawlerProgress(stage.pct, `اكتمل التحليل العميق لـ: ${stage.label}${tokensMsg}`);

            // 3. إذا لم تكن هذه آخر مرحلة، نبدأ عداد الانتظار 60 ثانية لتصفير كوتا Groq وضمان عدم تجاوز الحد
            if (i < stages.length - 1) {
                const nextStage = stages[i + 1];
                setCrawlerPillState(nextStage.pill, 'waiting');
                await runCrawlerCountdown(60, `تم التحليل الاستقصائي لـ ${stage.label}. ننتظر دقيقة كاملة (60 ثانية) لتصفير كوتا Groq وضمان عدم تجاوز 8,000 Max Tokens قبل بدء ${nextStage.label}...`);
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
        if (arProjectName && data.projectName) {
            arProjectName.value = data.projectName;
        }
        if (arNiche && (data.niche || data.overview)) {
            let fullNiche = data.niche || '';
            if (data.overview && !fullNiche.includes(data.overview)) {
                fullNiche = fullNiche ? `${fullNiche} | ${data.overview}` : data.overview;
            }
            if (data.slogan && !fullNiche.includes(data.slogan)) {
                fullNiche = `[${data.slogan}] - ${fullNiche}`;
            }
            arNiche.value = fullNiche;
        }
    } else if (pageType === 'services') {
        if (Array.isArray(data.services) && data.services.length > 0) {
            renderServicesList(data.services);
        }
    } else if (pageType === 'about') {
        // تعميق هوية الشركة بإضافة قصة التأسيس ونقاط القوة المكتشفة
        if (arNiche && (data.companyStory || data.strengths)) {
            let extra = '';
            if (data.companyStory && !arNiche.value.includes(data.companyStory)) {
                extra += ` [نبذة وخبرات: ${data.companyStory}]`;
            }
            if (Array.isArray(data.strengths) && data.strengths.length > 0) {
                const strJoined = data.strengths.slice(0, 3).join('، ');
                if (!arNiche.value.includes(strJoined)) {
                    extra += ` [مميزاتنا: ${strJoined}]`;
                }
            }
            if (extra) {
                arNiche.value = (arNiche.value + extra).substring(0, 1000);
            }
        }
    } else if (pageType === 'contact') {
        if (arCallPhoneInput && data.callPhone && !arCallPhoneInput.value) {
            arCallPhoneInput.value = data.callPhone;
        }
        if (arWhatsappPhoneInput && data.whatsapp && !arWhatsappPhoneInput.value) {
            arWhatsappPhoneInput.value = data.whatsapp;
        }
    }

    // دمج أرقام الهواتف والواتساب المكتشفة في محتوى أو فوتر أي صفحة تلقائياً
    if (Array.isArray(data.phones) && data.phones.length > 0) {
        if (arCallPhoneInput && !arCallPhoneInput.value && data.phones[0]) {
            arCallPhoneInput.value = data.phones[0];
        }
        if (arWhatsappPhoneInput && !arWhatsappPhoneInput.value) {
            const waCandidate = data.phones.find(p => String(p).includes('wa.me') || String(p).startsWith('01'));
            if (waCandidate) arWhatsappPhoneInput.value = waCandidate;
        }

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
        const existingUrls = new Set(collectSocialData().map(s => cleanSocialUrl(s.url)));
        data.socialLinks.forEach(item => {
            const rawUrl = item?.url || (typeof item === 'string' ? item : '');
            const cleaned = cleanSocialUrl(rawUrl);
            if (cleaned && !existingUrls.has(cleaned)) {
                addSocialRow({ platform: item.platform || 'فيسبوك', url: cleaned });
                existingUrls.add(cleaned);
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
    const groqApiKey = arGroqApiKey ? arGroqApiKey.value.trim() : (userConfig.groqApiKey || '');
    if (!groqApiKey) {
        showSaveConfigStatus('⚠️ يرجى إدخال مفتاح Groq API الخاص بك أولاً في الحقل أدناه لتوليد البرومبت.', 'error');
        if (arGroqApiKey) arGroqApiKey.focus();
        return;
    }

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
    const targetPageId = pageId !== undefined ? pageId : (arTargetPageSelector ? arTargetPageSelector.value : '');

    let config = null;
    const userAutoReply = (userConfig && userConfig.autoReplyConfig) ? userConfig.autoReplyConfig : {};

    // 1. أولاً: إذا تم اختيار صفحة محددة، نفحص إعدادات تلك الصفحة فقط دون وراثة أي بيانات
    if (targetPageId) {
        if (userAutoReply.pages && userAutoReply.pages[targetPageId]) {
            config = userAutoReply.pages[targetPageId];
        }
        // محاولة جلبها من السيرفر وسحابة Supabase لهذه الصفحة حصراً
        if (!config) {
            try {
                const uId = currentAuthUser ? currentAuthUser.id : '';
                const url = `/api/autoreply/config?pageId=${encodeURIComponent(targetPageId)}&userId=${encodeURIComponent(uId)}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.success && data.config && data.config.pageId === targetPageId && (data.config.projectName || data.config.niche || (data.config.services && data.config.services.length))) {
                    config = data.config;
                }
            } catch (e) {
                console.error('Error loading config from server for page:', e);
            }
        }
    } else {
        // 2. ثانياً: الإعدادات العامة (Global) فقط وفقط إذا اختار المستخدم خيار "الإعدادات العامة الافتراضية" صراحة
        if (userAutoReply.global && (userAutoReply.global.projectName || userAutoReply.global.niche || (userAutoReply.global.services && userAutoReply.global.services.length))) {
            config = userAutoReply.global;
        } else {
            try {
                const uId = currentAuthUser ? currentAuthUser.id : '';
                const url = `/api/autoreply/config?userId=${encodeURIComponent(uId)}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.success && data.config && !data.config.pageId) {
                    config = data.config;
                }
            } catch (e) {
                console.error('Error loading global config from server:', e);
            }
        }
    }

    // 5. نموذج نظيف وخاص بالمستخدم الجديد إذا لم تكن هناك أي إعدادات سابقة نهائياً
    if (!config) {
        config = {
            enabled: true,
            pageId: targetPageId || '',
            projectName: '',
            niche: '',
            services: [],
            phones: [],
            email: currentAuthUser ? currentAuthUser.email : '',
            socialLinks: [],
            customPrompt: '',
            targetAllPosts: true,
            targetPostIds: [],
            groqApiKey: userConfig.groqApiKey || '',
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
    if (arGroqApiKey) arGroqApiKey.value = config.groqApiKey || userConfig.groqApiKey || '';

    // تعبئة خانتي الاتصال والواتساب المخصصتين
    if (arCallPhoneInput) {
        arCallPhoneInput.value = config.callPhone || '';
        if (!arCallPhoneInput.value && Array.isArray(config.phones)) {
            const foundCall = config.phones.find(p => !String(p).includes('wa.me') && !String(p).toLowerCase().includes('whatsapp'));
            if (foundCall) arCallPhoneInput.value = foundCall;
        }
    }

    if (arWhatsappPhoneInput) {
        arWhatsappPhoneInput.value = config.whatsapp || config.whatsappPhone || '';
        if (!arWhatsappPhoneInput.value && Array.isArray(config.phones)) {
            const foundWa = config.phones.find(p => String(p).includes('wa.me') || String(p).toLowerCase().includes('whatsapp'));
            if (foundWa) arWhatsappPhoneInput.value = foundWa;
        }
        if (waAutoConvertHint) {
            const val = arWhatsappPhoneInput.value.trim();
            if (val) {
                const converted = formatWhatsAppLink(val);
                waAutoConvertHint.innerHTML = `✨ سيُرسل للعميل كرابط مباشر: <strong style="color: #38bdf8; direction: ltr; display: inline-block;">${escapeHtml(converted)}</strong>`;
            } else {
                waAutoConvertHint.innerHTML = '⚡ اكتب الرقم عادي وسيتحول تلقائياً لرابط مباشر (https://wa.me/20...) يفتح محادثة بنقرة واحدة';
            }
        }
    }

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

    const callPhone = arCallPhoneInput ? arCallPhoneInput.value.trim() : '';
    const rawWa = arWhatsappPhoneInput ? arWhatsappPhoneInput.value.trim() : '';
    const whatsapp = formatWhatsAppLink(rawWa);

    const config = {
        enabled: autoReplyMasterToggle ? autoReplyMasterToggle.checked : true,
        pageId: targetPageId,
        userId: currentAuthUser ? currentAuthUser.id : null,
        projectName: arProjectName ? arProjectName.value.trim() : '',
        niche: arNiche ? arNiche.value.trim() : '',
        services: collectServicesData(),
        callPhone: callPhone,
        whatsapp: whatsapp,
        phones: collectPhonesData(),
        email: arEmailInput ? arEmailInput.value.trim() : '',
        socialLinks: collectSocialData(),
        customPrompt: arCustomSystemPrompt ? arCustomSystemPrompt.value.trim() : '',
        targetAllPosts: isTargetAll,
        targetPostIds: Array.from(currentSelectedTargetPostIds),
        groqApiKey: arGroqApiKey ? arGroqApiKey.value.trim() : (userConfig.groqApiKey || ''),
        likeComment: checkLikeComment ? checkLikeComment.checked : true,
        replyComment: checkReplyComment ? checkReplyComment.checked : true,
        sendDm: checkSendDm ? checkSendDm.checked : true
    };

    if (btnSaveAutoReplyConfig) {
        btnSaveAutoReplyConfig.disabled = true;
        btnSaveAutoReplyConfig.innerHTML = '<span>⏳ جاري الحفظ والتثبيت...</span>';
    }

    try {
        const res = await fetch('/api/autoreply/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const data = await res.json();
        if (data.success) {
            // حفظ إعدادات الرد التلقائي في حساب المستخدم في Supabase و localStorage
            let userAutoReply = userConfig.autoReplyConfig || {};
            if (typeof userAutoReply !== 'object' || !userAutoReply) userAutoReply = {};

            if (targetPageId) {
                if (!userAutoReply.pages) userAutoReply.pages = {};
                userAutoReply.pages[targetPageId] = config;
            } else {
                userAutoReply.global = config;
            }

            // عزل تام لكل صفحة: لا يتم تعديل أو دمج بيانات الصفحة المحددة في global حتى لا ترث الصفحات الأخرى بياناتها نهائياً

            // الحفاظ على بيانات Cloudinary داخل auto_reply_config
            if (userConfig.cloudinary && userConfig.cloudinary.cloudName) {
                userAutoReply.cloudinary = userConfig.cloudinary;
            }
            userConfig.autoReplyConfig = userAutoReply;
            userConfig.groqApiKey = config.groqApiKey || userConfig.groqApiKey || '';

            if (currentAuthUser && supabaseClient) {
                try {
                    const { error: dbErr } = await supabaseClient.from('user_profiles').update({
                        auto_reply_config: userAutoReply,
                        groq_api_key: userConfig.groqApiKey,
                        updated_at: new Date().toISOString()
                    }).eq('id', currentAuthUser.id);
                    if (dbErr) console.warn('Supabase client update warning:', dbErr.message);
                } catch (e) {
                    console.warn('Supabase update exception:', e);
                }
                localStorage.setItem('socialflow_user_' + currentAuthUser.id, JSON.stringify(userConfig));
            }

            showSaveConfigStatus('✓ تم حفظ وتثبيت قاعدة المعرفة والإعدادات والبرومبت بنجاح لهذا المشروع!', 'success');
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
        groqApiKey: arGroqApiKey ? arGroqApiKey.value.trim() : (userConfig.groqApiKey || ''),
        likeComment: checkLikeComment ? checkLikeComment.checked : true,
        replyComment: checkReplyComment ? checkReplyComment.checked : true,
        sendDm: checkSendDm ? checkSendDm.checked : true
    };

    if (!currentConfig.groqApiKey) {
        alert('⚠️ يرجى إدخال مفتاح Groq API الخاص بك أولاً في الحقل المخصص لتجربة المحاكاة.');
        if (arGroqApiKey) arGroqApiKey.focus();
        return;
    }

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

if (arWhatsappPhoneInput && waAutoConvertHint) {
    arWhatsappPhoneInput.addEventListener('input', () => {
        const val = arWhatsappPhoneInput.value.trim();
        if (!val) {
            waAutoConvertHint.innerHTML = '⚡ اكتب الرقم عادي وسيتحول تلقائياً لرابط مباشر (https://wa.me/20...) يفتح محادثة بنقرة واحدة';
        } else {
            const converted = formatWhatsAppLink(val);
            waAutoConvertHint.innerHTML = `✨ سيُرسل للعميل كرابط مباشر: <strong style="color: #38bdf8; direction: ltr; display: inline-block;">${escapeHtml(converted)}</strong>`;
        }
    });
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

// نافذة شرح مفتاح Groq والتحقق من الصلاحية
if (btnOpenGroqHelpModal && groqHelpModal) {
    btnOpenGroqHelpModal.addEventListener('click', () => {
        groqHelpModal.style.display = 'flex';
    });
}

if (btnCloseGroqHelpModal && groqHelpModal) {
    btnCloseGroqHelpModal.addEventListener('click', () => {
        groqHelpModal.style.display = 'none';
    });
}

if (btnCloseGroqHelpModalBtn && groqHelpModal) {
    btnCloseGroqHelpModalBtn.addEventListener('click', () => {
        groqHelpModal.style.display = 'none';
    });
}

if (btnToggleGroqVisibility && arGroqApiKey) {
    btnToggleGroqVisibility.addEventListener('click', () => {
        if (arGroqApiKey.type === 'password') {
            arGroqApiKey.type = 'text';
            btnToggleGroqVisibility.textContent = '🔒';
        } else {
            arGroqApiKey.type = 'password';
            btnToggleGroqVisibility.textContent = '👁️';
        }
    });
}

if (btnVerifyGroqKey && arGroqApiKey) {
    btnVerifyGroqKey.addEventListener('click', async () => {
        const key = arGroqApiKey.value.trim();
        if (!key) {
            if (groqKeyStatusMsg) {
                groqKeyStatusMsg.innerHTML = '<span style="color: #ef4444;">⚠️ يرجى لصق المفتاح أولاً للتحقق منه</span>';
            }
            return;
        }

        btnVerifyGroqKey.disabled = true;
        btnVerifyGroqKey.textContent = '⏳ جاري الفحص...';
        if (groqKeyStatusMsg) groqKeyStatusMsg.textContent = '';

        try {
            const res = await fetch('/api/autoreply/verify-groq-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: key })
            });
            const data = await res.json();
            if (data.success) {
                if (groqKeyStatusMsg) {
                    groqKeyStatusMsg.innerHTML = '<span style="color: #10b981; font-weight: bold;">✓ مفتاح Groq صالح ويعمل بنجاح! 🟢</span>';
                }
            } else {
                if (groqKeyStatusMsg) {
                    groqKeyStatusMsg.innerHTML = `<span style="color: #ef4444;">❌ ${escapeHtml(data.message || 'المفتاح غير صالح')}</span>`;
                }
            }
        } catch (e) {
            if (groqKeyStatusMsg) {
                groqKeyStatusMsg.innerHTML = `<span style="color: #ef4444;">❌ فشل الاتصال: ${escapeHtml(e.message)}</span>`;
            }
        } finally {
            btnVerifyGroqKey.disabled = false;
            btnVerifyGroqKey.textContent = '⚡ تحقق';
        }
    });
}

// التهيئة المبدئية لحالة فارغة حتى اكتمال تسجيل الدخول
populateActiveAccounts();

// إدارة تفعيل وإظهار خيارات النشر (بوست / ستوري) للمنصات
['facebook', 'instagram'].forEach(plat => {
    const chipInput = document.getElementById(`plat-${plat}`);
    const row = document.getElementById(`placements-${plat}`);
    if (chipInput && row) {
        chipInput.addEventListener('change', () => {
            row.style.display = chipInput.checked ? 'flex' : 'none';
        });
    }

    const prefix = plat === 'facebook' ? 'fb' : 'ig';
    const feedOpt = document.getElementById(`${prefix}-opt-feed`);
    const storyOpt = document.getElementById(`${prefix}-opt-story`);
    
    // ضمان بقاء خيار واحد على الأقل محدد (بوست أو ستوري) عند تحديد المنصة
    [feedOpt, storyOpt].forEach(opt => {
        if (!opt) return;
        opt.addEventListener('change', () => {
            if (!feedOpt.checked && !storyOpt.checked) {
                opt.checked = true;
            }
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// إدارة تسجيل الدخول والخروج وبوابة الحماية مع Supabase (Google Auth Gate)
// ═══════════════════════════════════════════════════════════════
async function initSupabaseAuth() {
    const authGateScreen = document.getElementById('authGateScreen');
    const appDashboard = document.getElementById('appDashboard');
    const gateLoadingIndicator = document.getElementById('gateLoadingIndicator');
    const gateActionArea = document.getElementById('gateActionArea');
    const btnGateGoogleLogin = document.getElementById('btnGateGoogleLogin');

    const loadingState = document.getElementById('authLoadingState');
    const loggedOutState = document.getElementById('loggedOutState');
    const loggedInState = document.getElementById('loggedInState');
    const userAvatarImg = document.getElementById('userAvatarImg');
    const userDisplayName = document.getElementById('userDisplayName');
    const userEmailText = document.getElementById('userEmailText');
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    const btnLogout = document.getElementById('btnLogout');

    async function triggerGoogleLogin(btn) {
        if (!supabaseClient) {
            alert('خدمة المصادقة قيد التحميل، يرجى المحاولة بعد قليل.');
            return;
        }
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="auth-spinner"></span> جاري التحويل إلى Google...';
        }
        try {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (err) {
            alert('فشل تسجيل الدخول عبر Google: ' + err.message);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg class="google-icon" viewBox="0 0 24 24" width="22" height="22">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>تسجيل الدخول باستخدام Google (Gmail)</span>
                `;
            }
        }
    }

    if (btnGateGoogleLogin) {
        btnGateGoogleLogin.addEventListener('click', () => triggerGoogleLogin(btnGateGoogleLogin));
    }

    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', () => triggerGoogleLogin(btnGoogleLogin));
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (!supabaseClient) return;
            if (confirm('هل ترغب بتسجيل الخروج من حسابك؟')) {
                // مسح كل التخزين المؤقت والمحلي لمنع أي تداخل بين الحسابات
                localStorage.clear();
                sessionStorage.clear();
                await supabaseClient.auth.signOut();
                window.location.reload();
            }
        });
    }

    if (!supabaseClient) {
        if (loadingState) loadingState.style.display = 'none';
        if (loggedOutState) loggedOutState.style.display = 'flex';
        if (gateLoadingIndicator) gateLoadingIndicator.style.display = 'none';
        if (gateActionArea) gateActionArea.style.display = 'block';
        return;
    }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        await renderUserState(session?.user);

        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            await renderUserState(session?.user);
        });
    } catch (e) {
        console.error('Auth error:', e);
        await renderUserState(null);
    }

    async function renderUserState(user) {
        if (loadingState) loadingState.style.display = 'none';

        if (user) {
            currentAuthUser = user;

            // إزالة أي مفتاح عام قديم كان مشتركاً بين الحسابات
            localStorage.removeItem('socialflow_user_config');

            // إخفاء شاشة تسجيل الدخول وإظهار لوحة التحكم بالكامل للمستخدم المسجل
            if (authGateScreen) authGateScreen.style.display = 'none';
            if (appDashboard) appDashboard.style.display = 'block';

            if (loggedOutState) loggedOutState.style.display = 'none';
            if (loggedInState) loggedInState.style.display = 'flex';

            const meta = user.user_metadata || {};
            const name = meta.full_name || meta.name || user.email.split('@')[0];
            const avatar = meta.avatar_url || meta.picture || 'logo.png';

            if (userDisplayName) userDisplayName.textContent = name;
            if (userEmailText) userEmailText.textContent = user.email;
            if (userAvatarImg) userAvatarImg.src = avatar;

            // جلب بيانات وصفحات وإعدادات هذا الجيميل حصرياً من سحابة Supabase
            await loadUserSettings();
            populateActiveAccounts();
            const pageToLoad = (arTargetPageSelector && arTargetPageSelector.value) ? arTargetPageSelector.value : (currentAccounts.length > 0 ? currentAccounts[0].id : '');
            if (arTargetPageSelector && pageToLoad) arTargetPageSelector.value = pageToLoad;
            await loadAutoReplyConfigUI(pageToLoad);
            await loadScheduledPosts();
            await loadTelegramConfigUI();
            await loadTargetGroupsUI();
        } else {
            currentAuthUser = null;
            userConfig = { pages: [], selectedPageIds: [], metaToken: '', cloudinary: {} };
            currentAccounts = [];
            cachedScheduledPosts = [];

            // تفريغ القوائم والواجهة بالكامل
            populateActiveAccounts();

            // إخفاء لوحة التحكم وقفل المنصة خلف شاشة تسجيل الدخول
            if (appDashboard) appDashboard.style.display = 'none';
            if (authGateScreen) authGateScreen.style.display = 'flex';
            if (gateLoadingIndicator) gateLoadingIndicator.style.display = 'none';
            if (gateActionArea) gateActionArea.style.display = 'block';

            if (loggedInState) loggedInState.style.display = 'none';
            if (loggedOutState) loggedOutState.style.display = 'flex';
        }
    }
}

// تشغيل نظام المصادقة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabaseAuth);
} else {
    initSupabaseAuth();
}

// ========================================================
// نظام بوت التيليجرام وصياد الجروبات بالـ AI (Telegram Bot & Groups Hunter)
// ========================================================

// عناصر التحكم الرئيسية
const tgBotEnabled = document.getElementById('tgBotEnabled');
const tgEnabledStatusText = document.getElementById('tgEnabledStatusText');
const tgBotToken = document.getElementById('tgBotToken');
const btnToggleTgToken = document.getElementById('btnToggleTgToken');
const tgChatId = document.getElementById('tgChatId');
const btnTestTelegram = document.getElementById('btnTestTelegram');
const btnSaveTelegramConfig = document.getElementById('btnSaveTelegramConfig');
const tgStatusFeedback = document.getElementById('tgStatusFeedback');
const tgLiveStatusIndicator = document.getElementById('tgLiveStatusIndicator');
const tgStatusText = document.getElementById('tgStatusText');

const tgNicheInput = document.getElementById('tgNicheInput');
const btnAiDiscoverGroups = document.getElementById('btnAiDiscoverGroups');
const keywordsCloudContainer = document.getElementById('keywordsCloudContainer');
const candidateGroupsGrid = document.getElementById('candidateGroupsGrid');
const btnAdoptCandidates = document.getElementById('btnAdoptCandidates');
const aiHooksContainer = document.getElementById('aiHooksContainer');

const groupsTableBody = document.getElementById('groupsTableBody');
const targetPoolCountBadge = document.getElementById('targetPoolCountBadge');
const btnAddGroupRow = document.getElementById('btnAddGroupRow');
const btnSaveGroupsPool = document.getElementById('btnSaveGroupsPool');
const groupsStatusFeedback = document.getElementById('groupsStatusFeedback');

// ذاكرة الجروبات المقترحة مؤقتاً
let latestAiCandidates = [];

// 1. تبديل إظهار / إخفاء توكن التيليجرام
if (btnToggleTgToken && tgBotToken) {
    btnToggleTgToken.addEventListener('click', () => {
        if (tgBotToken.type === 'password') {
            tgBotToken.type = 'text';
            btnToggleTgToken.textContent = '🔒';
        } else {
            tgBotToken.type = 'password';
            btnToggleTgToken.textContent = '👁️';
        }
    });
}

// 2. تحديث نص السويتش
if (tgBotEnabled && tgEnabledStatusText) {
    tgBotEnabled.addEventListener('change', () => {
        tgEnabledStatusText.textContent = tgBotEnabled.checked ? 'مفعّل' : 'معطّل';
    });
}

// 3. جلب إعدادات التيليجرام من الخادم
async function loadTelegramConfigUI() {
    try {
        const userId = currentAuthUser ? currentAuthUser.id : '';
        const res = await fetch(`/api/telegram/config?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();

        if (data.success && data.telegram) {
            const cfg = data.telegram;
            if (tgBotToken) tgBotToken.value = cfg.botToken || '';
            if (tgChatId) tgChatId.value = cfg.chatId || '';
            if (tgBotEnabled) {
                tgBotEnabled.checked = cfg.enabled !== false;
                if (tgEnabledStatusText) tgEnabledStatusText.textContent = tgBotEnabled.checked ? 'مفعّل' : 'معطّل';
            }

            updateTgStatusIndicator(Boolean(cfg.botToken && cfg.chatId && cfg.enabled !== false));
        }
    } catch (err) {
        console.warn('Error loading telegram config:', err);
    }
}

function updateTgStatusIndicator(isActive) {
    if (!tgLiveStatusIndicator || !tgStatusText) return;
    if (isActive) {
        tgLiveStatusIndicator.className = 'tg-status-indicator active';
        tgStatusText.textContent = 'البوت نشط وجاهز للإشعارات ✅';
    } else {
        tgLiveStatusIndicator.className = 'tg-status-indicator';
        tgStatusText.textContent = 'البوت غير مفعل أو بحاجة للتهيئة ⚠️';
    }
}

// 4. حفظ إعدادات التيليجرام
async function saveTelegramConfigUI() {
    if (!btnSaveTelegramConfig) return;
    const origText = btnSaveTelegramConfig.innerHTML;
    try {
        btnSaveTelegramConfig.disabled = true;
        btnSaveTelegramConfig.innerHTML = '<span>⏳ جاري الحفظ...</span>';

        const userId = currentAuthUser ? currentAuthUser.id : '';
        const botToken = tgBotToken ? tgBotToken.value.trim() : '';
        const chatId = tgChatId ? tgChatId.value.trim() : '';
        const enabled = tgBotEnabled ? tgBotEnabled.checked : true;

        const res = await fetch('/api/telegram/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, botToken, chatId, enabled })
        });

        const data = await res.json();
        if (data.success) {
            showTgFeedback(tgStatusFeedback, 'تم حفظ إعدادات بوت التيليجرام في السحابة بنجاح! 🎉', 'success');
            updateTgStatusIndicator(Boolean(botToken && chatId && enabled));
        } else {
            showTgFeedback(tgStatusFeedback, data.message || 'حدث خطأ أثناء حفظ إعدادات التيليجرام.', 'error');
        }
    } catch (err) {
        showTgFeedback(tgStatusFeedback, 'تعذر الاتصال بالخادم لحفظ الإعدادات: ' + err.message, 'error');
    } finally {
        btnSaveTelegramConfig.disabled = false;
        btnSaveTelegramConfig.innerHTML = origText;
    }
}

if (btnSaveTelegramConfig) {
    btnSaveTelegramConfig.addEventListener('click', saveTelegramConfigUI);
}

// 5. اختبار اتصال بوت التيليجرام الفوري
async function testTelegramUI() {
    if (!btnTestTelegram) return;
    const botToken = tgBotToken ? tgBotToken.value.trim() : '';
    const chatId = tgChatId ? tgChatId.value.trim() : '';

    if (!botToken || !chatId) {
        showTgFeedback(tgStatusFeedback, 'يرجى إدخال توكن البوت ومعرف المحادثة (Chat ID) أولاً قبل الاختبار.', 'error');
        return;
    }

    const origText = btnTestTelegram.innerHTML;
    try {
        btnTestTelegram.disabled = true;
        btnTestTelegram.innerHTML = '<span>⏳ جاري إرسال الرسالة التجريبية...</span>';

        const res = await fetch('/api/telegram/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botToken, chatId })
        });

        const data = await res.json();
        if (data.success) {
            showTgFeedback(tgStatusFeedback, data.message || 'تم إرسال الرسالة التجريبية بنجاح! تفقد تطبيق تيليجرام على هاتفك الآن 🚀', 'success');
            updateTgStatusIndicator(true);
        } else {
            showTgFeedback(tgStatusFeedback, data.message || 'فشل إرسال الرسالة التجريبية.', 'error');
        }
    } catch (err) {
        showTgFeedback(tgStatusFeedback, 'خطأ أثناء الاتصال بالتيليجرام: ' + err.message, 'error');
    } finally {
        btnTestTelegram.disabled = false;
        btnTestTelegram.innerHTML = origText;
    }
}

if (btnTestTelegram) {
    btnTestTelegram.addEventListener('click', testTelegramUI);
}

function showTgFeedback(el, message, type = 'success') {
    if (!el) return;
    el.textContent = message;
    el.className = `tg-status-feedback ${type}`;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 6000);
}

// 6. صياد الكلمات والجروبات بالذكاء الاصطناعي (AI Group Hunter)
async function aiDiscoverGroupsUI() {
    if (!btnAiDiscoverGroups) return;
    const origText = btnAiDiscoverGroups.innerHTML;

    try {
        btnAiDiscoverGroups.disabled = true;
        btnAiDiscoverGroups.innerHTML = '<span class="ai-spark-icon">⏳</span><span>جاري التحليل واستخراج الجروبات...</span>';

        const niche = tgNicheInput ? tgNicheInput.value.trim() : '';
        const groqApiKey = (arGroqApiKey && arGroqApiKey.value.trim()) ? arGroqApiKey.value.trim() : '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';
        const pageName = (currentAccounts && currentAccounts.length > 0) ? currentAccounts[0].name : 'رسلان للتسويق';

        const res = await fetch('/api/groups/ai-discover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ niche, groqApiKey, pageName })
        });

        const result = await res.json();
        if (!result.success || !result.data) {
            alert(result.message || 'تعذر صيد الجروبات بالذكاء الاصطناعي. تأكد من إدخال مفتاح Groq API Key.');
            return;
        }

        const data = result.data;

        // عرض الكلمات المفتاحية
        if (keywordsCloudContainer && Array.isArray(data.keywords)) {
            keywordsCloudContainer.innerHTML = '';
            data.keywords.forEach(k => {
                const a = document.createElement('a');
                a.className = 'keyword-tag-btn';
                a.href = k.searchUrl || `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(k.keyword)}`;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.title = 'افتح صفحة البحث في فيسبوك لهذا الجمهور';
                a.innerHTML = `<span>🔍</span><span>${escapeHtml(k.keyword)}</span><span style="font-size: 10px; opacity: 0.7;">↗</span>`;
                keywordsCloudContainer.appendChild(a);
            });
        }

        // عرض الجروبات الـ 6 المقترحة
        latestAiCandidates = Array.isArray(data.candidateGroups) ? data.candidateGroups : [];
        if (candidateGroupsGrid && latestAiCandidates.length > 0) {
            candidateGroupsGrid.innerHTML = '';
            latestAiCandidates.forEach((g, idx) => {
                const card = document.createElement('div');
                card.className = 'candidate-group-card';
                const isBackup = g.isBackup || idx >= 3;
                card.innerHTML = `
                    <div class="candidate-card-top">
                        <span class="candidate-group-name" title="${escapeHtml(g.name || '')}">👥 ${escapeHtml(g.name || 'مجموعة مقترحة')}</span>
                        <span class="candidate-badge-role ${isBackup ? 'backup' : 'primary'}">${isBackup ? 'بديل احتياطي' : 'أساسي'}</span>
                    </div>
                    <div class="candidate-card-bottom">
                        <span>📊 ${escapeHtml(g.members || '+100k عضو')}</span>
                        <a href="https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(g.name || '')}" target="_blank" rel="noopener">بحث وانضمام ↗</a>
                    </div>
                `;
                candidateGroupsGrid.appendChild(card);
            });

            if (btnAdoptCandidates) btnAdoptCandidates.style.display = 'inline-flex';
        }

        // عرض الـ Hooks
        if (aiHooksContainer && Array.isArray(data.hooks)) {
            aiHooksContainer.innerHTML = '';
            data.hooks.forEach((hook, idx) => {
                const item = document.createElement('div');
                item.className = 'hook-card-item';
                item.title = 'اضغط لنسخ هذه الصيغة';
                item.innerHTML = `
                    <span class="hook-card-text">💡 <strong>صيغة ${idx + 1}:</strong> "${escapeHtml(hook)}"</span>
                    <span class="hook-copy-badge">📋 نسخ</span>
                `;
                item.addEventListener('click', () => {
                    navigator.clipboard.writeText(hook).then(() => {
                        const badge = item.querySelector('.hook-copy-badge');
                        if (badge) {
                            badge.textContent = '✅ تم النسخ!';
                            setTimeout(() => { badge.textContent = '📋 نسخ'; }, 2000);
                        }
                    });
                });
                aiHooksContainer.appendChild(item);
            });
        }

    } catch (err) {
        alert('حدث خطأ أثناء الاتصال بالـ AI: ' + err.message);
    } finally {
        btnAiDiscoverGroups.disabled = false;
        btnAiDiscoverGroups.innerHTML = origText;
    }
}

if (btnAiDiscoverGroups) {
    btnAiDiscoverGroups.addEventListener('click', aiDiscoverGroupsUI);
}

// 7. اعتماد المرشحين كحوض نشر مباشر
if (btnAdoptCandidates) {
    btnAdoptCandidates.addEventListener('click', () => {
        if (!latestAiCandidates || latestAiCandidates.length === 0) return;

        const formatted = latestAiCandidates.map((g, idx) => ({
            id: `grp_${Date.now()}_${idx}`,
            name: g.name || `مجموعة مستهدفة ${idx + 1}`,
            url: `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(g.name || '')}`,
            members: g.members || '+100k عضو',
            isBackup: Boolean(g.isBackup || idx >= 3)
        }));

        renderTargetGroupsTable(formatted);
        showTgFeedback(groupsStatusFeedback, 'تم نقل الجروبات الـ 6 المقترحة إلى جدول الحوض النشط! اضغط "حفظ بالسحابة" لتثبيتها.', 'success');
        if (groupsTableBody) groupsTableBody.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

// 8. جلب حوض الجروبات المستهدفة النشطة
async function loadTargetGroupsUI() {
    try {
        const userId = currentAuthUser ? currentAuthUser.id : '';
        const res = await fetch(`/api/groups/target-list?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.groups)) {
            renderTargetGroupsTable(data.groups);
        }
    } catch (err) {
        console.warn('Error loading target groups:', err);
    }
}

function renderTargetGroupsTable(groups = []) {
    if (!groupsTableBody) return;
    groupsTableBody.innerHTML = '';

    const list = Array.isArray(groups) ? groups : [];
    if (targetPoolCountBadge) {
        targetPoolCountBadge.textContent = `${list.length} جروبات في الحوض`;
    }

    if (list.length === 0) {
        groupsTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 24px;">
                    لا توجد مجموعات مضافة حالياً. اضغط "صيد الجروبات بالـ AI" بالأعلى أو "إضافة جروب إضافي"!
                </td>
            </tr>
        `;
        return;
    }

    list.forEach((g, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.groupId = g.id || `grp_${idx + 1}`;
        const isBackup = Boolean(g.isBackup);
        const groupUrl = g.url || `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(g.name || '')}`;

        tr.innerHTML = `
            <td style="color: var(--text-secondary); font-weight: 700;">${idx + 1}</td>
            <td>
                <input type="text" class="group-input-text group-name-field" value="${escapeHtml(g.name || '')}" placeholder="اسم الجروب">
            </td>
            <td>
                <input type="url" class="group-input-text group-url-field" value="${escapeHtml(groupUrl)}" placeholder="رابط الجروب في فيسبوك">
            </td>
            <td>
                <select class="group-role-select">
                    <option value="primary" ${!isBackup ? 'selected' : ''}>🎯 أساسي (نشر رئيسي)</option>
                    <option value="backup" ${isBackup ? 'selected' : ''}>🛡️ احتياطي (بديل تدوير)</option>
                </select>
            </td>
            <td>
                <span class="group-members-badge">${escapeHtml(g.members || '+100k')}</span>
            </td>
            <td>
                <div class="group-actions-cell">
                    <a href="${escapeHtml(groupUrl)}" target="_blank" rel="noopener noreferrer" class="btn-visit-group" title="فتح الجروب في فيسبوك للانضمام">انضمام ↗</a>
                    <button type="button" class="btn-del-group-row" title="حذف الجروب">🗑️</button>
                </div>
            </td>
        `;

        // زر الحذف
        const btnDel = tr.querySelector('.btn-del-group-row');
        if (btnDel) {
            btnDel.addEventListener('click', () => {
                tr.remove();
                reindexGroupsTable();
            });
        }

        // تحديث رابط الانضمام عند تعديل الرابط
        const urlInput = tr.querySelector('.group-url-field');
        const visitLink = tr.querySelector('.btn-visit-group');
        if (urlInput && visitLink) {
            urlInput.addEventListener('input', () => {
                visitLink.href = urlInput.value.trim() || '#';
            });
        }

        groupsTableBody.appendChild(tr);
    });
}

function reindexGroupsTable() {
    if (!groupsTableBody) return;
    const rows = groupsTableBody.querySelectorAll('tr');
    rows.forEach((r, idx) => {
        const firstCol = r.querySelector('td:first-child');
        if (firstCol) firstCol.textContent = idx + 1;
    });
    if (targetPoolCountBadge) {
        targetPoolCountBadge.textContent = `${rows.length} جروبات في الحوض`;
    }
}

// 9. إضافة سطر جروب جديد يدوياً
function addNewGroupRowUI() {
    if (!groupsTableBody) return;
    const emptyRow = groupsTableBody.querySelector('td[colspan="6"]');
    if (emptyRow) groupsTableBody.innerHTML = '';

    const currentCount = groupsTableBody.querySelectorAll('tr').length;
    const newGroup = {
        id: `grp_${Date.now()}`,
        name: `مجموعة فيسبوك جديدة ${currentCount + 1}`,
        url: 'https://www.facebook.com/groups/',
        members: '+100k عضو',
        isBackup: currentCount >= 3
    };

    const currentList = collectGroupsFromTable();
    currentList.push(newGroup);
    renderTargetGroupsTable(currentList);

    const lastRow = groupsTableBody.querySelector('tr:last-child .group-name-field');
    if (lastRow) {
        lastRow.focus();
        lastRow.select();
    }
}

if (btnAddGroupRow) {
    btnAddGroupRow.addEventListener('click', addNewGroupRowUI);
}

function collectGroupsFromTable() {
    if (!groupsTableBody) return [];
    const rows = groupsTableBody.querySelectorAll('tr');
    const list = [];
    rows.forEach((r, idx) => {
        const nameInput = r.querySelector('.group-name-field');
        const urlInput = r.querySelector('.group-url-field');
        const roleSelect = r.querySelector('.group-role-select');
        const membersBadge = r.querySelector('.group-members-badge');

        if (nameInput && urlInput) {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            const isBackup = roleSelect ? roleSelect.value === 'backup' : idx >= 3;
            const members = membersBadge ? membersBadge.textContent.trim() : '+100k عضو';

            if (name || url) {
                list.push({
                    id: r.dataset.groupId || `grp_${idx + 1}`,
                    name: name || `مجموعة ${idx + 1}`,
                    url: url || `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(name || '')}`,
                    members: members,
                    isBackup: isBackup
                });
            }
        }
    });
    return list;
}

// 10. حفظ قائمة الجروبات بالسحابة (Supabase)
async function saveGroupsPoolUI() {
    if (!btnSaveGroupsPool) return;
    const origText = btnSaveGroupsPool.innerHTML;

    try {
        btnSaveGroupsPool.disabled = true;
        btnSaveGroupsPool.innerHTML = '<span>⏳ جاري الحفظ بالسحابة...</span>';

        const groups = collectGroupsFromTable();
        const userId = currentAuthUser ? currentAuthUser.id : '';

        const res = await fetch('/api/groups/target-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, groups })
        });

        const data = await res.json();
        if (data.success) {
            showTgFeedback(groupsStatusFeedback, `تم حفظ ${groups.length} مجموعات بنجاح في السحابة! سيتم تدوير النشر عليها تلقائياً عبر التيليجرام 🎯`, 'success');
        } else {
            showTgFeedback(groupsStatusFeedback, data.message || 'فشل حفظ قائمة المجموعات.', 'error');
        }
    } catch (err) {
        showTgFeedback(groupsStatusFeedback, 'خطأ أثناء الاتصال بالخادم: ' + err.message, 'error');
    } finally {
        btnSaveGroupsPool.disabled = false;
        btnSaveGroupsPool.innerHTML = origText;
    }
}

if (btnSaveGroupsPool) {
    btnSaveGroupsPool.addEventListener('click', saveGroupsPoolUI);
}

function toggleTgTokenVisibility() {
    if (!tgBotToken) return;
    if (tgBotToken.type === 'password') {
        tgBotToken.type = 'text';
        if (btnToggleTgToken) btnToggleTgToken.textContent = '🔒';
    } else {
        tgBotToken.type = 'password';
        if (btnToggleTgToken) btnToggleTgToken.textContent = '👁️';
    }
}

function adoptCandidatesUI() {
    if (!latestAiCandidates || latestAiCandidates.length === 0) return;
    const formatted = latestAiCandidates.map((g, idx) => ({
        id: `grp_${Date.now()}_${idx}`,
        name: g.name || `مجموعة مستهدفة ${idx + 1}`,
        url: `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(g.name || '')}`,
        members: g.members || '+100k عضو',
        isBackup: Boolean(g.isBackup || idx >= 3)
    }));
    renderTargetGroupsTable(formatted);
    showTgFeedback(groupsStatusFeedback, 'تم نقل الجروبات الـ 6 المقترحة إلى جدول الحوض النشط! اضغط "حفظ بالسحابة" لتثبيتها.', 'success');
    if (groupsTableBody) groupsTableBody.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// تصدير كافة دوال التيليجرام والجروبات للـ window عالمياً
window.switchTab = switchTab;
window.testTelegramUI = testTelegramUI;
window.saveTelegramConfigUI = saveTelegramConfigUI;
window.aiDiscoverGroupsUI = aiDiscoverGroupsUI;
window.adoptCandidatesUI = adoptCandidatesUI;
window.addNewGroupRowUI = addNewGroupRowUI;
window.saveGroupsPoolUI = saveGroupsPoolUI;
window.toggleTgTokenVisibility = toggleTgTokenVisibility;




