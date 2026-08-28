import { Schedule, ScheduleConfig } from '../domain/Schedule';
import { ExecutionInstance } from '../domain/ExecutionInstance';
import { VariablePool } from '../domain/VariablePool';
import { RawAction, InstanceStatus } from '../domain/types';
import { IScheduleRepository } from '../adapters/IScheduleRepository';
import { NotFoundError } from '../domain/errors';

export class ScheduleManager {
    private _repo: IScheduleRepository;

    constructor(scheduleRepository: IScheduleRepository) {
        this._repo = scheduleRepository;
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
            variablePool
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
        variablePool?: VariablePool
    ): ExecutionInstance[] {
        const [sh, sm] = timeStart.split(':').map(Number);
        const [eh, em] = timeEnd.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;

        if (endMin <= startMin) {
            throw new Error(`timeEnd (${timeEnd}) must be after timeStart (${timeStart})`);
        }

        const totalMinutes = endMin - startMin;
        const minIntervalMinutes = Math.max(intervaloMinimo / 60, 1);

        const poolOpcionais = variablePool
            ? [...variablePool.opcionais].sort(() => Math.random() - 0.5)
            : [];
        let opcPool = [...poolOpcionais];

        const minIntervalMs = Math.max(intervaloMinimo, 1) * 1000;
        const timestamps: number[] = [];

        for (let i = 0; i < count; i++) {
            const slotMinutes = totalMinutes / count;
            const baseOffset = slotMinutes * i;
            const jitter = Math.random() * Math.max(0, slotMinutes - minIntervalMinutes);
            const randMin = Math.floor(startMin + baseOffset + jitter);
            const randSec = Math.floor(Math.random() * 60);
            const [year, month, day] = date.split('-').map(Number);
            const ts = new Date(year, month - 1, day, Math.floor(randMin / 60), randMin % 60, randSec).getTime();
            timestamps.push(ts);
        }

        timestamps.sort((a, b) => a - b);
        for (let i = 1; i < timestamps.length; i++) {
            if (timestamps[i] - timestamps[i - 1] < minIntervalMs) {
                timestamps[i] = timestamps[i - 1] + minIntervalMs;
            }
        }

        return timestamps.map((ts, i) => {
            const usedOpcionais = new Set<string>();
            const resolved: RawAction[] = template.map(raw => {
                if (raw === 'ITEM_OBRIGATORIO') return obrigatorioValor || '[SEM ITEM]';
                if (raw === 'ITEM_OPCIONAL') {
                    if (opcPool.length === 0) opcPool = [...poolOpcionais].sort(() => Math.random() - 0.5);
                    let pick = opcPool.shift();
                    let attempts = 0;
                    while (pick && usedOpcionais.has(pick.valor) && attempts < opcPool.length + 1) {
                        opcPool.push(pick);
                        pick = opcPool.shift();
                        attempts++;
                    }
                    if (pick && !usedOpcionais.has(pick.valor)) {
                        usedOpcionais.add(pick.valor);
                        return pick.valor;
                    }
                    return pick?.valor || '[SEM OPCIONAL]';
                }
                return raw;
            });

            return new ExecutionInstance(i + 1, ts, resolved);
        });
    }
}
