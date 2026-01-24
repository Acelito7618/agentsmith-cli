---
name: repo-scanning-and-detection
description: Scan repositories, ignore noise, detect language/framework/config/tests, and identify source directories.
---

# Repo Scanning And Detection

Scan repositories, ignore noise, detect language/framework/config/tests, and identify source directories.

## When to Use

Use this skill when:

- Working with code in `src\scanner/`
- User mentions "scan"
- User mentions "glob"
- User mentions "language"
- User mentions "framework"
- User mentions "config"
- User mentions "tests"
- User mentions "source dirs"

## Patterns

- glob-based enumeration with ignore patterns
- language detection via extension counts with tsconfig override
- framework detection via package.json dependency inspection
- config/test file detection and source directory heuristics

## Examples

```
const allFiles = await glob("**/*", { cwd: this.rootPath, nodir: true, ignore: IGNORE_PATTERNS });
```

## Category

**patterns** - Common code patterns and conventions
