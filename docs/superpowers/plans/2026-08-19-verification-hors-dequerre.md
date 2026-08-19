# Vérification d'un artisan hors D'équerre — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un SIRET sans couverture publiée mène à une page qui constate l'absence de vérification, propose deux façons de réclamer l'attestation à l'artisan, et alimente un entonnoir de leads dans l'admin.

**Architecture:** Trois couches, comme le reste du dépôt. Le **domaine** (pur, testé sans base) porte les gardes de cadence, le calcul de l'entonnoir et le jeton d'opposition. Les **services** parlent à Postgres et aux trois API ouvertes déjà intégrées. L'**app** ajoute une route publique `/verification/[siret]` en `noindex`, un écran `/(admin)/leads`, et une passe quotidienne dans le cron existant qui fige l'attribution, envoie les mails de suite et anonymise à 30 jours.

**Tech Stack:** Next.js (App Router, server actions), Drizzle ORM sur Postgres/Supabase, nodemailer, Vitest, Playwright.

**Spec :** [2026-08-19-verification-hors-dequerre-design.md](../specs/2026-08-19-verification-hors-dequerre-design.md)

---

## Correction apportée à la spec

La spec § 6.1 liste quatre valeurs pour `outcome`, dont `unknown_siret`. **C'est une erreur** : le journal est écrit par `lookupCompany`, qui ne fait aucun appel réseau et ne peut donc pas savoir qu'un SIRET est absent des registres. « SIRET absent des registres » est un **état d'affichage de la page**, pas une issue de recherche.

`outcome` a donc trois valeurs : `covered`, `uncovered_member`, `stranger`. La tâche 1 corrige la spec dans le même commit que le schéma.

---

## Structure des fichiers

**Domaine — pur, aucun accès base**

| Fichier | Responsabilité |
|---|---|
| `src/domain/lead.ts` | Les types partagés : `LookupOutcome`, `LookupEntry`, `RequestChannel` |
| `src/domain/lead-guards.ts` | Le verdict d'une demande : plafonds, doublon, trêve artisan, opposition |
| `src/domain/lead-funnel.ts` | Le calcul de l'entonnoir à partir de lignes brutes |
| `src/domain/mail-optout.ts` | Jeton d'opposition signé (HMAC), sans stockage |
| `src/domain/siret.ts` | *(modifié)* `parseSiretInput` rend aussi le SIRET complet |

**Base**

| Fichier | Responsabilité |
|---|---|
| `src/db/schema/lead.ts` | `verification_lookup`, `attestation_request`, `mail_optout` |

**Services — base et réseau**

| Fichier | Responsabilité |
|---|---|
| `src/services/verification-lookup.ts` | Classer un SIRET (A/B/C), journaliser, purger à 12 mois |
| `src/services/verification-view.ts` | Ce que la page affiche : identité + alertes, tolérant aux pannes |
| `src/services/attestation-request.ts` | Créer une demande sous gardes ; relance manuelle |
| `src/services/lead-advance.ts` | La passe quotidienne : attribution, mails de suite, anonymisation |
| `src/services/lead-mail.ts` | Les cinq messages |
| `src/services/lead-metrics.ts` | Entonnoir et liste ouverte pour l'admin |
| `src/services/company-lookup.ts` | *(modifié)* `CompanyNotFound` distinct d'une panne |

**App**

| Fichier | Responsabilité |
|---|---|
| `src/actions/public.ts` | *(modifié)* aiguillage A/B/C + journalisation |
| `src/app/verification/[siret]/page.tsx` | La page, `noindex` |
| `src/app/verification/[siret]/Verdict.tsx` | Verdict, identité, alertes |
| `src/app/verification/[siret]/RequestForm.tsx` | « Demander pour moi » |
| `src/app/verification/[siret]/CopyMessage.tsx` | « Copier le message » |
| `src/app/verification/[siret]/actions.ts` | La server action de demande |
| `src/app/stop/page.tsx` | L'opposition, depuis le lien du mail |
| `src/app/(admin)/leads/page.tsx` | Entonnoir + liste |
| `src/app/(admin)/leads/Funnel.tsx` | Le bloc de chiffres |
| `src/app/(admin)/leads/RequestList.tsx` | La liste et le bouton de relance |
| `src/app/(admin)/leads/actions.ts` | La relance manuelle |
| `src/app/(admin)/leads/export/route.ts` | L'export CSV |
| `src/app/api/cron/echeances/route.ts` | *(modifié)* appelle la passe quotidienne |

**Aucun composant nouveau dans `src/ui/`.** L'inventaire du design system est fermé (`scripts/check-design-system.mjs`) : tout est construit avec `PageHeader`, `Card`, `Notice`, `EmptyState`, `DataTable`, `Field`, `Input`, `Checkbox`, `Button`, `Text`, `Heading`. Les composants d'écran sont colocalisés sous leur route, comme `ReviewForm.tsx` et `AnomalyList.tsx`.

**Rappel :** `pnpm check:size` refuse tout fichier de plus de 250 lignes.

> **Chaque fichier de test a ses propres SIRET, et n'assert jamais sur un
> total.** Vitest exécute les fichiers en parallèle sur une base partagée. Deux
> fichiers qui se partagent un SIRET se détruisent l'un l'autre — le `beforeAll`
> de l'un supprime puis réinsère l'entreprise que l'autre est en train de lire,
> et le cas B ressort `stranger` une fois sur deux. De même, compter les lignes
> de `verification_lookup` avant/après est un faux échec en attente : un autre
> fichier y écrit au même moment. Assertez toujours sur **vos** lignes, filtrées
> par **votre** SIRET. Les blocs de test ci-dessous donnent des constantes à
> titre indicatif : changez-les si un autre fichier les utilise déjà.
>
> **Les SIRET de test doivent passer la clé de Luhn.** `classifySiret` refuse
> désormais un SIRET invalide, et `isValidSiret` est stricte. Deux numéros de ce
> plan étaient faux et ont été corrigés en tâche 7 : les tests validaient un
> chemin qu'aucune saisie réelle n'aurait pu emprunter. Numéros vérifiés
> utilisables — inconnu du seed : `39315263200005`, inscrit sans couverture :
> `78462765400006`. Ceux du seed (`50769820700036` BD PLOMBERIE, `43897654300019`,
> `81234567800013`) sont valides mais **déjà en base, avec une couverture
> publiée** : ne pas les réutiliser pour un cas B ou C.
>
> **Avant d'écrire un fichier de test, vérifier qu'il n'existe pas.** Les blocs
> de code de ce plan sont donnés comme des contenus complets ; appliqués à un
> fichier existant, ils l'écrasent et emportent sa couverture sans qu'aucun test
> ne devienne rouge — la suite reste verte, avec moins de tests qu'avant. Le cas
> s'est produit en tâche 6. Les onze autres fichiers de tests du plan ont été
> vérifiés comme réellement absents.

---

## Task 1 : Le schéma et la migration

**Files:**
- Create: `src/db/schema/lead.ts`
- Create: `src/domain/lead.ts`
- Modify: `src/db/schema/index.ts`
- Modify: `docs/superpowers/specs/2026-08-19-verification-hors-dequerre-design.md`

- [ ] **Step 1 : Écrire les types partagés**

`src/domain/lead.ts` :

```ts
/**
 * Le vocabulaire des leads, partage par la base, les services et l'admin.
 *
 * `outcome` n'a PAS de valeur « SIRET inconnu des registres » : le journal est
 * ecrit par `lookupCompany`, qui ne fait aucun appel reseau. L'absence au
 * repertoire est un etat d'affichage de la page, jamais une issue de recherche.
 */
export type LookupOutcome = 'covered' | 'uncovered_member' | 'stranger'

/** La page d'ou part la recherche : les deux publics ne se comportent pas pareil. */
export type LookupEntry = 'pro' | 'demandeur'

/**
 * `sent` — nous envoyons le mail. `copied` — le demandeur transmet lui-meme,
 * et nous n'enregistrons alors que l'intention : aucun contact, aucun envoi.
 */
export type RequestChannel = 'sent' | 'copied'
```

- [ ] **Step 2 : Écrire le schéma**

`src/db/schema/lead.ts` :

```ts
import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { company } from './company'

/**
 * L'evenement de recherche, sans personne dedans.
 *
 * Ni IP, ni session, ni agent : ce qu'on ne collecte pas ne fuit pas. Le cas
 * `covered` est journalise lui aussi, sans quoi l'entonnoir n'a pas de
 * denominateur et on ne peut pas dire quelle part des recherches tombe a vide.
 */
export const verificationLookup = pgTable(
  'verification_lookup',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siret: text('siret').notNull(),
    outcome: text('outcome', {
      enum: ['covered', 'uncovered_member', 'stranger'],
    }).notNull(),
    entry: text('entry', { enum: ['pro', 'demandeur'] }).notNull(),
    lookedUpAt: timestamp('looked_up_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verification_lookup_at_idx').on(t.lookedUpAt)],
)

/**
 * La demande d'attestation adressee a un artisan.
 *
 * **Aucun statut stocke** : l'etat se recalcule a la lecture, comme la
 * visibilite et les metriques du passeport. Les colonnes datees ne sont pas des
 * etats mais des faits — `registered_at`, `deposited_at` et `covered_at` figent
 * une attribution AVANT l'anonymisation, les deux `*_notified_at` rendent les
 * envois idempotents.
 *
 * `siret` est nullable : a 30 jours il est efface avec les contacts. Chez un
 * entrepreneur individuel — la forme dominante du metier — il designe une
 * personne physique.
 */
export const attestationRequest = pgTable(
  'attestation_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siret: text('siret'),
    companyId: uuid('company_id').references(() => company.id),
    requesterName: text('requester_name'),
    /** **Toujours normalisee** — voir `normalizeEmail`. */
    requesterEmail: text('requester_email'),
    /** **Toujours normalisee** — voir `normalizeEmail`. */
    artisanEmail: text('artisan_email'),
    channel: text('channel', { enum: ['sent', 'copied'] }).notNull(),
    /** Le demandeur veut etre prevenu quand la couverture est publiee. Rien d'autre. */
    notify: boolean('notify').notNull().default(false),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    registeredAt: timestamp('registered_at', { withTimezone: true }),
    depositedAt: timestamp('deposited_at', { withTimezone: true }),
    coveredAt: timestamp('covered_at', { withTimezone: true }),
    coveredNotifiedAt: timestamp('covered_notified_at', { withTimezone: true }),
    expiryNotifiedAt: timestamp('expiry_notified_at', { withTimezone: true }),
    anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
  },
  (t) => [
    index('attestation_request_siret_idx').on(t.siret, t.requestedAt),
    index('attestation_request_artisan_idx').on(t.artisanEmail, t.requestedAt),
    index('attestation_request_requester_idx').on(t.requesterEmail, t.requestedAt),
    /**
     * Partiel : la passe de retention ne lit que les lignes encore non
     * anonymisees. Les indexer toutes ferait grossir l'index de tout ce qui est
     * deja purge — precisement ce que plus rien ne relira.
     */
    index('attestation_request_retention_idx')
      .on(t.requestedAt)
      .where(sql`anonymized_at is null`),
  ],
)

/**
 * Les adresses qui ont demande a ne plus rien recevoir.
 *
 * Sans elle, l'interet legitime ne tient pas : on ecrit a des artisans qui ne
 * nous ont rien demande. Elle survit a l'anonymisation des demandes — c'est
 * tout son interet.
 */
export const mailOptout = pgTable('mail_optout', {
  id: uuid('id').primaryKey().defaultRandom(),
  /**
   * **Toujours normalisee** — voir `normalizeEmail`. L'unicite Postgres est
   * sensible a la casse : sans cela `Jean@Exemple.fr` cohabiterait avec
   * `jean@exemple.fr` et l'opposition serait contournee au prochain envoi.
   */
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 3 : Brancher le schéma**

Ajouter à la fin de `src/db/schema/index.ts` :

```ts
export * from './lead'
```

- [ ] **Step 4 : Générer la migration**

Run: `pnpm db:generate`
Expected: un nouveau fichier `supabase/migrations/<horodatage>_*.sql` créant les trois tables.

- [ ] **Step 5 : Appliquer et vérifier**

Run: `pnpm db:reset`
Expected: la réinitialisation passe sans erreur SQL.

- [ ] **Step 6 : Corriger la spec**

Dans `docs/superpowers/specs/2026-08-19-verification-hors-dequerre-design.md`, § 6.1, remplacer la ligne :

```
- `outcome` ∈ `covered` | `uncovered_member` | `stranger` | `unknown_siret`
```

par :

```
- `outcome` ∈ `covered` | `uncovered_member` | `stranger` — « SIRET absent des
  registres » n'en fait pas partie : le journal est écrit par une action qui ne
  fait aucun appel réseau. C'est un état d'affichage de la page (§ 8).
```

Et, dans le tableau de la § 6.2, ajouter `deposited_at?` après `registered_at?`.

- [ ] **Step 7 : Commit**

```bash
git add src/db/schema/lead.ts src/db/schema/index.ts src/domain/lead.ts supabase/migrations docs/superpowers/specs/2026-08-19-verification-hors-dequerre-design.md
git commit -m "feat(lead): les trois tables du parcours de verification"
```

---

## Task 2 : `parseSiretInput` rend le SIRET complet

`lookupCompany` doit rediriger vers `/verification/[siret]`, or `parseSiretInput` ne rend aujourd'hui que le SIREN.

**Files:**
- Modify: `src/domain/siret.ts`
- Test: `tests/domain/siret.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter dans `tests/domain/siret.test.ts` :

```ts
describe('parseSiretInput rend aussi le SIRET', () => {
  it('rend les quatorze chiffres normalises', () => {
    const parsed = parseSiretInput('507 698 207 00036')
    expect(parsed).toEqual({ siren: '507698207', siret: '50769820700036' })
  })

  it('ne rend pas de SIRET quand la saisie est refusee', () => {
    const parsed = parseSiretInput('123')
    expect(parsed).not.toHaveProperty('siret')
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/domain/siret.test.ts -t "rend les quatorze"`
Expected: FAIL — l'objet reçu ne contient que `siren`.

- [ ] **Step 3 : Implémenter**

Dans `src/domain/siret.ts`, changer la signature et le retour final :

```ts
export function parseSiretInput(value: string): { siren: string; siret: string } | { error: string } {
```

```ts
  // Le SIRET complet accompagne le SIREN : la page de verification est
  // adressee par etablissement, la couverture se lit par entreprise.
  return { siren: digits.slice(0, 9), siret: digits }
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/siret.test.ts`
Expected: PASS, tous les cas d'erreur inchangés.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/siret.ts tests/domain/siret.test.ts
git commit -m "feat(siret): parseSiretInput rend aussi le numero complet"
```

---

## Task 3 : Les gardes de cadence

**Files:**
- Create: `src/domain/lead-guards.ts`
- Test: `tests/domain/lead-guards.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/domain/lead-guards.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { guardVerdict } from '@/domain/lead-guards'

const NOW = new Date('2026-08-19T12:00:00Z')
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const clear = { requesterRequests: [], coupleRequests: [], artisanMails: [], optedOut: false }

describe('guardVerdict', () => {
  it('laisse passer une premiere demande', () => {
    expect(guardVerdict({ now: NOW, ...clear })).toBe('ok')
  })

  it('refuse au-dela de trois demandes par heure et par demandeur', () => {
    const requesterRequests = [10, 20, 30].map((m) => new Date(NOW.getTime() - m * 60_000))
    expect(guardVerdict({ now: NOW, ...clear, requesterRequests })).toBe('requester_flooded')
  })

  it('refuse deux fois le meme couple en moins de vingt-quatre heures', () => {
    const coupleRequests = [new Date(NOW.getTime() - 2 * HOUR)]
    expect(guardVerdict({ now: NOW, ...clear, coupleRequests })).toBe('already_requested')
  })

  it('laisse repasser le meme couple apres vingt-quatre heures', () => {
    const coupleRequests = [new Date(NOW.getTime() - DAY - 1000)]
    expect(guardVerdict({ now: NOW, ...clear, coupleRequests })).toBe('ok')
  })

  it('protege l artisan d un second mail dans les sept jours, quel que soit le demandeur', () => {
    const artisanMails = [new Date(NOW.getTime() - 3 * DAY)]
    expect(guardVerdict({ now: NOW, ...clear, artisanMails })).toBe('artisan_cooldown')
  })

  it('respecte l opposition avant tout le reste', () => {
    expect(guardVerdict({ now: NOW, ...clear, optedOut: true })).toBe('opted_out')
  })

  it('nomme l opposition meme quand un autre plafond joue aussi', () => {
    // L'ordre compte : une adresse opposee ne doit jamais etre decrite comme
    // « trop de demandes », sinon on la recontactera au prochain creneau.
    const artisanMails = [new Date(NOW.getTime() - 1000)]
    expect(guardVerdict({ now: NOW, ...clear, artisanMails, optedOut: true })).toBe('opted_out')
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/domain/lead-guards.test.ts`
Expected: FAIL — `Cannot find module '@/domain/lead-guards'`.

- [ ] **Step 3 : Implémenter**

`src/domain/lead-guards.ts` :

```ts
import { isRateLimited } from './rate-limit'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/** Trois demandes par heure : la garde de nos serveurs. */
const REQUESTER_WINDOW = HOUR
const REQUESTER_MAX = 3

/** Une seule demande par couple et par jour : la garde du bon sens. */
const COUPLE_WINDOW = DAY
const COUPLE_MAX = 1

/**
 * Un seul mail par artisan tous les sept jours, tous demandeurs confondus.
 *
 * C'est la garde qui compte : sans elle, dix demandeurs d'un meme artisan
 * produisent dix mails, et nous aurions industrialise un harcelement.
 */
const ARTISAN_WINDOW = 7 * DAY
const ARTISAN_MAX = 1

export type GuardVerdict =
  | 'ok'
  | 'opted_out'
  | 'artisan_cooldown'
  | 'already_requested'
  | 'requester_flooded'

export interface GuardInput {
  now: Date
  /** Demandes de ce demandeur, toutes entreprises confondues. */
  requesterRequests: Date[]
  /** Demandes de ce demandeur sur CE SIRET. */
  coupleRequests: Date[]
  /** Mails deja partis vers cette adresse d'artisan. */
  artisanMails: Date[]
  optedOut: boolean
}

/**
 * Le verdict d'une demande, sans rien connaitre de la base.
 *
 * **L'ordre des controles est le message** : l'opposition passe avant tout, et
 * la protection de l'artisan avant celle de nos serveurs. Un refus mal nomme se
 * traduirait par une reprise de contact au prochain creneau.
 */
export function guardVerdict(input: GuardInput): GuardVerdict {
  if (input.optedOut) return 'opted_out'

  if (isRateLimited(input.artisanMails, input.now, ARTISAN_WINDOW, ARTISAN_MAX)) {
    return 'artisan_cooldown'
  }
  if (isRateLimited(input.coupleRequests, input.now, COUPLE_WINDOW, COUPLE_MAX)) {
    return 'already_requested'
  }
  if (isRateLimited(input.requesterRequests, input.now, REQUESTER_WINDOW, REQUESTER_MAX)) {
    return 'requester_flooded'
  }
  return 'ok'
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/lead-guards.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/lead-guards.ts tests/domain/lead-guards.test.ts
git commit -m "feat(lead): les gardes de cadence d une demande d attestation"
```

---

## Task 4 : Le calcul de l'entonnoir

**Files:**
- Create: `src/domain/lead-funnel.ts`
- Test: `tests/domain/lead-funnel.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/domain/lead-funnel.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { funnel } from '@/domain/lead-funnel'

const AT = new Date('2026-08-19T12:00:00Z')

describe('funnel', () => {
  it('rend un entonnoir vide sans rien casser', () => {
    expect(funnel({ lookups: [], requests: [] })).toEqual({
      lookups: 0,
      uncovered: 0,
      requests: 0,
      sent: 0,
      copied: 0,
      registered: 0,
      deposited: 0,
      covered: 0,
    })
  })

  it('compte les recherches sans couverture, cas B et cas C confondus', () => {
    const result = funnel({
      lookups: [
        { outcome: 'covered' },
        { outcome: 'uncovered_member' },
        { outcome: 'stranger' },
        { outcome: 'stranger' },
      ],
      requests: [],
    })
    expect(result.lookups).toBe(4)
    expect(result.uncovered).toBe(3)
  })

  it('separe les deux canaux de demande', () => {
    const result = funnel({
      lookups: [],
      requests: [
        { channel: 'sent', registeredAt: null, depositedAt: null, coveredAt: null },
        { channel: 'copied', registeredAt: null, depositedAt: null, coveredAt: null },
        { channel: 'copied', registeredAt: null, depositedAt: null, coveredAt: null },
      ],
    })
    expect(result.requests).toBe(3)
    expect(result.sent).toBe(1)
    expect(result.copied).toBe(2)
  })

  it('compte les jalons d attribution sur les dates figees', () => {
    const result = funnel({
      lookups: [],
      requests: [
        { channel: 'sent', registeredAt: AT, depositedAt: AT, coveredAt: AT },
        { channel: 'sent', registeredAt: AT, depositedAt: AT, coveredAt: null },
        { channel: 'sent', registeredAt: AT, depositedAt: null, coveredAt: null },
        { channel: 'copied', registeredAt: null, depositedAt: null, coveredAt: null },
      ],
    })
    expect(result.registered).toBe(3)
    expect(result.deposited).toBe(2)
    expect(result.covered).toBe(1)
  })

  it('rend le meme resultat avant et apres anonymisation des demandes', () => {
    // La purge a 30 jours retire le SIRET et les contacts, jamais les dates.
    // Le test attrape la faute de celui qui croirait qu'une ligne purgee n'a
    // plus de sens et la filtrerait : l'entonnoir compterait alors de moins en
    // moins a mesure que le passe s'efface.
    const before = [
      { channel: 'sent' as const, registeredAt: AT, depositedAt: AT, coveredAt: null,
        siret: '73282932000074', contactEmail: 'artisan@exemple.fr' },
    ]
    // `after` OMET les champs plutot que de les mettre a null : deux objets de
    // meme forme ne se distinguent que par leurs valeurs, et le test serait
    // alors aveugle a une implementation qui compte les clefs.
    const after = before.map(({ channel, registeredAt, depositedAt, coveredAt }) => ({
      channel,
      registeredAt,
      depositedAt,
      coveredAt,
    }))

    expect(funnel({ lookups: [], requests: before })).toEqual(
      funnel({ lookups: [], requests: after }),
    )
  })
})
```

> **Ce cinquième test n'est pas décoratif.** Deux fautes plausibles le font
> échouer, et lui seul : filtrer les lignes purgées (`requests: rows.filter(r =>
> r.siret != null).length`), et compter par nombre de clés. Les quatre autres
> tests les laissent passer.

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/domain/lead-funnel.test.ts`
Expected: FAIL — `Cannot find module '@/domain/lead-funnel'`.

- [ ] **Step 3 : Implémenter**

`src/domain/lead-funnel.ts` :

```ts
import type { LookupOutcome, RequestChannel } from './lead'

export interface FunnelInput {
  lookups: { outcome: LookupOutcome }[]
  requests: {
    channel: RequestChannel
    registeredAt: Date | null
    depositedAt: Date | null
    coveredAt: Date | null
  }[]
}

export interface Funnel {
  lookups: number
  uncovered: number
  requests: number
  sent: number
  copied: number
  registered: number
  deposited: number
  covered: number
}

/**
 * L'entonnoir, calcule sur des lignes brutes.
 *
 * Il ne compte que des dates et des canaux — jamais un SIRET, jamais une
 * adresse. C'est ce qui le rend insensible a l'anonymisation a 30 jours : une
 * ligne videe de ses contacts continue de compter pour ce qu'elle a produit.
 *
 * Le taux qui compte n'est pas le dernier mais `uncovered -> requests` : il dit
 * si la page convainc. Les suivants mesurent le circuit de revue.
 */
export function funnel(input: FunnelInput): Funnel {
  const count = <T>(rows: T[], keep: (row: T) => boolean) => rows.filter(keep).length

  return {
    lookups: input.lookups.length,
    uncovered: count(input.lookups, (l) => l.outcome !== 'covered'),
    requests: input.requests.length,
    sent: count(input.requests, (r) => r.channel === 'sent'),
    copied: count(input.requests, (r) => r.channel === 'copied'),
    registered: count(input.requests, (r) => r.registeredAt !== null),
    deposited: count(input.requests, (r) => r.depositedAt !== null),
    covered: count(input.requests, (r) => r.coveredAt !== null),
  }
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/lead-funnel.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/lead-funnel.ts tests/domain/lead-funnel.test.ts
git commit -m "feat(lead): le calcul de l entonnoir"
```

---

## Task 5 : Le jeton d'opposition

Le lien « je ne souhaite pas être contacté » doit survivre à l'anonymisation de la demande : il ne peut donc pas s'appuyer sur une ligne en base. Un HMAC de l'adresse suffit.

**Files:**
- Create: `src/domain/mail-optout.ts`
- Modify: `.env.example`
- Test: `tests/domain/mail-optout.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/domain/mail-optout.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { optoutToken, verifyOptout } from '@/domain/mail-optout'

const SECRET = 'secret-de-test'

describe('jeton d opposition', () => {
  it('reconnait son propre jeton', () => {
    const token = optoutToken('artisan@exemple.fr', SECRET)
    expect(verifyOptout('artisan@exemple.fr', token, SECRET)).toBe(true)
  })

  it('refuse un jeton forge', () => {
    expect(verifyOptout('artisan@exemple.fr', 'nimportequoi', SECRET)).toBe(false)
  })

  it('refuse le jeton d une autre adresse', () => {
    const token = optoutToken('autre@exemple.fr', SECRET)
    expect(verifyOptout('artisan@exemple.fr', token, SECRET)).toBe(false)
  })

  it('ignore la casse et les espaces de l adresse', () => {
    // L'adresse revient par une URL : elle peut avoir ete recopiee autrement.
    const token = optoutToken('artisan@exemple.fr', SECRET)
    expect(verifyOptout('  Artisan@Exemple.FR ', token, SECRET)).toBe(true)
  })

  it('refuse un jeton de la bonne longueur mais faux', () => {
    const token = optoutToken('artisan@exemple.fr', SECRET)
    const forged = token.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))
    expect(verifyOptout('artisan@exemple.fr', forged, SECRET)).toBe(false)
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/domain/mail-optout.test.ts`
Expected: FAIL — `Cannot find module '@/domain/mail-optout'`.

- [ ] **Step 3 : Implémenter**

`src/domain/mail-optout.ts` :

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Le jeton du lien « je ne souhaite plus etre contacte ».
 *
 * Signe plutot que stocke : la demande qui a declenche le mail est anonymisee a
 * 30 jours, un jeton range dans cette ligne mourrait avec elle — et le lien
 * d'un vieux mail cesserait de fonctionner, ce qui reviendrait a retirer le
 * droit d'opposition avec le temps.
 *
 * L'adresse est normalisee avant signature : elle revient par une URL, ou elle
 * a pu etre recopiee dans une autre casse.
 *
 * Cette normalisation est locale plutot que reprise de `normalizeEmail` :
 * celle-ci LEVE sur une adresse vide, ce qui est juste a l'inscription mais
 * faux ici — le parametre vient d'une URL, ou il peut manquer, et un lien
 * tronque doit donner « lien invalide », pas une page en erreur.
 */
function normalize(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * **Un secret vide rend le jeton forgeable par n'importe qui** : HMAC accepte
 * une clef vide, et l'algorithme est public. Une variable d'environnement
 * absente en production donnerait des liens qui ont l'air de marcher et que
 * n'importe qui peut recalculer — de quoi desabonner en masse un fichier
 * d'adresses qui sont, par nature, publiques.
 *
 * Les deux fonctions reagissent donc differemment a la meme cause : signer sans
 * secret est une panne de configuration, qui doit s'entendre a l'envoi ;
 * verifier sans secret doit rester une page « lien invalide ».
 */
export function optoutToken(email: string, secret: string): string {
  if (!secret) throw new Error('MAIL_OPTOUT_SECRET manquant')
  return createHmac('sha256', secret).update(normalize(email)).digest('hex')
}

export function verifyOptout(
  email: string | undefined,
  token: string | undefined,
  secret: string,
): boolean {
  // Les trois absences donnent « lien invalide », jamais une page en erreur :
  // `searchParams` rend `undefined` — et non la chaine vide — pour un parametre
  // absent d'une URL tronquee.
  if (!secret || !email || !token) return false

  const expected = Buffer.from(optoutToken(email, secret))
  // Minuscules : un jeton hexadecimal recopie en majuscules est le meme jeton.
  const given = Buffer.from(token.trim().toLowerCase())

  // Comparaison a temps constant : une comparaison naive laisse deviner le
  // jeton octet par octet. Le garde de longueur est indispensable —
  // `timingSafeEqual` LEVE sur deux tailles differentes, ce qui transformerait
  // un lien tronque en erreur 500. Il ne fuit rien : la longueur d'un
  // HMAC-SHA256 en hexadecimal est publique et constante.
  if (expected.length !== given.length) return false
  return timingSafeEqual(expected, given)
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/mail-optout.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5 : Déclarer la variable d'environnement**

Ajouter à `.env.example`, après le bloc `SMS_CODE_SALT` :

```
# Secret de signature des liens d'opposition (« je ne souhaite plus etre
# contacte »). Change de valeur = tous les liens deja envoyes cessent de
# fonctionner : ne le tourner qu'en connaissance de cause.
MAIL_OPTOUT_SECRET=
```

Puis renseigner une valeur quelconque dans `.env.local` et `.env.test`.

- [ ] **Step 6 : Commit**

```bash
git add src/domain/mail-optout.ts tests/domain/mail-optout.test.ts .env.example
git commit -m "feat(lead): jeton signe pour le lien d opposition"
```

---

## Task 6 : Distinguer « introuvable » d'une panne

`verificationView` doit afficher deux choses différentes selon qu'une entreprise n'existe pas ou que le service ne répond pas. `findEstablishment` lève aujourd'hui des `Error` que rien ne distingue sinon leur message.

**Files:**
- Modify: `src/services/company-lookup.ts`
- Test: `tests/services/company-lookup.test.ts` — **ce fichier existe déjà** et
  couvre le mapping société / entrepreneur individuel, les paramètres d'URL et
  l'établissement fermé. Les cas ci-dessous s'y **fusionnent**, en enrichissant
  les tests existants d'assertions `instanceof` ; ils ne le remplacent pas.

- [ ] **Step 1 : Écrire le test qui échoue**

Enrichir `tests/services/company-lookup.test.ts`. Trois de ses tests existants
(`rejette une reponse dont le SIRET ne correspond pas`, `signale une entreprise
introuvable`, `signale une panne de l API`) passent de `rejects.toThrow('…')` à
une assertion de type, en gardant l'assertion de message :

```ts
import { describe, expect, it, vi, afterEach } from 'vitest'
import { findEstablishment, CompanyNotFound } from '@/services/company-lookup'

const SIRET = '50769820700036'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('findEstablishment', () => {
  it('leve CompanyNotFound quand aucun etablissement ne correspond', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) }),
    )
    await expect(findEstablishment(SIRET)).rejects.toBeInstanceOf(CompanyNotFound)
  })

  it('ne leve PAS CompanyNotFound quand le service est en panne', async () => {
    // La distinction porte tout l'affichage : « cette entreprise n'existe pas »
    // et « nous n'avons pas pu verifier » ne disent pas la meme chose au
    // demandeur, et l'une des deux serait un mensonge.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    const error = await findEstablishment(SIRET).catch((e) => e)
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(CompanyNotFound)
  })

  it('leve avant tout appel reseau sur un SIRET invalide', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(findEstablishment('123')).rejects.toThrow('SIRET invalide')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/services/company-lookup.test.ts`
Expected: FAIL — `CompanyNotFound` n'est pas exporté.

- [ ] **Step 3 : Implémenter**

Dans `src/services/company-lookup.ts`, ajouter après les constantes :

```ts
/**
 * L'entreprise n'existe pas au repertoire — a distinguer d'une panne.
 *
 * Les deux cas menaient au meme `Error`, et l'appelant ne pouvait les separer
 * qu'en lisant un message. Or ils ne disent pas la meme chose au demandeur :
 * « aucune entreprise a ce numero » est un constat, « nous n'avons pas pu
 * verifier » est un aveu. Les confondre en fait un mensonge dans un sens ou
 * dans l'autre.
 */
export class CompanyNotFound extends Error {
  constructor() {
    super('Entreprise introuvable')
    this.name = 'CompanyNotFound'
  }
}
```

Puis remplacer la levée existante :

```ts
  if (!result || !establishment) throw new CompanyNotFound()
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/services/company-lookup.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5 : Vérifier que rien n'a régressé**

Run: `pnpm vitest run tests/services`
Expected: PASS. `runLegalChecks` attrape déjà toute exception : son comportement est inchangé.

- [ ] **Step 6 : Commit**

```bash
git add src/services/company-lookup.ts tests/services/company-lookup.test.ts
git commit -m "feat(lookup): CompanyNotFound distinct d une panne de service"
```

---

## Task 7 : Classer un SIRET et journaliser la recherche

**Files:**
- Create: `src/services/verification-lookup.ts`
- Test: `tests/services/verification-lookup.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/services/verification-lookup.test.ts` :

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { company, verificationLookup } from '@/db/schema'
import { classifySiret, recordLookup, purgeLookups } from '@/services/verification-lookup'

const MEMBER = randomUUID()
const MEMBER_SIRET = '50769820700036'
const STRANGER_SIRET = '39315263200005'

beforeAll(async () => {
  await db.insert(company).values({
    id: MEMBER,
    siret: MEMBER_SIRET,
    legalName: 'INSCRIT SANS COUVERTURE',
  })
})

afterAll(async () => {
  await connection.end()
})

describe('classifySiret', () => {
  it('reconnait un inscrit sans activite couverte', async () => {
    const result = await classifySiret(MEMBER_SIRET, new Date())
    expect(result).toEqual({ outcome: 'uncovered_member', slug: null })
  })

  it('reconnait un inconnu', async () => {
    const result = await classifySiret(STRANGER_SIRET, new Date())
    expect(result).toEqual({ outcome: 'stranger', slug: null })
  })
})

describe('recordLookup', () => {
  it('ecrit une ligne sans rien de personnel au-dela du SIRET', async () => {
    const now = new Date()
    await recordLookup({ siret: STRANGER_SIRET, outcome: 'stranger', entry: 'demandeur' }, now)

    const [row] = await db
      .select()
      .from(verificationLookup)
      .where(eq(verificationLookup.siret, STRANGER_SIRET))

    expect(row.outcome).toBe('stranger')
    expect(row.entry).toBe('demandeur')
    expect(Object.keys(row)).toEqual(['id', 'siret', 'outcome', 'entry', 'lookedUpAt'])
  })
})

describe('purgeLookups', () => {
  it('efface au-dela de douze mois et garde le reste', async () => {
    const now = new Date('2026-08-19T12:00:00Z')
    const old = new Date('2025-01-01T00:00:00Z')

    await db.insert(verificationLookup).values({
      siret: '11111111111111',
      outcome: 'covered',
      entry: 'pro',
      lookedUpAt: old,
    })
    await db.insert(verificationLookup).values({
      siret: '22222222222222',
      outcome: 'covered',
      entry: 'pro',
      lookedUpAt: new Date(now.getTime() - 86_400_000),
    })

    await purgeLookups(now)

    const remaining = await db.select({ siret: verificationLookup.siret }).from(verificationLookup)
    const sirets = remaining.map((r) => r.siret)
    expect(sirets).not.toContain('11111111111111')
    expect(sirets).toContain('22222222222222')
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/services/verification-lookup.test.ts`
Expected: FAIL — `Cannot find module '@/services/verification-lookup'`.

- [ ] **Step 3 : Implémenter**

`src/services/verification-lookup.ts` :

```ts
import { like, lt } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, verificationLookup } from '@/db/schema'
import type { LookupEntry, LookupOutcome } from '@/domain/lead'
import { publicProfile } from '@/services/public-profile'

/** Douze mois : au-dela, un compteur de recherches ne sert plus a rien. */
const RETENTION_MS = 365 * 24 * 60 * 60 * 1000

export interface Classification {
  outcome: LookupOutcome
  /** Le passeport a servir, quand il existe. `null` dans tous les autres cas. */
  slug: string | null
}

/**
 * Le cas d'un SIRET : couvert, inscrit sans couverture, ou inconnu.
 *
 * **Les cas B et C ne different que pour le serveur.** La distinction ne sert
 * qu'a choisir le corps du mail envoye a l'artisan : rien de ce que voit le
 * demandeur ne doit permettre de les separer, sans quoi le formulaire redevient
 * un test d'appartenance a D'equerre.
 */
export async function classifySiret(siret: string, now: Date): Promise<Classification> {
  const siren = siret.slice(0, 9)

  const profile = await publicProfile(siren, now)
  if (profile) return { outcome: 'covered', slug: profile.slug }

  const [known] = await db
    .select({ id: company.id })
    .from(company)
    .where(like(company.siret, `${siren}%`))
    .limit(1)

  return { outcome: known ? 'uncovered_member' : 'stranger', slug: null }
}

/**
 * Journalise une recherche.
 *
 * Ecrit depuis l'ACTION, jamais depuis la page : une page qui ecrit au rendu
 * compterait les prechargements, les robots et les rechargements, et
 * `/verification/[siret]` est partageable donc revisitee. On mesure des
 * recherches humaines, pas des affichages.
 */
export async function recordLookup(
  input: { siret: string; outcome: LookupOutcome; entry: LookupEntry },
  now: Date,
): Promise<void> {
  await db.insert(verificationLookup).values({ ...input, lookedUpAt: now })
}

/** Purge des recherches de plus de douze mois. Appelee par le cron quotidien. */
export async function purgeLookups(now: Date): Promise<void> {
  await db
    .delete(verificationLookup)
    .where(lt(verificationLookup.lookedUpAt, new Date(now.getTime() - RETENTION_MS)))
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm db:reset && pnpm vitest run tests/services/verification-lookup.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/services/verification-lookup.ts tests/services/verification-lookup.test.ts
git commit -m "feat(lead): classement d un SIRET et journal des recherches"
```

---

## Task 8 : L'aiguillage de `lookupCompany`

**Files:**
- Modify: `src/actions/public.ts`
- Modify: `src/ui/organisms/siret-lookup.tsx`
- Modify: `src/app/_landing/verifier/hero.tsx`, `src/app/_landing/pro/passport.tsx` *(passage de la prop `entry`)*
- Test: `tests/services/lookup-routing.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/services/lookup-routing.test.ts` :

```ts
import { describe, it, expect, afterAll } from 'vitest'
import { db, connection } from '@/db/client'
import { verificationLookup } from '@/db/schema'
import { lookupCompany } from '@/actions/public'

const STRANGER_SIRET = '39315263200005'

afterAll(async () => {
  await connection.end()
})

function form(siret: string, entry: string): FormData {
  const data = new FormData()
  data.set('siret', siret)
  data.set('entry', entry)
  return data
}

describe('lookupCompany', () => {
  it('refuse un SIRET mal forme sans rien journaliser', async () => {
    const before = await db.select().from(verificationLookup)
    const state = await lookupCompany({}, form('123', 'demandeur'))

    expect(state.error).toContain('incomplet')
    const after = await db.select().from(verificationLookup)
    expect(after).toHaveLength(before.length)
  })

  it('redirige un inconnu vers la page de verification et journalise', async () => {
    // `redirect` leve : c'est le mecanisme normal de Next, pas une panne.
    const thrown = await lookupCompany({}, form(STRANGER_SIRET, 'demandeur')).catch((e) => e)
    expect(String(thrown.digest ?? thrown)).toContain(`/verification/${STRANGER_SIRET}`)

    const rows = await db.select().from(verificationLookup)
    const mine = rows.filter((r) => r.siret === STRANGER_SIRET)
    expect(mine.at(-1)?.outcome).toBe('stranger')
    expect(mine.at(-1)?.entry).toBe('demandeur')
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/services/lookup-routing.test.ts`
Expected: FAIL — la redirection vise encore `/artisan/...` ou l'action renvoie une erreur.

- [ ] **Step 3 : Implémenter l'action**

Dans `src/actions/public.ts`, remplacer entièrement `lookupCompany` et son bloc de documentation :

```ts
/**
 * Redirige vers ce qu'on sait dire d'une entreprise.
 *
 * **Un inscrit sans activite couverte et un inconnu recoivent la meme page.**
 * L'indistinction etait acquise par le `null` de `publicProfile` ; elle est
 * desormais acquise par une redirection commune. Elle n'a pas change de nature,
 * seulement de branche — et il ne faut surtout pas l'affiner, sinon le
 * formulaire devient un test d'appartenance a D'equerre.
 */
export async function lookupCompany(
  _state: LookupState,
  form: FormData,
): Promise<LookupState> {
  const parsed = parseSiretInput(String(form.get('siret') ?? ''))
  if ('error' in parsed) return { error: parsed.error }

  const entry: LookupEntry = form.get('entry') === 'pro' ? 'pro' : 'demandeur'
  const now = new Date()

  const { outcome, slug } = await classifySiret(parsed.siret, now)
  await recordLookup({ siret: parsed.siret, outcome, entry }, now)

  // `redirect` leve : jamais dans un try/catch.
  redirect(outcome === 'covered' && slug ? `/artisan/${slug}` : `/verification/${parsed.siret}`)
}
```

Et remplacer les imports de tête :

```ts
import { redirect } from 'next/navigation'
import { parseSiretInput } from '@/domain/siret'
import type { LookupEntry } from '@/domain/lead'
import { classifySiret, recordLookup } from '@/services/verification-lookup'
import { resendQuoteLinks } from '@/services/quote-link'
```

`publicProfile` n'est plus importé ici : `classifySiret` s'en charge.

- [ ] **Step 4 : Transmettre la page d'origine**

Dans `src/ui/organisms/siret-lookup.tsx`, ajouter la prop et le champ caché :

```tsx
export function SiretLookup({
  tone = 'primary',
  entry,
  label,
  cta,
  hint,
}: {
  tone?: 'primary' | 'conversion'
  /** La page d'ou part la recherche : les deux publics ne se comportent pas pareil. */
  entry: 'pro' | 'demandeur'
  label: string
  cta: string
  hint: string
}) {
```

et, juste après l'ouverture du `<form>` :

```tsx
      <input type="hidden" name="entry" value={entry} />
```

- [ ] **Step 5 : Renseigner la prop aux deux appels**

Run: `grep -rn "<SiretLookup" src/`
**Il n'y a qu'un seul appel**, contrairement à ce que ce plan supposait :
`src/app/_landing/verifier/hero.tsx` → `entry="demandeur"`. La page pro porte un
lien vers l'inscription, pas un champ SIRET.

> **Conséquence à connaître pour la tâche 17.** `entry` ne prend donc
> aujourd'hui qu'une seule valeur : `demandeur`. La colonne reste — elle ne coûte
> rien et le jour où un champ SIRET apparaît côté pro, la mesure existe — mais
> **l'écran admin ne doit pas afficher de répartition par origine**, qui serait
> invariablement « 100 % demandeur » et se lirait comme une information alors
> qu'elle n'en est pas une.

- [ ] **Step 6 : Lancer les tests**

Run: `pnpm db:reset && pnpm vitest run tests/services/lookup-routing.test.ts`
Expected: PASS, 2 tests.

Run: `pnpm build`
Expected: build vert — la prop `entry` est obligatoire, un appel oublié échoue ici.

- [ ] **Step 7 : Commit**

```bash
git add src/actions/public.ts src/ui/organisms/siret-lookup.tsx src/app/_landing tests/services/lookup-routing.test.ts
git commit -m "feat(verification): tout SIRET valide mene desormais a une reponse"
```

---

## Task 9 : Ce que la page a à montrer

**Files:**
- Create: `src/services/verification-view.ts`
- Test: `tests/services/verification-view.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/services/verification-view.test.ts` :

```ts
import { describe, it, expect, vi, afterEach, afterAll } from 'vitest'
import { connection } from '@/db/client'
import { verificationView } from '@/services/verification-view'

const SIRET = '50769820700036'
const NOW = new Date('2026-08-19T12:00:00Z')

const ESTABLISHMENT = {
  results: [
    {
      nom_complet: 'MAISON DUPONT',
      nature_juridique: '5499',
      date_creation: '2015-04-01',
      matching_etablissements: [
        {
          siret: SIRET,
          adresse: '3 RUE DES LILAS 69003 LYON',
          code_postal: '69003',
          libelle_commune: 'LYON',
          etat_administratif: 'A',
          liste_rge: null,
        },
      ],
    },
  ],
}

function stubFetch(handler: (url: string) => unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = handler(String(url))
      if (body === null) return { ok: false, status: 503 }
      return { ok: true, json: async () => body }
    }),
  )
}

afterEach(() => vi.unstubAllGlobals())
afterAll(async () => connection.end())

describe('verificationView', () => {
  it('rend l identite et aucune alerte quand tout va bien', async () => {
    stubFetch((url) => (url.includes('bodacc') ? { results: [] } : ESTABLISHMENT))

    const view = await verificationView(SIRET, NOW)

    expect(view.identity).toMatchObject({ legalName: 'MAISON DUPONT', city: 'LYON' })
    expect(view.alerts).toEqual([])
    expect(view.registryUnavailable).toBe(false)
    expect(view.unknownSiret).toBe(false)
  })

  it('distingue une entreprise absente du repertoire d une panne', async () => {
    stubFetch((url) => (url.includes('bodacc') ? { results: [] } : { results: [] }))

    const view = await verificationView(SIRET, NOW)

    expect(view.unknownSiret).toBe(true)
    expect(view.registryUnavailable).toBe(false)
  })

  it('signale une panne du repertoire sans inventer une identite', async () => {
    stubFetch((url) => (url.includes('bodacc') ? { results: [] } : null))

    const view = await verificationView(SIRET, NOW)

    expect(view.registryUnavailable).toBe(true)
    expect(view.unknownSiret).toBe(false)
    expect(view.identity).toBeNull()
  })

  it('remonte la cessation d activite en alerte', async () => {
    const closed = structuredClone(ESTABLISHMENT)
    closed.results[0].matching_etablissements[0].etat_administratif = 'F'
    stubFetch((url) => (url.includes('bodacc') ? { results: [] } : closed))

    const view = await verificationView(SIRET, NOW)

    expect(view.alerts).toHaveLength(1)
    expect(view.alerts[0].kind).toBe('closed')
  })

  it('remonte une procedure collective', async () => {
    stubFetch((url) =>
      url.includes('bodacc')
        ? { results: [{ familleavis: 'collective' }, { familleavis: 'conciliation' }] }
        : ESTABLISHMENT,
    )

    const view = await verificationView(SIRET, NOW)

    const kinds = view.alerts.map((a) => a.kind)
    expect(kinds).toContain('proceeding')
    expect(view.alerts).toHaveLength(1)
  })

  it('ne produit aucune alerte pour une conciliation seule', async () => {
    // Le test precedent ne discrimine PAS : le code ne pousse qu'une alerte
    // quel que soit le nombre d'avis retenus, donc la conciliation surnumeraire
    // n'y change rien et `!== 'neutral'` passerait. Seule la conciliation
    // isolee defend la distinction — une demarche volontaire de prevention,
    // que traiter comme une liquidation punirait le bon comportement.
    stubFetch((url) =>
      url.includes('bodacc') ? { results: [{ familleavis: 'conciliation' }] } : ESTABLISHMENT,
    )

    const view = await verificationView(SIRET, NOW)

    expect(view.alerts).toEqual([])
    expect(view.alertsUnavailable).toBe(false)
  })

  it('n affiche AUCUNE alerte quand le BODACC ne repond pas, et le dit', async () => {
    // Une liste vide se lirait « aucune procedure » : ce serait blanchir une
    // entreprise en liquidation parce qu'une API n'a pas repondu.
    stubFetch((url) => (url.includes('bodacc') ? null : ESTABLISHMENT))

    const view = await verificationView(SIRET, NOW)

    expect(view.alerts).toEqual([])
    expect(view.alertsUnavailable).toBe(true)
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/services/verification-view.test.ts`
Expected: FAIL — `Cannot find module '@/services/verification-view'`.

- [ ] **Step 3 : Implémenter**

`src/services/verification-view.ts` :

```ts
import { classifyNotice } from '@/domain/bodacc'
import { sirenFromSiret } from '@/domain/vat-number'
import { CompanyNotFound, findEstablishment } from '@/services/company-lookup'
import { fetchCollectiveProceedings } from '@/services/legal-checks'

export interface VerificationIdentity {
  legalName: string
  legalFormLabel: string | null
  city: string
  foundedOn: Date | null
}

export interface VerificationAlert {
  kind: 'closed' | 'proceeding'
  label: string
}

export interface VerificationView {
  siret: string
  /** `null` si le repertoire n'a pas repondu, ou si le SIRET n'y figure pas. */
  identity: VerificationIdentity | null
  unknownSiret: boolean
  registryUnavailable: boolean
  alerts: VerificationAlert[]
  alertsUnavailable: boolean
}

/**
 * Ce que la page de verification a le droit de montrer.
 *
 * **Aucun signal positif n'en sort** : ni RGE, ni « etablissement actif », ni
 * score. La page ne peut qu'identifier ou alerter, jamais rassurer — trois
 * coches vertes suivies d'un silence sur la decennale reproduiraient exactement
 * le piege que `/verifier` denonce.
 *
 * Les deux sources sont interrogees en parallele et echouent separement : le
 * verdict de couverture vient de notre base, donc la page reste servable meme
 * si tout l'open data tombe.
 */
export async function verificationView(siret: string, _now: Date): Promise<VerificationView> {
  const [establishment, proceedings] = await Promise.allSettled([
    findEstablishment(siret),
    fetchCollectiveProceedings(sirenFromSiret(siret)),
  ])

  const view: VerificationView = {
    siret,
    identity: null,
    unknownSiret: false,
    registryUnavailable: false,
    alerts: [],
    alertsUnavailable: false,
  }

  if (establishment.status === 'fulfilled') {
    const found = establishment.value
    view.identity = {
      legalName: found.legalName,
      legalFormLabel: found.legalFormLabel,
      city: found.city,
      foundedOn: found.foundedOn,
    }
    if (!found.active) {
      view.alerts.push({ kind: 'closed', label: 'Établissement cessé au répertoire' })
    }
  } else if (establishment.reason instanceof CompanyNotFound) {
    view.unknownSiret = true
  } else {
    view.registryUnavailable = true
  }

  if (proceedings.status === 'fulfilled') {
    // Une conciliation est une demarche volontaire de prevention : la traiter
    // comme une liquidation punirait exactement le bon comportement.
    const blocking = proceedings.value.filter((f) => classifyNotice(f) === 'blocking')
    if (blocking.length > 0) {
      view.alerts.push({
        kind: 'proceeding',
        label: 'Procédure collective publiée au BODACC',
      })
    }
  } else {
    // Surtout pas de liste vide : elle se lirait « aucune procedure ».
    view.alertsUnavailable = true
  }

  return view
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/services/verification-view.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/services/verification-view.ts tests/services/verification-view.test.ts
git commit -m "feat(verification): identite et alertes, sans aucun signal positif"
```

---

## Task 10 : Les messages

**Files:**
- Create: `src/services/lead-mail.ts`
- Test: `tests/services/lead-mail.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/services/lead-mail.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sent: { to: string; subject: string; text: string }[] = []

vi.mock('@/services/email', () => ({
  sendRawMail: async (input: { to: string; subject: string; text: string }) => {
    sent.push(input)
  },
}))

const { sendAttestationRequest, sendRequestConfirmation, sendCoveragePublished, sendNoAnswer } =
  await import('@/services/lead-mail')

beforeEach(() => {
  sent.length = 0
})

describe('mail a l artisan', () => {
  const base = {
    to: 'artisan@exemple.fr',
    requesterName: 'Claire',
    requesterEmail: 'claire@exemple.fr',
    pageUrl: 'https://d.test/verification/50769820700036',
    signupUrl: 'https://d.test/inscription?siret=50769820700036',
    optoutUrl: 'https://d.test/stop?e=x&s=y',
  }

  it('nomme le demandeur dans l objet', async () => {
    await sendAttestationRequest({ ...base, member: false, qualification: null })
    expect(sent[0].subject).toBe('Claire vous demande votre attestation décennale')
  })

  it('porte toujours le lien d opposition', async () => {
    await sendAttestationRequest({ ...base, member: false, qualification: null })
    expect(sent[0].text).toContain(base.optoutUrl)
  })

  it('accroche sur le RGE quand on en connait un', async () => {
    await sendAttestationRequest({
      ...base,
      member: false,
      qualification: 'Qualibat, remplacement de chaudière gaz/fioul, valide jusqu’au 7 mars 2028',
    })
    expect(sent[0].text).toContain('Qualibat')
  })

  it('ne parle pas d inscription a quelqu un de deja inscrit', async () => {
    await sendAttestationRequest({ ...base, member: true, qualification: null })
    expect(sent[0].text).not.toContain(base.signupUrl)
  })

  it('mene a l inscription quand l artisan n est pas connu', async () => {
    await sendAttestationRequest({ ...base, member: false, qualification: null })
    expect(sent[0].text).toContain(base.signupUrl)
  })
})

describe('mails au demandeur', () => {
  it('confirme l envoi avec le lien de la page', async () => {
    await sendRequestConfirmation({
      to: 'claire@exemple.fr',
      requesterName: 'Claire',
      pageUrl: 'https://d.test/verification/50769820700036',
    })
    expect(sent[0].text).toContain('https://d.test/verification/50769820700036')
  })

  it('annonce la couverture publiee avec le lien du passeport', async () => {
    await sendCoveragePublished({
      to: 'claire@exemple.fr',
      requesterName: 'Claire',
      companyName: 'MAISON DUPONT',
      passportUrl: 'https://d.test/artisan/maison-dupont',
    })
    expect(sent[0].subject).toContain('MAISON DUPONT')
    expect(sent[0].text).toContain('https://d.test/artisan/maison-dupont')
  })

  it('explique quoi faire quand rien n est arrive', async () => {
    await sendNoAnswer({ to: 'claire@exemple.fr', requesterName: 'Claire' })
    expect(sent[0].text).toContain('attestation')
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/services/lead-mail.test.ts`
Expected: FAIL — `Cannot find module '@/services/lead-mail'`.

- [ ] **Step 3 : Implémenter**

`src/services/lead-mail.ts` :

```ts
import { sendRawMail } from './email'

/**
 * Les messages du parcours de verification.
 *
 * Le demandeur et l'artisan comptent autant, et ne lisent jamais le meme texte.
 * Le detail RGE vit ICI, dans le mail a l'artisan, ou il prouve qu'on connait
 * son metier — et pas sur la page du demandeur, ou il rassurerait a tort.
 */
export async function sendAttestationRequest(input: {
  to: string
  requesterName: string
  requesterEmail: string
  pageUrl: string
  signupUrl: string
  optoutUrl: string
  /** L'artisan a deja un compte : on ne lui propose pas de s'inscrire. */
  member: boolean
  /** Une qualification RGE deja connue, en une ligne. `null` s'il n'y en a pas. */
  qualification: string | null
}): Promise<void> {
  await sendRawMail({
    to: input.to,
    subject: `${input.requesterName} vous demande votre attestation décennale`,
    text: [
      'Bonjour,',
      '',
      `${input.requesterName} (${input.requesterEmail}) envisage de vous confier des travaux`,
      'et cherche à vérifier votre garantie décennale.',
      '',
      `Voici ce qu’il ou elle a vu : ${input.pageUrl}`,
      ...(input.qualification
        ? ['', `Nous savons déjà que vous êtes RGE — ${input.qualification}.`, 'Il ne manque que votre décennale.']
        : []),
      '',
      input.member
        ? 'Déposez votre attestation depuis votre espace : elle sera vérifiée, et votre client prévenu.'
        : `Déposez-la ici, c’est gratuit : ${input.signupUrl}`,
      '',
      `Ne plus recevoir ce type de message : ${input.optoutUrl}`,
    ].join('\n'),
  })
}

/**
 * La confirmation d'envoi.
 *
 * Elle porte le lien de la page plutot qu'un simple accuse : c'est le seul
 * moyen pour le demandeur de retrouver ce qu'il a lu, une fois l'onglet ferme.
 */
export async function sendRequestConfirmation(input: {
  to: string
  requesterName: string
  pageUrl: string
}): Promise<void> {
  await sendRawMail({
    to: input.to,
    subject: 'Votre demande d’attestation est partie',
    text: [
      `Bonjour ${input.requesterName},`,
      '',
      'Nous avons transmis votre demande à l’entreprise.',
      '',
      `Ce que vous avez consulté : ${input.pageUrl}`,
      '',
      'Sans réponse de sa part sous trente jours, nous vous le dirons et nous',
      'effacerons cette demande.',
    ].join('\n'),
  })
}

/** La suite promise au demandeur : ce qui est couvert, et par quoi. */
export async function sendCoveragePublished(input: {
  to: string
  requesterName: string
  companyName: string
  passportUrl: string
}): Promise<void> {
  await sendRawMail({
    to: input.to,
    subject: `L’attestation de ${input.companyName} est vérifiée`,
    text: [
      `Bonjour ${input.requesterName},`,
      '',
      `${input.companyName} a déposé son attestation, et nous l’avons vérifiée.`,
      '',
      `Voir ce qui est couvert, activité par activité : ${input.passportUrl}`,
      '',
      'Une garantie décennale ne couvre que les activités qu’elle nomme :',
      'vérifiez que les vôtres y figurent.',
    ].join('\n'),
  })
}

/**
 * Trente jours sans reponse.
 *
 * On ne relance pas l'artisan — on rend au demandeur les moyens de se
 * debrouiller sans nous. C'est le dernier message, et la demande est effacee
 * dans la foulee.
 */
export async function sendNoAnswer(input: {
  to: string
  requesterName: string
}): Promise<void> {
  await sendRawMail({
    to: input.to,
    subject: 'Toujours pas d’attestation — voici quoi faire',
    text: [
      `Bonjour ${input.requesterName},`,
      '',
      'Nous n’avons rien reçu depuis votre demande.',
      '',
      'Demandez l’attestation directement à l’entreprise, et vérifiez trois choses :',
      '— la période de validité couvre la date de signature du devis ;',
      '— les activités nommées correspondent à vos travaux ;',
      '— le nom et le SIRET sur l’attestation sont bien les siens.',
      '',
      'Nous n’en gardons plus trace : cette demande vient d’être effacée.',
    ].join('\n'),
  })
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/services/lead-mail.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/services/lead-mail.ts tests/services/lead-mail.test.ts
git commit -m "feat(lead): les cinq messages du parcours"
```

---

## Task 11 : Créer une demande, sous gardes

**Files:**
- Create: `src/services/attestation-request.ts`
- Test: `tests/services/attestation-request.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/services/attestation-request.test.ts` :

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { db, connection } from '@/db/client'
import { attestationRequest, mailOptout, verificationLookup } from '@/db/schema'
import { createRequest } from '@/services/attestation-request'

const sent: { to: string }[] = []
vi.mock('@/services/lead-mail', () => ({
  sendAttestationRequest: async (input: { to: string }) => {
    sent.push(input)
  },
  sendRequestConfirmation: async () => {},
}))
vi.mock('@/services/rge-lookup', () => ({ fetchRgeRows: async () => [] }))

const SIRET = '50769820700036'
const NOW = new Date('2026-08-19T12:00:00Z')

const base = {
  siret: SIRET,
  requesterName: 'Claire',
  requesterEmail: 'claire@exemple.fr',
  artisanEmail: 'artisan@exemple.fr',
  notify: true,
}

beforeEach(async () => {
  sent.length = 0
  await db.delete(attestationRequest)
  await db.delete(mailOptout)
  await db.delete(verificationLookup)
})

afterAll(async () => connection.end())

describe('createRequest, canal envoye', () => {
  it('enregistre la demande et envoie un mail', async () => {
    const result = await createRequest({ ...base, channel: 'sent' }, NOW)

    expect(result).toBe('ok')
    expect(sent).toHaveLength(1)
    const [row] = await db.select().from(attestationRequest)
    expect(row.channel).toBe('sent')
    expect(row.notify).toBe(true)
  })

  it('refuse un doublon dans les vingt-quatre heures, sans second mail', async () => {
    await createRequest({ ...base, channel: 'sent' }, NOW)
    const again = await createRequest(
      { ...base, channel: 'sent' },
      new Date(NOW.getTime() + 3_600_000),
    )

    expect(again).toBe('already_requested')
    expect(sent).toHaveLength(1)
  })

  it('protege l artisan d un second demandeur dans les sept jours', async () => {
    await createRequest({ ...base, channel: 'sent' }, NOW)
    const other = await createRequest(
      { ...base, channel: 'sent', requesterEmail: 'paul@exemple.fr', requesterName: 'Paul' },
      new Date(NOW.getTime() + 2 * 86_400_000),
    )

    expect(other).toBe('artisan_cooldown')
    expect(sent).toHaveLength(1)
  })

  it('respecte une opposition', async () => {
    await db.insert(mailOptout).values({ email: 'artisan@exemple.fr' })
    const result = await createRequest({ ...base, channel: 'sent' }, NOW)

    expect(result).toBe('opted_out')
    expect(sent).toHaveLength(0)
  })
})

describe('createRequest, canal copie', () => {
  it('n enregistre aucun contact et n envoie rien', async () => {
    const result = await createRequest(
      { siret: SIRET, channel: 'copied', notify: false },
      NOW,
    )

    expect(result).toBe('ok')
    expect(sent).toHaveLength(0)

    const [row] = await db.select().from(attestationRequest)
    expect(row.channel).toBe('copied')
    expect(row.requesterEmail).toBeNull()
    expect(row.artisanEmail).toBeNull()
    expect(row.notify).toBe(false)
  })

  it('ne compte jamais dans la treve de l artisan', async () => {
    // Une intention de copie n'a envoye aucun mail : elle ne doit pas
    // consommer le credit de sept jours d'un artisan.
    await createRequest({ siret: SIRET, channel: 'copied', notify: false }, NOW)
    const result = await createRequest({ ...base, channel: 'sent' }, NOW)

    expect(result).toBe('ok')
    expect(sent).toHaveLength(1)
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/services/attestation-request.test.ts`
Expected: FAIL — `Cannot find module '@/services/attestation-request'`.

- [ ] **Step 3 : Implémenter**

`src/services/attestation-request.ts` :

```ts
import { and, eq, gt, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { attestationRequest, mailOptout } from '@/db/schema'
import { guardVerdict, type GuardVerdict } from '@/domain/lead-guards'
import { optoutToken } from '@/domain/mail-optout'
import { activeQualifications } from '@/domain/rge'
import { normalizeEmail } from '@/domain/requester'
import type { RequestChannel } from '@/domain/lead'
import { classifySiret } from '@/services/verification-lookup'
import { fetchRgeRows } from '@/services/rge-lookup'
import { sendAttestationRequest, sendRequestConfirmation } from '@/services/lead-mail'
import { recordEvent } from '@/services/events'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

export interface RequestInput {
  siret: string
  channel: RequestChannel
  notify: boolean
  requesterName?: string
  requesterEmail?: string
  artisanEmail?: string
}

/**
 * Enregistre une demande d'attestation, si les gardes le permettent.
 *
 * En canal `copied`, **aucun contact n'est enregistre et aucun mail ne part** :
 * seule l'intention compte, et elle ne consomme pas la treve de sept jours de
 * l'artisan puisqu'elle ne lui envoie rien.
 *
 * Le verdict est rendu tel quel a l'appelant, qui decide quoi en dire. On ne
 * distingue jamais, dans le message affiche, un refus d'un envoi reussi lorsque
 * cela reviendrait a reveler qu'un autre demandeur est passe avant.
 */
export async function createRequest(input: RequestInput, now: Date): Promise<GuardVerdict> {
  if (input.channel === 'copied') {
    await db.insert(attestationRequest).values({
      siret: input.siret,
      channel: 'copied',
      notify: false,
      requestedAt: now,
    })
    return 'ok'
  }

  // `normalizeEmail` plutot qu'un `toLowerCase` local : c'est l'invariant que
  // le schema annonce sur ces deux colonnes, et il n'existe qu'a un endroit.
  const requesterEmail = normalizeEmail(input.requesterEmail ?? '')
  const artisanEmail = normalizeEmail(input.artisanEmail ?? '')

  const [opposed] = await db
    .select({ id: mailOptout.id })
    .from(mailOptout)
    .where(eq(sql`lower(${mailOptout.email})`, artisanEmail))
    .limit(1)

  // Seuls les envois reels consomment la treve de l'artisan : `artisan_email`
  // n'est renseigne qu'en canal `sent`, jamais par une intention de copie.
  const artisanMails = await db
    .select({ at: attestationRequest.requestedAt })
    .from(attestationRequest)
    .where(
      and(
        eq(sql`lower(${attestationRequest.artisanEmail})`, artisanEmail),
        gt(attestationRequest.requestedAt, new Date(now.getTime() - WEEK_MS)),
      ),
    )

  const coupleRequests = await db
    .select({ at: attestationRequest.requestedAt })
    .from(attestationRequest)
    .where(
      and(
        eq(attestationRequest.siret, input.siret),
        eq(sql`lower(${attestationRequest.requesterEmail})`, requesterEmail),
        gt(attestationRequest.requestedAt, new Date(now.getTime() - DAY_MS)),
      ),
    )

  const requesterRequests = await db
    .select({ at: attestationRequest.requestedAt })
    .from(attestationRequest)
    .where(
      and(
        eq(sql`lower(${attestationRequest.requesterEmail})`, requesterEmail),
        gt(attestationRequest.requestedAt, new Date(now.getTime() - HOUR_MS)),
      ),
    )

  const verdict = guardVerdict({
    now,
    optedOut: Boolean(opposed),
    artisanMails: artisanMails.map((r) => r.at),
    coupleRequests: coupleRequests.map((r) => r.at),
    requesterRequests: requesterRequests.map((r) => r.at),
  })

  if (verdict !== 'ok') return verdict

  const { outcome } = await classifySiret(input.siret, now)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const [row] = await db
    .insert(attestationRequest)
    .values({
      siret: input.siret,
      channel: 'sent',
      notify: input.notify,
      requesterName: input.requesterName ?? null,
      requesterEmail,
      artisanEmail,
      requestedAt: now,
    })
    .returning({ id: attestationRequest.id })

  await sendAttestationRequest({
    to: artisanEmail,
    requesterName: input.requesterName ?? 'Un client',
    requesterEmail,
    pageUrl: `${base}/verification/${input.siret}`,
    signupUrl: `${base}/inscription?siret=${input.siret}`,
    optoutUrl: `${base}/stop?e=${encodeURIComponent(artisanEmail)}&s=${optoutToken(artisanEmail, process.env.MAIL_OPTOUT_SECRET ?? '')}`,
    member: outcome !== 'stranger',
    qualification: await firstQualification(input.siret, now),
  })

  // La confirmation au demandeur ne doit jamais faire echouer la demande : le
  // mail a l'artisan, lui, est deja parti.
  try {
    await sendRequestConfirmation({
      to: requesterEmail,
      requesterName: input.requesterName ?? 'Bonjour',
      pageUrl: `${base}/verification/${input.siret}`,
    })
  } catch {
    // Panne SMTP en aval : la demande reste enregistree.
  }

  await recordEvent({
    type: 'lead.requested',
    subjectType: 'attestation_request',
    subjectId: row.id,
    actorType: 'customer',
  })

  return 'ok'
}

/** Une qualification RGE en cours, en une ligne — l'accroche du mail artisan. */
async function firstQualification(siret: string, now: Date): Promise<string | null> {
  try {
    const active = activeQualifications(await fetchRgeRows(siret), now)
    const first = active[0]
    if (!first) return null
    return `${first.organisme}, ${first.label}`
  } catch {
    // L'ADEME est indisponible : le mail part sans son accroche.
    return null
  }
}
```

> **Note d'implémentation.** `activeQualifications` et la forme exacte de `Qualification` viennent de `src/domain/rge.ts`. Lire ce fichier avant d'écrire `firstQualification` et ajuster les noms de champs (`organisme`, `label`) à ce qu'il expose réellement ; le test de la tâche 10 ne dépend que de la chaîne produite.

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm db:reset && pnpm vitest run tests/services/attestation-request.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/services/attestation-request.ts tests/services/attestation-request.test.ts
git commit -m "feat(lead): creation d une demande d attestation sous gardes"
```

---

## Task 12 : La passe quotidienne

**Files:**
- Create: `src/services/lead-advance.ts`
- Modify: `src/app/api/cron/echeances/route.ts`
- Test: `tests/services/lead-advance.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/services/lead-advance.test.ts` :

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, connection } from '@/db/client'
import { attestationRequest, company } from '@/db/schema'
import { advanceRequests } from '@/services/lead-advance'

const covered: string[] = []
const noAnswer: string[] = []

vi.mock('@/services/lead-mail', () => ({
  sendCoveragePublished: async (i: { to: string }) => {
    covered.push(i.to)
  },
  sendNoAnswer: async (i: { to: string }) => {
    noAnswer.push(i.to)
  },
}))

const SIRET = '50769820700036'
const NOW = new Date('2026-08-19T12:00:00Z')

beforeEach(async () => {
  covered.length = 0
  noAnswer.length = 0
  await db.delete(attestationRequest)
  await db.delete(company)
})

afterAll(async () => connection.end())

async function openRequest(requestedAt: Date, notify = true) {
  const [row] = await db
    .insert(attestationRequest)
    .values({
      siret: SIRET,
      channel: 'sent',
      notify,
      requesterName: 'Claire',
      requesterEmail: 'claire@exemple.fr',
      artisanEmail: 'artisan@exemple.fr',
      requestedAt,
    })
    .returning({ id: attestationRequest.id })
  return row.id
}

describe('advanceRequests', () => {
  it('fige l inscription des que l entreprise existe', async () => {
    const id = await openRequest(new Date(NOW.getTime() - 86_400_000))
    await db.insert(company).values({ id: randomUUID(), siret: SIRET, legalName: 'MAISON DUPONT' })

    await advanceRequests(NOW)

    const [row] = await db.select().from(attestationRequest)
    expect(row.id).toBe(id)
    expect(row.registeredAt).not.toBeNull()
  })

  it('n envoie le mail de couverture qu une fois', async () => {
    await openRequest(new Date(NOW.getTime() - 86_400_000))
    await db.insert(company).values({ id: randomUUID(), siret: SIRET, legalName: 'MAISON DUPONT' })

    await advanceRequests(NOW)
    await advanceRequests(new Date(NOW.getTime() + 3_600_000))

    // Sans couverture publiee, aucun mail ; avec, un seul. Les deux passes ne
    // doivent jamais produire deux envois.
    expect(covered.length).toBeLessThanOrEqual(1)
  })

  it('envoie le message des trente jours puis anonymise', async () => {
    await openRequest(new Date(NOW.getTime() - 31 * 86_400_000))

    await advanceRequests(NOW)

    expect(noAnswer).toEqual(['claire@exemple.fr'])
    const [row] = await db.select().from(attestationRequest)
    expect(row.requesterEmail).toBeNull()
    expect(row.artisanEmail).toBeNull()
    expect(row.requesterName).toBeNull()
    expect(row.siret).toBeNull()
    expect(row.anonymizedAt).not.toBeNull()
  })

  it('garde les dates apres anonymisation', async () => {
    await openRequest(new Date(NOW.getTime() - 31 * 86_400_000))
    await advanceRequests(NOW)

    const [row] = await db.select().from(attestationRequest)
    expect(row.requestedAt).not.toBeNull()
    expect(row.channel).toBe('sent')
  })

  it('ne retraite jamais une demande deja anonymisee', async () => {
    await openRequest(new Date(NOW.getTime() - 31 * 86_400_000))
    await advanceRequests(NOW)
    await advanceRequests(new Date(NOW.getTime() + 86_400_000))

    expect(noAnswer).toHaveLength(1)
  })

  it('n ecrit a personne quand la case n etait pas cochee', async () => {
    await openRequest(new Date(NOW.getTime() - 31 * 86_400_000), false)
    await advanceRequests(NOW)

    expect(noAnswer).toHaveLength(0)
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/services/lead-advance.test.ts`
Expected: FAIL — `Cannot find module '@/services/lead-advance'`.

- [ ] **Step 3 : Implémenter**

`src/services/lead-advance.ts` :

```ts
import { and, eq, isNull, like } from 'drizzle-orm'
import { db } from '@/db/client'
import { attestationRequest, company, insuranceCertificate } from '@/db/schema'
import { companySlug } from '@/domain/slug'
import { publicProfile } from '@/services/public-profile'
import { sendCoveragePublished, sendNoAnswer } from '@/services/lead-mail'
import { recordEvent } from '@/services/events'

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/**
 * La passe quotidienne des demandes ouvertes.
 *
 * **L'attribution se fige ici, tant que le SIRET est encore la.** L'anonymisation
 * a 30 jours efface le SIRET : rattacher une inscription apres coup deviendrait
 * impossible. Les jalons sont donc poses au fil de l'eau, et l'entonnoir compte
 * ensuite des dates — ce qui le rend insensible a l'effacement.
 *
 * Rien ici ne modifie une visibilite : la passe ne fait qu'estampiller,
 * prevenir, et effacer.
 */
export async function advanceRequests(now: Date): Promise<void> {
  const open = await db
    .select()
    .from(attestationRequest)
    .where(isNull(attestationRequest.anonymizedAt))

  for (const request of open) {
    if (!request.siret) continue

    const siren = request.siret.slice(0, 9)

    const [known] = await db
      .select({ id: company.id, legalName: company.legalName, siret: company.siret })
      .from(company)
      .where(like(company.siret, `${siren}%`))
      .limit(1)

    const patch: Partial<typeof attestationRequest.$inferInsert> = {}

    if (known && !request.registeredAt) {
      patch.registeredAt = now
      patch.companyId = known.id
      await recordEvent({
        type: 'lead.registered',
        subjectType: 'attestation_request',
        subjectId: request.id,
        companyId: known.id,
        actorType: 'system',
      })
    }

    if (known && !request.depositedAt) {
      const [deposit] = await db
        .select({ id: insuranceCertificate.id })
        .from(insuranceCertificate)
        .where(eq(insuranceCertificate.companyId, known.id))
        .limit(1)
      if (deposit) patch.depositedAt = now
    }

    const profile = known ? await publicProfile(siren, now) : null

    if (profile && !request.coveredAt) {
      patch.coveredAt = now
      await recordEvent({
        type: 'lead.covered',
        subjectType: 'attestation_request',
        subjectId: request.id,
        companyId: known?.id,
        actorType: 'system',
      })
    }

    // Le mail de suite, une seule fois — c'est `coveredNotifiedAt` qui le tient.
    if (profile && request.notify && request.requesterEmail && !request.coveredNotifiedAt) {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
      await sendCoveragePublished({
        to: request.requesterEmail,
        requesterName: request.requesterName ?? 'Bonjour',
        companyName: known!.legalName,
        passportUrl: `${base}/artisan/${companySlug(known!.legalName, known!.siret)}`,
      })
      patch.coveredNotifiedAt = now
      // Les contacts ne servent plus a rien : on anonymise du meme geste.
      Object.assign(patch, anonymized(now))
    }

    const expired = now.getTime() - request.requestedAt.getTime() >= MAX_AGE_MS

    if (expired && !patch.anonymizedAt) {
      if (request.notify && request.requesterEmail && !request.expiryNotifiedAt) {
        await sendNoAnswer({
          to: request.requesterEmail,
          requesterName: request.requesterName ?? 'Bonjour',
        })
        patch.expiryNotifiedAt = now
      }
      Object.assign(patch, anonymized(now))
    }

    if (Object.keys(patch).length > 0) {
      await db
        .update(attestationRequest)
        .set(patch)
        .where(eq(attestationRequest.id, request.id))
    }
  }
}

/**
 * Ce que l'anonymisation efface : les contacts ET le SIRET.
 *
 * Chez un entrepreneur individuel — la forme dominante du metier — le SIRET
 * designe une personne physique. Les dates et le canal survivent : la ligne
 * devient un compteur pur, et l'entonnoir donne le meme chiffre qu'avant.
 */
function anonymized(now: Date) {
  return {
    siret: null,
    requesterName: null,
    requesterEmail: null,
    artisanEmail: null,
    anonymizedAt: now,
  }
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm db:reset && pnpm vitest run tests/services/lead-advance.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5 : Brancher sur le cron**

Dans `src/app/api/cron/echeances/route.ts`, ajouter aux imports :

```ts
import { advanceRequests } from '@/services/lead-advance'
import { purgeLookups } from '@/services/verification-lookup'
```

et, juste avant le `return` de la fonction `GET` :

```ts
  // Les leads : attribution figee tant que le SIRET est la, mails de suite,
  // anonymisation a 30 jours, purge des recherches a 12 mois.
  await advanceRequests(now)
  await purgeLookups(now)
```

- [ ] **Step 6 : Vérifier le build**

Run: `pnpm build`
Expected: build vert.

- [ ] **Step 7 : Commit**

```bash
git add src/services/lead-advance.ts "src/app/api/cron/echeances/route.ts" tests/services/lead-advance.test.ts
git commit -m "feat(lead): passe quotidienne d attribution et d anonymisation"
```

---

## Task 13 : La page publique

**Files:**
- Create: `src/app/verification/[siret]/page.tsx`
- Create: `src/app/verification/[siret]/Verdict.tsx`
- Test: `tests/services/verification-indistinction.test.ts`

- [ ] **Step 1 : Écrire le test de l'invariant**

`tests/services/verification-indistinction.test.ts` :

```ts
import { describe, it, expect, vi, afterEach, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, connection } from '@/db/client'
import { company } from '@/db/schema'
import { verificationView } from '@/services/verification-view'

const MEMBER_SIRET = '50769820700036'
const STRANGER_SIRET = '39315263200005'

function stub(siret: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        String(url).includes('bodacc')
          ? { results: [] }
          : {
              results: [
                {
                  nom_complet: 'MAISON DUPONT',
                  nature_juridique: '5499',
                  date_creation: '2015-04-01',
                  matching_etablissements: [
                    {
                      siret,
                      adresse: '3 RUE DES LILAS 69003 LYON',
                      code_postal: '69003',
                      libelle_commune: 'LYON',
                      etat_administratif: 'A',
                      liste_rge: null,
                    },
                  ],
                },
              ],
            },
    })),
  )
}

afterEach(() => vi.unstubAllGlobals())
afterAll(async () => connection.end())

describe('l invariant d indistinction', () => {
  it('rend exactement la meme vue pour un inscrit sans couverture et pour un inconnu', async () => {
    // C'est LE test du parcours. S'il echoue parce que quelqu'un a ajoute une
    // phrase plus douce pour les inscrits, ce n'est pas le test qu'il faut
    // corriger : le formulaire vient de redevenir un test d'appartenance.
    await db.insert(company).values({
      id: randomUUID(),
      siret: MEMBER_SIRET,
      legalName: 'INSCRIT SANS COUVERTURE',
    })

    stub(MEMBER_SIRET)
    const member = await verificationView(MEMBER_SIRET, new Date())

    stub(STRANGER_SIRET)
    const stranger = await verificationView(STRANGER_SIRET, new Date())

    expect({ ...member, siret: '' }).toEqual({ ...stranger, siret: '' })
  })
})
```

- [ ] **Step 2 : Lancer le test**

Run: `pnpm db:reset && pnpm vitest run tests/services/verification-indistinction.test.ts`
Expected: PASS — `verificationView` ne consulte jamais `company`, donc l'invariant tient déjà. Le test le **verrouille** pour l'avenir.

- [ ] **Step 3 : Écrire le bloc d'affichage**

`src/app/verification/[siret]/Verdict.tsx` :

```tsx
import { Notice } from '@/ui/molecules/notice'
import { Card } from '@/ui/molecules/card'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { DateText } from '@/ui/atoms/date-text'
import type { VerificationView } from '@/services/verification-view'

/**
 * Le constat d'une absence, et rien d'autre.
 *
 * **Aucune coche verte nulle part** : ni « etablissement actif », ni RGE, ni
 * score. La page ne peut qu'identifier ou alerter, jamais rassurer. Toute
 * proposition d'y ajouter un signal positif est une regression, pas un
 * enrichissement — trois coches vertes suivies d'un silence sur la decennale
 * reproduiraient le piege que `/verifier` denonce.
 *
 * Aucune phrase ne mentionne l'appartenance a D'equerre, dans un sens ou dans
 * l'autre : un inscrit sans couverture et un inconnu lisent le meme ecran.
 */
export function Verdict({ view }: { view: VerificationView }) {
  return (
    <div className="flex flex-col gap-6">
      {view.alerts.map((alert) => (
        <Notice key={alert.kind} tone="danger" title={alert.label}>
          Ce signalement provient des registres publics. Il précède tout le reste.
        </Notice>
      ))}

      <Card>
        <Heading level={1} size="lg">
          Nous ne pouvons rien affirmer sur l’assurance de cette entreprise.
        </Heading>
        <Text>
          Aucune attestation vérifiée ne nous a été transmise. Une garantie décennale ne figure
          dans aucun registre public : seule l’attestation de l’assureur la nomme, activité par
          activité.
        </Text>
      </Card>

      {view.unknownSiret && (
        <Notice tone="warning" title="Aucune entreprise à ce numéro">
          Ce SIRET ne figure pas au répertoire des entreprises. Vérifiez les chiffres.
        </Notice>
      )}

      {view.registryUnavailable && (
        <Notice tone="warning" title="Registres momentanément indisponibles">
          Nous n’avons pas pu identifier l’entreprise. Réessayez dans un moment.
        </Notice>
      )}

      {view.identity && (
        <Card>
          <Heading level={2} size="sm">
            {view.identity.legalName}
          </Heading>
          <Text tone="muted" size="sm">
            {[view.identity.legalFormLabel, view.identity.city].filter(Boolean).join(' · ')}
          </Text>
          {view.identity.foundedOn && (
            <Text tone="muted" size="sm">
              Créée le <DateText value={view.identity.foundedOn} />
            </Text>
          )}
        </Card>
      )}

      <Text tone="muted" size="sm">
        L’absence d’alerte ne signifie pas que tout va bien. Nous n’affichons que ce que les
        registres signalent.
      </Text>
    </div>
  )
}
```

> **Note d'implémentation.** Vérifier les props réelles de `Notice`, `Card`, `Heading`, `Text` et `DateText` avant d'écrire ce fichier (`sed -n 1,40p src/ui/molecules/notice.tsx`, etc.) et ajuster `tone` / `level` / `size` aux valeurs qu'ils acceptent. Aucun composant nouveau ne doit être créé dans `src/ui/` : l'inventaire du design system est fermé.

- [ ] **Step 4 : Écrire la page**

`src/app/verification/[siret]/page.tsx` :

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidSiret } from '@/domain/siret'
import { verificationView } from '@/services/verification-view'
import { PublicShell } from '@/ui/shells/public-shell'
import { Verdict } from './Verdict'

/**
 * **Jamais indexee.** Publier une fiche non sollicitee sur un tiers, c'est le
 * modele societe.com : une AIPD a rouvrir, et une contradiction frontale avec un
 * produit dont l'argument est la confiance. L'URL porte le SIRET et non un slug
 * nominatif, pour la meme raison.
 */
export const metadata: Metadata = {
  title: 'Vérification — D’équerre',
  robots: { index: false, follow: false },
}

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ siret: string }>
}) {
  const { siret } = await params
  if (!isValidSiret(siret)) notFound()

  const view = await verificationView(siret, new Date())

  return (
    <PublicShell>
      <Verdict view={view} />
    </PublicShell>
  )
}
```

- [ ] **Step 5 : Interdire la route aux robots**

Run: `ls src/app/robots.ts src/app/robots.txt 2>/dev/null`

Si un `robots.ts` existe, y ajouter `disallow: ['/verification/']`. Sinon, créer `src/app/robots.ts` :

```ts
import type { MetadataRoute } from 'next'

/**
 * Le `noindex` de la page suffit a Google, mais pas a un robot qui ne lit que
 * ce fichier. Les deux disent la meme chose, et c'est voulu.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/verification/', '/stop'] },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/sitemap.xml`,
  }
}
```

- [ ] **Step 6 : Vérifier**

Run: `pnpm build && pnpm check:size && pnpm check:ds && pnpm check:isolation`
Expected: tout vert.

- [ ] **Step 7 : Commit**

```bash
git add "src/app/verification" src/app/robots.ts tests/services/verification-indistinction.test.ts
git commit -m "feat(verification): la page qui constate l absence, sans jamais rassurer"
```

---

## Task 14 : Les deux chemins de demande

**Files:**
- Create: `src/app/verification/[siret]/actions.ts`
- Create: `src/app/verification/[siret]/RequestForm.tsx`
- Create: `src/app/verification/[siret]/CopyMessage.tsx`
- Modify: `src/app/verification/[siret]/page.tsx`

- [ ] **Step 1 : Écrire la server action**

`src/app/verification/[siret]/actions.ts` :

```ts
'use server'

import { isValidSiret } from '@/domain/siret'
import { createRequest } from '@/services/attestation-request'

export interface RequestState {
  sent?: boolean
  error?: string
}

/**
 * La demande d'attestation.
 *
 * **La reponse est la meme dans tous les cas ou distinguer reviendrait a
 * renseigner l'appelant sur un tiers** : un refus par treve de sept jours
 * revelerait qu'un autre demandeur est passe avant, et une opposition
 * revelerait que l'artisan nous a demande de ne plus le contacter. Seules les
 * fautes de saisie du demandeur produisent un message different — lui seul les
 * a commises, et lui seul peut les corriger.
 */
export async function requestAttestation(
  _state: RequestState,
  form: FormData,
): Promise<RequestState> {
  const siret = String(form.get('siret') ?? '')
  if (!isValidSiret(siret)) return { error: 'Ce SIRET n’est pas valide.' }

  const channel = form.get('channel') === 'copied' ? 'copied' : 'sent'

  if (channel === 'copied') {
    await createRequest({ siret, channel: 'copied', notify: false }, new Date())
    return { sent: true }
  }

  const requesterName = String(form.get('requesterName') ?? '').trim()
  const requesterEmail = String(form.get('requesterEmail') ?? '').trim()
  const artisanEmail = String(form.get('artisanEmail') ?? '').trim()

  if (!requesterName) return { error: 'Indiquez votre prénom.' }
  if (!requesterEmail.includes('@')) return { error: 'Votre adresse ne semble pas valide.' }
  if (!artisanEmail.includes('@')) {
    return { error: 'L’adresse de l’artisan ne semble pas valide.' }
  }

  await createRequest(
    {
      siret,
      channel: 'sent',
      notify: form.get('notify') === 'on',
      requesterName,
      requesterEmail,
      artisanEmail,
    },
    new Date(),
  )

  // Verdict volontairement ignore : voir le bloc ci-dessus.
  return { sent: true }
}
```

- [ ] **Step 2 : Écrire le formulaire**

`src/app/verification/[siret]/RequestForm.tsx` :

```tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Checkbox } from '@/ui/atoms/checkbox'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { Card } from '@/ui/molecules/card'
import { requestAttestation, type RequestState } from './actions'

/**
 * « Demandez-lui son attestation. »
 *
 * La case de notification est cochee par defaut : c'est le seul mecanisme qui
 * ramene le demandeur, et elle donne un vrai levier a l'artisan — quelqu'un
 * attend. Elle reste decochable.
 */
export function RequestForm({ siret }: { siret: string }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(requestAttestation, {})

  if (state.sent) {
    return (
      <Card>
        <Text>
          C’est envoyé. Si l’entreprise dépose son attestation, nous la vérifions et vous
          prévenons.
        </Text>
      </Card>
    )
  }

  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="siret" value={siret} />
        <input type="hidden" name="channel" value="sent" />

        <Field label="Votre prénom" required>
          {(p) => <Input {...p} name="requesterName" autoComplete="given-name" />}
        </Field>

        <Field label="Votre adresse e-mail" required>
          {(p) => <Input {...p} name="requesterEmail" type="email" autoComplete="email" />}
        </Field>

        <Field label="L’adresse e-mail de l’artisan" error={state.error} required>
          {(p) => <Input {...p} name="artisanEmail" type="email" />}
        </Field>

        <Checkbox name="notify" defaultChecked label="Prévenez-moi dès que c’est vérifié" />

        <Button type="submit" tone="conversion" size="lg" pending={pending}>
          Demander l’attestation
        </Button>
      </form>
    </Card>
  )
}
```

- [ ] **Step 3 : Écrire le second chemin**

`src/app/verification/[siret]/CopyMessage.tsx` :

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { requestAttestation } from './actions'

/**
 * Le chemin ou nous n'envoyons rien.
 *
 * Aucun contact n'est collecte : le message part du telephone du demandeur, ce
 * qui evacue la question du SMS non sollicite. Nous n'enregistrons que
 * l'intention, pour que l'entonnoir la compte.
 */
export function CopyMessage({ siret, pageUrl }: { siret: string; pageUrl: string }) {
  const [copied, setCopied] = useState(false)

  const message =
    `Bonjour, avant de signer j’aimerais vérifier votre garantie décennale. ` +
    `Pouvez-vous m’envoyer votre attestation ? Voici ce que j’ai trouvé : ${pageUrl}`

  async function copy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)

    const form = new FormData()
    form.set('siret', siret)
    form.set('channel', 'copied')
    await requestAttestation({}, form)
  }

  return (
    <Card>
      <Text size="sm" tone="muted">
        Vous préférez lui écrire vous-même ?
      </Text>
      <Button type="button" tone="bare" onClick={copy}>
        {copied ? 'Message copié' : 'Copier le message'}
      </Button>
    </Card>
  )
}
```

- [ ] **Step 4 : Poser les deux blocs sur la page**

Dans `src/app/verification/[siret]/page.tsx`, ajouter les imports :

```tsx
import { CopyMessage } from './CopyMessage'
import { RequestForm } from './RequestForm'
```

et, sous `<Verdict view={view} />` :

```tsx
      <RequestForm siret={siret} />
      <CopyMessage
        siret={siret}
        pageUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/verification/${siret}`}
      />
```

- [ ] **Step 5 : Vérifier**

Run: `pnpm build && pnpm check:size && pnpm check:ds`
Expected: tout vert. Ajuster les props (`tone`, `label`, `pending`) si un composant en refuse une.

- [ ] **Step 6 : Commit**

```bash
git add "src/app/verification"
git commit -m "feat(verification): demander l attestation, ou copier le message"
```

---

## Task 15 : La page d'opposition

**Files:**
- Create: `src/app/stop/page.tsx`
- Test: `tests/services/mail-optout.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/services/mail-optout.test.ts` :

```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { db, connection } from '@/db/client'
import { mailOptout } from '@/db/schema'
import { optoutToken } from '@/domain/mail-optout'
import { recordOptout } from '@/services/attestation-request'

const SECRET = 'secret-de-test'
const EMAIL = 'artisan@exemple.fr'

beforeEach(async () => {
  await db.delete(mailOptout)
})

afterAll(async () => connection.end())

describe('recordOptout', () => {
  it('enregistre une opposition sur un jeton valide', async () => {
    const done = await recordOptout(EMAIL, optoutToken(EMAIL, SECRET), SECRET)
    expect(done).toBe(true)

    const rows = await db.select().from(mailOptout)
    expect(rows.map((r) => r.email)).toEqual([EMAIL])
  })

  it('refuse un jeton invalide sans rien ecrire', async () => {
    const done = await recordOptout(EMAIL, 'faux', SECRET)
    expect(done).toBe(false)
    expect(await db.select().from(mailOptout)).toHaveLength(0)
  })

  it('est idempotente : deux clics ne font pas deux lignes ni une erreur', async () => {
    const token = optoutToken(EMAIL, SECRET)
    await recordOptout(EMAIL, token, SECRET)
    const again = await recordOptout(EMAIL, token, SECRET)

    expect(again).toBe(true)
    expect(await db.select().from(mailOptout)).toHaveLength(1)
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/services/mail-optout.test.ts`
Expected: FAIL — `recordOptout` n'existe pas.

- [ ] **Step 3 : Implémenter**

Ajouter à la fin de `src/services/attestation-request.ts` :

```ts
/**
 * Enregistre une opposition.
 *
 * Idempotente : un lien de mail est clique deux fois, transfere, reouvert des
 * mois plus tard. Une erreur a la seconde tentative laisserait croire que
 * l'opposition n'a pas ete prise en compte.
 */
export async function recordOptout(
  email: string | undefined,
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  // `verifyOptout` porte les gardes : secret vide, adresse ou jeton absents.
  // Apres ce test, `email` est necessairement une chaine non vide.
  if (!verifyOptout(email, token, secret)) return false

  // Meme normalisation que la signature du jeton — surtout pas `normalizeEmail`,
  // qui leverait sur l'adresse vide d'un lien tronque.
  await db
    .insert(mailOptout)
    .values({ email: email!.trim().toLowerCase() })
    .onConflictDoNothing()

  return true
}
```

et compléter l'import du domaine en tête de fichier :

```ts
import { optoutToken, verifyOptout } from '@/domain/mail-optout'
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm db:reset && pnpm vitest run tests/services/mail-optout.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5 : Écrire la page**

`src/app/stop/page.tsx` :

```tsx
import type { Metadata } from 'next'
import { recordOptout } from '@/services/attestation-request'
import { PublicShell } from '@/ui/shells/public-shell'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'

export const metadata: Metadata = {
  title: 'Ne plus être contacté — D’équerre',
  robots: { index: false, follow: false },
}

/**
 * L'opposition, depuis le lien d'un mail.
 *
 * Le jeton est signe plutot que stocke : la demande qui a declenche le mail est
 * anonymisee a 30 jours, et un lien qui cesserait de fonctionner reviendrait a
 * retirer le droit d'opposition avec le temps.
 */
export default async function StopPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; s?: string }>
}) {
  const { e = '', s = '' } = await searchParams
  const done = await recordOptout(e, s, process.env.MAIL_OPTOUT_SECRET ?? '')

  return (
    <PublicShell>
      <Heading level={1} size="lg">
        {done ? 'C’est noté.' : 'Ce lien n’est plus valide.'}
      </Heading>
      <Text>
        {done
          ? 'Nous n’écrirons plus à cette adresse, quelle que soit la personne qui le demande.'
          : 'Réessayez depuis le lien d’origine, ou écrivez-nous.'}
      </Text>
    </PublicShell>
  )
}
```

- [ ] **Step 6 : Vérifier**

Run: `pnpm build`
Expected: build vert.

- [ ] **Step 7 : Commit**

```bash
git add src/app/stop src/services/attestation-request.ts tests/services/mail-optout.test.ts
git commit -m "feat(lead): la page d opposition, sur jeton signe"
```

---

## Task 16 : L'entonnoir et la liste, côté service

**Files:**
- Create: `src/services/lead-metrics.ts`
- Test: `tests/services/lead-metrics.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/services/lead-metrics.test.ts` :

```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { db, connection } from '@/db/client'
import { attestationRequest, verificationLookup } from '@/db/schema'
import { leadFunnel, openRequests } from '@/services/lead-metrics'

const NOW = new Date('2026-08-19T12:00:00Z')
const FROM = new Date('2026-08-12T12:00:00Z')
const SIRET = '50769820700036'

beforeEach(async () => {
  await db.delete(attestationRequest)
  await db.delete(verificationLookup)
})

afterAll(async () => connection.end())

describe('leadFunnel', () => {
  it('ne compte que la periode demandee', async () => {
    await db.insert(verificationLookup).values([
      { siret: SIRET, outcome: 'stranger', entry: 'demandeur', lookedUpAt: NOW },
      {
        siret: SIRET,
        outcome: 'stranger',
        entry: 'demandeur',
        lookedUpAt: new Date('2026-01-01T00:00:00Z'),
      },
    ])

    const result = await leadFunnel(FROM, NOW)
    expect(result.lookups).toBe(1)
    expect(result.uncovered).toBe(1)
  })

  it('compte une demande anonymisee comme les autres', async () => {
    await db.insert(attestationRequest).values({
      siret: null,
      channel: 'sent',
      notify: false,
      requestedAt: NOW,
      registeredAt: NOW,
      anonymizedAt: NOW,
    })

    const result = await leadFunnel(FROM, NOW)
    expect(result.requests).toBe(1)
    expect(result.registered).toBe(1)
  })
})

describe('openRequests', () => {
  it('rend les demandes vivantes, la plus recente en tete', async () => {
    await db.insert(attestationRequest).values([
      { siret: SIRET, channel: 'sent', notify: true, requestedAt: new Date(NOW.getTime() - 3_600_000) },
      { siret: SIRET, channel: 'copied', notify: false, requestedAt: NOW },
    ])

    const rows = await openRequests(NOW)
    expect(rows).toHaveLength(2)
    expect(rows[0].channel).toBe('copied')
  })

  it('ecarte les demandes anonymisees', async () => {
    await db.insert(attestationRequest).values({
      siret: null,
      channel: 'sent',
      notify: false,
      requestedAt: NOW,
      anonymizedAt: NOW,
    })

    expect(await openRequests(NOW)).toHaveLength(0)
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/services/lead-metrics.test.ts`
Expected: FAIL — `Cannot find module '@/services/lead-metrics'`.

- [ ] **Step 3 : Implémenter**

`src/services/lead-metrics.ts` :

```ts
import { and, desc, gte, isNull, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { attestationRequest, verificationLookup } from '@/db/schema'
import { funnel, type Funnel } from '@/domain/lead-funnel'

/**
 * L'entonnoir sur une periode.
 *
 * Le calcul lui-meme vit dans le domaine, teste sans base : ici on ne fait que
 * fournir les lignes. Aucune de ces lignes ne porte de contact — l'entonnoir
 * compte des dates et des canaux, ce qui le rend insensible a l'anonymisation.
 */
export async function leadFunnel(from: Date, to: Date): Promise<Funnel> {
  const lookups = await db
    .select({ outcome: verificationLookup.outcome })
    .from(verificationLookup)
    .where(and(gte(verificationLookup.lookedUpAt, from), lte(verificationLookup.lookedUpAt, to)))

  const requests = await db
    .select({
      channel: attestationRequest.channel,
      registeredAt: attestationRequest.registeredAt,
      depositedAt: attestationRequest.depositedAt,
      coveredAt: attestationRequest.coveredAt,
    })
    .from(attestationRequest)
    .where(and(gte(attestationRequest.requestedAt, from), lte(attestationRequest.requestedAt, to)))

  return funnel({ lookups, requests })
}

export interface OpenRequest {
  id: string
  siret: string | null
  channel: 'sent' | 'copied'
  requestedAt: Date
  registeredAt: Date | null
  depositedAt: Date | null
  coveredAt: Date | null
}

/**
 * Les demandes encore vivantes, la plus recente en tete.
 *
 * Une demande anonymisee n'y figure plus : il n'y a plus rien a relancer, et
 * c'est exactement l'effet recherche — la liste se vide d'elle-meme a 30 jours,
 * sans qu'aucun humain ait a la ranger.
 */
export async function openRequests(_now: Date): Promise<OpenRequest[]> {
  return db
    .select({
      id: attestationRequest.id,
      siret: attestationRequest.siret,
      channel: attestationRequest.channel,
      requestedAt: attestationRequest.requestedAt,
      registeredAt: attestationRequest.registeredAt,
      depositedAt: attestationRequest.depositedAt,
      coveredAt: attestationRequest.coveredAt,
    })
    .from(attestationRequest)
    .where(isNull(attestationRequest.anonymizedAt))
    .orderBy(desc(attestationRequest.requestedAt))
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm db:reset && pnpm vitest run tests/services/lead-metrics.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/services/lead-metrics.ts tests/services/lead-metrics.test.ts
git commit -m "feat(lead): entonnoir et liste ouverte, cote service"
```

---

## Task 17 : L'écran admin

**Files:**
- Create: `src/app/(admin)/leads/page.tsx`
- Create: `src/app/(admin)/leads/Funnel.tsx`
- Create: `src/app/(admin)/leads/RequestList.tsx`
- Modify: `src/ui/molecules/app-nav-routes.ts`

- [ ] **Step 1 : Écrire le bloc de chiffres**

`src/app/(admin)/leads/Funnel.tsx` :

```tsx
import { Card } from '@/ui/molecules/card'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import type { Funnel as FunnelData } from '@/domain/lead-funnel'

function rate(part: number, whole: number): string {
  if (whole === 0) return '—'
  return `${Math.round((part / whole) * 100)} %`
}

/**
 * L'entonnoir.
 *
 * Le taux qui compte est `sans couverture -> demandes` : il dit si la page
 * convainc. Les suivants mesurent le circuit de revue, qu'on connait deja par
 * la file d'attestations — ils sont ici pour le contexte, pas pour le pilotage.
 */
export function Funnel({ data }: { data: FunnelData }) {
  const lines = [
    { label: 'Recherches', value: data.lookups, of: null },
    { label: 'dont sans couverture', value: data.uncovered, of: data.lookups },
    { label: 'Demandes', value: data.requests, of: data.uncovered },
    { label: 'envoyées par nous', value: data.sent, of: data.requests },
    { label: 'copiées par le demandeur', value: data.copied, of: data.requests },
    { label: 'Inscriptions', value: data.registered, of: data.requests },
    { label: 'Attestations déposées', value: data.deposited, of: data.registered },
    { label: 'Couvertures publiées', value: data.covered, of: data.deposited },
  ]

  return (
    <Card>
      <Heading level={2} size="sm">
        Entonnoir
      </Heading>
      <dl className="flex flex-col gap-2">
        {lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-4">
            <dt>
              <Text size="sm">{line.label}</Text>
            </dt>
            <dd className="flex items-baseline gap-3">
              <Text>{line.value}</Text>
              {line.of !== null && (
                <Text size="sm" tone="muted">
                  {rate(line.value, line.of)}
                </Text>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
```

- [ ] **Step 2 : Écrire la liste**

`src/app/(admin)/leads/RequestList.tsx` :

```tsx
import { DataTable } from '@/ui/organisms/data-table'
import { Link } from '@/ui/atoms/link'
import type { OpenRequest } from '@/services/lead-metrics'

function statusOf(row: OpenRequest): string {
  if (row.coveredAt) return 'Couverture publiée'
  if (row.depositedAt) return 'Attestation en revue'
  if (row.registeredAt) return 'Inscrit, rien déposé'
  return 'Sans réponse'
}

function ageInDays(row: OpenRequest, now: Date): number {
  return Math.floor((now.getTime() - row.requestedAt.getTime()) / 86_400_000)
}

/**
 * Les demandes vivantes.
 *
 * Ni notes, ni tags, ni assignation : ce n'est pas un CRM, et la ligne
 * disparait d'elle-meme a 30 jours. La seule action possible vit dans la
 * colonne de droite, et elle est soumise aux memes gardes que l'envoi
 * automatique.
 */
export function RequestList({ rows, now }: { rows: OpenRequest[]; now: Date }) {
  return (
    <DataTable
      columns={['Entreprise', 'Canal', 'Âge', 'Statut']}
      rows={rows.map((row) => [
        row.siret ? (
          <Link key={row.id} href={`/verification/${row.siret}`} tone="bare">
            {row.siret}
          </Link>
        ) : (
          '—'
        ),
        row.channel === 'sent' ? 'Envoyée' : 'Copiée',
        `${ageInDays(row, now)} j`,
        statusOf(row),
      ])}
    />
  )
}
```

> **Note d'implémentation.** Lire `src/ui/organisms/data-table.tsx` avant d'écrire ce fichier et adapter l'appel à sa signature réelle (noms des props, forme des cellules).

- [ ] **Step 3 : Écrire la page**

`src/app/(admin)/leads/page.tsx` :

```tsx
import { notFound } from 'next/navigation'
import { currentStaff } from '@/lib/staff-session'
import { SessionError } from '@/lib/session'
import { leadFunnel, openRequests } from '@/services/lead-metrics'
import { EmptyState } from '@/ui/molecules/empty-state'
import { PageHeader } from '@/ui/molecules/page-header'
import { AppShell } from '@/ui/shells/app-shell'
import { Funnel } from './Funnel'
import { RequestList } from './RequestList'

const PERIODS: Record<string, number> = { '7': 7, '30': 30, '90': 90 }

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ jours?: string }>
}) {
  try {
    await currentStaff()
  } catch (e) {
    if (e instanceof SessionError) notFound()
    throw e
  }

  const { jours = '30' } = await searchParams
  const days = PERIODS[jours] ?? 30

  const now = new Date()
  const from = new Date(now.getTime() - days * 86_400_000)

  const [data, rows] = await Promise.all([leadFunnel(from, now), openRequests(now)])

  return (
    <AppShell>
      <PageHeader
        title="Leads"
        subtitle={`${data.requests} demande${data.requests > 1 ? 's' : ''} sur ${days} jours.`}
      />

      <Funnel data={data} />

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune demande en cours"
          description="Les demandes disparaissent d’elles-mêmes au bout de trente jours."
        />
      ) : (
        <RequestList rows={rows} now={now} />
      )}
    </AppShell>
  )
}
```

- [ ] **Step 4 : Ajouter l'entrée de navigation**

Run: `sed -n 1,60p src/ui/molecules/app-nav-routes.ts`

Ajouter une entrée `{ href: '/leads', label: 'Leads' }` au groupe interne, à côté de `/supervision`, `/attestations` et `/entreprises`, en suivant la forme exacte des entrées voisines.

- [ ] **Step 5 : Vérifier**

Run: `pnpm build && pnpm check:size && pnpm check:ds && pnpm check:isolation`
Expected: tout vert.

- [ ] **Step 6 : Commit**

```bash
git add "src/app/(admin)/leads" src/ui/molecules/app-nav-routes.ts
git commit -m "feat(admin): l ecran des leads, entonnoir et liste"
```

---

## Task 18 : La relance manuelle

**Files:**
- Create: `src/app/(admin)/leads/actions.ts`
- Modify: `src/app/(admin)/leads/RequestList.tsx`
- Modify: `src/services/attestation-request.ts`
- Test: `tests/services/attestation-relaunch.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/services/attestation-relaunch.test.ts` :

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { db, connection } from '@/db/client'
import { attestationRequest, mailOptout } from '@/db/schema'
import { relaunchRequest } from '@/services/attestation-request'

const sent: { to: string }[] = []
vi.mock('@/services/lead-mail', () => ({
  sendAttestationRequest: async (i: { to: string }) => {
    sent.push(i)
  },
}))
vi.mock('@/services/rge-lookup', () => ({ fetchRgeRows: async () => [] }))

const SIRET = '50769820700036'
const NOW = new Date('2026-08-19T12:00:00Z')

async function seed(requestedAt: Date) {
  const [row] = await db
    .insert(attestationRequest)
    .values({
      siret: SIRET,
      channel: 'sent',
      notify: true,
      requesterName: 'Claire',
      requesterEmail: 'claire@exemple.fr',
      artisanEmail: 'artisan@exemple.fr',
      requestedAt,
    })
    .returning({ id: attestationRequest.id })
  return row.id
}

beforeEach(async () => {
  sent.length = 0
  await db.delete(attestationRequest)
  await db.delete(mailOptout)
})

afterAll(async () => connection.end())

describe('relaunchRequest', () => {
  it('refuse tant que la treve de sept jours n est pas ecoulee', async () => {
    const id = await seed(new Date(NOW.getTime() - 2 * 86_400_000))
    expect(await relaunchRequest(id, NOW)).toBe('artisan_cooldown')
    expect(sent).toHaveLength(0)
  })

  it('relance apres sept jours', async () => {
    const id = await seed(new Date(NOW.getTime() - 8 * 86_400_000))
    expect(await relaunchRequest(id, NOW)).toBe('ok')
    expect(sent).toHaveLength(1)
  })

  it('respecte une opposition posterieure a la demande', async () => {
    const id = await seed(new Date(NOW.getTime() - 8 * 86_400_000))
    await db.insert(mailOptout).values({ email: 'artisan@exemple.fr' })

    expect(await relaunchRequest(id, NOW)).toBe('opted_out')
    expect(sent).toHaveLength(0)
  })

  it('ne relance pas une demande anonymisee', async () => {
    const id = await seed(new Date(NOW.getTime() - 40 * 86_400_000))
    await db.update(attestationRequest).set({ anonymizedAt: NOW, artisanEmail: null, siret: null })

    expect(await relaunchRequest(id, NOW)).toBe('opted_out')
    expect(sent).toHaveLength(0)
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/services/attestation-relaunch.test.ts`
Expected: FAIL — `relaunchRequest` n'existe pas.

- [ ] **Step 3 : Implémenter**

Ajouter à `src/services/attestation-request.ts` :

```ts
/**
 * La relance manuelle, depuis l'ecran admin.
 *
 * Elle passe par `createRequest` plutot que de reimplementer l'envoi : les
 * gardes doivent etre EXACTEMENT les memes que pour un demandeur, sinon la
 * treve de sept jours devient contournable par un humain de chez nous — ce qui
 * revient a ne pas l'avoir.
 *
 * Une demande anonymisee n'a plus ni SIRET ni contact : il n'y a rien a
 * relancer, et le refus est nomme comme un refus.
 */
export async function relaunchRequest(id: string, now: Date): Promise<GuardVerdict> {
  const [row] = await db
    .select()
    .from(attestationRequest)
    .where(eq(attestationRequest.id, id))
    .limit(1)

  if (!row?.siret || !row.artisanEmail || !row.requesterEmail) return 'opted_out'

  return createRequest(
    {
      siret: row.siret,
      channel: 'sent',
      notify: row.notify,
      requesterName: row.requesterName ?? undefined,
      requesterEmail: row.requesterEmail,
      artisanEmail: row.artisanEmail,
    },
    now,
  )
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm db:reset && pnpm vitest run tests/services/attestation-relaunch.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5 : Écrire l'action admin**

`src/app/(admin)/leads/actions.ts` :

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { currentStaff } from '@/lib/staff-session'
import { relaunchRequest } from '@/services/attestation-request'

/**
 * Relance une demande depuis l'admin.
 *
 * Le verdict est affiche tel quel : ici, contrairement a la page publique,
 * distinguer un refus d'un envoi ne revele rien a un tiers — le lecteur est un
 * relecteur de chez nous, et il doit savoir pourquoi rien n'est parti.
 */
export async function relaunch(_state: { message?: string }, form: FormData) {
  await currentStaff()

  const verdict = await relaunchRequest(String(form.get('id') ?? ''), new Date())
  revalidatePath('/leads')

  const messages: Record<string, string> = {
    ok: 'Relance envoyée.',
    opted_out: 'Impossible : opposition, ou demande déjà effacée.',
    artisan_cooldown: 'Trop tôt : moins de sept jours depuis le dernier envoi.',
    already_requested: 'Une demande identique date de moins de vingt-quatre heures.',
    requester_flooded: 'Plafond horaire atteint pour ce demandeur.',
  }

  return { message: messages[verdict] }
}
```

- [ ] **Step 6 : Poser le bouton**

Dans `RequestList.tsx`, ajouter une cinquième colonne `'—'` d'intitulé vide, contenant pour chaque ligne relançable un petit formulaire :

```tsx
        <form action={relaunch} key={`relaunch-${row.id}`}>
          <input type="hidden" name="id" value={row.id} />
          <Button type="submit" tone="bare" size="sm">
            Relancer
          </Button>
        </form>
```

avec, en tête de fichier :

```tsx
import { Button } from '@/ui/atoms/button'
import { relaunch } from './actions'
```

Le composant devient client (`'use client'` en première ligne) si `useActionState` est utilisé pour afficher `message` ; sinon garder le `form action` simple et laisser `revalidatePath` rafraîchir la liste.

- [ ] **Step 7 : Vérifier**

Run: `pnpm build && pnpm check:size`
Expected: tout vert.

- [ ] **Step 8 : Commit**

```bash
git add "src/app/(admin)/leads" src/services/attestation-request.ts tests/services/attestation-relaunch.test.ts
git commit -m "feat(admin): relance manuelle, sous les memes gardes"
```

---

## Task 19 : L'export CSV

**Files:**
- Create: `src/app/(admin)/leads/export/route.ts`
- Modify: `src/app/(admin)/leads/page.tsx`
- Test: `tests/domain/csv.test.ts`
- Create: `src/domain/csv.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/domain/csv.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { toCsv } from '@/domain/csv'

describe('toCsv', () => {
  it('ecrit un en-tete et une ligne', () => {
    expect(toCsv(['a', 'b'], [['1', '2']])).toBe('a,b\n1,2')
  })

  it('protege les valeurs qui contiennent une virgule', () => {
    expect(toCsv(['a'], [['x,y']])).toBe('a\n"x,y"')
  })

  it('double les guillemets internes', () => {
    expect(toCsv(['a'], [['il a dit "oui"']])).toBe('a\n"il a dit ""oui"""')
  })

  it('protege les retours a la ligne', () => {
    expect(toCsv(['a'], [['x\ny']])).toBe('a\n"x\ny"')
  })

  it('rend le seul en-tete quand il n y a rien a exporter', () => {
    expect(toCsv(['a', 'b'], [])).toBe('a,b')
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `pnpm vitest run tests/domain/csv.test.ts`
Expected: FAIL — `Cannot find module '@/domain/csv'`.

- [ ] **Step 3 : Implémenter**

`src/domain/csv.ts` :

```ts
/**
 * Serialisation CSV, sans dependance.
 *
 * Une valeur portant une virgule, un guillemet ou un retour a la ligne casse un
 * fichier CSV naif — et le tableur ne le signale pas : il decale simplement les
 * colonnes, ce qui produit un chiffre faux plutot qu'une erreur.
 */
function escape(value: string): string {
  if (!/[",\n]/.test(value)) return value
  return `"${value.replaceAll('"', '""')}"`
}

export function toCsv(headers: string[], rows: string[][]): string {
  return [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n')
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/csv.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5 : Écrire la route**

`src/app/(admin)/leads/export/route.ts` :

```ts
import { currentStaff } from '@/lib/staff-session'
import { SessionError } from '@/lib/session'
import { toCsv } from '@/domain/csv'
import { leadFunnel, openRequests } from '@/services/lead-metrics'

export const runtime = 'nodejs'

/**
 * L'export CSV de l'entonnoir et des demandes ouvertes.
 *
 * C'est la seule couture vers l'exterieur, et elle est deliberement pauvre :
 * pas de synchronisation vers un CRM tiers. La valeur d'un CRM est de se
 * souvenir pour toujours, et tout le dispositif tient sur l'oubli a 30 jours.
 * Un export a la demande couvre le besoin reel sans creer de copie permanente
 * hors de notre controle.
 */
export async function GET(request: Request) {
  try {
    await currentStaff()
  } catch (e) {
    if (e instanceof SessionError) return new Response('Accès réservé', { status: 404 })
    throw e
  }

  const days = Number(new URL(request.url).searchParams.get('jours') ?? 30)
  const now = new Date()
  const from = new Date(now.getTime() - days * 86_400_000)

  const data = await leadFunnel(from, now)
  const rows = await openRequests(now)

  const csv = [
    toCsv(
      ['mesure', 'valeur'],
      Object.entries(data).map(([key, value]) => [key, String(value)]),
    ),
    '',
    toCsv(
      ['siret', 'canal', 'demandee_le', 'inscrite_le', 'deposee_le', 'couverte_le'],
      rows.map((r) => [
        r.siret ?? '',
        r.channel,
        r.requestedAt.toISOString(),
        r.registeredAt?.toISOString() ?? '',
        r.depositedAt?.toISOString() ?? '',
        r.coveredAt?.toISOString() ?? '',
      ]),
    ),
  ].join('\n')

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="leads-${days}j.csv"`,
    },
  })
}
```

- [ ] **Step 6 : Poser le lien sur la page**

Dans `src/app/(admin)/leads/page.tsx`, ajouter sous `<Funnel data={data} />` :

```tsx
      <Link href={`/leads/export?jours=${days}`} tone="bare">
        Exporter en CSV
      </Link>
```

avec `import { Link } from '@/ui/atoms/link'` en tête.

- [ ] **Step 7 : Vérifier**

Run: `pnpm build && pnpm check:size && pnpm check:isolation`
Expected: tout vert.

- [ ] **Step 8 : Commit**

```bash
git add src/domain/csv.ts "src/app/(admin)/leads" tests/domain/csv.test.ts
git commit -m "feat(admin): export CSV de l entonnoir et des demandes"
```

---

## Task 20 : Le parcours de bout en bout

**Files:**
- Create: `tests/e2e/verification.spec.ts`

- [ ] **Step 1 : Lire un test voisin pour en reprendre les conventions**

Run: `ls tests/e2e && sed -n 1,60p tests/e2e/$(ls tests/e2e | head -1)`

Relever : comment la base est amorcée, comment les mails sont relus (collecteur de la pile Supabase, port 54324), et quels sélecteurs sont utilisés.

- [ ] **Step 2 : Écrire le test**

`tests/e2e/verification.spec.ts` :

```ts
import { test, expect } from '@playwright/test'

const STRANGER_SIRET = '39315263200005'

test('un SIRET inconnu mene a la page de verification, et la demande part', async ({ page }) => {
  await page.goto('/verifier')

  await page.getByRole('textbox', { name: /SIRET/i }).fill(STRANGER_SIRET)
  await page.getByRole('button', { name: /vérifier/i }).click()

  await expect(page).toHaveURL(new RegExp(`/verification/${STRANGER_SIRET}`))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Nous ne pouvons rien affirmer',
  )

  // Aucun signal positif : la page ne peut pas rassurer.
  await expect(page.getByText(/RGE/i)).toHaveCount(0)
  await expect(page.getByText(/entreprise active/i)).toHaveCount(0)

  await page.getByRole('textbox', { name: /votre prénom/i }).fill('Claire')
  await page.getByRole('textbox', { name: /votre adresse/i }).fill('claire@exemple.fr')
  await page.getByRole('textbox', { name: /adresse e-mail de l’artisan/i }).fill('artisan@exemple.fr')
  await page.getByRole('button', { name: /demander l’attestation/i }).click()

  await expect(page.getByText(/c’est envoyé/i)).toBeVisible()
})

test('la page de vérification n’est pas indexable', async ({ page }) => {
  await page.goto(`/verification/${STRANGER_SIRET}`)
  const robots = page.locator('meta[name="robots"]')
  await expect(robots).toHaveAttribute('content', /noindex/)
})
```

- [ ] **Step 3 : Lancer le test**

Run: `pnpm test:e2e -- tests/e2e/verification.spec.ts`
Expected: PASS. Ajuster les sélecteurs si les libellés réels diffèrent — ne pas modifier les textes de la page pour faire passer le test.

- [ ] **Step 4 : Commit**

```bash
git add tests/e2e/verification.spec.ts
git commit -m "test(e2e): le parcours de verification, de la recherche au mail"
```

---

## Task 21 : L'AIPD et la validation finale

**Files:**
- Modify: `docs/superpowers/rgpd/2026-08-08-aipd-passeport.md`

- [ ] **Step 1 : Lire l'AIPD existante**

Run: `sed -n 1,80p docs/superpowers/rgpd/2026-08-08-aipd-passeport.md`

Relever la numérotation des articles et le ton, pour y greffer une section cohérente plutôt qu'un corps étranger.

- [ ] **Step 2 : Ajouter la section**

Ajouter, en suivant la forme des sections voisines, une section « Vérification d'un artisan hors D'équerre » couvrant les quatre points de la § 6.5 de la spec :

1. **Base légale de l'envoi à l'artisan** — intérêt légitime, adossé à une relation d'affaires réelle et actuelle entre le demandeur et l'artisan, dont le demandeur atteste en saisissant l'adresse. Mise en balance : l'artisan reçoit au plus un message tous les sept jours, signé du nom de son client, avec un droit d'opposition en un clic.
2. **Droit d'opposition** — `mail_optout`, lien présent dès le premier message, jeton signé pour qu'il fonctionne encore après l'effacement de la demande.
3. **Durées** — 30 jours pour une demande, 12 mois pour une recherche ; anonymisation plutôt que suppression, justifiée par la nécessité de mesurer le dispositif sans conserver personne.
4. **Le SIRET comme donnée personnelle** chez l'entrepreneur individuel — d'où son effacement au même titre que les contacts.

- [ ] **Step 3 : Validation complète**

Run: `pnpm validate`
Expected: environnement, tailles, design system, isolation, build et suite unitaire au vert.

Run: `pnpm test:integration`
Expected: les appels réels à recherche-entreprises et à l'ADEME passent.

- [ ] **Step 4 : Commit**

```bash
git add docs/superpowers/rgpd/2026-08-08-aipd-passeport.md
git commit -m "docs(rgpd): le parcours de verification entre dans l AIPD"
```

---

## Ce que le plan ne fait pas

Conformément à la § 10 de la spec : pas d'attribution multi-touch, pas de relance automatique, pas de SMS sortant depuis nos serveurs, pas de référencement de la page, pas de fiche par entreprise prospectée, pas de synchronisation CRM.
