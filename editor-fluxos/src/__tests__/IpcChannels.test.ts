import { describe, it, expect } from 'vitest';
import { IpcChannels, IpcChannel } from '../shared/IpcChannels';

describe('IpcChannels', () => {
    it('has all expected channels', () => {
        expect(IpcChannels.OPEN_FILE).toBe('open-file');
        expect(IpcChannels.SAVE_FILE).toBe('save-file');
        expect(IpcChannels.MENU_OPEN).toBe('menu-open');
        expect(IpcChannels.MENU_SAVE).toBe('menu-save');
        expect(IpcChannels.MENU_SAVE_AS).toBe('menu-save-as');
        expect(IpcChannels.EXECUTE_ACTION).toBe('execute-action');
        expect(IpcChannels.REGISTER_CAPTURE).toBe('register-capture-shortcut');
        expect(IpcChannels.UNREGISTER_CAPTURE).toBe('unregister-capture-shortcut');
        expect(IpcChannels.GET_MOUSE_POSITION).toBe('get-mouse-position');
        expect(IpcChannels.MOUSE_CAPTURED).toBe('mouse-captured');
        expect(IpcChannels.GET_SCHEDULES).toBe('get-schedules');
        expect(IpcChannels.SAVE_SCHEDULES).toBe('save-schedules');
        expect(IpcChannels.UPDATE_INSTANCE_STATUS).toBe('update-instance-status');
        expect(IpcChannels.STOP_SCHEDULER).toBe('stop-scheduler');
        expect(IpcChannels.EXECUTE_SCHEDULED).toBe('execute-scheduled');
        expect(IpcChannels.INSTALL_UPDATE).toBe('install-update');
        expect(IpcChannels.CHECK_UPDATES).toBe('check-updates');
        expect(IpcChannels.UPDATE_STATUS).toBe('update-status');
    });

    it('IpcChannel type matches a valid channel', () => {
        const ch: IpcChannel = IpcChannels.OPEN_FILE;
        expect(ch).toBe('open-file');
    });
});
