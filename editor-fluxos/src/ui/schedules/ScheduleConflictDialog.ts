import { escapeHtml } from '../escapeHtml';

export interface ConflictEntry {
    scheduleId: string;
    flowName: string;
    count: number;
}

export interface ConflictDialogCallbacks {
    onReschedule(): void;
    onDelete(ids: string[]): void;
    onEdit(): void;
    onClose(): void;
}

// Dialogo de resolucao de conflito: lista os agendas em conflito com o novo
// e oferece reagendar automaticamente, excluir os conflitantes ou editar.
export class ScheduleConflictDialog {
    static show(conflicts: ConflictEntry[], callbacks: ConflictDialogCallbacks): void {
        const existing = document.getElementById('scheduleConflictModal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'modal-fullscreen';
        overlay.id = 'scheduleConflictModal';
        overlay.innerHTML = `
            <div class="modal-fullscreen-header">
                <h2>⚠ Conflito de Horario</h2>
                <button class="btn btn-outline btn-sm btn-close">✕ Fechar</button>
            </div>
            <div style="max-width:700px; margin:0 auto;">
                <div class="conflict-banner" style="margin-bottom:16px;">
                    Este agendamento conflita com outro(s). A geracao de ordens sobrepostas quebraria a automacao,
                    entao escolha como resolver.
                </div>
                <div id="conflictList"></div>
                <div style="margin-top:16px; display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-success btn-sm btn-reschedule">🔁 Reagendar Automaticamente</button>
                    <button class="btn btn-danger btn-sm btn-delete">🗑 Excluir Conflitante(s) e Regerar</button>
                    <button class="btn btn-outline btn-sm btn-edit">✏ Editar Manualmente</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const listEl = overlay.querySelector('#conflictList') as HTMLElement;
        if (conflicts.length === 0) {
            listEl.innerHTML = '<div class="empty-state">Nenhum agendamento conflitante.</div>';
        } else {
            const rows = conflicts.map(c => `
                <label style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:#1a1a2e; border:1px solid #333; border-radius:6px; margin-bottom:8px; cursor:pointer;">
                    <input type="checkbox" class="conflict-check" value="${escapeHtml(c.scheduleId)}" checked />
                    <span style="flex:1;">${escapeHtml(c.flowName)}</span>
                    <span class="conflict-badge">⚠ ${c.count} conflito(s)</span>
                </label>
            `).join('');
            listEl.innerHTML = `<div style="font-size:12px; color:#888; margin-bottom:8px;">Marque os agendamentos em conflito para excluir:</div>${rows}`;
        }

        const close = () => { overlay.remove(); callbacks.onClose(); };

        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('.btn-close')!.addEventListener('click', close);
        overlay.querySelector('.btn-reschedule')!.addEventListener('click', () => { overlay.remove(); callbacks.onReschedule(); });
        overlay.querySelector('.btn-edit')!.addEventListener('click', () => { overlay.remove(); callbacks.onEdit(); });
        overlay.querySelector('.btn-delete')!.addEventListener('click', () => {
            const ids = [...overlay.querySelectorAll<HTMLInputElement>('.conflict-check:checked')].map(c => c.value);
            overlay.remove();
            callbacks.onDelete(ids);
        });
    }
}