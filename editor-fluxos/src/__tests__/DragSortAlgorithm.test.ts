// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getDragAfterElement } from '../ui/DragSortAlgorithm';

function createContainer(items: { top: number; height: number; dragging?: boolean }[]): HTMLElement {
    const container = document.createElement('div');
    items.forEach((item, i) => {
        const el = document.createElement('div');
        el.className = `action-item${item.dragging ? ' dragging' : ''}`;
        el.getBoundingClientRect = () => ({
            top: item.top,
            left: 0,
            right: 0,
            bottom: item.top + item.height,
            width: 100,
            height: item.height,
            x: 0,
            y: 0,
            toJSON: () => {},
        });
        el.dataset.index = String(i);
        container.appendChild(el);
    });
    return container;
}

describe('getDragAfterElement', () => {
    it('returns null for empty container', () => {
        const container = document.createElement('div');
        expect(getDragAfterElement(container, 100)).toBeNull();
    });

    it('returns null when dragging below all elements', () => {
        const container = createContainer([
            { top: 0, height: 30 },
            { top: 40, height: 30 },
        ]);
        expect(getDragAfterElement(container, 200)).toBeNull();
    });

    it('returns first element when dragging above all', () => {
        const container = createContainer([
            { top: 50, height: 30 },
            { top: 100, height: 30 },
        ]);
        const result = getDragAfterElement(container, 0);
        expect(result).not.toBeNull();
    });

    it('skips dragging elements', () => {
        const container = createContainer([
            { top: 0, height: 30 },
            { top: 40, height: 30, dragging: true },
            { top: 80, height: 30 },
        ]);
        const result = getDragAfterElement(container, 50);
        expect(result).not.toBeNull();
        expect(result!.dataset.index).toBe('2');
    });

    it('returns correct element in middle', () => {
        const container = createContainer([
            { top: 0, height: 30 },
            { top: 40, height: 30 },
            { top: 80, height: 30 },
            { top: 120, height: 30 },
        ]);
        const result = getDragAfterElement(container, 65);
        expect(result).not.toBeNull();
        expect(result!.dataset.index).toBe('2');
    });
});
