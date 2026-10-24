// Identifies local ownership keys; never map central roles into application roles.
export const applications=Object.freeze({
 lamariva:{clientId:'febro-lamariva-v2',origin:'https://cv.febro.id',callback:'/auth/febro/callback',userTable:'user',idColumn:'id',sessionAdapter:'better-auth',defaultDestination:'/'},
 itinerary:{clientId:'febro-itinerary-v2',origin:'https://itinerary.febro.id',callback:'/auth/febro/callback',userTable:'users',idColumn:'id',sessionAdapter:'express-session',defaultDestination:'/dashboard'},
 voltlab:{clientId:'febro-voltlab-v2',origin:'https://voltlab.febro.id',callback:'/api/auth/febro/callback',userTable:'users',idColumn:'id',sessionAdapter:'voltlab-session',defaultDestination:'/'},
 files:{clientId:'febro-files-v2',origin:'https://files.febro.id',callback:'/auth/febro/callback',userTable:'accounts',idColumn:'sub',sessionAdapter:'fb-files',defaultDestination:'/'},
 play:{clientId:'febro-play-v2',origin:'https://play.febro.id',callback:'/api/leaderboard/auth/callback',userTable:'players',idColumn:'id',sessionAdapter:'play-auth',defaultDestination:'/'}
});
export function localAccountAllowed(app,user){
 if(!user)return false;
 if(app==='lamariva')return !user.suspended;
 if(app==='itinerary'||app==='voltlab')return user.status==='active';
 if(app==='files')return !user.blocked;
 return app==='play';
}
// Controller core, intentionally no HTTP assumptions. Session integration must
// supply its existing authoritative user loader and session issuance functions.
export function applicationAdapter({app,client,links,loadLocalUser,issueLocalSession}){
 if(!applications[app]||app==='play')throw Error('Unsupported account adapter');
 return {
  start(args){return client.start({...args,destination:args.destination||applications[app].defaultDestination});},
  async callback(args){
   const result=await client.callback(args);
   const id=await links.resolve(result.identity.issuer,result.identity.subject);
   if(!id)return {action:'link-required',identity:result.identity,destination:result.destination};
   const user=await loadLocalUser(id);
   if(!localAccountAllowed(app,user))throw Error('Local account unavailable');
   // This adapter issues no role/permission changes and never selects by email.
   await issueLocalSession(user);
   return {action:'authenticated',localId:id,destination:result.destination};
  }
 };
}
