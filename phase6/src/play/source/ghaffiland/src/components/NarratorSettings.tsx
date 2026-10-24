import {useEffect,useState} from 'react';
import {languageVoices,voiceKey,femaleCandidateScore,type NarratorPreferences} from '../services/narrator';
import {speak,stopAll} from '../services/speech';
import type {Settings} from '../services/store';
export function NarratorSettings({settings,onChange}:{settings:Settings;onChange:(patch:Partial<NarratorPreferences>)=>void}) {
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [status,setStatus]=useState('');
  useEffect(()=>{
    if(!('speechSynthesis' in window))return;
    const synth=window.speechSynthesis;
    const update=()=>setVoices(synth.getVoices());
    update();synth.addEventListener?.('voiceschanged',update);
    return ()=>synth.removeEventListener?.('voiceschanged',update);
  },[]);
  return <div className="narrator-settings">
    <h3>Kakak Ceria — jelas &amp; tegas</h3>
    <p className="note">Nada mendekati suara asli, tempo bisa diperlambat, dan volume tetap jelas. Preset lama Ceria/Lembut sudah diganti. Pilih suara perempuan yang terdengar nyaman, lalu coba sebelum bermain.</p>
    <label>Kecepatan narator<select value={settings.voiceSpeed} onChange={e=>onChange({voiceSpeed:Number(e.target.value)})}>
      <option value={0.65}>0,65× — sangat lambat</option><option value={0.75}>0,75× — lambat</option><option value={0.85}>0,85× — agak lambat</option><option value={0.95}>0,95× — sedikit lambat</option><option value={1}>1,00× — normal</option><option value={1.05}>1,05× — biasa (default)</option><option value={1.15}>1,15× — lebih sigap</option><option value={1.25}>1,25× — cepat</option><option value={1.35}>1,35× — lebih cepat</option>
    </select></label>
    {(['id-ID','en-US'] as const).map(lang=>{
      const key=lang==='id-ID'?'voiceId':'voiceEn';const options=languageVoices(voices,lang);
      const missing=settings[key]&&!options.some(v=>voiceKey(v)===settings[key]);
      return <label key={lang}>Suara {lang==='id-ID'?'Indonesia':'English'}<select disabled={!options.length} value={settings[key]} onChange={e=>onChange({[key]:e.target.value})}>
        <option value="">Otomatis — kandidat suara perempuan</option>
        {missing&&<option value={settings[key]}>Pilihan sebelumnya tidak tersedia (pakai otomatis)</option>}
        {options.map(v=><option key={voiceKey(v)} value={voiceKey(v)}>{v.name}{femaleCandidateScore(v)===0?" — dengarkan dulu":""}</option>)}
      </select>{!options.length&&<span className="note">Belum ada pilihan yang sesuai. Tunggu daftar suara dimuat atau periksa suara yang terpasang pada perangkat.</span>}</label>;
    })}
    <p className="note">Browser tidak menyediakan informasi gender atau kontrol desahan. Pemilihan otomatis memakai petunjuk nama voice; suara yang belum dikenali perlu dipilih dan didengarkan pendamping. Jika suara perempuan yang dikenali tidak ada, aplikasi mencoba suara lain yang cocok dengan bahasanya. Periksa suaranya melalui tombol Coba.</p>
    <button onClick={()=>speak('Hello! Ready to play? Count with me. One, two, three. Well done!',settings.narrator,'en-US',setStatus)}>Coba suara English</button>
    <button onClick={()=>{stopAll();setStatus('Suara dihentikan.');}}>Hentikan contoh</button>
    {status&&<p className="note" role="status">{status}</p>}
  </div>;
}
