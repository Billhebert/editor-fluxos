import { describe, it, expect } from 'vitest';
import { VariableResolver } from '../use-cases/VariableResolver';
import { VariablePool } from '../domain/VariablePool';

describe('VariableResolver', () => {
    describe('resolveTemplate', () => {
        it('replaces ITEM_OBRIGATORIO with provided value', () => {
            const pool = new VariablePool();
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveTemplate(['ITEM_OBRIGATORIO', 'click'], 'produto_A');
            expect(result).toEqual(['produto_A', 'click']);
        });

        it('returns [SEM ITEM] when no obrigatorioValor provided', () => {
            const pool = new VariablePool();
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveTemplate(['ITEM_OBRIGATORIO']);
            expect(result).toEqual(['[SEM ITEM]']);
        });

        it('replaces ITEM_OPCIONAL with pool values', () => {
            const pool = new VariablePool();
            pool.addOpcional('cor', 'vermelho');
            pool.addOpcional('tamanho', 'P');
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveTemplate(['ITEM_OPCIONAL', 'ITEM_OPCIONAL']);
            expect(result).toHaveLength(2);
            expect(result).toContain('vermelho');
            expect(result).toContain('P');
        });

        it('returns [SEM OPCIONAL] when pool is empty', () => {
            const pool = new VariablePool();
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveTemplate(['ITEM_OPCIONAL']);
            expect(result).toEqual(['[SEM OPCIONAL]']);
        });

        it('passes through non-placeholder actions unchanged', () => {
            const pool = new VariablePool();
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveTemplate(['enter', 'click', 'wait 1000']);
            expect(result).toEqual(['enter', 'click', 'wait 1000']);
        });

        it('handles mixed placeholders and plain actions', () => {
            const pool = new VariablePool();
            pool.addOpcional('cor', 'azul');
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveTemplate(['enter', 'ITEM_OBRIGATORIO', 'ITEM_OPCIONAL', 'click'], 'XPTO');
            expect(result).toEqual(['enter', 'XPTO', 'azul', 'click']);
        });

        it('does not return duplicate opcionais in same template', () => {
            const pool = new VariablePool();
            pool.addOpcional('a', '1');
            pool.addOpcional('b', '2');
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveTemplate(['ITEM_OPCIONAL', 'ITEM_OPCIONAL']);
            const unique = new Set(result);
            expect(unique.size).toBe(result.length);
        });
    });

    describe('resolveForRuntime', () => {
        it('cycles through obrigatorias', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('a', 'val_a');
            pool.addObrigatorio('b', 'val_b');
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveForRuntime([
                'ITEM_OBRIGATORIO', 'ITEM_OBRIGATORIO', 'ITEM_OBRIGATORIO'
            ]);
            expect(result).toEqual(['val_a', 'val_b', 'val_a']);
        });

        it('returns [SEM ITEM] when no obrigatorias', () => {
            const pool = new VariablePool();
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveForRuntime(['ITEM_OBRIGATORIO']);
            expect(result).toEqual(['[SEM ITEM]']);
        });

        it('resolves ITEM_OPCIONAL from pool', () => {
            const pool = new VariablePool();
            pool.addOpcional('x', 'val_x');
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveForRuntime(['ITEM_OPCIONAL']);
            expect(result).toEqual(['val_x']);
        });

        it('returns [SEM OPCIONAL] when no opcionais', () => {
            const pool = new VariablePool();
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveForRuntime(['ITEM_OPCIONAL']);
            expect(result).toEqual(['[SEM OPCIONAL]']);
        });

        it('passes through plain actions', () => {
            const pool = new VariablePool();
            const resolver = new VariableResolver(pool);
            const result = resolver.resolveForRuntime(['mouse click 100 200']);
            expect(result).toEqual(['mouse click 100 200']);
        });
    });

    describe('createEmpty', () => {
        it('creates resolver with empty pool', () => {
            const resolver = VariableResolver.createEmpty();
            const result = resolver.resolveTemplate(['ITEM_OBRIGATORIO', 'ITEM_OPCIONAL']);
            expect(result).toEqual(['[SEM ITEM]', '[SEM OPCIONAL]']);
        });
    });
});
