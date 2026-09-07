import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleManager } from '../use-cases/ScheduleManager';
import { VariablePool } from '../domain/VariablePool';
import { IScheduleRepository } from '../adapters/IScheduleRepository';

function createMockScheduleRepo(): IScheduleRepository {
    const schedules = new Map<string, any>();
    return {
        findAll: vi.fn(async () => Array.from(schedules.values())),
        findById: vi.fn(async (id: string) => schedules.get(id) || null),
        save: vi.fn(async (sch: any) => { schedules.set(sch.id, sch); return sch; }),
        delete: vi.fn(async (id: string) => { schedules.delete(id); }),
        updateInstanceStatus: vi.fn(async () => {}),
    } as any;
}

describe('ScheduleManager', () => {
    let repo: IScheduleRepository;
    let manager: ScheduleManager;
    let pool: VariablePool;

    beforeEach(() => {
        repo = createMockScheduleRepo();
        manager = new ScheduleManager(repo);
        pool = new VariablePool();
    });

    describe('generateExecutionOrder - one-shot', () => {
        it('generates correct number of instances for a single day', () => {
            const order = manager.generateExecutionOrder(
                ['enter', 'click'], 'item_A', 5,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            expect(order).toHaveLength(5);
        });

        it('all timestamps are within the same day', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], 'item', 3,
                '2026-12-01', '09:00', '17:00', 60, pool
            );
            order.forEach(inst => {
                const d = new Date(inst.gatilhoTime);
                expect(d.getDate()).toBe(1);
                expect(d.getMonth()).toBe(11); // December
            });
        });

        it('timestamps respect minimum interval', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], 'item', 4,
                '2026-09-07', '08:00', '12:00', 120, pool
            );
            for (let i = 1; i < order.length; i++) {
                const diff = order[i].gatilhoTime - order[i - 1].gatilhoTime;
                expect(diff).toBeGreaterThanOrEqual(120 * 1000);
            }
        });

        it('resolves ITEM_OBRIGATORIO placeholder', () => {
            const order = manager.generateExecutionOrder(
                ['ITEM_OBRIGATORIO', 'click'], 'produto_X', 1,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            expect(order[0].resolvedActions[0]).toBe('produto_X');
            expect(order[0].resolvedActions[1]).toBe('click');
        });

        it('resolves ITEM_OPCIONAL from pool', () => {
            pool.addOpcional('cor', 'azul');
            pool.addOpcional('tamanho', 'M');
            const order = manager.generateExecutionOrder(
                ['ITEM_OPCIONAL', 'ITEM_OPCIONAL'], '', 1,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            expect(order[0].resolvedActions).toContain('azul');
            expect(order[0].resolvedActions).toContain('M');
        });

        it('throws when timeEnd <= timeStart', () => {
            expect(() => manager.generateExecutionOrder(
                ['enter'], '', 1,
                '2026-09-07', '12:00', '08:00', 60, pool
            )).toThrow();
        });

        it('generates instances sorted by timestamp', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 10,
                '2026-09-07', '06:00', '18:00', 60, pool
            );
            for (let i = 1; i < order.length; i++) {
                expect(order[i].gatilhoTime).toBeGreaterThanOrEqual(order[i - 1].gatilhoTime);
            }
        });
    });

    describe('generateExecutionOrder - date range', () => {
        it('generates instances across multiple days', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], 'item', 2,
                '2026-09-07', '08:00', '12:00', 60, pool,
                '2026-09-07', '2026-09-10'
            );
            // 4 days × 2 instances per day = 8
            expect(order).toHaveLength(8);
        });

        it('spreads instances across the full date range', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], 'item', 1,
                '2026-09-07', '08:00', '12:00', 60, pool,
                '2026-09-01', '2026-09-03'
            );
            // 3 days × 1 instance = 3
            expect(order).toHaveLength(3);
            const days = new Set(order.map(i => new Date(i.gatilhoTime).getDate()));
            expect(days.size).toBe(3);
        });

        it('respects minimum interval within date range', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], 'item', 3,
                '2026-09-07', '08:00', '12:00', 120, pool,
                '2026-09-07', '2026-09-08'
            );
            for (let i = 1; i < order.length; i++) {
                const diff = order[i].gatilhoTime - order[i - 1].gatilhoTime;
                expect(diff).toBeGreaterThanOrEqual(120 * 1000);
            }
        });

        it('without date range uses single day (backward compatible)', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], 'item', 3,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            expect(order).toHaveLength(3);
            const dates = new Set(order.map(i => new Date(i.gatilhoTime).toDateString()));
            expect(dates.size).toBe(1);
        });
    });

    describe('generateExecutionOrder - variables', () => {
        it('resolves ITEM_OBRIGATORIO with provided value', () => {
            const order = manager.generateExecutionOrder(
                ['ITEM_OBRIGATORIO'], 'forced_value', 1,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            expect(order[0].resolvedActions[0]).toBe('forced_value');
        });

        it('returns [SEM ITEM] when no obrigatorio value', () => {
            const order = manager.generateExecutionOrder(
                ['ITEM_OBRIGATORIO'], '', 1,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            expect(order[0].resolvedActions[0]).toBe('[SEM ITEM]');
        });

        it('each instance gets the same resolved template (resolved once)', () => {
            pool.addOpcional('a', '1');
            pool.addOpcional('b', '2');
            const order = manager.generateExecutionOrder(
                ['ITEM_OPCIONAL', 'ITEM_OPCIONAL'], '', 3,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            const first = JSON.stringify(order[0].resolvedActions);
            order.forEach(inst => {
                expect(JSON.stringify(inst.resolvedActions)).toBe(first);
            });
        });
    });
});
