import { ipcMain } from 'electron';
import { keyboard, mouse } from '@nut-tree-fork/nut-js';
import { Point } from '@nut-tree-fork/shared';
import { IpcChannels } from '../shared/IpcChannels';
import { resolveAction } from './ActionTranslator';

interface AbortableTask {
    reject(err: Error): void;
    abort(): void;
}

class ActionAbortController {
    private _active: AbortableTask | null = null;

    set(task: AbortableTask): void {
        this._active = task;
    }

    abort(): void {
        const task = this._active;
        this._active = null;
        if (task) task.abort();
    }
}

const globalAbort = new ActionAbortController();

function sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            resolve();
        }, ms);
        const task: AbortableTask = {
            reject,
            abort: () => {
                cleanup();
                reject(new DOMException('Aborted', 'AbortError'));
            }
        };
        const cleanup = () => {
            clearTimeout(timer);
            globalAbort.set({
                reject: () => {},
                abort: () => {}
            });
        };
        globalAbort.set(task);
    });
}

export class ActionIpcHandler {
    register(): void {
        ipcMain.handle(IpcChannels.STOP_EXECUTION, async () => {
            globalAbort.abort();
            return true;
        });

        ipcMain.handle(IpcChannels.EXECUTE_ACTION, async (_event, action: any) => {
            try {
                const resolved = resolveAction(action);

                switch (resolved.kind) {
                    case 'delay':
                        if (resolved.delayMs != null) await sleep(resolved.delayMs);
                        break;
                    case 'mouse':
                        await mouse.setPosition(new Point(resolved.x!, resolved.y!));
                        await sleep(50);
                        switch (resolved.mouseType) {
                            case 'click': await mouse.leftClick(); break;
                            case 'rightclick': await mouse.rightClick(); break;
                            case 'doubleclick':
                                await mouse.leftClick();
                                await sleep(50);
                                await mouse.leftClick();
                                break;
                        }
                        break;
                    case 'key':
                        if (resolved.nutKey) {
                            await keyboard.pressKey(resolved.nutKey);
                            await sleep(50);
                            await keyboard.releaseKey(resolved.nutKey);
                        } else {
                            await keyboard.type(resolved.text!);
                        }
                        break;
                    case 'text':
                        await keyboard.type(resolved.text!);
                        break;
                    case 'hotkey':
                        if (resolved.keys && resolved.keys.length > 0) {
                            await keyboard.pressKey(...resolved.keys);
                            await sleep(50);
                            await keyboard.releaseKey(...resolved.keys);
                        }
                        break;
                    case 'click-image':
                        if (resolved.x != null && resolved.y != null) {
                            await mouse.setPosition(new Point(resolved.x, resolved.y));
                            await sleep(50);
                            await mouse.leftClick();
                        }
                        break;
                    case 'if-image':
                        // Decisao tomada no executor/renderer; no main apenas
                        // reservamos o tipo para consistencia.
                        break;
                }
                globalAbort.set({
                    reject: () => {},
                    abort: () => {}
                });
                return true;
            } catch (e: any) {
                console.error('Erro na execucao:', e.message);
                throw e;
            }
        });
    }
}
