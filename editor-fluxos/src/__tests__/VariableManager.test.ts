// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VariableManager, VariableManagerContext } from '../ui/VariableManager';
import { IVariableConfigRepository } from '../adapters/IVariableConfigRepository';
import { VariablePool } from '../domain';

vi.mock('../ui/RecordingController', () => ({
    RecordingController: vi.fn().mockImplementation(() => ({})),
}));

function createMockCtx(overrides: Partial<VariableManagerContext> = {}): VariableManagerContext {
    return {
        varConfigRepo: {
            loadVarConfig: vi.fn().mockReturnValue({ obrigatorias: [], opcionais: [] }),
            saveVarConfig: vi.fn(),
            loadVariables: vi.fn().mockReturnValue([]),
            saveVariables: vi.fn(),
        } as unknown as IVariableConfigRepository,
        recording: {
            addToQueue: vi.fn(),
        } as any,
        ...overrides,
    };
}

describe('VariableManager', () => {
    let ctx: VariableManagerContext;
    let vm: VariableManager;

    beforeEach(() => {
        vi.clearAllMocks();
        ctx = createMockCtx();
        vm = new VariableManager(ctx);
    });

    it('variables starts empty', () => {
        expect(vm.variables).toEqual([]);
    });

    it('varConfig starts as empty VariablePool', () => {
        expect(vm.varConfig).toBeInstanceOf(VariablePool);
    });

    it('varConfig can be set', () => {
        const pool = new VariablePool();
        vm.varConfig = pool;
        expect(vm.varConfig).toBe(pool);
    });

    it('loadFromStorage loads variables from repo', () => {
        vi.mocked(ctx.varConfigRepo.loadVariables).mockReturnValue(['var1', 'var2']);

        vm.loadFromStorage();

        expect(vm.variables).toEqual(['var1', 'var2']);
    });

    it('loadFromStorage handles repo error gracefully', () => {
        vi.mocked(ctx.varConfigRepo.loadVariables).mockImplementation(() => { throw new Error('fail'); });

        vm.loadFromStorage();

        expect(vm.variables).toEqual([]);
    });

    it('loadFromStorage loads varConfig from repo', () => {
        const mockConfig = { obrigatorias: ['a'], opcionais: ['b'] };
        vi.mocked(ctx.varConfigRepo.loadVarConfig).mockReturnValue(mockConfig as any);

        vm.loadFromStorage();

        expect(ctx.varConfigRepo.loadVarConfig).toHaveBeenCalled();
    });

    it('loadFromStorage handles varConfig repo error gracefully', () => {
        vi.mocked(ctx.varConfigRepo.loadVarConfig).mockImplementation(() => { throw new Error('fail'); });

        vm.loadFromStorage();

        expect(vm.varConfig).toBeInstanceOf(VariablePool);
    });

    it('saveToStorage persists via repo', () => {
        (vm as any)._variables = ['saved-var'];
        vm.saveToStorage();

        expect(ctx.varConfigRepo.saveVariables).toHaveBeenCalledWith(['saved-var']);
        expect(ctx.varConfigRepo.saveVarConfig).toHaveBeenCalled();
    });

    describe('_addVariableValue', () => {
        it('adds variable to list', () => {
            vm._addVariableValue('newVar');
            expect(vm.variables).toContain('newVar');
        });

        it('does not add duplicate', () => {
            vm._addVariableValue('dupVar');
            vm._addVariableValue('dupVar');
            expect(vm.variables.filter(v => v === 'dupVar')).toHaveLength(1);
        });

        it('calls renderVariables and saveToStorage after adding', () => {
            const renderSpy = vi.spyOn(vm, 'renderVariables');
            const saveSpy = vi.spyOn(vm, 'saveToStorage');

            vm._addVariableValue('testVar');

            expect(renderSpy).toHaveBeenCalled();
            expect(saveSpy).toHaveBeenCalled();
        });
    });
});
