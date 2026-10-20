(() => {
  'use strict';
  // One object carries the visitor through the scenes: the black hole's shadow becomes the
  // basketball, the ball folds into the Rubik's cube, and the cube breaks into seeds for the garden.
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t;
  const hex=c=>{const m=/^#?([0-9a-f]{6})/i.exec(c||'');const n=m?parseInt(m[1],16):0x6d4a33;return[n>>16&255,n>>8&255,n&255];};
  const mix=(a,b,t)=>{const p=hex(a),q=hex(b);return`rgb(${p.map((v,i)=>Math.round(v+(q[i]-v)*t)).join(',')})`;};
  const centroid=pts=>pts.reduce((s,p)=>[s[0]+p[0]/pts.length,s[1]+p[1]/pts.length],[0,0]);

  window.SceneBridges=function({court,calm}){
    const canvas=document.createElement('canvas');canvas.className='scene-bridge';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
    const c=canvas.getContext('2d'),cubeCanvas=document.querySelector('#cube-canvas'),soil=document.querySelector('.garden-soil');
    // Fixed per-sticker randomness, so a seed follows the same path when the visitor scrolls back.
    const seeds=Array.from({length:32},(_,i)=>{const a=Math.sin(i*12.9898)*43758.5453;const b=Math.sin(i*78.233)*12543.123;return{u:a-Math.floor(a),v:b-Math.floor(b)};});
    let drawn=false;

    function size(){const d=Math.min(devicePixelRatio||1,1.5),w=Math.round(innerWidth*d),h=Math.round(innerHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}c.setTransform(d,0,0,d,0,0);}
    function clear(){if(drawn){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);drawn=false;}}

    function ball(x,y,r,spin,alpha=1){
      if(alpha<=0||r<=0)return;c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(spin);
      const g=c.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r);g.addColorStop(0,'#f7bb69');g.addColorStop(.45,'#d78836');g.addColorStop(.85,'#aa4d1d');g.addColorStop(1,'#6f2f16');
      c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
      c.strokeStyle='#4a2012';c.lineWidth=Math.max(1,r*.055);c.beginPath();c.moveTo(-r,0);c.lineTo(r,0);c.moveTo(0,-r);c.lineTo(0,r);
      c.moveTo(-r*.62,-r*.78);c.quadraticCurveTo(-r*.18,0,-r*.62,r*.78);c.moveTo(r*.62,-r*.78);c.quadraticCurveTo(r*.18,0,r*.62,r*.78);c.stroke();c.restore();
    }
    function shadow(x,y,r,alpha){
      if(alpha<=0)return;c.save();c.globalAlpha=alpha;c.shadowColor='#f2b46a';c.shadowBlur=r*.5;
      c.strokeStyle='#ffd9a0';c.lineWidth=Math.max(1.5,r*.05);c.beginPath();c.arc(x,y,r*1.04,0,Math.PI*2);c.stroke();
      c.shadowBlur=0;c.fillStyle='#020205';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.restore();
    }
    function sticker(points,color,alpha,line){
      c.save();c.globalAlpha=alpha;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();
      c.fillStyle=color;c.fill();if(line>0){c.strokeStyle='#473b4e';c.lineWidth=line;c.lineJoin='round';c.stroke();}c.restore();
    }
    function cubeBox(stickers){
      let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;stickers.forEach(s=>s.points.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}));
      return{x:(x0+x1)/2,y:(y0+y1)/2,r:Math.max(1,Math.max(x1-x0,y1-y0)/2),scale:cubeCanvas.getBoundingClientRect().width/800};
    }

    function update({y,h,courtY,cubeY,gardenY,exit,inCourt}){
      const cubeStyle=cubeCanvas.style;
      if(calm()){clear();court.setBallHidden(false);cubeStyle.opacity='';return;}
      const cubeRect=cubeCanvas.getBoundingClientRect(),soilRect=soil.getBoundingClientRect();
      const cubeMid=cubeRect.top+y+cubeRect.height/2,soilMid=soilRect.top+y+soilRect.height/2;
      // Scroll windows: arrival into the court, court to cube, cube to garden.
      const arrival=!inCourt&&exit>0?exit:0;
      // A scene stays whole and playable until it is 40% scrolled away; each bridge then finishes by
      // the time the next scene fills the screen, so nothing is left hanging when a scene snaps in.
      const b0=courtY+h*.4,b1=Math.max(b0+h*.3,Math.min(cubeMid-h*.5,cubeY-2)),toCube=clamp((y-b0)/(b1-b0));
      const g0=Math.max(b1+h*.12,cubeY+h*.4),g1=Math.max(g0+h*.3,Math.min(soilMid-h*.62,gardenY-2)),toGarden=clamp((y-g0)/(g1-g0));
      court.setBallHidden(arrival>0||toCube>0);
      cubeStyle.opacity=(toCube>0&&toCube<1)||toGarden>0?'0':'';
      if(!(arrival>0||(toCube>0&&toCube<1)||(toGarden>0&&toGarden<1))){clear();return;}
      size();c.clearRect(0,0,innerWidth,innerHeight);drawn=true;
      const stickers=toCube>0||toGarden>0?(window.CubeScene?.stickers()||[]):[];

      if(arrival>0){
        // The shadow at the black hole's heart shrinks and warms into the ball on the free-throw line.
        const bv=court.ballView(),top=courtY-y,k=smooth(arrival),look=clamp((arrival-.2)/.6);
        const x=lerp(innerWidth/2,bv.x,k),yy=lerp(h/2,bv.y-top,k)-Math.sin(Math.PI*k)*h*.06,r=lerp(Math.min(innerWidth,h)*.16,bv.r,k);
        shadow(x,yy,r,1-look);ball(x,yy,r,(1-k)*5,look);
      }
      if(toCube>0&&toCube<1&&stickers.length){
        // The ball lifts off the court, spins, and its seams straighten into the cube's stickers.
        const bv=court.ballView(),box=cubeBox(stickers),k=smooth(toCube),form=clamp((toCube-.3)/.45);
        const x=lerp(bv.x,box.x,k),yy=lerp(bv.y,box.y,k)-Math.sin(Math.PI*k)*h*.14,r=lerp(bv.r,box.r,k),spin=(1-form)*Math.PI*1.5;
        ball(x,yy,lerp(bv.r,box.r*.5,k),k*9,1-clamp(form*1.8));
        const scale=r/box.r,cos=Math.cos(spin),sin=Math.sin(spin),gather=lerp(.45,1,form);
        stickers.forEach(s=>{const [cx,cy]=centroid(s.points);const pts=s.points.map(([px,py])=>{
          // Stickers start bunched and tumbling, then spread to their faces as the cube forms.
          const lx=(cx-box.x)*gather+(px-cx),ly=(cy-box.y)*gather+(py-cy);return[x+(lx*cos-ly*sin)*scale,yy+(lx*sin+ly*cos)*scale];});
          sticker(pts,s.color,clamp(form*3),4*box.scale*scale*form);});
      }
      if(toGarden>0&&toGarden<1&&stickers.length){
        // The cube comes apart; each sticker tumbles down and settles into the soil as a seed.
        const box=cubeBox(stickers),n=stickers.length,soilX=soilRect.left+soilRect.width/2,soilY=soilRect.top+soilRect.height/2;
        stickers.forEach((s,i)=>{
          const seed=seeds[i%seeds.length],delay=seed.u*.3,u=clamp((toGarden-delay)/.7),fall=u*u;
          const [cx,cy]=centroid(s.points),tx=soilX+(seed.v-.5)*soilRect.width*.7,ty=soilY+(seed.u-.5)*soilRect.height*.45;
          const burst=Math.sin(Math.PI*Math.min(1,u*1.6)),dx=cx-box.x,dy=cy-box.y;
          const x=lerp(cx,tx,fall)+dx*burst*.6,yy=lerp(cy,ty,fall)+dy*burst*.35-Math.sin(Math.PI*u)*h*.05;
          const shrink=lerp(1,.16,smooth(u)),spin=u*(seed.v>.5?1:-1)*Math.PI*(2+i%3),cos=Math.cos(spin),sin=Math.sin(spin);
          const pts=s.points.map(([px,py])=>{const lx=(px-cx)*shrink,ly=(py-cy)*shrink;return[x+lx*cos-ly*sin,yy+lx*sin+ly*cos];});
          const fade=1-clamp((u-.9)/.1);sticker(pts,mix(s.color,'#5a3b27',clamp((u-.45)/.4)),fade,4*box.scale*(1-u));
        });
      }
    }
    addEventListener('resize',()=>{if(drawn)size();});
    return{update};
  };
})();
