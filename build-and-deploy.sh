#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SNAPSIGN_DIR="$ROOT_DIR/snapsign.com.au"
DECO_WEB_DIR="$ROOT_DIR/Decodocs/web"
DECO_ADMIN_DIR="$ROOT_DIR/Decodocs/admin"
FUNCTIONS_DIR="$ROOT_DIR/functions"

SNAPSIGN_OUT="$SNAPSIGN_DIR/dist"
DECO_WEB_OUT="$DECO_WEB_DIR/decodocs.com"
DECO_ADMIN_OUT="$DECO_ADMIN_DIR/dist"

SKIP_INSTALL=0
SKIP_BUILD=0
SKIP_DEPLOY=0
PROJECT_ID=""
FIREBASE_ONLY="functions,hosting,firestore"
VERSION_BUMP=""

usage() {
  cat <<USAGE
Usage: $(basename "$0") [options]

Builds all dependent subprojects and deploys via Firebase from repo root.

Options:
  --skip-install         Skip npm dependency installation
  --skip-build           Skip npm build steps
  --skip-deploy          Skip Firebase deploy step
  --bump <type>          Bump version in all project package.json files (patch|minor|major)
  --project <projectId>  Firebase project id override (default from .firebaserc)
  --only <targets>       Firebase deploy targets (default: functions,hosting,firestore)
  -h, --help             Show this help

Examples:
  ./build-and-deploy.sh
  ./build-and-deploy.sh --bump patch
  ./build-and-deploy.sh --bump minor --skip-install
  ./build-and-deploy.sh --skip-install
  ./build-and-deploy.sh --skip-deploy
  ./build-and-deploy.sh --project snapsign-au
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

run_npm_ci() {
  local dir="$1"
  log "Installing dependencies in $dir"
  (cd "$dir" && npm ci)
}

run_npm_build() {
  local dir="$1"
  log "Building $dir"
  (cd "$dir" && npm run build)
}

run_npm_script() {
  local dir="$1"
  local script_name="$2"
  log "Running npm script '$script_name' in $dir"
  (cd "$dir" && npm run "$script_name")
}

bump_package_version() {
  local pkg_path="$1"
  local bump="$2"

  node - "$pkg_path" "$bump" <<'NODE'
const fs = require('node:fs');
const pkgPath = process.argv[2];
const bump = process.argv[3];

const raw = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(raw);
const original = pkg.version || '0.1.0';

const match = String(original).match(/^(\d+)\.(\d+)\.(\d+)/);
if (!match) {
  console.error(`Error: unsupported version format in ${pkgPath}: ${original}`);
  process.exit(1);
}

let major = Number(match[1]);
let minor = Number(match[2]);
let patch = Number(match[3]);

if (bump === 'patch') {
  patch += 1;
} else if (bump === 'minor') {
  minor += 1;
  patch = 0;
} else if (bump === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else {
  console.error(`Error: unsupported bump type: ${bump}`);
  process.exit(1);
}

pkg.version = `${major}.${minor}.${patch}`;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`${pkgPath}: ${original} -> ${pkg.version}`);
NODE
}

bump_all_project_versions() {
  local bump="$1"

  log "Bumping project versions: $bump"
  bump_package_version "$SNAPSIGN_DIR/package.json" "$bump"
  bump_package_version "$DECO_WEB_DIR/package.json" "$bump"
  bump_package_version "$DECO_ADMIN_DIR/package.json" "$bump"
  bump_package_version "$FUNCTIONS_DIR/package.json" "$bump"
}

assert_dir_exists() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    echo "Error: required directory does not exist: $dir" >&2
    exit 1
  fi
}

assert_output_exists() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    echo "Error: expected build output directory not found: $dir" >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --skip-deploy)
      SKIP_DEPLOY=1
      shift
      ;;
    --bump)
      VERSION_BUMP="${2:-}"
      if [[ -z "$VERSION_BUMP" ]]; then
        echo "Error: --bump requires a value" >&2
        exit 1
      fi
      if [[ "$VERSION_BUMP" != "patch" && "$VERSION_BUMP" != "minor" && "$VERSION_BUMP" != "major" ]]; then
        echo "Error: --bump must be one of: patch, minor, major" >&2
        exit 1
      fi
      shift 2
      ;;
    --project)
      PROJECT_ID="${2:-}"
      if [[ -z "$PROJECT_ID" ]]; then
        echo "Error: --project requires a value" >&2
        exit 1
      fi
      shift 2
      ;;
    --only)
      FIREBASE_ONLY="${2:-}"
      if [[ -z "$FIREBASE_ONLY" ]]; then
        echo "Error: --only requires a value" >&2
        exit 1
      fi
      shift 2
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
require_cmd firebase

assert_dir_exists "$SNAPSIGN_DIR"
assert_dir_exists "$DECO_WEB_DIR"
assert_dir_exists "$DECO_ADMIN_DIR"
assert_dir_exists "$FUNCTIONS_DIR"

if [[ -n "$VERSION_BUMP" ]]; then
  bump_all_project_versions "$VERSION_BUMP"
fi

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  run_npm_ci "$SNAPSIGN_DIR"
  run_npm_ci "$DECO_WEB_DIR"
  run_npm_ci "$DECO_ADMIN_DIR"
  run_npm_ci "$FUNCTIONS_DIR"
else
  log "Skipping dependency installation"
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  run_npm_build "$SNAPSIGN_DIR"
  run_npm_build "$DECO_WEB_DIR"
  run_npm_build "$DECO_ADMIN_DIR"
  run_npm_script "$FUNCTIONS_DIR" "version:write"

  assert_output_exists "$SNAPSIGN_OUT"
  assert_output_exists "$DECO_WEB_OUT"
  assert_output_exists "$DECO_ADMIN_OUT"

  log "Build outputs verified"
else
  log "Skipping build steps"
fi

if [[ "$SKIP_DEPLOY" -eq 0 ]]; then
  log "Deploying Firebase targets: $FIREBASE_ONLY"
  if [[ -n "$PROJECT_ID" ]]; then
    (cd "$ROOT_DIR" && firebase deploy --project "$PROJECT_ID" --only "$FIREBASE_ONLY")
  else
    (cd "$ROOT_DIR" && firebase deploy --only "$FIREBASE_ONLY")
  fi
  log "Deployment completed"
else
  log "Skipping Firebase deploy"
fi
