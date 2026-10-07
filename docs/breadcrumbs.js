import {loadGallery,galleryURL} from './menu-content.js?v=20261002-google-cms';
// Follow CMS parents rather than browser history so direct links work too.
export async function addBreadcrumbs(back,page,data,{parent=data.parent,includePage=false,current=data.title||page}={}){
 const trail=includePage?[{page,title:data.title||page}]:[];
 const seen=new Set([page]);
 while(parent&&/^[a-z0-9][a-z0-9_-]*$/.test(parent)&&!seen.has(parent)){
  seen.add(parent);
  try{const ancestor=await loadGallery(parent);trail.unshift({page:parent,title:ancestor.title||parent});parent=ancestor.parent}catch{break}
 }
 if(trail.length)back.textContent='\u2190 back to '+trail[trail.length-1].title.toLowerCase();
 if(trail.length<2){back.hidden=false;return;}
 const nav=document.createElement('nav');nav.className='gallery-breadcrumbs';nav.setAttribute('aria-label','Breadcrumb');
 const list=document.createElement('ol');
 for(const entry of trail){const li=document.createElement('li'),link=document.createElement('a');link.href=galleryURL(entry.page);link.textContent=entry.title.toLowerCase();li.append(link);list.append(li)}
 nav.append(list);back.replaceWith(nav);
}
