#!/bin/bash
set -euo pipefail

# Only needed in Claude Code cloud sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# npm install (not npm ci) so the cached container state is reused between sessions.
npm install --no-audit --no-fund
