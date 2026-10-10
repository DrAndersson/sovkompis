export const STORAGE_KEY = 'sovkompis-v1';
export const XP_PER_PART = 20;
export const COMPLETION_BONUS = 50;
// Patient's right is on the left of the front-facing avatar. Positions are schematic.
export const ECG_LEADS = [
  { id: 'ecg-right', number: 1, short: 'Övre höger', location: 'övre högra delen', target: { x: 36, y: 45 }, cable: 'M130 207Q112 244 142 283L267 335' },
  { id: 'ecg-left', number: 2, short: 'Övre vänster', location: 'övre vänstra delen', target: { x: 64, y: 45 }, cable: 'M230 207Q260 257 241 290L267 335' },
  { id: 'ecg-lower', number: 3, short: 'Nedre vänster', location: 'nedre vänstra delen', target: { x: 62, y: 59 }, cable: 'M223 271Q201 310 267 335' },
];
export const EQUIPMENT = [
  { id: 'cannula', name: 'Näsgrimma', short: 'Näsan', color: '#87b6c7', description: 'Den tunna slangen känner av luften när du andas.', instruction: 'Dra näsgrimman till näsan på din sovkompis.', success: 'Fint! Näsgrimman sitter vid näsan.', target: { x: 50, y: 33 } },
  { id: 'thorax', name: 'Bröstband', subtitle: 'Thoraxband', short: 'Bröstkorg', color: '#718cae', description: 'Bandet följer bröstkorgens rörelser när du andas.', instruction: 'Dra bröstbandet runt bröstkorgen, ovanför magen.', success: 'Precis! Det här bandet följer bröstkorgens rörelser.', target: { x: 50, y: 52 } },
  { id: 'abdomen', name: 'Magband', short: 'Mage', color: '#a18bb3', description: 'Det här bandet följer magens rörelser när du andas.', instruction: 'Dra magbandet till magen, under bröstbandet.', success: 'Där satt det! Magbandet får följa med när magen rör sig.', target: { x: 50, y: 65 } },
  { id: 'oximeter', name: 'Pulsoximeter', short: 'Finger', color: '#cb9974', description: 'En liten sensor mäter syresättningen i blodet och din puls.', instruction: 'Dra pulsoximetern till den markerade handen eller foten.', success: 'Bra jobbat! Nu är pulsoximetern på plats.', target: { x: 25, y: 65 } },
  { id: 'sentec', name: 'Koldioxidmätare', short: 'Övre bröstkorg', color: '#9caa72', description: 'Sensorn sitter mot huden och mäter koldioxid genom huden. En sladd går till monitorn.', instruction: 'Dra koldioxidmätaren till övre delen av bröstkorgen. Personalen visar den exakta platsen på dig.', success: 'Toppen! Koldioxidmätaren och sladden är på plats.', target: { x: 50, y: 45 } },
  ...ECG_LEADS.map(lead => ({ ...lead, kind: 'ecg', name: `EKG-kabel ${lead.number}`, subtitle: lead.short, color: '#719ca4', description: 'Tre små klisterlappar med kablar hjälper till att registrera hjärtats slag. De sitter mot huden.', instruction: `Sätt kabel ${lead.number} på ${lead.location} av bröstkorgen, räknat från din sovkompis håll. Personalen visar exakt var på dig.`, success: `Fint! EKG-kabel ${lead.number} sitter på ${lead.location} av bröstkorgen.` })),
];
export const ROUND_XP = EQUIPMENT.length * XP_PER_PART + COMPLETION_BONUS;
export const DEFAULT_AVATAR = { name: 'Min sovkompis', skin: '#edbb96', hairColor: '#594238', hair: 'wave', eyes: 'round', outfit: '#7fa99b' };
export const SKIN_COLORS = ['#f5d4ba', '#edbb96', '#c98d67', '#976547', '#654536'];
export const HAIR_COLORS = ['#594238', '#27282b', '#ae7049', '#d6b76c', '#c4c5c9', '#a38cbb'];
export const OUTFIT_COLORS = ['#7fa99b', '#8fa5c9', '#c99895', '#c6ad71', '#a794ba'];
export function emptyProgress() { return { scoreVersion: 2, avatar: { ...DEFAULT_AVATAR }, rounds: 0, xp: 0, oximeterSite: 'finger' }; }
export function sanitizeProgress(value) {
  const clean = emptyProgress();
  if (!value || typeof value !== 'object') return clean;
  clean.rounds = Number.isSafeInteger(value.rounds) && value.rounds >= 0 ? Math.min(value.rounds, 1000000) : 0;
  // Preserve XP already earned with the original five-part exercise.
  clean.xp = Number.isSafeInteger(value.xp) && value.xp >= clean.rounds * 150 && value.xp <= clean.rounds * ROUND_XP
    ? value.xp : clean.rounds * (value.scoreVersion === 2 ? ROUND_XP : 150);
  clean.oximeterSite = value.oximeterSite === 'toe' ? 'toe' : 'finger';
  const a = value.avatar || {};
  clean.avatar.name = typeof a.name === 'string' && a.name.trim() ? a.name.trim().slice(0, 24) : DEFAULT_AVATAR.name;
  if (SKIN_COLORS.includes(a.skin)) clean.avatar.skin = a.skin;
  if (HAIR_COLORS.includes(a.hairColor)) clean.avatar.hairColor = a.hairColor;
  if (['wave', 'short', 'buns', 'long', 'bob', 'ponytail', 'none'].includes(a.hair)) clean.avatar.hair = a.hair;
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
  return { ...progress, scoreVersion: 2, rounds, xp: progress.xp + ROUND_XP };
}
export function targetFor(item, site) { return item.id === 'oximeter' && site === 'toe' ? { x: 59, y: 91 } : item.target; }
export function availableTargets(placed, selectedId) {
  const ecg = ECG_LEADS.some(lead => lead.id === selectedId);
  return EQUIPMENT.filter(item => !placed.includes(item.id) && (ecg
    ? item.kind === 'ecg'
    : selectedId === 'sentec'
      ? ['sentec', 'cannula', 'abdomen', 'oximeter'].includes(item.id)
      : item.kind !== 'ecg' && item.id !== 'sentec'));
}
