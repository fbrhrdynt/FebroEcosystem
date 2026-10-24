import {z} from 'zod';
import {getDef,catalog} from './catalog';
export const ComponentSchema=z.object({id:z.string().min(1).max(100),definitionId:z.string().refine(id=>catalog.some(d=>d.id===id)),instanceName:z.string().max(60),x:z.number().finite().min(-10000).max(10000),y:z.number().finite().min(-10000).max(10000),rotation:z.number().finite(),properties:z.record(z.union([z.string(),z.number().finite(),z.boolean()])),state:z.record(z.union([z.string(),z.number().finite(),z.boolean()]))});
const endpoint=z.object({componentId:z.string(),terminalId:z.string()});
export const CircuitSchema=z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(100),components:z.array(ComponentSchema).max(300),wires:z.array(z.object({id:z.string(),from:endpoint,to:endpoint,properties:z.object({color:z.string().max(30).optional(),conductorSize:z.number().positive().optional(),label:z.string().max(80).optional(),routeX:z.number().finite().min(-10000).max(10000).optional()})})).max(2000)}).superRefine((c,ctx)=>{const ids=new Set(c.components.map(x=>x.id));if(ids.size!==c.components.length)ctx.addIssue({code:'custom',message:'Component IDs must be unique'});if(new Set(c.wires.map(w=>w.id)).size!==c.wires.length)ctx.addIssue({code:'custom',message:'Wire IDs must be unique'});for(const w of c.wires)for(const e of [w.from,w.to]){const n=c.components.find(n=>n.id===e.componentId);if(!n||!getDef(n.definitionId).terminals.includes(e.terminalId))ctx.addIssue({code:'custom',message:'Wire references invalid terminal'});}});
export type Circuit=z.infer<typeof CircuitSchema>;
export type Comp=Circuit['components'][number];
export type Endpoint=Circuit['wires'][number]['from'];
export const key=(e:Endpoint)=>`${e.componentId}:${e.terminalId}`;
export function component(id:string,definitionId:string,x:number,y:number,name?:string):Comp{const d=getDef(definitionId);return {id,definitionId,instanceName:name||d.prefix+'1',x,y,rotation:0,properties:{voltage:d.voltage,resistance:d.resistance||1000,current:d.current||6,dc:!!d.dc},state:{closed:true,pressed:false,energized:false,tripped:false}};}
export function wire(c:Circuit,from:string,to:string,color='#3890da'){const parse=(s:string)=>{const p=s.lastIndexOf(':');return {componentId:s.slice(0,p),terminalId:s.slice(p+1)}};c.wires.push({id:'w'+(c.wires.length+1),from:parse(from),to:parse(to),properties:{color,conductorSize:1.5}});}
export function template(type='dc'):Circuit{
 const c:Circuit={id:crypto.randomUUID(),name:type==='dol'?'DOL motor starter':type==='holding'?'START / STOP · self holding':type==='ac'?'Lampu AC · 230 V':'Rangkaian lampu · 24 VDC',components:[],wires:[]};
 if(type==='empty'){c.name='Rangkaian baru';return c;}
 if(type==='dc'||type==='ac'){
  c.components=[component('ps',type==='ac'?'ac':'supply',100,120,'PS1'),component('s','switch',400,120,'S1'),component('h',type==='ac'?'lampac':'lamp',690,300,'H1')];
  wire(c,`ps:${type==='ac'?'L':'+'}`,'s:1','#e46661');wire(c,'s:2',`h:${type==='ac'?'L':'+'}`,'#e46661');wire(c,`h:${type==='ac'?'N':'−'}`,`ps:${type==='ac'?'N':'−'}`);return c;
 }
 c.components=[component('ps','supply',80,320,'PS1'),component('stop','stop',320,320,'PB1 · STOP'),component('start','start',570,270,'PB2 · START'),component('k','contactor',840,320,'K1'),component('h','lamp',1150,490,'H1')];
 wire(c,'ps:+','stop:21','#e46661');wire(c,'stop:22','start:13','#e46661');wire(c,'start:14','k:A1','#e46661');wire(c,'k:A2','ps:−');wire(c,'stop:22','k:13','#e46661');wire(c,'k:14','k:A1','#e46661');wire(c,'k:14','h:+','#e46661');wire(c,'h:−','ps:−');
 if(type==='dol'){
 c.components.push(component('ac','three',80,35,'AC1'),component('q','mcb3',320,35,'QF1'),component('ol','overload',1150,50,'OL1'),component('m','motor',1420,50,'M1'));
 for(let i=1;i<=3;i++){wire(c,`ac:L${i}`,`q:L${i}`,['#b36a36','#303c50','#929da8'][i-1]);wire(c,`q:T${i}`,`k:L${i}`);wire(c,`k:T${i}`,`ol:L${i}`);wire(c,`ol:T${i}`,`m:${['U','V','W'][i-1]}`);}
 c.wires=c.wires.filter(w=>!(w.from.componentId==='ps'&&w.from.terminalId==='+'&&w.to.componentId==='stop'));
 wire(c,'ps:+','ol:95','#e46661');wire(c,'ol:96','stop:21','#e46661');wire(c,'ac:PE','m:PE','#72a559');
 }
 return c;
}
