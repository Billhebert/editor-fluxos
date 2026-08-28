import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import { IpcChannels } from '../shared/IpcChannels';

export class FileIpcHandler {
    register(windowProvider: () => BrowserWindow | null): void {
        ipcMain.handle(IpcChannels.OPEN_FILE, async () => {
            const win = windowProvider();
            if (!win) return null;
            const result = await dialog.showOpenDialog(win, {
                title: 'Abrir Fluxos',
                filters: [{ name: 'JSON', extensions: ['json'] }],
                properties: ['openFile']
            });
            if (result.canceled) return null;
            const data = fs.readFileSync(result.filePaths[0], 'utf-8');
            return { data, path: result.filePaths[0] };
        });

        ipcMain.handle(IpcChannels.SAVE_FILE, async (_event, { content, filePath }: { content: string; filePath: string | null }) => {
            if (filePath) {
                fs.writeFileSync(filePath, content, 'utf-8');
                return filePath;
            }
            const win = windowProvider();
            if (!win) return null;
            const result = await dialog.showSaveDialog(win, {
                title: 'Salvar Fluxos', defaultPath: 'fluxos.json',
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (result.canceled) return null;
            fs.writeFileSync(result.filePath, content, 'utf-8');
            return result.filePath;
        });
    }
}
