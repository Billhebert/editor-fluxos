import { IFlowRepository } from '../adapters/IFlowRepository';
import { IVariableConfigRepository } from '../adapters/IVariableConfigRepository';
import { Flow } from '../domain/Flow';
import { VariablePoolData } from '../domain/types';

interface StorageData {
    fluxos?: Record<string, any[]>;
}

export class LocalStorageFlowRepo implements IFlowRepository, IVariableConfigRepository {
    private _key: string;
    private _varConfigKey: string;
    private _variablesKey: string;
    private _cache: StorageData = {};

    constructor(storageKey: string = 'fluxos_editor_data') {
        this._key = storageKey;
        this._varConfigKey = 'fluxos_var_config';
        this._variablesKey = 'fluxos_variables';
    }

    private get storage(): Storage {
        return window.localStorage;
    }

    private loadData(): StorageData {
        if (this._cache) return this._cache;
        try {
            const raw = this.storage.getItem(this._key);
            this._cache = raw ? JSON.parse(raw) : {};
        } catch {
            this._cache = {};
        }
        return this._cache;
    }

    private saveData(data: StorageData): void {
        this._cache = data;
        this.storage.setItem(this._key, JSON.stringify(data));
    }

    async findAll(): Promise<Flow[]> {
        const data = this.loadData();
        const flowsObj = data.fluxos || {};
        return Object.keys(flowsObj)
            .map(name => Flow.fromJSON({ name, actions: flowsObj[name] }))
            .filter((f): f is Flow => f !== null);
    }

    async findByName(name: string): Promise<Flow | null> {
        const data = this.loadData();
        const flowsObj = data.fluxos || {};
        if (flowsObj[name]) {
            return Flow.fromJSON({ name, actions: flowsObj[name] });
        }
        return null;
    }

    async save(flow: Flow): Promise<Flow> {
        const data = this.loadData();
        if (!data.fluxos) data.fluxos = {};
        data.fluxos[flow.name] = flow.actions;
        this.saveData(data);
        return flow;
    }

    async saveAll(flows: Flow[]): Promise<void> {
        const data = this.loadData();
        data.fluxos = {};
        flows.forEach(f => {
            if (data.fluxos) data.fluxos[f.name] = f.actions;
        });
        this.saveData(data);
    }

    async delete(name: string): Promise<void> {
        const data = this.loadData();
        if (data.fluxos) {
            delete data.fluxos[name];
            this.saveData(data);
        }
    }

    async rename(oldName: string, newName: string): Promise<void> {
        const data = this.loadData();
        if (!data.fluxos) return;
        if (data.fluxos[newName]) {
            throw new Error(`Flow "${newName}" already exists`);
        }
        data.fluxos[newName] = data.fluxos[oldName];
        delete data.fluxos[oldName];
        this.saveData(data);
    }

    loadVarConfig(): VariablePoolData {
        try {
            const raw = this.storage.getItem(this._varConfigKey);
            return raw ? JSON.parse(raw) : { obrigatorias: [], opcionais: [] };
        } catch {
            return { obrigatorias: [], opcionais: [] };
        }
    }

    saveVarConfig(config: VariablePoolData): void {
        this.storage.setItem(this._varConfigKey, JSON.stringify(config));
    }

    loadVariables(): string[] {
        try {
            const raw = this.storage.getItem(this._variablesKey);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    saveVariables(variables: string[]): void {
        this.storage.setItem(this._variablesKey, JSON.stringify(variables));
    }
}
