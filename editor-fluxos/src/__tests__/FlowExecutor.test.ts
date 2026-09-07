import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlowExecutor, ActionError } from '../use-cases/FlowExecutor';
import { Flow } from '../domain/Flow';
import { VariablePool } from '../domain/VariablePool';
import { IActionExecutor } from '../adapters/IActionExecutor';

function createMockExecutor(): IActionExecutor {
    return {
        execute: vi.fn(async () => {}),
    };
}

describe('FlowExecutor', () => {
    let executor: IActionExecutor;
    let flowExecutor: FlowExecutor;

    beforeEach(() => {
        executor = createMockExecutor();
        flowExecutor = new FlowExecutor(executor);
    });

    it('executes all actions in a flow', async () => {
        const flow = new Flow('test', ['a', 'b', 'c']);
        const pool = new VariablePool();
        await flowExecutor.execute(flow, pool);
        expect(executor.execute).toHaveBeenCalledTimes(3);
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
        expect(executor.execute).toHaveBeenCalledWith('resolved_value');
        expect(executor.execute).toHaveBeenCalledWith('click');
    });

    it('executeActions works without Flow wrapper', async () => {
        await flowExecutor.executeActions(['x', 'y']);
        expect(executor.execute).toHaveBeenCalledTimes(2);
    });
});
