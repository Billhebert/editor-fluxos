import { describe, it, expect } from 'vitest';
import { Schedule } from '../domain/Schedule';
import { ExecutionInstance } from '../domain/ExecutionInstance';
import { ReservedBlock } from '../domain/types';
import { ScheduleConflictDetector } from '../use-cases/ScheduleConflictDetector';

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

describe('ScheduleConflictDetector', () => {
    describe('collectReservedBlocks', () => {
        it('reserva apenas instancias pending/running de agendamentos ativos', () => {
            const s = makeSchedule('s1', 60, [
                instance(1, 1000, 'pending'),
                instance(2, 2000, 'running'),
                instance(3, 3000, 'completed'),
                instance(4, 4000, 'failed'),
            ]);
            const blocks = ScheduleConflictDetector.collectReservedBlocks([s]);
            expect(blocks).toHaveLength(2);
            expect(blocks[0].start).toBe(1000);
            expect(blocks[0].end).toBe(1000 + 60 * 1000);
        });

        it('ignora agendamentos inativos', () => {
            const s = makeSchedule('s1', 60, [instance(1, 1000, 'pending')], false);
            const blocks = ScheduleConflictDetector.collectReservedBlocks([s]);
            expect(blocks).toHaveLength(0);
        });

        it('usa o intervalo minimo do agendamento como duracao do bloco', () => {
            const s = makeSchedule('s1', 300, [instance(1, 5000, 'pending')]);
            const blocks = ScheduleConflictDetector.collectReservedBlocks([s]);
            expect(blocks[0].end).toBe(5000 + 300 * 1000);
        });
    });

    describe('mergeReservedBlocks', () => {
        it('fundi blocos sobrepostos', () => {
            const merged = ScheduleConflictDetector.mergeReservedBlocks([
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
            expect(ScheduleConflictDetector.conflictCount(a, [b])).toBe(1);
        });

        it('nao conflita quando ha folga suficiente', () => {
            const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
            const b = makeSchedule('b', 60, [instance(1, 100000 + 120000, 'pending')]);
            expect(ScheduleConflictDetector.conflictCount(a, [b])).toBe(0);
        });

        it('nao conta agendamentos inativos', () => {
            const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
            const b = makeSchedule('b', 60, [instance(1, 101000, 'pending')], false);
            expect(ScheduleConflictDetector.conflictCount(a, [b])).toBe(0);
        });

        it('ignora instancias ja concluidas', () => {
            const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
            const b = makeSchedule('b', 60, [instance(1, 100100, 'completed')]);
            expect(ScheduleConflictDetector.conflictCount(a, [b])).toBe(0);
        });

        it('nao conflita com os proprios blocos (self nao conta)', () => {
            const a = makeSchedule('a', 60, [
                instance(1, 100000, 'pending'),
                instance(2, 101000, 'pending'),
                instance(3, 102000, 'pending'),
            ]);
            expect(ScheduleConflictDetector.conflictCount(a, [a])).toBe(0);
        });

        it('conflito entre dois agendamentos persiste mesmo com self na lista', () => {
            const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
            const b = makeSchedule('b', 60, [instance(1, 100100, 'pending')]);
            expect(ScheduleConflictDetector.conflictCount(a, [a, b])).toBe(1);
        });
    });
});