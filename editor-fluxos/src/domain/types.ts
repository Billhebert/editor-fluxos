

export interface KeyAction {
    type: 'key';
    key: string;
}

export interface TextAction {
    type: 'text';
    text: string;
}

export interface MouseAction {
    type: 'mouse';
    mouse: string;
    x: number;
    y: number;
}

export interface DelayAction {
    type: 'delay';
    delay: number;
}

export interface HotkeyAction {
    type: 'hotkey';
    keys: string[];
}

export interface ClickImageAction {
    type: 'click-image';
    assetId: string;
    confidence?: number;
    timeout?: number;
}

export interface IfImageAction {
    type: 'if-image';
    assetId: string;
    confidence?: number;
    timeout?: number;
    then: RawAction[];
    else: RawAction[];
}

// Formatos legados: string vira KeyAction ou TextAction; objetos {mouse...} e {delay...} são normalizados.
export type LegacyAction = string | { mouse: string; x: number; y: number } | { delay: number };

export type StructuredAction =
    | KeyAction
    | TextAction
    | MouseAction
    | DelayAction
    | HotkeyAction
    | ClickImageAction
    | IfImageAction;

export type RawAction = StructuredAction | LegacyAction;

export interface VariableConfig {
    nome: string;
    valor: string;
}

export interface VariablePoolData {
    obrigatorias: VariableConfig[];
    opcionais: VariableConfig[];
}

export type ScheduleMode = 'one-shot' | 'recurring';

export type InstanceStatus = 'pending' | 'running' | 'completed' | 'failed' | 'missed' | 'cancelled';

export interface ReservedBlock {
    start: number;
    end: number;
    scheduleId?: string;
    instanceId?: number;
    scheduleIds?: string[];
}
