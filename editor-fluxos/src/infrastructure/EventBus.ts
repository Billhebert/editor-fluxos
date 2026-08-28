import { IEventBus, Events } from '../adapters/IEventBus';

export { Events };

export type EventCallback<T = any> = (data: T) => void;

export class EventBus implements IEventBus {
    private static instance: EventBus;
    private listeners: Map<string, EventCallback[]> = new Map();

    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    on<T = any>(event: string, callback: EventCallback<T>): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);

        return () => this.off(event, callback);
    }

    off(event: string, callback: EventCallback): void {
        const cbs = this.listeners.get(event);
        if (cbs) {
            const idx = cbs.indexOf(callback);
            if (idx !== -1) cbs.splice(idx, 1);
        }
    }

    emit<T = any>(event: string, data?: T): void {
        const cbs = this.listeners.get(event);
        if (cbs) {
            for (const cb of [...cbs]) {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`EventBus: error in listener for "${event}":`, err);
                }
            }
        }
    }

    once<T = any>(event: string, callback: EventCallback<T>): () => void {
        const wrapper: EventCallback<T> = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        return this.on(event, wrapper);
    }

    clear(): void {
        this.listeners.clear();
    }
}

export const eventBus = EventBus.getInstance();
