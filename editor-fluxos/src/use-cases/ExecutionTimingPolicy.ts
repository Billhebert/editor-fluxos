export interface SystemExecutionTimings {
    minInteractionMs: number;
    minFlowGapMs: number;
}

export class ExecutionTimingPolicy {
    private _minInteractionMs: number;
    private _minFlowGapMs: number;
    private _lastInteractionAt = 0;
    private _lastFlowFinishedAt = 0;
    private _hasActiveFlow = false;

    constructor(timings: SystemExecutionTimings) {
        this._minInteractionMs = timings.minInteractionMs;
        this._minFlowGapMs = timings.minFlowGapMs;
    }

    updateTimings(timings: SystemExecutionTimings): void {
        this._minInteractionMs = timings.minInteractionMs;
        this._minFlowGapMs = timings.minFlowGapMs;
    }

    async waitForInteractionGap(signal?: AbortSignal): Promise<void> {
        if (this._minInteractionMs <= 0) return;
        const elapsed = Date.now() - this._lastInteractionAt;
        const wait = Math.max(0, this._minInteractionMs - elapsed);
        if (wait <= 0) return;
        return this._sleep(wait, signal);
    }

    async waitForFlowGap(signal?: AbortSignal): Promise<void> {
        if (this._hasActiveFlow) return;
        if (this._minFlowGapMs <= 0) return;
        const elapsed = Date.now() - this._lastFlowFinishedAt;
        const wait = Math.max(0, this._minFlowGapMs - elapsed);
        if (wait <= 0) return;
        return this._sleep(wait, signal);
    }

    markInteraction(): void {
        this._lastInteractionAt = Date.now();
    }

    markFlowStarted(): void {
        this._hasActiveFlow = true;
    }

    markFlowFinished(): void {
        this._lastFlowFinishedAt = Date.now();
        this._hasActiveFlow = false;
    }

    private _sleep(ms: number, signal?: AbortSignal): Promise<void> {
        return new Promise((resolve, reject) => {
            if (signal?.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }
            const timer = setTimeout(() => {
                cleanup();
                resolve();
            }, ms);
            const onAbort = () => {
                cleanup();
                reject(new DOMException('Aborted', 'AbortError'));
            };
            const cleanup = () => {
                clearTimeout(timer);
                signal?.removeEventListener('abort', onAbort);
            };
            signal?.addEventListener('abort', onAbort, { once: true });
        });
    }
}
