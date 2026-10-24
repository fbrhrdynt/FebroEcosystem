export type Model = 'dc'|'ac'|'three'|'switch'|'no'|'nc'|'estop'|'breaker'|'overload'|'coil'|'lamp'|'resistor'|'led'|'motor'|'terminal'|'unsupported';
export type Definition = {id:string;name:string;category:string;model:Model;prefix:string;voltage:number;terminals:string[];description:string;notes:string;mistake:string;resistance?:number;poles?:number;current?:number;dc?:boolean};
const d=(id:string,name:string,category:string,model:Model,prefix:string,voltage:number,terminals:string[],description:string,extra:Partial<Definition>={}):Definition=>({id,name,category,model,prefix,voltage,terminals,description,notes:'Hubungkan setiap kabel ke terminal yang sesuai. Periksa rating sebelum menjalankan rangkaian.',mistake:'Terminal return tidak terhubung, atau rating tegangan tidak sesuai.',...extra});
export const catalog:Definition[]=[
 d('battery','Battery 12 VDC','Sources','dc','BT',12,['+','−'],'Sumber tegangan DC 12 V.',{dc:true}),
 d('supply','Power supply 24 VDC','Sources','dc','PS',24,['+','−'],'Sumber kontrol DC dengan polaritas positif dan return.',{dc:true}),
 d('ac','Source 230 VAC','Sources','ac','AC',230,['L','N','PE'],'Sumber AC satu fase. Tegangan ditampilkan dalam RMS.'),
 d('three','Source 400 VAC · 3φ','Sources','three','AC',400,['L1','L2','L3','N','PE'],'Sumber tiga fase 400 V line-to-line, 50 Hz.'),
 d('fuse','Fuse','Protection','breaker','F',230,['1','2'],'Memutus jalur saat gangguan arus. Trip model ideal.',{poles:1,current:6}),
 d('mcb1','MCB 1 pole','Protection','breaker','QF',230,['1','2'],'Pemutus satu pole dengan reset setelah trip.',{poles:1,current:6}),
 d('mcb2','MCB 2 pole','Protection','breaker','QF',230,['L','N','T','R'],'Memutus live dan neutral bersamaan.',{poles:2,current:10}),
 d('mcb3','MCB 3 pole','Protection','breaker','QF',400,['L1','L2','L3','T1','T2','T3'],'Pemutus tiga fase.',{poles:3,current:16}),
 d('mccb','MCCB 3 pole','Protection','breaker','QF',400,['L1','L2','L3','T1','T2','T3'],'Pemutus daya tiga pole; model switching ideal.',{poles:3,current:40}),
 d('overload','Overload relay','Protection','overload','OL',400,['L1','L2','L3','T1','T2','T3','95','96','97','98'],'Trip membuka 95–96 dan menutup 97–98.',{current:10}),
 d('start','Push button NO','Control','no','PB',24,['13','14'],'Kontak terbuka, menutup hanya saat tombol ditahan.',{notes:'START memakai kontak NO. Lepaskan tombol untuk menguji holding.'}),
 d('stop','Push button NC','Control','nc','PB',24,['21','22'],'Kontak tertutup, membuka saat tombol ditahan.',{notes:'STOP dipasang seri dengan coil dan memakai kontak NC.'}),
 d('estop','Emergency stop','Control','estop','ES',24,['21','22'],'Kontak NC dengan mekanisme latch dan reset.'),
 d('switch','Selector switch','Switching','switch','S',24,['1','2'],'Saklar ON/OFF dengan posisi tetap.'),
 d('relay','Control relay','Control','coil','K',24,['A1','A2','13','14','21','22'],'Coil DC mengendalikan kontak NO dan NC.',{dc:true,resistance:240}),
 d('contactor','Contactor · 3 pole','Switching','coil','K',24,['L1','L2','L3','T1','T2','T3','A1','A2','13','14','21','22'],'Coil 24 VDC mengendalikan tiga kontak utama dan auxiliary.',{dc:true,resistance:240}),
 d('lamp12','Lamp 12 VDC','Loads','lamp','H',12,['+','−'],'Lampu resistif 12 V / 3 W.',{dc:true,resistance:48}),
 d('lamp','Lamp 24 VDC','Loads','lamp','H',24,['+','−'],'Lampu resistif 24 V / 6 W.',{dc:true,resistance:96}),
 d('lampac','Lamp 230 VAC','Loads','lamp','H',230,['L','N'],'Lampu resistif AC 230 V / 40 W.',{resistance:1322.5}),
 d('led','LED','Semiconductors','led','D',2,['A','K'],'LED sederhana: Vf 2 V, resistor seri wajib.',{dc:true,resistance:100,notes:'Gunakan resistor seri. Model LED sederhana bukan kurva semikonduktor penuh.'}),
 d('buzzer','Buzzer 24 VDC','Loads','lamp','BZ',24,['+','−'],'Beban buzzer; status aktif ditampilkan tanpa audio.',{dc:true,resistance:240}),
 d('dcmotor','DC motor','Loads','lamp','M',24,['+','−'],'Model beban resistif DC. Tanpa dinamika mekanik.',{dc:true,resistance:24}),
 d('motor1','Single phase motor','Loads','lamp','M',230,['L','N','PE'],'Model beban sederhana motor satu fase.',{resistance:50}),
 d('motor','Three phase motor','Loads','motor','M',400,['U','V','W','PE'],'Motor berjalan saat tiga fase berbeda tersedia. Model logika, tanpa transien.',{current:8}),
 d('solenoid','Solenoid 24 VDC','Loads','lamp','Y',24,['+','−'],'Aktuator DC sebagai beban resistif ideal.',{dc:true,resistance:120}),
 d('resistor','Resistor','Passive Components','resistor','R',0,['1','2'],'Resistor linear untuk rangkaian seri dan paralel.',{resistance:1000}),
 d('capacitor','Capacitor','Passive Components','unsupported','C',50,['1','2'],'Menyimpan energi listrik. Model transien belum tersedia.'),
 d('diode','Diode','Semiconductors','unsupported','D',50,['A','K'],'Komponen searah; model nonlinear belum tersedia.'),
 d('bridge','Bridge rectifier','Semiconductors','unsupported','BR',230,['~1','~2','+','−'],'Penyearah AC; model rectifier belum tersedia.'),
 d('terminal','Terminal block','Distribution','terminal','X',0,['1','2'],'Dua terminal terhubung secara internal.'),
 d('neutral','Neutral bar','Distribution','terminal','XN',0,['N1','N2','N3'],'Bus distribusi neutral.'),
 d('earth','Earth bar','Distribution','terminal','XE',0,['PE1','PE2','PE3'],'Bus protective earth; bukan return sumber DC.'),
 d('cable','Copper cable','Cable','terminal','W',0,['1','2'],'Jalur ideal. Luas penampang tersedia pada properties kabel.'),
 d('dinrail','DIN rail 35 mm','Mounting','terminal','DR',0,[],'Rel pemasangan modular 35 mm. Aksesori visual panel; tidak menjadi bagian rangkaian listrik.'),
 d('rccb2','RCCB / RCD 2 pole','Protection','unsupported','QF',230,['L','N','L out','N out'],'Residual-current protective device. Pilih tipe, sensitivitas dan rating berdasarkan desain serta standar yang berlaku.'),
 d('motorbreaker','Motor protection circuit breaker','Protection','unsupported','QM',400,['L1','L2','L3','T1','T2','T3'],'Manual motor starter dengan fungsi proteksi spesifik pabrikan. Model trip dan thermal belum disimulasikan.'),
 d('safetyrelay','Safety relay','Safety','unsupported','SR',24,['A1','A2','S11','S12','S21','S22','13','14','23','24','33','34'],'Safety relay monitors safety input channels. Wiring and reset logic depend on the approved device manual.'),
 d('timer','Timer relay','Control','unsupported','KT',24,['A1','A2','15','16','18'],'Relay waktu dengan kontak changeover. Fungsi dan timing aktual bergantung model.'),
 d('phase-monitor','Phase monitoring relay','Protection','unsupported','KPH',400,['L1','L2','L3','11','12','14'],'Memantau urutan, kehilangan, atau ketidakseimbangan fasa sesuai fitur model.'),
 d('control-transformer','Control transformer','Sources','unsupported','T',230,['1','2','3','4'],'Transformator kontrol mengisolasi atau mengubah tegangan berdasarkan tap dan rating.'),
 d('vfd','Variable frequency drive (VFD)','Drives','unsupported','VFD',400,['L1','L2','L3','U','V','W','PE','24V','COM','DI1','AI1'],'Drive motor dengan input daya, output motor dan terminal kontrol. Parameter belum disimulasikan.'),
 d('softstarter','Soft starter','Drives','unsupported','SS',400,['L1','L2','L3','T1','T2','T3','A1','A2','13','14'],'Mengurangi arus awal dengan pengaturan tegangan. Model ramp dan bypass belum disimulasikan.'),
 d('plc','PLC controller','PLC & Automation','unsupported','PLC',24,['L+','M','I1','I2','I3','I4','Q1','Q2'],'Pengendali logika programmable. Logic scan dan I/O belum disimulasikan.'),
 d('plc-logo','LOGO! logic module','PLC & Automation','unsupported','LOGO',24,['L+','M','I1','I2','I3','I4','Q1','Q2'],'Compact logic module. Gunakan software dan manual produsen untuk program aktual.'),
 d('sensor-inductive','Inductive proximity sensor','Sensors','unsupported','B',24,['BN','BU','BK'],'Sensor proximity untuk target metal. Periksa PNP/NPN dan pinout pada datasheet.'),
 d('sensor-photo','Photoelectric sensor','Sensors','unsupported','B',24,['BN','BU','BK','WH'],'Sensor optik. Mode sensing dan output bergantung pada model perangkat.'),
 d('limit-switch','Limit switch','Sensors','unsupported','LS',24,['13','14','21','22'],'Switch mekanis dengan kontak NO dan NC untuk deteksi posisi.'),
 d('pressure-switch','Pressure switch','Sensors','unsupported','PS',24,['1','2','3'],'Kontak berubah saat tekanan mencapai set point mekanis.'),
 d('flow-switch','Flow switch','Sensors','unsupported','FS',24,['1','2','3'],'Mendeteksi kondisi aliran melalui kontak atau output sesuai perangkat.'),
 d('float-switch','Float switch','Sensors','unsupported','FS',24,['1','2','3'],'Mengubah keadaan kontak mengikuti level cairan.'),
 d('door-interlock','Guard door interlock','Safety','unsupported','GS',24,['A1','A2','11','12','21','22'],'Safety switch untuk guard pintu. Kategori dan coding menentukan fungsi; jangan bypass.'),
 d('light-curtain','Safety light curtain','Safety','unsupported','LC',24,['OSSD1','OSSD2','24V','0V','RESET'],'Perangkat proteksi optik. Validasi zona dan safety circuit wajib mengikuti risk assessment.'),
 d('selector-3pos','3-position selector switch','Switching','unsupported','SA',24,['11','12','13','14','21','22'],'Selector tiga posisi dengan pasangan kontak berdasarkan wiring diagram.'),
 d('control-station','Local control station','Control','unsupported','PB',24,['13','14','21','22','31','32'],'Housing panel operator dengan kombinasi START, STOP dan selector.'),
 d('mushroom-reset','Emergency stop pushbutton','Safety','unsupported','ES',24,['11','12','21','22'],'Emergency stop device dengan latch dan reset manual. Safety performance tidak disimulasikan.'),
 d('power-meter','Power meter','Measurement','unsupported','PM',400,['L1','L2','L3','N','CT1+','CT1-'],'Metering device for panel measurements. Wiring depends on voltage inputs and CT arrangement.'),
 d('current-transformer','Current transformer','Measurement','unsupported','CT',400,['P1','P2','S1','S2'],'Current transformer; secondary must be treated according to manufacturer safety instructions.'),
 d('ups','Industrial UPS','Sources','unsupported','UPS',230,['L','N','PE','L out','N out','PE out'],'Uninterruptible power supply. Charging, bypass and transfer behaviour are not modelled.'),
 d('brake','Motor brake coil','Loads','unsupported','YB',24,['A1','A2'],'Electromagnetic brake coil for motor applications. Release dynamics are not modelled.'),
 d('meter','Multimeter','Measurement','unsupported','VM',0,['V','COM'],'Gunakan panel multimeter untuk probe pada terminal rangkaian.'),
 d('voltmeter','Voltmeter','Measurement','unsupported','V',0,['V','COM'],'Pengukuran tersedia lewat panel multimeter.'),
 d('ammeter','Ammeter','Measurement','unsupported','A',0,['A','COM'],'Arus beban resistif ditampilkan pada properties; meter seri belum tersedia.'),
 d('continuity','Continuity tester','Measurement','unsupported','CT',0,['1','2'],'Pengujian jalur tersedia lewat multimeter saat STOP.')
];
export const getDef=(id:string)=>catalog.find(d=>d.id===id)!;
const fallbackTerminalPosition=(d:Definition,index:number)=>{const n=d.terminals.length,rows=Math.ceil(n/2),left=index<rows;return {x:left?0:148,y:35+(left?index:index-rows)*27};};
/** Screw centres in the front-view equipment artwork (100 × 120 viewBox). */
export function hardwareTerminalPosition(d:Definition,index:number){
 const id=d.id,n=d.terminals.length;
 if(index<0||index>=n)return fallbackTerminalPosition(d,index);
 if(['mcb1','mcb2','mcb3','mccb','fuse'].includes(id)){
  const poles=id==='fuse'?1:(d.poles||1),i=index<poles?index:index-poles;
  const x=poles===1?48:18+i*(60/poles)+(60/poles-3)/2;
  return {x,y:index<poles?24:93};
 }
 if(id==='contactor'||id==='relay'){
  const main=Math.min(3,Math.ceil(n/2));
  if(index<main)return {x:[25,47,69][index]||47,y:24};
  if(index<main*2)return {x:[25,47,69][index-main]||47,y:92};
  const aux=index-main*2;
  return {x:24+(aux%4)*17,y:aux<4?39:78};
 }
 if(id==='overload'){
  if(index<3)return {x:[28,47,66][index],y:25};
  if(index<6)return {x:[28,47,66][index-3],y:92};
  const aux=index-6;
  return {x:aux%2?70:24,y:aux<2?42:80};
 }
 if(['supply','ac','three'].includes(id)){
  const row=Math.ceil(n/2),top=index<row,slot=top?index:index-row;
  const xs=n<=2?[31,69]:[27,47,67];
  return {x:xs[slot]||47,y:top?22:95};
 }
 if(id==='battery')return {x:index===0?31:71,y:26};
 if(id==='motor')return {x:[32,44,56,68][index]||50,y:32};
 if(['plc','plc-logo'].includes(id))return {x:23.5+(index%8)*7,y:66};
 if(id==='phase-monitor')return {x:[28,40,52,64][index%4],y:index<4?52:94};
 if(['lamp','lamp12','lampac','led','buzzer','dcmotor','motor1','solenoid'].includes(id))return {x:index===0?34:66,y:91};
 if(['start','stop','estop','switch'].includes(id))return {x:index===0?34:66,y:84};
 if(id==='terminal'||id==='neutral'||id==='earth')return {x:32+(index%3)*18,y:index<3?39:79};
 // Provide physical screw heads even for generic/reference-only equipment.
 // The renderer draws a matching screw at this point, so every wire endpoint
 // remains visible and clickable instead of floating outside the device.
 const rows=Math.ceil(n/2),left=index<rows,row=left?index:index-rows;
 return {x:left?23:77,y:29+row*11};
}
export function terminalPosition(d:Definition,index:number,view:'panel'|'physical'|'schematic'='panel',height=110){
 if(view==='schematic')return fallbackTerminalPosition(d,index);
 const art=hardwareTerminalPosition(d,index),x=view==='panel'?18:30,w=view==='panel'?112:88,h=view==='panel'?Math.max(height-30,76):height-66;
 return {x:x+art.x*w/100,y:27+art.y*h/120};
}
export const componentHeight=(d:Definition)=>d.id==='dinrail'?64:Math.max(110,65+Math.ceil(d.terminals.length/2)*27);
