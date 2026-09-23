import { describe, it, expect } from 'vitest';
import { Schedule } from '../domain/Schedule';
import { ExecutionInstance } from '../domain/ExecutionInstance';
import { ScheduleConflictService } from '../use-cases/ScheduleConflictService';
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

const service = new ScheduleConflictService();

describe('ScheduleConflictService (invariantes de self-exclusao)', () => {
    it('conta 0 quando o agendamento esta sozinho (referencia e id)', () => {
        const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
        expect(service.conflictCountInSet(a, [a])).toBe(0);
        const cloneMesmoId = Schedule.fromJSON(a.toJSON());
        expect(service.conflictCountInSet(a, [cloneMesmoId])).toBe(0);
    });

    it('nao conflita consigo mesmo mesmo com lista vazia de "others"', () => {
        const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
        expect(service.conflictCountInSet(a, [])).toBe(0);
    });

    it('conta conflito real entre dois agendamentos mesmo com self na lista', () => {
        const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
        const b = makeSchedule('b', 60, [instance(1, 100100, 'pending')]);
        expect(service.conflictCountInSet(a, [a, b])).toBe(1);
    });

    it('retorna os ids das instancias conflitantes', () => {
        const a = makeSchedule('a', 60, [
            instance(1, 100000, 'pending'),
            instance(2, 300000, 'pending'),
        ]);
        const b = makeSchedule('b', 60, [instance(1, 100100, 'pending')]);
        expect(service.conflictingInstanceIds(a, [a, b])).toEqual([1]);
    });

    it('conflictsInSet mapeia instancia -> blocos sobrepostos', () => {
        const a = makeSchedule('a', 60, [instance(7, 100000, 'pending')]);
        const b = makeSchedule('b', 60, [instance(1, 100100, 'pending')]);
        const map = service.conflictsInSet(a, [a, b]);
        expect(Array.from(map.keys())).toEqual([7]);
        expect(map.get(7)).toHaveLength(1);
    });

    it('equivale ao detector com a lista de others ja filtrada (contrato LSP)', () => {
        const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
        const b = makeSchedule('b', 60, [instance(1, 100100, 'pending')]);
        const viaDetector = ScheduleConflictDetector.conflictCount(a, [b]);
        const viaService = service.conflictCountInSet(a, [a, b]);
        expect(viaService).toBe(viaDetector);
    });

    it('considera apenas instancias pending/running', () => {
        const a = makeSchedule('a', 60, [instance(1, 100000, 'pending')]);
        const b = makeSchedule('b', 60, [instance(1, 100100, 'completed')]);
        expect(service.conflictCountInSet(a, [a, b])).toBe(0);
    });
});