import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { screen, imageResource, OptionalSearchParameters } from '@nut-tree-fork/nut-js';
import { IImageRecognizer, ImageSearchOptions, ImageMatch } from '../adapters/IImageRecognizer';

export class NutImageRecognizer implements IImageRecognizer {
    private _assetsDir: string;

    constructor(assetsDir?: string) {
        this._assetsDir = assetsDir || path.join(app.getPath('userData'), 'assets');
    }

    async findImage(options: ImageSearchOptions): Promise<ImageMatch | null> {
        const assetPath = path.join(this._assetsDir, `${options.assetId}.png`);
        if (!fs.existsSync(assetPath)) {
            throw new Error(`Asset not found: ${options.assetId}`);
        }
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
    }
}
