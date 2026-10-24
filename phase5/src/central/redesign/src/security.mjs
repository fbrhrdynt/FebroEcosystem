import { createHmac, createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import net from 'node:net';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const randomString = (bytes = 24) => randomBytes(bytes).toString('base64url');
export const safeEqual = (a, b) => {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  if (!password || password.length < 12) throw new Error('Password minimal 12 karakter');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, stored) {
  const parts = String(stored ?? '').split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const digest = scryptSync(password, parts[1], 64);
  const other = Buffer.from(parts[2], 'hex');
  return digest.length === other.length && timingSafeEqual(digest, other);
}
export function parseCookies(cookieHeader = '') {
  return Object.fromEntries(cookieHeader.split(';').map(part => part.trim().split('=')).filter(parts => parts.length === 2));
}
export function createAdminSession(secret) {
  const expiry = Date.now() + 12 * 3600_000;
  const payload = `admin.${expiry}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
export function verifyAdminSession(token, secret) {
  const segments = String(token || '').split('.');
  if (segments.length !== 3 || segments[0] !== 'admin') return false;
  const expiry = Number(segments[1]);
  if (!Number.isSafeInteger(expiry) || expiry < Date.now()) return false;
  const signature = createHmac('sha256', secret).update(`admin.${expiry}`).digest('base64url');
  return safeEqual(signature, segments[2]);
}
export function newCode(length = 8) {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('');
}
const reserved = new Set(['admin','api','v1','health','login','logout','dashboard','robots.txt','favicon.ico','sitemap.xml','assets','static','shorten','qr']);
export function validAlias(alias) { return /^[A-Za-z0-9_-]{4,32}$/.test(alias) && !reserved.has(alias.toLowerCase()); }

export function normalizeUrl(input) {
  if (typeof input !== 'string' || input.length > 2048) throw new Error('URL terlalu panjang');
  let url;
  try { url = new URL(input.trim()); } catch { throw new Error('URL tidak valid'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Hanya URL HTTP/HTTPS yang diperbolehkan');
  if (url.username || url.password) throw new Error('URL dengan username/password tidak diperbolehkan');
  if (url.hostname.length > 253 || url.hostname.length < 4 || !url.hostname.includes('.')) throw new Error('Domain tidak valid');
  const host = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.test') || host.endsWith('.invalid') || host === 'short.febro.id' || host === '127.0.0.1') throw new Error('Domain tujuan tidak diperbolehkan');
  if (net.isIP(host)) {
    if (net.isIP(host) === 6) throw new Error('Alamat IP langsung tidak diperbolehkan');
    const octets = host.split('.').map(Number);
    if (octets[0] === 0 || octets[0] === 10 || octets[0] === 127 || octets[0] >= 224 || (octets[0] === 169 && octets[1] === 254) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127)) throw new Error('Alamat IP privat tidak diperbolehkan');
  }
  if (!/^[a-z0-9.-]+$/i.test(url.hostname) && !net.isIP(host)) throw new Error('Domain tidak valid');
  if (url.hostname.includes('..')) throw new Error('Domain tidak valid');
  return url.href;
}
export function clientIp(req) {
  // Requests are only trusted from Nginx on loopback; Nginx overwrites X-Real-IP.
  const remote = req.socket.remoteAddress || '';
  if (remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1') {
    return String(req.headers['x-real-ip'] || remote);
  }
  return remote;
}
export function limiter() {
  const windows = new Map();
  return (ip, action, max, durationMs) => {
    const now = Date.now();
    const key = `${action}:${ip}`;
    const current = windows.get(key);
    if (!current || current.until < now) { windows.set(key, { count: 1, until: now + durationMs }); return true; }
    if (current.count >= max) return false;
    current.count++;
    if (windows.size > 10000) for (const [k, v] of windows) if (v.until < now) windows.delete(k);
    return true;
  };
}
