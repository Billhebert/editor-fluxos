import { escapeHtml } from '../escapeHtml';

export class UpdateBadgeController {
    handle(type: string, data: any): void {
        const badge = document.getElementById('updateBadge');
        if (!badge) return;

        switch (type) {
            case 'checking':
                badge.textContent = '🔄 Verificando...';
                badge.className = 'update-badge checking';
                badge.style.display = 'flex';
                break;
            case 'available':
                badge.textContent = `⬇ v${data} baixando...`;
                badge.className = 'update-badge downloading';
                badge.style.display = 'flex';
                break;
            case 'downloaded':
                badge.innerHTML = `✅ v${escapeHtml(String(data))} pronta! <button class="btn-update-install" data-action="install-update">Instalar</button>`;
                badge.className = 'update-badge downloaded';
                badge.style.display = 'flex';
                break;
            case 'not-available':
            case 'error':
                badge.style.display = 'none';
                break;
        }
    }
}
