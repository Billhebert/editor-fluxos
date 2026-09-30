import { Schedule } from '../domain/Schedule';
import { ReservedBlock } from '../domain/types';
import { IScheduleConflictService } from '../adapters/IScheduleConflictService';
import { ScheduleConflictDetector } from './ScheduleConflictDetector';

// Orquestra a deteccao de conflito com a invariante de self-exclusao garantida
// POR CONSTRUCAO: o agendamento em analise ja sai da lista de "others".
export class ScheduleConflictService implements IScheduleConflictService {
    conflictsInSet(schedule: Schedule, schedules: Schedule[], gapMs: number = 0): Map<number, ReservedBlock[]> {
        const others = schedules.filter(s => s !== schedule && s.id !== schedule.id);
        return ScheduleConflictDetector.conflicts(schedule, others, gapMs);
    }

    conflictCountInSet(schedule: Schedule, schedules: Schedule[], gapMs: number = 0): number {
        return this.conflictsInSet(schedule, schedules, gapMs).size;
    }

    conflictingInstanceIds(schedule: Schedule, schedules: Schedule[], gapMs: number = 0): number[] {
        return Array.from(this.conflictsInSet(schedule, schedules, gapMs).keys());
    }
}