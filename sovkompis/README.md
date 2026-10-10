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

Öppnas via **Din sovkompis → Öppna 3D-demon**, eller direkt på `demo-3d.html`. Både kort- och långhårig modell kan roteras och zoomas med mus, touch, knappar eller tangentbord. Hår och kläder har separata färgval, inklusive valfri färg och återställning av originaltexturen. Val sparas per modell under `sovkompis-demo3d-v1`; 2D-val och XP påverkas inte.

`dist/demo-3d.js` använder [Three.js](https://threejs.org/) **0.180.0**, distribuerat lokalt i `dist/vendor/three` (MIT-licens i dess `LICENSE`). Inga CDN- eller modellserveranrop behövs. Bara vald modell laddas; den tidigare modellens GPU-resurser frigörs vid byte. Scenen renderas vid interaktion och förändringar, utan ständig animationsloop. WebGL 2 krävs, och ett felmeddelande visas om stödet eller modellhämtningen saknas.

### Modeller och masker

- `dist/models/boy.glb`: tillhandahållna ”3d cartoon boy figure.glb”, cirka 4,4 MiB.
- `dist/models/girl.glb`: tillhandahållna ”cute girl 3d model.glb”, cirka 3,9 MiB.
- Originalfilerna är oförändrade. Varje fil innehåller ett texturerat mesh med en gemensam materialyta, utan skelett eller animationsspår.
- `*-mask.bin`: två little-endian float32-värden per originalvertex, i ordningen **hår, kläder**. Färgen ändras i en shader som bevarar texturens ljusvariationer och mönster. Ansikte, händer och exponerade anklar lämnas utanför.
- `*-mask.json`: modellens SHA-256, vertexantal, synliga gränser och två trianglar från en lös exportyta som döljs i demovyn. Det tar också bort exportytans påverkan på figurens centrering.
- Maskerna skapas med `python3 tools/generate_masks.py` (kräver NumPy och Pillow). Skriptet sammanfogar UV-sömmar för att hitta komponenter. Pojkens separata hår- och klädytor kan väljas geometriskt. Flickans hår sitter ihop med huvudytan, så dess mask använder även färgprov från originaltexturen. Komponentvalen är anpassade till just dessa exporter.
- **För utvecklare → Visa färgmasker** visar hår i magenta, kläder i cyan och oförändrade ytor i grått. Maskerna är en modellberoende demoutgångspunkt och bör finjusteras inför slutversionen. Testerna stoppar publicering om modellfilen ändrats utan att motsvarande maskdata har uppdaterats.

Utrustningsövningen, belöningar och sovanimationen finns fortsatt i **2D-versionen**. För en komplett 3D-övning behövs senare riggning, animationer, utbytbara frisyrer samt namngivna fästpunkter och interaktion för sensorerna.

## Ändra innehåll eller byt till 3D

- `dist/model.js`: utrustning, texter, normaliserade fästpunkter, validering av sparat tillstånd och poängregler.
- `dist/avatar.js`: isolerad figur- och utrustningsrenderer. Byt `avatarSVG` mot en 3D-komponent med samma avatarval och placeringsstatus; `targetFor` anger nu fästpunkter i figurens 2D-vy. Riktig 3D behöver namngivna fästpunkter i modellen och projektion/raycasting för interaktion.
- `dist/app.js`: vyer, tangentbords- och pekarinteraktion, uppläsning och flöde.
- `dist/styles.css`: responsiv layout och animationer. Respekterar reduced motion.

## Medicinskt innehåll inför patientbruk

Detta är en pedagogisk prototyp, inte en färdig klinisk instruktion. Bröstband och magband visas förenklat över kläderna. Sentec visas på övre bröstkorgen enligt beställarens angivna placering; personalen avgör och visar exakt läge och hanterar den riktiga sensorn. Tre EKG-elektroder visas på övre höger, övre vänster och nedre vänster bröstkorg, från patientens håll, enligt beställarens rutin. Numren 1–3 är pedagogiska märkningar, inte tillverkarens kabelbeteckningar. Pulsoximeter på finger eller tå är ett övningsval, inte ett beslut om vilken sensor som passar en viss patient.

Mottagningen behöver kontrollera texter, sensorvariant, åldersanpassning, fästmetod, exakt position och kabeldragning mot sin egen utrustning innan patientanvändning. Inga temperaturer eller monitorkonfigurationer lärs ut i prototypen. Bakgrundskällor: [1177 om EKG](https://www.1177.se/varmland/undersokning-behandling/undersokningar-och-provtagning/provtagning-och-matningar/matningar/ekg/) och [Sentecs produktstöd och bruksanvisningar](https://www.sentec.com/product-support/tcm/).
