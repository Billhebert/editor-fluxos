import { describe, it, expect } from 'vitest';
import { BUILT_IN_VARS, WEEK_DAYS, STATUS_COLORS, STATUS_LABELS } from '../domain/constants';

describe('BUILT_IN_VARS', () => {
    it('has obrigatorio', () => {
        expect(BUILT_IN_VARS.obrigatorio).toBe('ITEM_OBRIGATORIO');
    });
    it('has opcional', () => {
        expect(BUILT_IN_VARS.opcional).toBe('ITEM_OPCIONAL');
    });
});

describe('WEEK_DAYS', () => {
    it('has 7 days', () => {
        expect(WEEK_DAYS).toHaveLength(7);
    });
    it('starts with Dom', () => {
        expect(WEEK_DAYS[0]).toBe('Dom');
    });
    it('ends with Sab', () => {
        expect(WEEK_DAYS[6]).toBe('Sab');
    });
});

describe('STATUS_COLORS', () => {
    it('has all 4 statuses', () => {
        expect(Object.keys(STATUS_COLORS)).toHaveLength(4);
        expect(STATUS_COLORS.completed).toBe('#00b894');
        expect(STATUS_COLORS.failed).toBe('#e17055');
        expect(STATUS_COLORS.running).toBe('#74b9ff');
        expect(STATUS_COLORS.pending).toBe('#fdcb6e');
    });
});

describe('STATUS_LABELS', () => {
    it('has all 4 labels', () => {
        expect(Object.keys(STATUS_LABELS)).toHaveLength(4);
        expect(STATUS_LABELS.completed).toContain('Concluido');
        expect(STATUS_LABELS.failed).toContain('Falhou');
        expect(STATUS_LABELS.running).toContain('Rodando');
        expect(STATUS_LABELS.pending).toContain('Pendente');
    });
});
