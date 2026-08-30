import { Flow } from '../domain/Flow';

export interface IFlowRepository {
    findAll(): Promise<Flow[]>;
    findByName(name: string): Promise<Flow | null>;
    save(flow: Flow): Promise<Flow>;
    saveAll(flows: Flow[]): Promise<void>;
    delete(name: string): Promise<void>;
    rename(oldName: string, newName: string): Promise<void>;
}
