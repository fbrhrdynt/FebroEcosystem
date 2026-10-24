import videos from '../data/videos.json';
import {narratorDefaults,type NarratorPreferences} from './narrator';
import {activities,type QuestionOrder,type SessionLength} from '../data/curriculum';
export const KEY='ghaffiland.trial.v1';
export type Settings=NarratorPreferences & {nickname:string;level:number;narrator:boolean;avatar:boolean;motion:boolean;rewards:boolean;minutes:number;save:boolean;mode:'together'|'short';tv:boolean;questionOrder:QuestionOrder;sessionLength:SessionLength};
export type Progress=Record<string,{sessions:number;rounds:number;attempts:number}>;
export const defaults:Settings={...narratorDefaults,nickname:'Ghaffi',level:1,narrator:true,avatar:true,motion:true,rewards:true,minutes:5,save:true,mode:'together',tv:false,questionOrder:'sequential',sessionLength:'short'};
export function readStore():{settings:Settings;progress:Progress;failed:boolean}{
 try{const raw=localStorage.getItem(KEY);if(!raw)return {settings:{...defaults},progress:{},failed:false};const data=JSON.parse(raw);if(data.version!==1)throw Error('version');const s=data.settings||{};const settings={...defaults};
 if(typeof s.nickname==='string')settings.nickname=s.nickname.replace(/[<>]/g,'').slice(0,20)||'Ghaffi';
 if([1,2,3,4].includes(s.level))settings.level=s.level;
 if([0.65,0.75,0.85,0.95,1,1.05,1.15,1.25,1.35].includes(s.voiceSpeed))settings.voiceSpeed=s.voiceSpeed;
 if([5,10,15].includes(s.minutes))settings.minutes=s.minutes;
 for(const k of ['narrator','avatar','motion','rewards','save','tv'] as const)if(typeof s[k]==='boolean')settings[k]=s[k];
 // Retire both old styles and their voice overrides without losing progress.
 if(s.voiceStyle==='clear')for(const key of ['voiceId','voiceEn'] as const)if(typeof s[key]==='string'&&s[key].length<=500)settings[key]=s[key];
 if(s.mode==='short'||s.mode==='together')settings.mode=s.mode;
 if(s.questionOrder==='sequential'||s.questionOrder==='random')settings.questionOrder=s.questionOrder;
 if(s.sessionLength==='short'||s.sessionLength==='all')settings.sessionLength=s.sessionLength;
 const progress:Progress={};for(const id of [...activities.map(a=>a.id),'R10',...videos.map(v=>v.id)]){const p=data.progress?.[id];if(p&&['sessions','rounds','attempts'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=0&&p[k]<1000000))progress[id]=p;}
 return {settings,progress:settings.save?progress:{},failed:false};
 }catch{return {settings:{...defaults},progress:{},failed:true};}
}
export function writeStore(settings:Settings,progress:Progress){try{if(settings.save)localStorage.setItem(KEY,JSON.stringify({version:1,settings,progress}));else localStorage.removeItem(KEY);return true;}catch{return false;}}
export function exported(progress:Progress){return JSON.stringify({version:1,progress},null,2);}
