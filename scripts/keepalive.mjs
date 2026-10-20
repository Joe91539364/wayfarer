/**
 * 进程守护：让本地服务真正「常驻」。
 *
 * 为什么不在 node server/app.mjs 里自己扛着：
 *   单进程崩了就没了，没人拉起来。守护进程只做一件事 —— 盯着它，挂了重开。
 *
 * 行为：
 *   1. 先探测 http://127.0.0.1:8787/api/health，已经活着就直接退出（避免双开抢端口）
 *   2. spawn 子进程，stdout/stderr 落 logs/server.log（超过 4MB 轮转）
 *   3. 子进程退出后按 1s → 2s → 5s → 10s → 20s 退避重启；1 分钟内连挂 5 次则退避 60s
 *   4. 收到 SIGINT/SIGTERM 或 stdin 关闭时，连带子进程一起收摊
 *
 * 用法： node scripts/keepalive.mjs
 */

import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOG_DIR = join(ROOT, 'logs');
const LOG = join(LOG_DIR, 'server.log');
const PID = join(ROOT, 'data', 'keepalive.pid');
const PORT = Number(process.env.PORT ?? 8787);
const HEALTH = `http://127.0.0.1:${PORT}/api/health`;

mkdirSync(LOG_DIR, { recursive: true });
mkdirSync(join(ROOT, 'data'), { recursive: true });

const stamp = () => new Date().toLocaleString('zh-CN', { hour12: false });
const say = (msg) => {
  const line = `[${stamp()}] [keep] ${msg}`;
  console.log(line);
  try {
    if (existsSync(LOG) && statSync(LOG).size > 4 * 1024 * 1024) {
      renameSync(LOG, join(LOG_DIR, 'server.1.log'));
    }
    const fs = createWriteStream(LOG, { flags: 'a' });
    fs.end(line + '\n');
  } catch {
    /* 日志写不进去不影响守护 */
  }
};

async function alive() {
  try {
    const r = await fetch(HEALTH, { signal: AbortSignal.timeout(1200) });
    return r.ok;
  } catch {
    return false;
  }
}

if (await alive()) {
  say(`端口 ${PORT} 上已经有服务在跑，不再启动第二个`);
  process.exit(0);
}

writeFileSync(PID, String(process.pid), 'utf8');

let child = null;
let stopping = false;
let attempts = 0;
let windowStart = Date.now();
const BACKOFF = [1000, 2000, 5000, 10000, 20000];

function start() {
  attempts += 1;
  if (Date.now() - windowStart > 60_000) {
    windowStart = Date.now();
    attempts = 1;
  }

  say(`启动服务（第 ${attempts} 次尝试）`);
  child = spawn(process.execPath, ['server/app.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  const relay = (buf) => {
    const text = buf.toString('utf8');
    process.stdout.write(text);
    try {
      const fs = createWriteStream(LOG, { flags: 'a' });
      fs.end(text);
    } catch {
      /* ignore */
    }
  };
  child.stdout.on('data', relay);
  child.stderr.on('data', relay);

  child.on('exit', (code, signal) => {
    child = null;
    if (stopping) return;
    const why = signal ? `信号 ${signal}` : `退出码 ${code}`;
    const wait = attempts >= 5 ? 60_000 : (BACKOFF[Math.min(attempts - 1, BACKOFF.length - 1)] ?? 20_000);
    say(`服务退出（${why}），${Math.round(wait / 1000)}s 后重启`);
    setTimeout(() => {
      if (!stopping) start();
    }, wait);
  });

  child.on('error', (e) => {
    say(`拉起失败：${e.message}`);
  });
}

function stop(sig) {
  if (stopping) return;
  stopping = true;
  say(`收到 ${sig}，停止守护`);
  try {
    if (existsSync(PID) && readFileSync(PID, 'utf8').trim() === String(process.pid)) unlinkSync(PID);
  } catch {
    /* ignore */
  }
  if (child) {
    child.kill('SIGTERM');
    setTimeout(() => process.exit(0), 2500);
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('uncaughtException', (e) => say(`守护进程异常：${e.message}`));

start();
