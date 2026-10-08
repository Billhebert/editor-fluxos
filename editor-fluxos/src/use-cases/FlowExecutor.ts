import { IActionExecutor } from '../adapters/IActionExecutor';
import { IImageRecognizer, ImageSearchOptions } from '../adapters/IImageRecognizer';
import { Flow } from '../domain/Flow';
import { VariablePool } from '../domain/VariablePool';
import { VariableResolver } from './VariableResolver';
import { RawAction, ClickImageAction, IfImageAction } from '../domain/types';
import { ExecutionError } from '../domain/errors';

export interface ActionError {
    index: number;
    action: RawAction;
    error: Error;
}

export interface TimingPolicy {
    waitForInteractionGap(signal?: AbortSignal): Promise<void>;
    waitForFlowGap(signal?: AbortSignal): Promise<void>;
    markInteraction(): void;
    markFlowStarted(): void;
    markFlowFinished(): void;
}

export enum FlowExecutionState {
    IDLE = 'idle',
    RUNNING = 'running',
    STOPPING = 'stopping',
}

export class FlowExecutor {
    private _executor: IActionExecutor;
    private _imageRecognizer: IImageRecognizer | null;
    private _resolverFactory: (pool: VariablePool) => VariableResolver;
    private _timingPolicy: TimingPolicy;
    private _state: FlowExecutionState = FlowExecutionState.IDLE;
    private _abortController: AbortController | null = null;

    constructor(
        actionExecutor: IActionExecutor,
        timingPolicy: TimingPolicy,
        imageRecognizer?: IImageRecognizer,
        resolverFactory?: (pool: VariablePool) => VariableResolver
    ) {
        this._executor = actionExecutor;
        this._timingPolicy = timingPolicy;
        this._imageRecognizer = imageRecognizer || null;
        this._resolverFactory = resolverFactory || ((pool) => new VariableResolver(pool));
    }

    get isRunning(): boolean { return this._state === FlowExecutionState.RUNNING; }
    get state(): FlowExecutionState { return this._state; }

    async execute(
        flow: Flow,
        variablePool: VariablePool,
        onActionStart?: (index: number, action: RawAction) => void,
        onActionEnd?: (index: number, action: RawAction) => void,
        onActionError?: (err: ActionError) => void
    ): Promise<void> {
        const resolver = this._resolverFactory(variablePool);
        const resolvedActions = resolver.resolveForRuntime(flow.actions);
        return this.executeActions(resolvedActions, onActionStart, onActionEnd, onActionError);
    }

    async executeActions(
        actions: ReadonlyArray<RawAction>,
        onActionStart?: (index: number, action: RawAction) => void,
        onActionEnd?: (index: number, action: RawAction) => void,
        onActionError?: (err: ActionError) => void
    ): Promise<void> {
        if (this.isRunning) throw new ExecutionError('Already executing');

        this._state = FlowExecutionState.RUNNING;
        this._abortController = new AbortController();
        const signal = this._abortController.signal;

        try {
            await this._timingPolicy.waitForFlowGap(signal);
            this._timingPolicy.markFlowStarted();

            await this._runActions(actions, signal, onActionStart, onActionEnd, onActionError);
        } finally {
            this._state = FlowExecutionState.IDLE;
            this._timingPolicy.markFlowFinished();
            this._abortController = null;
        }
    }

    private async _runActions(
        actions: ReadonlyArray<RawAction>,
        signal: AbortSignal,
        onActionStart?: (index: number, action: RawAction) => void,
        onActionEnd?: (index: number, action: RawAction) => void,
        onActionError?: (err: ActionError) => void,
        depth: number = 0
    ): Promise<void> {
        for (let i = 0; i < actions.length; i++) {
            if (signal.aborted) break;

            const raw = actions[i];

            if (this._isIfImageAction(raw)) {
                const match = await this._findImageCenter(raw, signal);
                const branch = match ? raw.then : raw.else;
                await this._runActions(branch, signal, onActionStart, onActionEnd, onActionError, depth + 1);
                continue;
            }

            if (onActionStart) onActionStart(depth === 0 ? i : -1, raw);

            try {
                await this._timingPolicy.waitForInteractionGap(signal);

                if (this._isClickImageAction(raw)) {
                    const match = await this._findImageCenter(raw, signal);
                    if (match) {
                        await this._executor.execute({ type: 'mouse', mouse: 'click', x: match.x, y: match.y }, signal);
                        this._timingPolicy.markInteraction();
                    }
                } else {
                    await this._executor.execute(raw, signal);
                    this._timingPolicy.markInteraction();
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') break;
                const actionErr: ActionError = { index: depth === 0 ? i : -1, action: raw, error: err as Error };
                if (onActionError) {
                    onActionError(actionErr);
                } else {
                    throw err;
                }
            }

            if (onActionEnd) onActionEnd(depth === 0 ? i : -1, raw);
        }
    }

    private _isIfImageAction(raw: RawAction): raw is IfImageAction {
        return typeof raw === 'object' && raw !== null && 'type' in raw && raw.type === 'if-image';
    }

    private _isClickImageAction(raw: RawAction): raw is ClickImageAction {
        return typeof raw === 'object' && raw !== null && 'type' in raw && raw.type === 'click-image';
    }

    private async _findImageCenter(raw: ClickImageAction | IfImageAction, signal: AbortSignal): Promise<{ x: number; y: number } | null> {
        if (!this._imageRecognizer) return null;
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const options: ImageSearchOptions = {
            assetId: raw.assetId,
            confidence: raw.confidence,
            timeout: raw.timeout,
        };
        const match = await this._imageRecognizer.findImage(options, signal);
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (!match) return null;
        return {
            x: match.x + Math.round(match.width / 2),
            y: match.y + Math.round(match.height / 2),
        };
    }

    stop(): void {
        if (this._state === FlowExecutionState.RUNNING) {
            this._state = FlowExecutionState.STOPPING;
        }
        this._abortController?.abort();
    }
}
