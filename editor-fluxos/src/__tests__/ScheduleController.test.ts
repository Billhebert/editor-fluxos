// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleController, ScheduleContext } from '../ui/ScheduleController';
import { ScheduleManager } from '../use-cases/ScheduleManager';
import { VariablePool } from '../domain';

vi.mock('../ui/Toast', () => ({
    Toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

vi.mock('../ui/schedules/ScheduleListView', () => ({
    ScheduleListView: class { show = vi.fn(); },
}));

vi.mock('../ui/schedules/ScheduleDetailView', () => ({
    ScheduleDetailView: class { show = vi.fn(); },
}));

vi.mock('../ui/schedules/NewScheduleView', () => ({
    NewScheduleView: class { show = vi.fn(); },
}));

vi.mock('../ui/schedules/PreviewView', () => ({
    PreviewView: class { show = vi.fn(); },
}));

function createMockCtx(overrides: Partial<ScheduleContext> = {}): ScheduleContext {
    return {
        getFluxos: vi.fn().mockReturnValue({}),
        getVarConfig: vi.fn().mockReturnValue(new VariablePool()),
        scheduleManager: {
            generateExecutionOrder: vi.fn().mockReturnValue([]),
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
        ctrl = new ScheduleController(ctx);
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
});
