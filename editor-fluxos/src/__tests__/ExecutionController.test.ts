// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionController, ExecutionControllerContext } from '../ui/ExecutionController';
import { FlowExecutor } from '../use-cases/FlowExecutor';
import { FlowRenderer } from '../ui/FlowRenderer';
import { VariablePool, RawAction } from '../domain';

vi.mock('../ui/Toast', () => ({
    Toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

vi.mock('../ui/FlowRenderer', () => {
    return {
        FlowRenderer: class MockFlowRenderer {
            setRunning = vi.fn();
            highlightAction = vi.fn();
            clearHighlights = vi.fn();
        },
    };
});

function createMockCtx(overrides: Partial<ExecutionControllerContext> = {}): ExecutionControllerContext {
    return {
        flowExecutor: {
            isRunning: false,
            execute: vi.fn().mockResolvedValue(undefined),
            executeActions: vi.fn().mockResolvedValue(undefined),
        } as unknown as FlowExecutor,
        varConfig: new VariablePool(),
        statusSink: {
            updateInstanceStatus: vi.fn().mockResolvedValue(undefined),
        },
        ...overrides,
    };
}

describe('ExecutionController', () => {
    let ctx: ExecutionControllerContext;
    let renderer: FlowRenderer;
    let ctrl: ExecutionController;

    beforeEach(() => {
        vi.clearAllMocks();
        ctx = createMockCtx();
        renderer = new FlowRenderer();
        ctrl = new ExecutionController(ctx, renderer);
    });

    it('executeFlow calls executor with flow', async () => {
        const actions: RawAction[] = ['enter', { delay: 100 }];

        await ctrl.executeFlow('test-flow', actions);

        expect(ctx.flowExecutor.execute).toHaveBeenCalled();
        expect(renderer.setRunning).toHaveBeenCalledWith('test-flow', true);
        expect(renderer.setRunning).toHaveBeenCalledWith('test-flow', false);
    });

    it('executeFlow does nothing if already running', async () => {
        (ctx.flowExecutor as any).isRunning = true;

        await ctrl.executeFlow('test-flow', []);

        expect(ctx.flowExecutor.execute).not.toHaveBeenCalled();
    });

    it('executeFlow clears highlights in finally', async () => {
        await ctrl.executeFlow('flow', ['a']);

        expect(renderer.clearHighlights).toHaveBeenCalledWith('flow');
    });

    it('executeFlow handles errors', async () => {
        vi.mocked(ctx.flowExecutor.execute).mockRejectedValue(new Error('boom'));

        await ctrl.executeFlow('flow', ['a']);

        const { Toast } = await import('../ui/Toast');
        expect(Toast.error).toHaveBeenCalled();
        expect(renderer.setRunning).toHaveBeenCalledWith('flow', false);
    });

    it('executeScheduledInstance calls statusSink on success', async () => {
        await ctrl.executeScheduledInstance({
            scheduleId: 's1',
            instanceId: 1,
            resolvedActions: ['a'],
            flowName: 'flow1',
        });

        expect(ctx.flowExecutor.executeActions).toHaveBeenCalledWith(['a']);
        expect(ctx.statusSink.updateInstanceStatus).toHaveBeenCalledWith('s1', 1, 'completed');
    });

    it('executeScheduledInstance calls statusSink with failed on error', async () => {
        vi.mocked(ctx.flowExecutor.executeActions).mockRejectedValue(new Error('fail'));

        await ctrl.executeScheduledInstance({
            scheduleId: 's1',
            instanceId: 2,
            resolvedActions: ['a'],
            flowName: 'flow1',
        });

        expect(ctx.statusSink.updateInstanceStatus).toHaveBeenCalledWith('s1', 2, 'failed');
    });
});
