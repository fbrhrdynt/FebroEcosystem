import express from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { pool, query } from '../database.js';
import { flash, safeReturnTo } from '../utils.js';
import { guestOnly } from '../middleware.js';
import { configured, startFlow, validFlow, exchangeCode, randomToken, safeEqual } from '../services/oidc.js';

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const save = req => new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));

async function completeLogin(req, res, user) {
  if (user.status !== 'active') throw new Error('Account unavailable');
  const returnTo = req.session.returnTo;
  await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  await query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);
  req.session.authenticatedAt = Date.now();
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
  let destination = safeReturnTo(returnTo, user.role === 'Administrator' ? '/admin' : '/dashboard');
  if (user.role !== 'Administrator' && destination.startsWith('/admin')) destination = '/dashboard';
  await save(req);
  res.redirect(destination);
}

router.get('/login', guestOnly, (req, res) => {
  res.set('Cache-Control', 'no-store');
  req.session.loginCSRF=randomToken();
  res.render('auth/login', { title: 'Masuk', ssoEnabled: configured(), febroSSO:process.env.FEBRO_SSO_ENABLED==='true', loginCSRF:req.session.loginCSRF });
});
router.get('/register', guestOnly, (req, res) => res.redirect('/login'));
router.post('/register', guestOnly, (req,res)=>res.redirect(303,'/login'));
router.post('/login',authLimiter,guestOnly,async(req,res,next)=>{try{
 const csrf=req.session.loginCSRF;delete req.session.loginCSRF;
 if(req.headers.origin!==new URL(process.env.APP_URL).origin||!safeEqual(req.body.csrf,csrf))return res.status(403).send('Sesi formulir tidak valid.');
 const user=(await query('SELECT * FROM users WHERE LOWER(email)=$1',[String(req.body.email||'').trim().toLowerCase()])).rows[0];
 if(!user||user.status!=='active'||!user.password_hash||!await bcrypt.compare(String(req.body.password||''),user.password_hash)){flash(req,'danger','Email atau password tidak valid.');await save(req);return res.redirect('/login');}
 await completeLogin(req,res,user);
}catch(e){next(e);}});

router.get(['/auth/febro', '/auth/google'], authLimiter, guestOnly, async (req, res, next) => {
  try {
    if (!configured()) {
      flash(req, 'danger', 'Login belum dikonfigurasi. Hubungi Administrator.');
      await save(req);
      return res.redirect('/login');
    }
    const { flow, url } = startFlow(req.path === '/auth/google');
    req.session.oidcFlow = flow;
    delete req.session.pendingIdentity;
    await save(req);
    res.set('Cache-Control', 'no-store').redirect(url);
  } catch (err) { next(err); }
});

router.get('/auth/febro/callback', authLimiter, guestOnly, async (req, res, next) => {
  try {
    const flow = req.session.oidcFlow;
    delete req.session.oidcFlow;
    await save(req);
    if (!validFlow(flow, req.query.state) || req.query.error || typeof req.query.code !== 'string') throw new Error('Invalid callback');
    const identity = await exchangeCode(req.query.code, flow);
    const client = await pool.connect();
    let user;
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [identity.email]);
      const result = await client.query('SELECT * FROM users WHERE febro_sub=$1 OR LOWER(email)=$2 FOR UPDATE', [identity.sub, identity.email]);
      const linked = result.rows.find(row => row.febro_sub === identity.sub);
      const existing = result.rows.find(row => row.email.toLowerCase() === identity.email);
      if (linked) {
        if (linked.status !== 'active') throw new Error('Account unavailable');
        user = linked;
      } else if (existing) {
        if (existing.status !== 'active' || existing.febro_sub) throw new Error('Account unavailable');
        req.session.pendingIdentity = { ...identity, userId: existing.id, csrf: randomToken(), expires: Date.now() + 600000 };
      } else {
        user = (await client.query(`INSERT INTO users(name,email,password_hash,febro_sub,role,status)
          VALUES($1,$2,NULL,$3,'User','active') RETURNING *`, [identity.name, identity.email, identity.sub])).rows[0];
      }
      await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
    if (user) return await completeLogin(req, res, user);
    await save(req);
    res.redirect('/auth/link');
  } catch (err) {
    delete req.session.pendingIdentity;
    console.error('SSO login failed:', err.code || err.name);
    flash(req, 'danger', 'Login tidak berhasil. Akun mungkin dibatasi atau sesi sudah kedaluwarsa. Coba masuk kembali; hubungi Administrator jika masalah berlanjut.');
    try { await save(req); res.redirect('/login'); } catch (error) { next(error); }
  }
});

router.get('/auth/link', guestOnly, (req, res) => {
  const pending = req.session.pendingIdentity;
  if (!pending || pending.expires <= Date.now()) return res.redirect('/login');
  res.set('Cache-Control', 'no-store').render('auth/link', { title: 'Hubungkan akun', email: pending.email, csrf: pending.csrf });
});
router.post('/auth/link', authLimiter, guestOnly, async (req, res, next) => {
  try {
    const pending = req.session.pendingIdentity;
    if (!pending || pending.expires <= Date.now() || !safeEqual(req.body.csrf, pending.csrf)) return res.redirect('/login');
    const result = await query('SELECT * FROM users WHERE id=$1', [pending.userId]);
    const user = result.rows[0];
    if (!user || user.status !== 'active' || user.email.toLowerCase() !== pending.email || !user.password_hash
      || !(await bcrypt.compare(String(req.body.password || ''), user.password_hash))) {
      flash(req, 'danger', 'Password akun lama tidak cocok atau akun tidak aktif. Coba lagi atau hubungi Administrator.');
      await save(req);
      return res.redirect('/auth/link');
    }
    const linked = await query(`UPDATE users SET febro_sub=$1, updated_at=NOW()
      WHERE id=$2 AND febro_sub IS NULL AND status='active' RETURNING *`, [pending.sub, user.id]);
    if (!linked.rowCount) throw new Error('Account already linked');
    await completeLogin(req, res, linked.rows[0]);
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  if(req.headers.origin!==new URL(process.env.APP_URL).origin)return res.status(403).send('Origin tidak valid.');
  req.session.destroy(() => res.redirect('/login'));
});
export default router;
