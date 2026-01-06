#!/bin/bash
# worktree-dev.sh - Select a git worktree and spin up tmux with d3k + convex dev

set -e

# Check for fzf
if ! command -v fzf &>/dev/null; then
  echo "fzf is required. Install with: brew install fzf"
  exit 1
fi

# Get script directory and cd to repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Build arrays of worktree data
declare -a names paths
while IFS=' ' read -r path _ branch; do
  branch="${branch#\[}"
  branch="${branch%\]}"
  name="${path##*/}"
  names+=("$name ($branch)")
  paths+=("$path")
done < <(git worktree list)

# Use fzf to select
selected_name=$(printf '%s\n' "${names[@]}" | fzf --prompt="Select worktree: " --height=40% --reverse)

if [[ -z "$selected_name" ]]; then
  echo "No worktree selected"
  exit 1
fi

# Find matching path
for i in "${!names[@]}"; do
  if [[ "${names[$i]}" == "$selected_name" ]]; then
    selected_path="${paths[$i]}"
    break
  fi
done

echo "Starting dev environment for: $selected_name"

# Find next available port starting from base
find_port() {
  local port=$1
  while nc -z localhost "$port" 2>/dev/null || lsof -iTCP:"$port" -sTCP:LISTEN &>/dev/null; do
    ((port++))
  done
  echo "$port"
}

dev_port=$(find_port 3000)
devtools_port=$(find_port 42069)
window_name="${selected_path##*/}"

# Create new window with dev server (keep shell on exit)
# Note: must use `export` for DEVTOOLS_PORT so it propagates through pnpm to vite
tmux new-window -n "$window_name" -c "$selected_path" "echo '=== Dev server starting ===' && echo 'Port: $dev_port' && echo 'Devtools port: $devtools_port' && echo 'Path: $selected_path' && echo && export DEVTOOLS_PORT=$devtools_port && pnpm dev --port $dev_port; exec \$SHELL"

# Split horizontally, run convex dev in second pane (keep shell on exit)
tmux split-window -h -c "$selected_path" "pnpm convex dev; exec $SHELL"
