import * as fs from 'fs/promises';
import { IFileSystem } from '../adapters/IFileSystem';

export class NodeFileSystem implements IFileSystem {
    async readFile(path: string, encoding: BufferEncoding): Promise<string> {
        return fs.readFile(path, { encoding });
    }

    async writeFile(path: string, data: string, encoding: BufferEncoding): Promise<void> {
        await fs.writeFile(path, data, { encoding });
    }
}
