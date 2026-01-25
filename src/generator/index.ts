/**
 * Generator - The Replicator
 * Writes SKILL.md files and a single .agent.md for VS Code.
 * "More..."
 */

import fs from "fs/promises";
import path from "path";
import type { AnalysisResult, SkillDefinition, AgentDefinition, HookDefinition } from "../analyzer/index.js";

export interface GeneratorResult {
  files: string[];
}

export class Generator {
  private rootPath: string;
  private dryRun: boolean;
  private verbose: boolean;

  constructor(rootPath: string, dryRun = false, verbose = false) {
    this.rootPath = rootPath;
    this.dryRun = dryRun;
    this.verbose = verbose;
  }

  async generate(analysis: AnalysisResult): Promise<GeneratorResult> {
    const files: string[] = [];

    // Create .github/skills/ and .github/agents/ directories
    const skillsDir = path.join(this.rootPath, ".github", "skills");
    const agentsDir = path.join(this.rootPath, ".github", "agents");
    const hooksDir = path.join(this.rootPath, ".github", "hooks");

    if (!this.dryRun) {
      await fs.mkdir(skillsDir, { recursive: true });
      await fs.mkdir(agentsDir, { recursive: true });
      await fs.mkdir(hooksDir, { recursive: true });
    }

    // Generate SKILL.md for each skill
    for (const skill of analysis.skills) {
      const skillPath = await this.generateSkill(skill, skillsDir);
      files.push(skillPath);
    }

    // Generate a SINGLE .agent.md file for the repo (VS Code custom agent)
    // All the domain knowledge goes into skills, not separate agents
    const agentPath = await this.generateMainAgent(analysis, agentsDir);
    files.push(agentPath);

    // Generate hook.yaml for each hook
    for (const hook of analysis.hooks) {
      const hookPath = await this.generateHook(hook, hooksDir);
      files.push(hookPath);
    }

    return { files };
  }

  private async generateSkill(skill: SkillDefinition, skillsDir: string): Promise<string> {
    const skillDir = path.join(skillsDir, skill.name);
    const skillFile = path.join(skillDir, "SKILL.md");
    const relativePath = `.github/skills/${skill.name}/SKILL.md`;

    const content = this.buildSkillMarkdown(skill);

    if (!this.dryRun) {
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(skillFile, content, "utf-8");
    }

    return relativePath;
  }

  private buildSkillMarkdown(skill: SkillDefinition): string {
    const patterns = skill.patterns.length > 0
      ? skill.patterns.map((p) => `- ${p}`).join("\n")
      : "- Patterns extracted from codebase analysis";

    const examples = skill.examples.length > 0
      ? skill.examples.map((e) => `\`\`\`\n${e}\n\`\`\``).join("\n\n")
      : "See source files in the repository for examples.";

    return `---
name: ${this.quoteYamlValue(skill.name)}
description: ${this.quoteYamlValue(skill.description)}
---

# ${this.toTitleCase(skill.name)}

${skill.description}

## When to Use

Use this skill when:

- Working with code in \`${skill.sourceDir}/\`
${skill.triggers.map((t) => `- User mentions "${t}"`).join("\n")}

## Patterns

${patterns}

## Examples

${examples}

## Category

**${skill.category}** - ${this.getCategoryDescription(skill.category)}
`;
  }

  /**
   * Quote a YAML value if it contains special characters
   */
  private quoteYamlValue(value: string): string {
    // Quote if contains: colon followed by space, leading/trailing whitespace, 
    // or special YAML characters
    if (/[:#{}[\]&*?|>!%@`]/.test(value) || value.startsWith("'") || value.startsWith('"')) {
      // Escape internal double quotes and wrap in double quotes
      return `"${this.escapeYamlString(value)}"`;
    }
    return value;
  }

  /**
   * Escape a string for use inside YAML double quotes
   */
  private escapeYamlString(value: string): string {
    return value
      .replace(/\\/g, "\\\\")  // Escape backslashes first
      .replace(/"/g, '\\"');   // Escape double quotes
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      architecture: "Structural patterns and system design",
      reliability: "Error handling, recovery, and fault tolerance",
      quality: "Testing, validation, and code quality",
      security: "Authentication, authorization, and data protection",
      patterns: "Common code patterns and conventions",
    };
    return descriptions[category] || "General patterns";
  }

  /**
   * Generate ONE main .agent.md file for the entire repo
   * This is the VS Code custom agent format
   * @see https://code.visualstudio.com/docs/copilot/customization/custom-agents
   */
  private async generateMainAgent(analysis: AnalysisResult, agentsDir: string): Promise<string> {
    // Use repo name from analysis (not output directory)
    const agentName = analysis.repoName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "repo";
    const mdFile = path.join(agentsDir, `${agentName}.agent.md`);
    const relativePath = `.github/agents/${agentName}.agent.md`;

    const content = this.buildMainAgentMd(analysis, agentName);

    if (!this.dryRun) {
      await fs.writeFile(mdFile, content, "utf-8");
    }

    return relativePath;
  }

  /**
   * Build the main .agent.md content
   * Single agent that knows about all skills in the repo
   */
  private buildMainAgentMd(analysis: AnalysisResult, agentName: string): string {
    // Get root agent info if available
    const rootAgent = analysis.agents.find(a => !a.isSubAgent);
    const description = rootAgent?.description || analysis.summary || "AI assistant for this repository";
    
    // Collect all tools from all agents
    const allTools = new Set<string>();
    for (const agent of analysis.agents) {
      for (const tool of agent.tools) {
        allTools.add(tool.command);
      }
    }

    // VS Code built-in tools - comprehensive set for full agent capability
    const vsCodeTools = [
      "codebase",        // Semantic code search
      "textSearch",      // Find text in files  
      "fileSearch",      // Search files by glob
      "readFile",        // Read file content
      "listDirectory",   // List directory contents
      "usages",          // Find references/implementations
      "problems",        // Workspace issues
      "fetch",           // Fetch web pages
      "githubRepo",      // Search GitHub repos
      "editFiles",       // Apply edits to files
      "createFile",      // Create new files
      "createDirectory", // Create directories
      "runInTerminal",   // Run shell commands
      "terminalLastCommand", // Get last terminal output
      "changes",         // Source control changes
    ];

    const toolsList = `tools: [${vsCodeTools.map(t => `'${t}'`).join(", ")}]`;

    // Build skills section - link to all generated skills
    const skillsSection = analysis.skills.length > 0
      ? analysis.skills.map(s => `- [${this.toTitleCase(s.name)}](../skills/${s.name}/SKILL.md): ${s.description}`).join("\n")
      : "No specific skills documented yet.";

    // Build commands section from detected tools
    const commandsSection = allTools.size > 0
      ? Array.from(allTools).map(cmd => `- \`${cmd}\``).join("\n")
      : "- `npm install` / `pip install` / `go build` (as appropriate)";

    return `---
name: ${this.toTitleCase(agentName)}
description: ${this.quoteYamlValue(description)}
${toolsList}
---

# ${this.toTitleCase(agentName)} Agent

${description}

## Skills

This agent has knowledge of the following patterns and conventions:

${skillsSection}

## Commands

Common commands for this repository:

${commandsSection}

## Instructions

You are an AI assistant specialized in this codebase. When working on tasks:

1. Use \`#codebase\` to search for relevant code patterns
2. Reference the skills above to follow established conventions
3. Use \`#textSearch\` to find specific implementations
4. Use \`#editFiles\` to make changes that follow detected patterns
5. Use \`#runInTerminal\` to execute build, test, and lint commands
6. Check \`#problems\` to ensure changes don't introduce errors

Always follow the patterns documented in the linked skills when making changes.
`;
  }

  private async generateHook(hook: HookDefinition, hooksDir: string): Promise<string> {
    const hookFile = path.join(hooksDir, `${hook.name}.yaml`);
    const relativePath = `.github/hooks/${hook.name}.yaml`;

    const content = this.buildHookYaml(hook);

    if (!this.dryRun) {
      await fs.writeFile(hookFile, content, "utf-8");
    }

    return relativePath;
  }

  private buildHookYaml(hook: HookDefinition): string {
    const commandsList = hook.commands.map((c) => `  - "${c}"`).join("\n");

    let content = `# Hook Configuration
# Generated by Agent Smith
# "Never send a human to do a machine's job."

name: ${hook.name}
event: ${hook.event}
description: ${hook.description}

# Commands to execute
commands:
${commandsList}
`;

    if (hook.condition) {
      content += `\n# Condition for hook execution\ncondition: "${hook.condition}"\n`;
    }

    return content;
  }

  private toTitleCase(str: string | unknown): string {
    // Handle non-string inputs (objects, undefined, etc.)
    if (typeof str !== "string") {
      if (str && typeof str === "object" && "name" in str) {
        str = (str as { name: string }).name;
      } else {
        str = String(str ?? "unknown");
      }
    }
    return (str as string)
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}
