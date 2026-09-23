import { Schedule } from '../../domain/Schedule';
import { ExecutionInstance } from '../../domain/ExecutionInstance';
import { WEEK_DAYS, STATUS_COLORS, STATUS_LABELS } from '../../domain/constants';
import { escapeHtml } from '../escapeHtml';
import { getActionLabel } from '../ActionLabeler';
import { formatLocalDateTime } from './datetime';

export interface ScheduleDetailCallbacks {
    onBack(): void;
}

export class ScheduleDetailView {
    show(sch: Schedule, callbacks: ScheduleDetailCallbacks, conflictIds: number[] = []): void {
        const overlay = document.createElement('div');
        overlay.className = 'modal-fullscreen';
        overlay.id = 'scheduleDetailModal';

        const modeLabel = sch.mode === 'recurring'
            ? `Recorrente (${sch.days.map(d => WEEK_DAYS[d]).join(', ')})`
            : `Unico (${sch.date})`;

        const dateRangeLabel = sch.dataInicio || sch.dataFim
            ? `📅 ${sch.dataInicio || '?'} → ${sch.dataFim || '?'}`
            : '';

        overlay.innerHTML = `
            <div class="modal-fullscreen-header">
                <h2>📋 ${escapeHtml(sch.flowName)}</h2>
                <button class="btn btn-outline btn-sm btn-back">✕ Voltar</button>
            </div>
            <div style="max-width:900px; margin:0 auto;">
                <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px; color:#aaa; font-size:14px;">
                    <span>🔁 ${modeLabel}</span>
                    ${dateRangeLabel ? `<span>${dateRangeLabel}</span>` : ''}
                    <span>🎯 ${escapeHtml(sch.obrigatorioValor || 'N/A')}</span>
                    <span>🔄 ${sch.repeticoes || sch.executionOrder.length}x</span>
                    <span>⏱ ${sch.intervaloMinimo}s</span>
                </div>
                <div id="scheduleDetailTable"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('.btn-back')!.addEventListener('click', () => {
            overlay.remove();
            callbacks.onBack();
        });

        this._renderTable(overlay.querySelector('#scheduleDetailTable') as HTMLElement, sch, conflictIds);
    }

    private _renderTable(container: HTMLElement, sch: Schedule, conflictIds: number[]): void {
        const order = sch.executionOrder;
        if (order.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhuma execucao gerada</div>';
            return;
        }

        const stats = this._getStats(order);
        const conflictSet = new Set(conflictIds);

        let html = `
            <div style="display:flex; gap:16px; margin-bottom:12px; font-size:13px;">
                <span style="color:${STATUS_COLORS.completed};">✅ ${stats.completed} concluidos</span>
                <span style="color:${STATUS_COLORS.failed};">❌ ${stats.failed} falharam</span>
                <span style="color:${STATUS_COLORS.pending};">⏳ ${stats.pending} pendentes</span>
                <span style="color:${STATUS_COLORS.running};">▶ ${stats.running} rodando</span>
            </div>`;

        if (conflictSet.size > 0) {
            html += `<div class="conflict-banner">⚠ ${conflictSet.size} ordem(ns) em conflito com horarios de outros agendamentos ativos</div>`;
        }

        html += `
            <table class="data-table"><thead><tr>
                <th>#</th><th>Status</th><th>Horario</th><th>Acoes Resolvidas</th>
            </tr></thead><tbody>`;

        order.forEach(inst => {
            const localDT = formatLocalDateTime(inst.gatilhoTime);
            const actionsStr = inst.resolvedActions.map(a => getActionLabel(a)).join(', ');
            const color = STATUS_COLORS[inst.status] || '#888';
            const label = STATUS_LABELS[inst.status] || inst.status;
            const isConflict = conflictSet.has(inst.id);

            html += `<tr${isConflict ? ' class="conflict-row"' : ''}>
                <td>${inst.id}</td>
                <td style="color:${color}; font-weight:bold;">${label}</td>
                <td style="color:#ccc;">${localDT}${isConflict ? ' <span class="conflict-badge">⚠ conflito</span>' : ''}</td>
                <td style="font-family:Consolas,monospace; font-size:12px; color:#a29bfe;">${escapeHtml(actionsStr)}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    private _getStats(order: ExecutionInstance[]): { completed: number; failed: number; pending: number; running: number } {
        return {
            completed: order.filter(i => i.status === 'completed').length,
            failed: order.filter(i => i.status === 'failed').length,
            pending: order.filter(i => i.status === 'pending').length,
            running: order.filter(i => i.status === 'running').length,
        };
    }
}
