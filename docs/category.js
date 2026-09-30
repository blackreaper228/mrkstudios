import {categories,parseMedia} from './media.js';
import {mediaElement} from './media-element.js?v=20260930-first-play-fix';
import {sessionURL} from './session-link.js';
const grid=document.querySelector('.media-grid'),status=document.querySelector('.gallery-status');
async function load(){
 try{
  const category=document.body.dataset.category;
  if(!categories.includes(category))throw new Error('Unknown gallery');
  const response=await fetch(new URL(`content/galleries/${category}.json`,import.meta.url),{cache:'no-cache'});
  if(!response.ok)throw new Error('Gallery unavailable');
  const data=await response.json();if(!Array.isArray(data.items))throw new Error('Invalid gallery');
  let invalid=0;
  data.items.forEach((record,index)=>{
   let item;try{item=parseMedia(record,import.meta.url)}catch{invalid++;return}
   const card=document.createElement('article');card.className='media-card';
   const link=document.createElement('a');link.className='session-card-link';link.href=sessionURL(category,record,index);link.setAttribute('aria-label',item.title+' — photoshoot');
   const title=document.createElement('span');title.className='session-card-title';
   const label=document.createElement('span'),text=document.createElement('span'),copy=document.createElement('span');
   label.className='roll-label';text.className='roll-label-track';copy.className='roll-label-copy';copy.setAttribute('aria-hidden','true');
   text.append(document.createTextNode(item.title));copy.textContent=item.title;text.append(copy);label.append(text);title.append(label);
   const cover=document.createElement('div');cover.className='session-cover';cover.append(mediaElement(item,true));
   link.append(title,cover);card.append(link);grid.append(card);
  });
  status.textContent=invalid?'Some works are unavailable.':grid.children.length?'':'New work coming soon.';status.hidden=!status.textContent;
 }catch(error){status.textContent='Unable to load this gallery. Please try again.';console.warn(error)}
}
load();
