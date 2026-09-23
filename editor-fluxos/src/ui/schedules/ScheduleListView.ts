import { escapeHtml } from '../escapeHtml';
import { ScheduleCardVM, ScheduleListCallbacks } from './dto';

// View burra: recebe dados prontos (ScheduleCardVM) e emite eventos.
// Nada de negocios aqui; a listagem e reconciliada por diff, sem rebuild global.
export class ScheduleListView {
    private _container: HTMLElement | null = null;
    private _callbacks: ScheduleListCallbacks | null = null;

    show(vms: ScheduleCardVM[], callbacks: ScheduleListCallbacks): HTMLElement {
        this._destroy();
        this._callbacks = callbacks;

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

        this._container = overlay.querySelector('#schedulesContainer');
        overlay.querySelector('.btn-close')!.addEventListener('click', () => {
            this._destroy();
            callbacks.onClose();
        });
        overlay.querySelector('.btn-new')!.addEventListener('click', () => {
            this._destroy();
            callbacks.onNew();
        });

        this._renderList(vms);
        return overlay;
    }

    update(vms: ScheduleCardVM[]): void {
        if (!this._container) return;
        this._renderList(vms);
    }

    private _renderList(vms: ScheduleCardVM[]): void {
        const container = this._container;
        if (!container) return;

        if (vms.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum agendamento configurado</div>';
            return;
        }

        const existingCards = new Map<string, HTMLElement>();
        for (const child of Array.from(container.children)) {
            const el = child as HTMLElement;
            if (el.dataset.scheduleId) existingCards.set(el.dataset.scheduleId, el);
        }

        const seenIds = new Set<string>();
        for (const vm of vms) {
            seenIds.add(vm.scheduleId);
            const existing = existingCards.get(vm.scheduleId);
            if (existing) {
                this._updateCard(existing, vm);
            } else {
                container.appendChild(this._createCard(vm));
            }
        }

        for (const [schId, el] of existingCards) {
            if (!seenIds.has(schId)) el.remove();
        }
    }

    private _createCard(vm: ScheduleCardVM): HTMLElement {
        const card = document.createElement('div');
        card.className = 'schedule-card';
        card.dataset.scheduleId = vm.scheduleId;
        card.innerHTML = `
            <div class="schedule-card-header">
                <h4>${escapeHtml(vm.flowName)}</h4>
                <label class="toggle">
                    <input type="checkbox" />
                    <span class="toggle-slider"></span>
                </label>
                <button class="btn btn-primary btn-sm btn-view">👁 Detalhes</button>
                <button class="btn btn-outline btn-sm btn-remove">✕</button>
            </div>
            <div class="schedule-card-meta">
                <span class="meta-mode">🔁 ${escapeHtml(vm.modeLabel)}</span>
                <span class="meta-date-range"></span>
                <span class="meta-obrig">🎯 ${escapeHtml(vm.obrigatorioValor)}</span>
                <span class="meta-repeat">🔄 ${escapeHtml(vm.repeticoesLabel)}</span>
                <span class="meta-interval">⏱ ${escapeHtml(vm.intervaloLabel)}</span>
                <span class="meta-progress">📊 ${vm.completed}/${vm.total} executados</span>
                <span class="meta-next">⏭ Proximo: ${escapeHtml(vm.next)}</span>
            </div>
        `;

        const doToggle = () => card.querySelector('input[type=checkbox]')!.addEventListener('change', (e) => {
            if (this._callbacks) this._callbacks.onToggle(vm.scheduleId, (e.target as HTMLInputElement).checked);
        });
        doToggle();
        card.querySelector('.btn-remove')!.addEventListener('click', () => {
            if (!this._callbacks) return;
            const index = Array.from(this._container!.children).indexOf(card);
            this._callbacks.onRemove(index);
        });
        card.querySelector('.btn-view')!.addEventListener('click', () => {
            if (!this._callbacks) return;
            this._destroy();
            this._callbacks.onView(vm.scheduleId);
        });

        this._applyCardData(card, vm);
        return card;
    }

    private _updateCard(card: HTMLElement, vm: ScheduleCardVM): void {
        this._applyCardData(card, vm);
    }

    private _applyCardData(card: HTMLElement, vm: ScheduleCardVM): void {
        const header = card.querySelector('.schedule-card-header');
        let badge = card.querySelector('.conflict-badge') as HTMLElement | null;
        if (vm.conflictCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'conflict-badge';
                header?.insertBefore(badge, header.querySelector('.toggle'));
            }
            badge.textContent = `⚠ ${vm.conflictCount} conflito(s)`;
        } else if (badge) {
            badge.remove();
        }
        let approxBadge = card.querySelector('.approx-badge') as HTMLElement | null;
        if (vm.approxCount > 0) {
            if (!approxBadge) {
                approxBadge = document.createElement('span');
                approxBadge.className = 'approx-badge';
                header?.insertBefore(approxBadge, header.querySelector('.toggle'));
            }
            approxBadge.textContent = `⚠ ${vm.approxCount} fora da janela`;
        } else if (approxBadge) {
            approxBadge.remove();
        }
        const checkbox = card.querySelector('input[type=checkbox]') as HTMLInputElement;
        if (checkbox) checkbox.checked = vm.active;
        const dateRange = card.querySelector('.meta-date-range');
        if (dateRange) dateRange.textContent = vm.dateRangeLabel;
        const progress = card.querySelector('.meta-progress');
        if (progress) progress.textContent = `📊 ${vm.completed}/${vm.total} executados`;
        const next = card.querySelector('.meta-next');
        if (next) next.textContent = `⏭ Proximo: ${vm.next}`;
    }

    private _destroy(): void {
        this._container = null;
        document.getElementById('schedulesModal')?.remove();
    }
}