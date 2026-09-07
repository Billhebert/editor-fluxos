// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordingController, RecordingContext } from '../ui/RecordingController';
import { RawAction } from '../domain/types';

vi.mock('../ui/Toast', () => ({
    Toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

vi.mock('../ui/VirtualKeyboardView', () => {
    return {
        VirtualKeyboardView: class MockVirtualKeyboardView {
            render = vi.fn();
        },
    };
});

function createMockCtx(overrides: Partial<RecordingContext> = {}): RecordingContext {
    return {
        getTargetFluxo: vi.fn().mockReturnValue(null),
        getFluxos: vi.fn().mockReturnValue({}),
        addToFluxo: vi.fn().mockResolvedValue(undefined),
        renderAll: vi.fn(),
        registerCapture: vi.fn().mockResolvedValue(undefined),
        unregisterCapture: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

describe('RecordingController', () => {
    let ctx: RecordingContext;
    let ctrl: RecordingController;

    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = `
            <div id="recordingPanel"></div>
            <div id="recordingTarget"></div>
            <div id="queueList"></div>
            <div id="keyboardContainer"></div>
            <input id="mouseX" value="0" />
            <input id="mouseY" value="0" />
            <button id="keyRecBtn"></button>
            <button id="globalCaptureBtn"></button>
        `;
        ctx = createMockCtx();
        ctrl = new RecordingController(ctx);
    });

    it('starts with default state', () => {
        expect(ctrl.targetFluxo).toBeNull();
        expect(ctrl.isKeyRecording).toBe(false);
        expect(ctrl.isGlobalCapture).toBe(false);
        expect(ctrl.queue).toHaveLength(0);
    });

    it('open sets target fluxo and activates panel', () => {
        ctrl.open('my-flow');

        expect(ctrl.targetFluxo).toBe('my-flow');
        expect(document.getElementById('recordingPanel')!.classList.contains('active')).toBe(true);
        expect(document.getElementById('recordingTarget')!.textContent).toContain('my-flow');
    });

    it('close deactivates panel', () => {
        ctrl.open('flow');
        ctrl.close();

        expect(ctrl.targetFluxo).toBeNull();
        expect(document.getElementById('recordingPanel')!.classList.contains('active')).toBe(false);
    });

    it('addToQueue adds item and renders', () => {
        ctrl.open('flow');
        ctrl.addToQueue('enter');

        expect(ctrl.queue).toHaveLength(1);
        expect(ctrl.queue[0]).toBe('enter');
        expect(document.getElementById('queueList')!.children.length).toBe(1);
    });

    it('removeFromQueue removes item', () => {
        ctrl.open('flow');
        ctrl.addToQueue('a');
        ctrl.addToQueue('b');
        ctrl.removeFromQueue(0);

        expect(ctrl.queue).toHaveLength(1);
        expect(ctrl.queue[0]).toBe('b');
    });

    it('clearQueue empties queue', () => {
        ctrl.open('flow');
        ctrl.addToQueue('a');
        ctrl.addToQueue('b');
        ctrl.clearQueue();

        expect(ctrl.queue).toHaveLength(0);
    });

    it('addQueueToFluxo calls addToFluxo with queue', async () => {
        ctrl.open('target-flow');
        ctrl.addToQueue('enter');
        ctrl.addToQueue('space');

        await ctrl.addQueueToFluxo();

        expect(ctx.addToFluxo).toHaveBeenCalledWith('target-flow', ['enter', 'space']);
        expect(ctrl.queue).toHaveLength(0);
    });

    it('addQueueToFluxo does nothing if no target', async () => {
        ctrl.addToQueue('enter');
        // targetFluxo is null
        await ctrl.addQueueToFluxo();

        expect(ctx.addToFluxo).not.toHaveBeenCalled();
    });

    it('addQueueToFluxo does nothing if queue empty', async () => {
        ctrl.open('flow');
        await ctrl.addQueueToFluxo();

        expect(ctx.addToFluxo).not.toHaveBeenCalled();
    });

    it('toggleKeyRecording toggles state', () => {
        expect(ctrl.isKeyRecording).toBe(false);
        ctrl.toggleKeyRecording();
        expect(ctrl.isKeyRecording).toBe(true);
        ctrl.toggleKeyRecording();
        expect(ctrl.isKeyRecording).toBe(false);
    });

    it('toggleKeyRecording updates button', () => {
        ctrl.toggleKeyRecording();
        const btn = document.getElementById('keyRecBtn')!;
        expect(btn.textContent).toContain('Parar');
        expect(btn.classList.contains('recording-active')).toBe(true);
    });

    it('addMouseAction reads coordinates and adds to queue', () => {
        ctrl.open('flow');
        (document.getElementById('mouseX') as HTMLInputElement).value = '150';
        (document.getElementById('mouseY') as HTMLInputElement).value = '250';

        ctrl.addMouseAction('click');

        expect(ctrl.queue).toHaveLength(1);
        expect(ctrl.queue[0]).toEqual({ mouse: 'click', x: 150, y: 250 });
    });

    it('addDelayAction reads delay input', () => {
        ctrl.open('flow');
        (document.getElementById('delayInput') as HTMLInputElement) ?? (() => {
            const input = document.createElement('input');
            input.id = 'delayInput';
            document.body.appendChild(input);
            return input;
        })();
        (document.getElementById('delayInput') as HTMLInputElement).value = '1000';

        ctrl.addDelayAction();

        expect(ctrl.queue).toHaveLength(1);
        expect(ctrl.queue[0]).toEqual({ delay: 1000 });
    });

    it('addDelayAction ignores zero delay', () => {
        ctrl.open('flow');
        const input = document.createElement('input');
        input.id = 'delayInput';
        input.value = '0';
        document.body.appendChild(input);

        ctrl.addDelayAction();

        expect(ctrl.queue).toHaveLength(0);
    });

    it('addTextAction adds text to queue', () => {
        ctrl.open('flow');
        const input = document.createElement('input');
        input.id = 'textInput';
        input.value = 'hello';
        document.body.appendChild(input);

        ctrl.addTextAction();

        expect(ctrl.queue).toHaveLength(1);
        expect(ctrl.queue[0]).toBe('hello');
        expect(input.value).toBe('');
    });

    it('addTextAction ignores empty text', () => {
        ctrl.open('flow');
        const input = document.createElement('input');
        input.id = 'textInput';
        input.value = '';
        document.body.appendChild(input);

        ctrl.addTextAction();

        expect(ctrl.queue).toHaveLength(0);
    });

    it('toggleGlobalCapture calls registerCapture', async () => {
        ctrl.open('flow');
        await ctrl.toggleGlobalCapture();

        expect(ctrl.isGlobalCapture).toBe(true);
        expect(ctx.registerCapture).toHaveBeenCalledWith('CommandOrControl+Shift+C');
    });

    it('toggleGlobalCapture off calls unregisterCapture', async () => {
        ctrl.open('flow');
        await ctrl.toggleGlobalCapture();
        await ctrl.toggleGlobalCapture();

        expect(ctrl.isGlobalCapture).toBe(false);
        expect(ctx.unregisterCapture).toHaveBeenCalled();
    });

    it('setupKeyboardRecording adds keydown listener', () => {
        ctrl.open('flow');
        ctrl.setupKeyboardRecording();
        ctrl.toggleKeyRecording();

        const event = new KeyboardEvent('keydown', { key: 'a' });
        document.dispatchEvent(event);

        expect(ctrl.queue).toHaveLength(1);
        expect(ctrl.queue[0]).toBe('a');
    });

    it('setupKeyboardRecording ignores input fields', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        ctrl.open('flow');
        ctrl.setupKeyboardRecording();
        ctrl.toggleKeyRecording();

        const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
        Object.defineProperty(event, 'target', { value: input });
        document.dispatchEvent(event);

        expect(ctrl.queue).toHaveLength(0);
    });

    it('close stops recording if active', () => {
        ctrl.open('flow');
        ctrl.toggleKeyRecording();
        ctrl.toggleGlobalCapture();
        ctrl.close();

        expect(ctrl.isKeyRecording).toBe(false);
        expect(ctrl.isGlobalCapture).toBe(false);
    });
});
