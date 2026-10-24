import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationAdapter} from '../adapters/application-policy.mjs';
for(const app of ['lamariva','itinerary','voltlab','files'])test(`${app}: existing local ID, authorization and data access preserved; unlinked identity requires proof`,async()=>{
 const user={id:'original-local-id',sub:'original-local-id',role:'Administrator',permissions:['existing'],status:'active',suspended:false,blocked:false};const before=JSON.stringify(user);let linked=true,issued;
 const adapter=applicationAdapter({app,client:{callback:async()=>({identity:{issuer:'https://eco.febro.id/profile',subject:'central-id',email:'same@example.invalid'},destination:'/existing/record'})},links:{resolve:async()=>linked?'original-local-id':undefined},loadLocalUser:async id=>{assert.equal(id,'original-local-id');return user;},issueLocalSession:async u=>{issued=u;}});
 assert.equal((await adapter.callback({})).localId,'original-local-id');assert.equal(issued,user);assert.equal(JSON.stringify(user),before);
 linked=false;issued=undefined;assert.equal((await adapter.callback({})).action,'link-required');assert.equal(issued,undefined);
 linked=true;user.suspended=true;user.blocked=true;user.status='blocked';await assert.rejects(()=>adapter.callback({}));
});
