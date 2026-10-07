import { RawAction, KeyAction, TextAction, MouseAction, DelayAction, HotkeyAction, ClickImageAction, IfImageAction } from './types';

export const ActionTypes = {
    KEY: 'key',
    MOUSE: 'mouse',
    DELAY: 'delay',
    TEXT: 'text',
    HOTKEY: 'hotkey',
    CLICK_IMAGE: 'click-image',
    IF_IMAGE: 'if-image',
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
    get isHotkey(): boolean { return this.type === ActionTypes.HOTKEY; }
    get isClickImage(): boolean { return this.type === ActionTypes.CLICK_IMAGE; }
    get isIfImage(): boolean { return this.type === ActionTypes.IF_IMAGE; }
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
            if ('type' in raw && typeof raw.type === 'string') {
                return Action._parseStructured(raw as StructuredActionLike);
            }
            // Formatos legados sem campo type
            if ('mouse' in raw) {
                const m = raw as { mouse: string; x: number; y: number };
                return new Action(ActionTypes.MOUSE, { type: 'mouse', mouse: m.mouse, x: m.x, y: m.y });
            }
            if ('delay' in raw) {
                const d = raw as { delay: number };
                return new Action(ActionTypes.DELAY, { type: 'delay', delay: d.delay });
            }
        }

        if (typeof raw === 'string') {
            const normalized = Action._normalizeLegacyString(raw);
            return new Action(normalized.type, normalized);
        }

        return new Action(ActionTypes.TEXT, { type: 'text', text: String(raw) });
    }

    static parseAll(rawActions: RawAction[]): Action[] {
        return rawActions.map(raw => Action.parse(raw));
    }

    private static _parseStructured(raw: StructuredActionLike): Action {
        switch (raw.type) {
            case 'key':
                return new Action(ActionTypes.KEY, raw as KeyAction);
            case 'text':
                return new Action(ActionTypes.TEXT, raw as TextAction);
            case 'mouse':
                return new Action(ActionTypes.MOUSE, raw as MouseAction);
            case 'delay':
                return new Action(ActionTypes.DELAY, raw as DelayAction);
            case 'hotkey':
                return new Action(ActionTypes.HOTKEY, raw as HotkeyAction);
            case 'click-image':
                return new Action(ActionTypes.CLICK_IMAGE, raw as ClickImageAction);
            case 'if-image':
                return new Action(ActionTypes.IF_IMAGE, raw as IfImageAction);
            default:
                return new Action(ActionTypes.TEXT, { type: 'text', text: String(raw) });
        }
    }

    private static _normalizeLegacyString(raw: string): KeyAction | TextAction {
        const lower = raw.toLowerCase();
        const singleKeyKeys = [
            'enter', 'esc', 'escape', 'tab', 'space', 'backspace', 'delete',
            'up', 'down', 'left', 'right', 'capslock',
            'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
            'ctrl', 'ctrlleft', 'ctrlright', 'alt', 'altleft', 'altright',
            'shift', 'shiftleft', 'shiftright',
            'win', 'winleft', 'winright', 'meta', 'super', 'superleft', 'superright'
        ];
        if (singleKeyKeys.includes(lower) || raw.length === 1) {
            return { type: 'key', key: lower };
        }
        return { type: 'text', text: raw };
    }
}

type StructuredActionLike = { type: string } & Record<string, any>;
