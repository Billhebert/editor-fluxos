import { IScheduleRepository } from '../adapters/IScheduleRepository';
import { Schedule } from '../domain/Schedule';
import { InstanceStatus } from '../domain/types';
import { ipc } from './IpcService';

export class IpcScheduleRepo implements IScheduleRepository {
    async findAll(): Promise<Schedule[]> {
        const data: any[] = await ipc.getSchedules();
        return data.map((s: any) => Schedule.fromJSON(s));
    }

    async findById(id: string): Promise<Schedule | null> {
        const all = await this.findAll();
        return all.find(s => s.id === id) || null;
    }

    async save(schedule: Schedule): Promise<Schedule> {
        const all = await this.findAll();
        const idx = all.findIndex(s => s.id === schedule.id);
        if (idx >= 0) {
            all[idx] = schedule;
        } else {
            all.push(schedule);
        }
        await ipc.saveSchedules(all.map(s => s.toJSON()));
        return schedule;
    }

    async delete(id: string): Promise<void> {
        const all = await this.findAll();
        const filtered = all.filter(s => s.id !== id);
        await ipc.saveSchedules(filtered.map(s => s.toJSON()));
    }

    async saveAll(schedules: Schedule[]): Promise<void> {
        await ipc.saveSchedules(schedules.map(s => s.toJSON()));
    }

    async updateInstanceStatus(scheduleId: string, instanceId: number, status: InstanceStatus): Promise<void> {
        await ipc.updateInstanceStatus(scheduleId, instanceId, status);
    }
}
