import {loadGallery,galleryURL} from './menu-content.js?v=20261001-page-editors';
import {finishLoading} from './loading-effects.js?v=20260930-1';
import {createPhotoViewer} from './photo-viewer.js?v=20260930-single-item';
import {categories,parseMedia} from './media.js';
import {mediaElement} from './media-element.js?v=20260930-hover-stop';
import {workKey} from './session-link.js';
const params=new URLSearchParams(location.search),category=params.get('category'),key=params.get('work');
const status=document.querySelector('.gallery-status'),grid=document.querySelector('.session-grid');
const photoViewer=createPhotoViewer(),photos=[];
async function load(){
 try{
  if(!key)throw new Error('Invalid photoshoot');
  const data=await loadGallery(category);const record=data.items.find((item,index)=>workKey(item,index)===key);
  if(!record)throw new Error('Photoshoot not found');
  document.body.dataset.category=category;
  document.querySelector('.session-title').textContent=record.title;document.title=record.title+' — mrk';
  const back=document.querySelector('.session-back');back.href=galleryURL(category);back.textContent='\u2190 back to gallery';
  document.querySelector('.session-description').textContent=record.description||'';
  const contents=Array.isArray(record.session)&&record.session.length?record.session:[];
  const entries=record.type==='video'?[record,...contents]:contents.length?contents:[record];
  let invalid=0;const figures=document.createDocumentFragment();
  entries.forEach(entry=>{
   try{
    const item=parseMedia({...entry,title:entry.title||record.title},import.meta.url),figure=document.createElement('figure');
    const photoIndex=photos.length;photos.push(item);
    if(item.kind==='image'){
     const button=document.createElement('button');button.className='session-photo-open';button.setAttribute('aria-label','Open '+item.title);button.append(mediaElement(item));button.onclick=()=>photoViewer.open(photos,photoIndex,button);figure.append(button);
    }else{figure.className='session-video';const preview=mediaElement(item);preview.addEventListener('click',()=>photoViewer.open(photos,photoIndex,preview));preview.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();photoViewer.open(photos,photoIndex,preview)}});figure.append(preview)}
    figures.append(figure);
   }catch{invalid++}
  });
  if(invalid)console.warn('Some photographs are unavailable.',{category,work:key,count:invalid});
  await finishLoading(status);
  grid.append(figures);
 }catch(error){await finishLoading(status);console.warn('Photoshoot unavailable.',error)}finally{status.removeAttribute('data-loading')}
}
load();
