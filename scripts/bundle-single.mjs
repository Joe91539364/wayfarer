import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

// 把 dist 里的 JS/CSS 内联成一个单文件 HTML。
// 原因：预览面板只托管单个 HTML 文件，不会带上 assets/ 目录，
// 用外链资源时页面会是白屏。
const dist = new URL('../dist/', import.meta.url);
const assets = readdirSync(new URL('assets/', dist));
const jsFile = assets.find((f) => f.endsWith('.js'));
const cssFile = assets.find((f) => f.endsWith('.css'));
if (!jsFile || !cssFile) {
  throw new Error('dist/assets 里找不到 js/css，先跑 vite build');
}

const js = readFileSync(new URL(`assets/${jsFile}`, dist), 'utf8');
const css = readFileSync(new URL(`assets/${cssFile}`, dist), 'utf8');
let html = readFileSync(new URL('index.html', dist), 'utf8');

// 单文件里 fetch('./catalog.json') 会失败（file:// 下没有同源服务器），
// 所以把最近一次爬虫的结果直接注入成全局变量，让前端离线也能看到真数据。
const readJson = (name) => {
  const f = new URL(name, dist);
  if (!existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};
const catalog = readJson('catalog.json');
const report = readJson('crawl-report.json');
const official = readJson('official.json');

const inject =
  `<script>window.__CATALOG__=${JSON.stringify(catalog)};` +
  `window.__CRAWL_REPORT__=${JSON.stringify(report)};` +
  `window.__OFFICIAL__=${JSON.stringify(official)};</script>\n`;

html = html
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>\s*/g, '')
  .replace(/<link[^>]*rel="stylesheet"[^>]*>\s*/g, '');

// 用函数式替换，避免 JS 代码里的 $& / $' 被当成替换模式
html = html.replace(
  '</head>',
  () => `<link rel="icon" href="data:," />\n<style>\n${css}\n</style>\n${inject}</head>`,
);
html = html.replace(
  '</body>',
  () => `<script type="module">\n${js}\n</script>\n</body>`,
);

writeFileSync(new URL('standalone.html', dist), html, 'utf8');
console.log(
  `dist/standalone.html  ${(html.length / 1024).toFixed(0)} KB` +
    `（已内联 ${jsFile} + ${cssFile}${catalog ? ' + catalog 快照' : ''}）`,
);
