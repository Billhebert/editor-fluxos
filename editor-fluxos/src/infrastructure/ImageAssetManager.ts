import { IpcChannels } from '../shared/IpcChannels';
import { ipc } from './IpcService';

export class ImageAssetManager {
    async captureRegion(x: number, y: number, width: number, height: number): Promise<{ assetId: string; width: number; height: number }> {
        return ipc.invoke(IpcChannels.CAPTURE_REGION, { x, y, width, height });
    }

    async importImage(filePath: string): Promise<{ assetId: string }> {
        return ipc.invoke(IpcChannels.IMPORT_IMAGE, filePath);
    }

    async saveImageAsset(assetId: string, base64: string): Promise<boolean> {
        return ipc.invoke(IpcChannels.SAVE_IMAGE_ASSET, { assetId, base64 });
    }

    async getImageAssets(): Promise<{ assetId: string; base64: string | null }[]> {
        return ipc.invoke(IpcChannels.GET_IMAGE_ASSETS);
    }
}
