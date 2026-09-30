import {finishLoading} from './loading-effects.js?v=20260930-1';
import {categories,parseMedia} from './media.js';
import {mediaElement} from './media-element.js?v=20260930-reveal';
import {sessionURL} from './session-link.js';
import {createPhotoViewer} from './photo-viewer.js?v=20260930-popup';
const grid=document.querySelector('.media-grid'),status=document.querySelector('.gallery-status');
const photoViewer=createPhotoViewer();
async function load(){
 try{
  const category=document.body.dataset.category;
  if(!categories.includes(category))throw new Error('Unknown gallery');
  const response=await fetch(new URL(`content/galleries/${category}.json`,import.meta.url),{cache:'no-cache'});
  if(!response.ok)throw new Error('Gallery unavailable');
  const data=await response.json();if(!Array.isArray(data.items))throw new Error('Invalid gallery');
  let invalid=0;const cards=document.createDocumentFragment();
  data.items.forEach((record,index)=>{
   let item;try{item=parseMedia(record,import.meta.url)}catch{invalid++;return}
   const card=document.createElement('article');card.className='media-card';
   const link=document.createElement('a');link.className='session-card-link';link.href=sessionURL(category,record,index);link.setAttribute('aria-label',item.title+' — photoshoot');
   if(!Array.isArray(record.session)||!record.session.length){
    link.setAttribute('aria-label','Open '+item.title);
    link.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();photoViewer.open([item],0,link)});
   }
   const title=document.createElement('span');title.className='session-card-title';
   const label=document.createElement('span'),text=document.createElement('span'),copy=document.createElement('span');
   label.className='roll-label';text.className='roll-label-track';copy.className='roll-label-copy';copy.setAttribute('aria-hidden','true');
   text.append(document.createTextNode(item.title));copy.textContent=item.title;text.append(copy);label.append(text);title.append(label);
   const cover=document.createElement('div');cover.className='session-cover';cover.append(mediaElement(item,true));
   link.append(title,cover);card.append(link);cards.append(card);
  });
  if(invalid)console.warn('Some works are unavailable.',{category,count:invalid});
  await finishLoading(status);
  grid.append(cards);
 }catch(error){await finishLoading(status);console.warn('Unable to load this gallery.',error)}finally{status.removeAttribute('data-loading')}
}
load();
