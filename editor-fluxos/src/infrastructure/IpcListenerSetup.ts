import { ipc } from './IpcService';
import { IpcChannels } from '../shared/IpcChannels';

export interface AppIpcHandlers {
    onOpenFile(): void;
    onSaveFile(): void;
    onSaveFileAs(): void;
    onMouseCaptured(x: number, y: number): void;
    onUpdateStatus(type: string, data: any): void;
    onExecuteScheduled(payload: any): Promise<void>;
}

export class IpcListenerSetup {
    static init(handlers: AppIpcHandlers): void {
        ipc.on(IpcChannels.MENU_OPEN, () => handlers.onOpenFile());
        ipc.on(IpcChannels.MENU_SAVE, () => handlers.onSaveFile());
        ipc.on(IpcChannels.MENU_SAVE_AS, () => handlers.onSaveFileAs());

        ipc.on(IpcChannels.MOUSE_CAPTURED, (data: { x: number; y: number }) => {
            handlers.onMouseCaptured(data.x, data.y);
        });

        ipc.on(IpcChannels.UPDATE_STATUS, (type: string, data: any) => {
            handlers.onUpdateStatus(type, data);
        });

        ipc.on(IpcChannels.EXECUTE_SCHEDULED, async (payload: any) => {
            await handlers.onExecuteScheduled(payload);
        });
    }
}
