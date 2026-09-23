export interface ScheduleCardVM {
    scheduleId: string;
    flowName: string;
    active: boolean;
    conflictCount: number;
    total: number;
    completed: number;
    next: string;
    modeLabel: string;
    dateRangeLabel: string;
    obrigatorioValor: string;
    repeticoesLabel: string;
    intervaloLabel: string;
}

export interface ScheduleListCallbacks {
    onClose(): void;
    onNew(): void;
    onToggle(scheduleId: string, active: boolean): void;
    onRemove(index: number): void;
    onView(scheduleId: string): void;
}