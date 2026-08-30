export const IpcChannels = {
    // File
    OPEN_FILE: 'open-file',
    SAVE_FILE: 'save-file',
    // Menu events (main -> renderer)
    MENU_OPEN: 'menu-open',
    MENU_SAVE: 'menu-save',
    MENU_SAVE_AS: 'menu-save-as',
    // Action execution
    EXECUTE_ACTION: 'execute-action',
    // Mouse capture
    REGISTER_CAPTURE: 'register-capture-shortcut',
    UNREGISTER_CAPTURE: 'unregister-capture-shortcut',
    GET_MOUSE_POSITION: 'get-mouse-position',
    MOUSE_CAPTURED: 'mouse-captured',
    // Schedules
    GET_SCHEDULES: 'get-schedules',
    SAVE_SCHEDULES: 'save-schedules',
    UPDATE_INSTANCE_STATUS: 'update-instance-status',
    STOP_SCHEDULER: 'stop-scheduler',
    // Scheduler events (main -> renderer)
    EXECUTE_SCHEDULED: 'execute-scheduled',
    // Auto-update
    INSTALL_UPDATE: 'install-update',
    CHECK_UPDATES: 'check-updates',
    UPDATE_STATUS: 'update-status',
} as const;

export type IpcChannel = typeof IpcChannels[keyof typeof IpcChannels];
