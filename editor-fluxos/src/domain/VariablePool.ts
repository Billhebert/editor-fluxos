import { VariableConfig, VariablePoolData } from './types';
import { ValidationError } from './errors';

export class VariablePool {
    private _obrigatorias: VariableConfig[];
    private _opcionais: VariableConfig[];

    constructor(data: VariablePoolData = { obrigatorias: [], opcionais: [] }) {
        this._obrigatorias = [...data.obrigatorias];
        this._opcionais = [...data.opcionais];
    }

    get obrigatorias(): ReadonlyArray<VariableConfig> { return this._obrigatorias; }
    get opcionais(): ReadonlyArray<VariableConfig> { return this._opcionais; }
    get hasObrigatorio(): boolean { return this._obrigatorias.length > 0; }
    get hasOpcional(): boolean { return this._opcionais.length > 0; }

    private validateVariable(nome: string, valor: string): void {
        if (!nome || !nome.trim()) {
            throw new ValidationError('Variable.nome', 'cannot be empty');
        }
        if (!valor || !valor.trim()) {
            throw new ValidationError('Variable.valor', 'cannot be empty');
        }
    }

    addObrigatorio(nome: string, valor: string): void {
        this.validateVariable(nome, valor);
        if (this._obrigatorias.some(o => o.valor === valor)) {
            throw new ValidationError('Variable.valor', `"${valor}" already exists in obrigatórios`);
        }
        this._obrigatorias.push({ nome: nome.trim(), valor: valor.trim() });
    }

    removeObrigatorio(index: number): void {
        if (index < 0 || index >= this._obrigatorias.length) {
            throw new ValidationError('Variable.index', `index ${index} out of range`);
        }
        this._obrigatorias.splice(index, 1);
    }

    updateObrigatorio(index: number, nome: string, valor: string): void {
        this.validateVariable(nome, valor);
        if (index < 0 || index >= this._obrigatorias.length) {
            throw new ValidationError('Variable.index', `index ${index} out of range`);
        }
        this._obrigatorias[index] = { nome: nome.trim(), valor: valor.trim() };
    }

    addOpcional(nome: string, valor: string): void {
        this.validateVariable(nome, valor);
        if (this._opcionais.some(o => o.valor === valor)) {
            throw new ValidationError('Variable.valor', `"${valor}" already exists in opcionais`);
        }
        this._opcionais.push({ nome: nome.trim(), valor: valor.trim() });
    }

    removeOpcional(index: number): void {
        if (index < 0 || index >= this._opcionais.length) {
            throw new ValidationError('Variable.index', `index ${index} out of range`);
        }
        this._opcionais.splice(index, 1);
    }

    updateOpcional(index: number, nome: string, valor: string): void {
        this.validateVariable(nome, valor);
        if (index < 0 || index >= this._opcionais.length) {
            throw new ValidationError('Variable.index', `index ${index} out of range`);
        }
        this._opcionais[index] = { nome: nome.trim(), valor: valor.trim() };
    }

    createOpcionalIterator(): { next(): string } {
        const shuffled = [...this._opcionais].sort(() => Math.random() - 0.5);
        let pool = [...shuffled];

        return {
            next(): string {
                if (pool.length === 0) {
                    pool = [...shuffled].sort(() => Math.random() - 0.5);
                }
                return pool.shift()!.valor;
            }
        };
    }

    findObrigatorioByValor(valor: string): VariableConfig | undefined {
        return this._obrigatorias.find(o => o.valor === valor);
    }

    findOpcionalByValor(valor: string): VariableConfig | undefined {
        return this._opcionais.find(o => o.valor === valor);
    }

    toJSON(): VariablePoolData {
        return {
            obrigatorias: [...this._obrigatorias],
            opcionais: [...this._opcionais]
        };
    }

    static fromJSON(data: any): VariablePool {
        return new VariablePool(data || { obrigatorias: [], opcionais: [] });
    }
}
