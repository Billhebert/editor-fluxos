import { Flow, VariablePool, RawAction } from '../domain';
import { FlowExecutor, FlowExecutionState } from '../use-cases/FlowExecutor';
import { SerialExecutionQueue } from '../use-cases';
import { FlowRenderer } from './FlowRenderer';
import { Toast } from './Toast';

export interface ScheduledStatusSink {
    updateInstanceStatus(scheduleId: string, instanceId: number, status: string): Promise<void>;
}

export interface ExecutionControllerContext {
    flowExecutor: FlowExecutor;
    varConfig: VariablePool;
    statusSink: ScheduledStatusSink;
}

export interface ScheduledPayload {
    scheduleId: string;
    instanceId: number;
    resolvedActions: RawAction[];
    flowName: string;
}

export class ExecutionController {
    private _ctx: ExecutionControllerContext;
    private _flowRenderer: FlowRenderer;
    private _queue: SerialExecutionQueue;
    private _idlePollMs: number;
    private _currentFlowName: string | null = null;
    private _lastManualFlowName: string | null = null;
    private _lastManualActions: RawAction[] | null = null;

    constructor(
        ctx: ExecutionControllerContext,
        flowRenderer: FlowRenderer,
        queue: SerialExecutionQueue = new SerialExecutionQueue(),
        idlePollMs: number = 500
    ) {
        this._ctx = ctx;
        this._flowRenderer = flowRenderer;
        this._queue = queue;
        this._idlePollMs = idlePollMs;
    }

    get isRunning(): boolean { return this._ctx.flowExecutor.isRunning; }
    get isStopping(): boolean { return this._ctx.flowExecutor.state === FlowExecutionState.STOPPING; }
    get currentFlowName(): string | null { return this._currentFlowName; }

    setGlobalButtonState(): void {
        const btn = document.querySelector('[data-action="toggle-global-execution"]') as HTMLButtonElement | null;
        if (!btn) return;
        if (this.isRunning || this.isStopping) {
            btn.textContent = '⏹ Parar';
            btn.className = 'btn btn-danger btn-sm';
        } else {
            btn.textContent = '▶ Iniciar';
            btn.className = 'btn btn-success btn-sm';
        }
    }

    async executeFlow(flowName: string, rawActions: RawAction[]): Promise<void> {
        if (this._ctx.flowExecutor.isRunning) {
            Toast.warning('Ja existe uma execucao em andamento!');
            return;
        }

        this._lastManualFlowName = flowName;
        this._lastManualActions = rawActions;
        this.setGlobalButtonState();
        await this._runFlow(flowName, rawActions, null, null);
    }

    async start(): Promise<void> {
        if (this.isRunning || this.isStopping) {
            Toast.warning('Ja existe uma execucao em andamento!');
            return;
        }
        if (!this._lastManualFlowName || !this._lastManualActions) {
            Toast.warning('Nenhum fluxo manual foi executado ainda. Escolha um fluxo e clique em Executar.');
            return;
        }
        this.setGlobalButtonState();
        await this._runFlow(this._lastManualFlowName, this._lastManualActions, null, null);
    }

    async _runFlow(
        flowName: string,
        rawActions: RawAction[],
        scheduleId: string | null,
        instanceId: number | null
    ): Promise<void> {
        const flow = new Flow(flowName, rawActions);
        this._currentFlowName = flowName;

        try {
            this._flowRenderer.setRunning(flowName, true);
            await this._ctx.flowExecutor.execute(flow, this._ctx.varConfig,
                (i) => this._flowRenderer.highlightAction(flowName, i, true),
                (i) => this._flowRenderer.highlightAction(flowName, i, false)
            );
            Toast.success(`Fluxo "${flowName}" concluido!`);
        } catch (err: any) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                if (scheduleId != null && instanceId != null) {
                    await this._ctx.statusSink.updateInstanceStatus(scheduleId, instanceId, 'cancelled');
                }
                Toast.warning(`Execucao "${flowName}" interrompida.`);
            } else {
                if (scheduleId != null && instanceId != null) {
                    await this._ctx.statusSink.updateInstanceStatus(scheduleId, instanceId, 'failed');
                }
                Toast.error(`Erro ao executar "${flowName}": ${err.message}`);
            }
        } finally {
            this._flowRenderer.setRunning(flowName, false);
            this._flowRenderer.clearHighlights(flowName);
            this._currentFlowName = null;
            this.setGlobalButtonState();
        }
    }

    stop(): void {
        this._ctx.flowExecutor.stop();
        if (this._currentFlowName) {
            this._flowRenderer.setRunning(this._currentFlowName, false);
            this._flowRenderer.clearHighlights(this._currentFlowName);
        }
        this._queue.clear();
        this.setGlobalButtonState();
        Toast.warning('Parando execucao e cancelando fila de agendamentos...');
    }

    executeScheduledInstance(payload: ScheduledPayload): Promise<void> {
        const { scheduleId, instanceId, resolvedActions, flowName } = payload;

        return new Promise<void>((resolve) => {
            this._queue.push(async () => {
                try {
                    await this._waitForIdle();
                    this._currentFlowName = flowName;
                    await this._ctx.flowExecutor.executeActions(resolvedActions);
                    await this._ctx.statusSink.updateInstanceStatus(scheduleId, instanceId, 'completed');
                    Toast.success(`${flowName} #${instanceId} concluido!`);
                } catch (err) {
                    const isAbort = err instanceof DOMException && err.name === 'AbortError';
                    await this._ctx.statusSink.updateInstanceStatus(scheduleId, instanceId, isAbort ? 'cancelled' : 'failed');
                    if (!isAbort) {
                        Toast.error(`${flowName} #${instanceId} falhou!`);
                    }
                } finally {
                    this._currentFlowName = null;
                    resolve();
                }
            });
        });
    }

    private _waitForIdle(): Promise<void> {
        return new Promise((resolve) => {
            const check = (): void => {
                if (!this._ctx.flowExecutor.isRunning) {
                    resolve();
                    return;
                }
                setTimeout(check, this._idlePollMs);
            };
            check();
        });
    }
}
