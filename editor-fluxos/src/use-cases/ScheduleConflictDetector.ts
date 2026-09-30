import { Schedule } from '../domain/Schedule';
import { InstanceStatus, ReservedBlock } from '../domain/types';

// Responsabilidade unica: detectar conflitos de reserva de horario.
// A geracao/realocacao de timestamps vive em ScheduleGenerationResolver.
export class ScheduleConflictDetector {
    static reservedDurationMs(intervaloMinimo: number): number {
        return Math.max(1, intervaloMinimo) * 1000;
    }

    // gapMs: folga global exigida entre ordens de agendamentos DIFERENTES.
    // Expande cada bloco em gapMs para os dois lados, transformando o critério
    // "sobreposicao" no criterio "distancia entre ordens >= gapMs".
    static collectReservedBlocks(schedules: Schedule[], gapMs: number = 0): ReservedBlock[] {
        const blocks: ReservedBlock[] = [];
        for (const s of schedules) {
            if (!s.active) continue;
            const durMs = this.reservedDurationMs(s.intervaloMinimo);
            for (const inst of s.executionOrder) {
                if (!this.isReservedStatus(inst.status)) continue;
                blocks.push({
                    start: inst.gatilhoTime,
                    end: inst.gatilhoTime + durMs + gapMs,
                    scheduleId: s.id,
                    instanceId: inst.id,
                });
            }
        }
        return blocks;
    }

    static isReservedStatus(status: InstanceStatus): boolean {
        return status === 'pending' || status === 'running';
    }

    static mergeReservedBlocks(blocks: ReservedBlock[]): ReservedBlock[] {
        if (blocks.length === 0) return [];
        const sorted = [...blocks].sort((a, b) => a.start - b.start);
        const toMerged = (b: ReservedBlock): ReservedBlock => ({
            start: b.start,
            end: b.end,
            scheduleId: b.scheduleId,
            instanceId: b.instanceId,
            scheduleIds: b.scheduleId ? [b.scheduleId] : undefined,
        });
        const merged: ReservedBlock[] = [toMerged(sorted[0])];
        for (let i = 1; i < sorted.length; i++) {
            const last = merged[merged.length - 1];
            if (sorted[i].start <= last.end) {
                if (sorted[i].end > last.end) {
                    last.end = sorted[i].end;
                    last.scheduleId = sorted[i].scheduleId;
                    last.instanceId = sorted[i].instanceId;
                }
                const sid = sorted[i].scheduleId;
                if (sid) {
                    last.scheduleIds = last.scheduleIds || [];
                    if (!last.scheduleIds.includes(sid)) last.scheduleIds.push(sid);
                }
            } else {
                merged.push(toMerged(sorted[i]));
            }
        }
        return merged;
    }

    // others: demais agendamentos. Blocos do proprio agendamento (pelo id) nunca contam.
    static conflicts(schedule: Schedule, others: Schedule[], gapMs: number = 0): Map<number, ReservedBlock[]> {
        const blocks = this.mergeReservedBlocks(
            this.collectReservedBlocks(others, gapMs).filter(b => b.scheduleId !== schedule.id)
        );
        const durMs = this.reservedDurationMs(schedule.intervaloMinimo);
        const result = new Map<number, ReservedBlock[]>();
        for (const inst of schedule.executionOrder) {
            if (!this.isReservedStatus(inst.status)) continue;
            const start = inst.gatilhoTime;
            const end = start + durMs + gapMs;
            const overlapping = blocks.filter(b => start < b.end && b.start < end);
            if (overlapping.length > 0) result.set(inst.id, overlapping);
        }
        return result;
    }

    static conflictCount(schedule: Schedule, others: Schedule[], gapMs: number = 0): number {
        return this.conflicts(schedule, others, gapMs).size;
    }
}