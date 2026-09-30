import {revealMedia} from './loading-effects.js?v=20260930-1';
import {videoHover} from './video-hover.js?v=20260930-hover-stop';
export function mediaElement(item,preview=false){
 if(item.kind!=='image')return videoHover(item,preview);
 const image=document.createElement('img');image.src=item.src;image.alt=item.title;
 revealMedia(image);image.loading=preview?'lazy':'eager';image.decoding='async';
 if(preview){image.tabIndex=-1;image.setAttribute('aria-hidden','true')}
 return image;
}
