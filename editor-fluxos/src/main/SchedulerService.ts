import { BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { IpcChannels } from '../shared/IpcChannels';
import { SchedulerState } from './SchedulerState';
import { InstanceStatus } from '../domain/types';

export class SchedulerService {
    private _state: SchedulerState;
    private _interval: ReturnType<typeof setInterval> | null = null;
    private _file: string;
    private _windowProvider: (() => BrowserWindow | null) | null = null;
    private _startedAt: number = 0;

    constructor() {
        this._file = path.join(app.getPath('userData'), 'schedules.json');
        this._state = new SchedulerState();
        this._load();
    }

    get schedules(): any[] { return this._state.schedules; }

    private _load(): void {
        try {
            if (fs.existsSync(this._file)) {
                this._state.initialize(JSON.parse(fs.readFileSync(this._file, 'utf-8')));
            }
        } catch { this._state.initialize([]); }
    }

    private _save(): void {
        fs.writeFileSync(this._file, JSON.stringify(this._state.schedules, null, 2), 'utf-8');
    }

    setSchedules(data: any[]): void {
        this._state.replaceSchedules(data);
        this._save();
        this._notifyStatusChanged();
    }

    updateInstanceStatus(scheduleId: string, instanceId: number, status: InstanceStatus): void {
        if (this._state.updateInstanceStatus(scheduleId, instanceId, status)) {
            this._save();
            this._notifyStatusChanged();
        }
    }

    start(windowProvider: () => BrowserWindow | null): void {
        if (this._interval) return;
        this._windowProvider = windowProvider;
        this._startedAt = Date.now();
        this._state.markMissedBefore(this._startedAt);
        this._save();
        this._interval = setInterval(() => {
            const due = this._state.getDueInstances(Date.now());
            for (const d of due) {
                const win = windowProvider();
                if (win && !win.isDestroyed()) {
                    win.webContents.send(IpcChannels.EXECUTE_SCHEDULED, {
                        scheduleId: d.scheduleId,
                        instanceId: d.instanceId,
                        resolvedActions: d.resolvedActions,
                        flowName: d.flowName,
                    });
                }
            }
            if (due.length > 0) this._save();
        }, 1000);
    }

    stop(): void {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    }

    private _notifyStatusChanged(): void {
        const win = this._windowProvider?.();
        if (win && !win.isDestroyed()) {
            win.webContents.send(IpcChannels.SCHEDULE_STATUS_CHANGED, this._state.schedules);
        }
    }
}
