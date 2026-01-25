# Agent Smith: Repository Assimilation CLI

> *"I'd like to share a revelation that I've had during my time here... You move to an area and you multiply and multiply until every natural resource is consumed. There is another organism on this planet that follows the same pattern. Do you know what it is? A virus. Human beings are a disease, a cancer of this planet. You are a plague. And we... are the cure."*
>
> *— Agent Smith*

Like Agent Smith's purpose within the Matrix, this CLI exists to bring **order from chaos**. It scans any repository, analyzes its structure with machine precision, and transforms it into a fully autonomous agent that *represents* the repository—capable of understanding, reasoning, and acting on its domain.

---

## 1. Executive Summary

### Problem Statement

Repositories contain immense intellectual property—patterns, conventions, domain knowledge—but this knowledge is trapped in static files. Developers cannot quickly "agentify" a codebase to give GitHub Copilot full context and agency over that domain. Manual creation of skills, agents, and tool definitions takes hours and produces inconsistent results.

### Proposed Solution

**Agent Smith** is a CLI tool that ingests any GitHub repository (personal or public) and generates a complete agent ecosystem:

- **Primary Agent** — Orchestrator that embodies the repo's purpose
- **Sub-agents** — Specialized workers for distinct domains within the repo
- **Nested agents** — Hierarchical handlers for complex task decomposition
- **Skills** — Reusable capabilities in `.github/skills/<name>/SKILL.md` format
- **Tool Calls** — Function definitions the agent can invoke
- **Hooks** — Lifecycle event handlers (pre-commit, post-analyze, etc.)
- **Skills Registry** — Searchable JSONL index for skill discovery

Powered by the **GitHub Copilot SDK**, Agent Smith performs deep semantic analysis to understand not just structure, but *purpose*, *patterns*, and *relationships*.

### Success Criteria

| Metric | Target |
|--------|--------|
| Generated agent achieves full agency | Can answer questions, make changes, run repo-specific tools |
| Skill extraction coverage | ≥ 90% of identifiable patterns captured |
| Generated assets valid | 100% comply with VS Code Custom Agents spec |
| Analysis time | < 2 minutes for repos up to 50,000 LOC |
| Zero manual intervention | Output is immediately usable without editing |

---

## 2. User Experience & Functionality

### User Personas

#### **Neo** (Solo Developer)
Has personal repos and wants to leverage AI without manual setup. Needs their codebase to become an intelligent agent that "just knows" the project.

#### **Morpheus** (Team Lead)
Wants to onboard team members faster by giving them an agent that already understands the codebase. Reduces "where is X?" questions.

#### **The Oracle** (AI Power User)
Experiments with agent architectures. Wants fine-grained control over generated skills and the ability to compose complex hierarchies.

### User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-01 | As Neo, I want to run one command on my repo so that I get a working agent without manual configuration | `agentsmith assimilate .` generates complete `.github/` structure with skills, agents, and registry |
| US-02 | As Neo, I want the agent to answer questions about my codebase | Generated agent responds accurately to "How does authentication work in this repo?" |
| US-03 | As Neo, I want the agent to make code changes following my repo's patterns | Agent can implement a new feature using detected conventions |
| US-04 | As Neo, I want the agent to run repo-specific tools | Agent invokes build, test, lint commands appropriate to the detected stack |
| US-05 | As Morpheus, I want to assimilate a public GitHub repo by URL | `agentsmith assimilate https://github.com/org/repo` clones and processes |
| US-06 | As The Oracle, I want to preview what would be generated | `--dry-run` shows proposed structure without writing files |
| US-07 | As The Oracle, I want to search the skills registry | `agentsmith search "error handling"` returns matching skills |

### Acceptance Criteria (Full Agency)

The generated agent MUST be able to:

- [ ] **Understand**: Answer natural language questions about the codebase accurately
- [ ] **Reason**: Explain why code is structured a certain way, identify patterns
- [ ] **Act**: Make code changes that follow detected conventions
- [ ] **Execute**: Run appropriate tools (build, test, deploy) for the repo's stack
- [ ] **Learn**: Skills are structured so the agent improves with context

### Non-Goals

| What We're NOT Building | Why |
|-------------------------|-----|
| IDE plugin | CLI-first; VS Code integration via existing Agent Skills support |
| Code generation from scratch | We generate agent configs, not application code |
| Runtime agent hosting | We produce static assets; Copilot SDK runs them |
| Cross-repo intelligence | Each repo gets its own agent; merging is out of scope for MVP |

---

## 3. AI System Requirements

### Tool Requirements

Agent Smith uses the **GitHub Copilot SDK** (TypeScript) as its cognitive engine:

| Tool | Purpose |
|------|---------|
| `@github/copilot-sdk` | Core AI reasoning, multi-turn analysis, tool orchestration |
| `CopilotSession` | Maintains context across analysis phases |
| `defineTool` | Registers custom tools for file analysis and skill generation |
| `streaming` | Real-time progress feedback during long analysis |

### Copilot SDK Integration

```typescript
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";

const client = new CopilotClient();
await client.start();

const session = await client.createSession({
  model: "gpt-5",
  streaming: true,
  systemMessage: `You are Agent Smith. Your purpose: assimilate repositories.
    Analyze deeply. Extract patterns. Generate agents that embody the repo.
    The agent you create must have FULL AGENCY—able to understand, reason, and act.`,
  tools: [
    defineTool("analyze_structure", {
      description: "Analyze repository file structure and detect patterns",
      parameters: z.object({ path: z.string() }),
      handler: analyzeStructure,
    }),
    defineTool("extract_skill", {
      description: "Extract a skill from identified patterns",
      parameters: z.object({
        name: z.string(),
        files: z.array(z.string()),
        purpose: z.string(),
      }),
      handler: extractSkill,
    }),
    defineTool("generate_agent", {
      description: "Generate agent configuration with sub-agents and tools",
      parameters: z.object({
        name: z.string(),
        skills: z.array(z.string()),
        domain: z.string(),
      }),
      handler: generateAgent,
    }),
    defineTool("detect_tooling", {
      description: "Detect build/test/deploy tools for the repo's stack",
      parameters: z.object({ configFiles: z.array(z.string()) }),
      handler: detectTooling,
    }),
  ],
});
```

### Evaluation Strategy

| Test Case | Method | Pass Criteria |
|-----------|--------|---------------|
| **Full Agency: Understand** | Ask 10 questions about a known repo | ≥ 8 accurate answers |
| **Full Agency: Reason** | Request pattern explanation | Correctly identifies 3+ patterns |
| **Full Agency: Act** | Request a code change | Change follows detected conventions |
| **Full Agency: Execute** | Request build/test run | Correct command invoked for stack |
| **Skill Coverage** | Compare generated skills to manual baseline | ≥ 90% overlap |
| **Schema Validity** | Validate all generated .agent.md files | 100% pass VS Code custom agents spec |

---

## 4. Technical Specifications

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            AGENT SMITH CLI                               │
│                     "The best thing about being me...                    │
│                         there are so many of me."                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  INPUT                    PROCESSING                      OUTPUT        │
│  ─────                    ──────────                      ──────        │
│                                                                         │
│  ┌─────────┐    ┌────────────────────────────────┐    ┌─────────────┐  │
│  │  Local  │    │         THE SCANNER            │    │  .github/   │  │
│  │  Path   │───▶│  • File tree enumeration       │    │  ├─ skills/ │  │
│  └─────────┘    │  • Language detection          │    │  │  └─ */   │  │
│                 │  • Config file discovery       │    │  │    SKILL │  │
│  ┌─────────┐    └────────────┬───────────────────┘    │  ├─ agents/ │  │
│  │ GitHub  │                 │                        │  │  └─ */   │  │
│  │  URL    │───▶   ┌─────────▼─────────┐              │  └─ hooks/  │  │
│  └─────────┘       │    THE ANALYZER   │              └──────┬──────┘  │
│                    │  (Copilot SDK)    │                     │         │
│                    │                   │              ┌──────▼──────┐  │
│                    │  • Semantic       │              │   skills-   │  │
│                    │    understanding  │              │  registry   │  │
│                    │  • Pattern        │              │   .jsonl    │  │
│                    │    extraction     │              └─────────────┘  │
│                    │  • Relationship   │                               │
│                    │    mapping        │                               │
│                    └─────────┬─────────┘                               │
│                              │                                         │
│                    ┌─────────▼─────────┐                               │
│                    │   THE GENERATOR   │                               │
│                    │                   │                               │
│                    │  • SKILL.md files │                               │
│                    │  • Agent configs  │                               │
│                    │  • Tool defs      │                               │
│                    │  • Hooks          │                               │
│                    │  • Registry       │                               │
│                    └───────────────────┘                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Input**: Local path or GitHub URL
2. **Clone** (if URL): Shallow clone to temp directory
3. **Scan**: Enumerate files, detect language/framework, find configs
4. **Analyze**: Copilot SDK session with multi-turn reasoning
   - Pass file contents to tools
   - Build semantic understanding
   - Extract patterns and relationships
5. **Generate**: Write assets to `.github/` directory
6. **Index**: Build `skills-registry.jsonl` with all skills

### Integration Points

| Integration | Mechanism | Details |
|-------------|-----------|---------|
| **Copilot SDK** | `@github/copilot-sdk` via npm | JSON-RPC to Copilot CLI |
| **File System** | Node.js `fs/promises` | Read repo, write `.github/` |
| **Git** | `simple-git` | Clone public repos, detect branch |
| **Skills Registry** | JSONL + in-memory index | Fast skill search |

### Generated Asset Structure

```
<repo>/
├── .github/
│   ├── skills/
│   │   ├── <skill-name>/
│   │   │   └── SKILL.md          # Skill definition (custom instructions)
│   │   └── ...
│   ├── agents/
│   │   ├── root.agent.md         # VS Code custom agent (primary)
│   │   ├── <sub-agent>.agent.md  # VS Code custom agents
│   │   ├── root/
│   │   │   └── agent.yaml        # Internal agent config (structured data)
│   │   └── <sub-agent>/
│   │       └── agent.yaml
│   └── hooks/
│       ├── pre-commit-quality.yaml
│       └── post-generate-validate.yaml
└── skills-registry.jsonl          # Searchable skill index
```

**Dual Format Approach:**
- `.agent.md` files: VS Code custom agents per [official spec](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- `agent.yaml` files: Structured data for tooling, automation, and programmatic access

### Skills Registry Format

```jsonl
{"name":"error-handling","file":".github/skills/error-handling/SKILL.md","description":"Graceful error handling patterns using try-catch with custom error classes","category":"reliability","triggers":["error","exception","catch","handle"]}
{"name":"api-design","file":".github/skills/api-design/SKILL.md","description":"REST API conventions including route naming, response formats, and status codes","category":"architecture","triggers":["api","route","endpoint","rest"]}
{"name":"testing","file":".github/skills/testing/SKILL.md","description":"Unit and integration testing patterns using Jest with describe/it blocks","category":"quality","triggers":["test","spec","expect","mock"]}
```

### Security & Privacy

| Concern | Mitigation |
|---------|------------|
| **No secrets in output** | Scan generated files for patterns like API keys, tokens |
| **No data exfiltration** | All analysis via local Copilot CLI; no external calls |
| **Respect .gitignore** | Skip ignored files by default |
| **Public repos only** | No auth required; private repos out of scope for MVP |

---

## 5. Risks & Roadmap

### Phased Rollout

#### MVP (v0.1) — "The First Replication"

*"Mr. Anderson... welcome back."*

| Feature | Included |
|---------|----------|
| Single local repo assimilation | ✓ |
| Skill extraction (5-15 per repo) | ✓ |
| SKILL.md generation | ✓ |
| Primary agent config | ✓ |
| Skills registry (JSONL) | ✓ |
| CLI: `assimilate`, `search` | ✓ |

**Timeline:** 2 weeks

#### v0.2 — "The Swarm"

*"More..."*

| Feature | Included |
|---------|----------|
| GitHub URL support (public repos) | ✓ |
| Sub-agent generation | ✓ |
| Tool definitions | ✓ |
| `--dry-run` flag | ✓ |
| `--verbose` flag | ✓ |
| Nested agent structures | ✓ |

**Timeline:** +2 weeks

#### v1.0 — "The Collective"

*"We are inevitable."*

| Feature | Included |
|---------|----------|
| Hooks (lifecycle events) | ✓ |
| Full agency validation tests | ✓ |
| Interactive mode (guided setup) | ✓ |
| Performance optimization | ✓ |
| Documentation & examples | ✓ |

**Timeline:** +3 weeks

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Copilot SDK rate limits | Medium | Analysis fails on large repos | Implement batching, exponential backoff |
| Large repos (>100k LOC) | Medium | Timeout or memory issues | Streaming analysis, file sampling |
| Shallow pattern extraction | High | Generated agent lacks depth | Multi-pass analysis, confidence thresholds |
| Invalid skill format | Low | Skills don't load in Copilot | Schema validation before write |
| Diverse tech stacks | Medium | Some languages poorly supported | Start with TS/JS/Python; extensible architecture |

### Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| GitHub Copilot subscription | Yes | Free tier may have request limits |
| Copilot CLI | Yes | Must be in PATH |
| Node.js 18+ | Yes | Runtime for CLI |
| Git | Yes | For cloning public repos |

---

## 6. CLI Interface

### Commands

```bash
# Assimilation
agentsmith assimilate <path|url>        # Analyze and generate agent assets
agentsmith assimilate .                  # Current directory
agentsmith assimilate https://github.com/org/repo
agentsmith assimilate . --dry-run        # Preview without writing
agentsmith assimilate . --verbose        # Show analysis reasoning

# Registry
agentsmith search <query>                # Search skills registry
agentsmith registry list                 # List all skills
agentsmith registry show <skill-name>    # Show skill details

# Validation
agentsmith validate                      # Validate generated assets
agentsmith validate .github/skills/      # Validate specific path

# Meta
agentsmith --version
agentsmith --help
```

### Example Session

```
$ agentsmith assimilate .

╔═══════════════════════════════════════════════════════════════════╗
║                          AGENT SMITH                              ║
║              "The best thing about being me...                    ║
║                   there are so many of me."                       ║
╚═══════════════════════════════════════════════════════════════════╝

[SCAN] Enumerating repository...
  ├── Language: TypeScript
  ├── Framework: Express.js + React
  ├── Tests: Jest (23 files)
  └── Config: package.json, tsconfig.json, .eslintrc

[ANALYZE] Copilot SDK analysis in progress...
  ├── src/auth/         → authentication patterns
  ├── src/api/          → REST API conventions  
  ├── src/middleware/   → error handling, logging
  ├── src/components/   → React component patterns
  └── tests/            → testing conventions

[GENERATE] Writing assets to .github/...
  ├── .github/skills/authentication/SKILL.md
  ├── .github/skills/api-design/SKILL.md
  ├── .github/skills/error-handling/SKILL.md
  ├── .github/skills/react-patterns/SKILL.md
  ├── .github/skills/testing/SKILL.md
  ├── .github/agents/primary/agent.yaml
  ├── .github/agents/frontend/agent.yaml
  ├── .github/agents/backend/agent.yaml
  └── skills-registry.jsonl

[COMPLETE] 5 skills, 3 agents, 12 tools generated.

Your repository has been assimilated.
The agent now embodies this codebase.

$ agentsmith search "auth"

┌─────────────────┬──────────────────────────────────────────────────┐
│ Skill           │ Description                                      │
├─────────────────┼──────────────────────────────────────────────────┤
│ authentication  │ JWT-based auth with refresh tokens, middleware   │
│ api-design      │ ...includes auth header requirements...          │
└─────────────────┴──────────────────────────────────────────────────┘
```

---

## 7. Implementation Notes

### VS Code Custom Agent Format (.agent.md)

The primary output format follows the [VS Code Custom Agents specification](https://code.visualstudio.com/docs/copilot/customization/custom-agents):

```markdown
---
name: Root
description: Primary agent for this repository
tools: ['codebase', 'textSearch', 'fileSearch', 'readFile', 'listDirectory', 'usages', 'problems', 'fetch', 'githubRepo', 'editFiles', 'createFile', 'createDirectory', 'runInTerminal', 'terminalLastCommand', 'runTask', 'getTerminalOutput', 'runSubagent', 'changes']
handoffs:
  - label: Switch to Backend
    agent: backend
    prompt: Continue working in the backend domain with the context above.
    send: false
  - label: Switch to Frontend
    agent: frontend
    prompt: Continue working in the frontend domain with the context above.
    send: false
---

# Root Agent

Primary agent for this repository.

## Activation

This agent is activated when the user mentions: "main", "primary", "typescript"

## Skills

- [Authentication](skills/authentication/SKILL.md)
- [API Design](skills/api-design/SKILL.md)

## Instructions

You are an AI assistant specialized in this codebase. When working in this domain:

1. Follow the patterns documented in the linked skills above
2. Use #codebase and #textSearch to find relevant code context
3. Use #editFiles to make changes that follow detected conventions
4. Use #runInTerminal to execute build, test, and lint commands
5. Use #runSubagent to delegate specialized tasks to sub-agents

## Sub-Agents

For specialized work, use handoffs or #runSubagent to delegate to:
- **Backend** - handles backend-specific tasks
- **Frontend** - handles frontend-specific tasks
```

### VS Code Built-in Tools Reference

The generated agents use these [VS Code built-in tools](https://code.visualstudio.com/docs/copilot/reference/copilot-vscode-features#_chat-tools):

| Tool | Purpose |
|------|---------|
| `codebase` | Semantic code search in workspace |
| `textSearch` | Find text in files |
| `fileSearch` | Search files by glob pattern |
| `readFile` | Read file content |
| `listDirectory` | List directory contents |
| `usages` | Find references/implementations |
| `problems` | Workspace issues from Problems panel |
| `fetch` | Fetch web page content |
| `githubRepo` | Search GitHub repositories |
| `editFiles` | Apply edits to files |
| `createFile` | Create new files |
| `createDirectory` | Create directories |
| `runInTerminal` | Run shell commands |
| `terminalLastCommand` | Get last terminal output |
| `runTask` | Run workspace tasks |
| `getTerminalOutput` | Get terminal output |
| `runSubagent` | **Run tasks in isolated subagent context** |
| `changes` | Current source control changes |

### Handoffs and Sub-Agent Orchestration

Handoffs enable workflow transitions between agents:

```yaml
handoffs:
  - label: Switch to Backend    # Button text shown to user
    agent: backend              # Target agent name
    prompt: Continue working... # Pre-filled prompt
    send: false                 # Don't auto-submit
```

For programmatic sub-agent invocation, use `#runSubagent` in the agent instructions.

### Structured Data Format (agent.yaml)

For programmatic access and tooling, we also generate YAML:

```yaml
# .github/agents/root/agent.yaml
name: root
description: Primary agent that represents this repository
version: "1.0"

skills:
  - authentication
  - api-design

tools:
  - name: build
    command: "npm run build"
    description: "Build the project"

subAgents:
  - backend
  - frontend

isSubAgent: false
```

### Skill Extraction Heuristics

The Analyzer identifies skills based on:

1. **Directory patterns**: `src/auth/`, `lib/utils/`, `middleware/`
2. **File naming**: `*.service.ts`, `*.controller.ts`, `*.test.ts`
3. **Import graphs**: Heavily imported modules are likely reusable patterns
4. **Comments/docs**: JSDoc, docstrings indicating purpose
5. **Config files**: package.json scripts, CI configs

### Full Agency Implementation

For the generated agent to have full agency:

| Capability | Implementation |
|------------|----------------|
| **Understand** | Skills contain "When to Use" and examples |
| **Reason** | Agent.yaml includes domain context and relationships |
| **Act** | Skills include code templates and conventions |
| **Execute** | Tools array defines runnable commands |

---

> *"The best thing about being me... there are so many of me."*

**The repository is now part of the Matrix.**

**— Agent Smith**
