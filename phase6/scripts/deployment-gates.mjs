import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export const gates=['backupRestore','httpsAcceptance','googleAcceptance','ownershipMapping','integrationSecurity','dependencies','noHighCritical','rollback'];
// This is a read-only review check. It never changes processes, config or data.
// Evidence integrity is verified; an operator must still review its content.
export function assess(record,root){
 const blockers=[];
 for(const name of gates){
  const proof=record.gates?.[name];
  if(proof?.status!=='PASS'||!proof.file||!/^\w{64}$/.test(proof.sha256||'')){blockers.push(name);continue;}
  try{
   const base=fs.realpathSync(root),file=fs.realpathSync(path.resolve(base,proof.file));
   if(!file.startsWith(base+path.sep)||!fs.statSync(file).isFile())throw Error();
   if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==proof.sha256)throw Error();
  }catch{blockers.push(name);}
 }
 const approval=record.operatorApproval;
 if(!approval?.operator||!approval?.approvedAt||!Number.isFinite(Date.parse(approval.approvedAt))||!Array.isArray(approval.apps)||approval.apps.length===0||approval.apps.some(a=>!['central','lamariva','itinerary','voltlab','files','play'].includes(a)))blockers.push('explicitOperatorApproval');
 return {status:blockers.length?'BLOCKED':'REQUIRES_OPERATOR_REVIEW',blockers,activationPerformed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const file=path.resolve(process.argv[2]);const result=assess(JSON.parse(fs.readFileSync(file)),path.dirname(file));console.log(JSON.stringify(result));if(result.blockers.length)process.exitCode=1;}catch{console.error('BLOCKED: valid evidence record required');process.exitCode=1;}
}
