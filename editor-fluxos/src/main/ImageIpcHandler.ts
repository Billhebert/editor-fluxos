import { ipcMain } from 'electron';
import { IpcChannels } from '../shared/IpcChannels';
import { IImageRecognizer } from '../adapters/IImageRecognizer';

export class ImageIpcHandler {
    private _recognizer: IImageRecognizer;

    constructor(recognizer: IImageRecognizer) {
        this._recognizer = recognizer;
    }

    register(): void {
        ipcMain.handle(IpcChannels.FIND_IMAGE, async (_event, options: any) => {
            const match = await this._recognizer.findImage({
                assetId: options.assetId,
                confidence: options.confidence,
                timeout: options.timeout,
            });
            if (!match) return null;
            return {
                x: match.x,
                y: match.y,
                width: match.width,
                height: match.height,
                confidence: match.confidence,
            };
        });
    }
}
