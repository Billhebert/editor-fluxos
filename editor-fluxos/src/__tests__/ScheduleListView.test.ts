// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScheduleListView } from '../ui/schedules/ScheduleListView';
import { ScheduleCardVM, ScheduleListCallbacks } from '../ui/schedules/dto';

function vm(partial: Partial<ScheduleCardVM> = {}): ScheduleCardVM {
    return {
        scheduleId: 's1',
        flowName: 'fluxo A',
        active: true,
        conflictCount: 0,
        total: 3,
        completed: 1,
        next: 'Nenhum',
        modeLabel: 'Unico (2030-01-01)',
        dateRangeLabel: '',
        obrigatorioValor: 'N/A',
        repeticoesLabel: '3x',
        intervaloLabel: '60s',
        ...partial,
    };
}

let callbacks: ScheduleListCallbacks;

beforeEach(() => {
    document.body.innerHTML = '';
    callbacks = {
        onClose: vi.fn(),
        onNew: vi.fn(),
        onToggle: vi.fn(),
        onRemove: vi.fn(),
        onView: vi.fn(),
    };
});

afterEach(() => {
    document.getElementById('schedulesModal')?.remove();
});

describe('ScheduleListView', () => {
    it('renderiza um card por view-model', () => {
        const view = new ScheduleListView();
        view.show([vm({ scheduleId: 's1', conflictCount: 2 }), vm({ scheduleId: 's2' })], callbacks);

        const cards = document.querySelectorAll('.schedule-card');
        expect(cards).toHaveLength(2);
        expect(document.querySelector('.schedule-card h4')!.textContent).toBe('fluxo A');
    });

    it('mostra estado vazio quando nao ha agendamentos', () => {
        const view = new ScheduleListView();
        view.show([], callbacks);
        expect(document.querySelector('#schedulesContainer')!.textContent).toContain('Nenhum agendamento');

        view.show([vm()], callbacks);
        expect(document.querySelector('.schedule-card')).not.toBeNull();
    });

    it('update preserva a identidade do card e cria/remove o badge de conflito', () => {
        const view = new ScheduleListView();
        view.show([vm({ scheduleId: 's1', conflictCount: 0 })], callbacks);

        const cardBefore = document.querySelector('.schedule-card')!;
        expect(document.querySelector('.conflict-badge')).toBeNull();

        view.update([vm({ scheduleId: 's1', conflictCount: 2 })]);

        const cardAfter = document.querySelector('.schedule-card')!;
        expect(cardAfter).toBe(cardBefore);
        expect(document.querySelector('.conflict-badge')!.textContent).toContain('2 conflito(s)');

        view.update([vm({ scheduleId: 's1', conflictCount: 0 })]);
        expect(document.querySelector('.conflict-badge')).toBeNull();
    });

    it('update remove cards que sumiram', () => {
        const view = new ScheduleListView();
        view.show([vm({ scheduleId: 's1' }), vm({ scheduleId: 's2' })], callbacks);
        view.update([vm({ scheduleId: 's2' })]);

        expect(document.querySelectorAll('.schedule-card')).toHaveLength(1);
        expect(document.querySelector('.schedule-card')!.dataset.scheduleId).toBe('s2');
    });

    it('emitir toggle com o id do agendamento', () => {
        const view = new ScheduleListView();
        view.show([vm({ scheduleId: 'abc', active: true })], callbacks);

        const checkbox = document.querySelector('.schedule-card .toggle input') as HTMLInputElement;
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));

        expect(callbacks.onToggle).toHaveBeenCalledWith('abc', false);
    });

    it('emitir remove com o indice do card', () => {
        const view = new ScheduleListView();
        view.show([vm({ scheduleId: 's1' }), vm({ scheduleId: 's2' })], callbacks);

        (document.querySelectorAll('.btn-remove')[1] as HTMLElement).click();
        expect(callbacks.onRemove).toHaveBeenCalledWith(1);
    });

    it('emitir view com o id do agendamento', () => {
        const view = new ScheduleListView();
        view.show([vm({ scheduleId: 'xyz' })], callbacks);

        (document.querySelector('.btn-view') as HTMLElement).click();
        expect(callbacks.onView).toHaveBeenCalledWith('xyz');
    });
});