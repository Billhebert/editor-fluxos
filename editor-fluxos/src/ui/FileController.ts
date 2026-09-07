import { Flow, RawAction } from '../domain';
import { FlowManager } from '../use-cases/FlowManager';
import { IFileDialogService } from '../adapters/IFileDialogService';
import { Toast } from './Toast';

export interface FileControllerContext {
    flowManager: FlowManager;
    fluxosCache: Record<string, RawAction[]>;
    variables: string[];
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
        this._currentFilePath = result.path;
        let loaded: Record<string, RawAction[]>;
        try {
            loaded = JSON.parse(result.data);
        } catch {
            Toast.error('Arquivo JSON invalido');
            return;
        }
        const flows: Flow[] = Object.keys(loaded)
            .map(name => Flow.fromJSON({ name, actions: loaded[name] }))
            .filter((f): f is Flow => f !== null);
        await this._ctx.flowManager.saveAllFlows(flows);
        await this._ctx.refreshCache();
        this._updateFileInfo();
        await this._ctx.renderAll();
    }

    async saveFile(forceSaveAs: boolean = false): Promise<void> {
        await this._ctx.refreshCache();
        const json = JSON.stringify(this._ctx.fluxosCache, null, 2);
        const filePath = forceSaveAs ? null : this._currentFilePath;
        const result = await this._ctx.fileDialog.saveFile(json, filePath);
        if (result) {
            this._currentFilePath = result;
            this._updateFileInfo();
            this._ctx.saveToStorage();
            Toast.success('Arquivo salvo!');
        }
    }

    private _updateFileInfo(): void {
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo) fileInfo.textContent = this._currentFilePath!.split(/[\\/]/).pop() ?? null;
    }
}
