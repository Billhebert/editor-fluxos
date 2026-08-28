import { Flow } from '../domain/Flow';
import { VariablePoolData } from '../domain/types';

export interface IFlowRepository {
    findAll(): Promise<Flow[]>;
    findByName(name: string): Promise<Flow | null>;
    save(flow: Flow): Promise<Flow>;
    saveAll(flows: Flow[]): Promise<void>;
    delete(name: string): Promise<void>;
    rename(oldName: string, newName: string): Promise<void>;
    loadVarConfig(): VariablePoolData;
    saveVarConfig(config: VariablePoolData): void;
    loadVariables(): string[];
    saveVariables(variables: string[]): void;
}
