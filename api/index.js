// نقطة دخول Vercel Serverless Function مع معالجة الأخطاء الذكية
let app;
let loadError = null;

try {
    app = require('../server.js');
} catch (err) {
    loadError = err;
    console.error('CRITICAL: Failed to load server.js in Vercel environment:', err);
}

module.exports = (req, res) => {
    if (loadError) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({
            success: false,
            error: 'Serverless initialization failed',
            message: loadError.message,
            stack: loadError.stack
        });
    }
    return app(req, res);
};
