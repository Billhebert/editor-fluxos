import { describe, it, expect } from 'vitest';
import { ReservedBlock } from '../domain/types';
import { ScheduleGenerationResolver } from '../use-cases/ScheduleGenerationResolver';

function block(start: number, end: number): ReservedBlock {
    return { start, end };
}

describe('ScheduleGenerationResolver', () => {
    describe('autoResolve', () => {
        it('mantem timestamps inalterados quando nao ha reservas', () => {
            const ts = [5000, 65000];
            const result = ScheduleGenerationResolver.autoResolve(ts, 60 * 1000, [], 0, 3600 * 1000);
            expect(result.adjusted).toEqual(ts);
            expect(result.unsettled).toHaveLength(0);
        });

        it('desloca timestamp conflitante para depois do bloco reservado', () => {
            const ts = [5000];
            const reserved = [block(3000, 9000)];
            const result = ScheduleGenerationResolver.autoResolve(ts, 60 * 1000, reserved, 0, 3600 * 1000);
            expect(result.adjusted[0]).toBe(9000);
            expect(result.unsettled).toHaveLength(0);
        });

        it('marca como unsettled quando a janela nao comporta o deslocamento', () => {
            const ts = [1000];
            const reserved = [block(0, 20000)];
            const result = ScheduleGenerationResolver.autoResolve(ts, 60 * 1000, reserved, 0, 10000);
            expect(result.adjusted[0]).toBe(20000);
            expect(result.unsettled).toHaveLength(1);
        });

        it('preserva a ordem cronologica dos timestamps', () => {
            const ts = [1000, 1100, 1200];
            const reserved = [block(1500, 2000)];
            const result = ScheduleGenerationResolver.autoResolve(ts, 100, reserved, 0, 3600 * 1000);
            for (let i = 1; i < result.adjusted.length; i++) {
                expect(result.adjusted[i]).toBeGreaterThanOrEqual(result.adjusted[i - 1]);
            }
        });

        it('retorna listas vazias para entrada vazia', () => {
            const result = ScheduleGenerationResolver.autoResolve([], 60 * 1000, [], 0, 3600 * 1000);
            expect(result).toEqual({ adjusted: [], unsettled: [] });
        });
    });
});