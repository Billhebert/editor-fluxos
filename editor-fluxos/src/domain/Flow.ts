import { ValidationError } from './errors';
import { RawAction } from './types';

export class Flow {
    private _name: string;
    private _actions: RawAction[];

    constructor(name: string, actions: RawAction[] = []) {
        Flow.validateName(name);
        this._name = name.trim();
        this._actions = [...actions];
    }

    get name(): string { return this._name; }
    get actions(): RawAction[] { return [...this._actions]; }
    get length(): number { return this._actions.length; }
    get isEmpty(): boolean { return this._actions.length === 0; }

    static validateName(name: string): void {
        if (!name || !name.trim()) {
            throw new ValidationError('Flow.name', 'cannot be empty');
        }
        if (name.length > 100) {
            throw new ValidationError('Flow.name', 'cannot exceed 100 characters');
        }
    }

    hasVariable(type: string): boolean {
        return this._actions.some(a => a === type);
    }

    addAction(action: RawAction): void {
        this._actions.push(action);
    }

    addActions(actions: RawAction[]): void {
        this._actions.push(...actions);
    }

    removeAction(index: number): void {
        if (index < 0 || index >= this._actions.length) {
            throw new ValidationError('Flow.actionIndex', `index ${index} out of range [0, ${this._actions.length})`);
        }
        this._actions.splice(index, 1);
    }

    moveAction(fromIndex: number, toIndex: number): void {
        if (fromIndex < 0 || fromIndex >= this._actions.length) {
            throw new ValidationError('Flow.fromIndex', `index ${fromIndex} out of range`);
        }
        if (toIndex < 0 || toIndex >= this._actions.length) {
            throw new ValidationError('Flow.toIndex', `index ${toIndex} out of range`);
        }
        const [item] = this._actions.splice(fromIndex, 1);
        this._actions.splice(toIndex, 0, item);
    }

    rename(newName: string): void {
        Flow.validateName(newName);
        this._name = newName.trim();
    }

    clone(): Flow {
        return new Flow(this._name, JSON.parse(JSON.stringify(this._actions)));
    }

    toJSON(): { name: string; actions: RawAction[] } {
        return { name: this._name, actions: this.actions };
    }

    static fromJSON(data: any): Flow | null {
        if (data && typeof data === 'object' && data.name && Array.isArray(data.actions)) {
            return new Flow(data.name, data.actions);
        }
        return null;
    }
}
