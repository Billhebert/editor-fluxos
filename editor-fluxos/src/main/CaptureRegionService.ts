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
        const display = screen.getDisplayNearestPoint({ x: Math.round(region.x), y: Math.round(region.y) });
        const scaleFactor = display.scaleFactor || 1;
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: Math.round(display.size.width * scaleFactor), height: Math.round(display.size.height * scaleFactor) }
        });

        const primary = sources.find(s => s.display_id === String(display.id)) || sources[0];
        if (!primary || !primary.thumbnail) {
            throw new Error('No screen source found');
        }

        const full = primary.thumbnail.toBitmap();
        const fullWidth = Math.round(primary.thumbnail.getSize().width);
        const sx = Math.max(0, Math.round(region.x * scaleFactor));
        const sy = Math.max(0, Math.round(region.y * scaleFactor));
        const sw = Math.min(Math.round(region.width * scaleFactor), fullWidth - sx);
        const sh = Math.min(Math.round(region.height * scaleFactor), Math.round(primary.thumbnail.getSize().height) - sy);

        const crop = this._cropBitmap(full, fullWidth, sx, sy, sw, sh);
        const nativeImg = require('electron').nativeImage.createFromBuffer(crop, { width: sw, height: sh });
        return nativeImg.toPNG().toString('base64');
    }

    private _cropBitmap(buffer: Buffer, fullWidth: number, sx: number, sy: number, sw: number, sh: number): Buffer {
        const bpp = 4;
        const out = Buffer.alloc(sw * sh * bpp);
        for (let y = 0; y < sh; y++) {
            const srcOffset = ((sy + y) * fullWidth + sx) * bpp;
            const dstOffset = y * sw * bpp;
            buffer.copy(out, dstOffset, srcOffset, srcOffset + sw * bpp);
        }
        return out;
    }
}
