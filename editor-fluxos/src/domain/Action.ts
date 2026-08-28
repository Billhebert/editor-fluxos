import { RawAction, MouseAction, DelayAction } from './types';

export const ActionTypes = {
    KEY: 'key',
    MOUSE: 'mouse',
    DELAY: 'delay',
    TEXT: 'text',
    OBRIGATORIO: 'ITEM_OBRIGATORIO',
    OPCIONAL: 'ITEM_OPCIONAL'
} as const;

export type ActionType = typeof ActionTypes[keyof typeof ActionTypes];

export class Action {
    readonly type: ActionType;
    readonly raw: RawAction;

    constructor(type: ActionType, raw: RawAction) {
        this.type = type;
        this.raw = raw;
    }

    get isKey(): boolean { return this.type === ActionTypes.KEY; }
    get isMouse(): boolean { return this.type === ActionTypes.MOUSE; }
    get isDelay(): boolean { return this.type === ActionTypes.DELAY; }
    get isText(): boolean { return this.type === ActionTypes.TEXT; }
    get isObrigatorio(): boolean { return this.type === ActionTypes.OBRIGATORIO; }
    get isOpcional(): boolean { return this.type === ActionTypes.OPCIONAL; }
    get isVariable(): boolean { return this.isObrigatorio || this.isOpcional; }

    toRaw(): RawAction {
        return this.raw;
    }

    static parse(raw: RawAction): Action {
        if (raw === 'ITEM_OBRIGATORIO') {
            return new Action(ActionTypes.OBRIGATORIO, raw);
        }
        if (raw === 'ITEM_OPCIONAL') {
            return new Action(ActionTypes.OPCIONAL, raw);
        }
        if (typeof raw === 'object' && raw !== null) {
            if ('mouse' in raw) {
                return new Action(ActionTypes.MOUSE, raw as MouseAction);
            }
            if ('delay' in raw) {
                return new Action(ActionTypes.DELAY, raw as DelayAction);
            }
        }
        if (typeof raw === 'string') {
            return new Action(ActionTypes.TEXT, raw);
        }
        return new Action(ActionTypes.TEXT, String(raw));
    }

    static parseAll(rawActions: RawAction[]): Action[] {
        return rawActions.map(raw => Action.parse(raw));
    }
}
