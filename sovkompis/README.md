# Sovkompis

Svensk, responsiv prototyp för att bekanta sig med utrustning inför andningsregistrering. Körs i webbläsaren utan installation. Byggd med HTML, CSS, JavaScript-moduler och en utbytbar SVG-figur. Inget byggsteg eller npm-beroende behövs.

## Starta lokalt

Kör `python3 -m http.server 4319 --directory dist` från projektmappen och öppna http://localhost:4319. Moduler kräver en HTTP-server; öppna inte index.html direkt med file://.

Tester körs med `node --test tests/*.test.mjs`.

## Flöde

1. Välkommen och introduktion.
2. Anpassa figurens hår, hårfärg, ögon, hudton, klädfärg och påhittade namn.
3. Dra åtta utrustningsdelar (inklusive tre EKG-kablar) till figuren, eller välj del och plats med klick/tangentbord. Fel ger lugn återkoppling och valfri ledtråd.
4. Varje del ger 20 XP, avslutad omgång ger ytterligare 50 XP, totalt 210 XP. Tidigare intjänade poäng behålls. Tre kompletta omgångar låser upp stjärntröjan. Endast avslutade omgångar sparas.
5. Figuren somnar med utrustningen på. Upprepa övningen när du vill.

Uppläsning använder webbläsarens Web Speech API och tillgänglig svensk röst. Visuella instruktioner finns alltid. Alla bilder är egna SVG-element. Google Fonts hämtas externt; systemtypsnitt används som reserv. Framsteg lagras lokalt under `sovkompis-v1`, utan patientkonto eller serverlagring.

## Ändra innehåll eller byt till 3D

- `dist/model.js`: utrustning, texter, normaliserade fästpunkter, validering av sparat tillstånd och poängregler.
- `dist/avatar.js`: isolerad figur- och utrustningsrenderer. Byt `avatarSVG` mot en 3D-komponent med samma avatarval och placeringsstatus; `targetFor` anger nu fästpunkter i figurens 2D-vy. Riktig 3D behöver namngivna fästpunkter i modellen och projektion/raycasting för interaktion.
- `dist/app.js`: vyer, tangentbords- och pekarinteraktion, uppläsning och flöde.
- `dist/styles.css`: responsiv layout och animationer. Respekterar reduced motion.

## Medicinskt innehåll inför patientbruk

Detta är en pedagogisk prototyp, inte en färdig klinisk instruktion. Bröstband och magband visas förenklat över kläderna. Sentec visas på övre bröstkorgen enligt beställarens angivna placering; personalen avgör och visar exakt läge och hanterar den riktiga sensorn. Tre EKG-elektroder visas på övre höger, övre vänster och nedre vänster bröstkorg, från patientens håll, enligt beställarens rutin. Numren 1–3 är pedagogiska märkningar, inte tillverkarens kabelbeteckningar. Pulsoximeter på finger eller tå är ett övningsval, inte ett beslut om vilken sensor som passar en viss patient.

Mottagningen behöver kontrollera texter, sensorvariant, åldersanpassning, fästmetod, exakt position och kabeldragning mot sin egen utrustning innan patientanvändning. Inga temperaturer eller monitorkonfigurationer lärs ut i prototypen. Bakgrundskällor: [1177 om EKG](https://www.1177.se/varmland/undersokning-behandling/undersokningar-och-provtagning/provtagning-och-matningar/matningar/ekg/) och [Sentecs produktstöd och bruksanvisningar](https://www.sentec.com/product-support/tcm/).
