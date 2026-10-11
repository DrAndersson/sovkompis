# Sovkompis

Svensk, responsiv prototyp för att bekanta sig med utrustning inför andningsregistrering. Körs i webbläsaren utan installation. Byggd med HTML, CSS, JavaScript-moduler, 3D-figurer genom hela flödet. Inget byggsteg eller npm-beroende behövs.

## Starta lokalt

Kör `python3 -m http.server 4319 --directory dist` från projektmappen och öppna http://localhost:4319. Moduler kräver en HTTP-server; öppna inte index.html direkt med file://.

Tester körs med `node --test tests/*.test.mjs`.

## Flöde

1. Välkommen och introduktion.
2. Välj en 3D-modell och anpassa frisyr, hårfärg, hudton, klädfärg och påhittat namn. Ansikts- och ögonval tillkommer senare.
3. Dra åtta utrustningsdelar (inklusive tre EKG-kablar) till figuren, eller välj del och plats med klick/tangentbord. Fel ger en liten huvudskakning, en mjuk fallande ton och valfri ledtråd. Rätt placering ger en ljus stigande ton. Ljud kan stängas av högst upp; valet sparas.
4. Varje del ger 20 XP, avslutad omgång ger ytterligare 50 XP, totalt 210 XP. Tidigare intjänade poäng behålls. Tre kompletta omgångar låser upp stjärnpyjamasen. Endast avslutade omgångar sparas.
5. Figuren somnar med utrustningen på. Upprepa övningen när du vill.

Uppläsning använder webbläsarens Web Speech API och tillgänglig svensk röst. Visuella instruktioner finns alltid. Utrustningsikoner är SVG; figurer, sensorer och sovscen visas i 3D. Google Fonts hämtas externt; systemtypsnitt används som reserv. Framsteg lagras lokalt under `sovkompis-v1`, utan patientkonto eller serverlagring.

## Sammanhängande 3D-flöde

`index.html` öppnar välkomsten med den valda 3D-figuren. **Skapa din sovkompis** leder vidare till anpassning, övning och god natt i samma scen. `#avatar` öppnar anpassningen direkt. Äldre länkar till `demo-3d.html` omdirigeras dit. Den tidigare 2D-renderern och dess separata flöde har tagits bort.

Båda modellerna kan roteras och zoomas med mus, touch, knappar eller tangentbord. Hår, hud och kläder har separata färgval, inklusive valfri färg och återställning av originaltexturen. Frisyr, hud-, hår- och klädfärg sparas per modell. Den historiska nyckeln `sovkompis-demo3d-v1` behålls för att bevara befintliga val; den innehåller nu även ljudinställningen. Pulsoximetern har två samtidiga mål, finger och tå, utan ett förval. Vald plats följer med till sovscenen och sensorn ger poäng en gång per övning. Efter åtta korrekta placeringar visas Bravo, konfetti och +210 XP, följt av en sovscen med utrustningen kvar.

Tidigare poäng, avslutade omgångar, namn och upplåst belöning bevaras i `sovkompis-v1`. De äldre avatarfälten valideras fortfarande för lagringskompatibilitet, men används inte som en 2D-figur. Efter tre omgångar finns stjärnpyjamasen att välja. En pågående omgång sparas inte. Att ladda om sidan eller välja **Ändra din kompis** börjar om övningen utan att dra av intjänad XP.

`dist/app.js` använder [Three.js](https://threejs.org/) **0.180.0**, distribuerat lokalt i `dist/vendor/three` (MIT-licens i dess `LICENSE`). Inga CDN- eller modellserveranrop behövs. Bara vald modell laddas; den tidigare modellens GPU-resurser frigörs vid byte. Andning, spontana blinkningar, små sidoblickar, viktförskjutningar, vinkning och sovscen animeras med upp till cirka 30 bildrutor per sekund. Rendering pausas i bakgrunden och respekterar `prefers-reduced-motion`. WebGL 2 krävs, och ett felmeddelande visas om stödet eller modellhämtningen saknas.

### Modeller och masker

- `dist/models/boy.glb`: tillhandahållna ”3d cartoon boy figure.glb”, cirka 4,4 MiB.
- `dist/models/girl.glb`: tillhandahållna ”cute girl 3d model.glb”, cirka 3,9 MiB.
- Originalfilerna är oförändrade. Varje fil innehåller ett texturerat mesh med en gemensam materialyta, utan skelett eller animationsspår.
- `*-mask-v2.bin`: tre little-endian float32-värden per originalvertex, i ordningen **hår, kläder, hud**. Färgen ändras i en shader som bevarar texturens ljusvariationer och mönster. Hudmasken omfattar ansikte, hals, händer och exponerade anklar. Separata ögon, ögonbryn, mun- och tandytor lämnas utanför. Ett texturfilter skyddar ljusa ögonvitor, mörka ögondetaljer och rosa läppar på den sammanhängande ansiktsytan. De sex hudnyanserna och valfri färg sparas per modell; även slutna ögonlock och flickans utfyllnad bakom utbytbara frisyrer följer hudfärgen.
- De äldre tvåkanaliga `*-mask.bin/json` finns kvar för redan öppna äldre demoversioner. Nya filnamn och cacheversioner förhindrar att gammal kod läser det nya maskformatet.
- `*-mask-v2.json`: modellens SHA-256, vertexantal, synliga gränser och två trianglar från en lös exportyta som döljs i demovyn. Det tar också bort exportytans påverkan på figurens centrering.
- Maskerna skapas med `python3 tools/generate_masks.py` (kräver NumPy och Pillow). Skriptet sammanfogar UV-sömmar för att hitta komponenter. Pojkens separata hår- och klädytor kan väljas geometriskt. Flickans hår sitter ihop med huvudytan, så dess mask använder även färgprov från originaltexturen. Komponentvalen är anpassade till just dessa exporter.
- **För utvecklare → Visa färgmasker** visar hår i magenta, kläder i cyan, hud i gult och oförändrade ytor i grått. Maskerna är en modellberoende demoutgångspunkt och bör finjusteras inför slutversionen. Testerna stoppar publicering om modellfilen ändrats utan att motsvarande maskdata har uppdaterats.

### Frisyrer och slutna ögon

`dist/appearance-3d.js` ger varje 3D-figur sex val: original, kort, page, långt, två knutar och hästsvans. Originalets hårtrianglar döljs medan en passad hårhätta och separata hårdelar används. Flickans sammanhängande hår-/huvudyta kompletteras med en insänkt huvudform så att byte av frisyr inte lämnar hål bakom ansiktet. Båda modellerna behåller sina oförändrade originalfiler. Hårfärgen styr även de nya delarna. Frisyrerna sitter på huvudbenet och överlever byte mellan anpassning, övning och sömn. Byte tillbaka återställer originalets indexdata exakt, utan att skapa nya GPU-indexbuffertar.

Vid sömn ersätter en mjukt avgränsad ansiktsmask ögontexturen med hudton, och böjda ögonfransar visas. Vid ny övning återkommer de öppna originalögonen och normal belysning. Masken använder modellens källkoordinater så att den följer riggen. Detta är ett procedurgjort demouttryck, inte en fullständig ansiktsrigg.

### Enkel rigg och utrustning

- `dist/rig-3d.js` normaliserar varje modell till två enheters höjd och bygger en riktig `THREE.SkinnedMesh` med 15 ben: höft, ryggrad, huvud, överarmar, underarmar, händer, lår, knän och fötter. Varje vertex får upp till fyra normaliserade vikter. En sammanhängande huvud-/håryta behålls för att flickans långa hår ska följa huvudet även över ljusa texturpartier.
- Ben, vikter och animationer skapas **i webbläsaren**; original-GLB-filerna ändras inte och innehåller fortfarande inget sparat skelett. Det här är en enkel procedurrigg för demon. En produktionsversion kan ersätta den med artistjusterade vikter och inbakade animationsklipp.
- `ANATOMY` innehåller modellernas benpositioner och fästpunkter i originalkoordinater. EKG 1–3 följer beställarens rutin: patientens övre höger, övre vänster och nedre vänster bröstkorg. Koldioxidmätaren sitter på bröstkorgen.
- `dist/equipment-3d.js` bygger band, näsgrimma, elektroder, pulsoximeter, registreringsenhet, separat koldioxidmätare och kablar som 3D-geometri. Sensorerna sitter på sina ben. Kabelgeometrin viktas mellan sensorbenet och registreringsenhetens ben så att båda ändarna följer med i sovposen. Delarna är schematiska och visas över kläderna.
- Fästpunkterna projiceras till knappar i 3D-vyn. Dragning använder samma mål och validering som klick, ger ingen XP vid fel och låser redan placerade delar. Vid val av del återgår kameran till framifrån; fria vyer finns för att granska resultatet. Mobilvyn visar alla åtta delarna i ett rutnät under en kvarliggande 3D-vy.
- `dist/motion-3d.js` styr mjuka blickar mot vald del eller berörd fästpunkt. En korrekt placerad **näsgrimma** ger ett kort visuellt fniss: axlar och huvud rör sig, ögonen kisar och pratbubblan ”Det kittlas!” visas. Övriga delar ger ingen fnissreaktion eller pratbubbla. `dist/placement-audio.js` skapar korta sinusbaserade ljudsignaler med Web Audio: en stigande bekräftelse vid rätt placering och en mjuk fallande signal vid fel. Ljudmotorn öppnas först vid användarens placering. Avstängning stoppar även väntande ljud. Vid fel används `rejectionFrame` för en kort huvudskakning; den utelämnas vid `prefers-reduced-motion`. Fnisset är fortfarande visuellt och gäller endast näsgrimman. När kompisen väntar gör den lugna, korta blickar och blinkningar. Kroppsrörelserna tonas ner när en del är vald, så att fästpunkterna är lätta att träffa.
- Läggningen tar cirka 6,4 sekunder: figuren sätter sig med böjda knän, drar upp benen, lutar sig mot kudden och drar över filten. Kroppen roterar runt höften, och händer och ben rör sig var för sig. **Se läggningen igen** spelar om rörelsen utan att ge fler poäng.
- **För utvecklare → Visa rigg / Prova en vinkning** visar skelettet och en enkel armrörelse. **Granska sovrörelsen** kan stanna vid enskilda poser. Sovscenen har en liten andningsrörelse. Ögonen sluts med en ansiktsmask och ögonfransar som följer huvudbenet. Munnen behåller originaluttrycket. Kudde, draperad stjärnfilt, nattlampa och dämpad scenbelysning ger en lugn avslutning.
- `tests/rig-3d.test.mjs` kontrollerar båda verkliga modellernas vikter och oförändrade grundpose samt att sensor och båda kabeländarna sitter ihop för både finger och tå under blickar, fniss och alla läggningens steg. `tests/motion-3d.test.mjs` kontrollerar övergångar och slutpose. Fästpunkternas patienthöger/vänster kontrolleras också.

## Ändra innehåll och lägg till modeller

- `dist/app.js`: sammanhängande vyer, uppläsning, tangentbords- och pekarinteraktion, färgval och flöde.
- `dist/model.js`: utrustningstexter, validering av sparat tillstånd och poängregler. Äldre 2D-fält finns endast för lagringskompatibilitet.
- `dist/equipment-icons.js`: små SVG-ikoner i utrustningslistan.
- `dist/styles.css` och `dist/companion.css`: gemensam och 3D-specifik responsiv layout.
- Nya modeller behöver ett val i modellväljaren, GLB med matchande masker samt anpassning i `ANATOMY` och `APPEARANCE`. Mer detaljerade riggar och artistgjorda hår- och ansiktsanimationer kan ersätta den förenklade geometrin senare.

## Medicinskt innehåll inför patientbruk

Detta är en pedagogisk prototyp, inte en färdig klinisk instruktion. Bröstband och magband visas förenklat över kläderna. Koldioxidmätaren (Sentec) visas på övre bröstkorgen enligt beställarens angivna placering; personalen avgör och visar exakt läge och hanterar den riktiga sensorn. Tre EKG-elektroder visas på övre höger, övre vänster och nedre vänster bröstkorg, från patientens håll, enligt beställarens rutin. Numren 1–3 är pedagogiska märkningar, inte tillverkarens kabelbeteckningar. Pulsoximeter på finger eller tå är ett övningsval, inte ett beslut om vilken sensor som passar en viss patient.

Mottagningen behöver kontrollera texter, sensorvariant, åldersanpassning, fästmetod, exakt position och kabeldragning mot sin egen utrustning innan patientanvändning. Inga temperaturer eller monitorkonfigurationer lärs ut i prototypen. Bakgrundskällor: [1177 om EKG](https://www.1177.se/varmland/undersokning-behandling/undersokningar-och-provtagning/provtagning-och-matningar/matningar/ekg/) och [Sentecs produktstöd och bruksanvisningar](https://www.sentec.com/product-support/tcm/).
