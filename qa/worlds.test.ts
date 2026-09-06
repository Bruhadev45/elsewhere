import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { worlds, loadSavedWorlds, loadFavorites } from '../src/worlds.ts';

function storage(value: string | null, fail = false) {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem() { if (fail) throw new Error('Storage unavailable'); return value; } } });
}
test('all twelve curated worlds have unique IDs and real local assets', () => {
  assert.equal(worlds.length, 12);
  assert.equal(new Set(worlds.map(world => world.id)).size, 12);
  for (const world of worlds) assert.ok(existsSync(`public${world.image}`), world.image);
});
test('corrupt or unavailable browser storage does not prevent the page from opening', () => {
  for (const input of ['not-json', '{}', 'null', '"unexpected"']) { storage(input); assert.deepEqual(loadSavedWorlds(), []); assert.deepEqual(loadFavorites(), []); }
  storage(null, true); assert.deepEqual(loadSavedWorlds(), []); assert.deepEqual(loadFavorites(), []);
});
test('saved worlds retain their configuration and reject invalid or foreign data', () => {
  const good={id:'example',name:'My world',worldId:'arctic',prompt:'A quiet fjord',light:0,mist:false,savedAt:'2026-09-06'};
  storage(JSON.stringify([good,{...good,worldId:'https://external.example/image'}, {...good,light:101}, {...good,name:'x'.repeat(65)}, {...good,mist:'true'},null]));
  assert.deepEqual(loadSavedWorlds(),[good]);
});
test('saved collections are bounded and favorites accept only known world IDs', () => {
  const good={id:'example',name:'My world',worldId:'forest',prompt:'A forest',light:70,mist:true,savedAt:'2026-09-06'};
  storage(JSON.stringify(Array.from({length:70},(_,index)=>({...good,id:String(index)})))); assert.equal(loadSavedWorlds().length,50);
  storage(JSON.stringify(['forest','mars','unknown',null,{},7]));assert.deepEqual(loadFavorites(),['forest','mars']);
});
