export const categories = ['events', 'concerts', 'commercials', 'documentaries', 'food'];
export function imageURL(value, base = import.meta.url) {
 if (typeof value !== 'string' || !value.trim()) throw new Error('Missing image');
 let path = value.trim(); if (path.startsWith('/mrkstudios/')) path = path.slice(12);
 const url = new URL(path, base);
 if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported image URL');
 return url.href;
}
export function videoSource(value) {
 const url = new URL(value);
 if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported video URL');
 const host = url.hostname.replace(/^www\./, '');
 if (['youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com'].includes(host)) {
  const id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.split('/')[2];
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id || '')) throw new Error('Invalid YouTube link');
  return {kind:'embed', src:`https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1`};
 }
 if (['vimeo.com','player.vimeo.com'].includes(host)) {
  const parts = url.pathname.split('/').filter(Boolean); const id = parts.find(p => /^\d+$/.test(p));
  if (!id) throw new Error('Invalid Vimeo link');
  const hash = url.searchParams.get('h') || parts[parts.indexOf(id)+1];
  return {kind:'embed', src:`https://player.vimeo.com/video/${id}${hash ? '?h='+encodeURIComponent(hash) : ''}`};
 }
 if (!/\.(mp4|webm|ogv|m4v)$/i.test(url.pathname)) throw new Error('Use a video file, YouTube or Vimeo link');
 return {kind:'video', src:url.href};
}
export function parseMedia(item, base) {
 const title = typeof item?.title === 'string' ? item.title.trim() : '';
 if (!title) throw new Error('Missing title');
 if (item.type === 'page') {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(item.page || '')) throw new Error('Invalid nested page');
  return {title,kind:'image',src:item.image?imageURL(item.image,base):''};
 }
 if (item.type === 'image') return {title, kind:'image', src:imageURL(typeof item.imageUrl==='string'&&item.imageUrl.trim()?item.imageUrl:item.image,base)};
 if (item.type === 'video') return {title,...videoSource(item.video),poster:item.image ? imageURL(item.image,base) : ''};
 throw new Error('Unknown media type');
}
