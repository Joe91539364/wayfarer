import type { Meta } from '../domain/schema';
import { addDays, dateList, formatDateShort } from '../domain/time';
import { CITIES, findCity } from '../data/pois';

const INTEREST_KEYWORDS: [RegExp, string][] = [
  [/吃|美食|小吃|川菜|火锅|好食/g, 'food'],
  [/自然|风景|山水|海边|湖|公园|绿/g, 'nature'],
  [/历史|古迹|古城|文化|人文/g, 'history'],
  [/博物馆|展览|文物/g, 'museum'],
  [/艺术|美术馆|文创|设计/g, 'art'],
  [/购物|逛街|商场|买/g, 'shopping'],
  [/夜生活|酒吧|夜市|晚上/g, 'nightlife'],
  [/拍照|摄影|出片|打卡/g, 'photography'],
  [/乐园|游乐园|主题公园/g, 'theme_park'],
  [/温泉|泡汤/g, 'hot_spring'],
  [/徒步|爬山|登山|暴走/g, 'hiking'],
  [/市井|本地生活|烟火气|老城/g, 'local_life'],
];

export interface IntakeResult {
  meta: Meta;
  missing: string[];
  notes: string[];
}

const CN_DIGIT: Record<string, number> = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

/** 中文数字：十五 / 二十五 / 三十一 / 10 */
export function cnNum(raw: string): number | null {
  const s = raw.trim();
  if (/^\d+$/.test(s)) return Number(s);
  if (!/^[零一二两三四五六七八九十]+$/.test(s)) return null;
  if (s === '十') return 10;
  const m = /^([一二两三四五六七八九])?十([一二三四五六七八九])?$/.exec(s);
  if (m) return (m[1] ? CN_DIGIT[m[1]] : 1) * 10 + (m[2] ? CN_DIGIT[m[2]] : 0);
  if (s.length === 1) return CN_DIGIT[s] ?? null;
  return null;
}

const PROVINCES = [
  '北京', '天津', '上海', '重庆', '河北', '山西', '辽宁', '吉林', '黑龙江', '江苏', '浙江', '安徽',
  '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '海南', '四川', '贵州', '云南', '陕西',
  '甘肃', '青海', '台湾', '内蒙古', '广西', '西藏', '宁夏', '新疆', '香港', '澳门',
];

/** 「江苏宿迁」→「宿迁」，「江西省景德镇市」→「景德镇」 */
export function stripRegion(name: string): string {
  let s = name.trim();
  s = s.replace(/(省|市|自治区|特别行政区|地区|县)$/g, '');
  for (const p of PROVINCES) {
    if (s.startsWith(p) && s.length > p.length + 1) {
      s = s.slice(p.length).replace(/(省|市|自治州|地区|县)$/g, '');
      break;
    }
  }
  return s;
}

/**
 * 出发地。要接住的常见说法：
 *   「从江苏宿迁出发」「自杭州走」「南京出发」      —— 显式「出发」
 *   「出发地是南京」「起点：杭州」                —— 字段式
 *   「从宿迁去成都」「从成都往西昌飞」            —— 「从 X 去 Y」句式（最容易漏的一种）
 *   「宿迁 → 成都」                              —— 箭头式
 *
 * 每个句式按顺序试，命中的捕获先过「脏词过滤」再剥省份前缀；
 * 撞上「从去年开始想去成都」这种时间状语就直接换下一个句式，而不是硬猜。
 */
const ORIGIN_PATTERNS: RegExp[] = [
  /人\s*在\s*([\u4e00-\u9fa5]{2,10})/g,
  /住在\s*([\u4e00-\u9fa5]{2,10})/g,
  /(?:从|自|由)\s*([\u4e00-\u9fa5]{2,10}?)\s*(?:出发|启程|动身|走|飞|坐车|开车|过来)/g,
  /([\u4e00-\u9fa5]{2,8})\s*(?:出发|启程)/g,
  /(?:出发地|出发城市|起点)\s*(?:是|为|：|:)?\s*([\u4e00-\u9fa5]{2,10})/g,
  /(?:从|自|由)(?!由)\s*([\u4e00-\u9fa5]{2,10}?)\s*(?:去|到|往|飞往)/g,
  /([\u4e00-\u9fa5]{2,10})\s*(?:→|->|—|~)\s*[\u4e00-\u9fa5]{2,10}/g,
];

// 城市名里不会出现的字：出现即说明抓到的是时间/意图状语，不是地名
const ORIGIN_DIRT = /年|月|日|末|开始|想|准备|打算|计划|考虑|如果|以前|之后|以后|时候|五一|十一|国庆|春节|寒假|暑假|国庆|周末/;

// 「五一想从宿迁」→「宿迁」：剥掉地名前面夹的修饰词
const ORIGIN_PREFIX = /^(?:五一|十一|国庆|春节|寒假|暑假|周末|明年|今年|下周|下次|这次|我|我们|你|您|想|要|准备|打算|计划|从|自|由|于|在|跟|和|带)+/;

export function parseOrigin(text: string): string | null {
  for (const re of ORIGIN_PATTERNS) {
    const g = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = g.exec(text))) {
      if (ORIGIN_DIRT.test(m[1])) continue;
      const name = stripRegion(m[1].replace(ORIGIN_PREFIX, ''));
      if (name.length >= 2) return name;
    }
  }
  return null;
}

/** 目的地：内置城市未命中时，从「去江西景德镇玩三天」里取「景德镇」 */
export function parseDestinationName(text: string): string | null {
  const m =
    /(?:去|到|游|玩|逛|飞往|前往)\s*([\u4e00-\u9fa5]{2,12}?)\s*(?:玩|旅游|旅行|逛逛|待|出差|度假|自由行|，|,|。|\s)/.exec(text);
  if (!m) return null;
  const name = stripRegion(m[1]);
  return name.length >= 2 ? name : null;
}

/**
 * 「去」字后面抓到的可能是景点不是城市：「从杭州去西湖边玩」抓到「西湖边」。
 * 城市名几乎不会以这些字结尾，命中就不覆盖全文命中的内置城市。
 */
const POI_SUFFIX = /(?:边|山|湖|海|岛|寺|庙|塔|桥|洞|园|馆|街|巷|村|寨|湾|滩|泉|林|谷|峰|崖|坝|沟|古镇|古城|公园|广场|景区|一带)$/;

function looksLikePoi(name: string): boolean {
  return POI_SUFFIX.test(name);
}

function parseCount(text: string): number | null {
  const cn: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8 };
  let m = /(\d+)\s*(?:个)?人/.exec(text);
  if (m) return Number(m[1]);
  m = /([一两二三四五六七八])\s*(?:个)?人/.exec(text);
  if (m) return cn[m[1]];
  if (/带(?:上)?父母|一家三口|带爸妈/.test(text)) return 3;
  if (/带娃|带孩子|带小孩/.test(text)) return 3;
  if (/一个人|独自|单人/.test(text)) return 1;
  if (/情侣|两个人|二人|夫妻/.test(text)) return 2;
  return null;
}

/** 「七千」「一万二」「两万五」→ 数字 */
function cnMoney(raw: string): number | null {
  const s = raw.trim();
  const wan = /^([零一二两三四五六七八九十]+)万([一二三四五六七八九]千)?([一二三四五六七八九]百)?$/.exec(s);
  if (wan) {
    const base = cnNum(wan[1]);
    if (base == null) return null;
    const q = wan[2] ? (cnNum(wan[2][0]) ?? 0) * 1000 : 0;
    const b = wan[3] ? (cnNum(wan[3][0]) ?? 0) * 100 : 0;
    return base * 10000 + q + b;
  }
  const qian = /^([零一二两三四五六七八九十]+)千([一二三四五六七八九]百)?$/.exec(s);
  if (qian) {
    const base = cnNum(qian[1]);
    if (base == null) return null;
    return base * 1000 + (qian[2] ? (cnNum(qian[2][0]) ?? 0) * 100 : 0);
  }
  const bare = cnNum(s);
  return bare != null && bare >= 100 ? bare : null;
}

function parseBudget(text: string): number | null {
  let m = /预算\s*(?:只有|大概|约)?\s*(\d+(?:\.\d+)?)\s*(万|千|k|K)?/i.exec(text);
  if (!m) m = /(\d+(?:\.\d+)?)\s*(万|千|k|K)?\s*(?:块|元|人民币|¥)/i.exec(text);
  if (!m) m = /砍到\s*(\d+)/.exec(text);
  if (!m) {
    // 中文数字：预算七千 / 一万二
    const cm = /预算[^\d零一二两三四五六七八九十]{0,4}([零一二两三四五六七八九十]{1,6}[千万][一二三四五六七八九]?[百千]?)/.exec(text)
      ?? /([零一二两三四五六七八九十]{1,6}[千万][一二三四五六七八九]?[百千]?)\s*(?:块|元)/.exec(text);
    if (cm) return cnMoney(cm[1]);
    return null;
  }
  let n = Number(m[1]);
  if (m[2] === '万') n *= 10000;
  if (m[2] === '千' || /k/i.test(m[2] ?? '')) n *= 1000;
  return n;
}

function parseDays(text: string): number | null {
  const cn: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  let m = /(\d+)\s*(?:天|日游)/.exec(text);
  if (m) return Number(m[1]);
  m = /([一两二三四五六七八九十])\s*(?:天|日游)/.exec(text);
  if (m) return cn[m[1]];
  return null;
}

function parseStartDate(text: string): string | null {
  const year = new Date().getFullYear();
  const N = '\\d{1,2}|[一二三四五六七八九十]{1,3}';
  let m = /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/.exec(text);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;

  // 10月25日 / 十月二十五号 / 十月二十五
  m = new RegExp(`(${N})\\s*月\\s*(${N})\\s*[日号]?`).exec(text);
  if (m) {
    const mo = cnNum(m[1]);
    const dd = cnNum(m[2]);
    if (mo && dd && mo >= 1 && mo <= 12 && dd >= 1 && dd <= 31) {
      const d = `${year}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      return d < new Date().toISOString().slice(0, 10) ? `${year + 1}${d.slice(4)}` : d;
    }
  }

  // 只说了「二十五号」：按最近的将来那个月算
  m = new RegExp(`(${N})\\s*[日号]`).exec(text);
  if (m) {
    const dd = cnNum(m[1]);
    if (dd && dd >= 1 && dd <= 31) {
      const today = new Date();
      const base = new Date(today.getFullYear(), today.getMonth(), dd);
      if (base < new Date(today.getFullYear(), today.getMonth(), today.getDate())) base.setMonth(base.getMonth() + 1);
      return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
    }
  }

  m = /(\d{1,2})\/(\d{1,2})/.exec(text);
  if (m) {
    const d = `${year}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
    return d < new Date().toISOString().slice(0, 10) ? `${year + 1}${d.slice(4)}` : d;
  }
  if (/五一/.test(text)) return `${year + 1}-05-01`;
  if (/国庆/.test(text)) return `${year}-10-01` > new Date().toISOString().slice(0, 10) ? `${year}-10-01` : `${year + 1}-10-01`;
  if (/暑假/.test(text)) return `${year + 1}-07-15`;
  if (/寒假/.test(text)) return `${year + 1}-01-20`;

  const today = new Date();
  const dow = today.getDay();
  if (/后天/.test(text)) return addDays(today.toISOString().slice(0, 10), 2);
  if (/明天/.test(text)) return addDays(today.toISOString().slice(0, 10), 1);
  if (/下周/.test(text)) {
    const delta = ((8 - dow) % 7) || 7;
    return addDays(today.toISOString().slice(0, 10), delta);
  }
  if (/这周|本周|周末/.test(text)) {
    const delta = (6 - dow + 7) % 7 || 6;
    return addDays(today.toISOString().slice(0, 10), delta);
  }
  return null;
}

export function intake(text: string, base?: Partial<Meta>): IntakeResult {
  const notes: string[] = [];
  const missing: string[] = [];
  const days = parseDays(text);
  const budget = parseBudget(text);
  const travelers = parseCount(text);
  const explicitStart = parseStartDate(text);

  const origin = parseOrigin(text);

  // 「去 X」明确指出的目的地优先于全文命中的内置城市。
  // 「从杭州去临汾玩」：findCity(全文) 会命中内置的杭州，但那是出发地——真正的目的地
  // 临汾不在内置表里，按老逻辑会被整个丢掉，变成「杭州 → 杭州」。
  let city = findCity(text);
  const destFromText = parseDestinationName(text);
  if (city && destFromText && destFromText !== city.name && !looksLikePoi(destFromText)) {
    const destCity = findCity(destFromText);
    // 「去」的城市在内置表 → 用它；不在 → 交服务端现建城市包（dynamic）
    city = destCity;
  }

  // 内置没有这个城市时，先记下名字；服务端会用它现建城市包
  const destName = city ? city.name : destFromText;
  const start = explicitStart ?? addDays(new Date().toISOString().slice(0, 10), 14);
  if (!explicitStart) {
    notes.push('未指定出发日期，按两周后估算');
    missing.push('start_date');
  }
  const span = days ?? 3;
  if (!days) {
    notes.push('未说玩几天，先按 3 天排');
    missing.push('days');
  }
  const end = addDays(start, span - 1);

  if (!destName) missing.push('destination');
  // 出发地：不再默认深圳。没说就是没说，界面上让用户填
  if (!origin) {
    notes.push('未说从哪里出发，需要你补一下（城际交通要用）');
    missing.push('origin');
  }
  if (!budget) missing.push('budget');
  if (!travelers) missing.push('travelers');

  const interests = INTEREST_KEYWORDS.filter(([re]) => re.test(text)).map(([, tag]) => tag);
  const uniqueInterests = Array.from(new Set(interests));
  if (uniqueInterests.length === 0) {
    uniqueInterests.push('food', 'nature');
    notes.push('未识别到偏好，默认按「美食 + 自然」搭配');
  }

  let pace: Meta['pace'] = 'moderate';
  if (/轻松|不想太赶|别太累|慢节奏|带父母|带娃|走不动/.test(text)) pace = 'relaxed';
  if (/紧凑|暴走|能走|尽可能多|特种兵/.test(text)) pace = 'packed';

  const must = [...text.matchAll(/(?:一定要去|必须去|想去)\s*([\u4e00-\u9fa5A-Za-z0-9·]{2,10})/g)].map((m) => m[1]);
  const avoid = [...text.matchAll(/(?:不要去|不想去|避开)\s*([\u4e00-\u9fa5A-Za-z0-9·]{2,10})/g)].map((m) => m[1]);

  const meta: Meta = {
    destination: destName ?? base?.destination ?? '待定',
    city_code: city?.code ?? base?.city_code ?? `dynamic:${destName ?? 'unknown'}`,
    country: 'CN',
    start_date: start,
    end_date: end,
    timezone: 'Asia/Shanghai',
    travelers: { adults: travelers ?? 2, children: 0 },
    origin_city: origin ?? base?.origin_city ?? '',
    budget: { amount: budget ?? 5000, currency: 'CNY', includes_flights: false },
    pace,
    interests: uniqueInterests,
    mobility: /走不动|轮椅|老人/.test(text) ? 'limited' : 'normal',
    must_visit: must,
    avoid,
    source: { type: 'chat', file_ref: null },
  };

  if (!budget) notes.push('未给预算，暂按 ¥5,000 估算，可在下方直接改');
  if (!travelers) notes.push('未说明人数，暂按 2 人估算');
  if (meta.mobility === 'limited') notes.push('识别到行动不便，节奏已调为轻松');

  return { meta, missing, notes };
}

export function describeMeta(meta: Meta): string {
  const dates = dateList(meta.start_date, meta.end_date);
  return `${meta.destination} · ${formatDateShort(meta.start_date)}–${formatDateShort(meta.end_date)} · ${dates.length} 天 · ${meta.travelers.adults} 人`;
}
