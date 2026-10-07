import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlowExecutor, ActionError, TimingPolicy } from '../use-cases/FlowExecutor';
import { Flow } from '../domain/Flow';
import { VariablePool } from '../domain/VariablePool';
import { IActionExecutor } from '../adapters/IActionExecutor';

function createMockExecutor(): IActionExecutor {
    return {
        execute: vi.fn(async () => {}),
    };
}

function createNoOpTimingPolicy(): TimingPolicy {
    return {
        waitForInteractionGap: vi.fn(async () => {}),
        waitForFlowGap: vi.fn(async () => {}),
        markInteraction: vi.fn(),
        markFlowStarted: vi.fn(),
        markFlowFinished: vi.fn(),
    };
}

describe('FlowExecutor', () => {
    let executor: IActionExecutor;
    let timingPolicy: TimingPolicy;
    let flowExecutor: FlowExecutor;

    beforeEach(() => {
        executor = createMockExecutor();
        timingPolicy = createNoOpTimingPolicy();
        flowExecutor = new FlowExecutor(executor, timingPolicy);
    });

    it('executes all actions in a flow', async () => {
        const flow = new Flow('test', ['a', 'b', 'c']);
        const pool = new VariablePool();
        await flowExecutor.execute(flow, pool);
        expect(executor.execute).toHaveBeenCalledTimes(3);
        expect(timingPolicy.markFlowStarted).toHaveBeenCalled();
        expect(timingPolicy.markFlowFinished).toHaveBeenCalled();
    });

    it('calls onActionStart and onActionEnd callbacks', async () => {
        const flow = new Flow('test', ['a', 'b']);
        const pool = new VariablePool();
        const starts: number[] = [];
        const ends: number[] = [];
        await flowExecutor.execute(flow, pool,
            (i) => starts.push(i),
            (i) => ends.push(i)
        );
        expect(starts).toEqual([0, 1]);
        expect(ends).toEqual([0, 1]);
    });

    it('throws ExecutionError when already running', async () => {
        const flow = new Flow('test', ['a']);
        const pool = new VariablePool();
        let resolve: () => void;
        const promise = new Promise<void>(r => { resolve = r; });
        (executor.execute as any).mockReturnValueOnce(promise);

        const p = flowExecutor.execute(flow, pool);
        await expect(flowExecutor.execute(flow, pool)).rejects.toThrow('Already executing');
        resolve!();
        await p;
    });

    it('isRunning is true during execution', async () => {
        expect(flowExecutor.isRunning).toBe(false);
        const flow = new Flow('test', ['a']);
        const pool = new VariablePool();
        let resolveExec: () => void;
        (executor.execute as any).mockReturnValueOnce(new Promise<void>(r => { resolveExec = r; }));

        const p = flowExecutor.execute(flow, pool);
        expect(flowExecutor.isRunning).toBe(true);
        resolveExec!();
        await p;
        expect(flowExecutor.isRunning).toBe(false);
    });

    it('stop() halts execution', async () => {
        const flow = new Flow('test', ['a', 'b', 'c', 'd']);
        const pool = new VariablePool();
        let callCount = 0;
        (executor.execute as any).mockImplementation(async () => {
            callCount++;
            if (callCount === 2) flowExecutor.stop();
        });
        await flowExecutor.execute(flow, pool);
        expect(executor.execute).toHaveBeenCalledTimes(2);
    });

    it('calls onActionError when action fails and callback provided', async () => {
        const flow = new Flow('test', ['a', 'b']);
        const pool = new VariablePool();
        (executor.execute as any).mockRejectedValueOnce(new Error('fail'));
        const errors: ActionError[] = [];
        await flowExecutor.execute(flow, pool, undefined, undefined, (e) => errors.push(e));
        expect(errors).toHaveLength(1);
        expect(errors[0].error.message).toBe('fail');
        expect(errors[0].index).toBe(0);
    });

    it('throws action error when no callback provided', async () => {
        const flow = new Flow('test', ['a']);
        const pool = new VariablePool();
        (executor.execute as any).mockRejectedValueOnce(new Error('boom'));
        await expect(flowExecutor.execute(flow, pool)).rejects.toThrow('boom');
    });

    it('resolves ITEM_OBRIGATORIO from variable pool', async () => {
        const flow = new Flow('test', ['ITEM_OBRIGATORIO', 'click']);
        const pool = new VariablePool();
        pool.addObrigatorio('item', 'resolved_value');
        await flowExecutor.execute(flow, pool);
        expect(executor.execute).toHaveBeenCalledWith('resolved_value', expect.any(AbortSignal));
        expect(executor.execute).toHaveBeenCalledWith('click', expect.any(AbortSignal));
    });

    it('executeActions works without Flow wrapper', async () => {
        await flowExecutor.executeActions(['x', 'y']);
        expect(executor.execute).toHaveBeenCalledTimes(2);
    });

    it('waits for interaction gap before each action', async () => {
        await flowExecutor.executeActions(['x', 'y']);
        expect(timingPolicy.waitForInteractionGap).toHaveBeenCalledTimes(2);
    });

    it('stops when timing policy throws AbortError', async () => {
        const policy: TimingPolicy = {
            ...createNoOpTimingPolicy(),
            waitForInteractionGap: vi.fn().mockRejectedValueOnce(new DOMException('Aborted', 'AbortError')),
        };
        const executor = createMockExecutor();
        const executorInstance = new FlowExecutor(executor, policy);
        await executorInstance.executeActions(['x', 'y', 'z']);
        expect(executor.execute).not.toHaveBeenCalled();
    });
});
