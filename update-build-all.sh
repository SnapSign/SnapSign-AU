#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROJECTS=(
  "snapsign.com.au"
  "docs.decodocs.com"
  "Decodocs/web"
  "Decodocs/admin"
  "functions"
)

SKIP_UPDATE=0
SKIP_INSTALL=0
SKIP_BUILD=0

usage() {
  cat <<USAGE
Usage: $(basename "$0") [options]

Runs dependency update (ncu -u), npm install, and build for all npm projects.

Options:
  --skip-update    Skip ncu -u step
  --skip-install   Skip npm i step
  --skip-build     Skip npm run build step
  -h, --help       Show this help

Examples:
  ./update-build-all.sh
  ./update-build-all.sh --skip-update
USAGE
}

log() {
  printf '\n[%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' is not installed or not in PATH." >&2
    exit 1
  fi
}

assert_dir_exists() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    echo "Error: required directory does not exist: $dir" >&2
    exit 1
  fi
}

run_ncu_update() {
  local dir="$1"
  log "Updating dependencies in $dir (ncu -u)"
  (cd "$dir" && npx --yes npm-check-updates -u)
}

run_npm_install() {
  local dir="$1"
  log "Installing dependencies in $dir"
  (cd "$dir" && npm i)
}

run_npm_build() {
  local dir="$1"
  log "Building $dir"
  (cd "$dir" && npm run build)
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-update)
      SKIP_UPDATE=1
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown option '$1'" >&2
      usage
      exit 1
      ;;
  esac
done

require_cmd npm
require_cmd npx

for project in "${PROJECTS[@]}"; do
  assert_dir_exists "$ROOT_DIR/$project"
done

for project in "${PROJECTS[@]}"; do
  project_dir="$ROOT_DIR/$project"

  if [[ "$SKIP_UPDATE" -eq 0 ]]; then
    run_ncu_update "$project_dir"
  else
    log "Skipping dependency update in $project_dir"
  fi

  if [[ "$SKIP_INSTALL" -eq 0 ]]; then
    run_npm_install "$project_dir"
  else
    log "Skipping npm install in $project_dir"
  fi

  if [[ "$SKIP_BUILD" -eq 0 ]]; then
    run_npm_build "$project_dir"
  else
    log "Skipping build in $project_dir"
  fi
done

log "All requested steps completed"
