import { Schedule, ScheduleConfig } from '../domain/Schedule';
import { ExecutionInstance } from '../domain/ExecutionInstance';
import { VariablePool } from '../domain/VariablePool';
import { RawAction, InstanceStatus } from '../domain/types';
import { IScheduleRepository } from '../adapters/IScheduleRepository';
import { NotFoundError } from '../domain/errors';
import { VariableResolver } from './VariableResolver';

export class ScheduleManager {
    private _repo: IScheduleRepository;
    private _resolverFactory: (pool: VariablePool) => VariableResolver;

    constructor(
        scheduleRepository: IScheduleRepository,
        resolverFactory?: (pool: VariablePool) => VariableResolver
    ) {
        this._repo = scheduleRepository;
        this._resolverFactory = resolverFactory || ((pool) => new VariableResolver(pool));
    }

    async getAllSchedules(): Promise<Schedule[]> {
        return this._repo.findAll();
    }

    async getSchedule(id: string): Promise<Schedule | null> {
        return this._repo.findById(id);
    }

    async createSchedule(
        config: ScheduleConfig,
        flowTemplate: RawAction[],
        variablePool: VariablePool
    ): Promise<Schedule> {
        const order = this.generateExecutionOrder(
            flowTemplate,
            config.obrigatorioValor || '',
            config.repeticoes || 1,
            config.date || new Date().toISOString().split('T')[0],
            config.timeStart || '07:00',
            config.timeEnd || '08:00',
            config.intervaloMinimo || 60,
            variablePool,
            config.dataInicio || null,
            config.dataFim || null
        );

        const schedule = new Schedule({ ...config, executionOrder: order });
        return this._repo.save(schedule);
    }

    async updateSchedule(schedule: Schedule): Promise<Schedule> {
        return this._repo.save(schedule);
    }

    async deleteSchedule(id: string): Promise<void> {
        return this._repo.delete(id);
    }

    async toggleSchedule(id: string, active: boolean): Promise<Schedule> {
        const schedule = await this._repo.findById(id);
        if (!schedule) throw new NotFoundError('Schedule', id);
        schedule.toggleActive(active);
        return this._repo.save(schedule);
    }

    async findDueSchedules(): Promise<{ schedule: Schedule; instance: ExecutionInstance }[]> {
        const all = await this._repo.findAll();
        const now = Date.now();
        const due: { schedule: Schedule; instance: ExecutionInstance }[] = [];

        for (const schedule of all) {
            if (!schedule.active) continue;
            for (const instance of schedule.executionOrder) {
                if (instance.isDue(now)) {
                    due.push({ schedule, instance });
                }
            }
        }

        return due;
    }

    async updateInstanceStatus(scheduleId: string, instanceId: number, status: InstanceStatus): Promise<void> {
        return this._repo.updateInstanceStatus(scheduleId, instanceId, status);
    }

    generateExecutionOrder(
        template: RawAction[],
        obrigatorioValor: string,
        count: number,
        date: string,
        timeStart: string,
        timeEnd: string,
        intervaloMinimo: number,
        variablePool?: VariablePool,
        dataInicio?: string | null,
        dataFim?: string | null
    ): ExecutionInstance[] {
        const [sh, sm] = timeStart.split(':').map(Number);
        const [eh, em] = timeEnd.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;

        if (endMin <= startMin) {
            throw new Error(`timeEnd (${timeEnd}) must be after timeStart (${timeStart})`);
        }

        const minIntervalMs = Math.max(intervaloMinimo, 1) * 1000;
        const minIntervalSeconds = Math.max(intervaloMinimo, 1);
        const windowSeconds = (endMin - startMin) * 60;
        const usableSeconds = Math.max(0, windowSeconds - (count - 1) * minIntervalSeconds);
        const resolver = this._resolverFactory(variablePool || new VariablePool());
        let instanceId = 0;

        const randomOffsets = Array.from({ length: count }, () => Math.random()).sort((a, b) => a - b);

        if (dataInicio && dataFim) {
            const allTimestamps: number[] = [];
            const [dIYear, dIMonth, dIDay] = dataInicio.split('-').map(Number);
            const [dFYear, dFMonth, dFDay] = dataFim.split('-').map(Number);
            const rangeStart = new Date(dIYear, dIMonth - 1, dIDay);
            const rangeEnd = new Date(dFYear, dFMonth - 1, dFDay, 23, 59, 59);

            const current = new Date(rangeStart);
            while (current <= rangeEnd) {
                const year = current.getFullYear();
                const month = current.getMonth();
                const day = current.getDate();
                const dayStart = new Date(year, month, day, 0, 0, 0).getTime();

                for (let i = 0; i < count; i++) {
                    const posSeconds = startMin * 60 + randomOffsets[i] * usableSeconds + i * minIntervalSeconds;
                    allTimestamps.push(dayStart + Math.floor(posSeconds) * 1000);
                }

                current.setDate(current.getDate() + 1);
            }

            allTimestamps.sort((a, b) => a - b);
            for (let i = 1; i < allTimestamps.length; i++) {
                if (allTimestamps[i] - allTimestamps[i - 1] < minIntervalMs) {
                    allTimestamps[i] = allTimestamps[i - 1] + minIntervalMs;
                }
            }

            const resolved = resolver.resolveTemplate(template, obrigatorioValor);
            return allTimestamps.map((ts) => {
                instanceId++;
                return new ExecutionInstance(instanceId, ts, [...resolved]);
            });
        }

        const timestamps: number[] = [];
        const [year, month, day] = date.split('-').map(Number);
        const dayStart = new Date(year, month - 1, day, 0, 0, 0).getTime();

        for (let i = 0; i < count; i++) {
            const posSeconds = startMin * 60 + randomOffsets[i] * usableSeconds + i * minIntervalSeconds;
            timestamps.push(dayStart + Math.floor(posSeconds) * 1000);
        }

        timestamps.sort((a, b) => a - b);
        for (let i = 1; i < timestamps.length; i++) {
            if (timestamps[i] - timestamps[i - 1] < minIntervalMs) {
                timestamps[i] = timestamps[i - 1] + minIntervalMs;
            }
        }

        const resolved = resolver.resolveTemplate(template, obrigatorioValor);
        return timestamps.map((ts) => {
            instanceId++;
            return new ExecutionInstance(instanceId, ts, [...resolved]);
        });
    }
}
