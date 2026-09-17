# Advokatska kancelarija Gornik

Vite/React sajt sa postojećom početnom stranicom i novom sekcijom stručnih članaka. `npm run build` generiše statičku početnu stranicu, SEO metapodatke, JSON-LD i `robots.txt` u `dist/`, kao i serverski prikaz članaka u `server-dist/`. `npm run dev` pokreće razvojnu verziju.

## Stručni članci i administracija

- `/clanci` — objavljeni članci i kategorije.
- `/clanci/:slug` — članak sa serverski generisanim sadržajem i SEO podacima.
- `/admin` — Supabase Auth, izričita administratorska uloga i TipTap editor.
- `/sitemap.xml` — aktuelna mapa sajta preko Vercel funkcije; samo objavljeni članci.

Detaljno uputstvo: [Supabase, lokalno pokretanje i Vercel](docs/CMS-SETUP.md).
Provere: [bezbednost i regresija](docs/SECURITY-TESTING.md).
Pregled izmena: [implementacija i rezultati](docs/IMPLEMENTATION.md).

## SEO podaci

Javni domen, naziv, opis, kontakt, adresa, radno vreme, društveni profili i javne URL putanje nalaze se u [`seo.config.mjs`](seo.config.mjs). Pre promene ovih podataka proverite da odgovaraju stvarnim informacijama kancelarije. Kontakt detalji koji se prikazuju posetiocima trenutno su i u `src/components/Contact.jsx`.

„O nama“, „Oblasti prava“, „Zašto mi“ i „Kontakt“ ostaju sekcije iste stranice. Mapa sajta zadržava `/` i dodaje `/clanci` i objavljene članke. Nacrti se ne prikazuju javno.

## Deploy

Objavite projekat na postojećem Vercel nalogu prema `vercel.json`; nove stranice zahtevaju uključenu Vercel funkciju, ne samo statički `dist/`. Sačuvajte preusmeravanja sa `http://` na `https://` i sa `https://advokatgornik.com/` na `https://www.advokatgornik.com/`. Potvrdite da javne stranice, `/robots.txt` i `/sitemap.xml` rade i da javni članci nemaju `noindex`. Administracija i nacrti ne smeju biti indeksirani. Nakon objave, pošaljite `https://www.advokatgornik.com/sitemap.xml` kroz Google Search Console.

Kontakt forma koristi EmailJS vrednosti iz `.env.local` kao i ranije; pogledajte `.env.example`.
