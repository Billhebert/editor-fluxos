import { VariablePoolData } from '../domain/types';

export interface IVariableConfigRepository {
    loadVarConfig(): VariablePoolData;
    saveVarConfig(config: VariablePoolData): void;
    loadVariables(): string[];
    saveVariables(variables: string[]): void;
}
