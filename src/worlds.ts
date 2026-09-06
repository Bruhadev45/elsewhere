export type WorldId = 'forest' | 'city' | 'ocean' | 'desert' | 'arctic' | 'submerged' | 'garden' | 'lunar' | 'crystal' | 'solarpunk' | 'library' | 'mars';
export type World = { id: WorldId; name: string; category: string; image: string; description: string; prompt: string; color: string; label?: string; orbVariant?: 'forest'|'city'|'ocean' };
export const worlds: World[] = [
  {id:'forest',name:'The Floating Wilds',category:'Dreamscapes',image:'/assets/hero-forest.webp',description:'An ancient forest, untethered. Follow the waterfalls to a doorway that was never meant to be found.',prompt:'A floating forest with ancient ruins and waterfalls above the clouds',color:'#d9ff81'},
  {id:'city',name:'Somewhere, 2089',category:'Future cities',image:'/assets/neon-city.webp',description:'A city suspended between yesterday and tomorrow. Neon-lit streets. A thousand stories after dark.',prompt:'A floating neon city at sunset with Japanese architecture and sky bridges',color:'#ffc2af'},
  {id:'ocean',name:'Beyond the Blue',category:'Otherworldly',image:'/assets/alien-ocean.webp',description:'An ocean with no edges. An unfamiliar moon. The quiet feeling that you have been here before.',prompt:'An alien ocean with turquoise water, giant moons and impossible stone arches',color:'#b8dffb'},
  {"id": "desert", "name": "The Amber Kingdom", "category": "Dreamscapes", "image": "/assets/desert-palace.webp", "description": "A palace carved from the last light of the sun. Beyond the dunes, a moon watches a city that has forgotten time.", "prompt": "A monumental terracotta palace in amber dunes under a colossal moon", "color": "#edbe8c", "label": "Amber kingdom", "orbVariant": "forest"},
  {"id": "arctic", "name": "Where the Sky Sings", "category": "Otherworldly", "image": "/assets/arctic-sanctuary.webp", "description": "A remote observatory above a frozen fjord. Look up: the sky is telling you something in green and violet.", "prompt": "An arctic sanctuary above a frozen fjord beneath luminous northern lights", "color": "#b9e9db", "label": "Arctic sanctuary", "orbVariant": "ocean"},
  {"id": "submerged", "name": "The Sunken Archive", "category": "Otherworldly", "image": "/assets/submerged-temple.webp", "description": "Some histories are written underwater. Follow the light to a temple the ocean has kept for itself.", "prompt": "An ancient temple inside a luminous underwater dome with tropical sea life", "color": "#91e8e6", "label": "Sunken archive", "orbVariant": "ocean"},
  {"id": "garden", "name": "Gardens of the Almost", "category": "Dreamscapes", "image": "/assets/cloud-garden.webp", "description": "Blossoms, bridges, and an impossible kind of quiet. A garden suspended between one daydream and the next.", "prompt": "Floating cherry blossom gardens and delicate bridges in a pastel pink cloud sky", "color": "#f5cedd", "label": "Cloud gardens", "orbVariant": "forest"},
  {"id": "lunar", "name": "The Quiet Frontier", "category": "Future cities", "image": "/assets/lunar-outpost.webp", "description": "A small outpost at the edge of everything. One window. One enormous planet. All the space you need.", "prompt": "A brutalist lunar outpost among charcoal rocks beneath a huge golden planet", "color": "#e5d2a0", "label": "Lunar outpost", "orbVariant": "city"},
  {"id": "crystal", "name": "Echoes in Violet", "category": "Otherworldly", "image": "/assets/crystal-cavern.webp", "description": "Light takes a different shape here. A cathedral of crystal hidden beneath a sleeping world.", "prompt": "Giant translucent lavender crystals in a luminous turquoise underground cavern", "color": "#d4c6f5", "label": "Crystal cavern", "orbVariant": "ocean"},
  {"id": "solarpunk", "name": "Tomorrow, in Bloom", "category": "Future cities", "image": "/assets/solar-punk.webp", "description": "A future that grew in the right direction. Walkways in the canopy, sunlight in every corner, and room to breathe.", "prompt": "A lush tropical solarpunk city with living tree architecture and golden sunlight", "color": "#d0e6a0", "label": "City in bloom", "orbVariant": "city"},
  {"id": "library", "name": "A Thousand Unwritten", "category": "Dreamscapes", "image": "/assets/sky-library.webp", "description": "A library above the mountains, holding stories that have not happened yet. Your next chapter is somewhere inside.", "prompt": "An impossible ancient library tower above misty mountains at golden blue hour", "color": "#dbcaa6", "label": "Sky library", "orbVariant": "forest"},
  {"id": "mars", "name": "The Other Side of Red", "category": "Otherworldly", "image": "/assets/red-planet.webp", "description": "A black doorway in an endless red desert. A small step toward the biggest question of all.", "prompt": "A monumental black circular gateway in Martian red dunes with a tiny explorer", "color": "#e7a895", "label": "Red planet", "orbVariant": "city"},
];
export const featuredWorlds = worlds.slice(0, 3);
export type SavedWorld = { id: string; name: string; worldId: WorldId; prompt: string; light: number; mist: boolean; savedAt: string };
export type SceneDraft = Omit<SavedWorld,'id'|'savedAt'>;
export const STORAGE_KEY = 'elsewhere.worlds.v1';
export function loadSavedWorlds(): SavedWorld[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((x): x is SavedWorld => typeof x==='object' && x!==null && typeof x.id==='string' && typeof x.name==='string' && x.name.length<=64 && worlds.some(w=>w.id===x.worldId) && typeof x.prompt==='string' && x.prompt.length<=500 && typeof x.light==='number' && Number.isFinite(x.light) && x.light>=0 && x.light<=100 && typeof x.mist==='boolean' && typeof x.savedAt==='string').slice(0,50);
  } catch { return []; }
}
export function findWorld(id: WorldId) { return worlds.find(w=>w.id===id) ?? worlds[0]; }

export const FAVORITES_KEY = "elsewhere.favorites.v1";
export function loadFavorites(): WorldId[] {
  try { const data: unknown=JSON.parse(localStorage.getItem(FAVORITES_KEY)||"[]");return Array.isArray(data)?data.filter((id):id is WorldId=>typeof id === "string" && worlds.some(w=>w.id===id)):[]; } catch { return []; }
}
