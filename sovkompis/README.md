# Sovkompis

Svensk, responsiv prototyp för att bekanta sig med utrustning inför andningsregistrering. Körs i webbläsaren utan installation. Byggd med HTML, CSS, JavaScript-moduler, en SVG-figur för övningen och en separat 3D-demo. Inget byggsteg eller npm-beroende behövs.

## Starta lokalt

Kör `python3 -m http.server 4319 --directory dist` från projektmappen och öppna http://localhost:4319. Moduler kräver en HTTP-server; öppna inte index.html direkt med file://.

Tester körs med `node --test tests/*.test.mjs`.

## Flöde

1. Välkommen och introduktion.
2. Anpassa figurens hår, hårfärg, ögon, hudton, klädfärg och påhittade namn.
3. Dra åtta utrustningsdelar (inklusive tre EKG-kablar) till figuren, eller välj del och plats med klick/tangentbord. Fel ger lugn återkoppling och valfri ledtråd.
4. Varje del ger 20 XP, avslutad omgång ger ytterligare 50 XP, totalt 210 XP. Tidigare intjänade poäng behålls. Tre kompletta omgångar låser upp stjärntröjan. Endast avslutade omgångar sparas.
5. Figuren somnar med utrustningen på. Upprepa övningen när du vill.

Uppläsning använder webbläsarens Web Speech API och tillgänglig svensk röst. Visuella instruktioner finns alltid. 2D-figuren och utrustningen är SVG-element. 3D-demon använder de två tillhandahållna GLB-modellerna. Google Fonts hämtas externt; systemtypsnitt används som reserv. Framsteg lagras lokalt under `sovkompis-v1`, utan patientkonto eller serverlagring.

## Separat 3D-demo

Öppnas via **Din sovkompis → Öppna 3D-demon**, eller direkt på `demo-3d.html`. Både kort- och långhårig modell kan roteras och zoomas med mus, touch, knappar eller tangentbord. Hår och kläder har separata färgval, inklusive valfri färg och återställning av originaltexturen. Frisyr-, färg- och klädval sparas per modell under `sovkompis-demo3d-v1`. Knappen **Nu provar vi delarna** fortsätter till en 3D-övning med samma åtta delar som i 2D. Dragning, klick på del/plats och tangentbord stöds. Pulsoximeter kan placeras på finger eller tå. Efter åtta korrekta placeringar visas Bravo, konfetti och +210 XP, följt av en sovscen med utrustningen kvar.

Avslutade 2D- och 3D-omgångar räknas gemensamt under `sovkompis-v1`; tidigare poäng och 2D-utseendet bevaras. Efter tre omgångar finns både 2D-stjärntröjan och 3D-stjärnpyjamasen att välja. En pågående 3D-omgång sparas inte. Att ladda om sidan eller välja **Ändra din kompis** börjar om övningen utan att dra av intjänad XP.

`dist/demo-3d.js` använder [Three.js](https://threejs.org/) **0.180.0**, distribuerat lokalt i `dist/vendor/three` (MIT-licens i dess `LICENSE`). Inga CDN- eller modellserveranrop behövs. Bara vald modell laddas; den tidigare modellens GPU-resurser frigörs vid byte. Scenen renderas vid interaktion och förändringar. Vinkningen och sovscenen animeras med upp till cirka 30 bildrutor per sekund, pausas i bakgrunden och respekterar `prefers-reduced-motion`. WebGL 2 krävs, och ett felmeddelande visas om stödet eller modellhämtningen saknas.

### Modeller och masker

- `dist/models/boy.glb`: tillhandahållna ”3d cartoon boy figure.glb”, cirka 4,4 MiB.
- `dist/models/girl.glb`: tillhandahållna ”cute girl 3d model.glb”, cirka 3,9 MiB.
- Originalfilerna är oförändrade. Varje fil innehåller ett texturerat mesh med en gemensam materialyta, utan skelett eller animationsspår.
- `*-mask.bin`: två little-endian float32-värden per originalvertex, i ordningen **hår, kläder**. Färgen ändras i en shader som bevarar texturens ljusvariationer och mönster. Ansikte, händer och exponerade anklar lämnas utanför.
- `*-mask.json`: modellens SHA-256, vertexantal, synliga gränser och två trianglar från en lös exportyta som döljs i demovyn. Det tar också bort exportytans påverkan på figurens centrering.
- Maskerna skapas med `python3 tools/generate_masks.py` (kräver NumPy och Pillow). Skriptet sammanfogar UV-sömmar för att hitta komponenter. Pojkens separata hår- och klädytor kan väljas geometriskt. Flickans hår sitter ihop med huvudytan, så dess mask använder även färgprov från originaltexturen. Komponentvalen är anpassade till just dessa exporter.
- **För utvecklare → Visa färgmasker** visar hår i magenta, kläder i cyan och oförändrade ytor i grått. Maskerna är en modellberoende demoutgångspunkt och bör finjusteras inför slutversionen. Testerna stoppar publicering om modellfilen ändrats utan att motsvarande maskdata har uppdaterats.

### Frisyrer och slutna ögon

`dist/appearance-3d.js` ger varje 3D-figur sex val: original, kort, page, långt, två knutar och hästsvans. Originalets hårtrianglar döljs medan en passad hårhätta och separata hårdelar används. Båda modellerna behåller sina oförändrade originalfiler. Hårfärgen styr även de nya delarna. Frisyrerna sitter på huvudbenet och överlever byte mellan anpassning, övning och sömn. Byte tillbaka återställer originalets indexdata exakt, utan att skapa nya GPU-indexbuffertar.

Vid sömn ersätter en mjukt avgränsad ansiktsmask ögontexturen med hudton, och böjda ögonfransar visas. Vid ny övning återkommer de öppna originalögonen och normal belysning. Masken använder modellens källkoordinater så att den följer riggen. Detta är ett procedurgjort demouttryck, inte en fullständig ansiktsrigg.

### Enkel rigg och utrustning

- `dist/rig-3d.js` normaliserar varje modell till två enheters höjd och bygger en riktig `THREE.SkinnedMesh` med 13 ben: höft, ryggrad, huvud, överarmar, underarmar, händer, ben och fötter. Varje vertex får upp till fyra normaliserade vikter. En sammanhängande huvud-/håryta behålls för att flickans långa hår ska följa huvudet även över ljusa texturpartier.
- Ben, vikter och animationer skapas **i webbläsaren**; original-GLB-filerna ändras inte och innehåller fortfarande inget sparat skelett. Det här är en enkel procedurrigg för demon. En produktionsversion kan ersätta den med artistjusterade vikter och inbakade animationsklipp.
- `ANATOMY` innehåller modellernas benpositioner och fästpunkter i originalkoordinater. EKG 1–3 följer samma rutin som i 2D: patientens övre höger, övre vänster och nedre vänster bröstkorg. Koldioxidmätaren sitter på bröstkorgen.
- `dist/equipment-3d.js` bygger band, näsgrimma, elektroder, pulsoximeter, registreringsenhet, separat koldioxidmätare och kablar som 3D-geometri. Sensorerna sitter på sina ben. Kabelgeometrin viktas mellan sensorbenet och registreringsenhetens ben så att båda ändarna följer med i sovposen. Delarna är schematiska och visas över kläderna.
- Fästpunkterna projiceras till knappar i 3D-vyn. Dragning använder samma mål och validering som klick, ger ingen XP vid fel och låser redan placerade delar. Vid val av del återgår kameran till framifrån; fria vyer finns för att granska resultatet. Mobilvyn visar alla åtta delarna i ett rutnät under en kvarliggande 3D-vy.
- **För utvecklare → Visa rigg / Prova en vinkning** visar skelettet och en enkel armrörelse. Sovscenen lägger figuren på en säng, sänker armarna och lägger till en liten andningsrörelse. Ögonen sluts med en ansiktsmask och ögonfransar som följer huvudbenet. Munnen behåller originaluttrycket. Kudde, draperad stjärnfilt, nattlampa och dämpad scenbelysning ger en lugn avslutning.
- `tests/rig-3d.test.mjs` kontrollerar båda verkliga modellernas vikter och oförändrade grundpose samt att sensor och båda kabeländarna sitter ihop före, under och efter sovrörelsen. Fästpunkternas patienthöger/vänster kontrolleras också.

Den ursprungliga **2D-versionen** finns kvar, med sju frisyrer och en filt i sovscenen. Mer detaljerade riggar och artistgjorda hår- och ansiktsanimationer kan ersätta demogeometrin senare.

## Ändra innehåll eller byt till 3D

- `dist/model.js`: utrustning, texter, normaliserade fästpunkter, validering av sparat tillstånd och poängregler.
- `dist/avatar.js`: isolerad figur- och utrustningsrenderer. Byt `avatarSVG` mot en 3D-komponent med samma avatarval och placeringsstatus; `targetFor` anger nu fästpunkter i figurens 2D-vy. Riktig 3D behöver namngivna fästpunkter i modellen och projektion/raycasting för interaktion.
- `dist/app.js`: vyer, tangentbords- och pekarinteraktion, uppläsning och flöde.
- `dist/styles.css`: responsiv layout och animationer. Respekterar reduced motion.

## Medicinskt innehåll inför patientbruk

Detta är en pedagogisk prototyp, inte en färdig klinisk instruktion. Bröstband och magband visas förenklat över kläderna. Koldioxidmätaren (Sentec) visas på övre bröstkorgen enligt beställarens angivna placering; personalen avgör och visar exakt läge och hanterar den riktiga sensorn. Tre EKG-elektroder visas på övre höger, övre vänster och nedre vänster bröstkorg, från patientens håll, enligt beställarens rutin. Numren 1–3 är pedagogiska märkningar, inte tillverkarens kabelbeteckningar. Pulsoximeter på finger eller tå är ett övningsval, inte ett beslut om vilken sensor som passar en viss patient.

Mottagningen behöver kontrollera texter, sensorvariant, åldersanpassning, fästmetod, exakt position och kabeldragning mot sin egen utrustning innan patientanvändning. Inga temperaturer eller monitorkonfigurationer lärs ut i prototypen. Bakgrundskällor: [1177 om EKG](https://www.1177.se/varmland/undersokning-behandling/undersokningar-och-provtagning/provtagning-och-matningar/matningar/ekg/) och [Sentecs produktstöd och bruksanvisningar](https://www.sentec.com/product-support/tcm/).
