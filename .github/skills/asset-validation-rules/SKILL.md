---
name: asset-validation-rules
description: Validate generated assets for presence, structure, and correctness with actionable errors/warnings.
---

# Asset Validation Rules

Validate generated assets for presence, structure, and correctness with actionable errors/warnings.

## When to Use

Use this skill when:

- Working with code in `src\commands\validate.ts/`
- User mentions "validate"
- User mentions "frontmatter"
- User mentions "agent.yaml"
- User mentions "hooks"
- User mentions "registry"

## Patterns

- SKILL.md YAML frontmatter presence and fields
- agent.yaml name/description/root presence and skill references
- hook event validity and commands array
- registry JSONL parse and per-line validation

## Examples

```
if (!content.startsWith("---")) result.errors.push(`${dir.name}/SKILL.md: Missing YAML frontmatter`);
```

## Category

**quality** - Testing, validation, and code quality
