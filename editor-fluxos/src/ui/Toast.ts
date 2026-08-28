export class Toast {
    static show(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons: Record<string, string> = { success: '✅', error: '❌', info: 'ℹ️' };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-msg">${msg}</span>
            <button class="toast-close">✕</button>
        `;
        toast.querySelector('.toast-close')?.addEventListener('click', () => toast.remove());
        container.appendChild(toast);
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
    }

    static success(msg: string): void { this.show(msg, 'success'); }
    static error(msg: string): void { this.show(msg, 'error'); }
    static info(msg: string): void { this.show(msg, 'info'); }
}
