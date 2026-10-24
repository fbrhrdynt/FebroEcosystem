import {useState,useEffect} from 'react';
import {memorySets,artLabels} from '../data/curriculum';
import {memoryStart,flip,closePair} from '../engine/memory';
import type {Settings} from '../services/store';
import {speak,stopAll} from '../services/speech';
import {Art} from './Art';import {Guide} from './Guide';
export default function MemoryGame({settings,offset,onDone}:{settings:Settings;offset:number;onDone:(attempts:number)=>void}){
 const maxBoards=settings.sessionLength==='all'?memorySets.length:3;const [round,setRound]=useState(0);const [total,setTotal]=useState(0);const setup=(r:number)=>memoryStart(memorySets[(offset+r)%5].slice(0,settings.level===1?2:settings.level===2?3:4),offset+r);
 const [s,setS]=useState(()=>setup(0));const complete=s.matched.length===s.deck.length;const [hint,setHint]=useState(false);
 useEffect(()=>{speak(s.message,settings.narrator);return stopAll;},[s.message]);
 function next(){if(round===maxBoards-1)onDone(total+s.moves);else{setTotal(total+s.moves);setRound(round+1);setS(setup(round+1));setHint(false);}}
 return <section className="player"><div className="round-bar"><span>Papan {round+1} dari {maxBoards}</span><span>{s.matched.length/2} pasangan ditemukan</span></div><Guide text={complete?'Semua pasangan ketemu! Terima kasih sudah mencoba.':s.message} avatar={settings.avatar} celebrate={complete}/><h2>Di mana pasangan gambarnya?</h2><p>Buka dua kartu. Tidak perlu cepat-cepat.</p>
 <div className="memory-grid">{s.deck.map((art,i)=>{const face=s.open.includes(i)||s.matched.includes(i)||hint;return <button key={i} data-card={i} className={`memory-card ${s.matched.includes(i)?'matched':''}`} disabled={s.matched.includes(i)||s.open.length===2||s.open.includes(i)} aria-label={`Kartu ${i+1}${face?`, ${artLabels[art]}`:', tertutup'}`} aria-pressed={face} onClick={()=>{setHint(false);setS(flip(s,i));}}>{face?<Art name={art} size={80}/>:<><span className="card-question">?</span><small>{i+1}</small></>}{s.matched.includes(i)&&<span>✓</span>}</button>;})}</div>
 {complete?<button className="primary next" onClick={next}>{round===maxBoards-1?'Lihat hasil bermain':'Papan berikutnya'} →</button>:s.open.length===2?<button className="primary next" autoFocus onClick={()=>{setS(closePair(s));setHint(false);}}>Tutup kartu, lanjut cari</button>:<div className="controls"><button onClick={()=>speak(s.message,settings.narrator)}>↻ Ulangi</button><button onClick={()=>{setHint(!hint);speak(hint?'Sekarang cari pasangannya.':'Lihat semua gambar. Ingat letaknya, lalu tutup petunjuk.',settings.narrator);}}>{hint?'Tutup petunjuk':'Bantu aku'}</button></div>}
 </section>;
}
