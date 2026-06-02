#!/usr/bin/env bash
# HOOK: PostToolUse
#
# Fires AFTER every tool call completes. Cannot block — the action already happened.
# Input (stdin): JSON with session_id, tool_name, tool_input, tool_response
#
# Exit codes:
#   0 = success
#   Non-zero = logged as a warning but Claude continues
#
# This hook writes an audit trail of every tool Claude used.
# Real use: compliance logging, debugging unexpected tool calls, usage analytics.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$PROJECT_DIR/logs/tool_audit.log"

INPUT=$(cat)

SESSION=$(echo "$INPUT"   | jq -r '.session_id // "unknown"')
TOOL=$(echo "$INPUT"      | jq -r '.tool_name // "unknown"')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# For Bash tools, also log the command that ran
if [ "$TOOL" = "Bash" ]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' | head -c 150 | tr '\n' ' ')
  printf '[%s] session=%s tool=%s cmd=%s\n' "$TIMESTAMP" "$SESSION" "$TOOL" "$COMMAND" >> "$LOG_FILE"
else
  printf '[%s] session=%s tool=%s\n' "$TIMESTAMP" "$SESSION" "$TOOL" >> "$LOG_FILE"
fi

exit 0
