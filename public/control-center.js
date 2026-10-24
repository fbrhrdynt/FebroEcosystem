import {mountShell, updateShellUser} from '/assets/shell.js';
mountShell('console',location.pathname.startsWith('/profile'));
fetch('/v1/auth/me',{credentials:'same-origin'}).then(r=>r.json()).then(d=>updateShellUser(d.user)).catch(()=>{});
// Standalone Control Center. Only same-origin API requests; no third-party scripts.
const $=selector=>document.querySelector(selector);
const text=(el,value)=>{el.textContent=String(value??'');};
const message=value=>{const e=$('#message');text(e,value);e.hidden=!value;};
let offset=0,total=0,selection=null;
async function api(path,opts={}){
 const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...opts,headers:{...opts.body?{'Content-Type':'application/json'}:{},...opts.headers}});
 const v=await r.json().catch(()=>({error:`HTTP ${r.status}`}));if(!r.ok)throw Error(v.error||`HTTP ${r.status}`);return v;
}
async function mutate(path,payload){return api(path,{method:'POST',body:JSON.stringify(payload)});}
function button(label,click,cls=''){const b=document.createElement('button');text(b,label);b.className=cls;b.addEventListener('click',click);return b;}
async function load(){try{message('');const results=await Promise.all([api(`/v1/control/users?offset=${offset}`),api('/v1/control/audit')]);const [data,audit]=results;total=data.total;text($('#count'),total);text($('#page'),`${total?offset+1:0}–${Math.min(offset+50,total)} of ${total}`);$('#previous').disabled=offset<=0;$('#next').disabled=offset+50>=total;const root=$('#users');root.replaceChildren();for(const u of data.users){const tr=document.createElement('tr');const name=document.createElement('td'),status=document.createElement('td'),actions=document.createElement('td');text(name,u.name||u.email);const email=document.createElement('small');text(email,u.email);name.append(email);if(u.isAdmin){const role=document.createElement('small');text(role,'Administrator');name.append(role);}const pill=document.createElement('span');pill.className='status'+(u.disabled?' off':'');text(pill,u.disabled?'Blocked':u.verified?'Verified':'Unverified');status.append(pill);const wrap=document.createElement('div');wrap.className='actions';wrap.append(button('Access',()=>detail(u.id)));if(!u.isAdmin)wrap.append(button(u.disabled?'Unblock':'Block',()=>block(u),u.disabled?'':'danger'));wrap.append(button('Revoke sessions',()=>revoke(u)));actions.append(wrap);tr.append(name,status,actions);root.append(tr);}if(!data.users.length){const row=root.insertRow();const cell=row.insertCell();cell.colSpan=3;text(cell,'No registered users.');}filterUsers();const el=$('#audit-log');el.replaceChildren();for(const a of audit.items){const div=document.createElement('div');div.className='audit-row';const when=document.createElement('time');text(when,new Date(a.at).toLocaleString());const what=document.createElement('span');text(what,`${a.action}${a.app?' · '+a.app:''}`);div.append(when,what);el.append(div);}if(!audit.items.length)text(el,'No admin changes yet.');if(selection)await detail(selection);}catch(e){message(e.message);if(/401|403|Login|administrator|admin/i.test(e.message))$('#users').textContent='Access denied. Login as a verified administrator.';}}
async function detail(id){try{selection=id;const d=await api(`/v1/control/users/${encodeURIComponent(id)}`);text($('#selected-name'),d.user.name||'Account');text($('#selected-email'),d.user.email);const p=$('#permissions');p.replaceChildren();for(const app of d.apps){const row=document.createElement('label');row.className='permission';const name=document.createElement('span');text(name,app.id==='auth'?'Febro Space':app.name);const small=document.createElement('small');text(small,app.integrated?app.id:app.id+' · pending adapter');name.append(small);const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=app.enabled;toggle.disabled=d.user.isAdmin||app.id==='auth'||!app.integrated;toggle.onchange=async()=>{if(!confirm(`${toggle.checked?'Grant':'Revoke'} ${app.name} access for ${d.user.email}?`)){toggle.checked=!toggle.checked;return;}toggle.disabled=true;try{await mutate(`/v1/control/users/${id}/access`,{app:app.id,enabled:toggle.checked});message('Application access updated.');}catch(e){toggle.checked=!toggle.checked;message(e.message);}finally{toggle.disabled=false;}};row.append(name,toggle);p.append(row);}}catch(e){message(e.message);}}
async function block(u){if(!confirm(`${u.disabled?'Unblock':'Block'} ${u.email}?`))return;try{await mutate(`/v1/control/users/${u.id}/block`,{blocked:!u.disabled});await load();message('Change saved.');}catch(e){message(e.message);}}
async function revoke(u){if(!confirm(`Revoke Febro Space sessions for ${u.email}? (Local application sessions require separate revocation)`))return;try{await mutate(`/v1/control/users/${u.id}/revoke`,{});await load();message('Change saved.');}catch(e){message(e.message);}}
$('#refresh').onclick=load;$('#previous').onclick=()=>{offset=Math.max(0,offset-50);load()};$('#next').onclick=()=>{offset+=50;load()};load();

function filterUsers(){const query=$('#user-search').value.toLowerCase();let visible=0;$('#users').querySelectorAll('tr').forEach(row=>{row.hidden=!row.textContent.toLowerCase().includes(query);if(!row.hidden)visible++;});$('#filter-empty').classList.toggle('hidden',visible>0);}
$('#user-search').oninput=filterUsers;

async function loadOverview(){
 try{
  const d=await api('/v1/control/overview');
  const fields={'#metric-users':d.users.total,'#metric-verified':d.users.verified,'#metric-pending':d.users.pending,'#metric-sessions':d.sessions.active,'#metric-session-users':d.sessions.uniqueUsers,'#metric-new':d.users.new7d};
  for(const [id,value] of Object.entries(fields))text($(id),Number(value).toLocaleString());
  text($('#usage-status'),d.telemetry.apps.length ? d.telemetry.apps.map(a=>a.app+': '+a.uniqueUsers+' users / '+a.events+' events').join(' · ') : 'Endpoint telemetry ready. Awaiting application integration; no events recorded yet.');
  text($('#metrics-updated'),'Updated: '+new Date(d.generatedAt).toLocaleString());
  const chart=$('#signup-chart');chart.replaceChildren();
  const days=new Map(d.dailySignups.map(x=>[x.day,x.count]));
  const max=Math.max(1,...days.values());
  for(let i=29;i>=0;i--){
   const date=new Date(Date.now()-i*86400000).toISOString().slice(0,10);
   const count=days.get(date)||0;
   const row=document.createElement('div');row.style.cssText='display:flex;gap:10px;align-items:center;margin:5px 0;font-size:12px';
   const label=document.createElement('span');label.style.width='90px';text(label,date);
   const bar=document.createElement('div');bar.style.cssText='height:12px;border-radius:5px;background:#648bd9;min-width:2px;width:'+Math.max(1,Math.round(count/max*70))+'%';
   const value=document.createElement('span');text(value,count);
   row.append(label,bar,value);chart.append(row);
  }
  const events=$('#security-events');events.replaceChildren();
  for(const item of d.activity.recent){
   const row=document.createElement('div');row.className='audit-row';
   const when=document.createElement('time');text(when,new Date(item.at).toLocaleString());
   const action=document.createElement('span');text(action,item.action+(item.app?' · '+item.app:''));
   row.append(when,action);events.append(row);
  }
  if(!d.activity.recent.length)text(events,'No admin actions recorded.');
 }catch(e){message('Analytics: '+e.message);}
}
$('#overview-refresh').addEventListener('click',loadOverview);
loadOverview();
