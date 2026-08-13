# Logo de l'artisan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à une entreprise vérifiée d'afficher son logo sur sa page publique `/artisan/[slug]`, téléversé par le responsable depuis `/mon-passeport`.

**Architecture:** Une colonne `logoPath` sur `company` pointe vers un objet d'un bucket de stockage **public** `company-logos`. La logique pure (validation, dérivation d'URL) vit dans `src/domain/logo.ts` (testée unitairement) ; un service `src/services/company-logo.ts` porte l'upload/suppression (comme `uploadCertificate`) ; deux actions serveur gardées par `passport.manage` l'appellent. La page publique dérive l'URL publique sans requête supplémentaire.

**Tech Stack:** Next.js 16 (App Router, Server Components + Server Actions), Drizzle ORM (Postgres), Supabase Storage, Vitest, Playwright.

---

## File Structure

- **Create** `src/domain/logo.ts` — constantes + logique pure : `LOGO_BUCKET`, `LOGO_MAX_BYTES`, `LOGO_MIME`, `logoUploadError(file)`, `logoExtension(mime)`, `logoPublicUrl(path)`.
- **Create** `tests/domain/logo.test.ts` — tests unitaires de `src/domain/logo.ts`.
- **Modify** `src/db/schema/company.ts` — ajoute la colonne `logoPath`.
- **Create** `supabase/migrations/00XX_*.sql` — généré par `pnpm db:generate` (colonne).
- **Create** `supabase/migrations/9012_company_logos_bucket.sql` — le bucket public (manuel).
- **Create** `src/services/company-logo.ts` — `saveCompanyLogo`, `removeCompanyLogo`.
- **Modify** `src/services/public-profile.ts` — expose `logoUrl` dans `PublicProfile`.
- **Modify** `tests/services/public-profile.test.ts` — couvre `logoUrl`.
- **Create** `src/app/(app)/mon-passeport/actions.ts` — actions `saveLogo`, `removeLogo`.
- **Create** `src/app/(app)/mon-passeport/LogoField.tsx` — composant client d'upload.
- **Modify** `src/app/(app)/mon-passeport/page.tsx` — charge `logoPath`, insère `LogoField`.
- **Modify** `src/app/artisan/[slug]/page.tsx` — affiche le logo dans l'en-tête.
- **Create** `tests/e2e/logo-artisan.spec.ts` — parcours léger (facultatif, Task 8).

---

## Task 1: Colonne `logoPath` + migration Drizzle

**Files:**
- Modify: `src/db/schema/company.ts` (bloc `company`, après `agendaFeedToken`/avant `plan` — n'importe où dans les colonnes)
- Create: `supabase/migrations/00XX_*.sql` (généré)

- [ ] **Step 1: Ajouter la colonne au schéma**

Dans `src/db/schema/company.ts`, à l'intérieur de `pgTable('company', { … })`, ajouter après la colonne `agendaFeedToken` (ligne ~55) :

```ts
  /**
   * La cle de l'objet dans le bucket PUBLIC `company-logos`, ou `null`.
   *
   * On stocke la CLE, pas l'URL : l'URL publique s'en derive (voir
   * `logoPublicUrl`). La cle porte un suffixe d'horodatage — `{id}/{ts}.{ext}` —
   * pour qu'un remplacement change d'adresse et contourne le cache du CDN, ce
   * qu'un `upsert` sur une cle fixe ne ferait pas.
   */
  logoPath: text('logo_path'),
```

`text` est déjà importé en tête de fichier.

- [ ] **Step 2: Générer la migration**

Run: `pnpm db:generate`
Expected: un nouveau fichier `supabase/migrations/00XX_*.sql` contenant `ALTER TABLE "company" ADD COLUMN "logo_path" text;`

- [ ] **Step 3: Appliquer et vérifier**

Run: `pnpm db:reset`
Expected: reset sans erreur, la migration s'applique.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema/company.ts supabase/migrations
git commit -m "feat(db): colonne logo_path sur company"
```

---

## Task 2: Bucket public `company-logos`

**Files:**
- Create: `supabase/migrations/9012_company_logos_bucket.sql`

- [ ] **Step 1: Écrire la migration du bucket**

Créer `supabase/migrations/9012_company_logos_bucket.sql` (modèle : `9008_chantier_photos_bucket.sql`, mais PUBLIC) :

```sql
-- Logo d'entreprise. Compartiment PUBLIC : le logo est fait pour etre vu et
-- indexe sur la page publique de l'entreprise. Contrairement aux photos de
-- chantier et aux attestations, rien n'y est confidentiel. Les limites de
-- taille et de type sont portees par le bucket ET revalidees dans le service.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  1048576,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Appliquer et vérifier**

Run: `pnpm db:reset`
Expected: reset sans erreur ; le bucket `company-logos` existe (public).

Vérif optionnelle : `node scripts/supabase.mjs status` puis, dans Studio, Storage → `company-logos` marqué « Public ».

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/9012_company_logos_bucket.sql
git commit -m "feat(storage): bucket public company-logos"
```

---

## Task 3: Domaine `src/domain/logo.ts` (pur, TDD)

**Files:**
- Create: `src/domain/logo.ts`
- Test: `tests/domain/logo.test.ts`

- [ ] **Step 1: Écrire les tests**

Créer `tests/domain/logo.test.ts` :

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { logoUploadError, logoExtension, logoPublicUrl } from '@/domain/logo'

/** Un `File` factice de taille et type donnes, sans lire d'octets reels. */
function fakeFile(bytes: number, type: string): File {
  return { size: bytes, type } as File
}

describe('logoUploadError', () => {
  it('accepte un PNG sous la limite', () => {
    expect(logoUploadError(fakeFile(1000, 'image/png'))).toBeNull()
  })

  it('refuse un fichier vide', () => {
    expect(logoUploadError(fakeFile(0, 'image/png'))).toBe('Le fichier est vide')
  })

  it('refuse un type non autorise', () => {
    expect(logoUploadError(fakeFile(1000, 'image/svg+xml'))).toBe(
      'Formats acceptés : PNG, JPEG, WebP',
    )
  })

  it('refuse au-dela de 1 Mo', () => {
    expect(logoUploadError(fakeFile(1048577, 'image/png'))).toBe(
      'Le logo dépasse 1 Mo',
    )
  })
})

describe('logoExtension', () => {
  it('mappe chaque type accepte', () => {
    expect(logoExtension('image/png')).toBe('png')
    expect(logoExtension('image/jpeg')).toBe('jpg')
    expect(logoExtension('image/webp')).toBe('webp')
  })
})

describe('logoPublicUrl', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ref.supabase.co'
  })

  it('rend null sans chemin', () => {
    expect(logoPublicUrl(null)).toBeNull()
  })

  it("construit l'URL publique du bucket", () => {
    expect(logoPublicUrl('abc/171.png')).toBe(
      'https://ref.supabase.co/storage/v1/object/public/company-logos/abc/171.png',
    )
  })
})
```

- [ ] **Step 2: Lancer les tests (échec attendu)**

Run: `pnpm vitest run tests/domain/logo.test.ts`
Expected: FAIL — `Cannot find module '@/domain/logo'`.

- [ ] **Step 3: Implémenter le domaine**

Créer `src/domain/logo.ts` :

```ts
/**
 * Le logo d'une entreprise : ce qui est pur autour de lui.
 *
 * La validation et la derivation d'URL vivent ici, hors du service, pour se
 * verifier sans base ni stockage. Le service `company-logo` s'appuie dessus.
 */

/** Le compartiment de stockage. PUBLIC : le logo est fait pour etre vu. */
export const LOGO_BUCKET = 'company-logos'

/** 1 Mo. La meme limite est posee sur le bucket. */
export const LOGO_MAX_BYTES = 1024 * 1024

/** Les seuls types acceptes. Pas de SVG : un SVG peut embarquer du script. */
export const LOGO_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const

type LogoMime = (typeof LOGO_MIME)[number]

/** Le message d'erreur si le fichier ne convient pas, ou `null`. */
export function logoUploadError(file: File): string | null {
  if (file.size === 0) return 'Le fichier est vide'
  if (!LOGO_MIME.includes(file.type as LogoMime)) return 'Formats acceptés : PNG, JPEG, WebP'
  if (file.size > LOGO_MAX_BYTES) return 'Le logo dépasse 1 Mo'
  return null
}

/** L'extension de fichier pour un type accepte. */
export function logoExtension(mime: string): string {
  return mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
}

/**
 * L'URL publique d'un logo, ou `null`.
 *
 * Deterministe : un bucket public sert ses objets a une adresse fixe, sans
 * signature ni requete. On la construit donc plutot que d'instancier un client.
 */
export function logoPublicUrl(path: string | null): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${base}/storage/v1/object/public/${LOGO_BUCKET}/${path}`
}
```

- [ ] **Step 4: Lancer les tests (succès attendu)**

Run: `pnpm vitest run tests/domain/logo.test.ts`
Expected: PASS (toutes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/logo.ts tests/domain/logo.test.ts
git commit -m "feat(domain): validation et url publique du logo"
```

---

## Task 4: `publicProfile` expose `logoUrl`

**Files:**
- Modify: `src/services/public-profile.ts` (interface `PublicProfile`, retour de `publicProfile`)
- Test: `tests/services/public-profile.test.ts`

- [ ] **Step 1: Écrire le test (échec attendu)**

Dans `tests/services/public-profile.test.ts`, ajouter un `it` dans le `describe` existant (le fichier insère déjà une entreprise publique `PLOMBERIE DU TEST`). Ajouter en haut du fichier l'import :

```ts
import { eq } from 'drizzle-orm'
```

Puis, à la fin du fichier, avant la fermeture du dernier `describe` (ou dans un nouveau `describe`) :

```ts
describe('logo', () => {
  it('rend null sans logo, une URL une fois pose', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ref.supabase.co'

    const before = await publicProfile(SIREN, NOW)
    expect(before?.logoUrl).toBeNull()

    await db.update(company).set({ logoPath: `${COMPANY}/171.png` }).where(eq(company.id, COMPANY))

    const after = await publicProfile(SIREN, NOW)
    expect(after?.logoUrl).toBe(
      `https://ref.supabase.co/storage/v1/object/public/company-logos/${COMPANY}/171.png`,
    )
  })
})
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `pnpm vitest run tests/services/public-profile.test.ts -t logo`
Expected: FAIL — `logoUrl` n'existe pas sur le type / vaut `undefined`.

- [ ] **Step 3: Implémenter**

Dans `src/services/public-profile.ts` :

1. Ajouter l'import en tête :

```ts
import { logoPublicUrl } from '@/domain/logo'
```

2. Ajouter le champ à l'interface `PublicProfile` (après `foundedOn`) :

```ts
  /** L'URL publique du logo de l'entreprise, ou `null`. */
  logoUrl: string | null
```

3. Dans l'objet retourné par `publicProfile`, ajouter après `foundedOn: found.foundedOn,` :

```ts
    logoUrl: logoPublicUrl(found.logoPath),
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `pnpm vitest run tests/services/public-profile.test.ts`
Expected: PASS (tous, y compris l'existant).

- [ ] **Step 5: Commit**

```bash
git add src/services/public-profile.ts tests/services/public-profile.test.ts
git commit -m "feat(profile): logoUrl dans le profil public"
```

---

## Task 5: Service `company-logo` (upload / suppression)

**Files:**
- Create: `src/services/company-logo.ts`

- [ ] **Step 1: Implémenter le service**

Créer `src/services/company-logo.ts` (modèle : `uploadCertificate` dans `src/services/certificates.ts`) :

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { LOGO_BUCKET, logoExtension, logoUploadError } from '@/domain/logo'
import { createServiceSupabase } from '@/lib/supabase-server'
import { recordEvent } from '@/services/events'

/**
 * Depose (ou remplace) le logo d'une entreprise.
 *
 * Le compartiment est PUBLIC : le logo est fait pour etre vu sur la page
 * publique. On ecrit une cle HORODATEE — `{id}/{ts}.{ext}` — et on supprime
 * l'ancienne : sur un bucket public servi par un CDN, reutiliser la meme cle
 * ferait servir l'ancienne image apres un remplacement.
 */
export async function saveCompanyLogo(input: { companyId: string; file: File }): Promise<void> {
  const error = logoUploadError(input.file)
  if (error) throw new Error(error)

  const [current] = await db
    .select({ logoPath: company.logoPath })
    .from(company)
    .where(eq(company.id, input.companyId))

  const supabase = createServiceSupabase()
  const path = `${input.companyId}/${Date.now()}.${logoExtension(input.file.type)}`

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, await input.file.arrayBuffer(), { contentType: input.file.type })

  // La cause est conservee : un message generique rend une panne de stockage
  // indiagnosticable.
  if (uploadError) throw new Error('Le dépôt du logo a échoué', { cause: uploadError })

  await db.update(company).set({ logoPath: path }).where(eq(company.id, input.companyId))

  // On efface l'ancien objet APRES coup : si la suppression echoue, la fiche
  // pointe deja sur le nouveau, et il ne reste qu'un objet orphelin sans effet.
  if (current?.logoPath) {
    await supabase.storage.from(LOGO_BUCKET).remove([current.logoPath])
  }

  await recordEvent({
    type: 'company.logo_updated',
    subjectType: 'company',
    subjectId: input.companyId,
    companyId: input.companyId,
    actorType: 'company',
    payload: { set: true },
  })
}

/** Retire le logo : remet `logoPath` a `null` et supprime l'objet. */
export async function removeCompanyLogo(companyId: string): Promise<void> {
  const [current] = await db
    .select({ logoPath: company.logoPath })
    .from(company)
    .where(eq(company.id, companyId))

  if (!current?.logoPath) return

  await db.update(company).set({ logoPath: null }).where(eq(company.id, companyId))

  const supabase = createServiceSupabase()
  await supabase.storage.from(LOGO_BUCKET).remove([current.logoPath])

  await recordEvent({
    type: 'company.logo_updated',
    subjectType: 'company',
    subjectId: companyId,
    companyId,
    actorType: 'company',
    payload: { set: false },
  })
}
```

- [ ] **Step 2: Vérifier la compilation (typecheck via build ciblé)**

Run: `pnpm tsc --noEmit`
Expected: aucune erreur de type liée à `src/services/company-logo.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/company-logo.ts
git commit -m "feat(service): upload et suppression du logo"
```

---

## Task 6: Actions serveur + `LogoField` sur `/mon-passeport`

**Files:**
- Create: `src/app/(app)/mon-passeport/actions.ts`
- Create: `src/app/(app)/mon-passeport/LogoField.tsx`
- Modify: `src/app/(app)/mon-passeport/page.tsx`

- [ ] **Step 1: Écrire les actions**

Créer `src/app/(app)/mon-passeport/actions.ts` :

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireCapability } from '@/lib/access'
import { saveCompanyLogo, removeCompanyLogo } from '@/services/company-logo'

export interface LogoState {
  error?: string
}

export async function saveLogo(_state: LogoState, form: FormData): Promise<LogoState> {
  const { companyId } = await requireCapability('passport.manage')

  const file = form.get('logo')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choisissez un fichier.' }
  }

  try {
    await saveCompanyLogo({ companyId, file })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Le dépôt du logo a échoué' }
  }

  revalidatePath('/mon-passeport')
  return {}
}

export async function removeLogo(): Promise<void> {
  const { companyId } = await requireCapability('passport.manage')
  await removeCompanyLogo(companyId)
  revalidatePath('/mon-passeport')
}
```

- [ ] **Step 2: Écrire le composant client**

Créer `src/app/(app)/mon-passeport/LogoField.tsx`. Vérifier d'abord les props réelles de `Button` (`src/ui/atoms/button.tsx`) et `Text` ; le squelette ci-dessous n'utilise que `variant`/`type`/`disabled`, présents partout ailleurs.

```tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { saveLogo, removeLogo, type LogoState } from './actions'

const initial: LogoState = {}

export function LogoField({ logoUrl }: { logoUrl: string | null }) {
  const [state, action, pending] = useActionState(saveLogo, initial)

  return (
    <Card elevation="flat">
      <div className="flex flex-col gap-3" data-testid="logo">
        <div className="flex flex-col gap-1">
          <Text size="label" tone="muted" as="h2">
            Logo
          </Text>
          <Text size="sm" tone="soft">
            Il apparaît sur votre fiche publique. PNG, JPEG ou WebP, 1 Mo maximum.
          </Text>
        </div>

        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- le socle n'utilise pas next/image
          <img
            src={logoUrl}
            alt="Votre logo"
            width={64}
            height={64}
            className="h-16 w-16 rounded-card object-contain"
          />
        ) : (
          <Text size="sm" tone="muted">
            Aucun logo pour l’instant.
          </Text>
        )}

        <form action={action} className="flex flex-col gap-2">
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
            className="text-sm"
          />
          {state.error && (
            <Text size="sm" tone="danger">
              {state.error}
            </Text>
          )}
          <Button type="submit" variant="secondary" disabled={pending}>
            {logoUrl ? 'Remplacer le logo' : 'Téléverser un logo'}
          </Button>
        </form>

        {logoUrl && (
          <form action={removeLogo}>
            <Button type="submit" variant="ghost">
              Retirer le logo
            </Button>
          </form>
        )}
      </div>
    </Card>
  )
}
```

Note d'exécution : confirmer les valeurs autorisées de `variant` sur `Button` et de `tone` sur `Text` (`danger` existe-t-il ? sinon `default`) et le rayon `rounded-card` (sinon `rounded-badge`) via `src/app/design-system/page.tsx` et les atomes. Ajuster aux noms réels du socle — `pnpm check:ds` refuse toute classe/props hors table.

- [ ] **Step 3: Câbler la page**

Dans `src/app/(app)/mon-passeport/page.tsx` :

1. Importer en tête :

```ts
import { logoPublicUrl } from '@/domain/logo'
import { LogoField } from './LogoField'
```

2. Étendre la sélection `company` existante (vers la ligne 51) pour lire `logoPath` :

```ts
    db
      .select({ legalName: company.legalName, siret: company.siret, logoPath: company.logoPath })
      .from(company)
      .where(eq(company.id, session.companyId))
      .limit(1),
```

3. Insérer `<LogoField>` dans le rendu, juste après la `Card` `data-testid="fiche-publique"` (avant `<DisputeList …>`) :

```tsx
        <LogoField logoUrl={logoPublicUrl(profile?.logoPath ?? null)} />
```

- [ ] **Step 4: Vérifier build + design system**

Run: `pnpm check:ds && pnpm tsc --noEmit`
Expected: aucune erreur (classes/props dans la table du socle, types OK).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/mon-passeport/actions.ts" "src/app/(app)/mon-passeport/LogoField.tsx" "src/app/(app)/mon-passeport/page.tsx"
git commit -m "feat(passeport): televerser et retirer son logo"
```

---

## Task 7: Affichage du logo sur `/artisan/[slug]`

**Files:**
- Modify: `src/app/artisan/[slug]/page.tsx` (en-tête, lignes ~64-83)

- [ ] **Step 1: Afficher le logo dans l'en-tête**

Dans `src/app/artisan/[slug]/page.tsx`, remplacer le bloc `<header>` (lignes ~64-83) pour poser le logo à gauche du bloc nom/ville quand `profile.logoUrl` existe :

```tsx
      <header className="flex flex-col gap-3">
        <div className="flex items-start gap-4">
          {profile.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- le socle n'utilise pas next/image
            <img
              src={profile.logoUrl}
              alt={profile.legalName}
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-card object-contain"
            />
          )}
          <div className="flex flex-col gap-1">
            <Heading level="display">{profile.legalName}</Heading>
            <Text size="sm" tone="soft">
              {profile.city}
              {years !== null && ` · ${years} ans d’activité`}
            </Text>
            <Text size="sm" tone="muted">
              SIRET {profile.siret}
            </Text>
          </div>
        </div>

        {/*
          Le sceau, enfin honnete : la verification existe reellement ici, et
          chaque activite listee est couverte par une assurance adaptee. Format
          « page » : l'adresse du passeport est celle de cette page, l'afficher
          n'apprendrait rien.
        */}
        <SealBadge format="page" activities={trades} />
      </header>
```

Note : garder le même `rounded-*` que celui retenu en Task 6 (cohérence). Le logo reste discret (64px, à côté du nom) — il ne concurrence pas le `SealBadge`.

- [ ] **Step 2: Vérifier build + design system**

Run: `pnpm check:ds && pnpm build`
Expected: build OK, aucune classe hors table.

- [ ] **Step 3: Commit**

```bash
git add "src/app/artisan/[slug]/page.tsx"
git commit -m "feat(artisan): logo dans l'en-tete de la page publique"
```

---

## Task 8 (facultatif) : Parcours e2e léger

**Files:**
- Create: `tests/e2e/logo-artisan.spec.ts`

Ne l'écrire que si un compte artisan de démonstration existe déjà dans `supabase/seed.sql` avec une entreprise publique et un accès `owner`. Sinon, sauter cette tâche : la couverture unitaire (Tasks 3-4) et le contrôle manuel suffisent au premier jet.

- [ ] **Step 1: Vérifier l'existence d'un artisan de démo**

Run: `grep -n "member\|owner\|legal_name" supabase/seed.sql | head`
Expected: identifier une entreprise publique et l'e-mail de son responsable. Si absent → sauter la tâche.

- [ ] **Step 2: Écrire le parcours** (adapter e-mail/slug au seed ; modèle : `tests/e2e/invoice-journey.spec.ts`)

```ts
import { test, expect } from '@playwright/test'
import { signInAs } from './helpers' // adapter au helper de connexion existant

test('un logo televerse apparait sur la fiche publique', async ({ page }) => {
  await signInAs(page, 'RESPONSABLE_DE_DEMO@example.test')
  await page.goto('/mon-passeport')

  await page
    .getByTestId('logo')
    .getByLabel(/logo/i)
    .setInputFiles('tests/e2e/fixtures/logo.png')
  await page.getByRole('button', { name: /logo/i }).click()

  await expect(page.getByTestId('logo').getByRole('img')).toBeVisible()
})
```

- [ ] **Step 3: Lancer**

Run: `pnpm test:e2e -- logo-artisan`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/logo-artisan.spec.ts tests/e2e/fixtures/logo.png
git commit -m "test(e2e): parcours logo artisan"
```

---

## Validation finale

- [ ] Run: `pnpm validate`
  Expected: `check:env`, `check:size`, `check:ds`, `check:isolation`, `build`, et `vitest run` passent tous.

---

## Notes de revue (self-review)

- **Couverture spec :** donnée (T1), bucket (T2), domaine pur (T3), `logoUrl` (T4), service upload/suppression (T5), upload UI + actions gardées `passport.manage` (T6), affichage public (T7), e2e léger (T8). Tous les points de la spec ont une tâche.
- **`next/image` vs `<img>` :** tranché — le socle n'utilise pas `next/image`, donc `<img>` avec `width`/`height` fixes, pas de `remotePatterns` à configurer.
- **SVG :** exclu au bucket (`allowed_mime_types`) ET au domaine (`LOGO_MIME`).
- **Cohérence des noms :** `LOGO_BUCKET`, `logoUploadError`, `logoExtension`, `logoPublicUrl`, `saveCompanyLogo`, `removeCompanyLogo`, `saveLogo`, `removeLogo`, colonne `logoPath`/`logo_path` — identiques d'une tâche à l'autre.
- **Points à confirmer à l'exécution (noms du socle, non bloquants) :** valeurs de `variant` sur `Button`, de `tone` sur `Text` (`danger` ?), et le rayon (`rounded-card`/`rounded-badge`). `pnpm check:ds` est le garde-fou.
