// @vitest-environment jsdom
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {listen,stopAll,speak,capabilities} from '../src/services/speech';
import {configureNarrator,narratorDefaults,chooseVoice} from '../src/services/narrator';
let rec:any;let synth:any;
class MockRecognition {lang='';continuous=false;interimResults=false;maxAlternatives=0;onstart:any;onresult:any;onerror:any;onend:any;start=vi.fn(()=>this.onstart?.());abort=vi.fn();constructor(){rec=this;}}
beforeEach(()=>{vi.useFakeTimers();Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:MockRecognition});synth={cancel:vi.fn(),speak:vi.fn(),getVoices:()=>[{lang:'id-ID',name:'Microsoft Gadis',voiceURI:'gadis'}]};Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});vi.stubGlobal('SpeechSynthesisUtterance',class{text:string;constructor(text:string){this.text=text;}});});
afterEach(()=>{stopAll();vi.useRealTimers();vi.unstubAllGlobals();delete (window as any).SpeechRecognition;delete (window as any).speechSynthesis;});
it('records real start/result and stops before delivering transcript',()=>{const result=vi.fn(),status=vi.fn(),done=vi.fn();listen(result,status,done);expect(rec.start).toHaveBeenCalled();expect(status).toHaveBeenCalledWith('Mendengarkan…');rec.onresult({results:[[{transcript:'tiga',confidence:.9}]]});expect(rec.abort).toHaveBeenCalled();expect(done).toHaveBeenCalled();expect(result).toHaveBeenCalledWith('tiga');expect(rec.onresult).toBeNull();});
it.each(['not-allowed','network','no-speech'])('handles %s without inventing an answer',error=>{const result=vi.fn(),status=vi.fn(),done=vi.fn();listen(result,status,done);rec.onerror({error});expect(done).toHaveBeenCalled();expect(result).not.toHaveBeenCalled();expect(rec.abort).toHaveBeenCalled();});
it('times out after eight seconds and cannot receive stale events',()=>{const result=vi.fn(),done=vi.fn();listen(result,vi.fn(),done);vi.advanceTimersByTime(8000);expect(done).toHaveBeenCalled();expect(rec.abort).toHaveBeenCalled();expect(rec.onresult).toBeNull();expect(result).not.toHaveBeenCalled();});
it('narator aborts recognition; capture cancels speech; mute cancels running speech',()=>{listen(vi.fn(),vi.fn(),vi.fn());speak('Halo',true);expect(rec.abort).toHaveBeenCalled();expect(synth.speak).toHaveBeenCalledOnce();listen(vi.fn(),vi.fn(),vi.fn());expect(synth.cancel.mock.calls.length).toBeGreaterThan(2);stopAll();expect(rec.abort).toHaveBeenCalled();});
it('does not synthesize absent language voices or disabled narration',()=>{speak('hello',true,'en-US');speak('Halo',false);expect(synth.speak).not.toHaveBeenCalled();});
it('feature-detects unavailable recognition',()=>{delete (window as any).SpeechRecognition;expect(capabilities().mic).toBe(false);const done=vi.fn(),result=vi.fn();listen(result,vi.fn(),done);expect(done).toHaveBeenCalled();expect(result).not.toHaveBeenCalled();});

it('clear female profile uses natural pitch, normal pace and audible volume',()=>{
 configureNarrator(narratorDefaults);speak('Halo! Siap bermain?',true);
 const u=synth.speak.mock.calls[0][0];
 expect(u.pitch).toBe(1.04);expect(u.rate).toBe(1.05);expect(u.volume).toBe(.82);
 expect(u.voice.voiceURI).toBe('gadis');
});
it('old gentle style cannot restore the slow high-pitch profile',()=>{
 configureNarrator({...narratorDefaults,voiceStyle:'gentle'} as any);speak('Ayo hitung!',true);
 const u=synth.speak.mock.calls[0][0];expect(u.pitch).toBe(1.04);expect(u.rate).toBe(1.05);
 configureNarrator(narratorDefaults);
});
it('automatic choice uses recognized female candidate, not first browser voice',()=>{
 configureNarrator(narratorDefaults);
 const voices=[{name:'Microsoft Andika',lang:'id-ID',voiceURI:'andika'},{name:'Microsoft Gadis',lang:'id-ID',voiceURI:'gadis'}] as SpeechSynthesisVoice[];
 expect(chooseVoice(voices,'id-ID')?.voiceURI).toBe('gadis');
});
it('parent can audition unknown voices, with language-safe fallback when removed',()=>{
 const voices=[{name:'Voice B',lang:'id-ID',voiceURI:'b'},{name:'Microsoft Gadis',lang:'id-ID',voiceURI:'gadis'},{name:'Samantha',lang:'en-US',voiceURI:'sam'}] as SpeechSynthesisVoice[];
 configureNarrator({...narratorDefaults,voiceId:'b',voiceEn:'sam'});
 expect(chooseVoice(voices,'id-ID')?.voiceURI).toBe('b');expect(chooseVoice(voices,'en-US')?.voiceURI).toBe('sam');
 expect(chooseVoice(voices.slice(1),'id-ID')?.voiceURI).toBe('gadis');expect(chooseVoice(voices,'ar')).toBeUndefined();
 configureNarrator(narratorDefaults);
});
it('avoids known male and can use unrecognized but language-matching voices',()=>{
 configureNarrator(narratorDefaults);
 const male={name:'Microsoft Andika',lang:'id-ID',voiceURI:'andika'} as SpeechSynthesisVoice;
 expect(chooseVoice([male],'id-ID')).toBeUndefined();
 expect(chooseVoice([{...male,name:'Voice X',voiceURI:'x'}],'id-ID')?.voiceURI).toBe('x');
 configureNarrator({...narratorDefaults,voiceId:'andika'});
 expect(chooseVoice([male],'id-ID')).toBeUndefined();configureNarrator(narratorDefaults);
});
it('reports missing language voice without speaking a male fallback',()=>{
 synth.getVoices=()=>[{name:'Microsoft Andika',lang:'id-ID',voiceURI:'andika'}];
 const status=vi.fn();speak('Halo',true,'id-ID',status);
 expect(synth.speak).not.toHaveBeenCalled();expect(status).toHaveBeenCalledWith(expect.stringContaining('tidak tersedia'));
});

it('parent speed preference controls speech and invalid speed falls back safely',()=>{
 configureNarrator({...narratorDefaults,voiceSpeed:1.25});speak('Ayo!',true);expect(synth.speak.mock.calls[0][0].rate).toBe(1.25);
 configureNarrator({...narratorDefaults,voiceSpeed:9});speak('Ayo!',true);expect(synth.speak.mock.calls[1][0].rate).toBe(1.05);configureNarrator(narratorDefaults);
});
