import { ExecutionInstance } from '../domain/ExecutionInstance';
import { InstanceStatus } from '../domain/types';

export interface DueInstance {
    scheduleId: string;
    instanceId: number;
    resolvedActions: any[];
    flowName: string;
}

export class SchedulerState {
    private _schedules: any[] = [];

    get schedules(): any[] { return this._schedules; }

    initialize(data: any[]): void {
        this._schedules = data;
        this._recoverInterrupted();
    }

    replaceSchedules(data: any[]): void {
        // Preserva os estados de execução das agendas existentes ao salvar alterações estruturais.
        const statusMap = this._buildStatusMap();
        this._schedules = data.map(s => {
            const existing = statusMap.get(s.id);
            if (existing && Array.isArray(s.executionOrder)) {
                for (const inst of s.executionOrder) {
                    const saved = existing.get(inst.id);
                    if (saved && this._isRuntimeStatus(saved)) {
                        inst.status = saved;
                    }
                }
            }
            return s;
        });
    }

    markMissedBefore(startupTime: number): void {
        for (const schedule of this._schedules) {
            if (!schedule.active || !Array.isArray(schedule.executionOrder)) continue;
            for (const raw of schedule.executionOrder) {
                const instance = ExecutionInstance.fromJSON(raw);
                if (instance.isPending && instance.gatilhoTime < startupTime) {
                    raw.status = 'missed';
                }
            }
        }
    }

    updateInstanceStatus(scheduleId: string, instanceId: number, status: InstanceStatus): boolean {
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

    private _buildStatusMap(): Map<string, Map<number, InstanceStatus>> {
        const map = new Map<string, Map<number, InstanceStatus>>();
        for (const schedule of this._schedules) {
            if (!schedule.id || !Array.isArray(schedule.executionOrder)) continue;
            const inner = new Map<number, InstanceStatus>();
            for (const inst of schedule.executionOrder) {
                if (inst && inst.id && this._isRuntimeStatus(inst.status)) {
                    inner.set(inst.id, inst.status);
                }
            }
            if (inner.size > 0) {
                map.set(schedule.id, inner);
            }
        }
        return map;
    }

    private _isRuntimeStatus(status: string): status is InstanceStatus {
        return status === 'running' || status === 'completed' || status === 'failed' || status === 'missed' || status === 'cancelled';
    }
}
