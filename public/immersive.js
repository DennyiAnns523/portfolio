/* Perspective scenes and real-footage visitors for Dennyi's world. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s), G = window.WorldGames;
  function blackHole(stage, calm) {
    stage.querySelectorAll('.singularity,.orbit-line,.orbit-fragment').forEach(el => el.remove());
    const canvas = document.createElement('canvas'); canvas.className = 'blackhole-canvas';
    canvas.setAttribute('role','img'); canvas.setAttribute('aria-label','A black hole with a dark central shadow, a glowing accretion disk, bent light, and a distant star field'); stage.prepend(canvas);
    stage.querySelector('.portal-copy .mono').textContent = 'Passage 01 / the event horizon';
    stage.querySelector('.portal-copy p').textContent = 'A disk of light. A place it can’t escape. Scroll closer.';
    let gl, program, zoom = 1, visible = false, time = 0, last = 0, width = 1, height = 1, context2, renderWidth = 960, frameInterval = 33;
    // Interaction: the camera leans toward the pointer, swallowed stars flare the ring, scrolling spins the disk.
    let look=[0,0],aim=[0,0],flare=0,boost=0,lastProgress=0,fed=0,fxLast=0,nextStray=0,lastDust=0,particles=[],rings=[];
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference:'low-power' });
      if (!gl) throw Error('WebGL unavailable');
      const rendererInfo=gl.getExtension('WEBGL_debug_renderer_info');
      if(rendererInfo&&/swiftshader|llvmpipe|software/i.test(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL))){renderWidth=420;frameInterval=300;}
      const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
      const fs = `precision highp float;
uniform vec2 size;uniform float clock;uniform float zoom;uniform vec2 look;uniform float flare;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
vec3 sky(vec3 d){vec2 uv=vec2(atan(d.x,d.z),asin(clamp(d.y,-1.,1.)));vec3 c=vec3(.005,.006,.014);float neb=noise(uv*4.)*noise(uv*15.);c+=vec3(.025,.014,.036)*neb;for(int j=0;j<2;j++){float scale=j==0?190.:330.;vec2 grid=uv*scale,cell=floor(grid),f=fract(grid)-.5;float h=hash(cell+float(j)*23.);float star=exp(-dot(f,f)*(j==0?330.:600.))*step(.986,h);c+=star*mix(vec3(.52,.65,1.),vec3(1.,.8,.52),h)*(.4+h);}return c;}
vec4 disk(vec3 p){float r=length(p.xz);if(r<2.4||r>8.5)return vec4(0);float a=atan(p.z,p.x);float rot=a+clock*.13/pow(r*.25,1.5);float n=noise(vec2(r*13.,sin(rot)*4.))+noise(vec2(r*37.,cos(rot)*9.))*.4;float bands=.55+.45*sin(r*65.+n*5.+rot*3.);float fade=smoothstep(2.4,2.9,r)*(1.-smoothstep(5.,8.5,r));float hot=pow(2.4/r,1.8);float doppler=.65+.8*smoothstep(-1.,1.,p.x/r);vec3 c=mix(vec3(.95,.18,.028),vec3(1.,.82,.48),hot);c=mix(c,vec3(1.,.97,.85),pow(hot,3.));float light=fade*(.5+n*.5+bands*.4)*doppler;c*=light*(2.+flare*1.4);return vec4(c,clamp(fade*.88,0.,.96));}
void main(){vec2 uv=(gl_FragCoord.xy-size*.5)/min(size.x,size.y);vec3 ro=vec3(look.x*6.,3.5-look.y*3.2,16.);vec3 f=normalize(-ro),right=normalize(cross(f,vec3(0,1,0))),up=cross(right,f);vec3 rd=normalize(f*1.28*zoom+right*uv.x+up*uv.y);vec3 p=ro,col=vec3(0);float transmit=1.;bool captured=false;
for(int i=0;i<128;i++){float r=length(p);if(r<1.16){captured=true;break;}if(r>28.)break;float stepSize=clamp(r*.075,.025,.65);vec3 old=p;rd=normalize(rd-p*(1.55/(r*r*r))*stepSize);p+=rd*stepSize;
if(old.y*p.y<0.){float blend=old.y/(old.y-p.y);vec4 em=disk(mix(old,p,blend));col+=transmit*em.rgb*em.a;transmit*=1.-em.a;}
float ringGlow=exp(-abs(r-1.58)*19.)*(.009+flare*.035);col+=transmit*vec3(1.,.49,.14)*ringGlow;}
if(!captured)col+=sky(rd)*transmit;
col=vec3(1.)-exp(-col*1.25);col=pow(col,vec3(.82));float vignette=1.-.2*length(uv);gl_FragColor=vec4(col*vignette,1.);}`;
      const shader = (type, source) => { const s = gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)); return s; };
      program=gl.createProgram(); gl.attachShader(program,shader(gl.VERTEX_SHADER,vs)); gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);canvas.dataset.renderer='webgl';
    } catch {
      // A readable disk-and-shadow fallback on devices without WebGL.
      if(gl){canvas.width=1;gl=null;}
      const fallback=document.createElement('canvas');fallback.className=canvas.className;fallback.setAttribute('aria-label',canvas.getAttribute('aria-label'));fallback.setAttribute('role','img');canvas.replaceWith(fallback);context2=fallback.getContext('2d');context2.canvas.dataset.renderer='canvas';
    }
    function draw(){
      if(gl){gl.viewport(0,0,width,height);gl.uniform2f(gl.getUniformLocation(program,'size'),width,height);gl.uniform1f(gl.getUniformLocation(program,'clock'),time);gl.uniform1f(gl.getUniformLocation(program,'zoom'),zoom);gl.uniform2f(gl.getUniformLocation(program,'look'),look[0],look[1]);gl.uniform1f(gl.getUniformLocation(program,'flare'),flare);gl.drawArrays(gl.TRIANGLES,0,6);}
      else if(context2){const c=context2,w=c.canvas.width,h=c.canvas.height,r=Math.min(w,h)*.12*zoom;c.fillStyle='#03040a';c.fillRect(0,0,w,h);for(let i=0;i<180;i++){c.fillStyle=`rgba(220,225,255,${.2+(i%5)*.15})`;c.fillRect((i*113.7)%w,(i*i*57.1)%h,1.2,1.2);}c.save();c.translate(w/2,h/2);c.shadowColor='#f3a158';c.shadowBlur=30;c.strokeStyle='#e9ab6d';c.lineWidth=r*.07;c.beginPath();c.ellipse(0,0,r*3,r*.45,-.09,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,r*1.12,0,Math.PI*2);c.stroke();c.shadowBlur=0;c.fillStyle='#010103';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=15;c.beginPath();c.ellipse(0,0,r*3,r*.45,-.09,0,Math.PI);c.stroke();c.restore();}
    }
    const fx=document.createElement('canvas');fx.className='blackhole-fx';fx.setAttribute('aria-hidden','true');(gl?canvas:context2.canvas).after(fx);const fc=fx.getContext('2d');
    const hint=document.createElement('p');hint.className='bh-hint mono';hint.innerHTML='Move to bend the light · tap to feed it a star · <span class="bh-fed">0</span> swallowed';stage.querySelector('.portal-copy').append(hint);
    const fedLabel=hint.querySelector('.bh-fed');
    const holeRadius=()=>.317*Math.min(innerWidth,innerHeight)*zoom;
    const pull=()=>3.2e7*Math.pow(Math.min(innerWidth,innerHeight)/900,3);
    function launch(x,y,kind,spread=0){
      const cx=innerWidth/2,cy=innerHeight/2,dx=x-cx,dy=y-cy,d=Math.max(20,Math.hypot(dx,dy)),v=Math.sqrt(pull()/d)*(kind==='star'?.72:.55+Math.random()*.3),side=Math.random()<.5?1:-1;
      particles.push({x,y,vx:-dy/d*v*side+(Math.random()-.5)*spread,vy:dx/d*v*side+(Math.random()-.5)*spread,kind,trail:[],age:0,hue:Math.random()});
    }
    function stepFx(dt,opacity){
      if(fx.width!==innerWidth||fx.height!==innerHeight){fx.width=innerWidth;fx.height=innerHeight;}
      fx.style.opacity=opacity;fc.clearRect(0,0,fx.width,fx.height);
      const cx=innerWidth/2,cy=innerHeight/2,rh=holeRadius(),k=pull(),now=performance.now();
      if(now>nextStray){nextStray=now+2200+Math.random()*2600;const a=Math.random()*Math.PI*2,d=Math.max(innerWidth,innerHeight)*.62;launch(cx+Math.cos(a)*d,cy+Math.sin(a)*d*.7,'star');}
      particles=particles.filter(p=>{
        // Fixed sub-steps keep the fall identical at any frame rate and stop fast stars skipping the horizon.
        let d=0;for(let left=dt;left>1e-6;left-=1/120){const h=Math.min(1/120,left),dx=cx-p.x,dy=cy-p.y;d=Math.max(8,Math.hypot(dx,dy));const a=k/(d*d);p.vx+=dx/d*a*h;p.vy+=dy/d*a*h;p.vx*=1-h*.6;p.vy*=1-h*1.1;p.x+=p.vx*h;p.y+=p.vy*h;if(d<rh)break;}d=Math.hypot(cx-p.x,cy-p.y);p.age+=dt;
        p.trail.push([p.x,p.y]);if(p.trail.length>(p.kind==='star'?22:9))p.trail.shift();
        if(d<rh*(p.kind==='star'?1:.96)){if(p.kind==='star'){flare=Math.min(1.6,flare+.7);rings.push({t0:now});fed++;fedLabel.textContent=fed;}return false;}
        return p.age<16&&d<Math.max(innerWidth,innerHeight)*1.6;
      });
      fc.save();fc.globalCompositeOperation='lighter';fc.lineCap='round';
      particles.forEach(p=>{
        const d=Math.hypot(cx-p.x,cy-p.y),heat=Math.max(0,Math.min(1,1-(d-rh)/(rh*1.6))),star=p.kind==='star';
        // Near the horizon light reddens and stretches into a streak.
        const col=heat>.5?[255,Math.round(150-heat*80),Math.round(70-heat*50)]:[255,Math.round(236-heat*60),Math.round(205-heat*100)];
        for(let i=1;i<p.trail.length;i++){const t=i/p.trail.length;fc.strokeStyle=`rgba(${col[0]},${col[1]},${col[2]},${(star?.55:.3)*t})`;fc.lineWidth=(star?2.6:1)*t;fc.beginPath();fc.moveTo(p.trail[i-1][0],p.trail[i-1][1]);fc.lineTo(p.trail[i][0],p.trail[i][1]);fc.stroke();}
        if(star){const g=fc.createRadialGradient(p.x,p.y,0,p.x,p.y,9);g.addColorStop(0,`rgba(255,250,235,.95)`);g.addColorStop(.35,`rgba(${col[0]},${col[1]},${col[2]},.55)`);g.addColorStop(1,'rgba(255,180,110,0)');fc.fillStyle=g;fc.beginPath();fc.arc(p.x,p.y,9,0,Math.PI*2);fc.fill();}
      });
      rings=rings.filter(ring=>now-ring.t0<900);rings.forEach(ring=>{const t=(now-ring.t0)/900;fc.strokeStyle=`rgba(255,214,160,${(1-t)*.8})`;fc.lineWidth=4*(1-t)+1;fc.beginPath();fc.arc(cx,cy,rh*(1.04+t*.55),0,Math.PI*2);fc.stroke();});
      fc.restore();
    }
    const ignored='a,button,input,textarea,select,label,dialog,.arrival-stage,.experiment,.chapter-tabs,.cat-roamer,.roamer-toggle';
    const feedable=()=>visible&&!calm()&&!document.hidden&&Number((gl?canvas:context2.canvas).style.opacity)>.6&&stage.getBoundingClientRect().bottom>innerHeight*.5;
    addEventListener('pointermove',e=>{
      if(!feedable())return;aim=[Math.max(-1,Math.min(1,(e.clientX/innerWidth-.5)*2)),Math.max(-1,Math.min(1,(e.clientY/innerHeight-.5)*2))];
      const now=performance.now();if(now-lastDust>55&&particles.length<160){lastDust=now;launch(e.clientX,e.clientY,'dust',40);}
    },{passive:true});
    document.addEventListener('pointerleave',()=>{aim=[0,0];});
    addEventListener('click',e=>{
      if(!feedable()||e.target.closest?.(ignored))return;
      launch(e.clientX,e.clientY,'star');for(let i=0;i<10;i++)launch(e.clientX+(Math.random()-.5)*30,e.clientY+(Math.random()-.5)*30,'dust',120);
    });
    function resize(){const c=gl?canvas:context2.canvas;const r=stage.getBoundingClientRect();const ratio=Math.min(1,renderWidth/Math.max(1,r.width));width=Math.max(1,Math.round(r.width*ratio));height=Math.max(1,Math.round(r.height*ratio));c.width=width;c.height=height;draw();}
    const observer=new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)draw();});observer.observe(stage);
    function frame(ts){const opacity=Number((gl?canvas:context2.canvas).style.opacity),active=visible&&opacity>.02&&!document.hidden&&!calm(),dt=Math.min((ts-(fxLast||ts))/1000,.1);fxLast=ts;
      if(active){const e=Math.min(1,dt*2.5);look[0]+=(aim[0]-look[0])*e;look[1]+=(aim[1]-look[1])*e;flare*=Math.pow(.2,dt);boost*=Math.pow(.12,dt);stepFx(dt,opacity);}
      else if(particles.length||rings.length){particles=[];rings=[];fc.clearRect(0,0,fx.width,fx.height);}
      if(active&&ts-last>frameInterval){time+=Math.min((ts-last)/1000,.35)*(1+Math.min(boost,4));last=ts;draw();}requestAnimationFrame(frame);}requestAnimationFrame(frame);
    new ResizeObserver(resize).observe(stage);resize();
    return { update(progress){boost+=Math.abs(progress-lastProgress)*40;lastProgress=progress;zoom=calm()?1:1+Math.pow(progress,3)*16;stage.style.setProperty('--passage-progress',progress);stage.querySelector('.portal-copy').style.opacity=calm()?1:Math.max(0,1-Math.max(0,progress-.65)*4);if(visible)draw();} };
  }

  const cat = window.WorldFlow.cat;

  function court(calm){
    const canvas=$('#court-canvas'),c=canvas.getContext('2d');
    canvas.setAttribute('aria-label','Perspective basketball court. Drag the backboard sideways to move the hoop, or use the hoop controls below.');canvas.tabIndex=0;
    $('.court-caption').textContent='Drag from the ball toward the hoop. Release to shoot.';
    $('#shot-aim').min=-24;$('#shot-aim').max=24;$('#shot-aim').step=.5;$('#shot-aim').value=0;
    $('#shot-power').value=60;$('#shot-power').step=.5;$('#power-value').textContent='60%';
    $('.shot-controls').insertAdjacentHTML('beforebegin',`<div class="hoop-controls"><label class="range-field"><span>Hoop position <output id="hoop-x-value">Center</output></span><input id="hoop-x" type="range" min="-1.5" max="1.5" step=".05" value="0" aria-label="Hoop horizontal position"></label><label class="range-field"><span>Distance <output id="hoop-distance-value">4.6 m</output></span><input id="hoop-distance" type="range" min="3.5" max="5.8" step=".1" value="4.6" aria-label="Hoop distance"></label></div>`);
    $('#shoot').insertAdjacentHTML('afterend','<button class="game-btn" id="court-view">Expand court ⤢</button>');
    let hoop={x:0,y:3.05,z:4.6},active=null,shots=0,baskets=0,streak=0,frame=0,impactTimer,dragging=null;
    // Third-person camera: behind and a little above the shooter, over the right shoulder, leaning with the pointer.
    let courtHi=0,view=null,lean={x:0,y:0},leanAim={x:0,y:0},lastDraw=0,cheer=null,crowd=null;
    function setCamera(){
      const sp=rest(),tall=canvas.height>800,dx=hoop.x-sp.x,dz=hoop.z-sp.z,len=Math.hypot(dx,dz)||1,ux=dx/len,uz=dz/len;
      const back=tall?6.4:7.5,eye={x:sp.x-ux*back+uz*.5+lean.x*.8,y:(tall?4.1:4.6)-lean.y*.45,z:sp.z-uz*back-ux*.5};
      const look={x:sp.x+dx*.5,y:tall?1.55:1.9,z:sp.z+dz*.5};let fx=look.x-eye.x,fy=look.y-eye.y,fz=look.z-eye.z;const fl=Math.hypot(fx,fy,fz);fx/=fl;fy/=fl;fz/=fl;
      const rl=Math.hypot(fz,fx)||1,rx=fz/rl,rz=-fx/rl,upx=fy*rz,upy=fz*rx-fx*rz,upz=-fy*rx;
      view={eye,f:[fx,fy,fz],r:[rx,0,rz],u:[upx,upy,upz],F:tall?660:720,cy:canvas.height*(tall?.5:.44)};
    }
    function toCam(p){const d=[p.x-view.eye.x,p.y-view.eye.y,p.z-view.eye.z];return{x:d[0]*view.r[0]+d[2]*view.r[2],y:d[0]*view.u[0]+d[1]*view.u[1]+d[2]*view.u[2],z:d[0]*view.f[0]+d[1]*view.f[1]+d[2]*view.f[2]};}
    const fromCam=q=>{const z=Math.max(.05,q.z);return{x:400+q.x*view.F/z,y:view.cy-q.y*view.F/z,s:view.F/z,z:q.z};};
    const proj=p=>{if(!view)setCamera();return fromCam(toCam(p));};
    // Clip against the near plane so the floor and lines behind the camera never fold onto the screen.
    function clipped(points,closed){const q=points.map(toCam),out=[],near=.25,n=q.length;
      for(let i=0;i<(closed?n:n-1);i++){const a=q[i],b=q[(i+1)%n];if(a.z>=near)out.push(a);if((a.z>=near)!==(b.z>=near)){const t=(near-a.z)/(b.z-a.z);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:near});}}
      if(!closed&&q[n-1].z>=near)out.push(q[n-1]);return out.map(fromCam);}
    const tone=(hex,f)=>{const n=parseInt(hex.slice(1,7),16);return'#'+[n>>16,n>>8&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v*f))).toString(16).padStart(2,'0')).join('');};
    const area=$('#free-throws .game-area'),article=$('#free-throws');
    article.append($('#free-throws .scoreboard'));$('#free-throws .story h3').after($('#shot-status'));
    area.insertAdjacentHTML('beforeend','<button class="ball-hitbox" aria-label="Drag the basketball toward the hoop and release to shoot. Press Enter for a shot." title="Drag to shoot"></button><button class="hoop-hitbox" aria-label="Drag to move the hoop. Arrow keys move it left and right." title="Drag to move hoop"></button><div class="court-distance"><button id="hoop-nearer" aria-label="Move hoop nearer">−</button><span id="court-distance-readout">4.6 m</span><button id="hoop-further" aria-label="Move hoop further">+</button></div>');
    const ballTarget=$('.ball-hitbox'),hoopTarget=$('.hoop-hitbox');
    // The scene bridges carry the resting ball in and out of the court, so they can hide it here.
    let ballHidden=false;
    // Spots are floor positions in court metres, all kept inside the camera's view.
    const spots=[{x:0,z:0,name:'Free-throw line'},{x:-1,z:.6,name:'Left elbow'},{x:1,z:.6,name:'Right elbow'},{x:-1.35,z:1.7,name:'Left block'},{x:1.35,z:1.7,name:'Right block'},{x:-.6,z:-.5,name:'Top of the key, left'},{x:.6,z:-.5,name:'Top of the key, right'},{x:0,z:1.2,name:'Short jumper'}];
    let spotIndex=0,spot=spots[0],move=null;
    function rest(){if(!move)return{x:spot.x,y:1.8,z:spot.z};const t=Math.min(1,(performance.now()-move.t0)/700),e=t*t*(3-2*t);
      // The ball dribbles across: two bounces on the way to the new spot.
      return{x:move.from.x+(spot.x-move.from.x)*e,y:1.8-Math.abs(Math.sin(t*Math.PI*2))*.55,z:move.from.z+(spot.z-move.from.z)*e};}
    const baseAim=()=>Math.atan2(hoop.x-spot.x,hoop.z-spot.z)*180/Math.PI;
    // Simulate from the spot, relative to it, then shift back into court space so drawing and scoring agree.
    function simulate(aim,power){const sim=G.simulateShot(aim+baseAim(),power,{...hoop,x:hoop.x-spot.x,z:hoop.z-spot.z});sim.frames=sim.frames.map(f=>({...f,x:f.x+spot.x,z:f.z+spot.z}));sim.hoop={...hoop};return sim;}
    const spotDistance=()=>Math.hypot(hoop.x-spot.x,hoop.z-spot.z).toFixed(1)+' m';
    function goTo(index,animate){const from=rest();spotIndex=index;spot=spots[index];$('#court-distance-readout').textContent=spotDistance();
      if(!animate||calm()){move=null;draw();return;}move={from,t0:performance.now()};lock(true);
      const step=()=>{draw();if(performance.now()-move.t0<700)requestAnimationFrame(step);else{move=null;lock(false);draw();}};requestAnimationFrame(step);}
    // A fixed tour around the key, so every spot comes up and the order is learnable.
    function nextSpot(){const i=(spotIndex+1)%spots.length;goTo(i,true);return spots[i];}
    canvas.setAttribute('aria-label','A basketball arena seen from behind a small blocky figure of Dennyi holding the ball. Drag the ball to shoot, or the backboard to reposition it. Keyboard: arrows aim and change power, Space shoots.');
    function stroke(points,color,width=1){const q=clipped(points,false);if(q.length<2)return;c.beginPath();q.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
    function polygon(points,fill,outline){const q=clipped(points,true);if(q.length<3)return;c.beginPath();q.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();if(outline){c.strokeStyle=outline;c.lineWidth=2;c.stroke();}}
    function basketball(p,t=0){const q=proj(p),r=G.ballRadius*q.s;c.save();c.translate(q.x,q.y);c.rotate(t*1.7);const g=c.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r);g.addColorStop(0,'#f7bb69');g.addColorStop(.45,'#d78836');g.addColorStop(.85,'#aa4d1d');g.addColorStop(1,'#642b15');c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.save();c.clip();c.fillStyle='#47291945';for(let i=0;i<180;i++){const a=i*2.399,rr=Math.sqrt(i/180)*r;c.beginPath();c.arc(Math.cos(a)*rr,Math.sin(a)*rr,Math.max(.3,r*.013),0,Math.PI*2);c.fill();}c.strokeStyle='#3e271c';c.lineWidth=Math.max(1,r*.045);c.beginPath();c.moveTo(-r,0);c.lineTo(r,0);c.moveTo(0,-r);c.bezierCurveTo(r*.5,-r*.3,r*.5,r*.3,0,r);c.moveTo(-r*.6,-r);c.bezierCurveTo(r*.5,-r*.5,-r*.7,r*.6,r*.5,r);c.stroke();c.restore();c.strokeStyle='#4d2b20';c.lineWidth=1;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();c.restore();}
    // Seats and fans, generated once; positions are relative to the baseline so they follow the hoop.
    function seatCrowd(){const people=[],pick=(i,n)=>Math.floor(Math.abs(Math.sin(i*12.9898)*43758.5453)%1*n),skins=['#f0cfb0','#d9a47c','#b27a55','#8a5a3d','#f5dcc4'],shirts=['#ed8456','#9a87ab','#f2d27a','#e9dfc8','#5b7fa6','#c8467f','#6f8a5f','#f6f3ec'];let i=0;
      for(let row=0;row<11;row++)for(let x=-12;x<=12;x+=.58){if(pick(i,10)>0)people.push({side:0,row,x:x+(row%2)*.31,dz:3.6+row*.9,y:.6+row*.55,skin:skins[pick(i+3,5)],shirt:shirts[pick(i+7,8)],phase:pick(i+11,100)/16});i++;}
      for(const sx of [-1,1])for(let row=0;row<7;row++)for(let z=-7;z<=1.8;z+=.66){if(pick(i,9)>0)people.push({side:sx,row,x:sx*(9.4+row*.9),dz:z+(row%2)*.33,y:.6+row*.55,skin:skins[pick(i+3,5)],shirt:shirts[pick(i+7,8)],phase:pick(i+11,100)/16});i++;}
      return people;}
    function stands(now,base){
      crowd||=seatCrowd();const excite=cheer?Math.max(0,1-(now-cheer.t0)/(cheer.kind==='score'?2600:1600)):0,sec=now/1000;
      // Tiered concrete bowl: behind the baseline, then both sidelines.
      for(let row=10;row>=0;row--){const z=base+3.6+row*.9,y=.6+row*.55;polygon([{x:-13,y:y-.55,z},{x:13,y:y-.55,z},{x:13,y,z},{x:-13,y,z}],row%2?'#141a25':'#171e2b');polygon([{x:-13,y,z},{x:13,y,z},{x:13,y,z:z+.9},{x:-13,y,z:z+.9}],'#1a2130');}
      for(const sx of [-1,1])for(let row=6;row>=0;row--){const x=sx*(9.4+row*.9),y=.6+row*.55;polygon([{x,y:y-.55,z:-8},{x,y:y-.55,z:base+3.6},{x,y,z:base+3.6},{x,y,z:-8}],row%2?'#131925':'#161d2a');polygon([{x,y,z:-8},{x,y,z:base+3.6},{x:x+sx*.9,y,z:base+3.6},{x:x+sx*.9,y,z:-8}],'#192030');}
      const fans=crowd.map(p=>{const w={x:p.side?p.x:hoop.x*.3+p.x,y:p.y,z:p.side?p.dz:base+p.dz};const q=proj({x:w.x,y:w.y+.3,z:w.z});return{p,q};}).filter(o=>o.q.z>.4).sort((a,b)=>b.q.z-a.q.z);
      fans.forEach(({p,q})=>{
        // Fans sway at rest; a basket sends a wave around the bowl, a miss slumps them.
        const wave=cheer?.kind==='score'?Math.max(0,Math.sin(sec*9-(p.side?p.dz:p.x)*.55))*excite:0,idle=Math.sin(sec*1.3+p.phase)*.012,slump=cheer?.kind==='miss'?-.06*excite:0;
        const lift=(wave*.28+idle+slump)*q.s,bw=.28*q.s,bh=.3*q.s,hr=.085*q.s,dim=.34+excite*.3;if(q.s<2)return;
        c.fillStyle=tone(p.shirt,dim);c.fillRect(q.x-bw/2,q.y-bh/2-lift,bw,bh);
        c.fillStyle=tone(p.skin,dim+.06);c.beginPath();c.arc(q.x,q.y-bh/2-hr*.9-lift,hr,0,Math.PI*2);c.fill();
        if(wave>.35){c.strokeStyle=tone(p.skin,.7);c.lineWidth=Math.max(1,q.s*.05);c.beginPath();c.moveTo(q.x-bw*.45,q.y-bh*.4-lift);c.lineTo(q.x-bw*.7,q.y-bh*1.3-lift);c.moveTo(q.x+bw*.45,q.y-bh*.4-lift);c.lineTo(q.x+bw*.7,q.y-bh*1.3-lift);c.stroke();}
        if(cheer?.kind==='score'&&excite>.2&&(p.phase*97+Math.floor(sec*8))%23<.35){c.fillStyle='#fffbe8';c.beginPath();c.arc(q.x,q.y-bh-lift,Math.max(1.5,q.s*.05),0,Math.PI*2);c.fill();}
      });
      return excite;}
    function jumbotron(base,excite,now){
      const x=hoop.x,y=5.9,z=base+3.4,w=1.5,hh=.7,corners=[{x:x-w,y:y-hh,z},{x:x+w,y:y-hh,z},{x:x+w,y:y+hh,z},{x:x-w,y:y+hh,z}];
      stroke([{x:x-.9,y:y+hh,z},{x:x-.9,y:11,z}],'#2b3444',2);stroke([{x:x+.9,y:y+hh,z},{x:x+.9,y:11,z}],'#2b3444',2);
      polygon(corners,'#0a0d12','#3a4557');const q=proj({x,y,z});if(q.z<.4)return;
      const flash=cheer?.kind==='score'&&excite>0&&Math.floor(now/140)%2,label=flash?(streak>1?streak+' IN A ROW':'SWISH!'):cheer?.kind==='miss'&&excite>0?'SO CLOSE':'DENNYI · HOME';
      c.textAlign='center';c.textBaseline='middle';c.fillStyle=flash?'#fff1c9':'#ed8456';c.font=`${Math.max(7,q.s*.24)}px "Space Mono",monospace`;c.fillText(label,q.x,q.y-q.s*.32);
      c.fillStyle='#f2d27a';c.font=`${Math.max(9,q.s*.42)}px "Space Mono",monospace`;c.fillText(`${baskets} / ${shots}`,q.x,q.y+q.s*.28);c.textAlign='start';c.textBaseline='alphabetic';}
    function beams(now,ball){
      // Ceiling spotlights sweep slowly; one follows the ball while it is in the air.
      const sec=now/1000,targets=[{x:hoop.x-2.5+Math.sin(sec*.4)*2,z:hoop.z-1+Math.cos(sec*.3)*2},{x:hoop.x+2.5+Math.sin(sec*.35+2)*2,z:hoop.z-2+Math.cos(sec*.45)*2},active?{x:ball.x,z:ball.z}:{x:spot.x+Math.sin(sec*.6)*.4,z:spot.z}];
      c.save();c.globalCompositeOperation='lighter';
      targets.forEach((t,i)=>{const q=proj({x:t.x,y:0,z:t.z});if(q.z<.4)return;const top=[160+i*240,-30],rad=Math.max(24,q.s*1.3);
        const g=c.createLinearGradient(top[0],top[1],q.x,q.y);g.addColorStop(0,'rgba(255,236,196,.16)');g.addColorStop(1,'rgba(255,226,170,.03)');c.fillStyle=g;c.beginPath();c.moveTo(top[0]-8,top[1]);c.lineTo(top[0]+8,top[1]);c.lineTo(q.x+rad,q.y);c.lineTo(q.x-rad,q.y);c.closePath();c.fill();
        const pool=c.createRadialGradient(q.x,q.y,0,q.x,q.y,rad);pool.addColorStop(0,'rgba(255,232,186,.22)');pool.addColorStop(1,'rgba(255,232,186,0)');c.fillStyle=pool;c.save();c.translate(q.x,q.y);c.scale(1,.32);c.beginPath();c.arc(0,0,rad,0,Math.PI*2);c.restore();c.fill();});
      c.restore();}
    function floor(h,base,now){
      polygon([{x:-13,y:0,z:-9},{x:13,y:0,z:-9},{x:13,y:0,z:base+3.6},{x:-13,y:0,z:base+3.6}],'#1c1612');
      polygon([{x:-7.5,y:0,z:-9},{x:7.5,y:0,z:-9},{x:7.5,y:0,z:base},{x:-7.5,y:0,z:base}],'#b8864f');
      for(let x=-7.5;x<7.5;x+=.3)stroke([{x,y:.001,z:-9},{x,y:.001,z:base}],Math.round(x*10)%2?'#8f633826':'#e8bf8424',1);
      const ft=h.z-4.6,paint='#5b3b69a6',ink='#f4efe6d9';
      polygon([{x:h.x-2.45,y:.003,z:ft},{x:h.x+2.45,y:.003,z:ft},{x:h.x+2.45,y:.003,z:base},{x:h.x-2.45,y:.003,z:base}],paint);
      stroke([{x:-7.5,y:.005,z:base},{x:7.5,y:.005,z:base}],ink,2);stroke([{x:-7.5,y:.005,z:-9},{x:-7.5,y:.005,z:base}],ink,2);stroke([{x:7.5,y:.005,z:-9},{x:7.5,y:.005,z:base}],ink,2);
      stroke([{x:h.x-2.45,y:.005,z:base},{x:h.x-2.45,y:.005,z:ft},{x:h.x+2.45,y:.005,z:ft},{x:h.x+2.45,y:.005,z:base}],ink,2);
      const ring=(cx,cz,rad,a0,a1,dash)=>{const pts=[];for(let i=0;i<=48;i++){const a=a0+(a1-a0)*i/48;pts.push({x:cx+Math.cos(a)*rad,y:.005,z:cz+Math.sin(a)*rad});}if(dash)c.setLineDash([6,8]);stroke(pts,ink,2);c.setLineDash([]);};
      ring(h.x,ft,1.8,Math.PI,Math.PI*2,false);ring(h.x,ft,1.8,0,Math.PI,true);ring(h.x,h.z,1.25,Math.PI,Math.PI*2,false);
      const arcR=6.75,edge=Math.acos(Math.min(1,6.6/arcR));ring(h.x,h.z,arcR,Math.PI+edge,Math.PI*2-edge,false);
      const cornerZ=h.z-Math.sin(edge)*arcR;stroke([{x:h.x-6.6,y:.005,z:base},{x:h.x-6.6,y:.005,z:cornerZ}],ink,2);stroke([{x:h.x+6.6,y:.005,z:base},{x:h.x+6.6,y:.005,z:cornerZ}],ink,2);
      // Every shooting spot on the tour is marked; the current one pulses.
      spots.forEach((sp,i)=>{const cur=i===spotIndex,pts=[];for(let k=0;k<=24;k++){const a=k/24*Math.PI*2;pts.push({x:sp.x+Math.cos(a)*(cur?.34+Math.sin(now/260)*.04:.16),y:.006,z:sp.z+Math.sin(a)*(cur?.34+Math.sin(now/260)*.04:.16)});}stroke(pts,cur?'#f2d27a':'#f4efe655',cur?2.5:1.5);});
      const gloss=c.createLinearGradient(0,proj({x:0,y:0,z:base}).y,0,canvas.height);gloss.addColorStop(0,'#ffe3b000');gloss.addColorStop(1,'#ffe3b014');c.fillStyle=gloss;c.fillRect(0,0,800,canvas.height);
    }
    // Faceted boxes in a local frame (x right, z toward the hoop), with back faces culled.
    function box(objects,o,lx,ly,lz,w,hh,d,color){
      const cs=Math.cos(o.yaw),sn=Math.sin(o.yaw),P=v=>({x:o.x+v[0]*cs+v[2]*sn,y:o.y+v[1],z:o.z-v[0]*sn+v[2]*cs}),x0=lx-w/2,x1=lx+w/2,z0=lz-d/2,z1=lz+d/2,y0=ly,y1=ly+hh;
      [[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],0,0,1],[[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],0,0,-1],[[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],1,0,0],[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],-1,0,0],[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],0,1,0]].forEach(f=>{
        const pts=f.slice(0,4).map(P),n={x:f[3+1]*cs+f[6]*sn,y:f[5],z:-f[4]*sn+f[6]*cs},m=pts.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4,z:a.z+p.z/4}),{x:0,y:0,z:0});
        if(n.x*(view.eye.x-m.x)+n.y*(view.eye.y-m.y)+n.z*(view.eye.z-m.z)<=0)return;
        const lit=n.y?1.08:.8+.2*(-n.x*.45-n.z*.55+.4);objects.push({depth:toCam(m).z,draw:()=>polygon(pts,tone(color,lit))});});}
    function ball3(objects,p,r,color,dz=0){objects.push({depth:toCam(p).z+dz,draw(){const q=proj(p),rr=r*q.s,g=c.createRadialGradient(q.x-rr*.3,q.y-rr*.35,rr*.1,q.x,q.y,rr);g.addColorStop(0,tone(color,1.15));g.addColorStop(.7,color);g.addColorStop(1,tone(color,.7));c.fillStyle=g;c.beginPath();c.arc(q.x,q.y,rr,0,Math.PI*2);c.fill();}});}
    function limb(objects,a,b,width,color){objects.push({depth:(toCam(a).z+toCam(b).z)/2,draw(){const qa=proj(a),qb=proj(b);c.strokeStyle=color;c.lineCap='round';c.lineWidth=Math.max(1.5,width*(qa.s+qb.s)/2);c.beginPath();c.moveTo(qa.x,qa.y);c.lineTo(qb.x,qb.y);c.stroke();}});}
    // Mini me takes the shots: white tee, black striped track pants, cream clogs, bob, glasses and the pink bandana.
    function shooter(objects,t,now){
      const sp=rest(),dx=hoop.x-sp.x,dz=hoop.z-sp.z,len=Math.hypot(dx,dz)||1,yaw=Math.atan2(dx,dz),o={x:sp.x-dx/len*.3,y:0,z:sp.z-dz/len*.3,yaw};
      const walking=!!move,phase=walking?(now-move.t0)/700*Math.PI*4:0,swing=walking?Math.sin(phase):0,raised=walking?0:active?Math.min(1,.7+t*1.5):1;
      const W=(lx,ly,lz)=>({x:o.x+lx*Math.cos(yaw)+lz*Math.sin(yaw),y:ly,z:o.z-lx*Math.sin(yaw)+lz*Math.cos(yaw)});
      const skin='#eccbb0',hair='#1c1a21',tee='#f5f2ea',pants='#24222a',clog='#eee4cb',band='#c8467f';
      box(objects,o,-.11,0,.04+swing*.1,.14,.08,.26,clog);box(objects,o,.11,0,.04-swing*.1,.14,.08,.26,clog);
      box(objects,o,-.11,.07,swing*.08,.19,.56,.22,pants);box(objects,o,.11,.07,-swing*.08,.19,.56,.22,pants);
      box(objects,o,-.207,.08,swing*.08,.012,.54,.04,'#f2efe8');box(objects,o,.207,.08,-swing*.08,.012,.54,.04,'#f2efe8');
      box(objects,o,0,.6,0,.46,.1,.26,pants);box(objects,o,0,.66,0,.5,.48,.3,tee);
      box(objects,o,-.31,.94,0,.15,.18,.22,'#efebe2');box(objects,o,.31,.94,0,.15,.18,.22,'#efebe2');
      // Set-shot pose holds the ball above the forehead; walking lets the arms swing and dribble.
      [-1,1].forEach(side=>{const sh=W(side*.31,1.02,0),down=W(side*.33,.55,-side*swing*.12),up=W(side*.14,1.74,.3),hand={x:down.x+(up.x-down.x)*raised,y:down.y+(up.y-down.y)*raised,z:down.z+(up.z-down.z)*raised},elbow={x:(sh.x+hand.x)/2+Math.sin(yaw+side*Math.PI/2)*.08*raised,y:(sh.y+hand.y)/2,z:(sh.z+hand.z)/2};
        limb(objects,sh,elbow,.1,skin);limb(objects,elbow,hand,.085,skin);ball3(objects,hand,.045,skin);});
      const back=W(0,.9,-.155);objects.push({depth:toCam(back).z-.01,draw(){polygon([W(.24,1.1,-.156),W(.17,1.12,-.156),W(-.25,.68,-.156),W(-.18,.66,-.156)],'#1d1c22');}});
      box(objects,o,0,1.12,0,.13,.09,.13,skin);ball3(objects,W(0,1.36,0),.19,skin);ball3(objects,W(0,1.33,-.045),.19,hair,-.02);
      box(objects,o,-.165,1.17,-.02,.05,.24,.22,hair);box(objects,o,.165,1.17,-.02,.05,.24,.22,hair);
      // The bandana: a band all the way round, a patterned crown, and the knot at the back.
      for(let i=0;i<14;i++){const a=i/14*Math.PI*2,b=(i+1)/14*Math.PI*2,rad=.198,p1=W(Math.sin(a)*rad,1.43,Math.cos(a)*rad),p2=W(Math.sin(b)*rad,1.43,Math.cos(b)*rad),p3=W(Math.sin(b)*rad,1.51,Math.cos(b)*rad),p4=W(Math.sin(a)*rad,1.51,Math.cos(a)*rad),m=W(Math.sin((a+b)/2)*rad,1.47,Math.cos((a+b)/2)*rad),nx=m.x-o.x,nz=m.z-o.z;if(nx*(view.eye.x-m.x)+nz*(view.eye.z-m.z)<=0)continue;objects.push({depth:toCam(m).z-.03,draw:()=>polygon([p1,p2,p3,p4],tone(band,.85+.15*Math.sin(a)))});}
      const crown=W(0,1.37,0);objects.push({depth:toCam(crown).z-.05,draw(){const q=proj(crown),line=proj(W(0,1.47,0)),rr=.2*q.s;c.save();c.beginPath();c.rect(q.x-rr*1.6,q.y-rr*2.2,rr*3.2,line.y-(q.y-rr*2.2));c.clip();const g=c.createRadialGradient(q.x-rr*.3,q.y-rr*.5,rr*.1,q.x,q.y,rr);g.addColorStop(0,'#e068a0');g.addColorStop(.7,band);g.addColorStop(1,'#8e2f5d');c.fillStyle=g;c.beginPath();c.arc(q.x,q.y,rr,0,Math.PI*2);c.fill();c.fillStyle='#f6d6e4aa';for(let i=0;i<7;i++){const a=i*2.4;c.beginPath();c.ellipse(q.x+Math.cos(a)*rr*.5,q.y-rr*.35-Math.abs(Math.sin(a))*rr*.45,rr*.09,rr*.05,a,0,Math.PI*2);c.fill();}c.restore();}});
      ball3(objects,W(0,1.46,-.21),.04,'#b33d71',-.06);limb(objects,W(-.03,1.44,-.22),W(-.06,1.3,-.25),.035,'#b33d71');limb(objects,W(.03,1.44,-.22),W(.07,1.32,-.24),.035,'#b33d71');
      box(objects,o,-.08,1.33,.185,.1,.07,.012,'#17161b');box(objects,o,.08,1.33,.185,.1,.07,.012,'#17161b');
      const feet=proj({x:o.x,y:0,z:o.z});objects.push({depth:feet.z+2,draw(){c.fillStyle='#1a120c55';c.beginPath();c.ellipse(feet.x,feet.y,.42*feet.s,.12*feet.s,0,0,Math.PI*2);c.fill();}});
    }
    function draw(t=0){
      const now=performance.now(),dt=Math.min(.1,(now-(lastDraw||now))/1000);lastDraw=now;
      if(!dragging){lean.x+=(leanAim.x-lean.x)*Math.min(1,dt*3);lean.y+=(leanAim.y-lean.y)*Math.min(1,dt*3);}
      setCamera();
      const H=canvas.height,h=active?active.sim.hoop:hoop,p=active?G.sampleShot(active.sim,t):rest(),base=h.z+1.6;
      c.clearRect(0,0,800,H);const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#06080d');bg.addColorStop(.5,'#101722');bg.addColorStop(1,'#1a1511');c.fillStyle=bg;c.fillRect(0,0,800,H);
      // Ceiling rig: rows of warm lamps.
      for(let x=-9;x<=9;x+=3)for(let z=-4;z<=base+8;z+=3.5){const q=proj({x,y:10.5,z});if(q.z<.5||q.y<-20||q.y>H)continue;const g=c.createRadialGradient(q.x,q.y,0,q.x,q.y,Math.max(3,q.s*.9));g.addColorStop(0,'#fff3d6cc');g.addColorStop(1,'#fff3d600');c.fillStyle=g;c.beginPath();c.arc(q.x,q.y,Math.max(3,q.s*.9),0,Math.PI*2);c.fill();}
      const excite=stands(now,base);jumbotron(base,excite,now);floor(h,base,now);beams(now,p);
      const shadow=proj({x:p.x,y:.008,z:p.z});c.fillStyle='#1a110b55';c.beginPath();c.ellipse(shadow.x,shadow.y,Math.max(3,.18*shadow.s/(1+p.y*.4)),Math.max(1.5,.06*shadow.s/(1+p.y*.4)),0,0,Math.PI*2);c.fill();
      const objects=[];const line=(a,b,color,width)=>objects.push({depth:(toCam(a).z+toCam(b).z)/2,draw:()=>stroke([a,b],color,width)});
      // Stanchion: padded base behind the baseline, steel post and arm, then glass.
      box(objects,{x:h.x,y:0,z:base+.9,yaw:0},0,0,0,.75,.85,.75,'#243044');
      line({x:h.x,y:.85,z:base+.9},{x:h.x,y:3.55,z:base+.9},'#8b98a4',7);line({x:h.x,y:3.5,z:base+.9},{x:h.x,y:h.y+.55,z:h.z+.47},'#8b98a4',7);line({x:h.x,y:3.05,z:base+.9},{x:h.x,y:h.y+.3,z:h.z+.47},'#77838f',4);
      objects.push({depth:toCam({x:h.x,y:h.y+.55,z:h.z+.41}).z,draw(){polygon([{x:h.x-1,y:h.y-.04,z:h.z+.41},{x:h.x+1,y:h.y-.04,z:h.z+.41},{x:h.x+1,y:h.y+1.16,z:h.z+.41},{x:h.x-1,y:h.y+1.16,z:h.z+.41}],'#cfe6e333','#e7eef0');stroke([{x:h.x-.3,y:h.y+.02,z:h.z+.4},{x:h.x-.3,y:h.y+.47,z:h.z+.4},{x:h.x+.3,y:h.y+.47,z:h.z+.4},{x:h.x+.3,y:h.y+.02,z:h.z+.4}],'#f6f3ea',3);stroke([{x:h.x-.85,y:h.y+.1,z:h.z+.4},{x:h.x-.45,y:h.y+1.08,z:h.z+.4}],'#ffffff22',12);stroke([{x:h.x-1,y:h.y+1.16,z:h.z+.41},{x:h.x+1,y:h.y+1.16,z:h.z+.41}],'#ed8456',3);}});
      const netPulse=active&&active.sim.scoreTime&&t>active.sim.scoreTime?Math.sin((t-active.sim.scoreTime)*16)*Math.exp(-(t-active.sim.scoreTime)*4)*.075:0;
      for(let i=0;i<16;i++){
        const a=i/16*Math.PI*2,b=(i+1)/16*Math.PI*2;
        const point=(angle,level)=>({x:h.x+Math.cos(angle)*(G.rimRadius*(1-level)+.16*level)+netPulse*level,y:h.y-.56*level,z:h.z+Math.sin(angle)*(G.rimRadius*(1-level)+.16*level)});
        for(let j=0;j<4;j++){const level=j/4,next=(j+1)/4;line(point(a,level),point(a+.15,next),'#eeeadebb',1.1);line(point(a,level),point(a-.15,next),'#eeeade88',.85);line(point(a,next),point(b,next),'#d7d9d177',.8);}
      }
      for(let i=0;i<64;i++){const a=i/64*Math.PI*2,b=(i+1)/64*Math.PI*2;line({x:h.x+Math.cos(a)*G.rimRadius,y:h.y,z:h.z+Math.sin(a)*G.rimRadius},{x:h.x+Math.cos(b)*G.rimRadius,y:h.y,z:h.z+Math.sin(b)*G.rimRadius},i<32?'#fa9e56':'#c85a2b',4);}
      line({x:h.x,y:h.y,z:h.z+.28},{x:h.x,y:h.y,z:h.z+.43},'#d57436',5);
      shooter(objects,t,now);
      if(active||!ballHidden)objects.push({depth:toCam(p).z-.001,draw:()=>basketball(p,t)});
      objects.sort((a,b)=>b.depth-a.depth).forEach(o=>o.draw());
      if(!active&&!move){const sim=simulate(Number($('#shot-aim').value),Number($('#shot-power').value));for(let i=1;i<11;i++){const q=proj(G.sampleShot(sim,i*.03));c.fillStyle=`rgba(255,234,193,${.65-i*.05})`;c.beginPath();c.arc(q.x,q.y,Math.max(1.5,q.s*.025),0,Math.PI*2);c.fill();}}
      if(now<courtHi&&window.MiniMeHi){const sp=rest(),dx=hoop.x-sp.x,dz=hoop.z-sp.z,len=Math.hypot(dx,dz)||1,q=proj({x:sp.x-dx/len*.3,y:1.98,z:sp.z-dz/len*.3}),b=canvas.getBoundingClientRect();window.MiniMeHi(b.left+q.x*b.width/800,b.top+q.y*b.height/H,Math.max(60,courtHi-now));}
      const vignette=c.createRadialGradient(400,H*.5,120,400,H*.5,Math.max(520,H*.7));vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#02040899');c.fillStyle=vignette;c.fillRect(0,0,800,H);
      const bounds=canvas.getBoundingClientRect(),ballScreen=proj(rest()),boardScreen=proj({x:h.x,y:h.y+.55,z:h.z+.41});
      ballTarget.style.left=ballScreen.x/8+'%';ballTarget.style.top=ballScreen.y/H*100+'%';
      const hitSize=Math.max(58,G.ballRadius*ballScreen.s*2*bounds.width/800);ballTarget.style.width=hitSize+'px';ballTarget.style.height=hitSize+'px';ballTarget.hidden=!!active;
      hoopTarget.style.left=boardScreen.x/8+'%';hoopTarget.style.top=boardScreen.y/H*100+'%';hoopTarget.style.width=Math.max(80,boardScreen.s*2*bounds.width/800)+'px';hoopTarget.style.height=Math.max(60,boardScreen.s*1.2*bounds.width/800)+'px';hoopTarget.disabled=!!active;
      if(dragging?.mode==='ball'){const from=proj(rest());c.strokeStyle='#f0c48c99';c.lineWidth=1.5;c.setLineDash([5,7]);c.beginPath();c.moveTo(from.x,from.y);c.lineTo(dragging.current.x,dragging.current.y);c.stroke();c.setLineDash([]);c.fillStyle='#fae4c5';c.font='12px monospace';c.textAlign='center';c.fillText('RELEASE TO SHOOT',from.x,from.y+55);c.textAlign='start';}
    }
    function scoreUI(){ $('#baskets').textContent=baskets;$('#attempts').textContent=shots;$('#streak').textContent=streak; }
    function lock(value){document.querySelectorAll('#hoop-x,#hoop-distance,#shot-aim,#shot-power,#shoot,#hoop-nearer,#hoop-further').forEach(el=>el.disabled=value);}
    function award(){if(active.awarded||!active.sim.made)return;active.awarded=true;cheer={kind:'score',t0:performance.now()};baskets++;streak++;scoreUI();$('#shot-status').textContent=active.sim.rimHits?'Off the rim… and in. It counts.':streak>1?`${streak} in a row. Clean through the net.`:'Swish. Clean through the net.';}
    function finish(){if(active.sim.made)award();else{streak=0;cheer={kind:'miss',t0:performance.now()};scoreUI();$('#shot-status').textContent=active.sim.rimHits?'Caught the rim. A small adjustment, another try.':active.sim.boardHits?'Off the glass, outside the hoop. Try a softer shot.':'Outside the hoop. Adjust your aim or power.';if(!calm()&&$('#ball-surprise').checked){const el=$('.face-ball');el.classList.remove('impact');void el.offsetWidth;el.classList.add('impact');clearTimeout(impactTimer);impactTimer=setTimeout(()=>el.classList.remove('impact'),1150);}}const sim=active.sim;active=null;lock(false);
      document.dispatchEvent(new CustomEvent(sim.made?'court:score':'court:miss',{detail:{rim:sim.rimHits>0,board:sim.boardHits>0,airball:!sim.rimHits&&!sim.boardHits}}));
      const next=nextSpot(),said=$('#shot-status').textContent;$('#shot-status').textContent=said+' Next: '+next.name.toLowerCase()+', '+spotDistance()+'.';}
    function animate(ts){if(!active)return;if(document.hidden){active.last=ts;frame=requestAnimationFrame(animate);return;}active.t+=Math.min((ts-(active.last||ts))/1000,.035);active.last=ts;if(active.sim.made&&active.t>=active.sim.scoreTime)award();draw(active.t);if(active.t>Math.max(2.15,(active.sim.scoreTime||0)+.85))finish();else frame=requestAnimationFrame(animate);}
    $('#shoot').onclick=()=>{if(active)return;if(move)return;active={sim:simulate(Number($('#shot-aim').value),Number($('#shot-power').value)),t:0,last:0,awarded:false};shots++;scoreUI();lock(true);$('#shot-status').textContent='In the air…';if(calm()){if(active.sim.made)award();finish();}else frame=requestAnimationFrame(animate);};
    $('#reset-court').onclick=()=>{cancelAnimationFrame(frame);active=null;shots=baskets=streak=0;lock(false);scoreUI();clearTimeout(impactTimer);$('.face-ball').classList.remove('impact');draw();goTo(0,false);$('#shot-status').textContent='Fresh session. Move the hoop and find your angle.';};
    function updateHoop(){hoop.x=Number($('#hoop-x').value);hoop.z=Number($('#hoop-distance').value);$('#hoop-x-value').textContent=Math.abs(hoop.x)<.01?'Center':`${Math.abs(hoop.x).toFixed(2)} m ${hoop.x<0?'left':'right'}`;$('#hoop-distance-value').textContent=hoop.z.toFixed(1)+' m';$('#court-distance-readout').textContent=spotDistance();draw();}
    ['#hoop-x','#hoop-distance'].forEach(s=>$(s).addEventListener('input',updateHoop));
    ['aim','power'].forEach(name=>$(`#shot-${name}`).addEventListener('input',e=>{$(`#${name}-value`).textContent=e.target.value+(name==='aim'?'°':'%');if(!active)draw();}));
    function xy(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*800/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
    function startDrag(e,mode){if(active)return;e.preventDefault();const point=xy(e);dragging={mode,start:point,current:point};e.currentTarget.setPointerCapture(e.pointerId);}
    function drag(e){if(!dragging||active)return;e.preventDefault();const point=xy(e);dragging.current=point;
      if(dragging.mode==='hoop'){let x=hoop.x;for(let k=0;k<4;k++){const at=v=>proj({x:v,y:hoop.y+.55,z:hoop.z+.41}).x,slope=(at(x+.05)-at(x))/.05||1;x=Math.max(-1.5,Math.min(1.5,x+(point.x-at(x))/slope));}$('#hoop-x').value=x;updateHoop();}
      else{const dx=point.x-dragging.start.x,dy=dragging.start.y-point.y;$('#shot-aim').value=Math.max(-24,Math.min(24,Math.atan2(dx,Math.max(40,dy))*180/Math.PI*.4));$('#shot-power').value=Math.max(15,Math.min(100,15+Math.max(0,dy)*.38));$('#shot-status').textContent='Aim '+$('#shot-aim').value+'° · lift '+$('#shot-power').value+'%';draw();}}
    function release(e){if(!dragging)return;const shotGesture=dragging.mode==='ball'&&dragging.start.y-dragging.current.y>18;dragging=null;if(e.type!=='pointercancel'&&shotGesture)$('#shoot').click();else draw();}
    [ballTarget,hoopTarget].forEach((target,i)=>{target.addEventListener('pointerdown',e=>startDrag(e,i?'hoop':'ball'));target.addEventListener('pointermove',drag);target.addEventListener('pointerup',release);target.addEventListener('pointercancel',release);});
    ballTarget.addEventListener('keydown',e=>{if(e.key==='Enter'||e.code==='Space'){e.preventDefault();$('#shoot').click();}});
    hoopTarget.addEventListener('keydown',e=>{if(active)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();$('#hoop-x').value=hoop.x+(e.key==='ArrowLeft'?-.1:.1);updateHoop();}});
    canvas.addEventListener('keydown',e=>{if(active)return;if(e.key.startsWith('Arrow')){e.preventDefault();if(e.key==='ArrowLeft')$('#shot-aim').value=Number($('#shot-aim').value)-.5;if(e.key==='ArrowRight')$('#shot-aim').value=Number($('#shot-aim').value)+.5;if(e.key==='ArrowUp')$('#shot-power').value=Number($('#shot-power').value)+.5;if(e.key==='ArrowDown')$('#shot-power').value=Number($('#shot-power').value)-.5;$('#shot-status').textContent='Aim '+$('#shot-aim').value+'° · lift '+$('#shot-power').value+'%';draw();}if(e.code==='Space'){e.preventDefault();$('#shoot').click();}});
    $('#hoop-nearer').onclick=()=>{if(active)return;$('#hoop-distance').value=hoop.z-.1;updateHoop();};$('#hoop-further').onclick=()=>{if(active)return;$('#hoop-distance').value=hoop.z+.1;updateHoop();};
    function fit(){const r=canvas.getBoundingClientRect();canvas.height=Math.max(400,Math.round(800*r.height/Math.max(1,r.width)));draw(active?.t||0);}
    new ResizeObserver(fit).observe(canvas);fit();
    let courtOnScreen=false,lastAmbient=0;new IntersectionObserver(es=>{courtOnScreen=es[0].isIntersecting;},{rootMargin:'40px'}).observe(canvas);
    area.addEventListener('pointermove',e=>{if(dragging)return;const b=canvas.getBoundingClientRect();leanAim={x:Math.max(-1,Math.min(1,((e.clientX-b.left)/b.width-.5)*2)),y:Math.max(-1,Math.min(1,((e.clientY-b.top)/b.height-.5)*2))};});
    area.addEventListener('pointerleave',()=>{leanAim={x:0,y:0};});
    document.addEventListener('cat:arrive',()=>{if(!courtOnScreen||active)return;const r=canvas.getBoundingClientRect();if(r.top>innerHeight*.4||r.bottom<innerHeight*.6)return;courtHi=performance.now()+2800;document.dispatchEvent(new CustomEvent('minime:hi'));draw();});
    function ambient(ts){requestAnimationFrame(ambient);if(!courtOnScreen||document.hidden||calm()||active||move||ts-lastAmbient<33)return;lastAmbient=ts;draw();}requestAnimationFrame(ambient);
    draw();return{busy:()=>!!active,
      setBallHidden(value){value=!!value&&!active;if(ballHidden!==value){ballHidden=value;draw(active?.t||0);}},
      // Resting ball in viewport pixels, read from the live canvas box so it tracks scrolling.
      ballView(){const r=canvas.getBoundingClientRect(),q=proj(rest());return{x:r.left+q.x/800*r.width,y:r.top+q.y/canvas.height*r.height,r:G.ballRadius*q.s/800*r.width};}};
  }
  window.ImmersiveScenes={blackHole,cat,court};
})();
