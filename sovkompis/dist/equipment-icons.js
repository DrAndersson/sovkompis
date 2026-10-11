import { ECG_LEADS } from './model.js';

export function equipmentSVG(type) {
 const lead = ECG_LEADS.find(item => item.id === type);
 if (lead) return `<svg viewBox="0 0 80 80" fill="none" aria-hidden="true"><path d="M33 36Q14 53 36 58T60 70" stroke="#719ca4" stroke-width="4" stroke-linecap="round"/><rect x="56" y="65" width="14" height="8" rx="3" fill="#587e88"/><circle cx="35" cy="28" r="20" fill="#fbfaf2" stroke="#c2d4d1" stroke-width="2"/><circle cx="35" cy="28" r="12" fill="#719ca4"/><text x="35" y="33" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="600" fill="white">${lead.number}</text></svg>`;
 const art = {
 cannula: '<path d="M14 22Q9 45 32 43L46 43Q68 45 65 22M40 45Q27 60 35 70" stroke="#81aebe"/><path d="M32 43V34M45 43V34" stroke="#81aebe"/><path d="M17 22L12 17M62 22L67 17" stroke="#afd0d8"/>',
 thorax: '<ellipse cx="40" cy="38" rx="28" ry="15" stroke="#7890ad" stroke-width="13"/><path d="M12 38Q40 59 68 38" stroke="#647e9b" stroke-width="13"/><rect x="29" y="41" width="22" height="17" rx="4" fill="#d9e3e9"/><rect x="35" y="46" width="10" height="7" rx="1" fill="#8299ad"/>',
 abdomen: '<ellipse cx="40" cy="38" rx="28" ry="15" stroke="#ad9abb" stroke-width="13"/><path d="M12 38Q40 59 68 38" stroke="#9280a3" stroke-width="13"/><rect x="30" y="41" width="20" height="17" rx="4" fill="#e6dfed"/>',
 oximeter: '<path d="M42 53Q63 63 56 73" stroke="#cda07f"/><rect x="24" y="13" width="33" height="44" rx="13" fill="#deb393"/><rect x="28" y="16" width="25" height="27" rx="9" fill="#f6e3ca"/><rect x="33" y="23" width="15" height="12" rx="3" fill="#7d9c8d"/><path d="M35 29H39L41 26L44 31L46 29" stroke="#ecf5d6" stroke-width="1.5"/>',
 sentec: '<path d="M32 33Q20 56 51 57L60 66" stroke="#a3b27f"/><circle cx="35" cy="30" r="19" fill="#dfe5cc"/><circle cx="35" cy="30" r="12" fill="#a4b681"/><circle cx="32" cy="27" r="4" fill="#d4dfb8"/><rect x="49" y="54" width="23" height="18" rx="4" fill="#edf0df" stroke="#a5b389" stroke-width="1.5"/><rect x="53" y="58" width="15" height="7" rx="2" fill="#64806a"/>',
 };
 return `<svg viewBox="0 0 80 80" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${art[type] || ''}</svg>`;
}
