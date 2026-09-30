import {revealMedia} from './loading-effects.js?v=20260930-1';
export function createPhotoViewer(){
 const dialog=document.createElement('dialog');dialog.className='photo-viewer';dialog.setAttribute('aria-label','Photoshoot gallery');
 const content=document.createElement('div');content.className='photo-viewer-content';
 const close=document.createElement('button');close.className='photo-viewer-close';close.textContent='\u00d7';close.setAttribute('aria-label','Close gallery');
 const previous=document.createElement('button'),next=document.createElement('button');
 previous.className='photo-viewer-previous';next.className='photo-viewer-next';previous.setAttribute('aria-label','Previous work');next.setAttribute('aria-label','Next work');
 const dots=document.createElement('div');dots.className='photo-viewer-dots';dots.setAttribute('aria-label','Gallery slides');
 previous.textContent='\u2190';next.textContent='\u2192';
 dialog.append(close,previous,content,next,dots);document.body.append(dialog);
 let items=[],index=0,trigger,overflow;
 function render(){
  const item=items[index];content.replaceChildren();
  let media;
  if(item.kind==='image'){media=document.createElement('img');media.src=item.src;media.alt=item.title;media.className='photo-viewer-image'}
  else if(item.kind==='video'){media=document.createElement('video');media.src=item.src;media.controls=true;media.playsInline=true;media.preload='metadata';if(item.poster)media.poster=item.poster}
  else{media=document.createElement('iframe');media.src=item.src;media.title=item.title;media.allow='autoplay; fullscreen; picture-in-picture';media.allowFullscreen=true;media.referrerPolicy='strict-origin-when-cross-origin'}
  revealMedia(media);content.append(media);dots.replaceChildren(...items.map((item,i)=>{const dot=document.createElement('button');dot.className='photo-viewer-dot';dot.setAttribute('aria-label','Slide '+(i+1)+': '+item.title);dot.setAttribute('aria-current',String(i===index));dot.onclick=()=>{index=i;render()};return dot}));
  previous.hidden=next.hidden=items.length<2;
 }
 function move(step){index=(index+step+items.length)%items.length;render()}
 close.onclick=()=>dialog.close();previous.onclick=()=>move(-1);next.onclick=()=>move(1);
 dialog.addEventListener('click',event=>{if(event.target===dialog||event.target===content)dialog.close()});
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();move(event.key==='ArrowLeft'?-1:1)}});
 dialog.addEventListener('close',()=>{content.replaceChildren();document.body.style.overflow=overflow;const dot=dialog.querySelector('.pointer-dot');if(dot)document.body.append(dot);trigger?.focus({preventScroll:true})});
 return {open(records,start,button){items=records;index=start;trigger=button;render();overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();dialog.classList.remove('is-opening');void dialog.offsetWidth;dialog.classList.add('is-opening');const dot=document.querySelector('.pointer-dot');if(dot)dialog.append(dot);close.focus({preventScroll:true})}};
}
