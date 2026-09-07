// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlowController, FlowControllerContext } from '../ui/FlowController';
import { FlowManager } from '../use-cases/FlowManager';
import { RawAction } from '../domain';

vi.mock('../ui/modals/modalPrompt', () => ({
    modalPrompt: vi.fn(),
}));

vi.mock('../ui/Toast', () => ({
    Toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

function createMockCtx(overrides: Partial<FlowControllerContext> = {}): FlowControllerContext {
    return {
        flowManager: {
            createFlow: vi.fn().mockResolvedValue(undefined),
            deleteFlow: vi.fn().mockResolvedValue(undefined),
            renameFlow: vi.fn().mockResolvedValue(undefined),
            removeAction: vi.fn().mockResolvedValue(undefined),
            moveAction: vi.fn().mockResolvedValue(undefined),
        } as unknown as FlowManager,
        fluxosCache: {},
        refreshCache: vi.fn().mockResolvedValue(undefined),
        renderAll: vi.fn().mockResolvedValue(undefined),
        recordingOpen: vi.fn(),
        executeFlow: vi.fn(),
        ...overrides,
    };
}

describe('FlowController', () => {
    let ctx: FlowControllerContext;
    let ctrl: FlowController;

    beforeEach(() => {
        vi.clearAllMocks();
        ctx = createMockCtx();
        ctrl = new FlowController(ctx);
    });

    it('addNew creates flow and renders', async () => {
        const { modalPrompt } = await import('../ui/modals/modalPrompt');
        vi.mocked(modalPrompt).mockResolvedValue('my-flow');

        await ctrl.addNew();

        expect(ctx.flowManager.createFlow).toHaveBeenCalledWith('my-flow');
        expect(ctx.renderAll).toHaveBeenCalled();
    });

    it('addNew does nothing if modal cancelled', async () => {
        const { modalPrompt } = await import('../ui/modals/modalPrompt');
        vi.mocked(modalPrompt).mockResolvedValue(null);

        await ctrl.addNew();

        expect(ctx.flowManager.createFlow).not.toHaveBeenCalled();
    });

    it('remove deletes flow after confirm', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        await ctrl.remove('old-flow');

        expect(ctx.flowManager.deleteFlow).toHaveBeenCalledWith('old-flow');
        expect(ctx.renderAll).toHaveBeenCalled();
    });

    it('remove does nothing if not confirmed', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);

        await ctrl.remove('old-flow');

        expect(ctx.flowManager.deleteFlow).not.toHaveBeenCalled();
    });

    it('rename trims and calls renameFlow', async () => {
        await ctrl.rename('old', '  new  ');

        expect(ctx.flowManager.renameFlow).toHaveBeenCalledWith('old', 'new');
        expect(ctx.renderAll).toHaveBeenCalled();
    });

    it('rename does nothing if newName empty', async () => {
        await ctrl.rename('old', '   ');

        expect(ctx.flowManager.renameFlow).not.toHaveBeenCalled();
    });

    it('rename does nothing if same name', async () => {
        await ctrl.rename('same', 'same');

        expect(ctx.flowManager.renameFlow).not.toHaveBeenCalled();
    });

    it('removeAction calls flowManager.removeAction', async () => {
        await ctrl.removeAction('flow1', 2);

        expect(ctx.flowManager.removeAction).toHaveBeenCalledWith('flow1', 2);
        expect(ctx.renderAll).toHaveBeenCalled();
    });

    it('moveAction calls flowManager.moveAction', async () => {
        await ctrl.moveAction('flow1', 0, 3);

        expect(ctx.flowManager.moveAction).toHaveBeenCalledWith('flow1', 0, 3);
        expect(ctx.renderAll).toHaveBeenCalled();
    });

    it('renderAllCallbacks returns all callback functions', () => {
        const callbacks = ctrl.renderAllCallbacks();

        expect(callbacks.onRecord).toBeTypeOf('function');
        expect(callbacks.onExecute).toBeTypeOf('function');
        expect(callbacks.onRemove).toBeTypeOf('function');
        expect(callbacks.onRename).toBeTypeOf('function');
        expect(callbacks.onRemoveAction).toBeTypeOf('function');
        expect(callbacks.onMoveAction).toBeTypeOf('function');
    });

    it('renderAllCallbacks.onRecord calls recordingOpen', () => {
        const callbacks = ctrl.renderAllCallbacks();
        callbacks.onRecord('test-flow');

        expect(ctx.recordingOpen).toHaveBeenCalledWith('test-flow');
    });

    it('renderAllCallbacks.onExecute calls executeFlow', () => {
        const actions: RawAction[] = ['a', 'b'];
        const callbacks = ctrl.renderAllCallbacks();
        callbacks.onExecute('flow1', actions);

        expect(ctx.executeFlow).toHaveBeenCalledWith('flow1', actions);
    });
});
