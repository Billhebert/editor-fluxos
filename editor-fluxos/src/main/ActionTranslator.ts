import { Key } from '@nut-tree-fork/nut-js';
import { RawAction, KeyAction, TextAction, MouseAction, DelayAction, HotkeyAction, ClickImageAction, IfImageAction } from '../domain/types';

export const KEY_MAP: Record<string, Key> = {
    'enter': Key.Enter, 'esc': Key.Escape, 'escape': Key.Escape, 'tab': Key.Tab,
    'space': Key.Space, 'backspace': Key.Backspace, 'delete': Key.Delete,
    'up': Key.Up, 'down': Key.Down, 'left': Key.Left, 'right': Key.Right,
    'f1': Key.F1, 'f2': Key.F2, 'f3': Key.F3, 'f4': Key.F4,
    'f5': Key.F5, 'f6': Key.F6, 'f7': Key.F7, 'f8': Key.F8,
    'f9': Key.F9, 'f10': Key.F10, 'f11': Key.F11, 'f12': Key.F12,
    'ctrl': Key.LeftControl, 'ctrlleft': Key.LeftControl, 'ctrlright': Key.RightControl,
    'alt': Key.LeftAlt, 'altleft': Key.LeftAlt, 'altright': Key.RightAlt,
    'shift': Key.LeftShift, 'shiftleft': Key.LeftShift, 'shiftright': Key.RightShift,
    'capslock': Key.CapsLock,
    'win': Key.LeftWin, 'winleft': Key.LeftWin, 'winright': Key.RightWin,
    'super': Key.LeftSuper, 'superleft': Key.LeftSuper, 'superright': Key.RightSuper,
    'meta': Key.LeftWin,
};

export type ActionKind =
    | 'delay'
    | 'mouse'
    | 'key'
    | 'text'
    | 'hotkey'
    | 'click-image'
    | 'if-image';

export interface ResolvedAction {
    kind: ActionKind;
    delayMs?: number;
    mouseType?: string;
    x?: number;
    y?: number;
    nutKey?: Key;
    text?: string;
    keys?: Key[];
    assetId?: string;
    confidence?: number;
    timeout?: number;
    then?: ResolvedAction[];
    else?: ResolvedAction[];
}

export function resolveAction(action: RawAction): ResolvedAction {
    if (typeof action === 'string') {
        return resolveLegacyString(action);
    }

    // Formato legado sem campo type
    if (action && typeof action === 'object' && !('type' in action)) {
        if ('delay' in action) {
            return { kind: 'delay', delayMs: (action as any).delay };
        }
        if ('mouse' in action) {
            const m = action as any;
            return { kind: 'mouse', mouseType: m.mouse, x: m.x, y: m.y };
        }
    }

    const structured = action as any;
    switch (structured?.type) {
        case 'key':
            return resolveKey(structured as KeyAction);
        case 'text':
            return { kind: 'text', text: (structured as TextAction).text };
        case 'mouse':
            const m = structured as MouseAction;
            return { kind: 'mouse', mouseType: m.mouse, x: m.x, y: m.y };
        case 'delay':
            return { kind: 'delay', delayMs: (structured as DelayAction).delay };
        case 'hotkey':
            return resolveHotkey(structured as HotkeyAction);
        case 'click-image':
            const ci = structured as ClickImageAction;
            return { kind: 'click-image', assetId: ci.assetId, confidence: ci.confidence, timeout: ci.timeout };
        case 'if-image':
            const img = structured as IfImageAction;
            return {
                kind: 'if-image',
                assetId: img.assetId,
                confidence: img.confidence,
                timeout: img.timeout,
                then: img.then.map(resolveAction),
                else: img.else.map(resolveAction),
            };
        default:
            return resolveLegacyString(String(action));
    }
}

function resolveKey(action: KeyAction): ResolvedAction {
    const keyName = action.key.toLowerCase();
    const nutKey = KEY_MAP[keyName];
    if (nutKey) return { kind: 'key', nutKey };
    if (action.key.length === 1) return { kind: 'text', text: action.key };
    return { kind: 'text', text: action.key };
}

function resolveLegacyString(action: string): ResolvedAction {
    const keyName = String(action).toLowerCase();
    const nutKey = KEY_MAP[keyName];
    if (nutKey) return { kind: 'key', nutKey };
    if (action.length === 1) return { kind: 'text', text: action };
    return { kind: 'text', text: action };
}

function resolveHotkey(action: HotkeyAction): ResolvedAction {
    const keys = action.keys
        .map(k => k.toLowerCase())
        .map(k => KEY_MAP[k])
        .filter((k): k is Key => k !== undefined);
    return { kind: 'hotkey', keys };
}
