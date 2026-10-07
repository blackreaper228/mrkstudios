import {sessionMedia} from './session-media.js';
import {loadGallery,galleryURL} from './menu-content.js?v=20261002-google-cms';
import {finishLoading} from './loading-effects.js?v=20260930-1';
import {categories,parseMedia} from './media.js';
import {mediaElement} from './media-element.js?v=20260930-hover-stop';
import {sessionURL} from './session-link.js';
import {createPhotoViewer} from './photo-viewer.js?v=20260930-single-item';
const grid=document.querySelector('.media-grid'),status=document.querySelector('.gallery-status');
const photoViewer=createPhotoViewer();
async function load(){
 try{
  const category=new URLSearchParams(location.search).get('category')||document.body.dataset.category;
  document.body.dataset.category=category;
  const data=await loadGallery(category);if(!Array.isArray(data.items))throw new Error('Invalid gallery');
  document.querySelector('.category-content>h1').textContent=data.title||category;
  const requestedParent=new URLSearchParams(location.search).get('from');
  const parent=requestedParent||data.parent;
  if(parent&&parent!==category&&/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(parent)){
   const back=document.createElement('a');back.className='session-back category-back';
   back.href=galleryURL(parent);back.textContent='\u2190 back to gallery';
   document.querySelector('.category-content>h1').before(back);
  }
  document.body.classList.toggle('gear-rental-page',category==='gear-rental'||data.gearRental===true);
  grid.setAttribute('aria-label',(data.title||category)+' gallery');
  if(data.template==='placeholder'){
   await finishLoading(status);status.hidden=true;grid.hidden=true;
   document.body.classList.add('placeholder-page');
   document.querySelector('.category-content').className='placeholder-content';
   document.querySelector('.placeholder-content>h1').textContent=data.title||category;
   document.querySelector('.site-footer')?.remove();return;
  }
  const folderPhotos=data.items.filter(record=>record.folderPhoto).map(record=>parseMedia(record,import.meta.url));
  let invalid=0;const cards=document.createDocumentFragment();
  data.items.forEach((record,index)=>{
   let item;try{item=parseMedia(record,import.meta.url)}catch{invalid++;return}
   const card=document.createElement('article');card.className='media-card';
   const link=document.createElement('a');link.className='session-card-link';link.href=record.type==='page'?galleryURL(record.page):sessionURL(category,record,index);link.setAttribute('aria-label',item.title+' — photoshoot');
   if(record.type==='page'){const destination=new URL(link.href);destination.searchParams.set('from',category);link.href=destination.href;}
   if(record.type!=='page'&&!sessionMedia(record).length){
    link.setAttribute('aria-label','Open '+item.title);
    link.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();photoViewer.open(record.folderPhoto?folderPhotos:[item],record.folderPhoto?data.items.filter(record=>record.folderPhoto).indexOf(record):0,link)});
   }
   const title=document.createElement('span');title.className='session-card-title';
   const label=document.createElement('span'),text=document.createElement('span'),copy=document.createElement('span');
   label.className='roll-label';text.className='roll-label-track';copy.className='roll-label-copy';copy.setAttribute('aria-hidden','true');
   text.append(document.createTextNode(item.title));copy.textContent=item.title;text.append(copy);label.append(text);title.append(label);
   const cover=document.createElement('div');cover.className='session-cover';if(item.src||item.kind!=='image')cover.append(mediaElement(item,true));else cover.classList.add('empty-page-cover');
   if(!(data.hidePhotoTitles && record.folderPhoto))link.append(title);link.append(cover);card.append(link);cards.append(card);
  });
  if(invalid)console.warn('Some works are unavailable.',{category,count:invalid});
  await finishLoading(status);
  grid.append(cards);
 }catch(error){await finishLoading(status);console.warn('Unable to load this gallery.',error)}finally{status.removeAttribute('data-loading')}
}
load();
