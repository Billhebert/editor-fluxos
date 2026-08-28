export interface IEventBus {
    on(channel: string, listener: (...args: any[]) => void): () => void;
    off(channel: string, listener: (...args: any[]) => void): void;
    once(channel: string, listener: (...args: any[]) => void): void;
    emit(channel: string, ...args: any[]): void;
    clear(): void;
}

export const Events = {
    FLOW_CREATED: 'flow:created',
    FLOW_RENAMED: 'flow:renamed',
    FLOW_DELETED: 'flow:deleted',
    FLOW_UPDATED: 'flow:updated',
    FLOW_EXECUTED: 'flow:executed',
    FLOW_ACTION_ADDED: 'flow:action:added',
    FLOW_ACTION_REMOVED: 'flow:action:removed',
    FLOW_ACTION_MOVED: 'flow:action:moved',
    SCHEDULE_CREATED: 'schedule:created',
    SCHEDULE_DELETED: 'schedule:deleted',
    SCHEDULE_TOGGLED: 'schedule:toggled',
    SCHEDULE_INSTANCE_STATUS: 'schedule:instance:status',
    VARIABLE_ADDED: 'variable:added',
    VARIABLE_REMOVED: 'variable:removed',
    VAR_CONFIG_UPDATED: 'varconfig:updated',
    UNDO: 'editor:undo',
    REDO: 'editor:redo',
} as const;