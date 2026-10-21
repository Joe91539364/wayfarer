// Local WebGL renderer. Node coordinates, curved edges and guides share one 3D camera.
const VERT=`attribute vec3 aPosition; attribute vec4 aColor; attribute float aSize;
uniform vec2 uViewport; uniform vec2 uCenter; uniform float uBase; uniform float uYaw; uniform float uPitch; uniform float uDpr;
varying vec4 vColor; varying float vDepth;
void main(){float c=cos(uYaw),s=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);
vec3 p=vec3(aPosition.x*c+aPosition.z*s,aPosition.y,-aPosition.x*s+aPosition.z*c);
p=vec3(p.x,p.y*cp-p.z*sp,p.y*sp+p.z*cp);float dist=3.4-p.z;
vec2 center=vec2(uCenter.x/uViewport.x*2.0-1.0,1.0-uCenter.y/uViewport.y*2.0);
vec2 xy=vec2(p.x*2.0*uBase*3.4/uViewport.x,-p.y*2.0*uBase*3.4/uViewport.y);
gl_Position=vec4(xy+center*dist,1.01005*dist-0.201005,dist);
gl_PointSize=clamp(aSize*uDpr*3.4/dist,1.0,110.0*uDpr);vColor=aColor;vDepth=p.z;}`;
const FRAG=`precision mediump float;varying vec4 vColor;varying float vDepth;uniform float uPoints;uniform float uGlow;
void main(){vec4 c=vColor;float fog=clamp(0.76+vDepth*0.22,0.34,1.0);
if(uPoints>0.5){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;
if(uGlow>0.5){c.a*=exp(-r*3.5)*(1.0-smoothstep(0.55,1.0,r))*0.48;}else{float z=sqrt(1.0-r);vec3 n=vec3(p.x,-p.y,z);float light=max(0.0,dot(n,normalize(vec3(-0.5,0.65,1.0))));float spec=pow(max(0.0,dot(n,normalize(vec3(-0.35,0.4,1.3)))),26.0);c.rgb=c.rgb*(0.30+0.72*light)+vec3(spec*0.7);c.a*=1.0-smoothstep(0.82,1.0,r);}}
c.rgb*=fog;gl_FragColor=c;}`;
const color=(hex,alpha=1)=>{const n=parseInt(hex.replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,alpha];};
class SpatialRenderer{
 constructor(canvas){this.canvas=canvas;const gl=this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw Error('当前图形环境不支持三维渲染');
 const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const vs=shader(gl.VERTEX_SHADER,VERT),fs=shader(gl.FRAGMENT_SHADER,FRAG);this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));
 this.buffer=gl.createBuffer();this.attrs=['aPosition','aColor','aSize'].map(k=>gl.getAttribLocation(this.program,k));this.uniforms={};for(const k of ['uViewport','uCenter','uBase','uYaw','uPitch','uDpr','uPoints','uGlow'])this.uniforms[k]=gl.getUniformLocation(this.program,k);this.stats={frames:0};this.history=[];this.sceneSignature='';
 }
 build(data,visible,kind,colors){
 const groups=data.groups,allIndex=new Map(data.nodes.map((n,i)=>[n.id,i])),symbolList=data.nodes.filter(n=>n.layer==='symbol'||n.layer==='artifact'),symbolIndex=new Map(symbolList.map((n,i)=>[n.id,i]));const nodes=[],lookup=new Map();
 groups.forEach((group,gi)=>{const list=visible.filter(n=>n.group===group.id),angle=-Math.PI/2+gi*Math.PI/3;const symbols=list.filter(n=>n.layer==='symbol'),modules=list.filter(n=>n.layer==='code'),workflow=list.filter(n=>!['code','symbol'].includes(n.layer));
 list.forEach(n=>{let x,y,z;const i=allIndex.get(n.id)||0;
 if(kind==='radial'){
 if(n.layer==='symbol'||n.layer==='artifact'){const k=symbolIndex.get(n.id),h=1-2*(k+.5)/symbolList.length,a=k*2.39996323,r=n.category==='exception'?.89:n.category==='option'?.98:n.category==='input'?.58:n.category==='output'?.75:.66,s=Math.sqrt(1-h*h);x=r*s*Math.cos(a);y=r*h;z=r*s*Math.sin(a);}
 else if(n.layer==='code'){const k=modules.indexOf(n),a=angle+(k/Math.max(1,modules.length-1)-.5)*.85,h=Math.sin(k*2.39996+gi)*.62,s=Math.sqrt(1-h*h);x=Math.cos(a)*s*.98;y=h*.98;z=Math.sin(a)*s*.98;}
 else{const k=workflow.indexOf(n),a=angle+(k/Math.max(1,workflow.length-1)-.5)*.68,r=n.layer==='rule'?.98:.87;x=Math.cos(a)*r;y=Math.sin(k*1.7+gi)*.34;z=Math.sin(a)*r;}
 }else{const k=list.indexOf(n),u=k/Math.max(1,list.length-1),a=u*Math.PI*2,orbit=.30,center=.73;const localX=Math.cos(a)*orbit,localY=Math.sin(a)*orbit;const tilt=gi*.22-.5;
 x=Math.cos(angle)*center+localX*Math.cos(angle)-localY*Math.sin(angle)*Math.cos(tilt);
 y=localY*Math.sin(tilt)+Math.sin(a*2+gi)*.10;
 z=Math.sin(angle)*center+localX*Math.sin(angle)+localY*Math.cos(angle)*Math.cos(tilt);
 // Six real stage groups occupy separate tilted orbital rings.
 y+=(gi%2===0?-.21:.21);
 }
 const world={x,y,z},entry={node:n,world,index:i,color:({input:'#80cada',output:'#9bdbb7',exception:'#db9b76',option:'#bda3eb',value:'#d0d2bb'})[n.category]||colors.get(n.group)};nodes.push(entry);lookup.set(n.id,entry);
 });});
 const edges=data.edges.filter(e=>lookup.has(e.source)&&lookup.has(e.target)).map((e,i)=>{const a=lookup.get(e.source),b=lookup.get(e.target),bend=e.type==='flow'?.24:.10;return {e,a,b,seed:i*.61803398875,control:{x:(a.world.x+b.world.x)*.32,y:(a.world.y+b.world.y)*.32-bend,z:(a.world.z+b.world.z)*.32+Math.sin(i*2.4)*.13}};});
 const signature=nodes.map(n=>n.node.id).join('|');if(signature!==this.sceneSignature){this.resetEffects();this.sceneSignature=signature;}this.scene={nodes,edges,lookup,kind,groups};this.stats.nodes=nodes.length;this.stats.edges=edges.length;
 }
 resetEffects(){this.history=[];this.stats.trailSegments=0;}
 camera(viewport,yaw,pitch){const old=this.viewport;if(old&&['w','h','cx','cy','base','dpr'].some(k=>Math.abs(old[k]-viewport[k])>.01))this.resetEffects();this.viewport=viewport;this.yaw=yaw;this.pitch=pitch;this.cosYaw=Math.cos(yaw);this.sinYaw=Math.sin(yaw);this.cosPitch=Math.cos(pitch);this.sinPitch=Math.sin(pitch);}
 historicalPosition(p,pose){const c=pose.cy,s=pose.sy,cp=pose.cp,sp=pose.sp,x=p.x*c+p.z*s,z=-p.x*s+p.z*c,y=p.y*cp-z*sp,depth=p.y*sp+z*cp;const ca=this.cosYaw,sa=this.sinYaw,caP=this.cosPitch,saP=this.sinPitch,oldY=y*caP+depth*saP,oldZ=-y*saP+depth*caP;return {x:x*ca-oldZ*sa,y:oldY,z:x*sa+oldZ*ca};}
 project(p){const {cx,cy,base}=this.viewport,c=Math.cos(this.yaw),s=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);const x=p.x*c+p.z*s,z=-p.x*s+p.z*c,y=p.y*cp-z*sp,depth=p.y*sp+z*cp,scale=3.4/(3.4-depth);return {x:cx+x*base*scale,y:cy+y*base*scale,z:depth,scale};}
 at(edge,u){const a=edge.a.world,b=edge.b.world,c=edge.control,v=1-u;return {x:v*v*a.x+2*v*u*c.x+u*u*b.x,y:v*v*a.y+2*v*u*c.y+u*u*b.y,z:v*v*a.z+2*v*u*c.z+u*u*b.z};}
 paint({time,selected,hover,currentEdge,motion,trailsEnabled=true,effectStrength=1}){const gl=this.gl,v=this.viewport;if(!this.scene||!v)return;const {w,h,dpr,cx,cy,base}=v;if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);this.resetEffects();}gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.uniform2f(this.uniforms.uViewport,w,h);gl.uniform2f(this.uniforms.uCenter,cx,cy);gl.uniform1f(this.uniforms.uBase,base);gl.uniform1f(this.uniforms.uYaw,this.yaw);gl.uniform1f(this.uniforms.uPitch,this.pitch);gl.uniform1f(this.uniforms.uDpr,dpr);
 const vertices=[],lines=[],guides=[],halos=[],packets=[],trails=[],trailGlows=[],flowTails=[];const push=(arr,p,c,size=1)=>arr.push(p.x,p.y,p.z,...c,size);const seg=(arr,a,b,c)=>{push(arr,a,c);push(arr,b,c);};
 // Camera poses are bounded in time. Only geometric points leave trails; labels never accumulate.
 if(!motion||!trailsEnabled)this.resetEffects();else{this.history=this.history.filter(p=>time-p.time<=1.05&&time>=p.time);const last=this.history.at(-1);if(!last||time-last.time>=.035)this.history.push({time,yaw:this.yaw,pitch:this.pitch,cy:this.cosYaw,sy:this.sinYaw,cp:this.cosPitch,sp:this.sinPitch});if(this.history.length>28)this.history.shift();}
 // Three orthogonal great circles make volume visible without turning data into decorative nodes.
 for(let axis=0;axis<3;axis++)for(let k=0;k<96;k++){const point=i=>{const a=i/96*Math.PI*2,r=1.10;return axis===0?{x:Math.cos(a)*r,y:Math.sin(a)*r,z:0}:axis===1?{x:Math.cos(a)*r,y:0,z:Math.sin(a)*r}:{x:0,y:Math.cos(a)*r,z:Math.sin(a)*r};};seg(guides,point(k),point(k+1),color('#96b4b0',.19));}
 // Floor grid remains in world space and turns with the camera.
 for(let k=-6;k<=6;k++){const q=k*.22;seg(guides,{x:q,y:.99,z:-1.32},{x:q,y:.99,z:1.32},color('#739baf',.11));seg(guides,{x:-1.32,y:.99,z:q},{x:1.32,y:.99,z:q},color('#739baf',.11));}
 for(const n of this.scene.nodes){const high=n.node.id===selected||n.node.id===hover,active=n.node.state==='running',error=n.node.state==='error',size=high?5.3:n.node.layer==='artifact'?2.2:3.5,c=color(error?'#ff8b71':active?'#fff0c4':high?'#fff0c4':n.color,n.node.category==='exception'&&n.node.state==='idle'?.24:high||active?1:.94);push(vertices,n.world,c,size);if(effectStrength>0){const halo=[c[0],c[1],c[2],c[3]*effectStrength*(high||active||error?.9:.48)];push(halos,n.world,halo,size*(active?5:high?4:3.8));}
 if(trailsEnabled&&motion&&!(n.node.category==='exception'&&n.node.state==='idle')){let previous=null;for(let k=0;k<this.history.length;k++){const pose=this.history[k],age=time-pose.time,position=this.historicalPosition(n.world,pose),alpha=Math.pow(Math.max(0,1-age/1.05),1.7)*c[3]*(high||active ? .72 : .34);if(previous&&Math.hypot(position.x-previous.x,position.y-previous.y,position.z-previous.z)>.00005)seg(trails,previous,position,[c[0],c[1],c[2],alpha]);if(k%3===0&&effectStrength>0&&Math.hypot(position.x-n.world.x,position.y-n.world.y,position.z-n.world.z)>.0002)push(trailGlows,position,[c[0],c[1],c[2],alpha*.35*effectStrength],size*2.4);previous=position;}if(previous&&Math.hypot(previous.x-n.world.x,previous.y-n.world.y,previous.z-n.world.z)>.00005)seg(trails,previous,n.world,[c[0],c[1],c[2],c[3]*.4]);}}
 if(this.scene.kind==='radial'){push(vertices,{x:0,y:0,z:0},color('#edcf8e'),4.5);if(effectStrength>0)push(halos,{x:0,y:0,z:0},color('#edcf8e',effectStrength*.7),25);}
 for(let i=0;i<this.scene.edges.length;i++){const edge=this.scene.edges[i],high=edge.e.source===selected||edge.e.target===selected,flow=edge.e.type==='flow',active=currentEdge?.[0]===edge.e.source&&currentEdge?.[1]===edge.e.target,c=color(active?'#ffe3a4':high?edge.a.color:flow?'#d6ca9e':'#8db1bf',active?.95:high?.75:flow?.46:.23);let a=this.at(edge,0);for(let k=1;k<=8;k++){const b=this.at(edge,k/8);seg(lines,a,b,c);a=b;}
 if(motion&&(flow||i%11===0)){const u=(time*(active?.35:.10)+edge.seed)%1,tip=this.at(edge,u),headColor=active?'#fff4cd':edge.a.color;push(packets,tip,color(headColor,.95),active?3.5:2.0);if(effectStrength>0)push(halos,tip,color(headColor,.72*effectStrength),active?13:8);if(trailsEnabled){let previous=tip;for(let tail=1;tail<=15;tail++){const q=u-tail*(active?.011:.008);if(q<0)break;const at=this.at(edge,q),alpha=Math.pow(1-tail/16,1.8)*(active?.85:.50);seg(flowTails,previous,at,color(headColor,alpha));previous=at;}}}
 }
 const draw=(arr,type,points,glow=false)=>{if(!arr.length)return;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);const stride=32;for(let i=0;i<3;i++){const loc=this.attrs[i];gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,i===0?3:i===1?4:1,gl.FLOAT,false,stride,i===0?0:i===1?12:28);}gl.uniform1f(this.uniforms.uPoints,points?1:0);gl.uniform1f(this.uniforms.uGlow,glow?1:0);gl.drawArrays(type,0,arr.length/8);};
 gl.depthMask(true);draw(vertices,gl.POINTS,true);gl.depthMask(false);draw(guides,gl.LINES,false);draw(lines,gl.LINES,false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);draw(trails,gl.LINES,false);draw(flowTails,gl.LINES,false);draw(trailGlows,gl.POINTS,true,true);draw(halos,gl.POINTS,true,true);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);draw(packets,gl.POINTS,true);gl.depthMask(true);gl.flush();this.stats.frames++;this.stats.glError=gl.getError();this.stats.depthTest=gl.isEnabled(gl.DEPTH_TEST);this.stats.worldDepthRange=[Math.min(...this.scene.nodes.map(n=>n.world.z)),Math.max(...this.scene.nodes.map(n=>n.world.z))];this.stats.trailSegments=trails.length/16;this.stats.flowTailSegments=flowTails.length/16;this.stats.haloPoints=halos.length/8;this.stats.historyFrames=this.history.length;this.stats.effectStrength=effectStrength;
 return this.scene.nodes.map(n=>({...this.project(n.world),world:n.world,node:n.node,r:(n.node.layer==='symbol'?2.2:5)*this.project(n.world).scale}));
 }
 dispose(){const gl=this.gl;gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);gl.getExtension('WEBGL_lose_context')?.loseContext();this.canvas.remove();}
}
module.exports={SpatialRenderer};
