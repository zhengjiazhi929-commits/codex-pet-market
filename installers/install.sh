#!/bin/sh
set -eu

REPO_RAW="${CODEX_PET_MARKET_RAW_URL:-https://raw.githubusercontent.com/zhengjiazhi929-commits/codex-pet-market/main}"
CATALOG_URL="$REPO_RAW/catalog.json"
PET_ID="${1:-}"

need() {
  command -v "$1" >/dev/null 2>&1 || { printf 'Missing required command: %s\n' "$1" >&2; exit 1; }
}
need curl
need shasum
need python3

TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/codex-pet-market.XXXXXX")"
trap 'rm -rf "$TMP_ROOT"' EXIT HUP INT TERM
curl -fsSL "$CATALOG_URL" -o "$TMP_ROOT/catalog.json"

if [ -z "$PET_ID" ]; then
  python3 - "$TMP_ROOT/catalog.json" <<'PY'
import json, sys
catalog = json.load(open(sys.argv[1], encoding="utf-8"))
print("Available Codex pets:")
for index, pet in enumerate(catalog["pets"], 1):
    print(f"  {index}. {pet['displayName']} ({pet['id']}) — {pet['description']}")
PY
  printf 'Choose a pet number: '
  IFS= read -r CHOICE
  PET_ID="$(python3 - "$TMP_ROOT/catalog.json" "$CHOICE" <<'PY'
import json, sys
catalog = json.load(open(sys.argv[1], encoding="utf-8"))
try:
    print(catalog["pets"][int(sys.argv[2]) - 1]["id"])
except (ValueError, IndexError):
    raise SystemExit("Invalid pet number")
PY
)"
fi

python3 - "$TMP_ROOT/catalog.json" "$PET_ID" "$TMP_ROOT/selected.json" <<'PY'
import json, sys
catalog = json.load(open(sys.argv[1], encoding="utf-8"))
pet = next((item for item in catalog["pets"] if item["id"] == sys.argv[2]), None)
if not pet:
    raise SystemExit(f"Unknown pet ID: {sys.argv[2]}")
json.dump(pet, open(sys.argv[3], "w", encoding="utf-8"))
PY

EXPECTED_ATLAS_HASH="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["sha256"]["spritesheet"])' "$TMP_ROOT/selected.json")"
EXPECTED_ATLAS_BYTES="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["bytes"]["spritesheet"])' "$TMP_ROOT/selected.json")"
PET_BASE="$REPO_RAW/pets/$PET_ID"
curl -fsSL "$PET_BASE/pet.json" -o "$TMP_ROOT/pet.json"
curl -fsSL "$PET_BASE/spritesheet.webp" -o "$TMP_ROOT/spritesheet.webp"

ACTUAL_HASH="$(shasum -a 256 "$TMP_ROOT/spritesheet.webp" | awk '{print $1}')"
ACTUAL_BYTES="$(wc -c < "$TMP_ROOT/spritesheet.webp" | tr -d ' ')"
[ "$ACTUAL_HASH" = "$EXPECTED_ATLAS_HASH" ] || { echo "SHA-256 mismatch; installation stopped." >&2; exit 1; }
[ "$ACTUAL_BYTES" = "$EXPECTED_ATLAS_BYTES" ] || { echo "File size mismatch; installation stopped." >&2; exit 1; }

python3 - "$TMP_ROOT/pet.json" "$PET_ID" <<'PY'
import json, sys
pet = json.load(open(sys.argv[1], encoding="utf-8"))
if pet.get("id") != sys.argv[2] or pet.get("spriteVersionNumber") != 2 or pet.get("spritesheetPath") != "spritesheet.webp":
    raise SystemExit("Unsafe or incompatible pet.json")
PY

CODEX_ROOT="${CODEX_HOME:-$HOME/.codex}"
TARGET="$CODEX_ROOT/pets/$PET_ID"
if [ -e "$TARGET" ]; then
  BACKUP="$CODEX_ROOT/pets-backups/${PET_ID}-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$(dirname "$BACKUP")"
  cp -R "$TARGET" "$BACKUP"
  printf 'Backed up the existing pet to %s\n' "$BACKUP"
fi
mkdir -p "$TARGET"
install -m 0644 "$TMP_ROOT/pet.json" "$TARGET/pet.json"
install -m 0644 "$TMP_ROOT/spritesheet.webp" "$TARGET/spritesheet.webp"
printf 'Installed %s to %s\n' "$PET_ID" "$TARGET"
printf 'If Codex is open, reselect the pet or restart Codex to refresh it.\n'
