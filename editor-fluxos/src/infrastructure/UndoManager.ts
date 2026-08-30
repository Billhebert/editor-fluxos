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
        const action = this.undoStack[this.undoStack.length - 1];
        await action.undo();
        this.undoStack.pop();
        this.redoStack.push(action);
        return action;
    }

    async redo(): Promise<UndoableActionPort | null> {
        if (!this.canRedo) return null;
        const action = this.redoStack[this.redoStack.length - 1];
        await action.redo();
        this.redoStack.pop();
        this.undoStack.push(action);
        return action;
    }

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}
