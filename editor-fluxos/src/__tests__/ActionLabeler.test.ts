import { describe, it, expect } from 'vitest';
import { getActionClass, getActionLabel } from '../ui/ActionLabeler';

describe('getActionClass', () => {
    it('returns action-obrigatorio for ITEM_OBRIGATORIO', () => {
        expect(getActionClass('ITEM_OBRIGATORIO')).toBe('action-obrigatorio');
    });

    it('returns action-opcional for ITEM_OPCIONAL', () => {
        expect(getActionClass('ITEM_OPCIONAL')).toBe('action-opcional');
    });

    it('returns action-mouse for mouse click', () => {
        expect(getActionClass({ mouse: 'click', x: 100, y: 200 })).toBe('action-mouse');
    });

    it('returns action-mouse for mouse rightclick', () => {
        expect(getActionClass({ mouse: 'rightclick', x: 50, y: 50 })).toBe('action-mouse');
    });

    it('returns action-delay for delay', () => {
        expect(getActionClass({ delay: 1000 })).toBe('action-delay');
    });

    it('returns action-key for string key', () => {
        expect(getActionClass('enter')).toBe('action-key');
    });

    it('returns action-key for space', () => {
        expect(getActionClass('space')).toBe('action-key');
    });
});

describe('getActionLabel', () => {
    it('labels ITEM_OBRIGATORIO', () => {
        expect(getActionLabel('ITEM_OBRIGATORIO')).toBe('🎯 ITEM_OBRIGATORIO');
    });

    it('labels ITEM_OPCIONAL', () => {
        expect(getActionLabel('ITEM_OPCIONAL')).toBe('🎲 ITEM_OPCIONAL');
    });

    it('labels mouse click', () => {
        expect(getActionLabel({ mouse: 'click', x: 100, y: 200 })).toBe('🖱 click (100, 200)');
    });

    it('labels mouse rightclick', () => {
        expect(getActionLabel({ mouse: 'rightclick', x: 50, y: 50 })).toBe('🖱 rightclick (50, 50)');
    });

    it('labels delay', () => {
        expect(getActionLabel({ delay: 500 })).toBe('⏳ 500ms');
    });

    it('labels key string', () => {
        expect(getActionLabel('enter')).toBe('⌨ enter');
    });

    it('labels key with uppercase', () => {
        expect(getActionLabel('A')).toBe('⌨ A');
    });

    it('labels unknown object as JSON', () => {
        expect(getActionLabel({ unknown: 'thing' })).toBe('⚙ {"unknown":"thing"}');
    });
});
