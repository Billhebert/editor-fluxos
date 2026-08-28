import { ipcMain } from 'electron';
import { keyboard, mouse, Key } from '@nut-tree-fork/nut-js';
import { Point } from '@nut-tree-fork/shared';
import { IpcChannels } from '../shared/IpcChannels';

const keyMap: Record<string, Key> = {
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

export class ActionIpcHandler {
    register(): void {
        ipcMain.handle(IpcChannels.EXECUTE_ACTION, async (_event, action: any) => {
            try {
                if (action.delay !== undefined) {
                    await new Promise(resolve => setTimeout(resolve, action.delay));
                } else if (action.mouse !== undefined) {
                    await mouse.setPosition(new Point(action.x, action.y));
                    await new Promise(r => setTimeout(r, 50));
                    switch (action.mouse) {
                        case 'click': await mouse.leftClick(); break;
                        case 'rightclick': await mouse.rightClick(); break;
                        case 'doubleclick':
                            await mouse.leftClick();
                            await new Promise(r => setTimeout(r, 50));
                            await mouse.leftClick();
                            break;
                    }
                } else {
                    const keyName = String(action).toLowerCase();
                    const nutKey = keyMap[keyName];
                    if (nutKey) {
                        await keyboard.pressKey(nutKey);
                        await new Promise(r => setTimeout(r, 50));
                        await keyboard.releaseKey(nutKey);
                    } else {
                        await keyboard.type(String(action));
                    }
                }
                return true;
            } catch (e: any) {
                console.error('Erro na execucao:', e.message);
                throw e;
            }
        });
    }
}
