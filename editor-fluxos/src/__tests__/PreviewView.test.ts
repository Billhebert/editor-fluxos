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

    it('mascara a digitacao ao vivo e envia onTimeChanged quando completo', () => {
        const view = new PreviewView();
        view.show('fluxo', order(1000, 2000), callbacks);

        const input = document.querySelector('.time-input') as HTMLInputElement;
        input.value = '040820300930';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(input.value).toBe('04/08/2030 09:30');
        expect(callbacks.onTimeChanged).toHaveBeenCalledWith(0, new Date(2030, 7, 4, 9, 30).getTime());
    });

    it('seleciona todo o conteudo ao focar no input', () => {
        const view = new PreviewView();
        view.show('fluxo', order(1000, 2000), callbacks);

        const input = document.querySelector('.time-input') as HTMLInputElement;
        input.focus();

        expect(input.selectionStart).toBe(0);
        expect(input.selectionEnd).toBe(input.value.length);
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

    it('desabilita Confirmar e mostra Resolver Conflito quando ha conflitos', () => {
        const view = new PreviewView();
        view.show('fluxo', order(1000, 2000), callbacks);
        const confirmBtn = document.querySelector('.btn-confirm') as HTMLButtonElement;
        const resolveBtn = document.querySelector('.btn-resolve') as HTMLElement;

        view.setConflicts([1]);
        expect(confirmBtn.disabled).toBe(true);
        expect(resolveBtn.style.display).not.toBe('none');

        view.setConflicts([]);
        expect(confirmBtn.disabled).toBe(false);
        expect(resolveBtn.style.display).toBe('none');
    });

    it('desabilita Confirmar tambem quando ha ordens approx', () => {
        const view = new PreviewView();
        const insts = order(1000, 2000);
        insts[0].approx = true;
        view.show('fluxo', insts, callbacks);
        const confirmBtn = document.querySelector('.btn-confirm') as HTMLButtonElement;
        view.setConflicts([]);
        expect(confirmBtn.disabled).toBe(true);
    });

    it('emite onRegenerate ao clicar em Regenerar', () => {
        callbacks.onRegenerate = vi.fn();
        const view = new PreviewView();
        view.show('fluxo', order(1000), callbacks);
        (document.querySelector('.btn-regen') as HTMLElement).click();
        expect(callbacks.onRegenerate).toHaveBeenCalled();
    });

    it('emite onResolve ao clicar em Resolver Conflito', () => {
        callbacks.onResolve = vi.fn();
        const view = new PreviewView();
        view.show('fluxo', order(1000), callbacks);
        (document.querySelector('.btn-resolve') as HTMLElement).click();
        expect(callbacks.onResolve).toHaveBeenCalled();
    });

    it('setOrder reconstroi a tabela mantendo o overlay', () => {
        const view = new PreviewView();
        view.show('fluxo', order(1000, 2000), callbacks);
        const modal = document.getElementById('execOrderPreviewModal');
        view.setOrder(order(1000, 2000, 3000));
        expect(document.getElementById('execOrderPreviewModal')).toBe(modal);
        expect(document.querySelectorAll('#execOrderTable tbody tr')).toHaveLength(3);
    });
});