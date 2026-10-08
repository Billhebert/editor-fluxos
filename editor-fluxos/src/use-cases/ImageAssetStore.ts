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

    collectFromActions(actions: RawAction[]): string[] {
        const ids: string[] = [];
        const walk = (list: RawAction[]) => {
            for (const a of list) {
                if (this._isImageAction(a)) {
                    ids.push(a.assetId);
                    if (a.type === 'if-image') {
                        walk(a.then);
                        walk(a.else);
                    }
                }
            }
        };
        walk(actions);
        return ids;
    }

    private _isImageAction(a: RawAction): a is ClickImageAction | IfImageAction {
        return typeof a === 'object' && a !== null && 'type' in a && (a.type === 'click-image' || a.type === 'if-image');
    }
}
