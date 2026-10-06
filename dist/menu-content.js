export const menuPages=['events','concerts','commercials','documentaries','food','gear-rental','team'];
export function parseMenu(data){
 if(!Array.isArray(data?.items))throw new Error('Invalid menu');
 const seen=new Set();return data.items.map(item=>{
  if(typeof item.page!=='string'||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.page)||seen.has(item.page)||typeof item.label!=='string'||!item.label.trim())throw new Error('Invalid menu item');
  seen.add(item.page);return{page:item.page,label:item.label.trim(),spaceAbove:item.spaceAbove===true,template:item.template==='placeholder'?'placeholder':'gallery',works:Array.isArray(item.works)?item.works:undefined};
 });
}
export async function loadMenu(){
 const response=await fetch(new URL('content/menu.json',import.meta.url),{cache:'no-cache'});
 if(!response.ok)throw new Error('Menu unavailable');return parseMenu(await response.json());
}

export function galleryURL(page,base=import.meta.url){
 return new URL(page+'.html',base).href;
}
export async function loadGallery(page){
 if(typeof page!=='string'||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page))throw new Error('Invalid page ID');
 const items=await loadMenu(),entry=items.find(item=>item.page===page);

 const response=await fetch(new URL('content/galleries/'+page+'.json',import.meta.url),{cache:'no-cache'});
 if(response.status===404&&entry)return {items:entry.works||[]};
 if(!response.ok)throw new Error('Gallery unavailable');return response.json();
}
