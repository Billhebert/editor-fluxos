import { Flow } from '../domain/Flow';
import { Action } from '../domain/Action';
import { RawAction } from '../domain/types';
import { ConflictError, NotFoundError, ValidationError } from '../domain/errors';
import { IFlowRepository } from '../adapters/IFlowRepository';
import { IEventBus, Events } from '../adapters/IEventBus';
import { IUndoManager, UndoableActionPort } from '../adapters/IUndoManager';

interface UndoSpec {
    type: string;
    description: string;
    do: () => Promise<void> | void;
    undo: () => Promise<void> | void;
    event: string;
    payload: any;
}

export class FlowManager {
    private _repo: IFlowRepository;
    private _undoManager: IUndoManager;
    private _eventBus: IEventBus;

    constructor(flowRepository: IFlowRepository, undoManager: IUndoManager, eventBus: IEventBus) {
        this._repo = flowRepository;
        this._undoManager = undoManager;
        this._eventBus = eventBus;
    }

    async getAllFlows(): Promise<Flow[]> {
        return this._repo.findAll();
    }

    async getFlow(name: string): Promise<Flow | null> {
        return this._repo.findByName(name);
    }

    async createFlow(name: string): Promise<Flow> {
        const existing = await this._repo.findByName(name);
        if (existing) throw new ConflictError(`Flow "${name}" already exists`);

        const flow = new Flow(name);
        await this._repo.save(flow);

        await this._executeWithUndo({
            type: 'flow:create',
            description: `Create flow "${name}"`,
            do: async () => { await this._repo.save(flow); },
            undo: async () => { await this._repo.delete(name); },
            event: Events.FLOW_CREATED,
            payload: { name, flow }
        });

        return flow;
    }

    async renameFlow(oldName: string, newName: string): Promise<void> {
        const existing = await this._repo.findByName(newName);
        if (existing) throw new ConflictError(`Flow "${newName}" already exists`);

        const flow = await this._repo.findByName(oldName);
        if (!flow) throw new NotFoundError('Flow', oldName);

        await this._executeWithUndo({
            type: 'flow:rename',
            description: `Rename flow "${oldName}" → "${newName}"`,
            do: async () => { await this._repo.rename(oldName, newName); },
            undo: async () => { await this._repo.rename(newName, oldName); },
            event: Events.FLOW_RENAMED,
            payload: { oldName, newName }
        });
    }

    async deleteFlow(name: string): Promise<void> {
        const flow = await this._repo.findByName(name);
        if (!flow) throw new NotFoundError('Flow', name);

        const cloned = flow.clone();

        await this._executeWithUndo({
            type: 'flow:delete',
            description: `Delete flow "${name}"`,
            do: async () => { await this._repo.delete(name); },
            undo: async () => { await this._repo.save(cloned); },
            event: Events.FLOW_DELETED,
            payload: { name }
        });
    }

    async addAction(flowName: string, rawAction: RawAction): Promise<void> {
        const flow = await this._repo.findByName(flowName);
        if (!flow) throw new NotFoundError('Flow', flowName);

        const action = Action.parse(rawAction);
        const raw = action.toRaw();

        const index = flow.length;
        await this._executeWithUndo({
            type: 'flow:action:add',
            description: `Add action to "${flowName}"`,
            do: async () => {
                const f = await this._repo.findByName(flowName);
                if (f) { f.addAction(raw); await this._repo.save(f); }
            },
            undo: async () => {
                const f = await this._repo.findByName(flowName);
                if (f && f.length > 0) { f.removeAction(f.length - 1); await this._repo.save(f); }
            },
            event: Events.FLOW_ACTION_ADDED,
            payload: { flowName, action: raw, index }
        });
    }

    async addActions(flowName: string, rawActions: RawAction[]): Promise<void> {
        const flow = await this._repo.findByName(flowName);
        if (!flow) throw new NotFoundError('Flow', flowName);

        const actions = rawActions.map(r => Action.parse(r).toRaw());

        await this._executeWithUndo({
            type: 'flow:actions:add',
            description: `Add ${actions.length} actions to "${flowName}"`,
            do: async () => {
                const f = await this._repo.findByName(flowName);
                if (f) { f.addActions(actions); await this._repo.save(f); }
            },
            undo: async () => {
                const f = await this._repo.findByName(flowName);
                if (f) {
                    for (let i = 0; i < actions.length; i++) {
                        f.removeAction(f.length - 1);
                    }
                    await this._repo.save(f);
                }
            },
            event: Events.FLOW_UPDATED,
            payload: { flowName }
        });
    }

    async removeAction(flowName: string, index: number): Promise<void> {
        const flow = await this._repo.findByName(flowName);
        if (!flow) throw new NotFoundError('Flow', flowName);

        const removed = flow.actions[index];
        if (removed === undefined) {
            throw new ValidationError('Flow.actionIndex', `index ${index} out of range [0, ${flow.length})`);
        }
        const removedJson = JSON.stringify(removed);

        await this._executeWithUndo({
            type: 'flow:action:remove',
            description: `Remove action from "${flowName}"`,
            do: async () => {
                const f = await this._repo.findByName(flowName);
                if (f) {
                    const idx = f.actions.findIndex(a => JSON.stringify(a) === removedJson);
                    if (idx >= 0) { f.removeAction(idx); await this._repo.save(f); }
                }
            },
            undo: async () => {
                const f = await this._repo.findByName(flowName);
                if (f) { f.insertAction(index, removed); await this._repo.save(f); }
            },
            event: Events.FLOW_ACTION_REMOVED,
            payload: { flowName, index }
        });
    }

    async moveAction(flowName: string, fromIndex: number, toIndex: number): Promise<void> {
        const flow = await this._repo.findByName(flowName);
        if (!flow) throw new NotFoundError('Flow', flowName);

        await this._executeWithUndo({
            type: 'flow:action:move',
            description: `Move action in "${flowName}"`,
            do: async () => {
                const f = await this._repo.findByName(flowName);
                if (f) { f.moveAction(fromIndex, toIndex); await this._repo.save(f); }
            },
            undo: async () => {
                const f = await this._repo.findByName(flowName);
                if (f) { f.moveAction(toIndex, fromIndex); await this._repo.save(f); }
            },
            event: Events.FLOW_ACTION_MOVED,
            payload: { flowName, fromIndex, toIndex }
        });
    }

    async saveAllFlows(flows: Flow[]): Promise<void> {
        return this._repo.saveAll(flows);
    }

    private async _executeWithUndo(spec: UndoSpec): Promise<void> {
        const action: UndoableActionPort = {
            type: spec.type,
            description: spec.description,
            undo: spec.undo,
            redo: spec.do
        };
        await this._undoManager.execute(action);
        this._eventBus.emit(spec.event, spec.payload);
    }
}
