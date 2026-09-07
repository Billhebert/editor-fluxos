import { RawAction } from '../domain';
import { FlowManager } from '../use-cases/FlowManager';
import { Toast } from './Toast';
import { modalPrompt } from './modals/modalPrompt';

export interface FlowControllerContext {
    flowManager: FlowManager;
    fluxosCache: Record<string, RawAction[]>;
    refreshCache(): Promise<void>;
    renderAll(): Promise<void>;
    recordingOpen(name: string): void;
    executeFlow(name: string, actions: RawAction[]): void;
}

export class FlowController {
    private _ctx: FlowControllerContext;

    constructor(ctx: FlowControllerContext) {
        this._ctx = ctx;
    }

    async addNew(): Promise<void> {
        const name = await modalPrompt('Nome do novo fluxo:', 'novo_fluxo');
        if (!name) return;
        try {
            await this._ctx.flowManager.createFlow(name);
            await this._ctx.renderAll();
        } catch (err: any) {
            Toast.error(err.message || 'Erro ao criar fluxo');
        }
    }

    async remove(name: string): Promise<void> {
        if (!confirm(`Remover fluxo "${name}"?`)) return;
        try {
            await this._ctx.flowManager.deleteFlow(name);
            await this._ctx.renderAll();
            Toast.info('Fluxo removido');
        } catch (err: any) {
            Toast.error(err.message || 'Erro ao remover fluxo');
        }
    }

    async rename(oldName: string, newName: string): Promise<void> {
        newName = newName.trim();
        if (!newName || newName === oldName) return;
        try {
            await this._ctx.flowManager.renameFlow(oldName, newName);
            await this._ctx.renderAll();
        } catch (err: any) {
            Toast.error(err.message || 'Erro ao renomear fluxo');
        }
    }

    async removeAction(flowName: string, index: number): Promise<void> {
        try {
            await this._ctx.flowManager.removeAction(flowName, index);
            await this._ctx.renderAll();
        } catch (err: any) {
            Toast.error(err.message || 'Erro ao remover acao');
        }
    }

    async moveAction(flowName: string, fromIndex: number, toIndex: number): Promise<void> {
        try {
            await this._ctx.flowManager.moveAction(flowName, fromIndex, toIndex);
            await this._ctx.renderAll();
        } catch (err: any) {
            Toast.error(err.message || 'Erro ao mover acao');
        }
    }

    renderAllCallbacks() {
        return {
            onRecord: (name: string) => this._ctx.recordingOpen(name),
            onExecute: (name: string, actions: RawAction[]) => this._ctx.executeFlow(name, actions),
            onRemove: (name: string) => this.remove(name),
            onRename: (oldName: string, newName: string) => this.rename(oldName, newName),
            onRemoveAction: (flowName: string, index: number) => this.removeAction(flowName, index),
            onMoveAction: (flowName: string, from: number, to: number) => this.moveAction(flowName, from, to),
        };
    }
}
