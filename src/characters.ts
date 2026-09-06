import { worlds, type WorldId } from './worlds.ts';

export const characterPresets = [
  { id: 'mira', name: 'Mira', role: 'The pathfinder', description: 'A curious explorer with dark wavy hair and an olive field jacket.', image: '/assets/character-mira.webp' },
  { id: 'oren', name: 'Oren', role: 'The night cartographer', description: 'A thoughtful traveller in a charcoal utility jacket, framed by city light.', image: '/assets/character-oren.webp' },
  { id: 'lyra', name: 'Lyra', role: 'The sky archivist', description: 'An observatory researcher with a black bob and a cream high-collar coat.', image: '/assets/character-lyra.webp' },
] as const;
export type CharacterPresetId = typeof characterPresets[number]['id'];
export type CharacterDraft = {
  id: string; name: string; role: string; backstory: string;
  presetId: CharacterPresetId; worldId: WorldId; light: number; look: 'natural' | 'warm' | 'noir';
};
const KEY = 'elsewhere.characters.v1';
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
export function isCharacter(value: unknown): value is CharacterDraft {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return isText(c.id, 100) && c.id.length > 0 && isText(c.name, 80) && c.name.trim().length > 0 &&
    isText(c.role, 80) && isText(c.backstory, 600) &&
    characterPresets.some(p => p.id === c.presetId) && worlds.some(w => w.id === c.worldId) &&
    typeof c.light === 'number' && Number.isFinite(c.light) && c.light >= 40 && c.light <= 100 &&
    ['natural', 'warm', 'noir'].includes(String(c.look));
}
export function createCharacter(presetId: CharacterPresetId = 'mira'): CharacterDraft {
  const p = characterPresets.find(p => p.id === presetId) ?? characterPresets[0];
  return { id: crypto.randomUUID(), name: p.name, role: p.role, backstory: '', presetId: p.id,
    worldId: p.id === 'oren' ? 'city' : p.id === 'lyra' ? 'library' : 'forest', light: 85, look: 'natural' };
}
export function loadCharacters(): CharacterDraft[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    return raw.filter(isCharacter).filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; }).slice(0, 20);
  } catch { return []; }
}
export function persistCharacters(list: CharacterDraft[]): void {
  if (list.length > 20 || !list.every(isCharacter) || new Set(list.map(c => c.id)).size !== list.length) throw new Error('Check the character details before saving.');
  localStorage.setItem(KEY, JSON.stringify(list));
}
export function characterFilter(c: Pick<CharacterDraft, 'light' | 'look'>): string {
  const light = (0.55 + c.light / 100 * 0.55).toFixed(3);
  return `brightness(${light}) ${c.look === 'warm' ? 'sepia(.22) saturate(1.12)' : c.look === 'noir' ? 'grayscale(1) contrast(1.08)' : 'saturate(1)'}`;
}
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function safeName(name: string): string { return name.trim().replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60) || 'character'; }
export function exportCharacterSettings(c: CharacterDraft): void {
  downloadBlob(new Blob([JSON.stringify({ ...c, fictional: true }, null, 2)], { type: 'application/json' }), `${safeName(c.name)}-character.json`);
}
/** Export the selected portrait treatment and identity as a shareable character card. */
export async function downloadCharacter(c: CharacterDraft): Promise<void> {
  const preset = characterPresets.find(p => p.id === c.presetId)!;
  const img = new Image(); img.src = preset.image;
  await img.decode();
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1600;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image export is unavailable in this browser.');
  const scale = Math.max(1200 / img.naturalWidth, 1600 / img.naturalHeight);
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  ctx.filter = characterFilter(c); ctx.drawImage(img, (1200-w)/2, (1600-h)/2, w, h); ctx.filter = 'none';
  const shade = ctx.createLinearGradient(0, 850, 0, 1600); shade.addColorStop(0, 'transparent'); shade.addColorStop(1, '#061810');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, 1200, 1600);
  ctx.fillStyle = '#d9ff81'; ctx.font = '24px sans-serif'; ctx.fillText('ELSEWHERE / FICTIONAL CHARACTER', 70, 1310);
  let size = 84;
  do { ctx.font = `${size}px sans-serif`; if (ctx.measureText(c.name || 'Untitled character').width <= 1060) break; size -= 2; } while (size > 20);
  ctx.fillStyle = '#f3f5ed'; ctx.fillText(c.name || 'Untitled character', 70, 1410, 1060);
  ctx.font = '30px sans-serif'; ctx.fillText(c.role, 70, 1470, 1060);
  ctx.font = '23px sans-serif'; ctx.fillText(worlds.find(w => w.id === c.worldId)?.name ?? '', 70, 1530, 1060);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not export portrait.')), 'image/png'));
  downloadBlob(blob, `${safeName(c.name)}-elsewhere.png`);
}
