import { IScheduler } from '../adapters/IScheduler';

export class ElectronScheduler implements IScheduler {
    private _interval: ReturnType<typeof setInterval> | null = null;
    private _running: boolean = false;

    start(onTick: () => void): void {
        if (this._running) return;
        this._running = true;
        this._interval = setInterval(() => {
            if (onTick) onTick();
        }, 1000);
    }

    stop(): void {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
        this._running = false;
    }

    isRunning(): boolean {
        return this._running;
    }
}
