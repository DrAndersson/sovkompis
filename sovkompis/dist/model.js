export const STORAGE_KEY = 'sovkompis-v1';
export const EQUIPMENT = [
  { id: 'cannula', name: 'Näsgrimma', short: 'Näsan', color: '#87b6c7', description: 'Den tunna slangen känner av luften när du andas.', instruction: 'Dra näsgrimman till näsan på din sovkompis.', success: 'Fint! Näsgrimman sitter vid näsan.', target: { x: 50, y: 33 } },
  { id: 'thorax', name: 'Bröstband', subtitle: 'Thoraxband', short: 'Bröstkorg', color: '#718cae', description: 'Bandet följer bröstkorgens rörelser när du andas.', instruction: 'Dra bröstbandet runt bröstkorgen, ovanför magen.', success: 'Precis! Det här bandet följer bröstkorgens rörelser.', target: { x: 50, y: 52 } },
  { id: 'abdomen', name: 'Magband', short: 'Mage', color: '#a18bb3', description: 'Det här bandet följer magens rörelser när du andas.', instruction: 'Dra magbandet till magen, under bröstbandet.', success: 'Där satt det! Magbandet får följa med när magen rör sig.', target: { x: 50, y: 65 } },
  { id: 'oximeter', name: 'Pulsoximeter', short: 'Finger', color: '#cb9974', description: 'En liten sensor mäter syresättningen i blodet och din puls.', instruction: 'Dra pulsoximetern till den markerade handen eller foten.', success: 'Bra jobbat! Nu är pulsoximetern på plats.', target: { x: 25, y: 65 } },
  { id: 'sentec', name: 'Sentec-sensor', short: 'Övre bröstkorg', color: '#9caa72', description: 'Sensorn sitter mot huden och mäter koldioxid genom huden. En sladd går till monitorn.', instruction: 'Dra Sentec-sensorn till övre delen av bröstkorgen. Personalen visar den exakta platsen på dig.', success: 'Toppen! Sentec-sensorn och sladden är på plats.', target: { x: 61, y: 44 } },
];
export const DEFAULT_AVATAR = { name: 'Min sovkompis', skin: '#edbb96', hairColor: '#594238', hair: 'wave', eyes: 'round', outfit: '#7fa99b' };
export const SKIN_COLORS = ['#f5d4ba', '#edbb96', '#c98d67', '#976547', '#654536'];
export const HAIR_COLORS = ['#594238', '#27282b', '#ae7049', '#d6b76c', '#c4c5c9', '#a38cbb'];
export const OUTFIT_COLORS = ['#7fa99b', '#8fa5c9', '#c99895', '#c6ad71', '#a794ba'];
export function emptyProgress() { return { avatar: { ...DEFAULT_AVATAR }, rounds: 0, xp: 0, oximeterSite: 'finger' }; }
export function sanitizeProgress(value) {
  const clean = emptyProgress();
  if (!value || typeof value !== 'object') return clean;
  clean.rounds = Number.isSafeInteger(value.rounds) && value.rounds >= 0 ? Math.min(value.rounds, 1000000) : 0;
  clean.xp = clean.rounds * 150;
  clean.oximeterSite = value.oximeterSite === 'toe' ? 'toe' : 'finger';
  const a = value.avatar || {};
  clean.avatar.name = typeof a.name === 'string' && a.name.trim() ? a.name.trim().slice(0, 24) : DEFAULT_AVATAR.name;
  if (SKIN_COLORS.includes(a.skin)) clean.avatar.skin = a.skin;
  if (HAIR_COLORS.includes(a.hairColor)) clean.avatar.hairColor = a.hairColor;
  if (['wave', 'short', 'buns', 'none'].includes(a.hair)) clean.avatar.hair = a.hair;
  if (['round', 'happy', 'anime'].includes(a.eyes)) clean.avatar.eyes = a.eyes;
  if (OUTFIT_COLORS.includes(a.outfit) || (a.outfit === 'stars' && clean.rounds >= 3)) clean.avatar.outfit = a.outfit;
  return clean;
}
export function loadProgress(storage) {
  try { return sanitizeProgress(JSON.parse(storage.getItem(STORAGE_KEY))); } catch { return emptyProgress(); }
}
export function saveProgress(storage, progress) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
export function placeEquipment(placed, selectedId, targetId) {
  if (!EQUIPMENT.some(e => e.id === selectedId) || selectedId !== targetId || placed.includes(selectedId)) return { placed, correct: false, complete: false };
  const next = [...placed, selectedId];
  return { placed: next, correct: true, complete: next.length === EQUIPMENT.length };
}
export function completeRound(progress) {
  const rounds = progress.rounds + 1;
  return { ...progress, rounds, xp: rounds * 150 };
}
export function targetFor(item, site) { return item.id === 'oximeter' && site === 'toe' ? { x: 59, y: 91 } : item.target; }
