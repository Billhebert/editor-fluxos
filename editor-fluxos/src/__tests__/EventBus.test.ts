import { describe, it, expect, vi } from 'vitest';
import { EventBus, Events } from '../infrastructure/EventBus';

describe('EventBus', () => {
    it('singleton returns same instance', () => {
        const a = EventBus.getInstance();
        const b = EventBus.getInstance();
        expect(a).toBe(b);
    });

    it('calls listener when event is emitted', () => {
        const bus = new EventBus();
        const cb = vi.fn();
        bus.on('test', cb);
        bus.emit('test', 'data');
        expect(cb).toHaveBeenCalledWith('data');
    });

    it('off removes listener', () => {
        const bus = new EventBus();
        const cb = vi.fn();
        bus.on('test', cb);
        bus.off('test', cb);
        bus.emit('test');
        expect(cb).not.toHaveBeenCalled();
    });

    it('once calls listener only once', () => {
        const bus = new EventBus();
        const cb = vi.fn();
        bus.once('test', cb);
        bus.emit('test');
        bus.emit('test');
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('on returns unsubscribe function', () => {
        const bus = new EventBus();
        const cb = vi.fn();
        const unsub = bus.on('test', cb);
        unsub();
        bus.emit('test');
        expect(cb).not.toHaveBeenCalled();
    });

    it('clear removes all listeners', () => {
        const bus = new EventBus();
        const cb1 = vi.fn();
        const cb2 = vi.fn();
        bus.on('a', cb1);
        bus.on('b', cb2);
        bus.clear();
        bus.emit('a');
        bus.emit('b');
        expect(cb1).not.toHaveBeenCalled();
        expect(cb2).not.toHaveBeenCalled();
    });

    it('continues iteration if a listener throws', () => {
        const bus = new EventBus();
        const errorCb = vi.fn(() => { throw new Error('fail'); });
        const successCb = vi.fn();
        bus.on('test', errorCb);
        bus.on('test', successCb);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        bus.emit('test');
        consoleSpy.mockRestore();

        expect(errorCb).toHaveBeenCalled();
        expect(successCb).toHaveBeenCalled();
    });

    it('Events constants are defined', () => {
        expect(Events.FLOW_CREATED).toBe('flow:created');
        expect(Events.UNDO).toBe('editor:undo');
    });
});
