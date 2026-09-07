// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileController, FileControllerContext } from '../ui/FileController';
import { FlowManager } from '../use-cases/FlowManager';
import { IFileDialogService } from '../adapters/IFileDialogService';
import { RawAction } from '../domain';

vi.mock('../ui/Toast', () => ({
    Toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

function createMockCtx(overrides: Partial<FileControllerContext> = {}): FileControllerContext {
    return {
        flowManager: {
            saveAllFlows: vi.fn().mockResolvedValue(undefined),
        } as unknown as FlowManager,
        fluxosCache: {},
        variables: [],
        refreshCache: vi.fn().mockResolvedValue(undefined),
        renderAll: vi.fn().mockResolvedValue(undefined),
        saveToStorage: vi.fn(),
        fileDialog: {
            openFile: vi.fn().mockResolvedValue(null),
            saveFile: vi.fn().mockResolvedValue(null),
        } as unknown as IFileDialogService,
        ...overrides,
    };
}

describe('FileController', () => {
    let ctx: FileControllerContext;
    let ctrl: FileController;

    beforeEach(() => {
        vi.clearAllMocks();
        ctx = createMockCtx();
        ctrl = new FileController(ctx);
    });

    it('openFile does nothing if dialog cancelled', async () => {
        await ctrl.openFile();

        expect(ctx.flowManager.saveAllFlows).not.toHaveBeenCalled();
        expect(ctrl.currentFilePath).toBeNull();
    });

    it('openFile parses valid JSON and saves flows', async () => {
        const flowData = { flow1: [{ mouse: 'click', x: 10, y: 20 }] };
        vi.mocked(ctx.fileDialog.openFile).mockResolvedValue({
            path: '/test/fluxos.json',
            data: JSON.stringify(flowData),
        });

        await ctrl.openFile();

        expect(ctx.flowManager.saveAllFlows).toHaveBeenCalled();
        expect(ctx.refreshCache).toHaveBeenCalled();
        expect(ctx.renderAll).toHaveBeenCalled();
        expect(ctrl.currentFilePath).toBe('/test/fluxos.json');
    });

    it('openFile handles invalid JSON', async () => {
        vi.mocked(ctx.fileDialog.openFile).mockResolvedValue({
            path: '/test/bad.json',
            data: 'not json',
        });

        await ctrl.openFile();

        const { Toast } = await import('../ui/Toast');
        expect(Toast.error).toHaveBeenCalledWith('Arquivo JSON invalido');
    });

    it('saveFile does nothing if dialog cancelled', async () => {
        await ctrl.saveFile();

        expect(ctx.saveToStorage).not.toHaveBeenCalled();
    });

    it('saveFile saves and updates path', async () => {
        vi.mocked(ctx.fileDialog.saveFile).mockResolvedValue('/saved/path.json');

        await ctrl.saveFile();

        expect(ctx.fileDialog.saveFile).toHaveBeenCalled();
        expect(ctrl.currentFilePath).toBe('/saved/path.json');
        expect(ctx.saveToStorage).toHaveBeenCalled();
    });

    it('saveFile with forceSaveAs sends null filePath', async () => {
        vi.mocked(ctx.fileDialog.saveFile).mockResolvedValue('/new/path.json');

        await ctrl.saveFile(true);

        expect(ctx.fileDialog.saveFile).toHaveBeenCalledWith(
            expect.any(String),
            null
        );
    });

    it('saveFile passes currentFilePath when not forceSaveAs', async () => {
        vi.mocked(ctx.fileDialog.openFile).mockResolvedValue({
            path: '/existing/file.json',
            data: '{}',
        });
        await ctrl.openFile();

        vi.mocked(ctx.fileDialog.saveFile).mockResolvedValue('/existing/file.json');
        await ctrl.saveFile();

        expect(ctx.fileDialog.saveFile).toHaveBeenCalledWith(
            expect.any(String),
            '/existing/file.json'
        );
    });
});
