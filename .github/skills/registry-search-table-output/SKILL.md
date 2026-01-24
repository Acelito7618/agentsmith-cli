---
name: registry-search-table-output
description: Format registry search results in a fixed-width table with colored type labels.
---

# Registry Search Table Output

Format registry search results in a fixed-width table with colored type labels.

## When to Use

Use this skill when:

- Working with code in `src\commands\search.ts/`
- User mentions "search"
- User mentions "registry"
- User mentions "chalk"
- User mentions "format"

## Patterns

- chalk table borders and padding
- type colorization for agents vs skills
- limit parsing and empty-result messaging

## Examples

```
console.log(chalk.white("│ "+typeColor(type)+" │ "+name+" │ "+desc+" │"));
```

## Category

**patterns** - Common code patterns and conventions
