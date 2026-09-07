import { IActionExecutor } from '../adapters/IActionExecutor';
import { RawAction } from '../domain/types';
import { ipc } from './IpcService';

export class ElectronIpcExecutor implements IActionExecutor {
    async execute(action: RawAction): Promise<void> {
        await ipc.executeAction(action);
    }
}
