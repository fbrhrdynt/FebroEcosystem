import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {assess,gates} from '../scripts/deployment-gates.mjs';
test('deployment review fails closed for absent evidence/approval, tampering and escaping paths; never activates',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'febro-gates-'));
 try{
  fs.writeFileSync(path.join(root,'proof'),'synthetic evidence');const sha256=createHash('sha256').update('synthetic evidence').digest('hex');
  const record={gates:Object.fromEntries(gates.map(g=>[g,{status:'PASS',file:'proof',sha256}]))};
  assert.deepEqual(assess(record,root).blockers,['explicitOperatorApproval']);
  record.operatorApproval={operator:'synthetic test only',approvedAt:new Date().toISOString(),apps:['central']};
  assert.equal(assess(record,root).status,'REQUIRES_OPERATOR_REVIEW');assert.equal(assess(record,root).activationPerformed,false);
  record.gates.googleAcceptance.sha256='0'.repeat(64);assert.ok(assess(record,root).blockers.includes('googleAcceptance'));
  record.gates.httpsAcceptance.file='../outside';assert.ok(assess(record,root).blockers.includes('httpsAcceptance'));
  assert.equal(assess({},root).blockers.length,9);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
