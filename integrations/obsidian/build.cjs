const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=__dirname,out=path.join(root,'plugin');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await esbuild.build({entryPoints:[path.join(root,'src/main.js')],outfile:path.join(out,'main.js'),bundle:true,platform:'node',format:'cjs',target:'es2022',external:['obsidian'],legalComments:'inline'});
 await esbuild.build({entryPoints:[path.join(root,'runtime/entry.ts')],outfile:path.join(out,'business-runtime.cjs'),bundle:true,platform:'node',format:'cjs',target:'es2022',plugins:[require('./runtime/instrumentation.cjs')()]});
 for(const name of ['styles.css','manifest.json','atlas-data.json'])fs.copyFileSync(path.join(root,'assets',name),path.join(out,name));
 fs.mkdirSync(path.join(out,'upstream-agent-display'),{recursive:true});
 fs.copyFileSync(path.join(root,'third_party/agent-display/LICENSE'),path.join(out,'upstream-agent-display/LICENSE'));
 console.log('已构建 Obsidian 插件：'+out);
})().catch(e=>{console.error(e);process.exitCode=1;});
