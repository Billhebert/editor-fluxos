import { ipcMain, BrowserWindow, desktopCapturer, screen } from 'electron';
import { IpcChannels } from '../shared/IpcChannels';
import { ImageAssetService } from './ImageAssetService';
import { v4 as uuidv4 } from 'uuid';

export interface CaptureRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class CaptureRegionService {
    private _assetService: ImageAssetService;

    constructor(assetService: ImageAssetService) {
        this._assetService = assetService;
    }

    register(_windowProvider: () => BrowserWindow | null): void {
        ipcMain.handle(IpcChannels.CAPTURE_REGION, async (_event, region: CaptureRegion) => {
            const img = await this._captureNative(region);
            const assetId = `img_${Date.now()}_${uuidv4().slice(0, 8)}`;
            this._assetService.writeBase64(assetId, img);
            return { assetId, width: region.width, height: region.height };
        });

        ipcMain.handle(IpcChannels.IMPORT_IMAGE, async (_event, filePath: string) => {
            const assetId = `img_${Date.now()}_${uuidv4().slice(0, 8)}`;
            this._assetService.importFile(assetId, filePath);
            return { assetId };
        });

        ipcMain.handle(IpcChannels.SAVE_IMAGE_ASSET, async (_event, { assetId, base64 }: { assetId: string; base64: string }) => {
            this._assetService.writeBase64(assetId, base64);
            return true;
        });

        ipcMain.handle(IpcChannels.GET_IMAGE_ASSETS, async () => {
            const files = this._assetService.list();
            return files.map(f => ({
                assetId: f.replace(/\.png$/, ''),
                base64: this._assetService.readBase64(f.replace(/\.png$/, ''))
            }));
        });
    }

    private async _captureNative(region: CaptureRegion): Promise<string> {
        const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } });
        const primary = sources[0];
        if (!primary) throw new Error('No screen source found');

        const display = screen.getPrimaryDisplay();
        const scaleFactor = display.scaleFactor || 1;

        const nativeImg = await (BrowserWindow as any).capturePage({
            x: Math.round(region.x * scaleFactor),
            y: Math.round(region.y * scaleFactor),
            width: Math.round(region.width * scaleFactor),
            height: Math.round(region.height * scaleFactor),
        });

        return nativeImg.toPNG().toString('base64');
    }
}
