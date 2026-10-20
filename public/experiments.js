(() => {
  'use strict';
  const G = window.WorldGames;
  const $ = selector => document.querySelector(selector);
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let still = motionPreference.matches;
  const main = $('main');
  main.insertAdjacentHTML('beforeend', `
    <div class="chapter-jump"><span class="mono">There’s another layer to this.</span><a href="#playground">Take me to the playground ↓</a></div>
    <section class="portal-chapter" aria-label="A passage into the playground">
      <div class="portal-stage">
        <div class="orbit-fragment" aria-hidden="true">a little logic</div><div class="orbit-fragment" aria-hidden="true">a little chaos</div><div class="orbit-fragment" aria-hidden="true">one more shot</div><div class="orbit-fragment" aria-hidden="true">what if?</div>
        <div class="orbit-line" aria-hidden="true"></div><div class="singularity" aria-hidden="true"></div>
        <div class="portal-copy"><span class="mono">Between one thought & the next</span><h2>Let curiosity<br>pull you in.</h2><p>Keep scrolling. Things get a little less sensible from here.</p></div>
        <div class="portal-bottom mono"><span>Passage 01 / down the rabbit hole</span><a href="#playground">Skip the passage ↓</a></div>
      </div>
    </section>
    <section class="playground" id="playground" aria-labelledby="playground-title">
      <div class="playground-top"><div><span class="mono lab-muted">Dennyi’s playground / three small obsessions</span><h2 id="playground-title">Ideas you can<br><em>get your hands on.</em></h2></div><p>A few things I like, turned into little places to play. Stay for a shot. Untangle something. Grow something.</p></div>
      <nav class="chapter-tabs" aria-label="Playground chapters"><a href="#free-throws">01 / Shoot hoops</a><a href="#cube-room">02 / Untangle</a><a href="#tomato-garden">03 / Dream garden</a><button class="cat-summon" id="summon-cat">pspsps… 🐾</button><button class="motion-toggle" id="gentle-mode" aria-pressed="false">Gentle motion</button></nav>
      <article class="experiment court" id="free-throws" aria-labelledby="court-title">
        <div class="story"><span class="mono">01 / The free-throw line</span><h3 id="court-title">Just one<br>more shot.</h3><p>A quiet court. No clock. Just you, the ball, and a slightly unreasonable desire to get the next one in.</p><div class="scoreboard"><div><b id="baskets">0</b><span>Baskets</span></div><div><b id="attempts">0</b><span>Attempts</span></div><div><b id="streak">0</b><span>Streak</span></div></div><p id="shot-status" class="game-status" role="status">Find your angle. Give it enough lift.</p><label style="font-size:11px;line-height:1.8"><input type="checkbox" id="ball-surprise" checked> Let a missed ball fly toward me</label><span class="chapter-no" aria-hidden="true">01</span></div>
        <div class="game-area"><canvas id="court-canvas" width="800" height="500" role="img" aria-label="Basketball court showing your shot trajectory, hoop, and ball"></canvas><p class="court-caption">Breathe. Line it up. Let it fly.</p><div class="shot-controls"><label class="range-field"><span>Aim <output id="aim-value">0°</output></span><input id="shot-aim" type="range" min="-65" max="65" value="0" aria-label="Shot aim"></label><label class="range-field"><span>Power <output id="power-value">60%</output></span><input id="shot-power" type="range" min="15" max="100" value="60" aria-label="Shot power"></label></div><div class="game-controls"><button class="game-btn primary" id="shoot">Take the shot ↗</button><button class="game-btn" id="reset-court">New session</button></div></div><div class="book-edge" aria-hidden="true"></div>
      </article>
      <article class="experiment cube-room" id="cube-room" aria-labelledby="cube-title">
        <div class="story"><span class="mono">02 / A little beautiful disorder</span><h3 id="cube-title">It’ll click. <br>Eventually.</h3><div class="scoreboard"><div><b id="cube-count">0</b><span>Turns</span></div><div><b id="cube-state">Scrambled</b><span>State</span></div></div><p id="cube-status" class="game-status" role="status">Drag to look around.</p><div id="turn-history" class="turn-history" aria-label="Recent moves"></div><span class="chapter-no" aria-hidden="true">02</span></div>
        <div class="game-area"><canvas id="cube-canvas" width="1600" height="1000" tabindex="0" role="img" aria-label="Interactive Rubik’s cube. Drag or use arrow keys to orbit. Press F, B, U, D, L, or R to turn a face. Hold Shift for an inverse turn."></canvas><div class="cube-moves" aria-label="Cube face turns">${['F','R','U','L','D','B'].map(f => `<button data-turn="${f}" aria-label="Turn ${f} face clockwise">${f}<small>${({ F:'front', R:'right', U:'top', L:'left', D:'bottom', B:'back' })[f]}</small></button>`).join('')}</div><div class="cube-tools"><button class="game-btn" id="cube-inverse" aria-pressed="false">Inverse ↶</button><button class="game-btn" id="cube-undo">Undo</button><button class="game-btn" id="cube-scramble">Scramble</button><button class="game-btn" id="cube-reset">Reset</button><button class="game-btn" id="cube-view-left" aria-label="Orbit cube left">View ←</button><button class="game-btn" id="cube-view-right" aria-label="Orbit cube right">View →</button></div></div><div class="book-edge" aria-hidden="true"></div>
      </article>
      <article class="experiment garden" id="tomato-garden" aria-labelledby="garden-title">
        <div class="story"><span class="mono">03 / A dream garden</span><h3 id="garden-title">Grow something.</h3><p id="garden-status" class="game-status" role="status">Tap the soil to plant a seed.</p></div>
        <div class="garden-basket" aria-label="Harvest basket"><span class="basket-icon" aria-hidden="true">🧺</span><span id="harvest-total">0</span></div>
        <div class="game-area"><canvas id="garden-canvas" tabindex="0" aria-label="Your dream garden. Tap the soil to plant, drag across the bed to rain stardust, and tap glowing fruit to pick it. Touch the mushrooms, the moon gate or the sky. The time slider below changes the hour. With the garden focused, left and right arrows move along the bed and Enter plants, waters or picks." aria-describedby="garden-status"></canvas><div class="garden-soil" aria-hidden="true"></div>
          <div class="garden-dock" role="toolbar" aria-label="Garden tools">${[['tomato','🍅','Tomato'],['sunflower','🌻','Sunflower'],['strawberry','🍓','Strawberry']].map(([k,icon,name],i) => `<button class="seed-packet" data-seed="${k}" aria-pressed="${i===0}" aria-label="${name} seeds"><span aria-hidden="true">${icon}</span><small aria-hidden="true">${name}</small></button>`).join('')}<span class="dock-sep" aria-hidden="true"></span><button id="garden-rain" aria-label="Make it rain starlight"><span aria-hidden="true">✨</span><small aria-hidden="true">Rain</small></button><button id="garden-night" aria-pressed="false" aria-label="Night"><span aria-hidden="true">🌙</span><small aria-hidden="true">Night</small></button><button id="garden-cat" aria-label="Invite the cat"><span aria-hidden="true">🐈‍⬛</span><small aria-hidden="true">Cat</small></button></div>
        </div>
      </article>
      <div class="endnote"><span class="mono lab-muted">To be continued, obviously.</span><p>There’s always room for another idea.</p><a href="#">Back to the little world ↑</a></div>
    </section>`);

  document.body.insertAdjacentHTML('beforeend', '<div class="face-ball" aria-hidden="true"></div>');
  const passage = $('.portal-chapter');
  const blackHole = window.ImmersiveScenes.blackHole($('.portal-stage'), () => still);
  const basketball = window.ImmersiveScenes.court(() => still);
  // The cat is decorative; a missing or failing cat script must not stop the scenes below.
  let cats = { gentle() {} };
  try { if (typeof window.ImmersiveScenes.cat === 'function') cats = window.ImmersiveScenes.cat(() => still, () => basketball.busy()); } catch (error) { console.warn('Cat companion unavailable', error); }
  const worldFlow = window.WorldFlow.init({blackHole, court: basketball, calm: () => still});
  let scrollQueued = false;
  function updatePassage() { scrollQueued = false; worldFlow.update(); }
  addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updatePassage); } }, { passive: true });
  function setGentle(value) {
    still = value; document.body.classList.toggle('still-world', value);
    $('#gentle-mode').setAttribute('aria-pressed', value);
    $('#gentle-mode').textContent = value ? 'Gentle motion ✓' : 'Gentle motion';
    if (value) { $('#ball-surprise').checked = false; $('.face-ball').classList.remove('impact'); }
    if (value && $('#pause').getAttribute('aria-pressed') !== 'true') $('#pause').click();
    cats.gentle(); updatePassage();
  }
  $('#gentle-mode').onclick = () => setGentle(!still);
  motionPreference.addEventListener('change', e => setGentle(e.matches));
  setGentle(still);

  // Rubik's cube: all 54 stickers follow legal layer rotations in 3D.
  const cubeCanvas = $('#cube-canvas'), qc = cubeCanvas.getContext('2d');
  let cube = G.makeCube(), history = [], inverse = false, busy = false, yaw = -.52, pitch = .43, cubeDrag = null, cubeAnimation = null;
  let lastStickers = [];
  // Visible stickers in viewport pixels, back to front, so the scene bridges can carry the real cube.
  window.CubeScene = { stickers() { const r = cubeCanvas.getBoundingClientRect(), fit = getComputedStyle(cubeCanvas).objectFit === 'cover' ? Math.max : Math.min, k = fit(r.width / 800, r.height / 500), ox = r.left + (r.width - 800 * k) / 2, oy = r.top + (r.height - 500 * k) / 2; return lastStickers.map(({points,sticker}) => ({ color: sticker.color, points: points.map(p => [ox + p[0] * k, oy + p[1] * k]) })); } };
  function view(v) { return G.rotate(G.rotate(v, 1, yaw), 0, pitch); }
  function screen(v) { const q = view(v); return [400 + q[0] * 110, 252 - q[1] * 110, q[2]]; }
  function drawCube(animationProgress = 1) {
    qc.setTransform(2, 0, 0, 2, 0, 0); qc.clearRect(0, 0, 800, 500);
    const grad = qc.createRadialGradient(400, 419, 10, 400, 419, 165); grad.addColorStop(0, '#57405b24'); grad.addColorStop(1, '#57405b00');
    qc.save(); qc.translate(0, 310); qc.scale(1, .27); qc.fillStyle = grad; qc.fillRect(150, 180, 500, 480); qc.restore();
    const polygons = [];
    cube.forEach(sticker => {
      const axis = sticker.n.findIndex(v => v !== 0), a = (axis + 1) % 3, b = (axis + 2) % 3;
      const center = sticker.p.map((v, i) => v + sticker.n[i] * .505);
      const corners = [[-.465,-.465],[.465,-.465],[.465,.465],[-.465,.465]].map(([x,y]) => { const p = center.slice(); p[a] += x; p[b] += y; return p; });
      let normal = sticker.n.slice(), labelPoint = center.slice();
      if (cubeAnimation && sticker.p[cubeAnimation.spec.axis] === cubeAnimation.spec.layer) {
        const radians = cubeAnimation.radians * animationProgress;
        corners.forEach((v,i) => { corners[i] = G.rotate(v, cubeAnimation.spec.axis, radians); });
        normal = G.rotate(normal, cubeAnimation.spec.axis, radians); labelPoint = G.rotate(labelPoint, cubeAnimation.spec.axis, radians);
      }
      if (view(normal)[2] < .01) return;
      const points = corners.map(screen), label = screen(labelPoint);
      polygons.push({ points, label, sticker, depth: points.reduce((sum,v) => sum + v[2], 0) / 4 });
    });
    polygons.sort((a,b) => a.depth - b.depth); lastStickers = polygons;
    polygons.forEach(({points,label,sticker}) => {
      qc.beginPath(); points.forEach((p,i) => i ? qc.lineTo(p[0],p[1]) : qc.moveTo(p[0],p[1])); qc.closePath();
      qc.fillStyle = sticker.color; qc.fill(); qc.strokeStyle = '#473b4e'; qc.lineWidth = 4; qc.lineJoin = 'round'; qc.stroke();
      qc.fillStyle = '#40334999'; qc.font = '12px monospace'; qc.textAlign = 'center'; qc.textBaseline = 'middle'; qc.fillText(sticker.face, label[0], label[1]);
    });
  }
  function cubeUI(message) {
    $('#cube-count').textContent = history.length; $('#cube-state').textContent = G.solved(cube) ? 'Solved' : 'Scrambled';
    $('#turn-history').textContent = history.slice(-16).map(m => m.face + (m.inverse ? '′' : '')).join('  ');
    $('#cube-undo').disabled = busy || history.length === 0;
    document.querySelectorAll('[data-turn],#cube-scramble,#cube-reset,#cube-inverse').forEach(b => { b.disabled = busy; });
    if (message) $('#cube-status').textContent = message;
  }
  function moveCube(face, reverse = inverse, undo = false) {
    if (busy) return;
    const complete = () => {
      cube = G.turn(cube, face, reverse); if (undo) history.pop(); else history.push({ face, inverse: reverse });
      busy = false; cubeAnimation = null; drawCube(); cubeUI(G.solved(cube) ? 'Solved. Beautiful.' : `${face}${reverse ? '′' : ''}${undo ? ' undone' : ''}`);
    };
    if (still) { complete(); return; }
    busy = true; cubeUI(); const spec = G.faces[face]; cubeAnimation = { spec, radians: -spec.layer * (reverse ? -1 : 1) * Math.PI / 2 };
    let start;
    const animate = ts => { start ??= ts; const p = Math.min(1, (ts - start) / 190); drawCube(p * p * (3 - 2 * p)); if (p < 1) requestAnimationFrame(animate); else complete(); };
    requestAnimationFrame(animate);
  }
  function scramble() {
    if (busy) return;
    cube = G.makeCube(); history = []; const names = Object.keys(G.faces); let last = '';
    for (let i = 0; i < 22; i++) { let face; do { face = names[Math.floor(Math.random() * 6)]; } while (face === last); cube = G.turn(cube, face, Math.random() > .5); last = face; }
    drawCube(); cubeUI('Make each face one colour.');
  }
  document.querySelectorAll('[data-turn]').forEach(b => { b.onclick = () => moveCube(b.dataset.turn); });
  $('#cube-inverse').onclick = e => { inverse = !inverse; e.currentTarget.setAttribute('aria-pressed', inverse); e.currentTarget.textContent = inverse ? 'Inverse ↶ on' : 'Inverse ↶'; };
  $('#cube-undo').onclick = () => { const previous = history[history.length - 1]; if (previous) moveCube(previous.face, !previous.inverse, true); };
  $('#cube-scramble').onclick = scramble;
  $('#cube-reset').onclick = () => { if (busy) return; cube = G.makeCube(); history = []; drawCube(); cubeUI('Solved. Scramble it again?'); };
  $('#cube-view-left').onclick = () => { yaw -= Math.PI / 4; drawCube(); };
  $('#cube-view-right').onclick = () => { yaw += Math.PI / 4; drawCube(); };
  cubeCanvas.addEventListener('pointerdown', e => { cubeDrag = { x:e.clientX, y:e.clientY }; cubeCanvas.setPointerCapture(e.pointerId); cubeCanvas.focus({preventScroll:true}); });
  cubeCanvas.addEventListener('pointermove', e => { if (!cubeDrag) return; yaw += (e.clientX - cubeDrag.x) * .01; pitch = Math.max(-1.2, Math.min(1.2, pitch + (e.clientY - cubeDrag.y) * .008)); cubeDrag = {x:e.clientX,y:e.clientY}; drawCube(); });
  ['pointerup','pointercancel'].forEach(event => cubeCanvas.addEventListener(event, () => { cubeDrag = null; }));
  cubeCanvas.addEventListener('keydown', e => {
    const face = e.key.toUpperCase();
    if (G.faces[face] && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); moveCube(face, e.shiftKey); }
    if (e.key.startsWith('Arrow')) { e.preventDefault(); if (e.key === 'ArrowLeft') yaw -= .2; if (e.key === 'ArrowRight') yaw += .2; if (e.key === 'ArrowUp') pitch = Math.min(1.2,pitch+.15); if (e.key === 'ArrowDown') pitch = Math.max(-1.2,pitch-.15); drawCube(); }
  });
  scramble();

  // The garden is a WebGL scene (garden-3d.js). The flat canvas garden in garden-life.js is kept as
  // the fallback for browsers without WebGL, and starts only if the 3D garden can't.
  window.startGarden2D = () => { if (window.GardenScene) return; window.GardenLife({ calm: () => still }); };

  // Make the original playground door lead to its new, playable destination.
  const signals = $('[data-door="signals"]');
  signals.querySelector('h2').textContent = 'Wander into the playground';
  signals.querySelector('p').textContent = 'Shoot hoops. Untangle a cube. Grow something.';
  signals.onclick = () => { $('#playground').scrollIntoView({ behavior: still ? 'instant' : 'smooth' }); $('#playground-title').setAttribute('tabindex','-1'); $('#playground-title').focus({preventScroll:true}); };
  updatePassage();
})();
