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
        localStorage.clear();
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

    it('loadFromStorage loads variables from localStorage', () => {
        localStorage.setItem('fluxos_variables', JSON.stringify(['var1', 'var2']));

        vm.loadFromStorage();

        expect(vm.variables).toEqual(['var1', 'var2']);
    });

    it('loadFromStorage handles invalid JSON gracefully', () => {
        localStorage.setItem('fluxos_variables', 'not-json');

        vm.loadFromStorage();

        expect(vm.variables).toEqual([]);
    });

    it('loadFromStorage loads varConfig from repo', () => {
        const mockConfig = { obrigatorias: ['a'], opcionais: ['b'] };
        vi.mocked(ctx.varConfigRepo.loadVarConfig).mockReturnValue(mockConfig as any);

        vm.loadFromStorage();

        expect(ctx.varConfigRepo.loadVarConfig).toHaveBeenCalled();
    });

    it('loadFromStorage handles repo error gracefully', () => {
        vi.mocked(ctx.varConfigRepo.loadVarConfig).mockImplementation(() => { throw new Error('fail'); });

        vm.loadFromStorage();

        expect(vm.varConfig).toBeInstanceOf(VariablePool);
    });

    it('saveToStorage persists variables and varConfig', () => {
        vm.loadFromStorage();
        (vm as any)._variables = ['saved-var'];
        vm.saveToStorage();

        expect(localStorage.getItem('fluxos_variables')).toContain('saved-var');
        expect(localStorage.getItem('fluxos_var_config')).toBeTruthy();
    });
});
