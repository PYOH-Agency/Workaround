# Logo de l'artisan sur sa page publique

## Intention

Permettre à une entreprise d'afficher son logo sur sa page publique
`/artisan/[slug]`. L'artisan téléverse son logo depuis son espace ; il apparaît
ensuite dans l'en-tête de sa fiche publique, à côté de son nom légal.

Disponible pour **toutes les entreprises vérifiées** (plan `free` inclus), mais
téléversé par le **responsable** uniquement. Le logo reste **discret** : la page
publique est pensée confiance/vérification, le sceau de vérification en reste la
valeur centrale.

## Périmètre

Inclus :
- Une colonne `logoPath` sur `company`.
- Un bucket de stockage public `company-logos`.
- Une section « Logo » sur `/mon-passeport` (téléverser / remplacer / retirer).
- L'affichage du logo dans l'en-tête de `/artisan/[slug]`.

Hors périmètre (YAGNI) :
- Pas de redimensionnement serveur (l'affichage borne la taille).
- Pas de logo sur la fiche répertoire du demandeur (`/mon-repertoire/[companyId]`).
- Aucun gating Pro : le logo suit `passport.manage` (`free` / `owner`).

## Donnée

`src/db/schema/company.ts` — nouvelle colonne :

```ts
// La cle de l'objet dans le bucket public `company-logos`. `null` = pas de
// logo. On stocke la cle, pas l'URL : l'URL publique s'en derive, et remplacer
// la cle (suffixe de version) busteur le cache du CDN.
logoPath: text('logo_path'),
```

Nullable, sans valeur par défaut. Migration Drizzle générée via `pnpm
db:generate` (prochain `00XX_*.sql`).

La clé porte un suffixe de version pour contourner le cache CDN d'un
remplacement : `${companyId}/${timestamp}.${ext}`. Le `upsert` sur une clé fixe
ne suffirait pas — le CDN public servirait l'ancienne image. Chaque
enregistrement écrit une nouvelle clé et supprime l'ancienne.

## Stockage

Migration manuelle `supabase/migrations/9012_company_logos_bucket.sql`, sur le
modèle de `9008_chantier_photos_bucket.sql` mais **public** :

```sql
-- Logo d'entreprise. Compartiment PUBLIC : le logo est fait pour etre vu et
-- indexe sur la page publique de l'entreprise. Contrairement aux photos de
-- chantier et aux attestations, rien n'y est confidentiel.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos', 'company-logos', true,
  1048576, ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
```

- Public, un objet par version (`${companyId}/${timestamp}.${ext}`).
- Formats : PNG / JPEG / WebP uniquement. **Pas de SVG** — un SVG peut embarquer
  du script ; le risque est inutile pour un logo.
- Taille max : 1 Mo (portée par le bucket ET revalidée dans l'action).

L'écriture passe par la clé de service (`createServiceSupabase`), comme les
photos de chantier. La lecture est directe via l'URL publique.

## Surfaces

### Upload — `/mon-passeport`

Une section « Logo » ajoutée à la page, gardée par `passport.manage` (déjà la
garde de la page). Composant client `LogoField` :
- Aperçu du logo actuel (ou état vide « Aucun logo »).
- Champ fichier + bouton « Téléverser » / « Remplacer ».
- Bouton « Retirer » si un logo existe.

Deux server actions dans `src/app/(app)/mon-passeport/actions.ts` :

```
saveLogo(state, form): requireCapability('passport.manage')
  -> valide le fichier (présent, type ∈ {png,jpeg,webp}, taille ≤ 1 Mo)
  -> upload `${companyId}/${Date.now()}.${ext}` dans `company-logos`
  -> db.update(company).set({ logoPath }) where id = companyId
  -> supprime l'ancien objet si l'ancien logoPath ≠ null
  -> recordEvent('company.logo_updated', payload:{ set:true })

removeLogo(): requireCapability('passport.manage')
  -> db.update(company).set({ logoPath: null }) where id = companyId
  -> supprime l'objet du bucket
  -> recordEvent('company.logo_updated', payload:{ set:false })
```

Validation d'accès via `requireCapability` (comme `saveLegalMentions`). Le
journal porte le fait, pas l'image.

### Affichage — `/artisan/[slug]`

`publicProfile` (`src/services/public-profile.ts`) expose un nouveau champ :

```ts
logoUrl: string | null
```

Dérivé de `found.logoPath` : `null` si absent, sinon l'URL publique du bucket
`company-logos` (via `getPublicUrl`, ou construite depuis l'URL Supabase
publique). Aucune requête supplémentaire.

Dans l'en-tête de `page.tsx`, quand `logoUrl` est présent : une image ~64px,
coins arrondis (`rounded-*` du socle), à côté du bloc nom/ville. `alt` = nom
légal. Absente proprement quand `null`. Élément discret, il ne concurrence pas
le `SealBadge`.

Note SSR : `next/image` demande une config `remotePatterns` pour le domaine
Supabase. Le socle utilise-t-il déjà `next/image` ? Sinon, une balise `<img>`
avec `width`/`height` fixes suffit et évite d'ouvrir une surface de config —
décision à trancher au moment du plan selon l'usage existant.

## Tests

- Domaine/service : `publicProfile` renvoie `logoUrl` dérivé de `logoPath`
  (présent → URL, `null` → `null`).
- Action : `saveLogo` refuse un type non autorisé et un fichier > 1 Mo ; écrit
  `logoPath` et journalise ; `removeLogo` remet à `null`.
- Accès : les deux actions exigent `passport.manage` (un compagnon est refusé).
- E2E (léger) : un logo téléversé apparaît sur `/artisan/[slug]`.

## Risques / points ouverts

- **SVG exclu** délibérément (script embarqué). Si un artisan n'a qu'un SVG, il
  devra exporter en PNG — acceptable au vu du risque.
- **`next/image` vs `<img>`** : tranché au plan selon l'usage existant du socle.
- **Cohérence page « confiance »** : logo maintenu discret par le design de
  l'en-tête, pas de bannière.
