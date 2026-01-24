---
name: registry-jsonl-search-ranking
description: Build a JSONL registry and search it with relevance scoring and type filtering.
---

# Registry Jsonl Search Ranking

Build a JSONL registry and search it with relevance scoring and type filtering.

## When to Use

Use this skill when:

- Working with code in `src\registry/`
- User mentions "registry"
- User mentions "search"
- User mentions "JSONL"
- User mentions "index"
- User mentions "rank"

## Patterns

- JSONL entries for skills and agents
- scoring by name, description, triggers, and category
- type filtering and boosting for root agents
- safe IO with fallback on missing registry

## Examples

```
if (entry.name.toLowerCase() === queryLower) score += 100;
```

## Category

**quality** - Testing, validation, and code quality
