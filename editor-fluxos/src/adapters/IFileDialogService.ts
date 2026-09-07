export interface IFileDialogService {
    openFile(): Promise<{ path: string; data: string } | null>;
    saveFile(content: string, filePath: string | null): Promise<string | null>;
}
