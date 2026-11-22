#!/usr/bin/env bash
# Update FuelStats: stop, take a full cold snapshot of the stack dir, pull, rebuild, start.
# Run as your normal user; root is needed only for the snapshot (via doas, or sudo).
# Roll back with: doas ./snapshot.sh restore <tarball printed at the end>
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")"
STACK_DIR="$PWD"
STACK_NAME="$(basename "$STACK_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$STACK_DIR")/fuelstats-backups}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"
BACKUP="$BACKUP_DIR/$STACK_NAME-pre-update-$(date +%F-%H%M%S).tar.gz"

# The mongo data dir is owned by uid 999, so the snapshot needs root.
if [ "$(id -u)" -eq 0 ]; then
	AS_ROOT=()
elif command -v doas >/dev/null 2>&1; then
	AS_ROOT=(doas)
elif command -v sudo >/dev/null 2>&1; then
	AS_ROOT=(sudo)
else
	echo "error: need root, doas or sudo" >&2
	exit 1
fi

step() { printf '\n==> %s\n' "$*"; }

# If anything fails after the stack is down, try to bring it back up.
on_error() {
	echo "!! update failed, starting the stack again" >&2
	docker compose up -d || true
}
trap on_error ERR

# Stop + snapshot + prune run in ONE elevated shell: a single password prompt,
# asked before the stack goes down (doas has no 'sudo -v' equivalent).
step "Stopping FuelStats and backing up $STACK_DIR ..."
"${AS_ROOT[@]}" bash -s -- "$STACK_DIR" "$BACKUP_DIR" "$BACKUP" "$KEEP_BACKUPS" <<'ROOT'
set -euo pipefail
stack_dir=$1 backup_dir=$2 backup=$3 keep=$4
stack_name=$(basename "$stack_dir")

docker compose --project-directory "$stack_dir" down

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
tar -czpf "$backup" -C "$(dirname "$stack_dir")" "$stack_name"
chmod 600 "$backup"
echo "    $backup ($(du -h "$backup" | cut -f1))"

# Keep only the newest $keep pre-update snapshots.
# Glob results are sorted, and the timestamp in the name sorts chronologically.
shopt -s nullglob
snaps=("$backup_dir/$stack_name"-pre-update-*.tar.gz)
for ((i = 0; i < ${#snaps[@]} - keep; i++)); do
	echo "    removing old backup $(basename "${snaps[i]}")"
	rm -f -- "${snaps[i]}"
done
ROOT

step "Pulling FuelStats Frontend ..."
git -C ./frontend pull origin master

step "Pulling FuelStats Backend ..."
git -C ./backend pull origin master

step "Pulling docker images ..."
docker compose pull

step "Building and starting FuelStats ..."
docker compose up --build -d

trap - ERR
step "Done. Rollback: ${AS_ROOT[*]:+${AS_ROOT[*]} }./snapshot.sh restore $BACKUP"
