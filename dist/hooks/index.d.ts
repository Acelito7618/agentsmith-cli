/**
 * HookRunner - The Enforcer
 * Executes lifecycle hooks at the right moments.
 * "Never send a human to do a machine's job."
 */
export type HookEvent = "pre-commit" | "post-commit" | "pre-push" | "pre-analyze" | "post-generate";
export interface HookResult {
    hook: string;
    success: boolean;
    output?: string;
    error?: string;
}
export declare class HookRunner {
    private rootPath;
    private verbose;
    constructor(rootPath: string, verbose?: boolean);
    /**
     * Execute all hooks for a given event
     */
    execute(event: HookEvent): Promise<HookResult[]>;
    /**
     * Load hooks from .github/hooks/ directory for a specific event
     */
    private loadHooks;
    /**
     * Run a single hook and return the result
     */
    private runHook;
    /**
     * Evaluate a condition string (simple file/command checks)
     */
    private evaluateCondition;
}
//# sourceMappingURL=index.d.ts.map