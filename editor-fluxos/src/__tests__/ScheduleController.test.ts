// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleController, ScheduleContext } from '../ui/ScheduleController';
import { ScheduleManager } from '../use-cases/ScheduleManager';
import { ScheduleConflictService } from '../use-cases/ScheduleConflictService';
import { VariablePool, Schedule } from '../domain';

vi.mock('../ui/Toast', () => ({
    Toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('../ui/schedules/ScheduleListView', () => ({
    ScheduleListView: class {
        show = vi.fn();
        update = vi.fn();
    },
}));

vi.mock('../ui/schedules/ScheduleDetailView', () => ({
    ScheduleDetailView: class { show = vi.fn(); },
}));

vi.mock('../ui/schedules/NewScheduleView', () => ({
    NewScheduleView: class { show = vi.fn(); },
}));

vi.mock('../ui/schedules/PreviewView', () => ({
    PreviewView: class {
        show = vi.fn();
        setConflicts = vi.fn();
        removeRow = vi.fn();
    },
}));

function createMockCtx(overrides: Partial<ScheduleContext> = {}): ScheduleContext {
    return {
        getFluxos: vi.fn().mockReturnValue({ flowA: [{ tipo: 'keyboard', tecla: 'enter' }] }),
        getVarConfig: vi.fn().mockReturnValue(new VariablePool()),
        scheduleManager: {
            generateExecutionOrder: vi.fn().mockReturnValue([
                { flowName: 'flowA', scheduledTime: new Date().toISOString() }
            ]),
        } as unknown as ScheduleManager,
        loadSchedules: vi.fn().mockResolvedValue([]),
        saveSchedules: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

describe('ScheduleController', () => {
    let ctx: ScheduleContext;
    let ctrl: ScheduleController;

    beforeEach(() => {
        vi.clearAllMocks();
        ctx = createMockCtx();
        ctrl = new ScheduleController(ctx, new ScheduleConflictService());
    });

    it('starts with empty schedules', () => {
        expect(ctrl.schedules).toEqual([]);
    });

    it('openSchedules loads and shows list', async () => {
        await ctrl.openSchedules();

        expect(ctx.loadSchedules).toHaveBeenCalled();
        expect(ctrl.schedules).toEqual([]);
    });

    it('openSchedules loads data from context', async () => {
        vi.mocked(ctx.loadSchedules).mockResolvedValue([
            { id: 's1', flowName: 'f1', executionOrder: [] },
        ]);

        await ctrl.openSchedules();

        expect(ctrl.schedules).toHaveLength(1);
    });

    it('onNew triggers new schedule view', async () => {
        await ctrl.openSchedules();

        const listView = (ctrl as any)._listView;
        const showCall = listView.show.mock.calls[0];
        const callbacks = showCall[1];

        callbacks.onNew();

        const newView = (ctrl as any)._newView;
        expect(newView.show).toHaveBeenCalled();
    });

    it('avisa com warning quando a configuracao nao cabe na janela', async () => {
        await ctrl.openSchedules();

        const listView = (ctrl as any)._listView;
        listView.show.mock.calls[0][1].onNew();

        const newView = (ctrl as any)._newView;
        const newCallbacks = newView.show.mock.calls[0][2];

        newCallbacks.generateOrder(['enter'], '', 15, '2026-09-09', '11:00', '21:40', 3600, null, null);

        const { Toast } = await import('../ui/Toast');
        expect(Toast.warning).toHaveBeenCalledWith(expect.stringContaining('nao cabe'));
    });

    it('nao avisa quando a configuracao cabe na janela', async () => {
        await ctrl.openSchedules();

        const listView = (ctrl as any)._listView;
        listView.show.mock.calls[0][1].onNew();

        const newView = (ctrl as any)._newView;
        const newCallbacks = newView.show.mock.calls[0][2];

        newCallbacks.generateOrder(['enter'], '', 3, '2026-09-09', '07:00', '08:00', 60, null, null);

        const { Toast } = await import('../ui/Toast');
        expect(Toast.warning).not.toHaveBeenCalled();
    });

    it('onToggle updates schedule active state and persists', async () => {
        const schedule = new Schedule({
            flowName: 'flowA', obrigatorioValor: '', repeticoes: 1,
            intervaloMinimo: 0, mode: 'one-shot', date: '2026-01-01',
            timeStart: '09:00', timeEnd: '18:00', days: [],
            active: true, executionOrder: [],
        });
        vi.mocked(ctx.loadSchedules).mockResolvedValue([schedule]);
        await ctrl.openSchedules();

        const listView = (ctrl as any)._listView;
        const showCall = listView.show.mock.calls[0];
        const callbacks = showCall[1];

        await callbacks.onToggle(schedule.id, false);

        expect(schedule.active).toBe(false);
        expect(ctx.saveSchedules).toHaveBeenCalled();
    });

    it('onRemove deletes schedule after confirm', async () => {
        const schedule = new Schedule({
            flowName: 'flowA', obrigatorioValor: '', repeticoes: 1,
            intervaloMinimo: 0, mode: 'one-shot', date: '2026-01-01',
            timeStart: '09:00', timeEnd: '18:00', days: [],
            active: true, executionOrder: [],
        });
        vi.mocked(ctx.loadSchedules).mockResolvedValue([schedule]);
        vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

        await ctrl.openSchedules();

        const listView = (ctrl as any)._listView;
        const callbacks = listView.show.mock.calls[0][1];

        await callbacks.onRemove(0);

        expect(ctrl.schedules).toHaveLength(0);
        expect(ctx.saveSchedules).toHaveBeenCalled();

        vi.mocked(globalThis.confirm).mockRestore();
    });

    it('onRemove does nothing when confirm is cancelled', async () => {
        const schedule = new Schedule({
            flowName: 'flowA', obrigatorioValor: '', repeticoes: 1,
            intervaloMinimo: 0, mode: 'one-shot', date: '2026-01-01',
            timeStart: '09:00', timeEnd: '18:00', days: [],
            active: true, executionOrder: [],
        });
        vi.mocked(ctx.loadSchedules).mockResolvedValue([schedule]);
        vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

        await ctrl.openSchedules();

        const listView = (ctrl as any)._listView;
        const callbacks = listView.show.mock.calls[0][1];

        await callbacks.onRemove(0);

        expect(ctrl.schedules).toHaveLength(1);
        vi.mocked(globalThis.confirm).mockRestore();
    });

    it('onView opens detail view', async () => {
        const schedule = new Schedule({
            flowName: 'flowA', obrigatorioValor: '', repeticoes: 1,
            intervaloMinimo: 0, mode: 'one-shot', date: '2026-01-01',
            timeStart: '09:00', timeEnd: '18:00', days: [],
            active: true, executionOrder: [],
        });
        vi.mocked(ctx.loadSchedules).mockResolvedValue([schedule]);
        await ctrl.openSchedules();

        const listView = (ctrl as any)._listView;
        const callbacks = listView.show.mock.calls[0][1];

        callbacks.onView(schedule.id);

        const detailView = (ctrl as any)._detailView;
        expect(detailView.show).toHaveBeenCalledWith(schedule, expect.any(Object), []);
    });

    it('onClose in list view is a no-op', async () => {
        await ctrl.openSchedules();

        const listView = (ctrl as any)._listView;
        const callbacks = listView.show.mock.calls[0][1];

        expect(() => callbacks.onClose()).not.toThrow();
    });

    describe('injeção da porta (DIP)', () => {
        it('usa a porta injetada e passa a lista completa, sem pre-filtrar "others"', async () => {
            const scheduleA = new Schedule({
                id: 'a', flowName: 'fluxoA', obrigatorioValor: '', repeticoes: 1,
                intervaloMinimo: 60, mode: 'one-shot', date: '2026-01-01',
                timeStart: '09:00', timeEnd: '18:00', days: [], active: true, executionOrder: [],
            });
            const scheduleB = new Schedule({
                id: 'b', flowName: 'fluxoB', obrigatorioValor: '', repeticoes: 1,
                intervaloMinimo: 60, mode: 'one-shot', date: '2026-01-01',
                timeStart: '09:00', timeEnd: '18:00', days: [], active: true, executionOrder: [],
            });

            const fake = {
                conflictsInSet: vi.fn().mockReturnValue(new Map()),
                conflictCountInSet: vi.fn().mockReturnValue(7),
                conflictingInstanceIds: vi.fn().mockReturnValue([]),
            };
            vi.mocked(ctx.loadSchedules).mockResolvedValue([scheduleA, scheduleB]);
            const dipped = new ScheduleController(ctx, fake as any);
            await dipped.openSchedules();

            dipped._schedules = [scheduleA, scheduleB];
            const callbacks = (dipped as any)._listView.show.mock.calls[0][1];

            await callbacks.onToggle(scheduleA.id, true);

            expect(fake.conflictCountInSet).toHaveBeenCalledWith(scheduleA, [scheduleA, scheduleB]);
            expect(scheduleA.active).toBe(true);

            const { Toast } = await import('../ui/Toast');
            expect(Toast.warning).toHaveBeenCalledWith(expect.stringContaining('7 execucao(es)'));
        });

        it('preview usa conflictingInstanceIds da porta', async () => {
            const schedule = new Schedule({
                id: 'a', flowName: 'fluxoA', obrigatorioValor: '', repeticoes: 1,
                intervaloMinimo: 60, mode: 'one-shot', date: '2026-01-01',
                timeStart: '09:00', timeEnd: '18:00', days: [], active: true,
                executionOrder: [{ id: 1, gatilhoTime: 1000, status: 'pending', resolvedActions: ['enter'] }],
            });
            const fake = {
                conflictsInSet: vi.fn().mockReturnValue(new Map()),
                conflictCountInSet: vi.fn().mockReturnValue(0),
                conflictingInstanceIds: vi.fn().mockReturnValue([1]),
            };
            vi.mocked(ctx.loadSchedules).mockResolvedValue([schedule]);
            const dipped = new ScheduleController(ctx, fake as any);
            await dipped.openSchedules();
            dipped._schedules = [schedule];

            const listView = (dipped as any)._listView;
            listView.show.mock.calls[0][1].onNew();

            const newView = (dipped as any)._newView;
            const previewResult = {
                flowName: 'flowA', order: schedule.executionOrder, mode: 'one-shot',
                date: '2030-01-01', timeStart: '09:00', timeEnd: '18:00', days: [],
                obrigValor: '', count: 1, interval: 60, dataInicio: null, dataFim: null,
            };
            await newView.show.mock.calls[0][2].onGenerate(previewResult);

            const previewView = (dipped as any)._previewView;
            const previewCallbacks = previewView.show.mock.calls[0][2];
            previewCallbacks.onTimeChanged(0, 2000);

            expect(fake.conflictingInstanceIds).toHaveBeenCalled();
            expect(previewView.show).toHaveBeenCalledWith(
                'flowA',
                schedule.executionOrder,
                expect.objectContaining({ onTimeChanged: expect.any(Function) })
            );
        });
    });
});
