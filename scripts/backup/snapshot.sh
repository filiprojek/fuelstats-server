#!/usr/bin/env bash
# One-off Fuelstats backups that are quick to take and quick to apply. Run as root.
#
#   snapshot.sh create [DEST_DIR]   stop stack, tar the whole stack dir (incl. raw DB files), start again
#   snapshot.sh restore TARBALL     replace the stack dir with a tarball made by 'create' and start it
#   snapshot.sh dump [DEST_DIR]     zero-downtime mongodump + uploads/config tarball (portable)
set -euo pipefail

FUELSTATS_DIR="${FUELSTATS_DIR:-/srv/docker/fuelstats-3}"
MONGO_CONTAINER="${MONGO_CONTAINER:-fuelstats3-mongo}"
MONGO_DB="${MONGO_DB:-fuelstats}"
DEFAULT_DEST="${DEFAULT_DEST:-/root/fuelstats-backups}"

PARENT_DIR="$(dirname "$FUELSTATS_DIR")"
STACK_NAME="$(basename "$FUELSTATS_DIR")"
STAMP="$(date +%F-%H%M%S)"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
die() {
	echo "error: $*" >&2
	exit 1
}

[ "$(id -u)" -eq 0 ] || die "run as root (needed to read/keep ownership of the mongo data dir)"

compose() { docker compose --project-directory "$FUELSTATS_DIR" "$@"; }

do_create() {
	local dest="${1:-$DEFAULT_DEST}"
	local out="$dest/$STACK_NAME-$STAMP.tar.gz"
	mkdir -p "$dest"
	chmod 700 "$dest"

	log "stopping stack (mongod shuts down cleanly so the data files are consistent)"
	compose stop
	# Always bring the stack back, even if tar fails.
	trap 'log "starting stack"; compose start' EXIT

	log "writing $out"
	tar -czpf "$out" -C "$PARENT_DIR" "$STACK_NAME"
	chmod 600 "$out"

	trap - EXIT
	log "starting stack"
	compose start
	log "done: $out ($(du -h "$out" | cut -f1))"
}

do_restore() {
	local tarball="${1:-}"
	[ -f "$tarball" ] || die "usage: $0 restore TARBALL"

	local top
	top="$(tar -tzf "$tarball" | head -n1 | cut -d/ -f1 || true)" # tar gets SIGPIPE from head
	[ "$top" = "$STACK_NAME" ] || die "tarball top-level dir is '$top', expected '$STACK_NAME'"

	local old="$FUELSTATS_DIR.before-restore-$STAMP"
	if [ -d "$FUELSTATS_DIR" ]; then
		log "stopping and removing current containers"
		compose down
		log "moving current dir aside to $old"
		mv "$FUELSTATS_DIR" "$old"
	fi

	log "extracting $tarball"
	tar -xzpf "$tarball" -C "$PARENT_DIR"

	# --build: the api-server image may already be built from newer code (e.g. after an update).
	log "rebuilding and starting stack"
	compose up -d --build
	log "done. Old dir kept at $old — delete it once everything looks fine."
}

do_dump() {
	local dest="${1:-$DEFAULT_DEST}"
	local db_out="$dest/$STACK_NAME-db-$STAMP.archive.gz"
	local files_out="$dest/$STACK_NAME-files-$STAMP.tar.gz"
	mkdir -p "$dest"
	chmod 700 "$dest"

	log "dumping MongoDB '$MONGO_DB' to $db_out"
	# shellcheck disable=SC2016 # variables expand inside the container
	docker exec "$MONGO_CONTAINER" sh -c \
		'mongodump -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db "$1" --archive --gzip --quiet' \
		sh "$MONGO_DB" >"$db_out"

	log "archiving uploads and config to $files_out"
	local files=(fuelstats-uploads docker-compose.yml)
	local f
	for f in .env .fuelstats-server.env.production update-fuelstats.sh; do
		if [ -e "$FUELSTATS_DIR/$f" ]; then files+=("$f"); fi
	done
	tar -czpf "$files_out" -C "$FUELSTATS_DIR" "${files[@]}"
	chmod 600 "$db_out" "$files_out"

	log "done"
	cat <<EOF
Restore with:
  docker exec -i $MONGO_CONTAINER sh -c 'mongorestore -u "\$MONGO_INITDB_ROOT_USERNAME" -p "\$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip --drop' < $db_out
  tar -xzpf $files_out -C $FUELSTATS_DIR
EOF
}

case "${1:-}" in
create) do_create "${2:-}" ;;
restore) do_restore "${2:-}" ;;
dump) do_dump "${2:-}" ;;
*)
	echo "usage: $0 {create [DEST_DIR] | restore TARBALL | dump [DEST_DIR]}" >&2
	exit 2
	;;
esac
