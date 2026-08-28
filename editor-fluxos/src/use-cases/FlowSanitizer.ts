import { RawAction } from '../domain/types';

export class FlowSanitizer {
    static sanitizeFluxos(
        fluxos: Record<string, RawAction[]>,
        customVariables: string[]
    ): Record<string, RawAction[]> {
        const allVars = new Set([...customVariables]);
        const result: Record<string, RawAction[]> = {};
        for (const name of Object.keys(fluxos)) {
            const seen = new Set<string>();
            result[name] = fluxos[name].filter(a => {
                if (typeof a !== 'string' || !allVars.has(a)) return true;
                if (seen.has(a)) return false;
                seen.add(a);
                return true;
            });
        }
        return result;
    }
}
