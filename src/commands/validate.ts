/**
 * Validate Command
 * "I'm going to enjoy watching you die, Mr. Anderson."
 * (Validates agent assets with ruthless precision)
 */

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import yaml from "yaml";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidateOptions {
  verbose?: boolean;
}

export async function validateCommand(
  targetPath: string = ".",
  options: ValidateOptions = {}
): Promise<void> {
  const rootPath = path.resolve(targetPath);
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  console.log(chalk.green("\n[VALIDATE]"), "Checking agent assets...\n");

  // Validate skills
  await validateSkills(rootPath, result, options.verbose);

  // Validate agents
  await validateAgents(rootPath, result, options.verbose);

  // Validate hooks
  await validateHooks(rootPath, result, options.verbose);

  // Validate registry
  await validateRegistry(rootPath, result, options.verbose);

  // Summary
  console.log("");
  if (result.errors.length > 0) {
    console.log(chalk.red(`\n✗ Validation failed with ${result.errors.length} error(s):`));
    for (const error of result.errors) {
      console.log(chalk.red(`  • ${error}`));
    }
  }

  if (result.warnings.length > 0) {
    console.log(chalk.yellow(`\n⚠ ${result.warnings.length} warning(s):`));
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`  • ${warning}`));
    }
  }

  if (result.valid) {
    console.log(chalk.green("\n✓ All agent assets are valid."));
  } else {
    process.exitCode = 1;
  }
}

async function validateSkills(
  rootPath: string,
  result: ValidationResult,
  verbose?: boolean
): Promise<void> {
  const skillsDir = path.join(rootPath, ".github", "skills");

  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const skillDirs = entries.filter((e) => e.isDirectory());

    if (skillDirs.length === 0) {
      result.warnings.push("No skills found in .github/skills/");
      return;
    }

    for (const dir of skillDirs) {
      const skillFile = path.join(skillsDir, dir.name, "SKILL.md");

      try {
        const content = await fs.readFile(skillFile, "utf-8");

        // Check for required frontmatter
        if (!content.startsWith("---")) {
          result.errors.push(`${dir.name}/SKILL.md: Missing YAML frontmatter`);
          result.valid = false;
          continue;
        }

        // Extract and validate frontmatter
        const frontmatterEnd = content.indexOf("---", 3);
        if (frontmatterEnd === -1) {
          result.errors.push(`${dir.name}/SKILL.md: Malformed YAML frontmatter`);
          result.valid = false;
          continue;
        }

        const frontmatter = content.slice(4, frontmatterEnd).trim();
        const meta = yaml.parse(frontmatter);

        if (!meta.name) {
          result.errors.push(`${dir.name}/SKILL.md: Missing 'name' in frontmatter`);
          result.valid = false;
        }

        if (!meta.description) {
          result.warnings.push(`${dir.name}/SKILL.md: Missing 'description' in frontmatter`);
        }

        if (verbose) {
          console.log(chalk.green(`  ✓ skills/${dir.name}/SKILL.md`));
        }
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        result.errors.push(`${dir.name}: ${err.code === "ENOENT" ? "Missing SKILL.md file" : err.message}`);
        result.valid = false;
      }
    }

    if (!verbose) {
      console.log(chalk.gray(`  Validated ${skillDirs.length} skill(s)`));
    }
  } catch {
    result.warnings.push("No .github/skills/ directory found");
  }
}

async function validateAgents(
  rootPath: string,
  result: ValidationResult,
  verbose?: boolean
): Promise<void> {
  const agentsDir = path.join(rootPath, ".github", "agents");

  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    const agentDirs = entries.filter((e) => e.isDirectory());
    const agentMdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".agent.md"));

    let hasRootAgent = false;
    let validatedYamlCount = 0;
    let validatedMdCount = 0;

    // Validate .agent.md files (VS Code custom agents)
    for (const file of agentMdFiles) {
      const agentFile = path.join(agentsDir, file.name);
      
      try {
        const content = await fs.readFile(agentFile, "utf-8");

        // Check for required frontmatter
        if (!content.startsWith("---")) {
          result.errors.push(`${file.name}: Missing YAML frontmatter`);
          result.valid = false;
          continue;
        }

        const frontmatterEnd = content.indexOf("---", 3);
        if (frontmatterEnd === -1) {
          result.errors.push(`${file.name}: Malformed YAML frontmatter`);
          result.valid = false;
          continue;
        }

        const frontmatter = content.slice(4, frontmatterEnd).trim();
        const meta = yaml.parse(frontmatter);

        if (!meta.name) {
          result.errors.push(`${file.name}: Missing 'name' in frontmatter`);
          result.valid = false;
        }

        if (!meta.description) {
          result.warnings.push(`${file.name}: Missing 'description' in frontmatter`);
        }

        // Validate tools array if present
        if (meta.tools && !Array.isArray(meta.tools)) {
          result.errors.push(`${file.name}: 'tools' must be an array`);
          result.valid = false;
        }

        // Validate handoffs if present
        if (meta.handoffs) {
          if (!Array.isArray(meta.handoffs)) {
            result.errors.push(`${file.name}: 'handoffs' must be an array`);
            result.valid = false;
          } else {
            for (const handoff of meta.handoffs) {
              if (!handoff.label || !handoff.agent) {
                result.errors.push(`${file.name}: handoff missing 'label' or 'agent'`);
                result.valid = false;
              }
            }
          }
        }

        if (file.name === "root.agent.md") {
          hasRootAgent = true;
        }

        validatedMdCount++;

        if (verbose) {
          console.log(chalk.green(`  ✓ agents/${file.name}`));
        }
      } catch (e) {
        result.errors.push(`${file.name}: ${(e as Error).message}`);
        result.valid = false;
      }
    }

    // Validate agent.yaml files (structured data)
    for (const dir of agentDirs) {
      const agentFile = path.join(agentsDir, dir.name, "agent.yaml");

      try {
        await fs.access(agentFile);
      } catch {
        // Skip directories without agent.yaml (stale from previous runs)
        continue;
      }

      try {
        const content = await fs.readFile(agentFile, "utf-8");
        const agent = yaml.parse(content);

        if (!agent.name) {
          result.errors.push(`${dir.name}/agent.yaml: Missing 'name' field`);
          result.valid = false;
        }

        if (!agent.description) {
          result.warnings.push(`${dir.name}/agent.yaml: Missing 'description' field`);
        }

        if (agent.name === "root" || agent.isSubAgent === false) {
          hasRootAgent = true;
        }

        // Validate skills references exist
        if (agent.skills && Array.isArray(agent.skills)) {
          for (const skillName of agent.skills) {
            const skillPath = path.join(rootPath, ".github", "skills", skillName, "SKILL.md");
            try {
              await fs.access(skillPath);
            } catch {
              result.warnings.push(
                `${dir.name}/agent.yaml: References non-existent skill '${skillName}'`
              );
            }
          }
        }

        validatedYamlCount++;

        if (verbose) {
          console.log(chalk.green(`  ✓ agents/${dir.name}/agent.yaml`));
        }
      } catch (e) {
        result.errors.push(`${dir.name}/agent.yaml: Invalid YAML - ${(e as Error).message}`);
        result.valid = false;
      }
    }

    const totalCount = validatedMdCount + validatedYamlCount;
    
    if (totalCount === 0) {
      result.errors.push("No agents found in .github/agents/");
      result.valid = false;
    }

    if (!hasRootAgent) {
      result.errors.push("No root agent found (need root.agent.md or agent with isSubAgent: false)");
      result.valid = false;
    }

    if (!verbose) {
      console.log(chalk.gray(`  Validated ${validatedMdCount} .agent.md file(s), ${validatedYamlCount} agent.yaml file(s)`));
    }
  } catch {
    result.errors.push("No .github/agents/ directory found");
    result.valid = false;
  }
}

async function validateHooks(
  rootPath: string,
  result: ValidationResult,
  verbose?: boolean
): Promise<void> {
  const hooksDir = path.join(rootPath, ".github", "hooks");
  const validEvents = ["pre-commit", "post-commit", "pre-push", "pre-analyze", "post-generate"];

  try {
    const files = await fs.readdir(hooksDir);
    const hookFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    if (hookFiles.length === 0) {
      if (verbose) {
        console.log(chalk.gray("  No hooks found"));
      }
      return;
    }

    for (const file of hookFiles) {
      const hookPath = path.join(hooksDir, file);
      const content = await fs.readFile(hookPath, "utf-8");

      try {
        const hook = yaml.parse(content);

        if (!hook.name) {
          result.errors.push(`hooks/${file}: Missing 'name' field`);
          result.valid = false;
        }

        if (!hook.event) {
          result.errors.push(`hooks/${file}: Missing 'event' field`);
          result.valid = false;
        } else if (!validEvents.includes(hook.event)) {
          result.errors.push(
            `hooks/${file}: Invalid event '${hook.event}'. Must be one of: ${validEvents.join(", ")}`
          );
          result.valid = false;
        }

        if (!hook.commands || !Array.isArray(hook.commands) || hook.commands.length === 0) {
          result.errors.push(`hooks/${file}: Missing or empty 'commands' array`);
          result.valid = false;
        }

        if (verbose) {
          console.log(chalk.green(`  ✓ hooks/${file}`));
        }
      } catch (e) {
        result.errors.push(`hooks/${file}: Invalid YAML - ${(e as Error).message}`);
        result.valid = false;
      }
    }

    if (!verbose) {
      console.log(chalk.gray(`  Validated ${hookFiles.length} hook(s)`));
    }
  } catch {
    // No hooks directory - that's okay
    if (verbose) {
      console.log(chalk.gray("  No hooks directory"));
    }
  }
}

async function validateRegistry(
  rootPath: string,
  result: ValidationResult,
  verbose?: boolean
): Promise<void> {
  const registryPath = path.join(rootPath, "skills-registry.jsonl");

  try {
    const content = await fs.readFile(registryPath, "utf-8");
    const lines = content.trim().split("\n").filter((l) => l.trim());

    if (lines.length === 0) {
      result.warnings.push("skills-registry.jsonl is empty");
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]);
        if (!entry.name || !entry.type) {
          result.errors.push(`skills-registry.jsonl line ${i + 1}: Missing 'name' or 'type'`);
          result.valid = false;
        }
      } catch {
        result.errors.push(`skills-registry.jsonl line ${i + 1}: Invalid JSON`);
        result.valid = false;
      }
    }

    if (verbose) {
      console.log(chalk.green(`  ✓ skills-registry.jsonl (${lines.length} entries)`));
    } else {
      console.log(chalk.gray(`  Validated registry (${lines.length} entries)`));
    }
  } catch {
    result.warnings.push("No skills-registry.jsonl found");
  }
}
