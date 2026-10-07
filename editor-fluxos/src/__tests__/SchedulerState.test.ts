import { describe, it, expect, vi } from 'vitest';
import { SchedulerState } from '../main/SchedulerState';

vi.mock('@nut-tree-fork/nut-js', () => ({}));

function makeSchedule(id: string, flowName: string, overrides: any = {}): any {
    return {
        id,
        flowName,
        active: true,
        executionOrder: [
            { id: 1, status: 'pending', resolvedActions: ['a'], gatilhoTime: Date.now() - 10000 },
        ],
        ...overrides,
    };
}

describe('SchedulerState', () => {
    it('starts empty', () => {
        const state = new SchedulerState();
        expect(state.schedules).toEqual([]);
    });

    it('initialize replaces schedules and recovers interrupted', () => {
        const state = new SchedulerState();
        const s1 = makeSchedule('s1', 'f1', {
            executionOrder: [
                { id: 1, status: 'running', resolvedActions: ['a'], gatilhoTime: Date.now() - 1000 },
            ],
        });
        state.initialize([s1]);
        expect(state.schedules).toHaveLength(1);
        expect(state.schedules[0].executionOrder[0].status).toBe('pending');
    });

    it('replaceSchedules preserves runtime statuses', () => {
        const state = new SchedulerState();
        const s1 = makeSchedule('s1', 'f1');
        state.initialize([s1]);
        state.updateInstanceStatus('s1', 1, 'completed');

        const s1Edited = makeSchedule('s1', 'f1', { active: false });
        state.replaceSchedules([s1Edited]);

        expect(state.schedules[0].executionOrder[0].status).toBe('completed');
        expect(state.schedules[0].active).toBe(false);
    });

    it('markMissedBefore marks pending instances before startup time', () => {
        const state = new SchedulerState();
        const now = Date.now();
        const schedule = makeSchedule('s1', 'f1', {
            executionOrder: [
                { id: 1, status: 'pending', resolvedActions: ['a'], gatilhoTime: now - 5000 },
                { id: 2, status: 'pending', resolvedActions: ['b'], gatilhoTime: now + 5000 },
                { id: 3, status: 'completed', resolvedActions: ['c'], gatilhoTime: now - 5000 },
            ],
        });
        state.initialize([schedule]);
        state.markMissedBefore(now);

        expect(schedule.executionOrder[0].status).toBe('missed');
        expect(schedule.executionOrder[1].status).toBe('pending');
        expect(schedule.executionOrder[2].status).toBe('completed');
    });

    it('updateInstanceStatus updates and returns true', () => {
        const state = new SchedulerState();
        state.initialize([makeSchedule('s1', 'f1')]);

        const result = state.updateInstanceStatus('s1', 1, 'completed');

        expect(result).toBe(true);
        expect(state.schedules[0].executionOrder[0].status).toBe('completed');
    });

    it('updateInstanceStatus returns false if schedule not found', () => {
        const state = new SchedulerState();
        state.initialize([makeSchedule('s1', 'f1')]);

        expect(state.updateInstanceStatus('nonexistent', 1, 'completed')).toBe(false);
    });

    it('updateInstanceStatus returns false if instance not found', () => {
        const state = new SchedulerState();
        state.initialize([makeSchedule('s1', 'f1')]);

        expect(state.updateInstanceStatus('s1', 999, 'completed')).toBe(false);
    });

    it('getDueInstances returns due instances', () => {
        const state = new SchedulerState();
        const schedule = makeSchedule('s1', 'flow1', {
            executionOrder: [
                { id: 10, status: 'pending', resolvedActions: ['enter'], gatilhoTime: Date.now() - 5000 },
            ],
        });
        state.initialize([schedule]);

        const due = state.getDueInstances(Date.now());

        expect(due).toHaveLength(1);
        expect(due[0].scheduleId).toBe('s1');
        expect(due[0].instanceId).toBe(10);
        expect(due[0].flowName).toBe('flow1');
        expect(due[0].resolvedActions).toEqual(['enter']);
    });

    it('getDueInstances skips inactive schedules', () => {
        const state = new SchedulerState();
        const schedule = makeSchedule('s1', 'f1', { active: false });
        state.initialize([schedule]);

        const due = state.getDueInstances(Date.now());
        expect(due).toHaveLength(0);
    });

    it('getDueInstances skips future instances', () => {
        const state = new SchedulerState();
        const schedule = makeSchedule('s1', 'f1', {
            executionOrder: [
                { id: 1, status: 'pending', resolvedActions: ['a'], gatilhoTime: Date.now() + 60000 },
            ],
        });
        state.initialize([schedule]);

        const due = state.getDueInstances(Date.now());
        expect(due).toHaveLength(0);
    });

    it('getDueInstances skips missed and cancelled instances', () => {
        const state = new SchedulerState();
        const schedule = makeSchedule('s1', 'f1', {
            executionOrder: [
                { id: 1, status: 'missed', resolvedActions: ['a'], gatilhoTime: Date.now() - 5000 },
                { id: 2, status: 'cancelled', resolvedActions: ['b'], gatilhoTime: Date.now() - 5000 },
            ],
        });
        state.initialize([schedule]);

        expect(state.getDueInstances(Date.now())).toHaveLength(0);
    });

    it('getDueInstances returns empty for no schedules', () => {
        const state = new SchedulerState();
        expect(state.getDueInstances(Date.now())).toEqual([]);
    });

    it('getDueInstances marks running instances', () => {
        const state = new SchedulerState();
        const schedule = makeSchedule('s1', 'f1', {
            executionOrder: [
                { id: 1, status: 'pending', resolvedActions: ['a'], gatilhoTime: Date.now() - 1000 },
            ],
        });
        state.initialize([schedule]);

        state.getDueInstances(Date.now());

        expect(schedule.executionOrder[0].status).toBe('running');
    });
});
