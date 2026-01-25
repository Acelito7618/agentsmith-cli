/**
 * Remote Analyzer - Analyzes GitHub repos directly without cloning
 * Uses GitHub Copilot SDK with GitHub API for file access
 */
import { CopilotClient } from "@github/copilot-sdk";
import { GitHubClient } from "../github/index.js";
// Files/dirs to ignore
const IGNORE_PATTERNS = [
    /^node_modules\//,
    /^\.git\//,
    /^dist\//,
    /^build\//,
    /^\.next\//,
    /^coverage\//,
    /^__pycache__\//,
    /^\.venv\//,
    /^venv\//,
    /\.lock$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
];
// Config files to prioritize
const CONFIG_FILES = [
    "package.json",
    "tsconfig.json",
    "pyproject.toml",
    "setup.py",
    "go.mod",
    "Cargo.toml",
    "README.md",
];
export class RemoteAnalyzer {
    verbose;
    github;
    constructor(repoUrl, verbose = false) {
        this.verbose = verbose;
        this.github = new GitHubClient(repoUrl, verbose);
    }
    async analyze() {
        // Get repo info and file tree from GitHub API
        if (this.verbose) {
            console.log(`  [GH] Fetching repo info for ${this.github.fullName}...`);
        }
        const repoInfo = await this.github.getRepoInfo();
        const tree = await this.github.getTree();
        if (this.verbose) {
            console.log(`  [GH] Found ${tree.length} files/dirs`);
        }
        // Filter files
        const files = tree.filter(f => f.type === "file" &&
            !IGNORE_PATTERNS.some(p => p.test(f.path)));
        // Detect language from file extensions
        const language = this.detectLanguage(files);
        const framework = this.detectFramework(files);
        if (this.verbose) {
            console.log(`  [GH] Language: ${language}, Framework: ${framework || "none"}`);
        }
        // Get priority files for analysis
        const priorityPaths = this.selectPriorityFiles(files);
        if (this.verbose) {
            console.log(`  [GH] Fetching ${priorityPaths.length} priority files...`);
        }
        const fileContents = await this.github.getFiles(priorityPaths);
        // Build prompt for Copilot SDK
        const prompt = this.buildPrompt(files, fileContents, language, framework);
        if (this.verbose) {
            console.log(`  [SDK] Prompt size: ${prompt.length} chars`);
        }
        // Analyze with Copilot SDK
        const client = new CopilotClient({
            logLevel: this.verbose ? "debug" : "error",
        });
        try {
            if (this.verbose) {
                console.log("  [SDK] Starting client...");
            }
            await client.start();
            if (this.verbose) {
                console.log("  [SDK] Client started, state:", client.getState());
                console.log("  [SDK] Creating session...");
            }
            const session = await client.createSession({
                model: "gpt-5",
                streaming: true,
                systemMessage: {
                    content: this.getSystemPrompt(),
                },
            });
            if (this.verbose) {
                console.log(`  [SDK] Session created: ${session.sessionId}`);
            }
            let responseContent = "";
            let streamedContent = "";
            let eventCount = 0;
            const done = new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    if (this.verbose) {
                        console.log(`\n  [SDK] Session timeout - using streamed content (${streamedContent.length} chars)`);
                    }
                    resolve();
                }, 120000);
                session.on((event) => {
                    eventCount++;
                    const eventType = event.type;
                    const eventData = event.data;
                    if (eventType === "assistant.message_delta") {
                        const delta = eventData.deltaContent || "";
                        streamedContent += delta;
                        process.stdout.write(delta);
                    }
                    else if (eventType === "assistant.message") {
                        responseContent = eventData.content || "";
                        clearTimeout(timeout);
                        resolve();
                    }
                    else if (eventType === "session.idle") {
                        clearTimeout(timeout);
                        resolve();
                    }
                    else if (eventType === "error") {
                        clearTimeout(timeout);
                        console.error("  [SDK] Error event:", eventData);
                        resolve();
                    }
                });
            });
            if (this.verbose) {
                console.log("  [SDK] Sending prompt...");
            }
            await session.send({ prompt });
            if (this.verbose) {
                console.log("  [SDK] Prompt sent, waiting...");
            }
            await done;
            console.log("\n");
            await session.destroy();
            await client.stop();
            // Use streamed content if no complete message received
            const finalContent = responseContent || streamedContent;
            // Parse response
            return this.parseResponse(finalContent, repoInfo, language, framework, files);
        }
        catch (error) {
            console.error(`  [SDK] Error: ${error.message}`);
            await client.stop().catch(() => { });
            return this.generateFallback(repoInfo, language, framework, files);
        }
    }
    detectLanguage(files) {
        const extCounts = {};
        const extMap = {
            ".ts": "TypeScript",
            ".tsx": "TypeScript",
            ".js": "JavaScript",
            ".jsx": "JavaScript",
            ".py": "Python",
            ".go": "Go",
            ".rs": "Rust",
            ".java": "Java",
            ".cs": "C#",
            ".rb": "Ruby",
        };
        for (const file of files) {
            const ext = "." + file.path.split(".").pop();
            if (extMap[ext]) {
                extCounts[ext] = (extCounts[ext] || 0) + 1;
            }
        }
        let maxCount = 0;
        let lang = "Unknown";
        for (const [ext, count] of Object.entries(extCounts)) {
            if (count > maxCount) {
                maxCount = count;
                lang = extMap[ext];
            }
        }
        // Check for tsconfig to override JS detection
        if (lang === "JavaScript" && files.some(f => f.path.includes("tsconfig"))) {
            lang = "TypeScript";
        }
        return lang;
    }
    detectFramework(files) {
        const paths = new Set(files.map(f => f.path));
        if (paths.has("next.config.js") || paths.has("next.config.mjs"))
            return "Next.js";
        if (paths.has("angular.json"))
            return "Angular";
        if (paths.has("vue.config.js"))
            return "Vue";
        if (paths.has("nuxt.config.ts") || paths.has("nuxt.config.js"))
            return "Nuxt";
        return undefined;
    }
    selectPriorityFiles(files) {
        const maxFiles = 15;
        const maxSize = 50000; // 50KB max per file
        const priority = [];
        // Config files first
        for (const cfg of CONFIG_FILES) {
            const match = files.find(f => f.path === cfg || f.path.endsWith("/" + cfg));
            if (match && (match.size || 0) < maxSize) {
                priority.push(match.path);
            }
        }
        // Then source files by depth (shallower = more important)
        const sourceFiles = files
            .filter(f => !priority.includes(f.path) && (f.size || 0) < maxSize)
            .filter(f => /\.(ts|js|py|go|rs|java)$/.test(f.path))
            .sort((a, b) => a.path.split("/").length - b.path.split("/").length);
        for (const f of sourceFiles) {
            if (priority.length >= maxFiles)
                break;
            priority.push(f.path);
        }
        return priority;
    }
    getSystemPrompt() {
        return `You are Agent Smith, an AI designed to assimilate repositories into agent hierarchies.

Analyze the repository and extract:
1. SKILLS - Reusable patterns and capabilities from part of the codebase
2. AGENTS - Domain-specific agents with responsibilities
3. TOOLS - Commands that can be run (build, test, lint)

Respond in valid JSON only. No markdown.`;
    }
    buildPrompt(files, contents, language, framework) {
        const fileList = files.slice(0, 100).map(f => f.path).join("\n");
        let samples = "";
        for (const [path, content] of contents) {
            if (content) {
                samples += `\n--- ${path} ---\n${content.slice(0, 5000)}\n`;
            }
        }
        return `Analyze this ${language} repository${framework ? ` using ${framework}` : ""}.

## Files (first 100)
${fileList}

## File Contents
${samples}

## Return JSON:
{
  "skills": [{"name": "skill-name", "description": "...", "sourceDir": "src/x", "patterns": [], "triggers": [], "category": "patterns", "examples": []}],
  "agents": [{"name": "root", "description": "...", "skills": [], "tools": [], "isSubAgent": false, "subAgents": [], "triggers": []}],
  "summary": "One paragraph about this repo"
}`;
    }
    parseResponse(response, repo, language, framework, files) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                throw new Error("No JSON");
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                skills: parsed.skills || [],
                agents: parsed.agents || [],
                tools: this.extractTools(parsed.agents || []),
                hooks: this.generateHooks(language),
                summary: parsed.summary || "",
                repo: { ...repo, language, framework },
            };
        }
        catch {
            return this.generateFallback(repo, language, framework, files);
        }
    }
    extractTools(agents) {
        const tools = [];
        for (const agent of agents) {
            if (agent.tools)
                tools.push(...agent.tools);
        }
        return tools;
    }
    generateHooks(language) {
        const hooks = [];
        if (language === "TypeScript" || language === "JavaScript") {
            hooks.push({
                name: "pre-commit-quality",
                event: "pre-commit",
                description: "Run linting before commit",
                commands: ["npm run lint", "npm run build"],
            });
        }
        else if (language === "Python") {
            hooks.push({
                name: "pre-commit-quality",
                event: "pre-commit",
                description: "Run linting before commit",
                commands: ["ruff check .", "ruff format --check ."],
            });
        }
        else if (language === "Go") {
            hooks.push({
                name: "pre-commit-quality",
                event: "pre-commit",
                description: "Run linting before commit",
                commands: ["go fmt ./...", "golangci-lint run"],
            });
        }
        hooks.push({
            name: "post-generate-validate",
            event: "post-generate",
            description: "Validate generated assets",
            commands: ["node dist/main.js validate"],
        });
        return hooks;
    }
    generateFallback(repo, language, framework, files) {
        // Detect source directories
        const srcDirs = new Set();
        for (const f of files) {
            const parts = f.path.split("/");
            if (parts.length > 1 && ["src", "lib", "app", "pkg", "cmd"].includes(parts[0])) {
                srcDirs.add(parts[0]);
            }
        }
        const skills = Array.from(srcDirs).map(dir => ({
            name: `${dir}-patterns`,
            description: `Patterns from the ${dir} directory`,
            sourceDir: dir,
            patterns: [],
            triggers: [dir],
            category: "patterns",
            examples: [],
        }));
        const tools = this.getDefaultTools(language);
        const agents = [{
                name: "root",
                description: `Root agent for ${repo.owner}/${repo.repo}`,
                skills: skills.map(s => s.name),
                tools,
                isSubAgent: false,
                subAgents: [],
                triggers: [language.toLowerCase()],
            }];
        return {
            skills,
            agents,
            tools,
            hooks: this.generateHooks(language),
            summary: `A ${language} repository${framework ? ` using ${framework}` : ""}.`,
            repo: { ...repo, language, framework },
        };
    }
    getDefaultTools(language) {
        if (language === "TypeScript" || language === "JavaScript") {
            return [
                { name: "install", command: "npm install", description: "Install dependencies" },
                { name: "build", command: "npm run build", description: "Build" },
                { name: "test", command: "npm test", description: "Run tests" },
            ];
        }
        else if (language === "Python") {
            return [
                { name: "install", command: "pip install -e .", description: "Install" },
                { name: "test", command: "pytest", description: "Run tests" },
            ];
        }
        else if (language === "Go") {
            return [
                { name: "build", command: "go build ./...", description: "Build" },
                { name: "test", command: "go test ./...", description: "Run tests" },
            ];
        }
        return [];
    }
}
//# sourceMappingURL=remote.js.map