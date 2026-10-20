/* Shared deterministic game rules. No DOM or rendering dependencies. */
(function (root) {
  'use strict';
  const faces = {
    R: { axis: 0, layer: 1, color: '#db705d' },
    L: { axis: 0, layer: -1, color: '#efa257' },
    U: { axis: 1, layer: 1, color: '#f7efd8' },
    D: { axis: 1, layer: -1, color: '#e7c75c' },
    F: { axis: 2, layer: 1, color: '#85a894' },
    B: { axis: 2, layer: -1, color: '#91a8cf' },
  };
  function rotate(vector, axis, radians) {
    const out = vector.slice(), a = (axis + 1) % 3, b = (axis + 2) % 3;
    out[a] = vector[a] * Math.cos(radians) - vector[b] * Math.sin(radians);
    out[b] = vector[a] * Math.sin(radians) + vector[b] * Math.cos(radians);
    return out;
  }
  function makeCube() {
    const stickers = [];
    for (const [face, spec] of Object.entries(faces)) {
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const p = [0, 0, 0], n = [0, 0, 0];
        p[spec.axis] = spec.layer; n[spec.axis] = spec.layer;
        p[(spec.axis + 1) % 3] = a; p[(spec.axis + 2) % 3] = b;
        stickers.push({ p, n, face, color: spec.color });
      }
    }
    return stickers;
  }
  function turn(cube, face, inverse = false) {
    const spec = faces[face];
    if (!spec) throw new Error('Unknown face');
    const radians = -spec.layer * (inverse ? -1 : 1) * Math.PI / 2;
    return cube.map(s => s.p[spec.axis] === spec.layer ? {
      ...s, p: rotate(s.p, spec.axis, radians).map(Math.round),
      n: rotate(s.n, spec.axis, radians).map(Math.round),
    } : s);
  }
  function solved(cube) {
    return Object.values(faces).every(spec => {
      const side = cube.filter(s => s.n[spec.axis] === spec.layer);
      return side.length === 9 && side.every(s => s.face === side[0].face);
    });
  }
  function shotAt(aim, power, t) {
    return { x: 400 + aim * 2 * t, y: 410 - (500 + power * 3) * t + 500 * t * t };
  }
  function shotResult(aim, power) {
    const speed = 500 + power * 3, discriminant = speed * speed - 500000;
    if (discriminant < 0) return { made: false, time: speed / 500 };
    const time = (speed + Math.sqrt(discriminant)) / 1000;
    return { made: Math.abs(shotAt(aim, power, time).x - 400) < 26, time };
  }
  const ballRadius = .115, rimRadius = .29, rimTube = .018;
  function simulateShot(aim, power, hoop = { x: 0, y: 3.05, z: 4.6 }) {
    // World units are meters. Scoring uses the same trajectory that is rendered.
    const radians = aim * Math.PI / 180, speed = 5.6 + power * .035;
    let p = { x: 0, y: 1.8, z: 0 };
    let v = { x: Math.sin(radians) * speed * Math.cos(.96), y: speed * Math.sin(.96), z: Math.cos(radians) * speed * Math.cos(.96) };
    const frames = [{ ...p, t: 0 }], dt = 1 / 180;
    let scored = false, entered = false, scoreTime = null, entryTime = null, rimHits = 0, boardHits = 0, floorHits = 0;
    for (let i = 1; i <= 630; i++) {
      const before = { ...p };
      v.y -= 9.81 * dt;
      p = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt };
      // Sphere against the hoop's toroidal rim.
      const dx = p.x - hoop.x, dz = p.z - hoop.z, radial = Math.hypot(dx, dz);
      const nearest = { x: hoop.x + (radial ? dx / radial : 1) * rimRadius, y: hoop.y, z: hoop.z + (radial ? dz / radial : 0) * rimRadius };
      const delta = { x: p.x - nearest.x, y: p.y - nearest.y, z: p.z - nearest.z };
      const distance = Math.hypot(delta.x, delta.y, delta.z), contactRadius = ballRadius + rimTube;
      if (distance > .00001 && distance < contactRadius) {
        const n = { x: delta.x / distance, y: delta.y / distance, z: delta.z / distance };
        const inward = v.x * n.x + v.y * n.y + v.z * n.z;
        if (inward < 0) { v.x -= 1.62 * inward * n.x; v.y -= 1.62 * inward * n.y; v.z -= 1.62 * inward * n.z; rimHits++; }
        p.x = nearest.x + n.x * contactRadius; p.y = nearest.y + n.y * contactRadius; p.z = nearest.z + n.z * contactRadius;
      }
      const boardZ = hoop.z + .41;
      if (v.z > 0 && before.z + ballRadius < boardZ && p.z + ballRadius >= boardZ && Math.abs(p.x - hoop.x) < 1.02 && p.y > hoop.y - .03 && p.y < hoop.y + 1.17) {
        p.z = boardZ - ballRadius; v.z *= -.68; boardHits++;
      }
      // A basket is only awarded after a downward passage through the opening,
      // then the entire sphere clears the underside. No x/y snapping is used.
      if (!entered && before.y > hoop.y && p.y <= hoop.y && v.y < 0) {
        const f = (before.y - hoop.y) / (before.y - p.y);
        const x = before.x + (p.x - before.x) * f, z = before.z + (p.z - before.z) * f;
        if (Math.hypot(x - hoop.x, z - hoop.z) + ballRadius < rimRadius - rimTube) { entered = true; entryTime = (i - 1 + f) * dt; }
      }
      if (entered && !scored && p.y + ballRadius < hoop.y && v.y < 0) { scored = true; scoreTime = i * dt; }
      if (scored && p.y < hoop.y && p.y > hoop.y - .6) { v.x *= .98; v.z *= .98; v.y *= .995; }
      if (p.y < ballRadius && v.y < 0) { p.y = ballRadius; v.y *= -.58; v.x *= .8; v.z *= .8; floorHits++; }
      frames.push({ ...p, t: i * dt });
    }
    return { frames, made: scored, scoreTime, entryTime, rimHits, boardHits, floorHits, hoop: { ...hoop } };
  }
  function sampleShot(shot, time) {
    const index = Math.max(0, Math.min(shot.frames.length - 2, Math.floor(time * 180)));
    const a = shot.frames[index], b = shot.frames[index + 1];
    const f = Math.max(0, Math.min(1, (time - a.t) / (b.t - a.t)));
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f };
  }
  const api = { faces, rotate, makeCube, turn, solved, shotAt, shotResult, simulateShot, sampleShot, ballRadius, rimRadius };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WorldGames = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
