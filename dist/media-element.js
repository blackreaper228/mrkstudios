import {videoHover} from './video-hover.js?v=20260930-first-play-fix';
export function mediaElement(item,preview=false){
 if(item.kind!=='image')return videoHover(item,preview);
 const image=document.createElement('img');image.src=item.src;image.alt=item.title;
 image.onload=()=>image.dataset.loaded='true';image.onerror=()=>image.dataset.loaded='error';image.loading=preview?'lazy':'eager';image.decoding='async';
 if(preview){image.tabIndex=-1;image.setAttribute('aria-hidden','true')}
 return image;
}
