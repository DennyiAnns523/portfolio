(() => {
  'use strict';
  // The garden: a raised bed under a sky you can drag the sun across. Tap the soil to plant the
  // chosen seed, drag to water with a can that follows the pointer, tap ripe fruit to pick it.
  // Plants grow when watered (slower at night), sunflowers turn to the sun and bow at dusk, bees
  // and butterflies visit flowers by day, and fireflies come out at night.
  const $ = s => document.querySelector(s);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, ease = t => t * t * (3 - 2 * t);
  const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const p = hex(a), q = hex(b); return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(',')})`; };
  const rand = seed => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const STORE = 'dennyi-tomato-harvest', TAU = Math.PI * 2;
  const KINDS = {
    tomato: { icon: '🍅', label: 'tomato', speed: 1, regrow: .74, fruits: 4, colour: '#dc5a3c' },
    sunflower: { icon: '🌻', label: 'sunflower', speed: .85, fruits: 0 },
    strawberry: { icon: '🍓', label: 'strawberry', speed: 1.1, regrow: .7, fruits: 3, colour: '#e0413f' }
  };

  window.GardenLife = function ({ calm }) {
    const canvas = $('#garden-canvas'), ctx = canvas.getContext('2d'), soilBox = $('.garden-soil'), dock = $('.garden-dock');
    const status = $('#garden-status'), total = $('#harvest-total'), basket = $('.garden-basket'), rainBtn = $('#garden-rain'), nightBtn = $('#garden-night');
    const story = $('#tomato-garden .story');
    let W = 0, H = 0, dpr = 1, L = null, seed = 'tomato', harvest = 0, onScreen = false, frame = 0, last = 0, time = 0, nextId = 1;
    let plants = [], drag = null, pour = null, rain = null, cursor = { u: .5, show: false }, pointer = null;
    let planted = false, watered = false, lastHint = '', flashHint = null;
    const sun = { x: .8, y: .3, target: null }, moisture = new Float32Array(48);
    const bees = [], butterflies = [], fireflies = [], particles = [], drops = [];
    let hits = [], flowers = [];
    try { const n = Number(localStorage.getItem(STORE)); if (Number.isSafeInteger(n) && n >= 0) harvest = n; } catch { /* Session-only mode. */ }
    total.textContent = harvest;

    // ---- Layout: the bed sits just above the tool dock; plants are sized to the space above it.
    function layout() {
      const r = canvas.getBoundingClientRect(); W = r.width; H = r.height; if (!W || !H) return false;
      dpr = Math.min(devicePixelRatio || 1, W * H > 1.6e6 ? 1.25 : 1.75);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const s = story.getBoundingClientRect(), d = dock.getBoundingClientRect();
      const storyBottom = s.bottom - r.top, dockTop = d.height ? d.top - r.top : H - 90;
      const plank = clamp(H * .032, 10, 24), front = Math.min(H * .9, dockTop - 14 - plank), depth = clamp(H * .2, 64, 180), back = front - depth;
      const U = Math.max(20, Math.min(clamp(Math.min(W * .085, H * .1), 30, 84), (back + depth * .4 - storyBottom - 10) / 3.5));
      L = { front, back, depth, U, x0: W * .03, x1: W * .97, bx0: W * .09, bx1: W * .91, skyTop: Math.max(24, storyBottom * .45), horizon: back - 2, plank, storyBottom };
      soilBox.style.cssText = `left:${L.x0}px;top:${back}px;width:${L.x1 - L.x0}px;height:${depth}px`;
      return true;
    }
    const bedPoint = (u, v) => { const y = L.back + v * L.depth, a = lerp(L.bx0, L.x0, v), b = lerp(L.bx1, L.x1, v); return [lerp(a, b, u), y]; };
    const bedUV = (x, y) => { const v = (y - L.back) / L.depth, a = lerp(L.bx0, L.x0, v), b = lerp(L.bx1, L.x1, v); return [(x - a) / (b - a), v]; };
    const cloudY = () => Math.min(L.horizon - L.U * 3, Math.max(L.skyTop + L.U * .3, L.storyBottom + W * .06));
    const sunXY = () => [lerp(W * .06, W * .94, sun.x), lerp(L.skyTop, L.horizon, sun.y)];
    const day = () => clamp((1 - sun.y) / .3);
    const sunR = () => clamp(W * .026, 18, 40);

    // ---- Plants
    function makePlant(kind, u, v, g = .02) {
      const k = KINDS[kind], p = { id: nextId++, kind, u, v, g, pending: g < .1 ? .1 : 0, sway: 0, vel: 0, fruits: [], dying: 0, born: time };
      for (let i = 0; i < k.fruits; i++) p.fruits.push({ i, picked: false });
      plants.push(p); plants.sort((a, b) => a.v - b.v); return p;
    }
    const scaleOf = p => .72 + .33 * p.v;
    function plantAt(u, v) {
      u = clamp(u, .03, .97); v = clamp(v, .08, .95);
      const [x, y] = bedPoint(u, v), near = nearest(x, y, L.U * 1.15);
      if (near) { drink(near); return near; }
      if (plants.length >= 14) { hint('The bed is full. Pick something first.'); return null; }
      const p = makePlant(seed, u, v); planted = true;
      if (!calm()) { particles.push({ type: 'seed', x, y: y - L.U * 1.6, ty: y, vy: 0, life: 0, max: 2, size: 3 }); }
      else dirt(x, y, 0);
      moisture[cell(x)] = Math.max(moisture[cell(x)], .25);
      update(); return p;
    }
    function nearest(x, y, within) {
      let best = null, bd = within;
      plants.forEach(p => { if (p.dying) return; const [px, py] = bedPoint(p.u, p.v), d = Math.hypot(px - x, (py - y) * 1.6); if (d < bd) { bd = d; best = p; } });
      return best;
    }
    function drink(p, amount = .17) {
      p.pending = Math.min(.6, p.pending + amount); watered = true;
      const [x, y] = bedPoint(p.u, p.v); moisture[cell(x)] = Math.min(1, moisture[cell(x)] + .5);
      if (calm()) grow(0, true); else if (!drag) pour = { x: x + L.U * .9, y: y - L.U * 2.2, until: time + .85, target: p };
      update();
    }
    function grow(dt, instant) {
      const light = .35 + .65 * day();
      plants.forEach(p => {
        if (p.dying) { p.dying += dt * 2.5; return; }
        if (p.pending <= 0) return;
        const step = instant ? p.pending : Math.min(p.pending, dt * .32 * light * KINDS[p.kind].speed);
        p.g = Math.min(1, p.g + step); p.pending = p.g >= 1 ? 0 : p.pending - step;
      });
      plants = plants.filter(p => p.dying < 1);
    }
    const cell = x => clamp(Math.floor((x - L.x0) / (L.x1 - L.x0) * moisture.length), 0, moisture.length - 1);

    // ---- Harvest
    function pick(hit) {
      const p = hit.plant; if (!p || p.dying) return;
      if (hit.head) { p.dying = .001; burst(hit.x, hit.y, '#f2c23c', 14); if (calm()) plants = plants.filter(x => x !== p); }
      else { hit.fruit.picked = true; burst(hit.x, hit.y, '#7d9b58', 6); }
      fly(hit.x, hit.y, KINDS[p.kind].icon, () => {
        harvest++; total.textContent = harvest; try { localStorage.setItem(STORE, String(harvest)); } catch { /* Session-only. */ }
        basket.classList.remove('bump'); void basket.offsetWidth; basket.classList.add('bump');
      });
      if (!hit.head && p.fruits.every(f => f.picked)) { p.g = KINDS[p.kind].regrow; p.pending = 0; p.fruits.forEach(f => f.picked = false); }
      flashHint = { text: ['Lovely.', 'Fresh from the garden.', 'Into the basket.', 'Still warm from the sun.'][harvest % 4], until: time + 2.2 };
      update();
    }
    function fly(x, y, icon, done) {
      const r = canvas.getBoundingClientRect(), b = basket.querySelector('.basket-icon').getBoundingClientRect();
      if (calm() || !b.width) { done(); return; }
      const el = document.createElement('span'); el.className = 'flying-produce'; el.textContent = icon; el.setAttribute('aria-hidden', 'true');
      const sx = r.left + x - 13, sy = r.top + y - 13; el.style.left = sx + 'px'; el.style.top = sy + 'px'; document.body.append(el);
      const dx = b.left - sx, dy = b.top - sy, lift = Math.min(170, Math.abs(dx) * .3 + 70);
      el.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx * .5}px,${Math.min(0, dy) * .5 - lift}px) scale(1.25) rotate(180deg)`, offset: .45 }, { transform: `translate(${dx}px,${dy}px) scale(.6) rotate(360deg)` }], { duration: 780, easing: 'cubic-bezier(.3,.1,.4,1)' }).onfinish = () => { el.remove(); done(); };
    }
    function burst(x, y, colour, n) { if (calm()) return; for (let i = 0; i < n; i++) { const a = rand(time * 10 + i) * TAU, v = 60 + rand(i + time) * 120; particles.push({ type: 'bit', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0, max: .7, size: 2.5, colour }); } }
    function dirt(x, y, n = 7) { for (let i = 0; i < n; i++) { const a = -Math.PI * (.15 + .7 * rand(time + i)); particles.push({ type: 'bit', x, y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 90, life: 0, max: .5, size: 2.2, colour: '#8a6348' }); } }

    // ---- Hints: a few words, only what helps next.
    function hint(text) { flashHint = { text, until: time + 2.6 }; update(); }
    function currentHint() {
      if (flashHint && time < flashHint.until) return flashHint.text;
      if (day() < .3) return 'The garden is sleeping. Fireflies are out.';
      if (hits.some(h => h.ripe)) return 'Tap ripe fruit to pick it.';
      if (!planted) return 'Tap the soil to plant.';
      if (!watered) return 'Drag across the plants to water.';
      if (plants.every(p => p.g < .5)) return 'Keep watering. Drag the sun too.';
      return 'Tap the soil to plant. Drag to water.';
    }

    // ---- Pointer: tap = plant / water / pick; drag = water; drag the sun = time of day.
    const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const hitAt = (x, y) => hits.find(h => h.ripe && Math.hypot(h.x - x, h.y - y) < Math.max(h.r * 1.35, 18));
    canvas.addEventListener('pointerdown', e => {
      if (e.button > 0 || !L) return; const [x, y] = local(e), [sx, sy] = sunXY();
      if (Math.hypot(x - sx, y - sy) < sunR() * 1.5 && sun.y < 1.05) { drag = { id: e.pointerId, sun: true }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; sun.target = null; return; }
      drag = { id: e.pointerId, sx: x, sy: y, x, y, moved: false };
      if (e.pointerType !== 'touch') canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!L) return; const [x, y] = local(e); pointer = { x, y, dx: e.movementX || 0 };
      if (drag && drag.id === e.pointerId) {
        if (drag.sun) { sun.x = clamp((x - W * .06) / (W * .88)); sun.y = clamp((y - L.skyTop) / (L.horizon - L.skyTop), 0, 1.12); wake(); update(); return; }
        drag.x = x; drag.y = y; if (!drag.moved && Math.hypot(x - drag.sx, y - drag.sy) > 9) { drag.moved = true; pour = null; }
        if (drag.moved && calm()) waterAt(x, y, .06);
        wake(); return;
      }
      // Brushing through a plant nudges it.
      plants.forEach(p => { const [px, py] = bedPoint(p.u, p.v), s = scaleOf(p); if (Math.abs(x - px) < L.U * .8 * s && y < py && y > py - L.U * 3 * s) p.vel += clamp(pointer.dx, -20, 20) * .015; });
      const [sx, sy] = sunXY();
      canvas.style.cursor = Math.hypot(x - sx, y - sy) < sunR() * 1.5 && sun.y < 1.05 ? 'grab' : hitAt(x, y) ? 'pointer' : y > L.back - L.U * 3 ? 'pointer' : 'default';
      wake();
    });
    function release(e) {
      if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null; canvas.style.cursor = '';
      if (d.sun || d.moved || e.type === 'pointercancel') { update(); return; }
      tap(d.x, d.y);
    }
    canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', () => { pointer = null; });
    function tap(x, y) {
      const h = hitAt(x, y); if (h) { pick(h); return; }
      const p = plants.find(p => { if (p.dying) return false; const [px, py] = bedPoint(p.u, p.v), s = scaleOf(p), ht = plantHeight(p); return Math.abs(x - px) < L.U * .75 * s && y < py + 10 && y > py - ht - L.U * .4; });
      if (p) { drink(p); return; }
      const [u, v] = bedUV(x, y); if (v >= -.05 && v <= 1.08 && u > 0 && u < 1) plantAt(u, v);
    }
    function waterAt(x, y, amount) {
      plants.forEach(p => { const [px] = bedPoint(p.u, p.v); if (Math.abs(px - x) < L.U * .75 * scaleOf(p)) { p.pending = Math.min(.6, p.pending + amount); watered = true; } });
      moisture[cell(x)] = Math.min(1, moisture[cell(x)] + amount * 3);
      if (calm()) { grow(0, true); update(); }
    }

    // ---- Keyboard: move along the bed, Enter acts at the cursor.
    canvas.addEventListener('keydown', e => {
      if (!L) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); cursor.u = clamp(cursor.u + (e.key === 'ArrowLeft' ? -.05 : .05), .03, .97); cursor.show = true; update(); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); cursor.show = true;
      const [x, y] = bedPoint(cursor.u, .55), p = nearest(x, y, L.U * 1.2);
      if (p) { const h = hits.find(h => h.ripe && h.plant === p); if (h) pick(h); else drink(p); } else plantAt(cursor.u, .55);
    });
    canvas.addEventListener('blur', () => { cursor.show = false; update(); });

    // ---- Dock
    document.querySelectorAll('.seed-packet').forEach(b => b.addEventListener('click', () => {
      seed = b.dataset.seed; document.querySelectorAll('.seed-packet').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      hint(`${KINDS[seed].icon} ${b.getAttribute('aria-label')}. Tap the soil.`);
    }));
    rainBtn.addEventListener('click', () => {
      if (rain) return; watered = true;
      if (calm()) { plants.forEach(p => p.pending = Math.min(.6, p.pending + .35)); moisture.fill(.8); grow(0, true); hint('A good soaking.'); return; }
      rain = { t: 0, dur: 3.4 }; rainBtn.disabled = true; wake();
    });
    nightBtn.addEventListener('click', () => {
      const toNight = day() > .5; sun.target = toNight ? 1.12 : .3;
      if (calm()) { sun.y = sun.target; sun.target = null; }
      wake(); update();
    });

    // ---- Simulation and drawing
    function wake() { if (!frame && onScreen && !calm()) { last = 0; frame = requestAnimationFrame(tick); } else if (calm()) update(); }
    function update() { if (calm() || !frame) draw(); }
    function tick(now) {
      frame = 0; const dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now; time += dt;
      step(dt); draw();
      if (onScreen && !document.hidden && !calm()) frame = requestAnimationFrame(tick);
    }
    function step(dt) {
      if (sun.target != null) { sun.y += (sun.target - sun.y) * Math.min(1, dt * 2.2); if (Math.abs(sun.target - sun.y) < .003) { sun.y = sun.target; sun.target = null; } }
      grow(dt, false);
      for (let i = 0; i < moisture.length; i++) moisture[i] = Math.max(0, moisture[i] - dt * .06);
      plants.forEach(p => { p.vel += (-p.sway * 30 - p.vel * 4.5) * dt; p.sway += p.vel * dt; });
      if (drag && drag.moved && !drag.sun) { waterAt(drag.x, drag.y + L.U * .3, dt * .45); spray(drag.x - L.U * .62, drag.y + L.U * .12, 3); }
      if (pour && time < pour.until) spray(pour.x - L.U * .62, pour.y + L.U * .12, 2); else pour = null;
      if (rain) {
        rain.t += dt; const k = rain.t / rain.dur, cx = lerp(-.2, 1.2, k) * W;
        for (let i = 0; i < 6; i++) drops.push({ x: cx + (rand(time * 91 + i) - .5) * W * .45, y: cloudY() + L.U * .5, vx: -20, vy: 380 + rand(i + time) * 140, ty: L.back + rand(time + i * 3) * L.depth, rain: true });
        plants.forEach(p => { const [px] = bedPoint(p.u, p.v); if (Math.abs(px - cx) < W * .25) p.pending = Math.min(.6, p.pending + dt * .22); });
        for (let i = 0; i < moisture.length; i++) { const x = L.x0 + (i + .5) / moisture.length * (L.x1 - L.x0); if (Math.abs(x - cx) < W * .25) moisture[i] = Math.min(1, moisture[i] + dt * .6); }
        if (rain.t >= rain.dur) { rain = null; rainBtn.disabled = false; hint('A good soaking.'); }
      }
      for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.vy += 900 * dt; d.x += (d.vx || 0) * dt; d.y += d.vy * dt; if (d.y >= d.ty) { drops.splice(i, 1); if (!d.rain || rand(d.x) < .3) particles.push({ type: 'splash', x: d.x, y: d.ty, life: 0, max: .35 }); } }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.life += dt;
        if (p.type === 'seed') { p.vy += 900 * dt; p.y += p.vy * dt; if (p.y >= p.ty) { particles.splice(i, 1); dirt(p.x, p.ty); continue; } }
        else if (p.type === 'bit') { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        if (p.life > p.max) particles.splice(i, 1);
      }
      creatures(dt);
      nightBtn.setAttribute('aria-pressed', String(day() < .3));
    }
    function spray(x, y, n) {
      for (let i = 0; i < n; i++) {
        const tx = x + (rand(time * 53 + i) - .5) * 14, [, v] = bedUV(tx, y);
        const ty = v < 0 ? L.back + L.depth * .45 : Math.min(L.front - 2, y + 4 + L.depth * .15);
        drops.push({ x: tx, y, vx: -30 - rand(i + time) * 30, vy: 40, ty: Math.max(ty, y + 8) });
      }
    }
    function creatures(dt) {
      const d = day(), wantBees = d > .35 ? Math.min(3, Math.ceil(flowers.length / 2)) : 0;
      while (bees.length < wantBees) bees.push({ x: rand(bees.length + time) > .5 ? W + 20 : -20, y: L.back - L.U * 3, target: null, hold: 0, leave: false, face: 1 });
      bees.forEach((b, i) => { b.leave = i >= wantBees; });
      for (let i = bees.length - 1; i >= 0; i--) {
        const b = bees[i]; let tx, ty;
        if (b.leave) { tx = b.x < W / 2 ? -40 : W + 40; ty = L.skyTop; }
        else { if (!b.target || !flowers.includes(b.target)) { b.target = flowers[Math.floor(rand(time + i * 7) * flowers.length)] || null; b.hold = 0; } if (!b.target) { tx = b.x; ty = b.y; } else { tx = b.target.x + Math.sin(time * 6 + i) * 4; ty = b.target.y - 8 + Math.cos(time * 5 + i) * 3; } }
        const dx = tx - b.x, dy = ty - b.y, dist = Math.hypot(dx, dy), sp = b.leave ? 220 : 130;
        if (dist > 3) { const k = Math.min(1, sp * dt / dist); b.x += dx * k; b.y += dy * k + Math.sin(time * 14 + i) * .5; if (Math.abs(dx) > 1) b.face = dx > 0 ? 1 : -1; }
        else if (b.target && (b.hold += dt) > .9 + rand(i + Math.floor(time)) * .8) { b.target = null; }
        if (b.leave && (b.x < -30 || b.x > W + 30)) bees.splice(i, 1);
      }
      const wantFlies = d > .4 ? 2 : 0;
      while (butterflies.length < wantFlies) butterflies.push({ x: -30, y: L.back - L.U * (2 + butterflies.length), vx: 40 + butterflies.length * 12, phase: butterflies.length * 2, colour: butterflies.length ? '#c9b3e6' : '#f1b38a' });
      for (let i = butterflies.length - 1; i >= 0; i--) {
        const b = butterflies[i]; b.x += b.vx * dt; b.y += Math.sin(time * 1.7 + b.phase) * 22 * dt;
        b.y = clamp(b.y, L.skyTop + 20, L.back - 10);
        if (b.x > W + 40 || b.x < -40) { if (i >= wantFlies) { butterflies.splice(i, 1); continue; } b.vx *= -1; }
      }
      const wantFire = d < .6 ? 26 : 0;
      while (fireflies.length < wantFire) { const n = fireflies.length; fireflies.push({ x: rand(n * 3.1) * W, y: lerp(L.back - L.U * 3, L.front, rand(n * 7.7)), phase: rand(n) * TAU }); }
      if (!wantFire) fireflies.length = 0;
      fireflies.forEach((f, i) => { f.x += Math.sin(time * .6 + f.phase) * 12 * dt; f.y += Math.cos(time * .5 + f.phase * 1.3) * 9 * dt; });
    }

    const wind = x => Math.sin(time * .9 + x * .004) * .6 + Math.sin(time * 2.1 + x * .011) * .25 + (rain ? Math.sin(time * 3) * .5 : 0);
    function plantHeight(p) {
      const s = scaleOf(p), U = L.U;
      if (p.kind === 'tomato') return U * 2.1 * s * (.08 + .92 * ease(clamp(p.g / .8)));
      if (p.kind === 'sunflower') return U * 3.3 * s * (.06 + .94 * ease(clamp(p.g / .75)));
      return U * .6 * s * (.3 + .7 * ease(clamp(p.g / .7)));
    }
    const qpt = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
    function leaf(x, y, ang, len, colour) {
      if (len < 1) return; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = colour; ctx.beginPath();
      ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * .45, -len * .34, len, 0); ctx.quadraticCurveTo(len * .45, len * .34, 0, 0); ctx.fill();
      ctx.strokeStyle = '#00000018'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(len * .1, 0); ctx.lineTo(len * .85, 0); ctx.stroke(); ctx.restore();
    }
    function blossom(x, y, r, petal, eye) {
      if (r < .6) return; ctx.fillStyle = petal;
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .5, r * .34, a, 0, TAU); ctx.fill(); }
      ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(x, y, r * .3, 0, TAU); ctx.fill();
    }
    function drawPlant(p) {
      const U = L.U, s = scaleOf(p), [bx, by] = bedPoint(p.u, p.v), d = day(), [sx] = sunXY();
      const lean = clamp((sx - bx) / (W * .5), -1, 1), shrink = p.dying ? 1 - ease(clamp(p.dying)) : 1;
      const a = (p.sway + wind(bx) * .05 * clamp(p.g * 2) + lean * .06 * d) * (p.kind === 'strawberry' ? .4 : 1);
      const h = plantHeight(p) * shrink, top = [bx + Math.sin(a) * h, by - Math.cos(a) * h], c = [bx + Math.sin(a) * h * .2, by - h * .55];
      // Soil mound.
      ctx.fillStyle = '#4b3328'; ctx.beginPath(); ctx.ellipse(bx, by + 1, U * .34 * s, U * .08 * s, 0, 0, TAU); ctx.fill();
      if (p.kind === 'strawberry') { drawStrawberry(p, bx, by, s, a, d); return; }
      const stemW = Math.max(2, U * (p.kind === 'sunflower' ? .13 : .085) * s);
      ctx.strokeStyle = p.kind === 'sunflower' ? '#5f8544' : '#5e7f47'; ctx.lineWidth = stemW; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(c[0], c[1], top[0], top[1]); ctx.stroke();
      const n = p.kind === 'sunflower' ? Math.min(6, 1 + Math.floor(p.g * 7)) : Math.min(8, 1 + Math.floor(p.g * 9));
      for (let i = 0; i < n; i++) {
        const t = p.kind === 'sunflower' ? .16 + i * .12 : .16 + i * .1, side = i % 2 ? 1 : -1, [lx, ly] = qpt([bx, by], c, top, Math.min(.95, t));
        const len = U * (p.kind === 'sunflower' ? .82 : .6) * s * clamp((p.g - i * .05) * 3) * shrink, droop = p.kind === 'sunflower' ? .15 : 0;
        leaf(lx, ly, side > 0 ? -.55 + droop + a : Math.PI + .55 - droop + a, len, i % 2 ? '#7d9b58' : '#9db66c');
      }
      if (p.kind === 'tomato') drawTomatoFruit(p, bx, by, c, top, s, d);
      else drawSunflowerHead(p, top, s, d, lean, shrink);
    }
    function drawTomatoFruit(p, bx, by, c, top, s, d) {
      const U = L.U; if (p.g < .5) return;
      p.fruits.forEach(f => {
        const t = .4 + f.i * .13, side = f.i % 2 ? 1 : -1, [px, py] = qpt([bx, by], c, top, t), ax = px + side * U * .36 * s, ay = py - U * .05 * s;
        ctx.strokeStyle = '#5e7f47'; ctx.lineWidth = Math.max(1.2, U * .04 * s); ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + side * U * .2 * s, py - U * .12 * s, ax, ay); ctx.stroke();
        if (f.picked) return;
        if (p.g < .7) { const r = U * .1 * s * clamp((p.g - .5) / .08) * (.6 + .4 * d); blossom(ax, ay + U * .04, r, '#f1d36b', '#c98a2b'); flowers.push({ x: ax, y: ay }); return; }
        const r = U * .19 * s * (.45 + .55 * clamp((p.g - .7) / .2)), ripe = p.g >= 1, fx = ax, fy = ay + r * .85;
        const col = mix('#8fb35a', KINDS.tomato.colour, clamp((p.g - .86) / .14));
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(fx, fy, r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff40'; ctx.beginPath(); ctx.ellipse(fx - r * .35, fy - r * .25, r * .22, r * .32, -.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4f7240'; for (let k = 0; k < 5; k++) { const q = k / 5 * TAU - Math.PI / 2; ctx.beginPath(); ctx.ellipse(fx + Math.cos(q) * r * .28, fy - r * .82 + Math.sin(q) * r * .16, r * .26, r * .08, q, 0, TAU); ctx.fill(); }
        hits.push({ x: fx, y: fy, r, ripe, plant: p, fruit: f });
        if (ripe) glowRing(fx, fy, r);
      });
    }
    function drawSunflowerHead(p, top, s, d, lean, shrink) {
      const U = L.U; if (p.g < .42) return;
      const hx = top[0] + lean * U * .22 * s * d, hy = top[1] + U * .28 * s * (1 - d) * clamp((p.g - .7) * 4);
      if (p.g < .7) { const r = U * .1 * s * (1 + clamp((p.g - .42) / .28)); ctx.fillStyle = '#6f9a4e'; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.fill(); ctx.fillStyle = '#e9c34a'; ctx.beginPath(); ctx.arc(hx, hy - r * .3, r * .4 * clamp((p.g - .6) * 10), 0, TAU); ctx.fill(); return; }
      const open = clamp((p.g - .7) / .25) * (.5 + .5 * d) * shrink, disk = U * .25 * s * (.75 + .25 * open) * shrink, turn = 1 - Math.abs(lean) * .35 * d;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(lean * .25 * d + (1 - d) * .5 * Math.sign(lean || 1)); ctx.scale(turn, 1);
      for (let i = 0; i < 16; i++) { const q = i / 16 * TAU + time * .02; ctx.fillStyle = i % 2 ? '#e8a92c' : '#f2c23c'; ctx.beginPath(); ctx.ellipse(Math.cos(q) * (disk + U * .2 * s * open), Math.sin(q) * (disk + U * .2 * s * open), U * .23 * s * open, U * .075 * s, q, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#5b3a22'; ctx.beginPath(); ctx.arc(0, 0, disk, 0, TAU); ctx.fill();
      ctx.fillStyle = p.g >= 1 ? '#c9a066' : '#3d2616';
      for (let i = 0; i < 26; i++) { const rr = Math.sqrt(i / 26) * disk * .85, q = i * 2.4; ctx.beginPath(); ctx.arc(Math.cos(q) * rr, Math.sin(q) * rr, Math.max(.8, disk * .07), 0, TAU); ctx.fill(); }
      ctx.restore();
      flowers.push({ x: hx, y: hy - disk * .3 });
      hits.push({ x: hx, y: hy, r: disk + U * .2 * s, ripe: p.g >= 1 && !p.dying, plant: p, head: true });
      if (p.g >= 1 && !p.dying) glowRing(hx, hy, disk + U * .22 * s);
    }
    function drawStrawberry(p, bx, by, s, a, d) {
      const U = L.U, k = ease(clamp(p.g / .7)), n = Math.min(7, 2 + Math.floor(p.g * 6));
      for (let i = 0; i < n; i++) {
        const ang = lerp(-2.55, -.6, n > 1 ? i / (n - 1) : .5) + a, len = U * .62 * s * (.3 + .7 * k) * (.8 + .2 * rand(p.id + i)), ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
        ctx.strokeStyle = '#6c8f4c'; ctx.lineWidth = Math.max(1.2, U * .035 * s); ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.cos(ang) * len * .5, by + Math.sin(ang) * len * .7 - 4, ex, ey); ctx.stroke();
        [-.55, 0, .55].forEach((o, j) => leaf(ex, ey, ang + o, U * .26 * s * (.5 + .5 * k), j === 1 ? '#6f9a4e' : '#86ab5c'));
        if (p.g >= .5 && p.g < .72 && i % 2) { const r = U * .08 * s * clamp((p.g - .5) / .08) * (.6 + .4 * d); blossom(ex, ey - 2, r, '#f6f1e4', '#e8c75a'); flowers.push({ x: ex, y: ey }); }
      }
      if (p.g < .7) return;
      p.fruits.forEach(f => {
        if (f.picked) return;
        const side = f.i === 1 ? 1 : -1, reach = U * (.34 + .16 * f.i) * s, fx = bx + side * reach, fy = by - U * .04 * s, r = U * .15 * s * (.5 + .5 * clamp((p.g - .7) / .2)), ripe = p.g >= 1;
        ctx.strokeStyle = '#6c8f4c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx, by - U * .1 * s); ctx.quadraticCurveTo(bx + side * reach * .5, by - U * .3 * s, fx, fy - r); ctx.stroke();
        ctx.fillStyle = mix('#dfe6bd', KINDS.strawberry.colour, clamp((p.g - .84) / .16));
        ctx.beginPath(); ctx.moveTo(fx - r, fy - r * .55); ctx.quadraticCurveTo(fx - r * 1.05, fy + r * .5, fx, fy + r * 1.05); ctx.quadraticCurveTo(fx + r * 1.05, fy + r * .5, fx + r, fy - r * .55); ctx.quadraticCurveTo(fx, fy - r * 1.05, fx - r, fy - r * .55); ctx.fill();
        ctx.fillStyle = '#f3e08a'; for (let q = 0; q < 6; q++) { ctx.beginPath(); ctx.arc(fx + (rand(q + f.i) - .5) * r * 1.1, fy + (rand(q * 3 + f.i) - .3) * r * .9, Math.max(.7, r * .07), 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#4f7240'; ctx.beginPath(); ctx.ellipse(fx, fy - r * .62, r * .7, r * .2, 0, 0, TAU); ctx.fill();
        hits.push({ x: fx, y: fy, r: r * 1.1, ripe, plant: p, fruit: f });
        if (ripe) glowRing(fx, fy, r);
      });
    }
    function glowRing(x, y, r) { if (calm()) return; const k = .5 + .5 * Math.sin(time * 3); ctx.strokeStyle = `rgba(255,246,210,${.18 + .22 * k})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r + 3 + k * 2, 0, TAU); ctx.stroke(); }

    function draw() {
      if (!L && !layout()) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const d = day(), [sx, sy] = sunXY(), R = sunR(), dusk = clamp(1 - Math.abs(sun.y - .92) / .3);
      // Sky, fading in at the top so it blends with the page.
      const sky = ctx.createLinearGradient(0, 0, 0, L.horizon);
      const top = mix('#0b131b', '#223a2b', d), low = mix('#16222b', '#3b5a3c', d);
      sky.addColorStop(0, top.replace('rgb', 'rgba').replace(')', ',0)')); sky.addColorStop(.2, top); sky.addColorStop(1, low);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, L.horizon + 2);
      if (dusk > 0) { const g = ctx.createRadialGradient(sx, L.horizon, 0, sx, L.horizon, W * .55); g.addColorStop(0, `rgba(240,160,90,${.38 * dusk})`); g.addColorStop(1, 'rgba(240,160,90,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, L.horizon + 2); }
      if (d < 1) { for (let i = 0; i < 80; i++) { const x = rand(i) * W, y = lerp(L.skyTop * .3, L.horizon - 20, rand(i + 99) ** 1.4), tw = .5 + .5 * Math.sin(time * 2 + i); ctx.fillStyle = `rgba(245,240,220,${(1 - d) * (.25 + .55 * tw) * (1 - y / L.horizon * .6)})`; ctx.fillRect(x, y, 1.6, 1.6); } }
      if (d < .9) { const mx = lerp(W * .9, W * .66, sun.x), my = Math.max(L.storyBottom + R * 2, lerp(L.skyTop + 30, L.horizon * .45, clamp(1.1 - sun.y))), mr = R * .7, a = 1 - d;
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 4); g.addColorStop(0, `rgba(230,236,210,${.18 * a})`); g.addColorStop(1, 'rgba(230,236,210,0)'); ctx.fillStyle = g; ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
        ctx.fillStyle = `rgba(241,236,214,${a})`; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill(); ctx.fillStyle = mix('#0b131b', '#223a2b', d); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(mx + mr * .42, my - mr * .2, mr * .88, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      // The sun sinks behind the hills.
      if (sun.y < 1.12) { const g = ctx.createRadialGradient(sx, sy, R * .6, sx, sy, R * 4.5); g.addColorStop(0, `rgba(246,214,128,${.35 * (.4 + .6 * d)})`); g.addColorStop(1, 'rgba(246,214,128,0)'); ctx.fillStyle = g; ctx.fillRect(sx - R * 5, sy - R * 5, R * 10, R * 10);
        const b = ctx.createRadialGradient(sx - R * .3, sy - R * .35, R * .1, sx, sy, R); b.addColorStop(0, '#fff6cf'); b.addColorStop(.45, mix('#e98a4a', '#f4d680', d)); b.addColorStop(1, mix('#c9603a', '#e2aa4c', d)); ctx.fillStyle = b; ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.fill();
        if (!drag?.sun && !calm()) { ctx.strokeStyle = `rgba(246,222,156,${.25 + .15 * Math.sin(time * 2)})`; ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy, R * 1.28, time * .2, time * .2 + TAU); ctx.stroke(); ctx.setLineDash([]); } }
      hills(L.horizon - L.U * 1.1, L.U * .7, .0035, 1.3, mix('#16231f', '#34503a', d));
      hills(L.horizon - L.U * .45, L.U * .5, .006, 4.1, mix('#1a2823', '#3f5c3a', d));
      ctx.fillStyle = mix('#1a2620', '#3a5236', d); ctx.fillRect(0, L.horizon, W, H - L.horizon);
      // Rain cloud.
      if (rain) { const k = rain.t / rain.dur, cx = lerp(-.2, 1.2, k) * W, cy = cloudY(), fade = Math.min(1, rain.t * 2, (rain.dur - rain.t) * 2);
        ctx.fillStyle = `rgba(190,200,196,${.85 * fade})`; [[-.18, .1, .16], [0, -.05, .2], [.17, .08, .15], [.08, .14, .14], [-.08, .16, .13]].forEach(([ox, oy, r]) => { ctx.beginPath(); ctx.arc(cx + ox * W * .5, cy + oy * L.U * 3, r * W * .25, 0, TAU); ctx.fill(); }); }
      // Raised bed: soil with rows and wet patches, a wooden front board, grass along the edge.
      ctx.fillStyle = '#5c3f31'; ctx.beginPath(); ctx.moveTo(L.bx0, L.back); ctx.lineTo(L.bx1, L.back); ctx.lineTo(L.x1, L.front); ctx.lineTo(L.x0, L.front); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4a3226'; ctx.fillRect(L.bx0, L.back - 3, L.bx1 - L.bx0, 4);
      for (let i = 0; i < moisture.length; i++) { const m = moisture[i]; if (m < .02) continue; const u0 = i / moisture.length, u1 = (i + 1) / moisture.length, [a0] = bedPoint(u0, 0), [a1] = bedPoint(u1, 0), [b0] = bedPoint(u0, 1), [b1] = bedPoint(u1, 1);
        ctx.fillStyle = `rgba(38,24,18,${m * .45})`; ctx.beginPath(); ctx.moveTo(a0, L.back); ctx.lineTo(a1, L.back); ctx.lineTo(b1, L.front); ctx.lineTo(b0, L.front); ctx.fill(); }
      ctx.strokeStyle = '#6e4d3b'; ctx.lineWidth = 1.2; [.3, .6, .85].forEach(v => { const [a] = bedPoint(0, v), [b] = bedPoint(1, v), y = L.back + v * L.depth; ctx.beginPath(); ctx.moveTo(a + 6, y); ctx.lineTo(b - 6, y); ctx.stroke(); });
      ctx.fillStyle = '#8a6446'; ctx.fillRect(L.x0, L.front, L.x1 - L.x0, L.plank); ctx.fillStyle = '#a67c58'; ctx.fillRect(L.x0, L.front, L.x1 - L.x0, 2.5);
      ctx.fillStyle = '#6f4f37'; for (let x = L.x0 + (L.x1 - L.x0) / 6; x < L.x1 - 5; x += (L.x1 - L.x0) / 6) ctx.fillRect(x, L.front + 2, 1.5, L.plank - 2);
      // Plants, back to front, rebuilding the tap targets as they are drawn.
      hits = []; flowers = [];
      plants.forEach(drawPlant);
      ctx.strokeStyle = mix('#2d4a2c', '#6f9a4e', d); ctx.lineWidth = 1.6;
      for (let i = 0; i < 90; i++) { const x = L.x0 + rand(i * 5.3) * (L.x1 - L.x0), y = L.front + L.plank, hh = 4 + rand(i) * 9, lean = wind(x) * 2 + (rand(i + 3) - .5) * 5; ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.quadraticCurveTo(x + lean * .3, y - hh * .5, x + lean, y - hh); ctx.stroke(); }
      // Water.
      ctx.fillStyle = '#a6cad6';
      drops.forEach(d => { ctx.globalAlpha = d.rain ? .7 : .9; ctx.beginPath(); ctx.ellipse(d.x, d.y, 1.4, d.rain ? 5 : 3.4, 0, 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
      particles.forEach(p => {
        const k = p.life / p.max;
        if (p.type === 'splash') { ctx.strokeStyle = `rgba(166,202,214,${1 - k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, 2 + k * 7, 1 + k * 2, 0, 0, TAU); ctx.stroke(); }
        else if (p.type === 'seed') { ctx.fillStyle = '#e8d7a4'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 3.2, 2.2, .4, 0, TAU); ctx.fill(); }
        else { ctx.fillStyle = p.colour; ctx.globalAlpha = 1 - k; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); ctx.globalAlpha = 1; }
      });
      const can = drag && drag.moved && !drag.sun ? { x: drag.x, y: drag.y, tilt: 1 } : pour ? { x: pour.x, y: pour.y, tilt: clamp((pour.until - time) * 3) * clamp((time - (pour.until - .85)) * 5) } : null;
      if (can) drawCan(can.x, can.y, can.tilt);
      // Creatures.
      bees.forEach(b => drawBee(b.x, b.y, b.face));
      butterflies.forEach(b => drawButterfly(b.x, b.y, b.colour, b.vx > 0 ? 1 : -1));
      // Night: dim everything, then let the fireflies glow through.
      if (d < 1) { ctx.fillStyle = `rgba(6,12,22,${(1 - d) * .38})`; ctx.fillRect(0, L.horizon - L.U * 1.5, W, H); }
      fireflies.forEach(f => { const a = (1 - clamp(d / .6)) * (.4 + .6 * Math.max(0, Math.sin(time * 2.2 + f.phase * 3))); if (a < .02) return; const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 10); g.addColorStop(0, `rgba(236,248,150,${a})`); g.addColorStop(1, 'rgba(236,248,150,0)'); ctx.fillStyle = g; ctx.fillRect(f.x - 10, f.y - 10, 20, 20); ctx.fillStyle = `rgba(250,255,210,${a})`; ctx.fillRect(f.x - 1, f.y - 1, 2, 2); });
      if (cursor.show && document.activeElement === canvas) { const [x, y] = bedPoint(cursor.u, .55); ctx.strokeStyle = '#e9f0c4'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, L.U * .5, L.U * .16, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      const text = currentHint(); if (text !== lastHint) { lastHint = text; status.textContent = text; }
    }
    function hills(base, amp, freq, phase, colour) {
      ctx.fillStyle = colour; ctx.beginPath(); ctx.moveTo(0, L.horizon + 2);
      for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, base - (Math.sin(x * freq + phase) * .6 + Math.sin(x * freq * 2.3 + phase * 2) * .4 + 1) * amp * .5);
      ctx.lineTo(W, L.horizon + 2); ctx.closePath(); ctx.fill();
    }
    function drawCan(x, y, tilt) {
      const U = L.U, k = U / 55; ctx.save(); ctx.translate(x + U * .35, y - U * .2); ctx.rotate(-.55 * tilt); ctx.scale(k, k);
      ctx.strokeStyle = '#7ea2b0'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10, -22); ctx.quadraticCurveTo(8, -52, 26, -22); ctx.stroke();
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-18, 6); ctx.lineTo(-54, -18); ctx.stroke();
      ctx.fillStyle = '#6d909e'; ctx.beginPath(); ctx.ellipse(-57, -20, 5, 8, -.7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8db0bd'; ctx.beginPath(); ctx.roundRect(-22, -24, 48, 44, 8); ctx.fill();
      ctx.fillStyle = '#6d909e'; ctx.fillRect(-22, -10, 48, 3); ctx.restore();
    }
    function drawBee(x, y, face) {
      const k = clamp(L.U / 50, .7, 1.4); ctx.save(); ctx.translate(x, y); ctx.scale(face * k, k);
      const flap = .35 + .65 * Math.abs(Math.sin(time * 40)); ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.ellipse(-1, -6, 3.6, 5.5 * flap, -.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(2.5, -6, 3.2, 5 * flap, .3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 4.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a2f29'; ctx.fillRect(-2.2, -4.4, 1.8, 8.8); ctx.fillRect(1.6, -4.5, 1.8, 9); ctx.beginPath(); ctx.arc(6.4, -.4, 2.8, 0, TAU); ctx.fill(); ctx.restore();
    }
    function drawButterfly(x, y, colour, face) {
      const k = clamp(L.U / 50, .7, 1.4), f = Math.abs(Math.sin(time * 9 + x * .01)); ctx.save(); ctx.translate(x, y); ctx.scale(face * k, k); ctx.fillStyle = colour;
      ctx.beginPath(); ctx.ellipse(-4 * f, -3, 6 * f + 1, 5, -.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(4 * f, -3, 6 * f + 1, 5, .4, 0, TAU); ctx.fill();
      ctx.globalAlpha = .8; ctx.beginPath(); ctx.ellipse(-3 * f, 4, 4 * f + .8, 3.4, .5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(3 * f, 4, 4 * f + .8, 3.4, -.5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#3a2f29'; ctx.fillRect(-.8, -6, 1.6, 12); ctx.restore();
    }

    // A few seedlings are already up, so the bed is alive on arrival.
    function seedGarden() { makePlant('tomato', .26, .55, .56); makePlant('sunflower', .5, .3, .64); makePlant('strawberry', .74, .72, .52); }

    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; if (onScreen) { if (!L) layout(); wake(); } }, { threshold: .05 }).observe(canvas);
    addEventListener('resize', () => { if (layout()) draw(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    document.addEventListener('click', e => { if (e.target.closest('#gentle-mode')) setTimeout(() => { if (calm()) { bees.length = 0; butterflies.length = 0; particles.length = 0; drops.length = 0; rain = null; rainBtn.disabled = false; grow(0, true); } wake(); draw(); }, 0); });
    seedGarden(); requestAnimationFrame(() => { layout(); draw(); });
    window.GardenScene = {
      stats: () => { const r = hits.find(h => h.ripe); return { plants: plants.length, ripe: hits.filter(h => h.ripe).length, day: day(), harvest, grown: plants.reduce((s, p) => s + p.g, 0), ripeAt: r ? { x: r.x, y: r.y } : null, sun: sunXY(), bed: L && { back: L.back, front: L.front, x0: L.x0, x1: L.x1 } }; },
      plantAt: (u, v) => plantAt(u, v)
    };
  };
})();
