import { RawAction, ClickImageAction, IfImageAction } from '../domain/types';

export interface ImageAsset {
    assetId: string;
    base64: string;
}

export class ImageAssetStore {
    private _assets: Map<string, ImageAsset> = new Map();

    add(asset: ImageAsset): void {
        this._assets.set(asset.assetId, asset);
    }

    get(assetId: string): ImageAsset | undefined {
        return this._assets.get(assetId);
    }

    has(assetId: string): boolean {
        return this._assets.has(assetId);
    }

    delete(assetId: string): void {
        this._assets.delete(assetId);
    }

    collectFromActions(actions: RawAction[]): void {
        for (const a of actions) {
            if (this._isImageAction(a)) {
                // noop: assets already embedded or loaded separately
            }
        }
    }

    toJSON(): Record<string, string> {
        const out: Record<string, string> = {};
        this._assets.forEach((asset, id) => out[id] = asset.base64);
        return out;
    }

    loadFromJSON(data: Record<string, string>): void {
        this._assets.clear();
        for (const id of Object.keys(data)) {
            this._assets.set(id, { assetId: id, base64: data[id] });
        }
    }

    private _isImageAction(a: RawAction): a is ClickImageAction | IfImageAction {
        return typeof a === 'object' && a !== null && 'type' in a && (a.type === 'click-image' || a.type === 'if-image');
    }
}
