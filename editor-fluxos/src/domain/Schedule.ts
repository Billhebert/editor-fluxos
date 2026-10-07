import { ExecutionInstance } from './ExecutionInstance';
import { ScheduleMode } from './types';
import { ValidationError } from './errors';

export interface ScheduleConfig {
    id?: string;
    flowName: string;
    obrigatorioValor?: string;
    repeticoes?: number;
    intervaloMinimo?: number;
    mode?: ScheduleMode;
    active?: boolean;
    pushOnConflict?: boolean;
    date?: string;
    days?: number[];
    timeStart?: string;
    timeEnd?: string;
    dataInicio?: string | null;
    dataFim?: string | null;
    executionOrder?: any[];
}

// Sequencia monotonica: Date.now() sozinho colide quando dois agendamentos
// sao criados no mesmo milissegundo, o que quebra remocao/atribuicao por id.
let idSeq = 0;

function nextScheduleId(): string {
    idSeq = (idSeq + 1) % Number.MAX_SAFE_INTEGER;
    return `sch_${Date.now().toString(36)}_${idSeq.toString(36)}`;
}

export class Schedule {
    id: string;
    flowName: string;
    obrigatorioValor: string;
    repeticoes: number;
    intervaloMinimo: number;
    mode: ScheduleMode;
    active: boolean;
    pushOnConflict: boolean;
    date: string | null;
    days: number[];
    timeStart: string;
    timeEnd: string;
    dataInicio: string | null;
    dataFim: string | null;
    executionOrder: ExecutionInstance[];

    constructor(config: ScheduleConfig) {
        if (!config.flowName || !config.flowName.trim()) {
            throw new ValidationError('Schedule.flowName', 'cannot be empty');
        }

        this.id = config.id || nextScheduleId();
        this.flowName = config.flowName.trim();
        this.obrigatorioValor = config.obrigatorioValor || '';
        this.repeticoes = (config.repeticoes != null && config.repeticoes > 0) ? config.repeticoes : 1;
        this.intervaloMinimo = (config.intervaloMinimo != null && config.intervaloMinimo > 0) ? config.intervaloMinimo : 60;
        this.mode = config.mode || 'one-shot';
        this.active = config.active !== false;
        this.pushOnConflict = config.pushOnConflict !== false;
        this.date = config.date || null;
        this.days = (config.days || []).filter(d => d >= 0 && d <= 6);
        this.timeStart = config.timeStart || '07:00';
        this.timeEnd = config.timeEnd || '08:00';
        this.dataInicio = config.dataInicio || null;
        this.dataFim = config.dataFim || null;
        this.executionOrder = (config.executionOrder || [])
            .map(i => i instanceof ExecutionInstance ? i : ExecutionInstance.fromJSON(i));
    }

    get totalInstances(): number { return this.executionOrder.length; }

    get completedCount(): number {
        return this.executionOrder.filter(i => i.status === 'completed').length;
    }

    get failedCount(): number {
        return this.executionOrder.filter(i => i.status === 'failed').length;
    }

    get missedCount(): number {
        return this.executionOrder.filter(i => i.status === 'missed').length;
    }

    get cancelledCount(): number {
        return this.executionOrder.filter(i => i.status === 'cancelled').length;
    }

    get pendingInstances(): ExecutionInstance[] {
        return this.executionOrder.filter(i => i.status === 'pending');
    }

    get nextPending(): ExecutionInstance | undefined {
        return this.executionOrder
            .filter(i => i.status === 'pending')
            .sort((a, b) => a.gatilhoTime - b.gatilhoTime)[0];
    }

    toggleActive(active: boolean): void {
        this.active = active;
    }

    updateExecutionOrder(order: ExecutionInstance[]): void {
        this.executionOrder = order.map(i => i instanceof ExecutionInstance ? i : ExecutionInstance.fromJSON(i));
    }

    findInstance(id: number): ExecutionInstance | undefined {
        return this.executionOrder.find(i => i.id === id);
    }

    toJSON(): any {
        return {
            id: this.id,
            flowName: this.flowName,
            obrigatorioValor: this.obrigatorioValor,
            repeticoes: this.repeticoes,
            intervaloMinimo: this.intervaloMinimo,
            mode: this.mode,
            active: this.active,
            pushOnConflict: this.pushOnConflict,
            date: this.date,
            days: this.days,
            timeStart: this.timeStart,
            timeEnd: this.timeEnd,
            dataInicio: this.dataInicio,
            dataFim: this.dataFim,
            executionOrder: this.executionOrder.map(i => i.toJSON())
        };
    }

    static fromJSON(data: any): Schedule {
        return new Schedule(data);
    }
}
