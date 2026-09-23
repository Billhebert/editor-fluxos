import { describe, it, expect } from 'vitest';
import { formatLocalDateTime, formatLocalDateTimeInput, maskDatetimeEdit, parseLocalDateTimeEdit } from '../ui/schedules/datetime';

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

describe('maskDatetimeEdit', () => {
    it('formata digitos puros em DD/MM/AAAA HH:MM', () => {
        expect(maskDatetimeEdit('040820300930')).toBe('04/08/2030 09:30');
    });

    it('remove separadores e letras digitados, mantendo so os numeros', () => {
        expect(maskDatetimeEdit('04/08/2030 09:30')).toBe('04/08/2030 09:30');
        expect(maskDatetimeEdit('04a08b2030c09d30')).toBe('04/08/2030 09:30');
    });

    it('trunca em 14 digitos e monta parcialmente enquanto digita', () => {
        expect(maskDatetimeEdit('04/08/2030 09:30:59')).toBe('04/08/2030 09:30');
        expect(maskDatetimeEdit('2030')).toBe('20/30');
        expect(maskDatetimeEdit('')).toBe('');
    });
});

describe('parseLocalDateTimeEdit', () => {
    it('parseia formato dd/mm/aaaa hh:mm', () => {
        expect(parseLocalDateTimeEdit('04/08/2030 09:30')).toBe(new Date(2030, 7, 4, 9, 30).getTime());
    });

    it('rejeita data impossivel', () => {
        expect(Number.isNaN(parseLocalDateTimeEdit('31/02/2030 10:30'))).toBe(true);
    });
});
