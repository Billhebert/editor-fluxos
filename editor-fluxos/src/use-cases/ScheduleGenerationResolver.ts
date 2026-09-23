import { ReservedBlock } from '../domain/types';
import { ScheduleConflictDetector } from './ScheduleConflictDetector';

export interface AutoResolveResult {
    adjusted: number[];
    unsettled: number[];
}

// Responsabilidade unica: realocar timestamps para fora dos blocos reservados.
// A deteccao de conflito vive em ScheduleConflictDetector.
export class ScheduleGenerationResolver {
    static autoResolve(
        timestamps: number[],
        minIntervalMs: number,
        reservedBlocks: ReservedBlock[],
        windowStart: number,
        windowEnd: number
    ): AutoResolveResult {
        if (timestamps.length === 0) return { adjusted: [], unsettled: [] };

        const blocks = ScheduleConflictDetector.mergeReservedBlocks(reservedBlocks);
        const order = timestamps.map((_, idx) => idx).sort((a, b) => timestamps[a] - timestamps[b]);
        const adjusted: number[] = new Array(timestamps.length);
        const unsettled: number[] = [];
        let previous = Number.NEGATIVE_INFINITY;

        for (const idx of order) {
            let cand = Math.max(timestamps[idx], windowStart, previous);

            let blocker = this._overlapBlock(cand, minIntervalMs, blocks);
            if (!blocker && cand === previous) {
                cand = previous + minIntervalMs;
                blocker = this._overlapBlock(cand, minIntervalMs, blocks);
            }
            while (blocker) {
                cand = Math.max(blocker.end, previous + minIntervalMs);
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