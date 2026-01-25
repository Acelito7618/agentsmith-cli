/**
 * Analyzer - The Mind of Agent Smith
 * Uses GitHub Copilot SDK to perform deep semantic analysis of the repository.
 * "The best thing about being me... there are so many of me."
 */

import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import type { ScanResult, FileInfo } from "../scanner/index.js";

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
  parentAgent?: string; // For nested agent hierarchies
  subAgents?: string[]; // Child agents
  triggers: string[];
  sourceDir?: string; // Directory this agent represents
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
  repoName: string;
  skills: SkillDefinition[];
  agents: AgentDefinition[];
  tools: ToolDefinition[];
  hooks: HookDefinition[];
  summary: string;
}

export class Analyzer {
  private verbose: boolean;
  private client: CopilotClient | null = null;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  async analyze(scanResult: ScanResult): Promise<AnalysisResult> {
    // Initialize Copilot SDK
    if (this.verbose) {
      console.log("  [SDK] Initializing CopilotClient...");
    }
    
    this.client = new CopilotClient({
      logLevel: this.verbose ? "debug" : "error",
    });
    
    if (this.verbose) {
      console.log("  [SDK] Starting client...");
    }
    
    try {
      await this.client.start();
    } catch (error) {
      console.error("  [SDK] Failed to start client:", (error as Error).message);
      console.error("  [SDK] Make sure Copilot CLI is installed and in PATH");
      console.error("  [SDK] Falling back to heuristic analysis...\n");
      return this.generateFallbackAnalysis(scanResult);
    }

    if (this.verbose) {
      console.log("  [SDK] Client started successfully");
    }

    try {
      if (this.verbose) {
        console.log("  [SDK] Creating session with model: gpt-5...");
      }
      
      // Create a session with custom tools for analysis
      const session = await this.client.createSession({
        model: "gpt-5",
        streaming: true,
        systemMessage: {
          content: this.getSystemPrompt(scanResult),
        },
      });

      if (this.verbose) {
        console.log("  [SDK] Session created successfully");
      }

      // Prepare file samples for analysis
      const samples = await this.gatherFileSamples(scanResult);
      
      if (this.verbose) {
        console.log(`  [SDK] Gathered ${samples.size} file samples`);
      }

      // Ask Copilot to analyze and extract patterns
      const analysisPrompt = this.buildAnalysisPrompt(scanResult, samples);
      
      if (this.verbose) {
        console.log(`  [SDK] Sending prompt (${analysisPrompt.length} chars)...`);
      }

      let responseContent = "";
      let eventCount = 0;
      
      const done = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error(`\n  [SDK] Timeout after 120s. Events received: ${eventCount}`);
          reject(new Error("SDK timeout"));
        }, 120000);
        
        session.on((event) => {
          eventCount++;
          const eventType = event.type as string;
          const eventData = event.data as Record<string, unknown>;
          
          if (this.verbose && eventType !== "assistant.message_delta") {
            console.log(`  [SDK] Event: ${eventType}`);
          }
          
          if (eventType === "assistant.message") {
            responseContent = (eventData.content as string) || "";
            if (this.verbose) {
              console.log(`  [SDK] Got final message (${responseContent.length} chars)`);
            }
          } else if (eventType === "assistant.message_delta") {
            process.stdout.write((eventData.deltaContent as string) || "");
          } else if (eventType === "session.idle") {
            clearTimeout(timeout);
            if (this.verbose) {
              console.log(`  [SDK] Session idle. Total events: ${eventCount}`);
            }
            resolve();
          } else if (eventType === "error") {
            clearTimeout(timeout);
            console.error("  [SDK] Error event:", eventData);
            reject(new Error("SDK error event"));
          }
        });
      });

      await session.send({ prompt: analysisPrompt });
      
      if (this.verbose) {
        console.log("  [SDK] Prompt sent, waiting for response...");
      }
      
      await done;

      if (this.verbose) {
        console.log("\n");
      }

      // Parse the response
      const result = this.parseAnalysisResponse(responseContent, scanResult);

      await session.destroy();
      return result;
    } catch (error) {
      console.error(`\n  [SDK] Error: ${(error as Error).message}`);
      console.error("  [SDK] Falling back to heuristic analysis...\n");
      return this.generateFallbackAnalysis(scanResult);
    } finally {
      if (this.client) {
        try {
          await this.client.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  private getSystemPrompt(scanResult: ScanResult): string {
    // Detect potential domain boundaries
    const domains = this.detectDomainBoundaries(scanResult);
    const domainHints = domains.length > 0 
      ? `\nPotential domains detected: ${domains.map(d => d.name).join(", ")}` 
      : "";

    return `You are Agent Smith, an AI designed to assimilate repositories into agent hierarchies.

Your task: Analyze this ${scanResult.language} repository and extract:
1. SKILLS - Reusable patterns, conventions, and capabilities specific to parts of this codebase
2. AGENTS - Domain-specific agents with clear responsibilities
3. SUB-AGENTS - Child agents for complex domains (e.g., auth/oauth, auth/rbac under auth)
4. NESTED AGENTS - Multi-level hierarchies for large codebases
5. TOOLS - Commands that can be run (build, test, lint, deploy, etc.)

## Agent Hierarchy Guidelines
- Create a ROOT agent for the overall repository
- Create SUB-AGENTS for major domains (backend, frontend, api, auth, data)
- Create NESTED agents when a domain has sub-domains (api/v1, api/v2, api/graphql)
- Each agent should have 2-5 skills max; split if more are needed
${domainHints}

For each SKILL, identify:
- A kebab-case name (max 64 chars)
- A clear description of when to use it
- The source directory it relates to
- The patterns and conventions it embodies
- Keywords that trigger its relevance
- Category: architecture, reliability, quality, security, or patterns

For AGENTS, determine:
- Natural domain boundaries based on directory structure
- Parent-child relationships (isSubAgent: true for children)
- Which skills each agent owns (skills should not overlap between agents)
- Tools specific to that agent's domain

Respond in valid JSON format only. No markdown, no explanation.`;
  }

  /**
   * Detect domain boundaries from directory structure
   */
  private detectDomainBoundaries(scanResult: ScanResult): Array<{ name: string; path: string; fileCount: number }> {
    const domains: Map<string, { path: string; fileCount: number; subDirs: Set<string> }> = new Map();

    // Common domain patterns
    const domainPatterns = [
      "api", "auth", "backend", "frontend", "core", "common", "shared",
      "services", "handlers", "controllers", "models", "views", "routes",
      "components", "hooks", "utils", "lib", "pkg", "internal", "cmd",
      "client", "server", "admin", "public", "private", "modules"
    ];

    for (const file of scanResult.files) {
      if (file.isTest || file.isConfig) continue;

      const parts = file.relativePath.split(path.sep);
      if (parts.length < 2) continue;

      const topDir = parts[0];
      const secondDir = parts.length > 2 ? parts[1] : null;

      // Track top-level domains
      if (!domains.has(topDir)) {
        domains.set(topDir, { path: topDir, fileCount: 0, subDirs: new Set() });
      }
      const domain = domains.get(topDir)!;
      domain.fileCount++;

      // Track sub-domains
      if (secondDir && domainPatterns.includes(secondDir.toLowerCase())) {
        domain.subDirs.add(secondDir);
      }
    }

    // Filter to significant domains (>5 files) and sort by file count
    return Array.from(domains.entries())
      .filter(([name, info]) => info.fileCount > 5 && domainPatterns.includes(name.toLowerCase()))
      .map(([name, info]) => ({ name, path: info.path, fileCount: info.fileCount }))
      .sort((a, b) => b.fileCount - a.fileCount);
  }

  private async gatherFileSamples(scanResult: ScanResult): Promise<Map<string, string>> {
    const samples = new Map<string, string>();
    const maxSamples = 20;
    const maxFileSize = 10000; // 10KB per file

    // Prioritize: config files, main entry points, key directories
    const priorityFiles = scanResult.files
      .filter((f) => !f.isTest)
      .sort((a, b) => {
        // Config files first
        if (a.isConfig && !b.isConfig) return -1;
        if (!a.isConfig && b.isConfig) return 1;

        // Then by directory depth (shallower = more important)
        const depthA = a.relativePath.split(path.sep).length;
        const depthB = b.relativePath.split(path.sep).length;
        return depthA - depthB;
      })
      .slice(0, maxSamples);

    for (const file of priorityFiles) {
      if (file.size > maxFileSize) continue;

      try {
        const content = await fs.readFile(file.path, "utf-8");
        samples.set(file.relativePath, content.slice(0, maxFileSize));
      } catch {
        // Skip unreadable files
      }
    }

    return samples;
  }

  private buildAnalysisPrompt(scanResult: ScanResult, samples: Map<string, string>): string {
    const fileList = scanResult.files.slice(0, 100).map((f) => f.relativePath).join("\n");

    let sampleContent = "";
    for (const [filePath, content] of samples) {
      sampleContent += `\n--- ${filePath} ---\n${content}\n`;
    }

    return `Analyze this ${scanResult.language} repository.

## Repository Structure
Language: ${scanResult.language}
Framework: ${scanResult.framework || "None"}
Source directories: ${scanResult.sourceDirectories.join(", ")}
Config files: ${scanResult.configFiles.join(", ")}

## File List (first 100)
${fileList}

## File Samples
${sampleContent}

## Instructions
Extract skills, agents (with hierarchy), and tools from this codebase. Return JSON:

{
  "skills": [
    {
      "name": "skill-name",
      "description": "When and how to use this pattern",
      "sourceDir": "src/auth",
      "patterns": ["pattern 1", "pattern 2"],
      "triggers": ["keyword1", "keyword2"],
      "category": "architecture|reliability|quality|security|patterns",
      "examples": ["example code snippet or reference"]
    }
  ],
  "agents": [
    {
      "name": "root",
      "description": "Main agent for the repository",
      "skills": ["overview-skill"],
      "tools": [{"name": "build", "command": "npm run build", "description": "Build the project"}],
      "isSubAgent": false,
      "subAgents": ["backend", "frontend"],
      "sourceDir": "",
      "triggers": ["main", "primary"]
    },
    {
      "name": "backend",
      "description": "Backend domain agent",
      "skills": ["api-patterns", "db-access"],
      "tools": [],
      "isSubAgent": true,
      "parentAgent": "root",
      "subAgents": ["auth"],
      "sourceDir": "src/backend",
      "triggers": ["backend", "server", "api"]
    },
    {
      "name": "auth",
      "description": "Authentication sub-agent",
      "skills": ["oauth-flow"],
      "tools": [],
      "isSubAgent": true,
      "parentAgent": "backend",
      "sourceDir": "src/backend/auth",
      "triggers": ["auth", "login", "oauth"]
    }
  ],
  "summary": "One paragraph describing the repository's architecture and purpose"
}`;
  }

  private parseAnalysisResponse(response: string, scanResult: ScanResult): AnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Flatten nested sub-agents into the agents array
      const flatAgents = this.flattenAgents(parsed.agents || []);

      return {
        repoName: path.basename(scanResult.rootPath),
        skills: parsed.skills || [],
        agents: flatAgents,
        tools: this.extractAllTools(flatAgents),
        hooks: parsed.hooks || this.generateDefaultHooks(scanResult),
        summary: parsed.summary || "",
      };
    } catch (error) {
      // Fallback: generate minimal structure based on scan
      return this.generateFallbackAnalysis(scanResult);
    }
  }

  /**
   * Flatten nested sub-agents into a flat array
   * The SDK may return sub-agents as objects inside parent.subAgents
   * We need them as separate entries in the agents array
   */
  private flattenAgents(agents: unknown[]): AgentDefinition[] {
    const result: AgentDefinition[] = [];

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
      const normalizedAgent: AgentDefinition = {
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
   * Normalize tools to ToolDefinition format
   * SDK may return tools as strings or objects
   */
  private normalizeTools(tools: unknown): ToolDefinition[] {
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

  private extractAllTools(agents: AgentDefinition[]): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    for (const agent of agents) {
      if (agent.tools) {
        tools.push(...agent.tools);
      }
    }
    return tools;
  }

  private generateFallbackAnalysis(scanResult: ScanResult): AnalysisResult {
    // Detect domains for hierarchical agent structure
    const domains = this.detectDomainBoundaries(scanResult);
    
    // Generate basic skills based on detected directories
    const skills: SkillDefinition[] = [];

    for (const dir of scanResult.sourceDirectories) {
      skills.push({
        name: `${dir}-patterns`,
        description: `Patterns and conventions from the ${dir} directory`,
        sourceDir: dir,
        patterns: [],
        triggers: [dir],
        category: "patterns",
        examples: [],
      });
    }

    // Generate tools from config
    const tools: ToolDefinition[] = this.detectToolsFromConfig(scanResult);

    // Build hierarchical agents
    const agents: AgentDefinition[] = [];
    const subAgentNames: string[] = [];

    // Create sub-agents for each detected domain
    for (const domain of domains) {
      const domainSkills = skills.filter(s => s.sourceDir === domain.path || s.sourceDir.startsWith(domain.path + path.sep));
      subAgentNames.push(domain.name);
      
      agents.push({
        name: domain.name,
        description: `Agent for the ${domain.name} domain (${domain.fileCount} files)`,
        skills: domainSkills.map(s => s.name),
        tools: [],
        isSubAgent: true,
        parentAgent: "root",
        sourceDir: domain.path,
        triggers: [domain.name.toLowerCase()],
      });
    }

    // Create root agent
    const rootSkills = skills.filter(s => !domains.some(d => s.sourceDir.startsWith(d.path)));
    agents.unshift({
      name: "root",
      description: `Root agent for this ${scanResult.language} repository`,
      skills: rootSkills.map(s => s.name),
      tools,
      isSubAgent: false,
      subAgents: subAgentNames,
      triggers: [scanResult.language.toLowerCase(), "main", "primary"],
    });

    // Generate hooks
    const hooks = this.generateDefaultHooks(scanResult);

    return {
      repoName: path.basename(scanResult.rootPath),
      skills,
      agents,
      tools,
      hooks,
      summary: `A ${scanResult.language} repository${scanResult.framework ? ` using ${scanResult.framework}` : ""} with ${domains.length} detected domains.`,
    };
  }

  private detectToolsFromConfig(scanResult: ScanResult): ToolDefinition[] {
    const tools: ToolDefinition[] = [];

    // Common tools based on language
    if (scanResult.language === "TypeScript" || scanResult.language === "JavaScript") {
      if (scanResult.configFiles.includes("package.json")) {
        tools.push(
          { name: "install", command: "npm install", description: "Install dependencies" },
          { name: "build", command: "npm run build", description: "Build the project" },
          { name: "test", command: "npm test", description: "Run tests" },
          { name: "lint", command: "npm run lint", description: "Run linter" }
        );
      }
    } else if (scanResult.language === "Python") {
      tools.push(
        { name: "install", command: "pip install -e .", description: "Install dependencies" },
        { name: "test", command: "pytest", description: "Run tests" },
        { name: "lint", command: "ruff check .", description: "Run linter" }
      );
    } else if (scanResult.language === "Go") {
      tools.push(
        { name: "build", command: "go build ./...", description: "Build the project" },
        { name: "test", command: "go test ./...", description: "Run tests" },
        { name: "lint", command: "golangci-lint run", description: "Run linter" }
      );
    }

    return tools;
  }

  private generateDefaultHooks(scanResult: ScanResult): HookDefinition[] {
    const hooks: HookDefinition[] = [];

    // Pre-commit hook: run lint and tests before committing
    if (scanResult.language === "TypeScript" || scanResult.language === "JavaScript") {
      hooks.push({
        name: "pre-commit-quality",
        event: "pre-commit",
        description: "Run linting and type checking before commit",
        commands: ["npm run lint", "npm run build"],
      });

      if (scanResult.testFiles.length > 0) {
        hooks.push({
          name: "pre-push-tests",
          event: "pre-push",
          description: "Run tests before pushing",
          commands: ["npm test"],
        });
      }
    } else if (scanResult.language === "Python") {
      hooks.push({
        name: "pre-commit-quality",
        event: "pre-commit",
        description: "Run linting and formatting before commit",
        commands: ["ruff check .", "ruff format --check ."],
      });

      if (scanResult.testFiles.length > 0) {
        hooks.push({
          name: "pre-push-tests",
          event: "pre-push",
          description: "Run tests before pushing",
          commands: ["pytest"],
        });
      }
    } else if (scanResult.language === "Go") {
      hooks.push({
        name: "pre-commit-quality",
        event: "pre-commit",
        description: "Run linting and formatting before commit",
        commands: ["go fmt ./...", "golangci-lint run"],
      });

      if (scanResult.testFiles.length > 0) {
        hooks.push({
          name: "pre-push-tests",
          event: "pre-push",
          description: "Run tests before pushing",
          commands: ["go test ./..."],
        });
      }
    }

    // Post-generate hook for Agent Smith specific workflow
    hooks.push({
      name: "post-generate-validate",
      event: "post-generate",
      description: "Validate generated agent assets after generation",
      commands: ["npx agentsmith validate"],
    });

    return hooks;
  }
}
