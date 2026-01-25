/**
 * GitHub API Client - Direct repo access without cloning
 * Uses GitHub CLI (gh) for authentication
 */
import { execSync } from "child_process";
/**
 * Parse GitHub URL into owner/repo
 */
export function parseGitHubUrl(url) {
    // Handle various formats:
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git
    // owner/repo
    let owner;
    let repo;
    if (url.includes("github.com")) {
        const match = url.match(/github\.com[/:]([\w-]+)\/([\w.-]+)/);
        if (!match)
            throw new Error(`Invalid GitHub URL: ${url}`);
        owner = match[1];
        repo = match[2].replace(/\.git$/, "");
    }
    else if (url.includes("/")) {
        [owner, repo] = url.split("/");
    }
    else {
        throw new Error(`Invalid GitHub URL: ${url}`);
    }
    return { owner, repo };
}
/**
 * GitHub API client using gh CLI for auth
 */
export class GitHubClient {
    owner;
    repo;
    verbose;
    constructor(url, verbose = false) {
        const { owner, repo } = parseGitHubUrl(url);
        this.owner = owner;
        this.repo = repo;
        this.verbose = verbose;
    }
    /**
     * Execute a gh api command
     */
    api(endpoint) {
        const cmd = `gh api repos/${this.owner}/${this.repo}${endpoint}`;
        if (this.verbose) {
            console.log(`  [GH] ${cmd}`);
        }
        return execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    }
    /**
     * Get repository metadata
     */
    async getRepoInfo() {
        const data = JSON.parse(this.api(""));
        return {
            owner: this.owner,
            repo: this.repo,
            defaultBranch: data.default_branch,
            license: data.license?.spdx_id,
        };
    }
    /**
     * Get the file tree (recursive)
     */
    async getTree(branch) {
        const ref = branch || (await this.getRepoInfo()).defaultBranch;
        const data = JSON.parse(this.api(`/git/trees/${ref}?recursive=1`));
        return data.tree
            .filter((item) => item.type === "blob" || item.type === "tree")
            .map((item) => ({
            path: item.path,
            type: item.type === "blob" ? "file" : "dir",
            size: item.size,
            sha: item.sha,
        }));
    }
    /**
     * Get file content by path
     */
    async getFileContent(path) {
        try {
            const data = JSON.parse(this.api(`/contents/${encodeURIComponent(path)}`));
            if (data.encoding === "base64") {
                return Buffer.from(data.content, "base64").toString("utf-8");
            }
            return data.content || "";
        }
        catch (error) {
            if (this.verbose) {
                console.log(`  [GH] Failed to fetch ${path}: ${error.message}`);
            }
            return "";
        }
    }
    /**
     * Get multiple files in parallel
     */
    async getFiles(paths) {
        const results = new Map();
        // Fetch in batches of 10 to avoid rate limits
        const batchSize = 10;
        for (let i = 0; i < paths.length; i += batchSize) {
            const batch = paths.slice(i, i + batchSize);
            const contents = await Promise.all(batch.map(p => this.getFileContent(p)));
            batch.forEach((p, idx) => results.set(p, contents[idx]));
        }
        return results;
    }
    get fullName() {
        return `${this.owner}/${this.repo}`;
    }
}
//# sourceMappingURL=index.js.map