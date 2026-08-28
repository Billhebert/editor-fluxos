"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const IpcChannels_1 = require("./shared/IpcChannels");
const SchedulerService_1 = require("./main/SchedulerService");
const ActionIpcHandler_1 = require("./main/ActionIpcHandler");
const CaptureIpcHandler_1 = require("./main/CaptureIpcHandler");
const FileIpcHandler_1 = require("./main/FileIpcHandler");
const ScheduleIpcHandler_1 = require("./main/ScheduleIpcHandler");
const UpdateService_1 = require("./main/UpdateService");
let mainWindow = null;
const windowProvider = () => mainWindow;
function setupKeyboardShortcuts() {
    mainWindow?.webContents.on('before-input-event', (event, input) => {
        if (!input.control && !input.meta)
            return;
        const key = input.key.toLowerCase();
        if (input.shift && key === 's') {
            event.preventDefault();
            mainWindow?.webContents.send(IpcChannels_1.IpcChannels.MENU_SAVE_AS);
        }
        else if (key === 's') {
            event.preventDefault();
            mainWindow?.webContents.send(IpcChannels_1.IpcChannels.MENU_SAVE);
        }
        else if (key === 'o') {
            event.preventDefault();
            mainWindow?.webContents.send(IpcChannels_1.IpcChannels.MENU_OPEN);
        }
    });
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200, height: 800, minWidth: 800, minHeight: 600,
        title: 'FLUXO', backgroundColor: '#0f0f0f',
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    mainWindow.loadFile('index.html');
    setupKeyboardShortcuts();
    mainWindow.on('closed', () => { mainWindow = null; });
}
electron_1.app.whenReady().then(() => {
    electron_1.Menu.setApplicationMenu(null);
    createWindow();
    const scheduler = new SchedulerService_1.SchedulerService();
    scheduler.start(windowProvider);
    new FileIpcHandler_1.FileIpcHandler().register(windowProvider);
    new ActionIpcHandler_1.ActionIpcHandler().register();
    new CaptureIpcHandler_1.CaptureIpcHandler().register(windowProvider);
    new ScheduleIpcHandler_1.ScheduleIpcHandler(scheduler).register();
    new UpdateService_1.UpdateService().init(windowProvider);
});
electron_1.app.on('window-all-closed', () => { electron_1.app.quit(); });
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
//# sourceMappingURL=main.js.map