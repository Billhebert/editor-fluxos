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

        it('filtra apenas os dias da semana selecionados (recurring)', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], 'item', 2,
                '2026-09-07', '08:00', '12:00', 60, pool,
                '2026-09-09', '2026-09-30', [1]
            );
            order.forEach(inst => {
                expect(new Date(inst.gatilhoTime).getDay()).toBe(1);
            });
            const days = new Set(order.map(i => new Date(i.gatilhoTime).getDate()));
            expect(days.has(9)).toBe(false);
            expect(days.has(30)).toBe(false);
        });

        it('gera para todos os dias quando days esta vazio (compat)', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], 'item', 1,
                '2026-09-07', '08:00', '12:00', 60, pool,
                '2026-09-09', '2026-09-12', []
            );
            expect(order).toHaveLength(4);
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

        it('resolves ITEM_OPCIONAL de forma independente por execucao', () => {
            pool.addOpcional('a', '1');
            pool.addOpcional('b', '2');
            const order = manager.generateExecutionOrder(
                ['ITEM_OPCIONAL'], '', 30,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            const distinct = new Set(order.map(inst => inst.resolvedActions[0]));
            expect(distinct.size).toBeGreaterThan(1);
            distinct.forEach(v => expect(['1', '2']).toContain(v));
        });

        it('usa o mesmo opcional quando o pool tem apenas um item', () => {
            pool.addOpcional('cor', 'azul');
            const order = manager.generateExecutionOrder(
                ['ITEM_OPCIONAL'], '', 3,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            order.forEach(inst => {
                expect(inst.resolvedActions[0]).toBe('azul');
            });
        });
    });

    describe('generateExecutionOrder - aleatoriedade', () => {
        function gapsOf(order: { gatilhoTime: number }[]): number[] {
            const gaps: number[] = [];
            for (let i = 1; i < order.length; i++) {
                gaps.push(order[i].gatilhoTime - order[i - 1].gatilhoTime);
            }
            return gaps;
        }

        it('nao gera tempos sequenciais quando ha folga na janela', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 5,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            const gaps = gapsOf(order);
            expect(new Set(gaps).size).toBeGreaterThan(1);
        });

        it('nao gera 1 execucao por minuto exata com count alto', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 60,
                '2026-09-07', '07:00', '08:00', 60, pool
            );
            const gaps = gapsOf(order);
            expect(new Set(gaps).size).toBeGreaterThan(1);
        });

        it('primeira execucao nao fica travada no inicio da janela', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 5,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            const first = new Date(order[0].gatilhoTime);
            const totalMs = first.getHours() * 3600 + first.getMinutes() * 60 + first.getSeconds();
            const startMs = 8 * 3600;
            expect(totalMs).toBeGreaterThan(startMs);
        });

        it('todos os timestamps ficam dentro da janela de tempo', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 20,
                '2026-09-07', '08:00', '12:00', 60, pool
            );
            order.forEach(inst => {
                const d = new Date(inst.gatilhoTime);
                const totalSec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
                expect(totalSec).toBeGreaterThanOrEqual(8 * 3600);
                expect(totalSec).toBeLessThanOrEqual(12 * 3600);
            });
        });

        it('respeita intervalo minimo mesmo com distribuicao aleatoria', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 20,
                '2026-09-07', '08:00', '12:00', 120, pool
            );
            const gaps = gapsOf(order);
            gaps.forEach(gap => expect(gap).toBeGreaterThanOrEqual(120 * 1000));
        });

        it('gera aleatorio tambem no modo data range', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 3,
                '2026-09-07', '08:00', '12:00', 60, pool,
                '2026-09-07', '2026-09-08'
            );
            const gaps = gapsOf(order);
            expect(new Set(gaps).size).toBeGreaterThan(1);
        });
    });

    describe('generateExecutionOrder - intervalo alto (3600s)', () => {
        function gapsOf(order: { gatilhoTime: number }[]): number[] {
            const gaps: number[] = [];
            for (let i = 1; i < order.length; i++) {
                gaps.push(order[i].gatilhoTime - order[i - 1].gatilhoTime);
            }
            return gaps;
        }

        it('nao ultrapassa o fim da janela quando janela = count x intervalo', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 2,
                '2026-09-07', '07:00', '08:00', 3600, pool
            );
            const endMs = new Date(2026, 8, 7, 8, 0, 0).getTime();
            order.forEach(inst => {
                expect(inst.gatilhoTime).toBeLessThanOrEqual(endMs);
            });
        });

        it('aplica o intervalo minimo quando cabe exatamente na janela', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 2,
                '2026-09-07', '07:00', '08:00', 3600, pool
            );
            expect(order).toHaveLength(2);
            const gap = order[1].gatilhoTime - order[0].gatilhoTime;
            expect(gap).toBeGreaterThanOrEqual(3600 * 1000);
            const startMs = new Date(2026, 8, 7, 7, 0, 0).getTime();
            expect(order[0].gatilhoTime).toBeGreaterThanOrEqual(startMs);
        });

        it('mantem aleatoriedade mesmo com count x intervalo proximo da janela', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 5,
                '2026-09-07', '07:00', '12:00', 3600, pool
            );
            const gaps = gapsOf(order);
            expect(new Set(gaps).size).toBeGreaterThan(1);
        });

        it('respeita o intervalo de 1h entre execucoes', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 5,
                '2026-09-07', '07:00', '12:00', 3600, pool
            );
            const gaps = gapsOf(order);
            gaps.forEach(gap => expect(gap).toBeGreaterThanOrEqual(3600 * 1000));
        });

        it('gera primeiro horario aleatorio dentro da janela', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 2,
                '2026-09-07', '07:00', '12:00', 3600, pool
            );
            const first = new Date(order[0].gatilhoTime);
            const firstMs = first.getHours() * 3600 + first.getMinutes() * 60 + first.getSeconds();
            expect(firstMs).toBeGreaterThan(7 * 3600);
            expect(firstMs).toBeLessThanOrEqual(12 * 3600);
        });
    });

    describe('generateExecutionOrder - count nao cabe na janela (15x, 1h, 11:00-21:40)', () => {
        function gapsOf(order: { gatilhoTime: number }[]): number[] {
            const gaps: number[] = [];
            for (let i = 1; i < order.length; i++) {
                gaps.push(order[i].gatilhoTime - order[i - 1].gatilhoTime);
            }
            return gaps;
        }

        it('mantem todas as execucoes dentro da janela diaria', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 15,
                '2026-09-09', '11:00', '21:40', 3600, pool
            );
            expect(order).toHaveLength(15);
            const startMs = new Date(2026, 8, 9, 11, 0, 0).getTime();
            const endMs = new Date(2026, 8, 9, 21, 40, 0).getTime();
            order.forEach(inst => {
                expect(inst.gatilhoTime).toBeGreaterThanOrEqual(startMs);
                expect(inst.gatilhoTime).toBeLessThanOrEqual(endMs);
            });
        });

        it('gera aleatorio dentro da janela mesmo sem folga', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 15,
                '2026-09-09', '11:00', '21:40', 3600, pool
            );
            const gaps = gapsOf(order);
            expect(new Set(gaps).size).toBeGreaterThan(1);
        });

        it('data range recorrente mantem execucoes na janela diaria sem vazar', () => {
            const order = manager.generateExecutionOrder(
                ['enter'], '', 15,
                '2026-09-09', '11:00', '21:40', 3600, pool,
                '2026-09-09', '2026-09-13'
            );
            expect(order).toHaveLength(75);
            order.forEach(inst => {
                const d = new Date(inst.gatilhoTime);
                const sec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
                expect(sec).toBeGreaterThanOrEqual(11 * 3600);
                expect(sec).toBeLessThanOrEqual(21 * 3600 + 40 * 60);
                expect(d.getDate()).toBeGreaterThanOrEqual(9);
                expect(d.getDate()).toBeLessThanOrEqual(13);
            });
        });
    });

    describe('getAllSchedules', () => {
        it('returns all schedules from repo', async () => {
            const s1 = { id: 'sch_1', flowName: 'a', executionOrder: [] } as any;
            const s2 = { id: 'sch_2', flowName: 'b', executionOrder: [] } as any;
            (repo.save as any)(s1);
            (repo.save as any)(s2);

            const result = await manager.getAllSchedules();
            expect(result).toHaveLength(2);
            expect(result).toEqual([s1, s2]);
        });

        it('returns empty array when repo is empty', async () => {
            const result = await manager.getAllSchedules();
            expect(result).toHaveLength(0);
        });
    });

    describe('getSchedule', () => {
        it('returns schedule by id', async () => {
            const s = { id: 'sch_1', flowName: 'x', executionOrder: [] } as any;
            (repo.save as any)(s);

            const result = await manager.getSchedule('sch_1');
            expect(result).toBe(s);
        });

        it('returns null for missing id', async () => {
            const result = await manager.getSchedule('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('createSchedule', () => {
        it('creates schedule with generated execution order and saves to repo', async () => {
            const config = {
                flowName: 'test-flow',
                obrigatorioValor: 'item_A',
                repeticoes: 3,
                date: '2026-09-07',
                timeStart: '08:00',
                timeEnd: '12:00',
                intervaloMinimo: 60,
            };

            const result = await manager.createSchedule(config, ['ITEM_OBRIGATORIO', 'click'], pool);

            expect(result.flowName).toBe('test-flow');
            expect(result.executionOrder).toHaveLength(3);
            expect(result.executionOrder[0].resolvedActions).toEqual(['item_A', 'click']);
            expect(repo.save).toHaveBeenCalledTimes(1);
        });

        it('uses default values when config fields are missing', async () => {
            const config = { flowName: 'minimal' };

            const result = await manager.createSchedule(config, ['enter'], pool);

            expect(result.obrigatorioValor).toBe('');
            expect(result.repeticoes).toBe(1);
            expect(result.timeStart).toBe('07:00');
            expect(result.timeEnd).toBe('08:00');
            expect(result.executionOrder).toHaveLength(1);
        });
    });

    describe('updateSchedule', () => {
        it('saves schedule to repo', async () => {
            const s = { id: 'sch_1', flowName: 'updated', executionOrder: [] } as any;

            const result = await manager.updateSchedule(s);

            expect(repo.save).toHaveBeenCalledWith(s);
            expect(result).toBe(s);
        });
    });

    describe('deleteSchedule', () => {
        it('deletes schedule from repo by id', async () => {
            const s = { id: 'sch_1', flowName: 'doomed', executionOrder: [] } as any;
            (repo.save as any)(s);

            await manager.deleteSchedule('sch_1');
            expect(repo.delete).toHaveBeenCalledWith('sch_1');
            const result = await manager.getSchedule('sch_1');
            expect(result).toBeNull();
        });
    });

    describe('toggleSchedule', () => {
        it('toggles active to true on schedule', async () => {
            const s = { id: 'sch_1', flowName: 't', executionOrder: [], active: false, toggleActive: vi.fn() } as any;
            (repo.save as any)(s);

            const result = await manager.toggleSchedule('sch_1', true);

            expect(s.toggleActive).toHaveBeenCalledWith(true);
            expect(repo.save).toHaveBeenCalledWith(s);
        });

        it('toggles active to false on schedule', async () => {
            const s = { id: 'sch_1', flowName: 't', executionOrder: [], active: true, toggleActive: vi.fn() } as any;
            (repo.save as any)(s);

            const result = await manager.toggleSchedule('sch_1', false);

            expect(s.toggleActive).toHaveBeenCalledWith(false);
            expect(repo.save).toHaveBeenCalledWith(s);
        });

        it('throws NotFoundError for missing id', async () => {
            await expect(manager.toggleSchedule('nonexistent', true))
                .rejects.toThrow('Not found: Schedule "nonexistent"');
        });
    });

    describe('findDueSchedules', () => {
        it('returns only due instances with past gatilhoTime', async () => {
            const past = Date.now() - 10_000;
            const future = Date.now() + 100_000;
            const sch = { id: 'sch_1', flowName: 'f', active: true, executionOrder: [
                { id: 1, gatilhoTime: past, status: 'pending', isDue: (now: number) => now >= past },
                { id: 2, gatilhoTime: future, status: 'pending', isDue: (now: number) => false },
            ] } as any;
            (repo.save as any)(sch);

            const result = await manager.findDueSchedules();
            expect(result).toHaveLength(1);
            expect(result[0].schedule).toBe(sch);
            expect(result[0].instance.id).toBe(1);
        });

        it('skips inactive schedules entirely', async () => {
            const past = Date.now() - 10_000;
            const sch = { id: 'sch_1', flowName: 'f', active: false, executionOrder: [
                { id: 1, gatilhoTime: past, status: 'pending', isDue: () => true },
            ] } as any;
            (repo.save as any)(sch);

            const result = await manager.findDueSchedules();
            expect(result).toHaveLength(0);
        });

        it('returns empty array when no schedules exist', async () => {
            const result = await manager.findDueSchedules();
            expect(result).toHaveLength(0);
        });

        it('skips non-pending instances even if time has passed', async () => {
            const past = Date.now() - 10_000;
            const sch = { id: 'sch_1', flowName: 'f', active: true, executionOrder: [
                { id: 1, gatilhoTime: past, status: 'completed', isDue: () => false },
                { id: 2, gatilhoTime: past, status: 'pending', isDue: (now: number) => now >= past },
            ] } as any;
            (repo.save as any)(sch);

            const result = await manager.findDueSchedules();
            expect(result).toHaveLength(1);
            expect(result[0].instance.id).toBe(2);
        });
    });

    describe('updateInstanceStatus', () => {
        it('delegates to repo with correct params', async () => {
            await manager.updateInstanceStatus('sch_1', 3, 'running');
            expect(repo.updateInstanceStatus).toHaveBeenCalledWith('sch_1', 3, 'running');
        });

        it('propagates repo error', async () => {
            (repo.updateInstanceStatus as any).mockRejectedValueOnce(new Error('db fail'));
            await expect(manager.updateInstanceStatus('sch_1', 1, 'completed'))
                .rejects.toThrow('db fail');
        });
    });
});
