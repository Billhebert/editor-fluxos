import { Schedule } from '../../domain/Schedule';
import { WEEK_DAYS } from '../../domain/constants';
import { escapeHtml } from '../escapeHtml';

export interface ScheduleListCallbacks {
    onClose(): void;
    onNew(): void;
    onToggle(schedule: Schedule, active: boolean): void;
    onRemove(index: number): void;
    onView(schedule: Schedule): void;
}

export class ScheduleListView {
    show(schedules: Schedule[], callbacks: ScheduleListCallbacks): HTMLElement {
        const overlay = document.createElement('div');
        overlay.className = 'modal-fullscreen';
        overlay.id = 'schedulesModal';

        overlay.innerHTML = `
            <div class="modal-fullscreen-header">
                <h2>📅 Agendamentos</h2>
                <button class="btn btn-primary btn-sm btn-new">+ Novo</button>
                <button class="btn btn-outline btn-sm btn-close">✕ Voltar</button>
            </div>
            <div id="schedulesContainer" style="max-width:900px; margin:0 auto;"></div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('.btn-close')!.addEventListener('click', () => { overlay.remove(); callbacks.onClose(); });
        overlay.querySelector('.btn-new')!.addEventListener('click', () => { overlay.remove(); callbacks.onNew(); });

        this._renderList(overlay, schedules, callbacks);
        return overlay;
    }

    private _renderList(overlay: HTMLElement, schedules: Schedule[], callbacks: ScheduleListCallbacks): void {
        const container = overlay.querySelector('#schedulesContainer') as HTMLElement;
        if (!container) return;

        if (schedules.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum agendamento configurado</div>';
            return;
        }

        container.innerHTML = '';
        schedules.forEach((sch, i) => {
            const total = sch.executionOrder.length;
            const completed = sch.executionOrder.filter(inst => inst.status === 'completed').length;
            const next = sch.executionOrder
                .filter(inst => inst.status === 'pending')
                .sort((a, b) => a.gatilhoTime - b.gatilhoTime)[0];
            const nextTime = next ? new Date(next.gatilhoTime).toLocaleString('pt-BR') : 'Nenhum';

            const modeLabel = sch.mode === 'recurring'
                ? `Recorrente (${sch.days.map(d => WEEK_DAYS[d]).join(', ')})`
                : `Unico (${sch.date})`;

            const card = document.createElement('div');
            card.className = 'schedule-card';
            card.innerHTML = `
                <div class="schedule-card-header">
                    <h4>${escapeHtml(sch.flowName)}</h4>
                    <label class="toggle">
                        <input type="checkbox" ${sch.active ? 'checked' : ''} />
                        <span class="toggle-slider"></span>
                    </label>
                    <button class="btn btn-primary btn-sm btn-view">👁 Detalhes</button>
                    <button class="btn btn-outline btn-sm btn-remove">✕</button>
                </div>
                <div class="schedule-card-meta">
                    <span>🔁 ${modeLabel}</span>
                    <span>🎯 ${escapeHtml(sch.obrigatorioValor || 'N/A')}</span>
                    <span>🔄 ${sch.repeticoes || total}x</span>
                    <span>⏱ ${sch.intervaloMinimo}s</span>
                    <span>📊 ${completed}/${total} executados</span>
                    <span>⏭ Proximo: ${nextTime}</span>
                </div>
            `;

            card.querySelector('input[type=checkbox]')!.addEventListener('change', (e) => {
                callbacks.onToggle(sch, (e.target as HTMLInputElement).checked);
            });
            card.querySelector('.btn-remove')!.addEventListener('click', () => callbacks.onRemove(i));
            card.querySelector('.btn-view')!.addEventListener('click', () => {
                overlay.remove();
                callbacks.onView(sch);
            });

            container.appendChild(card);
        });
    }
}
