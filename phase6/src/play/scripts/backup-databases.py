#!/usr/bin/env python3
"""Safe, online SQLite backup for all Febro Arcade databases under /opt/play."""
import argparse
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
import os

p=argparse.ArgumentParser()
p.add_argument('--root',default='/opt/play')
a=p.parse_args()
base=Path(a.root)
backup=base/'backups'/'sqlite'
backup.mkdir(mode=0o700,parents=True,exist_ok=True)
os.chmod(backup,0o700)
for directory,filename in [('leaderboard','arcade.sqlite'),('tribeworld','tribeworld.sqlite')]:
    database=base/'storage'/directory/filename
    if not database.exists():
        print('SKIP missing:',database);continue
    stamp=datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-UTC')
    output=backup/f'{directory}-{stamp}.sqlite'
    with sqlite3.connect(f'file:{database}?mode=ro',uri=True) as src:
        with sqlite3.connect(output) as dst:
            src.backup(dst)
            assert dst.execute('PRAGMA quick_check').fetchone()[0]=='ok'
    os.chmod(output,0o600)
    print('OK backup:',output)
    existing=sorted(backup.glob(f'{directory}-*.sqlite'))
    for older in existing[:-14]:older.unlink()
