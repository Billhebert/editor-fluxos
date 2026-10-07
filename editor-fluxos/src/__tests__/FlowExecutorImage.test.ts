import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlowExecutor, TimingPolicy } from '../use-cases/FlowExecutor';
import { Flow } from '../domain/Flow';
import { VariablePool } from '../domain/VariablePool';
import { IActionExecutor } from '../adapters/IActionExecutor';
import { IImageRecognizer } from '../adapters/IImageRecognizer';

function createMockExecutor(): IActionExecutor {
    return { execute: vi.fn(async () => {}) };
}

function createNoOpTimingPolicy(): TimingPolicy {
    return {
        waitForInteractionGap: vi.fn(async () => {}),
        waitForFlowGap: vi.fn(async () => {}),
        markInteraction: vi.fn(),
        markFlowStarted: vi.fn(),
        markFlowFinished: vi.fn(),
    };
}

function createMockRecognizer(match: { x: number; y: number; width: number; height: number; confidence: number } | null): IImageRecognizer {
    return { findImage: vi.fn(async () => match) };
}

describe('FlowExecutor image actions', () => {
    let executor: IActionExecutor;
    let timingPolicy: TimingPolicy;
    let recognizer: IImageRecognizer;

    beforeEach(() => {
        executor = createMockExecutor();
        timingPolicy = createNoOpTimingPolicy();
    });

    it('clicks center of matched image for click-image action', async () => {
        recognizer = createMockRecognizer({ x: 100, y: 100, width: 50, height: 50, confidence: 0.9 });
        const flowExecutor = new FlowExecutor(executor, timingPolicy, recognizer);
        await flowExecutor.executeActions([{ type: 'click-image', assetId: 'btn' }]);
        expect(executor.execute).toHaveBeenCalledWith({ type: 'mouse', mouse: 'click', x: 125, y: 125 }, expect.any(AbortSignal));
    });

    it('does not click when image not found', async () => {
        recognizer = createMockRecognizer(null);
        const flowExecutor = new FlowExecutor(executor, timingPolicy, recognizer);
        await flowExecutor.executeActions([{ type: 'click-image', assetId: 'missing' }]);
        expect(executor.execute).not.toHaveBeenCalled();
    });

    it('executes then branch when image found in if-image', async () => {
        recognizer = createMockRecognizer({ x: 0, y: 0, width: 10, height: 10, confidence: 0.9 });
        const flowExecutor = new FlowExecutor(executor, timingPolicy, recognizer);
        await flowExecutor.executeActions([{ type: 'if-image', assetId: 'btn', then: ['a'], else: ['b'] }]);
        expect(executor.execute).toHaveBeenCalledWith('a', expect.any(AbortSignal));
        expect(executor.execute).not.toHaveBeenCalledWith('b', expect.any(AbortSignal));
    });

    it('executes else branch when image not found in if-image', async () => {
        recognizer = createMockRecognizer(null);
        const flowExecutor = new FlowExecutor(executor, timingPolicy, recognizer);
        await flowExecutor.executeActions([{ type: 'if-image', assetId: 'btn', then: ['a'], else: ['b'] }]);
        expect(executor.execute).not.toHaveBeenCalledWith('a', expect.any(AbortSignal));
        expect(executor.execute).toHaveBeenCalledWith('b', expect.any(AbortSignal));
    });
});
