/**
 * 智谱 GLM（模型补全，不联网）。
 *
 * 定位：给那些**没有官网、没有地图 Key** 的点位补上「开放时间 / 门票 / 一句简介」。
 * 它不是权威源，所以：
 *   · 来源优先级排在 gov / amap / baidu / 导入之后（见 SOURCE_RANK）；
 *   · 每条数据都标着来自模型记忆，界面上不会伪装成官网口径；
 *   · 两轮独立作答对不上 → 整条丢弃，宁可没有。
 *
 * 三轮：
 *   1. think  —— 让模型把知道的先想一遍，每条自己标【确定】/【不确定】
 *   2. json   —— 把这段笔记整理成结构化字段（不许新增事实）
 *   3. json   —— 换一段完全不带前文的提问，独立再答一次
 * 硬字段（时间 / 票价 / 电话 / 地址）只有第 2、3 轮完全一致才写进去。
 * 为什么这么麻烦：没有联网就没有「证据」可查，只能靠两次独立采样互相当对方的证据。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { json, normDigits, normText, think, type GlmConfig } from '../llm';
import { mkRun, type FactPatch, type SourceCtx, type SourceOutput } from './types';

const META = {
  id: 'glm',
  name: '智谱 GLM 模型补全',
  kind: 'llm' as const,
  access: 'key' as const,
  license: '智谱开放平台（按 token 计费，不消耗联网检索次数）；结果为模型知识，可能过时，需自行核对',
  homepage: 'https://open.bigmodel.cn/',
  note: '不联网：先让模型想一遍，再让它在看不到前文的情况下独立复核；两轮一致的才写，不一致的丢',
};

const THINK_SYSTEM =
  '你是一个记性不错、但更看重诚实的旅行信息助理。你不能联网、不能查网页，只能凭自己已有的知识回答。' +
  '先在心里把知道的过一遍，再分条写出来。' +
  '每条前面必须标【确定】或【不确定】：' +
  '【确定】= 官方公布过、多年没变、你记得很清楚；' +
  '【不确定】= 只记得大概、数字可能调过、或者你有点记混了别的景点。' +
  '拿不准就标【不确定】，不要为了显得有用硬编。完全不了解就直接说「不了解」。';

const EXTRACT_SYSTEM =
  '你是数据整理器。把给你的笔记整理成 JSON，不许新增笔记里没有的事实，不许改写数字。' +
  '笔记里没提到的字段一律填 null。只输出 JSON，不要解释。';

const VERIFY_SYSTEM = '你是严谨的信息核对员。只输出 JSON，不要解释，不确定就填 null。';

interface Extract {
  open?: string | null;
  close?: string | null;
  price?: number | null;
  address?: string | null;
  phone?: string | null;
  intro?: string | null;
  basis?: string | null;
  /** 模型偶尔整体回 true，偶尔按字段回对象，两种都收 */
  sure?: boolean | Record<string, boolean> | null;
}

/** 模型对这个字段说「确定」吗 */
function isSure(sure: Extract['sure'], field: string): boolean {
  if (sure === true) return true;
  if (!sure || typeof sure !== 'object') return false;
  return sure[field] === true;
}

const CURSOR = resolve(process.cwd(), 'server', '.cache', 'glm-cursor.json');

function readCursor(): number {
  try {
    if (!existsSync(CURSOR)) return 0;
    const o = JSON.parse(readFileSync(CURSOR, 'utf8')) as { at?: number };
    return Number.isFinite(o.at) ? Number(o.at) : 0;
  } catch {
    return 0;
  }
}

function writeCursor(n: number) {
  try {
    mkdirSync(dirname(CURSOR), { recursive: true });
    writeFileSync(CURSOR, JSON.stringify({ at: n, updated: new Date().toISOString() }), 'utf8');
  } catch {
    /* 游标丢了顶多重复抓几个 */
  }
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** 把 "8:30" / "08:30" / " 8：30 " 统一成 "08:30"；不像时间的返回空串 */
function hhmm(v?: string | null): string {
  const raw = (v ?? '').trim().replace(/：/g, ':');
  const m = HHMM.exec(raw);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

/** 模型爱把空值写成 "null" 字符串，这里统一当空处理 */
function cleanStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return /^(null|none|undefined|n\/a|未知|不清楚|不详|暂缺|无|-+|—+|\/)$/i.test(s) ? '' : s;
}

/** 票价：数字直接用；「免费」记 0；「60元」取 60；取不出来就丢 */
function toPrice(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 && v <= 2000 ? v : null;
  const s = cleanStr(v);
  if (!s) return null;
  if (/免费|免票|不收|无需门票|无门票/.test(s)) return 0;
  const m = /\d+(?:\.\d+)?/.exec(s);
  if (!m) return null;
  const n = Number(m[0]);
  return n >= 0 && n <= 2000 ? n : null;
}

export const glmSource = {
  meta: META,
  async run(ctx: SourceCtx): Promise<SourceOutput> {
    const started = Date.now();
    const apiKey = ctx.keys.glm;
    if (!apiKey) {
      return {
        run: mkRun(META, 'need_key', {
          note: '没有智谱 Key。到 open.bigmodel.cn 拿一个，粘到数据源面板即可',
        }),
      };
    }

    const cfg: GlmConfig = {
      apiKey,
      thinkModel: process.env.GLM_THINK_MODEL,
      extractModel: process.env.GLM_EXTRACT_MODEL,
    };
    // 每个点位 3 次调用，全按 token 算，不再有「检索次数」这一说。
    // 想省钱就把 GLM_MAX / GLM_HOTEL_MAX 调小。
    const maxPoi = Number(process.env.GLM_MAX ?? 10);
    const maxHotel = Number(process.env.GLM_HOTEL_MAX ?? 3);

    // 按评分排序后从游标处切片，每轮换一批，跑几轮就能把所有点位轮过来
    const ids = (process.env.GLM_IDS ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    // 只补「开放时间是估算」的点位。
    // 人工核实过的那些，GLM 写得再好也会被 seed-verified 盖掉，去问它是纯浪费 token。
    const ranked = ctx.pois
      .filter((p) => p.hours_confidence !== 'verified')
      .sort((a, b) => b.rating - a.rating);
    const cursor = readCursor() % Math.max(1, ranked.length);
    const picked: typeof ranked = ids.length > 0
      ? ranked.filter((p) => ids.includes(p.poi_id))
      : (() => {
          const out: typeof ranked = [];
          for (let i = 0; i < Math.min(maxPoi, ranked.length); i++) out.push(ranked[(cursor + i) % ranked.length]);
          return out;
        })();

    const hotels = [...ctx.hotels].slice(0, maxHotel);

    const facts: FactPatch[] = [];
    let thought = 0;
    let noResult = 0;
    let mismatch = 0;
    let tokens = 0;
    let calls = 0;
    // 账户级故障（余额不足、Key 无效）没必要把十几个点位逐个撞一遍，
    // 第一次撞上就停整轮，错误原文直接进面板备注。
    let fatal = '';
    const isFatal = (m: string) => /1113|余额不足|无可用资源包|欠费|身份认证|未实名|API Key/i.test(m);

    const runOne = async (
      target: 'poi' | 'hotel',
      id: string,
      name: string,
      cityName: string,
      ask: string,
    ): Promise<void> => {
      if (fatal) return;
      const today = new Date();
      const dateCN = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const where = `地点：${name}（${cityName}）`;

      // ---- 第一步：先想 ----
      // 用「游客提问」的口气，而不是「请输出开放时间」的表格口气：
      // 后者会诱导模型套模板（实测不管问哪个景点都答 08:30-17:30）。
      const thinkUser =
        `有游客准备去${name}（${cityName}），出发前想弄清楚：${ask}。今天：${dateCN}。\n` +
        `请像跟朋友聊天一样，把你知道的先讲一遍，讲完再逐条标【确定】/【不确定】。\n` +
        `规则：\n` +
        `1) 时间写成 24 小时制「08:30-22:00」这种形式；只记得开门不记得关门，就只写开门时间并标【不确定】。\n` +
        `2) 门票只写成人票整数元；确定免费写 0；索道、观光车、园中园另收费的单独提一句，但票价只算大门。\n` +
        `3) 简介不超过 40 字，只说它是什么、为什么值得去。\n` +
        `4) 不要给笼统的通用说法（「白天开放」「一般是上午」），要么给具体时间，要么明说不确定。\n` +
        `5) 完全不了解就直说「不了解」，不要编。\n` +
        `6) 最后单独加一行「结论：开放时间 HH:MM-HH:MM；门票 N 元」，拿不准的那项写「不确定」。\n`;

      let note = '';
      try {
        calls += 1;
        const t = await think(THINK_SYSTEM, thinkUser, cfg, 380);
        note = t.text.trim();
        tokens += t.usage.total_tokens ?? 0;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isFatal(msg)) {
          fatal = msg;
          ctx.log(`[abort] 智谱停整轮：${msg}`);
          return;
        }
        ctx.log(`[fail] GLM「${name}」第一步失败：${msg}`);
        return;
      }
      if (!note || /^不了解/.test(note)) {
        noResult += 1;
        return;
      }
      thought += 1;

      // ---- 第二步：整理成 JSON ----
      const extractUser =
        `${where}。\n下面是关于它的笔记，请整理成 JSON：\n"""\n${note.slice(0, 1400)}\n"""\n\n` +
        `字段：open, close, price, address, phone, intro, basis, sure\n` +
        `- open / close：HH:MM，例如 "08:30"；笔记里只有笼统说法（「早上八点开门」也算笼统）就填 null。\n` +
        `- price：整数元；免费填 0；没提到填 null。\n` +
        `- address / phone：笔记里没有就填 null，不许自己补。\n` +
        `- intro：不超过 40 字，只能复用笔记里的说法。\n` +
        `- basis：这条结论的依据类型，30 字内（例如「景区官网长期公示的开放时间」）；说不出就填 null。\n` +
        `- sure：对象，逐个字段标明笔记里是否标了【确定】，例如 {"open":true,"close":true,"price":false}。\n`;

      calls += 1;
      const first = await json<Extract>(EXTRACT_SYSTEM, extractUser, cfg, { maxTokens: 420 });
      tokens += first.usage.total_tokens ?? 0;
      if (!first.value) {
        ctx.log(`[fail] GLM「${name}」整理失败：返回不是合法 JSON`);
        return;
      }
      const a = first.value;

      // ---- 第三步：换个问法，独立再答一次 ----
      // 这是没有联网时的防编造闸门：编出来的数字两轮几乎不可能一样。
      // 注意别把它写成「不确定就填 null」的恐吓式提问 —— 实测那样模型直接全答 null，
      // 闸门永远不通过，等于白烧 token。要让它「如实回忆」，而不是「尽量免责」。
      // 第一轮压根没吐出任何硬字段时不必复核（反正也没东西可写），省一次调用。
      const hasHard =
        hhmm(cleanStr(a.open)) !== '' ||
        hhmm(cleanStr(a.close)) !== '' ||
        toPrice(a.price) !== null ||
        cleanStr(a.address) !== '' ||
        normDigits(cleanStr(a.phone)) !== '';
      const verifyUser =
        `有游客问你：${name}（${cityName}）${ask}？\n` +
        `请按你了解的实际情况直接回答，不用查资料也不用解释。\n` +
        `确实没印象的字段填 null，其余尽量给出你记得的值。\n` +
        `输出 JSON：open, close, price, address, phone`;
      let b: Extract | null = null;
      let secondRaw = '';
      try {
        if (hasHard) {
          calls += 1;
          const second = await json<Extract>(VERIFY_SYSTEM, verifyUser, cfg, {
            maxTokens: 200,
            temperature: 0.7,
          });
          tokens += second.usage.total_tokens ?? 0;
          b = second.value;
          secondRaw = second.raw;
        } else {
          secondRaw = '(第一轮没有硬字段，跳过复核)';
        }
      } catch (e) {
        // 复核挂了就当复核没通过，不写硬字段，但不中断整轮
        ctx.log(`[warn] GLM「${name}」复核失败：${e instanceof Error ? e.message : String(e)}`);
      }
      // 调闸门松紧时用：GLM_DEBUG=1 看两轮原始 JSON
      if (process.env.GLM_DEBUG) {
        ctx.log(`[debug] ${name}\n  笔记：${note.replace(/\n/g, ' / ').slice(0, 200)}\n  轮1：${first.raw.slice(0, 240)}\n  轮2：${secondRaw.slice(0, 240)}`);
      }

      // 把两轮答案都洗一遍再比。
      // 踩过的坑：模型爱把空值写成字符串 "null"、把免费写成 "免费"，
      // 而 Number(null) === 0 —— 直接比会把「第二轮啥也没说」当成「确认了 0 元门票」。
      const norm = (x: Extract) => {
        return {
          open: hhmm(cleanStr(x.open)),
          close: hhmm(cleanStr(x.close)),
          price: toPrice(x.price),
          address: cleanStr(x.address),
          phone: cleanStr(x.phone),
        };
      };
      const A = norm(a);
      const B = norm(b ?? {});

      const same = {
        hours:
          A.open !== '' &&
          B.open !== '' &&
          A.open === B.open &&
          A.close === B.close &&
          A.open !== A.close,
        price: A.price !== null && B.price !== null && Math.round(A.price) === Math.round(B.price),
        address:
          normText(A.address).length >= 6 &&
          normText(A.address).length <= 80 &&
          normText(A.address) === normText(B.address),
        phone:
          normDigits(A.phone).length >= 7 &&
          normDigits(A.phone).length <= 13 &&
          normDigits(A.phone) === normDigits(B.phone),
      };

      let added = 0;
      const pushed: string[] = [];
      const wanted: string[] = [];
      const basis = cleanStr(a.basis);

      if (target === 'poi') {
        // 餐厅/咖啡馆/商场/酒吧没有「门票」，只有人均 —— 抽出来的数字语义不对，不要
        const poi = ctx.pois.find((p) => p.poi_id === id);
        const noTicket = poi ? ['restaurant', 'cafe', 'shopping', 'nightlife'].includes(poi.category) : false;
        wanted.push('开放时间', '简介');
        if (!noTicket) wanted.push('票价');

        if (same.hours) {
          facts.push({ target, id, field: 'hours', v: `${A.open}–${A.close}`, src: 'glm' });
          added += 1;
          pushed.push('开放时间');
        }
        if (!noTicket && same.price && A.price !== null) {
          facts.push({ target, id, field: 'price', v: Math.round(A.price), src: 'glm' });
          added += 1;
          pushed.push('票价');
        }
      } else {
        wanted.push('地址', '电话', '简介');
        if (same.address) {
          facts.push({ target, id, field: 'address', v: A.address.trim(), src: 'glm' });
          added += 1;
          pushed.push('地址');
        }
        if (same.phone) {
          const phone = A.phone.replace(/[^\d\-+()转]/g, '').trim();
          if (phone.length >= 7 && phone.length <= 24) {
            facts.push({ target, id, field: 'phone', v: phone, src: 'glm' });
            added += 1;
            pushed.push('电话');
          }
        }
      }

      // 简介不涉及数字，只取第一轮；门槛是模型自己标了「确定」。
      // 不要求 basis —— 实测模型经常在这一项上偷懒回 null，卡它会把简介全丢掉。
      const intro = cleanStr(a.intro);
      if (isSure(a.sure, 'intro') && intro.length >= 6 && intro.length <= 60) {
        facts.push({ target, id, field: 'intro', v: intro, src: 'glm' });
        added += 1;
        pushed.push('简介');
      }

      const dropped = wanted.filter((k) => !pushed.includes(k)).length;
      if (dropped > 0) mismatch += dropped;

      if (added > 0) {
        ctx.log(`[ok] ${name}：${pushed.join('、')} · 两轮一致${basis ? ` · 依据 ${basis.slice(0, 20)}` : ''}`);
      } else {
        ctx.log(`[drop] 「${name}」：两轮答案对不上（或模型自己说不确定），未写入`);
      }
    };

    await pool(picked, 3, (poi) => {
      const city = ctx.cities.find((c) => c.code === poi.city);
      return runOne('poi', poi.poi_id, poi.name, city?.name ?? '', '开放时间、门票价格、一句简介');
    });

    await pool(hotels, 2, (h) => {
      const city = ctx.cities.find((c) => c.code === h.city);
      return runOne('hotel', h.id, h.name, city?.name ?? '', '详细地址、前台电话、一句简介');
    });

    if (ids.length === 0) writeCursor(cursor + picked.length);

    const status = fatal ? 'error' : facts.length > 0 ? 'ok' : thought > 0 ? 'empty' : 'error';
    const summary = fatal
      ? fatal
      : `${picked.length} 个点位 + ${hotels.length} 家酒店，模型有话说 ${thought} 个，写入 ${facts.length} 个字段` +
        (mismatch > 0 ? `，${mismatch} 个字段两轮对不上被丢弃` : '') +
        (noResult > 0 ? `，${noResult} 个说「不了解」` : '') +
        ` · ${tokens} tokens`;

    for (const line of [summary]) ctx.log(`[glm] ${line}`);

    return {
      run: mkRun(META, status, {
        items: facts.length,
        requests: calls,
        bytes: 0,
        ms: Date.now() - started,
        note: summary,
      }),
      facts,
    };
  },
};
