// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VariableConfigController, VariableConfigContext } from '../ui/VariableConfigController';
import { VariablePool } from '../domain';

vi.mock('../ui/Toast', () => ({
    Toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

function createMockCtx(overrides: Partial<VariableConfigContext> = {}): VariableConfigContext {
    return {
        getVarConfig: vi.fn().mockReturnValue(new VariablePool()),
        setVarConfig: vi.fn(),
        saveVarConfig: vi.fn(),
        renderVariables: vi.fn(),
        saveToStorage: vi.fn(),
        ...overrides,
    };
}

describe('VariableConfigController', () => {
    let ctx: VariableConfigContext;
    let ctrl: VariableConfigController;

    beforeEach(() => {
        vi.clearAllMocks();
        ctx = createMockCtx();
        ctrl = new VariableConfigController(ctx);
    });

    it('open creates modal with correct structure', () => {
        ctrl.open();

        const modal = document.getElementById('varConfigModal');
        expect(modal).not.toBeNull();
        expect(modal!.className).toContain('modal-fullscreen');
        expect(modal!.querySelector('h2')!.textContent).toContain('Variaveis');
    });

    it('open renders sections for obrigatorias and opcionais', () => {
        ctrl.open();

        const modal = document.getElementById('varConfigModal')!;
        expect(modal.querySelector('#obrigTable')).not.toBeNull();
        expect(modal.querySelector('#opcionalTable')).not.toBeNull();
    });

    it('open renders action buttons', () => {
        ctrl.open();

        const modal = document.getElementById('varConfigModal')!;
        expect(modal.querySelector('.btn-close')).not.toBeNull();
        expect(modal.querySelector('.btn-add-obrig')).not.toBeNull();
        expect(modal.querySelector('.btn-add-opc')).not.toBeNull();
        expect(modal.querySelector('.btn-save')).not.toBeNull();
        expect(modal.querySelector('.btn-import-json')).not.toBeNull();
        expect(modal.querySelector('.btn-export-json')).not.toBeNull();
    });

    it('open renders import/export selects', () => {
        ctrl.open();

        const modal = document.getElementById('varConfigModal')!;
        expect(modal.querySelector('#importType')).not.toBeNull();
        expect(modal.querySelector('#exportType')).not.toBeNull();
    });

    it('open renders file input hidden', () => {
        ctrl.open();

        const modal = document.getElementById('varConfigModal')!;
        const fileInput = modal.querySelector('#importJsonFile') as HTMLInputElement;
        expect(fileInput).not.toBeNull();
        expect(fileInput.type).toBe('file');
    });

    it('open renders empty state when no variables', () => {
        ctrl.open();

        const modal = document.getElementById('varConfigModal')!;
        expect(modal.querySelector('.empty-state')).not.toBeNull();
    });
});
