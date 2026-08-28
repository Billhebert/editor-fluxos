const ALIASES: Record<string, string> = {
    meta: 'win',
    control: 'ctrl',
    arrowup: 'up',
    arrowdown: 'down',
    arrowleft: 'left',
    arrowright: 'right',
    esc: 'esc',
    escape: 'esc',
    capslock: 'capslock',
    spacebar: 'space',
};

export function normalizeKeyName(key: string): string {
    const lower = String(key).toLowerCase();
    if (lower === ' ') return 'space';
    if (ALIASES[lower]) return ALIASES[lower];
    return lower;
}