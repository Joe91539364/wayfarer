/**
 * GLM 数据源冒烟测试：只跑 1~2 个点位，看它到底写了什么。
 *
 *   NAMES=钟楼,宽窄巷子 npx esbuild scripts/glm-smoke.ts --bundle --platform=node --format=esm \
 *     --outfile=scripts/glm-smoke.mjs --log-level=warning && node scripts/glm-smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CITIES, POIS } from '../src/data/pois';
import { HOTELS } from '../src/data/hotels';
import { glmSource } from '../server/sources/glm';
import type { SourceCtx } from '../server/sources/types';

const keys = JSON.parse(readFileSync(resolve(process.cwd(), 'server/.keys.json'), 'utf8')) as {
  glm?: string;
};

const want = (process.env.NAMES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const pois = want.length > 0 ? POIS.filter((p) => want.some((w) => p.name.includes(w))) : POIS.slice(0, 2);
if (pois.length === 0) {
  console.error('没匹配到点位，换个 NAMES');
  process.exit(1);
}

process.env.GLM_IDS = pois.map((p) => p.poi_id).join(',');
process.env.GLM_HOTEL_MAX = process.env.GLM_HOTEL_MAX ?? '0';

const ctx: SourceCtx = {
  net: null as unknown as SourceCtx['net'],
  now: Date.now(),
  keys: { glm: keys.glm },
  pois: POIS,
  hotels: HOTELS,
  cities: CITIES,
  log: (m) => console.log(m),
};

console.log(`跑 ${pois.length} 个点位：${pois.map((p) => `${p.name}(${p.poi_id})`).join('、')}\n`);
const out = await glmSource.run(ctx);
console.log('\n--- 写入的字段 ---');
for (const f of out.facts ?? []) console.log(`${f.id} ${f.field} = ${String(f.v)}`);
console.log(`\n状态 ${out.run.status} · ${out.run.items} 项 · ${out.run.ms}ms · ${out.run.note}`);
