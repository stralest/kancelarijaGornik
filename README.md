# Advokatska kancelarija Gornik

Vite/React sajt sa jednom javnom stranicom. `npm run build` generiše statički HTML sadržaj, SEO metapodatke, JSON-LD, `sitemap.xml` i `robots.txt` u `dist/`. `npm run dev` pokreće razvojnu verziju.

## SEO podaci

Javni domen, naziv, opis, kontakt, adresa, radno vreme, društveni profili i javne URL putanje nalaze se u [`seo.config.mjs`](seo.config.mjs). Pre promene ovih podataka proverite da odgovaraju stvarnim informacijama kancelarije. Kontakt detalji koji se prikazuju posetiocima trenutno su i u `src/components/Contact.jsx`.

Sitemap sadrži samo `/`, jer su „O nama“, „Oblasti prava“, „Zašto mi“ i „Kontakt“ sekcije iste stranice, a ne zasebne rute. Ako se dodaju nove javne stranice, potrebno je dodati njihove putanje u `publicPaths` i obezbediti jedinstven statički HTML i metapodatke za svaku.

## Deploy

Objavite sadržaj foldera `dist/`. Hosting podesite da trajno (301 ili 308) preusmeri `http://` na `https://`, kao i `https://advokatgornik.com/` na `https://www.advokatgornik.com/`. Potvrdite da `/robots.txt` i `/sitemap.xml` vraćaju 200 i da ne postoji hosting ili CDN pravilo sa `noindex` ili `X-Robots-Tag: noindex`. Nakon objave, pošaljite `https://www.advokatgornik.com/sitemap.xml` kroz Google Search Console.

Kontakt forma koristi EmailJS vrednosti iz `.env.local` kao i ranije; pogledajte `.env.example`.
