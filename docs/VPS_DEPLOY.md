# VPS deployment: fasadof36.ru

Production topology:

```text
Internet -> Nginx :443 -> Node/Vinext 127.0.0.1:3000
```

Vercel and Railway are not production dependencies. The application, SQLite database, imported VK images and administrator uploads live on the VPS.

## One-time VPS setup

The host must run Ubuntu 24.04. Install the base packages and Node.js 22:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx certbot sqlite3 ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

Allow SSH and web traffic before enabling the firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Create the service user and directories:

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
cd /var/www/fasadof/fasadof
sudo ./scripts/deploy-vps.sh
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

Back up the SQLite database and media directory before infrastructure changes:

```bash
sudo mkdir -p /var/backups/fasadof
sudo sqlite3 /var/lib/fasadof/fasadof.sqlite ".backup '/var/backups/fasadof/fasadof.sqlite'"
sudo tar -czf /var/backups/fasadof/media.tar.gz /var/lib/fasadof/media
```

Copy backups off the VPS and test restoration periodically. With WAL enabled, use SQLite `.backup` as above or briefly stop the service before copying raw database files.

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
