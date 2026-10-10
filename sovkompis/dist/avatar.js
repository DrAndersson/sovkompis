import { ECG_LEADS } from './model.js?v=20261010-motion';
// Replace this renderer with a GLB/Three.js avatar later. Locations use a shared 0–100 coordinate space.
export function avatarSVG(avatar, { id = 'avatar', placed = [], sleeping = false, site = 'finger' } = {}) {
  const p = key => `${id}-${key}`;
  const skin = avatar.skin, hair = avatar.hairColor, outfit = avatar.outfit === 'stars' ? '#647ea6' : avatar.outfit;
  const grad = key => `url(#${p(key)})`;
  const has = key => placed.includes(key);
  let hairSVG = '';
  const longHairBack = avatar.hair === 'long' ? `<g data-hair="long"><path d="M106 111C98 32 259 20 260 111L269 213Q261 244 229 232L222 165H140L133 232Q102 245 93 216Z" fill="${grad('hair')}"/><path d="M112 137Q103 197 112 223M251 135Q261 197 250 223" stroke="#fff" opacity=".12" fill="none" stroke-width="5" stroke-linecap="round"/></g>` : '';
  const extraHairBack = avatar.hair === 'bob' ? `<path d="M104 115C97 20 266 24 260 118L266 178Q246 199 228 175L136 174Q112 191 97 175Z" fill="${grad('hair')}"/>` : avatar.hair === 'ponytail' ? `<path d="M247 72Q294 59 292 106C280 155 297 171 311 195Q258 202 256 154L253 102Z" fill="${grad('hair')}"/><path d="M253 84L271 93" stroke="#b99bce" stroke-width="12" stroke-linecap="round"/>` : '';
  if (avatar.hair === 'wave') hairSVG = `<path d="M115 123C103 111 103 89 112 76C111 52 133 44 149 47C163 25 191 30 204 44C229 33 252 50 249 66C273 76 274 108 255 124L244 110L242 82C225 91 210 86 198 75C179 94 147 86 125 96L123 123Z" fill="${grad('hair')}"/><path d="M130 76Q150 54 175 63M187 52Q204 48 221 60" fill="none" stroke="#fff" opacity=".12" stroke-width="8" stroke-linecap="round"/>`;
  if (avatar.hair === 'short') hairSVG = `<path d="M111 121V90C111 36 253 31 254 90L249 123L236 102L234 80Q204 84 190 71Q162 92 127 90L127 120Z" fill="${grad('hair')}"/>`;
  if (avatar.hair === 'buns') hairSVG = `<circle cx="112" cy="76" r="29" fill="${grad('hair')}"/><circle cx="251" cy="76" r="29" fill="${grad('hair')}"/><path d="M111 126V93C111 29 252 26 254 93V125L239 102L236 79Q206 91 184 65Q163 92 127 88L126 120Z" fill="${grad('hair')}"/>`;
  if (avatar.hair === 'long') hairSVG = `<path d="M109 128L109 96C111 34 250 29 254 94L253 141Q256 179 242 190L237 104Q205 99 187 69Q170 100 128 106L125 168Q121 183 115 188L108 164Z" fill="${grad('hair')}"/><path d="M130 82Q147 62 170 60M208 59Q232 66 240 83" stroke="#fff" opacity=".13" fill="none" stroke-width="6" stroke-linecap="round"/>`;
  if (avatar.hair === 'bob' || avatar.hair === 'ponytail') hairSVG = `<path d="M110 128L110 92C112 32 253 32 255 93L253 127L241 108L234 84Q204 103 184 73Q161 97 127 94L124 124Z" fill="${grad('hair')}"/><path d="M130 76Q153 53 179 59" stroke="#fff" opacity=".14" fill="none" stroke-width="6" stroke-linecap="round"/>`;
  let eyes = `<ellipse cx="157" cy="131" rx="5.7" ry="8" fill="#343231"/><ellipse cx="206" cy="131" rx="5.7" ry="8" fill="#343231"/><circle cx="159" cy="128" r="1.7" fill="white"/><circle cx="208" cy="128" r="1.7" fill="white"/>`;
  if (avatar.eyes === 'happy' || sleeping) eyes = `<path d="M148 134Q157 ${sleeping ? 142 : 120} 166 134M198 134Q207 ${sleeping ? 142 : 120} 216 134" fill="none" stroke="#493b35" stroke-width="4" stroke-linecap="round"/>`;
  if (avatar.eyes === 'anime' && !sleeping) eyes = `<ellipse cx="157" cy="133" rx="8" ry="11" fill="#414e4a"/><ellipse cx="207" cy="133" rx="8" ry="11" fill="#414e4a"/><ellipse cx="159" cy="128" rx="3" ry="4" fill="white"/><ellipse cx="209" cy="128" rx="3" ry="4" fill="white"/><path d="M148 123L163 121M199 121L215 123" stroke="#493b35" stroke-width="3" stroke-linecap="round"/>`;
  return `<svg class="avatar-svg" viewBox="0 0 360 460" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="${p('skin')}" cx="35%" cy="28%" r="80%"><stop stop-color="${skin}"/><stop offset=".7" stop-color="${skin}"/><stop offset="1" stop-color="#a97659"/></radialGradient>
    <linearGradient id="${p('shirt')}" x1="0" x2="1" y2=".4"><stop stop-color="${outfit}"/><stop offset=".45" stop-color="${outfit}"/><stop offset="1" stop-color="#3e645e"/></linearGradient>
    <linearGradient id="${p('hair')}" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="${hair}"/><stop offset="1" stop-color="${hair}"/><stop offset="1" stop-color="#342b2a"/></linearGradient>
    <linearGradient id="${p('pants')}" x1="0" x2="1"><stop stop-color="#f2e9d9"/><stop offset="1" stop-color="#d7c9b4"/></linearGradient>
    <filter id="${p('shadow')}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
    <pattern id="${p('stars')}" width="31" height="33" patternUnits="userSpaceOnUse"><path d="m15 7 2 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z" fill="#f5e8b8" opacity=".85"/></pattern>
  </defs>
  <ellipse cx="180" cy="437" rx="86" ry="11" fill="#365c50" opacity=".14" filter="${grad('shadow')}"/>
  ${longHairBack}${extraHairBack}
  <path d="M126 307L132 400Q145 414 168 400L179 329L193 400Q213 414 232 400L238 306Z" fill="${grad('pants')}"/>
  <path d="M133 394Q111 401 119 419Q141 432 171 421L169 398Z" fill="#f9f6ec"/><path d="M192 398L190 420Q226 433 244 417Q248 401 230 394Z" fill="#f9f6ec"/>
  <path d="M120 417Q145 427 170 418M192 418Q220 427 243 416" fill="none" stroke="#d9d5c7" stroke-width="4"/>
  <path d="M125 201Q106 192 98 217L79 276Q76 295 92 300Q108 302 114 285L135 235Z" fill="${grad('shirt')}"/>
  <path d="M235 201Q254 192 262 217L281 276Q284 295 268 300Q252 302 246 285L225 235Z" fill="${grad('shirt')}"/>
  <ellipse cx="89" cy="302" rx="16" ry="22" transform="rotate(12 89 302)" fill="${grad('skin')}"/><ellipse cx="271" cy="302" rx="16" ry="22" transform="rotate(-12 271 302)" fill="${grad('skin')}"/>
  <path d="M143 184Q179 174 218 184L238 208L245 304Q219 326 180 324Q140 326 116 304L122 208Z" fill="${grad('shirt')}"/>
  ${avatar.outfit === 'stars' ? `<path d="M143 184Q179 174 218 184L238 208L245 304Q219 326 180 324Q140 326 116 304L122 208Z" fill="${grad('stars')}"/>` : ''}
  <path d="M122 302Q180 319 239 302" stroke="#fff" opacity=".18" fill="none" stroke-width="8"/>
  <path d="M159 169V190Q180 212 201 190V169" fill="${grad('skin')}"/>
  <path d="M147 184Q180 223 212 184" fill="none" stroke="#d8e5d2" stroke-width="7" opacity=".7"/>
  <ellipse cx="114" cy="131" rx="14" ry="19" fill="${grad('skin')}"/><ellipse cx="248" cy="131" rx="14" ry="19" fill="${grad('skin')}"/>
  <path d="M116 94Q126 52 181 53Q238 51 247 95L245 137Q241 181 181 184Q121 181 116 137Z" fill="${grad('skin')}"/>
  ${hairSVG}
  <ellipse cx="140" cy="147" rx="11" ry="6" fill="#d9847b" opacity=".28"/><ellipse cx="223" cy="147" rx="11" ry="6" fill="#d9847b" opacity=".28"/>
  ${eyes}
  <path d="M179 134L175 145Q181 150 187 145" stroke="#bc886b" opacity=".6" fill="none" stroke-width="2.5" stroke-linecap="round"/>
  ${sleeping ? '<ellipse cx="182" cy="161" rx="5" ry="4" fill="#b37d65"/>' : '<path d="M172 158Q181 166 191 158" fill="none" stroke="#a36954" stroke-width="3" stroke-linecap="round"/>'}
  ${has('cannula') ? '<path d="M118 128Q115 163 173 151L188 151Q245 164 246 128M181 154Q156 181 155 236" fill="none" stroke="#689da9" stroke-width="5" stroke-linecap="round"/><path d="M175 151V145M186 151V145" stroke="#d9f3f4" stroke-width="4" stroke-linecap="round"/>' : ''}
  ${has('thorax') ? '<path d="M121 233Q180 249 240 233L241 250Q182 266 119 250Z" fill="#637e9d"/><rect x="169" y="239" width="25" height="19" rx="5" fill="#d5e1e5"/><rect x="175" y="244" width="13" height="9" rx="2" fill="#5c758e"/>' : ''}
  ${has('abdomen') ? '<path d="M118 290Q180 305 243 290L244 307Q182 326 117 307Z" fill="#9581aa"/><rect x="170" y="297" width="25" height="19" rx="5" fill="#e2dbe9"/>' : ''}
  ${has('oximeter') && site === 'finger' ? '<path d="M88 316Q54 346 85 368L121 375" stroke="#d39f7b" stroke-width="4" fill="none"/><rect x="75" y="296" width="25" height="29" rx="10" fill="#e3b28c"/><rect x="79" y="299" width="17" height="13" rx="4" fill="#faf0d9"/><circle cx="88" cy="306" r="3" fill="#81a495"/>' : ''}
  ${has('oximeter') && site === 'toe' ? '<path d="M223 423Q273 448 282 389" stroke="#d39f7b" stroke-width="4" fill="none"/><rect x="202" y="408" width="29" height="22" rx="9" fill="#e3b28c"/><rect x="207" y="411" width="18" height="11" rx="4" fill="#faf0d9"/>' : ''}
  ${has('sentec') ? '<path d="M180 210Q199 228 254 258L300 301L300 358" fill="none" stroke="#96a872" stroke-width="4" stroke-linecap="round"/><circle cx="180" cy="207" r="14" fill="#e9ead7"/><circle cx="180" cy="207" r="9" fill="#aaba85"/><circle cx="178" cy="205" r="3" fill="#dce7c3"/><rect x="271" y="352" width="66" height="47" rx="9" fill="#f6f5eb" stroke="#c9d1bb" stroke-width="2"/><rect x="280" y="359" width="48" height="24" rx="5" fill="#466858"/><path d="M285 372H293L298 365L303 377L308 369H322" fill="none" stroke="#bdd5a2" stroke-width="2"/><circle cx="302" cy="390" r="3" fill="#9bb582"/>' : ''}
  ${ECG_LEADS.filter(lead => has(lead.id)).map(lead => `<g data-ecg="${lead.id}"><path d="${lead.cable}" fill="none" stroke="#668b94" stroke-width="3" stroke-linecap="round"/><circle cx="${lead.target.x * 3.6}" cy="${lead.target.y * 4.6}" r="13" fill="#f9f8ed" stroke="#c1d1cf" stroke-width="2"/><circle cx="${lead.target.x * 3.6}" cy="${lead.target.y * 4.6}" r="8" fill="#72979e"/><text x="${lead.target.x * 3.6}" y="${lead.target.y * 4.6 + 4}" fill="white" font-size="11" font-family="sans-serif" text-anchor="middle">${lead.number}</text></g>`).join('')}
  ${ECG_LEADS.some(lead => has(lead.id)) ? '<rect x="256" y="327" width="21" height="13" rx="5" fill="#547881"/>' : ''}
  </svg>`;
}
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
