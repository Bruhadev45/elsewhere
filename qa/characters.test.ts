import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharacter, isCharacter, loadCharacters, persistCharacters, characterFilter } from '../src/characters.ts';
let stored = new Map<string,string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem:(key:string)=>stored.get(key)??null,setItem:(key:string,value:string)=>stored.set(key,value) } });
test('character saves round-trip, reject malformed values and remain separate from worlds',()=>{
  stored = new Map([['elsewhere.worlds.v1','preserved']]);
  const c = {...createCharacter('oren'), name:'A traveller', backstory:'Maps forgotten places.'};
  persistCharacters([c]); assert.deepEqual(loadCharacters(),[c]);
  assert.equal(stored.get('elsewhere.worlds.v1'),'preserved');
  for(const patch of [{light:NaN},{light:101},{presetId:'unknown'},{worldId:'unknown'},{name:' '},{backstory:'x'.repeat(601)}]) assert.equal(isCharacter({...c,...patch}),false);
  assert.throws(()=>persistCharacters([c,c]));
});
test('malformed storage is safe and valid records deduplicate',()=>{
  stored.set('elsewhere.characters.v1','broken'); assert.deepEqual(loadCharacters(),[]);
  const c=createCharacter(); stored.set('elsewhere.characters.v1',JSON.stringify([null,c,c,{...c,id:'bad',look:'invalid'}]));assert.deepEqual(loadCharacters(),[c]);
  assert.match(characterFilter({...c,look:'noir'}),/grayscale\(1\)/);
});
