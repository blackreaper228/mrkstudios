const $=s=>document.querySelector(s);
const films=[
 {title:'mixtape / showreel',src:'https://www.w3schools.com/howto/rain.mp4'},
 {title:'somewhere / away',src:'https://media.w3.org/2010/05/sintel/trailer.mp4'},
 {title:'motion / instinct',src:'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'},
 {title:'after / hours',src:'https://media.w3.org/2010/05/bunny/trailer.mp4'},
 {title:'into / the light',src:'https://www.w3schools.com/html/mov_bbb.mp4'}
];
const track=$('#film-track'),stage=$('#film-stage'),tilt=$('#film-tilt'),cursor=$('#custom-cursor'),titles=$('.titles'),dialog=$('#player'),full=$('#full-video');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
let index=0,busy=false,opened=false,timer=0;
const wrap=n=>(n+films.length)%films.length,positions=new Map();
let tx=0,ty=0,rx=0,ry=0,mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my;
function activeVideo(){return track.children[1]?.querySelector('video')}
function play(v){if(v&&opened&&!document.hidden&&!dialog.open)v.play().catch(()=>{})}
function setTitles(){const prev=films[wrap(index-1)],next=films[wrap(index+1)];$('#gallery-title').textContent=films[index].title;$('#previous-title').textContent=prev.title;$('#next-title').textContent=next.title;$('#previous').setAttribute('aria-label','Previous film: '+prev.title);$('#next').setAttribute('aria-label','Next film: '+next.title)}
function render(){
 track.querySelectorAll('video').forEach(v=>{if(v.readyState>0)positions.set(v.dataset.index,v.currentTime);v.pause()});
 const items=[-1,0,1].map(offset=>{const n=wrap(index+offset),film=films[n],button=document.createElement('button'),video=document.createElement('video');button.className='film';button.tabIndex=offset===0?0:-1;button.setAttribute('aria-label','Play '+film.title);button.setAttribute('aria-hidden',String(offset!==0));video.src=film.src;video.dataset.index=n;video.muted=true;video.loop=true;video.playsInline=true;video.preload=opened?'metadata':'none';video.addEventListener('loadedmetadata',()=>{const time=positions.get(String(n));if(time&&time<video.duration)video.currentTime=time});button.append(video);button.onclick=()=>{if(offset===0&&!busy)openPlayer()};return button});
 track.replaceChildren(...items);track.style.transition='none';track.style.transform='translateX(-100%)';play(activeVideo());setTitles();
}
function change(direction){
 if(!opened||busy||dialog.open)return;busy=true;tx=ty=0;
 const old=activeVideo(),incoming=track.children[direction===1?2:0].querySelector('video');play(incoming);
 titles.classList.add('changing');track.style.transition=reduce?'none':'transform 780ms cubic-bezier(.76,0,.24,1)';track.style.transform=`translateX(${direction===1?-200:0}%)`;
 const duration=reduce?0:780;
 setTimeout(()=>{index=wrap(index+direction);setTitles();titles.classList.remove('changing')},duration*.48);
 timer=setTimeout(()=>{old.pause();render();busy=false},duration);
}
function openPlayer(){cursor.classList.remove('active');activeVideo()?.pause();full.src=films[index].src;full.currentTime=0;dialog.showModal();full.play().catch(()=>{});tx=ty=0}
function closePlayer(){full.pause();dialog.close()}
$('.close-player').onclick=closePlayer;
dialog.addEventListener('close',()=>{full.pause();full.removeAttribute('src');full.load();play(activeVideo())});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePlayer()}});
$('#previous').onclick=()=>change(-1);$('#next').onclick=()=>change(1);$('#previous-title').onclick=()=>change(-1);$('#next-title').onclick=()=>change(1);
document.addEventListener('keydown',e=>{if(!opened||dialog.open)return;if(e.key==='ArrowLeft'){e.preventDefault();change(-1)}if(e.key==='ArrowRight'){e.preventDefault();change(1)}});
function clock(){const now=new Date();$('#local-time').textContent=now.toLocaleTimeString('en-GB',{hour12:false});$('#local-time').dateTime=now.toISOString()}
$('#location').textContent=(Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()||'local').replaceAll('_',' ');clock();setInterval(clock,1000);
function cursorMode(kind,label){if(!fine||dialog.open)return;cursor.className='custom-cursor active '+kind;$('.cursor-label').textContent=label}
if(fine){document.body.classList.add('has-custom-cursor');document.addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY});stage.addEventListener('pointerenter',()=>cursorMode('play','Play'));stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();tx=(e.clientX-r.left)/r.width*2-1;ty=(e.clientY-r.top)/r.height*2-1});stage.addEventListener('pointerleave',()=>{tx=ty=0;cursor.classList.remove('active')});for(const [id,label] of [['previous','←'],['next','→']]){$('#'+id).addEventListener('pointerenter',()=>cursorMode('arrow',label));$('#'+id).addEventListener('pointerleave',()=>cursor.classList.remove('active'))}document.addEventListener('pointerleave',()=>cursor.classList.remove('active'))}
let touchX=0;stage.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX},{passive:true});stage.addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>45)change(delta<0?1:-1)},{passive:true});
function frame(){requestAnimationFrame(frame);if(!opened||document.hidden)return;rx+=(tx-rx)*.075;ry+=(ty-ry)*.075;cx+=(mx-cx)*.3;cy+=(my-cy)*.3;cursor.style.transform=`translate3d(${cx}px,${cy}px,0)`;if(!reduce)tilt.style.transform=`translate3d(${rx*13}px,${ry*8}px,0) rotateX(${-ry*9}deg) rotateY(${rx*13}deg)`}requestAnimationFrame(frame);
document.addEventListener('films:open',()=>{opened=true;track.querySelectorAll('video').forEach(v=>v.preload='metadata');track.querySelectorAll('video').forEach(v=>v.load());play(activeVideo())});
document.addEventListener('films:close',()=>{opened=false;track.querySelectorAll('video').forEach(v=>v.pause());cursor.classList.remove('active');tx=ty=0});
document.addEventListener('visibilitychange',()=>{if(document.hidden)track.querySelectorAll('video').forEach(v=>v.pause());else play(activeVideo())});
render();
