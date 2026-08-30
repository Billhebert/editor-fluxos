export interface IFileSystem {
    readFile(path: string, encoding: BufferEncoding): Promise<string>;
    writeFile(path: string, data: string, encoding: BufferEncoding): Promise<void>;
}
