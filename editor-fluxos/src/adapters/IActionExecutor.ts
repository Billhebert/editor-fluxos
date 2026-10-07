import { RawAction } from '../domain/types';

export interface IActionExecutor {
    execute(action: RawAction, signal?: AbortSignal): Promise<void>;
}
