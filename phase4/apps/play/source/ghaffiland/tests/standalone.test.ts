import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
it('production standalone has embedded mascot, boots offline and answers a real question',async()=>{
 const html=readFileSync('GhaffiLand-Langsung-Main.html','utf8');expect(html).toContain('data:image/png;base64,');expect(html).toContain('data:video/mp4;base64,');expect(html).not.toMatch(/<script[^>]+src=/);expect(html).not.toContain('src="./assets/');
 const errors:Error[]=[];const vc=new VirtualConsole();vc.on('jsdomError',(e:Error)=>{if(!e.message.includes('CSS'))errors.push(e);});
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'file:///GhaffiLand-Langsung-Main.html',virtualConsole:vc,pretendToBeVisual:true});
 const media=(dom.window as any).__GHAFFI_MEDIA__;expect(Object.keys(media)).toHaveLength(18);for(const [name,value] of Object.entries(media)){if(name.endsWith('.mp4'))expect(Buffer.from((value as string).split(',')[1],'base64').length).toBeGreaterThan(1000);}
 const d=dom.window.document;const flush=()=>new Promise(r=>setTimeout(r,25));const click=async(text:string)=>{const b=[...d.querySelectorAll('button')].find(b=>b.textContent?.includes(text));expect(b,text).toBeTruthy();b!.click();await flush();};
 try{await flush();expect(d.querySelector('img')?.src).toMatch(/^data:image\/png;base64,/);await click('Ayo Main!');await click('Baca & Huruf');await click('Kenal Alfabet');const answer=d.querySelector<HTMLButtonElement>('[data-answer="A"]');expect(answer).toBeTruthy();answer!.click();await flush();expect(d.querySelector('.bubble')?.textContent).toContain('Betul');expect(errors).toEqual([]);}finally{dom.window.close();}
});
