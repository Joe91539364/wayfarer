export interface PoiComment {
  id: string;
  poiId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  likes: number;
  mine?: boolean;
}

const AUTHORS = [
  '小林不在家', 'momo', '阿May', '一颗西柚', '陈走走', '鱼丸粗面',
  '拿铁不加糖', '南风', '荔枝味的夏天', '老周', '小满', '路过人间',
];

const TEMPLATES: Record<string, string[]> = {
  sight: [
    '早上九点前到基本没人，拍照随便摆。十点之后旅行团一到就挤了。',
    '比想象中大，穿双舒服的鞋。里面有几家店挺有意思，别只在主街走。',
    '夜景比白天好看太多，建议留到傍晚。灯一亮完全是另一个地方。',
    '门票不贵但里面消费偏高，水自己带一瓶。',
  ],
  nature: [
    '空气是真的好，走完全程大概两小时，中间有休息的亭子。',
    '建议早上来，光线好而且凉快。下午逆光拍出来发灰。',
    '带驱蚊水。植被密的地方蚊子不少。',
    '人少的时候很舒服，适合发呆。周末下午就别来了。',
  ],
  museum: [
    '免费但要提前预约，当天基本抢不到，记得提前三天。',
    '讲解器值得租，不然很多展品只能看个热闹。',
    '至少留三小时，走马观花会后悔。周一闭馆别白跑。',
    '空调很足，夏天进来避暑顺便看展，一举两得。',
  ],
  food: [
    '排队四十分钟，味道对得起等待。建议错峰，两点后基本不用等。',
    '本地人比游客多，价格实在。招牌那道必点。',
    '环境一般但出品稳定，适合当一顿正经饭，不适合拍照。',
    '分量比想象中大，两个人点三个菜就够了。',
  ],
  shopping: [
    '逛街可以，但别在这儿买特产，隔壁巷子便宜一半。',
    '晚上人多，白天反而好逛。店铺更新挺快的。',
    '建筑本身比店好看，拍照的人比买东西的多。',
    '停车很麻烦，建议地铁过来。',
  ],
  nightlife: [
    '九点之后才热闹，去早了没气氛。',
    '酒水价格中等，驻唱水平不错。适合坐一晚。',
    '人确实多，但氛围是好的。注意别穿太少，江边风大。',
    '适合朋友一起，一个人去会有点尴尬。',
  ],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function groupOf(category: string): keyof typeof TEMPLATES {
  if (category === 'museum') return 'museum';
  if (category === 'nature' || category === 'hiking') return 'nature';
  if (category === 'restaurant' || category === 'cafe') return 'food';
  if (category === 'shopping') return 'shopping';
  if (category === 'nightlife') return 'nightlife';
  return 'sight';
}

export function seedComments(poiId: string, name: string, category: string): PoiComment[] {
  const pool = TEMPLATES[groupOf(category)] ?? TEMPLATES.sight;
  const base = hash(poiId);
  const count = Math.min(pool.length, 3 + (base % 3));
  const out: PoiComment[] = [];
  const order = pool.map((_, i) => i).sort((a, b) => hash(`${poiId}:o:${a}`) - hash(`${poiId}:o:${b}`));
  for (let i = 0; i < count; i++) {
    const h = hash(`${poiId}:${i}`);
    const text = pool[order[i]];
    const author = AUTHORS[(h >> 3) % AUTHORS.length];
    const rating = 3 + ((h >> 7) % 3);
    const month = 5 + ((h >> 11) % 5);
    const day = 1 + ((h >> 13) % 27);
    out.push({
      id: `${poiId}-seed-${i}`,
      poiId,
      author,
      rating,
      text: i === 0 ? `${name}：${text}` : text,
      date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      likes: (h >> 17) % 42,
    });
  }
  return out.sort((a, b) => b.likes - a.likes);
}

const KEY = 'wayfarer.comments.v1';
const LIKE_KEY = 'wayfarer.comments.liked.v1';

type Store = Record<string, PoiComment[]>;

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store;
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function loadUserComments(poiId: string): PoiComment[] {
  return read()[poiId] ?? [];
}

export function addUserComment(poiId: string, text: string, rating: number, author = '我'): PoiComment {
  const store = read();
  const comment: PoiComment = {
    id: `${poiId}-mine-${Date.now()}`,
    poiId,
    author,
    rating,
    text,
    date: new Date().toISOString().slice(0, 10),
    likes: 0,
    mine: true,
  };
  store[poiId] = [comment, ...(store[poiId] ?? [])];
  write(store);
  return comment;
}

export function deleteUserComment(poiId: string, id: string) {
  const store = read();
  store[poiId] = (store[poiId] ?? []).filter((c) => c.id !== id);
  write(store);
}

export function loadLiked(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LIKE_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function saveLiked(ids: string[]) {
  try {
    localStorage.setItem(LIKE_KEY, JSON.stringify(ids));
  } catch {
    /* quota */
  }
}
