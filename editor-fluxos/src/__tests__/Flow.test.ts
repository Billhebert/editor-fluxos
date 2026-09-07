import { describe, it, expect } from 'vitest';
import { Flow } from '../domain/Flow';
import { ValidationError } from '../domain/errors';

describe('Flow', () => {
    it('creates a flow with valid name and actions', () => {
        const flow = new Flow('test-flow', ['enter', 'a', 'b']);
        expect(flow.name).toBe('test-flow');
        expect(flow.actions).toEqual(['enter', 'a', 'b']);
        expect(flow.length).toBe(3);
    });

    it('trims whitespace from name', () => {
        const flow = new Flow('  my-flow  ');
        expect(flow.name).toBe('my-flow');
    });

    it('throws ValidationError for empty name', () => {
        expect(() => new Flow('')).toThrow(ValidationError);
        expect(() => new Flow('   ')).toThrow(ValidationError);
    });

    it('throws ValidationError for name > 100 chars', () => {
        expect(() => new Flow('a'.repeat(101))).toThrow(ValidationError);
    });

    it('actions returns a defensive copy', () => {
        const flow = new Flow('test', ['a']);
        const actions = flow.actions;
        actions.push('b');
        expect(flow.length).toBe(1);
    });

    it('addAction appends to actions', () => {
        const flow = new Flow('test');
        flow.addAction('enter');
        flow.addAction({ mouse: 'click', x: 10, y: 20 });
        expect(flow.length).toBe(2);
        expect(flow.actions[1]).toEqual({ mouse: 'click', x: 10, y: 20 });
    });

    it('addActions appends multiple', () => {
        const flow = new Flow('test');
        flow.addActions(['a', 'b', 'c']);
        expect(flow.length).toBe(3);
    });

    it('removeAction removes by index', () => {
        const flow = new Flow('test', ['a', 'b', 'c']);
        flow.removeAction(1);
        expect(flow.actions).toEqual(['a', 'c']);
    });

    it('removeAction throws for out of range', () => {
        const flow = new Flow('test', ['a']);
        expect(() => flow.removeAction(5)).toThrow(ValidationError);
    });

    it('moveAction moves item to new position', () => {
        const flow = new Flow('test', ['a', 'b', 'c', 'd']);
        flow.moveAction(0, 2);
        expect(flow.actions).toEqual(['b', 'c', 'a', 'd']);
    });

    it('insertAction inserts at position', () => {
        const flow = new Flow('test', ['a', 'c']);
        flow.insertAction(1, 'b');
        expect(flow.actions).toEqual(['a', 'b', 'c']);
    });

    it('insertAction throws for out of range', () => {
        const flow = new Flow('test', ['a']);
        expect(() => flow.insertAction(5, 'b')).toThrow(ValidationError);
    });

    it('rename changes the name', () => {
        const flow = new Flow('old-name');
        flow.rename('new-name');
        expect(flow.name).toBe('new-name');
    });

    it('rename throws for invalid name', () => {
        const flow = new Flow('test');
        expect(() => flow.rename('')).toThrow(ValidationError);
    });

    it('clone creates independent copy', () => {
        const flow = new Flow('test', ['a', 'b']);
        const cloned = flow.clone();
        cloned.addAction('c');
        expect(flow.length).toBe(2);
        expect(cloned.length).toBe(3);
    });

    it('toJSON / fromJSON round-trip', () => {
        const flow = new Flow('test', ['a', { delay: 500 }]);
        const json = flow.toJSON();
        const restored = Flow.fromJSON(json);
        expect(restored).not.toBeNull();
        expect(restored!.name).toBe('test');
        expect(restored!.actions).toEqual(['a', { delay: 500 }]);
    });

    it('fromJSON returns null for invalid data', () => {
        expect(Flow.fromJSON(null)).toBeNull();
        expect(Flow.fromJSON({})).toBeNull();
        expect(Flow.fromJSON({ name: 'test' })).toBeNull();
    });

    it('isEmpty returns true for empty flow', () => {
        expect(new Flow('test').isEmpty).toBe(true);
    });

    it('hasVariable returns true when action exists', () => {
        const flow = new Flow('test', ['enter', 'click', 'type']);
        expect(flow.hasVariable('click')).toBe(true);
        expect(flow.hasVariable('enter')).toBe(true);
    });

    it('hasVariable returns false when action does not exist', () => {
        const flow = new Flow('test', ['enter', 'click']);
        expect(flow.hasVariable('type')).toBe(false);
    });

    it('moveAction throws when fromIndex is out of range', () => {
        const flow = new Flow('test', ['a', 'b', 'c']);
        expect(() => flow.moveAction(5, 1)).toThrow(ValidationError);
    });

    it('moveAction throws when toIndex is out of range', () => {
        const flow = new Flow('test', ['a', 'b', 'c']);
        expect(() => flow.moveAction(0, 5)).toThrow(ValidationError);
    });
});
