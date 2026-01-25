/**
 * Remote Analyzer - Analyzes GitHub repos directly without cloning
 * Uses GitHub Copilot SDK with GitHub API for file access
 */

import { CopilotClient } from "@github/copilot-sdk";
import { GitHubClient, GitHubFile } from "../github/index.js";

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
  tools: { name: string; command: string; description: string }[];
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
  tools: { name: string; command: string; description: string }[];
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
  private verbose: boolean;
  private github: GitHubClient;

  constructor(repoUrl: string, verbose = false) {
    this.verbose = verbose;
    this.github = new GitHubClient(repoUrl, verbose);
  }

  async analyze(): Promise<RemoteAnalysisResult> {
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
    const files = tree.filter(f => 
      f.type === "file" && 
      !IGNORE_PATTERNS.some(p => p.test(f.path))
    );

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
      
      const done = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.verbose) {
            console.log(`\n  [SDK] Session timeout - using streamed content (${streamedContent.length} chars)`);
          }
          resolve();
        }, 120000);

        session.on((event) => {
          eventCount++;
          const eventType = event.type as string;
          const eventData = event.data as Record<string, unknown>;

          if (eventType === "assistant.message_delta") {
            const delta = (eventData.deltaContent as string) || "";
            streamedContent += delta;
            process.stdout.write(delta);
          } else if (eventType === "assistant.message") {
            responseContent = (eventData.content as string) || "";
            clearTimeout(timeout);
            resolve();
          } else if (eventType === "session.idle") {
            clearTimeout(timeout);
            resolve();
          } else if (eventType === "error") {
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

    } catch (error) {
      console.error(`  [SDK] Error: ${(error as Error).message}`);
      await client.stop().catch(() => {});
      return this.generateFallback(repoInfo, language, framework, files);
    }
  }

  private detectLanguage(files: GitHubFile[]): string {
    const extCounts: Record<string, number> = {};
    const extMap: Record<string, string> = {
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

  private detectFramework(files: GitHubFile[]): string | undefined {
    const paths = new Set(files.map(f => f.path));
    
    if (paths.has("next.config.js") || paths.has("next.config.mjs")) return "Next.js";
    if (paths.has("angular.json")) return "Angular";
    if (paths.has("vue.config.js")) return "Vue";
    if (paths.has("nuxt.config.ts") || paths.has("nuxt.config.js")) return "Nuxt";
    
    return undefined;
  }

  private selectPriorityFiles(files: GitHubFile[]): string[] {
    const maxFiles = 15;
    const maxSize = 50000; // 50KB max per file
    
    const priority: string[] = [];
    
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
      if (priority.length >= maxFiles) break;
      priority.push(f.path);
    }

    return priority;
  }

  private getSystemPrompt(): string {
    return `You are Agent Smith, an AI designed to assimilate repositories into agent hierarchies.

Analyze the repository and extract:
1. SKILLS - Reusable patterns and capabilities (aim for 5-15 skills per repo)
2. AGENTS - A root agent plus NESTED SUB-AGENTS for each major domain/directory
3. SUB-AGENTS - Always extract 2-7 sub-agents based on directory structure or domain boundaries
4. TOOLS - Commands that can be run (build, test, lint)

CRITICAL: Sub-agents must be nested objects inside the parent's subAgents array, not just names.
Each sub-agent needs: name, description, skills, tools, isSubAgent=true, triggers.

Respond in valid JSON only. No markdown, no explanation.`;
  }

  private buildPrompt(
    files: GitHubFile[], 
    contents: Map<string, string>,
    language: string,
    framework?: string
  ): string {
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

## Instructions
Extract 5-15 skills and create a hierarchical agent structure with nested sub-agents.
Look at directory structure and create sub-agents for major domains (cmd, api, internal, lib, etc.)

## Return JSON (sub-agents as NESTED OBJECTS, not strings):
{
  "skills": [
    {"name": "skill-name", "description": "...", "sourceDir": "src/x", "patterns": ["pattern 1"], "triggers": ["keyword"], "category": "patterns", "examples": ["code example"]}
  ],
  "agents": [
    {
      "name": "root",
      "description": "Main orchestrator for this repo",
      "skills": ["skill-1", "skill-2"],
      "tools": ["go build ./...", "npm test"],
      "isSubAgent": false,
      "subAgents": [
        {
          "name": "cli-agent",
          "description": "Handles CLI commands",
          "skills": ["cli-patterns"],
          "tools": ["./cmd/app help"],
          "isSubAgent": true,
          "triggers": ["cmd", "cli", "commands"]
        },
        {
          "name": "api-agent", 
          "description": "Handles API endpoints",
          "skills": ["api-patterns"],
          "tools": ["curl localhost:8080/health"],
          "isSubAgent": true,
          "triggers": ["api", "http", "endpoints"]
        }
      ],
      "triggers": ["main", "root", "${language.toLowerCase()}"]
    }
  ],
  "summary": "One paragraph about this repo"
}`;
  }

  private parseResponse(
    response: string,
    repo: { owner: string; repo: string; license?: string },
    language: string,
    framework: string | undefined,
    files: GitHubFile[]
  ): RemoteAnalysisResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON");

      const parsed = JSON.parse(jsonMatch[0]);

      // Flatten nested sub-agents into the agents array
      const flatAgents = this.flattenAgents(parsed.agents || []);

      return {
        skills: parsed.skills || [],
        agents: flatAgents,
        tools: this.extractTools(flatAgents),
        hooks: this.generateHooks(language),
        summary: parsed.summary || "",
        repo: { ...repo, language, framework },
      };
    } catch {
      return this.generateFallback(repo, language, framework, files);
    }
  }

  /**
   * Flatten nested sub-agents into a flat array.
   * The SDK may return sub-agents as objects inside parent.subAgents[].
   * We need them as separate entries in the agents array.
   */
  private flattenAgents(agents: unknown[]): RemoteAgent[] {
    const result: RemoteAgent[] = [];

    for (const rawAgent of agents) {
      if (!rawAgent || typeof rawAgent !== "object") continue;
      
      const agent = rawAgent as Record<string, unknown>;
      
      // Extract nested sub-agent objects
      const nestedSubAgents: unknown[] = [];
      const subAgentNames: string[] = [];

      const subAgentsArray = agent.subAgents as unknown[];
      if (Array.isArray(subAgentsArray) && subAgentsArray.length > 0) {
        for (const subAgent of subAgentsArray) {
          if (typeof subAgent === "object" && subAgent !== null && "name" in subAgent) {
            // It's a nested agent object - extract it
            const nestedAgent = subAgent as Record<string, unknown>;
            nestedAgent.isSubAgent = true;
            nestedAgent.parentAgent = agent.name as string;
            nestedSubAgents.push(nestedAgent);
            subAgentNames.push(nestedAgent.name as string);
          } else if (typeof subAgent === "string") {
            // It's just a name reference
            subAgentNames.push(subAgent);
          }
        }
      }

      // Build normalized agent
      const normalizedAgent: RemoteAgent = {
        name: String(agent.name || "unknown"),
        description: String(agent.description || ""),
        skills: Array.isArray(agent.skills) ? agent.skills.map(s => String(s)) : [],
        tools: this.normalizeTools(agent.tools),
        isSubAgent: Boolean(agent.isSubAgent),
        parentAgent: agent.parentAgent ? String(agent.parentAgent) : undefined,
        subAgents: subAgentNames.length > 0 ? subAgentNames : undefined,
        triggers: Array.isArray(agent.triggers) ? agent.triggers.map(t => String(t)) : [],
        sourceDir: agent.sourceDir ? String(agent.sourceDir) : undefined,
      };

      result.push(normalizedAgent);

      // Recursively flatten any nested sub-agents
      if (nestedSubAgents.length > 0) {
        result.push(...this.flattenAgents(nestedSubAgents));
      }
    }

    return result;
  }

  /**
   * Normalize tools to standard format.
   * SDK may return tools as strings or objects.
   */
  private normalizeTools(tools: unknown): { name: string; command: string; description: string }[] {
    if (!tools || !Array.isArray(tools)) {
      return [];
    }

    return tools.map((tool) => {
      if (typeof tool === "string") {
        return {
          name: tool.split(" ")[0],
          command: tool,
          description: tool,
        };
      }
      if (typeof tool === "object" && tool !== null) {
        const t = tool as Record<string, unknown>;
        return {
          name: String(t.name || "unknown"),
          command: String(t.command || t.name || ""),
          description: String(t.description || t.name || ""),
        };
      }
      return {
        name: "unknown",
        command: String(tool),
        description: String(tool),
      };
    });
  }

  private extractTools(agents: RemoteAgent[]): { name: string; command: string; description: string }[] {
    const tools: { name: string; command: string; description: string }[] = [];
    for (const agent of agents) {
      if (agent.tools) tools.push(...agent.tools);
    }
    return tools;
  }

  private generateHooks(language: string): RemoteHook[] {
    const hooks: RemoteHook[] = [];

    if (language === "TypeScript" || language === "JavaScript") {
      hooks.push({
        name: "pre-commit-quality",
        event: "pre-commit",
        description: "Run linting before commit",
        commands: ["npm run lint", "npm run build"],
      });
    } else if (language === "Python") {
      hooks.push({
        name: "pre-commit-quality",
        event: "pre-commit",
        description: "Run linting before commit",
        commands: ["ruff check .", "ruff format --check ."],
      });
    } else if (language === "Go") {
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
      commands: ["npx agentsmith validate"],
    });

    return hooks;
  }

  private generateFallback(
    repo: { owner: string; repo: string; license?: string },
    language: string,
    framework: string | undefined,
    files: GitHubFile[]
  ): RemoteAnalysisResult {
    // Detect source directories
    const srcDirs = new Set<string>();
    for (const f of files) {
      const parts = f.path.split("/");
      if (parts.length > 1 && ["src", "lib", "app", "pkg", "cmd"].includes(parts[0])) {
        srcDirs.add(parts[0]);
      }
    }

    const skills: RemoteSkill[] = Array.from(srcDirs).map(dir => ({
      name: `${dir}-patterns`,
      description: `Patterns from the ${dir} directory`,
      sourceDir: dir,
      patterns: [],
      triggers: [dir],
      category: "patterns",
      examples: [],
    }));

    const tools = this.getDefaultTools(language);

    const agents: RemoteAgent[] = [{
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

  private getDefaultTools(language: string): { name: string; command: string; description: string }[] {
    if (language === "TypeScript" || language === "JavaScript") {
      return [
        { name: "install", command: "npm install", description: "Install dependencies" },
        { name: "build", command: "npm run build", description: "Build" },
        { name: "test", command: "npm test", description: "Run tests" },
      ];
    } else if (language === "Python") {
      return [
        { name: "install", command: "pip install -e .", description: "Install" },
        { name: "test", command: "pytest", description: "Run tests" },
      ];
    } else if (language === "Go") {
      return [
        { name: "build", command: "go build ./...", description: "Build" },
        { name: "test", command: "go test ./...", description: "Run tests" },
      ];
    }
    return [];
  }
}
