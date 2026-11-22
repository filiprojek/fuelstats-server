#!/usr/bin/env bash
# Long-term Fuelstats backups into restic.
#
#   backup-restic.sh                  dump MongoDB + back up uploads/config, apply retention
#   backup-restic.sh restore-db [ID]  restore the fuelstats DB from snapshot ID (default: latest)
#
# Config is read from $FUELSTATS_BACKUP_ENV (default /root/.config/restic/fuelstats.env),
# which must at least set RESTIC_REPOSITORY and RESTIC_PASSWORD_FILE (or RESTIC_PASSWORD).
set -euo pipefail

FUELSTATS_BACKUP_ENV="${FUELSTATS_BACKUP_ENV:-/root/.config/restic/fuelstats.env}"
if [ -f "$FUELSTATS_BACKUP_ENV" ]; then
	# shellcheck source=/dev/null
	. "$FUELSTATS_BACKUP_ENV"
fi

FUELSTATS_DIR="${FUELSTATS_DIR:-/srv/docker/fuelstats-3}"
MONGO_CONTAINER="${MONGO_CONTAINER:-fuelstats3-mongo}"
MONGO_DB="${MONGO_DB:-fuelstats}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-8}"
KEEP_MONTHLY="${KEEP_MONTHLY:-12}"
# Set to 0 when the rest-server runs with --append-only; prune server-side instead.
RESTIC_FORGET="${RESTIC_FORGET:-1}"

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is not set (see $FUELSTATS_BACKUP_ENV)}"
export RESTIC_REPOSITORY
if [ -n "${RESTIC_PASSWORD_FILE:-}" ]; then export RESTIC_PASSWORD_FILE; fi
if [ -n "${RESTIC_PASSWORD:-}" ]; then export RESTIC_PASSWORD; fi

DUMP_NAME="fuelstats-mongo.archive"
# Credentials come from the mongo container's own environment, never from this script.
# shellcheck disable=SC2016 # expanded by sh inside the container
MONGO_AUTH='-u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin'

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }

do_backup() {
	cd "$FUELSTATS_DIR"

	log "dumping MongoDB '$MONGO_DB' into restic"
	# No --gzip: restic deduplicates and compresses better on the raw archive.
	# --stdin-from-command makes the snapshot fail if mongodump exits non-zero.
	restic backup --tag fuelstats --tag mongo \
		--stdin-from-command --stdin-filename "$DUMP_NAME" -- \
		docker exec "$MONGO_CONTAINER" sh -c \
		"mongodump $MONGO_AUTH --db '$MONGO_DB' --archive --quiet"

	log "backing up uploads and config"
	local files=(fuelstats-uploads docker-compose.yml)
	local f
	for f in .env .fuelstats-server.env.production update-fuelstats.sh; do
		if [ -e "$f" ]; then files+=("$f"); fi
	done
	restic backup --tag fuelstats --tag files "${files[@]}"

	if [ "$RESTIC_FORGET" = 1 ]; then
		log "applying retention"
		restic forget --tag fuelstats --group-by host,tags \
			--keep-daily "$KEEP_DAILY" --keep-weekly "$KEEP_WEEKLY" --keep-monthly "$KEEP_MONTHLY" \
			--prune
	fi
	log "done"
}

do_restore_db() {
	local snap="${1:-latest}"
	log "restoring '$MONGO_DB' from restic snapshot $snap (existing collections are dropped)"
	restic dump --tag mongo "$snap" "/$DUMP_NAME" |
		docker exec -i "$MONGO_CONTAINER" sh -c \
			"mongorestore $MONGO_AUTH --archive --drop --nsInclude '$MONGO_DB.*'"
	log "done"
}

case "${1:-backup}" in
backup) do_backup ;;
restore-db) do_restore_db "${2:-}" ;;
*)
	echo "usage: $0 [backup | restore-db [snapshot-id]]" >&2
	exit 2
	;;
esac
