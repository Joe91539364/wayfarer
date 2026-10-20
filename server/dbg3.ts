import { readFileSync } from 'node:fs';
import { POIS } from '../src/data/pois';
import { HOTELS } from '../src/data/hotels';
import { normName } from './sources/types';

const key = (JSON.parse(readFileSync('server/.keys.json', 'utf8')) as { amap: string }).amap;
const norm = (s: string) => normName(s);

function match(a: string, b: string) {
  const x = norm(a), y = norm(b);
  if (x === y) return 'exact';
  if (x.includes(y) || y.includes(x)) return Math.abs(x.length - y.length) <= 2 ? 'contain' : 'no';
  return 'no';
}

const out: string[] = [];
let ok = 0, fallback = 0;
for (const poi of POIS) {
  const city = { chengdu: '成都', xian: '西安', xiamen: '厦门', beijing: '北京', hangzhou: '杭州' }[poi.city];
  const url = `https://restapi.amap.com/v3/place/text?key=${key}&keywords=${encodeURIComponent(poi.name)}&city=${encodeURIComponent(city ?? '')}&citylimit=true&extensions=all&offset=5`;
  const r = await fetch(url).then((x) => x.json()) as { pois?: { name: string }[] };
  const list = r.pois ?? [];
  const hit = list.find((p) => match(p.name, poi.name) !== 'no');
  if (hit) ok++; else { fallback++; out.push(`POI ${poi.name}  ←首条: ${list[0]?.name ?? '无'}`); }
  await new Promise((r2) => setTimeout(r2, 380));
}
console.log(`POI 名称命中 ${ok} / 回退 ${fallback}`);
for (const l of out) console.log('  ', l);
