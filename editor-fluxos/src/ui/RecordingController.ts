import { RawAction, IfImageAction } from '../domain/types';
import { getActionClass, getActionLabel } from './ActionLabeler';
import { Toast } from './Toast';
import { VirtualKeyboardView } from './VirtualKeyboardView';
import { normalizeKeyName } from './keyNames';
import { ImageAssetManager } from '../infrastructure/ImageAssetManager';

export interface RecordingContext {
    getTargetFluxo(): string | null;
    getFluxos(): Record<string, RawAction[]>;
    addToFluxo(fluxoName: string, actions: RawAction[]): Promise<void>;
    renderAll(): void;
    registerCapture(shortcut: string): Promise<void>;
    unregisterCapture(): Promise<void>;
    imageAssets: ImageAssetManager;
}

export class RecordingController {
    private _ctx: RecordingContext;
    private _targetFluxo: string | null = null;
    private _recordingQueue: RawAction[] = [];
    private _isKeyRecording: boolean = false;
    private _isGlobalCapture: boolean = false;
    private _keyboardView: VirtualKeyboardView;
    private _capturing: boolean = false;

    constructor(ctx: RecordingContext) {
        this._ctx = ctx;
        this._keyboardView = new VirtualKeyboardView();
    }

    get targetFluxo(): string | null { return this._targetFluxo; }
    get isKeyRecording(): boolean { return this._isKeyRecording; }
    get isGlobalCapture(): boolean { return this._isGlobalCapture; }
    get queue(): ReadonlyArray<RawAction> { return this._recordingQueue; }

    open(fluxoName: string): void {
        this._targetFluxo = fluxoName;
        this._recordingQueue = [];
        document.getElementById('recordingPanel')?.classList.add('active');
        const target = document.getElementById('recordingTarget');
        if (target) target.textContent = `Fluxo: ${fluxoName}`;
        this._renderQueue();
        this._renderKeyboard();
    }

    close(): void {
        document.getElementById('recordingPanel')?.classList.remove('active');
        this._targetFluxo = null;
        if (this._isKeyRecording) this.toggleKeyRecording();
        if (this._isGlobalCapture) this.toggleGlobalCapture();
    }

    addToQueue(item: RawAction): void {
        this._recordingQueue.push(item);
        this._renderQueue();
    }

    removeFromQueue(idx: number): void {
        this._recordingQueue.splice(idx, 1);
        this._renderQueue();
    }

    clearQueue(): void {
        this._recordingQueue = [];
        this._renderQueue();
    }

    async addQueueToFluxo(): Promise<void> {
        if (!this._targetFluxo || this._recordingQueue.length === 0) return;
        await this._ctx.addToFluxo(this._targetFluxo, [...this._recordingQueue]);
        this._recordingQueue = [];
        this._renderQueue();
        this._ctx.renderAll();
        Toast.success('Acoes adicionadas ao fluxo!');
    }

    toggleKeyRecording(): void {
        this._isKeyRecording = !this._isKeyRecording;
        this._updateKeyRecButton();
    }

    private _updateKeyRecButton(): void {
        const btn = document.getElementById('keyRecBtn') as HTMLButtonElement;
        if (!btn) return;
        btn.textContent = this._isKeyRecording ? '⏹ Parar' : '⏺ Gravar Fisico';
        btn.className = this._isKeyRecording ? 'btn btn-danger btn-sm recording-active' : 'btn btn-warning btn-sm';
    }

    addMouseAction(type: string): void {
        const xInput = document.getElementById('mouseX') as HTMLInputElement;
        const yInput = document.getElementById('mouseY') as HTMLInputElement;
        const x = parseInt(xInput?.value || '0') || 0;
        const y = parseInt(yInput?.value || '0') || 0;
        this.addToQueue({ mouse: type, x, y });
    }

    async toggleGlobalCapture(): Promise<void> {
        this._isGlobalCapture = !this._isGlobalCapture;
        if (this._isGlobalCapture) {
            await this._ctx.registerCapture('CommandOrControl+Shift+C');
            this._updateGlobalCaptureBtn(true);
            Toast.info('Ctrl+Shift+C em qualquer lugar para capturar mouse');
        } else {
            await this._ctx.unregisterCapture();
            this._updateGlobalCaptureBtn(false);
        }
    }

    private _updateGlobalCaptureBtn(active: boolean): void {
        const btn = document.getElementById('globalCaptureBtn') as HTMLButtonElement;
        if (!btn) return;
        btn.textContent = active ? '⏹ Parar Captura' : '🖱 Captura Global';
        btn.className = active ? 'btn btn-danger btn-sm recording-active' : 'btn btn-warning btn-sm';
    }

    addDelayAction(): void {
        const input = document.getElementById('delayInput') as HTMLInputElement;
        if (!input) return;
        const ms = parseInt(input.value) || 0;
        if (ms > 0) this.addToQueue({ delay: ms });
    }

    addTextAction(): void {
        const input = document.getElementById('textInput') as HTMLInputElement;
        if (!input) return;
        const text = input.value;
        if (text) this.addToQueue(text);
        input.value = '';
    }

    addClickImageAction(): void {
        const assetInput = document.getElementById('imageAssetId') as HTMLInputElement;
        const confidenceInput = document.getElementById('imageConfidence') as HTMLInputElement;
        const timeoutInput = document.getElementById('imageTimeout') as HTMLInputElement;
        if (!assetInput) return;
        const assetId = assetInput.value.trim();
        if (!assetId) return;
        this.addToQueue({
            type: 'click-image',
            assetId,
            confidence: parseFloat(confidenceInput?.value || '0.8'),
            timeout: parseInt(timeoutInput?.value || '5000', 10),
        });
        assetInput.value = '';
    }

    addIfImageAction(): void {
        const assetInput = document.getElementById('imageAssetId') as HTMLInputElement;
        const confidenceInput = document.getElementById('imageConfidence') as HTMLInputElement;
        const timeoutInput = document.getElementById('imageTimeout') as HTMLInputElement;
        if (!assetInput) return;
        const assetId = assetInput.value.trim();
        if (!assetId) return;
        const action: IfImageAction = {
            type: 'if-image',
            assetId,
            confidence: parseFloat(confidenceInput?.value || '0.8'),
            timeout: parseInt(timeoutInput?.value || '5000', 10),
            then: [],
            else: [],
        };
        this.addToQueue(action);
        this._openBranchEditor(action);
        assetInput.value = '';
    }

    async captureRegion(): Promise<void> {
        if (this._capturing) return;
        this._capturing = true;
        Toast.info('Selecione a regiao clicando e arrastando (em desenvolvimento).');
        this._capturing = false;
    }

    async importImage(file: File): Promise<void> {
        const base64 = await this._readFileAsBase64(file);
        const assetId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await this._ctx.imageAssets.saveImageAsset(assetId, base64);
        const input = document.getElementById('imageAssetId') as HTMLInputElement;
        if (input) input.value = assetId;
        Toast.success(`Imagem importada: ${assetId}`);
    }

    private _readFileAsBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.replace(/^data:image\/png;base64,/, ''));
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    private _openBranchEditor(action: IfImageAction): void {
        import('./BranchEditor').then(({ BranchEditor }) => {
            new BranchEditor(action, {
                onChange: () => this._renderQueue()
            }).open();
        });
    }

    private _editQueueAction(index: number): void {
        const action = this._recordingQueue[index];
        if (!action || typeof action !== 'object' || !('type' in action)) return;
        if (action.type === 'if-image') {
            this._openBranchEditor(action as IfImageAction);
            return;
        }
        import('./ActionEditor').then(({ ActionEditor }) => {
            new ActionEditor(action, (updated) => {
                this._recordingQueue[index] = updated;
                this._renderQueue();
            }).open();
        });
    }

    setupKeyboardRecording(): void {
        document.addEventListener('keydown', (e) => {
            if (!this._isKeyRecording) return;
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            e.preventDefault();
            this.addToQueue(normalizeKeyName(e.key));
        });
    }

    private _renderQueue(): void {
        const list = document.getElementById('queueList');
        if (!list) return;

        const existing = Array.from(list.children) as HTMLElement[];
        this._recordingQueue.forEach((item, i) => {
            let el = existing[i];
            if (!el) {
                el = document.createElement('div');
                el.className = 'action-item';
                el.textContent = getActionLabel(item);
                const editBtn = document.createElement('button');
                editBtn.className = 'action-edit';
                editBtn.textContent = '✎';
                editBtn.addEventListener('click', () => this._editQueueAction(i));

                const btn = document.createElement('button');
                btn.className = 'action-remove';
                btn.textContent = '✕';
                btn.addEventListener('click', () => this.removeFromQueue(parseInt(btn.dataset.index || '0', 10)));

                el.appendChild(editBtn);
                el.appendChild(btn);
                list.appendChild(el);
            }
            const newClass = `action-item ${getActionClass(item)}`;
            if (el.className !== newClass) el.className = newClass;
            el.dataset.index = String(i);
            const textNode = el.firstChild;
            if (textNode && textNode.nodeType === Node.TEXT_NODE && textNode.textContent !== getActionLabel(item)) {
                textNode.textContent = getActionLabel(item);
            }
            const btn = el.querySelector('.action-remove') as HTMLElement;
            if (btn) btn.dataset.index = String(i);
        });

        while (list.children.length > this._recordingQueue.length) {
            list.lastElementChild!.remove();
        }
    }

    private _renderKeyboard(): void {
        const container = document.getElementById('keyboardContainer');
        if (!container) return;
        this._keyboardView.render(container, (key) => this.addToQueue(key));
    }
}
