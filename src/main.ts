#!/usr/bin/env node
/**
 * Agent Smith CLI
 * "The best thing about being me... there are so many of me."
 *
 * Assimilate any repository into a fully autonomous GitHub Copilot agent.
 */

import { Command } from "commander";
import chalk from "chalk";
import { assimilateCommand } from "./commands/assimilate.js";
import { searchCommand } from "./commands/search.js";

const program = new Command();

const banner = `
${chalk.green("╔═══════════════════════════════════════════════════════════════════╗")}
${chalk.green("║")}                          ${chalk.bold.white("AGENT SMITH")}                              ${chalk.green("║")}
${chalk.green("║")}              ${chalk.gray('"The best thing about being me...')}                   ${chalk.green("║")}
${chalk.green("║")}                   ${chalk.gray('there are so many of me."')}                        ${chalk.green("║")}
${chalk.green("╚═══════════════════════════════════════════════════════════════════╝")}
`;

program
  .name("agentsmith")
  .description("Assimilate any repository into a fully autonomous GitHub Copilot agent")
  .version("0.2.0")
  .addHelpText("beforeAll", banner);

program
  .command("assimilate")
  .description("Analyze a repository and generate agent assets")
  .argument("<target>", "Path to local repo or GitHub URL (e.g., https://github.com/org/repo)")
  .option("-n, --dry-run", "Preview changes without writing files")
  .option("-v, --verbose", "Show detailed analysis output")
  .option("-o, --output <path>", "Output directory (default: current dir for URLs, repo dir for local)")
  .action(assimilateCommand);

program
  .command("search")
  .description("Search the skills and agents registry")
  .argument("<query>", "Search query")
  .option("-l, --limit <number>", "Maximum results to return", "10")
  .option("-t, --type <type>", "Filter by type: skill or agent")
  .action(searchCommand);

program.parse();
