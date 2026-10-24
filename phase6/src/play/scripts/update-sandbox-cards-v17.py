#!/usr/bin/env python3
"""Safely update existing Febro Arcade dashboard card copy; no full index replacement."""
from pathlib import Path
import argparse, datetime, sys

parser = argparse.ArgumentParser(description='Febro Arcade v1.7 card update (dry-run default)')
parser.add_argument('--apply', action='store_true', help='Make changes after reviewing dry-run')
parser.add_argument('--site', default='/opt/play/public/index.html', help='Path to dashboard index.html')
args = parser.parse_args()
p = Path(args.site)
if not p.is_file():
    sys.exit(f'ERROR: Dashboard tidak ditemukan: {p}')
html = p.read_text(encoding='utf-8')
if '/hoof-hustle/' not in html or '/octo-ascent/' not in html:
    sys.exit('ERROR: Kartu game tidak ditemukan. Dashboard tidak diubah.')
changes = {
 'PHYSICS · 4-LEG RACE':'PHYSICS · SILLY HORSE',
 'Gerakkan empat kaki kuda dan kejar waktu 50 meter tercepat.':'Angkat, ayunkan, lalu lepas empat kaki kuda. Salah langkah bisa terguling!',
 '✦ 50M TIME TRIAL':'✦ FUNNY WALK SANDBOX',
 'PHYSICS · 8-ARM CLIMB':'PHYSICS · SILLY CLIMB',
 'Tempel dan angkat delapan tentakel bergantian untuk panjat 8 meter.':'Angkat delapan tentakel satu-satu, tempel lebih tinggi, dan jangan sampai melorot!',
 '✦ 8M WALL CLIMB':'✦ ENDLESS CLIMB',
 'kuda gurita balapan panjat arcade':'kuda gurita fisika lucu santai panjat arcade',
 '/octo-ascent/cover.svg':'/octo-ascent/cover.webp',
 'Kuda kartun sedang berlomba':'Kuda kartun kocak kehilangan keseimbangan',
}
updated = html
for before,after in changes.items():
 count=updated.count(before)
 if count:
    updated=updated.replace(before,after)
    print(f'CHANGE x{count}: {before} -> {after}')
 if count==0:print(f'SKIP: {before}')
if updated==html:
    print('Tidak ada perubahan: sudah versi baru atau template berbeda.');sys.exit(0)
if not args.apply:
    print('\nDRY RUN saja. Untuk menerapkan: python3 scripts/update-sandbox-cards-v17.py --apply')
    sys.exit(0)
backup_dir=Path('/opt/play/backups') if str(p).startswith('/opt/play/') else p.parent
backup_dir.mkdir(parents=True, exist_ok=True)
backup=backup_dir/f'index.pre-v17-{datetime.datetime.now().strftime("%Y%m%d-%H%M%S")}.html'
backup.write_text(html,encoding='utf-8')
p.write_text(updated,encoding='utf-8')
print('OK, dashboard diupdate. Backup:',backup)
