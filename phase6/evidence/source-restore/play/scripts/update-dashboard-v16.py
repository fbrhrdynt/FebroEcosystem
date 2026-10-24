#!/usr/bin/env python3
"""Add two cards to Febro Arcade dashboard without replacing the existing game catalog."""
import argparse,datetime,re,sys
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--root',default='/opt/play');ap.add_argument('--apply',action='store_true');a=ap.parse_args()
root=Path(a.root);p=root/'public/index.html'
if not p.is_file():sys.exit('Dashboard tidak ditemukan: '+str(p))
s=p.read_text();g=s.find('<div class="games-grid" id="gamesGrid">');stop=s.find('<div class="empty-state" id="emptyState"',g)
if g<0 or stop<0:sys.exit('Struktur dashboard tidak dikenali. Tidak diubah.')
first,second=s[:stop],s[stop:]
blocks=[]
for path,cover,title,desc,meta,kind,alt in [
 ('hoof-hustle','cover.webp','Hoof Hustle','Gerakkan empat kaki kuda dan kejar waktu 50 meter tercepat.','PHYSICS · 4-LEG RACE','50M TIME TRIAL','Kuda kartun sedang berlomba'),
 ('octo-ascent','cover.svg','Octo Ascent','Tempel dan angkat delapan tentakel bergantian untuk panjat 8 meter.','PHYSICS · 8-ARM CLIMB','8M WALL CLIMB','Gurita warna-warni memanjat dinding')]:
 if f'/{path}/' in first:continue
 n=6 if path=='hoof-hustle' else 7
 blocks.append(f'''<article class="game-card" data-category="arcade" data-search="{path} {title.lower()} kuda gurita balapan panjat arcade">
 <a href="/{path}/" class="card-cover" style="background:#b4dae1;position:relative;overflow:hidden" aria-label="Mainkan {title}"><img src="/{path}/{cover}" alt="{alt}" loading="lazy" width="800" height="480" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/><span class="card-top-left">0{n} / NEW GAME</span><span class="card-tag available">● PLAYABLE</span><span class="cover-arrow" aria-hidden="true">↗</span></a>
 <div class="game-body"><div class="game-type">{meta}</div><div class="game-title-row"><h3>{title}</h3><span>↗</span></div><p>{desc}</p><div class="card-footer"><span>✦ {kind}</span><span>♥ GLOBAL RECORD</span><a href="/{path}/">MAIN →</a></div></div>
 </article>''')
if blocks:
 idx=first.rfind('</div>');first=first[:idx]+'\n'.join(blocks)+'\n'+first[idx:]
s=first+second
count=s.count('<article class="game-card')
arc=len(re.findall(r'<article\s+class="game-card[^\n]*data-category="arcade"',s))
s=re.sub(r'(<div class="count-label">GAME LIBRARY <strong>)\d+(</strong>)',lambda m:m[1]+f'{count:03d}'+m[2],s)
s=re.sub(r'(<button[^>]+data-filter="all"[^>]*>SEMUA <span>)\d+(</span>)',lambda m:m[1]+f'{count:02d}'+m[2],s)
s=re.sub(r'(<button[^>]+data-filter="arcade"[^>]*>ARCADE <span>)\d+(</span>)',lambda m:m[1]+f'{arc:02d}'+m[2],s)
s=re.sub(r'(<section class="stats-strip"[^>]*>\s*<div><strong>)\d+(</strong><small>GAME SIAP MAIN)',lambda m:m[1]+f'{count:02d}'+m[2],s)
s=re.sub(r'(Lima|Enam|Tujuh) game, banyak cara seru:',f'{count} game, banyak cara seru:',s)
if s==p.read_text():print('Dashboard sudah terbaru.');sys.exit(0)
print('Kartu:',count,'Arcade:',arc,'Tambahan:',len(blocks))
if a.apply:
 backup=root/'backups';backup.mkdir(exist_ok=True)
 dst=backup/('dashboard-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.html');dst.write_text(p.read_text());p.write_text(s)
 print('Updated',p,'backup:',dst)
else:print('Dry run; apply with --apply')
