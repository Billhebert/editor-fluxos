import { Flow, RawAction } from '../domain';
import { FlowManager } from '../use-cases/FlowManager';
import { IFileDialogService } from '../adapters/IFileDialogService';
import { ImageAssetStore } from '../use-cases/ImageAssetStore';
import { ImageAssetManager } from '../infrastructure/ImageAssetManager';
import { Toast } from './Toast';

export interface PortableData {
    version: number;
    fluxos: Record<string, RawAction[]>;
    variables: string[];
    varConfig: { obrigatorias: { nome: string; valor: string }[]; opcionais: { nome: string; valor: string }[] };
    imageAssets?: Record<string, string>;
}

export interface FileControllerContext {
    flowManager: FlowManager;
    fluxosCache: Record<string, RawAction[]>;
    variables: string[];
    varConfig: { obrigatorias: { nome: string; valor: string }[]; opcionais: { nome: string; valor: string }[] };
    refreshCache(): Promise<void>;
    renderAll(): Promise<void>;
    saveToStorage(): void;
    fileDialog: IFileDialogService;
    imageAssets: ImageAssetManager;
}

export class FileController {
    private _ctx: FileControllerContext;
    private _currentFilePath: string | null = null;

    constructor(ctx: FileControllerContext) {
        this._ctx = ctx;
    }

    get currentFilePath(): string | null { return this._currentFilePath; }

    async openFile(): Promise<void> {
        const result = await this._ctx.fileDialog.openFile();
        if (!result) return;

        let loaded: PortableData;
        try {
            loaded = JSON.parse(result.data);
        } catch {
            Toast.error('Arquivo JSON invalido');
            return;
        }

        let flows: Flow[];
        if (loaded && typeof loaded === 'object' && 'fluxos' in loaded) {
            const portable = loaded as PortableData;
            flows = Object.keys(portable.fluxos || {})
                .map(name => Flow.fromJSON({ name, actions: portable.fluxos[name] }))
                .filter((f): f is Flow => f !== null);
            await this._restoreImageAssets(portable.imageAssets || {});
        } else if (loaded && typeof loaded === 'object') {
            flows = Object.keys(loaded)
                .map(name => Flow.fromJSON({ name, actions: loaded[name] }))
                .filter((f): f is Flow => f !== null);
        } else {
            Toast.error('Formato de arquivo invalido');
            return;
        }

        await this._ctx.flowManager.saveAllFlows(flows);
        await this._ctx.refreshCache();
        this._currentFilePath = result.path;
        this._updateFileInfo();
        await this._ctx.renderAll();
    }

    async saveFile(forceSaveAs: boolean = false): Promise<void> {
        await this._ctx.refreshCache();
        const json = JSON.stringify(await this._buildPortableData(), null, 2);
        const filePath = forceSaveAs ? null : this._currentFilePath;
        const result = await this._ctx.fileDialog.saveFile(json, filePath ?? null);
        if (result) {
            this._currentFilePath = result;
            this._updateFileInfo();
            this._ctx.saveToStorage();
            Toast.success('Arquivo salvo!');
        }
    }

    private async _buildPortableData(): Promise<PortableData> {
        const store = new ImageAssetStore();
        for (const name of Object.keys(this._ctx.fluxosCache)) {
            const ids = store.collectFromActions(this._ctx.fluxosCache[name]);
            for (const id of ids) {
                if (store.has(id)) continue;
                const assets = await this._ctx.imageAssets.getImageAssets();
                const found = assets.find(a => a.assetId === id);
                if (found && found.base64) store.add({ assetId: id, base64: found.base64 });
            }
        }
        return {
            version: 1,
            fluxos: this._ctx.fluxosCache,
            variables: this._ctx.variables,
            varConfig: this._ctx.varConfig,
            imageAssets: store.toJSON(),
        };
    }

    private async _restoreImageAssets(assets: Record<string, string>): Promise<void> {
        for (const id of Object.keys(assets)) {
            try {
                await this._ctx.imageAssets.saveImageAsset(id, assets[id]);
            } catch (e: any) {
                console.error(`Failed to restore asset ${id}:`, e.message);
            }
        }
    }

    private _updateFileInfo(): void {
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo && this._currentFilePath) {
            fileInfo.textContent = this._currentFilePath.split(/[\\/]/).pop() ?? null;
        }
    }
}
