"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/renderer3d.js
var require_renderer3d = __commonJS({
  "src/renderer3d.js"(exports2, module2) {
    "use strict";
    var VERT = `attribute vec3 aPosition; attribute vec4 aColor; attribute float aSize;
uniform vec2 uViewport; uniform vec2 uCenter; uniform float uBase; uniform float uYaw; uniform float uPitch; uniform float uDpr;
varying vec4 vColor; varying float vDepth;
void main(){float c=cos(uYaw),s=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);
vec3 p=vec3(aPosition.x*c+aPosition.z*s,aPosition.y,-aPosition.x*s+aPosition.z*c);
p=vec3(p.x,p.y*cp-p.z*sp,p.y*sp+p.z*cp);float dist=3.4-p.z;
vec2 center=vec2(uCenter.x/uViewport.x*2.0-1.0,1.0-uCenter.y/uViewport.y*2.0);
vec2 xy=vec2(p.x*2.0*uBase*3.4/uViewport.x,-p.y*2.0*uBase*3.4/uViewport.y);
gl_Position=vec4(xy+center*dist,1.01005*dist-0.201005,dist);
gl_PointSize=clamp(aSize*uDpr*3.4/dist,1.0,110.0*uDpr);vColor=aColor;vDepth=p.z;}`;
    var FRAG = `precision mediump float;varying vec4 vColor;varying float vDepth;uniform float uPoints;uniform float uGlow;
void main(){vec4 c=vColor;float fog=clamp(0.76+vDepth*0.22,0.34,1.0);
if(uPoints>0.5){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;
if(uGlow>0.5){c.a*=exp(-r*3.5)*(1.0-smoothstep(0.55,1.0,r))*0.48;}else{float z=sqrt(1.0-r);vec3 n=vec3(p.x,-p.y,z);float light=max(0.0,dot(n,normalize(vec3(-0.5,0.65,1.0))));float spec=pow(max(0.0,dot(n,normalize(vec3(-0.35,0.4,1.3)))),26.0);c.rgb=c.rgb*(0.30+0.72*light)+vec3(spec*0.7);c.a*=1.0-smoothstep(0.82,1.0,r);}}
c.rgb*=fog;gl_FragColor=c;}`;
    var color = (hex, alpha = 1) => {
      const n = parseInt(hex.replace("#", ""), 16);
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, alpha];
    };
    var SpatialRenderer2 = class {
      constructor(canvas) {
        this.canvas = canvas;
        const gl = this.gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
        if (!gl) throw Error("\u5F53\u524D\u56FE\u5F62\u73AF\u5883\u4E0D\u652F\u6301\u4E09\u7EF4\u6E32\u67D3");
        const shader = (type, src) => {
          const s = gl.createShader(type);
          gl.shaderSource(s, src);
          gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
          return s;
        };
        const vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(this.program));
        this.buffer = gl.createBuffer();
        this.attrs = ["aPosition", "aColor", "aSize"].map((k) => gl.getAttribLocation(this.program, k));
        this.uniforms = {};
        for (const k of ["uViewport", "uCenter", "uBase", "uYaw", "uPitch", "uDpr", "uPoints", "uGlow"]) this.uniforms[k] = gl.getUniformLocation(this.program, k);
        this.stats = { frames: 0 };
        this.history = [];
        this.sceneSignature = "";
      }
      build(data, visible, kind, colors) {
        const groups = data.groups, allIndex = new Map(data.nodes.map((n, i) => [n.id, i])), symbolList = data.nodes.filter((n) => n.layer === "symbol" || n.layer === "artifact"), symbolIndex = new Map(symbolList.map((n, i) => [n.id, i]));
        const nodes = [], lookup = /* @__PURE__ */ new Map();
        groups.forEach((group, gi) => {
          const list = visible.filter((n) => n.group === group.id), angle = -Math.PI / 2 + gi * Math.PI / 3;
          const symbols = list.filter((n) => n.layer === "symbol"), modules = list.filter((n) => n.layer === "code"), workflow = list.filter((n) => !["code", "symbol"].includes(n.layer));
          list.forEach((n) => {
            let x, y, z;
            const i = allIndex.get(n.id) || 0;
            if (kind === "radial") {
              if (n.layer === "symbol" || n.layer === "artifact") {
                const k = symbolIndex.get(n.id), h = 1 - 2 * (k + 0.5) / symbolList.length, a = k * 2.39996323, r = n.category === "exception" ? 0.89 : n.category === "option" ? 0.98 : n.category === "input" ? 0.58 : n.category === "output" ? 0.75 : 0.66, s = Math.sqrt(1 - h * h);
                x = r * s * Math.cos(a);
                y = r * h;
                z = r * s * Math.sin(a);
              } else if (n.layer === "code") {
                const k = modules.indexOf(n), a = angle + (k / Math.max(1, modules.length - 1) - 0.5) * 0.85, h = Math.sin(k * 2.39996 + gi) * 0.62, s = Math.sqrt(1 - h * h);
                x = Math.cos(a) * s * 0.98;
                y = h * 0.98;
                z = Math.sin(a) * s * 0.98;
              } else {
                const k = workflow.indexOf(n), a = angle + (k / Math.max(1, workflow.length - 1) - 0.5) * 0.68, r = n.layer === "rule" ? 0.98 : 0.87;
                x = Math.cos(a) * r;
                y = Math.sin(k * 1.7 + gi) * 0.34;
                z = Math.sin(a) * r;
              }
            } else {
              const k = list.indexOf(n), u = k / Math.max(1, list.length - 1), a = u * Math.PI * 2, orbit = 0.3, center = 0.73;
              const localX = Math.cos(a) * orbit, localY = Math.sin(a) * orbit;
              const tilt = gi * 0.22 - 0.5;
              x = Math.cos(angle) * center + localX * Math.cos(angle) - localY * Math.sin(angle) * Math.cos(tilt);
              y = localY * Math.sin(tilt) + Math.sin(a * 2 + gi) * 0.1;
              z = Math.sin(angle) * center + localX * Math.sin(angle) + localY * Math.cos(angle) * Math.cos(tilt);
              y += gi % 2 === 0 ? -0.21 : 0.21;
            }
            const world = { x, y, z }, entry = { node: n, world, index: i, color: { input: "#80cada", output: "#9bdbb7", exception: "#db9b76", option: "#bda3eb", value: "#d0d2bb" }[n.category] || colors.get(n.group) };
            nodes.push(entry);
            lookup.set(n.id, entry);
          });
        });
        const edges = data.edges.filter((e) => lookup.has(e.source) && lookup.has(e.target)).map((e, i) => {
          const a = lookup.get(e.source), b = lookup.get(e.target), bend = e.type === "flow" ? 0.24 : 0.1;
          return { e, a, b, seed: i * 0.61803398875, control: { x: (a.world.x + b.world.x) * 0.32, y: (a.world.y + b.world.y) * 0.32 - bend, z: (a.world.z + b.world.z) * 0.32 + Math.sin(i * 2.4) * 0.13 } };
        });
        const signature = nodes.map((n) => n.node.id).join("|");
        if (signature !== this.sceneSignature) {
          this.resetEffects();
          this.sceneSignature = signature;
        }
        this.scene = { nodes, edges, lookup, kind, groups };
        this.stats.nodes = nodes.length;
        this.stats.edges = edges.length;
      }
      resetEffects() {
        this.history = [];
        this.stats.trailSegments = 0;
      }
      camera(viewport, yaw, pitch) {
        const old = this.viewport;
        if (old && ["w", "h", "cx", "cy", "base", "dpr"].some((k) => Math.abs(old[k] - viewport[k]) > 0.01)) this.resetEffects();
        this.viewport = viewport;
        this.yaw = yaw;
        this.pitch = pitch;
        this.cosYaw = Math.cos(yaw);
        this.sinYaw = Math.sin(yaw);
        this.cosPitch = Math.cos(pitch);
        this.sinPitch = Math.sin(pitch);
      }
      historicalPosition(p, pose) {
        const c = pose.cy, s = pose.sy, cp = pose.cp, sp = pose.sp, x = p.x * c + p.z * s, z = -p.x * s + p.z * c, y = p.y * cp - z * sp, depth = p.y * sp + z * cp;
        const ca = this.cosYaw, sa = this.sinYaw, caP = this.cosPitch, saP = this.sinPitch, oldY = y * caP + depth * saP, oldZ = -y * saP + depth * caP;
        return { x: x * ca - oldZ * sa, y: oldY, z: x * sa + oldZ * ca };
      }
      project(p) {
        const { cx, cy, base } = this.viewport, c = Math.cos(this.yaw), s = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
        const x = p.x * c + p.z * s, z = -p.x * s + p.z * c, y = p.y * cp - z * sp, depth = p.y * sp + z * cp, scale = 3.4 / (3.4 - depth);
        return { x: cx + x * base * scale, y: cy + y * base * scale, z: depth, scale };
      }
      at(edge, u) {
        const a = edge.a.world, b = edge.b.world, c = edge.control, v = 1 - u;
        return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y, z: v * v * a.z + 2 * v * u * c.z + u * u * b.z };
      }
      paint({ time, selected, hover, currentEdge, motion, trailsEnabled = true, effectStrength = 1 }) {
        const gl = this.gl, v = this.viewport;
        if (!this.scene || !v) return;
        const { w, h, dpr, cx, cy, base } = v;
        if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
          this.canvas.width = Math.round(w * dpr);
          this.canvas.height = Math.round(h * dpr);
          this.resetEffects();
        }
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.uniform2f(this.uniforms.uViewport, w, h);
        gl.uniform2f(this.uniforms.uCenter, cx, cy);
        gl.uniform1f(this.uniforms.uBase, base);
        gl.uniform1f(this.uniforms.uYaw, this.yaw);
        gl.uniform1f(this.uniforms.uPitch, this.pitch);
        gl.uniform1f(this.uniforms.uDpr, dpr);
        const vertices = [], lines = [], guides = [], halos = [], packets = [], trails = [], trailGlows = [], flowTails = [];
        const push = (arr, p, c, size = 1) => arr.push(p.x, p.y, p.z, ...c, size);
        const seg = (arr, a, b, c) => {
          push(arr, a, c);
          push(arr, b, c);
        };
        if (!motion || !trailsEnabled) this.resetEffects();
        else {
          this.history = this.history.filter((p) => time - p.time <= 1.05 && time >= p.time);
          const last = this.history.at(-1);
          if (!last || time - last.time >= 0.035) this.history.push({ time, yaw: this.yaw, pitch: this.pitch, cy: this.cosYaw, sy: this.sinYaw, cp: this.cosPitch, sp: this.sinPitch });
          if (this.history.length > 28) this.history.shift();
        }
        for (let axis = 0; axis < 3; axis++) for (let k = 0; k < 96; k++) {
          const point = (i) => {
            const a = i / 96 * Math.PI * 2, r = 1.1;
            return axis === 0 ? { x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0 } : axis === 1 ? { x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r } : { x: 0, y: Math.cos(a) * r, z: Math.sin(a) * r };
          };
          seg(guides, point(k), point(k + 1), color("#96b4b0", 0.19));
        }
        for (let k = -6; k <= 6; k++) {
          const q = k * 0.22;
          seg(guides, { x: q, y: 0.99, z: -1.32 }, { x: q, y: 0.99, z: 1.32 }, color("#739baf", 0.11));
          seg(guides, { x: -1.32, y: 0.99, z: q }, { x: 1.32, y: 0.99, z: q }, color("#739baf", 0.11));
        }
        for (const n of this.scene.nodes) {
          const high = n.node.id === selected || n.node.id === hover, active = n.node.state === "running", error = n.node.state === "error", size = high ? 5.3 : n.node.layer === "artifact" ? 2.2 : 3.5, c = color(error ? "#ff8b71" : active ? "#fff0c4" : high ? "#fff0c4" : n.color, n.node.category === "exception" && n.node.state === "idle" ? 0.24 : high || active ? 1 : 0.94);
          push(vertices, n.world, c, size);
          if (effectStrength > 0) {
            const halo = [c[0], c[1], c[2], c[3] * effectStrength * (high || active || error ? 0.9 : 0.48)];
            push(halos, n.world, halo, size * (active ? 5 : high ? 4 : 3.8));
          }
          if (trailsEnabled && motion && !(n.node.category === "exception" && n.node.state === "idle")) {
            let previous = null;
            for (let k = 0; k < this.history.length; k++) {
              const pose = this.history[k], age = time - pose.time, position = this.historicalPosition(n.world, pose), alpha = Math.pow(Math.max(0, 1 - age / 1.05), 1.7) * c[3] * (high || active ? 0.72 : 0.34);
              if (previous && Math.hypot(position.x - previous.x, position.y - previous.y, position.z - previous.z) > 5e-5) seg(trails, previous, position, [c[0], c[1], c[2], alpha]);
              if (k % 3 === 0 && effectStrength > 0 && Math.hypot(position.x - n.world.x, position.y - n.world.y, position.z - n.world.z) > 2e-4) push(trailGlows, position, [c[0], c[1], c[2], alpha * 0.35 * effectStrength], size * 2.4);
              previous = position;
            }
            if (previous && Math.hypot(previous.x - n.world.x, previous.y - n.world.y, previous.z - n.world.z) > 5e-5) seg(trails, previous, n.world, [c[0], c[1], c[2], c[3] * 0.4]);
          }
        }
        if (this.scene.kind === "radial") {
          push(vertices, { x: 0, y: 0, z: 0 }, color("#edcf8e"), 4.5);
          if (effectStrength > 0) push(halos, { x: 0, y: 0, z: 0 }, color("#edcf8e", effectStrength * 0.7), 25);
        }
        for (let i = 0; i < this.scene.edges.length; i++) {
          const edge = this.scene.edges[i], high = edge.e.source === selected || edge.e.target === selected, flow = edge.e.type === "flow", active = currentEdge?.[0] === edge.e.source && currentEdge?.[1] === edge.e.target, c = color(active ? "#ffe3a4" : high ? edge.a.color : flow ? "#d6ca9e" : "#8db1bf", active ? 0.95 : high ? 0.75 : flow ? 0.46 : 0.23);
          let a = this.at(edge, 0);
          for (let k = 1; k <= 8; k++) {
            const b = this.at(edge, k / 8);
            seg(lines, a, b, c);
            a = b;
          }
          if (motion && (flow || i % 11 === 0)) {
            const u = (time * (active ? 0.35 : 0.1) + edge.seed) % 1, tip = this.at(edge, u), headColor = active ? "#fff4cd" : edge.a.color;
            push(packets, tip, color(headColor, 0.95), active ? 3.5 : 2);
            if (effectStrength > 0) push(halos, tip, color(headColor, 0.72 * effectStrength), active ? 13 : 8);
            if (trailsEnabled) {
              let previous = tip;
              for (let tail = 1; tail <= 15; tail++) {
                const q = u - tail * (active ? 0.011 : 8e-3);
                if (q < 0) break;
                const at = this.at(edge, q), alpha = Math.pow(1 - tail / 16, 1.8) * (active ? 0.85 : 0.5);
                seg(flowTails, previous, at, color(headColor, alpha));
                previous = at;
              }
            }
          }
        }
        const draw = (arr, type, points, glow = false) => {
          if (!arr.length) return;
          gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.DYNAMIC_DRAW);
          const stride = 32;
          for (let i = 0; i < 3; i++) {
            const loc = this.attrs[i];
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, i === 0 ? 3 : i === 1 ? 4 : 1, gl.FLOAT, false, stride, i === 0 ? 0 : i === 1 ? 12 : 28);
          }
          gl.uniform1f(this.uniforms.uPoints, points ? 1 : 0);
          gl.uniform1f(this.uniforms.uGlow, glow ? 1 : 0);
          gl.drawArrays(type, 0, arr.length / 8);
        };
        gl.depthMask(true);
        draw(vertices, gl.POINTS, true);
        gl.depthMask(false);
        draw(guides, gl.LINES, false);
        draw(lines, gl.LINES, false);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        draw(trails, gl.LINES, false);
        draw(flowTails, gl.LINES, false);
        draw(trailGlows, gl.POINTS, true, true);
        draw(halos, gl.POINTS, true, true);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        draw(packets, gl.POINTS, true);
        gl.depthMask(true);
        gl.flush();
        this.stats.frames++;
        this.stats.glError = gl.getError();
        this.stats.depthTest = gl.isEnabled(gl.DEPTH_TEST);
        this.stats.worldDepthRange = [Math.min(...this.scene.nodes.map((n) => n.world.z)), Math.max(...this.scene.nodes.map((n) => n.world.z))];
        this.stats.trailSegments = trails.length / 16;
        this.stats.flowTailSegments = flowTails.length / 16;
        this.stats.haloPoints = halos.length / 8;
        this.stats.historyFrames = this.history.length;
        this.stats.effectStrength = effectStrength;
        return this.scene.nodes.map((n) => ({ ...this.project(n.world), world: n.world, node: n.node, r: (n.node.layer === "symbol" ? 2.2 : 5) * this.project(n.world).scale }));
      }
      dispose() {
        const gl = this.gl;
        gl.deleteBuffer(this.buffer);
        gl.deleteProgram(this.program);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        this.canvas.remove();
      }
    };
    module2.exports = { SpatialRenderer: SpatialRenderer2 };
  }
});

// src/semantic-model.js
var require_semantic_model = __commonJS({
  "src/semantic-model.js"(exports2, module2) {
    "use strict";
    var TYPE_NAMES2 = { input: "\u8F93\u5165", output: "\u8F93\u51FA", exception: "\u5F02\u5E38", option: "\u65B9\u6848", value: "\u5B57\u6BB5" };
    var EXCEPTIONS = { intake: ["\u7F3A\u5C11\u76EE\u7684\u5730", "\u8F93\u5165\u683C\u5F0F\u9519\u8BEF", "\u6761\u4EF6\u76F8\u4E92\u51B2\u7A81"], research: ["\u672C\u5730\u8D44\u6599\u4E0D\u53EF\u7528", "\u5019\u9009\u4E0D\u8DB3", "\u6765\u6E90\u5F85\u6838\u5B9E"], plan: ["\u65F6\u95F4\u51B2\u7A81", "\u9884\u7B97\u4E0D\u8DB3", "\u65B9\u6848\u4E0D\u53EF\u884C"], verify: ["\u89C4\u5219\u672A\u901A\u8FC7", "\u8986\u76D6\u6570\u636E\u4E0D\u8DB3", "\u8F93\u51FA\u683C\u5F0F\u9519\u8BEF"], repair: ["\u4FEE\u590D\u540E\u4ECD\u6709\u95EE\u9898", "\u8FBE\u5230\u4FEE\u590D\u4E0A\u9650", "\u4FEE\u590D\u65E0\u8FDB\u5C55"], output: ["\u8F93\u51FA\u6821\u9A8C\u5931\u8D25", "\u9700\u8981\u7528\u6237\u786E\u8BA4", "\u7248\u672C\u51B2\u7A81"] };
    function createSemanticModel2(original) {
      const base = original.nodes.filter((n) => !["code", "symbol"].includes(n.layer)).map((n) => ({ ...n, state: "idle", runtimeValue: null }));
      const nodes = [...base], ids = new Set(base.map((n) => n.id)), edges = original.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
      const add = (id, name, kind, parent, description) => {
        const owner = base.find((n2) => n2.id === parent) || base[0], n = { id, name, kind, layer: "artifact", category: kind, group: owner.group, owner: parent, path: owner.path, description, input: kind === "input" ? "\u4E0A\u6E38\u771F\u5B9E\u8F93\u51FA\u6216\u7528\u6237\u586B\u5199\u4FE1\u606F" : owner.input, output: kind === "output" ? "\u4E0B\u6E38\u5B9E\u9645\u6536\u5230\u7684\u7ED3\u679C" : owner.output, state: "idle", runtimeValue: null, status: "\u5F85\u8FD0\u884C" };
        nodes.push(n);
        edges.push({ source: kind === "input" ? id : parent, target: kind === "input" ? parent : id, type: kind === "exception" ? "exception" : "data", label: TYPE_NAMES2[kind] });
        return n;
      };
      for (const owner of base.filter((n) => n.layer === "workflow")) {
        add("IN_" + owner.id, "\u8F93\u5165 \xB7 " + owner.input.split(/[、，；]/)[0], "input", owner.id, "\u8BE5\u6B65\u9AA4\u672C\u8F6E\u771F\u6B63\u6536\u5230\u7684\u6570\u636E\uFF1B\u672A\u8FD0\u884C\u65F6\u4EC5\u663E\u793A\u7ED3\u6784\u5B9A\u4E49\u3002");
        add("OUT_" + owner.id, "\u8F93\u51FA \xB7 " + owner.output.split(/[、，；]/)[0], "output", owner.id, "\u8BE5\u6B65\u9AA4\u8BA1\u7B97\u5F97\u5230\u7684\u5B9E\u9645\u7ED3\u679C\uFF0C\u70B9\u51FB\u67E5\u770B\u5B8C\u6574\u503C\u3002");
      }
      for (const [group, list] of Object.entries(EXCEPTIONS)) {
        const owner = base.find((n) => n.group === group && n.layer === "workflow").id;
        list.forEach((label, i) => add("RISK_" + group + "_" + i, "\u5F02\u5E38 \xB7 " + label, "exception", owner, "\u53EF\u80FD\u53D1\u751F\u7684\u5F02\u5E38\u6761\u4EF6\u3002\u4EC5\u5728\u5B9E\u9645\u89E6\u53D1\u65F6\u663E\u793A\u95EE\u9898\uFF1B\u5F85\u8FD0\u884C\u4E0D\u8868\u793A\u5DF2\u7ECF\u53D1\u751F\u3002"));
      }
      const fields = [["destination", "\u76EE\u7684\u5730"], ["dates", "\u65E5\u671F\u8303\u56F4"], ["travelers", "\u51FA\u884C\u4EBA\u6570"], ["budget", "\u9884\u7B97\u91D1\u989D"], ["interests", "\u5174\u8DA3\u504F\u597D"], ["pace", "\u6E38\u89C8\u8282\u594F"], ["must_visit", "\u5FC5\u53BB\u5730\u70B9"], ["avoid", "\u907F\u5F00\u9879\u76EE"], ["origin", "\u51FA\u53D1\u57CE\u5E02"]];
      for (const [key, name] of fields) add("FIELD_" + key, "\u8F93\u5165\u5B57\u6BB5 \xB7 " + name, "value", "A1", "\u9700\u6C42\u89E3\u6790\u5F97\u5230\u7684\u5B57\u6BB5\uFF1B\u81EA\u52A8\u4F30\u7B97\u4F1A\u540C\u65F6\u663E\u793A\u5728\u8F93\u5165\u63D0\u9192\u4E2D\u3002");
      ["\u539F\u59CB\u504F\u597D", "\u8212\u9002\u66FF\u4EE3", "\u63A2\u7D22\u66FF\u4EE3"].forEach((name, i) => {
        add("OPTION_" + i, "\u65B9\u6848" + ["\u4E00", "\u4E8C", "\u4E09"][i] + " \xB7 " + name, "option", "C2", "\u672C\u5730\u667A\u80FD\u4F53\u72EC\u7ACB\u8BA1\u7B97\u7684\u5019\u9009\u884C\u7A0B\u3002\u4FDD\u7559\u539F\u76EE\u7684\u5730\u3001\u65E5\u671F\u3001\u4EBA\u6570\u4E0E\u9884\u7B97\uFF0C\u4EC5\u6BD4\u8F83\u8282\u594F\u5DEE\u5F02\u3002");
        edges.push({ source: "OPTION_" + i, target: "V1", type: "flow", label: "\u72EC\u7ACB\u6821\u9A8C" });
      });
      for (const rule of base.filter((n) => n.layer === "rule")) {
        add("IN_" + rule.id, "\u6821\u9A8C\u8F93\u5165 \xB7 " + rule.name, "input", rule.id, "\u5F53\u524D\u5019\u9009\u65B9\u6848\u4E0E\u8BE5\u89C4\u5219\u9700\u8981\u7684\u5B9E\u9645\u53C2\u6570\u3002");
        add("OUT_" + rule.id, "\u6821\u9A8C\u8F93\u51FA \xB7 " + rule.name, "output", rule.id, "\u8BE5\u89C4\u5219\u68C0\u67E5\u3001\u8986\u76D6\u53CA\u95EE\u9898\u6E05\u5355\u3002");
      }
      return { title: "\u884C\u8FF9\u667A\u80FD\u4F53\u4E1A\u52A1\u8FD0\u884C\u56FE", groups: original.groups, nodes, edges };
    }
    var STAGES = { intake: { id: "A1", name: "\u9700\u6C42\u89E3\u6790" }, research: { id: "B1", name: "\u5019\u9009\u68C0\u7D22" }, outline: { id: "C1", name: "\u5206\u5929\u5206\u533A" }, schedule: { id: "C2", name: "\u65F6\u95F4\u7F16\u6392" }, verify: { id: "V1", name: "\u89C4\u5219\u6821\u9A8C" }, repair: { id: "R1", name: "\u5F02\u5E38\u4FEE\u590D" }, render: { id: "O1", name: "\u7ED3\u679C\u8F93\u51FA" } };
    var CN = { destination: "\u76EE\u7684\u5730", city_code: "\u57CE\u5E02\u6807\u8BC6", country: "\u56FD\u5BB6", start_date: "\u5F00\u59CB\u65E5\u671F", end_date: "\u7ED3\u675F\u65E5\u671F", timezone: "\u65F6\u533A", travelers: "\u4EBA\u6570", adults: "\u6210\u4EBA", children: "\u513F\u7AE5", origin_city: "\u51FA\u53D1\u57CE\u5E02", budget: "\u9884\u7B97", amount: "\u91D1\u989D", currency: "\u5E01\u79CD", includes_flights: "\u542B\u57CE\u9645\u4EA4\u901A", pace: "\u8282\u594F", interests: "\u504F\u597D", mobility: "\u884C\u52A8\u80FD\u529B", must_visit: "\u5FC5\u53BB", avoid: "\u907F\u5F00", source: "\u6765\u6E90", type: "\u7C7B\u578B", file_ref: "\u5173\u8054\u6587\u4EF6", meta: "\u65C5\u884C\u6761\u4EF6", missing: "\u7F3A\u5931\u5B57\u6BB5", notes: "\u8BF4\u660E", pool: "\u5019\u9009\u5730\u70B9", plans: "\u5206\u65E5\u8BA1\u5212", days: "\u6BCF\u65E5\u884C\u7A0B", unscheduled: "\u5907\u9009\u6C60", result: "\u6821\u9A8C\u7ED3\u679C", rounds: "\u4FEE\u590D\u8F6E\u6B21", unresolved: "\u672A\u89E3\u51B3\u95EE\u9898", itinerary: "\u884C\u7A0B", name: "\u540D\u79F0", date: "\u65E5\u671F", day_index: "\u7B2C\u51E0\u5929", items: "\u6761\u76EE", summary: "\u7EDF\u8BA1", errors: "\u9519\u8BEF", warnings: "\u63D0\u9192", infos: "\u4FE1\u606F", code: "\u89C4\u5219", severity: "\u7EA7\u522B", message: "\u8BF4\u660E", suggestion: "\u5EFA\u8BAE", auto_fixable: "\u53EF\u81EA\u52A8\u4FEE\u590D", byCode: "\u5404\u9879\u89C4\u5219", violations: "\u95EE\u9898\u5217\u8868", checked: "\u68C0\u67E5\u6570\u91CF", covered: "\u8986\u76D6\u6570\u91CF", detail: "\u8BE6\u60C5", score: "\u504F\u597D\u5339\u914D\u503C", reasons: "\u63A8\u8350\u7406\u7531", closedOn: "\u95ED\u9986\u65E5\u671F", poi_id: "\u5730\u70B9\u7F16\u53F7", poi_ids: "\u5730\u70B9\u7F16\u53F7", base_area: "\u533A\u57DF", centroid: "\u533A\u57DF\u4E2D\u5FC3", start_time: "\u5F00\u59CB\u65F6\u95F4", end_time: "\u7ED3\u675F\u65F6\u95F4", duration_min: "\u65F6\u957F\u5206\u949F", cost: "\u8D39\u7528", mode: "\u4EA4\u901A\u65B9\u5F0F", lat: "\u7EAC\u5EA6", lng: "\u7ECF\u5EA6", category: "\u7C7B\u522B", confidence: "\u53EF\u4FE1\u5EA6", actions: "\u4FEE\u590D\u52A8\u4F5C", errorsBefore: "\u4FEE\u590D\u524D\u9519\u8BEF", errorsAfter: "\u4FEE\u590D\u540E\u9519\u8BEF", round: "\u8F6E\u6B21", stopped: "\u505C\u6B62\u539F\u56E0", parsed: "\u89E3\u6790\u7ED3\u679C", request: "\u7528\u6237\u9700\u6C42", profile: "\u65B9\u6848\u6761\u4EF6", schema: "\u8F93\u51FA\u7ED3\u6784", status: "\u72B6\u6001", origin: "\u51FA\u53D1\u5730" };
    var WORDS = { relaxed: "\u8F7B\u677E", moderate: "\u9002\u4E2D", packed: "\u7D27\u51D1", normal: "\u6B63\u5E38", limited: "\u884C\u52A8\u53D7\u9650", wheelchair: "\u8F6E\u6905", food: "\u7F8E\u98DF", nature: "\u81EA\u7136\u98CE\u5149", history: "\u5386\u53F2", museum: "\u535A\u7269\u9986", art: "\u827A\u672F", shopping: "\u8D2D\u7269", nightlife: "\u591C\u751F\u6D3B", photography: "\u6444\u5F71", theme_park: "\u4E3B\u9898\u4E50\u56ED", hot_spring: "\u6E29\u6CC9", hiking: "\u5F92\u6B65", local_life: "\u5E02\u4E95\u751F\u6D3B", error: "\u9519\u8BEF", warning: "\u63D0\u9192", info: "\u4FE1\u606F", verified: "\u5DF2\u6838\u5B9E", estimated: "\u4F30\u7B97", unknown: "\u672A\u77E5", chat: "\u6587\u5B57\u8F93\u5165", manual: "\u624B\u5DE5\u8F93\u5165", import: "\u5BFC\u5165", CNY: "\u4EBA\u6C11\u5E01", CN: "\u4E2D\u56FD", activity: "\u6E38\u89C8", meal: "\u7528\u9910", transit: "\u901A\u52E4", rest: "\u4F11\u606F", checkin: "\u5165\u4F4F", ticket: "\u95E8\u7968", lodging: "\u4F4F\u5BBF", other: "\u5176\u4ED6", walk: "\u6B65\u884C", taxi: "\u6253\u8F66", subway: "\u5730\u94C1", bus: "\u516C\u4EA4", drive: "\u81EA\u9A7E", clean: "\u95EE\u9898\u5DF2\u6E05\u9664", max_rounds: "\u8FBE\u5230\u8F6E\u6B21\u4E0A\u9650", no_progress: "\u4FEE\u590D\u65E0\u8FDB\u5C55", auto: "\u81EA\u52A8\u4FEE\u590D", strategic: "\u7B56\u7565\u8C03\u6574", "local-dataset": "\u672C\u5730\u6570\u636E\u96C6", start_date: "\u5F00\u59CB\u65E5\u671F", days: "\u5929\u6570", destination: "\u76EE\u7684\u5730", origin: "\u51FA\u53D1\u5730", budget: "\u9884\u7B97", travelers: "\u4EBA\u6570" };
    Object.assign(CN, { id: "\u7F16\u53F7", version: "\u7248\u672C", parent_id: "\u7236\u7248\u672C", variant_label: "\u65B9\u6848\u540D\u79F0", created_at: "\u521B\u5EFA\u65F6\u95F4", updated_at: "\u66F4\u65B0\u65F6\u95F4", locked: "\u5DF2\u9501\u5B9A", warnings: "\u63D0\u9192", feasibility: "\u53EF\u884C\u6027\u62A5\u544A", assumptions: "\u6570\u636E\u5047\u8BBE", seed: "\u5730\u70B9\u8D44\u6599", rating: "\u8BC4\u5206", tags: "\u6807\u7B7E", address: "\u5730\u5740", city: "\u57CE\u5E02", cityName: "\u57CE\u5E02\u540D\u79F0", open: "\u5F00\u95E8\u65F6\u95F4", close: "\u5173\u95E8\u65F6\u95F4", closed_days: "\u95ED\u9986\u65E5", hours_confidence: "\u8425\u4E1A\u65F6\u95F4\u53EF\u4FE1\u5EA6", duration: "\u5EFA\u8BAE\u65F6\u957F", duration_min: "\u65F6\u957F\u5206\u949F", ticket_price: "\u95E8\u7968\u4F30\u7B97", booking_required: "\u9700\u9884\u7EA6", booked: "\u5DF2\u9884\u7EA6", weather_sensitive: "\u5929\u6C14\u654F\u611F", opening_hours: "\u8425\u4E1A\u65F6\u95F4", from_item_id: "\u51FA\u53D1\u6761\u76EE", to_item_id: "\u5230\u8FBE\u6761\u76EE", distance_m: "\u8DDD\u79BB\u7C73", cost_breakdown: "\u8D39\u7528\u6784\u6210", by_type: "\u5206\u7C7B\u8D39\u7528", activity_min: "\u6D3B\u52A8\u5206\u949F", transit_min: "\u901A\u52E4\u5206\u949F", active_min: "\u603B\u6D3B\u52A8\u5206\u949F", poi_count: "\u6E38\u89C8\u6570\u91CF", max_leg_km: "\u6700\u5927\u8DE8\u533A\u516C\u91CC", reason: "\u5907\u9009\u539F\u56E0", address_hint: "\u5730\u5740\u63D0\u793A", verified_at: "\u6821\u9A8C\u65F6\u95F4", verifier_version: "\u6821\u9A8C\u7248\u672C", rules: "\u89C4\u5219\u660E\u7EC6", evidence: "\u4E8B\u5B9E\u4F9D\u636E", passed: "\u901A\u8FC7", total: "\u603B\u6570", description: "\u8BF4\u660E", title: "\u6807\u9898", poi_sources: "\u5730\u70B9\u6765\u6E90", provider: "\u8D44\u6599\u6765\u6E90", fetched_at: "\u6536\u96C6\u65F6\u95F4", total_transit_min: "\u603B\u901A\u52E4\u5206\u949F", data_coverage: "\u6570\u636E\u8986\u76D6", poi_verified: "\u672C\u5730\u6838\u5B9E\u5730\u70B9", poi_total: "\u5168\u90E8\u5730\u70B9", hours_known: "\u5DF2\u77E5\u8425\u4E1A\u65F6\u95F4", hours_total: "\u8425\u4E1A\u6761\u76EE\u603B\u6570", opening: "\u8425\u4E1A\u4FE1\u606F", ticket: "\u95E8\u7968", ticket_yuan: "\u95E8\u7968\u4F30\u7B97", meal_cost: "\u7528\u9910\u4F30\u7B97", cost_yuan: "\u8D39\u7528\u4F30\u7B97", transit_modes: "\u4EA4\u901A\u65B9\u5F0F", website: "\u7F51\u7AD9", cost: "\u4F30\u7B97\u8D39\u7528", name_en: "\u539F\u540D\u79F0" });
    Object.assign(CN, { area: "\u6240\u5C5E\u533A\u57DF", suggested_duration_min: "\u5EFA\u8BAE\u65F6\u957F\u5206\u949F", indoor: "\u5BA4\u5185\u5730\u70B9", interest_tags: "\u5174\u8DA3\u6807\u7B7E", lodging: "\u4F4F\u5BBF", tags: "\u6807\u7B7E" });
    Object.assign(WORDS, { done: "\u5DF2\u5B8C\u6210", running: "\u5904\u7406\u4E2D", idle: "\u5F85\u8FD0\u884C", skipped: "\u672A\u89E6\u53D1" });
    var RULE_NAMES = { TIME_OVERLAP: "\u65F6\u95F4\u8FDE\u7EED\u6027", OUTSIDE_OPENING: "\u8425\u4E1A\u65F6\u95F4", GEO_SCATTER: "\u5730\u7406\u805A\u96C6\u5EA6", BUDGET_EXCEEDED: "\u9884\u7B97\u7EA6\u675F", OVER_PACE: "\u4F53\u529B\u8282\u594F", BOOKING_RISK: "\u9884\u7EA6\u98CE\u9669", WEATHER_CONFLICT: "\u5929\u6C14\u51B2\u7A81", TRANSIT_UNREACHABLE: "\u4EA4\u901A\u53EF\u8FBE\u6027" };
    function chinese(value) {
      if (typeof value === "string") {
        let s = WORDS[value] || RULE_NAMES[value] || value;
        s = s.replace(/\berror\b/g, "\u9519\u8BEF").replace(/\bwarning\b/g, "\u63D0\u9192").replace(/local-dataset/g, "\u672C\u5730\u6570\u636E\u96C6").replace(/POI/g, "\u5730\u70B9").replace(/What-if/g, "\u60C5\u666F\u63A8\u6F14").replace(/API/g, "\u63A5\u53E3").replace(/\bD(\d+)\b/g, "\u7B2C$1\u5929");
        for (const [en, cn] of Object.entries(WORDS)) if (en.length > 3) s = s.split("\u300C" + en + "\u300D").join("\u300C" + cn + "\u300D");
        return s;
      }
      if (Array.isArray(value)) return value.map(chinese);
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [CN[k] || RULE_NAMES[k] || k, chinese(v)]));
      return value;
    }
    function brief2(value) {
      if (value == null) return "\u5C1A\u672A\u4EA7\u751F";
      if (typeof value === "string") return chinese(value);
      if (typeof value !== "object") return String(value);
      if (Array.isArray(value)) return value.length + " \u9879" + (value.length ? " \xB7 " + brief2(value[0]).slice(0, 50) : "");
      if (value.meta) return value.meta.destination + " \xB7 " + value.meta.start_date + " \xB7 " + value.meta.travelers.adults + "\u4EBA \xB7 \u9884\u7B97" + value.meta.budget.amount + "\u5143";
      if (value.request) return "\u7528\u6237\u9700\u6C42\uFF1A" + value.request;
      if (value.pool) return value.pool.length + "\u4E2A\u5730\u70B9\u5019\u9009";
      if (value.plans) return value.plans.length + "\u5929\u5206\u533A\u8BA1\u5212";
      if (value.days) return value.days.length + "\u5929 \xB7 " + value.days.reduce((s, d) => s + d.items.length, 0) + "\u4E2A\u884C\u7A0B\u6761\u76EE";
      if (value.itinerary) return value.itinerary.meta.destination + " \xB7 " + value.itinerary.days.length + "\u5929\u884C\u7A0B";
      if (value.result) return "\u9519\u8BEF" + value.result.errors.length + " \xB7 \u63D0\u9192" + value.result.warnings.length;
      if (value.rounds) return value.rounds.length + "\u8F6E\u4FEE\u590D \xB7 \u672A\u89E3\u51B3" + (value.unresolved?.length || 0) + "\u9879";
      if (value.\u65B9\u6848) return value.\u65B9\u6848 + (value.\u4F30\u7B97\u603B\u8D39\u7528 ? " \xB7 \u4F30\u7B97" + value.\u4F30\u7B97\u603B\u8D39\u7528 + "\u5143" : "");
      return Object.entries(value).slice(0, 3).map(([k, v]) => (CN[k] || k) + "\uFF1A" + brief2(v).slice(0, 40)).join(" \xB7 ");
    }
    module2.exports = { createSemanticModel: createSemanticModel2, STAGES, TYPE_NAMES: TYPE_NAMES2, chinese, brief: brief2 };
  }
});

// src/business-controller.js
var require_business_controller = __commonJS({
  "src/business-controller.js"(exports2, module2) {
    "use strict";
    var { STAGES, chinese, brief: brief2 } = require_semantic_model();
    var escape = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    var STATUS = { idle: "\u5F85\u8FD0\u884C", running: "\u5904\u7406\u4E2D", done: "\u5DF2\u4EA7\u751F", warning: "\u6709\u63D0\u9192", error: "\u5DF2\u963B\u65AD", skipped: "\u672A\u89E6\u53D1" };
    var SAMPLES = { normal: "2026\u5E7411\u67086\u65E5\u4ECE\u4E0A\u6D77\u53BB\u6210\u90FD\u73A9\u4E09\u5929\uFF0C1\u4EBA\uFF0C\u9884\u7B973000\u5143\uFF0C\u559C\u6B22\u5386\u53F2\u548C\u7F8E\u98DF\uFF0C\u8F7B\u677E\u4E00\u70B9", missing: "2026\u5E7411\u67086\u65E5\u8D77\u73A9\u4E09\u5929\uFF0C1\u4EBA\uFF0C\u9884\u7B973000\u5143\uFF0C\u559C\u6B22\u5386\u53F2\u548C\u7F8E\u98DF", budget: "2026\u5E7411\u67086\u65E5\u4ECE\u4E0A\u6D77\u53BB\u6210\u90FD\u73A9\u4E09\u5929\uFF0C1\u4EBA\uFF0C\u603B\u9884\u7B97100\u5143\uFF0C\u559C\u6B22\u5386\u53F2\u548C\u7F8E\u98DF", data: "2026\u5E7411\u67086\u65E5\u4ECE\u4E0A\u6D77\u53BB\u706B\u661F\u73A9\u4E09\u5929\uFF0C1\u4EBA\uFF0C\u9884\u7B973000\u5143", format: "2026\u5E7411\u67086\u65E5\u53BB\u6210\u90FD\u73A90\u5929\uFF0C0\u4EBA\uFF0C\u9884\u7B97-100\u5143" };
    var BusinessController2 = class {
      constructor(view) {
        this.v = view;
        this.records = [];
        this.issues = [];
        this.variants = [];
        this.selectedVariant = 0;
        this.selectedRecord = null;
        this.busy = false;
        this.request = "";
      }
      bind() {
        const r = this.v.root;
        r.querySelector("[data-action=fill-scenario]").onclick = () => {
          if (this.busy) return;
          const key = r.querySelector(".wf-runtime-scenario").value;
          r.querySelector(".wf-runtime-request").value = SAMPLES[key] || SAMPLES.normal;
        };
        this.render();
      }
      engine() {
        return require(this.v.app.vault.adapter.getBasePath() + "/" + this.v.plugin.manifest.dir + "/business-runtime.cjs");
      }
      node(id, value, state = "done") {
        const n = this.v.byId.get(id);
        if (n) {
          n.runtimeValue = value;
          n.state = state;
          if (n.category === "option" && value?.\u65B9\u6848) n.name = "\u65B9\u6848" + ["\u4E00", "\u4E8C", "\u4E09"][+id.split("_").pop()] + " \xB7 " + value.\u65B9\u6848;
        }
      }
      clear() {
        this.v.data.nodes = this.v.data.nodes.filter((n) => !n.runtimeGenerated);
        this.v.data.edges = this.v.data.edges.filter((e) => !e.runtimeGenerated);
        this.v.byId = new Map(this.v.data.nodes.map((n) => [n.id, n]));
        for (const n of this.v.data.nodes) {
          n.runtimeValue = null;
          n.state = "idle";
        }
        this.records = [];
        this.issues = [];
        this.variants = [];
        this.selectedRecord = null;
        this.selectedVariant = 0;
        this.recommended = null;
        this.v.runtimeResult = null;
        this.v.currentEdge = null;
        this.v.root.querySelector(".wf-runtime-result").textContent = "";
      }
      addEvidence(stage, payload, plan) {
        const info = STAGES[stage], owner = this.v.byId.get(info.id);
        const add = (key, label, value, category = "output", state = "done") => {
          const id = "LIVE_" + plan + "_" + stage + "_" + key;
          if (this.v.byId.has(id)) return;
          const n = { id, name: label, kind: category, category, layer: "artifact", owner: info.id, group: owner.group, path: owner.path, input: "\u65B9\u6848" + ["\u4E00", "\u4E8C", "\u4E09"][plan] + " \xB7 " + info.name, output: "\u70B9\u51FB\u67E5\u770B\u8BE5\u6761\u5B9E\u9645\u6570\u636E", description: "\u672C\u8F6E\u771F\u5B9E\u8BA1\u7B97\u4EA7\u751F\u7684\u4E1A\u52A1\u6570\u636E\uFF0C\u4E0D\u662F\u6E90\u7801\u5B9A\u4E49\u3002", runtimeValue: value, state, runtimeGenerated: true, variant: plan };
          this.v.data.nodes.push(n);
          this.v.byId.set(id, n);
          this.v.data.edges.push({ source: info.id, target: id, type: category === "exception" ? "exception" : "data", runtimeGenerated: true });
        };
        if (stage === "research") for (const [i, p] of (payload.pool || []).slice(0, 100).entries()) add("poi_" + i, "\u8F93\u51FA\u5019\u9009 \xB7 " + p.seed.name, { \u540D\u79F0: p.seed.name, \u504F\u597D\u5339\u914D\u503C: p.score, \u63A8\u8350\u7406\u7531: p.reasons, \u95ED\u9986\u65E5\u671F: payload.closedOn?.[p.seed.poi_id] || [] });
        if (stage === "outline") for (const p of payload.plans || []) add("day_" + p.day_index, "\u8F93\u51FA\u5206\u533A \xB7 \u7B2C" + p.day_index + "\u5929 " + p.base_area, p);
        if (stage === "schedule") {
          let i = 0;
          for (const d of payload.days || []) for (const item of d.items || []) {
            if (i >= 120) break;
            add("item_" + i++, "\u8F93\u51FA\u884C\u7A0B \xB7 \u7B2C" + d.day_index + "\u5929 " + item.start_time + " " + item.name, { \u65E5\u671F: d.date, ...item });
          }
        }
        if (stage === "verify") for (const [i, x] of (payload.result?.violations || []).entries()) add("issue_" + i, (x.severity === "error" ? "\u8F93\u51FA\u5F02\u5E38 \xB7 " : "\u8F93\u51FA\u63D0\u9192 \xB7 ") + x.message, x, "exception", x.severity === "error" ? "error" : "warning");
      }
      issue(code, message, severity = "error", plan = null, suggestion = "\u8865\u5145\u6216\u4FEE\u6539\u6761\u4EF6\u540E\u91CD\u65B0\u8FD0\u884C", risk = "RISK_intake_1") {
        const entry = { code, message, severity, plan, suggestion, risk };
        if (!this.issues.some((x) => x.code === code && x.plan === plan && x.message === message)) this.issues.push(entry);
        this.node(risk, { \u8BF4\u660E: message, \u5EFA\u8BAE: suggestion }, severity === "error" ? "error" : "warning");
        this.renderIssues();
        return entry;
      }
      fail(code, message, risk) {
        const e = new Error(message);
        e.businessCode = code;
        e.risk = risk;
        throw e;
      }
      validateRaw(request) {
        if (!request.trim()) this.fail("EMPTY_INPUT", "\u8BF7\u8F93\u5165\u76EE\u7684\u5730\u3001\u65E5\u671F\u3001\u4EBA\u6570\u548C\u9884\u7B97\u3002", "RISK_intake_1");
        if (request.length > 4e3) this.fail("INPUT_TOO_LONG", "\u8F93\u5165\u8FC7\u957F\uFF0C\u8BF7\u538B\u7F29\u52304000\u5B57\u4EE5\u5185\u3002", "RISK_intake_1");
        if (/(?:^|[^\d一二三四五六七八九十百两])(?:0|零|负\s*\d+|-\s*\d+)\s*(?:天|日游|人|位)|预算\s*(?:为|是|[:：])?\s*[-负]\s*\d+|预算\s*(?:为|是|[:：])?\s*(?:0(?:\.0+)?|零)\s*(?:元|块|$|[，,。])/.test(request)) this.fail("INVALID_NUMBER", "\u5929\u6570\u3001\u4EBA\u6570\u4E0E\u9884\u7B97\u5FC5\u987B\u4E3A\u6B63\u6570\uFF0C\u5F53\u524D\u8F93\u5165\u5305\u542B\u96F6\u6216\u8D1F\u6570\u3002", "RISK_intake_1");
        for (const match of request.matchAll(/(20\d{2})[-年](\d{1,2})[-月](\d{1,2})/g)) {
          const d = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
          if (d.getUTCFullYear() !== +match[1] || d.getUTCMonth() !== +match[2] - 1 || d.getUTCDate() !== +match[3]) this.fail("INVALID_DATE", "\u8F93\u5165\u65E5\u671F\u4E0D\u5B58\u5728\uFF0C\u8BF7\u4FEE\u6539\u540E\u91CD\u8BD5\u3002", "RISK_intake_1");
        }
      }
      fields(meta) {
        const values = { destination: meta.destination, dates: meta.start_date + " \u81F3 " + meta.end_date, travelers: meta.travelers, budget: meta.budget, interests: meta.interests, pace: meta.pace, must_visit: meta.must_visit, avoid: meta.avoid, origin: meta.origin_city || "\u672A\u63D0\u4F9B" };
        for (const [k, val] of Object.entries(values)) this.node("FIELD_" + k, val);
      }
      async run() {
        if (this.busy) return;
        const v = this.v, r = v.root, button = r.querySelector("[data-action=run-agent]");
        this.busy = true;
        v.stop();
        this.clear();
        this.request = r.querySelector(".wf-runtime-request").value.trim();
        button.disabled = true;
        button.textContent = "\u6B63\u5728\u6BD4\u8F83\u65B9\u6848\u2026";
        r.querySelectorAll(".wf-sim-controls button,.wf-sim-controls select,[data-action=fill-scenario]").forEach((x) => x.disabled = true);
        r.querySelector(".wf-sim-badge").textContent = "\u771F\u5B9E\u672C\u5730\u8FD0\u884C \xB7 \u591A\u65B9\u6848";
        this.node("S0", this.request);
        this.node("IN_S0", this.request);
        this.node("OUT_S0", this.request);
        this.node("IN_A1", this.request, "running");
        this.render();
        v.update();
        try {
          this.validateRaw(this.request);
          const engine = this.engine(), parsed = engine.intake(this.request);
          this.fields(parsed.meta);
          this.node("OUT_A1", parsed);
          if (parsed.missing.includes("destination") || /^(?:[零一二三四五六七八九十百两0-9]+(?:天|日)|几天|哪里|待定)$/.test(parsed.meta.destination)) {
            this.node("FIELD_destination", "\u672A\u63D0\u4F9B\u6709\u6548\u76EE\u7684\u5730", "error");
            this.node("A3", { \u7F3A\u5931\u5B57\u6BB5: ["destination", ...parsed.missing] }, "error");
            this.fail("MISSING_DESTINATION", "\u7F3A\u5C11\u76EE\u7684\u5730\uFF0C\u5C1A\u672A\u751F\u6210\u4EFB\u4F55\u65B9\u6848\u3002", "RISK_intake_0");
          }
          if (parsed.meta.city_code.startsWith("dynamic:")) this.fail("NO_LOCAL_DATA", "\u672C\u5730\u6570\u636E\u96C6\u4E2D\u6CA1\u6709\u201C" + parsed.meta.destination + "\u201D\u7684\u53EF\u7528\u8D44\u6599\uFF0C\u65E0\u6CD5\u53EF\u9760\u751F\u6210\u884C\u7A0B\u3002", "RISK_research_0");
          const schema = engine.MetaSchema.safeParse(parsed.meta);
          if (!schema.success) this.fail("INVALID_META", "\u8F93\u5165\u5B57\u6BB5\u6821\u9A8C\u672A\u901A\u8FC7\uFF1A" + schema.error.issues.map((x) => x.message).join("\uFF1B"), "RISK_intake_1");
          const span = (Date.parse(parsed.meta.end_date) - Date.parse(parsed.meta.start_date)) / 864e5 + 1;
          if (!Number.isFinite(span) || span < 1 || span > 60) this.fail("INVALID_DAYS", "\u5F53\u524D\u672C\u5730\u8FD0\u884C\u652F\u63011\u81F360\u5929\uFF0C\u8BF7\u68C0\u67E5\u65E5\u671F\u4E0E\u5929\u6570\u3002", "RISK_intake_1");
          if (parsed.meta.budget.amount <= 0) this.fail("INVALID_BUDGET", "\u9884\u7B97\u5FC5\u987B\u5927\u4E8E\u96F6\u3002", "RISK_intake_1");
          for (const note of parsed.notes) this.issue("INPUT_ASSUMPTION", note, "warning", null, "\u8BF7\u6838\u5BF9\u81EA\u52A8\u4F30\u7B97\u7684\u8F93\u5165\u6761\u4EF6\u3002", "RISK_intake_2");
          const basePace = parsed.meta.pace, alternative = basePace === "relaxed" ? "moderate" : "relaxed", third = ["packed", "moderate", "relaxed"].find((p) => p !== basePace && p !== alternative), paceName = { relaxed: "\u8F7B\u677E\u6F2B\u6E38", moderate: "\u5747\u8861\u6E38\u89C8", packed: "\u7D27\u51D1\u63A2\u7D22" };
          const profiles = [{ name: "\u539F\u59CB\u504F\u597D", pace: basePace }, { name: paceName[alternative], pace: parsed.meta.mobility === "normal" ? alternative : "relaxed" }, { name: paceName[third], pace: parsed.meta.mobility === "normal" ? third : "relaxed" }];
          for (let index = 0; index < profiles.length; index++) {
            const profile = profiles[index], effective = { ...parsed.meta, pace: profile.pace }, variant = { index, name: profile.name, pace: profile.pace, state: "running", input: effective, records: [], result: null };
            if (index > 0 && parsed.meta.mobility !== "normal") variant.note = "\u884C\u52A8\u53D7\u9650\uFF0C\u8282\u594F\u4FDD\u6301\u8F7B\u677E\u3002";
            this.variants.push(variant);
            this.v.byId.get("OPTION_" + index).name = "\u65B9\u6848" + ["\u4E00", "\u4E8C", "\u4E09"][index] + " \xB7 " + profile.name;
            this.selectedVariant = index;
            this.node("OPTION_" + index, { \u65B9\u6848: profile.name, \u6761\u4EF6: effective }, "running");
            let last = null, previous = { request: this.request, profile: effective }, started = 0, current = null;
            const result = await engine.runAgent(this.request, (event) => {
              const stage = STAGES[event.stage];
              if (!stage) return;
              if (event.status === "start") {
                started = performance.now();
                if (last) v.currentEdge = [last, stage.id];
                last = stage.id;
                current = { plan: index, planName: profile.name, stage: event.stage, name: stage.name, id: stage.id, input: previous, output: null, state: "running", duration: 0 };
                variant.records.push(current);
                this.records.push(current);
                this.selectedRecord = current;
                this.node(stage.id, { \u65B9\u6848: profile.name, \u8BF4\u660E: "\u6B63\u5728\u5904\u7406" }, "running");
                this.node("IN_" + stage.id, current.input);
                this.node("OUT_" + stage.id, null, "running");
                v.select(stage.id);
              } else {
                const payload = event.payload || { \u8BF4\u660E: chinese(event.message), \u8BE6\u60C5: chinese(event.detail || "") };
                if (current) {
                  current.output = payload;
                  current.duration = Math.round(performance.now() - started);
                  current.state = "done";
                }
                previous = payload;
                this.addEvidence(event.stage, payload, index);
                this.node("OUT_" + stage.id, payload);
                this.node(stage.id, payload);
                if (event.stage === "intake") this.fields(payload.meta || effective);
                if (event.stage === "verify") this.applyRules(payload.result, index);
                if (event.stage === "repair" && payload.unresolved?.length) this.node("RISK_repair_0", payload.unresolved, "error");
                if (event.stage === "render") this.node("IN_O2", { \u884C\u7A0B: payload.itinerary, \u72B6\u6001: "\u7B49\u5F85\u7528\u6237\u786E\u8BA4" });
                r.querySelector(".wf-step-title").textContent = profile.name + " \xB7 " + stage.name + "\u5B8C\u6210";
              }
              this.render();
              v.update();
            }, { animate: true, metaOverride: effective });
            const outputCheck = engine.ItinerarySchema.safeParse(result.itinerary);
            if (!outputCheck.success) {
              variant.state = "error";
              this.issue("OUTPUT_SCHEMA", "\u201C" + profile.name + "\u201D\u8F93\u51FA\u7ED3\u6784\u4E0D\u5B8C\u6574\u3002", "error", index, "\u91CD\u65B0\u8FD0\u884C\u6216\u68C0\u67E5\u6392\u7A0B\u8F93\u51FA\u3002", "RISK_verify_2");
            } else {
              variant.state = result.verifyResult.errors.length ? "error" : "done";
            }
            variant.result = result;
            variant.cost = Math.round(engine.itineraryTotalCost(result.itinerary));
            variant.activities = result.itinerary.days.reduce((sum, d) => sum + d.items.filter((i) => i.type === "activity").length, 0);
            variant.transit = engine.totalTransitMin(result.itinerary);
            variant.signature = JSON.stringify(result.itinerary.days.map((d) => d.items.map((i) => [i.name, i.start_time, i.end_time])));
            variant.sameAs = this.variants.slice(0, index).find((x) => x.signature === variant.signature)?.name || null;
            this.node("OPTION_" + index, { \u65B9\u6848: profile.name, \u4F30\u7B97\u603B\u8D39\u7528: variant.cost, \u6D3B\u52A8\u6570\u91CF: variant.activities, \u901A\u52E4\u5206\u949F: variant.transit, \u9519\u8BEF: result.verifyResult.errors, \u63D0\u9192: result.verifyResult.warnings }, variant.state);
            this.applyRules(result.verifyResult, index);
            for (const item of result.verifyResult.errors) this.issue(item.code, item.message, "error", index, item.suggestion, item.code === "BUDGET_EXCEEDED" ? "RISK_plan_1" : "RISK_output_0");
            for (const item of result.verifyResult.warnings) this.issue(item.code, item.message, "warning", index, item.suggestion, "RISK_verify_1");
            if (result.verifyResult.errors.length) this.node("RISK_output_0", { \u8BF4\u660E: "\u8BE5\u65B9\u6848\u4ECD\u6709\u6821\u9A8C\u9519\u8BEF\uFF0C\u5C1A\u4E0D\u80FD\u4F5C\u4E3A\u901A\u8FC7\u65B9\u6848\u8F93\u51FA\u3002", \u9519\u8BEF: result.verifyResult.errors }, "error");
            this.render();
            v.update();
          }
          const rank = [...this.variants].filter((x) => x.result).sort((a, b) => a.result.verifyResult.errors.length - b.result.verifyResult.errors.length || a.result.verifyResult.warnings.length - b.result.verifyResult.warnings.length || a.index - b.index);
          this.recommended = rank[0]?.index ?? 0;
          this.choose(this.recommended);
          const good = this.variants.filter((x) => x.state === "done").length;
          r.querySelector(".wf-step-title").textContent = "\u6BD4\u8F83\u5B8C\u6210 \xB7 " + good + " / " + this.variants.length + " \u4E2A\u65B9\u6848\u65E0\u6821\u9A8C\u9519\u8BEF";
          r.querySelector(".wf-event-log").textContent = "\u4E09\u79CD\u65B9\u6848\u5747\u7531\u672C\u5730\u7F16\u6392\u4E0E\u6821\u9A8C\u4EE3\u7801\u72EC\u7ACB\u751F\u6210\u3002\u70B9\u51FB\u65B9\u6848\u5361\u5207\u6362\u8F93\u5165\u3001\u8F93\u51FA\u548C\u5F02\u5E38\u8BE6\u60C5\u3002";
          this.node("O2", { \u8BF4\u660E: good ? "\u8BF7\u6BD4\u8F83\u540E\u786E\u8BA4\u65B9\u6848" : "\u5168\u90E8\u65B9\u6848\u4ECD\u5B58\u5728\u6821\u9A8C\u9519\u8BEF\uFF0C\u8BF7\u5148\u4FEE\u6539\u6761\u4EF6" }, good ? "warning" : "error");
          await this.save();
        } catch (error) {
          const code = error.businessCode || "RUNTIME_FAILURE";
          const risk = error.risk || "RISK_output_0";
          this.issue(code, error.businessCode ? error.message : "\u672C\u5730\u6267\u884C\u5931\u8D25\uFF1A" + error.message, "error", null, error.businessCode === "NO_LOCAL_DATA" ? "\u6362\u7528\u672C\u5730\u652F\u6301\u7684\u76EE\u7684\u5730\uFF0C\u6216\u8865\u5145\u53EF\u9760\u8D44\u6599\u540E\u518D\u8FD0\u884C\u3002" : "\u4FEE\u6B63\u8F93\u5165\u6216\u68C0\u67E5\u6570\u636E\u540E\u91CD\u65B0\u8FD0\u884C\u3002", risk);
          this.node(risk.startsWith("RISK_research") ? "OUT_B1" : "OUT_A1", { \u8F93\u5165: this.request, \u8BF4\u660E: error.message }, "error");
          const failure = { plan: null, planName: "\u8F93\u5165\u68C0\u67E5", stage: "intake", name: "\u8F93\u5165\u6216\u6570\u636E\u5F02\u5E38", id: risk, input: this.request, output: { \u9519\u8BEF: error.message }, state: "error", duration: 0 };
          this.records.push(failure);
          this.selectedRecord = failure;
          v.select(risk);
          r.querySelector(".wf-step-title").textContent = "\u8FD0\u884C\u5DF2\u963B\u65AD \xB7 " + error.message;
          r.querySelector(".wf-event-log").textContent = "\u672C\u8F6E\u672A\u5B8C\u6210\u65B9\u6848\u751F\u6210\uFF0C\u5F02\u5E38\u539F\u56E0\u89C1\u4E0B\u65B9\uFF1B\u4FEE\u6539\u8F93\u5165\u540E\u53EF\u76F4\u63A5\u91CD\u8BD5\u3002";
          this.render();
          v.update();
          await this.save();
        } finally {
          this.busy = false;
          button.disabled = false;
          button.textContent = "\u25B6 \u8FD0\u884C\u5E76\u6BD4\u8F83\u65B9\u6848";
          r.querySelectorAll(".wf-sim-controls button,.wf-sim-controls select,[data-action=fill-scenario]").forEach((x) => x.disabled = false);
          this.render();
        }
      }
      applyRules(result, index) {
        if (!result) return;
        for (const [code, outcome] of Object.entries(result.byCode || {})) {
          const id = "RULE_" + code, n = this.v.byId.get(id);
          if (!n) continue;
          const problems = outcome.violations || [], state = problems.some((x) => x.severity === "error") ? "error" : problems.some((x) => x.severity === "warning") ? "warning" : "done";
          this.node(id, outcome, state);
          this.node("IN_" + id, { \u65B9\u6848: this.variants[index]?.name || "\u5F53\u524D\u65B9\u6848", \u68C0\u67E5\u6570\u91CF: outcome.checked });
          this.node("OUT_" + id, outcome, state);
        }
      }
      choose(index) {
        const candidate = this.variants[index];
        if (!candidate?.result) return;
        this.selectedVariant = index;
        for (const n of this.v.data.nodes.filter((n2) => n2.id.startsWith("RISK_"))) {
          n.runtimeValue = null;
          n.state = "idle";
        }
        for (const issue of this.issues.filter((x) => x.plan === null || x.plan === index)) this.node(issue.risk, { \u8BF4\u660E: issue.message, \u5EFA\u8BAE: issue.suggestion }, issue.severity === "error" ? "error" : "warning");
        this.v.runtimeResult = candidate.result;
        this.fields(candidate.result.itinerary.meta);
        for (const record of candidate.records) {
          this.node("IN_" + record.id, record.input);
          this.node("OUT_" + record.id, record.output, record.state);
          this.node(record.id, record.output, record.state);
        }
        this.applyRules(candidate.result.verifyResult, index);
        this.selectedRecord = candidate.records.at(-1) || null;
        this.v.select("OPTION_" + index);
        this.v.root.querySelector(".wf-runtime-result").textContent = candidate.name + " \xB7 " + candidate.result.itinerary.meta.destination + " \xB7 " + candidate.result.itinerary.days.length + "\u5929 \xB7 \u4F30\u7B97\u8D39\u7528 \xA5" + candidate.cost;
        this.render();
        this.v.update();
      }
      render() {
        if (!this.v.root) return;
        this.renderCandidates();
        this.renderRecords();
        this.renderIssues();
        this.syncStats();
        if (this.v.byId.has(this.v.selected)) this.v.renderDetails(this.v.byId.get(this.v.selected));
        this.v.ops?.update();
      }
      syncStats() {
        const v = this.v, values = [v.data.nodes.filter((n) => n.layer === "workflow").length, v.data.edges.length, v.data.nodes.filter((n) => n.category === "input" || n.category === "output" || n.category === "value").length, this.variants.filter((x) => x.result).length, this.issues.length];
        v.root.querySelectorAll(".wf-stats strong").forEach((el, i) => {
          const small = el.querySelector("small");
          el.firstChild.textContent = String(values[i]).padStart(2, "0");
          if (small && i === 4) small.textContent = this.issues.some((x) => x.severity === "error") ? "\u542B\u963B\u65AD\u95EE\u9898" : "\u8F93\u5165\u4E0E\u6821\u9A8C\u63D0\u9192";
        });
      }
      renderCandidates() {
        const target = this.v.root.querySelector(".wf-candidates");
        if (!target) return;
        const names = ["\u539F\u59CB\u504F\u597D", "\u8212\u9002\u66FF\u4EE3", "\u63A2\u7D22\u66FF\u4EE3"];
        target.innerHTML = names.map((name, i) => {
          const c = this.variants[i];
          return `<button class="wf-candidate ${this.selectedVariant === i && c ? "selected" : ""} ${c?.state || "idle"}" data-candidate="${i}" ${!c?.result || this.busy ? "disabled" : ""}><div class="wf-candidate-top"><b>\u65B9\u6848${["\u4E00", "\u4E8C", "\u4E09"][i]} \xB7 ${escape(c?.name || name)}</b><span>${!c ? "\u5F85\u751F\u6210" : c.state === "running" ? "\u8BA1\u7B97\u4E2D" : c.state === "error" ? "\u5B58\u5728\u9519\u8BEF" : "\u5DF2\u5B8C\u6210"}${this.recommended === i && c?.state === "done" ? " \xB7 \u4F18\u5148\u67E5\u770B" : ""}</span></div>${c?.result ? `<div class="wf-candidate-metrics"><span>\xA5${c.cost}<small>\u4F30\u7B97\u603B\u8D39\u7528</small></span><span>${c.activities}<small>\u6E38\u89C8\u6D3B\u52A8</small></span><span>${Math.round(c.transit)} \u5206\u949F<small>\u603B\u901A\u52E4</small></span></div><p>\u9519\u8BEF ${c.result.verifyResult.errors.length} \xB7 \u63D0\u9192 ${c.result.verifyResult.warnings.length} \xB7 \u4FEE\u590D ${c.result.repairResult.rounds.length} \u8F6E</p><div class="wf-candidate-desc">${c.note ? escape(c.note) : "\u76EE\u7684\u5730\u3001\u65E5\u671F\u3001\u4EBA\u6570\u3001\u9884\u7B97\u4FDD\u6301\u539F\u8F93\u5165\uFF1B\u8282\u594F\u4E3A" + chinese(c.pace)}${c.sameAs ? " \xB7 \u4E0E\u201C" + escape(c.sameAs) + "\u201D\u884C\u7A0B\u76F8\u540C" : ""}</div>` : `<p>${c ? "\u6B63\u5728\u72EC\u7ACB\u7F16\u6392\u4E0E\u6821\u9A8C\u2026" : "\u8FD0\u884C\u540E\u751F\u6210\u5B9E\u9645\u884C\u7A0B\u3001\u6210\u672C\u548C\u6821\u9A8C\u7ED3\u679C\u3002"}</p>`}</button>`;
        }).join("");
        target.querySelectorAll("[data-candidate]").forEach((b) => b.onclick = () => {
          this.choose(+b.dataset.candidate);
          this.save();
        });
      }
      renderRecords() {
        const target = this.v.root.querySelector(".wf-live-records");
        if (!target) return;
        const rows = this.records.filter((x) => x.plan === this.selectedVariant || x.plan === null);
        target.innerHTML = rows.length ? rows.map((record) => `<button class="wf-live-record ${this.selectedRecord === record ? "selected" : ""}" data-record="${this.records.indexOf(record)}"><span>${escape(record.name)}</span><small class="${record.state}">${STATUS[record.state]}${record.duration ? " \xB7 " + record.duration + "\u6BEB\u79D2" : ""}</small><em>\u5165\uFF1A${escape(brief2(record.input).slice(0, 68))}</em><em>\u51FA\uFF1A${escape(record.output == null ? "\u5904\u7406\u4E2D" : brief2(record.output).slice(0, 68))}</em></button>`).join("") : '<div class="wf-empty">\u70B9\u51FB\u201C\u8FD0\u884C\u5E76\u6BD4\u8F83\u65B9\u6848\u201D\uFF0C\u9010\u6B65\u67E5\u770B\u4E03\u9636\u6BB5\u5B9E\u9645\u8F93\u5165\u3001\u8F93\u51FA\u4E0E\u5F02\u5E38\u3002</div>';
        target.querySelectorAll("[data-record]").forEach((b) => b.onclick = () => {
          this.selectedRecord = this.records[+b.dataset.record];
          this.v.select(this.selectedRecord.id);
          this.renderRecords();
        });
      }
      renderIssues() {
        const target = this.v.root.querySelector(".wf-issues");
        if (!target) return;
        const items = this.issues.filter((x) => x.plan === null || x.plan === this.selectedVariant);
        target.innerHTML = items.length ? items.map((x) => `<div class="wf-issue ${x.severity}"><b>${x.severity === "error" ? "\u963B\u65AD" : "\u63D0\u9192"}${x.plan === null ? "" : " \xB7 \u65B9\u6848" + ["\u4E00", "\u4E8C", "\u4E09"][x.plan]}</b><span>${escape(chinese(x.message))}</span><small>${escape(chinese(x.suggestion))}</small></div>`).join("") : '<div class="wf-empty">' + (this.records.length ? "\u672C\u8F6E\u6240\u9009\u65B9\u6848\u6682\u65E0\u5F02\u5E38\u8BB0\u5F55\u3002" : "\u5F85\u8FD0\u884C\uFF1B\u5F02\u5E38\u7C92\u5B50\u4EC5\u8868\u793A\u68C0\u67E5\u5165\u53E3\uFF0C\u5C1A\u672A\u89E6\u53D1\u3002") + "</div>";
      }
      detail(n) {
        const record = this.selectedRecord?.id === n.id ? this.selectedRecord : null, value = record ? { \u65B9\u6848: record.planName, \u8F93\u5165: record.input, \u8F93\u51FA: record.output, \u8017\u65F6\u6BEB\u79D2: record.duration } : n.runtimeValue;
        return { state: STATUS[n.state] || "\u5F85\u8FD0\u884C", value: value == null ? "\u5C1A\u672A\u8FD0\u884C\uFF0C\u5F53\u524D\u53EA\u663E\u793A\u4E1A\u52A1\u7ED3\u6784\u5B9A\u4E49\u3002" : JSON.stringify(chinese(value), null, 2) };
      }
      async save() {
        try {
          await this.v.app.vault.adapter.write(this.v.plugin.manifest.dir + "/last-business-run.json", JSON.stringify({ request: this.request, variants: this.variants, issues: this.issues, records: this.records, selectedVariant: this.selectedVariant, recommended: this.recommended }));
        } catch (e) {
          this.v.root.querySelector(".wf-event-log").textContent += "\n\u672C\u8F6E\u7ED3\u679C\u4FDD\u5B58\u5931\u8D25\uFF1A" + e.message;
        }
      }
      async restore() {
        try {
          const path = this.v.plugin.manifest.dir + "/last-business-run.json";
          if (!await this.v.app.vault.adapter.exists(path)) return;
          const saved = JSON.parse(await this.v.app.vault.adapter.read(path));
          if (!Array.isArray(saved.records)) return;
          Object.assign(this, { request: saved.request || "", variants: saved.variants || [], issues: saved.issues || [], records: saved.records, selectedVariant: saved.selectedVariant || 0, recommended: saved.recommended });
          this.v.root.querySelector(".wf-runtime-request").value = this.request;
          this.records = this.variants.length ? this.variants.flatMap((c) => c.records || []) : saved.records;
          for (const c of this.variants) for (const record of c.records || []) if (record.output) this.addEvidence(record.stage, record.output, c.index);
          for (const c of this.variants) this.node("OPTION_" + c.index, { \u65B9\u6848: c.name, \u8D39\u7528: c.cost, \u72B6\u6001: c.state }, c.state);
          if (this.variants[this.selectedVariant]?.result) this.choose(this.selectedVariant);
          else {
            for (const issue of this.issues) this.node(issue.risk, { \u8BF4\u660E: issue.message, \u5EFA\u8BAE: issue.suggestion }, issue.severity === "error" ? "error" : "warning");
            this.selectedRecord = this.records.at(-1);
            if (this.selectedRecord) this.v.select(this.selectedRecord.id);
            this.render();
          }
          if (this.records.length) this.v.root.querySelector(".wf-sim-badge").textContent = "\u4E0A\u6B21\u672C\u5730\u8FD0\u884C \xB7 \u5DF2\u4FDD\u5B58";
        } catch (e) {
          this.v.root.querySelector(".wf-event-log").textContent = "\u4E0A\u6B21\u7ED3\u679C\u672A\u80FD\u8BFB\u53D6\uFF0C\u53EF\u91CD\u65B0\u8FD0\u884C\u3002";
        }
      }
    };
    module2.exports = { BusinessController: BusinessController2 };
  }
});

// src/output-hit-test.js
var require_output_hit_test = __commonJS({
  "src/output-hit-test.js"(exports2, module2) {
    "use strict";
    function pointSegmentDistance(point, segment) {
      const dx = segment.x2 - segment.x1, dy = segment.y2 - segment.y1, length = dx * dx + dy * dy;
      if (!Number.isFinite(length) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return Infinity;
      const t = length ? Math.max(0, Math.min(1, ((point.x - segment.x1) * dx + (point.y - segment.y1) * dy) / length)) : 0;
      return Math.hypot(point.x - segment.x1 - t * dx, point.y - segment.y1 - t * dy);
    }
    function nearestSegment(point, segments, tolerance) {
      let best = null, distance = tolerance;
      for (const segment of segments) {
        const d = pointSegmentDistance(point, segment);
        if (d < distance) {
          best = segment;
          distance = d;
        }
      }
      return best ? { ...best, distance } : null;
    }
    function pickOutput(point, markers, rays) {
      return nearestSegment(point, markers, 7) || nearestSegment(point, rays, 3);
    }
    var outputKey = (row) => JSON.stringify([row.plan, row.record?.stage, row.path]);
    module2.exports = { pointSegmentDistance, pickOutput, outputKey };
  }
});

// src/ops-board.js
var require_ops_board = __commonJS({
  "src/ops-board.js"(exports2, module2) {
    "use strict";
    /*!
     * Paper engineering flywheel adapted from cyberdaddyleo/agent-display, MIT.
     * Copyright (c) 2026 cyberdaddy. See upstream-agent-display/LICENSE.
     * Upstream commit: b2f6cece9e3010b6a2fa09410b754101d87b9a0f.
     * This integration replaces all simulated tasks, code, token and cost samples
     * with Wayfarer's actual phase records, field values and verifier outputs.
     */
    var { STAGES, chinese, brief: brief2 } = require_semantic_model();
    var { pickOutput, outputKey } = require_output_hit_test();
    var esc2 = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    var TAU = Math.PI * 2;
    var SPIN = 0.16;
    var FONT = '"Microsoft YaHei","PingFang SC",monospace';
    var hash = (s) => {
      let n = 2166136261;
      for (const c of String(s)) {
        n ^= c.charCodeAt(0);
        n = Math.imul(n, 16777619);
      }
      return (n >>> 0) / 4294967296;
    };
    var wrapPI = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
    var rgba = (hex, a) => {
      const x = parseInt(hex.slice(1), 16);
      return `rgba(${x >> 16 & 255},${x >> 8 & 255},${x & 255},${a})`;
    };
    function flatten(value, prefix = "", limit = 120) {
      const rows = [];
      const visit = (v, path, depth) => {
        if (rows.length >= limit) return;
        if (v == null || typeof v !== "object") {
          rows.push({ path, payload: v, value: v == null ? "\u7A7A\u503C" : typeof v === "boolean" ? v ? "\u662F" : "\u5426" : String(v), text: path + "\uFF1A" + (typeof v === "boolean" ? v ? "\u662F" : "\u5426" : String(v ?? "\u7A7A\u503C")) });
          return;
        }
        const entries = Array.isArray(v) ? v.map((x, i) => ["\u7B2C" + (i + 1) + "\u9879", x]) : Object.entries(v);
        if (!entries.length) {
          rows.push({ path, payload: v, value: "\u7A7A", text: path + "\uFF1A\u7A7A" });
          return;
        }
        if (depth >= 4) {
          rows.push({ path, payload: v, value: brief2(v), text: path + "\uFF1A" + brief2(v) });
          return;
        }
        for (const [k, x] of entries) visit(x, path ? path + " / " + k : k, depth + 1);
      };
      visit(chinese(value), prefix, 0);
      return rows;
    }
    function compactRow(row) {
      const path = String(row.path || "").split(" / ").filter(Boolean);
      const label = path.slice(-2).join(" / ") || path[0] || "\u5B57\u6BB5";
      return label + "\uFF1A" + String(row.value ?? "\u7A7A\u503C").slice(0, 24);
    }
    function createOpsBoard2(view, host) {
      host.innerHTML = `<div class="wf-ops-stage"><canvas tabindex="0" aria-label="\u5DE5\u7A0B\u5168\u666F\uFF1A\u4EFB\u52A1\u6C47\u805A\u3001\u771F\u5B9E\u8F93\u5165\u8F93\u51FA\u73AF\u5E26\u548C\u8F93\u51FA\u8C31\u7EBF"></canvas><div class="wf-ops-caption"><b>\u884C\u8FF9 / \u8FD0\u884C\u8C03\u5EA6\u4E2D\u5FC3</b><span>\u771F\u5B9E\u4EFB\u52A1\u6C47\u805A \xB7 \u8F93\u5165\u8F93\u51FA\u73AF\u5E26 \xB7 \u8F93\u51FA\u8C31\u7EBF</span></div><div class="wf-ops-clock"></div><div class="wf-ops-legend">\u6BCF\u6761\u6C47\u805A\u7EBF\u4E0E\u8C31\u7EBF\u5747\u53EF\u8FFD\u6EAF\u5B9E\u9645\u5B57\u6BB5 \xB7 \u62D6\u52A8\u73AF\u5E26\u65CB\u8F6C \xB7 \u6EDA\u8F6E\u7F29\u653E \xB7 \u53CC\u51FB\u590D\u4F4D</div><button class="wf-ops-output-toggle">\u8F93\u51FA\u76EE\u5F55</button><aside class="wf-ops-output-directory" hidden><div><b>\u5B9E\u9645\u8F93\u51FA\u5B57\u6BB5</b><button class="wf-ops-output-close" aria-label="\u5173\u95ED\u8F93\u51FA\u76EE\u5F55">\xD7</button></div><input class="wf-ops-output-search" placeholder="\u641C\u7D22\u9636\u6BB5 / \u5B57\u6BB5 / \u503C" aria-label="\u641C\u7D22\u5B9E\u9645\u8F93\u51FA"><div class="wf-ops-output-count"></div><div class="wf-ops-output-rows"></div></aside><aside class="wf-ops-inspector" hidden><button class="wf-ops-close" aria-label="\u5173\u95ED\u6570\u636E\u8BE6\u60C5">\xD7</button><b></b><pre></pre><button class="wf-ops-more">\u67E5\u770B\u5B8C\u6574\u8BB0\u5F55 \u2193</button></aside></div><div class="wf-ops-monitors"><article><h3>\u4EFB\u52A1\u6C47\u805A <span>\u5B9E\u9645\u9636\u6BB5\u4E8B\u4EF6</span></h3><div class="wf-ops-feed"></div></article><article><h3>\u8F93\u5165 / \u8F93\u51FA <span class="wf-ops-payload-caption">\u7B49\u5F85\u8FD0\u884C</span></h3><pre class="wf-ops-payload"></pre></article><article><h3>\u89C4\u5219\u6821\u9A8C <span>\u6240\u9009\u65B9\u6848</span></h3><div class="wf-ops-checks"></div></article><article><h3>\u9636\u6BB5\u8017\u65F6 <span>\u5B9E\u6D4B\u6BEB\u79D2</span></h3><div class="wf-ops-durations"></div></article></div><div class="wf-ops-source">\u5DE5\u7A0B\u56FE\u89C6\u89C9\u6539\u7F16\u81EA <a href="https://github.com/cyberdaddyleo/agent-display">\u8D5B\u535A\u8001\u7238 \xB7 agent-display</a>\uFF08MIT\uFF09 \xB7 \u5F53\u524D\u5185\u5BB9\u6765\u81EA\u672C\u5730\u771F\u5B9E\u8FD0\u884C\uFF0C\u672A\u63A5\u5165\u4E91\u7AEF\u7528\u91CF\u7EDF\u8BA1</div>`;
      const canvas = host.querySelector("canvas"), ctx = canvas.getContext("2d"), stage = host.querySelector(".wf-ops-stage"), inspector = host.querySelector(".wf-ops-inspector"), directory = host.querySelector(".wf-ops-output-directory");
      let W = 1, H = 1, DPR = 1, G = null, T = null, hubs = [], blocks = [], streaks = [], pulses = [], blockFS = 8, blockLH = 10, hoverHub = -1, hoverRow = null, angle = 0, lastTime = null, zoom = 1, drag = null, dataKey = "", model = null, layer = null, hitPoints = [], outputMarkers = [], outputRays = [], selectedOutputKey = null, hoveredOutputKey = null, outputQuery = "", clockKey = "";
      const stats = { frames: 0, sourceRows: 0, outputRows: 0, blocks: 0, records: 0, simulated: false, paused: false };
      const ax = (r, y) => G.cx + Math.sqrt(Math.max(0, r * r - (y - G.cy) ** 2));
      const visAng = (r, pad) => Math.asin(Math.min(1, (Math.max(G.cy, H - G.cy) + pad) / r));
      const qd = (c, q) => {
        c.beginPath();
        c.moveTo(q.x1, q.y1);
        c.quadraticCurveTo(q.cx, q.cy, q.x2, q.y2);
        c.stroke();
      };
      const bez = (q, u) => [(1 - u) ** 2 * q.x1 + 2 * (1 - u) * u * q.cx + u * u * q.x2, (1 - u) ** 2 * q.y1 + 2 * (1 - u) * u * q.cy + u * u * q.y2];
      const palette = () => view.opsTheme === "paper" ? { dark: false, bg: "#eeede8", band: "#eeede8", line: "#262824", hi: "#111713", hot: "#141a16", text: "#20271f", dim: "#767b70", error: "#a34933" } : { dark: true, bg: "#030905", band: "#041009", line: "#3bba83", hi: "#e0fff0", hot: "#68ffc0", text: "#a6edc9", dim: "#40795c", error: "#ffb184" };
      function layout() {
        const r = stage.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) return false;
        W = r.width;
        H = r.height;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        const narrow = W < 850, R1 = Math.max(H * (narrow ? 1.12 : 0.94), W * (narrow ? 0.57 : 0.26)) * zoom;
        G = { cx: W * (narrow ? 0.34 : 0.37) - R1, cy: H * 0.51, R1, R2: R1 + W * (narrow ? 0.29 : 0.235), narrow };
        buildGeometry();
        return true;
      }
      function stateModel() {
        const b = view.business, records = b.records || [], variants = b.variants || [], selected = b.selectedVariant || 0;
        const key = [selected, b.busy, b.request, view.mode, view.query, view.focusGroup, view.opsTheme, ...records.map((r) => r.plan + ":" + r.stage + ":" + r.state + ":" + r.duration), ...variants.map((v) => v.state + ":" + v.name + ":" + v.result?.verifyResult.errors.length)].join("|");
        if (key === dataKey) return false;
        dataKey = key;
        const filter = (row) => {
          const stageId = STAGES[row.record?.stage]?.id, group = view.byId.get(stageId)?.group;
          return (!view.focusGroup || group === view.focusGroup) && (!view.query || (row.text + " " + row.record?.name).toLowerCase().includes(view.query));
        };
        const businessRows = (value, prefix, limit) => view.mode === "workflow" ? [{ path: prefix, value: brief2(value), text: prefix + "\uFF1A" + brief2(value) }] : flatten(value, prefix, limit);
        const selectedRecords = records.filter((r) => r.plan === selected || r.plan === null);
        const sources = [0, 1, 2].map((plan) => {
          const rs = records.filter((r) => r.plan === plan || r.plan === null && plan === 0);
          return rs.flatMap((record) => businessRows(record.input, "\u8F93\u5165 \xB7 " + record.name, 70).map((row) => ({ ...row, record, plan }))).filter(filter).slice(0, 180);
        });
        const outputs = selectedRecords.flatMap((record) => record.output == null ? [] : businessRows(record.output, "\u8F93\u51FA \xB7 " + record.name, 100).map((row) => ({ ...row, record, plan: selected }))).filter(filter).slice(0, 650).map((row) => ({ ...row, outputKey: outputKey(row) }));
        const descriptors = records.length ? selectedRecords : Object.values(STAGES).map((s) => ({ name: s.name, input: view.byId.get(s.id)?.input, output: view.byId.get(s.id)?.output, state: "idle", id: s.id, definition: true }));
        model = { records, variants, selected, selectedRecords, sources, outputs, descriptors, issues: b.issues.filter((i) => i.plan === null || i.plan === selected) };
        stats.sourceRows = sources.reduce((s, a) => s + a.length, 0);
        stats.outputRows = outputs.length;
        if (selectedOutputKey && !outputs.some((row) => row.outputKey === selectedOutputKey)) {
          selectedOutputKey = null;
          inspector.hidden = true;
        }
        if (hoveredOutputKey && !outputs.some((row) => row.outputKey === hoveredOutputKey)) {
          hoveredOutputKey = null;
          hoverRow = null;
        }
        renderOutputDirectory();
        stats.records = records.length;
        stats.variants = variants.filter((v) => v.result).length;
        T = palette();
        buildGeometry();
        renderMonitors();
        return true;
      }
      function buildGeometry() {
        if (!G || !model) return;
        T = palette();
        const { cx, cy, R1, R2, narrow } = G;
        hubs = [];
        hitPoints = [];
        for (let i = 0; i < 3; i++) {
          const y = cy + H * [-0.31, 0, 0.31][i], x = ax(R1, y) - 3, rows = model.sources[i], curves = rows.map((row, j) => {
            const sx = 12 + hash(row.text + "x" + j) * Math.max(8, x - 65), sy = 20 + hash(row.text + "y" + j) * (H - 40);
            return { x1: sx, y1: sy, cx: x - (x - sx) * (0.22 + hash(j + "bend") * 0.18), cy: y + (sy - y) * 0.1, x2: x, y2: y + (hash(j + "dy") - 0.5) * 2, row };
          });
          hubs.push({ x, y, curves, plan: i });
        }
        layer = document.createElement("canvas");
        layer.width = canvas.width;
        layer.height = canvas.height;
        const c = layer.getContext("2d");
        c.setTransform(DPR, 0, 0, DPR, 0, 0);
        c.fillStyle = T.bg;
        c.fillRect(0, 0, W, H);
        c.strokeStyle = T.line;
        for (const hub of hubs) {
          for (const q of hub.curves) {
            c.globalAlpha = T.dark ? 0.27 : 0.24;
            c.lineWidth = 0.55;
            qd(c, q);
            c.fillStyle = T.line;
            c.globalAlpha = 0.6;
            c.fillRect(q.x1 - 1, q.y1 - 1, 1.6, 1.6);
            hitPoints.push({ x: q.x1, y: q.y1, kind: "row", row: q.row });
          }
        }
        c.globalAlpha = 1;
        c.beginPath();
        c.arc(cx, cy, R2, 0, TAU);
        c.arc(cx, cy, R1, 0, TAU, true);
        c.fillStyle = T.band;
        c.fill();
        for (const radius of [R1, R2, R2 - 7]) {
          c.beginPath();
          c.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2);
          c.strokeStyle = T.line;
          c.lineWidth = radius === R2 - 7 ? 0.6 : 1;
          c.globalAlpha = radius === R2 - 7 ? 0.26 : 0.7;
          c.stroke();
        }
        c.globalAlpha = 1;
        blockFS = narrow ? 6.5 : 8.5;
        blockLH = blockFS * 1.38;
        blocks = [];
        for (let col = 0; col < 2; col++) {
          const groups = [];
          for (const record of model.descriptors) {
            const value = col ? record.output : record.input, rows = view.mode === "workflow" ? [{ text: (col ? "\u8F93\u51FA\uFF1A" : "\u8F93\u5165\uFF1A") + brief2(value) }] : flatten(value, col ? "\u8F93\u51FA" : "\u8F93\u5165", 12), heading = (record.definition ? "\u7ED3\u6784\u5B9A\u4E49 \xB7 " : "") + record.name;
            groups.push({ lines: [heading, ...rows.slice(0, 3).map(compactRow)], record });
          }
          const count = groups.length || 1;
          groups.forEach((group, j) => {
            const maxLines = Math.max(2, Math.min(4, Math.floor((TAU * R1 / count - 7) / blockLH)));
            const lines = group.lines.slice(0, maxLines).map((s) => s.length > 34 ? s.slice(0, 33) + "\u2026" : s);
            blocks.push({ type: "table", lines, h: lines.length * blockLH + 4, th: (j + 0.5) / count * TAU, col, ind: 0, seed: j, record: group.record });
          });
        }
        streaks = model.outputs.map((row, i) => {
          const a = hash(row.path + row.value), content = Math.log2(row.text.length + 1) / 9;
          return { th: (i + 0.5) / Math.max(1, model.outputs.length) * TAU, off: 18 + 3 * a, f: Math.min(0.98, 0.18 + content * 0.72), b: Math.min(3, Math.floor(content * 4)), hot: row.record.state === "error" || /错误|未解决/.test(row.path) && row.value !== "0", d: [{ p: a, len: 6 + row.text.length * 0.18, v: 0.055 + a * 0.09 }], row };
        });
        stats.blocks = blocks.length;
        stats.spectrumLines = streaks.length;
        stats.curves = hubs.reduce((sum, h) => sum + h.curves.length, 0);
      }
      function drawThreads(c, t) {
        for (const hub of hubs) {
          for (let i = 0; i < hub.curves.length; i += Math.max(1, Math.floor(hub.curves.length / 28))) {
            const q = hub.curves[i], u = (t * 0.17 + hash(q.row.text)) % 1;
            if (!view.motionEnabled) continue;
            c.save();
            c.strokeStyle = T.dark ? T.hi : T.line;
            c.globalAlpha = hub.plan === model.selected ? 0.8 : 0.37;
            c.lineWidth = T.dark ? 1.3 : 1.1;
            if (T.dark && view.effectStrength) {
              c.shadowColor = T.hot;
              c.shadowBlur = 6 * view.effectStrength;
            }
            c.beginPath();
            const tail = view.trailsEnabled ? 0.075 : 2e-3;
            for (let k = 0; k <= 6; k++) {
              const p = bez(q, Math.max(0, u - tail) + tail * k / 6);
              k ? c.lineTo(...p) : c.moveTo(...p);
            }
            c.stroke();
            c.restore();
          }
        }
      }
      function drawHubLabels(c, t) {
        for (let i = 0; i < hubs.length; i++) {
          const h = hubs[i], variant = model.variants[i], name = variant?.name || "\u5F85\u751F\u6210", state = variant?.state === "running" ? "\u6B63\u5728\u5904\u7406" : variant?.state === "error" ? "\u6709\u963B\u65AD\u95EE\u9898" : variant?.result ? "\u5DF2\u5B8C\u6210" : "\u7B49\u5F85\u9700\u6C42", label = "\u65B9\u6848" + ["\u4E00", "\u4E8C", "\u4E09"][i] + " \xB7 " + name, x = h.x - 24, y = h.y - 15;
          c.font = "600 11px " + FONT;
          c.textAlign = "right";
          const width = c.measureText(label).width;
          c.fillStyle = T.bg;
          c.fillRect(x - width - 8, y - 11, width + 16, 21);
          c.strokeStyle = T.line;
          c.globalAlpha = 0.7;
          c.strokeRect(x - width - 8, y - 11, width + 16, 21);
          c.globalAlpha = 1;
          c.fillStyle = variant?.state === "error" ? T.error : T.text;
          c.fillText(label, x, y + 3);
          c.font = "8px " + FONT;
          c.fillStyle = T.dim;
          c.fillText(h.curves.length + " \u4E2A\u5B9E\u9645\u8F93\u5165\u5B57\u6BB5 \xB7 " + state, x, y + 26);
          c.beginPath();
          c.arc(h.x, h.y, hoverHub === i ? 12 : 7, 0, TAU);
          c.strokeStyle = T.dark ? T.hot : T.line;
          c.lineWidth = hoverHub === i ? 1.5 : 0.8;
          c.stroke();
          if (variant?.state === "running") {
            const age = t * 0.8 % 1;
            c.globalAlpha = 1 - age;
            c.beginPath();
            c.arc(h.x, h.y, 10 + age * 25, 0, TAU);
            c.stroke();
            c.globalAlpha = 1;
          }
        }
        c.textAlign = "left";
      }
      function markSelectedOutput(c, t) {
        const key = hoveredOutputKey || selectedOutputKey, segment = outputMarkers.find((x) => x.key === key);
        if (segment) {
          const row = segment.row, x = (segment.x1 + segment.x2) / 2, y = (segment.y1 + segment.y2) / 2;
          c.save();
          c.strokeStyle = T.dark ? T.hi : "#935328";
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(segment.x1, segment.y1);
          c.lineTo(segment.x2, segment.y2);
          c.stroke();
          c.lineWidth = 0.75;
          c.beginPath();
          c.arc(x, y, 6, 0, TAU);
          c.stroke();
          const label = row.record.name + " \xB7 " + row.path.split(" / ").slice(-2).join(" / ") + "\uFF1A" + row.value.slice(0, 28);
          c.font = "9px " + FONT;
          const width = Math.min(W - 30, c.measureText(label).width + 12), tx = Math.max(10, Math.min(W - width - 10, x + 13)), ty = Math.max(37, Math.min(H - 49, y - 16));
          c.fillStyle = T.bg;
          c.globalAlpha = 0.96;
          c.fillRect(tx - 4, ty - 12, width, 19);
          c.globalAlpha = 1;
          c.fillStyle = T.text;
          c.textAlign = "left";
          c.fillText(label, tx, ty, width - 9);
          c.restore();
        }
        stats.outputMarkers = outputMarkers.length;
        stats.selectedOutputKey = selectedOutputKey;
        c.font = "8px " + FONT;
        c.fillStyle = T.dim;
        c.textAlign = "right";
        c.fillText(model.outputs.length + " \u6761\u5B9E\u9645\u8F93\u51FA \xB7 \u60AC\u505C\u77ED\u6760\u67E5\u770B\u503C \xB7 \u70B9\u51FB\u67E5\u770B\u5B8C\u6574\u8F93\u51FA", W - 20, H - 40);
        c.textAlign = "left";
      }
      function renderOutputDirectory() {
        if (!model) return;
        host.querySelector(".wf-ops-output-toggle").textContent = "\u8F93\u51FA\u76EE\u5F55\uFF08" + model.outputs.length + "\uFF09";
        if (directory.hidden) return;
        const rows = model.outputs.filter((row) => (row.text + " " + row.record.name).toLowerCase().includes(outputQuery));
        host.querySelector(".wf-ops-output-count").textContent = "\u663E\u793A " + rows.length + " / " + model.outputs.length + " \u4E2A\u5B9E\u9645\u5B57\u6BB5";
        const list = host.querySelector(".wf-ops-output-rows");
        list.innerHTML = rows.length ? rows.map((row, i) => `<button data-output-row="${i}" class="${row.outputKey === selectedOutputKey ? "selected" : ""}"><b>${esc2(row.record.name + " \xB7 " + row.path.split(" / ").slice(-2).join(" / "))}</b><span>${esc2(row.value.slice(0, 100))}</span></button>`).join("") : '<div class="wf-empty">\u6CA1\u6709\u5339\u914D\u7684\u5B9E\u9645\u8F93\u51FA\u3002</div>';
        list.querySelectorAll("[data-output-row]").forEach((button) => button.onclick = () => {
          const row = rows[+button.dataset.outputRow], current = model.outputs.find((x) => x.outputKey === row.outputKey);
          if (!current) return;
          const streak = streaks.find((x) => x.row.outputKey === current.outputKey);
          if (streak) angle = -streak.th;
          directory.hidden = true;
          hoveredOutputKey = null;
          hoverRow = null;
          openRecord(current.record, current);
          paint(view.motionClock);
        });
      }
      function paint(time) {
        if (view.layoutMode !== "ops" || !host.isConnected || host.offsetWidth < 10) return;
        const r = stage.getBoundingClientRect();
        if (!G || Math.abs(r.width - W) > 0.5 || Math.abs(r.height - H) > 0.5) {
          if (!layout()) return;
        }
        stateModel();
        if (!model || !layer) return;
        const delta = lastTime == null ? 0 : Math.max(0, Math.min(0.1, time - lastTime));
        lastTime = time;
        if (view.motionEnabled && view.orbitEnabled && !drag && !hoveredOutputKey && directory.hidden && inspector.hidden) angle += delta * SPIN;
        const wheelT = angle / SPIN, c = ctx;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 1;
        c.globalCompositeOperation = "source-over";
        c.drawImage(layer, 0, 0);
        c.setTransform(DPR, 0, 0, DPR, 0, 0);
        hitPoints = hitPoints.filter((p) => p.kind === "row");
        drawWheelStreaks(c, wheelT, view.motionEnabled && !drag && !hoveredOutputKey && directory.hidden && inspector.hidden ? delta : 0);
        if (view.effectStrength > 0) drawBeam(c, wheelT);
        drawGears(c, wheelT);
        drawWheelMarks(c, wheelT);
        drawThreads(c, time);
        drawBlocks(c, wheelT);
        drawHubLabels(c, time);
        markSelectedOutput(c, wheelT);
        c.globalAlpha = 1;
        stats.frames++;
        stats.angle = angle;
        stats.paused = !view.motionEnabled;
        stats.theme = view.opsTheme;
        stats.width = W;
        stats.height = H;
        const clock = (/* @__PURE__ */ new Date()).toLocaleTimeString("zh-CN", { hour12: false });
        if (clock !== clockKey) {
          clockKey = clock;
          host.querySelector(".wf-ops-clock").textContent = clock;
        }
        host.querySelector(".wf-ops-legend").textContent = model.records.length ? "\u77ED\u6760\u4E00\u4E00\u5BF9\u5E94\u5B9E\u9645\u8F93\u51FA \xB7 \u60AC\u505C\u770B\u503C \xB7 \u70B9\u51FB\u6253\u5F00\u9636\u6BB5\u8F93\u51FA \xB7 \u76EE\u5F55\u53EF\u641C\u7D22" : "\u7B49\u5F85\u771F\u5B9E\u8FD0\u884C \xB7 \u5F53\u524D\u4EC5\u663E\u793A\u6D41\u7A0B\u8F93\u5165\u8F93\u51FA\u5B9A\u4E49";
      }
      function renderMonitors() {
        if (!model) return;
        const rows = model.selectedRecords;
        host.querySelector(".wf-ops-feed").innerHTML = rows.length ? rows.slice(-8).map((r, i) => `<button data-ops-record="${model.records.indexOf(r)}"><small>${String(i + 1).padStart(2, "0")}</small><b>${esc2(r.name)}</b><span>${r.state === "running" ? "\u5904\u7406\u4E2D" : r.state === "error" ? "\u5F02\u5E38" : r.duration + "\u6BEB\u79D2"}</span></button>`).join("") : '<div class="wf-empty">\u5C1A\u672A\u8FD0\u884C\uFF0C\u4E0D\u586B\u5145\u6A21\u62DF\u4EFB\u52A1\u3002</div>';
        host.querySelectorAll("[data-ops-record]").forEach((b) => b.onclick = () => openRecord(model.records[+b.dataset.opsRecord]));
        const selected = view.business.selectedRecord || rows.at(-1);
        host.querySelector(".wf-ops-payload-caption").textContent = selected?.name || "\u7B49\u5F85\u8FD0\u884C";
        host.querySelector(".wf-ops-payload").textContent = selected ? ("\u8F93\u5165\uFF1A" + brief2(selected.input) + "\n\n\u8F93\u51FA\uFF1A" + brief2(selected.output) + "\n\n" + JSON.stringify(chinese(selected.output), null, 2)).slice(0, 2200) : "\u8FD0\u884C\u540E\u663E\u793A\u5B9E\u9645\u8F93\u5165\u3001\u8F93\u51FA\u4E0E\u5F02\u5E38\u3002";
        const candidate = model.variants[model.selected], rules = candidate?.result?.itinerary.feasibility?.rules || [];
        host.querySelector(".wf-ops-checks").innerHTML = rules.length ? rules.map((rule) => `<div class="${!rule.passed ? "bad" : rule.warnings ? "warn" : ""}"><b>${esc2(rule.title)}</b><span>${!rule.passed ? "\u672A\u901A\u8FC7" : rule.warnings ? rule.warnings + "\u9879\u63D0\u9192" : "\u901A\u8FC7"}${rule.covered === 0 ? " \xB7 \u672A\u8986\u76D6" : ""}</span></div>`).join("") : '<div class="wf-empty">\u7B49\u5F85\u771F\u5B9E\u6821\u9A8C\u7ED3\u679C\u3002</div>';
        const max = Math.max(1, ...rows.map((r) => r.duration || 0));
        host.querySelector(".wf-ops-durations").innerHTML = Object.entries(STAGES).map(([stage2, s]) => {
          const row = rows.find((r) => r.stage === stage2);
          return `<div><span>${s.name}</span><i><em style="width:${row?.state === "done" ? Math.max(2, (row.duration || 0) / max * 100) : 0}%"></em></i><small>${!row ? "\u2014" : row.state === "running" ? "\u5904\u7406\u4E2D" : row.duration}</small></div>`;
        }).join("");
      }
      function openRecord(record, row = null) {
        if (!record) return;
        if (record.plan != null && record.plan !== view.business.selectedVariant) view.business.choose(record.plan);
        const actual = view.business.records.find((r) => r.plan === record.plan && r.stage === record.stage);
        if (!actual) return;
        selectedOutputKey = row?.outputKey || null;
        view.business.selectedRecord = actual;
        view.select(actual.id);
        view.business.renderRecords();
        inspector.querySelector("b").textContent = actual.planName + " \xB7 " + actual.name;
        inspector.querySelector("pre").textContent = row ? "\u5B57\u6BB5\uFF1A" + row.path + "\n\n\u5B9E\u9645\u503C\uFF1A\n" + JSON.stringify(Object.prototype.hasOwnProperty.call(row, "payload") ? row.payload : row.value, null, 2) + "\n\n\u6240\u5C5E\u65B9\u6848\uFF1A" + actual.planName + "\n\u6240\u5C5E\u9636\u6BB5\uFF1A" + actual.name : JSON.stringify(chinese({ \u8F93\u5165: actual.input, \u8F93\u51FA: actual.output }), null, 2);
        inspector.hidden = false;
        directory.hidden = true;
        host.querySelector(".wf-ops-more").onclick = () => {
          if (view.boardFocus) {
            view.boardFocus = false;
            view.syncBoardLayout();
            view.saveEffects();
          }
          view.root.querySelector(".wf-detail").scrollIntoView({ behavior: "smooth", block: "center" });
        };
        renderMonitors();
        renderOutputDirectory();
      }
      host.querySelector(".wf-ops-close").onclick = () => {
        inspector.hidden = true;
        paint(view.motionClock);
      };
      host.querySelector(".wf-ops-output-toggle").onclick = () => {
        directory.hidden = !directory.hidden;
        inspector.hidden = true;
        hoveredOutputKey = null;
        hoverRow = null;
        renderOutputDirectory();
        if (!directory.hidden) host.querySelector(".wf-ops-output-search").focus();
      };
      host.querySelector(".wf-ops-output-close").onclick = () => {
        directory.hidden = true;
        canvas.focus();
      };
      host.querySelector(".wf-ops-output-search").oninput = (e) => {
        outputQuery = e.target.value.trim().toLowerCase();
        renderOutputDirectory();
      };
      host.querySelector(".wf-ops-output-search").onkeydown = (e) => {
        if (e.key === "Escape") {
          directory.hidden = true;
          canvas.focus();
        }
      };
      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const hitAt = (p) => {
        const output = pickOutput(p, outputMarkers, outputRays);
        if (output) return output;
        let nearest = null, dist = 8;
        for (const hit of hitPoints) {
          const d = Math.hypot(hit.x - p.x, hit.y - p.y);
          if (d < dist) {
            nearest = hit;
            dist = d;
          }
        }
        return nearest;
      };
      canvas.onpointerdown = (e) => {
        const p = pos(e), hit = hitAt(p);
        drag = { ...p, angle, moved: false, hit };
        if (hit?.kind === "output") hoveredOutputKey = hit.key;
        canvas.setPointerCapture(e.pointerId);
      };
      canvas.onpointermove = (e) => {
        const p = pos(e);
        if (drag) {
          const dx = p.x - drag.x;
          if (Math.hypot(dx, p.y - drag.y) > 4) {
            drag.moved = true;
            hoveredOutputKey = null;
            hoverRow = null;
            angle = drag.angle + dx * 5e-3;
            paint(view.motionClock);
          }
          return;
        }
        hoverHub = hubs.findIndex((h) => Math.hypot(h.x - p.x, h.y - p.y) < 28);
        hoverRow = hitAt(p);
        hoveredOutputKey = hoverRow?.kind === "output" ? hoverRow.key : null;
        canvas.style.cursor = hoverHub >= 0 || hoverRow ? "pointer" : "grab";
        const tip = view.root.querySelector(".wf-tooltip");
        tip.classList.toggle("wf-output-tooltip", !!hoveredOutputKey);
        if (hoverRow) {
          const root = view.root.getBoundingClientRect(), row = hoverRow.row;
          tip.textContent = hoveredOutputKey ? row.record.planName + "\uFF5C" + row.record.name + "\n" + row.path + "\n\u5B9E\u9645\u503C\uFF1A" + row.value.slice(0, 140) : row.text.slice(0, 140);
          tip.style.left = Math.max(8, Math.min(root.width - 410, e.clientX - root.left + 12)) + "px";
          tip.style.top = Math.max(12, e.clientY - root.top - 45) + "px";
          tip.style.display = "block";
        } else tip.style.display = "none";
        paint(view.motionClock);
      };
      canvas.onpointerup = (e) => {
        if (drag && !drag.moved) {
          const p = pos(e), index = hubs.findIndex((h) => Math.hypot(h.x - p.x, h.y - p.y) < 32);
          if (index >= 0 && model.variants[index]?.result) view.business.choose(index);
          else if (drag.hit) openRecord(drag.hit.row.record, drag.hit.row);
        }
        drag = null;
      };
      canvas.onpointercancel = () => {
        drag = null;
        hoveredOutputKey = null;
      };
      canvas.onpointerleave = () => {
        hoverHub = -1;
        hoverRow = null;
        hoveredOutputKey = null;
        view.root.querySelector(".wf-tooltip").style.display = "none";
      };
      canvas.onwheel = (e) => {
        e.preventDefault();
        hoveredOutputKey = null;
        hoverRow = null;
        zoom = Math.max(0.72, Math.min(1.35, zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06)));
        layout();
        paint(view.motionClock);
      };
      canvas.ondblclick = () => reset();
      canvas.onkeydown = (e) => {
        if (e.key === "Escape") {
          inspector.hidden = true;
          directory.hidden = true;
          selectedOutputKey = null;
          hoveredOutputKey = null;
          view.root.querySelector(".wf-tooltip").style.display = "none";
          paint(view.motionClock);
        }
        if (e.key === "Enter" && hoverRow) {
          e.preventDefault();
          openRecord(hoverRow.row.record, hoverRow.row);
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          hoveredOutputKey = null;
          angle += e.key === "ArrowLeft" ? -0.1 : 0.1;
          paint(view.motionClock);
        }
      };
      function reset() {
        selectedOutputKey = null;
        hoveredOutputKey = null;
        hoverRow = null;
        inspector.hidden = true;
        directory.hidden = true;
        angle = 0;
        zoom = 1;
        lastTime = view.motionClock;
        layout();
        paint(view.motionClock);
      }
      const observer = new ResizeObserver(() => {
        if (view.layoutMode === "ops") {
          layout();
          paint(view.motionClock);
        }
      });
      observer.observe(stage);
      const BA = [0.09, 0.17, 0.27, 0.4];
      function mulberry32(a) {
        return function() {
          let t = a += 1831565813;
          t = Math.imul(t ^ t >>> 15, t | 1);
          t ^= t + Math.imul(t ^ t >>> 7, t | 61);
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
      }
      function drawBlocks(c, t) {
        const { cx, cy, R1, R2 } = G, rot = t * SPIN, band = R2 - R1, thVis = visAng(R1, 50);
        c.font = `500 ${blockFS}px ${FONT}`;
        c.textBaseline = "top";
        for (const b of blocks) {
          const th = wrapPI(b.th + rot);
          if (th > thVis || th < -thVis) continue;
          const x0 = R1 + 14 + (b.col ? band * 0.5 : 0) + b.ind * band * 0.04;
          const maxW = b.col || G.narrow ? Math.max(12, R2 - (G.narrow ? 34 : 54) - x0) : band * 0.45;
          const y = -b.h / 2;
          c.save();
          c.translate(cx, cy);
          c.rotate(th);
          if (b.type === "bars") {
            const rr = mulberry32(b.seed);
            c.fillStyle = T.text;
            c.globalAlpha = 0.9;
            for (let i = 0; i < b.lines.length; i++) {
              let x = x0;
              const lim = x0 + Math.min(maxW, G.narrow ? 34 : 64);
              while (x < lim) {
                const w = 2 + rr() * 9;
                if (rr() < 0.62) c.fillRect(x, y + 2 + i * blockLH, Math.min(w, lim - x), blockLH * 0.55);
                x += w + 1.5;
              }
            }
          } else {
            const hi = b.type === "code" ? 1 + ((t * 0.6 | 0) + b.seed) % (b.lines.length - 1) : -1;
            for (let i = 0; i < b.lines.length; i++) {
              const ly = y + 2 + i * blockLH;
              if (i === hi) {
                const tw = Math.min(maxW, c.measureText(b.lines[i]).width) + 4;
                c.globalAlpha = 1;
                c.fillStyle = T.text;
                c.fillRect(x0 - 2, ly - 1, tw, blockLH);
                c.fillStyle = T.band;
              } else {
                c.fillStyle = T.text;
                c.globalAlpha = i === 0 && b.type !== "table" && b.type !== "grid" ? 1 : b.type === "code" ? 0.8 : 0.62;
              }
              c.fillText(b.lines[i], x0, ly, maxW);
            }
          }
          c.restore();
        }
        c.globalAlpha = 1;
      }
      function drawInputFeed(c, t) {
        const feed = (model.sources[0] || []).filter((x) => x.record), cardW = Math.min(230, Math.max(170, W * 0.14)), cardH = 27, gap = 8, total = cardH + gap;
        c.save();
        c.textAlign = "left";
        c.font = "600 8px " + FONT;
        c.fillStyle = T.dark ? T.hi : T.text;
        c.fillText("\u5B9E\u65F6\u8F93\u5165\u6D41", 18, 58);
        c.beginPath();
        c.rect(12, 68, cardW + 10, H - 94);
        c.clip();
        for (let k = -2; k < Math.ceil((H - 80) / total) + 2; k++) {
          const n = Math.max(1, feed.length), idx = (k % n + n) % n, y = 82 + k * total - t * 22 % total, row = feed[idx];
          if (!row) continue;
          c.globalAlpha = 0.42;
          c.fillStyle = T.dark ? "#0c3328" : "#e8eee5";
          c.fillRect(12, y, cardW + 10, cardH);
          c.globalAlpha = 0.8;
          c.strokeStyle = T.dark ? T.line : T.dim;
          c.lineWidth = 0.55;
          c.strokeRect(12, y, cardW + 10, cardH);
          c.globalAlpha = 1;
          c.fillStyle = T.dark ? T.hi : T.text;
          c.font = "7px " + FONT;
          c.fillText(String(row.record?.name || "\u8F93\u5165").slice(0, 10), 20, y + 10);
          c.fillStyle = T.dim;
          c.fillText(compactRow(row).slice(0, 25), 20, y + 20);
        }
        c.restore();
      }
      function drawWheelMarks(c, t) {
        drawInputFeed(c, t);
        const { cx, cy, R1, R2, narrow } = G, rot = t * SPIN;
        const p = new Path2D(), s1 = 6 / R1, t1 = visAng(R1, 12);
        for (let k = Math.ceil((-t1 - rot) / s1), e = Math.floor((t1 - rot) / s1); k <= e; k++) {
          const a = k * s1 + rot, l = k % 5 === 0 ? 9 : 4, ca = Math.cos(a), sa = Math.sin(a);
          p.moveTo(cx + ca * (R1 + 2), cy + sa * (R1 + 2));
          p.lineTo(cx + ca * (R1 + 2 + l), cy + sa * (R1 + 2 + l));
        }
        c.strokeStyle = T.line;
        c.globalAlpha = 0.7;
        c.lineWidth = 0.8;
        c.stroke(p);
        const q = new Path2D(), s2 = 3.2 / R2, t2 = visAng(R2, 12);
        for (let k = Math.ceil((-t2 - rot) / s2), e = Math.floor((t2 - rot) / s2); k <= e; k++) {
          const a = k * s2 + rot, l = k % 10 === 0 ? 8 : 3, ca = Math.cos(a), sa = Math.sin(a);
          q.moveTo(cx + ca * (R2 - 1), cy + sa * (R2 - 1));
          q.lineTo(cx + ca * (R2 - 1 - l), cy + sa * (R2 - 1 - l));
        }
        c.globalAlpha = 0.55;
        c.lineWidth = 0.7;
        c.stroke(q);
        const s3 = (narrow ? 34 : 46) / R2;
        c.globalAlpha = 1;
        c.fillStyle = T.dim;
        c.font = `${narrow ? 6 : 8}px ${FONT}`;
        c.textAlign = "right";
        c.textBaseline = "middle";
        for (let k = Math.ceil((-t2 - rot) / s3), e = Math.floor((t2 - rot) / s3); k <= e; k++) {
          c.save();
          c.translate(cx, cy);
          c.rotate(k * s3 + rot);
          c.fillText(`${(Math.round(k * s3 / TAU * 360) % 360 + 360) % 360}\xB0`, R2 - 13, 0);
          c.restore();
        }
        c.textAlign = "left";
      }
      function drawWheelStreaks(c, t, dt) {
        const { cx, cy, R2 } = G, rot = t * SPIN, thVis = visAng(R2, 30);
        outputMarkers = [];
        outputRays = [];
        const base = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], hotP = new Path2D(), dashP = new Path2D(), hotD = new Path2D();
        for (const s of streaks) {
          const th = wrapPI(s.th + rot);
          if (th > thVis || th < -thVis) continue;
          const cp = Math.cos(th), sp = Math.sin(th), r0 = R2 + s.off, x0 = cx + cp * r0, y0 = cy + sp * r0;
          const reach = Math.max(40, (W + 20 - x0) / Math.max(0.2, cp)), L = Math.min(reach, s.f * reach);
          const p = s.hot ? hotP : base[s.b];
          p.moveTo(x0, y0);
          p.lineTo(x0 + cp * L, y0 + sp * L);
          outputRays.push({ kind: "output", key: s.row.outputKey, row: s.row, x1: x0, y1: y0, x2: x0 + cp * L, y2: y0 + sp * L });
          const q = s.hot ? hotD : dashP;
          for (const d of s.d) {
            if (d.v) d.p = (d.p + d.v * dt) % 1;
            const a0 = d.p * L, a1 = Math.min(L, a0 + d.len);
            q.moveTo(x0 + cp * a0, y0 + sp * a0);
            q.lineTo(x0 + cp * a1, y0 + sp * a1);
            outputMarkers.push({ kind: "output", key: s.row.outputKey, row: s.row, x1: x0 + cp * a0, y1: y0 + sp * a0, x2: x0 + cp * a1, y2: y0 + sp * a1 });
          }
        }
        c.lineCap = "butt";
        c.strokeStyle = T.line;
        c.lineWidth = 0.7;
        const A = T.dark ? 1.3 : 1;
        base.forEach((p, i) => {
          c.globalAlpha = Math.min(0.9, BA[i] * A);
          c.stroke(p);
        });
        if (T.dark && view.effectStrength > 0) {
          c.globalCompositeOperation = "lighter";
          base.forEach((p, i) => {
            c.strokeStyle = i === 0 ? T.hot : T.line;
            c.globalAlpha = 0.055 + i * 0.018;
            c.lineWidth = 3.2 - i * 0.35;
            c.stroke(p);
          });
          c.strokeStyle = T.hot;
          c.globalAlpha = 0.14;
          c.lineWidth = 5.2;
          c.stroke(hotP);
          c.globalAlpha = 0.82;
          c.lineWidth = 1.15;
          c.stroke(hotP);
          c.globalAlpha = 0.18;
          c.strokeStyle = T.hi;
          c.lineWidth = 5.5;
          c.stroke(dashP);
          c.globalAlpha = 0.98;
          c.lineWidth = 1.9;
          c.stroke(dashP);
          c.strokeStyle = T.hot;
          c.globalAlpha = 0.3;
          c.lineWidth = 7;
          c.stroke(hotD);
          c.strokeStyle = T.hi;
          c.globalAlpha = 1;
          c.lineWidth = 2;
          c.stroke(hotD);
          c.globalCompositeOperation = "source-over";
        } else {
          c.strokeStyle = T.hot;
          c.globalAlpha = 0.5;
          c.lineWidth = 0.8;
          c.stroke(hotP);
          c.strokeStyle = T.line;
          c.globalAlpha = 0.8;
          c.lineWidth = 1.5;
          c.stroke(dashP);
          c.strokeStyle = T.hot;
          c.globalAlpha = 0.95;
          c.lineWidth = 2;
          c.stroke(hotD);
        }
        c.globalAlpha = 1;
      }
      function drawBeam(c, t) {
        const { cx, cy, R1 } = G, a = wrapPI(t * 0.85), w = 0.24, tv = visAng(R1, 40);
        if (a < -tv || a - w > tv) return;
        const far = W * 2, col = T.dark ? T.hot : T.line;
        c.save();
        c.beginPath();
        c.moveTo(cx + Math.cos(a - w) * R1, cy + Math.sin(a - w) * R1);
        c.arc(cx, cy, far, a - w, a);
        c.arc(cx, cy, R1, a, a - w, true);
        c.closePath();
        if (c.createConicGradient) {
          const g = c.createConicGradient(a - w, cx, cy), f = w / TAU;
          g.addColorStop(0, rgba(col, 0));
          g.addColorStop(f * 0.97, rgba(col, T.dark ? 0.2 : 0.07));
          g.addColorStop(f, rgba(col, 0));
          g.addColorStop(1, rgba(col, 0));
          c.fillStyle = g;
        } else {
          c.fillStyle = rgba(col, T.dark ? 0.08 : 0.03);
        }
        if (T.dark) c.globalCompositeOperation = "lighter";
        c.fill();
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * R1, cy + Math.sin(a) * R1);
        c.lineTo(cx + Math.cos(a) * far, cy + Math.sin(a) * far);
        c.strokeStyle = col;
        c.globalAlpha = T.dark ? 0.55 : 0.35;
        c.lineWidth = 1;
        c.stroke();
        c.restore();
      }
      function drawGears(c, t) {
        const { cx, cy, R1, R2 } = G;
        const ro = -t * SPIN * 2.6, r0 = R2 + 5, r1 = R2 + 12, n = Math.round(TAU * R2 / 9), st = TAU / n, tv = visAng(R2, 30);
        const p = new Path2D();
        for (let k = Math.ceil((-tv - ro) / st), e = Math.floor((tv - ro) / st); k <= e; k++) {
          const m = (k % 7 + 7) % 7;
          if (m === 3 || m === 6) continue;
          const a = k * st + ro, a2 = a + st * (m === 0 ? 0.85 : 0.45);
          p.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
          p.arc(cx, cy, r0, a, a2);
          p.arc(cx, cy, r1, a2, a, true);
          p.closePath();
        }
        const ri = R1 - 9, si = TAU / Math.round(TAU * R1 / 7), ti = visAng(R1, 30), roi = -t * SPIN * 1.6;
        const q = new Path2D();
        for (let k = Math.ceil((-ti - roi) / si), e = Math.floor((ti - roi) / si); k <= e; k++) {
          if ((k % 9 + 9) % 9 > 5) continue;
          const a = k * si + roi;
          q.moveTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri);
          q.arc(cx, cy, ri, a, a + si * 0.55);
        }
        if (T.dark && view.effectStrength > 0) {
          c.globalCompositeOperation = "lighter";
          c.fillStyle = T.hot;
          c.globalAlpha = 0.85;
          c.fill(p);
          c.strokeStyle = T.hot;
          c.globalAlpha = 0.18;
          c.lineWidth = 6;
          c.stroke(p);
          c.globalCompositeOperation = "source-over";
          c.strokeStyle = T.line;
          c.globalAlpha = 0.8;
          c.lineWidth = 2;
          c.stroke(q);
        } else {
          c.fillStyle = T.line;
          c.globalAlpha = 0.8;
          c.fill(p);
          c.strokeStyle = T.line;
          c.globalAlpha = 0.6;
          c.lineWidth = 2;
          c.stroke(q);
        }
        c.globalAlpha = 1;
      }
      return { stats, canvas, update() {
        if (view.layoutMode !== "ops") return;
        stateModel();
        paint(view.motionClock);
      }, paint, reset, get geometry() {
        return G;
      }, get model() {
        return model;
      }, get hits() {
        return hitPoints;
      }, get outputMarkers() {
        return outputMarkers;
      }, get outputRays() {
        return outputRays;
      }, get selectedOutputKey() {
        return selectedOutputKey;
      }, hitTest: hitAt, dispose() {
        observer.disconnect();
        for (const event of ["onpointerdown", "onpointermove", "onpointerup", "onpointercancel", "onpointerleave", "onwheel", "ondblclick", "onkeydown"]) canvas[event] = null;
        inspector.hidden = true;
      } };
    }
    module2.exports = { createOpsBoard: createOpsBoard2, flatten };
  }
});

// src/main.js
var { Plugin, ItemView, Notice } = require("obsidian");
var TYPE = "wayfarer-workflow-atlas";
var { SpatialRenderer } = require_renderer3d();
var { createSemanticModel, TYPE_NAMES, brief } = require_semantic_model();
var { BusinessController } = require_business_controller();
var { createOpsBoard } = require_ops_board();
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var AtlasView = class extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.selected = "V1";
    this.mode = "all";
    this.query = "";
    this.focusGroup = null;
    this.animIndex = -1;
    this.animRunning = false;
    this.animTimer = null;
    this.raf = null;
    this.plots = [];
    this.clean = [];
    this.events = [];
    this.motionEnabled = true;
    this.motionSpeed = 1;
    this.orbitEnabled = true;
    this.layoutMode = "ops";
    this.opsTheme = "paper";
    this.boardFocus = false;
    this.trailsEnabled = true;
    this.effectStrength = 1;
    this.motionClock = 0;
    this.motionFrame = null;
    this.motionLast = 0;
    this.motionMetrics = { frames: 0, paintMs: 0 };
  }
  getViewType() {
    return TYPE;
  }
  getDisplayText() {
    return "\u884C\u8FF9 \xB7 \u5DE5\u4F5C\u6D41\u661F\u56FE";
  }
  getIcon() {
    return "orbit";
  }
  async onOpen() {
    const saved = await this.plugin.loadData() || {};
    this.motionEnabled = saved.motionEnabled !== false;
    this.motionSpeed = Number(saved.motionSpeed) || 1;
    this.orbitEnabled = saved.orbitEnabled !== false;
    this.trailsEnabled = saved.trailsEnabled !== false;
    this.effectStrength = [0, 1, 1.6].includes(saved.effectStrength) ? saved.effectStrength : 1;
    this.layoutMode = ["ops", "micro"].includes(saved.layoutMode) ? saved.layoutMode : "ops";
    this.opsTheme = saved.opsTheme === "glow" ? "glow" : "paper";
    this.boardFocus = saved.boardFocus === true;
    await this.load();
    this.business = new BusinessController(this);
    this.render();
    await this.business.restore();
    this.startMotion();
  }
  async load() {
    this.sourceData = JSON.parse(await this.app.vault.adapter.read(this.plugin.manifest.dir + "/atlas-data.json"));
    this.data = createSemanticModel(this.sourceData);
    this.byId = new Map(this.data.nodes.map((n) => [n.id, n]));
    this.colors = new Map(this.data.groups.map((g) => [g.id, g.color]));
  }
  visible() {
    return this.data.nodes.filter((n) => (!n.runtimeGenerated || n.variant === this.business?.selectedVariant) && (this.mode === "all" || n.layer !== "artifact") && (!this.focusGroup || n.group === this.focusGroup) && (!this.query || [n.name, n.originalName, n.id, n.description, n.source].join(" ").toLowerCase().includes(this.query)));
  }
  render() {
    const el = this.contentEl;
    el.empty();
    el.addClass("wf-atlas-host");
    const count = this.data;
    el.innerHTML = `
 <div class="wf-shell"><header class="wf-header"><div class="wf-brand"><span class="wf-logo">\u884C</span><div><div class="wf-eyebrow">\u884C\u8FF9\u667A\u80FD\u4F53 \xB7 \u5DE5\u4F5C\u6D41\u8FD0\u884C\u89C2\u5BDF\u53F0</div><h1>\u884C\u8FF9 <span>\u667A\u80FD\u4F53\u4E1A\u52A1\u8FD0\u884C\u56FE</span></h1></div></div><div class="wf-header-right"><select class="wf-layout-select" aria-label="\u53EF\u89C6\u5316\u5E03\u5C40"><option value="ops">\u5DE5\u7A0B\u5168\u666F</option><option value="micro">\u7ACB\u4F53\u5FAE\u7C92</option></select><button data-action="ops-theme">\u7EB8\u9762\u6A21\u5F0F</button><button data-action="board-focus">\u4E13\u6CE8\u5927\u5C4F</button><span class="wf-local"><i></i> \u672C\u5730\u77E5\u8BC6\u5E93</span><button data-action="motion" aria-label="\u6682\u505C\u6216\u5F00\u542F\u52A8\u6548">\u2161 \u52A8\u6548</button><button data-action="orbit" title="\u5F00\u542F\u6216\u6682\u505C\u8282\u70B9\u7ED5\u4E2D\u5FC3\u516C\u8F6C">\u516C\u8F6C\u5DF2\u5F00</button><button data-action="trails" title="\u5F00\u542F\u6216\u5173\u95ED\u7C92\u5B50\u4E0E\u8FDE\u7EBF\u62D6\u5F71">\u62D6\u5F71\u5DF2\u5F00</button><select class="wf-effects-level" aria-label="\u5149\u6548\u5F3A\u5EA6"><option value="0">\u5149\u6655\u5173\u95ED</option><option value="1">\u67D4\u548C\u5149\u6655</option><option value="1.6">\u660E\u4EAE\u5149\u6655</option></select><button data-action="reset-camera" title="\u6062\u590D\u4E24\u5F20\u56FE\u7684\u521D\u59CB\u89C6\u89D2">\u590D\u4F4D</button><select class="wf-motion-speed" aria-label="\u52A8\u6548\u901F\u5EA6"><option value="0.55">\u8212\u7F13</option><option value="1">\u6807\u51C6</option><option value="1.65">\u6D3B\u8DC3</option></select><button data-action="canvas">\u539F\u751F\u767D\u677F \u2197</button><button data-action="refresh" title="\u91CD\u65B0\u8BFB\u53D6\u672C\u5730\u7ED3\u6784">\u21BB</button></div></header>
 <div class="wf-stats"><div><span>\u5DE5\u4F5C\u6D41\u6B65\u9AA4</span><strong>28<small>\u6D41\u7A0B\u8282\u70B9</small></strong></div><div><span>\u4E1A\u52A1\u5173\u7CFB\u8FDE\u7EBF</span><strong>${count.edges.length}<small>\u8F93\u5165\u4E0E\u8F93\u51FA\u5173\u8054</small></strong></div><div><span>\u4E1A\u52A1\u8F93\u5165\u4E0E\u8F93\u51FA</span><strong>00<small>\u6570\u636E\u5B57\u6BB5</small></strong></div><div><span>\u72EC\u7ACB\u5019\u9009\u65B9\u6848</span><strong>00<small>\u5DF2\u5B9E\u9645\u751F\u6210</small></strong></div><div class="wf-stat-total"><span>\u5168\u90E8\u65B9\u6848\u5F02\u5E38\u4E0E\u63D0\u9192</span><strong>00<small>\u5F85\u8FD0\u884C</small></strong></div></div>
 <div class="wf-toolbar"><div class="wf-tabs"><button class="active" data-mode="all">\u4E1A\u52A1\u5168\u666F</button><button data-mode="workflow">\u6D41\u7A0B\u4E3B\u5E72</button></div><div class="wf-legend">${count.groups.map((g) => `<button data-group="${g.id}"><i style="background:${g.color}"></i>${g.name}</button>`).join("")}</div><input class="wf-search" placeholder="\u641C\u7D22\u8282\u70B9 / \u89C4\u5219 / \u8F93\u5165 / \u8F93\u51FA / \u5F02\u5E38\u2026" aria-label="\u641C\u7D22\u8282\u70B9"></div>
 <div class="wf-runtime-bar"><input class="wf-runtime-request" aria-label="\u771F\u5B9E\u8FD0\u884C\u9700\u6C42" value="2026\u5E7411\u67086\u65E5\u8D77\u53BB\u6210\u90FD\u73A9\u4E09\u5929\uFF0C1\u4EBA\uFF0C\u9884\u7B973000\u5143\uFF0C\u559C\u6B22\u5386\u53F2\u548C\u7F8E\u98DF\uFF0C\u8F7B\u677E\u4E00\u70B9"><button data-action="run-agent">\u25B6 \u8FD0\u884C\u5E76\u6BD4\u8F83\u65B9\u6848</button><select class="wf-runtime-scenario" aria-label="\u5F02\u5E38\u573A\u666F\u793A\u4F8B"><option value="normal">\u5B8C\u6574\u9700\u6C42\u793A\u4F8B</option><option value="missing">\u7F3A\u5C11\u76EE\u7684\u5730</option><option value="budget">\u9884\u7B97\u8FC7\u4F4E</option><option value="data">\u672C\u5730\u8D44\u6599\u4E0D\u53EF\u7528</option><option value="format">\u8F93\u5165\u683C\u5F0F\u5F02\u5E38</option></select><button data-action="fill-scenario">\u586B\u5165\u793A\u4F8B</button><span class="wf-runtime-note">\u771F\u5B9E\u672C\u5730\u8BA1\u7B97</span></div><section class="wf-ops-board"></section><div class="wf-graphs"><section class="wf-graph-card"><div class="wf-card-head"><div><span class="wf-section-no">01</span><h2>\u8F93\u5165\u8F93\u51FA\u5FAE\u7C92\u56FE</h2></div><span>\u9752\u8272\u8F93\u5165 \xB7 \u7EFF\u8272\u8F93\u51FA \xB7 \u6A59\u8272\u5F02\u5E38 \xB7 \u7D2B\u8272\u65B9\u6848</span></div><div class="wf-plot wf-radial"><canvas></canvas><div class="wf-graph-caption">\u6267\u884C\u94FE\u8DEF \xB7 \u89C4\u5219\u7EA6\u675F \xB7 \u8F93\u5165\u8F93\u51FA</div><div class="wf-zoom"><button data-zoom="in">\uFF0B</button><button data-zoom="out">\u2212</button><button data-zoom="reset">\u2316</button></div></div><div class="wf-graph-foot"><span><i class="wf-line"></i> \u6267\u884C\u8DEF\u5F84</span><span><i class="wf-line dashed"></i> \u7ED3\u6784\u4F9D\u8D56</span><span>\u62D6\u62FD\u65CB\u8F6C \xB7 \u6EDA\u8F6E\u7F29\u653E \xB7 \u53CC\u51FB\u590D\u4F4D</span></div></section>
 <section class="wf-graph-card"><div class="wf-card-head"><div><span class="wf-section-no">02</span><h2>\u9636\u6BB5\u7ACB\u4F53\u8F68\u9053</h2></div><span>\u516D\u9636\u6BB5\u7A7A\u95F4\u5206\u5E03\u4E0E\u6709\u5411\u5173\u8054</span></div><div class="wf-plot wf-arc"><canvas></canvas><div class="wf-spatial-badge">\u4E09\u7EF4\u900F\u89C6 \xB7 \u81EA\u7531\u65CB\u8F6C</div></div><div class="wf-graph-foot"><span class="wf-selected-caption">\u9009\u4E2D\uFF1A\u516B\u7C7B\u89C4\u5219\u6821\u9A8C</span><span>\u62D6\u62FD\u81EA\u7531\u65CB\u8F6C \xB7 \u6309\u4F4F\u4E0A\u6863\u952E\u62D6\u62FD\u5E73\u79FB</span></div></section></div>
 <div class="wf-business-dashboard"><section class="wf-panel wf-comparison"><div class="wf-card-head"><div><span class="wf-section-no">03</span><h2>\u4E09\u79CD\u5B9E\u9645\u65B9\u6848</h2></div><span>\u672C\u5730\u4F30\u7B97 \xB7 \u4E0D\u542B\u5F80\u8FD4\u5927\u4EA4\u901A \xB7 \u76F8\u540C\u7ED3\u679C\u4F1A\u6807\u6CE8</span></div><div class="wf-candidates"></div></section><section class="wf-panel wf-exceptions"><div class="wf-card-head"><div><h2>\u8F93\u5165\u3001\u8F93\u51FA\u4E0E\u8FD0\u884C\u5F02\u5E38</h2></div><span>\u5F53\u524D\u65B9\u6848\u4E0E\u5168\u5C40\u63D0\u9192</span></div><div class="wf-issues"></div></section></div>
 <div class="wf-bottom"><section class="wf-panel wf-node-list"><div class="wf-card-head"><div><span class="wf-section-no">03</span><h2>\u771F\u5B9E\u8FD0\u884C\u8F93\u5165\u8F93\u51FA</h2></div><span class="wf-count"></span></div><div class="wf-live-records"></div></section><section class="wf-panel wf-timeline"><div class="wf-card-head"><div><span class="wf-section-no">04</span><h2>\u8FD0\u884C\u8F68\u8FF9</h2></div><span class="wf-sim-badge">\u6A21\u62DF / \u975E\u771F\u5B9E\u65E5\u5FD7</span></div><div class="wf-sim-controls"><select aria-label="\u9009\u62E9\u6F14\u793A\u8DEF\u5F84"><option value="normal">\u6B63\u5E38\u89C4\u5212\u4E0E\u8F93\u51FA</option><option value="repair">\u9519\u8BEF\u6821\u9A8C\u4E0E\u4FEE\u590D</option><option value="clarify">\u7F3A\u5931\u4FE1\u606F\u4E0E\u8FFD\u95EE</option><option value="change">\u7528\u6237\u4FEE\u6539\u4E0E\u91CD\u6392</option></select><button data-action="play">\u25B6 \u64AD\u653E</button><button data-action="reset">\u91CD\u7F6E</button></div><div class="wf-track"></div><div class="wf-step-title">\u7B49\u5F85\u5F00\u59CB\u6F14\u793A</div><div class="wf-event-log">\u9009\u62E9\u4E00\u6761\u8DEF\u5F84\uFF0C\u89C2\u5BDF\u8282\u70B9\u5982\u4F55\u6D41\u8F6C\u3002\u6F14\u793A\u4E0D\u4F1A\u8C03\u7528\u6A21\u578B\u3002</div><div class="wf-runtime-result"></div><div class="wf-timeline-note">\u4E0A\u65B9\u586B\u5165\u771F\u5B9E\u5F02\u5E38\u793A\u4F8B\u540E\u8FD0\u884C\uFF1B\u4E0B\u65B9\u64AD\u653E\u4EC5\u4E3A\u7ED3\u6784\u6F14\u793A\u3002</div></section><section class="wf-panel wf-detail"><div class="wf-card-head"><div><span class="wf-section-no">05</span><h2>\u8282\u70B9\u8BE6\u60C5</h2></div><span>\u804C\u8D23\u4E0E\u8F93\u5165\u8F93\u51FA</span></div><div class="wf-detail-body"></div></section></div>
 <footer class="wf-footer"><span>\u884C\u8FF9\u5DE5\u4F5C\u6D41\u89C2\u5BDF\u53F0 <b>\xB7</b> \u884C\u8FF9\u667A\u80FD\u4F53\u7684\u7ED3\u6784\u4E0E\u6267\u884C\u903B\u8F91</span><span>\u7C92\u5B50\u8868\u793A\u4E1A\u52A1\u6570\u636E\u4E0E\u68C0\u67E5\u5165\u53E3\uFF1B\u72B6\u6001\u4EE5\u672C\u8F6E\u5B9E\u9645\u8BA1\u7B97\u4E3A\u51C6</span></footer><div class="wf-tooltip"></div></div>`;
    this.root = el.querySelector(".wf-shell");
    el.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => {
      this.mode = b.dataset.mode;
      el.querySelectorAll("[data-mode]").forEach((v) => v.classList.toggle("active", v === b));
      this.update();
    });
    el.querySelectorAll("[data-group]").forEach((b) => b.onclick = () => {
      this.focusGroup = this.focusGroup === b.dataset.group ? null : b.dataset.group;
      el.querySelectorAll("[data-group]").forEach((v) => v.classList.toggle("muted", !!this.focusGroup && v.dataset.group !== this.focusGroup));
      this.update();
    });
    el.querySelector(".wf-search").oninput = (e) => {
      this.query = e.target.value.trim().toLowerCase();
      this.update();
    };
    el.querySelector("[data-action=canvas]").onclick = () => this.app.workspace.openLinkText("\u884C\u8FF9\u5DE5\u4F5C\u6D41/\u884C\u8FF9 Agent \u5B8C\u6574\u5DE5\u4F5C\u6D41.canvas", "", true);
    el.querySelector("[data-action=refresh]").onclick = async () => {
      await this.load();
      this.business.clear();
      this.business.render();
      this.update();
      new Notice("\u672C\u5730\u5DE5\u4F5C\u6D41\u7ED3\u6784\u5DF2\u5237\u65B0");
    };
    el.querySelector("[data-action=play]").onclick = () => this.togglePlay();
    el.querySelector("[data-action=reset]").onclick = () => this.resetSimulation();
    el.querySelector(".wf-sim-controls select").onchange = () => this.resetSimulation();
    el.querySelector("[data-action=run-agent]").onclick = () => this.runRealAgent();
    this.makePlot(el.querySelector(".wf-radial canvas"), "radial");
    this.makePlot(el.querySelector(".wf-arc canvas"), "arc");
    this.ops = createOpsBoard(this, el.querySelector(".wf-ops-board"));
    this.clean.push(() => this.ops.dispose());
    el.querySelectorAll("[data-zoom]").forEach((b) => b.onclick = () => {
      const p = this.plots[0];
      if (b.dataset.zoom === "reset") {
        p.yaw = 0.38;
        p.pitch = -0.42;
        p.spin = 0;
        p.zoom = 1;
        p.panX = p.panY = 0;
        p.renderer.resetEffects();
      } else p.zoom *= b.dataset.zoom === "in" ? 1.2 : 1 / 1.2;
      this.draw(p);
    });
    this.root.querySelector("[data-action=motion]").onclick = () => this.toggleMotion();
    this.root.querySelector(".wf-motion-speed").value = String(this.motionSpeed);
    this.root.querySelector(".wf-motion-speed").onchange = (e) => {
      this.motionSpeed = Number(e.target.value);
      this.plugin.saveData({ motionEnabled: this.motionEnabled, motionSpeed: this.motionSpeed, orbitEnabled: this.orbitEnabled, trailsEnabled: this.trailsEnabled, effectStrength: this.effectStrength, layoutMode: this.layoutMode, opsTheme: this.opsTheme, boardFocus: this.boardFocus });
    };
    this.root.querySelector("[data-action=orbit]").onclick = () => {
      this.orbitEnabled = !this.orbitEnabled;
      this.syncOrbitButton();
      this.plugin.saveData({ motionEnabled: this.motionEnabled, motionSpeed: this.motionSpeed, orbitEnabled: this.orbitEnabled, trailsEnabled: this.trailsEnabled, effectStrength: this.effectStrength, layoutMode: this.layoutMode, opsTheme: this.opsTheme, boardFocus: this.boardFocus });
    };
    this.root.querySelector("[data-action=reset-camera]").onclick = () => this.resetCamera();
    this.update();
    this.renderTrack();
    this.select(this.selected);
    this.syncMotionButton();
    this.syncOrbitButton();
    const trailButton = this.root.querySelector("[data-action=trails]");
    const syncTrail = () => {
      trailButton.textContent = this.trailsEnabled ? "\u62D6\u5F71\u5DF2\u5F00" : "\u62D6\u5F71\u5DF2\u5173";
      trailButton.classList.toggle("wf-motion-on", this.trailsEnabled);
    };
    syncTrail();
    trailButton.onclick = () => {
      this.trailsEnabled = !this.trailsEnabled;
      syncTrail();
      this.saveEffects();
      this.plots.forEach((p) => {
        p.renderer.resetEffects();
        this.paintMotion(p, this.motionClock);
      });
      this.ops?.paint(this.motionClock);
    };
    const effects = this.root.querySelector(".wf-effects-level");
    effects.value = String(this.effectStrength);
    effects.onchange = () => {
      this.effectStrength = Number(effects.value);
      this.saveEffects();
      this.plots.forEach((p) => this.paintMotion(p, this.motionClock));
      this.ops?.paint(this.motionClock);
    };
    this.business.bind();
    const layout = this.root.querySelector(".wf-layout-select");
    layout.value = this.layoutMode;
    layout.onchange = () => {
      this.layoutMode = layout.value;
      this.syncBoardLayout();
      this.saveEffects();
    };
    this.root.querySelector("[data-action=ops-theme]").onclick = () => {
      this.opsTheme = this.opsTheme === "paper" ? "glow" : "paper";
      this.syncBoardLayout();
      this.saveEffects();
    };
    this.root.querySelector("[data-action=board-focus]").onclick = () => {
      this.boardFocus = !this.boardFocus;
      this.syncBoardLayout();
      this.saveEffects();
    };
    this.syncBoardLayout();
  }
  update() {
    this.renderList();
    this.plots.forEach((p) => this.draw(p));
    this.ops?.update();
  }
  select(id) {
    const n = this.byId.get(id);
    if (!n) return;
    this.selected = id;
    this.root.querySelectorAll(".wf-node-row.selected").forEach((b) => b.classList.remove("selected"));
    const selectedRow = this.root.querySelector('[data-id="' + id + '"]');
    if (selectedRow) selectedRow.classList.add("selected");
    this.renderDetails(n);
    this.plots.forEach((p) => this.draw(p));
    this.root.querySelector(".wf-selected-caption").textContent = "\u9009\u4E2D\uFF1A" + n.name;
    this.ops?.update();
  }
  renderList() {
    this.root.querySelector(".wf-count").textContent = this.visible().length + " \u4E2A\u4E1A\u52A1\u8282\u70B9";
    this.business?.renderRecords();
  }
  renderDetails(n) {
    const group = this.data.groups.find((g) => g.id === n.group), live = this.business?.detail(n) || { state: "\u5F85\u8FD0\u884C", value: "\u5C1A\u672A\u8FD0\u884C" }, tag = TYPE_NAMES[n.category] || { decision: "\u6761\u4EF6\u5224\u65AD", rule: "\u6821\u9A8C\u89C4\u5219", error: "\u5F02\u5E38\u5904\u7406", user: "\u7528\u6237\u4EA4\u4E92", model: "\u9700\u6C42\u7406\u89E3" }[n.kind] || "\u6D41\u7A0B\u6B65\u9AA4";
    this.root.querySelector(".wf-detail-body").innerHTML = `<div class="wf-detail-tag" style="color:${group.color}">${esc(group.name)} \xB7 ${esc(tag)}<span class="${n.state}">${esc(live.state)}</span></div><h3>${esc(n.name)}</h3><p>${esc(n.description)}</p><div class="wf-io"><div><small>\u8F93\u5165\u5B9A\u4E49</small><span>${esc(n.input)}</span></div><div><small>\u8F93\u51FA\u5B9A\u4E49</small><span>${esc(n.output)}</span></div></div><details open class="wf-live-value"><summary>\u672C\u8F6E\u5B9E\u9645\u8F93\u5165 / \u8F93\u51FA / \u5F02\u5E38</summary><pre>${esc(live.value)}</pre></details><div class="wf-detail-links"><span>\u70B9\u51FB\u5FAE\u7C92\u6216\u8FD0\u884C\u8BB0\u5F55\u67E5\u770B\u5B8C\u6574\u5185\u5BB9</span><button class="wf-open-note">\u6253\u5F00\u6D41\u7A0B\u8BF4\u660E \u2197</button></div>`;
    this.root.querySelector(".wf-open-note").onclick = () => this.app.workspace.openLinkText(n.path, "", true);
  }
  makePlot(canvas, kind) {
    const p = { canvas, kind, zoom: 1, panX: 0, panY: 0, points: [], hover: null, yaw: 0.38, pitch: -0.42, spin: 0, dragging: false, lastOrbitTime: null };
    this.plots.push(p);
    const gpu = document.createElement("canvas");
    gpu.className = "wf-space-canvas";
    gpu.setAttribute("aria-hidden", "true");
    canvas.before(gpu);
    canvas.classList.add("wf-space-overlay");
    try {
      p.renderer = new SpatialRenderer(gpu);
    } catch (error) {
      new Notice("\u4E09\u7EF4\u6E32\u67D3\u672A\u80FD\u542F\u52A8\uFF1A" + error.message);
      throw error;
    }
    this.clean.push(() => p.renderer.dispose());
    const observer = new ResizeObserver(() => this.draw(p));
    observer.observe(canvas.parentElement);
    this.clean.push(() => observer.disconnect());
    let drag = null;
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const hit = (pt) => {
      const hits = p.points.map((n) => ({ n, d: Math.hypot(n.x - pt.x, n.y - pt.y) })).filter((x) => x.d <= Math.max(7, x.n.r + 3));
      hits.sort((a, b) => a.d - b.d || b.n.z - a.n.z);
      return hits[0]?.n || null;
    };
    canvas.onpointerdown = (e) => {
      drag = { ...pos(e), panX: p.panX, panY: p.panY, yaw: p.yaw, pitch: p.pitch, pan: e.shiftKey || e.button === 1, moved: false };
      p.dragging = true;
      canvas.setPointerCapture(e.pointerId);
    };
    canvas.onpointermove = (e) => {
      const pt = pos(e);
      if (drag) {
        const dx = pt.x - drag.x, dy = pt.y - drag.y;
        if (Math.hypot(dx, dy) > 4) {
          drag.moved = true;
          if (drag.pan) {
            p.panX = drag.panX + dx;
            p.panY = drag.panY + dy;
            this.draw(p);
          } else {
            p.yaw = drag.yaw + dx * 9e-3;
            p.pitch = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, drag.pitch + dy * 9e-3));
            this.paintMotion(p, this.motionClock);
          }
        }
        return;
      }
      const h = hit(pt);
      p.hover = h?.node.id || null;
      canvas.style.cursor = h ? "pointer" : "grab";
      const tip = this.root.querySelector(".wf-tooltip");
      if (h) {
        tip.textContent = h.node.name + " \xB7 " + h.node.id;
        const r = this.root.getBoundingClientRect();
        tip.style.left = e.clientX - r.left + 12 + "px";
        tip.style.top = e.clientY - r.top - 24 + "px";
        tip.style.display = "block";
      } else tip.style.display = "none";
      this.draw(p);
    };
    canvas.onpointerup = (e) => {
      if (drag && !drag.moved) {
        const h = hit(pos(e));
        if (h) this.select(h.node.id);
      }
      drag = null;
      p.dragging = false;
    };
    canvas.onpointercancel = () => {
      drag = null;
      p.dragging = false;
    };
    canvas.ondblclick = () => {
      p.yaw = 0.38;
      p.pitch = -0.42;
      p.spin = 0;
      p.zoom = 1;
      p.panX = p.panY = 0;
      p.renderer.resetEffects();
      this.draw(p);
    };
    canvas.tabIndex = 0;
    canvas.onkeydown = (e) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        if (e.key === "ArrowLeft") p.yaw -= 0.12;
        if (e.key === "ArrowRight") p.yaw += 0.12;
        if (e.key === "ArrowUp") p.pitch -= 0.1;
        if (e.key === "ArrowDown") p.pitch += 0.1;
        this.paintMotion(p, this.motionClock);
      }
    };
    canvas.onpointerleave = () => {
      this.root.querySelector(".wf-tooltip").style.display = "none";
      p.hover = null;
      this.draw(p);
    };
    canvas.onwheel = (e) => {
      e.preventDefault();
      p.zoom = Math.max(0.45, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      this.draw(p);
    };
    this.clean.push(() => {
      canvas.onpointerdown = canvas.onpointermove = canvas.onpointerup = canvas.onpointercancel = canvas.onpointerleave = canvas.onwheel = canvas.ondblclick = canvas.onkeydown = null;
    });
  }
  draw(p) {
    if (!this.root?.isConnected) return;
    const r = p.canvas.parentElement.getBoundingClientRect();
    if (r.width < 5 || r.height < 5) return;
    const w = r.width, h = r.height, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (p.canvas.width !== Math.round(w * dpr) || p.canvas.height !== Math.round(h * dpr)) {
      p.canvas.width = Math.round(w * dpr);
      p.canvas.height = Math.round(h * dpr);
    }
    const cx = w / 2 + p.panX, cy = h / 2 + p.panY, base = Math.min(w, h) * 0.325 * p.zoom;
    p.viewport = { w, h, dpr, cx, cy, base };
    p.renderer.build(this.data, this.visible(), p.kind, this.colors);
    p.layoutPoints = p.renderer.scene.nodes;
    p.links = p.renderer.scene.edges;
    this.paintMotion(p, this.motionClock);
  }
  syncBoardLayout() {
    if (!this.root) return;
    this.root.classList.toggle("wf-layout-ops", this.layoutMode === "ops");
    this.root.classList.toggle("wf-paper", this.layoutMode === "ops" && this.opsTheme === "paper");
    this.root.classList.toggle("wf-board-focus", this.layoutMode === "ops" && this.boardFocus);
    this.root.querySelector(".wf-layout-select").value = this.layoutMode;
    const theme = this.root.querySelector("[data-action=ops-theme]");
    theme.textContent = this.opsTheme === "paper" ? "\u7EB8\u9762\u6A21\u5F0F" : "\u8367\u5149\u6A21\u5F0F";
    theme.hidden = this.layoutMode !== "ops";
    const focus = this.root.querySelector("[data-action=board-focus]");
    focus.hidden = this.layoutMode !== "ops";
    focus.textContent = this.boardFocus ? "\u9000\u51FA\u5927\u5C4F" : "\u4E13\u6CE8\u5927\u5C4F";
    this.ops?.update();
    if (this.layoutMode === "micro") this.plots.forEach((p) => this.draw(p));
  }
  syncMotionButton() {
    if (!this.root) return;
    const b = this.root.querySelector("[data-action=motion]");
    b.textContent = this.motionEnabled ? "\u2161 \u52A8\u6548" : "\u25B6 \u52A8\u6548";
    b.classList.toggle("wf-motion-on", this.motionEnabled);
    this.root.classList.toggle("wf-motion-paused", !this.motionEnabled);
  }
  toggleMotion() {
    this.motionEnabled = !this.motionEnabled;
    this.syncMotionButton();
    this.plugin.saveData({ motionEnabled: this.motionEnabled, motionSpeed: this.motionSpeed, orbitEnabled: this.orbitEnabled, trailsEnabled: this.trailsEnabled, effectStrength: this.effectStrength, layoutMode: this.layoutMode, opsTheme: this.opsTheme, boardFocus: this.boardFocus });
    if (!this.motionEnabled) {
      this.plots.forEach((p) => this.paintMotion(p, this.motionClock));
      this.ops?.paint(this.motionClock);
    }
  }
  startMotion() {
    this.stopMotion();
    this.motionLast = 0;
    let previousPaint = 0;
    const frame = (now) => {
      this.motionFrame = requestAnimationFrame(frame);
      if (!this.motionLast) this.motionLast = now;
      const dt = Math.min(0.1, (now - this.motionLast) / 1e3);
      this.motionLast = now;
      const visible = this.root?.isConnected && this.contentEl.offsetWidth > 0 && this.contentEl.offsetHeight > 0 && document.visibilityState !== "hidden";
      if (!this.motionEnabled || !visible) return;
      this.motionClock += dt * this.motionSpeed;
      if (now - previousPaint < 32) return;
      previousPaint = now;
      const start = performance.now();
      if (this.layoutMode === "ops") this.ops?.paint(this.motionClock);
      else for (const p of this.plots) this.paintMotion(p, this.motionClock);
      this.motionMetrics.frames++;
      this.motionMetrics.paintMs += performance.now() - start;
    };
    this.motionFrame = requestAnimationFrame(frame);
  }
  stopMotion() {
    if (this.motionFrame !== null) cancelAnimationFrame(this.motionFrame);
    this.motionFrame = null;
  }
  syncOrbitButton() {
    const b = this.root?.querySelector("[data-action=orbit]");
    if (b) {
      b.textContent = this.orbitEnabled ? "\u516C\u8F6C\u5DF2\u5F00" : "\u516C\u8F6C\u5DF2\u505C";
      b.classList.toggle("wf-motion-on", this.orbitEnabled);
    }
  }
  saveEffects() {
    this.plugin.saveData({ motionEnabled: this.motionEnabled, motionSpeed: this.motionSpeed, orbitEnabled: this.orbitEnabled, trailsEnabled: this.trailsEnabled, effectStrength: this.effectStrength, layoutMode: this.layoutMode, opsTheme: this.opsTheme, boardFocus: this.boardFocus });
  }
  resetCamera() {
    this.ops?.reset();
    for (const p of this.plots) {
      p.yaw = 0.38;
      p.pitch = -0.42;
      p.spin = 0;
      p.zoom = 1;
      p.panX = p.panY = 0;
      p.lastOrbitTime = this.motionClock;
      p.renderer.resetEffects();
      this.draw(p);
    }
  }
  paintMotion(p, t) {
    if (!p.viewport || !p.renderer || !this.root?.isConnected) return;
    const { w, h, dpr, cx, cy, base } = p.viewport;
    const ctx = p.canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const delta = p.lastOrbitTime === null ? 0 : Math.max(0, Math.min(0.1, t - p.lastOrbitTime));
    p.lastOrbitTime = t;
    if (this.motionEnabled && this.orbitEnabled && !p.dragging) p.spin += delta * (p.kind === "radial" ? 0.16 : 0.11);
    const yaw = p.yaw + p.spin, pitch = p.pitch;
    p.renderer.camera(p.viewport, yaw, pitch);
    p.points = p.renderer.paint({ time: t, selected: this.selected, hover: p.hover, currentEdge: this.currentEdge, motion: this.motionEnabled, trailsEnabled: this.trailsEnabled, effectStrength: this.effectStrength, layoutMode: this.layoutMode, opsTheme: this.opsTheme, boardFocus: this.boardFocus }) || [];
    const rim = Math.min(w, h) * 0.435 * p.zoom;
    ctx.lineWidth = 0.65;
    ctx.strokeStyle = "rgba(166,193,194,.26)";
    ctx.beginPath();
    ctx.arc(cx, cy, rim, 0, Math.PI * 2);
    ctx.stroke();
    for (let degree = 0; degree < 360; degree += 2) {
      const a = (degree - 90) * Math.PI / 180, major = degree % 30 === 0, medium = degree % 10 === 0, len = major ? 9 : medium ? 5 : 2.6;
      ctx.strokeStyle = major ? "rgba(222,210,171,.7)" : "rgba(146,176,178,.25)";
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (rim + 2), cy + Math.sin(a) * (rim + 2));
      ctx.lineTo(cx + Math.cos(a) * (rim + 2 + len), cy + Math.sin(a) * (rim + 2 + len));
      ctx.stroke();
      if (major) {
        ctx.fillStyle = "#97aaa9";
        ctx.font = '8px "Microsoft YaHei"';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(degree + "\xB0", cx + Math.cos(a) * (rim + 21), cy + Math.sin(a) * (rim + 21));
      }
    }
    ctx.save();
    ctx.shadowColor = "#9cddce";
    ctx.shadowBlur = 5 * this.effectStrength;
    for (let i = 0; i < 2; i++) {
      ctx.strokeStyle = i ? "#7fada96a" : "#d7bb8175";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, rim + 15 + i * 3, t * 0.06 + i * Math.PI, t * 0.06 + i * Math.PI + 0.42);
      ctx.stroke();
    }
    ctx.restore();
    const labelIds = ["A1", "B1", "C2", "V1", "R1", "O1", "IN_A1", "OUT_A1", "IN_C2", "OUT_C2", "OPTION_0", "OPTION_1", "OPTION_2", "RISK_intake_0", "RISK_plan_1", "RISK_output_0"];
    const occupied = [];
    const labels = [...p.points].sort((a, b) => (b.node.id === this.selected ? 100 : 0) - (a.node.id === this.selected ? 100 : 0) || b.z - a.z);
    let labelCount = 0;
    for (const q of labels) {
      const selected = q.node.id === this.selected || q.node.id === p.hover, active = q.node.state === "running" || q.node.state === "error";
      if (!selected && !active && !(p.kind === "radial" && labelIds.includes(q.node.id))) continue;
      if (!selected && labelCount > 19) continue;
      let text = q.node.name;
      if (q.node.category === "exception" && q.node.state === "idle") text += "\uFF08\u672A\u89E6\u53D1\uFF09";
      if (q.node.runtimeValue != null && q.node.category && q.node.category !== "exception" && selected) text += " \xB7 " + brief(q.node.runtimeValue).slice(0, 28);
      ctx.font = (selected ? "10" : "8") + 'px "Microsoft YaHei"';
      const width = ctx.measureText(text).width, tx = q.x < cx ? q.x - width - 9 : q.x + 9, ty = q.y - 11;
      if (!selected && (tx < 8 || tx + width > w - 8 || ty < 30 || occupied.some((b) => tx < b.x + b.w && tx + width > b.x && Math.abs(ty - b.y) < 13))) continue;
      occupied.push({ x: tx, y: ty, w: width });
      labelCount++;
      ctx.globalAlpha = selected || active ? 1 : Math.max(0.4, Math.min(0.87, 0.65 + q.z * 0.2));
      ctx.fillStyle = q.node.state === "error" ? "#ff9981" : selected ? "#fff0cf" : q.node.category === "input" ? "#8bcbd7" : q.node.category === "output" ? "#9fd4b7" : q.node.category === "exception" ? "#c29577" : q.node.category === "option" ? "#c6abeb" : this.colors.get(q.node.group);
      ctx.textAlign = "left";
      ctx.fillText(text, Math.max(5, Math.min(w - width - 5, tx)), ty);
      ctx.globalAlpha = 1;
      if (selected) {
        const age = t * 0.5 % 1;
        ctx.strokeStyle = "rgba(238,214,156," + (1 - age) * 0.75 + ")";
        ctx.beginPath();
        ctx.arc(q.x, q.y, 7 + age * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (p.kind === "arc") {
      for (let gi = 0; gi < this.data.groups.length; gi++) {
        const angle = -Math.PI / 2 + gi * Math.PI / 3, world = { x: Math.cos(angle) * 1.17, y: gi % 2 === 0 ? -0.21 : 0.21, z: Math.sin(angle) * 1.17 }, q = p.renderer.project(world);
        ctx.fillStyle = this.data.groups[gi].color;
        ctx.font = '10px "Microsoft YaHei"';
        ctx.textAlign = q.x < cx ? "right" : "left";
        ctx.globalAlpha = Math.max(0.38, Math.min(1, 0.7 + q.z * 0.25));
        ctx.fillText(this.data.groups[gi].name, q.x + (q.x < cx ? -7 : 7), q.y);
        ctx.globalAlpha = 1;
      }
    }
    const axisOrigin = { x: w - 49, y: h - 39 }, axisScale = 22, zero = p.renderer.project({ x: 0, y: 0, z: 0 });
    for (const [axis, world, c] of [["\u6A2A", { x: 0.12, y: 0, z: 0 }, "#d29a8d"], ["\u7EB5", { x: 0, y: -0.12, z: 0 }, "#a6c4a2"], ["\u6DF1", { x: 0, y: 0, z: 0.12 }, "#83b3d0"]]) {
      const q = p.renderer.project(world), dx = (q.x - zero.x) / base * axisScale / 0.12, dy = (q.y - zero.y) / base * axisScale / 0.12;
      ctx.strokeStyle = c;
      ctx.fillStyle = c;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(axisOrigin.x, axisOrigin.y);
      ctx.lineTo(axisOrigin.x + dx, axisOrigin.y + dy);
      ctx.stroke();
      ctx.font = '8px "Microsoft YaHei"';
      ctx.textAlign = "center";
      ctx.fillText(axis, axisOrigin.x + dx * 1.3, axisOrigin.y + dy * 1.3);
    }
    ctx.fillStyle = "#819b9f";
    ctx.font = '8px "Microsoft YaHei"';
    ctx.textAlign = "left";
    ctx.fillText("\u7ACB\u4F53\u900F\u89C6 \xB7 " + (this.orbitEnabled ? "\u4E09\u7EF4\u516C\u8F6C\u4E2D" : "\u516C\u8F6C\u5DF2\u6682\u505C"), 12, 18);
    ctx.textAlign = "right";
    ctx.fillText("\u6C34\u5E73 " + Math.round(yaw * 180 / Math.PI) % 360 + "\xB0 \xB7 \u4FEF\u4EF0 " + Math.round(pitch * 180 / Math.PI) + "\xB0", w - 12, 18);
  }
  async runRealAgent() {
    return this.business.run();
  }
  route() {
    const kind = this.root.querySelector(".wf-sim-controls select").value;
    return { normal: ["S0", "A1", "A2", "D1", "B1", "B2", "D2", "B3", "C1", "C2", "C3", "V1", "D3", "P1", "O1", "O2", "D6", "F0"], repair: ["C2", "C3", "V1", "D3", "D4", "R1", "R2", "V1", "D3", "P1", "O1", "O2"], clarify: ["S0", "A1", "A2", "D1", "A3", "A1", "A2", "D1", "B1"], change: ["O2", "D6", "U1", "U2", "C2", "C3", "V1", "D3", "P1", "O1", "O2"] }[kind];
  }
  renderTrack() {
    const route = this.route();
    this.root.querySelector(".wf-track").innerHTML = route.map((id, i) => `<button title="${esc(this.byId.get(id).name)}" data-step="${i}" style="--stage-color:${this.colors.get(this.byId.get(id).group)}">${i + 1}</button>`).join("");
    this.root.querySelectorAll("[data-step]").forEach((b) => b.onclick = () => {
      this.animIndex = Number(b.dataset.step);
      this.showStep();
    });
  }
  togglePlay() {
    this.root.querySelector(".wf-sim-badge").textContent = "\u6A21\u62DF / \u975E\u771F\u5B9E\u65E5\u5FD7";
    this.root.querySelector(".wf-runtime-result").textContent = "";
    if (this.animRunning) {
      this.stop();
      return;
    }
    if (this.animIndex >= this.route().length - 1) this.animIndex = -1;
    this.animRunning = true;
    this.root.querySelector("[data-action=play]").textContent = "\u2161 \u6682\u505C";
    const step = () => {
      this.animIndex++;
      if (this.animIndex >= this.route().length) {
        this.stop();
        return;
      }
      this.showStep();
    };
    step();
    this.animTimer = setInterval(step, 1300);
  }
  showStep() {
    const route = this.route();
    const id = route[this.animIndex];
    if (!id) return;
    this.currentEdge = this.animIndex ? [route[this.animIndex - 1], id] : null;
    this.select(id);
    this.root.querySelectorAll("[data-step]").forEach((b, i) => {
      b.classList.toggle("done", i < this.animIndex);
      b.classList.toggle("current", i === this.animIndex);
    });
    const n = this.byId.get(id);
    this.root.querySelector(".wf-step-title").textContent = `${String(this.animIndex + 1).padStart(2, "0")} / ${route.length}\u3000${n.name}`;
    this.root.querySelector(".wf-event-log").textContent = "\u8DEF\u5F84\u6F14\u793A \xB7 " + n.description;
  }
  stop() {
    clearInterval(this.animTimer);
    this.animTimer = null;
    this.animRunning = false;
    if (this.root) this.root.querySelector("[data-action=play]").textContent = "\u25B6 \u64AD\u653E";
  }
  resetSimulation() {
    this.stop();
    this.root.querySelector(".wf-sim-badge").textContent = "\u6A21\u62DF / \u975E\u771F\u5B9E\u65E5\u5FD7";
    this.root.querySelector(".wf-runtime-result").textContent = "";
    this.animIndex = -1;
    this.currentEdge = null;
    this.renderTrack();
    this.root.querySelector(".wf-step-title").textContent = "\u7B49\u5F85\u5F00\u59CB\u6F14\u793A";
    this.root.querySelector(".wf-event-log").textContent = "\u9009\u62E9\u8DEF\u5F84\u5E76\u64AD\u653E\uFF0C\u67E5\u770B\u6B63\u5E38\u6D41\u7A0B\u4E0E\u5F02\u5E38\u5206\u652F\u3002";
    this.plots.forEach((p) => this.draw(p));
  }
  async onClose() {
    this.stopMotion();
    this.stop();
    this.clean.forEach((fn) => fn());
    this.clean = [];
    this.plots = [];
  }
};
module.exports = class AtlasPlugin extends Plugin {
  async onload() {
    this.registerView(TYPE, (leaf) => new AtlasView(leaf, this));
    this.addRibbonIcon("orbit", "\u884C\u8FF9 \u667A\u80FD\u4F53\u5DE5\u4F5C\u6D41\u661F\u56FE", () => this.open());
    this.addCommand({ id: "open-atlas", name: "\u6253\u5F00\u5DE5\u4F5C\u6D41\u661F\u56FE", callback: () => this.open() });
    this.registerObsidianProtocolHandler("wayfarer-atlas", () => this.open());
    this.app.workspace.onLayoutReady(() => this.open());
  }
  async open() {
    const existing = this.app.workspace.getLeavesOfType(TYPE)[0];
    if (existing) {
      this.app.workspace.revealLeaf(existing);
      return;
    }
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
    this.app.workspace.leftSplit?.collapse();
    this.app.workspace.rightSplit?.collapse();
  }
};
