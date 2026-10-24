import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'voltlab-tests-'));
const inputs=['lib/voltlab/catalog.ts','lib/voltlab/model.ts','lib/voltlab/engine.ts','lib/voltlab/calculators.ts','lib/voltlab/panels.ts','tests/engine.test.ts'];
try{for(const source of inputs){const target=path.join(tmp,source.replace(/\.ts$/,'.mjs'));fs.mkdirSync(path.dirname(target),{recursive:true});let text=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;text=text.replace(/from ['"](\.[^'"]+)['"]/g,(_,p)=>`from '${p}.mjs'`).replace(/from ['"]zod['"]/g,`from '${require.resolve('zod').replace(/index\.cjs$/,'index.js')}'`);fs.writeFileSync(target,text);}await import(pathToFileURL(path.join(tmp,'tests/engine.test.mjs')).href);}finally{fs.rmSync(tmp,{recursive:true,force:true});}
