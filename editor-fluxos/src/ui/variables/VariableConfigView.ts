export interface VariableRowVM {
    nome: string;
    valor: string;
    absIdx: number;
}

export interface VariableTableVM {
    empty: boolean;
    emptyLabel: string;
    rows: VariableRowVM[];
    pageLabel: string;
    showPagination: boolean;
}

export type VarType = 'obrig' | 'opc';

export interface VariableConfigViewCallbacks {
    onClose(): void;
    onAddObrig(): void;
    onAddOpc(): void;
    onSave(): void;
    onClearObrig(): void;
    onClearOpc(): void;
    onClearAll(): void;
    onRemoveRow(type: VarType, absIdx: number): void;
    onPage(type: VarType, next: boolean): void;
    onImportFile(file: File): void;
    onExport(): void;
}

export class VariableConfigView {
    private _overlay: HTMLElement | null = null;
    private _callbacks: VariableConfigViewCallbacks | null = null;

    get overlay(): HTMLElement | null { return this._overlay; }

    mount(callbacks: VariableConfigViewCallbacks): HTMLElement {
        this._destroy();
        this._callbacks = callbacks;

        const overlay = document.createElement('div');
        overlay.className = 'modal-fullscreen';
        overlay.id = 'varConfigModal';
        overlay.innerHTML = `
            <div class="modal-fullscreen-header">
                <h2>⚙ Configuracao de Variaveis</h2>
                <button class="btn btn-outline btn-sm btn-close">✕ Fechar</button>
            </div>
            <div style="max-width:900px; margin:0 auto;">
                <div class="section-title-row">
                    <div class="section-title">Obrigatorias</div>
                    <button class="btn btn-danger btn-sm btn-clear-obrig">🗑 Deletar todas</button>
                </div>
                <div id="obrigTable"></div>
                <div class="config-row" style="margin-top:8px;">
                    <input type="text" id="obrigNome" placeholder="Nome" style="width:150px;" />
                    <input type="text" id="obrigValor" placeholder="Valor" style="width:200px;" />
                    <button class="btn btn-primary btn-sm btn-add-obrig">+ Adicionar</button>
                </div>
                <div class="section-title-row" style="margin-top:24px;">
                    <div class="section-title">Opcionais (pool aleatorio)</div>
                    <button class="btn btn-danger btn-sm btn-clear-opc">🗑 Deletar todas</button>
                </div>
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
                    <button class="btn btn-danger btn-clear-all">🗑 Deletar Todas</button>
                    <button class="btn btn-success btn-save">💾 Salvar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this._overlay = overlay;

        overlay.querySelector('.btn-close')!.addEventListener('click', () => callbacks.onClose());
        overlay.querySelector('.btn-add-obrig')!.addEventListener('click', () => callbacks.onAddObrig());
        overlay.querySelector('.btn-add-opc')!.addEventListener('click', () => callbacks.onAddOpc());
        overlay.querySelector('.btn-save')!.addEventListener('click', () => callbacks.onSave());
        overlay.querySelector('.btn-clear-obrig')!.addEventListener('click', () => callbacks.onClearObrig());
        overlay.querySelector('.btn-clear-opc')!.addEventListener('click', () => callbacks.onClearOpc());
        overlay.querySelector('.btn-clear-all')!.addEventListener('click', () => callbacks.onClearAll());
        overlay.querySelector('.btn-import-json')!.addEventListener('click', () => {
            (overlay.querySelector('#importJsonFile') as HTMLInputElement).click();
        });
        overlay.querySelector('#importJsonFile')!.addEventListener('change', (e) => {
            const input = e.target as HTMLInputElement;
            const file = input.files?.[0];
            input.value = '';
            if (file) callbacks.onImportFile(file);
        });
        overlay.querySelector('.btn-export-json')!.addEventListener('click', () => callbacks.onExport());

        return overlay;
    }

    setTable(type: VarType, vm: VariableTableVM): void {
        if (!this._overlay) return;
        const container = this._overlay.querySelector(type === 'obrig' ? '#obrigTable' : '#opcionalTable') as HTMLElement;
        if (!container) return;

        if (vm.empty) {
            const empty = container.querySelector('.empty-state') as HTMLElement | null;
            if (empty) {
                empty.textContent = vm.emptyLabel;
            } else {
                container.innerHTML = `<div class="empty-state">${vm.emptyLabel}</div>`;
            }
            return;
        }

        let table = container.querySelector('table.data-table') as HTMLTableElement | null;
        if (!table) {
            container.innerHTML = '<table class="data-table"><thead><tr><th>Nome</th><th>Valor</th><th></th></tr></thead><tbody></tbody></table>';
            table = container.querySelector('table.data-table')!;
        }
        const tbody = table.querySelector('tbody')!;

        const existingRows = new Map<string, HTMLElement>();
        for (const child of Array.from(tbody.children)) {
            const el = child as HTMLElement;
            if (el.dataset.idx !== undefined) existingRows.set(el.dataset.idx, el);
        }

        const seen = new Set<string>();
        for (const rowVM of vm.rows) {
            const key = String(rowVM.absIdx);
            seen.add(key);
            let tr = existingRows.get(key);
            if (!tr) {
                tr = document.createElement('tr');
                tr.innerHTML = '<td></td><td></td><td><button class="btn btn-danger btn-sm" type="button"></button></td>';
                tbody.appendChild(tr);
                const removeBtn = tr.querySelector('button')!;
                removeBtn.addEventListener('click', () => {
                    this._callbacks?.onRemoveRow(type, parseInt(removeBtn.dataset.idx || '0', 10));
                });
            }
            tr.dataset.idx = key;
            const cells = tr.children;
            (cells[0] as HTMLElement).textContent = rowVM.nome;
            (cells[1] as HTMLElement).textContent = rowVM.valor;
            const removeBtn = tr.querySelector('button') as HTMLButtonElement;
            removeBtn.className = `btn btn-danger btn-sm btn-remove-${type}`;
            removeBtn.dataset.idx = String(rowVM.absIdx);
            removeBtn.textContent = '✕';
        }

        for (const [key, el] of existingRows) {
            if (!seen.has(key)) el.remove();
        }

        let pager = container.querySelector('.pagination-controls') as HTMLElement | null;
        if (vm.showPagination) {
            if (!pager) {
                pager = document.createElement('div');
                pager.className = 'pagination-controls';
                pager.innerHTML = '<button class="btn btn-outline btn-sm btn-page-prev"></button><span class="pagination-info"></span><button class="btn btn-outline btn-sm btn-page-next"></button>';
                container.appendChild(pager);
                pager.querySelector('.btn-page-prev')!.addEventListener('click', () => this._callbacks?.onPage(type, false));
                pager.querySelector('.btn-page-next')!.addEventListener('click', () => this._callbacks?.onPage(type, true));
            }
            (pager.querySelector('.btn-page-prev') as HTMLElement).textContent = '◀ Anterior';
            (pager.querySelector('.btn-page-next') as HTMLElement).textContent = 'Próxima ▶';
            (pager.querySelector('.pagination-info') as HTMLElement).textContent = vm.pageLabel;
        } else if (pager) {
            pager.remove();
        }
    }

    importType(): string {
        return (this._overlay?.querySelector('#importType') as HTMLSelectElement)?.value || 'obrig';
    }

    exportType(): string {
        return (this._overlay?.querySelector('#exportType') as HTMLSelectElement)?.value || 'all';
    }

    close(): void {
        this._destroy();
    }

    private _destroy(): void {
        this._overlay?.remove();
        this._overlay = null;
    }
}