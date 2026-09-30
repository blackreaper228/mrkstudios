const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
export function revealMedia(media){
 media.classList.add('reveal-media');
 let done=false;
 async function show(){if(done)return;done=true;if(media.tagName==='IMG'&&media.decode)try{await media.decode()}catch{}requestAnimationFrame(()=>{media.dataset.loaded='true';media.classList.add('is-ready')})}
 const event=media.tagName==='VIDEO'?'loadedmetadata':'load';
 media.addEventListener(event,show,{once:true});media.addEventListener('error',show,{once:true});
 if(media.tagName==='IMG'&&media.complete&&media.naturalWidth||media.tagName==='VIDEO'&&media.readyState>=1)show();
 return show;
}
export async function finishLoading(status,message=''){
 if(status.hasAttribute('data-loading')){
  await status.animate([{opacity:1},{opacity:0}],{duration:reduced?0:220,easing:'ease-out',fill:'forwards'}).finished;
 }
 status.removeAttribute('data-loading');status.textContent=message;status.hidden=!message;
 status.getAnimations().forEach(animation=>animation.cancel());
 if(message)status.animate([{opacity:0},{opacity:1}],{duration:reduced?0:300});
}
