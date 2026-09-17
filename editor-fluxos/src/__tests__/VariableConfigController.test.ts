// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VariableConfigController, VariableConfigContext } from '../ui/VariableConfigController';
import { VariablePool } from '../domain';
import { Toast } from '../ui/Toast';

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
        document.body.innerHTML = '';
        ctx = createMockCtx();
        ctrl = new VariableConfigController(ctx);
    });

    describe('open/close', () => {
        it('open creates modal', () => {
            ctrl.open();
            expect(document.getElementById('varConfigModal')).not.toBeNull();
        });

        it('open renders structure', () => {
            ctrl.open();
            const modal = document.getElementById('varConfigModal')!;
            expect(modal.querySelector('h2')!.textContent).toContain('Variaveis');
            expect(modal.querySelector('#obrigTable')).not.toBeNull();
            expect(modal.querySelector('#opcionalTable')).not.toBeNull();
        });

        it('open renders buttons', () => {
            ctrl.open();
            const modal = document.getElementById('varConfigModal')!;
            expect(modal.querySelector('.btn-close')).not.toBeNull();
            expect(modal.querySelector('.btn-add-obrig')).not.toBeNull();
            expect(modal.querySelector('.btn-add-opc')).not.toBeNull();
            expect(modal.querySelector('.btn-save')).not.toBeNull();
            expect(modal.querySelector('.btn-import-json')).not.toBeNull();
            expect(modal.querySelector('.btn-export-json')).not.toBeNull();
        });

        it('open renders selects for import/export', () => {
            ctrl.open();
            const modal = document.getElementById('varConfigModal')!;
            expect(modal.querySelector('#importType')).not.toBeNull();
            expect(modal.querySelector('#exportType')).not.toBeNull();
        });

        it('open renders hidden file input', () => {
            ctrl.open();
            const modal = document.getElementById('varConfigModal')!;
            const fileInput = modal.querySelector('#importJsonFile') as HTMLInputElement;
            expect(fileInput).not.toBeNull();
            expect(fileInput.type).toBe('file');
        });

        it('open renders empty state', () => {
            ctrl.open();
            const modal = document.getElementById('varConfigModal')!;
            expect(modal.querySelector('.empty-state')).not.toBeNull();
        });

        it('close removes modal', () => {
            ctrl.open();
            expect(document.getElementById('varConfigModal')).not.toBeNull();
            ctrl.close();
            expect(document.getElementById('varConfigModal')).toBeNull();
        });

        it('close is safe when not open', () => {
            expect(() => ctrl.close()).not.toThrow();
        });
    });

    describe('handleAddObrig', () => {
        beforeEach(() => { ctrl.open(); });

        it('adds obrig when name and value provided', () => {
            const pool = new VariablePool();
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            (document.getElementById('obrigNome') as HTMLInputElement).value = 'cor';
            (document.getElementById('obrigValor') as HTMLInputElement).value = 'azul';

            ctrl.handleAddObrig();

            expect(pool.obrigatorias).toHaveLength(1);
            expect(pool.obrigatorias[0]).toEqual({ nome: 'cor', valor: 'azul' });
        });

        it('clears inputs after adding', () => {
            vi.mocked(ctx.getVarConfig).mockReturnValue(new VariablePool());
            (document.getElementById('obrigNome') as HTMLInputElement).value = 'cor';
            (document.getElementById('obrigValor') as HTMLInputElement).value = 'azul';

            ctrl.handleAddObrig();

            expect((document.getElementById('obrigNome') as HTMLInputElement).value).toBe('');
            expect((document.getElementById('obrigValor') as HTMLInputElement).value).toBe('');
        });

        it('does nothing with empty name', () => {
            const pool = new VariablePool();
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            (document.getElementById('obrigNome') as HTMLInputElement).value = '';
            (document.getElementById('obrigValor') as HTMLInputElement).value = 'azul';

            ctrl.handleAddObrig();

            expect(pool.obrigatorias).toHaveLength(0);
        });

        it('does nothing with empty value', () => {
            const pool = new VariablePool();
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            (document.getElementById('obrigNome') as HTMLInputElement).value = 'cor';
            (document.getElementById('obrigValor') as HTMLInputElement).value = '';

            ctrl.handleAddObrig();

            expect(pool.obrigatorias).toHaveLength(0);
        });

        it('does nothing when not open', () => {
            ctrl.close();
            expect(() => ctrl.handleAddObrig()).not.toThrow();
        });

        it('shows Toast.error on duplicate', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('cor', 'azul');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            (document.getElementById('obrigNome') as HTMLInputElement).value = 'x';
            (document.getElementById('obrigValor') as HTMLInputElement).value = 'azul';

            ctrl.handleAddObrig();

            expect(Toast.error).toHaveBeenCalled();
        });
    });

    describe('handleAddOpc', () => {
        beforeEach(() => { ctrl.open(); });

        it('adds opcional', () => {
            const pool = new VariablePool();
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            (document.getElementById('opcNome') as HTMLInputElement).value = 'fruta';
            (document.getElementById('opcValor') as HTMLInputElement).value = 'maca';

            ctrl.handleAddOpc();

            expect(pool.opcionais).toHaveLength(1);
            expect(pool.opcionais[0]).toEqual({ nome: 'fruta', valor: 'maca' });
        });

        it('clears inputs after adding', () => {
            vi.mocked(ctx.getVarConfig).mockReturnValue(new VariablePool());
            (document.getElementById('opcNome') as HTMLInputElement).value = 'fruta';
            (document.getElementById('opcValor') as HTMLInputElement).value = 'maca';

            ctrl.handleAddOpc();

            expect((document.getElementById('opcNome') as HTMLInputElement).value).toBe('');
            expect((document.getElementById('opcValor') as HTMLInputElement).value).toBe('');
        });

        it('does nothing with empty fields', () => {
            const pool = new VariablePool();
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            (document.getElementById('opcNome') as HTMLInputElement).value = '';
            (document.getElementById('opcValor') as HTMLInputElement).value = '';

            ctrl.handleAddOpc();

            expect(pool.opcionais).toHaveLength(0);
        });

        it('does nothing when not open', () => {
            ctrl.close();
            expect(() => ctrl.handleAddOpc()).not.toThrow();
        });

        it('shows Toast.error on duplicate', () => {
            const pool = new VariablePool();
            pool.addOpcional('fruta', 'maca');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            (document.getElementById('opcNome') as HTMLInputElement).value = 'x';
            (document.getElementById('opcValor') as HTMLInputElement).value = 'maca';

            ctrl.handleAddOpc();

            expect(Toast.error).toHaveBeenCalled();
        });
    });

    describe('handleSave', () => {
        beforeEach(() => { ctrl.open(); });

        it('saves config and closes modal', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('cor', 'azul');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            ctrl.handleSave();

            expect(ctx.saveVarConfig).toHaveBeenCalledWith(pool.toJSON());
            expect(ctx.saveToStorage).toHaveBeenCalled();
            expect(ctx.renderVariables).toHaveBeenCalled();
            expect(document.getElementById('varConfigModal')).toBeNull();
            expect(Toast.success).toHaveBeenCalledWith('Variaveis salvas!');
        });

        it('does nothing when not open', () => {
            ctrl.close();
            expect(() => ctrl.handleSave()).not.toThrow();
            expect(ctx.saveVarConfig).not.toHaveBeenCalled();
        });
    });

    describe('handleExport', () => {
        beforeEach(() => { ctrl.open(); });

        it('exports all by default', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('cor', 'azul');
            pool.addOpcional('fruta', 'maca');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            const mockClick = vi.fn();
            const origCreateElement = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
                if (tag === 'a') return { click: mockClick, href: '', download: '' } as any;
                return origCreateElement(tag);
            });
            vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:');
            vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

            ctrl.handleExport();

            expect(mockClick).toHaveBeenCalled();
            expect(Toast.success).toHaveBeenCalledWith('JSON exportado!');
            vi.restoreAllMocks();
        });

        it('exports only obrigatorias when type is obrig', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('cor', 'azul');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            const select = document.getElementById('exportType') as HTMLSelectElement;
            select.value = 'obrig';

            const mockClick = vi.fn();
            const origCreateElement = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
                if (tag === 'a') return { click: mockClick, href: '', download: '' } as any;
                return origCreateElement(tag);
            });
            vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:');
            vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

            ctrl.handleExport();

            expect(mockClick).toHaveBeenCalled();
            vi.restoreAllMocks();
        });
    });

    describe('handleImportFile', () => {
        beforeEach(() => { ctrl.open(); });

        it('does nothing when no file selected', () => {
            const event = { target: { files: [], value: '' } } as any;
            ctrl.handleImportFile(event);
            expect(ctx.setVarConfig).not.toHaveBeenCalled();
        });
        it('imports obrig variables from JSON', async () => {
            const pool = new VariablePool();
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            const jsonData = JSON.stringify({ obrigatorias: [{ nome: 'cor', valor: 'azul' }], opcionais: [] });

            const origFileReader = globalThis.FileReader;
            globalThis.FileReader = class {
                result: string | null = null;
                onload: ((e: any) => void) | null = null;
                readAsText(_blob: Blob) {
                    this.result = jsonData;
                    this.onload?.({ target: { result: jsonData } });
                }
            } as any;

            const file = new File([jsonData], 'test.json', { type: 'application/json' });
            const event = { target: { files: [file], value: '' } } as any;

            ctrl.handleImportFile(event);

            globalThis.FileReader = origFileReader;
            expect(ctx.setVarConfig).toHaveBeenCalled();
            expect(Toast.success).toHaveBeenCalled();
        });

        it('imports opc variables from JSON', async () => {
            const pool = new VariablePool();
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            const jsonData = JSON.stringify({ obrigatorias: [], opcionais: [{ nome: 'fruta', valor: 'maca' }] });

            const origFileReader = globalThis.FileReader;
            globalThis.FileReader = class {
                result: string | null = null;
                onload: ((e: any) => void) | null = null;
                readAsText(_blob: Blob) {
                    this.result = jsonData;
                    this.onload?.({ target: { result: jsonData } });
                }
            } as any;

            const select = document.getElementById('importType') as HTMLSelectElement;
            select.value = 'opc';

            const file = new File([jsonData], 'test.json', { type: 'application/json' });
            const event = { target: { files: [file], value: '' } } as any;

            ctrl.handleImportFile(event);

            globalThis.FileReader = origFileReader;
            expect(ctx.setVarConfig).toHaveBeenCalled();
        });

        it('shows Toast.error on invalid JSON', async () => {
            const origFileReader = globalThis.FileReader;
            globalThis.FileReader = class {
                result: string | null = null;
                onload: ((e: any) => void) | null = null;
                readAsText(_blob: Blob) {
                    this.onload?.({ target: { result: 'invalid' } });
                }
            } as any;

            const file = new File(['invalid'], 'test.json', { type: 'application/json' });
            const event = { target: { files: [file], value: '' } } as any;

            ctrl.handleImportFile(event);

            globalThis.FileReader = origFileReader;
            expect(Toast.error).toHaveBeenCalled();
        });

        it('skips items with empty nome or valor', async () => {
            const pool = new VariablePool();
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            const jsonData = JSON.stringify({ obrigatorias: [{ nome: '', valor: 'x' }, { nome: 'y', valor: '' }, { nome: 'ok', valor: 'val' }], opcionais: [] });

            const origFileReader = globalThis.FileReader;
            globalThis.FileReader = class {
                result: string | null = null;
                onload: ((e: any) => void) | null = null;
                readAsText(_blob: Blob) {
                    this.result = jsonData;
                    this.onload?.({ target: { result: jsonData } });
                }
            } as any;

            const file = new File([jsonData], 'test.json', { type: 'application/json' });
            const event = { target: { files: [file], value: '' } } as any;

            ctrl.handleImportFile(event);

            globalThis.FileReader = origFileReader;
            expect(pool.obrigatorias).toHaveLength(1);
        });

        it('skips items that throw on add', async () => {
            const pool = new VariablePool();
            pool.addObrigatorio('cor', 'azul');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            const jsonData = JSON.stringify({ obrigatorias: [{ nome: 'cor', valor: 'azul' }], opcionais: [] });

            const origFileReader = globalThis.FileReader;
            globalThis.FileReader = class {
                result: string | null = null;
                onload: ((e: any) => void) | null = null;
                readAsText(_blob: Blob) {
                    this.result = jsonData;
                    this.onload?.({ target: { result: jsonData } });
                }
            } as any;

            const file = new File([jsonData], 'test.json', { type: 'application/json' });
            const event = { target: { files: [file], value: '' } } as any;

            ctrl.handleImportFile(event);

            globalThis.FileReader = origFileReader;
            expect(pool.obrigatorias).toHaveLength(1);
        });
    });

    describe('_renderTable', () => {
        it('shows table with items when pool has data', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('cor', 'azul');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            ctrl.open();

            const modal = document.getElementById('varConfigModal')!;
            const table = modal.querySelector('#obrigTable table');
            expect(table).not.toBeNull();
            expect(table!.querySelector('tbody')!.children.length).toBe(1);
        });

        it('shows empty state when pool is empty', () => {
            ctrl.open();
            const modal = document.getElementById('varConfigModal')!;
            expect(modal.querySelector('#obrigTable .empty-state')).not.toBeNull();
        });

        it('shows remove buttons for items', () => {
            const pool = new VariablePool();
            pool.addOpcional('fruta', 'maca');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            ctrl.open();

            const modal = document.getElementById('varConfigModal')!;
            expect(modal.querySelector('.btn-remove-opc')).not.toBeNull();
        });

        it('escapes HTML in variable names', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('<script>alert(1)</script>', 'val');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);

            ctrl.open();

            const modal = document.getElementById('varConfigModal')!;
            const html = modal.querySelector('#obrigTable')!.innerHTML;
            expect(html).not.toContain('<script>');
            expect(html).toContain('&lt;script&gt;');
        });
    });

    describe('handleClearObrig', () => {
        beforeEach(() => { ctrl.open(); });

        it('deleta todas as obrigatorias apos confirmar', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('a', '1');
            pool.addObrigatorio('b', '2');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

            ctrl.handleClearObrig();

            expect(pool.obrigatorias).toHaveLength(0);
            expect(Toast.info).toHaveBeenCalled();
            vi.mocked(globalThis.confirm).mockRestore();
        });

        it('nao deleta quando confirmacao e cancelada', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('a', '1');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

            ctrl.handleClearObrig();

            expect(pool.obrigatorias).toHaveLength(1);
            vi.mocked(globalThis.confirm).mockRestore();
        });

        it('nao pede confirmacao quando o pool esta vazio', () => {
            vi.mocked(ctx.getVarConfig).mockReturnValue(new VariablePool());
            const spy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

            ctrl.handleClearObrig();

            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    describe('handleClearOpc', () => {
        beforeEach(() => { ctrl.open(); });

        it('deleta todas as opcionais apos confirmar', () => {
            const pool = new VariablePool();
            pool.addOpcional('a', '1');
            pool.addOpcional('b', '2');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

            ctrl.handleClearOpc();

            expect(pool.opcionais).toHaveLength(0);
            expect(Toast.info).toHaveBeenCalled();
            vi.mocked(globalThis.confirm).mockRestore();
        });

        it('nao deleta quando confirmacao e cancelada', () => {
            const pool = new VariablePool();
            pool.addOpcional('a', '1');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

            ctrl.handleClearOpc();

            expect(pool.opcionais).toHaveLength(1);
            vi.mocked(globalThis.confirm).mockRestore();
        });
    });

    describe('handleClearAll', () => {
        beforeEach(() => { ctrl.open(); });

        it('deleta obrigatorias e opcionais apos confirmar', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('a', '1');
            pool.addOpcional('b', '2');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

            ctrl.handleClearAll();

            expect(pool.obrigatorias).toHaveLength(0);
            expect(pool.opcionais).toHaveLength(0);
            expect(Toast.info).toHaveBeenCalled();
            vi.mocked(globalThis.confirm).mockRestore();
        });

        it('nao deleta quando confirmacao e cancelada', () => {
            const pool = new VariablePool();
            pool.addObrigatorio('a', '1');
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

            ctrl.handleClearAll();

            expect(pool.obrigatorias).toHaveLength(1);
            vi.mocked(globalThis.confirm).mockRestore();
        });
    });

    describe('paginacao', () => {
        it('mostra 10 itens na primeira pagina e 2 na segunda', () => {
            const pool = new VariablePool();
            for (let i = 0; i < 12; i++) {
                pool.addOpcional('cor', `valor_${i}`);
            }
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            ctrl.open();

            const modal = document.getElementById('varConfigModal')!;
            expect(modal.querySelector('#opcionalTable tbody')!.children.length).toBe(10);
            expect(modal.querySelector('#opcionalTable .pagination-info')!.textContent).toBe('Página 1 de 2');

            ctrl.handleNextPage('opc');

            expect(modal.querySelector('#opcionalTable tbody')!.children.length).toBe(2);
            expect(modal.querySelector('#opcionalTable .pagination-info')!.textContent).toBe('Página 2 de 2');
        });

        it('remove usa indice absoluto na segunda pagina', () => {
            const pool = new VariablePool();
            for (let i = 0; i < 12; i++) {
                pool.addOpcional('cor', `valor_${i}`);
            }
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            ctrl.open();

            ctrl.handleNextPage('opc');

            const modal = document.getElementById('varConfigModal')!;
            const firstRemoveBtn = modal.querySelector('#opcionalTable .btn-remove-opc') as HTMLElement;
            expect(firstRemoveBtn.dataset.idx).toBe('10');
            expect(pool.opcionais).toHaveLength(12);
        });

        it('nao exibe paginacao quando tem 10 itens ou menos', () => {
            const pool = new VariablePool();
            for (let i = 0; i < 10; i++) {
                pool.addObrigatorio('n', `v${i}`);
            }
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            ctrl.open();

            const modal = document.getElementById('varConfigModal')!;
            expect(modal.querySelector('#obrigTable .pagination-controls')).toBeNull();
        });

        it('navega para tras e para frente', () => {
            const pool = new VariablePool();
            for (let i = 0; i < 25; i++) {
                pool.addOpcional('cor', `valor_${i}`);
            }
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            ctrl.open();

            const modal = document.getElementById('varConfigModal')!;
            ctrl.handleNextPage('opc');
            ctrl.handleNextPage('opc');
            expect(modal.querySelector('#opcionalTable .pagination-info')!.textContent).toBe('Página 3 de 3');

            ctrl.handlePrevPage('opc');
            expect(modal.querySelector('#opcionalTable .pagination-info')!.textContent).toBe('Página 2 de 3');

            ctrl.handlePrevPage('opc');
            ctrl.handlePrevPage('opc');
            expect(modal.querySelector('#opcionalTable .pagination-info')!.textContent).toBe('Página 1 de 3');
        });

        it('volta a pagina 1 apos deletar tudo', () => {
            const pool = new VariablePool();
            for (let i = 0; i < 12; i++) {
                pool.addOpcional('cor', `valor_${i}`);
            }
            vi.mocked(ctx.getVarConfig).mockReturnValue(pool);
            ctrl.open();
            ctrl.handleNextPage('opc');

            vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
            ctrl.handleClearOpc();

            const modal = document.getElementById('varConfigModal')!;
            expect(modal.querySelector('#opcionalTable .empty-state')).not.toBeNull();
            vi.mocked(globalThis.confirm).mockRestore();
        });
    });
});
