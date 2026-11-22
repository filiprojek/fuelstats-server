#!/usr/bin/env bash
# Update FuelStats: stop, take a full cold snapshot of the stack dir, pull, rebuild, start.
# Roll back with: sudo ./snapshot.sh restore <tarball printed below>
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")"
STACK_DIR="$PWD"
STACK_NAME="$(basename "$STACK_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$STACK_DIR")/fuelstats-backups}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"

# The mongo data dir is owned by uid 999, so tar needs root.
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
	SUDO="sudo"
	sudo -v # ask for the password now, not while the stack is down
fi

step() { printf '\n==> %s\n' "$*"; }

# If anything fails after the stack is down, try to bring it back up.
on_error() {
	echo "!! update failed, starting the stack again" >&2
	docker compose up -d || true
}

step "Stopping FuelStats before upgrade ..."
docker compose down
trap on_error ERR

step "Backing up $STACK_DIR ..."
$SUDO mkdir -p "$BACKUP_DIR"
$SUDO chmod 700 "$BACKUP_DIR"
BACKUP="$BACKUP_DIR/$STACK_NAME-pre-update-$(date +%F-%H%M%S).tar.gz"
$SUDO tar -czpf "$BACKUP" -C "$(dirname "$STACK_DIR")" "$STACK_NAME"
$SUDO chmod 600 "$BACKUP"
echo "    $BACKUP ($($SUDO du -h "$BACKUP" | cut -f1))"

# Keep only the newest $KEEP_BACKUPS pre-update snapshots.
$SUDO find "$BACKUP_DIR" -maxdepth 1 -name "$STACK_NAME-pre-update-*.tar.gz" -printf '%f\n' |
	sort -r | tail -n +"$((KEEP_BACKUPS + 1))" |
	while read -r old; do
		echo "    removing old backup $old"
		$SUDO rm -f -- "$BACKUP_DIR/$old"
	done

step "Pulling FuelStats Frontend ..."
git -C ./frontend pull origin master

step "Pulling FuelStats Backend ..."
git -C ./backend pull origin master

step "Pulling docker images ..."
docker compose pull

step "Building and starting FuelStats ..."
docker compose up --build -d

trap - ERR
step "Done. Rollback: $SUDO ./snapshot.sh restore $BACKUP"
