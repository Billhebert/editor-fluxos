import { VariablePool } from '../domain';
import { BUILT_IN_VARS } from '../domain/constants';
import { IVariableConfigRepository } from '../adapters/IVariableConfigRepository';
import { RecordingController } from './RecordingController';

export interface VariableManagerContext {
    varConfigRepo: IVariableConfigRepository;
    recording: RecordingController;
}

export class VariableManager {
    private _ctx: VariableManagerContext;
    private _variables: string[] = [];
    private _varConfig: VariablePool = new VariablePool();

    constructor(ctx: VariableManagerContext) {
        this._ctx = ctx;
    }

    get variables(): string[] { return this._variables; }
    get varConfig(): VariablePool { return this._varConfig; }
    set varConfig(c: VariablePool) { this._varConfig = c; }

    loadFromStorage(): void {
        try {
            this._variables = this._ctx.varConfigRepo.loadVariables();
        } catch { this._variables = []; }

        try {
            const config = this._ctx.varConfigRepo.loadVarConfig();
            this._varConfig = VariablePool.fromJSON(config);
        } catch { this._varConfig = new VariablePool(); }
    }

    saveToStorage(): void {
        this._ctx.varConfigRepo.saveVariables(this._variables);
        this._ctx.varConfigRepo.saveVarConfig(this._varConfig.toJSON());
    }

    addVariable(name?: string): void {
        const input = name === undefined ? document.getElementById('varInput') as HTMLInputElement : null;
        const value = name !== undefined ? name : (input?.value || '').trim();
        if (!value) return;
        this._addVariableValue(value);
        if (input) input.value = '';
    }

    _addVariableValue(name: string): void {
        if (!this._variables.includes(name)) {
            this._variables.push(name);
            this.renderVariables();
            this.saveToStorage();
        }
    }

    renderVariables(): void {
        const container = document.getElementById('variablesContainer');
        if (!container) return;

        const tags: { text: string; cssClass: string }[] = [
            { text: BUILT_IN_VARS.obrigatorio, cssClass: 'obrigatorio' },
            { text: BUILT_IN_VARS.opcional, cssClass: 'opcional' },
            ...this._variables.map(v => ({ text: v, cssClass: 'custom' })),
        ];

        const existing = Array.from(container.children) as HTMLElement[];
        const seen = new Set<HTMLElement>();
        tags.forEach((tag, i) => {
            let el = existing[i];
            if (!el) {
                el = document.createElement('span');
                el.addEventListener('click', () => this._ctx.recording.addToQueue(el.textContent || ''));
                container.appendChild(el);
            }
            el.className = `variable-tag ${tag.cssClass}`;
            el.textContent = tag.text;
            seen.add(el);
        });

        for (const el of existing) {
            if (!seen.has(el)) el.remove();
        }
    }
}
