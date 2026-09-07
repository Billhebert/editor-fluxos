import { Key } from '@nut-tree-fork/nut-js';

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

export type ActionKind = 'delay' | 'mouse' | 'key';

export interface ResolvedAction {
    kind: ActionKind;
    delayMs?: number;
    mouseType?: string;
    x?: number;
    y?: number;
    nutKey?: Key;
    text?: string;
}

export function resolveAction(action: any): ResolvedAction {
    if (action.delay !== undefined) {
        return { kind: 'delay', delayMs: action.delay };
    }
    if (action.mouse !== undefined) {
        return { kind: 'mouse', mouseType: action.mouse, x: action.x, y: action.y };
    }
    const keyName = String(action).toLowerCase();
    const nutKey = KEY_MAP[keyName];
    if (nutKey) {
        return { kind: 'key', nutKey };
    }
    return { kind: 'key', text: String(action) };
}
