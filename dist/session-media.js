export function sessionMedia(record){
 const photos=Array.isArray(record.photos)?record.photos:[];
 const media=Array.isArray(record.session)?record.session:[];
 return [...photos.filter(path=>typeof path==='string'&&path.trim()).map(image=>({type:'image',image,title:record.title})),...media];
}
