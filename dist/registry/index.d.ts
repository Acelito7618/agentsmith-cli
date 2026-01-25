/**
 * Registry - Skills & Agents Database
 * Builds and searches the JSONL index.
 */
import type { SkillDefinition, AgentDefinition } from "../analyzer/index.js";
export interface RegistryEntry {
    type: "skill" | "agent";
    name: string;
    file: string;
    description: string;
    category?: string;
    triggers: string[];
    parentAgent?: string;
    subAgents?: string[];
    isSubAgent?: boolean;
}
export declare class Registry {
    private rootPath;
    private dryRun;
    private registryPath;
    constructor(rootPath: string, dryRun?: boolean);
    build(skills: SkillDefinition[], agents?: AgentDefinition[]): Promise<void>;
    search(query: string, options?: {
        type?: "skill" | "agent";
        limit?: number;
    }): Promise<RegistryEntry[]>;
    list(): Promise<RegistryEntry[]>;
    get(name: string): Promise<RegistryEntry | null>;
}
//# sourceMappingURL=index.d.ts.map