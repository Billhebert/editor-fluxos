import { IImageRecognizer, ImageSearchOptions, ImageMatch } from '../adapters/IImageRecognizer';
import { ipc } from './IpcService';

export class ElectronImageRecognizer implements IImageRecognizer {
    async findImage(options: ImageSearchOptions): Promise<ImageMatch | null> {
        const result = await ipc.findImage(options.assetId, options.confidence, options.timeout);
        if (!result) return null;
        return {
            x: result.x,
            y: result.y,
            width: result.width,
            height: result.height,
            confidence: result.confidence,
        };
    }
}
