/**
 * Analyzer - The Mind of Agent Smith
 * Uses GitHub Copilot SDK to perform deep semantic analysis of the repository.
 * "The best thing about being me... there are so many of me."
 */
import type { ScanResult } from "../scanner/index.js";
export interface SkillDefinition {
    name: string;
    description: string;
    sourceDir: string;
    patterns: string[];
    triggers: string[];
    category: string;
    examples: string[];
}
export interface AgentDefinition {
    name: string;
    description: string;
    skills: string[];
    tools: ToolDefinition[];
    isSubAgent: boolean;
    parentAgent?: string;
    subAgents?: string[];
    triggers: string[];
    sourceDir?: string;
}
export interface ToolDefinition {
    name: string;
    command: string;
    description: string;
}
export interface HookDefinition {
    name: string;
    event: "pre-commit" | "post-commit" | "pre-push" | "pre-analyze" | "post-generate";
    description: string;
    commands: string[];
    condition?: string;
}
export interface AnalysisResult {
    skills: SkillDefinition[];
    agents: AgentDefinition[];
    tools: ToolDefinition[];
    hooks: HookDefinition[];
    summary: string;
}
export declare class Analyzer {
    private verbose;
    private client;
    constructor(verbose?: boolean);
    analyze(scanResult: ScanResult): Promise<AnalysisResult>;
    private getSystemPrompt;
    /**
     * Detect domain boundaries from directory structure
     */
    private detectDomainBoundaries;
    private gatherFileSamples;
    private buildAnalysisPrompt;
    private parseAnalysisResponse;
    private extractAllTools;
    private generateFallbackAnalysis;
    private detectToolsFromConfig;
    private generateDefaultHooks;
}
//# sourceMappingURL=index.d.ts.map