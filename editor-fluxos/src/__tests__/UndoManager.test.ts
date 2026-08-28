import { describe, it, expect, vi } from 'vitest';
import { UndoManager, UndoableAction } from '../infrastructure/UndoManager';

describe('UndoManager', () => {
    it('starts with empty stacks', () => {
        const um = new UndoManager();
        expect(um.canUndo).toBe(false);
        expect(um.canRedo).toBe(false);
        expect(um.undoDescription).toBeNull();
        expect(um.redoDescription).toBeNull();
    });

    it('execute calls redo and pushes to undo stack', async () => {
        const um = new UndoManager();
        const redoFn = vi.fn();
        await um.execute({ type: 'test', description: 'test action', undo: vi.fn(), redo: redoFn });
        expect(redoFn).toHaveBeenCalled();
        expect(um.canUndo).toBe(true);
        expect(um.undoDescription).toBe('test action');
    });

    it('execute clears redo stack', async () => {
        const um = new UndoManager();
        const action: UndoableAction = { type: 'test', description: 'test', undo: vi.fn(), redo: vi.fn() };
        await um.execute(action);
        await um.undo();
        expect(um.canRedo).toBe(true);
        await um.execute(action);
        expect(um.canRedo).toBe(false);
    });

    it('undo calls undo and moves to redo stack', async () => {
        const um = new UndoManager();
        const undoFn = vi.fn();
        await um.execute({ type: 'test', description: 'test', undo: undoFn, redo: vi.fn() });
        const result = await um.undo();
        expect(undoFn).toHaveBeenCalled();
        expect(result?.description).toBe('test');
        expect(um.canRedo).toBe(true);
    });

    it('redo calls redo and moves to undo stack', async () => {
        const um = new UndoManager();
        const redoFn = vi.fn();
        await um.execute({ type: 'test', description: 'test', undo: vi.fn(), redo: redoFn });
        await um.undo();
        redoFn.mockClear();
        await um.redo();
        expect(redoFn).toHaveBeenCalled();
        expect(um.canUndo).toBe(true);
    });

    it('undo returns null when stack is empty', async () => {
        const um = new UndoManager();
        expect(await um.undo()).toBeNull();
    });

    it('redo returns null when stack is empty', async () => {
        const um = new UndoManager();
        expect(await um.redo()).toBeNull();
    });

    it('respects maxSize', async () => {
        const um = new UndoManager(3);
        for (let i = 0; i < 5; i++) {
            await um.execute({ type: 't', description: `action ${i}`, undo: vi.fn(), redo: vi.fn() });
        }
        expect(um.canUndo).toBe(true);
        // Only last 3 should be in undo stack
        let count = 0;
        while (um.canUndo) {
            await um.undo();
            count++;
        }
        expect(count).toBe(3);
    });

    it('clear resets both stacks', async () => {
        const um = new UndoManager();
        await um.execute({ type: 't', description: 'test', undo: vi.fn(), redo: vi.fn() });
        um.clear();
        expect(um.canUndo).toBe(false);
        expect(um.canRedo).toBe(false);
    });

    it('handles async undo/redo', async () => {
        const um = new UndoManager();
        const order: string[] = [];
        await um.execute({
            type: 'test',
            description: 'test',
            undo: async () => { order.push('undo'); },
            redo: async () => { order.push('redo'); }
        });
        await um.undo();
        await um.redo();
        expect(order).toEqual(['redo', 'undo', 'redo']);
    });

    it('handles undo error gracefully', async () => {
        const um = new UndoManager();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await um.execute({
            type: 't',
            description: 'test',
            undo: async () => { throw new Error('fail'); },
            redo: vi.fn()
        });
        await um.undo();
        consoleSpy.mockRestore();
        // Should still be in redo stack
        expect(um.canRedo).toBe(true);
    });
});
