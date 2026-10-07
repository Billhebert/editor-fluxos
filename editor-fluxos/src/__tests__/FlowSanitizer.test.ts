import { describe, it, expect } from 'vitest';
import { FlowSanitizer } from '../use-cases/FlowSanitizer';

describe('FlowSanitizer', () => {
    it('removes duplicate custom variables', () => {
        const fluxos = { flow1: ['var_custom', 'enter', 'var_custom', 'click'] };
        const result = FlowSanitizer.sanitizeFluxos(fluxos, ['var_custom']);
        expect(result.flow1).toEqual(['var_custom', 'enter', 'click']);
    });

    it('preserves non-variable actions', () => {
        const fluxos = { f: ['enter', 'click', 'mouse click 100 200'] };
        const result = FlowSanitizer.sanitizeFluxos(fluxos, ['myvar']);
        expect(result.f).toEqual(['enter', 'click', 'mouse click 100 200']);
    });

    it('handles empty custom variables list', () => {
        const fluxos = { f: ['a', 'b', 'c'] };
        const result = FlowSanitizer.sanitizeFluxos(fluxos, []);
        expect(result.f).toEqual(['a', 'b', 'c']);
    });

    it('handles empty fluxos', () => {
        const result = FlowSanitizer.sanitizeFluxos({}, ['var']);
        expect(result).toEqual({});
    });

    it('preserves multiple flows independently', () => {
        const fluxos = {
            f1: ['v1', 'v1', 'enter'],
            f2: ['v1', 'v2', 'v2']
        };
        const result = FlowSanitizer.sanitizeFluxos(fluxos, ['v1', 'v2']);
        expect(result.f1).toEqual(['v1', 'enter']);
        expect(result.f2).toEqual(['v1', 'v2']);
    });

    it('does not remove non-string actions', () => {
        const fluxos = { f: [42 as any, true as any, 'enter'] };
        const result = FlowSanitizer.sanitizeFluxos(fluxos, ['42']);
        expect(result.f).toEqual([42, true, 'enter']);
    });

    it('preserves structured image actions', () => {
        const fluxos = { f: [{ type: 'click-image', assetId: 'btn' }] };
        const result = FlowSanitizer.sanitizeFluxos(fluxos, []);
        expect(result.f).toEqual([{ type: 'click-image', assetId: 'btn' }]);
    });

    it('sanitizes nested if-image branches', () => {
        const fluxos = { f: [{ type: 'if-image', assetId: 'btn', then: ['v1', 'v1'], else: ['v2'] }] };
        const result = FlowSanitizer.sanitizeFluxos(fluxos, ['v1', 'v2']);
        expect(result.f).toEqual([{ type: 'if-image', assetId: 'btn', then: ['v1'], else: ['v2'] }]);
    });
});
