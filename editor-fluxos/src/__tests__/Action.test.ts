import { describe, it, expect } from 'vitest';
import { Action, ActionTypes, ActionType } from '../domain/Action';
import { RawAction } from '../domain/types';

describe('ActionTypes', () => {
    it('has correct constant values', () => {
        expect(ActionTypes.KEY).toBe('key');
        expect(ActionTypes.MOUSE).toBe('mouse');
        expect(ActionTypes.DELAY).toBe('delay');
        expect(ActionTypes.TEXT).toBe('text');
        expect(ActionTypes.HOTKEY).toBe('hotkey');
        expect(ActionTypes.CLICK_IMAGE).toBe('click-image');
        expect(ActionTypes.IF_IMAGE).toBe('if-image');
        expect(ActionTypes.OBRIGATORIO).toBe('ITEM_OBRIGATORIO');
        expect(ActionTypes.OPCIONAL).toBe('ITEM_OPCIONAL');
    });
});

describe('Action', () => {
    describe('constructor and getters', () => {
        it('creates key action', () => {
            const a = new Action(ActionTypes.KEY, { type: 'key', key: 'enter' });
            expect(a.type).toBe('key');
            expect(a.isKey).toBe(true);
            expect(a.isMouse).toBe(false);
            expect(a.isDelay).toBe(false);
            expect(a.isText).toBe(false);
            expect(a.isObrigatorio).toBe(false);
            expect(a.isOpcional).toBe(false);
            expect(a.isVariable).toBe(false);
        });

        it('creates mouse action', () => {
            const raw: RawAction = { type: 'mouse', mouse: 'click', x: 10, y: 20 };
            const a = new Action(ActionTypes.MOUSE, raw);
            expect(a.isMouse).toBe(true);
            expect(a.raw).toBe(raw);
        });

        it('creates delay action', () => {
            const a = new Action(ActionTypes.DELAY, { type: 'delay', delay: 500 });
            expect(a.isDelay).toBe(true);
        });

        it('creates text action', () => {
            const a = new Action(ActionTypes.TEXT, { type: 'text', text: 'hello' });
            expect(a.isText).toBe(true);
        });

        it('creates obrigatorio action', () => {
            const a = new Action(ActionTypes.OBRIGATORIO, 'ITEM_OBRIGATORIO');
            expect(a.isObrigatorio).toBe(true);
            expect(a.isVariable).toBe(true);
        });

        it('creates opcional action', () => {
            const a = new Action(ActionTypes.OPCIONAL, 'ITEM_OPCIONAL');
            expect(a.isOpcional).toBe(true);
            expect(a.isVariable).toBe(true);
        });

        it('toRaw returns raw', () => {
            const a = new Action(ActionTypes.KEY, { type: 'key', key: 'space' });
            expect(a.toRaw()).toEqual({ type: 'key', key: 'space' });
        });
    });

    describe('parse', () => {
        it('parses ITEM_OBRIGATORIO', () => {
            const a = Action.parse('ITEM_OBRIGATORIO');
            expect(a.type).toBe(ActionTypes.OBRIGATORIO);
            expect(a.raw).toBe('ITEM_OBRIGATORIO');
        });

        it('parses ITEM_OPCIONAL', () => {
            const a = Action.parse('ITEM_OPCIONAL');
            expect(a.type).toBe(ActionTypes.OPCIONAL);
            expect(a.raw).toBe('ITEM_OPCIONAL');
        });

        it('parses legacy mouse action', () => {
            const raw: RawAction = { mouse: 'click', x: 100, y: 200 };
            const a = Action.parse(raw);
            expect(a.type).toBe(ActionTypes.MOUSE);
            expect(a.raw).toEqual({ type: 'mouse', mouse: 'click', x: 100, y: 200 });
        });

        it('parses structured mouse action', () => {
            const raw: RawAction = { type: 'mouse', mouse: 'click', x: 100, y: 200 };
            const a = Action.parse(raw);
            expect(a.type).toBe(ActionTypes.MOUSE);
            expect(a.raw).toBe(raw);
        });

        it('parses delay action', () => {
            const a = Action.parse({ delay: 1000 });
            expect(a.type).toBe(ActionTypes.DELAY);
            expect(a.raw).toEqual({ type: 'delay', delay: 1000 });
        });

        it('parses known key string as key action', () => {
            const a = Action.parse('enter');
            expect(a.type).toBe(ActionTypes.KEY);
            expect(a.raw).toEqual({ type: 'key', key: 'enter' });
        });

        it('parses unknown string as text action', () => {
            const a = Action.parse('hello world');
            expect(a.type).toBe(ActionTypes.TEXT);
            expect(a.raw).toEqual({ type: 'text', text: 'hello world' });
        });

        it('parses unknown object as text', () => {
            const a = Action.parse({ unknown: 'thing' });
            expect(a.type).toBe(ActionTypes.TEXT);
            expect(a.raw).toEqual({ type: 'text', text: '[object Object]' });
        });

        it('parses number as text', () => {
            const a = Action.parse(42 as any);
            expect(a.type).toBe(ActionTypes.TEXT);
            expect(a.raw).toEqual({ type: 'text', text: '42' });
        });

        it('parses null as text', () => {
            const a = Action.parse(null as any);
            expect(a.type).toBe(ActionTypes.TEXT);
        });

        it('parses if-image action', () => {
            const raw: RawAction = { type: 'if-image', assetId: 'btn', then: ['enter'], else: [] };
            const a = Action.parse(raw);
            expect(a.type).toBe(ActionTypes.IF_IMAGE);
            expect(a.isIfImage).toBe(true);
        });
    });

    describe('parseAll', () => {
        it('parses array of actions', () => {
            const raws: RawAction[] = ['enter', { mouse: 'click', x: 0, y: 0 }, { delay: 100 }];
            const actions = Action.parseAll(raws);
            expect(actions).toHaveLength(3);
            expect(actions[0].type).toBe(ActionTypes.KEY);
            expect(actions[1].type).toBe(ActionTypes.MOUSE);
            expect(actions[2].type).toBe(ActionTypes.DELAY);
        });

        it('returns empty array for empty input', () => {
            expect(Action.parseAll([])).toEqual([]);
        });
    });
});
