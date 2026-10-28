const { spawn } = require('child_process');
const path = require('path');

const child = spawn(process.execPath, [path.join(__dirname, 'fb_bot_daemon.js')], {
    cwd: __dirname,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
});

child.unref();
console.log('Bot started silently in background with PID:', child.pid);
process.exit(0);
