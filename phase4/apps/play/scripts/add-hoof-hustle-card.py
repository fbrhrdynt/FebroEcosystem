#!/usr/bin/env python3
"""Idempotent and safe Febro Arcade v1.5+ dashboard patch. Apply only with --apply."""
import argparse
import datetime
import pathlib
import re
import shutil
import sys

p = argparse.ArgumentParser(description="Tambahkan kartu Hoof Hustle ke dashboard Febro Arcade")
p.add_argument('--apply', action='store_true', help='Simpan perubahan (default: dry-run)')
p.add_argument('--site', default='/opt/play/public/index.html', help='Path dashboard saat ini')
args = p.parse_args()
site = pathlib.Path(args.site)
if not site.exists(): sys.exit(f'ERROR: Dashboard tidak ditemukan: {site}')
original = site.read_text(encoding='utf-8')
if '/hoof-hustle/' in original:
    print('Hoof Hustle sudah tercantum. Tidak ada yang diubah.'); sys.exit(0)
if 'id="gamesGrid"' not in original or 'FEBRO' not in original.upper():
    sys.exit('ERROR: Struktur dashboard tidak dikenal; tidak melakukan perubahan.')
if not (site.parent / 'hoof-hustle' / 'index.html').is_file():
    sys.exit('ERROR: Upload game ke public/hoof-hustle/ terlebih dahulu.')

card = '''          <article class="game-card" data-category="arcade" data-search="hoof hustle kuda kacau horse lari kaki clip clop physics keseimbangan balance skill arcade lucu">
            <a href="/hoof-hustle/" class="card-cover" aria-label="Mainkan Hoof Hustle" style="position:relative;overflow:hidden;background:#8cd5d6">
              <img src="/hoof-hustle/cover.webp" alt="Kuda kartun Hoof Hustle melintasi padang hijau" loading="lazy" width="920" height="460" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block" />
              <span class="card-top-left">06 / NEW CHALLENGE</span><span class="card-tag available">● PLAYABLE</span><span class="cover-arrow" aria-hidden="true">↗</span>
            </a>
            <div class="game-body"><div class="game-type">ARCADE · PHYSICS HORSE RACE</div><div class="game-title-row"><h3>Hoof Hustle</h3><span aria-hidden="true">↗</span></div><p>Kontrol empat kaki kuda pakai Q, W, O, P. Jaga keseimbangan dan capai garis finis sejauh 50 meter!</p><div class="card-footer"><span>✦ 50 METER RACE</span><span>♥ TOUCH & KEYBOARD</span><a href="/hoof-hustle/">MAIN →</a></div></div>
          </article>
'''
pattern = r'(\s*<div class="empty-state" id="emptyState")'
needle = '        </div>\n        <div class="empty-state"'
if original.count(needle) != 1:
    sys.exit('ERROR: Posisi akhir daftar game tidak cocok. Tidak ada file yang ditimpa.')
updated = original.replace(needle, card+'        </div>\n        <div class="empty-state"', 1)
# Only change counts where an exact old v1.5 structure is present; no blanket replacement.
for old, new in [
    ('<strong>05</strong><small>GAME SIAP MAIN</small>', '<strong>06</strong><small>GAME SIAP MAIN</small>'),
    ('GAME LIBRARY <strong>005</strong>', 'GAME LIBRARY <strong>006</strong>'),
    ('data-filter="all" aria-pressed="true">SEMUA <span>05</span>', 'data-filter="all" aria-pressed="true">SEMUA <span>06</span>'),
    ('data-filter="arcade" aria-pressed="false">ARCADE <span>04</span>', 'data-filter="arcade" aria-pressed="false">ARCADE <span>05</span>'),
]:
    if old in updated: updated=updated.replace(old,new,1)

if not args.apply:
    print('DRY RUN: dashboard cocok. Hoof Hustle akan ditambahkan; belum ada file diubah.')
    print(f'Target: {site}')
    print('Jalankan ulang dengan --apply jika ingin menambahkan kartu.')
    sys.exit(0)

root = site.parent.parent if site.parent.name == 'public' else site.parent
backup = root / 'backups'
backup.mkdir(parents=True, exist_ok=True)
name = datetime.datetime.now().strftime('dashboard-before-hoof-%Y%m%d-%H%M%S.html')
backup_file=backup/name
shutil.copy2(site,backup_file)
temp=site.with_name(site.name+'.tmp')
temp.write_text(updated,encoding='utf-8')
temp.chmod(site.stat().st_mode & 0o777)
temp.replace(site)
print('OK: Hoof Hustle tampil di dashboard.')
print(f'Backup: {backup_file}')
