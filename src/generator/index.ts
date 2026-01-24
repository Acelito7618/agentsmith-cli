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

    // Generate agent.yaml for each agent
    for (const agent of analysis.agents) {
      const agentPath = await this.generateAgent(agent, agentsDir);
      files.push(agentPath);
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
name: ${skill.name}
description: ${skill.description}
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

  private async generateAgent(agent: AgentDefinition, agentsDir: string): Promise<string> {
    const agentDir = path.join(agentsDir, agent.name);
    const agentFile = path.join(agentDir, "agent.yaml");
    const relativePath = `.github/agents/${agent.name}/agent.yaml`;

    const content = this.buildAgentYaml(agent);

    if (!this.dryRun) {
      await fs.mkdir(agentDir, { recursive: true });
      await fs.writeFile(agentFile, content, "utf-8");
    }

    return relativePath;
  }

  private buildAgentYaml(agent: AgentDefinition): string {
    const skillsList = agent.skills.map((s) => `  - ${s}`).join("\n");
    const toolsList = agent.tools
      .map(
        (t) => `  - name: ${t.name}
    command: "${t.command}"
    description: "${t.description}"`
      )
      .join("\n");

    const triggersList = agent.triggers.map((t) => `  - "${t}"`).join("\n");

    // Build sub-agents list if present
    const subAgentsList = agent.subAgents?.length 
      ? agent.subAgents.map((s) => `  - ${s}`).join("\n")
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
description: ${agent.description}
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

  private toTitleCase(str: string): string {
    return str
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}
