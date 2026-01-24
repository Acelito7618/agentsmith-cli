---
name: asset-generation-templates
description: Generate SKILL.md, agent.yaml, and hook YAML files with structured content.
---

# Asset Generation Templates

Generate SKILL.md, agent.yaml, and hook YAML files with structured content.

## When to Use

Use this skill when:

- Working with code in `src\generator/`
- User mentions "generate"
- User mentions "SKILL.md"
- User mentions "agent.yaml"
- User mentions "hooks"
- User mentions "templates"

## Patterns

- frontmatter SKILL.md with name/description
- agent.yaml with skills/tools/triggers/hierarchy/sourceDir
- hook YAML with commands and optional condition
- dry-run support and directory creation

## Examples

```
await fs.writeFile(agentFile, content, "utf-8");
```

## Category

**architecture** - Structural patterns and system design
