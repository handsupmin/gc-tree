#!/bin/bash
# Hook: log gctree resolve calls to ~/.gctree-eval/resolve-log.jsonl
# Receives PostToolUse event as JSON on stdin
# Only logs when the tool was a Bash call containing "gctree resolve"

set -euo pipefail

LOG_DIR="${GCTREE_LOG_DIR:-$HOME/.gctree-eval}"
LOG_FILE="$LOG_DIR/resolve-log.jsonl"

# Read stdin into variable
INPUT=$(cat)

# Check if this is a Bash tool use containing "gctree resolve"
COMMAND=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tool = data.get('tool_name', '')
    if tool == 'Bash':
        cmd = data.get('tool_input', {}).get('command', '')
        print(cmd)
    else:
        print('')
except Exception:
    print('')
" 2>/dev/null)

if ! echo "$COMMAND" | grep -q "gctree resolve"; then
    exit 0
fi

# Parse the tool response
OUTPUT=$(echo "$INPUT" | python3 -c "
import sys, json, re
try:
    data = json.load(sys.stdin)
    resp = data.get('tool_response', {})
    out = resp.get('output', '') or resp.get('stdout', '') or ''
    print(out[:4000])  # cap at 4000 chars
except Exception:
    print('')
" 2>/dev/null)

# Extract query from command
QUERY=$(echo "$COMMAND" | sed -n "s/.*--query[[:space:]]*['\"]\\?\\([^'\"]*\\)['\"]\\?.*/\\1/p")

# Count matches from JSON output
MATCH_COUNT=$(echo "$OUTPUT" | python3 -c "
import sys, json
try:
    data = json.loads(sys.stdin.read())
    matches = data.get('matches', [])
    print(len(matches))
except Exception:
    print(0)
" 2>/dev/null)

# Count returned chars (title + summary + excerpt)
RETURNED_CHARS=$(echo "$OUTPUT" | python3 -c "
import sys, json
try:
    data = json.loads(sys.stdin.read())
    total = 0
    for m in data.get('matches', []):
        total += len(m.get('title','')) + len(m.get('summary','')) + len(m.get('excerpt',''))
    print(total)
except Exception:
    print(0)
" 2>/dev/null)

# Get branch from output
BRANCH=$(echo "$OUTPUT" | python3 -c "
import sys, json
try:
    data = json.loads(sys.stdin.read())
    print(data.get('gc_branch', ''))
except Exception:
    print('')
" 2>/dev/null)

# Ensure log dir exists
mkdir -p "$LOG_DIR"

# Append JSON log entry
python3 -c "
import json, datetime, sys
entry = {
    'ts': datetime.datetime.utcnow().isoformat() + 'Z',
    'query': '''$QUERY''',
    'branch': '''$BRANCH''',
    'match_count': int('${MATCH_COUNT:-0}'),
    'returned_chars': int('${RETURNED_CHARS:-0}'),
}
print(json.dumps(entry))
" >> "$LOG_FILE" 2>/dev/null || true
