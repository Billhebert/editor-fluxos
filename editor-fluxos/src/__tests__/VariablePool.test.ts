import { describe, it, expect } from 'vitest';
import { VariablePool } from '../domain/VariablePool';
import { ValidationError } from '../domain/errors';

describe('VariablePool', () => {
    it('creates empty pool by default', () => {
        const pool = new VariablePool();
        expect(pool.obrigatorias).toHaveLength(0);
        expect(pool.opcionais).toHaveLength(0);
    });

    it('creates pool from data', () => {
        const pool = new VariablePool({
            obrigatorias: [{ nome: 'item1', valor: 'val1' }],
            opcionais: [{ nome: 'opt1', valor: 'optval1' }]
        });
        expect(pool.obrigatorias).toHaveLength(1);
        expect(pool.opcionais).toHaveLength(1);
    });

    describe('obrigatorias', () => {
        it('adds obrigatorio', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('nome', 'valor');
            expect(pool.obrigatorias).toHaveLength(1);
            expect(pool.obrigatorias[0]).toEqual({ nome: 'nome', valor: 'valor' });
        });

        it('trims whitespace', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('  nome  ', '  valor  ');
            expect(pool.obrigatorias[0]).toEqual({ nome: 'nome', valor: 'valor' });
        });

        it('throws for empty nome', () => {
            const pool = new VariablePool();
            expect(() => pool.addObrigatorio('', 'v')).toThrow(ValidationError);
        });

        it('throws for empty valor', () => {
            const pool = new VariablePool();
            expect(() => pool.addObrigatorio('n', '')).toThrow(ValidationError);
        });

        it('throws for duplicate valor', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('n1', 'v1');
            expect(() => pool.addObrigatorio('n2', 'v1')).toThrow(ValidationError);
        });

        it('removes obrigatorio by index', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('n1', 'v1');
            pool.addObrigatorio('n2', 'v2');
            pool.removeObrigatorio(0);
            expect(pool.obrigatorias).toHaveLength(1);
            expect(pool.obrigatorias[0].nome).toBe('n2');
        });

        it('throws for out of range index', () => {
            const pool = new VariablePool();
            expect(() => pool.removeObrigatorio(0)).toThrow(ValidationError);
        });

        it('updates obrigatorio', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('old', 'oldv');
            pool.updateObrigatorio(0, 'new', 'newv');
            expect(pool.obrigatorias[0]).toEqual({ nome: 'new', valor: 'newv' });
        });
    });

    describe('opcionais', () => {
        it('adds opcional', () => {
            const pool = new VariablePool();
            pool.addOpcional('nome', 'valor');
            expect(pool.opcionais).toHaveLength(1);
        });

        it('throws for duplicate valor', () => {
            const pool = new VariablePool();
            pool.addOpcional('n1', 'v1');
            expect(() => pool.addOpcional('n2', 'v1')).toThrow(ValidationError);
        });

        it('removes opcional', () => {
            const pool = new VariablePool();
            pool.addOpcional('n1', 'v1');
            pool.removeOpcional(0);
            expect(pool.opcionais).toHaveLength(0);
        });
    });

    describe('createOpcionalIterator', () => {
        it('iterates through all opcionais', () => {
            const pool = new VariablePool({
                obrigatorias: [],
                opcionais: [
                    { nome: 'a', valor: '1' },
                    { nome: 'b', valor: '2' },
                    { nome: 'c', valor: '3' }
                ]
            });
            const iter = pool.createOpcionalIterator();
            const values = new Set<string>();
            for (let i = 0; i < 10; i++) {
                values.add(iter.next());
            }
            expect(values.size).toBe(3);
        });
    });

    it('hasObrigatorio / hasOpcional', () => {
        const pool = new VariablePool();
        expect(pool.hasObrigatorio).toBe(false);
        pool.addObrigatorio('n', 'v');
        expect(pool.hasObrigatorio).toBe(true);
        expect(pool.hasOpcional).toBe(false);
    });

    it('toJSON / fromJSON round-trip', () => {
        const pool = new VariablePool({
            obrigatorias: [{ nome: 'n', valor: 'v' }],
            opcionais: [{ nome: 'o', valor: 'ov' }]
        });
        const json = pool.toJSON();
        const restored = VariablePool.fromJSON(json);
        expect(restored.obrigatorias).toHaveLength(1);
        expect(restored.opcionais).toHaveLength(1);
    });
});
