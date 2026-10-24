import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITES = ['tools','lab','api','docs','qr','convert','snip','short','verify','auth'];

test('10 subdomain memakai template halaman independen',()=>{
 const titles = new Set();
 for (const site of SITES) {
  const source=fs.readFileSync(path.join(ROOT,'public/sites',`${site}.html`),'utf8');
  assert.match(source,new RegExp(`<html lang="id" data-site="${site}">`));
  assert.match(source,/<main id="app"/);
  assert.match(source,/<nav id="main-nav"/);
  assert.match(source,/by Febro Herdyanto/);
  assert.match(source,/\/assets\/site-identities.css\?v=(?:2\.(?:1|2)\.0|neo-0\.1|space-1)/);
  assert.match(source,/<meta name="description" content="[^\"]+"/);
  assert.match(source,/<button id="theme"/);
  assert.match(source,/<a id="account-link"/);
  const title=source.match(/<title>(.*?)<\/title>/)?.[1];
  assert.ok(title);
  titles.add(title);
 }
 assert.equal(titles.size,SITES.length,'Setiap situs punya title unik');
});

test('navigasi tidak menampilkan seluruh ecosystem dan fokus pada produk masing-masing',()=>{
 for(const site of SITES){
  const source=fs.readFileSync(path.join(ROOT,'public/sites',`${site}.html`),'utf8');
  const nav=source.match(/<nav id="main-nav"[^>]*>(.*?)<\/nav>/s)?.[1];
  assert.notEqual(nav, undefined);
  const links=[...nav.matchAll(/<a href=/g)].length;
  assert.ok((site==='auth'||links>0)&&links<=3,`${site}: jumlah nav ${links}`);
  assert.doesNotMatch(nav, /data-nav="/);
 }
});

test('server mengenali stylesheet baru dan halaman khusus subdomain',()=>{
 const server=fs.readFileSync(path.join(ROOT,'src/server.mjs'),'utf8');
 assert.match(server,/public\/site-identities.css/);
 assert.match(server,/public','sites',`\$\{site\}\.html`/);
 assert.ok(fs.statSync(path.join(ROOT,'public/site-identities.css')).size>5000);
});
