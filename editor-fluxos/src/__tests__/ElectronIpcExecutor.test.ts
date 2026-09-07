import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElectronIpcExecutor } from '../infrastructure/ElectronIpcExecutor';

vi.mock('../infrastructure/IpcService', () => ({
    ipc: {
        executeAction: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('ElectronIpcExecutor', () => {
    let executor: ElectronIpcExecutor;

    beforeEach(() => {
        vi.clearAllMocks();
        executor = new ElectronIpcExecutor();
    });

    it('delegates to ipc.executeAction', async () => {
        const { ipc } = await import('../infrastructure/IpcService');
        const action = { mouse: 'click', x: 10, y: 20 };

        await executor.execute(action);

        expect(ipc.executeAction).toHaveBeenCalledWith(action);
    });

    it('propagates errors from ipc', async () => {
        const { ipc } = await import('../infrastructure/IpcService');
        vi.mocked(ipc.executeAction).mockRejectedValue(new Error('ipc fail'));

        await expect(executor.execute('enter')).rejects.toThrow('ipc fail');
    });
});
