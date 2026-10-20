export interface Service {
  id: string;
  name: string;
  kind: string;
  desc: string;
  color: string;
  glyph: string;
  accountHint: string;
}

export interface Binding {
  id: string;
  connected: boolean;
  account: string;
  since: number;
  lastSync: number | null;
}

const KEY = 'wayfarer.bindings.v1';

export const SERVICES: Service[] = [
  {
    id: '12306',
    name: '铁路 12306',
    kind: '出行',
    desc: '同步车票与检票时间，行程里自动留出进出站缓冲',
    color: '#2f6fb0',
    glyph: '铁',
    accountHint: '12306 账号（手机号）',
  },
  {
    id: 'amap',
    name: '高德地图',
    kind: '地图',
    desc: '把每天的路线同步到高德，手机端可以直接导航',
    color: '#2f8f7a',
    glyph: '高',
    accountHint: '高德账号（手机号）',
  },
  {
    id: 'ctrip',
    name: '携程旅行',
    kind: '预订',
    desc: '同步酒店与门票订单，自动核对入住/入园时间',
    color: '#2f6fb0',
    glyph: '携',
    accountHint: '携程账号（手机号）',
  },
  {
    id: 'fliggy',
    name: '飞猪',
    kind: '预订',
    desc: '同步机票与酒店订单',
    color: '#d08a1f',
    glyph: '飞',
    accountHint: '飞猪账号（手机号）',
  },
  {
    id: 'umetrip',
    name: '航旅纵横',
    kind: '航班',
    desc: '同步航班动态，延误时自动顺延接机安排',
    color: '#b0453a',
    glyph: '航',
    accountHint: '航旅纵横账号（手机号）',
  },
  {
    id: 'calendar',
    name: '系统日历',
    kind: '日历',
    desc: '通过 .ics 订阅，行程变更后自动更新',
    color: '#4b5d8a',
    glyph: '历',
    accountHint: '日历账号',
  },
];

export function loadBindings(): Record<string, Binding> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Binding>;
  } catch {
    return {};
  }
}

export function saveBindings(map: Record<string, Binding>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function connect(map: Record<string, Binding>, id: string, account: string): Record<string, Binding> {
  const next = {
    ...map,
    [id]: { id, connected: true, account, since: Date.now(), lastSync: null },
  };
  saveBindings(next);
  return next;
}

export function disconnect(map: Record<string, Binding>, id: string): Record<string, Binding> {
  const next = { ...map };
  delete next[id];
  saveBindings(next);
  return next;
}

export function touchSync(map: Record<string, Binding>, id: string): Record<string, Binding> {
  if (!map[id]) return map;
  const next = { ...map, [id]: { ...map[id], lastSync: Date.now() } };
  saveBindings(next);
  return next;
}
