import {useEffect,useReducer,useRef,useState} from 'react';
import {videoLessons,videoQuestion,mediaUrl} from '../data/videoLessons';
import {visibleChoices} from '../data/curriculum';
import {initial,reducer} from '../engine/dialog';
import {speak,stopAll} from '../services/speech';
import type {Settings} from '../services/store';
import {Guide} from './Guide';
import {ChoiceVisual} from './Quiz';
export default function VideoLesson({lessonIndex,settings,onDone}:{lessonIndex:number;settings:Settings;onDone:(attempts:number)=>void}){
 const [s,dispatch]=useReducer(reducer,initial);const [mode,setMode]=useState<'watch'|'question'>('watch');
 const [status,setStatus]=useState('Tekan Putar video untuk mulai.');const [playing,setPlaying]=useState(false);
 const [mediaError,setMediaError]=useState(false);const video=useRef<HTMLVideoElement>(null);const completed=useRef(false);
 const lesson=videoLessons[lessonIndex];const clip=lesson.clips[s.round];const q=videoQuestion(lessonIndex,s.round);const options=visibleChoices(q,settings.level,s.errors);
 const videoDisabled=!settings.motion||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 useEffect(()=>{
  const node=video.current;const hide=()=>{if(document.hidden){node?.pause();stopAll();}};
  document.addEventListener('visibilitychange',hide);
  return()=>{document.removeEventListener('visibilitychange',hide);node?.pause();stopAll();};
 },[s.round,mode]);
 useEffect(()=>{if(mode==='question')document.getElementById('video-question-title')?.focus();},[mode,s.round]);
 useEffect(()=>{if(s.phase==='COMPLETE'&&!completed.current){completed.current=true;onDone(s.attempts);}},[s.phase]);
 useEffect(()=>{if(s.message&&mode==='question')speak(s.message,settings.narrator,'id-ID',setStatus);},[s.message,mode]);
 function ask(){video.current?.pause();stopAll();setPlaying(false);setMode('question');setStatus('Pilih jawabanmu.');speak(q.spoken||q.prompt,settings.narrator,'id-ID',setStatus);}
 async function play(){if(!video.current)return;try{await video.current.play();}catch{setMediaError(true);setStatus('Video belum dapat diputar. Lihat gambar dan bacaan, lalu jawab.');}}
 function pause(){video.current?.pause();setPlaying(false);stopAll();setStatus('Video dijeda.');}
 function next(){setMode('watch');setPlaying(false);setMediaError(false);setStatus('Tekan Putar video untuk adegan berikutnya.');dispatch({type:'NEXT'});}
 return <section className="player video-lesson"><div className="round-bar"><span>Adegan {s.round+1} dari 3</span><span>Video lokal · tanpa iklan</span></div>
 <h2 data-heading tabIndex={-1}>{lesson.title}</h2>
 {mode==='watch'?<>
  {videoDisabled||mediaError?<img className="learning-video" src={mediaUrl(clip.id,'jpg')} alt={`${clip.label}. ${clip.caption}`}/>:<video key={clip.id} ref={video} className="learning-video" src={mediaUrl(clip.id,'mp4')} poster={mediaUrl(clip.id,'jpg')} playsInline muted preload="metadata" aria-label={clip.label} onPlay={()=>{setPlaying(true);speak(clip.caption,settings.narrator,'id-ID',setStatus);}} onPause={()=>setPlaying(false)} onEnded={ask} onError={()=>{stopAll();setPlaying(false);setMediaError(true);setStatus('Video tidak didukung. Gambar dan pertanyaan tetap tersedia.');}}/>}
  <p className="video-caption">{clip.caption}</p>
  {videoDisabled&&<p className="note">Gerak dimatikan. Belajar lewat gambar dan pertanyaan tetap tersedia.</p>}
  <div className="controls">{!videoDisabled&&!mediaError&&(playing?<button onClick={pause}>Jeda video</button>:<button className="primary" onClick={play}>▶ Putar video</button>)}<button onClick={()=>speak(clip.caption,settings.narrator,'id-ID',setStatus)}>Bacakan adegan</button><button onClick={ask}>Langsung ke pertanyaan →</button></div>
 </>:<>
  <Guide text={s.message||q.prompt} avatar={settings.avatar} celebrate={s.phase==='PRAISE'}/>
  <h3 id="video-question-title" tabIndex={-1}>{q.prompt}</h3><img className="video-recap" src={mediaUrl(clip.id,'jpg')} alt={clip.label}/>
  <div className="answers" style={{'--choices':options.length} as React.CSSProperties}>{options.map((c,i)=><button key={c.id} data-answer={c.id} className={`answer option-${i} ${s.errors>=2&&c.id===q.answer?'hinted':''}`} disabled={s.phase==='PRAISE'} onClick={()=>dispatch({type:'ANSWER',id:c.id,q})} aria-label={`Pilih ${c.label}`}><ChoiceVisual choice={c}/>{s.errors>=2&&c.id===q.answer&&<span className="hint-tag">★ Coba ini</span>}</button>)}</div>
  {s.phase==='PRAISE'?<button className="primary next" onClick={next}>{s.round===2?'Lihat hasil bermain':'Lanjut adegan berikutnya'} →</button>:<div className="controls"><button onClick={()=>{dispatch({type:'HINT',q});}}>Bantu aku</button><button onClick={()=>{stopAll();setMode('watch');setStatus('Ayo lihat lagi adegannya.');}}>Tonton adegan lagi</button></div>}
 </>}
 <p className="audio-status" role="status">{status}</p><p className="note">Video animasi tanpa suara rekaman. Narasi memakai pilihan suara browser. Tiap adegan diputar atas pilihan anak; tidak ada autoplay beruntun.</p>
 </section>;
}
