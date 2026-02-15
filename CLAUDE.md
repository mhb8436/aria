# CLAUDE.md

This file provides guidance to Claude Code when working with the ARIA project.

## Critical Rules

- Do not add Claude Code as a co-author or contributor in git commits
- No emojis in code, comments, or documentation

## Project Overview

ARIA is a KWCAG 2.2 (Korean Web Content Accessibility Guidelines) web accessibility checker.
TypeScript + Playwright + axe-core based tool for automated accessibility testing.

## Build & Run Commands

```bash
# Setup
make install              # Install deps + Playwright chromium

# Development
make dev ARGS="scan https://example.com"
make scan URL=https://example.com
make crawl URL=https://example.com ARGS="--depth 2"

# Test
npm test                  # Run all unit tests (vitest)
npx tsc --noEmit          # Type check
npm run lint              # ESLint

# Build
make build                # TypeScript compile to dist/
```

## Architecture

- `src/cli/` - Commander.js CLI (scan, crawl, report, rules commands)
- `src/core/` - Playwright + axe-core scan engine, crawler, contrast calculator
- `src/rules/` - KWCAG 2.2 mapping table (33 items) + 9 custom rules
- `src/reporter/` - Excel (ExcelJS), HTML, JSON report generators
- `src/store/` - SQLite result storage (better-sqlite3)
- `rules/kwcag22.yaml` - KWCAG 2.2 full definition
- `test/fixtures/` - Pass/fail HTML fixtures for testing

## Key Design Decisions

- axe-core runs inside Playwright page.evaluate() for browser-level accessibility checks
- Custom rules (src/rules/custom/) handle KWCAG-specific checks axe-core doesn't cover
- KWCAG mapping (src/rules/kwcag-map.ts) maps axe rule IDs to KWCAG 2.2 item numbers
- DOM lib included in tsconfig for page.evaluate() callback type checking
- Scanner returns unified ScanResult with violations mapped to KWCAG items

## Testing

- Unit tests: `test/unit/` (vitest, ~69 tests)
- Test fixtures: `test/fixtures/{pass,fail}/` (HTML files)
- Scanner tests use local HTTP server serving fixture files
- Custom rule tests use shared Playwright browser instance
