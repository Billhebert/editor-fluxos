import { IActionExecutor } from '../adapters/IActionExecutor';
import { RawAction } from '../domain/types';
import { ipc } from './IpcService';

export class ElectronIpcExecutor implements IActionExecutor {
    async execute(action: RawAction, signal?: AbortSignal): Promise<void> {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        await ipc.executeAction(action);
    }
}
