import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlowManager } from '../use-cases/FlowManager';
import { Flow } from '../domain/Flow';
import { IFlowRepository } from '../adapters/IFlowRepository';
import { IEventBus, Events } from '../adapters/IEventBus';
import { IUndoManager } from '../adapters/IUndoManager';
import { ConflictError, NotFoundError } from '../domain/errors';

function createMockRepo(): IFlowRepository {
    const flows = new Map<string, Flow>();
    return {
        findAll: vi.fn(async () => Array.from(flows.values())),
        findByName: vi.fn(async (name: string) => flows.get(name) || null),
        save: vi.fn(async (flow: Flow) => { flows.set(flow.name, flow); return flow; }),
        saveAll: vi.fn(async (all: Flow[]) => { all.forEach(f => flows.set(f.name, f)); }),
        delete: vi.fn(async (name: string) => { flows.delete(name); }),
        rename: vi.fn(async (oldName: string, newName: string) => {
            const f = flows.get(oldName);
            if (f) { flows.delete(oldName); f.rename(newName); flows.set(newName, f); }
        }),
    } as any;
}

function createMockUndo(): IUndoManager {
    return {
        canUndo: true, canRedo: false,
        undoDescription: null, redoDescription: null,
        execute: vi.fn(async (action: any) => { await action.redo(); }),
        undo: vi.fn(async () => null),
        redo: vi.fn(async () => null),
        clear: vi.fn(),
    };
}

function createMockEventBus(): IEventBus {
    return {
        on: vi.fn(() => () => {}),
        off: vi.fn(),
        once: vi.fn(),
        emit: vi.fn(),
        clear: vi.fn(),
    };
}

describe('FlowManager', () => {
    let repo: IFlowRepository;
    let undo: IUndoManager;
    let eventBus: IEventBus;
    let manager: FlowManager;

    beforeEach(() => {
        repo = createMockRepo();
        undo = createMockUndo();
        eventBus = createMockEventBus();
        manager = new FlowManager(repo, undo, eventBus);
    });

    describe('createFlow', () => {
        it('creates a new flow', async () => {
            const flow = await manager.createFlow('my-flow');
            expect(flow.name).toBe('my-flow');
            expect(repo.save).toHaveBeenCalled();
            expect(undo.execute).toHaveBeenCalled();
            expect(eventBus.emit).toHaveBeenCalledWith(Events.FLOW_CREATED, expect.any(Object));
        });

        it('throws ConflictError if flow already exists', async () => {
            await manager.createFlow('existing');
            await expect(manager.createFlow('existing')).rejects.toThrow(ConflictError);
        });
    });

    describe('renameFlow', () => {
        it('renames a flow', async () => {
            await manager.createFlow('old-name');
            await manager.renameFlow('old-name', 'new-name');
            expect(repo.rename).toHaveBeenCalledWith('old-name', 'new-name');
            expect(eventBus.emit).toHaveBeenCalledWith(Events.FLOW_RENAMED, expect.any(Object));
        });

        it('throws NotFoundError if flow does not exist', async () => {
            await expect(manager.renameFlow('ghost', 'new')).rejects.toThrow(NotFoundError);
        });

        it('throws ConflictError if new name already exists', async () => {
            await manager.createFlow('flow-a');
            await manager.createFlow('flow-b');
            await expect(manager.renameFlow('flow-a', 'flow-b')).rejects.toThrow(ConflictError);
        });
    });

    describe('deleteFlow', () => {
        it('deletes a flow', async () => {
            await manager.createFlow('to-delete');
            await manager.deleteFlow('to-delete');
            expect(repo.delete).toHaveBeenCalledWith('to-delete');
            expect(eventBus.emit).toHaveBeenCalledWith(Events.FLOW_DELETED, expect.any(Object));
        });

        it('throws NotFoundError if flow does not exist', async () => {
            await expect(manager.deleteFlow('ghost')).rejects.toThrow(NotFoundError);
        });
    });

    describe('addAction', () => {
        it('adds an action to a flow', async () => {
            await manager.createFlow('my-flow');
            await manager.addAction('my-flow', 'enter');
            expect(repo.save).toHaveBeenCalled();
            expect(eventBus.emit).toHaveBeenCalledWith(Events.FLOW_ACTION_ADDED, expect.any(Object));
        });

        it('throws NotFoundError if flow does not exist', async () => {
            await expect(manager.addAction('ghost', 'enter')).rejects.toThrow(NotFoundError);
        });
    });

    describe('addActions', () => {
        it('adds multiple actions to a flow', async () => {
            await manager.createFlow('my-flow');
            await manager.addActions('my-flow', ['enter', 'click', 'wait']);
            expect(eventBus.emit).toHaveBeenCalledWith(Events.FLOW_UPDATED, expect.any(Object));
        });
    });

    describe('removeAction', () => {
        it('removes an action from a flow', async () => {
            await manager.createFlow('my-flow');
            await manager.addAction('my-flow', 'enter');
            await manager.addAction('my-flow', 'click');
            await manager.removeAction('my-flow', 0);
            expect(eventBus.emit).toHaveBeenCalledWith(Events.FLOW_ACTION_REMOVED, expect.any(Object));
        });

        it('throws NotFoundError if flow does not exist', async () => {
            await expect(manager.removeAction('ghost', 0)).rejects.toThrow(NotFoundError);
        });
    });

    describe('moveAction', () => {
        it('moves an action within a flow', async () => {
            await manager.createFlow('my-flow');
            await manager.addAction('my-flow', 'a');
            await manager.addAction('my-flow', 'b');
            await manager.moveAction('my-flow', 0, 1);
            expect(eventBus.emit).toHaveBeenCalledWith(Events.FLOW_ACTION_MOVED, expect.any(Object));
        });
    });

    describe('getAllFlows', () => {
        it('returns all flows', async () => {
            await manager.createFlow('f1');
            await manager.createFlow('f2');
            const flows = await manager.getAllFlows();
            expect(flows).toHaveLength(2);
        });
    });

    describe('getFlow', () => {
        it('returns a flow by name', async () => {
            await manager.createFlow('target');
            const flow = await manager.getFlow('target');
            expect(flow?.name).toBe('target');
        });

        it('returns null for non-existent flow', async () => {
            const flow = await manager.getFlow('ghost');
            expect(flow).toBeNull();
        });
    });

    describe('addActions - error cases', () => {
        it('throws NotFoundError when flow does not exist', async () => {
            await expect(manager.addActions('ghost', ['enter', 'click'])).rejects.toThrow(NotFoundError);
        });

        it('undo lambda removes added actions', async () => {
            await manager.createFlow('my-flow');
            await manager.addActions('my-flow', ['enter', 'click', 'wait']);

            const undoCall = vi.mocked(undo.execute).mock.calls[1][0];
            await undoCall.undo();

            const flow = await repo.findByName('my-flow');
            expect(flow).not.toBeNull();
            expect(flow!.actions).toHaveLength(0);
        });
    });

    describe('removeAction - error cases', () => {
        it('throws ValidationError when index is out of range', async () => {
            await manager.createFlow('my-flow');
            const { ValidationError } = await import('../domain/errors');
            await expect(manager.removeAction('my-flow', 5)).rejects.toThrow(ValidationError);
        });
    });

    describe('moveAction - error cases', () => {
        it('throws NotFoundError when flow does not exist', async () => {
            await expect(manager.moveAction('ghost', 0, 1)).rejects.toThrow(NotFoundError);
        });
    });

    describe('saveAllFlows', () => {
        it('saves all flows to the repository', async () => {
            await manager.createFlow('f1');
            await manager.createFlow('f2');
            vi.mocked(repo.saveAll).mockClear();
            const flows = await manager.getAllFlows();
            await manager.saveAllFlows(flows);
            expect(repo.saveAll).toHaveBeenCalledWith(flows);
        });
    });
});
