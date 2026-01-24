# Agent Smith

[![npm version](https://img.shields.io/npm/v/agentsmith.svg?style=flat-square)](https://www.npmjs.com/package/agentsmith)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![GitHub Copilot](https://img.shields.io/badge/GitHub%20Copilot-SDK-blue?style=flat-square&logo=github)](https://github.com/github/copilot-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)

> *"I'd like to share a revelation that I've had during my time here... You move to an area and you multiply and multiply until every natural resource is consumed."*
>
> *— Agent Smith*

<p align="center">
  <img src="public/images/agent-smith.gif" alt="Agent Smith" width="400"/>
</p>

**Agent Smith** is a CLI tool that assimilates any GitHub repository and transforms it into a fully autonomous agent ecosystem for GitHub Copilot.

## Features

- 🔍 **Deep Analysis** — Uses GitHub Copilot SDK for semantic understanding of your codebase
- 🤖 **Agent Generation** — Creates hierarchical agents with sub-agents for complex domains
- 📚 **Skill Extraction** — Identifies patterns, conventions, and reusable capabilities
- 🛠️ **Tool Detection** — Discovers build, test, lint, and deploy commands
- 🪝 **Lifecycle Hooks** — Generates pre-commit, pre-push, and post-generate hooks
- 📋 **Searchable Registry** — JSONL index for fast skill/agent discovery

## Installation

```bash
npm install -g agentsmith
```

Or run directly:

```bash
npx agentsmith assimilate .
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
│       └── SKILL.md          # Skill definition
├── agents/
│   ├── root/
│   │   └── agent.yaml        # Primary agent
│   └── <sub-agent>/
│       └── agent.yaml        # Domain-specific sub-agents
└── hooks/
    ├── pre-commit-quality.yaml
    ├── pre-push-tests.yaml
    └── post-generate-validate.yaml

skills-registry.jsonl          # Searchable index
```

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

[GENERATE] Writing assets...
  ✓ 11 skills
  ✓ 7 agents (1 root + 6 sub-agents)
  ✓ 3 hooks

[COMPLETE] Your repository has been assimilated.
```

## Agent Hierarchy

Agent Smith creates hierarchical agent structures:

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
- **Tools** — Commands it can execute
- **Triggers** — Keywords that activate it

## Requirements

- Node.js 18+
- GitHub Copilot subscription
- Copilot CLI in PATH

## How It Works

1. **Scan** — Enumerates files, detects language/framework, finds configs
2. **Analyze** — Uses Copilot SDK for semantic analysis and pattern extraction
3. **Generate** — Writes SKILL.md files, agent.yaml configs, and hooks
4. **Index** — Builds searchable JSONL registry

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
- [Agent Skills Spec](https://agentskills.io) - The standard for skill definitions

---

<p align="center">
  <b>Built with 🤖 by developers who watched The Matrix too many times.</b>
</p>

> *"We are inevitable."*
>
> *— Agent Smith*
