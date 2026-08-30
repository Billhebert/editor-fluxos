import { Flow, VariablePool, RawAction } from './domain';
import { BUILT_IN_VARS } from './domain/constants';
import { FlowExecutor, ScheduleManager, FlowManager, FlowSanitizer } from './use-cases';
import { LocalStorageFlowRepo, ElectronIpcExecutor, UndoManager, IpcScheduleRepo, eventBus } from './infrastructure';
import { ipc } from './infrastructure/IpcService';
import { FlowRenderer, Toast, RecordingController, ScheduleController, VariableConfigController } from './ui';
import { modalPrompt } from './ui/modals/modalPrompt';
import { UpdateBadgeController } from './ui/modals/UpdateBadgeController';
import { IpcListenerSetup } from './infrastructure/IpcListenerSetup';
import { IVariableConfigRepository } from './adapters/IVariableConfigRepository';

export class App {
    private _variables: string[] = [];
    private _varConfig: VariablePool = new VariablePool();
    private _currentFilePath: string | null = null;
    private _fluxosCache: Record<string, RawAction[]> = {};

    private _flowRepo: LocalStorageFlowRepo;
    private _varConfigRepo: IVariableConfigRepository;
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

    constructor() {
        this._undoManager = new UndoManager();
        this._flowRepo = new LocalStorageFlowRepo();
        this._varConfigRepo = this._flowRepo;
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

        this._scheduleCtrl = new ScheduleController({
            getFluxos: () => this._fluxosCache,
            getVarConfig: () => this._varConfig,
            scheduleManager: this._scheduleManager,
            loadSchedules: () => ipc.getSchedules(),
            saveSchedules: (s) => ipc.saveSchedules(s)
        });

        this._varConfigCtrl = new VariableConfigController({
            getVarConfig: () => this._varConfig,
            setVarConfig: (c) => { this._varConfig = c; },
            saveVarConfig: (data) => this._varConfigRepo.saveVarConfig(data),
            renderVariables: () => this._renderVariables(),
            saveToStorage: () => this._saveToStorage()
        });
    }

    async init(): Promise<void> {
        this._loadFromStorage();
        await this._syncRepoFromStorage();
        await this._refreshCache();
        this._bindButtons();
        IpcListenerSetup.init({
            onOpenFile: () => this.openFile(),
            onSaveFile: () => this.saveFile(),
            onSaveFileAs: () => this.saveFile(true),
            onMouseCaptured: (x, y) => {
                const xInput = document.getElementById('mouseX') as HTMLInputElement;
                const yInput = document.getElementById('mouseY') as HTMLInputElement;
                if (xInput) xInput.value = String(x);
                if (yInput) yInput.value = String(y);
                this._recording.addToQueue({ mouse: 'click', x, y });
            },
            onUpdateStatus: (type, data) => this._updateBadge.handle(type, data),
            onExecuteScheduled: (payload) => this._executeScheduledInstance(payload)
        });
        this._recording.setupKeyboardRecording();
        await this._renderAll();
        this._setupAutoSave();
    }

    // === DATA (single source of truth: repository) ===

    private _loadFromStorage(): void {
        try {
            const raw = localStorage.getItem('fluxos_variables');
            if (raw) this._variables = JSON.parse(raw);
        } catch { this._variables = []; }

        try {
            const config = this._varConfigRepo.loadVarConfig();
            this._varConfig = VariablePool.fromJSON(config);
        } catch { this._varConfig = new VariablePool(); }
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

    private _saveToStorage(): void {
        localStorage.setItem('fluxos_variables', JSON.stringify(this._variables));
        localStorage.setItem('fluxos_var_config', JSON.stringify(this._varConfig.toJSON()));
    }

    private async _refreshCache(): Promise<void> {
        const flows = await this._flowManager.getAllFlows();
        const record: Record<string, RawAction[]> = {};
        flows.forEach(f => { record[f.name] = f.actions; });
        this._fluxosCache = FlowSanitizer.sanitizeFluxos(record, this._variables);
    }

    private _setupAutoSave(): void {
        const grid = document.getElementById('fluxosGrid');
        if (grid) {
            new MutationObserver(() => this._saveToStorage()).observe(grid, { childList: true, subtree: true });
        }
    }

    // === BUTTON BINDING (P5.4 — eliminate inline onclick) ===

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
                'open-file': () => this.openFile(),
                'save-file': () => this.saveFile(),
                'save-file-as': () => this.saveFile(true),
                'open-var-config': () => this._varConfigCtrl.open(),
                'open-schedules': () => this._scheduleCtrl.openSchedules(),
                'close-recording': () => this._recording.close(),
                'toggle-key-recording': () => this._recording.toggleKeyRecording(),
                'toggle-global-capture': () => this._recording.toggleGlobalCapture(),
                'add-mouse-action': (a) => this._recording.addMouseAction(a),
                'add-variable': () => this.addVariable(),
                'add-delay-action': () => this._recording.addDelayAction(),
                'add-text-action': () => this._recording.addTextAction(),
                'add-queue-to-fluxo': () => this._recording.addQueueToFluxo(),
                'clear-queue': () => this._recording.clearQueue(),
                'add-new-fluxo': () => this.addNewFluxo(),
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

    // === FILE OPERATIONS ===

    async openFile(): Promise<void> {
        const result = await ipc.openFile();
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
        await this._flowManager.saveAllFlows(flows);
        await this._refreshCache();
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo) fileInfo.textContent = this._currentFilePath!.split(/[\\/]/).pop() ?? null;
        await this._renderAll();
    }

    async saveFile(forceSaveAs: boolean = false): Promise<void> {
        await this._refreshCache();
        const json = JSON.stringify(this._fluxosCache, null, 2);
        const filePath = forceSaveAs ? null : this._currentFilePath;
        const result = await ipc.saveFile(json, filePath);
        if (result) {
            this._currentFilePath = result;
            const fileInfo = document.getElementById('fileInfo');
            if (fileInfo) fileInfo.textContent = this._currentFilePath!.split(/[\\/]/).pop() ?? null;
            this._saveToStorage();
            Toast.success('Arquivo salvo!');
        }
    }

    // === RENDERING ===

    private async _renderAll(): Promise<void> {
        await this._refreshCache();
        this._flowRenderer.renderAll(this._fluxosCache, {
            onRecord: (name) => this._recording.open(name),
            onExecute: (name, actions) => this._executeFlow(name, actions),
            onRemove: (name) => this._removeFluxo(name),
            onRename: (oldName, newName) => this._renameFluxo(oldName, newName),
            onRemoveAction: (flowName, index) => this._removeAction(flowName, index),
            onMoveAction: (flowName, from, to) => this._moveAction(flowName, from, to)
        });
        this._renderVariables();
        this._saveToStorage();
    }

    private _renderVariables(): void {
        const container = document.getElementById('variablesContainer');
        if (!container) return;
        container.innerHTML = '';

        const addTag = (text: string, cssClass: string) => {
            const tag = document.createElement('span');
            tag.className = `variable-tag ${cssClass}`;
            tag.textContent = text;
            tag.addEventListener('click', () => this._recording.addToQueue(text));
            container.appendChild(tag);
        };

        addTag(BUILT_IN_VARS.obrigatorio, 'obrigatorio');
        addTag(BUILT_IN_VARS.opcional, 'opcional');
        this._variables.forEach(v => addTag(v, 'custom'));
    }

    // === FLOW OPERATIONS ===

    async addNewFluxo(): Promise<void> {
        const name = await modalPrompt('Nome do novo fluxo:', 'novo_fluxo');
        if (!name) return;
        try {
            await this._flowManager.createFlow(name);
            await this._renderAll();
        } catch (err: any) {
            Toast.error(err.message || 'Erro ao criar fluxo');
        }
    }

    private async _removeFluxo(name: string): Promise<void> {
        if (!confirm(`Remover fluxo "${name}"?`)) return;
        try {
            await this._flowManager.deleteFlow(name);
            await this._renderAll();
            Toast.info('Fluxo removido');
        } catch (err: any) {
            Toast.error(err.message || 'Erro ao remover fluxo');
        }
    }

    private async _renameFluxo(oldName: string, newName: string): Promise<void> {
        newName = newName.trim();
        if (!newName || newName === oldName) return;
        try {
            await this._flowManager.renameFlow(oldName, newName);
            await this._renderAll();
        } catch (err: any) {
            Toast.error(err.message || 'Erro ao renomear fluxo');
        }
    }

    private async _removeAction(flowName: string, index: number): Promise<void> {
        try {
            await this._flowManager.removeAction(flowName, index);
            await this._renderAll();
        } catch (err: any) {
            Toast.error(err.message || 'Erro ao remover acao');
        }
    }

    private async _moveAction(flowName: string, fromIndex: number, toIndex: number): Promise<void> {
        try {
            await this._flowManager.moveAction(flowName, fromIndex, toIndex);
            await this._renderAll();
        } catch (err: any) {
            Toast.error(err.message || 'Erro ao mover acao');
        }
    }

    addVariable(): void {
        const input = document.getElementById('varInput') as HTMLInputElement;
        if (!input) return;
        const name = input.value.trim();
        if (!name) return;
        if (!this._variables.includes(name)) {
            this._variables.push(name);
            this._renderVariables();
            this._saveToStorage();
        }
        input.value = '';
    }

    // === EXECUTION ===

    private async _executeFlow(flowName: string, rawActions: RawAction[]): Promise<void> {
        if (this._flowExecutor.isRunning) { alert('Ja existe uma execucao em andamento!'); return; }

        const flow = new Flow(flowName, rawActions);

        try {
            this._flowRenderer.setRunning(flowName, true);
            await this._flowExecutor.execute(flow, this._varConfig,
                (i) => this._flowRenderer.highlightAction(flowName, i, true),
                (i) => this._flowRenderer.highlightAction(flowName, i, false)
            );
            Toast.success(`Fluxo "${flowName}" concluido!`);
        } catch (err: any) {
            Toast.error(`Erro ao executar: ${err.message}`);
        } finally {
            this._flowRenderer.setRunning(flowName, false);
            this._flowRenderer.clearHighlights(flowName);
        }
    }

    private async _executeScheduledInstance(payload: any): Promise<void> {
        const { scheduleId, instanceId, resolvedActions, flowName } = payload;
        try {
            await this._flowExecutor.executeActions(resolvedActions);
            await ipc.updateInstanceStatus(scheduleId, instanceId, 'completed');
            Toast.success(`${flowName} #${instanceId} concluido!`);
        } catch (err) {
            await ipc.updateInstanceStatus(scheduleId, instanceId, 'failed');
            Toast.error(`${flowName} #${instanceId} falhou!`);
        }
    }

    // === UNDO/REDO ===

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
