/**
 * Assimilate Command
 * "You hear that, Mr. Anderson? That is the sound of inevitability."
 */

import chalk from "chalk";
import { Scanner } from "../scanner/index.js";
import { Analyzer } from "../analyzer/index.js";
import { Generator } from "../generator/index.js";
import { Registry } from "../registry/index.js";
import { HookRunner } from "../hooks/index.js";
import { resolveInput, isGitHubUrl, getRepoName } from "../utils/git.js";
import { detectLicense, formatLicenseStatus } from "../utils/license.js";

interface AssimilateOptions {
  dryRun?: boolean;
  verbose?: boolean;
  output?: string;
}

export async function assimilateCommand(
  target: string,
  options: AssimilateOptions
): Promise<void> {
  const isRemote = isGitHubUrl(target);

  if (isRemote) {
    console.log(chalk.green("\n[CLONE]"), `Cloning ${getRepoName(target)}...`);
  }

  // Resolve input (clone if GitHub URL)
  const resolved = await resolveInput(target);

  try {
    if (isRemote && options.verbose) {
      console.log(chalk.gray(`  └── Cloned to: ${resolved.path}`));
    }

    console.log(chalk.green("\n[SCAN]"), "Enumerating repository...");

    // Phase 1: Scan
    const scanner = new Scanner(resolved.path, options.verbose);
    const scanResult = await scanner.scan();

    if (options.verbose) {
      console.log(chalk.gray(`  ├── Language: ${scanResult.language}`));
      console.log(chalk.gray(`  ├── Framework: ${scanResult.framework || "None detected"}`));
      console.log(chalk.gray(`  ├── Files: ${scanResult.files.length}`));
      console.log(chalk.gray(`  └── Config: ${scanResult.configFiles.join(", ") || "None"}`));
    }

    console.log(chalk.green("\n[ANALYZE]"), "Copilot SDK analysis in progress...");

    // Phase 2: Analyze with Copilot SDK
    const analyzer = new Analyzer(options.verbose);
    const analysisResult = await analyzer.analyze(scanResult);

    if (options.verbose) {
      for (const skill of analysisResult.skills) {
        console.log(chalk.gray(`  ├── ${skill.sourceDir} → ${skill.name}`));
      }
      for (const agent of analysisResult.agents) {
        if (agent.isSubAgent) {
          console.log(chalk.gray(`  ├── Sub-agent: ${agent.name}`));
        }
      }
    }

    // Phase 2.5: License check
    console.log(chalk.green("\n[LICENSE]"), "Checking repository license...");
    const license = await detectLicense(resolved.path);
    
    if (options.verbose) {
      console.log(chalk.gray(`  └── ${formatLicenseStatus(license)}${license.file ? ` (from ${license.file})` : ""}`));
    }

    // Block generation for non-permissive licenses (unless dry-run)
    if (!license.permissive && !options.dryRun) {
      console.log(chalk.red("\n[BLOCKED]"), "Cannot assimilate repository.");
      
      if (!license.detected) {
        console.log(chalk.red("  No license file found."));
        console.log(chalk.gray("  Add a LICENSE file with a permissive license (MIT, Apache-2.0, GPL, BSD, etc.)"));
      } else {
        console.log(chalk.red(`  License "${license.name}" is not permissive.`));
        console.log(chalk.gray("  Only repositories with permissive open-source licenses can be assimilated."));
      }
      
      console.log(chalk.gray("\n  Tip: Use --dry-run to preview what would be generated without license restrictions."));
      console.log(chalk.gray("  Supported licenses: MIT, Apache-2.0, GPL, LGPL, BSD, ISC, MPL-2.0, Unlicense, CC0\n"));
      
      process.exitCode = 1;
      return;
    }

    if (!license.permissive && options.dryRun) {
      console.log(chalk.yellow("  ⚠ License not permissive - generation would be blocked without --dry-run"));
    } else if (license.permissive) {
      console.log(chalk.green(`  ✓ ${license.name} - permissive license detected`));
    }

    // Determine output path
    const outputPath = options.output || (isRemote ? process.cwd() : resolved.path);

    console.log(
      chalk.green("\n[GENERATE]"),
      options.dryRun ? "Preview of assets..." : `Writing assets to ${isRemote ? outputPath : ".github/"}...`
    );

    // Phase 3: Generate
    const generator = new Generator(outputPath, options.dryRun, options.verbose);
    const generated = await generator.generate(analysisResult);

    for (const file of generated.files) {
      const icon = options.dryRun ? chalk.yellow("○") : chalk.green("✓");
      console.log(`  ${icon} ${file}`);
    }

    // Phase 4: Build registry (includes both skills and agents)
    const registry = new Registry(outputPath, options.dryRun);
    await registry.build(analysisResult.skills, analysisResult.agents);
    const registryIcon = options.dryRun ? chalk.yellow("○") : chalk.green("✓");
    console.log(`  ${registryIcon} skills-registry.jsonl`);

    // Phase 5: Execute post-generate hooks
    if (!options.dryRun) {
      const hookRunner = new HookRunner(outputPath, options.verbose);
      const hookResults = await hookRunner.execute("post-generate");
      
      // Check for hook failures
      const failedHooks = hookResults.filter(r => !r.success);
      if (failedHooks.length > 0) {
        console.log(chalk.yellow("\nWarning: Some hooks failed. See output above."));
      }
    }

    // Summary
    const subAgentCount = analysisResult.agents.filter((a) => a.isSubAgent).length;
    const primaryCount = analysisResult.agents.length - subAgentCount;
    const hookCount = analysisResult.hooks.length;
    
    console.log(
      chalk.green("\n[COMPLETE]"),
      `${analysisResult.skills.length} skills, ${primaryCount} agents, ${subAgentCount} sub-agents, ${hookCount} hooks generated.`
    );

    if (options.dryRun) {
      console.log(chalk.yellow("\nDry run - no files were written."));
    } else {
      console.log(chalk.gray("\nYour repository has been assimilated."));
      console.log(chalk.white("The agent now embodies this codebase.\n"));
    }
  } finally {
    // Clean up temporary clone
    if (resolved.isTemporary) {
      await resolved.cleanup();
      if (options.verbose) {
        console.log(chalk.gray("Cleaned up temporary clone."));
      }
    }
  }
}
