import { ipcMain } from 'electron';
import { keyboard, mouse } from '@nut-tree-fork/nut-js';
import { Point } from '@nut-tree-fork/shared';
import { IpcChannels } from '../shared/IpcChannels';
import { resolveAction } from './ActionTranslator';

export class ActionIpcHandler {
    register(): void {
        ipcMain.handle(IpcChannels.EXECUTE_ACTION, async (_event, action: any) => {
            try {
                const resolved = resolveAction(action);

                switch (resolved.kind) {
                    case 'delay':
                        await new Promise(resolve => setTimeout(resolve, resolved.delayMs));
                        break;
                    case 'mouse':
                        await mouse.setPosition(new Point(resolved.x!, resolved.y!));
                        await new Promise(r => setTimeout(r, 50));
                        switch (resolved.mouseType) {
                            case 'click': await mouse.leftClick(); break;
                            case 'rightclick': await mouse.rightClick(); break;
                            case 'doubleclick':
                                await mouse.leftClick();
                                await new Promise(r => setTimeout(r, 50));
                                await mouse.leftClick();
                                break;
                        }
                        break;
                    case 'key':
                        if (resolved.nutKey) {
                            await keyboard.pressKey(resolved.nutKey);
                            await new Promise(r => setTimeout(r, 50));
                            await keyboard.releaseKey(resolved.nutKey);
                        } else {
                            await keyboard.type(resolved.text!);
                        }
                        break;
                }
                return true;
            } catch (e: any) {
                console.error('Erro na execucao:', e.message);
                throw e;
            }
        });
    }
}
