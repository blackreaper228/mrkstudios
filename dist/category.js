import {addBreadcrumbs} from './breadcrumbs.js';
import {sessionMedia} from './session-media.js';
import {loadGallery,galleryURL} from './menu-content.js?v=20261002-google-cms';
import {finishLoading} from './loading-effects.js?v=20260930-1';
import {categories,parseMedia} from './media.js';
import {mediaElement} from './media-element.js?v=20260930-hover-stop';
import {sessionURL} from './session-link.js';
import {createPhotoViewer} from './photo-viewer.js?v=20261007-lens-background';
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
  if(parent&&parent!==category&&/^[a-z0-9][a-z0-9_-]*$/.test(parent)){
   const back=document.createElement('a');back.className='session-back category-back';
   back.href=galleryURL(parent);back.textContent='\u2190 back to gallery';
   document.querySelector('.category-content>h1').before(back);
   await addBreadcrumbs(back,category,data,{parent});
  }
  document.body.classList.toggle('gear-rental-page',category==='gear-rental'||data.gearRental===true);
  const lensPage=data.gearRental===true&&category!=='gear-rental';
  document.body.classList.toggle('lens-detail-page',lensPage);
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
   const card=document.createElement('article');card.className='media-card';if(lensPage){card.style.gridRow=String(index+1);if(index===0)card.classList.add('lens-product');}
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
  if(lensPage){enableLensScroll(grid);addScrollTop();}
 }catch(error){await finishLoading(status);console.warn('Unable to load this gallery.',error)}finally{status.removeAttribute('data-loading')}
}
load();

function enableLensScroll(grid){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const layers=[...grid.children].map((card,index)=>({card,y:0,speed:[.18,.38,.25,.45][index%4]}));let frame=0;
 const draw=()=>{
  frame=0;let moving=false;
  for(const layer of layers){
   const rect=layer.card.getBoundingClientRect();
   const target=Math.max(-innerHeight*.3,Math.min(innerHeight*.3,(rect.top+rect.height/2-innerHeight/2)*layer.speed));
   layer.y+=(target-layer.y)*.09;
   if(Math.abs(target-layer.y)>.15)moving=true;
   layer.card.style.setProperty('--float-y',layer.y.toFixed(2)+'px');
  }
  if(moving)frame=requestAnimationFrame(draw);
 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw)};
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);schedule();
}

function addScrollTop(){
 const footer=document.querySelector('.site-footer');if(!footer)return;
 const button=document.createElement('button');button.className='footer-scroll-top';button.textContent='go to top [\u2191]';
 button.addEventListener('click',()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
 footer.classList.add('has-scroll-top');footer.append(button);
}
