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

    it('setSchedules replaces schedules', () => {
        const state = new SchedulerState();
        const s1 = makeSchedule('s1', 'f1');
        state.setSchedules([s1]);
        expect(state.schedules).toHaveLength(1);
        expect(state.schedules[0].id).toBe('s1');
    });

    it('updateInstanceStatus updates and returns true', () => {
        const state = new SchedulerState();
        state.setSchedules([makeSchedule('s1', 'f1')]);

        const result = state.updateInstanceStatus('s1', 1, 'completed');

        expect(result).toBe(true);
        expect(state.schedules[0].executionOrder[0].status).toBe('completed');
    });

    it('updateInstanceStatus returns false if schedule not found', () => {
        const state = new SchedulerState();
        state.setSchedules([makeSchedule('s1', 'f1')]);

        expect(state.updateInstanceStatus('nonexistent', 1, 'completed')).toBe(false);
    });

    it('updateInstanceStatus returns false if instance not found', () => {
        const state = new SchedulerState();
        state.setSchedules([makeSchedule('s1', 'f1')]);

        expect(state.updateInstanceStatus('s1', 999, 'completed')).toBe(false);
    });

    it('getDueInstances returns due instances', () => {
        const state = new SchedulerState();
        const schedule = makeSchedule('s1', 'flow1', {
            executionOrder: [
                { id: 10, status: 'pending', resolvedActions: ['enter'], gatilhoTime: Date.now() - 5000 },
            ],
        });
        state.setSchedules([schedule]);

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
        state.setSchedules([schedule]);

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
        state.setSchedules([schedule]);

        const due = state.getDueInstances(Date.now());
        expect(due).toHaveLength(0);
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
        state.setSchedules([schedule]);

        state.getDueInstances(Date.now());

        expect(schedule.executionOrder[0].status).toBe('running');
    });
});
