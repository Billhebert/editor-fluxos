import { IFileDialogService } from '../adapters/IFileDialogService';
import { ipc } from './IpcService';

export class NodeIpcFileDialog implements IFileDialogService {
    async openFile(): Promise<{ path: string; data: string } | null> {
        return ipc.openFile();
    }

    async saveFile(content: string, filePath: string | null): Promise<string | null> {
        return ipc.saveFile(content, filePath);
    }
}
