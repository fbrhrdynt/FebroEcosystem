#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env ]]; then cp .env.example .env; fi
node --input-type=module <<'JS'
import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
const file='.env';let s=fs.readFileSync(file,'utf8');
if(!s.match(/^APP_SECRET=[A-Za-z0-9_-]{64,}$/m))s=s.replace(/^APP_SECRET=.*$/m,`APP_SECRET=${randomBytes(64).toString('base64url')}`);
fs.writeFileSync(file,s,{mode:0o600});
JS
chmod 600 .env
mkdir -p data/private
chmod 700 data data/private
printf '\nKonfigurasi awal siap. Edit .env dan isi SMTP_PASS, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.\n'
printf 'Jangan masukkan password asli ke GitHub.\n'
