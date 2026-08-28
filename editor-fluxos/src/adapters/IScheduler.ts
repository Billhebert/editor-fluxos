export interface IScheduler {
    start(onTick: () => void): void;
    stop(): void;
    isRunning(): boolean;
}
