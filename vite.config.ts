import { defineConfig } from 'vite';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 工作区在 Windows 上可能是一个目录联接（junction）。
// Vite 用字符串前缀判断文件是否在 root 内，联接路径会让它把源码当静态文件直接吐出（不做 TS/JSX 转译），
// 所以这里先 realpath 一下，拿到真实路径。
const root = realpathSync(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig({
  root,
  // 这里不挂 @vitejs/plugin-react：它注入的 react-refresh 预构建在本机沙箱里会触发
  // Vite 依赖优化器的 depsInfo 崩溃。JSX 交给 esbuild（tsconfig 里 jsx=react-jsx）转译即可。
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  optimizeDeps: {
    include: ['react', 'react-dom/client', 'react/jsx-runtime'],
  },
  // 把 /api 转给本地爬虫服务（npm run serve），这样 npm run dev 时也能一键抓取
  server: {
    port: 5273,
    host: '127.0.0.1',
    proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true } },
  },
  preview: { port: 4173, host: '127.0.0.1' },
  build: { outDir: 'dist', emptyOutDir: true },
  // 相对路径：dist 可以直接被任意静态服务器托管，也能在预览面板里打开
  base: './',
});
