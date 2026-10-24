import {createHash,timingSafeEqual} from 'node:crypto';

const APP_ID=/^[a-z][a-z0-9_-]{1,63}$/;
const USER_ID=/^[0-9a-f-]{36}$/i;
const EVENT_TYPES=new Set(['heartbeat','login','logout','activity']);
const ACTION=/^[a-z][a-z0-9_.-]{0,63}$/;
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const digest=s=>createHash('sha256').update(s).digest();
const same=(a,b)=>{const x=digest(a),y=digest(b);return timingSafeEqual(x,y);};
const allowedApps=new Set(['auth','tools','lab','api','docs','qr','convert','snip','short','verify','files','itinerary','voltlab','lamariva','play','receipt','arcade']);
export function initTelemetry(db){
 db.exec(`CREATE TABLE IF NOT EXISTS space_telemetry(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 app TEXT NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 event_type TEXT NOT NULL CHECK(event_type IN ('heartbeat','login','logout','activity')),
 action TEXT NOT NULL,
 occurred_at INTEGER NOT NULL
 );
 CREATE INDEX IF NOT EXISTS idx_space_telemetry_app_time ON space_telemetry(app,occurred_at);
 CREATE INDEX IF NOT EXISTS idx_space_telemetry_user_time ON space_telemetry(user_id,occurred_at);`);
 const insert=db.prepare('INSERT INTO space_telemetry(app,user_id,event_type,action,occurred_at) VALUES(?,?,?,?,?)');
 const user=db.prepare('SELECT id,email_verified,disabled FROM users WHERE id=?');
 const heartbeat=db.prepare("SELECT occurred_at FROM space_telemetry WHERE app=? AND user_id=? AND event_type='heartbeat' ORDER BY occurred_at DESC LIMIT 1");
 const keys=()=>{
  try{
   const parsed=JSON.parse(process.env.SPACE_TELEMETRY_KEYS||'{}');
   return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  }catch{return {};}
 };
 function authenticate(req){
  const auth=String(req.headers.authorization||'');
  const match=/^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(auth);
  if(!match)fail(401,'Telemetry service credentials required');
  const configured=keys();
  let app=null;
  // Compare against every configured key to avoid leaking which key matched.
  for(const [name,secret] of Object.entries(configured)){
   if(allowedApps.has(name)&&typeof secret==='string'&&secret.length>=32&&same(match[1],secret))app=name;
  }
  if(!app)fail(401,'Invalid telemetry service credentials');
  return app;
 }
 function ingest(req,payload){
  const app=authenticate(req);
  if(!payload||typeof payload!=='object'||Array.isArray(payload))fail(400,'Invalid event');
  const {userId,type,action}=payload;
  if(typeof userId!=='string'||!USER_ID.test(userId))fail(400,'Valid Febro Space user ID required');
  if(!EVENT_TYPES.has(type))fail(400,'Invalid event type');
  if(action!==undefined&&(typeof action!=='string'||!ACTION.test(action)))fail(400,'Invalid action');
  const account=user.get(userId);
  if(!account?.email_verified||account.disabled)fail(403,'Verified active user required');
  const timestamp=Date.now();
  if(type==='heartbeat'){
   const previous=heartbeat.get(app,userId);
   if(previous&&timestamp-previous.occurred_at<60000)return {ok:true,deduplicated:true};
  }
  insert.run(app,userId,type,type==='activity'?(action||'activity'):type,timestamp);
  return {ok:true};
 }
 function summary(days=7){
  const since=Date.now()-Math.min(90,Math.max(1,days))*86400000;
  const onlineSince=Date.now()-2*60000;
  const perApp=db.prepare(`SELECT app,COUNT(*) AS events,COUNT(DISTINCT user_id) AS uniqueUsers,
  SUM(CASE WHEN event_type='activity' THEN 1 ELSE 0 END) AS activities,
  MAX(occurred_at) AS lastEvent FROM space_telemetry WHERE occurred_at>=?
  GROUP BY app ORDER BY uniqueUsers DESC,events DESC`).all(since);
  const online=db.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM (
    SELECT user_id,app,MAX(occurred_at) last_event FROM space_telemetry
    WHERE occurred_at>=? GROUP BY user_id,app
    HAVING (SELECT event_type FROM space_telemetry t
      WHERE t.user_id=space_telemetry.user_id AND t.app=space_telemetry.app
      ORDER BY occurred_at DESC,id DESC LIMIT 1)!='logout'
  )`).get(onlineSince).n;
  return {status:'integrated',onlineUsers:Number(online),onlineDefinition:'Recent heartbeat or activity within 2 minutes, excluding latest logout per app',days,apps:perApp};
 }
 function prune(){
  return db.prepare('DELETE FROM space_telemetry WHERE occurred_at<?').run(Date.now()-90*86400000).changes;
 }
 return {ingest,summary,prune,authenticate};
}
