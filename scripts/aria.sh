#!/bin/bash
# ARIA - KWCAG 2.2 Web Accessibility Checker
# Wrapper script for bundled distribution
#
# Prerequisites:
#   - Node.js >= 20
#   - npx playwright install chromium (first time only)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/aria.cjs" "$@"
