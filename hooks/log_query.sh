#!/usr/bin/env bash
# HOOK: UserPromptSubmit
#
# Fires every time the user sends a message, BEFORE Claude processes it.
# Input (stdin): JSON with session_id, transcript_path, hook_event_name, prompt
#
# Exit codes:
#   0 = success, Claude continues normally
#   2 = block — use sparingly (e.g. rate limiting, banned words)
#
# This hook logs every customer query with a timestamp and session ID.
# Real use: feed into analytics, detect abuse patterns, compliance logging.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$PROJECT_DIR/logs/queries.log"

# Read the full JSON payload from stdin
INPUT=$(cat)

# Parse fields with jq (falls back to "unknown" if missing)
SESSION=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
PROMPT=$(echo "$INPUT"  | jq -r '.prompt // ""')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Append a structured log line
printf '[%s] session=%s query=%s\n' \
  "$TIMESTAMP" \
  "$SESSION" \
  "$(echo "$PROMPT" | head -c 200 | tr '\n' ' ')" \
  >> "$LOG_FILE"

# Exit 0 = let Claude proceed
exit 0
