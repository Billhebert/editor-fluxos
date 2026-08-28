import { ExecutionInstance } from '../../domain/ExecutionInstance';
import { escapeHtml } from '../escapeHtml';
import { getActionLabel } from '../ActionLabeler';
import { formatLocalDateTimeInput } from './datetime';

export interface PreviewCallbacks {
    onConfirm(): Promise<void>;
    onCancel(): void;
}

export class PreviewView {
    show(flowName: string, order: ExecutionInstance[], callbacks: PreviewCallbacks): void {
        const overlay = document.createElement('div');
        overlay.className = 'modal-fullscreen';
        overlay.id = 'execOrderPreviewModal';
        overlay.innerHTML = `
            <div class="modal-fullscreen-header">
                <h2>📋 Ordem - ${escapeHtml(flowName)}</h2>
                <button class="btn btn-success btn-sm btn-confirm">✅ Confirmar</button>
                <button class="btn btn-outline btn-sm btn-cancel">✕ Cancelar</button>
            </div>
            <div id="execOrderTable" style="max-width:900px; margin:0 auto;"></div>
        `;
        document.body.appendChild(overlay);

        const tableContainer = overlay.querySelector('#execOrderTable') as HTMLElement;
        this._renderOrderTable(tableContainer, order);

        overlay.querySelector('.btn-cancel')!.addEventListener('click', () => { overlay.remove(); callbacks.onCancel(); });
        overlay.querySelector('.btn-confirm')!.addEventListener('click', async () => {
            await callbacks.onConfirm();
            overlay.remove();
        });
    }

    private _renderOrderTable(container: HTMLElement, order: ExecutionInstance[]): void {
        let html = '<table class="data-table"><thead><tr><th>#</th><th>Horario</th><th>Acoes</th><th></th></tr></thead><tbody>';
        order.forEach((inst, i) => {
            const localDT = formatLocalDateTimeInput(inst.gatilhoTime);
            const actionsStr = inst.resolvedActions.map((a: any) => getActionLabel(a)).join(', ');

            html += `<tr>
                <td>${inst.id}</td>
                <td><input type="datetime-local" value="${localDT}" data-idx="${i}" class="time-input" /></td>
                <td style="font-family:Consolas,monospace; font-size:12px; color:#a29bfe;">${actionsStr}</td>
                <td><button class="btn btn-danger btn-sm btn-remove-item" data-idx="${i}">✕</button></td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;

        container.querySelectorAll('.time-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt((e.target as HTMLInputElement).dataset.idx!);
                order[idx].gatilhoTime = new Date((e.target as HTMLInputElement).value).getTime();
            });
        });
        container.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt((e.target as HTMLElement).dataset.idx!);
                order.splice(idx, 1);
                this._renderOrderTable(container, order);
            });
        });
    }
}
