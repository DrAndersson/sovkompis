import { DEFAULT_AVATAR, EQUIPMENT, XP_PER_PART, COMPLETION_BONUS, ROUND_XP, availableTargets, SKIN_COLORS, HAIR_COLORS, OUTFIT_COLORS, loadProgress, saveProgress, placeEquipment, completeRound, targetFor } from './model.js?v=20261010-motion';
import { avatarSVG, equipmentSVG } from './avatar.js?v=20261010-motion';

let storage;
try { storage = window.localStorage; } catch { storage = null; }
let progress = loadProgress(storage);
let screen = location.hash === '#avatar' ? 'avatar' : 'welcome', tab = 'hair', placed = [], selected = null, feedback = '', feedbackKind = '', roundCounted = false, showHint = false, reading = false, drag = null, storageWarning = false;
const app = document.querySelector('#app');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iconPaths = {
 moon: '<path d="M20.3 14.1A8.8 8.8 0 0 1 9.9 3.7a8.8 8.8 0 1 0 10.4 10.4Z"/>',
 star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9Z"/>',
 arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
 back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
 sound: '<path d="m11 5-6 4H2v6h3l6 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 check: '<path d="m5 12 4 4L19 6"/>',
 heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01"/>',
 spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
 person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 hand: '<path d="M8 13V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9a7 7 0 0 1-12 5l-5-6a2 2 0 0 1 3-3l2 2"/>',
 lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
 gift: '<path d="M3 8h18v5H3zm2 5v8h14v-8M12 8v13"/><path d="M12 8H8a3 3 0 1 1 3-3Zm0 0h4a3 3 0 1 0-3-3Z"/>',
 refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>',
 close: '<path d="m6 6 12 12M18 6 6 18"/>',
 leaf: '<path d="M20 3C8 2 2 8 5 16c8 4 14-1 15-13ZM4 21 15 9"/>',
 eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 shirt: '<path d="m8 3-6 4 3 6 3-2v10h8V11l3 2 3-6-6-4a4 4 0 0 1-8 0Z"/>',
 hair: '<path d="M5 14C0 5 8 1 12 4c7-4 13 4 7 10M5 12v7m14-7v7M6 10c4 1 6-2 7-4 1 3 3 4 6 4"/>',
 volumeoff: '<path d="m11 5-6 4H2v6h3l6 4Zm6 4 5 6m0-6-5 6"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.spark}</svg>`;
const currentItem = () => EQUIPMENT.find(e => e.id === selected);
const save = () => { storageWarning = !saveProgress(storage, progress); };
function announce(text) { document.querySelector('#announcer').textContent = ''; requestAnimationFrame(() => document.querySelector('#announcer').textContent = text); }
function go(next) {
  window.speechSynthesis?.cancel(); reading = false;
  screen = next; render();
  document.querySelector('h1')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function header() {
 const step = screen === 'welcome' ? 1 : screen === 'avatar' ? 2 : 3;
 return `<header class="header"><button class="brand" data-action="home" aria-label="Sovkompis, till välkomstsidan"><span class="brand-icon">${icon('moon')}</span>Sovkompis<span class="brand-dot">✦</span></button>
 <nav class="step-nav" aria-label="Din resa">${['Välkommen', 'Din sovkompis', 'Öva tillsammans'].map((s, i) => `<button data-action="nav" data-step="${i + 1}" class="step ${step === i + 1 ? 'current' : ''} ${step > i + 1 ? 'done' : ''}" ${step === i + 1 ? 'aria-current="step"' : ''} ${i === 2 && step < 3 ? 'disabled' : ''}><span class="step-number">${step > i + 1 ? icon('check') : i + 1}</span><span>${s}</span></button>${i < 2 ? '<span class="step-line"></span>' : ''}`).join('')}</nav>
 <div class="header-end"><span class="xp-pill" title="Erfarenhetspoäng">${icon('star')} <b>${progress.xp + (!roundCounted && screen === 'practice' ? placed.length * XP_PER_PART : 0)}</b> XP</span><button class="icon-button help-button" data-action="help" aria-label="Hjälp">${icon('help')}</button></div></header>`;
}
function footer() {
 return `<footer class="footer"><span>${icon('heart')} En liten övning för en tryggare natt.</span><button data-action="about">Om övningen</button><span class="local-note">${storageWarning ? 'Framsteg kan inte sparas i den här webbläsaren.' : 'Din sovkompis sparas bara i din webbläsare.'}</span></footer>`;
}
function listenButton() { return `<button class="text-button listen" data-action="listen" aria-pressed="${reading}">${icon(reading ? 'volumeoff' : 'sound')} ${reading ? 'Sluta lyssna' : 'Lyssna'}</button>`; }
function welcome() {
 return `<main id="main" class="welcome-main"><section class="welcome-hero"><div class="welcome-copy"><div class="eyebrow"><span class="tiny-dot"></span> INFÖR DIN ANDNINGSREGISTRERING</div><h1 tabindex="-1">Hej och välkommen<br>till <span class="serif-em">Sovkompis.</span></h1><p class="intro">En ny upplevelse känns ofta lättare<br class="desktop-break"> när man har fått prova först.</p><p class="welcome-description">Här får du skapa en egen kompis och lära känna delarna du ska ha på dig när du sover. Vi tar det tillsammans, en liten bit i taget.</p><div class="hero-actions"><button class="button primary large" data-action="create">${progress.rounds ? 'Träffa din sovkompis' : 'Skapa din sovkompis'} ${icon('arrow')}</button>${listenButton()}</div><div class="calm-note">${icon('leaf')} I din takt. Inga tidtagare. Du får prova igen.</div></div>
 <div class="welcome-art"><div class="scene-orbit orbit-one"></div><div class="scene-orbit orbit-two"></div><div class="moon-decoration">${icon('moon')}</div><span class="scene-star star-one">✦</span><span class="scene-star star-two">✧</span><span class="scene-star star-three">✦</span><div class="cloud cloud-one"></div><div class="cloud cloud-two"></div><div class="hello-bubble">Hej! Ska vi öva ihop? <span>✧</span></div><div class="welcome-avatar">${avatarSVG(progress.avatar, { id: 'welcome' })}</div><div class="platform"></div><div class="art-badge"><span class="badge-heart">${icon('heart')}</span><div>Din egen sovkompis<small>Redo för ett litet äventyr</small></div></div><div class="tiny-flower">✳</div></div></section>
 <section class="journey-section" aria-labelledby="journey-title"><div class="section-heading"><h2 id="journey-title">Tre små steg. Lite tryggare.</h2><span>Det här gör vi tillsammans</span></div><div class="journey-cards"><article class="journey-card"><span class="journey-icon peach">${icon('person')}</span><div><span class="card-overline">01 · SKAPA</span><h3>En kompis som är du</h3><p>Välj hår, ögon och dina favoritkläder.</p></div></article><article class="journey-card"><span class="journey-icon sage">${icon('hand')}</span><div><span class="card-overline">02 · UPPTÄCK</span><h3>Prova alla delarna</h3><p>Dra dem till din kompis och lär dig mer.</p></div></article><article class="journey-card"><span class="journey-icon lavender">${icon('moon')}</span><div><span class="card-overline">03 · FIRA</span><h3>Redo för en god natt</h3><p>Samla stjärnor och lås upp något fint.</p></div></article></div></section>${progress.rounds ? `<div class="returning-note">${icon('star')} Du har redan övat ${progress.rounds} ${progress.rounds === 1 ? 'gång' : 'gånger'}. Vad fint att du är tillbaka!</div>` : ''}</main>`;
}
const swatches = (colors, field, labels) => `<div class="swatches">${colors.map((color, i) => `<button class="swatch ${progress.avatar[field] === color ? 'active' : ''}" style="--swatch:${color}" data-action="customize" data-field="${field}" data-value="${color}" aria-label="${labels[i]}" aria-pressed="${progress.avatar[field] === color}">${progress.avatar[field] === color ? icon('check') : ''}</button>`).join('')}</div>`;
function customizeOptions() {
 if (tab === 'hair') return `<h3>Vilken frisyr känns som du?</h3><div class="option-grid hairstyles">${[['wave', 'Rufsigt'], ['short', 'Kort'], ['buns', 'Knuttar'], ['long', 'Långt hår'], ['bob', 'Page'], ['ponytail', 'Hästsvans'], ['none', 'Utan hår']].map(([value, name]) => `<button class="option-card ${progress.avatar.hair === value ? 'active' : ''}" data-action="customize" data-field="hair" data-value="${value}" aria-pressed="${progress.avatar.hair === value}"><span class="mini-head">${avatarSVG({ ...progress.avatar, hair: value }, { id: `hair-${value}` })}</span>${name}</button>`).join('')}</div><h3>Hårfärg</h3>${swatches(HAIR_COLORS, 'hairColor', ['Brunt', 'Svart', 'Koppar', 'Blont', 'Grått', 'Lila'])}`;
 if (tab === 'face') return `<h3>Ögon med personlighet</h3><div class="option-grid eyes-options">${[['round', 'Nyfikna', '● ●'], ['happy', 'Glada', '⌒ ⌒'], ['anime', 'Stora', '◕ ◕']].map(([value, label, glyph]) => `<button class="option-card ${progress.avatar.eyes === value ? 'active' : ''}" data-action="customize" data-field="eyes" data-value="${value}" aria-pressed="${progress.avatar.eyes === value}"><span class="eyes-glyph">${glyph}</span>${label}</button>`).join('')}</div><h3>Hudton</h3>${swatches(SKIN_COLORS, 'skin', ['Ljus', 'Ljus mellan', 'Mellan', 'Mörk mellan', 'Mörk'])}`;
 return `<h3>En favoritfärg att mysa i</h3>${swatches(OUTFIT_COLORS, 'outfit', ['Salviagrön', 'Himmelsblå', 'Rosa', 'Honungsgul', 'Lavendel'])}<button class="unlock-outfit ${progress.rounds >= 3 ? 'unlocked' : ''} ${progress.avatar.outfit === 'stars' ? 'active' : ''}" data-action="star-outfit" ${progress.rounds < 3 ? 'disabled' : ''} ${progress.rounds >= 3 ? `aria-pressed="${progress.avatar.outfit === 'stars'}"` : ''}><span class="reward-shirt">${icon('shirt')}<span>✦</span></span><div><strong>Stjärntröjan</strong><small>${progress.rounds >= 3 ? 'Din belöning! Tryck för att ta på den.' : `Öva 3 gånger för att låsa upp · ${progress.rounds}/3`}</small></div>${icon(progress.rounds >= 3 ? 'check' : 'lock')}</button><p class="soft-caption">En liten belöning för varje gång du vågar prova.</p>`;
}
function avatarPage() {
 return `<main id="main" class="inner-main"><div class="page-heading"><div><div class="eyebrow">STEG 2 · SKAPA DIN SOVKOMPIS</div><h1 tabindex="-1">En kompis på ditt sätt.</h1><p>Lite som du, eller någon helt ny. Du bestämmer.</p></div>${listenButton()}</div><section class="demo-entry" aria-label="Prova 3D-demo"><div><strong>Din sovkompis i 3D <small>NY DEMO</small></strong><p>Skapa en 3D-kompis, öva med delarna och säg god natt.</p></div><a href="./demo-3d.html">Öppna 3D-demon →</a></section><div class="builder-layout"><section class="customizer panel"><div class="tabs" role="tablist" aria-label="Ändra din sovkompis">${[['hair', 'Hår', 'hair'], ['face', 'Ansikte', 'eye'], ['clothes', 'Kläder', 'shirt']].map(([value, label, ico]) => `<button role="tab" id="tab-${value}" aria-controls="customize-panel" aria-selected="${tab === value}" tabindex="${tab === value ? 0 : -1}" class="${tab === value ? 'active' : ''}" data-action="tab" data-value="${value}">${icon(ico)}${label}</button>`).join('')}</div><div class="customizer-body" id="customize-panel" role="tabpanel" aria-labelledby="tab-${tab}">${customizeOptions()}</div><label class="name-field" for="avatar-name">Vad heter din sovkompis?<input id="avatar-name" maxlength="24" value="${escape(progress.avatar.name)}" placeholder="Ett namn du tycker om" autocomplete="off"></label></section>
 <section class="builder-preview" aria-label="Förhandsvisning av din sovkompis"><span class="preview-star">✧</span><div class="avatar-halo"></div><div class="builder-avatar">${avatarSVG(progress.avatar, { id: 'builder' })}</div><div class="avatar-name">${escape(progress.avatar.name)} <span>✦</span></div><span class="preview-caption">Precis lagom mycket du.</span></section>
 <aside class="builder-aside"><div class="small-spark">${icon('spark')}</div><h2>Vi gör det<br>tillsammans.</h2><p>Din sovkompis provar först. Sedan vet du lite mer om hur det kan kännas.</p><div class="reward-preview">${icon('gift')}<strong>En överraskning väntar</strong><p>Öva tre gånger och få en alldeles egen stjärntröja.</p><div class="round-dots">${[1, 2, 3].map(n => `<span class="${progress.rounds >= n ? 'filled' : ''}">${progress.rounds >= n ? icon('check') : n}</span>`).join('')}</div></div></aside></div><div class="bottom-actions"><button class="text-button" data-action="home">${icon('back')} Tillbaka</button><span>Du kan alltid ändra din kompis senare.</span><button class="button primary" data-action="start">Nu provar vi delarna ${icon('arrow')}</button></div></main>`;
}
function practicePage() {
 const item = currentItem();
 return `<main id="main" class="inner-main practice-main"><div class="page-heading"><div><div class="eyebrow">STEG 3 · ÖVA TILLSAMMANS</div><h1 tabindex="-1">En liten del i taget.</h1><p>Dra en del till din sovkompis. Du kan också trycka på delen och sedan på rätt plats.</p></div>${listenButton()}</div>
 <div class="practice-layout"><section class="equipment-panel panel" aria-labelledby="equipment-title"><div class="panel-title"><h2 id="equipment-title">Dina delar</h2><span>${placed.length} av ${EQUIPMENT.length}</span></div><p class="inventory-tip">Bläddra i listan för att se alla ${EQUIPMENT.length} delar.</p><div class="equipment-list">${EQUIPMENT.map((e, i) => `<button class="equipment-card ${selected === e.id ? 'selected' : ''} ${placed.includes(e.id) ? 'placed' : ''}" data-action="select" data-equipment="${e.id}" aria-pressed="${selected === e.id}" ${placed.includes(e.id) ? 'disabled' : ''}><span class="equipment-image">${equipmentSVG(e.id)}</span><span class="equipment-text"><strong>${e.name}</strong><small>${placed.includes(e.id) ? 'På plats!' : e.subtitle || 'Tryck eller dra'}</small></span><span class="equipment-number">${placed.includes(e.id) ? icon('check') : i + 1}</span></button>`).join('')}</div></section>
 <section class="practice-scene" aria-label="Placera utrustningen på din sovkompis"><div class="scene-top"><span class="scene-name">${escape(progress.avatar.name)}</span><span class="scene-tag">${icon('heart')} Vi övar ihop</span></div><div class="practice-halo"></div><div class="avatar-stage">${avatarSVG(progress.avatar, { id: 'practice', placed, site: progress.oximeterSite })}<div class="drop-targets">${availableTargets(placed, selected).map(e => { const t = targetFor(e, progress.oximeterSite); return `<button class="drop-target ${e.kind === 'ecg' ? 'ecg-target' : ''} ${showHint && selected === e.id ? 'hinted' : ''}" style="left:${t.x}%;top:${t.y}%" data-action="place" data-target="${e.targetId}" aria-label="Placera vald del vid ${e.id === 'oximeter' ? e.site === 'toe' ? 'tån' : 'fingret' : e.kind === 'ecg' ? `${e.short.toLowerCase()} på bröstkorgen` : e.short.toLowerCase()}" ${!selected ? 'disabled' : ''}><span>${e.kind === 'ecg' ? e.number : '+'}</span><span class="target-label">${e.id === 'oximeter' ? e.site === 'toe' ? 'Tå' : 'Finger' : e.short}</span></button>`; }).join('')}</div></div><p class="scene-bottom">${icon('hand')} ${item?.kind === 'ecg' ? 'Höger och vänster är din sovkompis sidor.' : selected ? 'Dra eller tryck på en plats på figuren' : 'Börja med att välja en del i listan'}</p></section>
 <aside class="coach-panel"><div class="practice-progress"><div><strong>Du är på väg!</strong><span>${placed.length}/${EQUIPMENT.length} delar</span></div><div class="progress-track"><span style="width:${placed.length / EQUIPMENT.length * 100}%"></span></div><p>Varje liten del ger +${XP_PER_PART} XP ${icon('star')}</p></div><div class="coach-card ${feedbackKind === 'correct' ? 'success' : ''}"><span class="coach-icon">${icon(feedbackKind === 'correct' ? 'check' : item ? 'hand' : 'spark')}</span><span class="card-overline">${feedbackKind === 'correct' ? 'FINT JOBBAT' : item ? 'LÄR KÄNNA DELEN' : 'VI BÖRJAR HÄR'}</span><h2>${feedbackKind === 'correct' ? 'Där satt den!' : item ? item.name : 'Vilken del vill du prova?'}</h2><p>${feedback || (item ? item.description : 'Du kan börja med vilken del du vill. Det finns ingen brådska.')}</p>${item && feedbackKind !== 'correct' ? `<div class="instruction">${item.id === 'oximeter' ? 'Sätt pulsoximetern på fingret eller tån. Båda går bra i övningen.' : item.instruction}</div><button class="text-button hint-button" data-action="hint">${icon('eye')} ${showHint ? 'Dölj ledtråd' : 'Visa mig var'}</button>` : ''}</div><div class="reassurance">${icon('leaf')} <p>${feedbackKind === 'retry' ? 'Ingen fara. Här får du prova hur många gånger du vill.' : 'Här går det bra att prova sig fram. Vi hjälper dig på vägen.'}</p></div></aside></div><div class="bottom-actions"><button class="text-button" data-action="create">${icon('back')} Ändra din kompis</button><span>Personalen visar hur utrustningen ska sitta på just dig.</span><button class="text-button" data-action="restart">${icon('refresh')} Börja om övningen</button></div></main>`;
}
function celebration() {
 const newlyUnlocked = progress.rounds === 3;
 return `<main id="main" class="celebration-main"><div class="confetti" aria-hidden="true">${Array.from({ length: 42 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--delay:${(i % 8) * -.27}s;--color:${['#a1bca7', '#e3bd79', '#b1a2c5', '#dba799'][i % 4]};--spin:${i * 43}deg"></i>`).join('')}</div><div class="celebration-medal">${icon('star')}<span>✦</span></div><div class="eyebrow">ALLA ${EQUIPMENT.length} DELAR ÄR PÅ PLATS</div><h1 tabindex="-1">Bravo, du klarade det!</h1><p>Du och ${escape(progress.avatar.name)} har lärt känna alla delarna.<br>Det får du vara stolt över.</p><div class="earned-xp">${icon('star')} +${ROUND_XP} XP <span>${EQUIPMENT.length * XP_PER_PART} för delarna + ${COMPLETION_BONUS} för hela övningen</span></div><div class="reward-card"><span class="reward-shirt">${icon('shirt')}<span>✦</span></span><div><span class="card-overline">${progress.rounds >= 3 ? 'DIN BELÖNING' : 'SNART ÄR DEN DIN'}</span><h2>${newlyUnlocked ? 'Du låste upp stjärntröjan!' : progress.rounds >= 3 ? 'Stjärntröjan är din!' : 'En tröja full av stjärnor'}</h2><p>${progress.rounds >= 3 ? 'Den finns nu bland din sovkompis kläder.' : `${3 - progress.rounds} ${3 - progress.rounds === 1 ? 'övning' : 'övningar'} kvar till din nya tröja.`}</p><div class="reward-progress">${[1, 2, 3].map(n => `<span class="${progress.rounds >= n ? 'filled' : ''}">${progress.rounds >= n ? icon('check') : icon('star')}</span>`).join('')}</div></div></div><div class="celebration-actions">${progress.rounds >= 3 && progress.avatar.outfit !== 'stars' ? `<button class="button secondary" data-action="wear-reward">${icon('shirt')} Ta på stjärntröjan</button>` : ''}<button class="button primary" data-action="sleep">Dags att sova ${icon('moon')}</button></div><button class="text-button repeat-button" data-action="replay">${icon('refresh')} Öva en gång till</button></main>`;
}
function sleepPage() {
 return `<main id="main" class="sleep-main"><div class="sleep-copy"><div class="eyebrow">EN LUGN AVSLUTNING</div><h1 tabindex="-1">God natt,<br><span class="serif-em">lilla sovkompis.</span></h1><p>Alla delarna sitter kvar medan din kompis somnar. Nu har ni övat tillsammans.</p><p class="sleep-message">När det är din tur finns personalen där för att hjälpa dig.</p><div class="sleep-actions"><button class="button primary" data-action="replay">${icon('refresh')} Öva en gång till</button><button class="text-button" data-action="home">Till startsidan ${icon('arrow')}</button></div><span class="sleep-stat">${icon('star')} ${progress.rounds} ${progress.rounds === 1 ? 'övning' : 'övningar'} klar${progress.rounds === 1 ? '' : 'a'} · ${progress.xp} XP samlade</span></div><div class="bedroom" role="img" aria-label="Din sovkompis sover sött med alla ${EQUIPMENT.length} delarna på sig"><div class="night-window"><span>✧</span>${icon('moon')}<span>✦</span></div><span class="night-spark night-spark-one">✧</span><span class="night-spark night-spark-two">✦</span><div class="bed-head"></div><div class="bed-mattress"></div><div class="bed-pillow"></div><div class="sleeping-avatar">${avatarSVG(progress.avatar, { id: 'sleep', sleeping: true, placed: EQUIPMENT.map(e => e.id), site: progress.oximeterSite })}</div><div class="bed-blanket"><span>✦</span><span>✧</span><span>✦</span></div><div class="bed-base"></div><div class="night-lamp"></div><div class="zzz"><span>z</span><span>z</span><span>z</span></div><div class="bedroom-caption">Sov gott. Du har gjort något fint idag.</div></div></main>`;
}
function render() {
 const inventoryScroll = document.querySelector('.equipment-list')?.scrollLeft || 0;
 const inventoryScrollTop = document.querySelector('.equipment-list')?.scrollTop || 0;
 const active = document.activeElement;
 const focusKey = active?.dataset?.action ? { action: active.dataset.action, value: active.dataset.value, field: active.dataset.field, equipment: active.dataset.equipment, target: active.dataset.target } : null;
 app.innerHTML = header() + ({ welcome, avatar: avatarPage, practice: practicePage, celebrate: celebration, sleep: sleepPage }[screen])() + footer();
 const inventory = document.querySelector('.equipment-list'); if (inventory) { inventory.scrollLeft = inventoryScroll; inventory.scrollTop = inventoryScrollTop; }
 if (focusKey) [...document.querySelectorAll('[data-action]')].find(el => Object.entries(focusKey).every(([key, value]) => el.dataset[key] === value))?.focus({ preventScroll: true });
}
function startRound(reset = false) {
 if (reset || roundCounted) { placed = []; selected = null; feedback = ''; feedbackKind = ''; roundCounted = false; showHint = false; }
 go('practice');
}
function selectEquipment(id) {
 if (placed.includes(id)) return;
 selected = id; feedback = ''; feedbackKind = ''; showHint = false; render();
 announce(`${currentItem().name} vald. ${currentItem().id === 'oximeter' ? 'Placera den vid fingret eller tån.' : currentItem().instruction}`);
}
function place(target) {
 if (!selected || roundCounted) return;
 const result = placeEquipment(placed, selected, target);
 if (!result.correct) {
  feedbackKind = 'retry'; feedback = 'Nästan! Den här delen ska sitta på ett annat ställe. Prova igen eller ta en ledtråd.'; render(); announce(feedback); return;
 }
 if (result.site) { progress.oximeterSite = result.site; save(); }
 feedback = currentItem().success; feedbackKind = 'correct'; placed = result.placed; selected = null; showHint = false;
 announce(`${feedback} Plus ${XP_PER_PART} XP. ${placed.length} av ${EQUIPMENT.length} delar på plats.`);
 if (result.complete) {
  roundCounted = true; progress = completeRound(progress); save(); go('celebrate');
  announce(`Bravo! Alla ${EQUIPMENT.length} delar är på plats. Du har fått ${ROUND_XP} XP.${progress.rounds === 3 ? ' Du har låst upp stjärntröjan!' : ''}`);
 } else render();
}
function showDialog(kind) {
 const dialog = document.createElement('dialog'); dialog.className = 'info-dialog';
 const help = kind === 'help';
 dialog.innerHTML = `<button class="icon-button dialog-close" aria-label="Stäng">${icon('close')}</button><span class="dialog-symbol">${icon(help ? 'heart' : 'moon')}</span><h2>${help ? 'Vi tar det i din takt.' : 'Om Sovkompis'}</h2>${help ? '<p>Det finns ingen tidtagare och du förlorar inga poäng om du provar fel.</p><ol><li>Välj en del i listan.</li><li>Dra den till figuren, eller tryck först på delen och sedan på en plats.</li><li>Tryck på ”Visa mig var” om du vill ha en ledtråd.</li></ol><p>Du kan använda Tab för att flytta mellan knappar och Enter eller mellanslag för att välja.</p>' : '<p>Sovkompis är en prototyp för att lära känna utrustningen inför en andningsregistrering. Figuren och utrustningen är förenklade.</p><p>Följ alltid instruktionerna från din mottagning när det är dags att använda den riktiga utrustningen. Personalen hjälper till med koldioxidmätaren och visar exakt placering. EKG-kablarnas tre placeringar är förenklade och räknas från patientens håll.</p><p>Frisyr, kläder och färdiga övningar sparas bara i den här webbläsaren. Inget konto eller patientuppgifter behövs. Ett påhittat namn går bra.</p><p class="source-note">Information om koldioxidmätaren: <a href="https://www.sentec.com/product-support/tcm/" target="_blank" rel="noopener noreferrer">tillverkarens produktstöd</a>.</p>'}<button class="button primary dialog-done">${help ? 'Det känns bra' : 'Tillbaka till min sovkompis'} ${icon('check')}</button>`;
 app.append(dialog); dialog.showModal();
 const previous = document.activeElement;
 const close = () => dialog.close();
 dialog.querySelector('.dialog-close').onclick = close; dialog.querySelector('.dialog-done').onclick = close;
 dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } });
 dialog.addEventListener('close', () => { dialog.remove(); previous?.focus(); });
}
function listen() {
 if (!('speechSynthesis' in window)) { announce('Uppläsning stöds inte i den här webbläsaren. All information finns som text på sidan.'); showDialog('help'); return; }
 if (reading) { speechSynthesis.cancel(); reading = false; render(); return; }
 const texts = {
  welcome: 'Hej och välkommen till Sovkompis. Här får du skapa en egen kompis och lära känna delarna du ska ha på dig när du sover. Vi tar det tillsammans, en liten bit i taget. Tryck på Skapa din sovkompis för att börja.',
  avatar: 'Skapa en kompis på ditt sätt. Välj hår, ansikte och kläder. Du kan också ge din kompis ett namn. Tryck på Nu provar vi delarna när du känner dig redo.',
  practice: currentItem() ? `${currentItem().name}. ${currentItem().description} ${currentItem().id === 'oximeter' ? 'Placera den vid fingret eller tån.' : currentItem().instruction}` : 'En liten del i taget. Välj en del i listan. Dra den till din sovkompis, eller tryck på delen och sedan på rätt plats. Du får prova hur många gånger du vill.',
 };
 const utterance = new SpeechSynthesisUtterance(texts[screen] || 'Fint jobbat. Du har klarat övningen.');
 utterance.lang = 'sv-SE'; utterance.rate = .88; const voice = speechSynthesis.getVoices().find(v => v.lang.startsWith('sv')); if (voice) utterance.voice = voice;
 utterance.onend = () => { reading = false; render(); };
 utterance.onerror = e => { reading = false; render(); if (e.error !== 'canceled' && e.error !== 'interrupted') announce('Uppläsningen kunde inte starta. Du kan läsa samma instruktion på sidan.'); };
 reading = true; render(); speechSynthesis.speak(utterance);
}
app.addEventListener('click', e => {
 const el = e.target.closest('[data-action]'); if (!el || el.disabled || performance.now() < suppressClickUntil) return;
 const action = el.dataset.action;
 if (action === 'home') go('welcome');
 if (action === 'create') go('avatar');
 if (action === 'nav') { const step = Number(el.dataset.step); step === 1 ? go('welcome') : step === 2 ? go('avatar') : roundCounted ? go('celebrate') : go('practice'); }
 if (action === 'start') { progress.avatar.name = progress.avatar.name.trim() || DEFAULT_AVATAR.name; save(); startRound(); }
 if (action === 'tab') { tab = el.dataset.value; render(); }
 if (action === 'customize') { progress.avatar[el.dataset.field] = el.dataset.value; save(); render(); }
 if (action === 'star-outfit' && progress.rounds >= 3) { progress.avatar.outfit = 'stars'; save(); render(); }
 if (action === 'select') selectEquipment(el.dataset.equipment);
 if (action === 'place') place(el.dataset.target);
 if (action === 'hint') { showHint = !showHint; render(); if (showHint) announce('Rätt plats markeras nu på figuren.'); }
 if (action === 'restart' || action === 'replay') startRound(true);
 if (action === 'sleep') go('sleep');
 if (action === 'wear-reward' && progress.rounds >= 3) { progress.avatar.outfit = 'stars'; save(); render(); announce('Stjärntröjan är på! Du får se den när din kompis somnar.'); }
 if (action === 'help' || action === 'about') showDialog(action);
 if (action === 'listen') listen();
});
app.addEventListener('input', e => {
 if (e.target.id === 'avatar-name') { progress.avatar.name = e.target.value.slice(0, 24); save(); const label = document.querySelector('.avatar-name'); if (label) label.innerHTML = `${escape(progress.avatar.name || DEFAULT_AVATAR.name)} <span>✦</span>`; }
});
app.addEventListener('keydown', e => {
 const el = e.target.closest('[role="tab"]');
 if (el && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
  e.preventDefault(); const tabs = ['hair', 'face', 'clothes']; const i = tabs.indexOf(el.dataset.value); tab = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[2] : tabs[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3]; render(); document.querySelector(`#tab-${tab}`)?.focus();
 }
});
let suppressClickUntil = 0;
app.addEventListener('pointerdown', e => {
 const card = e.target.closest('[data-equipment]');
 if (!card || card.disabled || e.button !== 0) return;
 drag = { id: card.dataset.equipment, startX: e.clientX, startY: e.clientY, moving: false, pointerId: e.pointerId };
});
window.addEventListener('pointermove', e => {
 if (!drag || drag.pointerId !== e.pointerId) return;
 if (!drag.moving && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 8) {
  drag.moving = true; selected = drag.id; feedback = ''; feedbackKind = ''; showHint = false; render();
  const ghost = document.createElement('div'); ghost.className = 'drag-ghost'; ghost.innerHTML = equipmentSVG(drag.id); ghost.setAttribute('aria-hidden', 'true'); document.body.append(ghost); document.body.classList.add('dragging');
 }
 if (drag.moving) {
  e.preventDefault(); const ghost = document.querySelector('.drag-ghost'); if (ghost) ghost.style.transform = `translate(${e.clientX - 43}px, ${e.clientY - 43}px)`;
  document.querySelectorAll('.drop-target.over').forEach(t => t.classList.remove('over')); document.elementFromPoint(e.clientX, e.clientY)?.closest('.drop-target')?.classList.add('over');
 }
}, { passive: false });
function finishDrag(e, canceled = false) {
 if (!drag || drag.pointerId !== e.pointerId) return;
 const moved = drag.moving; drag = null;
 document.querySelector('.drag-ghost')?.remove(); document.body.classList.remove('dragging');
 if (moved) {
  suppressClickUntil = performance.now() + 300;
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-target]');
  if (!canceled && target) place(target.dataset.target);
  else if (!canceled) { feedback = 'Släpp delen på en av de små markeringarna på figuren. Du kan också trycka på en markering.'; feedbackKind = 'retry'; render(); announce(feedback); }
 }
}
window.addEventListener('pointerup', e => finishDrag(e));
window.addEventListener('pointercancel', e => finishDrag(e, true));
window.addEventListener('keydown', e => { if (e.key === 'Escape' && drag) { finishDrag({ pointerId: drag.pointerId, clientX: 0, clientY: 0 }, true); render(); } });
render();
