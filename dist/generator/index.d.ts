/**
 * Generator - The Replicator
 * Writes SKILL.md files, agent configs, and tool definitions.
 * "More..."
 */
import type { AnalysisResult } from "../analyzer/index.js";
export interface GeneratorResult {
    files: string[];
}
export declare class Generator {
    private rootPath;
    private dryRun;
    private verbose;
    constructor(rootPath: string, dryRun?: boolean, verbose?: boolean);
    generate(analysis: AnalysisResult): Promise<GeneratorResult>;
    private generateSkill;
    private buildSkillMarkdown;
    private getCategoryDescription;
    private generateAgent;
    private buildAgentYaml;
    private generateHook;
    private buildHookYaml;
    private toTitleCase;
}
//# sourceMappingURL=index.d.ts.map