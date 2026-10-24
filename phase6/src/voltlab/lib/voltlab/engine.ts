import {getDef} from './catalog';
import {Circuit,Comp,key,Endpoint} from './model';
export type Issue={ruleCode:string;severity:'info'|'warning'|'error'|'critical';componentIds:string[];terminalIds?:string[];title:string;message:string;recommendation:string;learningTopic:string};
export type Value={voltage:number;current:number;on:boolean;state:string};
export type Result={states:Record<string,boolean>;values:Record<string,Value>;potentials:Record<string,[number,number]>;issues:Issue[];conductive:Record<string,string[]>;wireLive:Record<string,boolean>;iterations:number;short:boolean;sourceKind:Record<string,string>;tripIds:string[]};
class Nets{p=new Map<string,string>();add(s:string){if(!this.p.has(s))this.p.set(s,s)}find(s:string):string{const p=this.p.get(s);if(!p)return s;if(p===s)return s;const r=this.find(p);this.p.set(s,r);return r}join(a:string,b:string){this.add(a);this.add(b);this.p.set(this.find(a),this.find(b))}}
const prop=(c:Comp,k:string,f:number)=>typeof c.properties[k]==='number'?c.properties[k] as number:f;
export function conductivePairs(c:Comp,active:boolean):string[][]{const d=getDef(c.definitionId),t=d.terminals;
 if(d.model==='switch')return c.state.closed?[t]:[];
 if(d.model==='no')return c.state.pressed?[t]:[];
 if(d.model==='nc')return c.state.pressed?[]:[t];
 if(d.model==='estop')return c.state.tripped?[]:[t];
 if(d.model==='breaker'){if(!c.state.closed||c.state.tripped)return [];return d.poles===3?[['L1','T1'],['L2','T2'],['L3','T3']]:d.poles===2?[['L','T'],['N','R']]:[t];}
 if(d.model==='terminal')return t.slice(1).map(x=>[t[0],x]);
 if(d.model==='coil')return [...(active?[['13','14']]:[['21','22']]),...(d.id==='contactor'&&active?[['L1','T1'],['L2','T2'],['L3','T3']]:[])];
 if(d.model==='overload')return [['L1','T1'],['L2','T2'],['L3','T3'],c.state.tripped?['97','98']:['95','96']];return [];
}
function gaussian(a:number[][],b:number[]){const n=b.length;for(let i=0;i<n;i++){let pivot=i;for(let k=i+1;k<n;k++)if(Math.abs(a[k][i])>Math.abs(a[pivot][i]))pivot=k;[a[i],a[pivot]]=[a[pivot],a[i]];[b[i],b[pivot]]=[b[pivot],b[i]];const q=a[i][i];if(Math.abs(q)<1e-12)continue;for(let j=i;j<n;j++)a[i][j]/=q;b[i]/=q;for(let k=0;k<n;k++)if(k!==i){const f=a[k][i];for(let j=i;j<n;j++)a[k][j]-=f*a[i][j];b[k]-=f*b[i];}}return b;}
export function evaluate(circuit:Circuit,running=true,previous:Record<string,boolean>={}):Result{
 const tripIds=new Set<string>();
 const states={...previous};for(const c of circuit.components)if(!(c.id in states))states[c.id]=false;
 let completeNodes=new Set<string>(); let completeLoads=new Set<string>();
 let potentials:Record<string,[number,number]>={},graph:Record<string,string[]>={},kinds:Record<string,string>={},values:Record<string,Value>={},issues:Issue[]=[],short=false,iterations=0;
 const add=(ruleCode:string,severity:Issue['severity'],ids:string[],title:string,message:string,recommendation:string,terminals?:string[])=>{if(!issues.some(x=>x.ruleCode===ruleCode&&x.componentIds.join()===ids.join()))issues.push({ruleCode,severity,componentIds:ids,terminalIds:terminals,title,message,recommendation,learningTopic:ruleCode.includes('VOLTAGE')?'Rating tegangan':'Jalur arus dan kontrol'});};
 const seen=new Set<string>();
 for(let pass=0;pass<24;pass++){
 iterations=pass+1;const nets=new Nets();graph={};kinds={};
 const edge=(a:string,b:string)=>{nets.join(a,b);(graph[a]??=[]).push(b);(graph[b]??=[]).push(a)};
 for(const c of circuit.components)for(const t of getDef(c.definitionId).terminals){const k=c.id+':'+t;nets.add(k);graph[k]=[];}
 for(const w of circuit.wires){const a=key(w.from),b=key(w.to);if(!(a in graph)||!(b in graph)){add('TERMINAL_MISMATCH','error',[w.from.componentId,w.to.componentId],'Terminal tidak dikenal','Salah satu kabel mengacu ke terminal yang tidak tersedia.','Hapus kabel dan hubungkan kembali ke terminal yang valid.');continue;}if(a===b)add('SELF_SHORT','error',[w.from.componentId],'Kabel kembali ke terminal yang sama','Koneksi ini tidak membentuk jalur baru.','Hapus kabel tersebut.');edge(a,b);}
 for(const c of circuit.components)for(const pair of conductivePairs(c,!!states[c.id]))edge(c.id+':'+pair[0],c.id+':'+pair[1]);
 const fixed=new Map<string,[number,number]>(); const fixedNode=new Map<string,string>();const rootsKind=new Map<string,string>();
 const set=(node:string,p:[number,number],kind:string)=>{const root=nets.find(node);const old=fixed.get(root);if(old&&Math.hypot(old[0]-p[0],old[1]-p[1])>0.01){short=true;const start=fixedNode.get(root)!;const queue=[start],prev=new Map<string,string|null>([[start,null]]);while(queue.length){const n=queue.shift()!;if(n===node)break;for(const next of graph[n]||[])if(!prev.has(next)){prev.set(next,n);queue.push(next);}}let cursor:string|null=node;while(cursor&&prev.has(cursor)){const id=cursor.split(':')[0],comp=circuit.components.find(c=>c.id===id);if(comp&&getDef(comp.definitionId).model==='breaker')tripIds.add(id);cursor=prev.get(cursor)!;}add('SHORT_CIRCUIT','critical',[node.split(':')[0]],'Hubung singkat pada sumber','Terminal dengan potensial berbeda terhubung melalui jalur konduktif tanpa beban.','STOP simulasi. Putuskan jalur langsung dan pasang beban serta proteksi yang sesuai.');}fixed.set(root,p);fixedNode.set(root,node);rootsKind.set(root,kind);};
 if(running)for(const c of circuit.components){const d=getDef(c.definitionId),v=prop(c,'voltage',d.voltage);if(d.model==='dc'){set(c.id+':+',[v,0],'DC');set(c.id+':−',[0,0],'DC');}if(d.model==='ac'){set(c.id+':L',[v,0],'AC');set(c.id+':N',[0,0],'AC');set(c.id+':PE',[0,0],'PE');}if(d.model==='three'){const phase=v/Math.sqrt(3);set(c.id+':L1',[phase,0],'AC');set(c.id+':L2',[-phase/2,-phase*Math.sqrt(3)/2],'AC');set(c.id+':L3',[-phase/2,phase*Math.sqrt(3)/2],'AC');set(c.id+':N',[0,0],'AC');set(c.id+':PE',[0,0],'PE');}}
 const resistors:{a:string;b:string;r:number;c:Comp}[]=[];
 for(const c of circuit.components){const d=getDef(c.definitionId);if(['coil','lamp','resistor','led'].includes(d.model)){const t=d.model==='coil'?['A1','A2']:d.terminals.slice(0,2);resistors.push({a:nets.find(c.id+':'+t[0]),b:nets.find(c.id+':'+t[1]),r:Math.max(0.01,prop(c,'resistance',d.resistance||1000)),c});}}
 completeLoads=new Set<string>(); const anchorsWithout=(start:string,exclude:string)=>{const found=new Set([start]),q=[start],out:[number,number][]=[];for(let qi=0;qi<q.length;qi++){const node=q[qi];if(fixed.has(node))out.push(fixed.get(node)!);for(const r of resistors){if(r.c.id===exclude)continue;const next=r.a===node?r.b:r.b===node?r.a:null;if(next&&!found.has(next)){found.add(next);q.push(next);}}}return out;}; for(const r of resistors){const aa=anchorsWithout(r.a,r.c.id),bb=anchorsWithout(r.b,r.c.id);if(aa.some(a=>bb.some(b=>Math.hypot(a[0]-b[0],a[1]-b[1])>.01)))completeLoads.add(r.c.id);}
 const neighbor=new Map<string,string[]>();for(const r of resistors){neighbor.set(r.a,[...(neighbor.get(r.a)||[]),r.b]);neighbor.set(r.b,[...(neighbor.get(r.b)||[]),r.a]);}
 const reachable=new Set<string>(fixed.keys());const q=[...reachable];while(q.length){const a=q.shift()!;for(const b of neighbor.get(a)||[])if(!reachable.has(b)){reachable.add(b);q.push(b);rootsKind.set(b,rootsKind.get(a)||'');}}
 completeNodes=new Set<string>(); const checked=new Set<string>(); for(const root of reachable){if(checked.has(root))continue;const group=[root],found=new Set(group);for(let gi=0;gi<group.length;gi++)for(const n of neighbor.get(group[gi])||[])if(!found.has(n)){found.add(n);group.push(n);}group.forEach(n=>checked.add(n));const anchors=group.filter(n=>fixed.has(n)).map(n=>fixed.get(n)!);const valid=anchors.some(a=>anchors.some(b=>Math.hypot(a[0]-b[0],a[1]-b[1])>.01));if(valid)for(const n of nets.p.keys())if(found.has(nets.find(n)))completeNodes.add(n);}
 const unknown=[...reachable].filter(r=>!fixed.has(r));const index=new Map(unknown.map((r,i)=>[r,i]));const mat=unknown.map(()=>unknown.map(()=>0));const br=unknown.map(()=>0),bi=unknown.map(()=>0);
 for(const r of resistors)for(const [a,b] of [[r.a,r.b],[r.b,r.a]]){const i=index.get(a);if(i===undefined)continue;const g=1/r.r;mat[i][i]+=g;const j=index.get(b);if(j!==undefined)mat[i][j]-=g;else{br[i]+=g*(fixed.get(b)?.[0]||0);bi[i]+=g*(fixed.get(b)?.[1]||0);}}
 const vr=gaussian(mat.map(r=>[...r]),[...br]),vi=gaussian(mat.map(r=>[...r]),[...bi]);const solved=new Map(fixed);unknown.forEach((r,i)=>solved.set(r,[vr[i]||0,vi[i]||0]));potentials={};
 for(const node of nets.p.keys()){const root=nets.find(node),v=solved.get(root);if(v){potentials[node]=v;kinds[node]=rootsKind.get(root)||'';}}
 const voltage=(a:string,b:string)=>{const x=potentials[a],y=potentials[b];return x&&y?Math.hypot(x[0]-y[0],x[1]-y[1]):0};
 let changed=false;values={};
 for(const c of circuit.components){const d=getDef(c.definitionId),rated=prop(c,'voltage',d.voltage);if(d.model==='coil'){const v=voltage(c.id+':A1',c.id+':A2'),isDc=kinds[c.id+':A1']==='DC',rightType=isDc===!!c.properties.dc;const on=running&&!short&&rightType&&Math.abs(v-rated)<=rated*0.1;if(on!==states[c.id]){states[c.id]=on;changed=true;}values[c.id]={voltage:v,current:v/prop(c,'resistance',240),on,state:on?'ENERGIZED':'OFF'};}
 else if(['lamp','resistor','led'].includes(d.model)){const [a,b]=d.terminals,v=voltage(c.id+':'+a,c.id+':'+b),signed=(potentials[c.id+':'+a]?.[0]||0)-(potentials[c.id+':'+b]?.[0]||0);const on=running&&!short&&v>0.5&&(d.model==='resistor'||(d.model==='led'?signed>1.5:Math.abs(v-rated)<=rated*0.2));values[c.id]={voltage:v,current:v/prop(c,'resistance',d.resistance||1000),on,state:on?'ON':'OFF'};}
 else if(d.model==='motor'){const p=['U','V','W'].map(t=>potentials[c.id+':'+t]);const vv=p.map((x,i)=>x&&p[(i+1)%3]?Math.hypot(x[0]-p[(i+1)%3]![0],x[1]-p[(i+1)%3]![1]):0);const on=running&&!short&&vv.every(v=>Math.abs(v-rated)<rated*0.1)&&['U','V','W'].every(t=>kinds[c.id+':'+t]==='AC');values[c.id]={voltage:Math.min(...vv),current:on?prop(c,'current',8):0,on,state:on?'RUNNING':'STOPPED'};}
 }
 const signature=JSON.stringify(states);if(!changed)break;if(seen.has(signature)){add('OSCILLATION','error',[],'Kontrol tidak stabil','Kontak dan coil berganti state berulang.','Periksa feedback kontak NC dan sumber kontrol.');break;}seen.add(signature);
 }
 if(iterations>=24)add('ITERATION_LIMIT','error',[],'Batas iterasi tercapai','State belum stabil.','Periksa rangkaian feedback.');
 const path=(a:string,target:(s:string)=>boolean)=>{const q=[a],visited=new Set(q);while(q.length){const n=q.shift()!;if(target(n))return true;for(const b of graph[n]||[])if(!visited.has(b)){visited.add(b);q.push(b);}}return false};
 for(const c of circuit.components){const d=getDef(c.definitionId),val=values[c.id];
 if(d.model==='breaker'&&c.state.tripped)add('PROTECTION_TRIPPED','warning',[c.id],`${c.instanceName}: breaker tripped`,'Pemutus terbuka akibat gangguan simulasi.','Perbaiki rangkaian, pilih RESET lalu ON.');
 if(d.model==='unsupported')add('MODEL_UNAVAILABLE','info',[c.id],`${c.instanceName}: model belum tersedia`,'Komponen ini ada di katalog; engine belum mengevaluasi perilakunya.','Gunakan komponen yang memiliki model simulasi aktif.');
 if(running&&val&&['lamp','coil','led'].includes(d.model)){
 const ts=d.model==='coil'?['A1','A2']:d.terminals.slice(0,2),a=c.id+':'+ts[0],b=c.id+':'+ts[1],rated=prop(c,'voltage',d.voltage);
 if(val.voltage>0.5&&Math.abs(val.voltage-rated)>rated*(d.model==='coil'?0.1:0.2))add(d.model==='coil'?'WRONG_COIL_VOLTAGE':'LOAD_VOLTAGE_MISMATCH','error',[c.id],`${c.instanceName}: tegangan tidak sesuai`,`${val.voltage.toFixed(1)} V terukur, rating ${rated} V.`,'Sesuaikan rating komponen atau gunakan sumber tegangan yang benar.',ts);
 if(val.voltage>0.5&&d.model!=='led'&&(kinds[a]==='DC')!==!!c.properties.dc)add('SUPPLY_TYPE_MISMATCH','error',[c.id],`${c.instanceName}: AC/DC tidak sesuai`,'Tipe sumber berbeda dari rating beban atau coil.','Pilih tipe AC/DC yang sesuai pada properties.');
 if(c.properties.dc&&(potentials[a]?.[0]||0)<(potentials[b]?.[0]||0)-0.5)add('REVERSED_DC_POLARITY','warning',[c.id],`${c.instanceName}: polaritas terbalik`,'Terminal positif menerima potensial lebih rendah.','Hubungkan + ke positif dan − ke return.',ts);
 if(!potentials[a]||!potentials[b]||!completeLoads.has(c.id))add(d.model==='coil'?'NO_RETURN_PATH':'OPEN_CIRCUIT','warning',[c.id],`${c.instanceName}: jalur terbuka`,'Tidak ada jalur lengkap ke sumber dan return. Saklar OFF juga bisa menyebabkan kondisi ini.','Periksa kedua terminal, kabel return, dan posisi saklar.',ts);
 }
 if(d.model==='motor'){
 if(!path(c.id+':U',s=>getDef(circuit.components.find(n=>n.id===s.split(':')[0])!.definitionId).model==='overload'))add('MISSING_OVERLOAD','warning',[c.id],`${c.instanceName}: overload belum terpasang`,'Jalur daya motor tidak melewati overload.','Pasang overload di antara contactor dan motor.');
 if(!path(c.id+':U',s=>getDef(circuit.components.find(n=>n.id===s.split(':')[0])!.definitionId).model==='breaker'))add('MISSING_PROTECTION','warning',[c.id],`${c.instanceName}: proteksi belum terdeteksi`,'Belum ada pemutus pada jalur aktif motor.','Tambahkan pemutus yang sesuai di jalur sumber.');
 if(running){const v=['U','V','W'].map(t=>potentials[c.id+':'+t]);if(v.some(Boolean)&&!values[c.id]?.on&&v.some(p=>p&&Math.hypot(...p)>1))add('PHASE_LOSS','error',[c.id],`${c.instanceName}: suplai tiga fase tidak lengkap`,'Motor memerlukan tiga potensial fase berbeda dengan tegangan sesuai.','Periksa U, V, W, pemutus dan kontak utama.',['U','V','W']);}
 if(!path(c.id+':PE',s=>s.endsWith(':PE')&&getDef(circuit.components.find(n=>n.id===s.split(':')[0])!.definitionId).model==='three'))add('GROUNDING_WARNING','warning',[c.id],`${c.instanceName}: PE belum terhubung`,'Terminal protective earth motor belum terhubung ke PE sumber.','Hubungkan PE sebagai jalur proteksi.');
 }
 if(d.model==='coil'&&circuit.components.some(n=>getDef(n.definitionId).model==='no')&&!circuit.wires.some(w=>key(w.from)===c.id+':13'||key(w.to)===c.id+':13'))add('MISSING_HOLDING_CONTACT','warning',[c.id],`${c.instanceName}: holding belum terhubung`,'Coil akan drop setelah START dilepas.','Pasang auxiliary NO 13–14 paralel dengan START.');
 }
 const wireLive:Record<string,boolean>={};for(const w of circuit.wires){const p=potentials[key(w.from)];wireLive[w.id]=running&&!short&&!!p&&Math.hypot(...p)>0.5;}
 return {states,values,potentials,issues,conductive:graph,wireLive,iterations,short,sourceKind:kinds,tripIds:[...tripIds]};
}
export function measure(result:Result,a:string,b:string,mode:string,running:boolean):{text:string;detail:string}{
 if(mode==='Continuity'||mode==='Resistance'){
 if(running)return {text:'Matikan sumber',detail:'STOP sebelum mengukur continuity atau resistansi.'};
 const q=[a],seen=new Set(q);while(q.length){const n=q.shift()!;if(n===b)return {text:mode==='Continuity'?'Terhubung':'≈ 0 Ω',detail:'Jalur konduktif ideal terdeteksi.'};for(const t of result.conductive[n]||[])if(!seen.has(t)){seen.add(t);q.push(t);}}return {text:'OL',detail:'Tidak ada jalur konduktif langsung. Resistansi beban belum diukur oleh mode ini.'};
 }
 const x=result.potentials[a],y=result.potentials[b];if(!x||!y)return {text:'—',detail:'Probe pada terminal floating atau sumber belum aktif.'};const ac=result.sourceKind[a]==='AC'||result.sourceKind[b]==='AC';if((mode==='AC Voltage')!==ac)return {text:'Mode tidak sesuai',detail:'Pilih mode AC atau DC sesuai sumber.'};return {text:(ac?Math.hypot(x[0]-y[0],x[1]-y[1]):x[0]-y[0]).toFixed(2)+(ac?' VAC':' VDC'),detail:ac?'Tegangan RMS model ideal.':'Selisih potensial probe merah dan hitam.'};
}
