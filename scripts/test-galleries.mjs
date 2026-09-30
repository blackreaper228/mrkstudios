import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {categories,parseMedia,videoSource} from '../dist/media.js';
import {titleLayout} from '../dist/title-layout.js';
for(const category of categories){const data=JSON.parse(await readFile(new URL(`../docs/content/galleries/${category}.json`,import.meta.url)));assert.ok(Array.isArray(data.items));for(const item of data.items)assert.ok(parseMedia(item,'https://example.com/mrkstudios/media.js').src);}
assert.equal(parseMedia({title:'Photo',type:'image',image:'/mrkstudios/uploads/photo.jpg'},'http://localhost:4173/media.js').src,'http://localhost:4173/uploads/photo.jpg');
assert.equal(videoSource('https://youtu.be/aqz-KE-bpKQ').src,'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?enablejsapi=1');
assert.equal(videoSource('https://vimeo.com/123456789/abc').src,'https://player.vimeo.com/video/123456789?h=abc');
assert.equal(videoSource('https://example.com/work.mp4?token=example').kind,'video');
assert.throws(()=>videoSource('javascript:alert(1)'));
assert.throws(()=>parseMedia({title:'Missing video',type:'video'}));
const widths=[230,280,360,400,260];
for(const active of [1,2,3]){const layout=titleLayout(widths,active,16/36);const x=layout.map(p=>Number(p.match(/translateX\(([-\d.]+)px\)/)[1]));const sizes=widths.map((w,i)=>w*(i===active?1:16/36));for(let i=1;i<x.length;i++)assert.ok(Math.abs((x[i]-sizes[i]/2)-(x[i-1]+sizes[i-1]/2)-16)<.00001);}
console.log('PASS: gallery content, local upload paths, video links and 16px title gaps before/after carousel movement.');
