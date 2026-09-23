# ФасадоФ: перенос на VPS

Проверенная production-схема проекта: Ubuntu 24.04 → Nginx → Node.js 22/Vinext → SQLite и файловое хранилище в `/var/lib/fasadof`.

> Важно: текущий код не использует PostgreSQL. Установка PostgreSQL и создание пустой базы не подключат приложение к ней. Переход на PostgreSQL требует отдельной миграции слоя хранения и данных; до неё production следует запускать на проверенной SQLite-схеме ниже.

## 1. Установка Node.js, Nginx и системных пакетов

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx certbot sqlite3 ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

## 2. Пользователь, каталог приложения и база

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin fasadof
sudo mkdir -p /var/www/fasadof /var/lib/fasadof/media/products /var/lib/fasadof/media/vk
sudo chown -R fasadof:fasadof /var/lib/fasadof
sudo git clone https://github.com/OnikArt/fasadof.git /var/www/fasadof/fasadof
```

База будет создана миграциями как `/var/lib/fasadof/fasadof.sqlite`.

## 3. `.env`

Скопируйте `.env.example` в `.env`, заполните секреты и оставьте:

```dotenv
NEXT_PUBLIC_SITE_URL=https://fasadof36.ru
ADMIN_EMAIL=admin@example.com
ADMIN_NAME=Администратор
ADMIN_PASSWORD_HASH=pbkdf2_sha256$...
ADMIN_SESSION_SECRET=случайная-строка-не-короче-32-символов
FASADOF_DATA_DIR=/var/lib/fasadof
MANAGER_WAIT_TIMEOUT_MS=300000
NODE_USE_SYSTEM_CA=1
PORT=3000
```

MAX и VK можно оставить пустыми до подключения. Файл `.env` должен быть доступен только root:

```bash
sudo chown root:root /var/www/fasadof/fasadof/.env
sudo chmod 600 /var/www/fasadof/fasadof/.env
```

## 4. Миграции и seed

```bash
cd /var/www/fasadof/fasadof
sudo npm ci
sudo -u fasadof npm run migrate:vps
```

Миграции `drizzle/0000…0008` создают схему, стартовые категории и команды чата. Каталог товаров автоматически заполняется seed-данными при первом обращении.

## 5. Production-сборка и запуск

```bash
npm run typecheck
npm run lint
npm test
npm run build
sudo cp deploy/fasadof.service /etc/systemd/system/fasadof.service
sudo systemctl daemon-reload
sudo systemctl enable --now fasadof
curl --fail http://127.0.0.1:3000/health
```

## 6. Nginx и TLS

```bash
sudo certbot certonly --standalone -d fasadof36.ru -d www.fasadof36.ru
sudo cp deploy/nginx-fasadof.conf /etc/nginx/sites-available/fasadof36.ru
sudo ln -s /etc/nginx/sites-available/fasadof36.ru /etc/nginx/sites-enabled/fasadof36.ru
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Обычное обновление

```bash
cd /var/www/fasadof/fasadof
sudo ./scripts/deploy-vps.sh
```

Скрипт делает fast-forward pull, чистую установку зависимостей, проверки, миграции, сборку, перезапуск systemd и health-check.

## 8. Backup и восстановление

```bash
sudo mkdir -p /var/backups/fasadof
sudo sqlite3 /var/lib/fasadof/fasadof.sqlite ".backup '/var/backups/fasadof/fasadof.sqlite'"
sudo tar -czf /var/backups/fasadof/media.tar.gz /var/lib/fasadof/media
```

Копируйте архивы за пределы VPS и регулярно проверяйте восстановление. Подробные инструкции и rollback: `docs/VPS_DEPLOY.md`.
