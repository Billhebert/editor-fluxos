import { VariablePool } from '../domain/VariablePool';
import { VariablePoolData, VariableConfig } from '../domain/types';
import { Toast } from './Toast';
import { VariableConfigView, VariableTableVM, VarType } from './variables/VariableConfigView';

export interface VariableConfigContext {
    getVarConfig(): VariablePool;
    setVarConfig(config: VariablePool): void;
    saveVarConfig(data: VariablePoolData): void;
    renderVariables(): void;
    saveToStorage(): void;
}

export class VariableConfigController {
    private static readonly PAGE_SIZE = 10;

    private _ctx: VariableConfigContext;
    private _view: VariableConfigView;
    private _obrigPage = 0;
    private _opcPage = 0;

    constructor(ctx: VariableConfigContext) {
        this._ctx = ctx;
        this._view = new VariableConfigView();
    }

    open(): void {
        this._obrigPage = 0;
        this._opcPage = 0;
        this._view.mount({
            onClose: () => this.close(),
            onAddObrig: () => this.handleAddObrig(),
            onAddOpc: () => this.handleAddOpc(),
            onSave: () => this.handleSave(),
            onClearObrig: () => this.handleClearObrig(),
            onClearOpc: () => this.handleClearOpc(),
            onClearAll: () => this.handleClearAll(),
            onRemoveRow: (type, absIdx) => this._removeRow(type, absIdx),
            onPage: (type, next) => { if (next) this.handleNextPage(type); else this.handlePrevPage(type); },
            onImportFile: (file) => this.handleImportFile({ target: { files: [file], value: '' } } as any),
            onExport: () => this.handleExport(),
        });
        this._renderTables();
    }

    close(): void {
        this._view.close();
    }

    handleAddObrig(): void {
        if (!this._view.overlay) return;
        const nome = (document.getElementById('obrigNome') as HTMLInputElement).value.trim();
        const valor = (document.getElementById('obrigValor') as HTMLInputElement).value.trim();
        if (!nome || !valor) return;
        try {
            this._ctx.getVarConfig().addObrigatorio(nome, valor);
            (document.getElementById('obrigNome') as HTMLInputElement).value = '';
            (document.getElementById('obrigValor') as HTMLInputElement).value = '';
            this._renderTables();
        } catch (err: any) { Toast.error(err.message); }
    }

    handleAddOpc(): void {
        if (!this._view.overlay) return;
        const nome = (document.getElementById('opcNome') as HTMLInputElement).value.trim();
        const valor = (document.getElementById('opcValor') as HTMLInputElement).value.trim();
        if (!nome || !valor) return;
        try {
            this._ctx.getVarConfig().addOpcional(nome, valor);
            (document.getElementById('opcNome') as HTMLInputElement).value = '';
            (document.getElementById('opcValor') as HTMLInputElement).value = '';
            this._renderTables();
        } catch (err: any) { Toast.error(err.message); }
    }

    handleSave(): void {
        if (!this._view.overlay) return;
        this._ctx.saveVarConfig(this._ctx.getVarConfig().toJSON());
        this._ctx.saveToStorage();
        this._ctx.renderVariables();
        this._view.close();
        Toast.success('Variaveis salvas!');
    }

    handleClearObrig(): void {
        if (!this._view.overlay) return;
        const pool = this._ctx.getVarConfig();
        if (pool.obrigatorias.length === 0) return;
        if (!confirm('Deletar todas as variaveis obrigatorias?')) return;
        pool.clearObrigatorios();
        this._obrigPage = 0;
        this._renderTables();
        Toast.info('Obrigatorias deletadas');
    }

    handleClearOpc(): void {
        if (!this._view.overlay) return;
        const pool = this._ctx.getVarConfig();
        if (pool.opcionais.length === 0) return;
        if (!confirm('Deletar todas as variaveis opcionais?')) return;
        pool.clearOpcionais();
        this._opcPage = 0;
        this._renderTables();
        Toast.info('Opcionais deletadas');
    }

    handleClearAll(): void {
        if (!this._view.overlay) return;
        const pool = this._ctx.getVarConfig();
        if (pool.obrigatorias.length === 0 && pool.opcionais.length === 0) return;
        if (!confirm('Deletar todas as variaveis (obrigatorias e opcionais)?')) return;
        pool.clearAll();
        this._obrigPage = 0;
        this._opcPage = 0;
        this._renderTables();
        Toast.info('Todas as variaveis deletadas');
    }

    handleNextPage(type: VarType): void {
        if (!this._view.overlay) return;
        const total = this._pageCount(type);
        const pageKey = type === 'obrig' ? '_obrigPage' : '_opcPage';
        if (this[pageKey] < total - 1) {
            this[pageKey]++;
            this._renderTables();
        }
    }

    handlePrevPage(type: VarType): void {
        if (!this._view.overlay) return;
        const pageKey = type === 'obrig' ? '_obrigPage' : '_opcPage';
        if (this[pageKey] > 0) {
            this[pageKey]--;
            this._renderTables();
        }
    }

    handleImportFile(e: Event): void {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;
        const importType = this._view.importType();
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
                this._renderTables();
                Toast.success(`${added} variaveis importadas como ${importType === 'obrig' ? 'obrigatorias' : 'opcionais'}!`);
            } catch (err: any) {
                Toast.error('Erro ao importar: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    handleExport(): void {
        if (!this._view.overlay) return;
        const exportType = this._view.exportType();
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

    private _removeRow(type: VarType, absIdx: number): void {
        if (!this._view.overlay) return;
        const pool = this._ctx.getVarConfig();
        if (type === 'obrig') {
            pool.removeObrigatorio(absIdx);
            this._obrigPage = Math.min(this._obrigPage, this._pageCount('obrig') - 1);
        } else {
            pool.removeOpcional(absIdx);
            this._opcPage = Math.min(this._opcPage, this._pageCount('opc') - 1);
        }
        this._renderTables();
    }

    private _renderTables(): void {
        this._view.setTable('obrig', this._buildTableVM('obrig'));
        this._view.setTable('opc', this._buildTableVM('opc'));
    }

    private _buildTableVM(type: VarType): VariableTableVM {
        const items = type === 'obrig' ? this._ctx.getVarConfig().obrigatorias : this._ctx.getVarConfig().opcionais;
        if (items.length === 0) {
            return {
                empty: true,
                emptyLabel: type === 'obrig' ? 'Nenhuma obrigatoria' : 'Nenhum opcional',
                rows: [],
                pageLabel: '',
                showPagination: false,
            };
        }

        const totalPages = this._pageCount(type);
        const pageKey = type === 'obrig' ? '_obrigPage' : '_opcPage';
        const page = Math.min(this[pageKey], totalPages - 1);
        this[pageKey] = page;
        const start = page * VariableConfigController.PAGE_SIZE;
        const pageItems = items.slice(start, start + VariableConfigController.PAGE_SIZE);

        return {
            empty: false,
            emptyLabel: '',
            rows: pageItems.map((item, i) => ({ nome: item.nome, valor: item.valor, absIdx: start + i })),
            pageLabel: `Página ${page + 1} de ${totalPages}`,
            showPagination: totalPages > 1,
        };
    }

    private _pageCount(type: VarType): number {
        const items = type === 'obrig' ? this._ctx.getVarConfig().obrigatorias : this._ctx.getVarConfig().opcionais;
        return Math.max(1, Math.ceil(items.length / VariableConfigController.PAGE_SIZE));
    }
}