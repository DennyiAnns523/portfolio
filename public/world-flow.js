(() => {
  'use strict';
  const $=s=>document.querySelector(s), clamp=x=>Math.max(0,Math.min(1,x));
  const cat=window.CatCompanion;
  function init({blackHole,court:courtScene,calm}){
    const hero=$('.world'),portal=$('.portal-chapter'),starCanvas=$('.blackhole-canvas');
    const arrival=document.createElement('section');arrival.className='arrival-chapter';arrival.setAttribute('aria-label','Dennyi’s world, falling into possibility');
    const stage=document.createElement('div');stage.className='arrival-stage';arrival.append(stage);$('.intro').before(arrival);stage.append($('.intro'),hero,$('#fragments'));
    const bridges=courtScene&&window.SceneBridges?window.SceneBridges({court:courtScene,calm}):null;
    const court=$('#free-throws'),iris=document.createElement('div');iris.className='court-iris';iris.setAttribute('aria-hidden','true');
    const irisCanvas=document.createElement('canvas');iris.append(irisCanvas);document.body.append(iris);const irisContext=irisCanvas.getContext('2d');
    const glow=document.createElement('div');glow.className='court-iris-glow';glow.setAttribute('aria-hidden','true');document.body.append(glow);
    const pullTargets=[$('.intro'),$('#scene'),$('.world-label'),$('.coordinates'),$('.hint'),$('.controls'),$('#fragments')];
    const portalTargets=[...document.querySelectorAll('.portal-copy>*'),$('.portal-bottom')];
    function pull(targets,amount,stagger=0){
      targets.forEach(el=>{el.style.translate='none';el.style.scale='none';el.style.rotate='none';});
      const rects=targets.map(el=>el.getBoundingClientRect());
      targets.forEach((el,i)=>{
        const p=calm()?0:smooth(clamp((amount-stagger*i)/Math.max(.1,1-stagger*i))),r=rects[i],cx=r.left+r.width*.5,cy=r.top+r.height*.5;
        const dx=innerWidth*.5-cx,dy=innerHeight*.5-cy,swirl=Math.sin(p*Math.PI)*Math.min(140,innerWidth*.12);
        el.style.translate=`${dx*p+swirl*(i%2?1:-1)}px ${dy*p-swirl*.45}px`;
        el.style.scale=String(Math.max(.002,Math.pow(1-p,2.2)));el.style.rotate=`${p*(i%2?65:-55)}deg`;el.style.opacity=String(1-Math.pow(p,3));el.inert=p>.95;
      });
    }
    const labels=[['signals','Wander into the playground'],['seeds','Leave a thought'],['self','A possible self']];
    labels.forEach(([key,label])=>{$(`[data-door="${key}"] h2`).textContent=label;});
    const links=$$('.chapter-tabs a');links.forEach((a,i)=>a.textContent=['Court','Cube','Garden'][i]);
    $('#gentle-mode').textContent='Gentle motion';
    $('#free-throws').insertAdjacentHTML('beforeend','<a class="scene-wayfinding" href="#cube-room">Untangle something ↓</a>');
    $('#cube-room').insertAdjacentHTML('beforeend','<a class="scene-wayfinding" href="#tomato-garden">Grow something ↓</a>');
    $('#tomato-garden').insertAdjacentHTML('beforeend','<a class="scene-wayfinding" href="#">Back to the beginning ↑</a>');
    function $$(s){return [...document.querySelectorAll(s)];}
    const blend=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
    const smooth=t=>t*t*(3-2*t);
    function update(){
      const y=scrollY,h=innerHeight,portalY=portal.getBoundingClientRect().top+y,arrivalY=arrival.getBoundingClientRect().top+y;
      const start=arrivalY+h*.08,enter=smooth(clamp((y-start)/Math.max(h*.5,arrival.offsetHeight-h-h*.08)));
      const courtY=$('#free-throws').getBoundingClientRect().top+y,cubeY=$('#cube-room').getBoundingClientRect().top+y,gardenY=$('#tomato-garden').getBoundingClientRect().top+y;
      // Anchor jumps can land a fraction of a pixel above the court; treat that as arrived.
      const inCourt=y>=courtY-1;
      const exit=smooth(clamp((y-(courtY-h*.72))/(h*.72)));
      bridges?.update({y,h,courtY,cubeY,gardenY,exit,inCourt});
      const progress=clamp((y-portalY)/Math.max(1,portal.offsetHeight-h*.25));blackHole.update(progress);
      starCanvas.style.opacity=calm()?enter*(1-exit):!inCourt?enter:0;
      starCanvas.style.maskImage=calm()?'none':`radial-gradient(ellipse at 50% 50%,#000 ${enter*85}%,transparent ${20+enter*105}%)`;
      hero.style.opacity='1';hero.style.transform='none';hero.style.filter='none';pull(pullTargets,enter,.045);stage.style.pointerEvents=enter>.95?'none':'';pull(portalTargets,clamp((progress-.05)/.58),.065);
      const reveal=!calm()&&exit>0&&!inCourt,source=$('#court-canvas');
      iris.style.visibility=reveal?'visible':'hidden';glow.style.visibility=reveal?'visible':'hidden';
      if(reveal){
        if(irisCanvas.width!==source.width||irisCanvas.height!==source.height){irisCanvas.width=source.width;irisCanvas.height=source.height;}
        irisContext.drawImage(source,0,0);const radius=Math.hypot(innerWidth,h)*.52*exit;
        iris.style.clipPath=`circle(${radius}px at 50% 50%)`;glow.style.width=radius*2+'px';glow.style.height=radius*2+'px';glow.style.opacity=1-exit;iris.dataset.progress=exit.toFixed(3);
      }else iris.dataset.progress=inCourt?'1':'0';
      court.style.opacity=!calm()&&!inCourt?'0':'1';court.inert=!calm()&&!inCourt;
      let bg=blend(document.body.classList.contains('night')?[36,35,50]:[242,239,231],[3,4,10],enter);
      bg=blend(bg,[16,25,30],exit);bg=blend(bg,[42,30,53],smooth(clamp((y-(cubeY-h*.75))/(h*.85))));bg=blend(bg,[29,48,36],smooth(clamp((y-(gardenY-h*.75))/(h*.85))));
      document.body.style.backgroundColor=`rgb(${bg.join(',')})`;
      const tabsVisible=y>start+h*.25;$('.chapter-tabs').classList.toggle('visible',tabsVisible);document.body.classList.toggle('tabs-visible',tabsVisible);
      const courtRect=$('#free-throws').getBoundingClientRect(),courtFade=Math.min(clamp((h-courtRect.top)/(h*.45)),clamp((courtRect.bottom)/(h*.5)));
      $('#court-canvas').style.opacity=!inCourt?'1':courtFade;
    }
    addEventListener('resize',update);$('#mood').addEventListener('click',()=>requestAnimationFrame(update));update();
    return{update};
  }
  window.WorldFlow={cat,init};
})();
