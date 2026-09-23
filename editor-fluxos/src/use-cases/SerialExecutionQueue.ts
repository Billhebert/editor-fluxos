export type SerialTask = () => Promise<void>;

export interface SerialExecutionQueueOptions {
    retryWhen?: (err: unknown) => boolean;
    retryDelayMs?: number;
    maxRetries?: number;
    onTaskError?: (task: SerialTask) => void;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class SerialExecutionQueue {
    private _tasks: SerialTask[] = [];
    private _processing: boolean = false;
    private _retryWhen: (err: unknown) => boolean;
    private _retryDelayMs: number;
    private _maxRetries: number;
    private _onTaskError?: (task: SerialTask) => void;

    constructor(options: SerialExecutionQueueOptions = {}) {
        this._retryWhen = options.retryWhen || (() => false);
        this._retryDelayMs = options.retryDelayMs ?? 500;
        this._maxRetries = options.maxRetries ?? 10;
        this._onTaskError = options.onTaskError;
    }

    get size(): number {
        return this._tasks.length;
    }

    get isProcessing(): boolean {
        return this._processing;
    }

    push(task: SerialTask): void {
        this._tasks.push(task);
        this._drain();
    }

    clear(): void {
        this._tasks = [];
    }

    private _drain(): void {
        if (this._processing) return;
        this._processing = true;

        const pump = async (): Promise<void> => {
            while (this._tasks.length > 0) {
                const task = this._tasks.shift()!;
                try {
                    await this._runRetrying(task);
                } catch {
                    this._onTaskError?.(task);
                }
            }
        };

        (async () => {
            try {
                await pump();
            } finally {
                this._processing = false;
            }
        })();
    }

    private async _runRetrying(task: SerialTask): Promise<void> {
        let attempts = 0;
        for (;;) {
            try {
                await task();
                return;
            } catch (err) {
                if (this._retryWhen(err) && attempts < this._maxRetries) {
                    attempts++;
                    await sleep(this._retryDelayMs);
                    continue;
                }
                throw err;
            }
        }
    }
}