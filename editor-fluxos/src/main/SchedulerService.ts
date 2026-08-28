import { BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { ExecutionInstance } from '../domain/ExecutionInstance';
import { IpcChannels } from '../shared/IpcChannels';

export class SchedulerService {
    private _schedules: any[] = [];
    private _interval: ReturnType<typeof setInterval> | null = null;
    private _file: string;

    constructor() {
        this._file = path.join(app.getPath('userData'), 'schedules.json');
        this._load();
    }

    get schedules(): any[] { return this._schedules; }

    private _load(): void {
        try {
            if (fs.existsSync(this._file)) {
                this._schedules = JSON.parse(fs.readFileSync(this._file, 'utf-8'));
            }
        } catch { this._schedules = []; }
    }

    private _save(): void {
        fs.writeFileSync(this._file, JSON.stringify(this._schedules, null, 2), 'utf-8');
    }

    setSchedules(data: any[]): void {
        this._schedules = data;
        this._save();
    }

    updateInstanceStatus(scheduleId: string, instanceId: number, status: string): void {
        const schedule = this._schedules.find((s: any) => s.id === scheduleId);
        if (schedule) {
            const instance = schedule.executionOrder.find((i: any) => i.id === instanceId);
            if (instance) {
                instance.status = status;
                this._save();
            }
        }
    }

    start(windowProvider: () => BrowserWindow | null): void {
        if (this._interval) return;
        this._interval = setInterval(() => {
            const now = Date.now();
            let changed = false;
            for (const schedule of this._schedules) {
                if (!schedule.active) continue;
                for (const raw of schedule.executionOrder) {
                    const instance = ExecutionInstance.fromJSON(raw);
                    if (instance.isDue(now)) {
                        instance.markRunning();
                        raw.status = instance.status;
                        changed = true;
                        const win = windowProvider();
                        if (win && !win.isDestroyed()) {
                            win.webContents.send(IpcChannels.EXECUTE_SCHEDULED, {
                                scheduleId: schedule.id,
                                instanceId: instance.id,
                                resolvedActions: instance.resolvedActions,
                                flowName: schedule.flowName
                            });
                        }
                    }
                }
            }
            if (changed) this._save();
        }, 1000);
    }

    stop(): void {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    }
}
