#!/usr/bin/env python3
"""Migrate Febro Arcade into a single /opt/play project, with safe public/private split.

Usage: sudo python3 scripts/migrate.py [--apply]
Default is read-only planning. Always stop PM2 arcade services before --apply.
Idempotent: never overwrite existing cloud data, and prioritizes live frontend files.
"""
import argparse
import datetime
import os
import pathlib
import pwd
import shutil
import sqlite3
import socket
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
EXISTING_PUBLIC = ('index.html', 'assets', 'skyhop', 'snake', 'orbit-run',
                   'tribeworld', 'GhaffiLand', 'leaderboard')
DATABASES = (
    ('leaderboard', 'arcade.sqlite', '/opt/play-api/data/arcade.sqlite'),
    ('tribeworld', 'tribeworld.sqlite', '/opt/tribeworld-api/data/tribeworld.sqlite'),
)


def put_missing(src, dst):
    """Copies source project only where an existing file is absent."""
    for item in src.rglob('*'):
        rel = item.relative_to(src)
        target = dst / rel
        if item.is_symlink():
            raise RuntimeError(f'Symlink sumber tidak diizinkan: {item}')
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target)


def overlay_live(src, dst):
    if src.is_symlink():
        raise RuntimeError(f'Symlink pada website lama tidak dipindahkan: {src}')
    if src.is_file():
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    elif src.is_dir():
        for item in src.rglob('*'):
            if item.is_symlink():
                raise RuntimeError(f'Symlink pada website lama tidak dipindahkan: {item}')
            rel = item.relative_to(src)
            if item.is_dir():
                (dst/rel).mkdir(parents=True, exist_ok=True)
            else:
                (dst/rel).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, dst/rel)


def backup_sqlite(src, dst):
    if not src.exists():
        print(f'  Belum ada DB lama: {src}; backend membuat DB baru saat pertama berjalan')
        return
    if dst.exists():
        print(f'  DB tujuan sudah ada, tidak ditimpa: {dst}')
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        with sqlite3.connect(f'file:{src}?mode=ro', uri=True) as con:
            with sqlite3.connect(dst) as output:
                con.backup(output)
                assert output.execute('PRAGMA quick_check').fetchone()[0] == 'ok'
    except Exception:
        dst.unlink(missing_ok=True)
        raise
    os.chmod(dst, 0o600)
    print(f'  DB dimigrasi dengan SQLite Backup API: {src} -> {dst}')


def chown_tree(path, user):
    try:
        user_data = pwd.getpwnam(user)
    except KeyError:
        raise RuntimeError(f'User {user} tidak ditemukan')
    for base, dirs, files in os.walk(path, followlinks=False):
        os.chown(base, user_data.pw_uid, user_data.pw_gid)
        for item in dirs + files:
            p = os.path.join(base, item)
            if not os.path.islink(p):
                os.chown(p, user_data.pw_uid, user_data.pw_gid)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--apply', action='store_true', help='Apply changes after reviewing dry run')
    p.add_argument('--root', default='/opt/play', help='Test-only alternative root')
    p.add_argument('--nginx-conf', default='/etc/nginx/conf.d/play.febro.id.conf')
    p.add_argument('--skip-nginx', action='store_true', help='Test-only; do not edit nginx')
    p.add_argument('--skip-chown', action='store_true', help='Test-only; skip system chown')
    p.add_argument('--user', default='ubuntu')
    args = p.parse_args()
    root = pathlib.Path(args.root).resolve()
    config = pathlib.Path(args.nginx_conf)
    timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    backup = root / 'backups' / f'migration-{timestamp}'
    if not (HERE/'public/index.html').exists() or not (HERE/'services/leaderboard/server.mjs').exists():
        sys.exit('ERROR: Paket tidak lengkap. Ekstrak ZIP seluruhnya sebelum menjalankan script.')
    if args.apply and args.root == '/opt/play' and args.skip_nginx:
        sys.exit('ERROR: --skip-nginx tidak diizinkan pada production /opt/play.')
    if args.root == '/opt/play' and os.geteuid() != 0 and args.apply:
        sys.exit('ERROR: gunakan sudo python3 ... --apply')
    if not args.skip_nginx:
        if not config.exists():
            sys.exit(f'ERROR: file Nginx tidak ditemukan: {config}')
        current = config.read_text()
        if 'server_name play.febro.id' not in current or 'ssl_certificate' not in current:
            sys.exit('ERROR: konfigurasi tidak dikenali; jangan edit otomatis.')
    print('== Febro Arcade: migrasi proyek tunggal ==')
    print('Sumber:', HERE)
    print('Tujuan:', root)
    print('Frontend publik:', root/'public')
    print('Dua API:', root/'services')
    print('Database privat:', root/'storage')
    print('Nginx:', '(dilewati untuk tes)' if args.skip_nginx else config)
    for item in EXISTING_PUBLIC:
        if (root/item).exists(): print('  Aktif saat ini:', root/item)
    for name, dbname, src in DATABASES:
        print('  DB', name, ':', src, '->', root/'storage'/name/dbname)
    if not args.apply:
        print('\nDRY RUN — tidak ada perubahan. Setelah PM2 stop, ulangi dengan --apply.')
        return
    if args.root == '/opt/play':
        active=[]
        for port in (3488,3491):
            with socket.socket() as sock:
                sock.settimeout(.5)
                if sock.connect_ex(('127.0.0.1',port)) == 0: active.append(port)
        if active:
            sys.exit(f'ERROR: Port {active} masih aktif. Jalankan pm2 stop febro-arcade-api dan pm2 stop tribeworld-save sebelum migrasi.')
    if not root.is_dir():
        sys.exit(f'ERROR: {root} tidak ditemukan; instalasi ini untuk migrasi situs yang sudah ada.')
    backup.mkdir(parents=True, exist_ok=False)
    os.chmod(root/'backups', 0o700)
    os.chmod(backup, 0o700)
    if not args.skip_nginx:
        shutil.copy2(config, backup/'nginx-before.conf')
    for kind, oldpath in [('leaderboard', pathlib.Path('/opt/play-api')),
                          ('tribeworld', pathlib.Path('/opt/tribeworld-api'))]:
        if args.root == '/opt/play' and oldpath.is_dir():
            # Keep prior code+data for rollback, move only after nginx is valid.
            print('  API lama tersedia untuk dipindahkan ke backup:', oldpath)
    (root/'public').mkdir(exist_ok=True)
    for name in ('leaderboard', 'tribeworld'):
        (root/'services'/name).mkdir(parents=True, exist_ok=True)
        (root/'storage'/name).mkdir(parents=True, exist_ok=True)
    (root/'deploy').mkdir(exist_ok=True)
    (root/'scripts').mkdir(exist_ok=True)
    (root/'source').mkdir(exist_ok=True)
    # Bundle baseline, keeping any existing unified files untouched.
    put_missing(HERE/'public', root/'public')
    put_missing(HERE/'services', root/'services')
    put_missing(HERE/'deploy', root/'deploy')
    put_missing(HERE/'scripts', root/'scripts')
    put_missing(HERE/'source', root/'source')
    for item in ('.gitignore', '.gitattributes', 'README.md', 'INSTALL-VPS.md'):
        if not (root/item).exists(): shutil.copy2(HERE/item, root/item)
    # Live frontend takes precedence over archived source to protect newer installed versions.
    for item in EXISTING_PUBLIC:
        src=root/item
        if src.exists():
            overlay_live(src, root/'public'/item)
    # Adapt API source, preserve local customizations if any.
    if args.root == '/opt/play':
        for name, oldpath in (('leaderboard', pathlib.Path('/opt/play-api')),
                              ('tribeworld', pathlib.Path('/opt/tribeworld-api'))):
            src=oldpath/'server.mjs'
            dst=root/'services'/name/'server.mjs'
            if src.is_file(): shutil.copy2(src,dst)
        for name, dbname, source in DATABASES:
            backup_sqlite(pathlib.Path(source), root/'storage'/name/dbname)
    # Enforce correct DATA_DIR defaults, even if a customized old server was copied.
    replacements = {
        'leaderboard': ("'/opt/play-api/data'", "'/opt/play/storage/leaderboard'"),
        'tribeworld': ("'/opt/tribeworld-api/data'", "'/opt/play/storage/tribeworld'")
    }
    for name,(old,new) in replacements.items():
        filename=root/'services'/name/'server.mjs'
        body=filename.read_text();filename.write_text(body.replace(old,new))
    # Always deploy current PM2 definitions, not obsolete absolute paths.
    for name, confname in (('leaderboard', 'pm2.config.cjs'),('tribeworld','ecosystem.config.cjs')):
        shutil.copy2(HERE/'services'/name/confname, root/'services'/name/confname)
    os.chmod(root/'storage', 0o700)
    for dirname in (root/'storage/leaderboard',root/'storage/tribeworld'):
        os.chmod(dirname, 0o700)
    if not args.skip_chown:
        for d in (root/'public',root/'services',root/'storage',root/'deploy',root/'scripts',root/'source'):
            chown_tree(d,args.user)
        owner=pwd.getpwnam(args.user)
        os.chown(root, owner.pw_uid, owner.pw_gid)
        chown_tree(root/'backups', args.user)
    if not args.skip_nginx:
        temp = config.with_name(config.name + '.new-pending')
        shutil.copy2(HERE/'deploy/play.febro.id.conf', temp)
        os.replace(temp, config)
        test=subprocess.run(['nginx','-t'], capture_output=True, text=True)
        if test.returncode:
            shutil.copy2(backup/'nginx-before.conf', config)
            sys.exit('NGINX TEST FAILED; config lama dipulihkan.\n' + test.stderr)
        reload=subprocess.run(['systemctl','reload','nginx'],capture_output=True,text=True)
        if reload.returncode:
            shutil.copy2(backup/'nginx-before.conf', config)
            sys.exit('NGINX RELOAD FAILED; config lama dipulihkan.\n' + reload.stderr)
        print('  OK: Nginx valid dan reload sukses; root sekarang /opt/play/public')
    # Move legacy public files only after switch so no references are broken.
    legacy=backup/'legacy-public-root'
    for item in EXISTING_PUBLIC:
        src=root/item
        if src.exists():
            legacy.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(legacy/item))
    # Old API trees contain original DB as fallback; keep in unified private backup folder.
    if args.root == '/opt/play':
        for oldname, oldpath in (('leaderboard-api', pathlib.Path('/opt/play-api')),
                                 ('tribeworld-api', pathlib.Path('/opt/tribeworld-api'))):
            if oldpath.is_dir():
                (backup/'legacy-backends').mkdir(exist_ok=True)
                shutil.move(str(oldpath), str(backup/'legacy-backends'/oldname))
    print('\nMIGRASI FILE SUKSES.')
    print('Konfigurasi API sekarang memakai /opt/play/services dan /opt/play/storage.')
    print('Backup tersedia:', backup)
    print('LANJUT: pm2 delete layanan lama; pm2 start kedua konfigurasi baru; pm2 save.')

if __name__=='__main__':
    try:main()
    except Exception as ex:
        sys.exit(f'ERROR: {type(ex).__name__}: {ex}\nJangan hapus folder backup; baca INSTALL-VPS.md.')
