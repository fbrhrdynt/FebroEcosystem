import {numberNames,type Question,type Choice} from '../data/curriculum';
export type Dialog={phase:'ASKING'|'LISTENING'|'PRAISE'|'HINT'|'RETRY'|'COMPLETE';round:number;errors:number;correct:number;attempts:number;message:string;last:string};
export const initial:Dialog={phase:'ASKING',round:0,errors:0,correct:0,attempts:0,message:'',last:''};
export type Event={type:'ANSWER';id:string;q:Question}|{type:'NEXT';total?:number}|{type:'HINT';q:Question}|{type:'UNKNOWN'}|{type:'LISTEN'}|{type:'STOP'}|{type:'RESET'};
export function reducer(s:Dialog,e:Event):Dialog{
 if(e.type==='RESET')return {...initial};
 if(e.type==='NEXT')return s.phase!=='PRAISE'?s:s.round===(e.total??3)-1?{...s,phase:'COMPLETE'}:{...s,round:s.round+1,phase:'ASKING',errors:0,message:'',last:''};
 if(s.phase==='PRAISE'||s.phase==='COMPLETE')return s;
 if(e.type==='LISTEN')return {...s,phase:'LISTENING'};
 if(e.type==='STOP')return {...s,phase:'ASKING'};
 if(e.type==='UNKNOWN')return {...s,phase:'RETRY',message:'Aku belum mendengar jelas. Mau coba lagi atau sentuh jawabannya?'};
 if(e.type==='HINT')return {...s,phase:'HINT',errors:Math.max(1,s.errors),message:e.q.hints[Math.min(s.errors,1)]};
 if(!e.q.choices.some(c=>c.id===e.id))return s;
 if(e.id===e.q.answer)return {...s,phase:'PRAISE',correct:s.correct+1,attempts:s.attempts+1,last:e.id,message:e.q.success};
 const errors=s.errors+1;return {...s,phase:'HINT',errors,attempts:s.attempts+1,last:e.id,message:errors===1?`Yuk, coba bersama. ${e.q.hints[0]}`:errors===2?e.q.hints[1]:`Kita pilih dari dua kartu saja, ya. ${e.q.hints[1]}`};
}
export function normalize(text:string){const clean=text.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();const n=numberNames.indexOf(clean);return n>=0?String(n):clean;}
export function interpret(text:string,choices:Choice[]):{type:'choice';id:string}|{type:'command';command:string}|{type:'unknown'}{
 const clean=normalize(text);const commands:Record<string,string>={ulang:'repeat',ulangi:'repeat',lagi:'repeat',bantu:'hint',bantuan:'hint',selesai:'quit',berhenti:'quit',lewati:'skip'};
 if(commands[clean])return {type:'command',command:commands[clean]};
 const matches=choices.filter(c=>[c.id,c.label,...(c.aliases||[])].some(a=>normalize(a)===clean));
 return matches.length===1?{type:'choice',id:matches[0].id}:{type:'unknown'};
}
