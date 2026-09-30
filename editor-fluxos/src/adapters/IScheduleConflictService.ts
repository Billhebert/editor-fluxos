import { Schedule } from '../domain/Schedule';
import { ReservedBlock } from '../domain/types';

// Contrato da aplicacao sobre conflito de agendamentos.
// Invariante: o agendamento em analise nunca conta contra si mesmo,
// independentemente de estar (ou nao) presente na lista passada.
export interface IScheduleConflictService {
    conflictsInSet(schedule: Schedule, schedules: Schedule[], gapMs?: number): Map<number, ReservedBlock[]>;
    conflictCountInSet(schedule: Schedule, schedules: Schedule[], gapMs?: number): number;
    conflictingInstanceIds(schedule: Schedule, schedules: Schedule[], gapMs?: number): number[];
}