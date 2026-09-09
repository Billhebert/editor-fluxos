import { VariablePool, RawAction, ScheduleMode } from '../../domain';
import { WEEK_DAYS } from '../../domain/constants';
import { ExecutionInstance } from '../../domain/ExecutionInstance';
import { escapeHtml } from '../escapeHtml';

export interface NewScheduleResult {
    flowName: string;
    order: ExecutionInstance[];
    mode: ScheduleMode;
    date: string;
    timeStart: string;
    timeEnd: string;
    days: number[];
    obrigValor: string;
    count: number;
    interval: number;
    dataInicio: string | null;
    dataFim: string | null;
}

export interface NewScheduleCallbacks {
    onClose(): void;
    onGenerate(result: NewScheduleResult): void;
    generateOrder(template: RawAction[], obrigValor: string, count: number, date: string, timeStart: string, timeEnd: string, interval: number, dataInicio?: string | null, dataFim?: string | null, days?: number[]): ExecutionInstance[];
}

export class NewScheduleView {
    show(fluxos: Record<string, RawAction[]>, varConfig: VariablePool, callbacks: NewScheduleCallbacks): void {
        const flowNames = Object.keys(fluxos);
        if (flowNames.length === 0) { alert('Crie pelo menos um fluxo primeiro!'); return; }

        const obrigatorias = varConfig.obrigatorias;
        const overlay = document.createElement('div');
        overlay.className = 'modal-fullscreen';
        overlay.id = 'newScheduleModal';

        const flowOptions = flowNames.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
        const obrigOptions = obrigatorias.map(o => `<option value="${escapeHtml(o.valor)}">${escapeHtml(o.nome)} = ${escapeHtml(o.valor)}</option>`).join('');

        overlay.innerHTML = `
            <div class="modal-fullscreen-header">
                <h2>+ Novo Agendamento</h2>
                <button class="btn btn-outline btn-sm btn-close">✕ Voltar</button>
            </div>
            <div style="max-width:600px; margin:0 auto;">
                <div class="section-title">Fluxo</div>
                <select id="schFlow" style="width:100%; background:#0f0f0f; border:1px solid #444; border-radius:4px; color:#fff; padding:8px; font-size:14px;">${flowOptions}</select>

                <div class="section-title">Item Obrigatorio</div>
                <select id="schObrigValue" style="width:100%; background:#0f0f0f; border:1px solid #444; border-radius:4px; color:#fff; padding:8px; font-size:14px;">
                    <option value="">-- Nenhum --</option>
                    ${obrigOptions}
                </select>

                <div class="section-title">Repeticoes</div>
                <div class="config-row">
                    <input type="number" id="schCount" value="5" min="1" max="500" style="width:80px;" />
                    <span style="color:#888; font-size:13px;">vezes</span>
                </div>

                <div class="section-title">Intervalo Minimo</div>
                <div class="config-row">
                    <input type="number" id="schInterval" value="60" min="10" style="width:100px;" />
                    <span style="color:#888; font-size:13px;">segundos</span>
                </div>

                <div class="section-title">Modo</div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-primary btn-sm btn-mode-one">Unico</button>
                    <button class="btn btn-outline btn-sm btn-mode-recur">Recorrente</button>
                </div>

                <div id="modeOneShotFields">
                    <div class="section-title">Data e Horario</div>
                    <div class="config-row">
                        <input type="date" id="schDate" />
                        <input type="time" id="schTimeStart" value="07:00" />
                        <input type="time" id="schTimeEnd" value="08:00" />
                    </div>
                </div>

                <div id="modeRecurringFields" style="display:none;">
                    <div class="section-title">Periodo de Atividade</div>
                    <div class="config-row">
                        <div>
                            <label style="color:#888; font-size:12px;">Data Inicio</label>
                            <input type="date" id="schDataInicio" style="width:150px;" />
                        </div>
                        <div>
                            <label style="color:#888; font-size:12px;">Data Fim</label>
                            <input type="date" id="schDataFim" style="width:150px;" />
                        </div>
                        <span style="color:#666; font-size:12px; align-self:flex-end;">(Opcional)</span>
                    </div>

                    <div class="section-title">Dias</div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        ${[1,2,3,4,5,6,0].map(d => `
                            <label style="display:flex; align-items:center; gap:4px; color:#aaa; font-size:13px;">
                                <input type="checkbox" class="sch-day" value="${d}" />
                                ${WEEK_DAYS[d]}
                            </label>
                        `).join('')}
                    </div>
                    <div class="config-row">
                        <input type="time" id="schTimeStartR" value="07:00" />
                        <input type="time" id="schTimeEndR" value="08:00" />
                    </div>
                </div>

                <div style="margin-top:24px;">
                    <button class="btn btn-success btn-preview">👁 Gerar Ordem</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        const dateInput = document.getElementById('schDate') as HTMLInputElement;
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        let currentMode: ScheduleMode = 'one-shot';

        overlay.querySelector('.btn-close')!.addEventListener('click', () => { overlay.remove(); callbacks.onClose(); });
        overlay.querySelector('.btn-mode-one')!.addEventListener('click', () => {
            currentMode = 'one-shot';
            overlay.querySelector('.btn-mode-one')!.className = 'btn btn-primary btn-sm btn-mode-one';
            overlay.querySelector('.btn-mode-recur')!.className = 'btn btn-outline btn-sm btn-mode-recur';
            document.getElementById('modeOneShotFields')!.style.display = 'block';
            document.getElementById('modeRecurringFields')!.style.display = 'none';
        });
        overlay.querySelector('.btn-mode-recur')!.addEventListener('click', () => {
            currentMode = 'recurring';
            overlay.querySelector('.btn-mode-one')!.className = 'btn btn-outline btn-sm btn-mode-one';
            overlay.querySelector('.btn-mode-recur')!.className = 'btn btn-primary btn-sm btn-mode-recur';
            document.getElementById('modeOneShotFields')!.style.display = 'none';
            document.getElementById('modeRecurringFields')!.style.display = 'block';
        });

        overlay.querySelector('.btn-preview')!.addEventListener('click', () => {
            const flowName = (document.getElementById('schFlow') as HTMLSelectElement).value;
            const template = fluxos[flowName];
            const count = parseInt((document.getElementById('schCount') as HTMLInputElement).value) || 1;
            const obrigValor = (document.getElementById('schObrigValue') as HTMLSelectElement).value;
            const interval = parseInt((document.getElementById('schInterval') as HTMLInputElement).value) || 60;

            if (!template || template.length === 0) { alert('Fluxo vazio!'); return; }

            let date: string, timeStart: string, timeEnd: string;
            let dataInicio: string | null = null;
            let dataFim: string | null = null;

            if (currentMode === 'one-shot') {
                date = (document.getElementById('schDate') as HTMLInputElement).value;
                timeStart = (document.getElementById('schTimeStart') as HTMLInputElement).value;
                timeEnd = (document.getElementById('schTimeEnd') as HTMLInputElement).value;
            } else {
                date = new Date().toISOString().split('T')[0];
                timeStart = (document.getElementById('schTimeStartR') as HTMLInputElement).value;
                timeEnd = (document.getElementById('schTimeEndR') as HTMLInputElement).value;
                dataInicio = (document.getElementById('schDataInicio') as HTMLInputElement).value || null;
                dataFim = (document.getElementById('schDataFim') as HTMLInputElement).value || null;
            }

            if (!date || !timeStart || !timeEnd) { alert('Preencha todos os campos!'); return; }
            if (timeStart >= timeEnd) { alert('Horario de inicio deve ser antes do fim!'); return; }

            if (dataInicio && dataFim && dataInicio > dataFim) {
                alert('Data de inicio deve ser antes da data fim!');
                return;
            }

            let days: number[] = [];
            if (currentMode === 'recurring') {
                days = [...overlay.querySelectorAll('.sch-day:checked')].map((c) => parseInt((c as HTMLInputElement).value));
            }

            const order = callbacks.generateOrder(template, obrigValor, count, date, timeStart, timeEnd, interval, dataInicio, dataFim, days);

            overlay.remove();
            callbacks.onGenerate({ flowName, order, mode: currentMode, date, timeStart, timeEnd, days, obrigValor, count, interval, dataInicio, dataFim });
        });
    }
}
