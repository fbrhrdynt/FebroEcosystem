
 // OpenID Connect bridge for independently deployed services, PKCE S256 + confidential clients.
 if(site==='auth' && method==='GET' && p==='/.well-known/openid-configuration')return respond(res,200,oidc.discovery());
 if(site==='auth' && method==='GET' && p==='/oauth/jwks')return respond(res,200,oidc.jwks());
 if(site==='auth' && method==='GET' && p==='/oauth/authorize'){
   const params=Object.fromEntries(u.searchParams.entries());
   const me=getUser(req);
   if(!me?.email_verified)return redirect(res,`${base('auth')}/?next=${encodeURIComponent(`${base('auth')}${u.pathname}${u.search}`)}`);
   return redirect(res,oidc.authorize(params,me));
 }
 if(site==='auth' && method==='POST' && p==='/oauth/token'){
   rate(req,'oidc-token',60,60000);
   if(!String(req.headers['content-type']||'').startsWith('application/x-www-form-urlencoded'))fail(415,'Form urlencoded required');
   let body='';for await(const c of req){body+=c;if(body.length>4096)fail(413,'Body too large');}
   return respond(res,200,oidc.token(Object.fromEntries(new URLSearchParams(body))));
 }
 if(site==='auth' && method==='GET' && p==='/oauth/userinfo'){
   rate(req,'oidc-userinfo',120,60000);
   const bearer=/^Bearer (\S+)$/.exec(String(req.headers.authorization||''));
   if(!bearer)fail(401,'Bearer access token required');
   return respond(res,200,oidc.userinfo(bearer[1]));
 }

