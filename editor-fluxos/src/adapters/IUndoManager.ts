export interface UndoableActionPort {
    type: string;
    description: string;
    undo: () => Promise<void> | void;
    redo: () => Promise<void> | void;
}

export interface IUndoManager {
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    readonly undoDescription: string | null;
    readonly redoDescription: string | null;
    execute(action: UndoableActionPort): Promise<void>;
    undo(): Promise<UndoableActionPort | null>;
    redo(): Promise<UndoableActionPort | null>;
    clear(): void;
}