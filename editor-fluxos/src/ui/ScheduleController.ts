import { VariablePool, RawAction, ScheduleMode } from '../domain';
import { Schedule, ExecutionInstance } from '../domain';
import { ScheduleManager } from '../use-cases';
import { IScheduleConflictService } from '../adapters';
import { Toast } from './Toast';
import { ScheduleListView } from './schedules/ScheduleListView';
import { ScheduleDetailView } from './schedules/ScheduleDetailView';
import { NewScheduleView } from './schedules/NewScheduleView';
import { PreviewView } from './schedules/PreviewView';
import { ScheduleCardVM } from './schedules/dto';
import { WEEK_DAYS } from '../domain/constants';

export interface ScheduleContext {
    getFluxos(): Record<string, RawAction[]>;
    getVarConfig(): VariablePool;
    scheduleManager: ScheduleManager;
    loadSchedules(): Promise<any[]>;
    saveSchedules(schedules: any[]): Promise<void>;
}

export class ScheduleController {
    private _ctx: ScheduleContext;
    private _conflictService: IScheduleConflictService;
    private _schedules: Schedule[] = [];
    private _listView: ScheduleListView;
    private _detailView: ScheduleDetailView;
    private _newView: NewScheduleView;
    private _previewView: PreviewView;

    constructor(ctx: ScheduleContext, conflictService: IScheduleConflictService) {
        this._ctx = ctx;
        this._conflictService = conflictService;
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
        this._listView.show(this._buildViewModels(), {
            onClose: () => {},
            onNew: () => this._openNewSchedule(),
            onToggle: (scheduleId, active) => this._toggleSchedule(scheduleId, active),
            onRemove: (index) => this._removeSchedule(index),
            onView: (scheduleId) => this._openDetail(scheduleId)
        });
    }

    private async _toggleSchedule(scheduleId: string, active: boolean): Promise<void> {
        const sch = this._schedules.find(s => s.id === scheduleId);
        if (!sch) return;
        sch.active = active;
        await this._persist();
        if (active) {
            const count = this._conflictService.conflictCountInSet(sch, this._schedules);
            if (count > 0) {
                Toast.warning(`Atencao: ${count} execucao(es) deste agendamento conflitam com horarios de outros agendamentos ativos`);
            }
        }
        this._listView.update(this._buildViewModels());
    }

    private async _removeSchedule(index: number): Promise<void> {
        if (!confirm('Remover este agendamento?')) return;
        this._schedules.splice(index, 1);
        await this._persist();
        this._listView.update(this._buildViewModels());
        Toast.info('Agendamento removido');
    }

    private _buildViewModels(): ScheduleCardVM[] {
        return this._schedules.map(sch => {
            const next = sch.executionOrder
                .filter(inst => inst.status === 'pending')
                .sort((a, b) => a.gatilhoTime - b.gatilhoTime)[0];
            return {
                scheduleId: sch.id,
                flowName: sch.flowName,
                active: sch.active,
                conflictCount: sch.active ? this._conflictService.conflictCountInSet(sch, this._schedules) : 0,
                total: sch.executionOrder.length,
                completed: sch.executionOrder.filter(inst => inst.status === 'completed').length,
                next: next ? new Date(next.gatilhoTime).toLocaleString('pt-BR') : 'Nenhum',
                modeLabel: sch.mode === 'recurring'
                    ? `Recorrente (${sch.days.map(d => WEEK_DAYS[d]).join(', ')})`
                    : `Unico (${sch.date})`,
                dateRangeLabel: sch.dataInicio || sch.dataFim
                    ? `📅 ${sch.dataInicio || '?'} → ${sch.dataFim || '?'}`
                    : '',
                obrigatorioValor: sch.obrigatorioValor || 'N/A',
                repeticoesLabel: `${sch.repeticoes || sch.executionOrder.length}x`,
                intervaloLabel: `${sch.intervaloMinimo}s`,
            };
        });
    }

    private _openDetail(scheduleId: string): void {
        const sch = this._schedules.find(s => s.id === scheduleId);
        if (!sch) return;
        this._detailView.show(sch, {
            onBack: () => this._showList()
        });
    }

    private _openNewSchedule(): void {
        this._newView.show(this._ctx.getFluxos(), this._ctx.getVarConfig(), {
            onClose: () => this._showList(),
            generateOrder: (template, obrigValor, count, date, timeStart, timeEnd, interval, dataInicio, dataFim, days) => {
                const order = this._ctx.scheduleManager.generateExecutionOrder(
                    template, obrigValor, count, date, timeStart, timeEnd, interval, this._ctx.getVarConfig(), dataInicio, dataFim, days, this._schedules
                );
                const [sh, sm] = timeStart.split(':').map(Number);
                const [eh, em] = timeEnd.split(':').map(Number);
                const windowSeconds = ((eh * 60 + em) - (sh * 60 + sm)) * 60;
                if ((count - 1) * Math.max(interval, 1) > windowSeconds) {
                    Toast.warning(`Aviso: ${count}x a cada ${interval}s nao cabe em ${timeStart}-${timeEnd}; sera distribuido aleatoriamente na janela disponivel`);
                }
                if (this._ctx.scheduleManager.lastUnsettledCount > 0) {
                    Toast.warning(`${this._ctx.scheduleManager.lastUnsettledCount} execucao(es) nao couberam na janela sem conflitar com outros agendamentos; horarios aproximados`);
                }
                return order;
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
        const refreshConflicts = () => {
            const projected = {
                id: 'preview',
                active: true,
                intervaloMinimo: r.interval,
                executionOrder: r.order,
            } as unknown as Schedule;
            this._previewView.setConflicts(
                this._conflictService.conflictingInstanceIds(projected, this._schedules)
            );
        };

        this._previewView.show(r.flowName, r.order, {
            onCancel: () => this._showList(),
            onTimeChanged: (idx, timeMs) => {
                r.order[idx].gatilhoTime = timeMs;
                refreshConflicts();
            },
            onRemove: (idx) => {
                r.order.splice(idx, 1);
                this._previewView.removeRow(idx);
                refreshConflicts();
            },
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

        refreshConflicts();
    }
}
