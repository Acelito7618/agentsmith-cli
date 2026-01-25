/**
 * GitHub API Client - Direct repo access without cloning
 * Uses GitHub CLI (gh) for authentication
 */
export interface GitHubFile {
    path: string;
    type: "file" | "dir";
    size?: number;
    sha: string;
}
export interface GitHubRepo {
    owner: string;
    repo: string;
    defaultBranch: string;
    license?: string;
}
export interface GitHubContent {
    path: string;
    content: string;
    size: number;
}
/**
 * Parse GitHub URL into owner/repo
 */
export declare function parseGitHubUrl(url: string): {
    owner: string;
    repo: string;
};
/**
 * GitHub API client using gh CLI for auth
 */
export declare class GitHubClient {
    private owner;
    private repo;
    private verbose;
    constructor(url: string, verbose?: boolean);
    /**
     * Execute a gh api command
     */
    private api;
    /**
     * Get repository metadata
     */
    getRepoInfo(): Promise<GitHubRepo>;
    /**
     * Get the file tree (recursive)
     */
    getTree(branch?: string): Promise<GitHubFile[]>;
    /**
     * Get file content by path
     */
    getFileContent(path: string): Promise<string>;
    /**
     * Get multiple files in parallel
     */
    getFiles(paths: string[]): Promise<Map<string, string>>;
    get fullName(): string;
}
//# sourceMappingURL=index.d.ts.map