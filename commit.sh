#!/usr/bin/env bash
# commit.sh — One-command commit following the dev→staging→release→main pipeline.
# Usage: ./commit.sh "✨ Added something great"
#
# - Stages all changes
# - Unstages .md files (never committed)
# - Commits on the current branch
# - Propagates merges through: current → staging → release → main

set -euo pipefail

MESSAGE="${1:-}"
[[ -z "$MESSAGE" ]] && { printf 'Usage: ./commit.sh "<emoji> Verb desc"\n' >&2; exit 1; }

CURRENT=$(git rev-parse --abbrev-ref HEAD)

# Stage everything, then silently drop .md files from the index
git add .
while IFS= read -r f; do
    git reset HEAD -- "$f" 2>/dev/null || true
done < <(git diff --cached --name-only | grep '\.md$')

# Nothing left to commit?
if git diff --cached --quiet; then
    echo "Nothing to commit."
    exit 0
fi

git commit -m "$MESSAGE"

# Propagate from the current branch toward main following the defined pipeline
readonly PIPELINE=(dev staging release main)
MERGING=false
PREV="$CURRENT"

for BRANCH in "${PIPELINE[@]}"; do
    if [[ "$BRANCH" == "$CURRENT" ]]; then
        git push origin "$CURRENT"
        MERGING=true
        continue
    fi
    $MERGING || continue
    git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"
    git merge "$PREV" --no-edit
    git push origin "$BRANCH"
    PREV="$BRANCH"
done

# If current branch is not in the pipeline, push it directly (no propagation)
if ! $MERGING; then
    git push origin "$CURRENT"
fi

git checkout "$CURRENT"
echo "✅ Committed and pushed from $CURRENT → main"
