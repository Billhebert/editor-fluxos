// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Schedule } from '../domain/Schedule';
import { ScheduleDetailView } from '../ui/schedules/ScheduleDetailView';

function makeSchedule(instances: { id: number; status?: string }[] = [{ id: 1 }, { id: 2 }]): Schedule {
    return new Schedule({
        flowName: 'fluxo A',
        executionOrder: instances.map(i => ({ id: i.id, gatilhoTime: Date.parse('2030-01-01T09:00:00'), status: i.status || 'pending', resolvedActions: ['enter'] })),
    });
}

function shown(): ScheduleDetailView {
    return new ScheduleDetailView();
}

afterEach(() => {
    document.getElementById('scheduleDetailModal')?.remove();
});

describe('ScheduleDetailView', () => {
    it('destaca as ordens marcadas como em conflito', () => {
        const view = shown();
        view.show(makeSchedule([{ id: 1 }, { id: 2 }]), { onBack: () => {} }, [1]);

        const rows = Array.from(document.querySelectorAll('#scheduleDetailModal .data-table tbody tr'));
        expect(rows).toHaveLength(2);
        expect(rows[0].classList.contains('conflict-row')).toBe(true);
        expect(rows[1].classList.contains('conflict-row')).toBe(false);
        expect(rows[0].textContent).toContain('conflito');

        const banner = document.querySelector('#scheduleDetailModal .conflict-banner');
        expect(banner).not.toBeNull();
        expect(banner!.textContent).toContain('1 ordem(ns) em conflito');
    });

    it('sem conflictIds nao marca nenhuma ordem nem mostra banner', () => {
        shown().show(makeSchedule([{ id: 1 }, { id: 2 }]), { onBack: () => {} });

        expect(document.querySelector('#scheduleDetailModal .conflict-row')).toBeNull();
        expect(document.querySelector('#scheduleDetailModal .conflict-banner')).toBeNull();
    });

    it('botao voltar dispara onBack e fecha o modal', () => {
        const onBack = vi.fn();
        shown().show(makeSchedule(), { onBack });

        document.querySelector<HTMLElement>('#scheduleDetailModal .btn-back')!.click();

        expect(onBack).toHaveBeenCalled();
        expect(document.getElementById('scheduleDetailModal')).toBeNull();
    });
});