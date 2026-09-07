import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { _electron, ElectronApplication, Page } from 'playwright-core';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const ROOT = path.join(__dirname, '..');
const MAIN = path.join(__dirname, 'main.js');

let app: ElectronApplication;
let page: Page;

async function createFlow(name: string): Promise<void> {
    await page.click('[data-action="add-new-fluxo"]');
    await page.waitForSelector('#modalInput');
    await page.fill('#modalInput', name);
    await page.click('#modalOk');
    await page.waitForSelector(`.fluxo-card[data-name="${name}"]`);
}

async function openRecordingFor(name: string): Promise<void> {
    await page.click(`.fluxo-card[data-name="${name}"] .btn-record`);
    await page.waitForSelector('#recordingPanel.active');
}

async function waitToast(text: string, type = 'success'): Promise<void> {
    await page.waitForSelector(`#toastContainer .toast.${type}:has-text("${text}")`, { timeout: 10000 });
}

beforeAll(async () => {
    app = await _electron.launch({ args: [MAIN] });
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[data-action="add-new-fluxo"]', { timeout: 30000 });

    page.on('dialog', (dialog) => dialog.accept());

    await page.evaluate(() => {
        const proto = HTMLAnchorElement.prototype;
        const orig = proto.click;
        proto.click = function (this: HTMLAnchorElement) {
            if (!this.download) orig.call(this);
        };
    });
}, 60000);

beforeEach(async () => {
    await page.evaluate(() => {
        document.querySelectorAll('#toastContainer .toast').forEach((t) => t.remove());
    });
});

afterAll(async () => {
    await app?.close();
});

describe('FLUXO E2E', () => {
    describe('Boot', () => {
        it('abre com titulo e header corretos', async () => {
            expect(await page.title()).toBe('FLUXO');
            expect(await page.textContent('h1')).toContain('FLUXO');
        });

        it('renderiza todos os botoes do header', async () => {
            for (const action of ['open-file', 'save-file', 'save-file-as', 'open-var-config', 'open-schedules']) {
                expect(await page.isVisible(`[data-action="${action}"]`)).toBe(true);
            }
        });

        it('nao mostra erro fatal na tela', async () => {
            const fatal = await page.evaluate(() => {
                const div = document.querySelector('div[style*="e17055"]');
                return div ? div.textContent : null;
            });
            expect(fatal).toBeNull();
        });
    });

    describe('Fluxos CRUD', () => {
        it('cria novo fluxo via modal', async () => {
            await createFlow('fluxo_e2e');
            expect(await page.isVisible('.fluxo-card[data-name="fluxo_e2e"]')).toBe(true);
        });

        it('mostra erro ao criar fluxo duplicado', async () => {
            await page.click('[data-action="add-new-fluxo"]');
            await page.fill('#modalInput', 'fluxo_e2e');
            await page.click('#modalOk');
            await waitToast('already exists', 'error');
        });

        it('renomeia fluxo pelo input do card', async () => {
            const input = page.locator('.fluxo-card[data-name="fluxo_e2e"] .fluxo-name');
            await input.fill('fluxo_renomeado');
            await input.blur();
            await page.waitForSelector('.fluxo-card[data-name="fluxo_renomeado"]');
        });

        it('remove fluxo com confirmacao', async () => {
            await page.click('.fluxo-card[data-name="fluxo_renomeado"] .btn-remove');
            await page.waitForSelector('.fluxo-card[data-name="fluxo_renomeado"]', { state: 'detached' });
        });
    });

    describe('Painel de Gravacao', () => {
        beforeAll(async () => {
            await createFlow('rec_flow');
        });

        it('abre painel com fluxo alvo', async () => {
            await openRecordingFor('rec_flow');
            expect(await page.textContent('#recordingTarget')).toContain('rec_flow');
        });

        it('troca entre as abas do painel', async () => {
            const tabs: [string, string][] = [
                ['keys', 'section-keys'],
                ['mouse', 'section-mouse'],
                ['vars', 'section-vars'],
                ['delay', 'section-delay'],
                ['text', 'section-text'],
            ];
            for (const [tab, section] of tabs) {
                await page.click(`.recording-tab[data-arg="${tab}"]`);
                expect(await page.isVisible(`#${section}`)).toBe(true);
            }
        });

        it('renderiza teclado virtual', async () => {
            await page.click('.recording-tab[data-arg="keys"]');
            const keys = await page.locator('#keyboardContainer .key-btn').count();
            expect(keys).toBeGreaterThan(20);
        });

        it('adiciona tecla do teclado virtual na fila', async () => {
            await page.click('#keyboardContainer .key-btn:has-text("Enter")');
            const count = await page.locator('#queueList .action-item').count();
            expect(count).toBeGreaterThanOrEqual(1);
        });

        it('adiciona acao de mouse com coordenadas', async () => {
            await page.click('.recording-tab[data-arg="mouse"]');
            await page.fill('#mouseX', '100');
            await page.fill('#mouseY', '200');
            await page.click('[data-action="add-mouse-action"][data-arg="click"]');
            const last = await page.locator('#queueList .action-item').last().textContent();
            expect(last).toContain('100');
            expect(last).toContain('200');
        });

        it('adiciona variavel custom e clica na tag', async () => {
            await page.click('.recording-tab[data-arg="vars"]');
            await page.fill('#varInput', 'var_e2e');
            await page.click('[data-action="add-variable"]');
            await page.waitForSelector('#variablesContainer .variable-tag.custom');
            const before = await page.locator('#queueList .action-item').count();
            await page.click('#variablesContainer .variable-tag.custom');
            const after = await page.locator('#queueList .action-item').count();
            expect(after).toBe(before + 1);
        });

        it('adiciona delay por input e preset', async () => {
            await page.click('.recording-tab[data-arg="delay"]');
            await page.fill('#delayInput', '750');
            await page.click('[data-action="add-delay-action"]');
            await page.click('[data-action="delay-preset"][data-arg="1000"]');
            const count = await page.locator('#queueList .action-item').count();
            expect(count).toBeGreaterThanOrEqual(2);
        });

        it('adiciona texto a fila', async () => {
            await page.click('.recording-tab[data-arg="text"]');
            await page.fill('#textInput', 'ola mundo');
            await page.click('[data-action="add-text-action"]');
            const last = await page.locator('#queueList .action-item').last().textContent();
            expect(last).toContain('ola mundo');
        });

        it('grava teclas fisicas quando ativo', async () => {
            await page.click('.recording-tab[data-arg="keys"]');
            await page.click('[data-action="toggle-key-recording"]');
            await page.waitForFunction(() => (document.getElementById('keyRecBtn') as HTMLButtonElement).textContent?.includes('Parar'));
            await page.keyboard.press('a');
            await page.keyboard.press('b');
            await page.click('[data-action="toggle-key-recording"]');
            await page.waitForFunction(() => (document.getElementById('keyRecBtn') as HTMLButtonElement).textContent?.includes('Gravar'));
            const count = await page.locator('#queueList .action-item').count();
            expect(count).toBeGreaterThanOrEqual(2);
        });

        it('alterna captura global pelo botao', async () => {
            await page.click('.recording-tab[data-arg="mouse"]');
            await page.click('[data-action="toggle-global-capture"]');
            await page.waitForFunction(() => (document.getElementById('globalCaptureBtn') as HTMLButtonElement).textContent?.includes('Parar Captura'));
            await page.click('[data-action="toggle-global-capture"]');
            await page.waitForFunction(() => (document.getElementById('globalCaptureBtn') as HTMLButtonElement).textContent?.includes('Captura Global'));
        });

        it('adiciona fila ao fluxo e mostra acoes no card', async () => {
            const queued = await page.locator('#queueList .action-item').count();
            await page.click('[data-action="add-queue-to-fluxo"]');
            await page.waitForSelector('.fluxo-card[data-name="rec_flow"] .action-list .action-item');
            const cardActions = await page.locator('.fluxo-card[data-name="rec_flow"] .action-list .action-item').count();
            expect(cardActions).toBe(queued);
        });

        it('remove acao do card pelo botao', async () => {
            const before = await page.locator('.fluxo-card[data-name="rec_flow"] .action-list .action-item').count();
            await page.click('.fluxo-card[data-name="rec_flow"] .action-list .action-item .action-remove');
            await page.waitForFunction(
                (expected) => document.querySelectorAll('.fluxo-card[data-name="rec_flow"] .action-list .action-item').length === expected,
                before - 1
            );
        });

        it('limpa a fila de acoes', async () => {
            await openRecordingFor('rec_flow');
            await page.click('.recording-tab[data-arg="text"]');
            await page.fill('#textInput', 'temp');
            await page.click('[data-action="add-text-action"]');
            await page.click('[data-action="clear-queue"]');
            const count = await page.locator('#queueList .action-item').count();
            expect(count).toBe(0);
        });

        it('fecha o painel de gravacao', async () => {
            await page.click('[data-action="close-recording"]');
            await page.waitForSelector('#recordingPanel.active', { state: 'detached' });
        });
    });

    describe('Configuracao de Variaveis', () => {
        it('abre modal com estrutura', async () => {
            await page.click('[data-action="open-var-config"]');
            await page.waitForSelector('#varConfigModal');
            expect(await page.textContent('#varConfigModal h2')).toContain('Variaveis');
        });

        it('adiciona obrigatoria e opcional', async () => {
            await page.fill('#obrigNome', 'cliente');
            await page.fill('#obrigValor', 'ACME');
            await page.click('#varConfigModal .btn-add-obrig');
            await page.waitForSelector('#obrigTable .btn-remove-obrig');

            await page.fill('#opcNome', 'cor');
            await page.fill('#opcValor', 'azul');
            await page.click('#varConfigModal .btn-add-opc');
            await page.waitForSelector('#opcionalTable .btn-remove-opc');

            const rowCount = await page.locator('#obrigTable tbody tr').count();
            expect(rowCount).toBe(1);
        });

        it('exporta JSON com sucesso', async () => {
            await page.click('#varConfigModal .btn-export-json');
            await waitToast('JSON exportado');
        });

        it('remove linha da tabela', async () => {
            await page.click('#obrigTable .btn-remove-obrig');
            await page.waitForSelector('#obrigTable .empty-state');
        });

        it('salva e fecha o modal', async () => {
            await page.click('#varConfigModal .btn-save');
            await page.waitForSelector('#varConfigModal', { state: 'detached' });
            await waitToast('Variaveis salvas');
        });
    });

    describe('Agendamentos', () => {
        it('abre tela de agendamentos vazia', async () => {
            await page.click('[data-action="open-schedules"]');
            await page.waitForSelector('#schedulesModal');
            expect(await page.textContent('#schedulesContainer')).toContain('Nenhum agendamento');
        });

        it('cria agendamento one-shot com preview e confirmacao', async () => {
            await page.click('#schedulesModal .btn-new');
            await page.waitForSelector('#newScheduleModal');

            await page.selectOption('#schFlow', 'rec_flow');
            await page.fill('#schCount', '3');
            await page.fill('#schInterval', '60');
            await page.fill('#schDate', '2030-01-01');

            await page.click('#newScheduleModal .btn-preview');
            await page.waitForSelector('#execOrderPreviewModal');
            const rows = await page.locator('#execOrderTable tbody tr').count();
            expect(rows).toBe(3);

            await page.click('#execOrderPreviewModal .btn-confirm');
            await page.waitForSelector('.schedule-card');
            await waitToast('Agendamento criado com 3 execucoes');
        });

        it('altera ativo/inativo do agendamento', async () => {
            const toggle = page.locator('.schedule-card .toggle');
            await page.click('.schedule-card .toggle');
            expect(await page.locator('.schedule-card .toggle input').isChecked()).toBe(false);
            await page.click('.schedule-card .toggle');
            expect(await page.locator('.schedule-card .toggle input').isChecked()).toBe(true);
        });

        it('abre detalhes e volta', async () => {
            await page.click('.schedule-card .btn-view');
            await page.waitForSelector('#scheduleDetailModal');
            expect(await page.textContent('#scheduleDetailModal')).toContain('pendentes');
            await page.click('#scheduleDetailModal .btn-back');
            await page.waitForSelector('#schedulesModal');
        });

        it('remove agendamento com confirmacao', async () => {
            await page.click('.schedule-card .btn-remove');
            await page.waitForSelector('#schedulesContainer .empty-state');
        });

        it('fecha tela de agendamentos', async () => {
            await page.click('#schedulesModal .btn-close');
            await page.waitForSelector('#schedulesModal', { state: 'detached' });
        });
    });

    describe('Arquivos (dialogos stub)', () => {
        const tmpFile = path.join(os.tmpdir(), `fluxo_e2e_open_${Date.now()}.json`);
        const saveFile = path.join(os.tmpdir(), `fluxo_e2e_save_${Date.now()}.json`);

        it('abre arquivo JSON e substitui fluxos', async () => {
            fs.writeFileSync(tmpFile, JSON.stringify({ from_file: [{ delay: 500 }] }));

            await app.evaluate(({ dialog }, p) => {
                dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [p] });
            }, tmpFile);

            await page.click('[data-action="open-file"]');
            await page.waitForSelector('.fluxo-card[data-name="from_file"]');
            expect(await page.textContent('#fileInfo')).toContain(path.basename(tmpFile));
        });

        it('salvar como escreve arquivo no disco', async () => {
            await app.evaluate(({ dialog }, p) => {
                dialog.showSaveDialog = async () => ({ canceled: false, filePath: p });
            }, saveFile);

            await page.click('[data-action="save-file-as"]');
            await waitToast('Arquivo salvo');

            await page.waitForFunction((p) => {
                const fsModule = require('fs');
                return fsModule.existsSync(p);
            }, saveFile, { timeout: 10000 });

            const content = JSON.parse(fs.readFileSync(saveFile, 'utf-8'));
            expect(Object.keys(content)).toContain('from_file');
        });

        it('salvar (sem dialogo) reescreve no caminho atual', async () => {
            const before = fs.statSync(saveFile).mtimeMs;
            await page.click('[data-action="save-file"]');
            await waitToast('Arquivo salvo');
            await page.waitForFunction(({ p, before }) => {
                const fsModule = require('fs');
                return fsModule.statSync(p).mtimeMs > before;
            }, { p: saveFile, before }, { timeout: 10000 });
        });

        it('cancelar dialogo nao altera nada', async () => {
            await app.evaluate(({ dialog }) => {
                dialog.showSaveDialog = async () => ({ canceled: true, filePath: null });
                dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] });
            });

            const before = fs.statSync(saveFile).mtimeMs;
            await page.click('[data-action="save-file-as"]');
            await page.waitForTimeout(800);
            expect(fs.statSync(saveFile).mtimeMs).toBe(before);
            expect(await page.isVisible('.fluxo-card[data-name="from_file"]')).toBe(true);
        });
    });

    describe('Undo/Redo', () => {
        it('desfaz criacao de fluxo com Ctrl+Z', async () => {
            await createFlow('undo_flow');
            await page.click('#fluxosGrid');
            await page.keyboard.press('Control+z');
            await page.waitForSelector('.fluxo-card[data-name="undo_flow"]', { state: 'detached' });
            await waitToast('Desfeito', 'info');
        });

        it('refaz com Ctrl+Shift+Z', async () => {
            await page.keyboard.press('Control+Shift+z');
            await page.waitForSelector('.fluxo-card[data-name="undo_flow"]');
            await waitToast('Refeito', 'info');
        });

        it('refaz com Ctrl+Y', async () => {
            await page.click('.fluxo-card[data-name="undo_flow"] .btn-remove');
            await page.waitForSelector('.fluxo-card[data-name="undo_flow"]', { state: 'detached' });
            await page.keyboard.press('Control+z');
            await page.waitForSelector('.fluxo-card[data-name="undo_flow"]');
            await page.keyboard.press('Control+y');
            await page.waitForSelector('.fluxo-card[data-name="undo_flow"]', { state: 'detached' });
        });
    });
});