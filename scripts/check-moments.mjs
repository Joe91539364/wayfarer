/**
 * 「幸福时刻」接口冒烟：存照片 → 读回来 → 改一句话 → 删掉。
 *
 * 用一张 1x1 的真 PNG，不依赖任何测试图片文件。
 * 跑之前服务要在：双击 start.cmd，或者 npm run serve。
 *
 *   node scripts/check-moments.mjs
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:8787';

// 1x1 透明 PNG
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const dataUrl = `data:image/png;base64,${PNG}`;

let pass = 0;
let fail = 0;

function ok(name, cond, extra = '') {
  if (cond) {
    pass += 1;
    console.log(`  [ok]   ${name}`);
  } else {
    fail += 1;
    console.log(`  [FAIL] ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

async function main() {
  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!health?.ok) {
    console.error(`${BASE} 没起来，先双击 start.cmd`);
    process.exit(1);
  }

  console.log('[1] 列表');
  const before = await (await fetch(`${BASE}/api/moments`)).json();
  ok('GET /api/moments 返回 items 数组', Array.isArray(before.items), JSON.stringify(before).slice(0, 120));

  console.log('[2] 存一张');
  const created = await fetch(`${BASE}/api/moments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      dataUrl,
      trip_id: 'smoke-trip',
      day: 1,
      caption: '冒烟测试',
      stars: 4,
      taken_at: '2026-11-02T09:30:00.000Z',
    }),
  });
  const m = await created.json();
  ok('POST 返回 200', created.status === 200, `status=${created.status}`);
  ok('拿到 id 和文件名', Boolean(m.id && m.file), JSON.stringify(m));
  ok('服务端补上了大小', typeof m.size === 'number' && m.size > 0, `size=${m.size}`);
  ok('行程归属写进去了', m.trip_id === 'smoke-trip');

  console.log('[3] 列表里能查到');
  const after = await (await fetch(`${BASE}/api/moments`)).json();
  ok('多了一张', after.items.length === before.items.length + 1, `${before.items.length} → ${after.items.length}`);
  ok('按新到旧排，新的在最前', after.items[0]?.id === m.id);

  console.log('[4] 取照片字节');
  const img = await fetch(`${BASE}/api/moments/file/${m.file}`);
  ok('200', img.status === 200, `status=${img.status}`);
  ok('Content-Type 是图片', (img.headers.get('content-type') ?? '').startsWith('image/png'), img.headers.get('content-type'));
  ok('有长缓存头', (img.headers.get('cache-control') ?? '').includes('max-age'), img.headers.get('cache-control'));
  const bytes = new Uint8Array(await img.arrayBuffer());
  ok('字节数和记录一致', bytes.length === m.size, `${bytes.length} vs ${m.size}`);

  console.log('[5] 路径穿越挡得住');
  const evil = await fetch(`${BASE}/api/moments/file/${encodeURIComponent('../index.json')}`);
  ok('../../index.json 拿不到', evil.status === 404, `status=${evil.status}`);

  console.log('[6] 改一句话 / 天数 / 指数');
  const patched = await fetch(`${BASE}/api/moments/${m.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ caption: '改成这句', stars: 5, day: 2 }),
  });
  const p = await patched.json();
  ok('200', patched.status === 200, `status=${patched.status}`);
  ok('文案改了', p.caption === '改成这句', p.caption);
  ok('指数改了', p.stars === 5, String(p.stars));
  ok('天数改了', p.day === 2, String(p.day));

  console.log('[7] 脏输入');
  const bad = await fetch(`${BASE}/api/moments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dataUrl: 'data:text/plain;base64,aGVsbG8=' }),
  });
  ok('非图片 dataURL 被拒', bad.status === 400, `status=${bad.status}`);
  const big = await fetch(`${BASE}/api/moments/${m.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stars: 99 }),
  });
  ok('指数上限 5', (await big.json()).stars === 5);

  console.log('[8] 删掉');
  const del = await fetch(`${BASE}/api/moments/${m.id}`, { method: 'DELETE' });
  ok('200', del.status === 200, `status=${del.status}`);
  const gone = await fetch(`${BASE}/api/moments/file/${m.file}`);
  ok('文件真的不在磁盘上了', gone.status === 404, `status=${gone.status}`);
  const list2 = await (await fetch(`${BASE}/api/moments`)).json();
  ok('列表回到原来的张数', list2.items.length === before.items.length, `${list2.items.length}`);
  ok('再删一次报 404', (await fetch(`${BASE}/api/moments/${m.id}`, { method: 'DELETE' })).status === 404);

  console.log(`\n${fail === 0 ? '[ok]' : '[FAIL]'} ${pass} 通过 / ${fail} 失败`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
