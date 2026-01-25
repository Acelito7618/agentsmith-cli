/**
 * Generator - The Replicator
 * Writes SKILL.md files, agent configs, and tool definitions.
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

    // Create .github/skills/ directory structure
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

    // Generate agent.yaml and .agent.md for each agent
    for (const agent of analysis.agents) {
      const agentPaths = await this.generateAgent(agent, agentsDir);
      files.push(...agentPaths);
    }

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

  private async generateAgent(agent: AgentDefinition, agentsDir: string): Promise<string[]> {
    const agentDir = path.join(agentsDir, agent.name);
    const yamlFile = path.join(agentDir, "agent.yaml");
    const mdFile = path.join(agentsDir, `${agent.name}.agent.md`);
    
    const yamlPath = `.github/agents/${agent.name}/agent.yaml`;
    const mdPath = `.github/agents/${agent.name}.agent.md`;

    const yamlContent = this.buildAgentYaml(agent);
    const mdContent = this.buildAgentMd(agent);

    if (!this.dryRun) {
      await fs.mkdir(agentDir, { recursive: true });
      await fs.writeFile(yamlFile, yamlContent, "utf-8");
      await fs.writeFile(mdFile, mdContent, "utf-8");
    }

    return [yamlPath, mdPath];
  }

  /**
   * Build VS Code compatible .agent.md file
   * @see https://code.visualstudio.com/docs/copilot/customization/custom-agents
   */
  private buildAgentMd(agent: AgentDefinition): string {
    // Map our tools to VS Code built-in tool names
    const vsCodeTools = this.mapToVSCodeTools(agent);
    const toolsList = vsCodeTools.length > 0 
      ? `tools: [${vsCodeTools.map(t => `'${t}'`).join(', ')}]`
      : "";

    // infer: true allows this agent to be used as a subagent via runSubagent tool
    // Sub-agents should be invokable, root agents too
    const inferField = "infer: true";

    // Build handoffs for sub-agents (VS Code handoff spec)
    // Handoffs are UI buttons for user-driven workflow transitions
    // @see https://code.visualstudio.com/docs/copilot/customization/custom-agents#_handoffs
    let handoffsSection = "";
    if (agent.subAgents && agent.subAgents.length > 0) {
      const handoffs = agent.subAgents.map(subAgent => {
        const name = this.extractName(subAgent);
        return `  - label: Switch to ${this.toTitleCase(name)}
    agent: ${name}
    prompt: Continue working in the ${name} domain with the context above.
    send: false`;
      }).join("\n");
      handoffsSection = `handoffs:\n${handoffs}`;
    }

    // Add handoff back to parent for sub-agents
    if (agent.isSubAgent && agent.parentAgent) {
      const parentHandoff = `  - label: Back to ${this.toTitleCase(agent.parentAgent)}
    agent: ${agent.parentAgent}
    prompt: Return to the parent agent for broader context.
    send: false`;
      if (handoffsSection) {
        handoffsSection += "\n" + parentHandoff;
      } else {
        handoffsSection = `handoffs:\n${parentHandoff}`;
      }
    }

    // Build skills references for the body
    const skillsSection = agent.skills.length > 0
      ? agent.skills.map(s => {
          const name = this.extractName(s);
          return `- [${this.toTitleCase(name)}](skills/${name}/SKILL.md)`;
        }).join("\n")
      : "No specific skills defined.";

    // Build trigger keywords section
    const triggersSection = agent.triggers.length > 0
      ? agent.triggers.map(t => `"${t}"`).join(", ")
      : "general queries";

    // Domain context
    const domainContext = agent.sourceDir 
      ? `This agent specializes in code under \`${agent.sourceDir}/\`.`
      : "This agent covers the entire repository.";

    // Sub-agent delegation instructions using runSubagent tool
    let subAgentInstructions = "";
    if (agent.subAgents && agent.subAgents.length > 0) {
      const subAgentNames = agent.subAgents.map(s => this.extractName(s));
      subAgentInstructions = `\n5. Use \`#runSubagent\` to delegate to: ${subAgentNames.join(", ")}`;
    }

    return `---
name: ${this.toTitleCase(agent.name)}
description: ${this.quoteYamlValue(agent.description)}
${inferField}
${toolsList}
${handoffsSection}
---

# ${this.toTitleCase(agent.name)} Agent

${agent.description}

${domainContext}

## Activation

This agent is activated when the user mentions: ${triggersSection}

## Skills

${skillsSection}

## Instructions

You are an AI assistant specialized in this codebase. When working in this domain:

1. Follow the patterns documented in the linked skills above
2. Use #codebase and #textSearch to find relevant code context
3. Use #editFiles to make changes that follow detected conventions
4. Use #runInTerminal to execute build, test, and lint commands${subAgentInstructions}

${agent.isSubAgent ? `\n## Parent Agent\n\nThis is a sub-agent of **${agent.parentAgent || 'root'}**. Use the handoff button above to return for broader context.` : ""}

${agent.subAgents && agent.subAgents.length > 0 ? `\n## Sub-Agents\n\nFor specialized work:\n- Use **handoff buttons** above for user-guided transitions\n- Use \`#runSubagent\` tool programmatically to delegate tasks\n\nAvailable sub-agents:\n${agent.subAgents.map(s => { const name = this.extractName(s); return `- **${this.toTitleCase(name)}** - handles ${name}-specific tasks`; }).join("\n")}` : ""}
`.trim() + "\n";
  }

  /**
   * Extract name from string or object
   */
  private extractName(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }
    if (value && typeof value === "object" && "name" in value) {
      return String((value as { name: unknown }).name);
    }
    return String(value ?? "unknown");
  }

  /**
   * Map internal tool definitions to VS Code built-in tool names
   * @see https://code.visualstudio.com/docs/copilot/reference/copilot-vscode-features#_chat-tools
   */
  private mapToVSCodeTools(agent: AgentDefinition): string[] {
    const tools: string[] = [];
    
    // Core search and context tools (always needed)
    tools.push("codebase");       // Semantic code search in workspace
    tools.push("textSearch");     // Find text in files
    tools.push("fileSearch");     // Search files by glob pattern
    tools.push("readFile");       // Read file content
    tools.push("listDirectory");  // List directory contents
    tools.push("usages");         // Find references/implementations
    tools.push("problems");       // Workspace issues from Problems panel
    
    // External context
    tools.push("fetch");          // Fetch web page content
    tools.push("githubRepo");     // Search GitHub repositories
    
    // Editing tools (for agents that can modify code)
    if (!agent.isSubAgent || agent.tools.length > 0) {
      tools.push("editFiles");      // Apply edits to files
      tools.push("createFile");     // Create new files
      tools.push("createDirectory"); // Create directories
    }
    
    // Terminal and task execution
    if (agent.tools.length > 0) {
      tools.push("runInTerminal");     // Run shell commands
      tools.push("terminalLastCommand"); // Get last terminal output
      tools.push("runTask");           // Run workspace tasks
      tools.push("getTerminalOutput"); // Get terminal output
    }
    
    // Sub-agent orchestration - ALL agents should be able to delegate
    tools.push("runSubagent");  // Run tasks in isolated subagent context
    
    // Source control context
    tools.push("changes");  // Current source control changes
    
    return tools;
  }

  private buildAgentYaml(agent: AgentDefinition): string {
    const skillsList = agent.skills.map((s) => `  - ${s}`).join("\n");
    const toolsList = agent.tools
      .map(
        (t) => `  - name: ${t.name}
    command: "${this.escapeYamlString(t.command)}"
    description: "${this.escapeYamlString(t.description)}"`
      )
      .join("\n");

    const triggersList = agent.triggers.map((t) => `  - "${t}"`).join("\n");

    // Build sub-agents list if present
    const subAgentsList = agent.subAgents?.length 
      ? agent.subAgents.map((s) => {
          const name = typeof s === "string" ? s : (s as { name?: string }).name ?? String(s);
          return `  - ${name}`;
        }).join("\n")
      : "";

    // Build hierarchy section
    let hierarchySection = `isSubAgent: ${agent.isSubAgent}`;
    if (agent.parentAgent) {
      hierarchySection += `\nparentAgent: ${agent.parentAgent}`;
    }
    if (agent.subAgents?.length) {
      hierarchySection += `\nsubAgents:\n${subAgentsList}`;
    }
    if (agent.sourceDir) {
      hierarchySection += `\nsourceDir: "${agent.sourceDir}"`;
    }

    return `# Agent Configuration
# Generated by Agent Smith
# "The best thing about being me... there are so many of me."

name: ${agent.name}
description: ${this.quoteYamlValue(agent.description)}
version: "1.0"

# Skills this agent can use
skills:
${skillsList || "  []"}

# Tools this agent can execute
tools:
${toolsList || "  []"}

# Keywords that activate this agent
triggers:
${triggersList || "  []"}

# Agent hierarchy
${hierarchySection}
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
