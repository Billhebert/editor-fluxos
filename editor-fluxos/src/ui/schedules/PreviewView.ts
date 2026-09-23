import { ExecutionInstance } from '../../domain/ExecutionInstance';
import { escapeHtml } from '../escapeHtml';
import { getActionLabel } from '../ActionLabeler';
import { formatLocalDateTimeEdit, parseLocalDateTimeEdit } from './datetime';

export interface PreviewCallbacks {
    onConfirm(): Promise<void>;
    onCancel(): void;
    onTimeChanged(index: number, timeMs: number): void;
    onRemove(index: number): void;
}

export class PreviewView {
    private _overlay: HTMLElement | null = null;
    private _order: ExecutionInstance[] = [];
    private _conflictIds: Set<number> = new Set();

    show(flowName: string, order: ExecutionInstance[], callbacks: PreviewCallbacks): void {
        this._destroy();
        this._order = order;
        this._conflictIds = new Set();

        const overlay = document.createElement('div');
        overlay.className = 'modal-fullscreen';
        overlay.id = 'execOrderPreviewModal';
        overlay.innerHTML = `
            <div class="modal-fullscreen-header">
                <h2>📋 Ordem - ${escapeHtml(flowName)}</h2>
                <button class="btn btn-success btn-sm btn-confirm">✅ Confirmar</button>
                <button class="btn btn-outline btn-sm btn-cancel">✕ Cancelar</button>
            </div>
            <div id="execOrderPreviewBanner"></div>
            <div id="execOrderTable" style="max-width:900px; margin:0 auto;"></div>
        `;
        document.body.appendChild(overlay);
        this._overlay = overlay;

        overlay.querySelector('.btn-cancel')!.addEventListener('click', () => { this._destroy(); callbacks.onCancel(); });
        overlay.querySelector('.btn-confirm')!.addEventListener('click', async () => {
            await callbacks.onConfirm();
            this._destroy();
        });

        this._renderTable(callbacks);
    }

    setConflicts(instanceIds: Iterable<number>): void {
        this._conflictIds = new Set(instanceIds);
        const banner = this._overlay?.querySelector('#execOrderPreviewBanner') as HTMLElement;
        if (banner) {
            if (this._conflictIds.size > 0) {
                banner.innerHTML = `<div class="conflict-banner">⚠ ${this._conflictIds.size} horario(s) conflitam com outros agendamentos ativos.</div>`;
            } else {
                banner.innerHTML = '';
            }
        }
        if (!this._overlay) return;
        this._overlay.querySelectorAll<HTMLElement>('#execOrderTable tbody tr').forEach(row => {
            const idx = parseInt(row.dataset.idx!);
            const inst = this._order[idx];
            row.classList.toggle('conflict-row', !Number.isNaN(idx) && !!inst && this._conflictIds.has(inst.id));
        });
    }

    removeRow(index: number): void {
        const overlay = this._overlay;
        if (!overlay) return;
        const rows = overlay.querySelectorAll<HTMLElement>('#execOrderTable tbody tr');
        const row = rows[index];
        if (!row) return;
        const tbody = row.parentElement;
        row.remove();
        if (!tbody) return;
        const liveRows = Array.from(tbody.querySelectorAll<HTMLElement>('tr'));
        for (let i = index; i < liveRows.length; i++) {
            const r = liveRows[i];
            r.dataset.idx = String(i);
            (r.querySelector('.time-input') as HTMLElement)?.setAttribute('data-idx', String(i));
            (r.querySelector('.btn-remove-item') as HTMLElement)?.setAttribute('data-idx', String(i));
        }
    }

    private _renderTable(callbacks: PreviewCallbacks): void {
        const overlay = this._overlay;
        if (!overlay) return;
        const tableContainer = overlay.querySelector('#execOrderTable') as HTMLElement;

        let html = '<table class="data-table"><thead><tr><th>#</th><th>Horario (dd/mm/aaaa hh:mm)</th><th>Acoes</th><th></th></tr></thead><tbody>';
        this._order.forEach((inst, i) => {
            const localDT = formatLocalDateTimeEdit(inst.gatilhoTime);
            const actionsStr = inst.resolvedActions.map((a: any) => getActionLabel(a)).join(', ');

            html += `<tr data-idx="${i}">
                <td>${inst.id}</td>
                <td><input type="text" value="${localDT}" placeholder="dd/mm/aaaa hh:mm" data-idx="${i}" class="time-input" /></td>
                <td style="font-family:Consolas,monospace; font-size:12px; color:#a29bfe;">${actionsStr}</td>
                <td><button class="btn btn-danger btn-sm btn-remove-item" data-idx="${i}">✕</button></td>
            </tr>`;
        });
        html += '</tbody></table>';
        tableContainer.innerHTML = html;

        tableContainer.querySelectorAll('.time-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const el = e.target as HTMLInputElement;
                const idx = parseInt(el.dataset.idx!);
                const timeMs = parseLocalDateTimeEdit(el.value);
                if (Number.isNaN(timeMs)) {
                    const inst = this._order[idx];
                    if (inst) el.value = formatLocalDateTimeEdit(inst.gatilhoTime);
                    return;
                }
                callbacks.onTimeChanged(idx, timeMs);
            });
        });
        tableContainer.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt((e.target as HTMLElement).dataset.idx!);
                callbacks.onRemove(idx);
            });
        });
    }

    private _destroy(): void {
        this._overlay?.remove();
        this._overlay = null;
        this._order = [];
        this._conflictIds = new Set();
    }
}