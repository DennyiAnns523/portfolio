const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../public/games-core.js');
const signature = cube => JSON.stringify(cube.map(s => ({...s,p:s.p.map(v=>v||0),n:s.n.map(v=>v||0)})));

test('Every face turn has an exact inverse and four turns restore the cube', () => {
  const original = G.makeCube();
  for (const face of Object.keys(G.faces)) {
    assert.equal(signature(G.turn(G.turn(original, face), face, true)), signature(original));
    let cube = original;
    for (let i=0;i<4;i++) cube=G.turn(cube,face);
    assert.equal(signature(cube),signature(original));
    assert.equal(G.solved(G.turn(original,face)),false);
  }
});
test('Mixed moves and reverse history preserve all 54 stickers and solve exactly', () => {
  const original=G.makeCube(), moves=['R','U','F','L','D','B','U','F','R','B'];
  let cube=original;
  for (const face of moves) cube=G.turn(cube,face);
  assert.equal(G.solved(cube),false);
  assert.equal(new Set(cube.map(s => s.p.join(',')+':'+s.n.join(','))).size,54);
  for (const face of [...moves].reverse()) cube=G.turn(cube,face,true);
  assert.equal(signature(cube),signature(original));
  assert.equal(G.solved(cube),true);
});
test('Quarter-turn moves affect adjacent edges, not only face colors', () => {
  const original=G.makeCube(), turned=G.turn(original,'F');
  const changedAdjacent=turned.filter((s,i)=>s.face!=='F' && JSON.stringify(s)!==JSON.stringify(original[i]));
  assert.equal(changedAdjacent.length,12);
});
test('Basketball only scores a descending shot that reaches and clears the rim', () => {
  assert.equal(G.shotResult(0,60).made,false);
  const swish=G.shotResult(0,80);
  assert.equal(swish.made,true);
  assert.ok(Math.abs(G.shotAt(0,80,swish.time).y-160)<.001);
  assert.ok(G.shotAt(0,80,swish.time+.01).y>160);
  assert.equal(G.shotResult(60,80).made,false);
  assert.equal(G.shotResult(-60,80).made,false);
});

test('Perspective shots score only after the whole ball clears the hoop', () => {
  const shot=G.simulateShot(0,60);
  assert.equal(shot.made,true);
  assert.ok(shot.scoreTime>shot.entryTime);
  const entry=G.sampleShot(shot,shot.entryTime),score=G.sampleShot(shot,shot.scoreTime);
  assert.ok(Math.abs(entry.y-shot.hoop.y)<.0001);
  assert.ok(Math.hypot(entry.x-shot.hoop.x,entry.z-shot.hoop.z)+G.ballRadius<G.rimRadius);
  assert.ok(score.y+G.ballRadius<shot.hoop.y);
  assert.equal(G.simulateShot(0,30).made,false);
  assert.equal(G.simulateShot(24,60).made,false);
});
test('Moving the hoop changes the actual target and trajectory never teleports', () => {
  const moved={x:1.2,y:3.05,z:4.6};
  assert.equal(G.simulateShot(0,60,moved).made,false);
  let made=false;
  for(let aim=12;aim<=18;aim+=.5)for(let power=58;power<67;power+=.5)if(G.simulateShot(aim,power,moved).made)made=true;
  assert.ok(made,'A compensated aim can score on the moved hoop');
  for(const power of [30,58,60,65,80]){
    const shot=G.simulateShot(0,power);
    for(let i=1;i<shot.frames.length;i++){
      const a=shot.frames[i-1],b=shot.frames[i];
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.13,'No snapping into the basket');
    }
  }
});
test('Rim and backboard impacts change the simulated flight', () => {
  const rim=G.simulateShot(0,58),board=G.simulateShot(0,80);
  assert.ok(rim.rimHits>0);
  assert.ok(board.boardHits>0);
  assert.ok(rim.floorHits>0);
});
