/*!
 * Paper engineering flywheel adapted from cyberdaddyleo/agent-display, MIT.
 * Copyright (c) 2026 cyberdaddy. See upstream-agent-display/LICENSE.
 * Upstream commit: b2f6cece9e3010b6a2fa09410b754101d87b9a0f.
 * This integration replaces all simulated tasks, code, token and cost samples
 * with Wayfarer's actual phase records, field values and verifier outputs.
 */
const {STAGES,chinese,brief}=require('./semantic-model');
const {pickOutput,outputKey}=require('./output-hit-test');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TAU=Math.PI*2,SPIN=.16,FONT='"Microsoft YaHei","PingFang SC",monospace';
const hash=s=>{let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0)/4294967296;};
const wrapPI=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
const rgba=(hex,a)=>{const x=parseInt(hex.slice(1),16);return `rgba(${x>>16&255},${x>>8&255},${x&255},${a})`;};
function flatten(value,prefix='',limit=120){const rows=[];const visit=(v,path,depth)=>{if(rows.length>=limit)return;if(v==null||typeof v!=='object'){rows.push({path,payload:v,value:v==null?'空值':typeof v==='boolean'?(v?'是':'否'):String(v),text:path+'：'+(typeof v==='boolean'?(v?'是':'否'):String(v??'空值'))});return;}const entries=Array.isArray(v)?v.map((x,i)=>['第'+(i+1)+'项',x]):Object.entries(v);if(!entries.length){rows.push({path,payload:v,value:'空',text:path+'：空'});return;}if(depth>=4){rows.push({path,payload:v,value:brief(v),text:path+'：'+brief(v)});return;}for(const [k,x]of entries)visit(x,path?path+' / '+k:k,depth+1);};visit(chinese(value),prefix,0);return rows;}
function createOpsBoard(view,host){
 host.innerHTML=`<div class="wf-ops-stage"><canvas tabindex="0" aria-label="工程全景：任务汇聚、真实输入输出环带和输出谱线"></canvas><div class="wf-ops-caption"><b>行迹 / 运行调度中心</b><span>真实任务汇聚 · 输入输出环带 · 输出谱线</span></div><div class="wf-ops-clock"></div><div class="wf-ops-legend">每条汇聚线与谱线均可追溯实际字段 · 拖动环带旋转 · 滚轮缩放 · 双击复位</div><button class="wf-ops-output-toggle">输出目录</button><aside class="wf-ops-output-directory" hidden><div><b>实际输出字段</b><button class="wf-ops-output-close" aria-label="关闭输出目录">×</button></div><input class="wf-ops-output-search" placeholder="搜索阶段 / 字段 / 值" aria-label="搜索实际输出"><div class="wf-ops-output-count"></div><div class="wf-ops-output-rows"></div></aside><aside class="wf-ops-inspector" hidden><button class="wf-ops-close" aria-label="关闭数据详情">×</button><b></b><pre></pre><button class="wf-ops-more">查看完整记录 ↓</button></aside></div><div class="wf-ops-monitors"><article><h3>任务汇聚 <span>实际阶段事件</span></h3><div class="wf-ops-feed"></div></article><article><h3>输入 / 输出 <span class="wf-ops-payload-caption">等待运行</span></h3><pre class="wf-ops-payload"></pre></article><article><h3>规则校验 <span>所选方案</span></h3><div class="wf-ops-checks"></div></article><article><h3>阶段耗时 <span>实测毫秒</span></h3><div class="wf-ops-durations"></div></article></div><div class="wf-ops-source">工程图视觉改编自 <a href="https://github.com/cyberdaddyleo/agent-display">赛博老爸 · agent-display</a>（MIT） · 当前内容来自本地真实运行，未接入云端用量统计</div>`;
 const canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),stage=host.querySelector('.wf-ops-stage'),inspector=host.querySelector('.wf-ops-inspector'),directory=host.querySelector('.wf-ops-output-directory');
 let W=1,H=1,DPR=1,G=null,T=null,hubs=[],blocks=[],streaks=[],pulses=[],blockFS=8,blockLH=10,hoverHub=-1,hoverRow=null,angle=0,lastTime=null,zoom=1,drag=null,dataKey='',model=null,layer=null,hitPoints=[],outputMarkers=[],outputRays=[],selectedOutputKey=null,hoveredOutputKey=null,outputQuery='',clockKey='';
 const stats={frames:0,sourceRows:0,outputRows:0,blocks:0,records:0,simulated:false,paused:false};
 const ax=(r,y)=>G.cx+Math.sqrt(Math.max(0,r*r-(y-G.cy)**2));
 const visAng=(r,pad)=>Math.asin(Math.min(1,(Math.max(G.cy,H-G.cy)+pad)/r));
 const qd=(c,q)=>{c.beginPath();c.moveTo(q.x1,q.y1);c.quadraticCurveTo(q.cx,q.cy,q.x2,q.y2);c.stroke();};
 const bez=(q,u)=>[(1-u)**2*q.x1+2*(1-u)*u*q.cx+u*u*q.x2,(1-u)**2*q.y1+2*(1-u)*u*q.cy+u*u*q.y2];
 const palette=()=>view.opsTheme==='paper'?{dark:false,bg:'#eeede8',band:'#eeede8',line:'#262824',hi:'#111713',hot:'#141a16',text:'#20271f',dim:'#767b70',error:'#a34933'}:{dark:true,bg:'#030905',band:'#041009',line:'#3bba83',hi:'#e0fff0',hot:'#68ffc0',text:'#a6edc9',dim:'#40795c',error:'#ffb184'};
 function layout(){const r=stage.getBoundingClientRect();if(r.width<10||r.height<10)return false;W=r.width;H=r.height;DPR=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);const narrow=W<850,R1=Math.max(H*(narrow?1.12:.94),W*(narrow?.57:.26))*zoom;G={cx:W*(narrow?.34:.37)-R1,cy:H*.51,R1,R2:R1+W*(narrow?.29:.235),narrow};buildGeometry();return true;}
 function stateModel(){const b=view.business,records=b.records||[],variants=b.variants||[],selected=b.selectedVariant||0;const key=[selected,b.busy,b.request,view.mode,view.query,view.focusGroup,view.opsTheme,...records.map(r=>r.plan+':'+r.stage+':'+r.state+':'+r.duration),...variants.map(v=>v.state+':'+v.name+':'+v.result?.verifyResult.errors.length)].join('|');if(key===dataKey)return false;dataKey=key;
 const filter=row=>{const stageId=STAGES[row.record?.stage]?.id,group=view.byId.get(stageId)?.group;return (!view.focusGroup||group===view.focusGroup)&&(!view.query||(row.text+' '+row.record?.name).toLowerCase().includes(view.query));};
 const businessRows=(value,prefix,limit)=>view.mode==='workflow'?[{path:prefix,value:brief(value),text:prefix+'：'+brief(value)}]:flatten(value,prefix,limit);const selectedRecords=records.filter(r=>r.plan===selected||r.plan===null);const sources=[0,1,2].map(plan=>{const rs=records.filter(r=>r.plan===plan||(r.plan===null&&plan===0));return rs.flatMap(record=>businessRows(record.input,'输入 · '+record.name,70).map(row=>({...row,record,plan}))).filter(filter).slice(0,180);});
 const outputs=selectedRecords.flatMap(record=>record.output==null?[]:businessRows(record.output,'输出 · '+record.name,100).map(row=>({...row,record,plan:selected}))).filter(filter).slice(0,650).map(row=>({...row,outputKey:outputKey(row)}));
 const descriptors=records.length?selectedRecords:Object.values(STAGES).map(s=>({name:s.name,input:view.byId.get(s.id)?.input,output:view.byId.get(s.id)?.output,state:'idle',id:s.id,definition:true}));
 model={records,variants,selected,selectedRecords,sources,outputs,descriptors,issues:b.issues.filter(i=>i.plan===null||i.plan===selected)};stats.sourceRows=sources.reduce((s,a)=>s+a.length,0);stats.outputRows=outputs.length;if(selectedOutputKey&&!outputs.some(row=>row.outputKey===selectedOutputKey)){selectedOutputKey=null;inspector.hidden=true;}if(hoveredOutputKey&&!outputs.some(row=>row.outputKey===hoveredOutputKey)){hoveredOutputKey=null;hoverRow=null;}renderOutputDirectory();stats.records=records.length;stats.variants=variants.filter(v=>v.result).length;T=palette();buildGeometry();renderMonitors();return true;}
 function buildGeometry(){if(!G||!model)return;T=palette();const {cx,cy,R1,R2,narrow}=G;hubs=[];hitPoints=[];
 for(let i=0;i<3;i++){const y=cy+H*[-.31,0,.31][i],x=ax(R1,y)-3,rows=model.sources[i],curves=rows.map((row,j)=>{const sx=12+hash(row.text+'x'+j)*Math.max(8,x-65),sy=20+hash(row.text+'y'+j)*(H-40);return {x1:sx,y1:sy,cx:x-(x-sx)*(.22+hash(j+'bend')*.18),cy:y+(sy-y)*.1,x2:x,y2:y+(hash(j+'dy')-.5)*2,row};});hubs.push({x,y,curves,plan:i});}
 layer=document.createElement('canvas');layer.width=canvas.width;layer.height=canvas.height;const c=layer.getContext('2d');c.setTransform(DPR,0,0,DPR,0,0);c.fillStyle=T.bg;c.fillRect(0,0,W,H);
 c.strokeStyle=T.line;for(const hub of hubs){for(const q of hub.curves){c.globalAlpha=T.dark?.27:.24;c.lineWidth=.55;qd(c,q);c.fillStyle=T.line;c.globalAlpha=.6;c.fillRect(q.x1-1,q.y1-1,1.6,1.6);hitPoints.push({x:q.x1,y:q.y1,kind:'row',row:q.row});}}
 c.globalAlpha=1;c.beginPath();c.arc(cx,cy,R2,0,TAU);c.arc(cx,cy,R1,0,TAU,true);c.fillStyle=T.band;c.fill();for(const radius of [R1,R2,R2-7]){c.beginPath();c.arc(cx,cy,radius,-Math.PI/2,Math.PI/2);c.strokeStyle=T.line;c.lineWidth=radius===R2-7?.6:1;c.globalAlpha=radius===R2-7?.26:.7;c.stroke();}c.globalAlpha=1;
 blockFS=narrow?6.5:8.5;blockLH=blockFS*1.38;blocks=[];for(let col=0;col<2;col++){const groups=[];for(const record of model.descriptors){const value=col?record.output:record.input,rows=view.mode==='workflow'?[{text:(col?'输出：':'输入：')+brief(value)}]:flatten(value,col?'输出':'输入',28),heading=(record.definition?'结构定义 · ':'')+record.name;for(let k=0;k<rows.length;k+=7)groups.push({lines:[heading,...rows.slice(k,k+7).map(x=>x.text)],record});}const count=groups.length||1;groups.forEach((group,j)=>{const maxLines=Math.max(2,Math.min(8,Math.floor((TAU*R1/count-7)/blockLH)));const lines=group.lines.slice(0,maxLines).map(s=>s.length>52?s.slice(0,51)+'…':s);blocks.push({type:'table',lines,h:lines.length*blockLH+4,th:(j+.5)/count*TAU,col,ind:0,seed:j,record:group.record});});}
 streaks=model.outputs.map((row,i)=>{const a=hash(row.path+row.value),content=Math.log2(row.text.length+1)/9;return {th:(i+.5)/Math.max(1,model.outputs.length)*TAU,off:18+3*a,f:Math.min(.98,.18+content*.72),b:Math.min(3,Math.floor(content*4)),hot:row.record.state==='error'||/错误|未解决/.test(row.path)&&row.value!=='0',d:[{p:a,len:6+row.text.length*.18,v:.055+a*.09}],row};});stats.blocks=blocks.length;stats.spectrumLines=streaks.length;stats.curves=hubs.reduce((sum,h)=>sum+h.curves.length,0);
 }
 function drawThreads(c,t){for(const hub of hubs){for(let i=0;i<hub.curves.length;i+=Math.max(1,Math.floor(hub.curves.length/28))){const q=hub.curves[i],u=(t*.17+hash(q.row.text))%1;if(!view.motionEnabled)continue;c.save();c.strokeStyle=T.dark?T.hi:T.line;c.globalAlpha=hub.plan===model.selected?.8:.37;c.lineWidth=T.dark?1.3:1.1;if(T.dark&&view.effectStrength){c.shadowColor=T.hot;c.shadowBlur=6*view.effectStrength;}c.beginPath();const tail=view.trailsEnabled?.075:.002;for(let k=0;k<=6;k++){const p=bez(q,Math.max(0,u-tail)+tail*k/6);k?c.lineTo(...p):c.moveTo(...p);}c.stroke();c.restore();}}}
 function drawHubLabels(c,t){for(let i=0;i<hubs.length;i++){const h=hubs[i],variant=model.variants[i],name=variant?.name||'待生成',state=variant?.state==='running'?'正在处理':variant?.state==='error'?'有阻断问题':variant?.result?'已完成':'等待需求',label='方案'+['一','二','三'][i]+' · '+name,x=h.x-24,y=h.y-15;c.font='600 11px '+FONT;c.textAlign='right';const width=c.measureText(label).width;c.fillStyle=T.bg;c.fillRect(x-width-8,y-11,width+16,21);c.strokeStyle=T.line;c.globalAlpha=.7;c.strokeRect(x-width-8,y-11,width+16,21);c.globalAlpha=1;c.fillStyle=variant?.state==='error'?T.error:T.text;c.fillText(label,x,y+3);c.font='8px '+FONT;c.fillStyle=T.dim;c.fillText(h.curves.length+' 个实际输入字段 · '+state,x,y+26);c.beginPath();c.arc(h.x,h.y,hoverHub===i?12:7,0,TAU);c.strokeStyle=T.dark?T.hot:T.line;c.lineWidth=hoverHub===i?1.5:.8;c.stroke();if(variant?.state==='running'){const age=(t*.8)%1;c.globalAlpha=1-age;c.beginPath();c.arc(h.x,h.y,10+age*25,0,TAU);c.stroke();c.globalAlpha=1;}}c.textAlign='left';}
 function markSelectedOutput(c,t){const key=hoveredOutputKey||selectedOutputKey,segment=outputMarkers.find(x=>x.key===key);if(segment){const row=segment.row,x=(segment.x1+segment.x2)/2,y=(segment.y1+segment.y2)/2;c.save();c.strokeStyle=T.dark?T.hi:'#935328';c.lineWidth=3;c.beginPath();c.moveTo(segment.x1,segment.y1);c.lineTo(segment.x2,segment.y2);c.stroke();c.lineWidth=.75;c.beginPath();c.arc(x,y,6,0,TAU);c.stroke();const label=row.record.name+' · '+row.path.split(' / ').slice(-2).join(' / ')+'：'+row.value.slice(0,28);c.font='9px '+FONT;const width=Math.min(W-30,c.measureText(label).width+12),tx=Math.max(10,Math.min(W-width-10,x+13)),ty=Math.max(37,Math.min(H-49,y-16));c.fillStyle=T.bg;c.globalAlpha=.96;c.fillRect(tx-4,ty-12,width,19);c.globalAlpha=1;c.fillStyle=T.text;c.textAlign='left';c.fillText(label,tx,ty,width-9);c.restore();}stats.outputMarkers=outputMarkers.length;stats.selectedOutputKey=selectedOutputKey;c.font='8px '+FONT;c.fillStyle=T.dim;c.textAlign='right';c.fillText(model.outputs.length+' 条实际输出 · 悬停短杠查看值 · 点击查看完整输出',W-20,H-40);c.textAlign='left';}
 function renderOutputDirectory(){if(!model)return;host.querySelector('.wf-ops-output-toggle').textContent='输出目录（'+model.outputs.length+'）';if(directory.hidden)return;const rows=model.outputs.filter(row=>(row.text+' '+row.record.name).toLowerCase().includes(outputQuery));host.querySelector('.wf-ops-output-count').textContent='显示 '+rows.length+' / '+model.outputs.length+' 个实际字段';const list=host.querySelector('.wf-ops-output-rows');list.innerHTML=rows.length?rows.map((row,i)=>`<button data-output-row="${i}" class="${row.outputKey===selectedOutputKey?'selected':''}"><b>${esc(row.record.name+' · '+row.path.split(' / ').slice(-2).join(' / '))}</b><span>${esc(row.value.slice(0,100))}</span></button>`).join(''):'<div class="wf-empty">没有匹配的实际输出。</div>';list.querySelectorAll('[data-output-row]').forEach(button=>button.onclick=()=>{const row=rows[+button.dataset.outputRow],current=model.outputs.find(x=>x.outputKey===row.outputKey);if(!current)return;const streak=streaks.find(x=>x.row.outputKey===current.outputKey);if(streak)angle=-streak.th;directory.hidden=true;hoveredOutputKey=null;hoverRow=null;openRecord(current.record,current);paint(view.motionClock);});}

 function paint(time){if(view.layoutMode!=='ops'||!host.isConnected||host.offsetWidth<10)return;const r=stage.getBoundingClientRect();if(!G||Math.abs(r.width-W)>.5||Math.abs(r.height-H)>.5)if(!layout())return;stateModel();if(!model||!layer)return;const delta=lastTime==null?0:Math.max(0,Math.min(.1,time-lastTime));lastTime=time;if(view.motionEnabled&&view.orbitEnabled&&!drag&&!hoveredOutputKey&&directory.hidden&&inspector.hidden)angle+=delta*SPIN;const wheelT=angle/SPIN,c=ctx;
 c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.drawImage(layer,0,0);c.setTransform(DPR,0,0,DPR,0,0);hitPoints=hitPoints.filter(p=>p.kind==='row');drawWheelStreaks(c,wheelT,view.motionEnabled&&!drag&&!hoveredOutputKey&&directory.hidden&&inspector.hidden?delta:0);if(view.effectStrength>0)drawBeam(c,wheelT);drawGears(c,wheelT);drawWheelMarks(c,wheelT);drawThreads(c,time);drawBlocks(c,wheelT);drawHubLabels(c,time);markSelectedOutput(c,wheelT);c.globalAlpha=1;stats.frames++;stats.angle=angle;stats.paused=!view.motionEnabled;stats.theme=view.opsTheme;stats.width=W;stats.height=H;
 const clock=new Date().toLocaleTimeString('zh-CN',{hour12:false});if(clock!==clockKey){clockKey=clock;host.querySelector('.wf-ops-clock').textContent=clock;}host.querySelector('.wf-ops-legend').textContent=model.records.length?'短杠一一对应实际输出 · 悬停看值 · 点击打开阶段输出 · 目录可搜索':'等待真实运行 · 当前仅显示流程输入输出定义';}
 function renderMonitors(){if(!model)return;const rows=model.selectedRecords;host.querySelector('.wf-ops-feed').innerHTML=rows.length?rows.slice(-8).map((r,i)=>`<button data-ops-record="${model.records.indexOf(r)}"><small>${String(i+1).padStart(2,'0')}</small><b>${esc(r.name)}</b><span>${r.state==='running'?'处理中':r.state==='error'?'异常':r.duration+'毫秒'}</span></button>`).join(''):'<div class="wf-empty">尚未运行，不填充模拟任务。</div>';host.querySelectorAll('[data-ops-record]').forEach(b=>b.onclick=()=>openRecord(model.records[+b.dataset.opsRecord]));
 const selected=view.business.selectedRecord||rows.at(-1);host.querySelector('.wf-ops-payload-caption').textContent=selected?.name||'等待运行';host.querySelector('.wf-ops-payload').textContent=selected?('输入：'+brief(selected.input)+'\n\n输出：'+brief(selected.output)+'\n\n'+JSON.stringify(chinese(selected.output),null,2)).slice(0,2200):'运行后显示实际输入、输出与异常。';
 const candidate=model.variants[model.selected],rules=candidate?.result?.itinerary.feasibility?.rules||[];host.querySelector('.wf-ops-checks').innerHTML=rules.length?rules.map(rule=>`<div class="${!rule.passed?'bad':rule.warnings?'warn':''}"><b>${esc(rule.title)}</b><span>${!rule.passed?'未通过':rule.warnings?rule.warnings+'项提醒':'通过'}${rule.covered===0?' · 未覆盖':''}</span></div>`).join(''):'<div class="wf-empty">等待真实校验结果。</div>';
 const max=Math.max(1,...rows.map(r=>r.duration||0));host.querySelector('.wf-ops-durations').innerHTML=Object.entries(STAGES).map(([stage,s])=>{const row=rows.find(r=>r.stage===stage);return `<div><span>${s.name}</span><i><em style="width:${row?.state==='done'?Math.max(2,(row.duration||0)/max*100):0}%"></em></i><small>${!row?'—':row.state==='running'?'处理中':row.duration}</small></div>`;}).join('');}
 function openRecord(record,row=null){if(!record)return;if(record.plan!=null&&record.plan!==view.business.selectedVariant)view.business.choose(record.plan);const actual=view.business.records.find(r=>r.plan===record.plan&&r.stage===record.stage);if(!actual)return;selectedOutputKey=row?.outputKey||null;view.business.selectedRecord=actual;view.select(actual.id);view.business.renderRecords();inspector.querySelector('b').textContent=actual.planName+' · '+actual.name;inspector.querySelector('pre').textContent=row?'字段：'+row.path+'\n\n实际值：\n'+JSON.stringify(Object.prototype.hasOwnProperty.call(row,'payload')?row.payload:row.value,null,2)+'\n\n所属方案：'+actual.planName+'\n所属阶段：'+actual.name:JSON.stringify(chinese({输入:actual.input,输出:actual.output}),null,2);inspector.hidden=false;directory.hidden=true;host.querySelector('.wf-ops-more').onclick=()=>{if(view.boardFocus){view.boardFocus=false;view.syncBoardLayout();view.saveEffects();}view.root.querySelector('.wf-detail').scrollIntoView({behavior:'smooth',block:'center'});};renderMonitors();renderOutputDirectory();}
 host.querySelector('.wf-ops-close').onclick=()=>{inspector.hidden=true;paint(view.motionClock);};host.querySelector('.wf-ops-output-toggle').onclick=()=>{directory.hidden=!directory.hidden;inspector.hidden=true;hoveredOutputKey=null;hoverRow=null;renderOutputDirectory();if(!directory.hidden)host.querySelector('.wf-ops-output-search').focus();};host.querySelector('.wf-ops-output-close').onclick=()=>{directory.hidden=true;canvas.focus();};host.querySelector('.wf-ops-output-search').oninput=e=>{outputQuery=e.target.value.trim().toLowerCase();renderOutputDirectory();};host.querySelector('.wf-ops-output-search').onkeydown=e=>{if(e.key==='Escape'){directory.hidden=true;canvas.focus();}};
 const pos=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const hitAt=p=>{const output=pickOutput(p,outputMarkers,outputRays);if(output)return output;let nearest=null,dist=8;for(const hit of hitPoints){const d=Math.hypot(hit.x-p.x,hit.y-p.y);if(d<dist){nearest=hit;dist=d;}}return nearest;};
 canvas.onpointerdown=e=>{const p=pos(e),hit=hitAt(p);drag={...p,angle,moved:false,hit};if(hit?.kind==='output')hoveredOutputKey=hit.key;canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{const p=pos(e);if(drag){const dx=p.x-drag.x;if(Math.hypot(dx,p.y-drag.y)>4){drag.moved=true;hoveredOutputKey=null;hoverRow=null;angle=drag.angle+dx*.005;paint(view.motionClock);}return;}hoverHub=hubs.findIndex(h=>Math.hypot(h.x-p.x,h.y-p.y)<28);hoverRow=hitAt(p);hoveredOutputKey=hoverRow?.kind==='output'?hoverRow.key:null;canvas.style.cursor=hoverHub>=0||hoverRow?'pointer':'grab';const tip=view.root.querySelector('.wf-tooltip');tip.classList.toggle('wf-output-tooltip',!!hoveredOutputKey);if(hoverRow){const root=view.root.getBoundingClientRect(),row=hoverRow.row;tip.textContent=hoveredOutputKey?row.record.planName+'｜'+row.record.name+'\n'+row.path+'\n实际值：'+row.value.slice(0,140):row.text.slice(0,140);tip.style.left=Math.max(8,Math.min(root.width-410,e.clientX-root.left+12))+'px';tip.style.top=Math.max(12,e.clientY-root.top-45)+'px';tip.style.display='block';}else tip.style.display='none';paint(view.motionClock);};
 canvas.onpointerup=e=>{if(drag&&!drag.moved){const p=pos(e),index=hubs.findIndex(h=>Math.hypot(h.x-p.x,h.y-p.y)<32);if(index>=0&&model.variants[index]?.result)view.business.choose(index);else if(drag.hit)openRecord(drag.hit.row.record,drag.hit.row);}drag=null;};canvas.onpointercancel=()=>{drag=null;hoveredOutputKey=null;};canvas.onpointerleave=()=>{hoverHub=-1;hoverRow=null;hoveredOutputKey=null;view.root.querySelector('.wf-tooltip').style.display='none';};canvas.onwheel=e=>{e.preventDefault();hoveredOutputKey=null;hoverRow=null;zoom=Math.max(.72,Math.min(1.35,zoom*(e.deltaY<0?1.06:1/1.06)));layout();paint(view.motionClock);};canvas.ondblclick=()=>reset();canvas.onkeydown=e=>{if(e.key==='Escape'){inspector.hidden=true;directory.hidden=true;selectedOutputKey=null;hoveredOutputKey=null;view.root.querySelector('.wf-tooltip').style.display='none';paint(view.motionClock);}if(e.key==='Enter'&&hoverRow){e.preventDefault();openRecord(hoverRow.row.record,hoverRow.row);}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();hoveredOutputKey=null;angle+=e.key==='ArrowLeft'?-.1:.1;paint(view.motionClock);}};

 function reset(){selectedOutputKey=null;hoveredOutputKey=null;hoverRow=null;inspector.hidden=true;directory.hidden=true;angle=0;zoom=1;lastTime=view.motionClock;layout();paint(view.motionClock);}
 const observer=new ResizeObserver(()=>{if(view.layoutMode==='ops'){layout();paint(view.motionClock);}});observer.observe(stage);
 const BA=[.09,.17,.27,.4];
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function drawBlocks(c, t){
  const {cx, cy, R1, R2} = G, rot = t * SPIN, band = R2 - R1, thVis = visAng(R1, 50);
  c.font = `500 ${blockFS}px ${FONT}`; c.textBaseline = 'top';
  for (const b of blocks) {
    const th = wrapPI(b.th + rot);
    if (th > thVis || th < -thVis) continue;
    const x0 = R1 + 14 + (b.col ? band * 0.5 : 0) + b.ind * band * 0.04;
    const maxW = b.col || G.narrow ? Math.max(12, R2 - (G.narrow ? 34 : 54) - x0) : band * 0.45;
    const y = -b.h / 2;
    c.save(); c.translate(cx, cy); c.rotate(th);
    if (b.type === 'bars') {
      const rr = mulberry32(b.seed); c.fillStyle = T.text; c.globalAlpha = 0.9;
      for (let i = 0; i < b.lines.length; i++) { let x = x0; const lim = x0 + Math.min(maxW, G.narrow ? 34 : 64); while (x < lim) { const w = 2 + rr() * 9; if (rr() < 0.62) c.fillRect(x, y + 2 + i * blockLH, Math.min(w, lim - x), blockLH * 0.55); x += w + 1.5; } }
    } else {
      const hi = b.type === 'code' ? 1 + (((t * 0.6) | 0) + b.seed) % (b.lines.length - 1) : -1;
      for (let i = 0; i < b.lines.length; i++) {
        const ly = y + 2 + i * blockLH;
        if (i === hi) {
          const tw = Math.min(maxW, c.measureText(b.lines[i]).width) + 4;
          c.globalAlpha = 1; c.fillStyle = T.text; c.fillRect(x0 - 2, ly - 1, tw, blockLH); c.fillStyle = T.band;
        } else {
          c.fillStyle = T.text; c.globalAlpha = i === 0 && b.type !== 'table' && b.type !== 'grid' ? 1 : b.type === 'code' ? 0.8 : 0.62;
        }
        c.fillText(b.lines[i], x0, ly, maxW);
      }
    }
    c.restore();
  }
  c.globalAlpha = 1;
}


function drawWheelMarks(c, t){
  const {cx, cy, R1, R2, narrow} = G, rot = t * SPIN;
  const p = new Path2D(), s1 = 6 / R1, t1 = visAng(R1, 12);
  for (let k = Math.ceil((-t1 - rot) / s1), e = Math.floor((t1 - rot) / s1); k <= e; k++) {
    const a = k * s1 + rot, l = k % 5 === 0 ? 9 : 4, ca = Math.cos(a), sa = Math.sin(a);
    p.moveTo(cx + ca * (R1 + 2), cy + sa * (R1 + 2)); p.lineTo(cx + ca * (R1 + 2 + l), cy + sa * (R1 + 2 + l));
  }
  c.strokeStyle = T.line; c.globalAlpha = 0.7; c.lineWidth = 0.8; c.stroke(p);
  const q = new Path2D(), s2 = 3.2 / R2, t2 = visAng(R2, 12);
  for (let k = Math.ceil((-t2 - rot) / s2), e = Math.floor((t2 - rot) / s2); k <= e; k++) {
    const a = k * s2 + rot, l = k % 10 === 0 ? 8 : 3, ca = Math.cos(a), sa = Math.sin(a);
    q.moveTo(cx + ca * (R2 - 1), cy + sa * (R2 - 1)); q.lineTo(cx + ca * (R2 - 1 - l), cy + sa * (R2 - 1 - l));
  }
  c.globalAlpha = 0.55; c.lineWidth = 0.7; c.stroke(q);
  const s3 = (narrow ? 34 : 46) / R2;
  c.globalAlpha = 1; c.fillStyle = T.dim; c.font = `${narrow ? 6 : 8}px ${FONT}`; c.textAlign = 'right'; c.textBaseline = 'middle';
  for (let k = Math.ceil((-t2 - rot) / s3), e = Math.floor((t2 - rot) / s3); k <= e; k++) {
    c.save(); c.translate(cx, cy); c.rotate(k * s3 + rot); c.fillText(`${((Math.round(k * s3 / TAU * 360) % 360) + 360) % 360}°`, R2 - 13, 0); c.restore();
  }
  c.textAlign = 'left';
}


function drawWheelStreaks(c, t, dt){
  const {cx, cy, R2} = G, rot = t * SPIN, thVis = visAng(R2, 30);
  outputMarkers=[];outputRays=[];
  const base = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], hotP = new Path2D(), dashP = new Path2D(), hotD = new Path2D();
  for (const s of streaks) {
    const th = wrapPI(s.th + rot);
    if (th > thVis || th < -thVis) continue;
    const cp = Math.cos(th), sp = Math.sin(th), r0 = R2 + s.off, x0 = cx + cp * r0, y0 = cy + sp * r0;
    const reach = Math.max(40, (W + 20 - x0) / Math.max(0.2, cp)), L = Math.min(reach, s.f * reach);
    const p = s.hot ? hotP : base[s.b];
    p.moveTo(x0, y0); p.lineTo(x0 + cp * L, y0 + sp * L);
    outputRays.push({kind:'output',key:s.row.outputKey,row:s.row,x1:x0,y1:y0,x2:x0+cp*L,y2:y0+sp*L});
    const q = s.hot ? hotD : dashP;
    for (const d of s.d) {
      if (d.v) d.p = (d.p + d.v * dt) % 1;
      const a0 = d.p * L, a1 = Math.min(L, a0 + d.len);
      q.moveTo(x0 + cp * a0, y0 + sp * a0); q.lineTo(x0 + cp * a1, y0 + sp * a1);
      outputMarkers.push({kind:'output',key:s.row.outputKey,row:s.row,x1:x0+cp*a0,y1:y0+sp*a0,x2:x0+cp*a1,y2:y0+sp*a1});
    }
  }
  c.lineCap = 'butt'; c.strokeStyle = T.line; c.lineWidth = 0.7;
  const A = T.dark ? 1.3 : 1;
  base.forEach((p, i) => { c.globalAlpha = Math.min(0.9, BA[i] * A); c.stroke(p); });
  if (T.dark && view.effectStrength > 0) {
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = T.hot; c.globalAlpha = 0.1; c.lineWidth = 4.5; c.stroke(hotP);
    c.globalAlpha = 0.6; c.lineWidth = 0.9; c.stroke(hotP);
    c.globalAlpha = 0.12; c.strokeStyle = T.hi; c.lineWidth = 5; c.stroke(dashP);
    c.globalAlpha = 0.9; c.lineWidth = 1.6; c.stroke(dashP);
    c.strokeStyle = T.hot; c.globalAlpha = 0.3; c.lineWidth = 7; c.stroke(hotD);
    c.strokeStyle = T.hi; c.globalAlpha = 1; c.lineWidth = 2; c.stroke(hotD);
    c.globalCompositeOperation = 'source-over';
  } else {
    c.strokeStyle = T.hot; c.globalAlpha = 0.5; c.lineWidth = 0.8; c.stroke(hotP);
    c.strokeStyle = T.line; c.globalAlpha = 0.8; c.lineWidth = 1.5; c.stroke(dashP);
    c.strokeStyle = T.hot; c.globalAlpha = 0.95; c.lineWidth = 2; c.stroke(hotD);
  }
  c.globalAlpha = 1;
}


function drawBeam(c, t){
  const {cx, cy, R1} = G, a = wrapPI(t * 0.85), w = 0.24, tv = visAng(R1, 40);
  if (a < -tv || a - w > tv) return;
  const far = W * 2, col = T.dark ? T.hot : T.line;
  c.save();
  c.beginPath(); c.moveTo(cx + Math.cos(a - w) * R1, cy + Math.sin(a - w) * R1);
  c.arc(cx, cy, far, a - w, a); c.arc(cx, cy, R1, a, a - w, true); c.closePath();
  if (c.createConicGradient) {
    const g = c.createConicGradient(a - w, cx, cy), f = w / TAU;
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(f * 0.97, rgba(col, T.dark ? 0.2 : 0.07)); g.addColorStop(f, rgba(col, 0)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
  } else { c.fillStyle = rgba(col, T.dark ? 0.08 : 0.03); }
  if (T.dark) c.globalCompositeOperation = 'lighter';
  c.fill();
  c.beginPath(); c.moveTo(cx + Math.cos(a) * R1, cy + Math.sin(a) * R1); c.lineTo(cx + Math.cos(a) * far, cy + Math.sin(a) * far);
  c.strokeStyle = col; c.globalAlpha = T.dark ? 0.55 : 0.35; c.lineWidth = 1; c.stroke();
  c.restore();
}


function drawGears(c, t){
  const {cx, cy, R1, R2} = G;
  const ro = -t * SPIN * 2.6, r0 = R2 + 5, r1 = R2 + 12, n = Math.round(TAU * R2 / 9), st = TAU / n, tv = visAng(R2, 30);
  const p = new Path2D();
  for (let k = Math.ceil((-tv - ro) / st), e = Math.floor((tv - ro) / st); k <= e; k++) {
    const m = ((k % 7) + 7) % 7; if (m === 3 || m === 6) continue;
    const a = k * st + ro, a2 = a + st * (m === 0 ? 0.85 : 0.45);
    p.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); p.arc(cx, cy, r0, a, a2); p.arc(cx, cy, r1, a2, a, true); p.closePath();
  }
  const ri = R1 - 9, si = TAU / Math.round(TAU * R1 / 7), ti = visAng(R1, 30), roi = -t * SPIN * 1.6;
  const q = new Path2D();
  for (let k = Math.ceil((-ti - roi) / si), e = Math.floor((ti - roi) / si); k <= e; k++) {
    if (((k % 9) + 9) % 9 > 5) continue;
    const a = k * si + roi; q.moveTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri); q.arc(cx, cy, ri, a, a + si * 0.55);
  }
  if (T.dark && view.effectStrength > 0) {
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = T.hot; c.globalAlpha = 0.85; c.fill(p);
    c.strokeStyle = T.hot; c.globalAlpha = 0.18; c.lineWidth = 6; c.stroke(p);
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = T.line; c.globalAlpha = 0.8; c.lineWidth = 2; c.stroke(q);
  } else {
    c.fillStyle = T.line; c.globalAlpha = 0.8; c.fill(p);
    c.strokeStyle = T.line; c.globalAlpha = 0.6; c.lineWidth = 2; c.stroke(q);
  }
  c.globalAlpha = 1;
}


 return {stats,canvas,update(){if(view.layoutMode!=='ops')return;stateModel();paint(view.motionClock);},paint,reset,get geometry(){return G;},get model(){return model;},get hits(){return hitPoints;},get outputMarkers(){return outputMarkers;},get outputRays(){return outputRays;},get selectedOutputKey(){return selectedOutputKey;},hitTest:hitAt,dispose(){observer.disconnect();for(const event of ['onpointerdown','onpointermove','onpointerup','onpointercancel','onpointerleave','onwheel','ondblclick','onkeydown'])canvas[event]=null;inspector.hidden=true;}};
}
module.exports={createOpsBoard,flatten};
