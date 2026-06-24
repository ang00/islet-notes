#!/usr/bin/env node

import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = Number(process.env.PORT || 3456);
const HOST = process.env.SMB_HOST || '192.168.0.106';
const SHARE = process.env.SMB_SHARE || 'test';
const USERNAME = process.env.SMB_USERNAME || 'admin';
const PASSWORD = process.env.SMB_PASSWORD || 'p69%HYuyC.';
const DOMAIN = process.env.SMB_DOMAIN || 'WORKGROUP';

async function smbPut(key, buffer) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'smb-proxy-'));
  const tmpFile = join(tmpDir, 'smb-payload');
  writeFileSync(tmpFile, buffer);
  try {
    await run('smbclient', [
      `//${HOST}/${SHARE}`,
      '-U', `${USERNAME}%${PASSWORD}`,
      '-W', DOMAIN,
      '-c', `put "${tmpFile}" "${key}"`,
    ]);
  } finally {
    execFile('rm', ['-rf', tmpDir]);
  }
}

async function smbGet(key) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'smb-proxy-'));
  const tmpFile = join(tmpDir, 'smb-payload');
  try {
    await run('smbclient', [
      `//${HOST}/${SHARE}`,
      '-U', `${USERNAME}%${PASSWORD}`,
      '-W', DOMAIN,
      '-c', `get "${key}" "${tmpFile}"`,
    ]);
    if (!existsSync(tmpFile)) return undefined;
    const { readFileSync } = await import('node:fs');
    return readFileSync(tmpFile);
  } finally {
    execFile('rm', ['-rf', tmpDir]);
  }
}

async function smbStat(key) {
  const result = await run('smbclient', [
    `//${HOST}/${SHARE}`,
    '-U', `${USERNAME}%${PASSWORD}`,
    '-W', DOMAIN,
    '-c', `allinfo "${key}"`,
  ]);
  if (!result) return undefined;
  const lines = result.split('\n');
  const sizeLine = lines.find(l => l.includes('stream') || l.includes('size'));
  const mtimeLine = lines.find(l => l.includes('mtime') || l.includes('modify_time'));
  return {
    size: sizeLine ? parseInt(sizeLine.split(':').pop()?.trim() || '0', 10) : undefined,
    mtime: mtimeLine ? new Date(mtimeLine.split(':').slice(1).join(':').trim()) : undefined,
  };
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, { maxBuffer: 10 * 1024 * 1024, timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        const msg = (stderr || stdout || err.message || '').trim();
        if (msg.includes('NT_STATUS_OBJECT_NAME_NOT_FOUND') || msg.includes('NT_STATUS_NOT_FOUND')) {
          reject(Object.assign(new Error(msg), { code: 'ENOENT' }));
          return;
        }
        reject(new Error(msg || err.message));
        return;
      }
      resolve(stdout);
    });
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const key = url.pathname.replace(/^\/+/, '');

  try {
    if (req.method === 'PUT') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      await smbPut(key, Buffer.concat(chunks));
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'GET') {
      const data = await smbGet(key);
      if (!data) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(data);
      return;
    }

    if (req.method === 'HEAD') {
      try {
        await smbStat(key);
        res.writeHead(200);
      } catch {
        res.writeHead(404);
      }
      res.end();
      return;
    }
  } catch (err) {
    if (err.code === 'ENOENT' || err.message?.includes('NT_STATUS_OBJECT_NAME_NOT_FOUND')) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(500);
    res.end(`${req.method} error: ${err.message}`);
    return;
  }

  res.writeHead(405);
  res.end(`Method ${req.method} not allowed`);
}).listen(PORT, () => {
  console.log(`SMB proxy listening on http://localhost:${PORT}`);
  console.log(`  Target: //${HOST}/${SHARE}`);
});
