let vimeoSDK;
function loadVimeo(){
 if(!vimeoSDK)vimeoSDK=new Promise((resolve,reject)=>{
  if(window.Vimeo?.Player){resolve(window.Vimeo.Player);return}
  const script=document.createElement('script');script.src='https://player.vimeo.com/api/player.js';
  script.onload=()=>window.Vimeo?.Player?resolve(window.Vimeo.Player):reject(new Error('Vimeo SDK unavailable'));
  script.onerror=()=>reject(new Error('Vimeo SDK could not be loaded'));document.head.append(script);
 });
 return vimeoSDK;
}
export function videoHover(item,preview){
 const wrapper=document.createElement('div');wrapper.className='hover-video';wrapper.setAttribute('aria-label',item.title);
 let media,ready;
 if(item.kind==='video'){
  media=document.createElement('video');media.src=item.src;media.muted=true;media.loop=true;media.playsInline=true;media.preload='metadata';if(item.poster)media.poster=item.poster;
  ready=Promise.resolve({play:()=>media.play(),pause:()=>media.pause(),reset:()=>{if(media.readyState)media.currentTime=0}});
 }else{
  media=document.createElement('iframe');const url=new URL(item.src);
  for(const [key,value]of Object.entries({autoplay:'0',muted:'1',loop:'1',controls:'0',title:'0',byline:'0',portrait:'0',background:'0',autopause:'0'}))url.searchParams.set(key,value);
  media.src=url.href;media.title=item.title;media.allow='autoplay; fullscreen; picture-in-picture';media.referrerPolicy='strict-origin-when-cross-origin';
  if(url.hostname==='player.vimeo.com')ready=loadVimeo().then(async Player=>{const player=new Player(media);await player.ready();await player.setMuted(true);wrapper.dataset.playerReady='true';return{play:()=>player.play(),pause:()=>player.pause(),reset:()=>player.setCurrentTime(0)}});
  else ready=Promise.resolve({play:()=>media.contentWindow.postMessage(JSON.stringify({event:'command',func:'playVideo',args:[]}),'https://www.youtube-nocookie.com'),pause:()=>media.contentWindow.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}),'https://www.youtube-nocookie.com'),reset:()=>media.contentWindow.postMessage(JSON.stringify({event:'command',func:'seekTo',args:[0,true]}),'https://www.youtube-nocookie.com')});
 }
 media.tabIndex=-1;wrapper.append(media);
 const shade=document.createElement('span');shade.className='hover-video-shade';shade.setAttribute('aria-hidden','true');wrapper.append(shade);
 const play=document.createElement('span');play.className='hover-video-play';play.setAttribute('aria-hidden','true');wrapper.append(play);
 let wanted=false,running=false,revision=0,hasPlayed=false;
 async function synchronize(){
  if(running)return;running=true;
  try{const controller=await ready;let applied;
   do{applied=revision;if(wanted){await controller.play();hasPlayed=true;if(applied===revision){wrapper.classList.add('is-playing');wrapper.dataset.playback='playing'}}else{if(hasPlayed){await controller.pause();await controller.reset()}wrapper.classList.remove('is-playing');wrapper.dataset.playback='paused'}}while(applied!==revision);
  }catch(error){wrapper.classList.remove('is-playing');wrapper.dataset.playback='error';console.warn('Video preview unavailable',error)}finally{running=false}
 }
 function setPlaying(value){wanted=value;revision++;if(!value)wrapper.classList.remove('is-playing');synchronize()}
 wrapper.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')setPlaying(true)});
 wrapper.addEventListener('pointerleave',()=>setPlaying(false));
 if(preview)queueMicrotask(()=>{const link=wrapper.closest('a');if(link){link.addEventListener('focus',()=>setPlaying(true));link.addEventListener('blur',()=>setPlaying(false))}});
 if(!preview){wrapper.tabIndex=0;wrapper.setAttribute('role','button');wrapper.addEventListener('focus',()=>setPlaying(true));wrapper.addEventListener('blur',()=>setPlaying(false));wrapper.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setPlaying(!wanted)}});wrapper.addEventListener('click',()=>{if(matchMedia('(hover:none)').matches)setPlaying(!wanted)})}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false)});
 // Do not seek an unstarted Vimeo player: it can block its first play command.
 return wrapper;
}
