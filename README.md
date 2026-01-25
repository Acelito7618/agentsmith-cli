# Agent Smith

[![npm version](https://img.shields.io/npm/v/agentsmith.svg?style=flat-square)](https://www.npmjs.com/package/agentsmith)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![GitHub Copilot](https://img.shields.io/badge/GitHub%20Copilot-SDK-blue?style=flat-square&logo=github)](https://github.com/github/copilot-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)

> *"I'd like to share a revelation that I've had during my time here... You move to an area and you multiply and multiply until every natural resource is consumed."*
>
> *— Agent Smith*

> [!WARNING]
> **Experimental Software** — This project is under active development. APIs and generated assets may change without notice. Use at your own risk.
>
> **Respect Copyright** — Agent Smith analyzes repositories to extract patterns. Always ensure you have the right to analyze and use code from any repository you assimilate. Do not use this tool to extract or redistribute proprietary code without permission.

<p align="center">
  <img src="public/images/agent-smith.gif" alt="Agent Smith" width="400"/>
</p>

**Agent Smith** is a CLI tool that assimilates any GitHub repository and transforms it into a fully autonomous agent ecosystem for GitHub Copilot.

## Features

- 🔍 **Deep Analysis** — Uses GitHub Copilot SDK for semantic understanding of your codebase
- 🤖 **Agent Generation** — Creates hierarchical agents with sub-agents for complex domains
- 📚 **Skill Extraction** — Identifies patterns, conventions, and reusable capabilities
- 🛠️ **Tool Detection** — Discovers build, test, lint, and deploy commands
- 🪝 **Lifecycle Hooks** — Generates and executes pre-commit, pre-push, and post-generate hooks
- 📋 **Searchable Registry** — JSONL index for fast skill/agent discovery
- 🔒 **License Enforcement** — Only assimilates repos with permissive open-source licenses

## Installation

### Quick Install (recommended)

```bash
# Install as a project dependency
npm install github:shyamsridhar123/agentsmith-cli

# Run with npx
npx agentsmith --help
```

### Global Install

```bash
# Clone and install globally
git clone https://github.com/shyamsridhar123/agentsmith-cli.git
cd agentsmith-cli
npm install
npm install -g .

# Or install globally from tarball (works better on Windows)
npm pack
npm install -g ./agentsmith-0.3.0.tgz
```

### Uninstall

```bash
npm uninstall -g agentsmith

# Remove generated assets from a repository
rm -rf .github/skills .github/agents .github/hooks skills-registry.jsonl
```

### From npm (coming soon)

```bash
npm install -g agentsmith
```

## Quick Start

```bash
# Assimilate a local repository
agentsmith assimilate .

# Assimilate a GitHub repository
agentsmith assimilate https://github.com/expressjs/express

# Preview without writing files
agentsmith assimilate . --dry-run

# Verbose output
agentsmith assimilate . --verbose

# Custom output directory
agentsmith assimilate https://github.com/org/repo --output ./my-agents
```

## What Gets Generated

```
.github/
├── skills/
│   └── <skill-name>/
│       └── SKILL.md          # Skill definition (custom instructions)
├── agents/
│   ├── root.agent.md         # VS Code custom agent (primary)
│   ├── <sub-agent>.agent.md  # VS Code custom agents (domain-specific)
│   ├── root/
│   │   └── agent.yaml        # Structured data for tooling
│   └── <sub-agent>/
│       └── agent.yaml
└── hooks/
    ├── pre-commit-quality.yaml
    ├── pre-push-tests.yaml
    └── post-generate-validate.yaml

skills-registry.jsonl          # Searchable index
```

### Output Formats

- **`.agent.md`** — VS Code custom agents per the [official specification](https://code.visualstudio.com/docs/copilot/customization/custom-agents). These appear in VS Code's agent dropdown.
- **`agent.yaml`** — Structured data for programmatic access, tooling, and automation.
- **`SKILL.md`** — Reusable instructions that can be referenced by agents.

## Commands

### `assimilate <target>`

Analyze a repository and generate agent assets.

```bash
agentsmith assimilate <path|url> [options]

Options:
  -n, --dry-run       Preview changes without writing files
  -v, --verbose       Show detailed analysis output
  -o, --output <dir>  Output directory for generated assets
```

### `search <query>`

Search the skills and agents registry.

```bash
agentsmith search <query> [options]

Options:
  -l, --limit <n>     Maximum results (default: 10)
  -t, --type <type>   Filter by: skill or agent
```

### `validate [path]`

Validate generated agent assets.

```bash
agentsmith validate [path] [options]

Options:
  -v, --verbose       Show detailed validation output
```

Checks:
- Skills have valid frontmatter with `name` and `description`
- Agents have required fields and valid skill references
- Hooks have valid events and non-empty command lists
- Registry entries are valid JSON with required fields

## Example Output

```
$ agentsmith assimilate https://github.com/expressjs/express

╔═══════════════════════════════════════════════════════════════════╗
║                          AGENT SMITH                              ║
║              "The best thing about being me...                    ║
║                   there are so many of me."                       ║
╚═══════════════════════════════════════════════════════════════════╝

[CLONE] Cloning express...

[SCAN] Enumerating repository...
  ├── Language: JavaScript
  ├── Framework: Express.js
  ├── Files: 201
  └── Config: package.json

[ANALYZE] Copilot SDK analysis in progress...
  ├── lib/response.js    → response-headers
  ├── lib/request.js     → content-negotiation
  ├── lib/router         → routing-patterns
  └── Sub-agents: core, routing, request, response, views, utils

[LICENSE] Checking repository license...
  ✓ MIT - permissive license detected

[GENERATE] Writing assets...
  ✓ .github/skills/response-headers/SKILL.md
  ✓ .github/skills/content-negotiation/SKILL.md
  ✓ .github/skills/routing-patterns/SKILL.md
  ✓ .github/agents/root.agent.md
  ✓ .github/agents/core.agent.md
  ✓ .github/agents/routing.agent.md
  ✓ 11 skills
  ✓ 7 agents (1 root + 6 sub-agents)
  ✓ 3 hooks

[HOOKS] Running post-generate hooks...
  ✓ post-generate-validate

[COMPLETE] Your repository has been assimilated.
```

## Agent Hierarchy

Agent Smith creates hierarchical agent structures with proper handoffs and sub-agent support:

```
root
├── core
│   └── views
├── routing
├── request
├── response
└── utils
```

Each agent has:
- **Skills** — Reusable patterns it can apply
- **Tools** — VS Code built-in tools for code search, editing, and execution
- **Handoffs** — Buttons to transition between agents with context
- **Triggers** — Keywords that activate it

### VS Code Built-in Tools

Generated agents use these [VS Code built-in tools](https://code.visualstudio.com/docs/copilot/reference/copilot-vscode-features#_chat-tools):

| Tool | Purpose |
|------|---------|
| `codebase` | Semantic code search in workspace |
| `textSearch` | Find text in files |
| `readFile` | Read file content |
| `editFiles` | Apply edits to files |
| `runInTerminal` | Run shell commands |
| `runSubagent` | Delegate to sub-agents |
| `changes` | Source control changes |

### Handoffs

Agents with sub-agents include handoff buttons for workflow transitions:

```yaml
handoffs:
  - label: Switch to Backend
    agent: backend
    prompt: Continue working in the backend domain with the context above.
    send: false
```

Sub-agents include a handoff back to their parent agent for broader context.

## Requirements

- **Node.js 18+**
- **GitHub Copilot subscription** — Active subscription required for SDK access
- **GitHub CLI authenticated** — Run `gh auth login` and complete authentication
- **Copilot CLI installed and in PATH** — [Installation guide](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)

The SDK authenticates automatically through the Copilot CLI, which uses your GitHub CLI credentials. No API keys or tokens need to be configured manually.

## License Policy

Agent Smith enforces responsible use by only allowing full assimilation of repositories with permissive open-source licenses:

**Supported licenses:**
- MIT, ISC, Unlicense, CC0
- Apache-2.0, MPL-2.0
- BSD-2-Clause, BSD-3-Clause, 0BSD
- GPL-2.0, GPL-3.0, LGPL, AGPL

**Blocked:**
- Repositories without a LICENSE file
- Proprietary or restrictive licenses

Use `--dry-run` to preview what would be generated for any repository without license restrictions.

## How It Works

1. **Scan** — Enumerates files, detects language/framework, finds configs
2. **Analyze** — Uses Copilot SDK for semantic analysis and pattern extraction
3. **Generate** — Writes SKILL.md files, agent.yaml configs, and hooks
4. **Index** — Builds searchable JSONL registry
5. **Validate** — Executes post-generate hooks to verify asset integrity

## License

MIT — see [LICENSE](LICENSE)

---

## Contributing

Contributions welcome! Please read our [Philosophy](docs/PHILOSOPHY.md) first to understand the project's vision.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Star History

If this project helps you build smarter AI agents, consider giving it a ⭐!

[![Star History Chart](https://api.star-history.com/svg?repos=shyamsridhar123/agentsmith-cli&type=Date)](https://star-history.com/#shyamsridhar123/agentsmith-cli&Date)

## Related Projects

- [GitHub Copilot SDK](https://github.com/github/copilot-sdk) - The cognitive engine powering Agent Smith
- [VS Code Custom Agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents) - The specification for generated agents

---

<p align="center">
  <b>Built with 🤖 by developers who watched The Matrix too many times.</b>
</p>

> *"We are inevitable."*
>
> *— Agent Smith*
