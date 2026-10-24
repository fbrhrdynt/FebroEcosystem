import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export const hashBuffer = b=>createHash('sha256').update(b).digest('hex');
export function bad(message,status=400){return Object.assign(new Error(message),{status});}
export async function parseUpload(req,{maxBytes=8*1024*1024,maxFiles=5}={}){
 if(!String(req.headers['content-type']||'').toLowerCase().startsWith('multipart/form-data;'))throw bad('Gunakan multipart/form-data',415);
 const {default:Busboy}=await import('busboy');
 return await new Promise((resolve,reject)=>{
  let fields={},files=[],total=0,failed=false;
  const parser=Busboy({headers:req.headers,limits:{files:maxFiles,fields:12,fieldSize:10000,fileSize:maxBytes,parts:20}});
  const fail=e=>{if(failed)return;failed=true;reject(e);};
  parser.on('field',(k,v)=>{if(['title','operation','page','pages'].includes(k))fields[k]=v;});
  parser.on('file',(name,stream,info)=>{
   if(!['file','files'].includes(name)){stream.resume();return;}
   const chunks=[];let truncated=false;
   stream.on('limit',()=>{truncated=true;fail(bad('Ukuran file terlalu besar',413));});
   stream.on('data',buf=>{total+=buf.length;if(total>maxBytes){fail(bad('Total upload melebihi batas',413));stream.resume();return;}chunks.push(buf);});
   stream.on('end',()=>{if(!truncated&&!failed)files.push({name:String(info.filename||'file').slice(0,150).replace(/[\\/\x00-\x1f]/g,'_'),type:info.mimeType,buffer:Buffer.concat(chunks)});});
  });
  parser.on('filesLimit',()=>fail(bad('Jumlah file terlalu banyak',413)));
  parser.on('partsLimit',()=>fail(bad('Jumlah field terlalu banyak',413)));
  parser.on('error',fail);
  parser.on('close',()=>{if(!failed)resolve({fields,files});});
  req.pipe(parser);
 });
}
export async function pdfInfo(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length>8*1024*1024||buffer.length<10||!buffer.subarray(0,1024).toString('latin1').includes('%PDF-'))throw bad('File harus berupa PDF yang valid (maksimal 8 MB)');
 const {PDFDocument}=await import('pdf-lib');
 let doc;try{doc=await PDFDocument.load(buffer,{updateMetadata:false});}catch{throw bad('PDF rusak, terenkripsi, atau tidak didukung');}
 if(doc.getPageCount()<1||doc.getPageCount()>50)throw bad('PDF harus memiliki 1–50 halaman');
 return {pdf:doc,pages:doc.getPageCount()};
}
export async function stampPdf(buffer,{id,verifyUrl,pageIndex,x,y,size}){
 const {pdf,pages}=await pdfInfo(buffer);
 if(!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>=pages)throw bad('Halaman PDF tidak valid');
 if(![x,y,size].every(Number.isFinite)||x<0||y<0||x>1||y>1||size<0.10||size>0.30||x+size>1.001)throw bad('Posisi QR tidak valid');
 const {default:QRCode}=await import('qrcode');
 const png=await QRCode.toBuffer(verifyUrl,{type:'png',width:700,margin:1,errorCorrectionLevel:'H',color:{dark:'#172839',light:'#FFFFFF'}});
 const img=await pdf.embedPng(png);const page=pdf.getPages()[pageIndex];
 if(((page.getRotation().angle%360)+360)%360!==0)throw bad('Halaman PDF yang dirotasi belum didukung. Normalisasikan rotasi halaman terlebih dahulu.');
 const w=page.getWidth(),h=page.getHeight(),qrSize=size*w;
 const drawY=h-y*h-qrSize;
 if(drawY<0)throw bad('QR melewati batas bawah halaman');
 page.drawImage(img,{x:x*w,y:drawY,width:qrSize,height:qrSize});
 pdf.setProducer('Febro Space — by Febro Herdyanto');
 pdf.setSubject(`Registry verification: ${id}`);
 return Buffer.from(await pdf.save({useObjectStreams:false}));
}
export function privatePath(dir,id,type){if(!/^[a-f0-9-]{36}$/.test(id))throw bad('ID tidak valid');return path.join(dir,'private',`${id}-${type}.pdf`);}
export function writePrivate(file,bytes){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});}
export async function convert({operation,files,pages}){
 const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');
 if(!['merge','extract','image-to-pdf','txt-to-pdf'].includes(operation))throw bad('Konversi tidak didukung');
 if(!files.length)throw bad('Pilih file dahulu');
 if(operation==='merge'){
  if(files.length<2||files.length>5)throw bad('Pilih 2–5 file PDF');
  const out=await PDFDocument.create();let count=0;
  for(const file of files){const {pdf,pages:n}=await pdfInfo(file.buffer);count+=n;if(count>60)throw bad('Total maksimal 60 halaman');const cp=await out.copyPages(pdf,pdf.getPageIndices());cp.forEach(p=>out.addPage(p));}
  return {buffer:Buffer.from(await out.save()),name:'merged-by-febro.pdf',mime:'application/pdf'};
 }
 if(operation==='extract'){
  if(files.length!==1)throw bad('Pilih satu PDF');
  const {pdf,pages:n}=await pdfInfo(files[0].buffer);
  const indices=String(pages||'1').split(',').map(v=>Number(v.trim())-1);
  if(!indices.length||indices.length>50||indices.some(x=>!Number.isInteger(x)||x<0||x>=n))throw bad('Halaman tidak valid, contoh: 1,3,5');
  const out=await PDFDocument.create();const cp=await out.copyPages(pdf,indices);cp.forEach(p=>out.addPage(p));
  return {buffer:Buffer.from(await out.save()),name:'extracted-by-febro.pdf',mime:'application/pdf'};
 }
 if(operation==='image-to-pdf'){
  if(files.length>5)throw bad('Maksimal 5 gambar');
  const out=await PDFDocument.create();
  for(const file of files){let image;
    if(file.buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))image=await out.embedPng(file.buffer);
    else if(file.buffer.subarray(0,3).equals(Buffer.from([255,216,255])))image=await out.embedJpg(file.buffer);
    else throw bad('Format gambar harus PNG atau JPEG');
    const r=Math.min(1,595/image.width,842/image.height);const w=image.width*r,h=image.height*r;
    const p=out.addPage([595,842]);p.drawImage(image,{x:(595-w)/2,y:(842-h)/2,width:w,height:h});
  }
  return {buffer:Buffer.from(await out.save()),name:'images-by-febro.pdf',mime:'application/pdf'};
 }
 if(files.length!==1||!files[0].name.toLowerCase().endsWith('.txt'))throw bad('Pilih satu file .txt');
 const txt=new TextDecoder('utf-8',{fatal:true}).decode(files[0].buffer).replace(/\t/g,'    ');
 if(txt.length>80000)throw bad('Teks terlalu panjang');
 const out=await PDFDocument.create();const font=await out.embedFont(StandardFonts.Helvetica);let p=out.addPage([595,842]),y=800;
 const lines=txt.replace(/\r/g,'').split('\n');
 for(const line of lines){for(const chunk of (line.match(/.{1,88}/gu)||[''])){
   if(y<40){p=out.addPage([595,842]);y=800;}
   const cleaned=chunk.replace(/[^\x20-\x7E\xA0-\xFF]/g,'?');
   p.drawText(cleaned,{x:40,y,size:10,font,color:rgb(.12,.18,.25)});y-=15;
   if(out.getPageCount()>70)throw bad('Teks menghasilkan terlalu banyak halaman');
  }}
 return {buffer:Buffer.from(await out.save()),name:'text-by-febro.pdf',mime:'application/pdf'};
}
