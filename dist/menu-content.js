export const menuPages=['events','concerts','commercials','documentaries','food','gear-rental','team'];
export function parseMenu(data){
 if(!Array.isArray(data?.items))throw new Error('Invalid menu');
 const seen=new Set();return data.items.map(item=>{
  if(!menuPages.includes(item.page)||seen.has(item.page)||typeof item.label!=='string'||!item.label.trim())throw new Error('Invalid menu item');
  seen.add(item.page);return{page:item.page,label:item.label.trim(),secondary:item.secondary===true};
 });
}
export async function loadMenu(){
 const response=await fetch(new URL('content/menu.json',import.meta.url),{cache:'no-cache'});
 if(!response.ok)throw new Error('Menu unavailable');return parseMenu(await response.json());
}
