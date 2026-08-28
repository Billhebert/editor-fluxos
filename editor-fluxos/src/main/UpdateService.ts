import { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { ipcMain } from 'electron';
import { IpcChannels } from '../shared/IpcChannels';

export class UpdateService {
    init(windowProvider: () => BrowserWindow | null): void {
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;

        autoUpdater.on('checking-for-update', () => windowProvider()?.webContents.send(IpcChannels.UPDATE_STATUS, 'checking'));
        autoUpdater.on('update-available', (info: any) => windowProvider()?.webContents.send(IpcChannels.UPDATE_STATUS, 'available', info.version));
        autoUpdater.on('update-not-available', () => windowProvider()?.webContents.send(IpcChannels.UPDATE_STATUS, 'not-available'));
        autoUpdater.on('download-progress', (progress: any) => windowProvider()?.webContents.send(IpcChannels.UPDATE_STATUS, 'downloading', Math.round(progress.percent)));
        autoUpdater.on('update-downloaded', (info: any) => windowProvider()?.webContents.send(IpcChannels.UPDATE_STATUS, 'downloaded', info.version));
        autoUpdater.on('error', (err: any) => {
            console.error('Auto-updater error:', err);
            windowProvider()?.webContents.send(IpcChannels.UPDATE_STATUS, 'error', err.message);
        });

        ipcMain.handle(IpcChannels.INSTALL_UPDATE, () => {
            autoUpdater.quitAndInstall();
            return true;
        });

        ipcMain.handle(IpcChannels.CHECK_UPDATES, () => {
            autoUpdater.checkForUpdates();
            return true;
        });

        setTimeout(() => { autoUpdater.checkForUpdates(); }, 5000);
    }
}
