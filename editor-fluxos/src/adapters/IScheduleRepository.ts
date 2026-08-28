import { Schedule } from '../domain/Schedule';
import { InstanceStatus } from '../domain/types';

export interface IScheduleRepository {
    findAll(): Promise<Schedule[]>;
    findById(id: string): Promise<Schedule | null>;
    save(schedule: Schedule): Promise<Schedule>;
    saveAll(schedules: Schedule[]): Promise<void>;
    delete(id: string): Promise<void>;
    updateInstanceStatus(scheduleId: string, instanceId: number, status: InstanceStatus): Promise<void>;
}
