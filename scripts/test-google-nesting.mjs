import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const tables = {
 Pages: [['page','title','published'],['photography','Photography',true]],
 Home: [['title','imageUrl','link','published'],['Home','https://example.com/home.jpg','photography.html',true]],
 photography: [['title','type','page','published'],['Artists','page','artists',true]],
 artists: [['title','type','page','published'],['Live','page','live',true]],
 live: [['title','type','imageUrl','published'],['Elyanna','photo','https://example.com/elyanna.jpg',true]],
};
const context = vm.createContext({
 Sheets:{Spreadsheets:{Values:{get:(_id,name)=>({values:structuredClone(tables[name]||[])})}}},
 CacheService:{getScriptCache:()=>({put(){}})},
});
vm.runInContext(fs.readFileSync(new URL('../google-cms/Code.gs',import.meta.url),'utf8'),context);
const data=vm.runInContext('snapshot_()',context);
assert.equal(data.menu.items.length,1);
assert.equal(data.galleries.photography.items[0].page,'artists');
assert.equal(data.galleries.artists.items[0].page,'live');
assert.equal(data.galleries.photography.items[0].image.url,'https://example.com/elyanna.jpg');
tables.live.push(['Private','photo','https://example.com/private.jpg',false]);
assert.equal(vm.runInContext('snapshot_()',context).galleries.live.items.length,1);
tables.Pages.push(['concerts','Concerts',true]);
tables.concerts=[['title','type','imageUrl','published'],['Main concert','photo','https://example.com/main.jpg',true]];
tables.photography=[['title','type','page','published'],['Concerts','page','concerts',true]];
tables.concerts_ph=[['title','type','imageUrl','published'],['Nested concert','photo','https://example.com/nested.jpg',true]];
const nested=vm.runInContext('snapshot_()',context);
assert.equal(nested.galleries.photography.items[0].page,'concerts_ph');
assert.equal(nested.galleries.photography.items[0].image.url,'https://example.com/nested.jpg');
assert.equal(nested.galleries.concerts.items[0].title,'Main concert');
tables.photography[1][2]='concerts_ph';
assert.equal(vm.runInContext('snapshot_()',context).galleries.photography.items[0].page,'concerts_ph');
assert.equal(vm.runInContext("nestedPage_({title:'Concerts'},'photography',{concerts:'__menu',concerts_ph:'photos'})",context),'concerts_ph_2');
const rows=vm.runInContext("rowsFromSheet_({getDataRange:()=>({getValues:()=>[['title','published'],['',false],['Album',true]]})})",context);
assert.equal(rows.length,1);
assert.equal(rows[0]._row,1);
console.log('Nested export, inherited covers, publication, cycles and physical row positions verified.');

function iterator(items){let i=0;return {hasNext:()=>i<items.length,next:()=>items[i++]};}
const folders=new Map();
function folder(name,id,children=[],files=[]){const value={getId:()=>id,getName:()=>name,getFolders:()=>iterator(children),getFiles:()=>iterator(files)};folders.set(id,value);return value;}
function photo(name,id){return {getId:()=>id,getName:()=>name,getMimeType:()=> 'image/jpeg',getLastUpdated:()=>new Date('2026-01-01'),getSize:()=>10};}
const leaf=folder('Artist','abcdefghijklmnopqrstuv12345678',[],[photo('01.jpg','photo-one'),photo('02.jpg','photo-two')]);
const middle=folder('Concerts','abcdefghijklmnopqrstuv23456789',[leaf]);
const root=folder('Photography folder','abcdefghijklmnopqrstuv34567890',[middle],[photo('parent.jpg','parent-photo')]);
context.DriveApp={getFolderById:id=>folders.get(id)};
vm.runInContext('insideRoot_=()=>true',context);
tables.photography=[['title','type','folder','published'],['Concert photos','photo',root.getId(),true]];
const automatic=vm.runInContext('snapshot_()',context);
const parentCard=automatic.galleries.photography.items[0];
assert.equal(parentCard.type,'page');
const parentGallery=automatic.galleries[parentCard.page];
assert.equal(parentGallery.items[0].image.id,'parent-photo');
const middleGallery=automatic.galleries[parentGallery.items[1].page];
assert.equal(middleGallery.items[0].type,'image');
assert.equal(middleGallery.items[0].photos.length,2);
assert.equal(parentGallery.items[1].image.id,'photo-one');
assert.equal(automatic.menu.items.length,2);
console.log('Recursive Drive folders, direct parent photos, leaf albums and inherited covers verified.');
