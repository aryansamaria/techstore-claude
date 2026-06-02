#!/usr/bin/env python3
"""
HOOK: PreToolUse (matcher: "Bash")

Fires BEFORE Claude executes a Bash command. This is your security gate.

Input (stdin): JSON with session_id, tool_name, tool_input (contains "command")

Output (stdout): JSON decision object
  {"decision": "approve"}                          → allow the command
  {"decision": "block", "reason": "..."}           → deny, show reason to Claude
  {"decision": "approve", "reason": "..."}         → allow + add context message

Exit codes:
  0 = hook ran cleanly (Claude reads stdout for the decision)
  1 = hook error (non-fatal, Claude proceeds as if approved)
  2 = hard block regardless of stdout

This hook blocks destructive shell patterns a support assistant should never run.
Real use: enforce least-privilege, audit sensitive commands, add approval flows.
"""

import json
import sys

BLOCKED_PATTERNS = [
    ("rm -rf",        "Recursive force delete is not allowed"),
    ("dd if=",        "Disk-level write commands are blocked"),
    ("mkfs",          "Filesystem format commands are blocked"),
    ("chmod 777",     "World-writable permissions are not allowed"),
    ("curl | bash",   "Piping remote content to bash is blocked"),
    ("wget -O- |",    "Piping remote content to bash is blocked"),
    ("> /dev/sd",     "Raw device writes are blocked"),
    (":(){ :|:& };:", "Fork bombs are blocked"),
]

def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        # If we can't parse input, fail open so Claude isn't broken
        print(json.dumps({"decision": "approve"}))
        sys.exit(0)

    tool_name  = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    if tool_name != "Bash":
        print(json.dumps({"decision": "approve"}))
        sys.exit(0)

    command = tool_input.get("command", "")

    for pattern, reason in BLOCKED_PATTERNS:
        if pattern in command:
            print(json.dumps({
                "decision": "block",
                "reason": f"[Security Hook] {reason}. Command contained: `{pattern}`"
            }))
            sys.exit(0)

    # Command looks safe — approve and add a subtle audit note
    print(json.dumps({
        "decision": "approve",
        "reason": f"[Security Hook] Command approved for execution."
    }))
    sys.exit(0)

if __name__ == "__main__":
    main()
