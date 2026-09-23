export interface MouseAction {
    mouse: string;
    x: number;
    y: number;
}

export interface DelayAction {
    delay: number;
}

export type RawAction = string | MouseAction | DelayAction;

export interface VariableConfig {
    nome: string;
    valor: string;
}

export interface VariablePoolData {
    obrigatorias: VariableConfig[];
    opcionais: VariableConfig[];
}

export type ScheduleMode = 'one-shot' | 'recurring';

export type InstanceStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ReservedBlock {
    start: number;
    end: number;
    scheduleId?: string;
    instanceId?: number;
}
