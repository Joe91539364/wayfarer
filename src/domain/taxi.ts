/**
 * 打车平台跳转。
 *
 * 只用**有公开文档的**唤起协议：
 *   高德   amapuri://route/plan/…        （高德 URI API）
 *   百度   baidumap://map/direction…     （百度地图 URI API）
 *   腾讯   qqmap://map/routeplan…        （腾讯位置服务 URI API）
 *   滴滴   diditaxi://                    （只用来唤起 App，目的地靠粘贴）
 *
 * 曹操 / T3 没有公开的唤起协议，这里不编一个假的 scheme 出来 ——
 * 它们的按钮是「打开官网 + 复制目的地」，并明确写在说明里。
 *
 * 坐标系：全站是 GCJ-02（高德/腾讯原生），百度要标明 coord_type=gcj02，不能直接喂 BD09。
 */

export interface TaxiPoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface TaxiApp {
  id: string;
  name: string;
  color: string;
  glyph: string;
  /** 有公开协议才有；没有就只给 web */
  scheme?: (from: TaxiPoint, to: TaxiPoint) => string;
  web: (from: TaxiPoint, to: TaxiPoint) => string;
  note: string;
}

const enc = encodeURIComponent;
const f6 = (n: number) => n.toFixed(6);
const label = (p: TaxiPoint, fallback: string) => p.name?.trim() || fallback;

export const TAXI_APPS: TaxiApp[] = [
  {
    id: 'amap',
    name: '高德打车',
    color: '#1a73e8',
    glyph: '高',
    scheme: (_f, to) =>
      `amapuri://route/plan/?dlat=${f6(to.lat)}&dlon=${f6(to.lng)}&dname=${enc(label(to, '目的地'))}&dev=0&t=0`,
    web: (_f, to) =>
      `https://m.amap.com/navi/?dest=${f6(to.lng)},${f6(to.lat)}&destName=${enc(label(to, '目的地'))}&hideRouteIcon=1`,
    note: '唤起高德 App 直接叫车；没装会打开高德网页版导航',
  },
  {
    id: 'didi',
    name: '滴滴出行',
    color: '#ff7a00',
    glyph: '滴',
    scheme: () => 'diditaxi://',
    web: () => 'https://www.didiglobal.com/',
    note: '只唤起 App（滴滴没有公开的目的地协议），进去把复制的地址粘到终点栏',
  },
  {
    id: 'baidu',
    name: '百度地图',
    color: '#2d6cdf',
    glyph: '百',
    scheme: (_f, to) =>
      `baidumap://map/direction?destination=latlng:${f6(to.lat)},${f6(to.lng)}|name:${enc(label(to, '目的地'))}&mode=driving&coord_type=gcj02&src=wayfarer`,
    web: (_f, to) =>
      `https://api.map.baidu.com/direction?destination=latlng:${f6(to.lat)},${f6(to.lng)}|name:${enc(label(to, '目的地'))}&mode=driving&coord_type=gcj02&output=html&src=wayfarer`,
    note: '已在链接里标注 coord_type=gcj02，不会把终点算偏',
  },
  {
    id: 'qq',
    name: '腾讯地图',
    color: '#0aa06e',
    glyph: '腾',
    scheme: (_f, to) =>
      `qqmap://map/routeplan?type=drive&tocoord=${f6(to.lat)},${f6(to.lng)}&to=${enc(label(to, '目的地'))}&policy=0&referer=wayfarer`,
    web: (_f, to) =>
      `https://apis.map.qq.com/uri/v1/routeplan?type=drive&to=${enc(label(to, '目的地'))}&tocoord=${f6(to.lat)},${f6(to.lng)}&referer=wayfarer`,
    note: '腾讯位置服务 URI API；微信里打开会在内置地图里规划',
  },
  {
    id: 'caocao',
    name: '曹操出行',
    color: '#3d5afe',
    glyph: '曹',
    web: () => 'https://www.caocao.com.cn/',
    note: '没有公开唤起协议，打开官网/小程序后粘贴目的地',
  },
  {
    id: 't3',
    name: 'T3 出行',
    color: '#e63946',
    glyph: 'T3',
    web: () => 'https://www.t3go.cn/',
    note: '没有公开唤起协议，打开官网/小程序后粘贴目的地',
  },
];

export function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve(ok);
  } catch {
    return Promise.resolve(false);
  }
}

/**
 * 唤起：先跳 scheme，1.2 秒后如果页面还在前台（说明没装 App），再开网页兜底。
 * 这是各家 App 通用的做法，比直接 `location.href = scheme` 体验好得多。
 */
export function launchApp(app: TaxiApp, from: TaxiPoint, to: TaxiPoint) {
  if (!app.scheme) {
    window.open(app.web(from, to), '_blank', 'noopener');
    return 'web' as const;
  }
  const started = Date.now();
  window.location.href = app.scheme(from, to);
  window.setTimeout(() => {
    if (document.visibilityState === 'visible' && Date.now() - started < 2400) {
      window.open(app.web(from, to), '_blank', 'noopener');
    }
  }, 1200);
  return 'scheme' as const;
}
