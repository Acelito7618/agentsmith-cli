/**
 * Remote Analyzer - Analyzes GitHub repos directly without cloning
 * Uses GitHub Copilot SDK with GitHub API for file access
 */
export interface RemoteSkill {
    name: string;
    description: string;
    sourceDir: string;
    patterns: string[];
    triggers: string[];
    category: string;
    examples: string[];
}
export interface RemoteAgent {
    name: string;
    description: string;
    skills: string[];
    tools: {
        name: string;
        command: string;
        description: string;
    }[];
    isSubAgent: boolean;
    parentAgent?: string;
    subAgents?: string[];
    triggers: string[];
    sourceDir?: string;
}
export interface RemoteHook {
    name: string;
    event: "pre-commit" | "post-commit" | "pre-push" | "pre-analyze" | "post-generate";
    description: string;
    commands: string[];
    condition?: string;
}
export interface RemoteAnalysisResult {
    skills: RemoteSkill[];
    agents: RemoteAgent[];
    tools: {
        name: string;
        command: string;
        description: string;
    }[];
    hooks: RemoteHook[];
    summary: string;
    repo: {
        owner: string;
        repo: string;
        license?: string;
        language: string;
        framework?: string;
    };
}
export declare class RemoteAnalyzer {
    private verbose;
    private github;
    constructor(repoUrl: string, verbose?: boolean);
    analyze(): Promise<RemoteAnalysisResult>;
    private detectLanguage;
    private detectFramework;
    private selectPriorityFiles;
    private getSystemPrompt;
    private buildPrompt;
    private parseResponse;
    private extractTools;
    private generateHooks;
    private generateFallback;
    private getDefaultTools;
}
//# sourceMappingURL=remote.d.ts.map