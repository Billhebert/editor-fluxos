import { ExecutionInstance } from '../domain/ExecutionInstance';

export interface DueInstance {
    scheduleId: string;
    instanceId: number;
    resolvedActions: any[];
    flowName: string;
}

export class SchedulerState {
    private _schedules: any[] = [];

    get schedules(): any[] { return this._schedules; }

    setSchedules(data: any[]): void {
        this._schedules = data;
        this._recoverInterrupted();
    }

    private _recoverInterrupted(): void {
        for (const schedule of this._schedules) {
            if (Array.isArray(schedule.executionOrder)) {
                for (const instance of schedule.executionOrder) {
                    if (instance && instance.status === 'running') {
                        instance.status = 'pending';
                    }
                }
            }
        }
    }

    updateInstanceStatus(scheduleId: string, instanceId: number, status: string): boolean {
        const schedule = this._schedules.find((s: any) => s.id === scheduleId);
        if (!schedule) return false;
        const instance = schedule.executionOrder.find((i: any) => i.id === instanceId);
        if (!instance) return false;
        instance.status = status;
        return true;
    }

    getDueInstances(now: number): DueInstance[] {
        const due: DueInstance[] = [];
        for (const schedule of this._schedules) {
            if (!schedule.active) continue;
            for (const raw of schedule.executionOrder) {
                const instance = ExecutionInstance.fromJSON(raw);
                if (instance.isDue(now)) {
                    instance.markRunning();
                    raw.status = instance.status;
                    due.push({
                        scheduleId: schedule.id,
                        instanceId: instance.id,
                        resolvedActions: instance.resolvedActions,
                        flowName: schedule.flowName,
                    });
                }
            }
        }
        return due;
    }
}
