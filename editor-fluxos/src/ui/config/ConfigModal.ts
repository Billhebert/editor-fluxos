import { SystemConfig, loadSystemConfig, saveSystemConfig } from './SystemConfig';

// Modal de configuracoes globais do sistema (gap minimo entre ordens,
// tentativas de reagendamento e ritmo de execucao).
export class ConfigModal {
    static open(onSaved?: (config: SystemConfig) => void): void {
        const existing = document.getElementById('configModal');
        if (existing) existing.remove();

        const config = loadSystemConfig();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'configModal';
        overlay.innerHTML = `
            <div class="modal-box">
                <h3>⚙ Configuracoes</h3>
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px; color:#888;">Tempo minimo entre ordens de agendamentos diferentes (minutos)</label>
                    <input type="number" id="cfgGap" value="${config.gapMinutes}" min="0" step="1" />
                </div>
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px; color:#888;">Tentativas de reagendamento automatico</label>
                    <input type="number" id="cfgAttempts" value="${config.rescheduleAttempts}" min="1" step="1" />
                </div>
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px; color:#888;">Intervalo minimo entre acoes de teclado/mouse/texto (ms)</label>
                    <input type="number" id="cfgMinInteraction" value="${config.minInteractionMs}" min="0" step="50" />
                </div>
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px; color:#888;">Intervalo minimo entre execucoes de fluxos (ms)</label>
                    <input type="number" id="cfgMinFlowGap" value="${config.minFlowGapMs}" min="0" step="100" />
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline btn-sm btn-cancel">Cancelar</button>
                    <button class="btn btn-success btn-sm btn-save">Salvar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('.btn-cancel')!.addEventListener('click', close);
        overlay.querySelector('.btn-save')!.addEventListener('click', () => {
            const gap = parseInt((document.getElementById('cfgGap') as HTMLInputElement).value) || 0;
            const attempts = parseInt((document.getElementById('cfgAttempts') as HTMLInputElement).value) || 1;
            const minInteraction = parseInt((document.getElementById('cfgMinInteraction') as HTMLInputElement).value) || 0;
            const minFlowGap = parseInt((document.getElementById('cfgMinFlowGap') as HTMLInputElement).value) || 0;
            const next = loadSystemConfig();
            next.gapMinutes = Math.max(0, Math.min(24 * 60, gap));
            next.rescheduleAttempts = Math.max(1, Math.min(1000, attempts));
            next.minInteractionMs = Math.max(0, Math.min(60 * 60 * 1000, minInteraction));
            next.minFlowGapMs = Math.max(0, Math.min(60 * 60 * 1000, minFlowGap));
            saveSystemConfig(next);
            close();
            onSaved?.(next);
        });
    }
}
