import { IUndoManager, UndoableActionPort } from '../adapters/IUndoManager';

export type { UndoableActionPort as UndoableAction };

export class UndoManager implements IUndoManager {
    private undoStack: UndoableActionPort[] = [];
    private redoStack: UndoableActionPort[] = [];
    private maxSize: number;

    constructor(maxSize: number = 50) {
        this.maxSize = maxSize;
    }

    get canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    get undoDescription(): string | null {
        return this.canUndo ? this.undoStack[this.undoStack.length - 1].description : null;
    }

    get redoDescription(): string | null {
        return this.canRedo ? this.redoStack[this.redoStack.length - 1].description : null;
    }

    async execute(action: UndoableActionPort): Promise<void> {
        await action.redo();
        this.undoStack.push(action);
        this.redoStack = [];

        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
    }

    async undo(): Promise<UndoableActionPort | null> {
        if (!this.canUndo) return null;
        const action = this.undoStack.pop()!;
        try {
            await action.undo();
        } catch (err) {
            console.error(`Undo failed for "${action.description}":`, err);
        }
        this.redoStack.push(action);
        return action;
    }

    async redo(): Promise<UndoableActionPort | null> {
        if (!this.canRedo) return null;
        const action = this.redoStack.pop()!;
        try {
            await action.redo();
        } catch (err) {
            console.error(`Redo failed for "${action.description}":`, err);
        }
        this.undoStack.push(action);
        return action;
    }

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}
