const { loadAccounts, boostOneAccountOnPost, generateGroqComment, cleanPostUrl } = require('../booster_service');

const postUrl = cleanPostUrl('https://www.facebook.com/RaslansMarketing/posts/pfbid0STwobHs7WSNEDJY2wG4MR1QzKGZY8HP8SZ2PFzH6K9TGNMwwevPDz9CLLSfUFVEol');

(async () => {
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.name === 'fares5');
    console.log('Testing boostOneAccountOnPost with:', acc.name);

    const comment = await generateGroqComment('خدمات التسويق الإلكتروني وإعلانات جوجل وتوثيق الحسابات', 6);
    console.log('Generated comment:', comment);

    const res = await boostOneAccountOnPost(acc, postUrl, {
        doLike: true,
        doComment: true,
        doShare: true,
        headless: 'new'
    }, comment);

    console.log('Final Result for fares5:', JSON.stringify(res, null, 2));
})();
