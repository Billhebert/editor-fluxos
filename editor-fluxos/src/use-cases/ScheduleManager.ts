import { Schedule, ScheduleConfig } from '../domain/Schedule';
import { ExecutionInstance } from '../domain/ExecutionInstance';
import { VariablePool } from '../domain/VariablePool';
import { RawAction, InstanceStatus } from '../domain/types';
import { IScheduleRepository } from '../adapters/IScheduleRepository';
import { NotFoundError } from '../domain/errors';
import { VariableResolver } from './VariableResolver';
import { ScheduleConflictChecker, ReservedBlock } from './ScheduleConflictChecker';

export class ScheduleManager {
    private _repo: IScheduleRepository;
    private _resolverFactory: (pool: VariablePool) => VariableResolver;
    private _lastUnsettledCount: number = 0;

    constructor(
        scheduleRepository: IScheduleRepository,
        resolverFactory?: (pool: VariablePool) => VariableResolver
    ) {
        this._repo = scheduleRepository;
        this._resolverFactory = resolverFactory || ((pool) => new VariableResolver(pool));
    }

    get lastUnsettledCount(): number {
        return this._lastUnsettledCount;
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
        const existingSchedules = await this._repo.findAll();
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
            config.dataFim || null,
            config.days,
            existingSchedules
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
        dataFim?: string | null,
        days?: number[],
        existingSchedules?: Schedule[]
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
        const canFit = (count - 1) * minIntervalSeconds <= windowSeconds;
        const usableSeconds = canFit ? Math.max(0, windowSeconds - (count - 1) * minIntervalSeconds) : 0;
        const pool = variablePool || new VariablePool();
        const resolver = this._resolverFactory(pool);
        const opcionalIterator = pool.createOpcionalIterator();
        let instanceId = 0;
        this._lastUnsettledCount = 0;

        const newOffsets = (): number[] => Array.from({ length: count }, () => Math.random()).sort((a, b) => a - b);

        const timestampsForDay = (dayStart: number): number[] => {
            const offsets = newOffsets();
            const raw: number[] = [];
            for (let i = 0; i < count; i++) {
                let posSeconds: number;
                if (canFit) {
                    posSeconds = startMin * 60 + offsets[i] * usableSeconds + i * minIntervalSeconds;
                } else {
                    const slotSeconds = windowSeconds / count;
                    posSeconds = startMin * 60 + i * slotSeconds + offsets[i] * slotSeconds;
                }
                raw.push(dayStart + Math.floor(posSeconds) * 1000);
            }

            if (canFit) {
                raw.sort((a, b) => a - b);
                for (let i = 1; i < raw.length; i++) {
                    if (raw[i] - raw[i - 1] < minIntervalMs) {
                        raw[i] = raw[i - 1] + minIntervalMs;
                    }
                }
            }

            return raw;
        };

        const dayStartList = this._computeDayStartList(date, dataInicio, dataFim, days);

        const reserved = ScheduleConflictChecker.collectReservedBlocks(existingSchedules || []);
        const reservedByDay = new Map<string, ReservedBlock[]>();
        for (const block of reserved) {
            const key = this._dayKey(block.start);
            const list = reservedByDay.get(key) || [];
            list.push(block);
            reservedByDay.set(key, list);
        }

        const allTimestamps: number[] = [];
        for (const dayStart of dayStartList) {
            const raw = timestampsForDay(dayStart);
            const dayReserved = reservedByDay.get(this._dayKey(dayStart)) || [];
            const windowStart = dayStart + startMin * 60 * 1000;
            const windowEnd = dayStart + endMin * 60 * 1000;
            const resolved = ScheduleConflictChecker.autoResolve(raw, minIntervalMs, dayReserved, windowStart, windowEnd);
            this._lastUnsettledCount += resolved.unsettled.length;
            allTimestamps.push(...resolved.adjusted);
        }

        return allTimestamps.map((ts) => {
            instanceId++;
            return new ExecutionInstance(instanceId, ts, resolver.resolveTemplate(template, obrigatorioValor, opcionalIterator));
        });
    }

    private _computeDayStartList(
        date: string,
        dataInicio?: string | null,
        dataFim?: string | null,
        days?: number[]
    ): number[] {
        const dayStarts: number[] = [];

        if (dataInicio && dataFim) {
            const [dIYear, dIMonth, dIDay] = dataInicio.split('-').map(Number);
            const [dFYear, dFMonth, dFDay] = dataFim.split('-').map(Number);
            const rangeStart = new Date(dIYear, dIMonth - 1, dIDay);
            const rangeEnd = new Date(dFYear, dFMonth - 1, dFDay, 23, 59, 59);

            const current = new Date(rangeStart);
            while (current <= rangeEnd) {
                if (!days || days.length === 0 || days.includes(current.getDay())) {
                    dayStarts.push(new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0).getTime());
                }
                current.setDate(current.getDate() + 1);
            }
            return dayStarts;
        }

        const [year, month, day] = date.split('-').map(Number);
        dayStarts.push(new Date(year, month - 1, day, 0, 0, 0).getTime());
        return dayStarts;
    }

    private _dayKey(ts: number): string {
        const d = new Date(ts);
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }
}