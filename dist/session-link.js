export function workKey(record,index){return typeof record.slug==='string'&&record.slug.trim()?record.slug.trim():String(index+1)}
export function sessionURL(category,record,index,base=import.meta.url){
 const url=new URL('session.html',base);url.searchParams.set('category',category);url.searchParams.set('work',workKey(record,index));return url.href;
}
