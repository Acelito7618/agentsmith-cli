---
name: github-url-normalization-and-clone
description: Normalize GitHub URLs, perform shallow clone to a temp directory, and ensure cleanup.
---

# Github Url Normalization And Clone

Normalize GitHub URLs, perform shallow clone to a temp directory, and ensure cleanup.

## When to Use

Use this skill when:

- Working with code in `src\utils/`
- User mentions "clone"
- User mentions "github"
- User mentions "normalize"
- User mentions "temp dir"
- User mentions "cleanup"

## Patterns

- URL normalization (https/git@/github.com/ forms) and .git suffix removal
- temporary directory creation with crypto hash
- simple-git shallow clone with --depth 1
- best-effort cleanup via fs.rm recursive force

## Examples

```
await git.clone(normalizedUrl, tempDir, ["--depth", "1"]);
```

## Category

**reliability** - Error handling, recovery, and fault tolerance
