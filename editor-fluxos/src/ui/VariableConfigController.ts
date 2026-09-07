import { VariablePool } from '../domain/VariablePool';
import { VariablePoolData, VariableConfig } from '../domain/types';
import { Toast } from './Toast';
import { escapeHtml } from './escapeHtml';

export interface VariableConfigContext {
    getVarConfig(): VariablePool;
    setVarConfig(config: VariablePool): void;
    saveVarConfig(data: VariablePoolData): void;
    renderVariables(): void;
    saveToStorage(): void;
}

export class VariableConfigController {
    private _ctx: VariableConfigContext;
    private _overlay: HTMLElement | null = null;

    constructor(ctx: VariableConfigContext) {
        this._ctx = ctx;
    }

    open(): void {
        const overlay = document.createElement('div');
        overlay.className = 'modal-fullscreen';
        overlay.id = 'varConfigModal';
        this._overlay = overlay;

        overlay.innerHTML = `
            <div class="modal-fullscreen-header">
                <h2>⚙ Configuracao de Variaveis</h2>
                <button class="btn btn-outline btn-sm btn-close">✕ Fechar</button>
            </div>
            <div style="max-width:900px; margin:0 auto;">
                <div class="section-title">Obrigatorias</div>
                <div id="obrigTable"></div>
                <div class="config-row" style="margin-top:8px;">
                    <input type="text" id="obrigNome" placeholder="Nome" style="width:150px;" />
                    <input type="text" id="obrigValor" placeholder="Valor" style="width:200px;" />
                    <button class="btn btn-primary btn-sm btn-add-obrig">+ Adicionar</button>
                </div>
                <div class="section-title" style="margin-top:24px;">Opcionais (pool aleatorio)</div>
                <div id="opcionalTable"></div>
                <div class="config-row" style="margin-top:8px;">
                    <input type="text" id="opcNome" placeholder="Nome" style="width:150px;" />
                    <input type="text" id="opcValor" placeholder="Valor" style="width:200px;" />
                    <button class="btn btn-primary btn-sm btn-add-opc">+ Adicionar</button>
                </div>
                <div class="modal-actions" style="margin-top:24px; display:flex; gap:8px; align-items:center;">
                    <input type="file" id="importJsonFile" accept=".json" style="position:absolute; opacity:0; pointer-events:none;" />
                    <select id="importType" style="padding:6px 10px; border-radius:4px; border:1px solid #555; background:#1a1a2e; color:#e0e0e0;">
                        <option value="obrig">Obrigatoria</option>
                        <option value="opc">Opcional</option>
                    </select>
                    <button class="btn btn-outline btn-import-json">📁 Importar JSON</button>
                    <select id="exportType" style="padding:6px 10px; border-radius:4px; border:1px solid #555; background:#1a1a2e; color:#e0e0e0;">
                        <option value="all">Todas</option>
                        <option value="obrig">Obrigatorias</option>
                        <option value="opc">Opcionais</option>
                    </select>
                    <button class="btn btn-outline btn-export-json">💾 Exportar JSON</button>
                    <button class="btn btn-success btn-save">💾 Salvar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this._renderTables(overlay);

        overlay.querySelector('.btn-close')!.addEventListener('click', () => this.close());
        overlay.querySelector('.btn-add-obrig')!.addEventListener('click', () => this.handleAddObrig());
        overlay.querySelector('.btn-add-opc')!.addEventListener('click', () => this.handleAddOpc());
        overlay.querySelector('.btn-save')!.addEventListener('click', () => this.handleSave());
        overlay.querySelector('.btn-import-json')!.addEventListener('click', () => {
            (overlay.querySelector('#importJsonFile') as HTMLInputElement).click();
        });
        overlay.querySelector('#importJsonFile')!.addEventListener('change', (e) => this.handleImportFile(e));
        overlay.querySelector('.btn-export-json')!.addEventListener('click', () => this.handleExport());
    }

    close(): void {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }

    handleAddObrig(): void {
        const overlay = this._overlay;
        if (!overlay) return;
        const nome = (document.getElementById('obrigNome') as HTMLInputElement).value.trim();
        const valor = (document.getElementById('obrigValor') as HTMLInputElement).value.trim();
        if (!nome || !valor) return;
        try {
            this._ctx.getVarConfig().addObrigatorio(nome, valor);
            (document.getElementById('obrigNome') as HTMLInputElement).value = '';
            (document.getElementById('obrigValor') as HTMLInputElement).value = '';
            this._renderTables(overlay);
        } catch (err: any) { Toast.error(err.message); }
    }

    handleAddOpc(): void {
        const overlay = this._overlay;
        if (!overlay) return;
        const nome = (document.getElementById('opcNome') as HTMLInputElement).value.trim();
        const valor = (document.getElementById('opcValor') as HTMLInputElement).value.trim();
        if (!nome || !valor) return;
        try {
            this._ctx.getVarConfig().addOpcional(nome, valor);
            (document.getElementById('opcNome') as HTMLInputElement).value = '';
            (document.getElementById('opcValor') as HTMLInputElement).value = '';
            this._renderTables(overlay);
        } catch (err: any) { Toast.error(err.message); }
    }

    handleSave(): void {
        const overlay = this._overlay;
        if (!overlay) return;
        this._ctx.saveVarConfig(this._ctx.getVarConfig().toJSON());
        this._ctx.saveToStorage();
        this._ctx.renderVariables();
        overlay.remove();
        this._overlay = null;
        Toast.success('Variaveis salvas!');
    }

    handleImportFile(e: Event): void {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;
        const importType = (this._overlay?.querySelector('#importType') as HTMLSelectElement).value;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result as string);
                const pool = this._ctx.getVarConfig();
                let added = 0;
                const source: VariableConfig[] = data[importType === 'obrig' ? 'obrigatorias' : 'opcionais'] || [];
                source.forEach((item: VariableConfig) => {
                    if (item.nome && item.valor) {
                        try {
                            if (importType === 'obrig') pool.addObrigatorio(item.nome, item.valor);
                            else pool.addOpcional(item.nome, item.valor);
                            added++;
                        } catch {}
                    }
                });
                this._ctx.setVarConfig(pool);
                if (this._overlay) this._renderTables(this._overlay);
                Toast.success(`${added} variaveis importadas como ${importType === 'obrig' ? 'obrigatorias' : 'opcionais'}!`);
            } catch (err: any) {
                Toast.error('Erro ao importar: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    handleExport(): void {
        const exportType = (this._overlay?.querySelector('#exportType') as HTMLSelectElement).value;
        const all = this._ctx.getVarConfig().toJSON();
        const data = exportType === 'all' ? all : { obrigatorias: exportType === 'obrig' ? all.obrigatorias : [], opcionais: exportType === 'opc' ? all.opcionais : [] };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'variaveis.json';
        a.click();
        URL.revokeObjectURL(url);
        Toast.success('JSON exportado!');
    }

    private _renderTables(overlay: HTMLElement): void {
        const varConfig = this._ctx.getVarConfig();

        this._renderTable(overlay, '#obrigTable', varConfig.obrigatorias, 'obrig', (idx) => {
            varConfig.removeObrigatorio(idx);
            this._renderTables(overlay);
        });
        this._renderTable(overlay, '#opcionalTable', varConfig.opcionais, 'opc', (idx) => {
            varConfig.removeOpcional(idx);
            this._renderTables(overlay);
        });
    }

    private _renderTable(
        overlay: HTMLElement,
        selector: string,
        items: ReadonlyArray<{ nome: string; valor: string }>,
        type: 'obrig' | 'opc',
        onRemove: (idx: number) => void
    ): void {
        const container = overlay.querySelector(selector) as HTMLElement;
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `<div class="empty-state">${type === 'obrig' ? 'Nenhuma obrigatoria' : 'Nenhum opcional'}</div>`;
            return;
        }

        let html = '<table class="data-table"><thead><tr><th>Nome</th><th>Valor</th><th></th></tr></thead><tbody>';
        items.forEach((item, i) => {
            html += `<tr>
                <td>${escapeHtml(item.nome)}</td>
                <td>${escapeHtml(item.valor)}</td>
                <td><button class="btn btn-danger btn-sm btn-remove-${type}" data-idx="${i}">✕</button></td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        container.querySelectorAll(`.btn-remove-${type}`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt((e.target as HTMLElement).dataset.idx!);
                onRemove(idx);
            });
        });
    }
}
