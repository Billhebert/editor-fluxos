import { Flow } from '../domain/Flow';
import { IActionExecutor } from '../adapters/IActionExecutor';
import { VariablePool } from '../domain/VariablePool';
import { VariableResolver } from './VariableResolver';
import { RawAction } from '../domain/types';
import { ExecutionError } from '../domain/errors';

export interface ActionError {
    index: number;
    action: RawAction;
    error: Error;
}

export class FlowExecutor {
    private _executor: IActionExecutor;
    private _resolverFactory: (pool: VariablePool) => VariableResolver;
    private _isRunning: boolean = false;
    private _shouldStop: boolean = false;

    constructor(
        actionExecutor: IActionExecutor,
        resolverFactory?: (pool: VariablePool) => VariableResolver
    ) {
        this._executor = actionExecutor;
        this._resolverFactory = resolverFactory || ((pool) => new VariableResolver(pool));
    }

    get isRunning(): boolean { return this._isRunning; }

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
        if (this._isRunning) throw new ExecutionError('Already executing');

        this._isRunning = true;
        this._shouldStop = false;

        try {
            for (let i = 0; i < actions.length; i++) {
                if (this._shouldStop) break;

                const raw = actions[i];
                if (onActionStart) onActionStart(i, raw);

                try {
                    await this._executor.execute(raw);
                } catch (err) {
                    const actionErr: ActionError = { index: i, action: raw, error: err as Error };
                    if (onActionError) {
                        onActionError(actionErr);
                    } else {
                        throw err;
                    }
                }

                if (onActionEnd) onActionEnd(i, raw);
            }
        } finally {
            this._isRunning = false;
            this._shouldStop = false;
        }
    }

    stop(): void {
        this._shouldStop = true;
    }
}
