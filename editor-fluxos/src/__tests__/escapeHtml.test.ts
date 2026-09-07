import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../ui/escapeHtml';

describe('escapeHtml', () => {
    it('escapes ampersand', () => {
        expect(escapeHtml('a&b')).toBe('a&amp;b');
    });

    it('escapes less-than', () => {
        expect(escapeHtml('a<b')).toBe('a&lt;b');
    });

    it('escapes greater-than', () => {
        expect(escapeHtml('a>b')).toBe('a&gt;b');
    });

    it('escapes double quote', () => {
        expect(escapeHtml('a"b')).toBe('a&quot;b');
    });

    it('escapes single quote', () => {
        expect(escapeHtml("a'b")).toBe('a&#39;b');
    });

    it('escapes multiple characters', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('returns empty string unchanged', () => {
        expect(escapeHtml('')).toBe('');
    });

    it('returns plain text unchanged', () => {
        expect(escapeHtml('hello world')).toBe('hello world');
    });
});
