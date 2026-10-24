import Provider from 'oidc-provider';
import {sqliteAdapter} from './sqlite-adapter.mjs';

// Factory only: no listener, dotenv loading, production imports or implicit key creation.
export function createProvider({issuer,db,jwks,cookieKeys,clients,findIdentity,allowApp,audit=()=>{},testOnly=false}) {
  const url=new URL(issuer);
  if(!testOnly && (url.protocol!=='https:' || url.href.replace(/\/$/,'')!=='https://eco.febro.id/profile'))throw Error('Unexpected production issuer');
  if(!cookieKeys?.length || cookieKeys.some(k=>typeof k!=='string'||k.length<48))throw Error('Strong persistent cookie keys required');
  if(!jwks?.keys?.length)throw Error('Persistent signing keys required');
  for(const client of clients){
    if(!client.client_id||!client.client_secret||client.client_secret.length<32||!client.redirect_uris?.length)throw Error('Incomplete client');
    for(const uri of client.redirect_uris){const u=new URL(uri);if(u.hash||u.username||u.password||(!testOnly&&u.protocol!=='https:'))throw Error('Invalid redirect URI');}
    if(client.grant_types?.join()!=='authorization_code'||client.response_types?.join()!=='code'||client.token_endpoint_auth_method!=='client_secret_basic')throw Error('Code-only confidential clients required');
  }
  const provider=new Provider(issuer,{
    adapter:sqliteAdapter(db),clients,jwks,
    subjectTypes:['public'],responseTypes:['code'],scopes:['openid','email','profile'],
    claims:{openid:['sub'],email:['email','email_verified'],profile:['name']},
    cookies:{keys:cookieKeys,long:{httpOnly:true,sameSite:'lax',secure:!testOnly},short:{httpOnly:true,sameSite:'lax',secure:!testOnly}},
    pkce:{required:()=>true},
    features:{devInteractions:{enabled:false},revocation:{enabled:true}},
    ttl:{AccessToken:300,AuthorizationCode:60,IdToken:300,Interaction:600,Session:28800,Grant:28800},
    interactions:{url:(_ctx,interaction)=>`${issuer}/interaction/${interaction.uid}`},
    async findAccount(ctx,id){
      const user=await findIdentity(id);
      if(!user||user.disabled||!user.email_verified)return undefined;
      if(ctx.oidc?.client && !await allowApp(id,ctx.oidc.client.clientId))return undefined;
      return {accountId:user.id,async claims(){return {sub:user.id,email:user.email,email_verified:true,name:user.name};}};
    },
    async extraTokenClaims(ctx){
      if(!await allowApp(ctx.oidc.account.accountId,ctx.oidc.client.clientId))throw Error('Application access denied');
      return {};
    },
  });
  // Emit fixed event identifiers only. Do not forward error objects, tokens or params.
  for(const event of ['authorization.success','authorization.error','grant.success','grant.error','revocation.success','end_session.success'])provider.on(event,()=>audit({event}));
  return provider;
}
