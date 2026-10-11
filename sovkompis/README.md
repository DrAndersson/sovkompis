# Sovkompis

Svensk, responsiv prototyp för att bekanta sig med utrustning inför andningsregistrering. HTML, CSS och JavaScript med Three.js 0.180.0, lokalt distribuerat i `dist/vendor/three` (MIT-licens). Inget byggsteg, konto eller npm-beroende behövs.

## Köra och testa

Från projektmappen: `python3 -m http.server 4319 --directory dist`, öppna http://localhost:4319. JavaScript-moduler kräver HTTP, inte file://. Kör `node --test tests/*.test.mjs`. GitHub Actions testar och publicerar `dist` på GitHub Pages.

## Flöde och sparade val

1. Välkomstsida med samma levande 3D-kompis som följer med genom övningen.
2. Välj **Kropp 1** eller **Kropp 2**, frisyr, hårfärg, hudton, klädfärg och ett påhittat namn. Ansikts- och ögonval tillkommer senare.
3. Dra de åtta delarna till figuren, eller välj del och plats med klick/tangentbord. Pulsoximetern kan sättas på finger eller tå, utan förval. Fel placering ger en liten huvudskakning, mjuk fallande ton och valfri ledtråd. Rätt placering ger en ljus stigande ton. Bara näsgrimman ger visuellt fniss och ”Det kittlas!”.
4. Åtta korrekta placeringar ger konfetti och 210 XP (20 per del och 50 i avslutningsbonus). Tre kompletta omgångar låser upp stjärnpyjamasen.
5. Figuren sätter sig på sängen, drar upp benen, lutar sig mot kudden och drar över filten. Ögonen sluts och ljuset dämpas. Alla delar följer med.

Ljud kan stängas av högst upp. Uppläsning använder Web Speech API och tillgänglig svensk röst. Visuella instruktioner finns alltid. Rendering pausas i bakgrunden och `prefers-reduced-motion` respekteras. WebGL 2 krävs; laddningsfel visas med återförsök. Google Fonts använder systemtypsnitt som reserv.

Framsteg, namn och upplåst belöning sparas i `sovkompis-v1`. Befintliga poäng bevaras. Den historiska nyckeln `sovkompis-demo3d-v1` och dess interna kropp-ID:n `boy`/`girl` behålls för kompatibilitet; de visas aldrig som kön i gränssnittet. Nyckeln innehåller färger, frisyrer och ljudval. Äldre frisyrval mappas till de nya motsvarigheterna. En pågående omgång sparas inte och återställning drar aldrig av intjänad XP. Ingen serverlagring används.

`index.html#avatar` öppnar anpassningen direkt. `demo-3d.html` omdirigerar gamla länkar dit. Den äldre 2D-renderern och de tidigare 3D-kropparna har ersatts.

## Kroppar, hår och färgmasker

- `dist/models/body-1.glb` och `body-2.glb` är de tillhandahållna **boy character.glb** och **girl character.glb**, oförändrade. De är kala, texturerade modeller utan inbyggt skelett.
- `body-*-mask.bin/json` innehåller tre float32-värden per vertex (hår, kläder, hud), SHA-256, antal vertex/trianglar och modellgränser. Kropparnas hårkanal är noll eftersom håret är separat. Nya filnamn förhindrar att äldre cachade masker används till nya modeller.
- `tools/generate_masks.py` skapar kroppsmaskerna från geometri och sammansvetsade komponenter (NumPy och Pillow krävs). Kropp 2 har en sammanhängande yta för huvud och pyjamas som delas vid halslinjen. Hudmasken skyddar separata ögon, mun och ögonbryn. Shadern skyddar också ljusa ögonvitor, mörka detaljer och läppar på delade ytor.
- **Kort & spretigt**, **Långt** och **Två tofsar** använder de tillhandahållna hårmodellerna. **Utan hår** visar kroppens ursprungliga huvud. Alla alternativ fungerar på båda kropparna.
- `hair-spiky.glb`, `hair-long.glb` och `hair-pigtails.glb` är optimerade webbkopior: originalgeometri och UV-koordinater bevaras, grundtexturen begränsas till 1024 pixlar och oanvända normal-/PBR-texturer tas bort. Filerna är cirka 0,6–1,8 MB i stället för 2,7–20,5 MB. Källfilerna ändras inte. `hair-assets.json` sparar käll- och leveranshashar.
- `tools/prepare_hair.py --long ".../hair long.glb" --pigtails ".../pigtail hair.glb" --spiky ".../short spiky hair 3d model.glb"` återskapar webbkopiorna (Pillow krävs).
- `HAIR_ASSETS` och `APPEARANCE` i `dist/appearance-3d.js` anger varje hårs skala, läge och kroppsanpassning. En bågformad öppning under luggen håller ögon, näsa och näsgrimma synliga. Hårfärg bevarar texturens ljusvariation; tofsarnas rosa band skyddas. **För utvecklare → Visa färgmasker** visar färgområdena.
- Bara vald kropp och valda frisyrer laddas. Hår återanvänds under samma kroppsbesök. GPU-resurser frigörs vid kroppsbyte; sena asynkrona svar kan inte återinföra hår från den föregående kroppen.

## Rigg, utrustning och animation

`dist/rig-3d.js` normaliserar kropparna till två enheters höjd och bygger en `SkinnedMesh` med 15 ben: höft, ryggrad, huvud, överarmar, underarmar, händer, lår, knän och fötter. Varje vertex får upp till fyra normaliserade vikter. Kropp 2:s sammanhängande yta viktas lokalt så att ben och bål inte följer huvudets rotation. Originalfilerna ändras inte.

`ANATOMY` anger modellernas benpositioner och fästpunkter. **EKG 1** sitter på övre höger bröstkorg, **EKG 2** på övre vänster bröstkorg och **EKG 3** på vänster höft, räknat från patientens håll. EKG 3 är fäst vid höftbenet och dess kabel följer med till registreringsenheten. Koldioxidmätaren sitter på övre bröstkorgen. Delarna visas schematiskt över kläderna.

`dist/equipment-3d.js` bygger sensorer, band, registreringsenheter och kablar. Sensorerna sitter på motsvarande ben; kabelgeometrin viktas mellan sensorben och enhetsben. Fästpunkterna projiceras till klickbara knappar och samma validering används vid dragning. Redan placerade delar kan inte ge poäng igen.

`dist/motion-3d.js` styr blickar, lugna spontana gester, blinkningar, fniss, huvudskakning och den cirka 6,4 sekunder långa läggningen. Hår och ögonfransar sitter på huvudbenet. En shader ersätter ögontexturen med hudton när ögonen sluts. Detta är en enkel procedurrigg, inte en fullständig ansiktsrigg. Mer detaljerade artistgjorda animationer kan tillkomma.

`dist/placement-audio.js` skapar korta, mjuka ljudsignaler lokalt med Web Audio. Ljudmotorn öppnas först vid användarens placering. Avstängning stoppar även väntande ljud; ett ljudfel hindrar aldrig övningen.

Tester kontrollerar fil-/masköverensstämmelse, hårkopiornas integritet, vikter och grundpose, hår som följer huvudet, benens oberoende från huvudrörelser, fästpunkter, sensor-/kabelanslutningar genom läggningen, poängregler, sparade framsteg och ljudmotorn.

## Fler alternativ

Lägg ett nytt hår i `dist/models`, lägg till dess fil och inpassning i `HAIR_ASSETS` och etikett i `HAIRSTYLES`. En ny kropp behöver ett val i HTML/modellkatalogen, motsvarande maskdata samt profiler i `ANATOMY` och `APPEARANCE`. `dist/app.js` styr flöde och interaktion; `dist/model.js` innehåller utrustningstexter och poängregler. `dist/styles.css` och `dist/companion.css` styr responsiv layout.

## Medicinskt innehåll inför patientbruk

Detta är en pedagogisk prototyp, inte en färdig klinisk instruktion. Följ mottagningens instruktioner för den riktiga utrustningen. Koldioxidmätaren (Sentec) visas på bröstkorgen och EKG 3 på vänster höft enligt beställarens angivna rutin. Personalen visar exakt läge och hanterar den riktiga sensorn. EKG-numren är pedagogiska märkningar, inte tillverkarens kabelbeteckningar. Pulsoximeter på finger eller tå är ett övningsval, inte ett beslut om vilken sensor som passar en viss patient.

Mottagningen behöver kontrollera texter, sensorvariant, åldersanpassning, fästmetod, placering och kabeldragning mot sin egen utrustning innan patientanvändning. Inga temperaturer eller monitorkonfigurationer lärs ut. Bakgrundskällor: [1177 om EKG](https://www.1177.se/varmland/undersokning-behandling/undersokningar-och-provtagning/provtagning-och-matningar/matningar/ekg/) och [Sentecs produktstöd](https://www.sentec.com/product-support/tcm/).
