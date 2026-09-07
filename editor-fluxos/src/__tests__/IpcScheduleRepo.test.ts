// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IpcScheduleRepo } from '../infrastructure/IpcScheduleRepo';
import { Schedule } from '../domain/Schedule';

vi.mock('../infrastructure/IpcService', () => ({
    ipc: {
        getSchedules: vi.fn().mockResolvedValue([]),
        saveSchedules: vi.fn().mockResolvedValue(undefined),
        updateInstanceStatus: vi.fn().mockResolvedValue(undefined),
    },
}));

function makeSchedule(id: string, flowName: string): any {
    return {
        id,
        flowName,
        obrigatorioValor: 'test',
        repeticoes: 1,
        intervaloMinimo: 0,
        mode: 'one-shot',
        date: '2025-01-01',
        timeStart: '09:00',
        timeEnd: '18:00',
        days: [1, 2, 3, 4, 5],
        dataInicio: null,
        dataFim: null,
        active: true,
        executionOrder: [
            { id: 1, status: 'pending', resolvedActions: ['a'], scheduledTime: Date.now() },
        ],
    };
}

describe('IpcScheduleRepo', () => {
    let repo: IpcScheduleRepo;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new IpcScheduleRepo();
    });

    it('findAll returns parsed schedules', async () => {
        const { ipc } = await import('../infrastructure/IpcService');
        const raw = makeSchedule('s1', 'flow1');
        vi.mocked(ipc.getSchedules).mockResolvedValue([raw]);

        const result = await repo.findAll();

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('s1');
        expect(result[0].flowName).toBe('flow1');
    });

    it('findAll returns empty array when no data', async () => {
        const { ipc } = await import('../infrastructure/IpcService');
        vi.mocked(ipc.getSchedules).mockResolvedValue([]);

        const result = await repo.findAll();
        expect(result).toEqual([]);
    });

    it('findById returns schedule when exists', async () => {
        const { ipc } = await import('../infrastructure/IpcService');
        vi.mocked(ipc.getSchedules).mockResolvedValue([makeSchedule('s1', 'f1')]);

        const found = await repo.findById('s1');
        expect(found).not.toBeNull();
        expect(found!.id).toBe('s1');
    });

    it('findById returns null when not found', async () => {
        const { ipc } = await import('../infrastructure/IpcService');
        vi.mocked(ipc.getSchedules).mockResolvedValue([]);

        const found = await repo.findById('nonexistent');
        expect(found).toBeNull();
    });

    it('save adds new schedule', async () => {
        const { ipc } = await import('../infrastructure/IpcService');
        vi.mocked(ipc.getSchedules).mockResolvedValue([]);

        const schedule = Schedule.fromJSON(makeSchedule('new', 'flow'))!;
        await repo.save(schedule);

        expect(ipc.saveSchedules).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ id: 'new' })])
        );
    });

    it('save updates existing schedule by id', async () => {
        const { ipc } = await import('../infrastructure/IpcService');
        vi.mocked(ipc.getSchedules).mockResolvedValue([makeSchedule('s1', 'old')]);

        const updated = Schedule.fromJSON(makeSchedule('s1', 'new'))!;
        await repo.save(updated);

        expect(ipc.saveSchedules).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ flowName: 'new' })])
        );
    });

    it('delete removes schedule by id', async () => {
        const { ipc } = await import('../infrastructure/IpcService');
        vi.mocked(ipc.getSchedules).mockResolvedValue([makeSchedule('s1', 'f1')]);

        await repo.delete('s1');

        expect(ipc.saveSchedules).toHaveBeenCalledWith([]);
    });

    it('delete does nothing if id not found', async () => {
        const { ipc } = await import('../infrastructure/IpcService');
        vi.mocked(ipc.getSchedules).mockResolvedValue([makeSchedule('s1', 'f1')]);

        await repo.delete('nonexistent');

        expect(ipc.saveSchedules).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ id: 's1' })])
        );
    });

    it('saveAll saves all schedules', async () => {
        const { ipc } = await import('../infrastructure/IpcService');
        vi.mocked(ipc.getSchedules).mockResolvedValue([]);

        const s1 = Schedule.fromJSON(makeSchedule('a', 'f1'))!;
        const s2 = Schedule.fromJSON(makeSchedule('b', 'f2'))!;
        await repo.saveAll([s1, s2]);

        expect(ipc.saveSchedules).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ id: 'a' }),
                expect.objectContaining({ id: 'b' }),
            ])
        );
    });

    it('updateInstanceStatus delegates to ipc', async () => {
        const { ipc } = await import('../infrastructure/IpcService');

        await repo.updateInstanceStatus('s1', 1, 'completed');

        expect(ipc.updateInstanceStatus).toHaveBeenCalledWith('s1', 1, 'completed');
    });
});
