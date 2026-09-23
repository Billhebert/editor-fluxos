// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionInstance } from '../domain/ExecutionInstance';
import { PreviewView, PreviewCallbacks } from '../ui/schedules/PreviewView';

function order(...times: number[]): ExecutionInstance[] {
    return times.map((t, i) => new ExecutionInstance(i + 1, t, ['enter'], 'pending'));
}

let callbacks: PreviewCallbacks;

beforeEach(() => {
    document.body.innerHTML = '';
    callbacks = {
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
        onTimeChanged: vi.fn(),
        onRemove: vi.fn(),
    };
});

describe('PreviewView', () => {
    it('renderiza uma linha por execucao', () => {
        const view = new PreviewView();
        view.show('fluxo', order(1000, 2000, 3000), callbacks);
        expect(document.querySelectorAll('#execOrderTable tbody tr')).toHaveLength(3);
    });

    it('setConflicts marca as linhas e o banner sem reconstruir a tabela', () => {
        const view = new PreviewView();
        view.show('fluxo', order(1000, 2000), callbacks);

        const inputHandle = document.querySelector('.time-input')!;
        view.setConflicts([1]);

        expect(document.querySelector('#execOrderPreviewBanner')!.textContent).toContain('1 horario(s)');
        const rows = document.querySelectorAll('#execOrderTable tbody tr');
        expect(rows[0].classList.contains('conflict-row')).toBe(true);
        expect(rows[1].classList.contains('conflict-row')).toBe(false);
        expect(document.querySelector('.time-input')).toBe(inputHandle);

        view.setConflicts([]);
        expect(document.querySelector('#execOrderPreviewBanner')!.textContent).toBe('');
        expect(rows[0].classList.contains('conflict-row')).toBe(false);
        expect(document.querySelector('.time-input')).toBe(inputHandle);
    });

    it('emite onTimeChanged ao alterar o horario e mantem o input', () => {
        const view = new PreviewView();
        view.show('fluxo', order(1000, 2000), callbacks);

        const input = document.querySelector('.time-input') as HTMLInputElement;
        const handle = input;
        input.value = '02/01/2030 10:30';
        input.dispatchEvent(new Event('change', { bubbles: true }));

        expect(callbacks.onTimeChanged).toHaveBeenCalledWith(0, new Date(2030, 0, 2, 10, 30).getTime());
        expect(document.querySelector('.time-input')).toBe(handle);
    });

    it('ignora horario invalido e restaura o valor anterior', () => {
        const view = new PreviewView();
        view.show('fluxo', order(1000, 2000), callbacks);

        const input = document.querySelector('.time-input') as HTMLInputElement;
        input.value = 'lixo';
        input.dispatchEvent(new Event('change', { bubbles: true }));

        expect(callbacks.onTimeChanged).not.toHaveBeenCalled();
        expect(input.value).toContain('19');

        input.value = '31/02/2030 10:30';
        input.dispatchEvent(new Event('change', { bubbles: true }));
        expect(callbacks.onTimeChanged).not.toHaveBeenCalled();
    });

    it('marca linhas approx (nao couberam) mesmo sem conflictIds', () => {
        const view = new PreviewView();
        const insts = order(1000, 2000);
        insts[1].approx = true;
        view.show('fluxo', insts, callbacks);
        view.setConflicts([]);

        const rows = document.querySelectorAll('#execOrderTable tbody tr');
        expect(rows[0].classList.contains('conflict-row')).toBe(false);
        expect(rows[1].classList.contains('conflict-row')).toBe(true);
        expect(document.querySelector('#execOrderPreviewBanner')!.textContent).toContain('nao couberam na janela');
    });

    it('enfileira onRemove e removeRow preserva os demais indices', () => {
        const view = new PreviewView();
        view.show('fluxo', order(1000, 2000, 3000), callbacks);

        (document.querySelectorAll('.btn-remove-item')[1] as HTMLElement).click();
        expect(callbacks.onRemove).toHaveBeenCalledWith(1);

        view.removeRow(1);
        const rows = document.querySelectorAll('#execOrderTable tbody tr');
        expect(rows).toHaveLength(2);
        expect(rows[1].dataset.idx).toBe('1');

        const reindexedInput = rows[1].querySelector('.time-input') as HTMLInputElement;
        reindexedInput.value = '02/01/2030 10:30';
        reindexedInput.dispatchEvent(new Event('change', { bubbles: true }));
        expect(callbacks.onTimeChanged).toHaveBeenCalledWith(1, new Date(2030, 0, 2, 10, 30).getTime());
    });
});