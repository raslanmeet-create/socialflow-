const path = require('path');
const os = require('os');
const fs = require('fs');
const readline = require('readline');
const { exec } = require('child_process');

// Core paths
const ACCOUNTS_FILE = path.join(__dirname, 'fb_booster_accounts.json');
const PROFILES_DIR = path.join(__dirname, 'fb_profiles');

// Chrome executable paths on Windows
const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome SxS\\Application\\chrome.exe')
];
const CHROME_PATH = CHROME_PATHS.find(p => fs.existsSync(p)) || CHROME_PATHS[0];

// Ensure profiles directory exists
if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

// Load registered accounts
function loadAccounts() {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// Save accounts
function saveAccounts(accounts) {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

// Helper to ask a terminal question
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans.trim());
    }));
}

// 1. List all accounts
function listAccounts() {
    const accounts = loadAccounts();
    console.log('\n======================================================');
    console.log('📋 Registered Facebook Accounts:');
    console.log('======================================================');
    if (accounts.length === 0) {
        console.log('⚠️ No accounts registered yet. Choose [2] to add your first account.');
    } else {
        accounts.forEach((acc, index) => {
            const status = acc.enabled !== false ? '🟢 Active' : '🔴 Disabled';
            const sessionStatus = acc.sessionStatus ? `[${acc.sessionStatus}]` : '[Unchecked]';
            console.log(`[${index + 1}] Name: ${acc.name} | UID: ${acc.uid || 'Saved'} | Status: ${status} ${sessionStatus}`);
            console.log(`    📁 Profile: ${acc.profileFolder}`);
        });
    }
    console.log('======================================================\n');
}

// 2. Add new account and log in via native Google Chrome
async function addNewAccount() {
    console.log('\n--- ➕ Add New Facebook Account ---');
    const name = await askQuestion('👉 Enter a name for this account (e.g. Account_John_1): ');
    if (!name) {
        console.log('❌ Cancelled: No name entered.');
        return;
    }

    const accounts = loadAccounts();
    const accountId = 'acc_' + Date.now();
    const profileFolder = path.join(PROFILES_DIR, accountId);

    if (!fs.existsSync(profileFolder)) {
        fs.mkdirSync(profileFolder, { recursive: true });
    }

    console.log('\n🚀 Opening native Google Chrome...');
    console.log(`📁 Profile directory: ${profileFolder}`);
    
    // Launch genuine native Google Chrome
    exec(`start "" "${CHROME_PATH}" --user-data-dir="${profileFolder}" "https://www.facebook.com"`);

    console.log('\n======================================================');
    console.log('👉 Google Chrome is now open with Facebook.');
    console.log('👉 Log in to your Facebook account inside the Chrome window.');
    console.log('👉 When you have logged in, come back here and press [ENTER].');
    console.log('======================================================\n');

    await askQuestion('👉 Press [ENTER] after logging in to Facebook: ');

    console.log('\n⏳ Verifying session in the background...');
    const boosterService = require('./booster_service');
    const dummyAcc = { id: accountId, name, profileFolder };
    const checkRes = await boosterService.checkAccountSession(dummyAcc);

    const isSuccess = checkRes.status === 'ACTIVE' || checkRes.status === 'CHECKPOINT';
    const uid = checkRes.message && checkRes.message.includes('UID') ? checkRes.message : '';

    if (isSuccess) {
        console.log(`\n🎉 Success! Facebook login detected!`);
        console.log(`🆔 Status: ${checkRes.status} (${checkRes.message})`);
    } else {
        console.log(`\nℹ️ Session status: ${checkRes.message}`);
    }

    accounts.push({
        id: accountId,
        name: name,
        uid: uid || 'Logged In',
        profileFolder: profileFolder,
        createdAt: new Date().toISOString(),
        enabled: true,
        sessionStatus: isSuccess ? checkRes.status : 'ACTIVE',
        sessionMessage: checkRes.message || 'Saved',
        lastCheckedAt: new Date().toISOString()
    });

    saveAccounts(accounts);
    console.log(`✅ Account "${name}" saved successfully! Ready for auto engagement.\n`);
}

// 3. Open browser for an account
async function openAccountBrowser() {
    const accounts = loadAccounts();
    if (accounts.length === 0) {
        console.log('⚠️ No accounts registered.');
        return;
    }

    listAccounts();
    const indexStr = await askQuestion('👉 Enter account number to open: ');
    const index = parseInt(indexStr, 10) - 1;

    if (isNaN(index) || index < 0 || index >= accounts.length) {
        console.log('❌ Invalid account number.');
        return;
    }

    const acc = accounts[index];
    console.log(`\n🚀 Opening native Chrome for account: "${acc.name}"...`);
    exec(`start "" "${CHROME_PATH}" --user-data-dir="${acc.profileFolder}" "https://www.facebook.com"`);
    console.log('✅ Chrome opened! Feel free to browse Facebook.\n');
}

// 4. Remove account
async function removeAccount() {
    const accounts = loadAccounts();
    if (accounts.length === 0) {
        console.log('⚠️ No accounts to delete.');
        return;
    }

    listAccounts();
    const indexStr = await askQuestion('👉 Enter account number to delete: ');
    const index = parseInt(indexStr, 10) - 1;

    if (isNaN(index) || index < 0 || index >= accounts.length) {
        console.log('❌ Invalid account number.');
        return;
    }

    const acc = accounts[index];
    const confirm = await askQuestion(`⚠️ Are you sure you want to delete "${acc.name}"? (Type 'y' to confirm): `);
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        accounts.splice(index, 1);
        saveAccounts(accounts);
        console.log(`✅ Removed "${acc.name}" from active accounts list.`);

        const delFiles = await askQuestion('Do you also want to delete its profile folder from disk? (y/n): ');
        if (delFiles.toLowerCase() === 'y') {
            try {
                fs.rmSync(acc.profileFolder, { recursive: true, force: true });
                console.log('🗑️ Profile folder deleted successfully.');
            } catch (e) {
                console.log('⚠️ Could not delete profile folder (it may currently be in use).');
            }
        }
    } else {
        console.log('Deletion cancelled.');
    }
}

// 5. Check health of all accounts
async function checkAllAccountsHealthCli() {
    const boosterService = require('./booster_service');
    console.log('\n🩺 Checking session health for all registered accounts...');
    console.log('⏳ Please wait a few seconds...\n');
    const res = await boosterService.checkAllAccountsHealth();
    if (!res || !res.success) {
        console.log('❌ ' + (res?.message || 'Failed to perform health check.'));
        return;
    }
    console.log('\n======================================================');
    console.log('📊 Account Session Health Report:');
    console.log('======================================================');
    res.results.forEach((r, idx) => {
        const icon = r.status === 'ACTIVE' ? '🟢' : (r.status === 'CHECKPOINT' ? '🟡' : '🔴');
        console.log(`[${idx + 1}] ${r.name}: ${icon} ${r.status} (${r.message})`);
    });
    console.log('======================================================\n');
}

// Main interactive CLI menu
async function main() {
    while (true) {
        console.log('\n======================================================');
        console.log('🛡️ Facebook Multi-Account Engagement Manager');
        console.log('======================================================');
        console.log(' [1] 📋 List All Registered Accounts');
        console.log(' [2] ➕ Add New Account & Save Session');
        console.log(' [3] 🌐 Open Chrome for Specific Account');
        console.log(' [4] 🗑️ Delete an Account');
        console.log(' [5] 🩺 Check All Sessions Health (One-Click)');
        console.log(' [0] 🚪 Exit');
        console.log('======================================================');

        const choice = await askQuestion('👉 Select an option: ');

        if (choice === '1') {
            listAccounts();
        } else if (choice === '2') {
            await addNewAccount();
        } else if (choice === '3') {
            await openAccountBrowser();
        } else if (choice === '4') {
            await removeAccount();
        } else if (choice === '5') {
            await checkAllAccountsHealthCli();
        } else if (choice === '0') {
            console.log('👋 Goodbye!');
            process.exit(0);
        } else {
            console.log('❌ Invalid option, please try again.');
        }
    }
}

main().catch(console.error);
