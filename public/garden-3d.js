// A dream garden: a mossy, star-seeded bed in a glowing meadow under a pastel sky with auroras,
// floating islands, blossom willows, a moon gate and lanterns that drift up at dusk. Tap the soil
// to plant (tomato, sunflower, strawberry), drag to rain stardust from a wisp, tap glowing fruit to
// pick it. Touch the mushrooms, the moon gate or the sky. Petals, motes and grass lean away from
// your hand. Everything is procedural: no image files. A small bloom pass gives the glow.
import * as THREE from 'three';

const $ = s => document.querySelector(s);
const calm = () => document.body.classList.contains('still-world');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const STORE = 'dennyi-tomato-harvest';
const BED = { w: 3.0, d: 1.3, top: .3 };
const KINDS = {
  tomato: { icon: '🍅', speed: 1, regrow: .74, spacing: .36 },
  sunflower: { icon: '🌻', speed: .85, spacing: .42 },
  strawberry: { icon: '🍓', speed: 1.1, regrow: .7, spacing: .3 }
};
// Sky palette through the day: zenith, mid sky, horizon, sunlight, clouds. Always a little dreamlike.
const PAL = [
  [5, '#0a0b2e', '#231d57', '#4b3478', '#ff9a7a', '#3a3070'],
  [6.5, '#2f3a8a', '#9b7fd0', '#ffb8b0', '#ffb08a', '#f3c6e0'],
  [9, '#5b7fe0', '#a9b8f5', '#ffd6ea', '#fff0dc', '#fbeaff'],
  [13, '#5578e6', '#9fb8ff', '#f4e2ff', '#fff6ea', '#ffffff'],
  [16.5, '#5560c8', '#b79be6', '#ffcfb5', '#ffd2a0', '#ffe3f0'],
  [18.5, '#3a2e8a', '#b06fb8', '#ff9f8a', '#ff8a5c', '#ffb8c8'],
  [19.8, '#1a1757', '#5a3590', '#d0648a', '#ff6a5a', '#8a5aa8'],
  [21, '#07082a', '#171650', '#35286e', '#ff8a6a', '#2c2860'],
  [22.5, '#07082a', '#171650', '#35286e', '#ff8a6a', '#2c2860']
].map(([h, ...c]) => [h, ...c.map(x => new THREE.Color(x))]);
function palette(hr) {
  let i = 0; while (i < PAL.length - 2 && hr > PAL[i + 1][0]) i++;
  const a = PAL[i], b = PAL[i + 1], t = smooth((hr - a[0]) / (b[0] - a[0]));
  return ['top', 'mid', 'low', 'sun', 'cloud'].reduce((o, k, j) => { o[k] = a[j + 1].clone().lerp(b[j + 1], t); return o; }, {});
}

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function noise2(seed) {
  const r = rng(seed), p = new Uint8Array(512), g = new Float32Array(256);
  for (let i = 0; i < 256; i++) { p[i] = i; g[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = p[(xi & 255) + p[yi & 255]], b = p[((xi + 1) & 255) + p[yi & 255]], c = p[(xi & 255) + p[(yi + 1) & 255]], d = p[((xi + 1) & 255) + p[(yi + 1) & 255]];
    return lerp(lerp(g[a], g[b], u), lerp(g[c], g[d], u), v);
  };
}
const fbm = (n, x, y, o = 4) => { let s = 0, a = .5, f = 1, t = 0; for (let i = 0; i < o; i++) { s += n(x * f, y * f) * a; t += a; a *= .5; f *= 2.03; } return s / t; };
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', { willReadFrequently: true })]; }
function tex(c, { srgb = true, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
// Shared GLSL noise for the sky, mist, portal and waterfalls.
const GLSL_NOISE = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=vnoise(p)*a;p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}`;

// ---------- Procedural textures ----------
function soilTextures() {
  const W = 1024, H = 448, [c, x] = canvas(W, H), [b, bx] = canvas(W, H), n = noise2(7), m = noise2(19), img = x.createImageData(W, H), bump = bx.createImageData(W, H), r = rng(3);
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
    const big = fbm(n, i * .012, y * .012, 5), fine = fbm(m, i * .09, y * .09, 3), crumb = fbm(n, i * .045 + 40, y * .045, 3);
    const h = clamp(big * .25 + fine * .4 + crumb * .4 + .02), k = (y * W + i) * 4, speck = r();
    // Dark, faintly violet loam.
    let R = lerp(30, 84, h), G = lerp(20, 54, h), B = lerp(30, 66, h);
    if (speck > .99) { R += 16; G += 12; B += 18; } else if (speck < .02) { R *= .55; G *= .55; B *= .55; }
    img.data[k] = R; img.data[k + 1] = G; img.data[k + 2] = B; img.data[k + 3] = 255;
    bump.data[k] = bump.data[k + 1] = bump.data[k + 2] = clamp(h + (speck > .985 ? .25 : 0)) * 255; bump.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); bx.putImageData(bump, 0, 0);
  for (let i = 0; i < 520; i++) {
    const px = r() * W, py = r() * H, rad = 2 + r() * 6;
    const gx = x.createRadialGradient(px - rad * .3, py - rad * .4, rad * .1, px, py, rad);
    gx.addColorStop(0, 'rgba(112,82,110,.9)'); gx.addColorStop(.7, 'rgba(52,36,52,.9)'); gx.addColorStop(1, 'rgba(22,14,24,0)');
    x.fillStyle = gx; x.beginPath(); x.ellipse(px, py, rad * 1.2, rad, r() * 3, 0, 7); x.fill();
    bx.fillStyle = 'rgba(255,255,255,.55)'; bx.beginPath(); bx.ellipse(px, py, rad * 1.1, rad * .9, 0, 0, 7); bx.fill();
  }
  // Moss flecks.
  for (let i = 0; i < 160; i++) { const px = r() * W, py = r() * H, rad = 2 + r() * 5; x.fillStyle = `rgba(${60 + r() * 30},${110 + r() * 40},${90 + r() * 30},.55)`; x.beginPath(); x.ellipse(px, py, rad, rad * .7, r() * 3, 0, 7); x.fill(); }
  return { map: tex(c), bump: tex(b, { srgb: false }) };
}
function stoneTexture(seed) {
  const W = 256, [c, x] = canvas(W, W), n = noise2(seed), img = x.createImageData(W, W);
  for (let y = 0; y < W; y++) for (let i = 0; i < W; i++) {
    const h = fbm(n, i * .03, y * .03, 5), moss = clamp(fbm(n, i * .015 + 30, y * .015, 4) * 2.2 - 1.05), k = (y * W + i) * 4;
    img.data[k] = lerp(lerp(150, 205, h), 90, moss); img.data[k + 1] = lerp(lerp(140, 196, h), 150, moss); img.data[k + 2] = lerp(lerp(170, 222, h), 120, moss); img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); return tex(c, { repeat: [1, 1] });
}
function mossTexture() {
  const W = 512, [c, x] = canvas(W, W), n = noise2(55), img = x.createImageData(W, W), r = rng(8);
  for (let y = 0; y < W; y++) for (let i = 0; i < W; i++) {
    const h = fbm(n, i * .025, y * .025, 5), s = r(), k = (y * W + i) * 4;
    img.data[k] = lerp(28, 70, h) + s * 10; img.data[k + 1] = lerp(56, 120, h) + s * 14; img.data[k + 2] = lerp(58, 104, h) + s * 10; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); return tex(c, { repeat: [3, 1] });
}
function meadowTexture() {
  const W = 512, [c, x] = canvas(W, W), n = noise2(31), img = x.createImageData(W, W), r = rng(5);
  for (let y = 0; y < W; y++) for (let i = 0; i < W; i++) {
    const h = fbm(n, i * .02, y * .02, 5), s = r(), k = (y * W + i) * 4, lil = clamp(fbm(n, i * .006 + 9, y * .006, 3) * 1.8 - .7);
    img.data[k] = lerp(46, 120, lil) * (.7 + h * .5) + s * 10; img.data[k + 1] = lerp(104, 98, lil) * (.7 + h * .5) + s * 12; img.data[k + 2] = lerp(92, 150, lil) * (.7 + h * .4); img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); return tex(c, { repeat: [16, 16] });
}
function blossomTexture() {
  const W = 512, [c, x] = canvas(W, W), [b, bx] = canvas(W, W), r = rng(77);
  x.fillStyle = '#b86a9a'; x.fillRect(0, 0, W, W); bx.fillStyle = '#000'; bx.fillRect(0, 0, W, W);
  for (let i = 0; i < 6200; i++) { const px = r() * W, py = r() * W, s = 2.5 + r() * 6, a = r() * 6.3, hue = 300 + r() * 50, l = 70 + r() * 22;
    x.fillStyle = `hsl(${hue % 360},${55 + r() * 30}%,${l}%)`; x.beginPath(); x.ellipse(px, py, s, s * .6, a, 0, 7); x.fill();
    bx.fillStyle = `rgba(255,255,255,${.3 + r() * .7})`; bx.beginPath(); bx.ellipse(px, py, s, s * .6, a, 0, 7); bx.fill(); }
  return { map: tex(c, { repeat: [3, 3] }), bump: tex(b, { srgb: false, repeat: [3, 3] }) };
}
// Leaves: drawn with a serrated outline, mottled lamina, midrib and lateral veins; alpha outside.
function leafTexture(kind) {
  const W = 256, H = 512, [c, x] = canvas(W, H), r = rng(kind.length * 17), n = noise2(kind.length * 5);
  const pal = { tomato: ['#2e5f3a', '#4f9a62', '#a8e0b0'], sunflower: ['#35683a', '#5fa05a', '#b4e2a4'], strawberry: ['#275a3c', '#44905e', '#98d6b0'] }[kind];
  const outline = [], N = 180, teeth = kind === 'strawberry' ? 16 : kind === 'tomato' ? 11 : 20;
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = t * Math.PI * 2, side = Math.sin(a);
    let wProf = kind === 'sunflower' ? Math.pow(Math.sin(Math.PI * clamp((1 - (Math.cos(a) * .5 + .5)) * 1.02)), .75) * (1.05 - .25 * (Math.cos(a) * .5 + .5))
      : kind === 'strawberry' ? Math.pow(Math.sin(Math.PI * (1 - (Math.cos(a) * .5 + .5))), .6) * (.7 + .3 * (1 - (Math.cos(a) * .5 + .5)))
      : Math.pow(Math.sin(Math.PI * (1 - (Math.cos(a) * .5 + .5))), .85);
    const along = Math.cos(a) * .5 + .5, saw = 1 + (kind === 'tomato' ? .06 : .09) * Math.abs(Math.sin(along * teeth * Math.PI)) * (along > .05 && along < .97 ? 1 : 0);
    outline.push([W / 2 + side * wProf * W * .46 * saw, H * .98 - (1 - along) * H * .96]);
  }
  x.save(); x.beginPath(); outline.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.clip();
  const grad = x.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, pal[0]); grad.addColorStop(.5, pal[1]); grad.addColorStop(1, pal[0]);
  x.fillStyle = grad; x.fillRect(0, 0, W, H);
  const img = x.getImageData(0, 0, W, H);
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) { const k = (y * W + i) * 4, v = (fbm(n, i * .05, y * .05, 3) - .5) * 38; img.data[k] += v; img.data[k + 1] += v * 1.1; img.data[k + 2] += v * .8; }
  x.putImageData(img, 0, 0);
  x.strokeStyle = pal[2]; x.lineCap = 'round';
  x.lineWidth = kind === 'sunflower' ? 6 : 4.5; x.beginPath(); x.moveTo(W / 2, H); x.quadraticCurveTo(W / 2 + 4, H * .5, W / 2, H * .03); x.stroke();
  const laterals = kind === 'strawberry' ? 11 : kind === 'sunflower' ? 7 : 8;
  for (let i = 1; i <= laterals; i++) {
    const y0 = H * (1 - i / (laterals + 1.2)), len = W * .42 * Math.sin(Math.PI * (i / (laterals + 1))) + 10;
    x.lineWidth = kind === 'sunflower' ? 3 : 2.2; x.globalAlpha = .8;
    [-1, 1].forEach(s => { x.beginPath(); x.moveTo(W / 2, y0); x.quadraticCurveTo(W / 2 + s * len * .5, y0 - H * .03, W / 2 + s * len, y0 - H * (kind === 'strawberry' ? .06 : .09)); x.stroke(); });
  }
  x.globalAlpha = .18; x.lineWidth = 1; x.strokeStyle = '#e0f5d8';
  for (let i = 0; i < 260; i++) { const px = r() * W, py = r() * H; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - .5) * 14, py + (r() - .5) * 14); x.stroke(); }
  x.restore();
  const t = tex(c); t.generateMipmaps = true; return t;
}
function petalTexture(kind) {
  const W = 128, H = 256, [c, x] = canvas(W, H), r = rng(kind.length * 3);
  const col = { sunflower: ['#e8820e', '#ffd04a'], tomato: ['#e7b91c', '#fff07a'], strawberry: ['#f0d6ec', '#fffaff'], blossom: ['#f59ac8', '#ffe6f4'] }[kind];
  x.beginPath();
  if (kind === 'strawberry') x.ellipse(W / 2, H * .55, W * .46, H * .42, 0, 0, 7);
  else { x.moveTo(W / 2, H); x.bezierCurveTo(W * .02, H * .75, W * .1, H * .12, W / 2, 0); x.bezierCurveTo(W * .9, H * .12, W * .98, H * .75, W / 2, H); }
  x.closePath(); x.save(); x.clip();
  const g = x.createLinearGradient(0, H, 0, 0); g.addColorStop(0, col[0]); g.addColorStop(.35, col[1]); g.addColorStop(1, col[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = kind === 'strawberry' ? 'rgba(200,170,200,.35)' : 'rgba(190,110,0,.35)'; x.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { const ox = W * (.2 + i * .075); x.beginPath(); x.moveTo(W / 2, H); x.quadraticCurveTo(ox, H * .5, W / 2 + (ox - W / 2) * 1.3, H * .05); x.stroke(); }
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(255,255,255,${r() * .08})`; x.fillRect(r() * W, r() * H, 2, 2); }
  x.restore(); return tex(c);
}
function diskTexture() {
  const W = 512, [c, x] = canvas(W, W), [b, bx] = canvas(W, W), R = W / 2;
  x.fillStyle = '#2a1a0e'; x.fillRect(0, 0, W, W); bx.fillStyle = '#000'; bx.fillRect(0, 0, W, W);
  for (let i = 0; i < 1500; i++) {
    const a = i * 2.39996, rr = Math.sqrt(i / 1500) * R * .98, px = R + Math.cos(a) * rr, py = R + Math.sin(a) * rr, t = rr / R, s = 3.2 + t * 3.2;
    const col = t < .22 ? `hsl(${70 - t * 90},55%,${34 - t * 30}%)` : `hsl(${24 + (1 - t) * 10},${45 - t * 10}%,${14 + (1 - t) * 10}%)`;
    x.fillStyle = col; x.beginPath(); x.ellipse(px, py, s * .62, s, a, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,220,160,.2)'; x.beginPath(); x.ellipse(px - 1, py - 1, s * .25, s * .45, a, 0, 7); x.fill();
    bx.fillStyle = '#fff'; bx.beginPath(); bx.ellipse(px, py, s * .5, s * .85, a, 0, 7); bx.fill();
  }
  return { map: tex(c), bump: tex(b, { srgb: false }) };
}
function berryTexture() {
  const W = 256, [c, x] = canvas(W, W), r = rng(11);
  x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, W, W);
  for (let row = 0; row < 12; row++) for (let i = 0; i < 12; i++) {
    const px = (i + (row % 2) * .5) / 12 * W + (r() - .5) * 4, py = (row + .5) / 12 * W;
    x.fillStyle = 'rgba(120,120,120,.45)'; x.beginPath(); x.ellipse(px, py, 5, 6.5, 0, 0, 7); x.fill();
    x.fillStyle = '#fff4a8'; x.beginPath(); x.ellipse(px, py - 1, 2, 3.2, 0, 0, 7); x.fill();
  }
  return tex(c);
}
// Iridescent morpho wings: a blue-violet gradient with a dark rim and white dots.
function wingTexture() {
  const W = 256, [c, x] = canvas(W, W); x.clearRect(0, 0, W, W);
  const shape = new Path2D(`M8 ${W * .55} C ${W * .3} -10 ${W * .95} ${W * .05} ${W * .98} ${W * .4} C ${W * .9} ${W * .6} ${W * .6} ${W * .62} ${W * .5} ${W * .6} C ${W * .8} ${W * .75} ${W * .7} ${W * .98} ${W * .4} ${W * .95} C ${W * .2} ${W * .9} ${W * .1} ${W * .7} 8 ${W * .55} Z`);
  x.save(); x.clip(shape);
  const g = x.createRadialGradient(W * .15, W * .55, 4, W * .3, W * .5, W * .8); g.addColorStop(0, '#e6f6ff'); g.addColorStop(.25, '#6fd8ff'); g.addColorStop(.6, '#6a5cff'); g.addColorStop(1, '#2a1560');
  x.fillStyle = g; x.fillRect(0, 0, W, W);
  x.strokeStyle = 'rgba(20,10,50,.9)'; x.lineWidth = 16; x.stroke(shape);
  x.fillStyle = '#fff'; for (let i = 0; i < 14; i++) { x.beginPath(); x.arc(W * (.55 + .4 * Math.sin(i * .5)), W * (.2 + i * .05), 3, 0, 7); x.fill(); }
  x.restore(); return tex(c);
}
function glowTexture(inner = 'rgba(255,255,255,1)') { const [c, x] = canvas(64, 64), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, inner); g.addColorStop(.25, inner.replace(/[\d.]+\)$/, '.55)')); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return tex(c); }
function bladeTexture() { const [c, x] = canvas(8, 64), g = x.createLinearGradient(0, 64, 0, 0); g.addColorStop(0, '#1d3a36'); g.addColorStop(.5, '#4f9a7e'); g.addColorStop(1, '#c6f0d8'); x.fillStyle = g; x.fillRect(0, 0, 8, 64); return tex(c); }

// ---------- Geometry helpers ----------
function taperTube(points, r0, r1, radial = 8, segs = 20) {
  const curve = new THREE.CatmullRomCurve3(points), frames = curve.computeFrenetFrames(segs, false), pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, p = curve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i], r = lerp(r0, r1, t);
    for (let j = 0; j <= radial; j++) { const a = j / radial * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a), n = new THREE.Vector3().addScaledVector(N, cx).addScaledVector(B, sy);
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r); nor.push(n.x, n.y, n.z); uv.push(j / radial, t); }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.userData.curve = curve; return g;
}
// A leaf blade: base at the origin, length along +Y, face toward +Z, cupped across and curled along.
function leafGeometry(len, width, cup = .25, curl = .12) {
  const g = new THREE.PlaneGeometry(width, len, 6, 10); g.translate(0, len / 2, 0); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (width / 2), y = p.getY(i) / len; p.setZ(i, -cup * width * .5 * x * x + curl * len * y * y); }
  g.computeVertexNormals(); return g;
}
// A lumpy rock or bush: an icosahedron pushed about by noise.
function lumpGeometry(seed, detail, amount = .55, squash = .82) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, v = new THREE.Vector3(), hn = noise2(seed);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + (fbm(hn, v.x * 2.5 + 3, v.y * 2.5 + v.z * 2.5, 4) - .5) * amount; p.setXYZ(i, v.x * k, v.y * k * squash, v.z * k); }
  g.computeVertexNormals(); return g;
}
const UP = new THREE.Vector3(0, 1, 0);
function orient(obj, dir, faceUp = UP) {
  const y = dir.clone().normalize(); let z = faceUp.clone().addScaledVector(y, -faceUp.dot(y)); if (z.lengthSq() < 1e-4) z = new THREE.Vector3(1, 0, 0).addScaledVector(y, -y.x); z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z); obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// ---------- The garden ----------
async function start() {
  const canvasEl = $('#garden-canvas'), scene3 = $('#tomato-garden');
  if (!canvasEl || !scene3) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { window.startGarden2D?.(); return; }
  const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info'), gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
  const low = /SwiftShader|llvmpipe|Software/i.test(gpu) || (navigator.hardwareConcurrency || 8) <= 4;
  const small = Math.min(innerWidth, innerHeight) < 600;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
  renderer.shadowMap.enabled = !low; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? .6 : small ? 1.5 : 1.6));

  const status = $('#garden-status'), total = $('#harvest-total'), basket = $('.garden-basket'), dock = $('.garden-dock'), soilBox = $('.garden-soil'), story = $('#tomato-garden .story');
  const rainBtn = $('#garden-rain'), nightBtn = $('#garden-night');
  let harvest = 0; try { const n = Number(localStorage.getItem(STORE)); if (Number.isSafeInteger(n) && n >= 0) harvest = n; } catch { /* Session only. */ }
  total.textContent = harvest;

  // State the rest of the scene reads; declared up front so every closure can see it.
  let clock = 0, last = 0, frameReq = 0, needsRender = true, dayK = 1, rainK = 0, nightK = 0, W = 0, H = 0, bloomOn = true;
  let screenBed = { back: 0, front: 0, x0: 0, x1: 0 }, storyBottom = 0;

  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(44, 1, .05, 3000);
  scene.fog = new THREE.FogExp2('#c9b3e0', .032);
  const glowTex = glowTexture();

  // ---------- Sky: a painted dome with drifting clouds, sun, moon and aurora ribbons ----------
  const skyU = { uTime: { value: 0 }, uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uLow: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3() }, uMoon: { value: new THREE.Vector3(-.4, .3, -.87).normalize() }, uSunCol: { value: new THREE.Color() }, uCloud: { value: new THREE.Color() }, uDay: { value: 1 }, uAurora: { value: 0 }, uRain: { value: 0 } };
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: 'varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
    fragmentShader: `uniform float uTime,uDay,uAurora,uRain;uniform vec3 uTop,uMid,uLow,uSun,uMoon,uSunCol,uCloud;varying vec3 vDir;${GLSL_NOISE}
    void main(){
      vec3 d=normalize(vDir);float h=d.y;
      vec3 col=mix(uLow,uMid,smoothstep(-.03,.14,h));col=mix(col,uTop,smoothstep(.1,.55,h));
      col+=uLow*smoothstep(.07,0.,abs(h-.01))*.35;
      float sunward=max(dot(d,uSun),0.);
      vec2 cp=d.xz/(max(h,0.)+.16)*.8+vec2(uTime*.012,uTime*.005);
      float c=smoothstep(.5,.82,fbm(cp))*smoothstep(-.01,.08,h);
      vec3 cc=mix(uCloud,uSunCol*1.3,pow(sunward,5.)*.75);
      col=mix(col,cc,c*mix(.5,.85,uRain));
      if(uAurora>.01){float az=atan(d.x,-d.z);vec3 ac=vec3(0.);
        for(int i=0;i<3;i++){float fi=float(i);
          float h0=.075+fi*.05+.035*sin(az*2.3+uTime*.05+fi*2.)+.03*fbm(vec2(az*2.+fi*5.,uTime*.02));
          float dh=h-h0;float curtain=smoothstep(-.012,.0,dh)*exp(-max(dh,0.)*(11.+fi*4.));
          float rays=.3+.7*vnoise(vec2(az*38.+fi*9.,uTime*.3+fi));
          ac+=mix(vec3(.2,1.,.7),vec3(.85,.35,1.),smoothstep(.0,.1,dh)+fi*.25)*curtain*rays*(1.-fi*.25);}
        col+=ac*uAurora*smoothstep(-.1,.5,-d.z)*(1.-c*.6)*1.1;}
      col+=uSunCol*(pow(sunward,900.)*30.+pow(sunward,60.)*.9+pow(sunward,5.)*.3)*smoothstep(-.12,.04,uSun.y);
      float m=max(dot(d,normalize(uMoon)),0.),night=1.-uDay;
      col+=vec3(.9,.92,1.1)*(smoothstep(.9993,.9996,m)*5.+pow(m,300.)*.8+pow(m,14.)*.1)*night*(1.-uRain);
      gl_FragColor=vec4(col,1.);
    }` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 48, 24), skyMat); sky.frustumCulled = false; sky.renderOrder = -2; scene.add(sky);
  const envScene = new THREE.Scene(), envSky = new THREE.Mesh(sky.geometry, skyMat); envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null, envSun = null;
  const sunLight = new THREE.DirectionalLight('#fff1dc', 3); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048); Object.assign(sunLight.shadow.camera, { left: -3.5, right: 3.5, top: 3, bottom: -2, near: .5, far: 30 }); sunLight.shadow.bias = -.0004; sunLight.shadow.normalBias = .02; sunLight.shadow.radius = 4;
  scene.add(sunLight, sunLight.target);
  const moonLight = new THREE.DirectionalLight('#a9b4ff', 0); moonLight.position.set(-6, 8, 4); scene.add(moonLight);
  const hemi = new THREE.HemisphereLight('#cfd6ff', '#3a3048', .8); scene.add(hemi);
  const sun = { dir: new THREE.Vector3(), target: null, elev: 14, azim: 0, hour: 17.5 }, moonDir = skyU.uMoon.value;

  // ---------- Points: one shader for stars, motes and every sparkle ----------
  const pScale = { value: 600 };
  const pointMat = () => new THREE.ShaderMaterial({ uniforms: { uScale: pScale }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aSize;attribute vec3 aColor;varying vec3 vC;uniform float uScale;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=max(1.5,aSize*uScale/-mv.z);gl_Position=projectionMatrix*mv;vC=aColor;}',
    fragmentShader: 'varying vec3 vC;void main(){vec2 p=gl_PointCoord-.5;float d=length(p)*2.;float a=exp(-d*d*5.)+smoothstep(.22,0.,d)*.6;if(a<.01)discard;gl_FragColor=vec4(vC*a,1.);}' });
  function pointCloud(max) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(max * 3), col = new Float32Array(max * 3), size = new Float32Array(max);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const pts = new THREE.Points(geo, pointMat()); pts.frustumCulled = false; scene.add(pts);
    return { geo, pos, col, size, pts, flush(n) { geo.setDrawRange(0, n); geo.attributes.position.needsUpdate = geo.attributes.aColor.needsUpdate = geo.attributes.aSize.needsUpdate = true; } };
  }
  const STARS = low ? 500 : 1200, starCloud = pointCloud(STARS), sr = rng(99), starInfo = [];
  for (let i = 0; i < STARS; i++) { const a = sr() * Math.PI * 2, e = Math.asin(Math.pow(sr(), 1.6) * .85 + .015), R = 400;
    starCloud.pos.set([Math.cos(e) * Math.cos(a) * R, Math.sin(e) * R, Math.cos(e) * Math.sin(a) * R], i * 3); starCloud.size[i] = .5 + sr() * sr() * 1.6; starInfo.push({ ph: sr() * 6.3, sp: 1 + sr() * 3, tint: sr() }); }
  starCloud.flush(STARS); starCloud.pts.material.fog = false;
  function updateStars(k) {
    starCloud.pts.visible = k > .01; if (!starCloud.pts.visible) return;
    starInfo.forEach((s, i) => { const tw = k * (.55 + .45 * Math.sin(clock * s.sp + s.ph)); starCloud.col.set([tw * (s.tint > .8 ? 1.2 : .95), tw * .95, tw * (s.tint < .3 ? 1.3 : 1)], i * 3); });
    starCloud.geo.attributes.aColor.needsUpdate = true;
  }

  // ---------- Distance: haze hills, floating islands, a moon gate ----------
  const hillMat = new THREE.MeshStandardMaterial({ color: '#8fa6b8', roughness: 1 }), hillGeo = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), hr = rng(21);
  for (let i = 0; i < 12; i++) { const h = new THREE.Mesh(hillGeo, hillMat), far = i < 6; h.position.set((i % 6 - 2.5) * (far ? 14 : 9) + hr() * 4, -.2, far ? -34 - hr() * 10 : -20 - hr() * 6); h.scale.set(7 + hr() * 7, far ? 1.6 + hr() * 2.4 : 1.1 + hr() * 1.6, 5 + hr() * 3); scene.add(h); }
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(4), roughness: .85 }), mossMat = new THREE.MeshStandardMaterial({ map: mossTexture(), roughness: .95 });
  const islands = [], waterfalls = [];
  const fallU = { uTime: skyU.uTime };
  const fallMat = new THREE.ShaderMaterial({ uniforms: fallU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float uTime;varying vec2 vUv;${GLSL_NOISE}void main(){float s=fbm(vec2(vUv.x*6.,vUv.y*3.+uTime*.9));float e=smoothstep(0.,.3,vUv.x)*smoothstep(1.,.7,vUv.x)*smoothstep(0.,.5,vUv.y);float a=e*(.25+s*.8);gl_FragColor=vec4(vec3(.7,.9,1.3)*a*.8,1.);}` });
  [[-7, 3.3, -16, 1.2, 1], [6.5, 3.9, -19, 1.5, 0], [-1.8, 4.4, -27, 1.1, 0], [12, 2.9, -24, 1.8, 1], [-14, 4.6, -28, 2, 0]].forEach(([x, y, z, s, fall], i) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); scene.add(g);
    const rock = new THREE.Mesh((() => { const c = new THREE.ConeGeometry(1, 1.8, 10, 5), p = c.attributes.position, n = noise2(60 + i), v = new THREE.Vector3(); c.rotateX(Math.PI); c.translate(0, -.9, 0);
      for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const m = 1 + (fbm(n, v.x * 2 + 5, v.y * 2 + v.z * 2, 3) - .5) * .6; p.setXYZ(k, v.x * m, v.y, v.z * m); } c.computeVertexNormals(); return c; })(), stoneMat);
    g.add(rock);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.02, .95, .12, 20), mossMat); top.position.y = .02; g.add(top);
    const crown = new THREE.Mesh(lumpGeometry(80 + i, 2), new THREE.MeshStandardMaterial({ color: ['#ffb3d9', '#c9a8ff', '#9fe8d0'][i % 3], roughness: .8, emissive: ['#ff7ac0', '#a07aff', '#5fdcc0'][i % 3], emissiveIntensity: .25 }));
    crown.scale.setScalar(.38); crown.position.set(.2, .6, .1); g.add(crown);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.03, .06, .5, 6), new THREE.MeshStandardMaterial({ color: '#4a3548' })); trunk.position.set(.2, .3, .1); g.add(trunk);
    if (fall) { const f = new THREE.Mesh(new THREE.PlaneGeometry(.22, 3), fallMat); f.position.set(-.7, -1.5, .5); f.rotation.y = .4; g.add(f); waterfalls.push(f); }
    islands.push({ g, y, ph: i * 1.7 });
  });
  // The moon gate: a stone ring half-sunk behind the bed, with a slow swirl of light inside.
  const portalU = { uTime: skyU.uTime, uSpin: { value: 0 }, uNight: { value: 0 } };
  const gate = new THREE.Group(); gate.position.set(0, 1.0, -6); scene.add(gate);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, .11, 18, 80), stoneMat); ring.castShadow = !low; gate.add(ring);
  const rune = new THREE.Mesh(new THREE.TorusGeometry(1.1, .012, 6, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, 1.6, 1.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); rune.position.z = .115; gate.add(rune);
  const portal = new THREE.Mesh(new THREE.CircleGeometry(1.0, 64), new THREE.ShaderMaterial({ uniforms: portalU, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float uTime,uSpin,uNight;varying vec2 vUv;${GLSL_NOISE}
    void main(){vec2 p=vUv-.5;float r=length(p)*2.;float a=atan(p.y,p.x);
      float sw=a+r*3.2-uTime*(.2+uSpin*2.5);
      float n=fbm(vec2(cos(sw),sin(sw))*(r*2.+.4)+uTime*.05);
      vec3 c=mix(vec3(.28,.18,.85),vec3(.25,.95,1.),n);c=mix(c,vec3(1.,.55,.9),smoothstep(.55,.9,fbm(p*4.+uTime*.08)));
      float alpha=smoothstep(1.,.86,r);float core=smoothstep(.55,0.,r);
      c*=(.4+n*.9+core*.5)*(.7+.25*uNight+uSpin*1.4);
      gl_FragColor=vec4(c,alpha*(.55+.25*n));}` }));
  gate.add(portal);
  const orbitStones = new THREE.InstancedMesh(lumpGeometry(33, 1, .7), stoneMat, 7); gate.add(orbitStones);
  const orbitM = new THREE.Matrix4(), orbitQ = new THREE.Quaternion(), orbitE = new THREE.Euler(), orbitP = new THREE.Vector3(), orbitS = new THREE.Vector3();
  function placeOrbit(t, spin) { for (let i = 0; i < 7; i++) { const a = t * (.18 + spin * .8) + i * .8976, r = 1.38 + Math.sin(t * .7 + i) * .05, s = .05 + (i % 3) * .02; orbitM.compose(orbitP.set(Math.cos(a) * r, Math.sin(a) * r, Math.sin(t + i) * .1), orbitQ.setFromEuler(orbitE.set(t * .3 + i, t * .2, 0)), orbitS.set(s, s, s)); orbitStones.setMatrixAt(i, orbitM); } orbitStones.instanceMatrix.needsUpdate = true; }
  placeOrbit(0, 0);

  // ---------- Meadow: glowing grass that parts around your hand ----------
  const groundMat = new THREE.MeshStandardMaterial({ map: meadowTexture(), roughness: .95 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const windU = { value: 0 }, windK = { value: 1 }, pointerU = { value: new THREE.Vector3(0, -99, 0) }, pointerK = { value: 0 }, tipGlow = { value: new THREE.Color(0, 0, 0) };
  const bladeGeo = new THREE.PlaneGeometry(.014, .17, 1, 4); bladeGeo.translate(0, .085, 0);
  { const p = bladeGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / .17; p.setX(i, p.getX(i) * (1 - y * .85) + y * y * .025); p.setZ(i, y * y * .01); } bladeGeo.computeVertexNormals(); }
  const bladeMat = new THREE.MeshStandardMaterial({ map: bladeTexture(), side: THREE.DoubleSide, roughness: .75 });
  bladeMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, { uTime: windU, uWind: windK, uPointer: pointerU, uPointerK: pointerK, uTip: tipGlow });
    sh.vertexShader = 'uniform float uTime;\nuniform float uWind;\nuniform vec3 uPointer;\nuniform float uPointerK;\nvarying float vHgt;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
      vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]); float hgt = uv.y * uv.y; vHgt = uv.y;
      float w = sin(uTime * 1.7 + ip.x * 1.3 + ip.y * .8) * .6 + sin(uTime * 3.3 + ip.x * 4.1) * .25;
      mvPosition.x += w * hgt * .05 * uWind; mvPosition.z += cos(uTime * 1.3 + ip.y * 1.7) * hgt * .03 * uWind;
      vec2 aw = ip - uPointer.xz; float dd = length(aw), push = uPointerK * smoothstep(.75, .0, dd) * hgt;
      mvPosition.xz += aw / (dd + .001) * push * .13; mvPosition.y -= push * .05;
      mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = 'uniform vec3 uTip;\nvarying float vHgt;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uTip * vHgt * vHgt * vHgt;'); };
  const bladeCount = low ? 3500 : small ? 16000 : 30000, blades = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount), br = rng(4), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (let i = 0, placed = 0; placed < bladeCount && i < bladeCount * 3; i++) {
    const x = (br() - .5) * 16, z = lerp(-5.5, 2.6, br());
    if (Math.abs(x) < BED.w / 2 + .1 && Math.abs(z) < BED.d / 2 + .1) continue;
    const s = .6 + br() * .9; q.setFromEuler(new THREE.Euler((br() - .5) * .3, br() * Math.PI * 2, (br() - .5) * .3));
    m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (.7 + br() * .8), s)); blades.setMatrixAt(placed, m4);
    const lil = br() < .14; col.setHSL(lil ? .74 + br() * .08 : .4 + br() * .08, lil ? .35 : .35 + br() * .2, lil ? .6 : .42 + br() * .14); blades.setColorAt(placed, col); placed++;
  }
  blades.receiveShadow = true; scene.add(blades);
  // Tiny glowing flowers in the grass: cyan, pink, lilac and gold.
  const FL = low ? 120 : 420, flowerHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), FL), fr = rng(17), fcols = ['#7ff5ff', '#ff8ad8', '#b99bff', '#ffe08a'].map(c => new THREE.Color(c));
  const flowerStems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.0025, .003, 1, 4).translate(0, .5, 0), new THREE.MeshStandardMaterial({ color: '#3f7a64' }), FL);
  for (let i = 0; i < FL; i++) { let x, z; do { x = (fr() - .5) * 12; z = lerp(-6, 3.4, fr()); } while (Math.abs(x) < BED.w / 2 + .15 && Math.abs(z) < BED.d / 2 + .15);
    const h = .06 + fr() * .12, s = .008 + fr() * .011; m4.compose(new THREE.Vector3(x, h, z), q.identity(), new THREE.Vector3(s, s * .8, s)); flowerHeads.setMatrixAt(i, m4); flowerHeads.setColorAt(i, fcols[i % 4]);
    m4.compose(new THREE.Vector3(x, 0, z), q.identity(), new THREE.Vector3(1, h, 1)); flowerStems.setMatrixAt(i, m4); }
  scene.add(flowerHeads, flowerStems);

  // ---------- Blossom willows with hanging strands of light ----------
  const blossom = blossomTexture(), blossomMat = new THREE.MeshStandardMaterial({ map: blossom.map, bumpMap: blossom.bump, bumpScale: 3, roughness: .9, emissive: '#ff8ac8', emissiveMap: blossom.map, emissiveIntensity: .08 });
  const bush = lumpGeometry(8, low ? 3 : 4), trunkMat = new THREE.MeshStandardMaterial({ color: '#4a3548', roughness: .9 });
  const crowns = [], strands = [], tr = rng(12);
  [[-4.6, -4.2, 2.3], [4.9, -4.8, 2.6], [-7.4, -8.5, 3], [7.8, -9, 3.2], [-11, -13, 3.4], [11.5, -14, 3.3], [-13.5, -7, 2.8], [13.8, -8, 3], [-4.2, -17, 2.6], [5, -19, 2.8]].forEach(([x, z, h]) => {
    const lean = (tr() - .5) * .6, top = new THREE.Vector3(x + lean, h, z);
    const t = new THREE.Mesh(taperTube([new THREE.Vector3(x, 0, z), new THREE.Vector3(x - lean * .3, h * .4, z + (tr() - .5) * .3), new THREE.Vector3(x + lean * .6, h * .75, z), top], .13, .05, 8, 16), trunkMat);
    t.castShadow = !low; scene.add(t);
    for (let k = 0; k < 9; k++) { const a = tr() * 6.3, rr = .2 + tr() * .9, s = .5 + tr() * .45, c = new THREE.Vector3(top.x + Math.cos(a) * rr, h + (tr() - .2) * .8, top.z + Math.sin(a) * rr * .7);
      crowns.push({ p: c, s: new THREE.Vector3(s, s, s), ry: tr() * 6 });
      for (let j = 0; j < (low ? 2 : 4); j++) { const b = tr() * 6.3; strands.push({ p: new THREE.Vector3(c.x + Math.cos(b) * s * .8, c.y - s * .45, c.z + Math.sin(b) * s * .8), len: .5 + tr() * 1.1, ry: tr() * 3 }); } }
  });
  { const mesh = new THREE.InstancedMesh(bush, blossomMat, crowns.length), o = new THREE.Object3D();
    crowns.forEach((c, i) => { o.position.copy(c.p); o.rotation.set(0, c.ry, 0); o.scale.copy(c.s); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); mesh.setColorAt(i, new THREE.Color().setHSL(.85 + (i % 5) * .025, .5, .82 + (i % 3) * .06)); });
    mesh.castShadow = !low; scene.add(mesh); }
  const strandU = { uTime: skyU.uTime, uGlow: { value: .4 }, uFog: { value: .032 } };
  const strandMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.018, 1, 1, 8).translate(0, -.5, 0), new THREE.ShaderMaterial({ uniforms: strandU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'uniform float uTime;varying float vY;varying float vPh;varying float vDepth;varying vec2 vUv;void main(){vec3 p=position;float k=-p.y;vec4 w=instanceMatrix*vec4(p,1.);float ph=instanceMatrix[3][0]*3.1+instanceMatrix[3][2]*1.7;w.x+=sin(uTime*.9+ph)*k*k*.12;w.z+=cos(uTime*.7+ph)*k*k*.08;vY=k;vPh=ph;vUv=uv;vec4 mv=modelViewMatrix*w;vDepth=-mv.z;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform float uGlow,uFog,uTime;varying float vY;varying float vPh;varying float vDepth;varying vec2 vUv;void main(){float e=1.-abs(vUv.x-.5)*2.;float a=e*e*(1.-vY*.85);float bead=smoothstep(.93,1.,sin(vY*34.+vPh+uTime*.6));float f=exp(-pow(uFog*vDepth,2.));vec3 c=mix(vec3(1.,.72,.92),vec3(.8,.95,1.),vY)*(a*.35+bead*1.4*e)*uGlow*f;gl_FragColor=vec4(c,1.);}' }), strands.length);
  { const o = new THREE.Object3D(); strands.forEach((s, i) => { o.position.copy(s.p); o.rotation.set(0, s.ry, 0); o.scale.set(1, s.len, 1); o.updateMatrix(); strandMesh.setMatrixAt(i, o.matrix); }); strandMesh.frustumCulled = false; scene.add(strandMesh); }

  // ---------- Mushrooms: pulse softly; touch one and it bounces and lets go of spores ----------
  const stemMat = new THREE.MeshStandardMaterial({ color: '#efe6f2', roughness: .6, emissive: '#b8a0ff', emissiveIntensity: .05 });
  const mushrooms = [[-2.05, -1.0, .42, 0], [-2.4, -1.5, .28, 1], [-1.8, -1.45, .17, 2], [2.05, -1.05, .5, 1], [2.45, -1.6, .3, 0], [1.82, -1.5, .19, 2], [-3.0, -2.9, .7, 2], [3.3, -3.3, .85, 0], [-3.6, -4.4, .5, 1], [2.6, -2.4, .24, 2], [-.9, 1.05, .12, 1], [1.2, 1.1, .1, 0]].map(([x, z, h, c], i) => {
    const capCol = new THREE.Color(['#5ff0ff', '#ff7ad8', '#b58cff'][c]);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.set((Math.random() - .5) * .15, Math.random() * 6, (Math.random() - .5) * .15); scene.add(g);
    const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new THREE.Vector2(h * (.09 * (1 - t * .35) + .05 * Math.pow(1 - t, 4)), t * h)); }
    const stem = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), stemMat); stem.castShadow = !low; g.add(stem);
    const capR = h * .42, capMat = new THREE.MeshStandardMaterial({ color: capCol.clone().lerp(new THREE.Color('#ffffff'), .35), emissive: capCol, emissiveIntensity: .6, roughness: .35 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), capMat); cap.scale.set(capR, capR * .6, capR); cap.position.y = h * .96; cap.castShadow = !low; g.add(cap);
    const gills = new THREE.Mesh(new THREE.CircleGeometry(capR * .97, 28), new THREE.MeshBasicMaterial({ color: capCol.clone().multiplyScalar(1.4), side: THREE.DoubleSide })); gills.rotation.x = Math.PI / 2; gills.position.y = h * .96; g.add(gills);
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.7) }), 7);
    for (let k = 0; k < 7; k++) { const a = k * 2.4, e = .35 + (k % 3) * .3, d = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)); m4.compose(new THREE.Vector3(d.x * capR, h * .96 + d.y * capR * .6, d.z * capR), q.identity(), new THREE.Vector3(1, 1, 1).multiplyScalar(capR * .09)); dots.setMatrixAt(k, m4); }
    g.add(dots);
    return { g, cap, capMat, capCol, h, capR, ph: i * 1.3, bounce: 0 };
  });

  // ---------- The bed: star-seeded soil in a mossy planter rimmed with river stones and crystals ----------
  const soilTex = soilTextures(), [wetC, wetX] = canvas(512, 224), wetTex = tex(wetC, { srgb: false }), soilGlow = { value: .4 };
  const soilMat = new THREE.MeshStandardMaterial({ map: soilTex.map, bumpMap: soilTex.bump, bumpScale: 2.2, roughness: .97 });
  soilMat.onBeforeCompile = sh => { sh.uniforms.wetMap = { value: wetTex }; sh.uniforms.uTime = windU; sh.uniforms.uGlow = soilGlow;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWetUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvWetUv = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D wetMap;\nuniform float uTime;\nuniform float uGlow;\nvarying vec2 vWetUv;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nfloat wet = texture2D(wetMap, vWetUv).a; diffuseColor.rgb *= mix(1.0, .45, wet);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .5, wet);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 sg = vWetUv * vec2(260., 115.); vec2 sid = floor(sg); float sh = fract(sin(dot(sid, vec2(12.9898, 78.233))) * 43758.5453);
        float sp = step(.972, sh) * smoothstep(.32, .0, length(fract(sg) - .5)) * (.5 + .5 * sin(uTime * (1. + sh * 2.) + sh * 60.));
        totalEmissiveRadiance += mix(vec3(.45, .8, 1.2), vec3(1.1, .6, 1.), fract(sh * 7.)) * sp * uGlow * (.35 + wet * 2.2);`); };
  const soilGeo = new THREE.PlaneGeometry(BED.w - .08, BED.d - .08, 150, 64); { const p = soilGeo.attributes.position, sn = noise2(41); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), edge = Math.min((BED.w / 2 - .04 - Math.abs(x)) / .12, (BED.d / 2 - .04 - Math.abs(y)) / .12, 1); p.setZ(i, (fbm(sn, x * 6, y * 6, 4) - .5) * .035 + clamp(edge) * .012 - .012); } soilGeo.computeVertexNormals(); }
  const soil = new THREE.Mesh(soilGeo, soilMat); soil.rotation.x = -Math.PI / 2; soil.position.y = BED.top - .02; soil.receiveShadow = true; scene.add(soil);
  const planter = new THREE.Mesh(new THREE.BoxGeometry(BED.w - .04, BED.top - .08, BED.d - .04), new THREE.MeshStandardMaterial({ color: '#1c1624', roughness: 1 })); planter.position.y = (BED.top - .08) / 2; planter.castShadow = planter.receiveShadow = true; scene.add(planter);
  { const list = [], rr = rng(71), per = 2 * (BED.w + BED.d);
    for (let s = 0; s < per; s += .085) { let x, z; if (s < BED.w) { x = -BED.w / 2 + s; z = BED.d / 2; } else if (s < BED.w + BED.d) { x = BED.w / 2; z = BED.d / 2 - (s - BED.w); } else if (s < 2 * BED.w + BED.d) { x = BED.w / 2 - (s - BED.w - BED.d); z = -BED.d / 2; } else { x = -BED.w / 2; z = -BED.d / 2 + (s - 2 * BED.w - BED.d); }
      const sc = .045 + rr() * .035; list.push({ p: new THREE.Vector3(x + (rr() - .5) * .02, BED.top - .01 + (rr() - .5) * .01, z + (rr() - .5) * .02), s: new THREE.Vector3(sc * 1.2, sc * .8, sc), ry: rr() * 6 }); }
    const pebbles = new THREE.InstancedMesh(lumpGeometry(9, 2, .5, .7), stoneMat, list.length), o = new THREE.Object3D();
    list.forEach((t, i) => { o.position.copy(t.p); o.rotation.set(0, t.ry, 0); o.scale.copy(t.s); o.updateMatrix(); pebbles.setMatrixAt(i, o.matrix); pebbles.setColorAt(i, new THREE.Color().setHSL(.72 + rr() * .1, .15, .78 + rr() * .15)); });
    pebbles.castShadow = !low; pebbles.receiveShadow = true; scene.add(pebbles); }
  { const wall = [], wr = rng(91), per = 2 * (BED.w + BED.d);
    [.075, .19].forEach((y, row) => { for (let s = row * .06; s < per; s += .09 + wr() * .05) { let x, z, ry; if (s < BED.w) { x = -BED.w / 2 + s; z = BED.d / 2; ry = 0; } else if (s < BED.w + BED.d) { x = BED.w / 2; z = BED.d / 2 - (s - BED.w); ry = Math.PI / 2; } else if (s < 2 * BED.w + BED.d) { x = BED.w / 2 - (s - BED.w - BED.d); z = -BED.d / 2; ry = 0; } else { x = -BED.w / 2; z = -BED.d / 2 + (s - 2 * BED.w - BED.d); ry = Math.PI / 2; }
      wall.push({ p: new THREE.Vector3(x, y + (wr() - .5) * .015, z), s: new THREE.Vector3(.06 + wr() * .04, .05 + wr() * .025, .05 + wr() * .015), ry: ry + (wr() - .5) * .3 }); } });
    const stones = new THREE.InstancedMesh(lumpGeometry(19, 2, .45, .8), stoneMat, wall.length), o = new THREE.Object3D();
    wall.forEach((t, i) => { o.position.copy(t.p); o.rotation.set((wr() - .5) * .2, t.ry, (wr() - .5) * .2); o.scale.copy(t.s); o.updateMatrix(); stones.setMatrixAt(i, o.matrix); stones.setColorAt(i, new THREE.Color().setHSL(.7 + wr() * .12, .18, .6 + wr() * .2)); });
    stones.castShadow = !low; stones.receiveShadow = true; scene.add(stones); }
  const crystalMat = new THREE.MeshStandardMaterial({ color: '#dff6ff', emissive: '#6fe0ff', emissiveIntensity: 1.2, roughness: .15, metalness: .1, transparent: true, opacity: .9 });
  const crystalPinkMat = crystalMat.clone(); crystalPinkMat.emissive.set('#ff8ad8'); crystalPinkMat.color.set('#ffe6f6');
  const crystals = new THREE.Group(); scene.add(crystals);
  [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [-.45, 1], [.55, 1]].forEach(([sx, sz], i) => { for (let k = 0; k < 3; k++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), (i + k) % 2 ? crystalMat : crystalPinkMat), s = [.035, .025, .02][k] * (i < 4 ? 1.3 : .9);
    c.scale.set(s * .6, s * 2.4, s * .6); c.position.set(sx * BED.w / 2 + (k - 1) * .035, BED.top + s * 1.5, sz * BED.d / 2 + (k % 2 ? .02 : -.02)); c.rotation.set((k - 1) * .35, k, (k - 1) * .4); crystals.add(c); } });
  function paintWet(x, z, radius, strength) {
    const u = (x + BED.w / 2) / BED.w * wetC.width, v = (z + BED.d / 2) / BED.d * wetC.height, r = radius / BED.w * wetC.width;
    const g = wetX.createRadialGradient(u, v, 0, u, v, r); g.addColorStop(0, `rgba(0,0,0,${strength})`); g.addColorStop(1, 'rgba(0,0,0,0)'); wetX.fillStyle = g; wetX.fillRect(u - r, v - r, r * 2, r * 2); wetDirty = true;
  }
  let wetDirty = false, dryClock = 0;

  // ---------- Atmosphere: mist banks and slanted shafts of light ----------
  const mistU = [];
  const mistMat = (axis, op, scale) => { const u = { uTime: skyU.uTime, uOp: { value: op }, uCol: { value: new THREE.Color('#ffffff') }, uAxis: { value: axis }, uScale: { value: scale }, uBase: { value: op } }; mistU.push(u);
    return new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: `uniform float uTime,uOp,uAxis,uScale;uniform vec3 uCol;varying vec2 vUv;varying vec3 vW;${GLSL_NOISE}
      void main(){vec2 c=mix(vW.xz,vW.xy,uAxis)*uScale;float n=fbm(c+vec2(uTime*.025,uTime*.011));n=n*.6+fbm(c*2.1-vec2(uTime*.04,0.))*.4;
        float e=smoothstep(0.,.25,vUv.x)*smoothstep(1.,.75,vUv.x)*smoothstep(0.,.3,vUv.y)*smoothstep(1.,.6,vUv.y);
        gl_FragColor=vec4(uCol,smoothstep(.3,.78,n)*e*uOp);}` }); };
  [[.12, -8, .5], [.4, -9.5, .35]].forEach(([y, z, op]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), mistMat(0, op, .22)); m.rotation.x = -Math.PI / 2; m.position.set(0, y, z); scene.add(m); });
  [[-5, .45], [-10, .55], [-16, .6]].forEach(([z, op]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 3.6), mistMat(1, op, .18)); m.position.set(0, 1.1, z); scene.add(m); });
  const shaftU = { uTime: skyU.uTime, uOp: { value: .15 }, uCol: { value: new THREE.Color('#fff0dc') } }, shafts = [];
  const shaftMat = new THREE.ShaderMaterial({ uniforms: shaftU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uTime,uOp;uniform vec3 uCol;varying vec2 vUv;void main(){float e=pow(sin(3.14159*vUv.x),2.);float f=smoothstep(0.,.55,vUv.y)*smoothstep(1.,.8,vUv.y);float fl=.75+.25*sin(uTime*.6+vUv.x*6.);gl_FragColor=vec4(uCol*e*f*fl*uOp,1.);}' });
  [[-2.6, -3.5, 1.3], [-.6, -4.8, .9], [1.8, -3.2, 1.6], [3.8, -5.5, 1.1]].forEach(([x, z, w], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 9), shaftMat); m.position.set(x, 3.4, z); m.rotation.z = -.42; m.rotation.y = .15 * i; scene.add(m); shafts.push({ m, ph: i * 2.1 }); });

  // Lanterns drifting up out of the meadow, brightest at night.
  const lanternMat = new THREE.MeshStandardMaterial({ color: '#ffd6a0', emissive: '#ff9a4a', emissiveIntensity: 1.5, roughness: .8, side: THREE.DoubleSide });
  const lanternGlowMat = new THREE.SpriteMaterial({ map: glowTex, color: '#ffae6a', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  const lanterns = [...Array(low ? 6 : 12)].map((_, i) => { const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(.055, .042, .11, 12, 1, true), lanternMat), halo = new THREE.Sprite(lanternGlowMat); halo.scale.setScalar(.5); g.add(body, halo); scene.add(g);
    return { g, x: (Math.random() - .5) * 11, z: -2.5 - Math.random() * 8, y: Math.random() * 5, sp: .1 + Math.random() * .08, ph: Math.random() * 6 }; });

  // Materials shared by the plants. Leaves and stems get a soft rim of light.
  const rimU = { value: new THREE.Color(.04, .1, .09) };
  const rimmed = m => { m.onBeforeCompile = sh => { sh.uniforms.uRim = rimU; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat rimK = pow(1. - abs(dot(normalize(vViewPosition), normal)), 2.5); totalEmissiveRadiance += uRim * (rimK * 2.2 + .15);'); }; return m; };
  const M = {
    stem: rimmed(new THREE.MeshStandardMaterial({ color: '#5a8a52', roughness: .6 })),
    thickStem: rimmed(new THREE.MeshStandardMaterial({ color: '#5f8a4c', roughness: .75 })),
    leaf: Object.fromEntries(['tomato', 'sunflower', 'strawberry'].map(k => [k, rimmed(new THREE.MeshStandardMaterial({ map: leafTexture(k), side: THREE.DoubleSide, alphaTest: .5, roughness: k === 'strawberry' ? .45 : .65 }))])),
    petal: Object.fromEntries(['tomato', 'sunflower', 'strawberry'].map(k => { const t = petalTexture(k); return [k, new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: k === 'sunflower' ? .35 : .5, side: THREE.DoubleSide, alphaTest: .4, roughness: .6 })]; })),
    eye: new THREE.MeshStandardMaterial({ color: '#d9a51c', emissive: '#ffb020', emissiveIntensity: .6, roughness: .7 }),
    sepal: new THREE.MeshStandardMaterial({ color: '#3f7a45', roughness: .6, side: THREE.DoubleSide }),
    berry: berryTexture()
  };
  const disk = diskTexture();
  M.disk = new THREE.MeshStandardMaterial({ map: disk.map, bumpMap: disk.bump, bumpScale: 3, roughness: .85, emissiveMap: disk.map, emissive: '#ffb050', emissiveIntensity: .25 });
  M.bract = new THREE.MeshStandardMaterial({ color: '#4d8045', roughness: .7, side: THREE.DoubleSide });
  const fruitGeo = (() => { const g = new THREE.SphereGeometry(1, 36, 26), p = g.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const ph = Math.atan2(v.z, v.x), lobe = 1 + .045 * Math.cos(ph * 5) * (1 - Math.abs(v.y)); p.setXYZ(i, v.x * lobe, v.y * .84 - (v.y > .7 ? (v.y - .7) * .35 : 0), v.z * lobe); } g.computeVertexNormals(); return g; })();
  const berryGeo = (() => { const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(Math.sin(Math.PI * Math.pow(t, .8)) * (.55 + .45 * (1 - t)) * .9, -t * 1.25)); } return new THREE.LatheGeometry(pts, 28); })();
  const leafGeos = { tomato: leafGeometry(.1, .056, .35, .15), sun: leafGeometry(.3, .26, .3, -.22), straw: leafGeometry(.075, .062, .4, .1), petalT: leafGeometry(.014, .006, .2, -.4), petalS: leafGeometry(.075, .022, .25, .2), petalW: leafGeometry(.014, .012, .3, .1), sepal: leafGeometry(.018, .006, .2, -.3) };
  const shade = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---------- Plant builders: full-grown structure, revealed and scaled by growth ----------
  // Leaves, flowers and sepals that move together are merged into one mesh, so a plant is a few
  // dozen draws rather than hundreds.
  const tmpO = new THREE.Object3D();
  function place(geo, pos, dir, scale = 1, faceUp = UP) { tmpO.position.copy(pos); orient(tmpO, dir, faceUp); tmpO.scale.setScalar(scale); tmpO.updateMatrix(); const m = tmpO.matrix.clone(); tmpO.scale.setScalar(1); return [geo, m]; }
  function merge(list) {
    const pos = [], nor = [], uv = [], idx = [], v = new THREE.Vector3(); let off = 0;
    list.forEach(([g, m]) => { const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, nm = new THREE.Matrix3().getNormalMatrix(m);
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); pos.push(v.x, v.y, v.z); v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off); off += p.count; });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); out.setIndex(idx); return out;
  }
  const flowerGeo = (petal, n, down) => merge([...Array(n)].map((_, i) => { const a = i / n * Math.PI * 2; return place(petal, new THREE.Vector3(), new THREE.Vector3(Math.cos(a), down, Math.sin(a))); }));
  const tomatoFlower = flowerGeo(leafGeos.petalT, 5, -.35), strawFlower = flowerGeo(leafGeos.petalW, 5, .45);
  const sepals = (n, up, sc) => merge([...Array(n)].map((_, i) => { const a = i / n * Math.PI * 2; return place(leafGeos.sepal, new THREE.Vector3(0, .9, 0), new THREE.Vector3(Math.cos(a), up, Math.sin(a)), sc); }));
  const tomatoSepals = sepals(5, .25, 1), berrySepals = sepals(8, .15, 1.2);
  let nextId = 1;
  function buildTomato(r) {
    const root = new THREE.Group(), grow = new THREE.Group(); root.add(grow);
    const h = .85 + r() * .15, pts = [0, .25, .5, .75, 1].map(t => new THREE.Vector3((r() - .5) * .04 * t, t * h, (r() - .5) * .04 * t));
    const stemGeo = taperTube(pts, .011, .004, 7, 24), curve = stemGeo.userData.curve; grow.add(shade(new THREE.Mesh(stemGeo, M.stem)));
    const parts = [], fruits = [], flowers = [], leaves = [];
    for (let i = 0; i < 7; i++) {
      const t = .12 + i * .115, at = curve.getPointAt(t), az = i * 2.4 + r() * .6, dir = new THREE.Vector3(Math.cos(az), .5 + r() * .25, Math.sin(az)).normalize();
      const b = new THREE.Group(); b.position.copy(at); grow.add(b);
      const len = .2 + r() * .08, bgeo = taperTube([new THREE.Vector3(), dir.clone().multiplyScalar(len * .5).add(new THREE.Vector3(0, .03, 0)), dir.clone().multiplyScalar(len).add(new THREE.Vector3(0, -.015, 0))], .005, .0022, 5, 10), bc = bgeo.userData.curve;
      b.add(shade(new THREE.Mesh(bgeo, M.stem)));
      const lf = [[.35, 1], [.35, -1], [.6, 1], [.6, -1], [.82, 1], [.82, -1], [1, 0]].map(([s, side]) => {
        const p = bc.getPointAt(Math.min(1, s)), tan = bc.getTangentAt(Math.min(1, s)), sideDir = new THREE.Vector3().crossVectors(tan, UP).normalize().multiplyScalar(side);
        return place(leafGeos.tomato, p, side ? tan.clone().multiplyScalar(.5).add(sideDir).add(new THREE.Vector3(0, .15, 0)) : tan.clone(), side ? .75 + s * .35 : 1.15); });
      b.add(shade(new THREE.Mesh(merge(lf), M.leaf.tomato))); leaves.push({ obj: b, phase: r() * 6 });
      parts.push({ obj: b, appear: .04 + i * .085, span: .14 });
      if (i === 1 || i === 3 || i === 5) {
        const truss = new THREE.Group(); truss.position.copy(bc.getPointAt(.28)).add(new THREE.Vector3(0, -.02, 0)); b.add(truss);
        const fl = new THREE.Mesh(merge([0, 1, 2].map(k => [tomatoFlower, new THREE.Matrix4().makeTranslation((k - 1) * .025, -.02 - (k % 2) * .01, (r() - .5) * .02)])), M.petal.tomato);
        truss.add(fl); flowers.push(fl);
        for (let k = 0; k < 2; k++) {
          const fr = new THREE.Group(), mesh = shade(new THREE.Mesh(fruitGeo, new THREE.MeshPhysicalMaterial({ color: '#6f9a3a', roughness: .3, clearcoat: 1, clearcoatRoughness: .12, sheen: 1, sheenColor: new THREE.Color('#ffc6e8') })));
          fr.position.set((k - .5) * .05, -.05 - k * .012, (r() - .5) * .03); fr.add(mesh); mesh.add(new THREE.Mesh(tomatoSepals, M.sepal));
          truss.add(fr); fruits.push({ group: fr, mesh, picked: false, size: .032 + r() * .008 });
        }
      }
    }
    const tuft = new THREE.Group(); tuft.position.copy(curve.getPointAt(1)); grow.add(tuft);
    tuft.add(shade(new THREE.Mesh(merge([0, 1, 2, 3].map(k => place(leafGeos.tomato, new THREE.Vector3(), new THREE.Vector3(Math.cos(k * 1.6) * .5, 1, Math.sin(k * 1.6) * .5), .7))), M.leaf.tomato)));
    parts.push({ obj: tuft, appear: 0, span: .1 });
    return { root, grow, parts, fruits, flowers, leaves, height: h };
  }
  function buildSunflower(r) {
    const root = new THREE.Group(), grow = new THREE.Group(); root.add(grow);
    const h = 1.12 + r() * .16, pts = [0, .3, .6, .85, 1].map((t, i) => new THREE.Vector3((r() - .5) * .05 * t, t * h, (r() - .5) * .05 * t + (i === 4 ? .03 : 0)));
    const stemGeo = taperTube(pts, .021, .011, 9, 30), curve = stemGeo.userData.curve; grow.add(shade(new THREE.Mesh(stemGeo, M.thickStem)));
    const parts = [], leaves = [];
    for (let i = 0; i < 9; i++) {
      const t = .07 + i * .09, at = curve.getPointAt(t), az = i * 2.2 + r() * .4, dir = new THREE.Vector3(Math.cos(az), .15, Math.sin(az)).normalize(), b = new THREE.Group(); b.position.copy(at); grow.add(b);
      const pl = .06 + (1 - t) * .05; b.add(shade(new THREE.Mesh(taperTube([new THREE.Vector3(), dir.clone().multiplyScalar(pl * .5).add(new THREE.Vector3(0, .02, 0)), dir.clone().multiplyScalar(pl)], .004, .003, 5, 6), M.thickStem)));
      b.add(shade(new THREE.Mesh(merge([place(leafGeos.sun, dir.clone().multiplyScalar(pl), dir.clone().add(new THREE.Vector3(0, .2, 0)), 1.1 - t * .55)]), M.leaf.sunflower)));
      leaves.push({ obj: b, phase: r() * 6 }); parts.push({ obj: b, appear: .03 + i * .07, span: .12 });
    }
    const head = new THREE.Group(), face = new THREE.Group(); head.position.copy(curve.getPointAt(1)); grow.add(head); head.add(face); face.position.z = .02;
    const back = shade(new THREE.Mesh(new THREE.CylinderGeometry(.12, .07, .035, 32), M.bract)); back.rotation.x = Math.PI / 2; face.add(back);
    const diskMesh = shade(new THREE.Mesh(new THREE.CircleGeometry(.112, 48), M.disk)); diskMesh.position.z = .019; face.add(diskMesh);
    face.add(new THREE.Mesh(merge([...Array(16)].map((_, i) => { const a = i / 16 * Math.PI * 2; return place(leafGeos.sepal, new THREE.Vector3(Math.cos(a) * .1, Math.sin(a) * .1, -.01), new THREE.Vector3(Math.cos(a), Math.sin(a), -.6), 2.2, new THREE.Vector3(0, 0, -1)); })), M.bract));
    const bud = shade(new THREE.Mesh(new THREE.SphereGeometry(.05, 20, 14), M.bract)); head.add(bud);
    const petals = new THREE.InstancedMesh(leafGeos.petalS, M.petal.sunflower, 34); petals.castShadow = true; face.add(petals);
    const petalInfo = [...Array(34)].map((_, i) => ({ a: i / 34 * Math.PI * 2 + (i % 2) * .09, z: .012 + (i % 2) * .004, tilt: (r() - .5) * .25 }));
    return { root, grow, parts, fruits: [], flowers: [face], leaves, head, face, bud, petals, petalInfo, open: -1, disk: diskMesh, height: h };
  }
  function buildStrawberry(r) {
    const root = new THREE.Group(), grow = new THREE.Group(); root.add(grow);
    const parts = [], fruits = [], flowers = [], leaves = [];
    for (let i = 0; i < 8; i++) {
      const az = i * 2.4 + r() * .5, reach = .09 + r() * .06, up = .1 + r() * .06, b = new THREE.Group(); grow.add(b);
      const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), tip = dir.clone().multiplyScalar(reach).add(new THREE.Vector3(0, up, 0));
      b.add(shade(new THREE.Mesh(taperTube([new THREE.Vector3(), dir.clone().multiplyScalar(reach * .35).add(new THREE.Vector3(0, up * .8, 0)), tip], .0025, .0018, 5, 8), M.stem)));
      b.add(shade(new THREE.Mesh(merge([-.8, 0, .8].map(o => place(leafGeos.straw, tip, dir.clone().applyAxisAngle(UP, o).multiplyScalar(.8).add(new THREE.Vector3(0, .45, 0))))), M.leaf.strawberry)));
      leaves.push({ obj: b, phase: r() * 6 }); parts.push({ obj: b, appear: i * .06, span: .14 });
    }
    for (let i = 0; i < 3; i++) {
      const az = i * 2.1 + .5, dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), tip = dir.clone().multiplyScalar(.07).add(new THREE.Vector3(0, .13, 0)), fl = new THREE.Group();
      grow.add(new THREE.Mesh(taperTube([new THREE.Vector3(), dir.clone().multiplyScalar(.03).add(new THREE.Vector3(0, .09, 0)), tip], .0016, .0012, 4, 8), M.stem));
      fl.position.copy(tip); fl.add(new THREE.Mesh(strawFlower, M.petal.strawberry)); const eye = new THREE.Mesh(new THREE.SphereGeometry(.004, 10, 8), M.eye); eye.position.y = .002; fl.add(eye); grow.add(fl); flowers.push(fl);
    }
    for (let i = 0; i < 4; i++) {
      const az = i * 1.6 + .2, reach = .11 + r() * .06, dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), end = dir.clone().multiplyScalar(reach).add(new THREE.Vector3(0, .04, 0));
      const stalk = new THREE.Mesh(taperTube([new THREE.Vector3(0, .02, 0), dir.clone().multiplyScalar(reach * .5).add(new THREE.Vector3(0, .09, 0)), end], .0016, .0012, 4, 10), M.stem); grow.add(stalk);
      const fr = new THREE.Group(); fr.position.copy(end); grow.add(fr);
      const mesh = shade(new THREE.Mesh(berryGeo, new THREE.MeshPhysicalMaterial({ map: M.berry, color: '#e3ebc2', roughness: .32, clearcoat: .8, clearcoatRoughness: .2 }))); mesh.rotation.z = dir.x * .5; mesh.rotation.x = -dir.z * .5; fr.add(mesh);
      mesh.add(new THREE.Mesh(berrySepals, M.sepal)); fruits.push({ group: fr, mesh, picked: false, size: .03 + r() * .006, stalk });
    }
    return { root, grow, parts, fruits, flowers, leaves, height: .2 };
  }

  const builders = { tomato: buildTomato, sunflower: buildSunflower, strawberry: buildStrawberry };

  const plants = [];
  function addPlant(kind, x, z, g = .02) {
    const r = rng(nextId * 7919 + Math.floor(x * 1000)), p = builders[kind](r);
    Object.assign(p, { id: nextId++, kind, x, z, g, pending: g < .1 ? .1 : 0, sway: 0, vel: 0, phase: r() * 6, dying: 0, born: clock, wasRipe: false });
    p.root.position.set(x, BED.top - .015, z); p.root.rotation.y = r() * Math.PI * 2; scene.add(p.root);
    p.root.traverse(o => { o.userData.plant = p; });
    plants.push(p); applyGrowth(p, 0); return p;
  }
  // Growth: the plant scales up, organs unfold in order, flowers come and go, fruit swells, ripens and glows.
  function applyGrowth(p, t) {
    const g = p.g, dieK = p.dying ? 1 - smooth(p.dying) : 1;
    const baseScale = { tomato: lerp(.16, 1, smooth(g / .8)), sunflower: lerp(.1, 1, smooth(g / .75)), strawberry: lerp(.3, 1, smooth(g / .7)) }[p.kind] * dieK;
    p.grow.scale.setScalar(Math.max(.001, baseScale));
    p.parts.forEach(pt => { const k = smooth((g - pt.appear) / pt.span); pt.obj.visible = k > .01; pt.obj.scale.setScalar(Math.max(.001, k)); });
    const flowerK = p.kind === 'sunflower' ? 0 : smooth((g - .5) / .06) * (1 - smooth((g - .7) / .05));
    if (p.kind !== 'sunflower') p.flowers.forEach(f => { f.visible = flowerK > .02; f.scale.setScalar(Math.max(.001, flowerK)); });
    p.fruits.forEach((f, i) => {
      const k = smooth((g - .68) / .2), ripe = clamp((g - .84) / .16);
      f.group.visible = !f.picked && k > .02; if (f.stalk) f.stalk.visible = !f.picked && g > .6;
      f.mesh.scale.setScalar(Math.max(.001, f.size * (.35 + .65 * k)));
      const mat = f.mesh.material;
      if (p.kind === 'tomato') mat.color.set(ripe < .5 ? '#6f9a3a' : '#ff6a3c').lerp(new THREE.Color(ripe < .5 ? '#e0a83a' : '#ff2e4a'), ripe < .5 ? ripe * 2 : ripe * 2 - 1);
      else mat.color.set('#e3ebc2').lerp(new THREE.Color('#ff1e50'), ripe);
      mat.emissive.copy(mat.color).multiplyScalar(ripe >= 1 ? .3 + .18 * Math.sin(t * 2.6 + i * 1.7 + p.phase) : ripe * .08);
    });
    if (p.kind === 'sunflower') {
      const bud = smooth((g - .42) / .15), open = smooth((g - .7) / .25) * (.45 + .55 * dayK) * dieK;
      p.head.visible = g > .42; p.bud.visible = g < .78; p.bud.scale.setScalar(Math.max(.001, bud * (1 - open)));
      p.face.visible = g > .66; p.face.scale.setScalar(Math.max(.001, smooth((g - .66) / .12)));
      if (Math.abs(open - p.open) > .002) { p.open = open; const a = new THREE.Matrix4(), b = new THREE.Matrix4(), c = new THREE.Matrix4(); p.petalInfo.forEach((pe, i) => { a.makeRotationZ(pe.a - Math.PI / 2).setPosition(0, 0, pe.z); b.makeRotationX(lerp(-1.35, pe.tilt, open)); c.makeScale(1, Math.max(.001, .4 + .6 * open), 1).setPosition(0, .105, 0); p.petals.setMatrixAt(i, a.multiply(b).multiply(c)); }); p.petals.instanceMatrix.needsUpdate = true; }
    }
  }
  const ripeFruits = () => { const out = []; plants.forEach(p => { if (p.dying) return; if (p.g >= 1) { if (p.kind === 'sunflower') out.push({ plant: p, obj: p.face, head: true }); else p.fruits.forEach(f => { if (!f.picked) out.push({ plant: p, obj: f.mesh, fruit: f }); }); } }); return out; };

  // ---------- Bloom: a small mip-chain glow, tone mapped at the end ----------
  const post = (() => {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), sc = new THREE.Scene(), tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    const quad = new THREE.Mesh(tri); quad.frustumCulled = false; sc.add(quad);
    const vs = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    const pass = (fs, uniforms, toneMapped = false) => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, toneMapped });
    const opt = { type: THREE.HalfFloatType, depthBuffer: false };
    const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: low ? 0 : 4 }), brightRT = new THREE.WebGLRenderTarget(1, 1, opt);
    const L = 5, mips = [...Array(L)].map(() => new THREE.WebGLRenderTarget(1, 1, opt)), tmps = [...Array(L)].map(() => new THREE.WebGLRenderTarget(1, 1, opt));
    const bright = pass('uniform sampler2D tex;uniform float uT;varying vec2 vUv;void main(){vec3 c=texture2D(tex,vUv).rgb;float l=max(max(c.r,c.g),c.b);gl_FragColor=vec4(c*smoothstep(uT,uT+.8,l),1.);}', { tex: { value: null }, uT: { value: .7 } });
    const blur = pass('uniform sampler2D tex;uniform vec2 dir;varying vec2 vUv;void main(){vec3 c=texture2D(tex,vUv).rgb*.227027;c+=(texture2D(tex,vUv+dir*1.384615).rgb+texture2D(tex,vUv-dir*1.384615).rgb)*.316216;c+=(texture2D(tex,vUv+dir*3.230769).rgb+texture2D(tex,vUv-dir*3.230769).rgb)*.07027;gl_FragColor=vec4(c,1.);}', { tex: { value: null }, dir: { value: new THREE.Vector2() } });
    const compU = { tScene: { value: sceneRT.texture }, uStrength: { value: .9 }, uVig: { value: new THREE.Color(.7, .6, .9) }, uTime: skyU.uTime };
    mips.forEach((m, i) => { compU['b' + i] = { value: m.texture }; });
    const comp = pass(`uniform sampler2D tScene,b0,b1,b2,b3,b4;uniform float uStrength,uTime;uniform vec3 uVig;varying vec2 vUv;
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){vec3 c=texture2D(tScene,vUv).rgb;
        vec3 b=texture2D(b0,vUv).rgb*.8+texture2D(b1,vUv).rgb*.9+texture2D(b2,vUv).rgb*.9+texture2D(b3,vUv).rgb*.8+texture2D(b4,vUv).rgb*.7;
        c+=b*uStrength;
        vec2 q=vUv-.5;float v=smoothstep(.95,.25,length(q*vec2(1.,1.2)));c=mix(c*uVig,c,v);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb+=(h(vUv*977.+fract(uTime))-.5)/160.;}`, compU, true);
    const draw = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(sc, cam); };
    const size = new THREE.Vector2();
    return {
      resize() { renderer.getDrawingBufferSize(size); const w = Math.max(1, size.x), h = Math.max(1, size.y); sceneRT.setSize(w, h); brightRT.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
        mips.forEach((m, i) => { const d = 2 ** (i + 1); m.setSize(Math.max(1, Math.ceil(w / d)), Math.max(1, Math.ceil(h / d))); tmps[i].setSize(m.width, m.height); }); },
      render() {
        renderer.setRenderTarget(sceneRT); renderer.render(scene, camera);
        bright.uniforms.tex.value = sceneRT.texture; draw(bright, brightRT);
        for (let i = 0; i < L; i++) { const m = mips[i], t = tmps[i];
          blur.uniforms.tex.value = i ? mips[i - 1].texture : brightRT.texture; blur.uniforms.dir.value.set(1 / m.width, 0); draw(blur, t);
          blur.uniforms.tex.value = t.texture; blur.uniforms.dir.value.set(0, 1 / m.height); draw(blur, m); }
        draw(comp, null);
      },
      compU
    };
  })();

  // ---------- Camera framing: fit the bed to the width, sit it just above the dock, leave sky ----------
  const camBase = new THREE.Vector3(), camTarget = new THREE.Vector3(0, .36, -.2), look = { x: 0, y: 0, tx: 0, ty: 0 };
  function frame() {
    const rect = canvasEl.getBoundingClientRect(); W = rect.width; H = rect.height; if (!W || !H) return false;
    renderer.setSize(W, H, false); post.resize(); const aspect = W / H;
    camera.fov = aspect < .75 ? 60 : aspect < 1.15 ? 52 : 44; camera.aspect = aspect; camera.clearViewOffset(); camera.updateProjectionMatrix();
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * aspect), fitW = aspect < .75 ? 2.4 : aspect < 1.15 ? 3.8 : 4.3;
    const dist = Math.max(2.6, fitW / 2 / Math.tan(hfov / 2)), pitch = THREE.MathUtils.degToRad(aspect < .75 ? 26 : aspect < 1.15 ? 18 : 13);
    camera.position.set(0, camTarget.y + Math.sin(pitch) * dist, Math.cos(pitch) * dist); camera.lookAt(camTarget); camera.updateMatrixWorld(); camBase.copy(camera.position);
    const d = dock.getBoundingClientRect(), wantY = (d.height ? d.top - rect.top : H - 90) - 14, front = new THREE.Vector3(0, 0, BED.d / 2 + .02).project(camera), y = (1 - front.y) / 2 * H;
    camera.setViewOffset(W, H, 0, y - wantY, W, H); camera.updateProjectionMatrix();
    pScale.value = H * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    const pr = (x, y2, z) => { const v = new THREE.Vector3(x, y2, z).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
    const [lx] = pr(-BED.w / 2, BED.top, 0), [rx] = pr(BED.w / 2, BED.top, 0), [, by] = pr(0, BED.top, -BED.d / 2), [, fy] = pr(0, BED.top, BED.d / 2);
    screenBed = { back: by, front: fy, x0: lx, x1: rx }; soilBox.style.cssText = `left:${lx}px;top:${by}px;width:${rx - lx}px;height:${fy - by}px`;
    const s = story.getBoundingClientRect(); storyBottom = s.bottom - rect.top;
    moonDir.copy(rayAt(W * (aspect < .75 ? .22 : .26), Math.max(storyBottom + 40, H * .12)).ray.direction);
    return true;
  }
  const toScreen = v => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
  function applySun() {
    const e = THREE.MathUtils.degToRad(sun.elev); sun.dir.set(Math.sin(sun.azim) * Math.cos(e), Math.sin(e), -Math.cos(sun.azim) * Math.cos(e));
    dayK = smooth((sun.elev + 4) / 14); nightK = 1 - dayK; const wet = rainK, P = palette(sun.hour);
    const grey = new THREE.Color('#8c86a8');
    ['top', 'mid', 'low', 'cloud'].forEach(k => P[k].lerp(grey.clone().multiplyScalar(k === 'top' ? .6 : 1), wet * .55));
    skyU.uTop.value.copy(P.top); skyU.uMid.value.copy(P.mid); skyU.uLow.value.copy(P.low); skyU.uCloud.value.copy(P.cloud); skyU.uSunCol.value.copy(P.sun);
    skyU.uSun.value.copy(sun.dir); skyU.uDay.value = dayK; skyU.uRain.value = wet; skyU.uAurora.value = clamp(nightK * 1.1 + (1 - smooth((sun.elev - 2) / 10)) * .25) * (1 - wet);
    sunLight.position.copy(sun.dir).multiplyScalar(18); sunLight.target.position.set(0, .3, 0);
    sunLight.color.copy(P.sun); sunLight.intensity = 2.6 * dayK * (1 - wet * .6);
    hemi.color.copy(P.mid).lerp(new THREE.Color('#ffffff'), .25); hemi.groundColor.set('#1a1430').lerp(new THREE.Color('#5a4a6a'), dayK); hemi.intensity = lerp(.7, .75, dayK) * (1 - wet * .2);
    moonLight.intensity = nightK * 1.1;
    scene.fog.color.copy(P.low).lerp(P.mid, .35); scene.fog.density = lerp(lerp(.03, .02, dayK), .05, wet); strandU.uFog.value = scene.fog.density;
    hillMat.color.copy(P.mid).lerp(new THREE.Color('#5f8a8a'), .35);
    mistU.forEach(u => { u.uCol.value.copy(P.low).lerp(new THREE.Color('#ffffff'), .45 * dayK); u.uOp.value = u.uBase.value * (.55 + wet * .6 + nightK * .6); });
    shaftU.uCol.value.copy(P.sun); shaftU.uOp.value = .16 * dayK * (1 - wet);
    renderer.toneMappingExposure = lerp(1.25, .78, dayK) * (1 - wet * .1);
    post.compU.uVig.value.setRGB(lerp(.45, .82, dayK), lerp(.4, .72, dayK), lerp(.75, .92, dayK));
    post.compU.uStrength.value = lerp(1.15, .75, dayK);
    rimU.value.setRGB(lerp(.1, .05, dayK), lerp(.28, .09, dayK), lerp(.26, .1, dayK));
    tipGlow.value.setRGB(lerp(.18, .02, dayK), lerp(.5, .06, dayK), lerp(.55, .06, dayK));
    soilGlow.value = lerp(1.6, .35, dayK); portalU.uNight.value = nightK;
    strandU.uGlow.value = lerp(1.2, .35, dayK);
    flowerHeads.material.color.setScalar(lerp(3.2, 1.25, dayK));
    lanternMat.emissiveIntensity = lerp(2.6, .5, dayK); lanternGlowMat.opacity = lerp(.9, .15, dayK);
    blossomMat.emissiveIntensity = lerp(.35, .08, dayK); crystalMat.emissiveIntensity = crystalPinkMat.emissiveIntensity = lerp(2.4, 1, dayK);
    if (!envSun || envSun.angleTo(sun.dir) > .05 || Math.abs((envSun.rain || 0) - wet) > .15 || Math.abs((envSun.hour || 0) - sun.hour) > .4) envDue = true;
    needsRender = true;
  }
  let envDue = true, envClock = 0;
  function updateEnv() {
    if (envRT) envRT.dispose(); envRT = pmrem.fromScene(envScene, .04); scene.environment = envRT.texture; scene.environmentIntensity = lerp(.45, .6, dayK);
    envSun = sun.dir.clone(); envSun.rain = rainK; envSun.hour = sun.hour; envDue = false;
  }

  // ---------- Input ----------
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function rayAt(x, y) { ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1); raycaster.setFromCamera(ndc, camera); return raycaster; }
  const bedPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BED.top), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function soilPoint(x, y, clampIn) {
    const p = new THREE.Vector3(); if (!rayAt(x, y).ray.intersectPlane(bedPlane, p)) { if (!clampIn) return null; p.set(0, BED.top, -BED.d / 2 + .1); }
    const inside = Math.abs(p.x) < BED.w / 2 - .06 && Math.abs(p.z) < BED.d / 2 - .06;
    if (!inside && !clampIn) return null; p.x = clamp(p.x, -BED.w / 2 + .08, BED.w / 2 - .08); p.z = clamp(p.z, -BED.d / 2 + .08, BED.d / 2 - .08); return p;
  }
  const local = e => { const r = canvasEl.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function nearRipe(x, y, within = 30) { let best = null, bd = within; ripeFruits().forEach(f => { const [sx, sy] = toScreen(f.obj.getWorldPosition(new THREE.Vector3())), d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = f; } }); return best; }
  let drag = null, pointer = null;
  canvasEl.addEventListener('pointerdown', e => {
    if (e.button > 0) return; const [x, y] = local(e); pointer = { x, y };
    drag = { id: e.pointerId, sx: x, sy: y, x, y, moved: false }; if (e.pointerType !== 'touch') canvasEl.setPointerCapture(e.pointerId);
    wake();
  });
  canvasEl.addEventListener('pointermove', e => {
    const [x, y] = local(e); pointer = { x, y };
    if (drag && drag.id === e.pointerId) {
      drag.x = x; drag.y = y; if (!drag.moved && Math.hypot(x - drag.sx, y - drag.sy) > 9) { drag.moved = true; watered = true; }
      if (drag.moved && calm()) { const p = soilPoint(x, y, true); paintWet(p.x, p.z, .15, .3); plants.forEach(pl => { if (!pl.dying && Math.hypot(pl.x - p.x, pl.z - p.z) < .24) pl.pending = Math.min(.6, pl.pending + .05); }); growAll(0, true); }
      wake(); return;
    }
    canvasEl.style.cursor = nearRipe(x, y) || soilPoint(x, y) || magicAt(x, y) ? 'pointer' : 'default';
    wake();
  });
  function release(e) { if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null; canvasEl.style.cursor = ''; if (e.pointerType === 'touch') pointer = null; if (!d.moved && e.type !== 'pointercancel') tap(d.x, d.y); wake(); }
  canvasEl.addEventListener('pointerup', release); canvasEl.addEventListener('pointercancel', release); canvasEl.addEventListener('pointerleave', () => { pointer = null; });
  // Mushrooms and the moon gate answer a touch.
  function magicAt(x, y) {
    const hit = rayAt(x, y).intersectObjects([...mushrooms.map(m => m.g), portal, ring], true)[0]; if (!hit) return null;
    if (hit.object === portal || hit.object === ring) return { gate: true, point: hit.point };
    return { mushroom: mushrooms.find(m => { let o = hit.object; while (o) { if (o === m.g) return true; o = o.parent; } return false; }), point: hit.point };
  }
  function tap(x, y) {
    const f = nearRipe(x, y); if (f) { pick(f); return; }
    const hit = rayAt(x, y).intersectObjects(plants.map(p => p.root), true)[0];
    if (hit && hit.object.userData.plant && !hit.object.userData.plant.dying) { drink(hit.object.userData.plant); return; }
    const p = soilPoint(x, y); if (p) { plantAt(p.x, p.z); return; }
    const m = magicAt(x, y);
    if (m && m.mushroom) { const mu = m.mushroom; mu.bounce = 1; const top = mu.g.localToWorld(new THREE.Vector3(0, mu.h, 0)); burst(top, mu.capCol, 36, .35, 1.6); hint(['Spores of light.', 'It hums a little.', 'Boing.'][Math.floor(Math.random() * 3)]); wake(); return; }
    if (m && m.gate) { portalU.uSpin.value = 1; burst(m.point, new THREE.Color(.5, 1, 1.2), 40, .6, 2); hint('Something on the other side listens.'); wake(); return; }
    // Anywhere else: a wish. A shooting star crosses the sky and a few sparks fall from your hand.
    const ray = rayAt(x, y).ray; shoot(ray.direction.clone()); burst(ray.origin.clone().addScaledVector(ray.direction, 2.2), new THREE.Color(1, .85, 1.1), 22, .25, 1.4); hint('Make a wish.'); wake();
  }
  let seed = 'tomato', planted = false, watered = false, flash = null, lastHint = '';
  function plantAt(x, z) {
    const near = plants.find(p => !p.dying && Math.hypot(p.x - x, p.z - z) < Math.max(KINDS[p.kind].spacing, KINDS[seed].spacing) * .8);
    if (near) { drink(near); return near; }
    if (plants.length >= 12) { hint('The bed is full. Pick something first.'); return null; }
    const p = addPlant(seed, x, z); planted = true; paintWet(x, z, .12, .3); burst(new THREE.Vector3(x, BED.top + .02, z), new THREE.Color(1, .8, 1.2), 18, .2, 1); drops3.seed(x, z); wake(); return p;
  }
  function drink(p, amount = .17) { p.pending = Math.min(.6, p.pending + amount); watered = true; pourAt = { x: p.x, z: p.z, until: clock + 1.1 }; if (calm()) { growAll(0, true); paintWet(p.x, p.z, .25, .6); } wake(); }
  function pick(f) {
    const p = f.plant, world = f.obj.getWorldPosition(new THREE.Vector3());
    if (f.head) { p.dying = .001; }
    else { f.fruit.picked = true; if (p.fruits.every(x => x.picked)) setTimeout(() => { p.g = KINDS[p.kind].regrow; p.wasRipe = false; p.fruits.forEach(x => x.picked = false); applyGrowth(p, clock); needsRender = true; }, 900); }
    burst(world, f.head ? new THREE.Color(1.3, 1, .4) : new THREE.Color(1.3, .5, .7), 26, .3, 1.2);
    fly(f.obj, world, () => { harvest++; total.textContent = harvest; try { localStorage.setItem(STORE, String(harvest)); } catch { /* Session only. */ } basket.classList.remove('bump'); void basket.offsetWidth; basket.classList.add('bump'); });
    flash = { text: ['Moon-sweet.', 'A small piece of a dream.', 'Into the basket.', 'It hums in your hand.'][harvest % 4], until: clock + 2.4 };
    if (calm() && f.head) { scene.remove(p.root); plants.splice(plants.indexOf(p), 1); }
    applyGrowth(p, clock); wake();
  }
  // The picked fruit (a copy) lifts off and floats toward the basket, trailing sparks.
  const flights = [];
  function fly(obj, from, done) {
    if (calm()) { done(); return; }
    const copy = obj.clone(true); copy.traverse(o => { if (o.material) o.material = o.material.clone(); });
    const s = obj.getWorldScale(new THREE.Vector3()); copy.scale.copy(s); copy.position.copy(from); scene.add(copy);
    const b = basket.querySelector('.basket-icon').getBoundingClientRect(), r = canvasEl.getBoundingClientRect(), ray = rayAt(b.left + b.width / 2 - r.left, b.top + b.height / 2 - r.top).ray;
    const to = ray.origin.clone().addScaledVector(ray.direction, 1.2);
    flights.push({ obj: copy, from: from.clone(), to, t: 0, s: s.clone(), done });
  }
  function hint(text) { flash = { text, until: clock + 2.6 }; }
  function currentHint() {
    if (flash && clock < flash.until) return flash.text;
    if (rainK > .3) return 'Starlight rain. Everything drinks.';
    if (dayK < .3) return 'Night. The garden glows and the lanterns rise.';
    if (ripeFruits().length) return 'Tap the glowing fruit to pick it.';
    if (!planted) return 'Tap the soil to plant a seed.';
    if (!watered) return 'Drag across the bed to rain stardust.';
    return 'Touch a mushroom, the moon gate or the sky. Slide the hour.';
  }

  // Keyboard: a marker moves along the bed; Enter plants, waters or picks there.
  const marker = new THREE.Mesh(new THREE.RingGeometry(.07, .085, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.6, 1.8), transparent: true, opacity: .9, depthWrite: false }));
  marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker); let cursorX = 0;
  canvasEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); cursorX = clamp(cursorX + (e.key === 'ArrowLeft' ? -.15 : .15), -BED.w / 2 + .15, BED.w / 2 - .15); marker.visible = true; wake(); return; }
    if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); marker.visible = true;
    const near = plants.filter(p => !p.dying).sort((a, b) => Math.abs(a.x - cursorX) - Math.abs(b.x - cursorX))[0];
    if (near && Math.abs(near.x - cursorX) < .28) { const f = ripeFruits().find(f => f.plant === near); if (f) pick(f); else drink(near); } else plantAt(cursorX, .05);
    needsRender = true; renderOnce();
  });
  canvasEl.addEventListener('blur', () => { marker.visible = false; needsRender = true; });

  // Dock.
  document.querySelectorAll('.seed-packet').forEach(b => b.addEventListener('click', () => { seed = b.dataset.seed; document.querySelectorAll('.seed-packet').forEach(x => x.setAttribute('aria-pressed', String(x === b))); hint(`${b.getAttribute('aria-label')}. Tap the soil.`); wake(); }));
  let rain = null;
  rainBtn.addEventListener('click', () => {
    if (rain) return; watered = true;
    if (calm()) { plants.forEach(p => p.pending = Math.min(.6, p.pending + .35)); wetX.fillStyle = 'rgba(0,0,0,.8)'; wetX.fillRect(0, 0, wetC.width, wetC.height); wetDirty = true; growAll(0, true); hint('A good soaking.'); renderOnce(); return; }
    rain = { t: 0, dur: 5 }; rainBtn.disabled = true; wake();
  });
  const timeWrap = document.createElement('label'); timeWrap.className = 'garden-time';
  timeWrap.innerHTML = '<span class="time-icon" aria-hidden="true">☀️</span><input id="garden-time" type="range" min="5" max="22" step="0.05" value="17.5" aria-label="Time of day"><small id="garden-clock" aria-hidden="true">17:30</small>';
  nightBtn.hidden = true; nightBtn.after(timeWrap);
  const timeInput = timeWrap.querySelector('input'), clockEl = timeWrap.querySelector('small'), timeIcon = timeWrap.querySelector('.time-icon');
  function setTime(t) {
    sun.hour = t; const up = t >= 6 && t <= 20;
    sun.elev = up ? 50 * Math.sin(Math.PI * (t - 6) / 14) : t < 6 ? lerp(-12, 0, t - 5) : lerp(0, -12, (t - 20) / 2);
    // The sun rises on the left, sits behind the garden at midday (backlit leaves) and sets on the right.
    sun.azim = lerp(-1.9, 1.3, (clamp(t, 5, 22) - 6) / 14); applySun();
    const hh = Math.floor(t), mm = Math.round((t - hh) * 60 / 5) * 5; clockEl.textContent = `${String(hh + (mm === 60 ? 1 : 0)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
    timeInput.setAttribute('aria-valuetext', clockEl.textContent); timeIcon.textContent = sun.elev > 0 ? (sun.elev < 12 ? '🌇' : '☀️') : '🌙';
    if (calm()) renderOnce(); else wake();
  }
  timeInput.addEventListener('input', () => setTime(Number(timeInput.value)));

  // ---------- Particles: stardust water, splashes, seeds, spores and sparks ----------
  const MAXD = 1400, sparks = pointCloud(MAXD), drops = [];
  const KIND = { water: { c: [.55, .9, 1.5], s: .016, g: 5 }, splash: { c: [.7, .95, 1.4], s: .01, g: 5 }, seed: { c: [1.5, 1.2, .5], s: .03, g: 5 }, glow: { s: .03, g: -.12 } };
  const drops3 = { seed(x, z) { if (calm()) return; drops.push({ p: new THREE.Vector3(x, BED.top + .3, z), v: new THREE.Vector3(), life: 0, kind: 'seed' }); } };
  function burst(at, colour, n, spread = .3, up = 1, size = .03, max = 1.4) {
    if (calm()) return;
    for (let i = 0; i < n && drops.length < MAXD; i++) { const a = Math.random() * 6.3, s = Math.random() * spread;
      drops.push({ p: at.clone(), v: new THREE.Vector3(Math.cos(a) * s, (.3 + Math.random() * .7) * up * .6, Math.sin(a) * s), life: 0, max: max * (.6 + Math.random() * .6), kind: 'glow', c: [colour.r, colour.g, colour.b], s: size * (.5 + Math.random()) }); }
  }
  const rainGeo = new THREE.BufferGeometry(), RAIN = low ? 700 : 1800, rainPos = new Float32Array(RAIN * 6); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainLines = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(1.1, 1, 1.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); rainLines.frustumCulled = false; scene.add(rainLines);
  const rainDrops = Array.from({ length: RAIN }, () => ({ x: (Math.random() - .5) * 9, y: Math.random() * 5, z: lerp(-3, 2.6, Math.random()), s: 5 + Math.random() * 3 }));
  // Motes: drifting pollen by day, fireflies by night; they swirl around your hand.
  const MOTES = low ? 160 : small ? 320 : 520, motes = pointCloud(MOTES), moteCols = [[1, .82, .5], [.55, 1, .85], [.8, .65, 1], [1, .65, .9]];
  const mote = Array.from({ length: MOTES }, (_, i) => ({ p: new THREE.Vector3((Math.random() - .5) * 10, Math.random() * 3.2, lerp(-6, 2.4, Math.random())), v: new THREE.Vector3(), ph: Math.random() * 6.3, c: moteCols[i % 4], s: .012 + Math.random() * .022 }));
  // Blossom petals falling through the scene.
  const PETALS = low ? 90 : small ? 200 : 320, petalMat = new THREE.MeshStandardMaterial({ map: petalTexture('blossom'), emissiveMap: petalTexture('blossom'), emissive: '#ffffff', emissiveIntensity: .25, side: THREE.DoubleSide, alphaTest: .4, roughness: .7 });
  const petalMesh = new THREE.InstancedMesh(leafGeometry(.032, .022, .35, .12), petalMat, PETALS); petalMesh.frustumCulled = false; scene.add(petalMesh);
  const petal = Array.from({ length: PETALS }, () => ({ p: new THREE.Vector3((Math.random() - .5) * 11, Math.random() * 4.5, lerp(-7, 2.5, Math.random())), e: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6), spin: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(3), ph: Math.random() * 6.3, fall: .1 + Math.random() * .12 }));
  petal.forEach((pt, i) => petalMesh.setColorAt(i, new THREE.Color().setHSL(.88 + Math.random() * .08, .6, .8 + Math.random() * .15)));

  // The wisp: a small light that follows your hand; drag it over the bed and it rains stardust.
  const wisp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.4, 1.7, 2), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); wisp.scale.setScalar(.2); scene.add(wisp);
  const wispCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(3, 3, 3.2), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); wispCore.scale.setScalar(.06); scene.add(wispCore);
  const handLight = new THREE.PointLight('#cfe0ff', 0, 1.6, 2); scene.add(handLight);
  const wispPos = new THREE.Vector3(0, 1, 0), wispWant = new THREE.Vector3(0, 1, 0);
  let pourAt = null, pourK = 0, handK = 0;
  // Pollinator sprites that visit open flowers, and morpho butterflies.
  const wispMat = new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.2, 1.9, 1.5), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  const bees = [0, 1, 2].map(() => { const s = new THREE.Sprite(wispMat); s.scale.setScalar(.05); s.visible = false; scene.add(s); return { g: s, target: null, hold: 0, pos: new THREE.Vector3(-3, 1, -1) }; });
  const bfMat = new THREE.MeshStandardMaterial({ map: wingTexture(), emissiveMap: wingTexture(), emissive: '#8fa8ff', emissiveIntensity: .9, transparent: true, alphaTest: .3, side: THREE.DoubleSide, roughness: .4 });
  const butterflies = [0, 1, 2].map(i => { const g = new THREE.Group(), wings = [-1, 1].map(s => { const piv = new THREE.Group(), w = new THREE.Mesh(new THREE.PlaneGeometry(.06, .06), bfMat); w.position.x = s * .03; w.scale.x = s; piv.add(w); g.add(piv); return piv; }); scene.add(g); return { g, wings, ph: i * 2.2, pos: new THREE.Vector3(i - 1, 1, -1) }; });
  // Shooting stars for wishes.
  const trailMat = i => new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.5, 2.3, 2.8), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false });
  const trail = [...Array(18)].map((_, i) => { const s = new THREE.Sprite(trailMat(i)); s.visible = false; scene.add(s); return s; });
  let shooting = null;
  function shoot(dir) {
    if (calm()) return; const start = camera.position.clone().addScaledVector(dir.clone().setY(Math.max(dir.y, .05)).normalize(), 70);
    const side = new THREE.Vector3().crossVectors(dir, UP).normalize().multiplyScalar(Math.random() < .5 ? -1 : 1);
    shooting = { p: start, v: side.multiplyScalar(40).add(new THREE.Vector3(0, -10, 0)), t: 0, hist: [] };
  }

  // ---------- Simulation ----------
  const onScreenNow = () => { const b = canvasEl.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight && b.width > 0; };
  function growAll(dt, instant) {
    const light = .8 + .2 * dayK;
    plants.forEach(p => {
      if (p.dying) { p.dying += dt * 1.6; if (p.dying >= 1) { scene.remove(p.root); } return; }
      if (p.pending > 0) { const step = instant ? p.pending : Math.min(p.pending, dt * .3 * light * KINDS[p.kind].speed); p.g = Math.min(1, p.g + step); p.pending = p.g >= 1 ? 0 : p.pending - step; }
    });
    for (let i = plants.length - 1; i >= 0; i--) if (plants[i].dying >= 1) plants.splice(i, 1);
  }
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), rayO = new THREE.Vector3(), rayD = new THREE.Vector3();
  // Push a particle around the line of your pointer: a gentle vortex.
  function swirl(p, dt, reach, force) {
    tmp.subVectors(p, rayO); const t = tmp.dot(rayD); if (t < 0) return; tmp2.copy(rayO).addScaledVector(rayD, t); tmp.subVectors(p, tmp2); const d = tmp.length(); if (d > reach || d < 1e-4) return;
    const k = (1 - d / reach) * handK * force * dt; tmp2.crossVectors(rayD, tmp).normalize(); p.addScaledVector(tmp2, k * 1.6).addScaledVector(tmp.normalize(), k * .5);
  }
  function step(dt) {
    clock += dt; skyU.uTime.value = clock;
    if (sun.target != null) { sun.elev += (sun.target - sun.elev) * Math.min(1, dt * 1.4); if (Math.abs(sun.target - sun.elev) < .05) { sun.elev = sun.target; sun.target = null; } applySun(); }
    if (rain) { rain.t += dt; const k = Math.min(1, rain.t / .8, (rain.dur - rain.t) / 1.2); rainK = clamp(k); applySun(); if (rain.t >= rain.dur) { rain = null; rainK = 0; applySun(); rainBtn.disabled = false; hint('A good soaking.'); } }
    const wind = Math.sin(clock * .7) * .6 + Math.sin(clock * 1.9 + 1) * .3 + rainK * 1.2; windU.value = clock; windK.value = .8 + rainK * 1.5;
    // Where your hand is in the world.
    handK += ((pointer ? 1 : 0) - handK) * Math.min(1, dt * 4);
    if (pointer) { const ray = rayAt(pointer.x, pointer.y).ray; rayO.copy(ray.origin); rayD.copy(ray.direction);
      const hit = new THREE.Vector3(); let over = soilPoint(pointer.x, pointer.y);
      if (over) wispWant.copy(over).add(tmp.set(0, .32, 0));
      else if (ray.intersectPlane(groundPlane, hit) && hit.distanceTo(camera.position) < 9) wispWant.copy(hit).add(tmp.set(0, .3, 0));
      else wispWant.copy(ray.origin).addScaledVector(ray.direction, 3.5);
      pointerU.value.copy(hit.lengthSq() ? hit : wispWant); look.tx = pointer.x / W * 2 - 1; look.ty = pointer.y / H * 2 - 1; }
    else { look.tx = 0; look.ty = 0; }
    pointerK.value = handK;
    // A slow, breathing camera that leans a little toward your hand.
    look.x += (look.tx - look.x) * Math.min(1, dt * 1.5); look.y += (look.ty - look.y) * Math.min(1, dt * 1.5);
    const yaw = look.x * .035 + Math.sin(clock * .11) * .012, lift = -look.y * .04 + Math.sin(clock * .17) * .02;
    camera.position.copy(camBase).sub(camTarget).applyAxisAngle(UP, -yaw).add(camTarget).add(tmp.set(0, lift, 0)); camera.lookAt(camTarget); camera.updateMatrixWorld();
    growAll(dt, false);
    plants.forEach(p => {
      applyGrowth(p, clock);
      p.vel += (-p.sway * 18 - p.vel * 3) * dt; p.sway += p.vel * dt;
      const bend = (wind * .025 + Math.sin(clock * 2.3 + p.phase) * .008) * (p.kind === 'strawberry' ? .3 : 1) + p.sway;
      p.grow.rotation.set(bend * .6, 0, bend);
      p.leaves.forEach(l => { l.obj.rotation.set(Math.sin(clock * 2.1 + l.phase) * .05 * (1 + rainK), 0, Math.sin(clock * 1.7 + l.phase * 1.7) * .045 * (1 + rainK)); });
      if (p.kind === 'sunflower') {
        const hw = p.head.getWorldPosition(tmp), want = new THREE.Vector3(sun.dir.x, dayK > .1 ? clamp(sun.dir.y, -.1, .6) : -.9, sun.dir.z).normalize();
        const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), want.negate(), UP), qq = new THREE.Quaternion().setFromRotationMatrix(m);
        const parentQ = p.head.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); qq.premultiply(parentQ); p.head.quaternion.slerp(qq, Math.min(1, dt * .8));
      }
      // Growing plants give off a spiral of sparks; when fruit first ripens, a ring of light.
      if (!p.dying && p.pending > .005 && Math.random() < dt * 10) { const a = clock * 4 + p.id, r = .08 + Math.random() * .06; drops.push({ p: new THREE.Vector3(p.x + Math.cos(a) * r, BED.top + .02, p.z + Math.sin(a) * r), v: new THREE.Vector3(-Math.sin(a) * .15, .35 + Math.random() * .3, Math.cos(a) * .15), life: 0, max: 1.4, kind: 'glow', c: [.6, 1.3, 1], s: .022 }); }
      const ripe = !p.dying && p.g >= 1; if (ripe && !p.wasRipe) { for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; drops.push({ p: new THREE.Vector3(p.x, BED.top + .05, p.z), v: new THREE.Vector3(Math.cos(a) * .5, .15, Math.sin(a) * .5), life: 0, max: 1, kind: 'glow', c: [1.4, 1.1, .6], s: .024 }); } } p.wasRipe = ripe;
    });
    ripeFruits().forEach(f => { if (Math.random() < dt * 1.2) { const w = f.obj.getWorldPosition(tmp2); drops.push({ p: w.clone().add(tmp.set((Math.random() - .5) * .05, .02, (Math.random() - .5) * .05)), v: new THREE.Vector3(0, .12, 0), life: 0, max: 1.1, kind: 'glow', c: [1.4, 1.2, .7], s: .02 }); } });
    // The wisp: follows your hand; when watering it sits over the soil and rains stardust.
    let pour = null;
    if (drag && drag.moved) pour = soilPoint(drag.x, drag.y, true);
    else if (pourAt && clock < pourAt.until) pour = new THREE.Vector3(pourAt.x, BED.top, pourAt.z);
    else pourAt = null;
    pourK += ((pour ? 1 : 0) - pourK) * Math.min(1, dt * 6);
    if (pour) wispWant.copy(pour).add(tmp.set(0, .45, 0));
    wispPos.lerp(wispWant, Math.min(1, dt * (pour ? 10 : 5)));
    const wk = Math.max(handK, pourK), bob = Math.sin(clock * 3) * .015;
    wisp.position.copy(wispPos).add(tmp.set(0, bob, 0)); wispCore.position.copy(wisp.position);
    wisp.material.opacity = wk * (.75 + .25 * Math.sin(clock * 5)); wispCore.material.opacity = wk; wisp.scale.setScalar(.15 + pourK * .1);
    handLight.position.copy(wisp.position); handLight.intensity = wk * (1.2 + pourK * .8);
    if (Math.random() < dt * 14 * wk) drops.push({ p: wisp.position.clone(), v: new THREE.Vector3((Math.random() - .5) * .2, -.05 - Math.random() * .1, (Math.random() - .5) * .2), life: 0, max: .8, kind: 'glow', c: [.7, .95, 1.4], s: .014 });
    if (pour && pourK > .6) {
      for (let i = 0; i < 7; i++) drops.push({ p: wisp.position.clone().add(new THREE.Vector3((Math.random() - .5) * .09, -.03, (Math.random() - .5) * .09)), v: new THREE.Vector3((Math.random() - .5) * .25, -.3, (Math.random() - .5) * .25), life: 0, kind: 'water' });
      plants.forEach(p => { if (!p.dying && Math.hypot(p.x - pour.x, p.z - pour.z) < .24) p.pending = Math.min(.6, p.pending + dt * .45); });
    }
    // Starlight rain.
    rainLines.material.opacity = rainK * .5; rainLines.visible = rainK > .01;
    if (rainLines.visible) {
      rainDrops.forEach((d, i) => { d.y -= d.s * dt; d.x -= .6 * dt; if (d.y < 0) { d.y = 4 + Math.random(); d.x = (Math.random() - .5) * 9; if (Math.abs(d.x) < BED.w / 2 && Math.abs(d.z) < BED.d / 2 && Math.random() < .05) paintWet(d.x, d.z, .08, .25); }
        rainPos.set([d.x, d.y, d.z, d.x + .02, d.y + .14, d.z], i * 6); });
      rainGeo.attributes.position.needsUpdate = true;
      plants.forEach(p => { if (!p.dying) p.pending = Math.min(.6, p.pending + dt * .09 * rainK); });
    }
    // Particles.
    let n = 0;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], K = KIND[d.kind]; d.life += dt; d.v.y -= K.g * dt;
      if (d.kind === 'glow') { d.v.multiplyScalar(1 - dt * 1.4); d.v.x += Math.sin(clock * 2 + i) * dt * .05; }
      d.p.addScaledVector(d.v, dt);
      const floor = Math.abs(d.p.x) < BED.w / 2 && Math.abs(d.p.z) < BED.d / 2 ? BED.top : 0;
      if ((K.g > 0 && d.p.y <= floor) || (d.max && d.life > d.max)) {
        if (d.kind === 'water' && floor) { paintWet(d.p.x, d.p.z, .09, .12); if (Math.random() < .25) drops.push({ p: d.p.clone(), v: new THREE.Vector3((Math.random() - .5) * .5, .6, (Math.random() - .5) * .5), life: 0, max: .18, kind: 'splash' }); }
        if (d.kind === 'seed') burst(d.p, new THREE.Color(1.2, 1, .6), 10, .25, .6);
        drops.splice(i, 1); continue;
      }
      if (n < MAXD) { const c = d.c || K.c, fade = d.max ? Math.min(1, (1 - d.life / d.max) * 2.5) * Math.min(1, d.life * 8) : 1;
        sparks.pos.set([d.p.x, d.p.y, d.p.z], n * 3); sparks.col.set([c[0] * fade, c[1] * fade, c[2] * fade], n * 3); sparks.size[n] = d.s || K.s; n++; }
    }
    sparks.flush(n);
    if ((dryClock += dt) > .3) { dryClock = 0; wetX.globalCompositeOperation = 'destination-out'; wetX.fillStyle = `rgba(0,0,0,${rainK ? 0 : .01})`; wetX.fillRect(0, 0, wetC.width, wetC.height); wetX.globalCompositeOperation = 'source-over'; wetDirty = true; }
    if (wetDirty) { wetTex.needsUpdate = true; wetDirty = false; }
    // Motes and petals.
    const nightBoost = .5 + nightK * 1.6;
    mote.forEach((m, i) => {
      const p = m.p; p.x += (Math.sin(clock * .3 + m.ph) * .05 + wind * .03) * dt; p.y += (Math.cos(clock * .45 + m.ph * 1.3) * .04 + .025) * dt; p.z += Math.cos(clock * .25 + m.ph) * .05 * dt;
      if (pointer) swirl(p, dt, .7, 1.2);
      if (p.y > 3.4 || Math.abs(p.x) > 6) { p.set((Math.random() - .5) * 10, .05, lerp(-6, 2.4, Math.random())); }
      const tw = Math.max(0, Math.sin(clock * (1.2 + (i % 5) * .3) + m.ph * 3)) * .7 + .3, k = tw * nightBoost, c = nightK > .5 && i % 3 === 0 ? [1.1, 1.2, .45] : m.c;
      motes.pos.set([p.x, p.y, p.z], i * 3); motes.col.set([c[0] * k, c[1] * k, c[2] * k], i * 3); motes.size[i] = m.s * (1 + nightK * .5);
    });
    motes.flush(MOTES);
    const o = tmpO;
    petal.forEach((pt, i) => {
      const p = pt.p; p.y -= pt.fall * dt * (1 + rainK * 2); p.x += (wind * .22 + Math.sin(clock * .8 + pt.ph) * .12) * dt; p.z += Math.cos(clock * .6 + pt.ph) * .08 * dt;
      if (pointer) swirl(p, dt, .6, 1.6);
      if (p.y < 0 || p.x > 6.5) p.set(-5.5 - Math.random() * 1.5 + Math.random() * 12, 3.5 + Math.random() * 1.5, lerp(-7, 2.5, Math.random()));
      pt.e.x += pt.spin.x * dt; pt.e.y += pt.spin.y * dt; pt.e.z += pt.spin.z * dt;
      o.position.copy(p); o.rotation.copy(pt.e); o.scale.setScalar(1); o.updateMatrix(); petalMesh.setMatrixAt(i, o.matrix);
    });
    petalMesh.instanceMatrix.needsUpdate = true;
    // Flights to the basket.
    for (let i = flights.length - 1; i >= 0; i--) { const f = flights[i]; f.t += dt / .9; const k = smooth(f.t); f.obj.position.lerpVectors(f.from, f.to, k).add(tmp.set(0, Math.sin(Math.PI * k) * .35, 0)); f.obj.scale.copy(f.s).multiplyScalar(lerp(1, .35, k)); f.obj.rotation.y += dt * 6;
      if (Math.random() < .8) drops.push({ p: f.obj.position.clone(), v: new THREE.Vector3((Math.random() - .5) * .1, -.05, (Math.random() - .5) * .1), life: 0, max: .7, kind: 'glow', c: [1.4, 1.1, .8], s: .02 });
      if (f.t >= 1) { scene.remove(f.obj); flights.splice(i, 1); f.done(); } }
    // Pollinator sprites visit open flowers.
    const open = []; plants.forEach(p => { if (p.dying) return; if (p.kind === 'sunflower' ? p.g > .8 : p.g > .52 && p.g < .72) p.flowers.forEach(f => f.visible && open.push(f)); });
    bees.forEach((b, i) => {
      const want = rainK < .3 && i < Math.ceil(open.length / 2);
      if (!want) { b.target = null; b.pos.lerp(tmp.set(i % 2 ? 4 : -4, 1.4, -1), dt * .6); }
      else { if (!b.target || !open.includes(b.target) || (b.hold += dt) > 1.6 + i * .3) { b.target = open[Math.floor(Math.random() * open.length)]; b.hold = 0; }
        const tp = b.target.getWorldPosition(tmp).add(tmp2.set(Math.sin(clock * 5 + i) * .02, .025 + Math.cos(clock * 4 + i) * .012, .015)); b.pos.lerp(tp, Math.min(1, dt * 2.2)); }
      b.g.visible = want || Math.abs(b.pos.x) < 3.5; b.g.position.copy(b.pos); b.g.scale.setScalar(.045 + Math.sin(clock * 9 + i) * .01);
    });
    butterflies.forEach((b, i) => {
      b.g.visible = rainK < .4; if (!b.g.visible) return;
      const t = clock * (.22 + i * .04) + b.ph, want = i === 0 && handK > .5 ? tmp.copy(wispPos).add(tmp2.set(Math.sin(clock * 1.3) * .25, .12 + Math.sin(clock * 2) * .05, Math.cos(clock * 1.1) * .2))
        : tmp.set(Math.sin(t) * (1.8 + i * .6), .7 + Math.sin(t * 2.3) * .3 + i * .15, Math.cos(t * 1.4) * .9 - i * .8);
      const prev = tmp2.copy(b.pos); b.pos.lerp(want, Math.min(1, dt * (i === 0 && handK > .5 ? 1.6 : 3))); b.g.position.copy(b.pos);
      const dx = b.pos.x - prev.x, dz = b.pos.z - prev.z; if (Math.abs(dx) + Math.abs(dz) > 1e-5) b.g.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
      const fl = Math.sin(clock * (11 + i * 2)) * 1.1; b.wings[0].rotation.y = fl; b.wings[1].rotation.y = -fl;
    });
    // Mushrooms breathe and bounce; spores drift up at night.
    mushrooms.forEach(m => {
      m.bounce = Math.max(0, m.bounce - dt * 1.4); const bk = m.bounce * Math.sin(m.bounce * 18);
      m.g.scale.set(1 + bk * .12, 1 - bk * .15, 1 + bk * .12);
      m.capMat.emissiveIntensity = (.35 + .3 * Math.sin(clock * 1.1 + m.ph)) * (.7 + nightK * 1.8) + m.bounce * 2.5;
      if (Math.random() < dt * (.2 + nightK * .9)) { const top = m.g.localToWorld(tmp.set((Math.random() - .5) * m.capR, m.h * 1.1, (Math.random() - .5) * m.capR)); drops.push({ p: top.clone(), v: new THREE.Vector3((Math.random() - .5) * .05, .1 + Math.random() * .1, (Math.random() - .5) * .05), life: 0, max: 2.4, kind: 'glow', c: [m.capCol.r * 1.4, m.capCol.g * 1.4, m.capCol.b * 1.4], s: .016 }); }
    });
    // Distance: islands drift, the gate turns its orbiting stones, lanterns rise, light shafts breathe.
    islands.forEach(is => { is.g.position.y = is.y + Math.sin(clock * .3 + is.ph) * .18; is.g.rotation.y = Math.sin(clock * .05 + is.ph) * .3; });
    portalU.uSpin.value = Math.max(0, portalU.uSpin.value - dt * .5);
    rune.material.opacity = .45 + .35 * Math.sin(clock * 1.3) + portalU.uSpin.value * .5; rune.rotation.z = clock * .05;
    placeOrbit(clock, portalU.uSpin.value);
    lanterns.forEach(l => { l.y += l.sp * dt * (.4 + nightK); if (l.y > 5.5) { l.y = -.2; l.x = (Math.random() - .5) * 11; l.z = -2.5 - Math.random() * 8; } l.g.position.set(l.x + Math.sin(clock * .4 + l.ph) * .2, l.y, l.z + Math.cos(clock * .3 + l.ph) * .1); l.g.rotation.y = clock * .3 + l.ph; l.g.visible = l.y > 0; });
    shafts.forEach(s => { s.m.rotation.z = -.42 + Math.sin(clock * .08 + s.ph) * .05; });
    crystals.children.forEach((c, i) => { c.rotation.y += dt * (.2 + (i % 3) * .1); });
    // A wish.
    if (shooting) { const s = shooting; s.t += dt; s.p.addScaledVector(s.v, dt); s.hist.unshift(s.p.clone()); if (s.hist.length > trail.length) s.hist.length = trail.length;
      const fade = Math.min(1, s.t * 6) * (1 - smooth((s.t - .7) / .5));
      trail.forEach((sp, i) => { const h = s.hist[i]; sp.visible = !!h && fade > .01; if (!h) return; sp.position.copy(h); sp.scale.setScalar((2.2 - i * .1) * fade); sp.material.opacity = (1 - i / trail.length) * fade; });
      if (s.t > 1.3) { shooting = null; trail.forEach(sp => sp.visible = false); } }
    updateStars(nightK * (1 - rainK));
    marker.position.set(cursorX, BED.top + .01, .05);
    if (envDue && (clock - envClock > (low ? 1.2 : .35))) { envClock = clock; updateEnv(); }
  }
  let frames = 0;
  function render() {
    frames++; sky.position.copy(camera.position);
    if (bloomOn) post.render(); else { renderer.setRenderTarget(null); renderer.render(scene, camera); }
    const t = currentHint(); if (t !== lastHint) { lastHint = t; status.textContent = t; } needsRender = false;
  }
  function renderOnce() { if (envDue) updateEnv(); plants.forEach(p => applyGrowth(p, clock)); updateStars(nightK * (1 - rainK)); render(); }
  function tick(now) {
    frameReq = 0; const dt = last ? Math.min(.12, (now - last) / 1000) : .016; last = now;
    if (calm()) { renderOnce(); return; }
    step(dt); render(); adapt(dt);
    if (onScreenNow() && !document.hidden) frameReq = requestAnimationFrame(tick);
  }
  // Adaptive quality: if frames are slow, lower the resolution step by step, then the glow, then the grass.
  let slow = 0, pr = renderer.getPixelRatio();
  function adapt(dt) {
    slow = slow * .92 + (dt > .045 ? 1 : 0) * .08;
    if (slow > .6 && pr > .5) { pr = Math.max(.5, pr * .8); renderer.setPixelRatio(pr); frame(); slow = .3; }
    else if (slow > .8 && bloomOn) { bloomOn = false; slow = .3; }
    else if (slow > .8 && blades.visible) { blades.visible = false; slow = .3; }
  }
  function wake() { if (calm()) { renderOnce(); return; } if (!frameReq && onScreenNow() && !document.hidden) { last = 0; frameReq = requestAnimationFrame(tick); } }

  // Start: a few plants already growing, late afternoon going lilac.
  frame();
  addPlant('tomato', -.8, .05, .6); addPlant('sunflower', .1, -.3, .66); addPlant('strawberry', .85, .22, .55);
  setTime(17.5);
  updateEnv(); renderOnce();
  new IntersectionObserver(entries => { if (entries.some(en => en.isIntersecting)) wake(); }, { threshold: .02 }).observe(canvasEl);
  addEventListener('scroll', () => { if (!frameReq) wake(); }, { passive: true });
  addEventListener('resize', () => { if (frame()) { needsRender = true; renderOnce(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  document.addEventListener('click', e => { if (e.target.closest('#gentle-mode')) setTimeout(() => { drops.length = 0; if (calm()) { rain = null; rainK = 0; rainBtn.disabled = false; applySun(); growAll(0, true); camera.position.copy(camBase); camera.lookAt(camTarget); camera.updateMatrixWorld(); } wake(); renderOnce(); }, 0); });

  window.GardenScene = {
    renderer: 'webgl', frames: () => frames, loop: () => ({ frameReq, onScreen: onScreenNow(), calm: calm() }),
    stats: () => { const r = ripeFruits()[0], rp = r ? toScreen(r.obj.getWorldPosition(new THREE.Vector3())) : null; return { plants: plants.filter(p => !p.dying).length, ripe: ripeFruits().length, day: dayK, harvest, grown: plants.reduce((s, p) => s + p.g, 0), ripeAt: rp ? { x: rp[0], y: rp[1] } : null, hour: sun.hour, bed: screenBed, bloom: bloomOn }; },
    plantAt: (x, z) => plantAt(x, z),
    setTime: t => { timeInput.value = t; setTime(t); }
  };
  canvasEl.dataset.renderer = 'webgl';
}

start().catch(err => { console.warn('3D garden unavailable, using the flat garden', err); const c = $('#garden-canvas'); if (c && c.dataset.renderer !== 'webgl') { const fresh = c.cloneNode(true); c.replaceWith(fresh); } window.startGarden2D?.(); });
