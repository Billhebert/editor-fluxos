import { RawAction, MouseAction, DelayAction, KeyAction, TextAction, HotkeyAction, ClickImageAction, IfImageAction } from '../domain/types';

export function getActionClass(action: RawAction): string {
    if (action === 'ITEM_OBRIGATORIO') return 'action-obrigatorio';
    if (action === 'ITEM_OPCIONAL') return 'action-opcional';
    if (typeof action === 'object' && action !== null) {
        const type = (action as any).type;
        if (type === 'if-image') return 'action-if-image';
        if (type === 'click-image') return 'action-click-image';
        if (type === 'hotkey') return 'action-hotkey';
        if (type === 'mouse' || 'mouse' in action) return 'action-mouse';
        if (type === 'delay' || 'delay' in action) return 'action-delay';
        if (type === 'text') return 'action-text';
        if (type === 'key') return 'action-key';
    }
    return 'action-key';
}

export function getActionLabel(action: RawAction): string {
    if (action === 'ITEM_OBRIGATORIO') return '🎯 ITEM_OBRIGATORIO';
    if (action === 'ITEM_OPCIONAL') return '🎲 ITEM_OPCIONAL';
    if (typeof action === 'object' && action !== null) {
        const type = (action as any).type;
        if (type === 'if-image') {
            const img = action as IfImageAction;
            return `🔍 Se imagem ${img.assetId} entao (${img.then.length}) senao (${img.else.length})`;
        }
        if (type === 'click-image') {
            const img = action as ClickImageAction;
            return `🖱 Clicar em ${img.assetId}`;
        }
        if (type === 'hotkey') {
            const h = action as HotkeyAction;
            return `⌨ ${h.keys.join('+')}`;
        }
        if (type === 'mouse' || 'mouse' in action) {
            const m = action as MouseAction;
            return `🖱 ${m.mouse} (${m.x}, ${m.y})`;
        }
        if (type === 'delay' || 'delay' in action) {
            return `⏳ ${(action as DelayAction).delay}ms`;
        }
        if (type === 'text') {
            return `✏ ${(action as TextAction).text}`;
        }
        if (type === 'key') {
            return `⌨ ${(action as KeyAction).key}`;
        }
        return `⚙ ${JSON.stringify(action)}`;
    }
    return `⌨ ${action}`;
}
