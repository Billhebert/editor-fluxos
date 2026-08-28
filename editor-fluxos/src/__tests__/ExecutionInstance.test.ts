import { describe, it, expect } from 'vitest';
import { ExecutionInstance } from '../domain/ExecutionInstance';

describe('ExecutionInstance', () => {
    it('creates instance with pending status', () => {
        const inst = new ExecutionInstance(1, 1000, ['a', 'b']);
        expect(inst.id).toBe(1);
        expect(inst.gatilhoTime).toBe(1000);
        expect(inst.resolvedActions).toEqual(['a', 'b']);
        expect(inst.status).toBe('pending');
    });

    it('resolvedActions is copied in constructor', () => {
        const original = ['a', 'b'];
        const inst = new ExecutionInstance(1, 1000, original);
        original.push('c');
        expect(inst.resolvedActions).toHaveLength(2);
    });

    it('status getters work', () => {
        const inst = new ExecutionInstance(1, 1000, []);
        expect(inst.isPending).toBe(true);
        expect(inst.isRunning).toBe(false);
        expect(inst.isCompleted).toBe(false);
        expect(inst.isFailed).toBe(false);
    });

    it('isDue returns true when pending and time passed', () => {
        const inst = new ExecutionInstance(1, 100, []);
        expect(inst.isDue(200)).toBe(true);
        expect(inst.isDue(50)).toBe(false);
    });

    it('isDue returns false if not pending', () => {
        const inst = new ExecutionInstance(1, 100, [], 'completed');
        expect(inst.isDue(200)).toBe(false);
    });

    it('markRunning / markCompleted / markFailed', () => {
        const inst = new ExecutionInstance(1, 1000, []);
        inst.markRunning();
        expect(inst.status).toBe('running');
        expect(inst.isRunning).toBe(true);

        inst.markCompleted();
        expect(inst.status).toBe('completed');
        expect(inst.isCompleted).toBe(true);

        inst.markFailed();
        expect(inst.status).toBe('failed');
        expect(inst.isFailed).toBe(true);
    });

    it('updateTimestamp changes gatilhoTime', () => {
        const inst = new ExecutionInstance(1, 1000, []);
        inst.updateTimestamp(2000);
        expect(inst.gatilhoTime).toBe(2000);
    });

    it('toJSON / fromJSON round-trip', () => {
        const inst = new ExecutionInstance(1, 5000, ['a', { delay: 100 }], 'running');
        const json = inst.toJSON();
        const restored = ExecutionInstance.fromJSON(json);
        expect(restored.id).toBe(1);
        expect(restored.gatilhoTime).toBe(5000);
        expect(restored.resolvedActions).toEqual(['a', { delay: 100 }]);
        expect(restored.status).toBe('running');
    });

    it('fromJSON defaults to pending', () => {
        const inst = ExecutionInstance.fromJSON({ id: 1, gatilho_timeStamp: 100 });
        expect(inst.status).toBe('pending');
    });
});
