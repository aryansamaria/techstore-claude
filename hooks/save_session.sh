#!/usr/bin/env bash
# HOOK: Stop
#
# Fires when Claude finishes a response (end of turn). Cannot block.
# Input (stdin): JSON with session_id, transcript_path, stop_reason
#
# Exit codes: ignored (Claude has already responded)
#
# This hook copies the conversation transcript to a dated archive file.
# Real use: post-turn summarization, alerting, metrics, auto-tagging.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TRANSCRIPTS_DIR="$PROJECT_DIR/logs/transcripts"
SESSION_LOG="$PROJECT_DIR/logs/session.log"

INPUT=$(cat)

SESSION=$(echo "$INPUT"         | jq -r '.session_id // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')
STOP_REASON=$(echo "$INPUT"     | jq -r '.stop_reason // "unknown"')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Log the session end event
printf '[%s] session=%s stop_reason=%s\n' "$TIMESTAMP" "$SESSION" "$STOP_REASON" >> "$SESSION_LOG"

# Archive the transcript if the file exists
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  DEST="$TRANSCRIPTS_DIR/${SESSION}_$(date -u +"%Y%m%dT%H%M%SZ").json"
  cp "$TRANSCRIPT_PATH" "$DEST"
  printf '[%s] session=%s transcript archived to %s\n' "$TIMESTAMP" "$SESSION" "$DEST" >> "$SESSION_LOG"
fi

exit 0
