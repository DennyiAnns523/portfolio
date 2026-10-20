(() => {
  'use strict';
  const $=s=>document.querySelector(s),clamp=x=>Math.max(0,Math.min(1,x));
  const ease=t=>t*t*(3-2*t);
  window.CatCompanion=function(calm,isBusy){
    document.body.insertAdjacentHTML('beforeend','<div class="cat-roamer" hidden><button class="cat-pet" aria-label="Pet the wandering cat"><canvas class="cat-body" aria-hidden="true"></canvas></button><div class="cat-speech" role="status" aria-live="polite" hidden></div><span class="cat-ground-shadow" aria-hidden="true"></span><span class="cat-letter" aria-hidden="true" hidden></span></div><div class="cat-yarn-real" aria-hidden="true" hidden></div><button class="roamer-toggle" id="ambient-cats" aria-pressed="true">Cat visits: on</button>');
    const root=$('.cat-roamer'),button=$('.cat-pet'),canvas=$('.cat-body'),ctx=canvas.getContext('2d'),speech=$('.cat-speech'),yarn=$('.cat-yarn-real'),letter=$('.cat-letter');
    // A note being carried in the cat's mouth: {dropX, dropped, onDrop}.
    let delivery=null,geo=null;
    let timer,frame,bubbleTimer,enabled=true,visiting=false,elapsed=0,last=0,pauseUntil=0,hover=false,behavior='walk',entry='left',direction=1,duration=16000,ground=0,quote=0,returnFocus=null,currentX=0;
    let greeted=false,currentY=0,held=null,flight=null,tilt=0,hopAt=-1e9,suppressClick=false,stroke={dir:0,travel:0,turns:0,at:0},heartAt=0,pendingLine=null,lastCall=-1e9;
    const GRAVITY=2600,HOP=650;
    const atlases={};
    function load(name,url){return new Promise(resolve=>{const image=new Image();image.onload=()=>{
      // Measure each frame's alpha bounds at runtime, keeping paws on one baseline.
      const scratch=document.createElement('canvas');scratch.width=image.width;scratch.height=image.height;const sc=scratch.getContext('2d',{willReadFrequently:true});sc.drawImage(image,0,0);const pixels=sc.getImageData(0,0,image.width,image.height).data;
      const cw=image.width/4,ch=image.height/2,frames=[];
      for(let index=0;index<8;index++){const ox=(index%4)*cw,oy=Math.floor(index/4)*ch;let left=cw,top=ch,right=0,bottom=0;
        for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(pixels[((oy+y)*image.width+ox+x)*4+3]>35){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
        frames.push({x:ox+left,y:oy+top,w:Math.max(1,right-left+1),h:Math.max(1,bottom-top+1)});
      }
      // Fluff: points along each frame's silhouette with their outward normals, so paint() can
      // grow little strands of fur out of the edge.
      frames.forEach(f=>{const a=(x,y)=>pixels[((f.y+y)*image.width+f.x+x)*4+3],pts=[];
        for(let y=2;y<f.h-2;y+=3)for(let x=2;x<f.w-2;x+=3){if(a(x,y)<=35)continue;const nx=a(x-2,y)-a(x+2,y),ny=a(x,y-2)-a(x,y+2),len=Math.hypot(nx,ny);if(len>=120)pts.push([x,y,nx/len,ny/len]);}
        const step=Math.max(1,pts.length/340);f.edges=[];for(let i=0;i<pts.length;i+=step)f.edges.push(pts[Math.floor(i)]);});
      atlases[name]={image,frames,maxWidth:Math.max(...frames.map(f=>f.w)),maxHeight:Math.max(...frames.map(f=>f.h))};resolve(true);
    };image.onerror=()=>resolve(false);image.src=url;});}
    load('walk','/media/black-cat-walk.png').then(ok=>{if(ok)schedule(true);else $('#ambient-cats').textContent='Cat is getting ready';});
    let roll=null;
    function schedule(first=false){clearTimeout(timer);delete root.dataset.nextVisit;if(!enabled||calm()||!atlases.walk)return;const delay=first?10000+Math.random()*12000:35000+Math.random()*50000;root.dataset.nextVisit=String(Date.now()+delay);timer=setTimeout(()=>{if(document.hidden||isBusy()||document.querySelector('dialog[open]')){schedule(true);return;}show();},delay);}
    function stop(){
      // A visit that ends before the note was dropped (Escape, dragged off-screen) still delivers it.
      if(delivery&&!delivery.dropped){const d=delivery;delivery=null;letter.hidden=true;d.onDrop(null);}
      delivery=null;letter.hidden=true;
      cancelAnimationFrame(frame);clearTimeout(bubbleTimer);visiting=false;held=null;flight=null;tilt=0;pendingLine=null;roll=null;canvas.style.transform='';delete root.dataset.rollPhase;root.style.transformOrigin='';root.dataset.handled='false';root.style.setProperty('--counter-tilt','0rad');root.hidden=true;yarn.hidden=true;speech.hidden=true;root.dataset.visiting='false';if(document.activeElement===button&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});schedule();}
    function paint(atlas,index,w,h){
      const f=atlas.frames[Math.min(7,Math.max(0,index))],dpr=Math.min(devicePixelRatio||1,2);
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      const scale=Math.min((w-12)/atlas.maxWidth,(h-16)/atlas.maxHeight),dw=f.w*scale,dh=f.h*scale;
      const ox=(w-dw)/2,oy=h-8-dh;geo={ox,oy,dw,dh,w};
      ctx.save();if(direction<0){ctx.translate(w,0);ctx.scale(-1,1);}
      // A soft dark halo first, then the sprite, then strands of fur swaying out of the outline.
      ctx.shadowColor='rgba(26,22,30,.55)';ctx.shadowBlur=5*dpr;ctx.drawImage(atlas.image,f.x,f.y,f.w,f.h,ox,oy,dw,dh);ctx.shadowBlur=0;
      if(f.edges){const t=performance.now()/1000,fur=Math.max(.8,h/170),dark=new Path2D(),light=new Path2D();
        f.edges.forEach(([ex,ey,nx,ny],i)=>{if(ny>.85)return;const r=Math.abs(Math.sin(i*12.9898)*43758.5453)%1,px=ox+ex*scale,py=oy+ey*scale,len=(1.6+r*2.8)*fur,ang=Math.atan2(ny,nx)+(r-.5)*.9+Math.sin(t*1.7+i*.7)*.14,path=i%4===0?light:dark;
          path.moveTo(px-nx*1.5,py-ny*1.5);path.lineTo(px+Math.cos(ang)*len,py+Math.sin(ang)*len);});
        ctx.lineCap='round';ctx.lineWidth=.9;ctx.strokeStyle='rgba(22,19,25,.9)';ctx.stroke(dark);ctx.strokeStyle='rgba(122,100,88,.55)';ctx.stroke(light);}
      ctx.restore();
      root.dataset.frame=String(index);
    }
    // The roll is choreographed from the walk sprite: crouch, tip onto the back, wriggle with
    // paws in the air, carry on over onto the feet, and pop up. The body curls into a rounder
    // shape while it turns, and lifts so its lowest point stays on the floor.
    function planRoll(w,h){
      const atlas=atlases.walk,scale=Math.min((w-12)/atlas.maxWidth,(h-16)/atlas.maxHeight),bodyH=atlas.maxHeight*scale,bodyW=atlas.maxWidth*scale;
      const speed=(innerWidth+w*2.5)/18000,turn=Math.min(Math.PI*bodyH*.46,innerWidth*.3);
      const from=direction>0?-w-20:innerWidth+20,to=direction>0?innerWidth+w:-w*1.5,mid=innerWidth/2-w/2;
      const start=mid-direction*turn,end=mid+direction*turn;
      const steps=[['in',Math.abs(start-from)/speed],['crouch',420],['over',700],['belly',2300],['back',700],['rise',460],['out',Math.abs(to-end)/speed]];
      let at=0;steps.forEach(s=>{s[2]=at;at+=s[1];});
      return{steps,total:at,speed,turn,from,to,start,mid,end,bodyW,bodyH};
    }
    function rollPose(r,t){
      const step=r.steps.find(s=>t<s[2]+s[1])||r.steps[r.steps.length-1],k=clamp((t-step[2])/step[1]),e=ease(k),d=direction;
      const pose={phase:step[0],x:r.start,angle:0,sx:1,sy:1,lift:0,frame:0};
      if(step[0]==='in'){pose.x=r.from+d*r.speed*(t-step[2]);pose.frame=Math.floor(Math.abs(pose.x-r.from)/(r.bodyW*.19))%8;}
      else if(step[0]==='crouch'){pose.sx=1+.07*e;pose.sy=1-.12*e;}
      else if(step[0]==='over'){pose.x=r.start+d*r.turn*e;pose.angle=d*Math.PI*e;const c=Math.sin(Math.PI*Math.min(1,k*1.4));pose.sx=1.07-.25*c;pose.sy=.88+.07*c;pose.frame=Math.floor(k*4)%8;}
      else if(step[0]==='belly'){
        // Belly up: rock side to side (rolling a little each way) with the paws paddling in the air.
        const rock=Math.sin(performance.now()/1000*Math.PI*2.4)*.2*Math.sin(Math.PI*k);pose.x=r.mid+d*rock*r.bodyH*.46;pose.angle=d*(Math.PI+rock);pose.sx=.9;pose.sy=.97;pose.frame=Math.floor(performance.now()/70)%8;
      }
      else if(step[0]==='back'){pose.x=r.mid+d*r.turn*e;pose.angle=d*(Math.PI+Math.PI*e);const c=Math.sin(Math.PI*Math.min(1,(1-k)*1.4));pose.sx=1-.18*c;pose.sy=.95;pose.frame=Math.floor(k*4)%8;}
      else if(step[0]==='rise'){pose.x=r.end;const up=Math.sin(Math.PI*k);pose.lift=up*r.bodyH*.22;pose.sx=1-.08*up;pose.sy=1+.1*up;}
      else{pose.x=r.end+d*r.speed*(t-step[2]);pose.frame=Math.floor(Math.abs(pose.x-r.end)/(r.bodyW*.19))%8;}
      return pose;
    }
    function dust(){
      if(calm())return;for(let i=0;i<6;i++){const puff=document.createElement('span');puff.className='cat-dust';puff.setAttribute('aria-hidden','true');
        puff.style.left=(30+Math.random()*40)+'%';puff.style.setProperty('--drift',((Math.random()-.5)*90)+'px');puff.style.animationDelay=(i*25)+'ms';root.append(puff);setTimeout(()=>puff.remove(),1000);}
    }
    function animate(ts){
      if(!visiting)return;const dt=last?Math.min(80,ts-last):0;last=ts;
      if(held?.lifted||flight){handle(ts,dt/1000);frame=requestAnimationFrame(animate);return;}
      const resting=hover||performance.now()<pauseUntil||document.hidden;
      if(!resting)elapsed+=dt;
      const w=root.offsetWidth,h=root.offsetHeight;ground=innerHeight-(innerWidth<700?115:85);
      if(behavior==='roll'&&!roll)roll=planRoll(w,h);
      const p=elapsed/(behavior==='roll'?roll.total:duration);if(p>=1){stop();return;}
      const dropPhase=entry==='top'||entry==='bottom'?.18:0,walkP=clamp((p-dropPhase)/(1-dropPhase));
      const from=entry==='left'?-w-20:entry==='right'?innerWidth+20:innerWidth*.5-w*.5;
      const to=direction>0?innerWidth+w:-w*1.5;
      currentX=from+(to-from)*walkP;let y=ground-(h-8);
      if(dropPhase&&p<dropPhase){const t=clamp(p/dropPhase);if(entry==='top')y=(-h-30)+(ground+22)*t*t;else y=innerHeight+20+(ground-(h-8)-innerHeight-20)*ease(t);}
      let distance=Math.abs(currentX-from);
      if(behavior==='roll'){
        const pose=rollPose(roll,elapsed);currentX=pose.x;
        if(root.dataset.rollPhase!==pose.phase){
          if(pose.phase==='over'||pose.phase==='rise')dust();
          if(pose.phase==='belly'&&speech.hidden&&!pendingLine)say(["Belly rub? It’s a trap. Probably.","Look how round I am.","This is my good side. All of them are.","Rub the belly. I dare you."][quote++%4],2200);
        }
        root.dataset.rollPhase=pose.phase;root.dataset.pose=pose.phase==='in'||pose.phase==='out'?'walk':'ground-roll';
        paint(atlases.walk,pose.frame,w,h);
        const a=roll.bodyW*pose.sx/2,b=roll.bodyH*pose.sy/2,reach=Math.hypot(a*Math.sin(pose.angle),b*Math.cos(pose.angle));
        canvas.style.transformOrigin=`50% ${h-8-roll.bodyH/2}px`;
        canvas.style.transform=`translateY(${roll.bodyH/2-reach-pose.lift}px) rotate(${pose.angle}rad) scale(${pose.sx},${pose.sy})`;
      }else{root.dataset.pose='walk';paint(atlases.walk,Math.floor(distance/(w*.055))%8,w,h);}
      if(delivery&&!delivery.dropped){
        if(direction>0?currentX>=delivery.dropX:currentX<=delivery.dropX){
          // Stop, set the note down, and wait a moment beside it before wandering off.
          delivery.dropped=true;const rect=letter.getBoundingClientRect();letter.hidden=true;
          pauseUntil=performance.now()+2600;hop();say(["Mrrp! A note for you.","Special delivery. Paws only.","I carried this all the way here. You’re welcome."][quote++%3],2600);
          delivery.onDrop(rect);
        }else if(geo){
          // Held in the mouth, swinging a little with each step.
          const mx=direction>0?geo.ox+geo.dw*.9:geo.w-(geo.ox+geo.dw*.9)-34,my=geo.oy+geo.dh*.44;
          letter.style.transform=`translate(${mx}px,${my}px) rotate(${(direction>0?-12:12)+Math.sin(distance/18)*7}deg)`;
        }
      }
      const hopT=(performance.now()-hopAt)/HOP;if(hopT>=0&&hopT<1)y-=Math.sin(Math.PI*hopT)*Math.min(90,h*.35);
      currentY=y;root.style.transform=`translate3d(${currentX}px,${y}px,0)`;
      // The first moment the cat is fully on screen, announce it so mini me can say hi.
      if(!greeted&&currentX>0&&currentX<innerWidth-w&&y>0&&y<innerHeight-h*.5){greeted=true;document.dispatchEvent(new CustomEvent('cat:arrive'));}
      if(pendingLine&&currentX>-w*.2&&currentX<innerWidth-w*.8&&y>-h*.2&&y<innerHeight-h*.5){say(pendingLine);pendingLine=null;hop();}
      root.style.setProperty('--speech-shift',`${Math.max(0,Math.min(innerWidth-w,currentX))-currentX}px`);
      root.dataset.entry=entry;root.dataset.grounded=String(p>=dropPhase);
      const shadowOpacity=p<dropPhase?clamp(p/dropPhase)*.18:.18;root.style.setProperty('--shadow-opacity',shadowOpacity);
      if(behavior==='chase'){const ballX=currentX+(direction>0?w*.95:-25);yarn.style.transform=`translate3d(${ballX}px,${-(innerHeight-ground+Math.abs(Math.sin(distance/45))*4)}px,0) rotate(${distance*direction}deg)`;}
      frame=requestAnimationFrame(animate);
    }
    function show(forcedBehavior){if(!atlases.walk||visiting||calm())return;clearTimeout(timer);delete root.dataset.nextVisit;behavior=forcedBehavior||['walk','chase','roll'][Math.floor(Math.random()*3)];entry=['left','right','top','bottom'][Math.floor(Math.random()*(behavior==='roll'?2:4))];roll=null;canvas.style.transform='';delete root.dataset.rollPhase;direction=entry==='left'?1:entry==='right'?-1:Math.random()>.5?1:-1;duration=behavior==='chase'?13000:behavior==='roll'?21000:18000;elapsed=0;last=0;hover=false;pauseUntil=0;visiting=true;greeted=false;returnFocus=document.activeElement;root.dataset.behavior=behavior;root.dataset.visiting='true';root.hidden=false;speech.hidden=true;yarn.hidden=behavior!=='chase';frame=requestAnimationFrame(animate);}
    function say(text,ms=3800){speech.textContent=text;speech.hidden=false;pauseUntil=Math.max(pauseUntil,performance.now()+ms);clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>{speech.hidden=true;},ms);}
    function hop(){hopAt=performance.now();}
    function speak(){
      const center=innerHeight*.5,near=id=>{const r=$(id).getBoundingClientRect();return r.top<center&&r.bottom>center;};
      const lines=near('#free-throws')?["I could make that shot. If I had thumbs.","You shoot. I’ll handle the rebounds. Eventually.","That ball is suspiciously large for yarn."]:near('#tomato-garden')?["I’m supervising the tomatoes. Very important.","Do you grow treats here?","I have inspected this soil. It’s excellent for naps."]:near('.portal-chapter')?["If it fits, I sits. Even in a black hole.","Gravity? I thought we agreed on naps.","Nine lives. Still not going in there."]:["Oh. You found the soft button.","Dennyi said I could wander.","One more head scratch. Then I have very important cat things."];
      speech.textContent=lines[quote++%lines.length];speech.hidden=false;pauseUntil=performance.now()+3800;clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>{speech.hidden=true;},3800);
    }
    function handle(ts,dt){
      const w=root.offsetWidth,h=root.offsetHeight,floor=ground-(h-8);canvas.style.transform='';root.dataset.pose='held';
      if(held){
        // Dangling: the body swings against the direction of travel, and the legs paddle.
        const target=Math.max(-.7,Math.min(.7,-held.vx*.0009));tilt+=(target-tilt)*Math.min(1,dt*9);
        paint(atlases.walk,Math.floor(ts/110)%8,w,h);
      }else{
        flight.vy+=GRAVITY*dt;currentX+=flight.vx*dt;currentY+=flight.vy*dt;tilt*=Math.pow(.02,dt);
        if(currentX<-w*.25){currentX=-w*.25;flight.vx=Math.abs(flight.vx)*.5;}
        if(currentX>innerWidth-w*.75){currentX=innerWidth-w*.75;flight.vx=-Math.abs(flight.vx)*.5;}
        if(currentY>=floor){currentY=floor;if(flight.vy>650){flight.vy*=-.28;flight.vx*=.6;}else land();}
        paint(atlases.walk,0,w,h);
      }
      root.style.transform=`translate3d(${currentX}px,${currentY}px,0) rotate(${tilt}rad)`;root.style.setProperty('--counter-tilt',-tilt+'rad');
    }
    function land(){
      const w=root.offsetWidth;flight=null;tilt=0;root.style.transformOrigin='';root.dataset.handled='false';root.style.setProperty('--counter-tilt','0rad');
      // Carry on walking from the landing spot, the way the cat was last heading.
      behavior='walk';roll=null;delete root.dataset.rollPhase;entry=direction>0?'left':'right';yarn.hidden=true;root.dataset.behavior=behavior;
      const from=direction>0?-w-20:innerWidth+20,to=direction>0?innerWidth+w:-w*1.5;
      elapsed=Math.max(0,Math.min(.95,(currentX-from)/(to-from)))*duration;last=0;
      say(["I meant to do that.","Four paws. Nailed it.","Again? …Fine. Once more.","That was undignified. Do it again."][quote++%4],2600);
    }
    button.addEventListener('pointerdown',e=>{if(!visiting||flight||e.button>0)return;held={id:e.pointerId,sx:e.clientX,sy:e.clientY,ox:e.clientX-currentX,oy:e.clientY-currentY,samples:[[performance.now(),e.clientX,e.clientY]],vx:0,vy:0,lifted:false};button.setPointerCapture(e.pointerId);});
    button.addEventListener('pointermove',e=>{
      if(held&&held.id===e.pointerId){
        if(!held.lifted){if(Math.hypot(e.clientX-held.sx,e.clientY-held.sy)<8)return;held.lifted=true;hover=false;
          root.style.transformOrigin=`${held.ox}px ${held.oy}px`;root.dataset.handled='true';
          say(["Mrrp?!","Hey. Hey. HEY.","I am not a basketball.","This is not in my contract."][quote++%4],1800);}
        const now=performance.now();held.samples.push([now,e.clientX,e.clientY]);held.samples=held.samples.filter(p=>now-p[0]<110);
        const a=held.samples[0],b=held.samples[held.samples.length-1],span=Math.max(16,b[0]-a[0]);held.vx=(b[1]-a[1])/span*1000;held.vy=(b[2]-a[2])/span*1000;
        currentX=e.clientX-held.ox;currentY=e.clientY-held.oy;e.preventDefault();return;}
      if(e.pointerType!=='mouse'||held)return;
      // Stroking: a few quick back-and-forth passes over the cat make it purr.
      const now=performance.now(),dx=e.movementX||0;if(now-stroke.at>900){stroke.turns=0;stroke.travel=0;}stroke.at=now;
      if(Math.sign(dx)&&Math.sign(dx)!==stroke.dir){if(stroke.travel>14)stroke.turns++;stroke.dir=Math.sign(dx);stroke.travel=0;}
      stroke.travel+=Math.abs(dx);if(stroke.turns>=3)purr();
    });
    function release(e){
      if(!held||held.id!==e.pointerId)return;
      if(held.lifted){suppressClick=true;flight={vx:Math.max(-2600,Math.min(2600,held.vx)),vy:Math.max(-2600,Math.min(1800,held.vy))};if(Math.abs(flight.vx)>150)direction=Math.sign(flight.vx);}
      held=null;
    }
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);
    function purr(){
      const now=performance.now();pauseUntil=Math.max(pauseUntil,now+2400);
      if(speech.hidden||!speech.textContent.startsWith('Prr'))say(["Prrrrrrr…","Prrr. Yes. There. Exactly there.","Prrrrr. You may continue."][quote++%3],2400);
      if(now-heartAt<260)return;heartAt=now;
      const heart=document.createElement('span');heart.className='cat-heart';heart.setAttribute('aria-hidden','true');heart.textContent='♥';
      heart.style.left=(30+Math.random()*40)+'%';heart.style.setProperty('--drift',(Math.random()*40-20)+'px');root.append(heart);setTimeout(()=>heart.remove(),1300);
    }
    // The cat notices what you do in each scene, and wanders over if it is not already here.
    function react(lines,gap=40000){
      if(!enabled||calm()||!atlases.walk)return;const line=lines[Math.floor(Math.random()*lines.length)];
      if(visiting){if(!held&&!flight){say(line);hop();}return;}
      if(performance.now()-lastCall<gap)return;lastCall=performance.now();pendingLine=line;show('walk');
    }
    function watch(selector,test,lines){
      const el=$(selector);if(!el)return;let before=el.textContent;
      new MutationObserver(()=>{const now=el.textContent;if(now!==before&&test(before,now))react(lines);before=now;}).observe(el,{childList:true,characterData:true,subtree:true});
    }
    watch('#baskets',(a,b)=>Number(b)>Number(a),["Nothing but net. I’m told that’s good.","Again! Do it again!","I taught you that.","Show-off. I love it."]);
    watch('#cube-state',(a,b)=>a!=='Solved'&&b==='Solved'&&Number($('#cube-count')?.textContent)>0,["You solved it?! I just sit in boxes.","Six faces, one colour. Suspiciously tidy.","Now scramble it so I can watch again."]);
    watch('#harvest-total',(a,b)=>Number(b)>Number(a),["Tomatoes. Hm. Is there tuna in the next update?","I will guard these with my life. Or a nap.","Fresh from the garden. I supervised."]);
    document.addEventListener('minime:hi',()=>setTimeout(()=>{if(visiting&&!held&&!flight){say(["Mrrp. Hi yourself.","Mrrrow. Oh, it’s you.","Hi. Do you have treats?"][quote++%3],2600);hop();}},1100));
    // A miss brings the cat out to gloat, with a line to suit the miss.
    document.addEventListener('court:miss',e=>{const d=e.detail||{};
      react(d.airball?["AIRBALL! Air. Ball.","I’ve coughed up hairballs with a better arc.","Did it even see the hoop?","That’s a new trick. Missing everything."]
        :d.rim?["Ooh, the rim. So close. Not really, though.","The rim says hi. The net says no.","Clang! My favourite sound."]
        :["Off the glass and… nope.","The backboard thanks you for the visit.","Bank shot? More like bonk shot."],15000);});
    button.onclick=()=>{if(suppressClick){suppressClick=false;return;}speak();};button.addEventListener('pointerenter',()=>hover=true);button.addEventListener('pointerleave',()=>hover=false);button.addEventListener('focus',()=>hover=true);button.addEventListener('blur',()=>hover=false);
    $('#summon-cat').textContent='pspsps…';$('#summon-cat').onclick=()=>show('walk');$('#garden-cat').onclick=()=>show('roll');
    $('#ambient-cats').onclick=()=>{enabled=!enabled;$('#ambient-cats').setAttribute('aria-pressed',enabled);$('#ambient-cats').textContent=enabled?'Cat visits: on':'Cat visits: off';if(enabled){show();schedule();}else{stop();clearTimeout(timer);delete root.dataset.nextVisit;}};
    document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);delete root.dataset.nextVisit;}else if(!visiting)schedule(true);});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&visiting)stop();});
    // Walks in carrying a note and drops it mid-screen; onDrop(rect) gets the note's last
    // on-screen box (or null if the visit was cut short). Returns false when the cat can't come
    // (reduced motion, visits switched off, sprite not loaded), so the caller shows the note itself.
    function deliver(onDrop){
      if(!atlases.walk||calm()||!enabled)return false;
      if(visiting)stop();
      clearTimeout(timer);delete root.dataset.nextVisit;
      behavior='deliver';entry='left';direction=1;roll=null;canvas.style.transform='';delete root.dataset.rollPhase;
      duration=17000;elapsed=0;last=0;hover=false;pauseUntil=0;visiting=true;greeted=false;returnFocus=document.activeElement;
      root.dataset.behavior=behavior;root.dataset.visiting='true';root.hidden=false;speech.hidden=true;yarn.hidden=true;letter.hidden=false;
      const w=root.offsetWidth;delivery={dropX:Math.max(16,Math.min(innerWidth*.5-w*.75,innerWidth-w*1.6)),dropped:false,onDrop};
      frame=requestAnimationFrame(animate);return true;
    }
    const api={show,deliver,gentle(){if(calm()){stop();clearTimeout(timer);delete root.dataset.nextVisit;}else if(!visiting)schedule(true);}};
    window.Moriar=api;
    return api;
  };
})();
