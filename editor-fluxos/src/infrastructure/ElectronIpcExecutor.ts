import { IActionExecutor } from '../adapters/IActionExecutor';
import { RawAction } from '../domain/types';
import { ipc } from './IpcService';

export class ElectronIpcExecutor implements IActionExecutor {
    private _shouldStop: boolean = false;

    async execute(action: RawAction): Promise<void> {
        await ipc.executeAction(action);
    }

    stop(): void {
        this._shouldStop = true;
    }

    resetStop(): void {
        this._shouldStop = false;
    }

    get shouldStop(): boolean {
        return this._shouldStop;
    }
}
