import { RawAction } from '../domain/types';
import { getActionClass, getActionLabel } from './ActionLabeler';
import { Toast } from './Toast';
import { VirtualKeyboardView } from './VirtualKeyboardView';

export interface RecordingContext {
    getTargetFluxo(): string | null;
    getFluxos(): Record<string, RawAction[]>;
    addToFluxo(fluxoName: string, actions: RawAction[]): Promise<void>;
    renderAll(): void;
    registerCapture(shortcut: string): Promise<void>;
    unregisterCapture(): Promise<void>;
}

export class RecordingController {
    private _ctx: RecordingContext;
    private _targetFluxo: string | null = null;
    private _recordingQueue: RawAction[] = [];
    private _isKeyRecording: boolean = false;
    private _isGlobalCapture: boolean = false;
    private _keyboardView: VirtualKeyboardView;

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
        const btn = document.getElementById('keyRecBtn') as HTMLButtonElement;
        if (btn) {
            btn.textContent = this._isKeyRecording ? '⏹ Parar' : '⏺ Gravar Fisico';
            btn.className = this._isKeyRecording ? 'btn btn-danger btn-sm recording-active' : 'btn btn-warning btn-sm';
        }
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
        const btn = document.getElementById('globalCaptureBtn') as HTMLButtonElement;
        if (this._isGlobalCapture) {
            await this._ctx.registerCapture('CommandOrControl+Shift+C');
            if (btn) {
                btn.textContent = '⏹ Parar Captura';
                btn.className = 'btn btn-danger btn-sm recording-active';
            }
            Toast.info('Ctrl+Shift+C em qualquer lugar para capturar mouse');
        } else {
            await this._ctx.unregisterCapture();
            if (btn) {
                btn.textContent = '🖱 Captura Global';
                btn.className = 'btn btn-warning btn-sm';
            }
        }
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

    setupKeyboardRecording(): void {
        document.addEventListener('keydown', (e) => {
            if (!this._isKeyRecording) return;
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            e.preventDefault();
            this.addToQueue(e.key);
        });
    }

    private _renderQueue(): void {
        const list = document.getElementById('queueList');
        if (!list) return;
        list.innerHTML = '';
        this._recordingQueue.forEach((item, i) => {
            const el = document.createElement('div');
            el.className = `action-item ${getActionClass(item)}`;
            el.textContent = getActionLabel(item);

            const btn = document.createElement('button');
            btn.className = 'action-remove';
            btn.textContent = '✕';
            btn.addEventListener('click', () => this.removeFromQueue(i));
            el.appendChild(btn);
            list.appendChild(el);
        });
    }

    private _renderKeyboard(): void {
        const container = document.getElementById('keyboardContainer');
        if (!container) return;
        this._keyboardView.render(container, (key) => this.addToQueue(key));
    }
}
