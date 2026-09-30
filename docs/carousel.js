import {revealMedia} from './loading-effects.js?v=20260930-1';
import {subscribeDeviceTilt} from './device-tilt.js';
import {fadeToWhite} from './page-transition.js?v=20260930-keep-navigation';
import { halftonePhoto } from './halftone.js?v=20260930-loading';
import { titleLayout } from './title-layout.js';
import { loadPortfolio } from './content.js?v=20260930-gallery-links';
const $=s=>document.querySelector(s);
let films=[
 {title:'mixtape / showreel',src:'https://picsum.photos/id/1018/1600/900'},
 {title:'somewhere / away',src:'https://picsum.photos/id/1015/1600/900'},
 {title:'motion / instinct',src:'https://picsum.photos/id/1016/1600/900'},
 {title:'after / hours',src:'https://picsum.photos/id/1043/1600/900'},
 {title:'into / the light',src:'https://picsum.photos/id/1039/1600/900'}
];
const track=$('#film-track'),stage=$('#film-stage'),tilt=$('#film-tilt'),cursor=$('#custom-cursor'),titles=$('.titles');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
let index=0,busy=false,opened=location.hash==='#photos',pendingContent=null;
let navigating=false;
const photosReady=opened?Promise.resolve():new Promise(resolve=>document.addEventListener('films:open',resolve,{once:true}));
stage.addEventListener('click',async event=>{
 const link=event.target.closest('a.film');
 if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();if(busy||navigating)return;navigating=true;busy=true;
 cursor.classList.remove('active');
 if(!reduce){
  const animation=stage.animate([{transform:'scale(1)',opacity:1},{transform:'scale(1.22)',opacity:1,offset:.6},{transform:'scale(1.4)',opacity:0}],{duration:650,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
  await new Promise(resolve=>setTimeout(resolve,300));
  await Promise.all([animation.finished,fadeToWhite()]);
 }
 location.assign(link.href);
});
window.addEventListener('pageshow',()=>{if(navigating){stage.getAnimations().forEach(animation=>animation.cancel());navigating=false;busy=false}});
const wrap=n=>(n+films.length)%films.length;
let tx=0,ty=0,rx=0,ry=0,mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my;
subscribeDeviceTilt(({x,y})=>{tx=x;ty=y});
const duration=reduce?0:950,easing='cubic-bezier(.76,0,.24,1)';
function poses(activeSlot=0){const buttons=[...titles.querySelectorAll('.carousel-title')];return titleLayout(buttons.map(b=>b.offsetWidth),activeSlot+2,16/(innerWidth<=700?30:36))}
function renderTitles(){titles.querySelectorAll('.carousel-title').forEach(e=>e.remove());for(let slot=-2;slot<=2;slot++){const b=document.createElement(slot===0?'a':'button');if(slot!==0)b.type='button';b.className='carousel-title';const film=films[wrap(index+slot)];b.textContent=film.title;if(slot===0)b.href=film.href||['events.html','concerts.html','commercials.html','documentaries.html','food.html'][wrap(index+slot)];b.dataset.slot=slot;b.style.opacity=slot===0?'1':Math.abs(slot)===1?'.22':'0';b.tabIndex=Math.abs(slot)<=1?0:-1;b.setAttribute('aria-hidden',String(Math.abs(slot)>1));b.setAttribute('aria-label',(slot===0?'View ':slot<0?'Previous photo: ':'Next photo: ')+b.textContent);b.onclick=event=>{if(busy){event.preventDefault();return}if(slot!==0){event.preventDefault();change(Math.sign(slot))}};titles.append(b)}const layout=poses();titles.querySelectorAll('.carousel-title').forEach((b,i)=>b.style.transform=layout[i])}
function setTitles(){const prev=films[wrap(index-1)],next=films[wrap(index+1)];$('#gallery-title').textContent=films[index].title;$('#previous').setAttribute('aria-label','Previous photo: '+prev.title);$('#next').setAttribute('aria-label','Next photo: '+next.title)}
function render(){
 track.replaceChildren(...[-1,0,1].map(offset=>makeFilm(wrap(index+offset))));
 Array.from(track.children).forEach((b,i)=>{b.style.transform=`translateX(${(i-1)*110}vw)`;b.tabIndex=i===1?0:-1;b.setAttribute('aria-hidden',String(i!==1))});
 setTitles();renderTitles();
}
function change(direction){
 if(!opened||busy)return;busy=true;
 const animations=Array.from(track.children).map((b,i)=>b.animate([{transform:`translateX(${(i-1)*110}vw)`},{transform:`translateX(${(i-1-direction)*110}vw)`}],{duration,easing,fill:'forwards'}));
 const oldPoses=poses(),newPoses=poses(direction);titles.querySelectorAll('.carousel-title').forEach((b,i)=>{const slot=Number(b.dataset.slot),next=slot-direction;b.animate([{transform:oldPoses[i],opacity:slot===0?1:Math.abs(slot)===1?.22:0},{transform:newPoses[i],opacity:next===0?1:Math.abs(next)===1?.22:0}],{duration,easing,fill:'forwards'})});
 Promise.all(animations.map(a=>a.finished)).then(()=>{
  index=wrap(index+direction);const buttons=Array.from(track.children);
  if(direction===1){buttons[0].remove();track.append(makeFilm(wrap(index+1)))}else{buttons[2].remove();track.prepend(makeFilm(wrap(index-1)))}
  Array.from(track.children).forEach((b,i)=>{b.getAnimations().forEach(a=>a.cancel());b.style.transform=`translateX(${(i-1)*110}vw)`;b.tabIndex=i===1?0:-1;b.setAttribute('aria-hidden',String(i!==1))});
  setTitles();renderTitles();busy=false;
 });
}
function makeFilm(n){
 const button=document.createElement('a'),image=document.createElement('img');
 button.className='film';button.href=films[n].href||['events.html','concerts.html','commercials.html','documentaries.html','food.html'][n];button.onclick=event=>{if(busy)event.preventDefault()};button.setAttribute('aria-label','View '+films[n].title);
 const spinner=document.createElement('span');spinner.className='film-spinner';spinner.setAttribute('role','status');spinner.setAttribute('aria-label','Loading photograph');button.setAttribute('aria-busy','true');
 image.classList.add('halftone-photo');image.alt=films[n].title;image.width=1600;image.height=900;image.decoding='async';image.draggable=false;
 revealMedia(image);button.append(image,spinner);
 const finish=()=>{button.setAttribute('aria-busy','false');spinner.classList.add('is-hidden')};
 image.addEventListener('load',async()=>{try{await image.decode()}catch{}finish()},{once:true});image.addEventListener('error',finish,{once:true});
 const source=films[n].src;
 photosReady.then(()=>halftonePhoto(source)).then(url=>{image.dataset.effect='halftone';image.src=url}).catch(error=>{console.warn('Halftone unavailable for this image:',error);image.src=source});
 return button;
}
$('#previous').onclick=()=>change(-1);$('#next').onclick=()=>change(1);
document.addEventListener('keydown',e=>{if(!opened)return;if(e.key==='ArrowLeft'){e.preventDefault();change(-1)}if(e.key==='ArrowRight'){e.preventDefault();change(1)}});
function cursorMode(kind,label){if(!fine)return;cursor.className='custom-cursor active '+kind;$('.cursor-label').textContent=label}
if(fine){document.body.classList.add('has-custom-cursor');document.addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;if(opened){tx=mx/innerWidth*2-1;ty=my/innerHeight*2-1}});stage.addEventListener('pointerleave',()=>{cursor.classList.remove('active')});for(const [id,label] of [['previous','\u2190'],['next','\u2192']]){$('#'+id).addEventListener('pointerenter',()=>cursorMode('arrow',label));$('#'+id).addEventListener('pointerleave',()=>cursor.classList.remove('active'))}document.addEventListener('pointerleave',()=>cursor.classList.remove('active'))}
let wheelTotal=0,lastWheel=0;
document.addEventListener('wheel',e=>{
 if(!opened||e.ctrlKey)return;
 e.preventDefault();
 const now=performance.now(),delta=(Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX)*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
 if(busy){wheelTotal=0;lastWheel=now;return}
 if(now-lastWheel>180||Math.sign(delta)!==Math.sign(wheelTotal))wheelTotal=0;
 lastWheel=now;wheelTotal+=delta;
 if(Math.abs(wheelTotal)>=45){change(Math.sign(wheelTotal));wheelTotal=0}
},{passive:false});
let touchX=0;stage.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX},{passive:true});stage.addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>45)change(delta<0?1:-1)},{passive:true});
function frame(){requestAnimationFrame(frame);if(pendingContent&&!busy){films=pendingContent;pendingContent=null;render();$('#gallery').dataset.contentSource='cms'}if(!opened||document.hidden)return;rx+=(tx-rx)*.075;ry+=(ty-ry)*.075;cx+=(mx-cx)*.3;cy+=(my-cy)*.3;cursor.style.transform=`translate3d(${cx}px,${cy}px,0)`;if(!reduce){tilt.style.setProperty('--tilt-x',rx*13+'px');tilt.style.setProperty('--tilt-y',ry*8+'px');tilt.style.setProperty('--rotate-x',-ry*9+'deg');tilt.style.setProperty('--rotate-y',rx*13+'deg')}}requestAnimationFrame(frame);
document.addEventListener('films:open',()=>{opened=true;renderTitles()});
document.addEventListener('films:close',()=>{opened=false;wheelTotal=0;cursor.classList.remove('active');tx=ty=0});
render();
window.addEventListener('resize',()=>{if(!busy)renderTitles()});

loadPortfolio().then(items=>{pendingContent=items}).catch(error=>{console.warn('Portfolio content could not be loaded; using fallback photographs.',error);$('#gallery').dataset.contentSource='fallback'});

document.fonts.ready.then(()=>{if(!busy)renderTitles()});
