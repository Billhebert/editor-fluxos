// Configuracao global do sistema (persistida em localStorage).
// Regras invariantes: gap minimo entre ordens de schedules diferentes,
// quantidade de tentativas do reagendamento automatico, ritmo de execucao.
export interface SystemConfig {
    gapMinutes: number;
    rescheduleAttempts: number;
    minInteractionMs: number;
    minFlowGapMs: number;
}

const STORAGE_KEY = 'fluxos_system_config';

export const SYSTEM_CONFIG_DEFAULTS: SystemConfig = {
    gapMinutes: 5,
    rescheduleAttempts: 30,
    minInteractionMs: 500,
    minFlowGapMs: 5000,
};

export function loadSystemConfig(): SystemConfig {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...SYSTEM_CONFIG_DEFAULTS };
        const parsed = JSON.parse(raw);
        return {
            gapMinutes: numberInRange(parsed.gapMinutes, 0, 24 * 60, SYSTEM_CONFIG_DEFAULTS.gapMinutes),
            rescheduleAttempts: numberInRange(parsed.rescheduleAttempts, 1, 1000, SYSTEM_CONFIG_DEFAULTS.rescheduleAttempts),
            minInteractionMs: numberInRange(parsed.minInteractionMs, 0, 60 * 60 * 1000, SYSTEM_CONFIG_DEFAULTS.minInteractionMs),
            minFlowGapMs: numberInRange(parsed.minFlowGapMs, 0, 60 * 60 * 1000, SYSTEM_CONFIG_DEFAULTS.minFlowGapMs),
        };
    } catch {
        return { ...SYSTEM_CONFIG_DEFAULTS };
    }
}

export function saveSystemConfig(config: SystemConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function systemConfigGapMs(config: SystemConfig): number {
    return config.gapMinutes * 60 * 1000;
}

function numberInRange(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
    return Math.min(max, Math.max(min, Math.round(value)));
}
