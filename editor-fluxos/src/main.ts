import { app, BrowserWindow, Menu } from 'electron';
import { IpcChannels } from './shared/IpcChannels';
import { SchedulerService } from './main/SchedulerService';
import { ActionIpcHandler } from './main/ActionIpcHandler';
import { CaptureIpcHandler } from './main/CaptureIpcHandler';
import { FileIpcHandler } from './main/FileIpcHandler';
import { ScheduleIpcHandler } from './main/ScheduleIpcHandler';
import { UpdateService } from './main/UpdateService';
import { NodeFileSystem } from './infrastructure/NodeFileSystem';
import { ImageIpcHandler } from './main/ImageIpcHandler';
import { NutImageRecognizer } from './main/NutImageRecognizer';

let mainWindow: BrowserWindow | null = null;
const windowProvider = () => mainWindow;

function setupKeyboardShortcuts(): void {
    mainWindow?.webContents.on('before-input-event', (event, input) => {
        if (!input.control && !input.meta) return;
        const key = input.key.toLowerCase();
        if (input.shift && key === 's') {
            event.preventDefault();
            mainWindow?.webContents.send(IpcChannels.MENU_SAVE_AS);
        } else if (key === 's') {
            event.preventDefault();
            mainWindow?.webContents.send(IpcChannels.MENU_SAVE);
        } else if (key === 'o') {
            event.preventDefault();
            mainWindow?.webContents.send(IpcChannels.MENU_OPEN);
        }
    });
}

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1200, height: 800, minWidth: 800, minHeight: 600,
        title: 'FLUXO', backgroundColor: '#0f0f0f',
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });

    mainWindow.loadFile('index.html');
    setupKeyboardShortcuts();
    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();

    const scheduler = new SchedulerService();
    scheduler.start(windowProvider);

    new FileIpcHandler(new NodeFileSystem()).register(windowProvider);
    new ActionIpcHandler().register();
    new CaptureIpcHandler().register(windowProvider);
    new ScheduleIpcHandler(scheduler).register();
    new ImageIpcHandler(new NutImageRecognizer()).register();
    new UpdateService().init(windowProvider);
});

app.on('window-all-closed', () => { app.quit(); });
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});