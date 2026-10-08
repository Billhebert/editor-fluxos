import { RawAction } from '../domain/types';
import { Toast } from './Toast';

export class ActionEditor {
    private _action: RawAction;
    private _onSave: (action: RawAction) => void;
    private _overlay: HTMLElement | null = null;

    constructor(action: RawAction, onSave: (action: RawAction) => void) {
        this._action = action;
        this._onSave = onSave;
    }

    open(): void {
        this._destroy();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'actionEditorModal';
        overlay.innerHTML = `
            <div class="modal-box" style="min-width:420px;">
                <h3>Editar Acao</h3>
                <div id="actionEditorBody"></div>
                <div class="modal-actions">
                    <button class="btn btn-outline btn-sm btn-cancel">Cancelar</button>
                    <button class="btn btn-success btn-sm btn-save">Salvar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this._overlay = overlay;

        const body = overlay.querySelector('#actionEditorBody') as HTMLElement;
        body.innerHTML = this._buildForm();

        overlay.querySelector('.btn-cancel')!.addEventListener('click', () => this._destroy());
        overlay.querySelector('.btn-save')!.addEventListener('click', () => this._save());

        const editBranchesBtn = overlay.querySelector('#editBranches') as HTMLButtonElement | null;
        if (editBranchesBtn) {
            editBranchesBtn.addEventListener('click', () => {
                import('./BranchEditor').then(({ BranchEditor }) => {
                    new BranchEditor(this._action as any, {
                        onChange: () => { /* mutacao in-place sera salva ao clicar Salvar */ },
                        onSave: () => { /* mutacao in-place */ }
                    }).open();
                });
            });
        }
    }

    private _buildForm(): string {
        if (typeof this._action === 'string') {
            return `<p>Variavel ${this._action} nao e editavel.</p>`;
        }
        const a = this._action as any;
        switch (a.type) {
            case 'delay':
                return `<label style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Delay (ms)
                    <input type="number" id="editDelay" value="${a.delay}" style="width:100%; margin-top:6px;" /></label>`;
            case 'key':
                return `<label style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Tecla
                    <input type="text" id="editKey" value="${a.key}" style="width:100%; margin-top:6px;" /></label>`;
            case 'text':
                return `<label style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Texto
                    <input type="text" id="editText" value="${this._escape(a.text)}" style="width:100%; margin-top:6px;" /></label>`;
            case 'mouse':
                return `
                    <label style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">X <input type="number" id="editX" value="${a.x}" style="width:100%; margin-top:6px;" /></label>
                    <label style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Y <input type="number" id="editY" value="${a.y}" style="width:100%; margin-top:6px;" /></label>
                    <label style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Tipo
                        <select id="editMouse" style="width:100%; margin-top:6px;">
                            <option value="click" ${a.mouse === 'click' ? 'selected' : ''}>Click</option>
                            <option value="rightclick" ${a.mouse === 'rightclick' ? 'selected' : ''}>Click Direito</option>
                            <option value="doubleclick" ${a.mouse === 'doubleclick' ? 'selected' : ''}>Duplo Click</option>
                        </select>
                    </label>`;
            case 'hotkey':
                return `<label style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Atalhos (separados por +)
                    <input type="text" id="editHotkey" value="${a.keys.map(this._escape).join('+')}" style="width:100%; margin-top:6px;" /></label>`;
            case 'click-image':
            case 'if-image':
                return `<label style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Asset ID
                    <input type="text" id="editAssetId" value="${this._escape(a.assetId)}" style="width:100%; margin-top:6px;" /></label>
                <label style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Confianca
                    <input type="number" id="editConfidence" value="${a.confidence ?? 0.8}" min="0.1" max="1" step="0.05" style="width:100%; margin-top:6px;" /></label>
                <label style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Timeout (ms)
                    <input type="number" id="editTimeout" value="${a.timeout ?? 5000}" min="0" step="500" style="width:100%; margin-top:6px;" /></label>
                <button class="btn btn-primary btn-sm" id="editBranches" style="margin-top:8px;">🔀 Editar Ramos</button>`;
            default:
                return `<p>Tipo nao suportado para edicao.</p>`;
        }
    }

    private _save(): void {
        if (typeof this._action === 'string') {
            this._destroy();
            return;
        }
        const a = this._action as any;
        let updated: RawAction = this._action;
        switch (a.type) {
            case 'delay':
                updated = { type: 'delay', delay: parseInt((document.getElementById('editDelay') as HTMLInputElement).value) || 0 };
                break;
            case 'key':
                updated = { type: 'key', key: (document.getElementById('editKey') as HTMLInputElement).value };
                break;
            case 'text':
                updated = { type: 'text', text: (document.getElementById('editText') as HTMLInputElement).value };
                break;
            case 'mouse':
                updated = {
                    type: 'mouse',
                    mouse: (document.getElementById('editMouse') as HTMLSelectElement).value,
                    x: parseInt((document.getElementById('editX') as HTMLInputElement).value) || 0,
                    y: parseInt((document.getElementById('editY') as HTMLInputElement).value) || 0,
                };
                break;
            case 'hotkey':
                updated = { type: 'hotkey', keys: (document.getElementById('editHotkey') as HTMLInputElement).value.split('+').map(s => s.trim()).filter(Boolean) };
                break;
            case 'click-image':
                updated = {
                    type: 'click-image',
                    assetId: (document.getElementById('editAssetId') as HTMLInputElement).value.trim(),
                    confidence: parseFloat((document.getElementById('editConfidence') as HTMLInputElement).value),
                    timeout: parseInt((document.getElementById('editTimeout') as HTMLInputElement).value),
                };
                break;
            case 'if-image':
                updated = {
                    ...a,
                    assetId: (document.getElementById('editAssetId') as HTMLInputElement).value.trim(),
                    confidence: parseFloat((document.getElementById('editConfidence') as HTMLInputElement).value),
                    timeout: parseInt((document.getElementById('editTimeout') as HTMLInputElement).value),
                };
                break;
        }
        this._onSave(updated);
        this._destroy();
        Toast.success('Acao atualizada');
    }

    private _escape(value: string): string {
        if (value == null) return '';
        return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    private _destroy(): void {
        this._overlay?.remove();
        this._overlay = null;
    }
}
