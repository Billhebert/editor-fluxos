import { VariablePool } from '../domain/VariablePool';
import { VariablePoolData } from '../domain/types';
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

    constructor(ctx: VariableConfigContext) {
        this._ctx = ctx;
    }

    open(): void {
        const overlay = document.createElement('div');
        overlay.className = 'modal-fullscreen';
        overlay.id = 'varConfigModal';

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
                <div class="modal-actions" style="margin-top:24px;">
                    <button class="btn btn-success btn-save">💾 Salvar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this._renderTables(overlay);

        overlay.querySelector('.btn-close')!.addEventListener('click', () => overlay.remove());
        overlay.querySelector('.btn-add-obrig')!.addEventListener('click', () => {
            const nome = (document.getElementById('obrigNome') as HTMLInputElement).value.trim();
            const valor = (document.getElementById('obrigValor') as HTMLInputElement).value.trim();
            if (!nome || !valor) return;
            try {
                this._ctx.getVarConfig().addObrigatorio(nome, valor);
                (document.getElementById('obrigNome') as HTMLInputElement).value = '';
                (document.getElementById('obrigValor') as HTMLInputElement).value = '';
                this._renderTables(overlay);
            } catch (err: any) { Toast.error(err.message); }
        });
        overlay.querySelector('.btn-add-opc')!.addEventListener('click', () => {
            const nome = (document.getElementById('opcNome') as HTMLInputElement).value.trim();
            const valor = (document.getElementById('opcValor') as HTMLInputElement).value.trim();
            if (!nome || !valor) return;
            try {
                this._ctx.getVarConfig().addOpcional(nome, valor);
                (document.getElementById('opcNome') as HTMLInputElement).value = '';
                (document.getElementById('opcValor') as HTMLInputElement).value = '';
                this._renderTables(overlay);
            } catch (err: any) { Toast.error(err.message); }
        });
        overlay.querySelector('.btn-save')!.addEventListener('click', () => {
            this._ctx.saveVarConfig(this._ctx.getVarConfig().toJSON());
            this._ctx.saveToStorage();
            this._ctx.renderVariables();
            overlay.remove();
            Toast.success('Variaveis salvas!');
        });
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
