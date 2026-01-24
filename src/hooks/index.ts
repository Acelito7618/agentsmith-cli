/**
 * HookRunner - The Enforcer
 * Executes lifecycle hooks at the right moments.
 * "Never send a human to do a machine's job."
 */

import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import yaml from "yaml";
import chalk from "chalk";
import type { HookDefinition } from "../analyzer/index.js";

export type HookEvent = "pre-commit" | "post-commit" | "pre-push" | "pre-analyze" | "post-generate";

export interface HookResult {
  hook: string;
  success: boolean;
  output?: string;
  error?: string;
}

export class HookRunner {
  private rootPath: string;
  private verbose: boolean;

  constructor(rootPath: string, verbose = false) {
    this.rootPath = rootPath;
    this.verbose = verbose;
  }

  /**
   * Execute all hooks for a given event
   */
  async execute(event: HookEvent): Promise<HookResult[]> {
    const hooks = await this.loadHooks(event);
    const results: HookResult[] = [];

    if (hooks.length === 0) {
      if (this.verbose) {
        console.log(chalk.gray(`  No ${event} hooks found.`));
      }
      return results;
    }

    console.log(chalk.green(`\n[HOOKS]`), `Running ${event} hooks...`);

    for (const hook of hooks) {
      const result = await this.runHook(hook);
      results.push(result);

      if (!result.success) {
        console.log(chalk.red(`  ✗ ${hook.name}: ${result.error}`));
        // Stop on first failure
        break;
      } else {
        console.log(chalk.green(`  ✓ ${hook.name}`));
        if (this.verbose && result.output) {
          console.log(chalk.gray(`    ${result.output.split("\n").join("\n    ")}`));
        }
      }
    }

    return results;
  }

  /**
   * Load hooks from .github/hooks/ directory for a specific event
   */
  private async loadHooks(event: HookEvent): Promise<HookDefinition[]> {
    const hooksDir = path.join(this.rootPath, ".github", "hooks");
    const hooks: HookDefinition[] = [];

    try {
      const files = await fs.readdir(hooksDir);

      for (const file of files) {
        if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;

        const hookPath = path.join(hooksDir, file);
        const content = await fs.readFile(hookPath, "utf-8");
        const hookDef = yaml.parse(content) as HookDefinition;

        if (hookDef.event === event) {
          hooks.push(hookDef);
        }
      }
    } catch (error) {
      // No hooks directory or can't read - that's fine
      if (this.verbose) {
        console.log(chalk.gray(`  No hooks directory found at ${hooksDir}`));
      }
    }

    return hooks;
  }

  /**
   * Run a single hook and return the result
   */
  private async runHook(hook: HookDefinition): Promise<HookResult> {
    const outputs: string[] = [];

    for (const command of hook.commands) {
      try {
        // Check condition if present
        if (hook.condition) {
          const conditionMet = await this.evaluateCondition(hook.condition);
          if (!conditionMet) {
            return {
              hook: hook.name,
              success: true,
              output: "Skipped: condition not met",
            };
          }
        }

        if (this.verbose) {
          console.log(chalk.gray(`    Running: ${command}`));
        }

        const output = execSync(command, {
          cwd: this.rootPath,
          encoding: "utf-8",
          stdio: this.verbose ? "pipe" : "pipe",
          timeout: 120000, // 2 minute timeout per command
        });

        outputs.push(output.trim());
      } catch (error) {
        const err = error as { message?: string; stderr?: string };
        return {
          hook: hook.name,
          success: false,
          error: err.stderr || err.message || "Command failed",
        };
      }
    }

    return {
      hook: hook.name,
      success: true,
      output: outputs.join("\n"),
    };
  }

  /**
   * Evaluate a condition string (simple file/command checks)
   */
  private async evaluateCondition(condition: string): Promise<boolean> {
    // Support simple conditions like "file:package.json" or "command:npm --version"
    if (condition.startsWith("file:")) {
      const filePath = path.join(this.rootPath, condition.slice(5));
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    }

    if (condition.startsWith("command:")) {
      try {
        execSync(condition.slice(8), { encoding: "utf-8", stdio: "pipe" });
        return true;
      } catch {
        return false;
      }
    }

    // Default: treat as truthy
    return true;
  }
}
