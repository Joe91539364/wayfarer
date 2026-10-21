const fs=require('node:fs'),path=require('node:path');
const arg=process.argv[2];if(!arg)throw Error('用法：node install.cjs "Obsidian 仓库路径"');
const vault=fs.realpathSync(arg);if(!fs.statSync(vault).isDirectory()||!fs.existsSync(path.join(vault,'.obsidian')))throw Error('请选择已有 .obsidian 目录的 Obsidian 仓库');
const id='wayfarer-workflow-atlas',dest=path.join(vault,'.obsidian/plugins',id),source=path.join(__dirname,'plugin');
if(!fs.existsSync(path.join(source,'main.js')))throw Error('请先运行 node build.cjs');
const allowed=['main.js','business-runtime.cjs','styles.css','manifest.json','atlas-data.json','upstream-agent-display/LICENSE'];
const backup=path.join(vault,'.obsidian/plugin-backups',id+'-'+new Date().toISOString().replace(/[:.]/g,'-'));
for(const rel of allowed){const target=path.join(dest,rel);if(fs.existsSync(target)){const b=path.join(backup,rel);fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(target,b);}fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(source,rel),target);}
const notes=path.join(__dirname,'assets/notes');
for(const item of fs.readdirSync(notes)){const target=path.join(vault,'行迹工作流',item);if(!fs.existsSync(target)){fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(notes,item),target);}}
const enabled=path.join(vault,'.obsidian/community-plugins.json');
if(fs.existsSync(enabled)){const ids=JSON.parse(fs.readFileSync(enabled,'utf8').replace(/^\uFEFF/,''));if(!Array.isArray(ids))throw Error('插件列表格式异常，请在 Obsidian 中手动启用插件');if(!ids.includes(id)){fs.copyFileSync(enabled,enabled+'.wayfarer-backup');ids.push(id);fs.writeFileSync(enabled,JSON.stringify(ids,null,2));}}
console.log('已安装到 '+dest+'；旧代码备份：'+backup+'。请在 Obsidian 中重新加载插件。运行历史与个人设置已保留。');
