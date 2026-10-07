export const BUILT_IN_VARS = {
    obrigatorio: 'ITEM_OBRIGATORIO',
    opcional: 'ITEM_OPCIONAL'
} as const;

export type BuiltInVar = typeof BUILT_IN_VARS[keyof typeof BUILT_IN_VARS];

export const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'] as const;

export const STATUS_COLORS: Record<string, string> = {
    completed: '#00b894',
    failed: '#e17055',
    running: '#74b9ff',
    pending: '#fdcb6e',
    missed: '#636e72',
    cancelled: '#b2bec3'
};

export const STATUS_LABELS: Record<string, string> = {
    completed: '✅ Concluido',
    failed: '❌ Falhou',
    running: '▶ Rodando',
    pending: '⏳ Pendente',
    missed: '⏭ Perdido',
    cancelled: '🚫 Cancelado'
};