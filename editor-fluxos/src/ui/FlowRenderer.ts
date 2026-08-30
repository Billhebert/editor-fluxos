import { RawAction } from '../domain/types';
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
        const newNames = Object.keys(fluxos);
        const existingCards = new Map<string, HTMLElement>();
        for (const child of Array.from(this._grid.children)) {
            const el = child as HTMLElement;
            if (el.dataset.name) existingCards.set(el.dataset.name, el);
        }

        const seenNames = new Set<string>();
        for (const name of newNames) {
            seenNames.add(name);
            const actions = fluxos[name];
            const existing = existingCards.get(name);
            if (existing) {
                this._updateActionList(existing, name, actions, callbacks);
            } else {
                this._grid.appendChild(this._createCard(name, actions, callbacks));
            }
        }

        for (const [name, card] of existingCards) {
            if (!seenNames.has(name)) card.remove();
        }
    }

    private _updateActionList(card: HTMLElement, name: string, actions: RawAction[], callbacks: FlowRendererCallbacks): void {
        const list = card.querySelector('.action-list') as HTMLElement;
        if (!list) return;
        list.dataset.fluxo = name;

        const existingItems = new Map<string, HTMLElement>();
        for (const child of Array.from(list.children)) {
            const el = child as HTMLElement;
            if (el.dataset.index !== undefined) existingItems.set(el.dataset.index, el);
        }

        const seenIndices = new Set<string>();
        for (let i = 0; i < actions.length; i++) {
            const key = String(i);
            seenIndices.add(key);
            const existing = existingItems.get(key);
            if (existing) {
                this._updateActionItem(existing, actions[i], name, i, callbacks);
            } else {
                list.appendChild(this._createActionItem(actions[i], name, i, callbacks));
            }
        }

        for (const [idx, el] of existingItems) {
            if (!seenIndices.has(idx)) el.remove();
        }
    }

    private _updateActionItem(el: HTMLElement, action: RawAction, _fluxoName: string, index: number, _callbacks: FlowRendererCallbacks): void {
        const newClass = `action-item ${getActionClass(action)}`;
        if (el.className !== newClass) el.className = newClass;
        el.dataset.index = String(index);
        const label = getActionLabel(action);
        const textNode = el.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE && textNode.textContent !== label) {
            textNode.textContent = label;
        }
    }

    private _createCard(name: string, actions: RawAction[], callbacks: FlowRendererCallbacks): HTMLElement {
        const card = document.createElement('div');
        card.className = 'fluxo-card';
        card.dataset.name = name;

        const header = document.createElement('div');
        header.className = 'fluxo-header';

        const label = document.createElement('span');
        label.className = 'fluxo-label';
        label.textContent = 'Fluxo';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = name;
        nameInput.className = 'fluxo-name';
        nameInput.addEventListener('change', (e) => {
            const newName = (e.target as HTMLInputElement).value.trim();
            if (callbacks.onRename) callbacks.onRename(name, newName);
        });

        const recordBtn = document.createElement('button');
        recordBtn.className = 'btn btn-primary btn-sm btn-record';
        recordBtn.textContent = '⏺ Gravar';
        recordBtn.addEventListener('click', () => {
            if (callbacks.onRecord) callbacks.onRecord(name);
        });

        const execBtn = document.createElement('button');
        execBtn.className = 'btn btn-success btn-sm btn-exec';
        execBtn.textContent = '▶ Executar';
        execBtn.addEventListener('click', () => {
            if (callbacks.onExecute) callbacks.onExecute(name, actions);
        });

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger btn-sm btn-remove';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', () => {
            if (callbacks.onRemove) callbacks.onRemove(name);
        });

        header.appendChild(label);
        header.appendChild(nameInput);
        header.appendChild(recordBtn);
        header.appendChild(execBtn);
        header.appendChild(removeBtn);

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
