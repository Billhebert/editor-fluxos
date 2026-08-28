import { ipcMain, globalShortcut, BrowserWindow } from 'electron';
import { mouse } from '@nut-tree-fork/nut-js';
import { IpcChannels } from '../shared/IpcChannels';

export class CaptureIpcHandler {
    private _captureShortcut: string | null = null;

    register(windowProvider: () => BrowserWindow | null): void {
        ipcMain.handle(IpcChannels.REGISTER_CAPTURE, async (_event, accelerator: string) => {
            if (this._captureShortcut) globalShortcut.unregister(this._captureShortcut);
            this._captureShortcut = accelerator;
            globalShortcut.register(accelerator, async () => {
                const pos = await mouse.getPosition();
                windowProvider()?.webContents.send(IpcChannels.MOUSE_CAPTURED, { x: Math.round(pos.x), y: Math.round(pos.y) });
            });
            return true;
        });

        ipcMain.handle(IpcChannels.UNREGISTER_CAPTURE, async () => {
            if (this._captureShortcut) {
                globalShortcut.unregister(this._captureShortcut);
                this._captureShortcut = null;
            }
            return true;
        });

        ipcMain.handle(IpcChannels.GET_MOUSE_POSITION, async () => {
            const pos = await mouse.getPosition();
            return { x: Math.round(pos.x), y: Math.round(pos.y) };
        });
    }
}
