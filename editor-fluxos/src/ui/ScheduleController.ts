import { VariablePool, RawAction, ScheduleMode } from '../domain';
import { Schedule, ExecutionInstance } from '../domain';
import { ScheduleManager } from '../use-cases/ScheduleManager';
import { Toast } from './Toast';
import { ScheduleListView } from './schedules/ScheduleListView';
import { ScheduleDetailView } from './schedules/ScheduleDetailView';
import { NewScheduleView } from './schedules/NewScheduleView';
import { PreviewView } from './schedules/PreviewView';

export interface ScheduleContext {
    getFluxos(): Record<string, RawAction[]>;
    getVarConfig(): VariablePool;
    scheduleManager: ScheduleManager;
    loadSchedules(): Promise<any[]>;
    saveSchedules(schedules: any[]): Promise<void>;
}

export class ScheduleController {
    private _ctx: ScheduleContext;
    private _schedules: Schedule[] = [];
    private _listView: ScheduleListView;
    private _detailView: ScheduleDetailView;
    private _newView: NewScheduleView;
    private _previewView: PreviewView;

    constructor(ctx: ScheduleContext) {
        this._ctx = ctx;
        this._listView = new ScheduleListView();
        this._detailView = new ScheduleDetailView();
        this._newView = new NewScheduleView();
        this._previewView = new PreviewView();
    }

    get schedules(): Schedule[] { return this._schedules; }

    async openSchedules(): Promise<void> {
        this._schedules = await this._ctx.loadSchedules();
        this._showList();
    }

    private async _persist(): Promise<void> {
        await this._ctx.saveSchedules(this._schedules);
    }

    private _showList(): void {
        this._listView.show(this._schedules, {
            onClose: () => {},
            onNew: () => this._openNewSchedule(),
            onToggle: async (sch, active) => {
                sch.active = active;
                await this._persist();
            },
            onRemove: async (i) => {
                if (!confirm('Remover este agendamento?')) return;
                this._schedules.splice(i, 1);
                await this._persist();
                this._showList();
                Toast.info('Agendamento removido');
            },
            onView: (sch) => this._openDetail(sch)
        });
    }

    private _openDetail(sch: Schedule): void {
        this._detailView.show(sch, {
            onBack: () => this._showList()
        });
    }

    private _openNewSchedule(): void {
        this._newView.show(this._ctx.getFluxos(), this._ctx.getVarConfig(), {
            onClose: () => this._showList(),
            generateOrder: (template, obrigValor, count, date, timeStart, timeEnd, interval, dataInicio, dataFim) => {
                return this._ctx.scheduleManager.generateExecutionOrder(
                    template, obrigValor, count, date, timeStart, timeEnd, interval, this._ctx.getVarConfig(), dataInicio, dataFim
                );
            },
            onGenerate: (result) => this._openPreview(result)
        });
    }

    private _openPreview(r: {
        flowName: string; order: ExecutionInstance[]; mode: ScheduleMode;
        date: string; timeStart: string; timeEnd: string; days: number[];
        obrigValor: string; count: number; interval: number;
        dataInicio: string | null; dataFim: string | null;
    }): void {
        this._previewView.show(r.flowName, r.order, {
            onCancel: () => this._showList(),
            onConfirm: async () => {
                const schedule = new Schedule({
                    flowName: r.flowName,
                    obrigatorioValor: r.obrigValor,
                    repeticoes: r.count,
                    intervaloMinimo: r.interval,
                    mode: r.mode,
                    date: r.mode === 'one-shot' ? r.date : new Date().toISOString().split('T')[0],
                    timeStart: r.timeStart,
                    timeEnd: r.timeEnd,
                    days: r.days,
                    dataInicio: r.dataInicio,
                    dataFim: r.dataFim,
                    active: true,
                    executionOrder: r.order
                });

                this._schedules.push(schedule);
                await this._persist();
                this._showList();
                Toast.success(`Agendamento criado com ${r.order.length} execucoes!`);
            }
        });
    }
}
