import {revealMedia} from './loading-effects.js?v=20260930-1';
import {fadeToWhite} from './page-transition.js?v=20260930-keep-navigation';
import { titleLayout } from './title-layout.js?v=20261001-lower-neighbors';
const $=s=>document.querySelector(s);
const showreel={title:'Mixtape / showreel',video:'1233498726',src:'https://i.vimeocdn.com/video/2209179166-d9ce0801372f55f059a99c1fdf19cef7b28e0c1da5c5f316a0e5cc5e82fcec35-d_1280x720'};
const films=[
 showreel,
 {title:'Favela Campaign Video',video:'1221410122',src:'https://i.vimeocdn.com/video/2194103879-0c44ba7b1866113ac8423cfc762107854fe7ae3f49293101a3c60a04479fbc8b-d_1280x720'},
 {title:'Bred Campaign Film Commercial',video:'1089164404',src:'https://i.vimeocdn.com/video/2021543478-8d61b146e2b2ff2ce632292d16717c24399b9734d4d3a2462a5fa73beb4c1c58-d_1280x720'},
 {title:'Travis Scott Concert',video:'1230719066',src:'https://i.vimeocdn.com/video/2205705188-d40931d67b414f4210092369fe35ec1f3858bdeaa4350d35dd7514d79641febd-d_1280x720'},
 {title:'Club Ocha',video:'1231975351',src:'https://i.vimeocdn.com/video/2207268965-0d37dcec9b30944f69dd61a9608b20316e4c2d2d1465d7ef0e123f6ef12d9e0d-d_1280x720'}
];
const track=$('#film-track'),stage=$('#film-stage'),tilt=$('#film-tilt'),cursor=$('#custom-cursor'),titles=$('.titles');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
let index=0,busy=false,opened=location.hash==='#photos';
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

const duration=reduce?0:950,easing='cubic-bezier(.76,0,.24,1)';
function poses(activeSlot=0){const buttons=[...titles.querySelectorAll('.carousel-title')];return titleLayout(buttons.map(b=>b.offsetWidth),activeSlot+2,16/(innerWidth<=700?30:36))}
function renderTitles(){titles.querySelectorAll('.carousel-title').forEach(e=>e.remove());for(let slot=-2;slot<=2;slot++){const activeVideo=slot===0&&films[index].video;const b=document.createElement(slot===0&&!activeVideo?'a':'button');if(slot!==0)b.type='button';b.className='carousel-title';const film=films[wrap(index+slot)];b.textContent=film.title;if(slot===0&&!activeVideo)b.href=film.href||['events.html','concerts.html','commercials.html','documentaries.html','food.html'][wrap(index+slot)];b.dataset.slot=slot;b.style.opacity=slot===0?'1':Math.abs(slot)===1?'.22':'0';b.tabIndex=Math.abs(slot)<=1?0:-1;b.setAttribute('aria-hidden',String(Math.abs(slot)>1));b.setAttribute('aria-label',(slot===0?'View ':slot<0?'Previous photo: ':'Next photo: ')+b.textContent);b.onclick=event=>{if(busy){event.preventDefault();return}if(slot!==0){event.preventDefault();change(Math.sign(slot))}else if(activeVideo){event.preventDefault();playShowreel()}};titles.append(b)}const layout=poses();titles.querySelectorAll('.carousel-title').forEach((b,i)=>b.style.transform=layout[i])}
function setTitles(){const prev=films[wrap(index-1)],next=films[wrap(index+1)];$('#gallery-title').textContent=films[index].title;$('#previous').setAttribute('aria-label','Previous photo: '+prev.title);$('#next').setAttribute('aria-label','Next photo: '+next.title)}
function render(){
 track.replaceChildren(...[-1,0,1].map(offset=>makeFilm(wrap(index+offset))));
 Array.from(track.children).forEach((b,i)=>{b.style.transform=`translateX(${(i-1)*110}vw)`;b.tabIndex=i===1?0:-1;b.setAttribute('aria-hidden',String(i!==1))});
 setTitles();renderTitles();
}
function change(direction){
 if(!opened||busy)return;busy=true;track.querySelectorAll('iframe').forEach(player=>{const film=player.parentElement;film.replaceWith(makeFilm(index))});
 const animations=Array.from(track.children).map((b,i)=>b.animate([{transform:`translateX(${(i-1)*110}vw)`},{transform:`translateX(${(i-1-direction)*110}vw)`}],{duration,easing,fill:'forwards'}));
 const oldPoses=poses(),newPoses=poses(direction);titles.querySelectorAll('.carousel-title').forEach((b,i)=>{const slot=Number(b.dataset.slot),next=slot-direction;b.animate([{transform:oldPoses[i],opacity:slot===0?1:Math.abs(slot)===1?.22:0},{transform:newPoses[i],opacity:next===0?1:Math.abs(next)===1?.22:0}],{duration,easing,fill:'forwards'})});
 Promise.all(animations.map(a=>a.finished)).then(()=>{
  index=wrap(index+direction);const buttons=Array.from(track.children);
  if(direction===1){buttons[0].remove();track.append(makeFilm(wrap(index+1)))}else{buttons[2].remove();track.prepend(makeFilm(wrap(index-1)))}
  Array.from(track.children).forEach((b,i)=>{b.getAnimations().forEach(a=>a.cancel());b.style.transform=`translateX(${(i-1)*110}vw)`;b.tabIndex=i===1?0:-1;b.setAttribute('aria-hidden',String(i!==1))});
  setTitles();renderTitles();busy=false;
 });
}
function playShowreel(){
 const film=track.children[1];if(!films[index].video||film.querySelector('iframe'))return;
 const player=document.createElement('iframe');player.src='https://player.vimeo.com/video/'+films[index].video+'?autoplay=1&playsinline=1';player.title=films[index].title;player.allow='autoplay; fullscreen; picture-in-picture';player.allowFullscreen=true;
 film.replaceChildren(player);film.setAttribute('aria-busy','false');film.classList.add('is-playing');
}
function makeFilm(n){
 const button=document.createElement(films[n].video?'div':'a'),image=document.createElement('img');
 button.className='film';
 if(films[n].video){button.setAttribute('role','group');const play=document.createElement('button');play.type='button';play.className='showreel-play';play.setAttribute('aria-label','Play '+films[n].title);play.onclick=()=>{if(!busy&&n===index)playShowreel()};button.append(play)}
 else {button.href=films[n].href||['events.html','concerts.html','commercials.html','documentaries.html','food.html'][n];button.onclick=event=>{if(busy)event.preventDefault()}}
 button.setAttribute('aria-label',films[n].title);
 const spinner=document.createElement('span');spinner.className='film-spinner';spinner.setAttribute('role','status');spinner.setAttribute('aria-label','Loading image');button.setAttribute('aria-busy','true');
 image.alt=films[n].title;image.width=1600;image.height=900;image.decoding='async';image.draggable=false;
 revealMedia(image);button.prepend(image);button.append(spinner);
 const finish=()=>{button.setAttribute('aria-busy','false');spinner.classList.add('is-hidden')};
 image.addEventListener('load',finish,{once:true});image.addEventListener('error',finish,{once:true});
 photosReady.then(()=>{image.src=films[n].src});
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
function frame(){requestAnimationFrame(frame);if(!opened||document.hidden)return;rx+=(tx-rx)*.075;ry+=(ty-ry)*.075;cx+=(mx-cx)*.3;cy+=(my-cy)*.3;cursor.style.transform=`translate3d(${cx}px,${cy}px,0)`;}requestAnimationFrame(frame);
document.addEventListener('films:open',()=>{opened=true;renderTitles()});
document.addEventListener('films:close',()=>{opened=false;wheelTotal=0;cursor.classList.remove('active');tx=ty=0});
render();
window.addEventListener('resize',()=>{if(!busy)renderTitles()});


document.fonts.ready.then(()=>{if(!busy)renderTitles()});
