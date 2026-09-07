import { describe, it, expect } from 'vitest';
import { formatLocalDateTime, formatLocalDateTimeInput } from '../ui/schedules/datetime';

describe('formatLocalDateTime', () => {
    it('formats timestamp to DD/MM HH:MM', () => {
        // 2024-01-15 14:30:00 UTC
        const ts = new Date(2024, 0, 15, 14, 30, 0).getTime();
        expect(formatLocalDateTime(ts)).toBe('15/01 14:30');
    });

    it('pads single digits', () => {
        const ts = new Date(2024, 0, 5, 9, 5, 0).getTime();
        expect(formatLocalDateTime(ts)).toBe('05/01 09:05');
    });

    it('handles midnight', () => {
        const ts = new Date(2024, 11, 31, 0, 0, 0).getTime();
        expect(formatLocalDateTime(ts)).toBe('31/12 00:00');
    });
});

describe('formatLocalDateTimeInput', () => {
    it('formats to YYYY-MM-DDTHH:MM', () => {
        const ts = new Date(2024, 0, 15, 14, 30, 0).getTime();
        expect(formatLocalDateTimeInput(ts)).toBe('2024-01-15T14:30');
    });

    it('pads single digits in input format', () => {
        const ts = new Date(2024, 0, 5, 9, 5, 0).getTime();
        expect(formatLocalDateTimeInput(ts)).toBe('2024-01-05T09:05');
    });
});
