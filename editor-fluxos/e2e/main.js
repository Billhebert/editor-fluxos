const { app } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');

const userData = process.env.FLUXO_E2E_USERDATA || path.join(os.tmpdir(), 'fluxo-e2e-' + Date.now());
fs.mkdirSync(userData, { recursive: true });
app.setPath('userData', userData);
app.setAppPath(path.join(__dirname, '..'));

require(path.join(__dirname, '..', 'dist', 'main.js'));