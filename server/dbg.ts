import { Net } from './net';
const net = new Net({ gapMs: 150, timeoutMs: 10000 });
const urls = [
  'https://www.cdmuseum.com/',
  'https://www.wuhouci.net.cn/',
  'https://www.dpm.org.cn/',
  'https://www.gly.cn/',
  'https://www.jinshasitemuseum.com/',
];
for (const u of urls) {
  try {
    const r = await net.get(u, { headers: { Accept: 'text/html' } });
    const ev = /(公告|通知|预约|门票|票价|限流|开放时间)/.test(r.body);
    const t = /<title>([^<]*)<\/title>/i.exec(r.body)?.[1]?.trim();
    console.log(r.status, String(r.body.length).padStart(7), ev ? 'KEY' : '   ', (t ?? '').slice(0, 24), u);
  } catch (e) {
    console.log('ERR', u, e instanceof Error ? e.message : e);
  }
}
