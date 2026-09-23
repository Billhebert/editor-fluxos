import { describe, it, expect, vi } from 'vitest';
import { SerialExecutionQueue } from '../use-cases/SerialExecutionQueue';

const settle = () => new Promise(r => setTimeout(r, 50));

describe('SerialExecutionQueue', () => {
    it('executa tarefas na ordem (FIFO) e em sequencia', async () => {
        const queue = new SerialExecutionQueue();
        const order: string[] = [];

        queue.push(async () => { order.push('a'); await settle(); order.push('a-done'); });
        queue.push(async () => { order.push('b'); await settle(); order.push('b-done'); });
        queue.push(async () => { order.push('c'); await settle(); order.push('c-done'); });

        await vi.waitFor(() => expect(order.filter(x => x.endsWith('-done')).length).toBe(3));

        expect(order).toEqual(['a', 'a-done', 'b', 'b-done', 'c', 'c-done']);
        expect(queue.size).toBe(0);
        expect(queue.isProcessing).toBe(false);
    });

    it('reintenta quando retryWhen casa (busy) ate ter sucesso', async () => {
        let attempts = 0;
        const queue = new SerialExecutionQueue({
            retryWhen: (err) => (err as Error).message === 'busy',
            retryDelayMs: 10,
            maxRetries: 5,
        });

        const task = vi.fn(async () => {
            attempts++;
            if (attempts < 3) throw new Error('busy');
        });

        queue.push(task);
        await vi.waitFor(() => expect(attempts).toBe(3));
        expect(task).toHaveBeenCalledTimes(3);
    });

    it('exaure retries e chama onTaskError, continuando as demais tarefas', async () => {
        const onTaskError = vi.fn();
        const queue = new SerialExecutionQueue({
            retryWhen: () => true,
            retryDelayMs: 5,
            maxRetries: 1,
            onTaskError,
        });

        const order: string[] = [];
        queue.push(async () => { throw new Error('boom'); });
        queue.push(async () => { order.push('second'); });

        await vi.waitFor(() => expect(onTaskError).toHaveBeenCalledTimes(1));
        await vi.waitFor(() => expect(order).toContain('second'));
    });

    it('nao reinicia processamento concorrente ao empurrar durante a execucao', async () => {
        const queue = new SerialExecutionQueue();
        const order: string[] = [];

        queue.push(async () => { order.push('1'); await settle(); });
        queue.push(async () => { order.push('2'); await settle(); });

        await vi.waitFor(() => expect(order).toEqual(['1', '2']));
    });
});