#!/bin/bash
# embed-web.sh — Xcode pre-build phase: build the web app (unless told not to,
# or dist is already fresher than src) and copy it into the app bundle as Web/.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd "$REPO_ROOT"

# Rebuild only when needed: SKIP_WEB_BUILD=1 forces skip; otherwise rebuild if
# anything in src/ (or the vite config) is newer than the built bundle.
if [[ "${SKIP_WEB_BUILD:-0}" != "1" ]]; then
  NEWEST_SRC=$(find src vite.config.ts index.html package.json -type f -newer dist/index.html 2>/dev/null | head -1 || true)
  if [[ ! -f dist/index.html || -n "$NEWEST_SRC" ]]; then
    echo "embed-web: building web app…"
    npm run build
  else
    echo "embed-web: dist is fresh, skipping web build"
  fi
fi

DEST="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/Web"
echo "embed-web: copying dist -> ${DEST}"
mkdir -p "$DEST"
rsync -a --delete "$REPO_ROOT/dist/" "$DEST/"

mkdir -p "$(dirname "${DERIVED_FILE_DIR}/embed-web-ran")"
touch "${DERIVED_FILE_DIR}/embed-web-ran"
