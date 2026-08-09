# La navigation de l'espace artisan — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** rendre `/mon-passeport` et `/verification` atteignables depuis l'en-tête de l'artisan, avec l'état actif de la page courante et un repli mobile, sans que le backoffice hérite de cette navigation.

**Architecture :** la logique de navigation — les entrées, la correspondance de page courante, les écrans qui portent la barre — vit dans un `.ts` pur (`app-nav-routes.ts`), testable en environnement `node`. Le rendu vit dans une molécule cliente (`AppNav`) qui lit `usePathname()`. `AppHeader` reste un composant serveur et se contente de la poser. Aucune des quinze pages qui appellent `AppShell` n'est modifiée.

**Tech Stack :** Next.js 16 (App Router), React 19, Tailwind v4 sur jetons sémantiques, Vitest (environnement `node`), Playwright.

**Spec :** [2026-08-09-navigation-artisan-design.md](../specs/2026-08-09-navigation-artisan-design.md)

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/ui/molecules/app-nav-routes.ts` | **Créer.** Les entrées, `isCurrent`, `showsNav`. Aucun import React. |
| `src/ui/molecules/app-nav.tsx` | **Créer.** Le rendu, `'use client'`. |
| `src/ui/organisms/app-header.tsx` | **Modifier.** Perd sa constante `NAV` et son `<nav>` en ligne. |
| `scripts/check-design-system.mjs` | **Modifier.** `AppNav` entre à l'inventaire, avec sa justification. |
| `src/app/(app)/mon-passeport/page.tsx` | **Modifier.** Le lien vers la fiche publique. |
| `tests/ui/app-nav.test.ts` | **Créer.** Les tests unitaires de la logique. |
| `tests/e2e/verification-journey.spec.ts` | **Modifier.** La preuve d'atteignabilité. |

### Pourquoi deux fichiers pour une navigation

Vitest tourne en environnement `node` et n'inclut que `tests/**/*.test.ts` — pas de jsdom, pas de `@testing-library/react`. `tests/ui/status-badge.test.ts` le dit déjà : *« Le rendu n'est pas testable en environnement `node`, mais la table de correspondance l'est — et c'est elle qui porte le risque. »*

Séparer la logique du rendu la rend testable **sans ajouter une dépendance**. La tâche 1 la couvre unitairement ; la tâche 6 prouve le rendu par un parcours réel.

---

## Task 1 : La logique de navigation, et ses tests

**Files:**
- Create: `src/ui/molecules/app-nav-routes.ts`
- Test: `tests/ui/app-nav.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `tests/ui/app-nav.test.ts` :

```typescript
import { describe, expect, it } from 'vitest'
import { isCurrent, navGroups, showsNav } from '@/ui/molecules/app-nav-routes'

/** Tous les liens de la barre, dans l'ordre d'affichage. */
const hrefs = navGroups.flatMap((group) => group.entries.map((entry) => entry.href))

describe('les entrées de la navigation', () => {
  it('couvre les cinq écrans de l’artisan', () => {
    expect(hrefs).toEqual(['/devis', '/factures', '/agenda', '/mon-passeport', '/verification'])
  })

  it('ne pose aucun préfixe qui en recouvre un autre', () => {
    // Sans quoi deux entrees s'allumeraient ensemble, et « actif » ne voudrait
    // plus rien dire.
    for (const href of hrefs) {
      const others = hrefs.filter((candidate) => candidate !== href)
      expect(others.filter((candidate) => isCurrent(candidate, href))).toEqual([])
    }
  })

  it('donne à chaque groupe une étiquette annonçable', () => {
    for (const group of navGroups) expect(group.label).toBeTruthy()
  })
})

describe('la page courante', () => {
  it('reconnaît la page elle-même', () => {
    expect(isCurrent('/devis', '/devis')).toBe(true)
  })

  it('reconnaît un sous-chemin', () => {
    expect(isCurrent('/devis/42/chantier', '/devis')).toBe(true)
  })

  it('ne se laisse pas prendre à un préfixe de chaîne', () => {
    // « /devis-types » commence par « /devis » sans en etre un sous-chemin.
    expect(isCurrent('/devis-types', '/devis')).toBe(false)
  })

  it('n’allume rien sur un écran hors navigation', () => {
    const lit = navGroups.flatMap((g) => g.entries).filter((e) => isCurrent('/mentions', e.href))
    expect(lit).toEqual([])
  })
})

describe('les écrans qui portent la navigation', () => {
  it('la portent sur les écrans de l’artisan', () => {
    expect(showsNav('/devis')).toBe(true)
    expect(showsNav('/mentions')).toBe(true)
  })

  it('ne la portent pas dans le backoffice', () => {
    expect(showsNav('/supervision')).toBe(false)
    expect(showsNav('/attestations')).toBe(false)
    expect(showsNav('/attestations/8f2a')).toBe(false)
  })
})
```

- [ ] **Step 2 : Lancer les tests et vérifier qu'ils échouent**

```bash
pnpm vitest run tests/ui/app-nav.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "@/ui/molecules/app-nav-routes"`.

- [ ] **Step 3 : Écrire l'implémentation**

Créer `src/ui/molecules/app-nav-routes.ts` :

```typescript
/**
 * Les entrees de la navigation de l'artisan, et les deux predicats qui en
 * decident l'affichage.
 *
 * Un fichier `.ts` separe de `app-nav.tsx`, pour une raison de test : vitest
 * tourne en environnement `node`, sans jsdom, et n'inclut que les fichiers
 * `.test.ts`. Importer le `.tsx` y ferait entrer React et `next/link` pour
 * verifier deux regles de chaine de caracteres.
 *
 * Aucun export ne commence par une majuscule : `check:ds` inventorie tout
 * export capitalise de `src/ui/` comme un composant, et refuserait ce qui ne
 * figure pas dans sa table.
 */

export interface NavEntry {
  href: string
  label: string
}

export interface NavGroup {
  /** Annoncee par un lecteur d'ecran ; jamais affichee a l'ecran. */
  label: string
  entries: NavEntry[]
}

/**
 * Deux groupes, parce que les deux n'ont pas la meme frequence d'usage.
 *
 * Les aplatir donnerait le meme poids a « etablir un devis » et a « voir ou en
 * est mon attestation », ce qui est faux.
 *
 * `/annuaire` n'y figure pas : c'est l'ecran ou un *client* cherche un artisan,
 * en `PublicShell`, et y envoyer l'artisan le sort de son espace sans retour.
 * Le besoin reel — voir sa propre fiche — est servi depuis `/mon-passeport`.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Suivi quotidien',
    entries: [
      { href: '/devis', label: 'Devis' },
      { href: '/factures', label: 'Factures' },
      { href: '/agenda', label: 'Agenda' },
    ],
  },
  {
    label: 'Mon entreprise',
    entries: [
      { href: '/mon-passeport', label: 'Passeport' },
      { href: '/verification', label: 'Vérification' },
    ],
  },
]

/**
 * Le backoffice partage `AppShell` avec l'artisan, donc son en-tete.
 *
 * La liste est **negative**, et c'est un choix assume : une route de backoffice
 * ajoutee plus tard heriterait de la navigation de l'artisan tant qu'on ne l'y
 * inscrit pas. Une route d'artisan nouvelle est un evenement bien plus
 * frequent, et c'est elle qu'on protege de l'oubli.
 */
const BACKOFFICE = ['/supervision', '/attestations']

/**
 * Une entree est courante si elle est la page, ou l'un de ses sous-chemins.
 *
 * La barre oblique compte : `startsWith('/devis')` seul allumerait « Devis »
 * sur une route `/devis-types` qui n'a rien a voir.
 */
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** L'en-tete de l'artisan ne porte pas sa navigation dans le backoffice. */
export function showsNav(pathname: string): boolean {
  return !BACKOFFICE.some((prefix) => isCurrent(pathname, prefix))
}
```

- [ ] **Step 4 : Lancer les tests et vérifier qu'ils passent**

```bash
pnpm vitest run tests/ui/app-nav.test.ts
```

Attendu : SUCCÈS — 9 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/ui/molecules/app-nav-routes.ts tests/ui/app-nav.test.ts
git commit -m "feat: les entrees de navigation de l'artisan, et la page courante"
```

---

## Task 2 : `AppNav`, la molécule cliente

**Files:**
- Create: `src/ui/molecules/app-nav.tsx`
- Modify: `scripts/check-design-system.mjs:37-41`

- [ ] **Step 1 : Écrire le composant**

Créer `src/ui/molecules/app-nav.tsx` :

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Text } from '@/ui/atoms/text'
import { cn } from '@/ui/cn'
import { isCurrent, navGroups, showsNav } from './app-nav-routes'

/**
 * La navigation de l'artisan.
 *
 * Cliente, et c'est sa raison d'etre : `AppHeader` est un composant serveur, et
 * un composant serveur ne peut pas lire l'URL. La sortir dans son propre
 * fichier evite de verser `Lockup` et `Text` au client pour un seul
 * `usePathname()`.
 *
 * L'etat actif se marque **trois fois** : `aria-current` pour le lecteur
 * d'ecran, le contraste du texte, et un filet de 2 px. La couleur ne porte
 * jamais seule une information.
 *
 * Le survol ne change pas la couleur du texte, il change le filet : `Text` fixe
 * la sienne, et se battre en specificite contre elle donnerait un resultat
 * dependant de l'ordre des classes Tailwind.
 *
 * Passage a la ligne plutot qu'un menu : l'artisan est sur un chantier, une
 * main prise. Un menu cache exactement ce que ce composant existe pour montrer.
 */
export function AppNav() {
  const pathname = usePathname()
  if (!showsNav(pathname)) return null

  return (
    <nav
      aria-label="Navigation principale"
      className="flex flex-wrap items-center gap-x-6 gap-y-1"
    >
      {navGroups.map((group) => (
        <ul
          key={group.label}
          aria-label={group.label}
          className="flex flex-wrap items-center gap-x-3"
        >
          {group.entries.map((entry) => {
            const current = isCurrent(pathname, entry.href)

            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    // 44 px : le seuil que le socle s'impose deja pour `Input`.
                    // Avant, la cible faisait la hauteur du texte, soit 20 px.
                    'inline-flex min-h-11 items-center rounded-badge border-b-2 px-2',
                    current ? 'border-link' : 'border-transparent hover:border-rule',
                  )}
                >
                  <Text size="sm" tone={current ? 'default' : 'muted'} as="span">
                    {entry.label}
                  </Text>
                </Link>
              </li>
            )
          })}
        </ul>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2 : Vérifier que `check:ds` refuse le composant**

```bash
pnpm check:ds
```

Attendu : ÉCHEC — `src/ui/molecules/app-nav.tsx — AppNav ne figure pas dans l'inventaire de la spec (§6.1)`.

C'est le garde-fou qui fait son travail : l'inventaire est fermé, et toute addition doit être décidée.

- [ ] **Step 3 : Inscrire `AppNav` à l'inventaire, avec sa justification**

Dans `scripts/check-design-system.mjs`, remplacer le tableau `molecules` :

```javascript
  molecules: [
    'Field', 'Card', 'StatusBadge', 'SealBadge', 'LogoLockup', 'EmptyState',
    'Toast', 'Tooltip', 'ButtonGroup', 'SummaryLine', 'Dialog', 'ThemeToggle',
    'SectionHeader', 'StepCard', 'Reveal', 'Stagger', 'RevealTick',
    // La navigation doit connaitre la page courante, et un composant serveur ne
    // peut pas lire l'URL. L'isoler garde `AppHeader` cote serveur au lieu d'y
    // verser `Lockup` et `Text` pour un seul `usePathname()`. Molecule et non
    // organisme : elle ne compose que des atomes.
    'AppNav',
  ],
```

- [ ] **Step 4 : Vérifier que `check:ds` passe**

```bash
pnpm check:ds
```

Attendu : SUCCÈS. Un avertissement `AppNav n'est encore utilise nulle part` est normal — la tâche 3 le consomme.

- [ ] **Step 5 : Commit**

```bash
git add src/ui/molecules/app-nav.tsx scripts/check-design-system.mjs
git commit -m "feat: AppNav, la navigation qui connait sa page"
```

---

## Task 3 : `AppHeader` pose la navigation

**Files:**
- Modify: `src/ui/organisms/app-header.tsx`

- [ ] **Step 1 : Remplacer le fichier entier**

`src/ui/organisms/app-header.tsx` devient :

```tsx
import Link from 'next/link'
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { AppNav } from '@/ui/molecules/app-nav'
import { ThemeToggle } from '@/ui/molecules/theme-toggle'

/**
 * L'en-tete de l'artisan connecte.
 *
 * Porte le verrouillage de la marque — donc `Mark`, jamais `Seal` : ici la
 * marque s'exprime. Le sceau n'apparaitra que sur le passeport d'une autre
 * entreprise.
 *
 * **Et il porte la navigation** : un ecran qu'on ne peut pas atteindre n'existe
 * pas, et c'etait le sort de l'agenda, du passeport et de la verification.
 *
 * `AppNav` se tient dans son propre fichier parce qu'elle est cliente — elle
 * lit l'URL. L'en-tete, lui, reste serveur.
 */
export function AppHeader({ companyName }: { companyName?: string }) {
  return (
    <header className="border-b border-rule bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        <Link href="/devis" className="rounded-badge" aria-label="Accueil">
          <Lockup size="sm" />
        </Link>

        <AppNav />

        {companyName ? (
          <Text size="sm" tone="muted" as="span">
            {companyName}
          </Text>
        ) : null}

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2 : Vérifier que la compilation passe et que `border-link` existe**

```bash
pnpm build
```

Attendu : SUCCÈS. Si `border-link` n'était pas généré par Tailwind, le filet serait invisible sans erreur — c'est l'étape 3 qui le constate.

- [ ] **Step 3 : Vérifier à l'écran**

Lancer le serveur de développement via l'outil de prévisualisation, puis ouvrir `/devis` :

- les cinq entrées sont visibles, en deux groupes séparés par un écart
- **Devis** est plus contrasté que les autres et porte un filet sous le texte
- ouvrir `/verification` : le filet s'est déplacé
- ouvrir `/devis/<un-id>` : **Devis** reste allumé
- réduire la fenêtre à 375 px : les entrées passent à la ligne, aucune n'est coupée
- ouvrir `/supervision` avec un compte relecteur : aucune navigation

- [ ] **Step 4 : Commit**

```bash
git add src/ui/organisms/app-header.tsx
git commit -m "feat: l'en-tete mene au passeport et a la verification"
```

---

## Task 4 : La fiche publique, depuis le passeport

**Files:**
- Modify: `src/app/(app)/mon-passeport/page.tsx`

- [ ] **Step 1 : Charger la couverture et l'identité de l'entreprise**

Remplacer les imports en tête de `src/app/(app)/mon-passeport/page.tsx` :

```tsx
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { companySlug } from '@/domain/slug'
import { currentCompany, SessionError } from '@/lib/session'
import { companyMetrics } from '@/services/passport-metrics'
import { disputesInReview } from '@/services/disputes'
import { companyCoverage } from '@/services/visibility'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { AppShell } from '@/ui/shells/app-shell'
import { MetricCard } from './MetricCard'
import { DisputeList } from './DisputeList'
```

Puis remplacer les deux `await` séquentiels :

```tsx
  const now = new Date()
  const metrics = await companyMetrics(session.companyId, now)
  const disputes = await disputesInReview(session.companyId, now)
```

par :

```tsx
  const now = new Date()
  const [metrics, disputes, coverage, [profile]] = await Promise.all([
    companyMetrics(session.companyId, now),
    disputesInReview(session.companyId, now),
    companyCoverage(session.companyId, now),
    db
      .select({ legalName: company.legalName, siret: company.siret })
      .from(company)
      .where(eq(company.id, session.companyId))
      .limit(1),
  ])

  // `/artisan/` et non `passportUrl()`, qui rend l'adresse `/p/` : ce detour
  // existe pour **compter** une consultation. L'artisan qui relit sa propre
  // fiche gonflerait la metrique qu'il est justement venu verifier.
  const publicUrl = coverage.isPublic
    ? `/artisan/${companySlug(profile.legalName, profile.siret)}`
    : null
```

- [ ] **Step 2 : Ajouter le bloc à l'écran**

Insérer, juste après la `Card` « Il n'est pas encore public » et avant `<DisputeList …>` :

```tsx
      <Card elevation="flat">
        <div className="flex flex-col gap-2" data-testid="fiche-publique">
          {publicUrl ? (
            <>
              <Text size="sm" tone="soft">
                Votre fiche est visible dans l’annuaire. Voici ce qu’un client y voit.
              </Text>
              <Link href={publicUrl} newTab testId="voir-fiche-publique">
                Voir ma fiche publique
              </Link>
            </>
          ) : (
            <>
              <Text size="sm" tone="soft">
                Aucune de vos activités n’est couverte : vous n’apparaissez pas encore dans
                l’annuaire.
              </Text>
              <Link href="/verification" testId="completer-verification">
                Voir ce qu’il manque
              </Link>
            </>
          )}
        </div>
      </Card>
```

`newTab` sur le lien sortant : ouvrir sa fiche ne doit pas faire perdre le passeport qu'on était en train de lire.

- [ ] **Step 3 : Vérifier les garde-fous**

```bash
pnpm check:size && pnpm check:isolation && pnpm check:ds && pnpm build
```

Attendu : SUCCÈS aux quatre. Le fichier passe d'environ 82 à environ 110 lignes, sous la limite de 250.

- [ ] **Step 4 : Commit**

```bash
git add "src/app/(app)/mon-passeport/page.tsx"
git commit -m "feat: du passeport a sa fiche publique, ou a ce qui manque"
```

---

## Task 5 : Le parcours prouve l'atteignabilité

**Files:**
- Modify: `tests/e2e/verification-journey.spec.ts:32-36`, `:99-102`

Un test de rendu prouve qu'un lien existe. Seul un parcours qui **navigue** prouve que l'écran est atteignable — et c'est la propriété dont l'absence a produit ce défaut.

- [ ] **Step 1 : Atteindre `/verification` par la navigation**

Remplacer l'étape `aucune activité n'est visible avant vérification` :

```typescript
  await test.step('aucune activité n’est visible avant vérification', async () => {
    await page.goto('/verification')
    await expect(page.getByTestId('statut-30')).toHaveText('Attestation manquante')
    await expect(page.getByTestId('statut-34')).toHaveText('Attestation manquante')
  })
```

par :

```typescript
  await test.step('la vérification s’atteint depuis la navigation', async () => {
    // Et non par `goto` : une URL en dur passerait meme si aucun ecran ne menait
    // ici — c'est exactement le defaut que cette navigation corrige.
    await page.goto('/devis')

    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    await nav.getByRole('link', { name: 'Vérification' }).click()

    await expect(page).toHaveURL(/\/verification$/)
    await expect(nav.getByRole('link', { name: 'Vérification' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await expect(page.getByTestId('statut-30')).toHaveText('Attestation manquante')
    await expect(page.getByTestId('statut-34')).toHaveText('Attestation manquante')
  })
```

- [ ] **Step 2 : Le backoffice n'hérite pas de la navigation**

Remplacer l'étape `le relecteur voit la file de supervision` :

```typescript
  await test.step('le relecteur voit la file de supervision', async () => {
    await reviewer.goto('/supervision')
    await expect(reviewer.getByRole('heading', { name: 'Supervision' })).toBeVisible()
  })
```

par :

```typescript
  await test.step('le relecteur voit la file de supervision, sans la nav artisan', async () => {
    await reviewer.goto('/supervision')
    await expect(reviewer.getByRole('heading', { name: 'Supervision' })).toBeVisible()

    // Le backoffice partage `AppShell`, donc l'en-tete. Les liens « Devis » ou
    // « Passeport » n'y ont rien a faire : ils menent a l'entreprise du
    // relecteur, pas a celle qu'il examine.
    await expect(
      reviewer.getByRole('navigation', { name: 'Navigation principale' }),
    ).toHaveCount(0)
  })
```

- [ ] **Step 3 : Le passeport mène à la fiche publique**

Insérer, juste après l'étape `la page publique n'affiche que ce qui est couvert` :

```typescript
  await test.step('le passeport mène à la fiche publique', async () => {
    // L'entreprise est couverte depuis l'etape precedente : le lien doit exister
    // et pointer vers `/artisan/`, jamais vers `/p/` qui compterait la visite.
    await page.goto('/mon-passeport')
    await expect(page.getByTestId('voir-fiche-publique')).toHaveAttribute(
      'href',
      `/artisan/${company.slug}`,
    )
  })
```

- [ ] **Step 4 : Lancer le parcours**

La pile Supabase locale du worktree doit tourner (`pnpm db:start`). Playwright démarre le serveur lui-même.

```bash
pnpm test:e2e verification-journey
```

Attendu : SUCCÈS — `1 passed`.

- [ ] **Step 5 : Commit**

```bash
git add tests/e2e/verification-journey.spec.ts
git commit -m "test: la verification s'atteint par la navigation, pas par une URL"
```

---

## Task 6 : La validation complète

**Files:** aucun — c'est une vérification.

- [ ] **Step 1 : Tout passer**

```bash
pnpm validate
```

Attendu : SUCCÈS à `check:env`, `check:size`, `check:ds`, `check:isolation`, `build`, puis `vitest run`.

- [ ] **Step 2 : Le parcours complet**

```bash
pnpm test:e2e
```

Attendu : tous les parcours passent. Les autres parcours (`quote-journey`, `invoice-journey`, `agenda-journey`) atteignent leurs écrans par `goto` et ne sont pas affectés par le changement d'en-tête.

- [ ] **Step 3 : Mettre la spec au statut validé**

Dans `docs/superpowers/specs/2026-08-09-navigation-artisan-design.md`, remplacer :

```markdown
> Spec de conception · Date : 2026-08-09 · Statut : à valider
```

par :

```markdown
> Spec de conception · Date : 2026-08-09 · Statut : implémentée
```

- [ ] **Step 4 : Commit**

```bash
git add docs/superpowers/specs/2026-08-09-navigation-artisan-design.md
git commit -m "docs: la navigation de l'artisan est implementee"
```

---

## Ce que ce plan ne fait pas

- **Aucun menu, aucun état client au-delà de `usePathname()`.** Pas de piège à focus, pas d'échappement à gérer.
- **Aucun `AdminShell`.** Le backoffice garde `AppShell` et perd seulement la navigation. Un gabarit distinct serait la correction propre ; il demande une seconde addition à l'inventaire pour trois écrans internes.
- **`/annuaire` reste sans lien depuis l'espace connecté**, par décision de la spec §2.1 et non par omission.
- **Aucune déconnexion dans l'en-tête.** Elle n'existe nulle part aujourd'hui ; l'ajouter ici serait un sujet distinct, avec sa propre action serveur.
