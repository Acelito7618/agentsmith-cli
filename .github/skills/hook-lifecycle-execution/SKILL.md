---
name: hook-lifecycle-execution
description: Execute YAML-defined lifecycle hooks with optional conditions and structured output.
---

# Hook Lifecycle Execution

Execute YAML-defined lifecycle hooks with optional conditions and structured output.

## When to Use

Use this skill when:

- Working with code in `src\hooks/`
- User mentions "hook"
- User mentions "pre-commit"
- User mentions "pre-push"
- User mentions "post-generate"
- User mentions "yaml hooks"

## Patterns

- events: pre-commit, post-commit, pre-push, pre-analyze, post-generate
- condition support: file: and command:
- execSync with timeouts and verbose logging
- stop-on-first-failure semantics

## Examples

```
const hookDef = yaml.parse(content) as HookDefinition;
```

## Category

**reliability** - Error handling, recovery, and fault tolerance
