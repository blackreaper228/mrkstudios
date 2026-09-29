import { loadPortfolio } from './content.js';
const $=s=>document.querySelector(s);
let films=[
 {title:'mixtape / showreel',src:'https://picsum.photos/id/1018/1600/900'},
 {title:'somewhere / away',src:'https://picsum.photos/id/1015/1600/900'},
 {title:'motion / instinct',src:'https://picsum.photos/id/1016/1600/900'},
 {title:'after / hours',src:'https://picsum.photos/id/1043/1600/900'},
 {title:'into / the light',src:'https://picsum.photos/id/1039/1600/900'}
];
const track=$('#film-track'),stage=$('#film-stage'),tilt=$('#film-tilt'),cursor=$('#custom-cursor'),titles=$('.titles'),dialog=$('#player'),full=$('#full-image');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
let index=0,busy=false,opened=false,pendingContent=null;
const wrap=n=>(n+films.length)%films.length;
let tx=0,ty=0,rx=0,ry=0,mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my;
const duration=reduce?0:950,easing='cubic-bezier(.76,0,.24,1)';
function titlePose(slot){const step=Math.min(300,Math.max(155,innerWidth*.18));return `translate(-50%,-50%) translateX(${slot*step}px) scale(${slot===0?1:16/(innerWidth<=700?30:36)})`}
function renderTitles(){titles.querySelectorAll('.carousel-title').forEach(e=>e.remove());for(let slot=-2;slot<=2;slot++){const b=document.createElement('button');b.className='carousel-title';b.textContent=films[wrap(index+slot)].title;b.dataset.slot=slot;b.style.transform=titlePose(slot);b.style.opacity=slot===0?'1':Math.abs(slot)===1?'.22':'0';b.tabIndex=Math.abs(slot)<=1?0:-1;b.setAttribute('aria-hidden',String(Math.abs(slot)>1));b.setAttribute('aria-label',(slot===0?'View ':slot<0?'Previous photo: ':'Next photo: ')+b.textContent);b.onclick=()=>slot===0?openPlayer():change(Math.sign(slot));titles.append(b)}}
function setTitles(){const prev=films[wrap(index-1)],next=films[wrap(index+1)];$('#gallery-title').textContent=films[index].title;$('#previous').setAttribute('aria-label','Previous photo: '+prev.title);$('#next').setAttribute('aria-label','Next photo: '+next.title)}
function render(){
 track.replaceChildren(...[-1,0,1].map(offset=>makeFilm(wrap(index+offset))));
 Array.from(track.children).forEach((b,i)=>{b.style.transform=`translateX(${(i-1)*110}vw)`;b.tabIndex=i===1?0:-1;b.setAttribute('aria-hidden',String(i!==1))});
 setTitles();renderTitles();
}
function change(direction){
 if(!opened||busy||dialog.open)return;busy=true;
 const animations=Array.from(track.children).map((b,i)=>b.animate([{transform:`translateX(${(i-1)*110}vw)`},{transform:`translateX(${(i-1-direction)*110}vw)`}],{duration,easing,fill:'forwards'}));
 titles.querySelectorAll('.carousel-title').forEach(b=>{const slot=Number(b.dataset.slot),next=slot-direction;b.animate([{transform:titlePose(slot),opacity:slot===0?1:Math.abs(slot)===1?.22:0},{transform:titlePose(next),opacity:next===0?1:Math.abs(next)===1?.22:0}],{duration,easing,fill:'forwards'})});
 Promise.all(animations.map(a=>a.finished)).then(()=>{index=wrap(index+direction);const buttons=Array.from(track.children);if(direction===1){buttons[0].remove();track.append(makeFilm(wrap(index+1)))}else{buttons[2].remove();track.prepend(makeFilm(wrap(index-1)))}Array.from(track.children).forEach((b,i)=>{b.getAnimations().forEach(a=>a.cancel());b.style.transform=`translateX(${(i-1)*110}vw)`;b.tabIndex=i===1?0:-1;b.setAttribute('aria-hidden',String(i!==1))});setTitles();renderTitles();busy=false});
}
function makeFilm(n){const button=document.createElement('button'),image=document.createElement('img');button.className='film';button.setAttribute('aria-label','View '+films[n].title);image.src=films[n].src;image.alt=films[n].title;image.width=1600;image.height=900;image.decoding='async';image.draggable=false;button.append(image);button.onclick=()=>{if(button===track.children[1]&&!busy)openPlayer()};return button}
function openPlayer(){if(busy)return;cursor.classList.remove('active');full.src=films[index].src;full.alt=films[index].title;dialog.showModal();tx=ty=0}
function closePlayer(){dialog.close()}
$('.close-player').onclick=closePlayer;
dialog.addEventListener('close',()=>full.removeAttribute('src'));
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePlayer()}});
$('#previous').onclick=()=>change(-1);$('#next').onclick=()=>change(1);
document.addEventListener('keydown',e=>{if(!opened||dialog.open)return;if(e.key==='ArrowLeft'){e.preventDefault();change(-1)}if(e.key==='ArrowRight'){e.preventDefault();change(1)}});
function clock(){const now=new Date();$('#local-time').textContent=now.toLocaleTimeString('en-GB',{hour12:false});$('#local-time').dateTime=now.toISOString()}
$('#location').textContent=(Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()||'local').replaceAll('_',' ');clock();setInterval(clock,1000);
function cursorMode(kind,label){if(!fine||dialog.open)return;cursor.className='custom-cursor active '+kind;$('.cursor-label').textContent=label}
if(fine){document.body.classList.add('has-custom-cursor');document.addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;if(opened&&!dialog.open){tx=mx/innerWidth*2-1;ty=my/innerHeight*2-1}});stage.addEventListener('pointerenter',()=>cursorMode('play','View'));stage.addEventListener('pointerleave',()=>{cursor.classList.remove('active')});for(const [id,label] of [['previous','\u2190'],['next','\u2192']]){$('#'+id).addEventListener('pointerenter',()=>cursorMode('arrow',label));$('#'+id).addEventListener('pointerleave',()=>cursor.classList.remove('active'))}document.addEventListener('pointerleave',()=>cursor.classList.remove('active'))}
let touchX=0;stage.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX},{passive:true});stage.addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>45)change(delta<0?1:-1)},{passive:true});
function frame(){requestAnimationFrame(frame);if(pendingContent&&!busy&&!dialog.open){films=pendingContent;pendingContent=null;render();$('#gallery').dataset.contentSource='cms'}if(!opened||document.hidden)return;rx+=(tx-rx)*.075;ry+=(ty-ry)*.075;cx+=(mx-cx)*.3;cy+=(my-cy)*.3;cursor.style.transform=`translate3d(${cx}px,${cy}px,0)`;if(!reduce){tilt.style.setProperty('--tilt-x',rx*13+'px');tilt.style.setProperty('--tilt-y',ry*8+'px');tilt.style.setProperty('--rotate-x',-ry*9+'deg');tilt.style.setProperty('--rotate-y',rx*13+'deg')}}requestAnimationFrame(frame);
document.addEventListener('films:open',()=>{opened=true});
document.addEventListener('films:close',()=>{opened=false;cursor.classList.remove('active');tx=ty=0});
render();
window.addEventListener('resize',()=>{if(!busy)renderTitles()});

loadPortfolio().then(items=>{pendingContent=items}).catch(error=>{console.warn('Portfolio content could not be loaded; using fallback photographs.',error);$('#gallery').dataset.contentSource='fallback'});
