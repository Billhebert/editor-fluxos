import { RawAction } from '../domain/types';
import { escapeHtml } from './escapeHtml';
import { getActionClass, getActionLabel } from './ActionLabeler';
import { getDragAfterElement } from './DragSortAlgorithm';

export interface FlowRendererCallbacks {
    onRecord?: (name: string) => void;
    onExecute?: (name: string, actions: RawAction[]) => void;
    onRemove?: (name: string) => void;
    onRename?: (oldName: string, newName: string) => void;
    onRemoveAction?: (flowName: string, index: number) => void;
    onMoveAction?: (flowName: string, fromIndex: number, toIndex: number) => void;
}

export class FlowRenderer {
    private _grid: HTMLElement;

    constructor() {
        this._grid = document.getElementById('fluxosGrid')!;
    }

    renderAll(fluxos: Record<string, RawAction[]>, callbacks: FlowRendererCallbacks = {}): void {
        this._grid.innerHTML = '';
        Object.entries(fluxos).forEach(([name, actions]) => {
            this._grid.appendChild(this._createCard(name, actions, callbacks));
        });
    }

    private _createCard(name: string, actions: RawAction[], callbacks: FlowRendererCallbacks): HTMLElement {
        const card = document.createElement('div');
        card.className = 'fluxo-card';
        card.dataset.name = name;

        const header = document.createElement('div');
        header.className = 'fluxo-header';
        header.innerHTML = `
            <span class="fluxo-label">Fluxo</span>
            <input type="text" value="${escapeHtml(name)}" class="fluxo-name" />
            <button class="btn btn-primary btn-sm btn-record">⏺ Gravar</button>
            <button class="btn btn-success btn-sm btn-exec">▶ Executar</button>
            <button class="btn btn-danger btn-sm btn-remove">✕</button>
        `;

        header.querySelector('.fluxo-name')!.addEventListener('change', (e) => {
            const newName = (e.target as HTMLInputElement).value.trim();
            if (callbacks.onRename) callbacks.onRename(name, newName);
        });

        header.querySelector('.btn-record')!.addEventListener('click', () => {
            if (callbacks.onRecord) callbacks.onRecord(name);
        });

        header.querySelector('.btn-exec')!.addEventListener('click', () => {
            if (callbacks.onExecute) callbacks.onExecute(name, actions);
        });

        header.querySelector('.btn-remove')!.addEventListener('click', () => {
            if (callbacks.onRemove) callbacks.onRemove(name);
        });

        const body = document.createElement('div');
        body.className = 'fluxo-body';

        const list = document.createElement('div');
        list.className = 'action-list';
        list.dataset.fluxo = name;

        actions.forEach((action, i) => {
            list.appendChild(this._createActionItem(action, name, i, callbacks));
        });

        this._setupDropZone(list, callbacks);
        body.appendChild(list);
        card.appendChild(header);
        card.appendChild(body);
        return card;
    }

    private _createActionItem(action: RawAction, fluxoName: string, index: number, callbacks: FlowRendererCallbacks): HTMLElement {
        const el = document.createElement('div');
        el.className = `action-item ${getActionClass(action)}`;
        el.dataset.index = String(index);
        el.draggable = true;
        el.textContent = getActionLabel(action);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'action-remove';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (callbacks.onRemoveAction) callbacks.onRemoveAction(fluxoName, index);
        });
        el.appendChild(removeBtn);

        el.addEventListener('dragstart', (e) => {
            e.dataTransfer!.setData('text/plain', String(index));
            el.classList.add('dragging');
        });
        el.addEventListener('dragend', () => el.classList.remove('dragging'));

        return el;
    }

    private _setupDropZone(list: HTMLElement, callbacks: FlowRendererCallbacks): void {
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            list.classList.add('drag-over');
        });
        list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
        list.addEventListener('drop', (e) => {
            e.preventDefault();
            list.classList.remove('drag-over');
            const fromIndex = parseInt(e.dataTransfer!.getData('text/plain'));
            const afterElement = getDragAfterElement(list, e.clientY);
            const toIndex = afterElement
                ? parseInt(afterElement.dataset.index || '0')
                : list.children.length;
            if (fromIndex !== toIndex && callbacks.onMoveAction) {
                callbacks.onMoveAction(list.dataset.fluxo!, fromIndex, toIndex);
            }
        });
    }

    highlightAction(flowName: string, index: number, highlight: boolean = true): void {
        const card = this._grid.querySelector(`[data-name="${flowName}"]`) as HTMLElement;
        if (!card) return;
        const items = card.querySelectorAll('.action-item');
        if (items[index]) {
            items[index].classList.toggle('executing', highlight);
        }
    }

    clearHighlights(flowName: string): void {
        const card = this._grid.querySelector(`[data-name="${flowName}"]`) as HTMLElement;
        if (!card) return;
        card.querySelectorAll('.action-item.executing').forEach(el => el.classList.remove('executing'));
    }

    setRunning(flowName: string, running: boolean): void {
        const card = this._grid.querySelector(`[data-name="${flowName}"]`) as HTMLElement;
        if (card) card.classList.toggle('running', running);
    }
}
