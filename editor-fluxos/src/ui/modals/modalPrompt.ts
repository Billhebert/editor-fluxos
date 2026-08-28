import { escapeHtml } from '../escapeHtml';

export function modalPrompt(title: string, defaultValue?: string): Promise<string | null> {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <h3>${escapeHtml(title)}</h3>
                <input type="text" id="modalInput" value="${escapeHtml(defaultValue || '')}" />
                <div class="modal-actions">
                    <button class="btn btn-outline btn-sm" id="modalCancel">Cancelar</button>
                    <button class="btn btn-success btn-sm" id="modalOk">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const input = document.getElementById('modalInput') as HTMLInputElement;
        input.focus();
        input.select();
        const close = (value: string | null) => { overlay.remove(); resolve(value); };
        document.getElementById('modalOk')!.onclick = () => close(input.value);
        document.getElementById('modalCancel')!.onclick = () => close(null);
        input.onkeydown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') close(input.value);
            if (e.key === 'Escape') close(null);
        };
        overlay.onclick = (e) => { if (e.target === overlay) close(null); };
    });
}
