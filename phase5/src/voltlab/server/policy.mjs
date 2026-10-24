export const ADMIN_IDENTITIES=Object.freeze({
 'febroherdyanto98@gmail.com':'febroherdyanto',
 'febroherdyanto@outlook.com':'fbrhrdynt'
});
export const normalizeEmail=e=>String(e||'').trim().toLowerCase();
export function adminUsername(email){return ADMIN_IDENTITIES[normalizeEmail(email)]||null;}
export function isAdmin(user){return !!user&&user.status==='active'&&user.email_verified===true&&!!adminUsername(user.email);}
export function reservedUsername(username){return Object.values(ADMIN_IDENTITIES).includes(String(username||'').toLowerCase());}
export function sameOrigin(origin,expected){try{return !!origin&&new URL(origin).origin===new URL(expected).origin;}catch{return false;}}
export function publicUser(u){return {id:u.id,email:u.email,name:u.name,username:u.username,role:isAdmin(u)?'admin':'user',status:u.status};}
