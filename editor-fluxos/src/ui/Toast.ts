export class Toast {
    static show(msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons: Record<string, string> = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        iconSpan.textContent = icons[type] || 'ℹ️';

        const msgSpan = document.createElement('span');
        msgSpan.className = 'toast-msg';
        msgSpan.textContent = msg;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', () => toast.remove());

        toast.appendChild(iconSpan);
        toast.appendChild(msgSpan);
        toast.appendChild(closeBtn);
        container.appendChild(toast);
        const duration = type === 'warning' ? 10000 : 5000;
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, duration);
    }

    static success(msg: string): void { this.show(msg, 'success'); }
    static error(msg: string): void { this.show(msg, 'error'); }
    static info(msg: string): void { this.show(msg, 'info'); }
    static warning(msg: string): void { this.show(msg, 'warning'); }
}
