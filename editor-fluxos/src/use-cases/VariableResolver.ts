import { VariablePool } from '../domain/VariablePool';
import { RawAction, IfImageAction } from '../domain/types';
import { deepCloneAction } from '../domain/Flow';

export class VariableResolver {
    private _pool: VariablePool;

    constructor(variablePool: VariablePool) {
        this._pool = variablePool;
    }

    resolveTemplate(rawActions: RawAction[], obrigatorioValor: string | null = null, sharedIterator?: { next(): string }): RawAction[] {
        const opcionalIterator = sharedIterator || this._pool.createOpcionalIterator();
        const usedOpcionais = new Set<string>();

        return this._resolveList(rawActions, obrigatorioValor, opcionalIterator, usedOpcionais);
    }

    resolveForRuntime(rawActions: RawAction[]): RawAction[] {
        const obrigatorias = [...this._pool.obrigatorias];
        let obrigIndex = 0;
        const opcionalIterator = this._pool.createOpcionalIterator();
        const usedOpcionais = new Set<string>();

        return this._resolveList(rawActions, null, opcionalIterator, usedOpcionais, () => {
            if (obrigatorias.length === 0) return '[SEM ITEM]';
            const result = obrigatorias[obrigIndex % obrigatorias.length].valor;
            obrigIndex++;
            return result;
        });
    }

    private _resolveList(
        rawActions: RawAction[],
        obrigatorioValor: string | null,
        opcionalIterator: { next(): string },
        usedOpcionais: Set<string>,
        obrigatorioResolver?: (_val: string | null) => string
    ): RawAction[] {
        return rawActions.map(raw => this._resolveOne(raw, obrigatorioValor, opcionalIterator, usedOpcionais, obrigatorioResolver));
    }

    private _resolveOne(
        raw: RawAction,
        obrigatorioValor: string | null,
        opcionalIterator: { next(): string },
        usedOpcionais: Set<string>,
        obrigatorioResolver?: (_val: string | null) => string
    ): RawAction {
        if (raw === 'ITEM_OBRIGATORIO') {
            if (obrigatorioResolver) return obrigatorioResolver(obrigatorioValor);
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

        if (typeof raw === 'object' && raw !== null && 'type' in raw && raw.type === 'if-image') {
            const img = raw as IfImageAction;
            const clone = deepCloneAction(img) as IfImageAction;
            clone.then = this._resolveList(img.then, obrigatorioValor, opcionalIterator, usedOpcionais, obrigatorioResolver);
            clone.else = this._resolveList(img.else, obrigatorioValor, opcionalIterator, usedOpcionais, obrigatorioResolver);
            return clone;
        }

        return deepCloneAction(raw);
    }

    static createEmpty(): VariableResolver {
        return new VariableResolver(new VariablePool());
    }
}
