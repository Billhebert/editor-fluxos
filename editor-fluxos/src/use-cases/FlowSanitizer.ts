import { RawAction, IfImageAction } from '../domain/types';

export class FlowSanitizer {
    static sanitizeFluxos(
        fluxos: Record<string, RawAction[]>,
        customVariables: string[]
    ): Record<string, RawAction[]> {
        const allVars = new Set([...customVariables]);
        const result: Record<string, RawAction[]> = {};
        for (const name of Object.keys(fluxos)) {
            const seen = new Set<string>();
            result[name] = fluxos[name]
                .map(a => FlowSanitizer._sanitizeAction(a, allVars, seen))
                .filter((a): a is RawAction => a !== null);
        }
        return result;
    }

    private static _sanitizeAction(action: RawAction, allVars: Set<string>, seen: Set<string>): RawAction | null {
        if (typeof action === 'string') {
            if (!allVars.has(action)) return action;
            if (seen.has(action)) return null;
            seen.add(action);
            return action;
        }

        if (action && typeof action === 'object' && 'type' in action && action.type === 'if-image') {
            const img = action as IfImageAction;
            return {
                ...img,
                then: img.then.map(a => FlowSanitizer._sanitizeAction(a, allVars, seen)).filter((a): a is RawAction => a !== null),
                else: img.else.map(a => FlowSanitizer._sanitizeAction(a, allVars, seen)).filter((a): a is RawAction => a !== null),
            } as IfImageAction;
        }

        return action;
    }
}
