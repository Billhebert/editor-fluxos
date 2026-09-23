import { Schedule } from '../domain/Schedule';
import { InstanceStatus } from '../domain/types';

export interface ReservedBlock {
    start: number;
    end: number;
    scheduleId?: string;
    instanceId?: number;
}

export interface AutoResolveResult {
    adjusted: number[];
    unsettled: number[];
}

export class ScheduleConflictChecker {
    static reservedDurationMs(intervaloMinimo: number): number {
        return Math.max(1, intervaloMinimo) * 1000;
    }

    static collectReservedBlocks(schedules: Schedule[]): ReservedBlock[] {
        const blocks: ReservedBlock[] = [];
        for (const s of schedules) {
            if (!s.active) continue;
            const durMs = this.reservedDurationMs(s.intervaloMinimo);
            for (const inst of s.executionOrder) {
                if (!this.isReservedStatus(inst.status)) continue;
                blocks.push({
                    start: inst.gatilhoTime,
                    end: inst.gatilhoTime + durMs,
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
        const merged: ReservedBlock[] = [{ start: sorted[0].start, end: sorted[0].end }];
        for (let i = 1; i < sorted.length; i++) {
            const last = merged[merged.length - 1];
            if (sorted[i].start <= last.end) {
                if (sorted[i].end > last.end) last.end = sorted[i].end;
            } else {
                merged.push({ start: sorted[i].start, end: sorted[i].end });
            }
        }
        return merged;
    }

    static conflicts(schedule: Schedule, others: Schedule[]): Map<number, ReservedBlock[]> {
        const blocks = this.mergeReservedBlocks(this.collectReservedBlocks(others));
        const durMs = this.reservedDurationMs(schedule.intervaloMinimo);
        const result = new Map<number, ReservedBlock[]>();
        for (const inst of schedule.executionOrder) {
            if (!this.isReservedStatus(inst.status)) continue;
            const start = inst.gatilhoTime;
            const end = start + durMs;
            const overlapping = blocks.filter(b => start < b.end && b.start < end);
            if (overlapping.length > 0) result.set(inst.id, overlapping);
        }
        return result;
    }

    static conflictCount(schedule: Schedule, others: Schedule[]): number {
        return this.conflicts(schedule, others).size;
    }

    static autoResolve(
        timestamps: number[],
        minIntervalMs: number,
        reservedBlocks: ReservedBlock[],
        windowStart: number,
        windowEnd: number
    ): AutoResolveResult {
        if (timestamps.length === 0) return { adjusted: [], unsettled: [] };

        const blocks = this.mergeReservedBlocks(reservedBlocks);
        const order = timestamps.map((_, idx) => idx).sort((a, b) => timestamps[a] - timestamps[b]);
        const adjusted: number[] = new Array(timestamps.length);
        const unsettled: number[] = [];
        let previous = Number.NEGATIVE_INFINITY;

        for (const idx of order) {
            let cand = Math.max(timestamps[idx], windowStart, previous);

            let blocker = this._overlapBlock(cand, minIntervalMs, blocks);
            while (blocker) {
                cand = blocker.end;
                blocker = this._overlapBlock(cand, minIntervalMs, blocks);
            }

            if (cand + minIntervalMs > windowEnd) {
                unsettled.push(idx);
            }

            adjusted[idx] = cand;
            previous = cand;
        }

        return { adjusted, unsettled };
    }

    private static _overlapBlock(start: number, durMs: number, blocks: ReservedBlock[]): ReservedBlock | null {
        const end = start + durMs;
        for (const b of blocks) {
            if (start < b.end && b.start < end) return b;
        }
        return null;
    }
}