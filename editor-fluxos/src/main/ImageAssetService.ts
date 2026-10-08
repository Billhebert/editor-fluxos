import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class ImageAssetService {
    private _assetsDir: string;

    constructor(assetsDir?: string) {
        this._assetsDir = assetsDir || path.join(app.getPath('userData'), 'assets');
        if (!fs.existsSync(this._assetsDir)) {
            fs.mkdirSync(this._assetsDir, { recursive: true });
        }
    }

    getAssetPath(assetId: string): string {
        return path.join(this._assetsDir, `${assetId}.png`);
    }

    exists(assetId: string): boolean {
        return fs.existsSync(this.getAssetPath(assetId));
    }

    writeBase64(assetId: string, base64: string): void {
        const buf = Buffer.from(base64, 'base64');
        fs.writeFileSync(this.getAssetPath(assetId), buf);
    }

    readBase64(assetId: string): string | null {
        const p = this.getAssetPath(assetId);
        if (!fs.existsSync(p)) return null;
        return fs.readFileSync(p).toString('base64');
    }

    delete(assetId: string): void {
        const p = this.getAssetPath(assetId);
        if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    importFile(assetId: string, filePath: string): void {
        fs.copyFileSync(filePath, this.getAssetPath(assetId));
    }

    list(): string[] {
        return fs.readdirSync(this._assetsDir).filter(f => f.endsWith('.png'));
    }
}
