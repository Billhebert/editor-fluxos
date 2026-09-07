import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NodeFileSystem } from '../infrastructure/NodeFileSystem';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('NodeFileSystem', () => {
    let fsService: NodeFileSystem;
    let tmpDir: string;

    beforeEach(() => {
        fsService = new NodeFileSystem();
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nfs-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('readFile reads a file', async () => {
        const filePath = path.join(tmpDir, 'test.txt');
        fs.writeFileSync(filePath, 'hello', 'utf-8');

        const content = await fsService.readFile(filePath, 'utf-8');
        expect(content).toBe('hello');
    });

    it('writeFile creates a file', async () => {
        const filePath = path.join(tmpDir, 'out.txt');
        await fsService.writeFile(filePath, 'world', 'utf-8');

        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toBe('world');
    });

    it('writeFile overwrites existing file', async () => {
        const filePath = path.join(tmpDir, 'over.txt');
        fs.writeFileSync(filePath, 'old', 'utf-8');
        await fsService.writeFile(filePath, 'new', 'utf-8');

        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toBe('new');
    });

    it('readFile throws on non-existent file', async () => {
        await expect(fsService.readFile(path.join(tmpDir, 'nope.txt'), 'utf-8')).rejects.toThrow();
    });
});
