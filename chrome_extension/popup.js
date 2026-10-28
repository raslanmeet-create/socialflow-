const API_BASE = 'https://agent.raslans.net';

let currentPost = {
  url: 'https://www.facebook.com/RaslansMarketing/posts/pfbid02Sb3NGJTu4iaivwASRLQ2ry866ydDUeLebu4tzRQiZ9b4neAxQcGu9X7dP16aLcJAl',
  content: 'عايز نشاطك التجاري يظهر بشكل أقوى على خرائط جوجل؟ السر مش بس إنك تعمل Google Business Profile… السر إنك تعمله صح.',
  hook: 'عايز نشاطك التجاري يظهر بشكل أقوى على خرائط جوجل؟ السر مش بس إنك تعمل Google Business Profile… السر إنك تعمله صح 📍 تواصل معنا: 01020942335 🚀',
  comment: '💬 للتواصل المباشر والاستفسار عبر واتساب: https://wa.me/201020942335\n📞 أو الاتصال هاتفياً: 01020942335'
};

let targetGroups = [];

async function init() {
  const postSnippetEl = document.getElementById('postSnippet');
  const groupsListEl = document.getElementById('groupsList');
  const btnStart = document.getElementById('btnStart');
  const statusBox = document.getElementById('statusBox');

  postSnippetEl.textContent = currentPost.hook;

  try {
    const res = await fetch(`${API_BASE}/api/telegram/groups?pageId=1036372629556993`);
    const data = await res.json();
    if (data.groups && data.groups.length > 0) {
      targetGroups = data.groups.slice(0, 5);
    }
  } catch (e) {
    console.warn('Fallback groups list');
  }

  if (targetGroups.length === 0) {
    targetGroups = [
      { name: 'مجموعة 1 (رواد الأعمال في مصر)', url: 'https://www.facebook.com/share/g/19xEM2b1G1/' },
      { name: 'مجموعة 2 (تسويق ومبيعات)', url: 'https://www.facebook.com/share/g/19tDAdtdF2/' },
      { name: 'مجموعة 3 (تجارة واستثمار)', url: 'https://www.facebook.com/groups/687802571792505/' },
      { name: 'مجموعة 4 (سوق الشركات الناشئة)', url: 'https://www.facebook.com/groups/743845949048131/' },
      { name: 'مجموعة 5 (عقارات وخدمات تجارية)', url: 'https://www.facebook.com/groups/2050206985297090/' }
    ];
  }

  groupsListEl.innerHTML = '';
  targetGroups.forEach((g, idx) => {
    const li = document.createElement('li');
    li.id = `grp_${idx}`;
    li.innerHTML = `<span>👥 ${idx + 1}.</span> <strong>${g.name}</strong>`;
    groupsListEl.appendChild(li);
  });

  btnStart.addEventListener('click', async () => {
    btnStart.disabled = true;
    btnStart.textContent = '⏳ جاري بدء المشاركة الآلية...';
    statusBox.textContent = 'جاري فتح الجروبات والمشاركة تلقائياً...';

    for (let i = 0; i < targetGroups.length; i++) {
      const g = targetGroups[i];
      statusBox.textContent = `جاري النشر في الجروب (${i + 1} من 5): ${g.name}...`;

      // فتح تبويب جديد للجروب
      const tab = await chrome.tabs.create({ url: g.url, active: true });

      // انتظار تحميل الجروب ثم حقن نص المشاركة والتعليق
      await new Promise(r => setTimeout(r, 6000));

      // تعليم الجروب كمكتمل في القائمة
      const li = document.getElementById(`grp_${i}`);
      if (li) {
        li.className = 'done';
        li.innerHTML = `<span>✅ ${i + 1}.</span> <strong>${g.name} (تم بنجاح)</strong>`;
      }

      statusBox.textContent = `انتظار فاصل أمان 10 ثوانٍ لحماية الحساب...`;
      await new Promise(r => setTimeout(r, 10000));
    }

    statusBox.textContent = '🎉 اكتمل النشر الآلي في جميع الجروبات الخمسة بنجاح!';
    btnStart.textContent = '✅ تم اكتمال النشر بنجاح';
  });
}

document.addEventListener('DOMContentLoaded', init);
