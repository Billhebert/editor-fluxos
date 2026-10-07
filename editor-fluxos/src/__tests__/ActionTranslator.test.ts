import { describe, it, expect } from 'vitest';
import { resolveAction, KEY_MAP, ActionKind } from '../main/ActionTranslator';
import { Key } from '@nut-tree-fork/nut-js';

describe('KEY_MAP', () => {
    it('maps enter to Key.Enter', () => {
        expect(KEY_MAP['enter']).toBe(Key.Enter);
    });

    it('maps esc to Key.Escape', () => {
        expect(KEY_MAP['esc']).toBe(Key.Escape);
    });

    it('maps escape to Key.Escape', () => {
        expect(KEY_MAP['escape']).toBe(Key.Escape);
    });

    it('maps space to Key.Space', () => {
        expect(KEY_MAP['space']).toBe(Key.Space);
    });

    it('maps win to Key.LeftWin', () => {
        expect(KEY_MAP['win']).toBe(Key.LeftWin);
    });

    it('maps meta to Key.LeftWin', () => {
        expect(KEY_MAP['meta']).toBe(Key.LeftWin);
    });

    it('maps ctrl to Key.LeftControl', () => {
        expect(KEY_MAP['ctrl']).toBe(Key.LeftControl);
    });

    it('maps shift to Key.LeftShift', () => {
        expect(KEY_MAP['shift']).toBe(Key.LeftShift);
    });

    it('maps alt to Key.LeftAlt', () => {
        expect(KEY_MAP['alt']).toBe(Key.LeftAlt);
    });

    it('maps all F keys', () => {
        expect(KEY_MAP['f1']).toBe(Key.F1);
        expect(KEY_MAP['f5']).toBe(Key.F5);
        expect(KEY_MAP['f12']).toBe(Key.F12);
    });
});

describe('resolveAction', () => {
    it('resolves delay action', () => {
        const result = resolveAction({ delay: 1000 });
        expect(result.kind).toBe('delay');
        expect(result.delayMs).toBe(1000);
    });

    it('resolves mouse click action', () => {
        const result = resolveAction({ mouse: 'click', x: 100, y: 200 });
        expect(result.kind).toBe('mouse');
        expect(result.mouseType).toBe('click');
        expect(result.x).toBe(100);
        expect(result.y).toBe(200);
    });

    it('resolves mouse rightclick action', () => {
        const result = resolveAction({ mouse: 'rightclick', x: 50, y: 50 });
        expect(result.kind).toBe('mouse');
        expect(result.mouseType).toBe('rightclick');
    });

    it('resolves mouse doubleclick action', () => {
        const result = resolveAction({ mouse: 'doubleclick', x: 0, y: 0 });
        expect(result.kind).toBe('mouse');
        expect(result.mouseType).toBe('doubleclick');
    });

    it('resolves known key action', () => {
        const result = resolveAction('enter');
        expect(result.kind).toBe('key');
        expect(result.nutKey).toBe(Key.Enter);
    });

    it('resolves space key', () => {
        const result = resolveAction('space');
        expect(result.kind).toBe('key');
        expect(result.nutKey).toBe(Key.Space);
    });

    it('resolves unknown key as text', () => {
        const result = resolveAction('hello');
        expect(result.kind).toBe('text');
        expect(result.text).toBe('hello');
        expect(result.nutKey).toBeUndefined();
    });

    it('resolves single character as text', () => {
        const result = resolveAction('a');
        expect(result.kind).toBe('text');
        expect(result.text).toBe('a');
    });

    it('resolves ITEM_OBRIGATORIO as text', () => {
        const result = resolveAction('ITEM_OBRIGATORIO');
        expect(result.kind).toBe('text');
        expect(result.text).toBe('ITEM_OBRIGATORIO');
    });
});
