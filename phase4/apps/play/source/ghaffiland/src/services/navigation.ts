import {useEffect} from 'react';
export function useRemote(back:()=>void,key:string){useEffect(()=>{
 const fn=(e:KeyboardEvent)=>{
 const tag=(e.target as HTMLElement)?.tagName;const typing=['INPUT','TEXTAREA','SELECT'].includes(tag);if(e.key==='Escape'||e.key==='BrowserBack'||e.keyCode===10009){e.preventDefault();back();return;}
 if(typing||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
 const els=Array.from(document.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a[href]')).filter(el=>!el.closest('[hidden]')&&el.getClientRects().length>0);
 if(!els.length)return;e.preventDefault();const active=document.activeElement as HTMLElement;const index=els.indexOf(active);if(index<0){els[0].focus();return;}
 const a=active.getBoundingClientRect(),ax=a.x+a.width/2,ay=a.y+a.height/2;const horiz=e.key==='ArrowLeft'||e.key==='ArrowRight',sign=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1;
 const candidates=els.filter(el=>el!==active).map(el=>{const r=el.getBoundingClientRect(),dx=r.x+r.width/2-ax,dy=r.y+r.height/2-ay;return {el,primary:(horiz?dx:dy)*sign,secondary:Math.abs(horiz?dy:dx)};}).filter(x=>x.primary>5).sort((a,b)=>(a.primary+a.secondary*2)-(b.primary+b.secondary*2));
 const dest=candidates[0]?.el||els[(index+sign+els.length)%els.length];dest.focus();dest.scrollIntoView?.({block:'nearest'});
 };document.addEventListener('keydown',fn);return()=>document.removeEventListener('keydown',fn);
 },[back,key]);}
