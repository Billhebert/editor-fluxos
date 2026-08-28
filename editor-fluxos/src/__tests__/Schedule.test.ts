import { describe, it, expect } from 'vitest';
import { Schedule } from '../domain/Schedule';
import { ValidationError } from '../domain/errors';

describe('Schedule', () => {
    it('creates schedule with defaults', () => {
        const sch = new Schedule({ flowName: 'test-flow' });
        expect(sch.flowName).toBe('test-flow');
        expect(sch.repeticoes).toBe(1);
        expect(sch.intervaloMinimo).toBe(60);
        expect(sch.mode).toBe('one-shot');
        expect(sch.active).toBe(true);
        expect(sch.executionOrder).toHaveLength(0);
    });

    it('throws ValidationError for empty flowName', () => {
        expect(() => new Schedule({ flowName: '' })).toThrow(ValidationError);
        expect(() => new Schedule({ flowName: '   ' })).toThrow(ValidationError);
    });

    it('trims flowName', () => {
        const sch = new Schedule({ flowName: '  test  ' });
        expect(sch.flowName).toBe('test');
    });

    it('uses provided values', () => {
        const sch = new Schedule({
            flowName: 'test',
            repeticoes: 5,
            intervaloMinimo: 120,
            mode: 'recurring',
            active: false,
            obrigatorioValor: 'item1'
        });
        expect(sch.repeticoes).toBe(5);
        expect(sch.intervaloMinimo).toBe(120);
        expect(sch.mode).toBe('recurring');
        expect(sch.active).toBe(false);
        expect(sch.obrigatorioValor).toBe('item1');
    });

    it('clamps repeticoes to 1 if 0 or negative', () => {
        expect(new Schedule({ flowName: 't', repeticoes: 0 }).repeticoes).toBe(1);
        expect(new Schedule({ flowName: 't', repeticoes: -5 }).repeticoes).toBe(1);
    });

    it('clamps intervaloMinimo to 60 if 0 or negative', () => {
        expect(new Schedule({ flowName: 't', intervaloMinimo: 0 }).intervaloMinimo).toBe(60);
        expect(new Schedule({ flowName: 't', intervaloMinimo: -10 }).intervaloMinimo).toBe(60);
    });

    it('filters invalid days', () => {
        const sch = new Schedule({ flowName: 't', days: [0, 1, 7, -1, 8] });
        expect(sch.days).toEqual([0, 1]);
    });

    it('totalInstances counts executionOrder', () => {
        const sch = new Schedule({
            flowName: 't',
            executionOrder: [
                { id: 1, gatilho_timeStamp: 1000, status: 'completed', resolvedActions: [] },
                { id: 2, gatilho_timeStamp: 2000, status: 'pending', resolvedActions: [] }
            ]
        });
        expect(sch.totalInstances).toBe(2);
        expect(sch.completedCount).toBe(1);
        expect(sch.pendingInstances).toHaveLength(1);
    });

    it('nextPending returns earliest pending instance', () => {
        const sch = new Schedule({
            flowName: 't',
            executionOrder: [
                { id: 1, gatilho_timeStamp: 3000, status: 'pending', resolvedActions: [] },
                { id: 2, gatilho_timeStamp: 1000, status: 'pending', resolvedActions: [] },
                { id: 3, gatilho_timeStamp: 2000, status: 'completed', resolvedActions: [] }
            ]
        });
        expect(sch.nextPending?.id).toBe(2);
    });

    it('toggleActive changes active state', () => {
        const sch = new Schedule({ flowName: 't', active: true });
        sch.toggleActive(false);
        expect(sch.active).toBe(false);
    });

    it('toJSON / fromJSON round-trip', () => {
        const sch = new Schedule({
            flowName: 'test',
            repeticoes: 3,
            executionOrder: [
                { id: 1, gatilho_timeStamp: 1000, status: 'completed', resolvedActions: ['a'] }
            ]
        });
        const json = sch.toJSON();
        const restored = Schedule.fromJSON(json);
        expect(restored.flowName).toBe('test');
        expect(restored.repeticoes).toBe(3);
        expect(restored.executionOrder).toHaveLength(1);
        expect(restored.executionOrder[0].status).toBe('completed');
    });
});
