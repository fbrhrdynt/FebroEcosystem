import {chooseVoice,currentProfile} from './narrator';
type ResultEvent={results:ArrayLike<ArrayLike<{transcript:string;confidence:number}>>};
export type Recognition={lang:string;continuous:boolean;interimResults:boolean;maxAlternatives:number;onresult:((e:ResultEvent)=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;onstart:(()=>void)|null;start:()=>void;abort:()=>void};
type VoiceWindow=Window & {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
let recognition:Recognition|null=null;let timer:ReturnType<typeof setTimeout>|undefined;
export function capabilities(){const w=window as VoiceWindow;return {tts:'speechSynthesis' in window,mic:!!(w.SpeechRecognition||w.webkitSpeechRecognition)};}
export function stopMic(){clearTimeout(timer);if(recognition){const r=recognition;recognition=null;r.onresult=null;r.onerror=null;r.onend=null;r.onstart=null;try{r.abort();}catch{/* already stopped */}}}
export function stopAudio(){if('speechSynthesis' in window)window.speechSynthesis.cancel();}
export function stopAll(){stopMic();stopAudio();}
export function speak(text:string,enabled:boolean,lang='id-ID',onStatus?:(s:string)=>void){
 stopAll();if(!enabled)return;if(!capabilities().tts){onStatus?.('Narasi tidak tersedia. Tetap bisa bermain lewat gambar.');return;}
 const synth=window.speechSynthesis;const voice=chooseVoice(synth.getVoices(),lang);
 if(!voice){onStatus?.(`Suara ${lang.startsWith('en')?'Inggris':'Indonesia'} tidak tersedia di browser ini. Gunakan pilihan sentuh, atau aktifkan voice di perangkat.`);return;}
 const msg=new SpeechSynthesisUtterance(text);msg.voice=voice;msg.lang=lang;const profile=currentProfile();msg.pitch=profile.pitch;msg.rate=profile.rate;msg.volume=profile.volume;msg.onstart=()=>onStatus?.('Sedang berbicara…');msg.onend=()=>onStatus?.('Narasi selesai.');msg.onerror=()=>onStatus?.('Narasi terhenti. Teks tetap tersedia.');synth.speak(msg);
}
export function listen(result:(s:string)=>void,status:(s:string)=>void,done:()=>void){
 stopAll();const w=window as VoiceWindow;const Constructor=w.SpeechRecognition||w.webkitSpeechRecognition;
 if(!Constructor){status('Browser tidak mendukung mikrofon. Sentuh jawabannya, ya.');done();return;}
 const r=new Constructor();recognition=r;r.lang='id-ID';r.continuous=false;r.interimResults=false;r.maxAlternatives=1;
 const finish=()=>{stopMic();done();};
 r.onstart=()=>status('Mendengarkan…');
 r.onresult=e=>{const heard=e.results[0]?.[0];finish();if(heard&&(heard.confidence===0||heard.confidence>=.55)){status('Jawaban diterima.');result(heard.transcript);}else{status('Aku belum mendengar jelas. Sentuh jawaban atau coba lagi.');result('');}};
 r.onerror=e=>{finish();status(e.error==='not-allowed'?'Izin mikrofon ditolak. Sentuh jawabannya, ya.':e.error==='network'?'Layanan suara tidak terhubung. Gunakan pilihan gambar.':'Belum terdengar. Coba lagi atau sentuh jawaban.');};
 r.onend=()=>{if(recognition===r){finish();status('Mikrofon mati. Sentuh jawaban atau coba lagi.');}};
 timer=setTimeout(()=>{finish();status('Waktu mendengar selesai. Sentuh jawaban atau coba lagi.');},8000);
 try{r.start();}catch{finish();status('Mikrofon belum dapat digunakan. Pilihan sentuh tetap tersedia.');}
}
