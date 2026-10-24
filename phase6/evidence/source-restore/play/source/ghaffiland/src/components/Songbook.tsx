import {useEffect,useRef,useState} from 'react';
import {speak,stopAll} from '../services/speech';
import type {Settings} from '../services/store';

// Semua melodi dan lirik di sini dibuat untuk GhaffiLand, tanpa materi lagu komersial.
type Song={id:string;title:string;subtitle:string;emoji:string;bpm:number;lines:string[];notes:number[]};
const songs:Song[]=[
 {id:'abc',title:'Petualangan A sampai Z',subtitle:'26 huruf, satu petualangan',emoji:'🔤',bpm:116,
  lines:['A B C D, ayo bernyanyi', 'E F G H, melangkah lagi', 'I J K L M N, teman bermain', 'O P Q R S T, semuanya senang', 'U V W X Y Z, kita hebat hari ini!'],
  notes:[60,62,64,65,67,67,65,64,62,60,62,64,65,67,69,67,65,64,62,60]},
 {id:'angka',title:'Langkah Angka',subtitle:'Satuan, belasan, puluhan',emoji:'🔢',bpm:110,
  lines:['Satu dua tiga, ayo hitung bersama', 'Empat lima enam, tepuk tangan ceria', 'Tujuh delapan sembilan, sepuluh!', 'Sebelas dua belas, terus bertambah', 'Dua puluh, tiga puluh, empat puluh, hebat!'],
  notes:[60,60,64,64,67,67,64,62,62,65,65,69,69,67,65,64,62,60,62,60]},
 {id:'hijaiyah',title:'Riang Alif Ba Ta',subtitle:'Kenali nama huruf hijaiyah',emoji:'🌙',bpm:100,
  lines:['Alif, Ba, Ta, Tsa, mari kenali semua', 'Jim, Ha, Kha, Dal, Dzal, Ra', 'Zai, Sin, Syin, Shad, Dhad, Tha', 'Zha, Ain, Ghain, Fa, Qaf, Kaf', 'Lam, Mim, Nun, Wau, Ha, Lam Alif, Hamzah, Ya'],
  notes:[60,62,64,62,60,64,67,65,64,62,60,62,64,65,67,69,67,65,64,60]},
 {id:'hewan',title:'Halo, Teman Hewan!',subtitle:'Sapi, kucing, burung dan lainnya',emoji:'🐮',bpm:120,
  lines:['Sapi di padang, makan rumput hijau', 'Kucing yang manis, suka ikan juga', 'Burung di pohon, bernyanyi ceria', 'Kelinci berlari, melompat ke sana', 'Semua hewan punya rumah dan makanan'],
  notes:[64,64,67,67,69,67,64,62,62,65,65,67,65,62,60,62,64,60,62,60]},
];
const AudioContextClass=()=>window.AudioContext;
function tone(ctx:AudioContext,frequency:number,at:number,duration:number){
 const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,at);
 gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.105,at+.025);
 gain.gain.setValueAtTime(.105,Math.max(at+.04,at+duration-.085));gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
 osc.connect(gain).connect(ctx.destination);osc.start(at);osc.stop(at+duration+.02);
}
export default function Songbook({settings}:{settings:Settings}){
 const [current,setCurrent]=useState(songs[0].id),[playing,setPlaying]=useState(false),[line,setLine]=useState(0),[message,setMessage]=useState('');
 const ctxRef=useRef<AudioContext|null>(null);const rafRef=useRef(0);const startRef=useRef(0);
 const track=songs.find(s=>s.id===current)||songs[0];
 function stop(){cancelAnimationFrame(rafRef.current);const ctx=ctxRef.current;ctxRef.current=null;if(ctx)void ctx.close().catch(()=>{});setPlaying(false);}
 useEffect(()=>()=>{cancelAnimationFrame(rafRef.current);if(ctxRef.current)void ctxRef.current.close().catch(()=>{});},[]);
 function play(){
  stop();stopAll();setMessage('');
  if(!AudioContextClass()){setMessage('Perangkat belum mendukung pemutar melodi. Lirik tetap bisa dibaca.');return;}
  try{
   const ctx=new (AudioContextClass())();ctxRef.current=ctx;void ctx.resume();
   const step=60/track.bpm;const at=ctx.currentTime+.12;startRef.current=at;
   // 20 ketukan membentuk sebuah lagu pendek; setiap bait mengikuti empat ketukan.
   track.notes.forEach((midi,i)=>tone(ctx,440*Math.pow(2,(midi-69)/12),at+i*step,step*.8));
   setLine(0);setPlaying(true);
   const update=()=>{if(ctxRef.current!==ctx)return;const elapsed=ctx.currentTime-startRef.current;
    setLine(Math.max(0,Math.min(track.lines.length-1,Math.floor(elapsed/(step*4)))));
    if(elapsed>=track.notes.length*step){void ctx.close().catch(()=>{});ctxRef.current=null;setPlaying(false);return;}
    rafRef.current=requestAnimationFrame(update);
   };rafRef.current=requestAnimationFrame(update);
  }catch{setMessage('Audio tidak dapat dimulai. Coba tekan Putar lagi.');setPlaying(false);}
 }
 return <section className="songbook" aria-label="Lagu anak GhaffiLand">
  <div className="songs-heading"><span className="eyebrow">BIOSKOP MUSIK · ASLI GHAFFILAND</span><h1 data-heading tabIndex={-1}>Ayo, bernyanyi! 🎶</h1><p>Empat lagu dengan melodi instrumental dan lirik buatan khusus. Tekan bait untuk mendengar kata-katanya lewat narator.</p></div>
  <div className="song-tiles">{songs.map(s=><button key={s.id} className={'song-tile '+(current===s.id?'selected':'')} onClick={()=>{stop();setCurrent(s.id);setLine(0);}}><span aria-hidden="true">{s.emoji}</span><strong>{s.title}</strong><small>{s.subtitle}</small></button>)}</div>
  <div className="song-player"><div className="song-disc" aria-hidden="true">{track.emoji}</div><div><span className="eyebrow">SEDANG DIPILIH</span><h2>{track.title}</h2><p>Ketuk Putar untuk mendengar melodi. Ketuk setiap baris agar Ghaffi bisa mendengar teks.</p></div><div className="song-controls"><button className="primary" onClick={playing?stop:play}>{playing?'⏹ Hentikan lagu':'▶ Putar lagu'}</button><button onClick={()=>{stop();stopAll();setMessage('Semua suara dihentikan.');}}>Hentikan semua suara</button></div></div>
  <div className="lyrics" aria-label="Lirik lagu">{track.lines.map((l,i)=><button key={`${track.id}-${i}`} className={playing&&line===i?'singing':''} onClick={()=>{stop();speak(l,settings.narrator,'id-ID',setMessage);setLine(i);}}><span>♪</span>{l}<small>🔊</small></button>)}</div>
  <p className="note">Melodi dimainkan oleh browser dan bisa dipakai tanpa internet setelah halaman dimuat. Narasi baris menggunakan suara perangkat, bukan rekaman penyanyi. Hijaiyah dalam lagu memakai nama Latin sebagai panduan awal; pelafalan Arab tetap perlu pendamping.</p>
  {message&&<p role="status" className="audio-status">{message}</p>}
 </section>;
}
