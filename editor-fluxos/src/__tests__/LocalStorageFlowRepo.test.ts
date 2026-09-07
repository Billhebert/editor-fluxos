// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalStorageFlowRepo } from '../infrastructure/LocalStorageFlowRepo';
import { Flow } from '../domain/Flow';

describe('LocalStorageFlowRepo', () => {
    let repo: LocalStorageFlowRepo;

    beforeEach(() => {
        localStorage.clear();
        repo = new LocalStorageFlowRepo('test_storage_key');
    });

    it('findAll returns empty array when no data', async () => {
        const flows = await repo.findAll();
        expect(flows).toEqual([]);
    });

    it('save and findAll roundtrip', async () => {
        const flow = Flow.fromJSON({ name: 'test', actions: ['a', 'b'] })!;
        await repo.save(flow);

        const flows = await repo.findAll();
        expect(flows).toHaveLength(1);
        expect(flows[0].name).toBe('test');
        expect(flows[0].actions).toEqual(['a', 'b']);
    });

    it('findByName returns flow when exists', async () => {
        const flow = Flow.fromJSON({ name: 'exists', actions: ['x'] })!;
        await repo.save(flow);

        const found = await repo.findByName('exists');
        expect(found).not.toBeNull();
        expect(found!.name).toBe('exists');
    });

    it('findByName returns null when not exists', async () => {
        const found = await repo.findByName('nope');
        expect(found).toBeNull();
    });

    it('saveAll replaces all flows', async () => {
        const f1 = Flow.fromJSON({ name: 'a', actions: ['1'] })!;
        const f2 = Flow.fromJSON({ name: 'b', actions: ['2'] })!;
        await repo.save(f1);
        await repo.save(f2);

        const f3 = Flow.fromJSON({ name: 'c', actions: ['3'] })!;
        await repo.saveAll([f3]);

        const flows = await repo.findAll();
        expect(flows).toHaveLength(1);
        expect(flows[0].name).toBe('c');
    });

    it('delete removes a flow', async () => {
        const flow = Flow.fromJSON({ name: 'del', actions: [] })!;
        await repo.save(flow);
        await repo.delete('del');

        const flows = await repo.findAll();
        expect(flows).toHaveLength(0);
    });

    it('rename changes flow name', async () => {
        const flow = Flow.fromJSON({ name: 'old', actions: ['a'] })!;
        await repo.save(flow);
        await repo.rename('old', 'new');

        const found = await repo.findByName('new');
        expect(found).not.toBeNull();
        expect(found!.name).toBe('new');

        const old = await repo.findByName('old');
        expect(old).toBeNull();
    });

    it('rename throws if new name already exists', async () => {
        const f1 = Flow.fromJSON({ name: 'a', actions: [] })!;
        const f2 = Flow.fromJSON({ name: 'b', actions: [] })!;
        await repo.save(f1);
        await repo.save(f2);

        await expect(repo.rename('a', 'b')).rejects.toThrow('Flow "b" already exists');
    });

    it('loadVarConfig returns default when empty', () => {
        const config = repo.loadVarConfig();
        expect(config).toEqual({ obrigatorias: [], opcionais: [] });
    });

    it('saveVarConfig and loadVarConfig roundtrip', () => {
        const config = { obrigatorias: ['a'], opcionais: ['b', 'c'] };
        repo.saveVarConfig(config);

        const loaded = repo.loadVarConfig();
        expect(loaded).toEqual(config);
    });

    it('loadVariables returns empty array when no data', () => {
        expect(repo.loadVariables()).toEqual([]);
    });

    it('saveVariables and loadVariables roundtrip', () => {
        repo.saveVariables(['x', 'y']);
        expect(repo.loadVariables()).toEqual(['x', 'y']);
    });

    it('handles corrupted JSON in localStorage gracefully', () => {
        localStorage.setItem('test_storage_key', '{bad json');
        localStorage.setItem('fluxos_var_config', 'not json');
        localStorage.setItem('fluxos_variables', 'not json');

        expect(() => repo.findAll()).not.toThrow();
        expect(repo.loadVarConfig()).toEqual({ obrigatorias: [], opcionais: [] });
        expect(repo.loadVariables()).toEqual([]);
    });
});
