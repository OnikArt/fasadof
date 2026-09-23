# Vercel and Railway

These platforms are not the supported production target. The application depends on a writable persistent data directory for SQLite and uploaded media, so the documented deployment is the VPS in `docs/VPS_DEPLOY.md`.

The repository retains optional build metadata for experiments, but do not point the production domain at Vercel or an ephemeral Railway volume without first designing and testing an external persistent database and object storage adapter.
