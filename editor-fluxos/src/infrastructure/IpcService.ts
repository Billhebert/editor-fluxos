import { IpcChannels } from '../shared/IpcChannels';

const { ipcRenderer } = require('electron') as { ipcRenderer: any };

class IpcService {
    private _renderer: any;

    constructor() {
        this._renderer = ipcRenderer;
    }

    async invoke<T = any>(channel: string, ...args: any[]): Promise<T> {
        return this._renderer.invoke(channel, ...args);
    }

    on(channel: string, listener: (...args: any[]) => void): void {
        this._renderer.on(channel, (_event: any, ...args: any[]) => listener(...args));
    }

    removeListener(channel: string, listener: (...args: any[]) => void): void {
        this._renderer.removeListener(channel, listener);
    }

    send(channel: string, ...args: any[]): void {
        this._renderer.send(channel, ...args);
    }

    // === File operations ===
    async openFile(): Promise<{ path: string; data: string } | null> {
        return this.invoke(IpcChannels.OPEN_FILE);
    }

    async saveFile(content: string, filePath: string | null): Promise<string | null> {
        return this.invoke(IpcChannels.SAVE_FILE, { content, filePath });
    }

    // === Schedule operations ===
    async getSchedules(): Promise<any[]> {
        return this.invoke(IpcChannels.GET_SCHEDULES);
    }

    async saveSchedules(schedules: any[]): Promise<void> {
        return this.invoke(IpcChannels.SAVE_SCHEDULES, schedules);
    }

    async updateInstanceStatus(scheduleId: string, instanceId: number, status: string): Promise<void> {
        return this.invoke(IpcChannels.UPDATE_INSTANCE_STATUS, { scheduleId, instanceId, status });
    }

    onScheduleStatusChanged(listener: (schedules: any[]) => void): void {
        this.on(IpcChannels.SCHEDULE_STATUS_CHANGED, listener);
    }

    // === Execution ===
    async executeAction(action: any): Promise<void> {
        return this.invoke(IpcChannels.EXECUTE_ACTION, action);
    }

    async stopExecution(): Promise<void> {
        return this.invoke(IpcChannels.STOP_EXECUTION);
    }

    async findImage(assetId: string, confidence?: number, timeout?: number): Promise<{ x: number; y: number; width: number; height: number; confidence: number } | null> {
        return this.invoke(IpcChannels.FIND_IMAGE, { assetId, confidence, timeout });
    }

    // === Mouse capture ===
    async registerCaptureShortcut(shortcut: string): Promise<void> {
        return this.invoke(IpcChannels.REGISTER_CAPTURE, shortcut);
    }

    async unregisterCaptureShortcut(): Promise<void> {
        return this.invoke(IpcChannels.UNREGISTER_CAPTURE);
    }

    // === Update ===
    async installUpdate(): Promise<void> {
        return this.invoke(IpcChannels.INSTALL_UPDATE);
    }
}

export const ipc = new IpcService();
