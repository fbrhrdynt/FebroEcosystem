// Aggregate-only analytics for the central identity database.
// Session count is NOT an online-user count: no heartbeat exists yet.
export function controlOverview(db) {
 const n = sql => Number(db.prepare(sql).get().n);
 const now = Date.now(), day = now - 86400000, week = now - 7*86400000;
 return {
  generatedAt: new Date(now).toISOString(),
  users: {
   total:n('SELECT COUNT(*) n FROM users'),
   verified:n('SELECT COUNT(*) n FROM users WHERE email_verified=1'),
   pending:n('SELECT COUNT(*) n FROM users WHERE email_verified=0'),
   disabled:n('SELECT COUNT(*) n FROM users WHERE disabled=1'),
   new24h:Number(db.prepare('SELECT COUNT(*) n FROM users WHERE created_at>=?').get(day).n),
   new7d:Number(db.prepare('SELECT COUNT(*) n FROM users WHERE created_at>=?').get(week).n)
  },
  sessions: {
   active:n('SELECT COUNT(*) n FROM sessions WHERE expires_at>'+now),
   uniqueUsers:Number(db.prepare('SELECT COUNT(DISTINCT user_id) n FROM sessions WHERE expires_at>?').get(now).n),
   online:null,
   note:'Active sessions are not live online users. Heartbeat instrumentation is required.'
  },
  activity:{
   auditEvents7d:Number(db.prepare('SELECT COUNT(*) n FROM sso_control_audit WHERE event_at>=?').get(week).n),
   recent:db.prepare('SELECT action,app,event_at AS at FROM sso_control_audit ORDER BY id DESC LIMIT 20').all()
  },
  dailySignups:db.prepare("SELECT strftime('%Y-%m-%d',created_at/1000,'unixepoch') day, COUNT(*) count FROM users WHERE created_at>=? GROUP BY day ORDER BY day").all(now-30*86400000),
  appUsage:{status:'not_instrumented',message:'Per-app events require authenticated integration from each app. No fabricated rankings.'}
 };
}
