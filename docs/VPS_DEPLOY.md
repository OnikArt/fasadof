# VPS deployment: fasadof36.ru

Production topology:

```text
Internet -> Nginx :443 -> Node/Vinext 127.0.0.1:3000
```

Vercel and Railway are not production dependencies. The application, SQLite database, imported VK images and administrator uploads live on the VPS.

## One-time VPS setup

The host must run Ubuntu 24.04, Node.js 22, Git, Nginx and systemd. Create the service user and directories:

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin fasadof
sudo mkdir -p /var/www/fasadof /var/lib/fasadof
sudo chown -R fasadof:fasadof /var/lib/fasadof
sudo git clone https://github.com/OnikArt/fasadof.git /var/www/fasadof/fasadof
```

Create `/var/www/fasadof/fasadof/.env` from `.env.example`. Set all server secrets and keep these production values:

```dotenv
NEXT_PUBLIC_SITE_URL=https://fasadof36.ru
FASADOF_DATA_DIR=/var/lib/fasadof
PORT=3000
```

Protect the environment file:

```bash
sudo chown root:root /var/www/fasadof/fasadof/.env
sudo chmod 600 /var/www/fasadof/fasadof/.env
```

Install the service. Obtain the certificate before enabling the committed HTTPS Nginx configuration:

```bash
sudo cp /var/www/fasadof/fasadof/deploy/fasadof.service /etc/systemd/system/fasadof.service
sudo systemctl stop nginx
sudo certbot certonly --standalone -d fasadof36.ru -d www.fasadof36.ru
sudo cp /var/www/fasadof/fasadof/deploy/nginx-fasadof.conf /etc/nginx/sites-available/fasadof36.ru
sudo ln -s /etc/nginx/sites-available/fasadof36.ru /etc/nginx/sites-enabled/fasadof36.ru
sudo systemctl daemon-reload
sudo systemctl enable fasadof
sudo nginx -t
sudo systemctl start nginx
```

Install Certbot first and make sure both DNS records point to this VPS. The standalone challenge requires public port 80 to reach the server.

Run the deployment command as root. The repository remains root-owned, while the restricted `fasadof` service account can write only persistent data under `/var/lib/fasadof`.

## Every deployment

Push the tested commit to GitHub, then run exactly this on the VPS:

```bash
cd /var/www/fasadof/fasadof && ./scripts/deploy-vps.sh
```

The script performs a fast-forward pull, clean `npm ci`, typecheck, safe SQLite migrations, production build, service restart and `/health` check. It does not start a second application process.

## Data and backup

Persistent data is under `/var/lib/fasadof`:

```text
/var/lib/fasadof/fasadof.sqlite
/var/lib/fasadof/media/vk/
/var/lib/fasadof/media/products/
```

Back up the SQLite database and media directory before infrastructure changes. With WAL enabled, use the SQLite backup command or briefly stop the service before copying the database files.

## Rollback

Preferred rollback keeps Git history explicit:

```bash
git revert <bad-commit-sha>
git push origin master
```

Then run the single VPS deployment command again. Database migrations are forward-only; restore the pre-deploy `/var/lib/fasadof` backup only when a rollback specifically requires reverting stored data.

Useful diagnostics:

```bash
systemctl status fasadof --no-pager
journalctl -u fasadof -n 100 --no-pager
curl -i http://127.0.0.1:3000/health
```
