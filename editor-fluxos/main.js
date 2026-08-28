const { app, BrowserWindow, Menu, dialog, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { keyboard, mouse, Key } = require('@nut-tree-fork/nut-js');
const { Point } = require('@nut-tree-fork/shared');

let mainWindow;

// Key map for nut.js
const keyMap = {
    'enter': Key.Enter,
    'esc': Key.Escape,
    'escape': Key.Escape,
    'tab': Key.Tab,
    'space': Key.Space,
    'backspace': Key.Backspace,
    'delete': Key.Delete,
    'up': Key.Up,
    'down': Key.Down,
    'left': Key.Left,
    'right': Key.Right,
    'f1': Key.F1,
    'f2': Key.F2,
    'f3': Key.F3,
    'f4': Key.F4,
    'f5': Key.F5,
    'f6': Key.F6,
    'f7': Key.F7,
    'f8': Key.F8,
    'f9': Key.F9,
    'f10': Key.F10,
    'f11': Key.F11,
    'f12': Key.F12,
    'ctrl': Key.LeftControl,
    'ctrlleft': Key.LeftControl,
    'ctrlright': Key.RightControl,
    'alt': Key.LeftAlt,
    'altleft': Key.LeftAlt,
    'altright': Key.RightAlt,
    'shift': Key.LeftShift,
    'shiftleft': Key.LeftShift,
    'shiftright': Key.RightShift,
    'capslock': Key.CapsLock,
    'win': Key.LeftWin,
    'winleft': Key.LeftWin,
    'winright': Key.RightWin,
    'super': Key.LeftSuper,
    'superleft': Key.LeftSuper,
    'superright': Key.RightSuper,
};

// Schedules data (persisted to JSON file)
const SCHEDULES_FILE = path.join(app.getPath('userData'), 'schedules.json');
let schedules = [];

function loadSchedules() {
    try {
        if (fs.existsSync(SCHEDULES_FILE)) {
            schedules = JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf-8'));
        }
    } catch (e) {
        schedules = [];
    }
}

function saveSchedules() {
    fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2), 'utf-8');
}

// Scheduler
let schedulerInterval = null;

function startScheduler() {
    if (schedulerInterval) return;
    schedulerInterval = setInterval(async () => {
        const now = Date.now();
        let changed = false;

        for (const schedule of schedules) {
            if (!schedule.active) continue;

            for (const instance of schedule.executionOrder) {
                if (instance.status === 'pending' && now >= instance.gatilho_timeStamp) {
                    instance.status = 'running';
                    changed = true;

                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('execute-scheduled', {
                            scheduleId: schedule.id,
                            instanceId: instance.id,
                            resolvedActions: instance.resolvedActions,
                            flowName: schedule.flowName
                        });
                    }
                }
            }
        }

        if (changed) saveSchedules();
    }, 1000);
}

function stopScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
    }
}

// Create window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'Editor de Fluxos',
        backgroundColor: '#0f0f0f',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadFile('index.html');

    const menu = Menu.buildFromTemplate([
        {
            label: 'Arquivo',
            submenu: [
                { label: 'Abrir', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu-open') },
                { label: 'Salvar', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save') },
                { label: 'Salvar Como...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu-save-as') },
                { type: 'separator' },
                { label: 'Sair', accelerator: 'Alt+F4', click: () => app.quit() }
            ]
        },
        {
            label: 'Editar',
            submenu: [
                { role: 'undo', label: 'Desfazer' },
                { role: 'redo', label: 'Refazer' },
                { type: 'separator' },
                { role: 'cut', label: 'Recortar' },
                { role: 'copy', label: 'Copiar' },
                { role: 'paste', label: 'Colar' }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                {
                    label: 'Sobre',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info', title: 'Sobre',
                            message: 'Editor de Fluxos v2.0.0',
                            detail: 'Editor e agendador de fluxos para automacao.'
                        });
                    }
                }
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);

    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
    loadSchedules();
    createWindow();
    startScheduler();
});

app.on('window-all-closed', () => { app.quit(); });
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// === FILE OPERATIONS ===
ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Abrir Fluxos',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
    });
    if (result.canceled) return null;
    const data = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { data, path: result.filePaths[0] };
});

ipcMain.handle('save-file', async (event, { content, filePath }) => {
    if (filePath) {
        fs.writeFileSync(filePath, content, 'utf-8');
        return filePath;
    }
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Salvar Fluxos',
        defaultPath: 'fluxos.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled) return null;
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return result.filePath;
});

// === AUTOMATION ===
ipcMain.handle('execute-action', async (event, action) => {
    try {
        if (action.delay !== undefined) {
            await new Promise(resolve => setTimeout(resolve, action.delay));
        } else if (action.mouse !== undefined) {
            await mouse.setPosition(new Point(action.x, action.y));
            await new Promise(r => setTimeout(r, 50));
            switch (action.mouse) {
                case 'click': await mouse.leftClick(); break;
                case 'rightclick': await mouse.rightClick(); break;
                case 'doubleclick':
                    await mouse.leftClick();
                    await new Promise(r => setTimeout(r, 50));
                    await mouse.leftClick();
                    break;
            }
        } else {
            const keyName = action.toLowerCase();
            const nutKey = keyMap[keyName];
            if (nutKey) {
                await keyboard.pressKey(nutKey);
                await new Promise(r => setTimeout(r, 50));
                await keyboard.releaseKey(nutKey);
            } else if (action.length === 1) {
                await keyboard.type(action);
            } else {
                await keyboard.type(action);
            }
        }
        return true;
    } catch (e) {
        console.error('Erro na execucao:', e.message);
        throw e;
    }
});

// === MOUSE CAPTURE ===
let captureShortcut = null;

ipcMain.handle('register-capture-shortcut', async (event, accelerator) => {
    if (captureShortcut) globalShortcut.unregister(captureShortcut);
    captureShortcut = accelerator;
    globalShortcut.register(accelerator, async () => {
        const pos = await mouse.getPosition();
        mainWindow.webContents.send('mouse-captured', { x: Math.round(pos.x), y: Math.round(pos.y) });
    });
    return true;
});

ipcMain.handle('unregister-capture-shortcut', async () => {
    if (captureShortcut) {
        globalShortcut.unregister(captureShortcut);
        captureShortcut = null;
    }
    return true;
});

ipcMain.handle('get-mouse-position', async () => {
    const pos = await mouse.getPosition();
    return { x: Math.round(pos.x), y: Math.round(pos.y) };
});

// === SCHEDULER ===
ipcMain.handle('get-schedules', () => schedules);

ipcMain.handle('save-schedules', (event, data) => {
    schedules = data;
    saveSchedules();
    return true;
});

ipcMain.handle('update-instance-status', (event, { scheduleId, instanceId, status }) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
        const instance = schedule.executionOrder.find(i => i.id === instanceId);
        if (instance) {
            instance.status = status;
            saveSchedules();
        }
    }
    return true;
});

ipcMain.handle('start-scheduler', () => { startScheduler(); return true; });
ipcMain.handle('stop-scheduler', () => { stopScheduler(); return true; });
