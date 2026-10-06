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
tables.live=[['title','type','page','published'],['Loop','page','photography',true]];
assert.throws(()=>vm.runInContext('snapshot_()',context),/Circular page link/);
const rows=vm.runInContext("rowsFromSheet_({getDataRange:()=>({getValues:()=>[['title','published'],['',false],['Album',true]]})})",context);
assert.equal(rows.length,1);
assert.equal(rows[0]._row,1);
console.log('Nested export, inherited covers, publication, cycles and physical row positions verified.');
