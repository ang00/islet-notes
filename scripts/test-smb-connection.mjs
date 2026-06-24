#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const PROXY_PORT = 3458;
const HOST = '192.168.0.106';
const SHARE = 'test';
const USERNAME = 'admin';
const PASSWORD = 'p69%HYuyC.';
const DOMAIN = 'WORKGROUP';

// 1. Start proxy
const proxy = execFileSync('node', ['scripts/smb-proxy.mjs'], {
  cwd: import.meta.dirname,
  env: {
    ...process.env,
    PORT: String(PROXY_PORT),
    SMB_HOST: HOST,
    SMB_SHARE: SHARE,
    SMB_USERNAME: USERNAME,
    SMB_PASSWORD: PASSWORD,
    SMB_DOMAIN: DOMAIN,
  },
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe'],
  timeout: 5000,
});

// Wait a moment for proxy to start

// Use fetch to simulate what the app does
const BASE = `http://localhost:${PROXY_PORT}`;
const KEY = 'healthcheck-verify.json';
const BODY = JSON.stringify({ ok: true, at: new Date().toISOString() });

// PUT
const putRes = await fetch(`${BASE}/${KEY}`, { method: 'PUT', body: BODY });
if (!putRes.ok) { console.error('PUT failed:', putRes.status); process.exit(1); }
console.log('PUT: OK', putRes.status);

// GET
const getRes = await fetch(`${BASE}/${KEY}`);
if (!getRes.ok) { console.error('GET failed:', getRes.status); process.exit(1); }
const getBody = await getRes.text();
console.log('GET: OK', getRes.status, getBody);

// HEAD
const headRes = await fetch(`${BASE}/${KEY}`, { method: 'HEAD' });
if (!headRes.ok) { console.error('HEAD failed:', headRes.status); process.exit(1); }
console.log('HEAD: OK', headRes.status);

// Clean up
await fetch(`${BASE}/${KEY}`, { method: 'DELETE' }).catch(() => {});

console.log('\nAll SMB operations passed!');
process.exit(0);
