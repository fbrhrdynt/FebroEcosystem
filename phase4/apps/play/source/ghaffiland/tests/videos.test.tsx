// @vitest-environment jsdom
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {act} from 'react';import {createRoot,type Root} from 'react-dom/client';
import App from '../src/App';import {videoLessons,videoQuestion} from '../src/data/videoLessons';
import {readStore,KEY,defaults} from '../src/services/store';
import {readFileSync,statSync} from 'node:fs';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let root:Root,host:HTMLDivElement;
function button(text:string){return [...host.querySelectorAll('button')].find(b=>b.textContent?.includes(text));}
async function click(el:HTMLElement|undefined|null){expect(el).toBeTruthy();await act(async()=>el!.click());}
async function fire(el:Element,name:string){await act(async()=>el.dispatchEvent(new Event(name,{bubbles:true})));}
async function open(index=0){await click(button('Ayo Main!'));await click(button('Tonton, jawab'));await click(button(videoLessons[index].title));}
beforeEach(async()=>{localStorage.clear();vi.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(function(this:HTMLMediaElement){this.dispatchEvent(new Event('play'));return Promise.resolve();});vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(function(this:HTMLMediaElement){this.dispatchEvent(new Event('pause'));});host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<App/>));});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
it('all nine actual MP4 clips and posters are bundled with valid question references',()=>{
 expect(videoLessons).toHaveLength(3);
 for(const [i,v] of videoLessons.entries()){expect(v.clips).toHaveLength(3);for(const [j,c] of v.clips.entries()){const q=videoQuestion(i,j);expect(q.id).toBe(c.questionId);if(v.theme==='count')expect(q.objects).toBe(c.value);if(v.theme==='color')expect(q.answer).toBe(c.label.toLowerCase());if(v.theme==='shape')expect(q.target?.art).toBe(c.value);const bytes=readFileSync(`public/videos/${c.id}.mp4`);expect(bytes.length).toBeGreaterThan(1000);expect(bytes.subarray(4,8).toString()).toBe('ftyp');expect(statSync(`public/videos/${c.id}.jpg`).size).toBeGreaterThan(1000);}}
});
for(let index=0;index<3;index++)it(`video ${index+1}: does not autoplay, ends in questions, handles wrong answers and saves three rounds`,async()=>{
 await open(index);expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();expect(host.querySelector('video')?.autoplay).toBe(false);
 for(let round=0;round<3;round++){
  await click(button('Putar video'));expect(button('Jeda video')).toBeTruthy();
  const video=host.querySelector('video')!;await fire(video,'ended');expect(host.querySelector('video')).toBeNull();const q=videoQuestion(index,round);
  await click([...host.querySelectorAll<HTMLButtonElement>('[data-answer]')].find(b=>b.dataset.answer!==q.answer));const hint=host.querySelector('.bubble')?.textContent;
  await click([...host.querySelectorAll<HTMLButtonElement>('[data-answer]')].find(b=>b.dataset.answer!==q.answer));expect(host.querySelector('.bubble')?.textContent).not.toBe(hint);
  await click([...host.querySelectorAll<HTMLButtonElement>('[data-answer]')].find(b=>b.dataset.answer===q.answer));
  await click(button(round===2?'Lihat hasil bermain':'Lanjut adegan berikutnya'));
 }
 expect(readStore().progress[videoLessons[index].id]).toEqual({sessions:1,rounds:3,attempts:9});expect(host.textContent).toContain('Terima kasih');
});
it('pause stops playback and replay does not add progress',async()=>{await open();await click(button('Putar video'));await click(button('Jeda video'));expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();await click(button('Langsung ke pertanyaan'));await click(button('Tonton adegan lagi'));expect(host.querySelector('video')).toBeTruthy();expect(readStore().progress.V01).toBeUndefined();});
it('media error falls back to still illustration and an answerable question',async()=>{await open();await fire(host.querySelector('video')!,'error');expect(host.querySelector('video')).toBeNull();expect(host.querySelector('img.learning-video')).toBeTruthy();await click(button('Langsung ke pertanyaan'));expect(host.querySelectorAll('[data-answer]')).toHaveLength(2);});
it('motion-off users can finish the same lesson without playback',async()=>{await act(async()=>root.unmount());localStorage.setItem(KEY,JSON.stringify({version:1,settings:{...defaults,motion:false},progress:{}}));root=createRoot(host);await act(async()=>root.render(<App/>));await open();expect(host.querySelector('video')).toBeNull();expect(host.textContent).toContain('Gerak dimatikan');await click(button('Langsung ke pertanyaan'));expect(host.querySelectorAll('[data-answer]')).toHaveLength(2);});
it('failed play promise exposes usable fallback, not false playing status',async()=>{vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('not allowed'));await open();await click(button('Putar video'));expect(host.querySelector('video')).toBeNull();expect(button('Jeda video')).toBeUndefined();await click(button('Langsung ke pertanyaan'));expect(host.querySelectorAll('[data-answer]')).toHaveLength(2);});
it('Escape leaves video and stops its playback',async()=>{await open();await click(button('Putar video'));await act(async()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));});expect(host.querySelector('video')).toBeNull();expect(host.textContent).toContain('Pilih petualanganmu');expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();});
