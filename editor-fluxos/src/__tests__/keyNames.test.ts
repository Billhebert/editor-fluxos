import { describe, it, expect } from 'vitest';
import { normalizeKeyName } from '../ui/keyNames';

describe('normalizeKeyName', () => {
    it('normalizes the Windows key', () => {
        expect(normalizeKeyName('Meta')).toBe('win');
    });

    it('normalizes space', () => {
        expect(normalizeKeyName(' ')).toBe('space');
    });

    it('normalizes arrow keys', () => {
        expect(normalizeKeyName('ArrowUp')).toBe('up');
        expect(normalizeKeyName('ArrowDown')).toBe('down');
        expect(normalizeKeyName('ArrowLeft')).toBe('left');
        expect(normalizeKeyName('ArrowRight')).toBe('right');
    });

    it('normalizes modifiers', () => {
        expect(normalizeKeyName('Control')).toBe('ctrl');
        expect(normalizeKeyName('Alt')).toBe('alt');
        expect(normalizeKeyName('Shift')).toBe('shift');
    });

    it('normalizes special keys', () => {
        expect(normalizeKeyName('Enter')).toBe('enter');
        expect(normalizeKeyName('Esc')).toBe('esc');
        expect(normalizeKeyName('Tab')).toBe('tab');
        expect(normalizeKeyName('CapsLock')).toBe('capslock');
        expect(normalizeKeyName('F1')).toBe('f1');
    });

    it('lowercases letters and keeps the rest', () => {
        expect(normalizeKeyName('A')).toBe('a');
        expect(normalizeKeyName('1')).toBe('1');
        expect(normalizeKeyName('Enter')).toBe('enter');
    });
});