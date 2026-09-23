# Daily workflow

## Local changes

```bash
git pull --ff-only
npm ci
npm run migrate:vps
npm run dev
```

After implementation:

```bash
npm run typecheck
npm run lint
npm test
git status
git add <changed-files>
git commit -m "Describe the change"
git push
```

Never commit `.env`, `.data`, tokens, session secrets or uploaded production media.

## Deploy to VPS

Create a backup first, then:

```bash
cd /var/www/fasadof/fasadof
./scripts/deploy-vps.sh
```

The script performs `git pull --ff-only`, `npm ci`, typecheck, forward-only migrations, build, systemd restart and `/health` verification.

## Backup

For a consistent copy, briefly stop the service or use SQLite `.backup`:

```bash
sudo sqlite3 /var/lib/fasadof/fasadof.sqlite ".backup '/var/backups/fasadof-$(date +%F-%H%M).sqlite'"
sudo tar -czf /var/backups/fasadof-media-$(date +%F-%H%M).tar.gz /var/lib/fasadof/media
```

Keep several dated off-server copies and periodically test restore on staging.

## Rollback

Prefer an explicit Git revert:

```bash
git revert <bad-commit>
git push
```

Deploy again. Migrations are forward-only. Restore the database backup only when the data migration itself must be reversed, and stop the service before replacing live database files.
