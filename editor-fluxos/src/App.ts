import { Flow, RawAction } from './domain';
import { FlowExecutor, ScheduleManager, FlowManager, FlowSanitizer } from './use-cases';
import { LocalStorageFlowRepo, ElectronIpcExecutor, UndoManager, IpcScheduleRepo, eventBus, NodeIpcFileDialog } from './infrastructure';
import { ipc } from './infrastructure/IpcService';
import { FlowRenderer, Toast, RecordingController, ScheduleController, VariableConfigController } from './ui';
import { UpdateBadgeController } from './ui/modals/UpdateBadgeController';
import { IpcListenerSetup } from './infrastructure/IpcListenerSetup';
import { FlowController } from './ui/FlowController';
import { FileController } from './ui/FileController';
import { VariableManager } from './ui/VariableManager';
import { ExecutionController } from './ui/ExecutionController';

export class App {
    private _fluxosCache: Record<string, RawAction[]> = {};

    private _flowRepo: LocalStorageFlowRepo;
    private _executor: ElectronIpcExecutor;
    private _flowExecutor: FlowExecutor;
    private _undoManager: UndoManager;
    private _scheduleManager: ScheduleManager;
    private _flowManager: FlowManager;

    private _flowRenderer: FlowRenderer;
    private _recording: RecordingController;
    private _scheduleCtrl: ScheduleController;
    private _varConfigCtrl: VariableConfigController;
    private _updateBadge: UpdateBadgeController;

    private _varManager: VariableManager;
    private _flowCtrl: FlowController;
    private _fileCtrl: FileController;
    private _execCtrl: ExecutionController;

    constructor() {
        this._undoManager = new UndoManager();
        this._flowRepo = new LocalStorageFlowRepo();
        this._executor = new ElectronIpcExecutor();
        this._flowExecutor = new FlowExecutor(this._executor);
        this._flowRenderer = new FlowRenderer();
        this._scheduleManager = new ScheduleManager(new IpcScheduleRepo());
        this._flowManager = new FlowManager(this._flowRepo, this._undoManager, eventBus);
        this._updateBadge = new UpdateBadgeController();

        this._recording = new RecordingController({
            getTargetFluxo: () => this._recording.targetFluxo,
            getFluxos: () => this._fluxosCache,
            addToFluxo: async (name, actions) => {
                await this._flowManager.addActions(name, actions);
                await this._refreshCache();
            },
            renderAll: () => { this._renderAll(); },
            registerCapture: (shortcut) => ipc.registerCaptureShortcut(shortcut),
            unregisterCapture: () => ipc.unregisterCaptureShortcut()
        });

        this._varManager = new VariableManager({
            varConfigRepo: this._flowRepo,
            recording: this._recording
        });

        this._flowCtrl = new FlowController({
            flowManager: this._flowManager,
            fluxosCache: this._fluxosCache,
            refreshCache: () => this._refreshCache(),
            renderAll: () => this._renderAll(),
            recordingOpen: (name) => this._recording.open(name),
            executeFlow: (name, actions) => this._execCtrl.executeFlow(name, actions),
        });

        this._fileCtrl = new FileController({
            flowManager: this._flowManager,
            fluxosCache: this._fluxosCache,
            variables: this._varManager.variables,
            refreshCache: () => this._refreshCache(),
            renderAll: () => this._renderAll(),
            saveToStorage: () => this._varManager.saveToStorage(),
            fileDialog: new NodeIpcFileDialog(),
        });

        this._execCtrl = new ExecutionController({
            flowExecutor: this._flowExecutor,
            varConfig: this._varManager.varConfig,
            statusSink: {
                updateInstanceStatus: (scheduleId, instanceId, status) => ipc.updateInstanceStatus(scheduleId, instanceId, status),
            },
        }, this._flowRenderer);

        this._scheduleCtrl = new ScheduleController({
            getFluxos: () => this._fluxosCache,
            getVarConfig: () => this._varManager.varConfig,
            scheduleManager: this._scheduleManager,
            loadSchedules: () => ipc.getSchedules(),
            saveSchedules: (s) => ipc.saveSchedules(s)
        });

        this._varConfigCtrl = new VariableConfigController({
            getVarConfig: () => this._varManager.varConfig,
            setVarConfig: (c) => { this._varManager.varConfig = c; },
            saveVarConfig: (data) => this._flowRepo.saveVarConfig(data),
            renderVariables: () => this._varManager.renderVariables(),
            saveToStorage: () => this._varManager.saveToStorage()
        });
    }

    async init(): Promise<void> {
        this._varManager.loadFromStorage();
        await this._syncRepoFromStorage();
        await this._refreshCache();
        this._bindButtons();
        IpcListenerSetup.init({
            onOpenFile: () => this._fileCtrl.openFile(),
            onSaveFile: () => this._fileCtrl.saveFile(),
            onSaveFileAs: () => this._fileCtrl.saveFile(true),
            onMouseCaptured: (x, y) => {
                const xInput = document.getElementById('mouseX') as HTMLInputElement;
                const yInput = document.getElementById('mouseY') as HTMLInputElement;
                if (xInput) xInput.value = String(x);
                if (yInput) yInput.value = String(y);
                this._recording.addToQueue({ mouse: 'click', x, y });
            },
            onUpdateStatus: (type, data) => this._updateBadge.handle(type, data),
            onExecuteScheduled: (payload) => this._execCtrl.executeScheduledInstance(payload)
        });
        this._recording.setupKeyboardRecording();
        await this._renderAll();
        this._setupAutoSave();
    }

    private async _syncRepoFromStorage(): Promise<void> {
        let data: any = {};
        try {
            const raw = localStorage.getItem('fluxos_editor_data');
            if (raw) data = JSON.parse(raw);
        } catch { data = {}; }
        const fluxosObj = data.fluxos || data;
        const flows: Flow[] = Object.keys(fluxosObj)
            .map(name => Flow.fromJSON({ name, actions: fluxosObj[name] }))
            .filter((f): f is Flow => f !== null);
        await this._flowManager.saveAllFlows(flows);
    }

    private async _refreshCache(): Promise<void> {
        const flows = await this._flowManager.getAllFlows();
        const record: Record<string, RawAction[]> = {};
        flows.forEach(f => { record[f.name] = f.actions; });
        this._fluxosCache = FlowSanitizer.sanitizeFluxos(record, this._varManager.variables);
    }

    private _setupAutoSave(): void {
        const grid = document.getElementById('fluxosGrid');
        if (grid) {
            new MutationObserver(() => this._varManager.saveToStorage()).observe(grid, { childList: true, subtree: true });
        }
    }

    private _bindButtons(): void {
        const argActions = new Set(['add-mouse-action']);

        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const btn = target.closest('[data-action]') as HTMLElement | null;
            if (!btn) return;
            const action = btn.getAttribute('data-action')!;
            const arg = btn.getAttribute('data-arg') || '';

            if (action === 'switch-tab') {
                this._switchTab(btn, arg);
                return;
            }
            if (action === 'delay-preset') {
                const input = document.getElementById('delayInput') as HTMLInputElement;
                if (input) input.value = arg;
                this._recording.addDelayAction();
                return;
            }
            if (action === 'install-update') {
                ipc.installUpdate();
                return;
            }

            const handlers: Record<string, (a: string) => void | Promise<void>> = {
                'open-file': () => this._fileCtrl.openFile(),
                'save-file': () => this._fileCtrl.saveFile(),
                'save-file-as': () => this._fileCtrl.saveFile(true),
                'open-var-config': () => this._varConfigCtrl.open(),
                'open-schedules': () => this._scheduleCtrl.openSchedules(),
                'close-recording': () => this._recording.close(),
                'toggle-key-recording': () => this._recording.toggleKeyRecording(),
                'toggle-global-capture': () => this._recording.toggleGlobalCapture(),
                'add-mouse-action': (a) => this._recording.addMouseAction(a),
                'add-variable': () => this._varManager.addVariable(),
                'add-delay-action': () => this._recording.addDelayAction(),
                'add-text-action': () => this._recording.addTextAction(),
                'add-queue-to-fluxo': () => this._recording.addQueueToFluxo(),
                'clear-queue': () => this._recording.clearQueue(),
                'add-new-fluxo': () => this._flowCtrl.addNew(),
            };

            const handler = handlers[action];
            if (handler) {
                const result = argActions.has(action) ? handler(arg) : handler('');
                if (result && typeof (result as Promise<void>).catch === 'function') {
                    (result as Promise<void>).catch(err => Toast.error(err.message || 'Erro'));
                }
            }
        });
    }

    private _switchTab(btn: HTMLElement, tab: string): void {
        document.querySelectorAll('.recording-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.recording-section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('section-' + tab)?.classList.add('active');
    }

    private async _renderAll(): Promise<void> {
        await this._refreshCache();
        this._flowRenderer.renderAll(this._fluxosCache, this._flowCtrl.renderAllCallbacks());
        this._varManager.renderVariables();
        this._varManager.saveToStorage();
    }

    async undo(): Promise<void> {
        try {
            const action = await this._undoManager.undo();
            if (action) {
                Toast.info(`Desfeito: ${action.description}`);
                await this._renderAll();
            }
        } catch (err: any) {
            Toast.error(`Erro ao desfazer: ${err.message || 'Erro desconhecido'}`);
        }
    }

    async redo(): Promise<void> {
        try {
            const action = await this._undoManager.redo();
            if (action) {
                Toast.info(`Refeito: ${action.description}`);
                await this._renderAll();
            }
        } catch (err: any) {
            Toast.error(`Erro ao refazer: ${err.message || 'Erro desconhecido'}`);
        }
    }
}
