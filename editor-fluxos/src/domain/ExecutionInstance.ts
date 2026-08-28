import { InstanceStatus, RawAction } from './types';

export class ExecutionInstance {
    readonly id: number;
    gatilhoTime: number;
    resolvedActions: RawAction[];
    status: InstanceStatus;

    constructor(id: number, gatilhoTime: number, resolvedActions: RawAction[], status: InstanceStatus = 'pending') {
        this.id = id;
        this.gatilhoTime = gatilhoTime;
        this.resolvedActions = [...resolvedActions];
        this.status = status;
    }

    get isPending(): boolean { return this.status === 'pending'; }
    get isRunning(): boolean { return this.status === 'running'; }
    get isCompleted(): boolean { return this.status === 'completed'; }
    get isFailed(): boolean { return this.status === 'failed'; }

    isDue(now: number = Date.now()): boolean {
        return this.isPending && now >= this.gatilhoTime;
    }

    markRunning(): void { this.status = 'running'; }
    markCompleted(): void { this.status = 'completed'; }
    markFailed(): void { this.status = 'failed'; }

    updateTimestamp(newTime: number): void {
        this.gatilhoTime = newTime;
    }

    toJSON(): any {
        return {
            id: this.id,
            gatilhoTime: this.gatilhoTime,
            status: this.status,
            resolvedActions: this.resolvedActions
        };
    }

    static fromJSON(data: any): ExecutionInstance {
        return new ExecutionInstance(
            data.id,
            data.gatilhoTime ?? data.gatilho_timeStamp,
            data.resolvedActions || [],
            data.status || 'pending'
        );
    }
}
