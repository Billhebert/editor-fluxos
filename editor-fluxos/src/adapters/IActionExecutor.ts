import { RawAction } from '../domain/types';

export interface IActionExecutor {
    execute(action: RawAction): Promise<void>;
}
