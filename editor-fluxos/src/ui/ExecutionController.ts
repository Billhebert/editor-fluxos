import { Flow, VariablePool, RawAction } from '../domain';
import { FlowExecutor } from '../use-cases/FlowExecutor';
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
    get currentFlowName(): string | null { return this._currentFlowName; }

    async executeFlow(flowName: string, rawActions: RawAction[]): Promise<void> {
        if (this._ctx.flowExecutor.isRunning) { alert('Ja existe uma execucao em andamento!'); return; }

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
            Toast.error(`Erro ao executar: ${err.message}`);
        } finally {
            this._flowRenderer.setRunning(flowName, false);
            this._flowRenderer.clearHighlights(flowName);
            this._currentFlowName = null;
        }
    }

    stop(): void {
        this._ctx.flowExecutor.stop();
        if (this._currentFlowName) {
            this._flowRenderer.setRunning(this._currentFlowName, false);
            this._flowRenderer.clearHighlights(this._currentFlowName);
        }
        Toast.warning('Execucao interrompida.');
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
                    await this._ctx.statusSink.updateInstanceStatus(scheduleId, instanceId, 'failed');
                    Toast.error(`${flowName} #${instanceId} falhou!`);
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
