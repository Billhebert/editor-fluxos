import { VariablePool } from '../domain/VariablePool';
import { RawAction } from '../domain/types';

export class VariableResolver {
    private _pool: VariablePool;

    constructor(variablePool: VariablePool) {
        this._pool = variablePool;
    }

    resolveTemplate(rawActions: RawAction[], obrigatorioValor: string | null = null): RawAction[] {
        const opcionalIterator = this._pool.createOpcionalIterator();
        const usedOpcionais = new Set<string>();

        return rawActions.map(raw => {
            if (raw === 'ITEM_OBRIGATORIO') {
                return obrigatorioValor || '[SEM ITEM]';
            }
            if (raw === 'ITEM_OPCIONAL') {
                let valor = opcionalIterator.next();
                let attempts = 0;
                while (usedOpcionais.has(valor) && attempts < (this._pool.opcionais.length || 1)) {
                    valor = opcionalIterator.next();
                    attempts++;
                }
                usedOpcionais.add(valor);
                return valor;
            }
            return raw;
        });
    }

    resolveForRuntime(rawActions: RawAction[]): RawAction[] {
        const obrigatorias = [...this._pool.obrigatorias];
        let obrigIndex = 0;
        const opcionalIterator = this._pool.createOpcionalIterator();
        const usedOpcionais = new Set<string>();

        return rawActions.map(raw => {
            if (raw === 'ITEM_OBRIGATORIO') {
                if (obrigatorias.length === 0) return '[SEM ITEM]';
                const val = obrigatorias[obrigIndex % obrigatorias.length].valor;
                obrigIndex++;
                return val;
            }
            if (raw === 'ITEM_OPCIONAL') {
                let valor = opcionalIterator.next();
                let attempts = 0;
                while (usedOpcionais.has(valor) && attempts < (this._pool.opcionais.length || 1)) {
                    valor = opcionalIterator.next();
                    attempts++;
                }
                usedOpcionais.add(valor);
                return valor;
            }
            return raw;
        });
    }

    static createEmpty(): VariableResolver {
        return new VariableResolver(new VariablePool());
    }
}
