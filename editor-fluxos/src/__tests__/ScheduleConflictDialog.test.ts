// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleConflictDialog } from '../ui/schedules/ScheduleConflictDialog';

describe('ScheduleConflictDialog', () => {
    let callbacks: Parameters<typeof ScheduleConflictDialog.show>[1];

    beforeEach(() => {
        document.body.innerHTML = '';
        callbacks = {
            onReschedule: vi.fn(),
            onDelete: vi.fn(),
            onEdit: vi.fn(),
            onClose: vi.fn(),
        };
    });

    it('renderiza os conflitos com checkboxes marcados', () => {
        ScheduleConflictDialog.show([
            { scheduleId: 'sch_1', flowName: 'Fluxo A', count: 2 },
            { scheduleId: 'sch_2', flowName: 'Fluxo B', count: 1 },
        ], callbacks);

        const checks = document.querySelectorAll('.conflict-check');
        expect(checks).toHaveLength(2);
        expect((checks[0] as HTMLInputElement).value).toBe('sch_1');
        expect((checks[0] as HTMLInputElement).checked).toBe(true);
        expect(document.body.textContent).toContain('Fluxo A');
    });

    it('exclui apenas os marcados ao clicar em Excluir', () => {
        ScheduleConflictDialog.show([
            { scheduleId: 'sch_1', flowName: 'Fluxo A', count: 2 },
            { scheduleId: 'sch_2', flowName: 'Fluxo B', count: 1 },
        ], callbacks);

        const checks = document.querySelectorAll<HTMLInputElement>('.conflict-check');
        checks[1].checked = false;
        (document.querySelector('.btn-delete') as HTMLElement).click();

        expect(callbacks.onDelete).toHaveBeenCalledWith(['sch_1']);
    });

    it('chama onReschedule no botao correspondente', () => {
        ScheduleConflictDialog.show([{ scheduleId: 'sch_1', flowName: 'F', count: 1 }], callbacks);
        (document.querySelector('.btn-reschedule') as HTMLElement).click();
        expect(callbacks.onReschedule).toHaveBeenCalled();
    });

    it('chama onEdit no botao correspondente', () => {
        ScheduleConflictDialog.show([{ scheduleId: 'sch_1', flowName: 'F', count: 1 }], callbacks);
        (document.querySelector('.btn-edit') as HTMLElement).click();
        expect(callbacks.onEdit).toHaveBeenCalled();
    });

    it('mostra estado vazio quando nao ha conflitos', () => {
        ScheduleConflictDialog.show([], callbacks);
        expect(document.querySelector('#conflictList')!.textContent).toContain('Nenhum agendamento conflitante.');
    });
});