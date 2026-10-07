import { ValidationError } from './errors';
import { RawAction } from './types';

export class Flow {
    private _name: string;
    private _actions: RawAction[];

    constructor(name: string, actions: RawAction[] = []) {
        Flow.validateName(name);
        this._name = name.trim();
        this._actions = deepCloneActions(actions);
    }

    get name(): string { return this._name; }
    get actions(): RawAction[] { return deepCloneActions(this._actions); }
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
        return this._actions.some(a => {
            if (typeof a === 'string') return a === type;
            if (a && typeof a === 'object' && 'type' in a && a.type === 'if-image') {
                const img = a as { then: RawAction[]; else: RawAction[] };
                return img.then.some(t => this._rawEquals(t, type)) || img.else.some(e => this._rawEquals(e, type));
            }
            return this._rawEquals(a, type);
        });
    }

    addAction(action: RawAction): void {
        this._actions.push(deepCloneAction(action));
    }

    insertAction(index: number, action: RawAction): void {
        if (index < 0 || index > this._actions.length) {
            throw new ValidationError('Flow.actionIndex', `index ${index} out of range [0, ${this._actions.length}]`);
        }
        this._actions.splice(index, 0, deepCloneAction(action));
    }

    addActions(actions: RawAction[]): void {
        this._actions.push(...deepCloneActions(actions));
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

    replaceAction(index: number, action: RawAction): void {
        if (index < 0 || index >= this._actions.length) {
            throw new ValidationError('Flow.actionIndex', `index ${index} out of range [0, ${this._actions.length})`);
        }
        this._actions[index] = deepCloneAction(action);
    }

    rename(newName: string): void {
        Flow.validateName(newName);
        this._name = newName.trim();
    }

    clone(): Flow {
        return new Flow(this._name, this._actions);
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

    private _rawEquals(a: RawAction, type: string): boolean {
        return typeof a === 'string' ? a === type : false;
    }
}

export function deepCloneAction(action: RawAction): RawAction {
    if (action === null || typeof action !== 'object') return action;
    const clone: any = {};
    for (const key of Object.keys(action)) {
        const value = (action as any)[key];
        if (key === 'then' || key === 'else') {
            clone[key] = Array.isArray(value) ? value.map(deepCloneAction) : [];
        } else if (Array.isArray(value)) {
            clone[key] = value.map(item => (typeof item === 'object' && item !== null ? deepCloneAction(item) : item));
        } else if (typeof value === 'object' && value !== null) {
            clone[key] = deepCloneAction(value);
        } else {
            clone[key] = value;
        }
    }
    return clone as RawAction;
}

export function deepCloneActions(actions: RawAction[]): RawAction[] {
    return actions.map(deepCloneAction);
}
