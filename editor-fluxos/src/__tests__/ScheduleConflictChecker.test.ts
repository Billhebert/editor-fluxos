import { describe, it, expect } from 'vitest';
import { Schedule } from '../domain/Schedule';
import { ExecutionInstance } from '../domain/ExecutionInstance';
import { ScheduleConflictChecker, ReservedBlock } from '../use-cases/ScheduleConflictChecker';

function instance(id: number, gatilhoTime: number, status: 'pending' | 'running' | 'completed' | 'failed' = 'pending'): ExecutionInstance {
    return new ExecutionInstance(id, gatilhoTime, ['enter'], status);
}

function makeSchedule(id: string, intervaloMinimo: number, instances: ExecutionInstance[], active = true): Schedule {
    const s = new Schedule({
        id,
        flowName: `fluxo-${id}`,
        intervaloMinimo,
        timeStart: '00:00',
        timeEnd: '23:59',
    });
    s.active = active;
    s.executionOrder = instances;
    return s;
}

function block(start: number, end: number): ReservedBlock {
    return { start, end };
}

describe('ScheduleConflictChecker', () => {
    describe('collectReservedBlocks', () => {
        it('reserva apenas instancias pending/running de agendamentos ativos', () => {
            const s = makeSchedule('s1', 60, [
                instance(1, 1000, 'pending'),
                instance(2, 2000, 'running'),
                instance(3, 3000, 'completed'),
                instance(4, 4000, 'failed'),
            ]);
            const blocks = ScheduleConflictChecker.collectReservedBlocks([s]);
            expect(blocks).toHaveLength(2);
            expect(blocks[0].start).toBe(1000);
            expect(blocks[0].end).toBe(1000 + 60 * 1000);
        });

        it('ignora agendamentos inativos', () => {
            const s = makeSchedule('s1', 60, [instance(1, 1000, 'pending')], false);
            const blocks = ScheduleConflictChecker.collectReservedBlocks([s]);
            expect(blocks).toHaveLength(0);
        });

        it('usa o intervalo minimo do agendamento como duracao do bloco', () => {
            const s = makeSchedule('s1', 300, [instance(1, 5000, 'pending')]);
            const blocks = ScheduleConflictChecker.collectReservedBlocks([s]);
            expect(blocks[0].end).toBe(5000 + 300 * 1000);
        });
    });

    describe('mergeReservedBlocks', () => {
        it('fundi blocos sobrepostos', () => {
            const merged = ScheduleConflictChecker.mergeReservedBlocks([
                block(1000, 2000),
                block(1500, 2500),
                block(3000, 4000),
            ]);
            expect(merged).toEqual([
                { start: 1000, end: 2500 },
                { start: 3000, end: 4000 },
            ]);
        });
    });

    describe('conflicts / conflictCount', () => {
        it('detecta conflito de horario entre dois agendamentos', () => {
            const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
            const b = makeSchedule('b', 60, [instance(1, 100100, 'pending')]);
            expect(ScheduleConflictChecker.conflictCount(a, [b])).toBe(1);
        });

        it('nao conflita quando ha folga suficiente', () => {
            const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
            const b = makeSchedule('b', 60, [instance(1, 100000 + 120000, 'pending')]);
            expect(ScheduleConflictChecker.conflictCount(a, [b])).toBe(0);
        });

        it('nao conta agendamentos inativos', () => {
            const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
            const b = makeSchedule('b', 60, [instance(1, 101000, 'pending')], false);
            expect(ScheduleConflictChecker.conflictCount(a, [b])).toBe(0);
        });

        it('ignora instancias ja concluidas', () => {
            const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
            const b = makeSchedule('b', 60, [instance(1, 100100, 'completed')]);
            expect(ScheduleConflictChecker.conflictCount(a, [b])).toBe(0);
        });
    });

    describe('autoResolve', () => {
        it('mantem timestamps inalterados quando nao ha reservas', () => {
            const ts = [5000, 65000];
            const result = ScheduleConflictChecker.autoResolve(ts, 60 * 1000, [], 0, 3600 * 1000);
            expect(result.adjusted).toEqual(ts);
            expect(result.unsettled).toHaveLength(0);
        });

        it('desloca timestamp conflitante para depois do bloco reservado', () => {
            const ts = [5000];
            const reserved = [block(3000, 9000)];
            const result = ScheduleConflictChecker.autoResolve(ts, 60 * 1000, reserved, 0, 3600 * 1000);
            expect(result.adjusted[0]).toBe(9000);
            expect(result.unsettled).toHaveLength(0);
        });

        it('marca como unsettled quando a janela nao comporta o deslocamento', () => {
            const ts = [1000];
            const reserved = [block(0, 20000)];
            const result = ScheduleConflictChecker.autoResolve(ts, 60 * 1000, reserved, 0, 10000);
            expect(result.adjusted[0]).toBe(20000);
            expect(result.unsettled).toHaveLength(1);
        });

        it('preserva a ordem cronologica dos timestamps', () => {
            const ts = [1000, 1100, 1200];
            const reserved = [block(1500, 2000)];
            const result = ScheduleConflictChecker.autoResolve(ts, 100, reserved, 0, 3600 * 1000);
            for (let i = 1; i < result.adjusted.length; i++) {
                expect(result.adjusted[i]).toBeGreaterThanOrEqual(result.adjusted[i - 1]);
            }
        });
    });
});