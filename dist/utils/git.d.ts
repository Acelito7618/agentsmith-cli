/**
 * Git utilities for cloning repositories
 */
export interface CloneResult {
    path: string;
    isTemporary: boolean;
    cleanup: () => Promise<void>;
}
/**
 * Check if a string is a GitHub URL
 */
export declare function isGitHubUrl(input: string): boolean;
/**
 * Normalize a GitHub URL to https format
 */
export declare function normalizeGitHubUrl(input: string): string;
/**
 * Extract repo name from GitHub URL
 */
export declare function getRepoName(url: string): string;
/**
 * Clone a GitHub repository to a temporary directory
 */
export declare function cloneRepo(url: string): Promise<CloneResult>;
/**
 * Resolve input to a local path, cloning if necessary
 */
export declare function resolveInput(input: string): Promise<CloneResult>;
//# sourceMappingURL=git.d.ts.map