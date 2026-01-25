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
import { validateCommand } from "./commands/validate.js";
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
    .addHelpText("beforeAll", banner)
    .addHelpText("after", `
${chalk.bold("Examples:")}
  $ agentsmith assimilate .                                    # Analyze current directory
  $ agentsmith assimilate https://github.com/expressjs/express # Analyze remote repo
  $ agentsmith assimilate . --dry-run --verbose                # Preview with details
  $ agentsmith search "routing"                                # Search skills registry
  $ agentsmith validate                                        # Validate generated assets

${chalk.bold("Requirements:")}
  • Node.js 18+
  • GitHub Copilot subscription (for SDK access)
  • Copilot CLI installed and in PATH

${chalk.bold("Documentation:")}
  https://github.com/shyamsridhar123/agentsmith-cli
`);
program
    .command("assimilate")
    .description("Analyze a repository and generate agent assets (skills, agents, hooks)")
    .argument("<target>", "Path to local repo or GitHub URL")
    .option("-n, --dry-run", "Preview what would be generated without writing files")
    .option("-v, --verbose", "Show detailed analysis output including file-by-file processing")
    .option("-o, --output <path>", "Output directory for generated assets")
    .addHelpText("after", `
${chalk.bold("Examples:")}
  $ agentsmith assimilate .                                      # Local repository
  $ agentsmith assimilate ~/projects/myapp                       # Specific path
  $ agentsmith assimilate https://github.com/expressjs/express   # GitHub URL
  $ agentsmith assimilate . --dry-run                            # Preview mode
  $ agentsmith assimilate . -o ./output                          # Custom output

${chalk.bold("Generated assets:")}
  .github/skills/<name>/SKILL.md   - Reusable skill definitions
  .github/agents/<name>/agent.yaml - Agent configurations
  .github/hooks/*.yaml             - Lifecycle hooks
  skills-registry.jsonl            - Searchable index
`)
    .action(assimilateCommand);
program
    .command("search")
    .description("Search the skills and agents registry by keyword")
    .argument("<query>", "Search query (matches name, description, triggers)")
    .option("-l, --limit <number>", "Maximum results to return", "10")
    .option("-t, --type <type>", "Filter by type: skill, agent, or hook")
    .addHelpText("after", `
${chalk.bold("Examples:")}
  $ agentsmith search "routing"              # Search all assets
  $ agentsmith search "test" --type skill    # Only skills
  $ agentsmith search "api" --limit 5        # Limit results
`)
    .action(searchCommand);
program
    .command("validate")
    .description("Validate generated agent assets for correctness")
    .argument("[path]", "Path to repository (default: current directory)", ".")
    .option("-v, --verbose", "Show detailed validation output with all checks")
    .addHelpText("after", `
${chalk.bold("Checks performed:")}
  • Skills have valid frontmatter (name, description)
  • Agents have required fields and valid skill references
  • Hooks have valid events and non-empty commands
  • Registry entries are valid JSON with required fields

${chalk.bold("Examples:")}
  $ agentsmith validate                      # Current directory
  $ agentsmith validate ./my-project         # Specific path
  $ agentsmith validate --verbose            # Detailed output
`)
    .action(validateCommand);
program.parse();
//# sourceMappingURL=main.js.map