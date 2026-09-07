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
            const raw = localStorage.getItem('fluxos_variables');
            if (raw) this._variables = JSON.parse(raw);
        } catch { this._variables = []; }

        try {
            const config = this._ctx.varConfigRepo.loadVarConfig();
            this._varConfig = VariablePool.fromJSON(config);
        } catch { this._varConfig = new VariablePool(); }
    }

    saveToStorage(): void {
        localStorage.setItem('fluxos_variables', JSON.stringify(this._variables));
        localStorage.setItem('fluxos_var_config', JSON.stringify(this._varConfig.toJSON()));
    }

    addVariable(): void {
        const input = document.getElementById('varInput') as HTMLInputElement;
        if (!input) return;
        const name = input.value.trim();
        if (!name) return;
        if (!this._variables.includes(name)) {
            this._variables.push(name);
            this.renderVariables();
            this.saveToStorage();
        }
        input.value = '';
    }

    renderVariables(): void {
        const container = document.getElementById('variablesContainer');
        if (!container) return;
        container.innerHTML = '';

        const addTag = (text: string, cssClass: string) => {
            const tag = document.createElement('span');
            tag.className = `variable-tag ${cssClass}`;
            tag.textContent = text;
            tag.addEventListener('click', () => this._ctx.recording.addToQueue(text));
            container.appendChild(tag);
        };

        addTag(BUILT_IN_VARS.obrigatorio, 'obrigatorio');
        addTag(BUILT_IN_VARS.opcional, 'opcional');
        this._variables.forEach(v => addTag(v, 'custom'));
    }
}
