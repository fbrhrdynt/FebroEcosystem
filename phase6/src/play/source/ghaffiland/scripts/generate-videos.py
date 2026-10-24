"""Rebuild exact educational MP4 illustrations locally. Requires Pillow + ffmpeg.
No network, generated people, or speech recording. Video narration uses app TTS.
"""
import json, math, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/videos';OUT.mkdir(parents=True,exist_ok=True)
FONT=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
BOLD=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
W,H,FPS,DURATION=768,432,20,6
ink='#202020';cream='#fff9ed'
def text(d,xy,label,size=26,fill=ink,bold=True,anchor='mm'):
 d.text(xy,label,font=ImageFont.truetype(str(BOLD if bold else FONT),size),fill=fill,anchor=anchor)
def apple(d,x,y,s=1):
 # One outline silhouette per apple; leaves and stems are not extra objects.
 d.rounded_rectangle((x-31*s,y-28*s,x+31*s,y+33*s),radius=int(24*s),fill='#ed6555',outline=ink,width=3)
 d.line((x,y-29*s,x+2*s,y-46*s),fill=ink,width=5)
 d.ellipse((x+3*s,y-47*s,x+26*s,y-33*s),fill='#a7e7ae',outline=ink,width=2)
def frame(lesson,clip,t):
 im=Image.new('RGB',(W,H),cream);d=ImageDraw.Draw(im)
 d.rounded_rectangle((18,18,W-18,H-18),22,fill=cream,outline=ink,width=4)
 d.rounded_rectangle((36,34,212,72),12,fill='#ffda5d',outline=ink,width=2)
 text(d,(124,53),'GhaffiLand',20)
 text(d,(W-40,54),'TONTON • AMATI • JAWAB',14,anchor='rm')
 text(d,(W/2,108),lesson['title'],29)
 d.rounded_rectangle((45,142,W-45,328),20,fill='white',outline=ink,width=3)
 theme=lesson['theme'];amount=clip['value']
 if theme=='count':
  shown=min(amount,int(t/.9)+1)
  for i in range(shown):
   ease=min(1,max(0,(t-i*.9)/.25));x=W/2+(i-(amount-1)/2)*115;y=231+(1-ease)*18
   apple(d,x,y,.95);text(d,(x,294),str(i+1),19)
  label=clip['label'] if shown==amount else 'Hitung satu per satu'
 else:
  ease=min(1,t/1.2);x=200+184*(1-(1-ease)**3);y=236
  if theme=='color':d.ellipse((x-67,y-67,x+67,y+67),fill=amount,outline=ink,width=5)
  elif amount=='circle':d.ellipse((x-65,y-65,x+65,y+65),fill='#83d8ef',outline=ink,width=5)
  elif amount=='square':d.rectangle((x-62,y-62,x+62,y+62),fill='#ffda5d',outline=ink,width=5)
  else:d.polygon([(x,y-70),(x-75,y+60),(x+75,y+60)],fill='#ffc1d5',outline=ink,width=5)
  label=clip['label']
 text(d,(W/2,366),label,31)
 d.rounded_rectangle((50,397,718,405),4,fill='#e1ded6')
 d.rounded_rectangle((50,397,max(51,int(50+668*min(1,t/DURATION))),405),4,fill='#202020')
 return im
manifest=json.loads((ROOT/'src/data/videos.json').read_text())
for lesson in manifest:
 for clip in lesson['clips']:
  if len(sys.argv)>1 and clip['id'] not in sys.argv[1:]:continue
  final_path=OUT/(clip['id']+'.mp4')
  path=OUT/(clip['id']+'.tmp.mp4')
  command=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-profile:v','baseline','-level','3.0','-pix_fmt','yuv420p','-crf','24','-movflags','+faststart',str(path)]
  process=subprocess.Popen(command,stdin=subprocess.PIPE)
  for i in range(FPS*DURATION):process.stdin.write(frame(lesson,clip,i/FPS).tobytes())
  process.stdin.close()
  if process.wait()!=0:raise RuntimeError('ffmpeg failed')
  path.replace(final_path)
  frame(lesson,clip,DURATION).save(OUT/(clip['id']+'.jpg'),quality=88)
  print(clip['id'],final_path.stat().st_size,flush=True)
