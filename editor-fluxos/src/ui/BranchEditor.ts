import { RawAction, IfImageAction } from '../domain/types';
import { getActionClass, getActionLabel } from './ActionLabeler';
import { ImageAssetManager } from '../infrastructure/ImageAssetManager';

export interface BranchEditorCallbacks {
    onChange(): void;
    imageAssets: ImageAssetManager;
}

export class BranchEditor {
    private _action: IfImageAction;
    private _callbacks: BranchEditorCallbacks;
    private _overlay: HTMLElement | null = null;

    constructor(action: IfImageAction, callbacks: BranchEditorCallbacks) {
        this._action = action;
        this._callbacks = callbacks;
    }

    open(): void {
        this._destroy();
        const overlay = document.createElement('div');
        overlay.className = 'modal-fullscreen';
        overlay.id = 'branchEditorModal';
        overlay.innerHTML = `
            <div class="modal-fullscreen-header">
                <h2>🔍 Editar condicao: ${this._action.assetId}</h2>
                <button class="btn btn-outline btn-sm btn-close">✕ Fechar</button>
            </div>
            <div style="max-width:900px; margin:0 auto; display:flex; flex-direction:column; gap:16px;">
                <div style="display:flex; gap:16px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:300px;">
                        <div class="section-title">Se imagem for encontrada</div>
                        <div class="action-list branch-list" id="branchThenList" style="min-height:120px;"></div>
                        <div class="recording-actions">
                            <button class="btn btn-outline btn-sm" data-branch="then" data-kind="delay">+ Delay</button>
                            <button class="btn btn-outline btn-sm" data-branch="then" data-kind="key">+ Tecla</button>
                            <button class="btn btn-outline btn-sm" data-branch="then" data-kind="text">+ Texto</button>
                            <button class="btn btn-outline btn-sm" data-branch="then" data-kind="mouse">+ Mouse</button>
                        </div>
                    </div>
                    <div style="flex:1; min-width:300px;">
                        <div class="section-title">Se imagem NAO for encontrada</div>
                        <div class="action-list branch-list" id="branchElseList" style="min-height:120px;"></div>
                        <div class="recording-actions">
                            <button class="btn btn-outline btn-sm" data-branch="else" data-kind="delay">+ Delay</button>
                            <button class="btn btn-outline btn-sm" data-branch="else" data-kind="key">+ Tecla</button>
                            <button class="btn btn-outline btn-sm" data-branch="else" data-kind="text">+ Texto</button>
                            <button class="btn btn-outline btn-sm" data-branch="else" data-kind="mouse">+ Mouse</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this._overlay = overlay;

        overlay.querySelector('.btn-close')!.addEventListener('click', () => this._destroy());
        overlay.querySelectorAll<HTMLButtonElement>('button[data-branch][data-kind]').forEach(btn => {
            btn.addEventListener('click', () => this._addSimpleAction(btn.dataset.branch as 'then' | 'else', btn.dataset.kind as string));
        });

        this._render();
    }

    private _addSimpleAction(branch: 'then' | 'else', kind: string): void {
        let action: RawAction;
        switch (kind) {
            case 'delay': action = { type: 'delay', delay: 500 }; break;
            case 'key': action = { type: 'key', key: 'enter' }; break;
            case 'text': action = { type: 'text', text: '' }; break;
            case 'mouse': action = { type: 'mouse', mouse: 'click', x: 0, y: 0 }; break;
            default: return;
        }
        this._action[branch].push(action);
        this._render();
        this._callbacks.onChange();
    }

    private _removeAction(branch: 'then' | 'else', index: number): void {
        this._action[branch].splice(index, 1);
        this._render();
        this._callbacks.onChange();
    }

    private _render(): void {
        this._renderBranch('then');
        this._renderBranch('else');
    }

    private _renderBranch(branch: 'then' | 'else'): void {
        const id = branch === 'then' ? 'branchThenList' : 'branchElseList';
        const list = this._overlay!.querySelector(`#${id}`) as HTMLElement;
        list.innerHTML = '';
        this._action[branch].forEach((action, i) => {
            const el = document.createElement('div');
            el.className = `action-item ${getActionClass(action)}`;
            el.textContent = getActionLabel(action);
            const btn = document.createElement('button');
            btn.className = 'action-remove';
            btn.textContent = '✕';
            btn.addEventListener('click', () => this._removeAction(branch, i));
            el.appendChild(btn);
            list.appendChild(el);
        });
    }

    private _destroy(): void {
        this._overlay?.remove();
        this._overlay = null;
    }
}
