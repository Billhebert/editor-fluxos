// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
    SYSTEM_CONFIG_DEFAULTS,
    loadSystemConfig,
    saveSystemConfig,
    systemConfigGapMs,
} from '../ui/config/SystemConfig';

describe('SystemConfig', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('retorna defaults quando nada foi salvo', () => {
        expect(loadSystemConfig()).toEqual(SYSTEM_CONFIG_DEFAULTS);
    });

    it('persiste e recarrega os valores', () => {
        saveSystemConfig({ gapMinutes: 10, rescheduleAttempts: 50 });
        expect(loadSystemConfig()).toEqual({ gapMinutes: 10, rescheduleAttempts: 50 });
    });

    it('clampa valores fora da faixa', () => {
        localStorage.setItem('fluxos_system_config', JSON.stringify({ gapMinutes: -5, rescheduleAttempts: 99999 }));
        const cfg = loadSystemConfig();
        expect(cfg.gapMinutes).toBe(0);
        expect(cfg.rescheduleAttempts).toBe(1000);
    });

    it('cai em defaults quando o JSON e invalido', () => {
        localStorage.setItem('fluxos_system_config', 'lixo');
        expect(loadSystemConfig()).toEqual(SYSTEM_CONFIG_DEFAULTS);
    });

    it('systemConfigGapMs converte minutos em milissegundos', () => {
        expect(systemConfigGapMs({ gapMinutes: 5, rescheduleAttempts: 30 })).toBe(300000);
    });
});