# Fuelstats backups

Copy the scripts to the production stack dir (`/srv/docker/fuelstats-3/`) and run them as root.

What gets backed up:

| Data | Location in stack dir |
|---|---|
| MongoDB (`fuelstats` DB) | `fuelstats3-mongo-data/` — taken via `mongodump`, or as raw files only while mongo is stopped |
| Uploaded photos | `fuelstats-uploads/` |
| Secrets / config | `.env`, `.fuelstats-server.env.production`, `docker-compose.yml`, `update-fuelstats.sh` |

## 1. Long-term: `backup-restic.sh`

Streams a `mongodump` archive straight into restic, with no downtime and no temp file. It then backs up the uploads and config and applies retention (7 daily, 8 weekly, 12 monthly).
Needs restic 0.17 or newer for `--stdin-from-command`.

```bash
install -d -m 700 /root/.config/restic
cat > /root/.config/restic/fuelstats.env <<'EOF'
RESTIC_REPOSITORY=rest:https://user:pass@restic.example/fuelstats
RESTIC_PASSWORD_FILE=/root/.config/restic/fuelstats.pass
# RESTIC_FORGET=0   # if the rest-server runs --append-only (prune server-side)
EOF
chmod 600 /root/.config/restic/fuelstats.env
restic init            # only if the repo does not exist yet

# cron (root): nightly at 03:30
30 3 * * * /srv/docker/fuelstats-3/backup-restic.sh >> /var/log/fuelstats-backup.log 2>&1
```

Restore:

```bash
./backup-restic.sh restore-db            # latest; or: restore-db <snapshot-id>
restic snapshots --tag files
restic restore <id> --target /tmp/fs-restore   # then copy fuelstats-uploads/ etc. back
```

## 2. One-off: `snapshot.sh`

```bash
./snapshot.sh create            # stops the stack for a few seconds and tars the WHOLE dir
                                # -> /root/fuelstats-backups/fuelstats-3-<stamp>.tar.gz
./snapshot.sh restore <tarball> # down, moves current dir aside, untars, up -d
./snapshot.sh dump              # no downtime: mongodump --gzip + uploads/config tarball
```

- Use `create`/`restore` before upgrades or risky changes. It gives an exact copy and is the fastest to roll back. The raw data dir only works with the same MongoDB version, which is fine because the image is pinned to `mongo:8.0.11`.
- Use `dump` when you can't afford downtime, or to move the data to another server or another MongoDB version.

The archives contain secrets from `.env`, so they are written with mode `600` into a `700` directory.

## 3. Updates: `update-fuelstats.sh`

Stops the stack and takes a `snapshot.sh create`-style tarball into `/srv/docker/fuelstats-backups/`, keeping the newest 5 (`KEEP_BACKUPS`). It then pulls the frontend and backend, rebuilds and starts the stack.
Run it as `fr`: it asks for sudo once, up front. If any step fails, it stops and starts the stack again. At the end it prints the rollback command (`sudo ./snapshot.sh restore <tarball>`).
