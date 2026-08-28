import { ipcMain } from 'electron';
import { SchedulerService } from './SchedulerService';
import { IpcChannels } from '../shared/IpcChannels';

export class ScheduleIpcHandler {
    private _scheduler: SchedulerService;

    constructor(scheduler: SchedulerService) {
        this._scheduler = scheduler;
    }

    register(): void {
        ipcMain.handle(IpcChannels.GET_SCHEDULES, () => this._scheduler.schedules);

        ipcMain.handle(IpcChannels.SAVE_SCHEDULES, (_event, data: any[]) => {
            this._scheduler.setSchedules(data);
            return true;
        });

        ipcMain.handle(IpcChannels.UPDATE_INSTANCE_STATUS, (_event, { scheduleId, instanceId, status }: { scheduleId: string; instanceId: number; status: string }) => {
            this._scheduler.updateInstanceStatus(scheduleId, instanceId, status);
            return true;
        });

        ipcMain.handle(IpcChannels.START_SCHEDULER, () => { return true; });
        ipcMain.handle(IpcChannels.STOP_SCHEDULER, () => { this._scheduler.stop(); return true; });
    }
}
