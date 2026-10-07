import path from 'path';
import { screen, imageResource, OptionalSearchParameters } from '@nut-tree-fork/nut-js';
import { IImageRecognizer, ImageSearchOptions, ImageMatch } from '../adapters/IImageRecognizer';

export class NutImageRecognizer implements IImageRecognizer {
    async findImage(options: ImageSearchOptions): Promise<ImageMatch | null> {
        try {
            const assetPath = path.resolve('assets', `${options.assetId}.png`);
            const confidence = options.confidence ?? 0.8;
            const region = await screen.find(imageResource(assetPath), new OptionalSearchParameters(undefined, confidence));
            if (!region) return null;
            return {
                x: region.left,
                y: region.top,
                width: region.width,
                height: region.height,
                confidence,
            };
        } catch (e) {
            return null;
        }
    }
}
