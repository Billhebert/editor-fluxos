import { Flow, RawAction } from '../domain';
import { FlowManager } from '../use-cases/FlowManager';
import { IFileDialogService } from '../adapters/IFileDialogService';
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
        const json = JSON.stringify(this._buildPortableData(), null, 2);
        const filePath = forceSaveAs ? null : this._currentFilePath;
        const result = await this._ctx.fileDialog.saveFile(json, filePath ?? null);
        if (result) {
            this._currentFilePath = result;
            this._updateFileInfo();
            this._ctx.saveToStorage();
            Toast.success('Arquivo salvo!');
        }
    }

    private _buildPortableData(): PortableData {
        return {
            version: 1,
            fluxos: this._ctx.fluxosCache,
            variables: this._ctx.variables,
            varConfig: this._ctx.varConfig,
            imageAssets: {},
        };
    }

    private _updateFileInfo(): void {
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo && this._currentFilePath) {
            fileInfo.textContent = this._currentFilePath.split(/[\\/]/).pop() ?? null;
        }
    }
}
