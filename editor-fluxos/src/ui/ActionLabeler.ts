import { RawAction, MouseAction, DelayAction } from '../domain/types';

export function getActionClass(action: RawAction): string {
    if (action === 'ITEM_OBRIGATORIO') return 'action-obrigatorio';
    if (action === 'ITEM_OPCIONAL') return 'action-opcional';
    if (typeof action === 'object' && action !== null) {
        if ('mouse' in action) return 'action-mouse';
        if ('delay' in action) return 'action-delay';
    }
    return 'action-key';
}

export function getActionLabel(action: RawAction): string {
    if (action === 'ITEM_OBRIGATORIO') return '🎯 ITEM_OBRIGATORIO';
    if (action === 'ITEM_OPCIONAL') return '🎲 ITEM_OPCIONAL';
    if (typeof action === 'object' && action !== null) {
        if ('mouse' in action) {
            const m = action as MouseAction;
            return `🖱 ${m.mouse} (${m.x}, ${m.y})`;
        }
        if ('delay' in action) {
            return `⏳ ${(action as DelayAction).delay}ms`;
        }
        return `⚙ ${JSON.stringify(action)}`;
    }
    return `⌨ ${action}`;
}
