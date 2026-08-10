# Accueil de l'artisan — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** donner à l'espace connecté un accueil sur `/` — l'argent en cours, ce qui appelle un geste, la journée, les mesures — là où la liste des devis en tenait lieu.

**Architecture :** les seuils sont des fonctions **pures** dans `src/domain/home-queue.ts` (elles prennent `now` en paramètre, ce sont elles qui sont testées) ; les requêtes et l'assemblage vivent dans `src/services/home.ts` ; `src/app/page.tsx` n'est qu'un aiguillage entre la landing et l'accueil ; chaque bande est un fichier de `src/app/_home/`. L'isolation des fonctionnalités interdit à la racine d'importer `(app)/devis` — tout passe par les couches partagées.

**Tech Stack :** Next.js 16 (App Router, composants serveur), React 19, Drizzle + Postgres, Tailwind v4 avec les jetons `--dq-*`, Vitest (`environment: node`), Playwright.

**Spec :** [2026-08-10-accueil-artisan-design.md](../specs/2026-08-10-accueil-artisan-design.md)

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/home-queue.ts` | **Créé.** Les seuils du §5 de la spec, purs. Aucun accès base |
| `src/services/home.ts` | **Créé.** `moneyInFlight` et `pendingTasks` : les requêtes et l'assemblage |
| `src/ui/atoms/button.tsx` | **Modifié.** Un ton `raised` |
| `src/ui/molecules/task-row.tsx` | **Créé.** Une ligne échéance / objet / geste |
| `src/ui/organisms/money-flow.tsx` | **Créé.** La barre segmentée et sa légende |
| `scripts/check-design-system.mjs` | **Modifié.** Deux entrées à l'inventaire |
| `src/app/_home/money.tsx` | **Créé.** Bande 1 |
| `src/app/_home/queue.tsx` | **Créé.** Bande 2 |
| `src/app/_home/today.tsx` | **Créé.** L'`aside` |
| `src/app/_home/metrics.tsx` | **Créé.** Bandes 3 et 4 |
| `src/app/_home/onboarding.tsx` | **Créé.** Le compte neuf |
| `src/app/_home/home.tsx` | **Créé.** La composition par capacités |
| `src/app/page.tsx` | **Modifié.** L'aiguillage |
| `src/domain/requester.ts` | **Modifié.** `resolveDestination` renvoie `/` |
| `src/ui/molecules/app-nav-routes.ts` | **Modifié.** L'entrée Accueil |
| `src/ui/organisms/app-header.tsx` | **Modifié.** Le logo pointe sur `/` |
| `src/app/(app)/devis/page.tsx` | **Modifié.** Perd son bloc titre d'entreprise |

**Chaque fichier reste sous 250 lignes** (`pnpm check:size`). Si une bande approche la limite, c'est qu'elle fait deux choses.

---

### Task 1 : les seuils, purs

**Files:**
- Create: `src/domain/home-queue.ts`
- Test: `tests/domain/home-queue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/domain/home-queue.test.ts
import { describe, it, expect } from 'vitest'
import {
  quoteNeedsFollowUp,
  completionIsUnbilled,
  certificateIsExpiring,
  orderTasks,
  FOLLOW_UP_BUSINESS_DAYS,
  VALIDITY_ALERT_DAYS,
  type Delay,
  type Task,
} from '@/domain/home-queue'

/** Jeudi 6 aout 2026. Les jours ouvres comptent, les week-ends non. */
const now = new Date('2026-08-06T09:00:00Z')

const elapsed = (days: number): Delay => ({ sense: 'elapsed', days })
const remaining = (days: number): Delay => ({ sense: 'remaining', days })

const task = (kind: Task['kind'], delay: Delay): Task => ({
  kind,
  id: `${kind}-${delay.sense}-${delay.days}`,
  title: kind,
  detail: '',
  amountInclTax: null,
  delay,
  href: '/',
  action: 'Ouvrir',
})

describe('un devis qui attend', () => {
  it('entre dans la file au septieme jour ouvre', () => {
    expect(FOLLOW_UP_BUSINESS_DAYS).toBe(7)
    // Envoye le mardi 28 juillet : sept jours ouvres au jeudi 6 aout.
    // `businessDaysSince` compte ]depuis, maintenant] — le jour de l'envoi ne
    // compte pas, et c'est ce qui fait un mardi et non un mercredi.
    const sentAt = new Date('2026-07-28T09:00:00Z')
    expect(quoteNeedsFollowUp({ sentAt, validityDays: 90 }, now)).toBe(true)
  })

  it("n'y entre pas au sixieme", () => {
    const sentAt = new Date('2026-07-29T09:00:00Z')
    expect(quoteNeedsFollowUp({ sentAt, validityDays: 90 }, now)).toBe(false)
  })

  it('ne compte pas le week-end', () => {
    // Un devis parti vendredi soir ne traine pas le lundi matin : entre le
    // vendredi 31 juillet et le jeudi 6 aout il n'y a que quatre jours ouvres.
    const sentAt = new Date('2026-07-31T18:00:00Z')
    expect(quoteNeedsFollowUp({ sentAt, validityDays: 90 }, now)).toBe(false)
  })

  it('y entre aussi quand sa validite expire bientot', () => {
    expect(VALIDITY_ALERT_DAYS).toBe(15)
    // Envoye il y a deux jours ouvres — donc muet, non — mais valable 5 jours.
    const sentAt = new Date('2026-08-04T09:00:00Z')
    expect(quoteNeedsFollowUp({ sentAt, validityDays: 5 }, now)).toBe(true)
  })

  it('sort de la file une fois la validite passee', () => {
    // Un devis expire n'appelle plus de relance : il appelle un nouveau devis,
    // et ce n'est pas la meme conversation.
    const sentAt = new Date('2026-06-01T09:00:00Z')
    expect(quoteNeedsFollowUp({ sentAt, validityDays: 30 }, now)).toBe(false)
  })
})

describe('un chantier fini et non solde', () => {
  it('attend trois jours ouvres avant de reclamer', () => {
    // Un chantier fini le mardi entre le vendredi, pas le mercredi.
    expect(completionIsUnbilled({ completedAt: new Date('2026-08-03T09:00:00Z'), remaining: 320_000 }, now)).toBe(true)
    expect(completionIsUnbilled({ completedAt: new Date('2026-08-05T09:00:00Z'), remaining: 320_000 }, now)).toBe(false)
  })

  it('ignore un chantier entierement facture', () => {
    expect(completionIsUnbilled({ completedAt: new Date('2026-07-01T09:00:00Z'), remaining: 0 }, now)).toBe(false)
  })

  it('ignore un trop-percu', () => {
    // Un reste negatif est un avoir a emettre, pas une facture a etablir.
    expect(completionIsUnbilled({ completedAt: new Date('2026-07-01T09:00:00Z'), remaining: -1_000 }, now)).toBe(false)
  })
})

describe('une attestation qui expire', () => {
  it('entre au premier palier de preavis, soixante jours', () => {
    expect(certificateIsExpiring(new Date('2026-10-04T00:00:00Z'), now)).toBe(true)
    expect(certificateIsExpiring(new Date('2026-10-06T00:00:00Z'), now)).toBe(false)
  })

  it('reste dans la file une fois expiree', () => {
    // C'est le moment ou le passeport cesse d'etre visible : la retirer de la
    // file au moment ou elle coute le plus cher serait absurde.
    expect(certificateIsExpiring(new Date('2026-07-01T00:00:00Z'), now)).toBe(true)
  })
})

describe('l ordre de la file', () => {
  it('classe par nature avant de classer par anciennete', () => {
    // Une facture echue depuis quatre jours passerait sinon devant une
    // attestation qui expire dans trois semaines, et les deux ne coutent pas
    // la meme chose.
    const ordered = orderTasks([
      task('unbilled_completion', elapsed(4)),
      task('silent_quote', elapsed(18)),
      task('overdue_invoice', elapsed(12)),
      task('certificate', remaining(21)),
    ])

    expect(ordered.map((t) => t.kind)).toEqual([
      'certificate',
      'overdue_invoice',
      'silent_quote',
      'unbilled_completion',
    ])
  })

  it('classe le plus ancien en premier sur un temps ecoule', () => {
    const ordered = orderTasks([task('silent_quote', elapsed(8)), task('silent_quote', elapsed(30))])
    expect(ordered.map((t) => t.delay.days)).toEqual([30, 8])
  })

  it('classe le plus proche en premier sur un temps restant', () => {
    // Le sens inverse, et c'est tout l'interet de le porter dans le type : une
    // attestation qui expire dans sept jours passe devant celle qui expire dans
    // soixante, alors que sur un temps ecoule c'est le grand nombre qui presse.
    const ordered = orderTasks([
      task('certificate', remaining(60)),
      task('certificate', remaining(7)),
      task('certificate', remaining(-3)),
    ])

    expect(ordered.map((t) => t.delay.days)).toEqual([-3, 7, 60])
  })

  it('ne touche pas au tableau qu on lui donne', () => {
    // `sort` trie en place. Sans la copie, l'ordre d'un tableau relu ailleurs
    // dependrait de qui a appele cette fonction en premier.
    const given = [task('silent_quote', elapsed(8)), task('certificate', remaining(21))]
    orderTasks(given)

    expect(given.map((t) => t.kind)).toEqual(['silent_quote', 'certificate'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run : `pnpm vitest run tests/domain/home-queue.test.ts`
Expected : FAIL — `Cannot find module '@/domain/home-queue'`

- [ ] **Step 3: Write the implementation**

```ts
// src/domain/home-queue.ts
import type { Cents } from './money'
import { businessDaysSince } from './business-days'
import { NOTICE_DAYS } from './expiry'

/**
 * Les seuils de la file d'accueil, et rien d'autre.
 *
 * Fonctions pures prenant `now` en parametre : un seuil qui depend d'une
 * horloge implicite est intestable, et celui-la decide de ce qu'un artisan voit
 * en ouvrant son espace.
 */

const DAY = 86_400_000

/**
 * Sept jours OUVRES, et non sept jours.
 *
 * Un devis parti vendredi soir ne traine pas le lundi matin. Le seuil est assez
 * long pour ne pas harceler un particulier qui reflechit, assez court pour
 * qu'il se souvienne encore de la visite.
 */
export const FOLLOW_UP_BUSINESS_DAYS = 7

/** Sous ce delai, la validite du devis devient elle-meme le motif de relance. */
export const VALIDITY_ALERT_DAYS = 15

/** Un chantier fini le jeudi n'a pas a figurer sur l'accueil du vendredi. */
export const UNBILLED_BUSINESS_DAYS = 3

/** Le premier palier de preavis : la file s'ouvre quand le courrier part. */
export const RENEWAL_ALERT_DAYS = NOTICE_DAYS[0]

export type TaskKind = 'certificate' | 'overdue_invoice' | 'silent_quote' | 'unbilled_completion'

/**
 * L'ordre des natures, du cout d'inaction le plus lourd au plus leger.
 *
 * L'attestation d'abord : elle seule coupe la visibilite publique du passeport,
 * et son cout ne se rattrape pas.
 */
export const TASK_ORDER: readonly TaskKind[] = [
  'certificate',
  'overdue_invoice',
  'silent_quote',
  'unbilled_completion',
]

/**
 * Un delai, et le SENS dans lequel il se lit.
 *
 * Les deux sens ne se trient pas dans le meme ordre : sur un temps ecoule, le
 * plus grand nombre est le plus urgent ; sur un temps restant, c'est le plus
 * petit — et il devient negatif quand l'echeance est passee, donc plus urgent
 * encore. Un seul champ de jours melangeait les deux et classait l'attestation
 * la MOINS pressee en tete des attestations.
 */
export interface Delay {
  sense: 'elapsed' | 'remaining'
  days: number
}

export interface Task {
  kind: TaskKind
  id: string
  title: string
  detail: string
  /** `null` quand la ligne ne porte pas d'argent — une attestation, typiquement. */
  amountInclTax: Cents | null
  delay: Delay
  href: string
  /** Le verbe du bouton. « Relancer », « Facturer », « Deposer l'attestation ». */
  action: string
}

/**
 * `Math.ceil`, comme `noticesDue` dans `expiry.ts`.
 *
 * Avec un plancher, une attestation valable encore soixante jours et quinze
 * heures compterait soixante jours et entrerait dans la file un jour trop tot —
 * a rebours du palier de preavis, qui est la meme frontiere.
 */
function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / DAY)
}

/**
 * Un devis a relancer : sans reponse depuis assez longtemps, OU dont la
 * validite s'acheve.
 *
 * `quoteNeedsFollowUp` et non `quoteIsSilent` : deux motifs distincts menent
 * ici, et un devis remis avant-hier dont la validite expire dans trois jours
 * n'a rien de silencieux. Le nom doit couvrir les deux, sinon le point d'appel
 * croit ne tester que le silence.
 *
 * Un devis DEJA expire n'y figure plus : il appelle un nouveau devis, pas une
 * relance, et ce n'est pas la meme conversation.
 */
export function quoteNeedsFollowUp(
  input: { sentAt: Date; validityDays: number },
  now: Date,
): boolean {
  const expiresAt = new Date(input.sentAt.getTime() + input.validityDays * DAY)
  if (now.getTime() > expiresAt.getTime()) return false

  const silent = businessDaysSince(input.sentAt, now) >= FOLLOW_UP_BUSINESS_DAYS
  const expiringSoon = daysBetween(now, expiresAt) <= VALIDITY_ALERT_DAYS

  return silent || expiringSoon
}

/** Un chantier termine dont il reste quelque chose a facturer. */
export function completionIsUnbilled(
  input: { completedAt: Date; remaining: Cents },
  now: Date,
): boolean {
  if (input.remaining <= 0) return false
  return businessDaysSince(input.completedAt, now) >= UNBILLED_BUSINESS_DAYS
}

/**
 * Une attestation dont l'echeance approche — ou est passee.
 *
 * Une attestation expiree reste dans la file : c'est le moment ou elle coute le
 * plus cher, la retirer alors serait absurde.
 */
export function certificateIsExpiring(validUntil: Date, now: Date): boolean {
  return daysBetween(now, validUntil) <= RENEWAL_ALERT_DAYS
}

/**
 * L'urgence, ramenee a une seule echelle ou le plus grand est le plus presse.
 *
 * Un temps restant se lit a l'envers d'un temps ecoule : c'est ce changement de
 * signe qui permet de trier les deux sens avec la meme comparaison.
 */
function urgency(task: Task): number {
  return task.delay.sense === 'elapsed' ? task.delay.days : -task.delay.days
}

/** Par nature, puis du plus presse au moins presse. */
export function orderTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const rank = TASK_ORDER.indexOf(a.kind) - TASK_ORDER.indexOf(b.kind)
    return rank !== 0 ? rank : urgency(b) - urgency(a)
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run : `pnpm vitest run tests/domain/home-queue.test.ts`
Expected : PASS — 12 tests

- [ ] **Step 5: Commit**

```bash
git add src/domain/home-queue.ts tests/domain/home-queue.test.ts
git commit -m "feat: les seuils de la file d'accueil, en jours ouvres"
```

---

### Task 2 : l'argent en cours

**Files:**
- Create: `src/services/home.ts`
- Test: `tests/services/home-money.test.ts`

Les tests de `tests/services/` parlent à un vrai Postgres : `pnpm db:reset` doit avoir tourné.

- [ ] **Step 1: Write the failing test**

```ts
// tests/services/home-money.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, connection } from '@/db/client'
import { quote, invoice, payment } from '@/db/schema'
import { moneyInFlight } from '@/services/home'
import { createCompany, createProject } from './invoice-fixtures'

/**
 * `project` exige un client ET un logement, tous deux `NOT NULL`. Les fixtures
 * partagees les creent deja — cinq suites s'en servent, et une sixieme copie
 * des inserts a la main divergerait a la premiere migration.
 */
let COMPANY: string
let PROJECT: string

const now = new Date('2026-08-10T09:00:00Z')

async function signedQuote(totalInclTax: number): Promise<string> {
  const id = randomUUID()
  await db.insert(quote).values({
    id,
    companyId: COMPANY,
    projectId: PROJECT,
    number: `D2026-${id.slice(0, 4)}`,
    status: 'signed',
    signedAt: new Date('2026-06-01T09:00:00Z'),
    totalExclTax: totalInclTax,
    totalTax: 0,
    totalInclTax,
    publicToken: randomUUID(),
  })
  return id
}

async function issuedInvoice(input: {
  quoteId: string
  totalInclTax: number
  dueAt: Date
  retentionRate?: number
}): Promise<string> {
  const id = randomUUID()
  await db.insert(invoice).values({
    id,
    companyId: COMPANY,
    projectId: PROJECT,
    quoteId: input.quoteId,
    number: `F2026-${id.slice(0, 4)}`,
    type: 'balance',
    dueAt: input.dueAt,
    totalExclTax: input.totalInclTax,
    totalTax: 0,
    totalInclTax: input.totalInclTax,
    latePaymentRate: '10',
    recoveryIndemnity: 4000,
    retentionRate: input.retentionRate ?? 0,
    operationType: 'services',
    publicToken: randomUUID(),
  })
  return id
}

beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)
})

afterAll(async () => {
  await connection.end()
})

describe('l argent en cours', () => {
  it('compte comme carnet de commandes ce qui est signe et pas encore facture', async () => {
    // Un devis signe dont le chantier n'a pas commence n'est pas du travail
    // fait : c'est une commande, et le libelle de l'ecran le dit ainsi.
    await signedQuote(500_000)

    const money = await moneyInFlight(COMPANY, now)

    expect(money.signedNotInvoiced).toBe(500_000)
    expect(money.invoicedOnTime).toBe(0)
    expect(money.overdue).toBe(0)
  })

  it('deplace le montant vers l encours des qu il est facture', async () => {
    const quoteId = await signedQuote(300_000)
    await issuedInvoice({ quoteId, totalInclTax: 300_000, dueAt: new Date('2026-09-01T00:00:00Z') })

    const money = await moneyInFlight(COMPANY, now)

    expect(money.signedNotInvoiced).toBe(500_000)
    expect(money.invoicedOnTime).toBe(300_000)
  })

  it('classe en retard une facture echue et impayee', async () => {
    const quoteId = await signedQuote(210_000)
    await issuedInvoice({ quoteId, totalInclTax: 210_000, dueAt: new Date('2026-07-29T00:00:00Z') })

    const money = await moneyInFlight(COMPANY, now)

    expect(money.overdue).toBe(210_000)
  })

  it('exclut du retard ce que le client a le droit de retenir', async () => {
    // Reclamer une retenue de garantie est une faute que l'accueil ne doit pas
    // industrialiser : sans reception declaree, la somme reste retenue.
    const quoteId = await signedQuote(100_000)
    await issuedInvoice({
      quoteId,
      totalInclTax: 100_000,
      dueAt: new Date('2026-07-01T00:00:00Z'),
      retentionRate: 500,
    })

    const money = await moneyInFlight(COMPANY, now)

    // 210 000 du test precedent, plus 95 000 ici : les 5 000 retenus sortent.
    expect(money.overdue).toBe(305_000)
  })

  it('compte les encaissements des douze derniers mois, et pas au-dela', async () => {
    const quoteId = await signedQuote(80_000)
    const invoiceId = await issuedInvoice({
      quoteId,
      totalInclTax: 80_000,
      dueAt: new Date('2026-08-30T00:00:00Z'),
    })

    await db.insert(payment).values([
      { invoiceId, amount: 50_000, receivedAt: new Date('2026-03-01T09:00:00Z'), method: 'transfer' },
      { invoiceId, amount: 30_000, receivedAt: new Date('2025-01-01T09:00:00Z'), method: 'transfer' },
    ])

    const money = await moneyInFlight(COMPANY, now)

    expect(money.cashedLast12Months).toBe(50_000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run : `pnpm vitest run tests/services/home-money.test.ts`
Expected : FAIL — `Cannot find module '@/services/home'`

- [ ] **Step 3: Write the implementation**

```ts
// src/services/home.ts
import { and, eq, gte, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, payment, quote } from '@/db/schema'
import type { Cents } from '@/domain/money'
import { remainingToInvoice } from '@/domain/invoice-balance'
import { amountDueNow, paymentStatus, type Settlement } from '@/domain/payment-status'
import { retentionState } from '@/domain/retention'

/**
 * L'assemblage de l'accueil.
 *
 * **Il vit ici et non dans l'ecran** : l'isolation des fonctionnalites interdit
 * a la racine d'importer `(app)/devis` ou `(app)/factures`, et un besoin
 * partage remonte dans une couche partagee. C'est de toute facon la bonne
 * place : ces requetes traversent quatre tables qui n'appartiennent a aucun
 * ecran en particulier.
 */

const MONTHS_12 = 12

export interface MoneyInFlight {
  /** Le carnet de commandes : signe, pas encore facture. */
  signedNotInvoiced: Cents
  /** Facture, exigible plus tard. */
  invoicedOnTime: Cents
  /** Facture, echu, retenue de garantie deduite. */
  overdue: Cents
  cashedLast12Months: Cents
}

/** Les factures d'une entreprise, avec leurs encaissements et la reception du chantier. */
async function settlements(companyId: string) {
  const rows = await db
    .select({
      id: invoice.id,
      quoteId: invoice.quoteId,
      type: invoice.type,
      totalInclTax: invoice.totalInclTax,
      dueAt: invoice.dueAt,
      retentionRate: invoice.retentionRate,
      receivedAt: quote.receivedAt,
    })
    .from(invoice)
    .leftJoin(quote, eq(invoice.quoteId, quote.id))
    .where(eq(invoice.companyId, companyId))

  const paid = await db
    .select({ invoiceId: payment.invoiceId, amount: payment.amount, receivedAt: payment.receivedAt })
    .from(payment)
    .innerJoin(invoice, eq(payment.invoiceId, invoice.id))
    .where(eq(invoice.companyId, companyId))

  return { rows, paid }
}

export async function moneyInFlight(companyId: string, now: Date): Promise<MoneyInFlight> {
  const signed = await db
    .select({ id: quote.id, totalInclTax: quote.totalInclTax })
    .from(quote)
    .where(
      and(
        eq(quote.companyId, companyId),
        eq(quote.status, 'signed'),
        // La racine seule : un avenant n'est pas une commande de plus.
        isNull(quote.supersedesQuoteId),
      ),
    )

  const { rows, paid } = await settlements(companyId)

  let signedNotInvoiced = 0
  for (const root of signed) {
    const issued = rows
      .filter((row) => row.quoteId === root.id)
      .map((row) => ({ type: row.type, totalInclTax: row.totalInclTax }))
    signedNotInvoiced += Math.max(0, remainingToInvoice(root.totalInclTax, issued))
  }

  let invoicedOnTime = 0
  let overdue = 0

  for (const row of rows) {
    // Un avoir n'est pas une creance : il diminue ce qui est du, et il est deja
    // pris en compte par `remainingToInvoice`.
    if (row.type === 'credit_note') continue

    const payments = paid.filter((p) => p.invoiceId === row.id).map((p) => p.amount)
    const { withheld } = retentionState(
      { totalInclTax: row.totalInclTax, rate: row.retentionRate, receivedAt: row.receivedAt },
      now,
    )

    const settlement: Settlement = {
      totalInclTax: row.totalInclTax,
      payments,
      dueAt: row.dueAt,
      withheld,
    }

    const due = amountDueNow(settlement)
    if (due === 0) continue

    if (paymentStatus(settlement, now) === 'overdue') overdue += due
    else invoicedOnTime += due
  }

  const since = new Date(now)
  since.setMonth(since.getMonth() - MONTHS_12)

  const cashed = await db
    .select({ amount: payment.amount })
    .from(payment)
    .innerJoin(invoice, eq(payment.invoiceId, invoice.id))
    .where(and(eq(invoice.companyId, companyId), gte(payment.receivedAt, since)))

  return {
    signedNotInvoiced,
    invoicedOnTime,
    overdue,
    cashedLast12Months: cashed.reduce((sum, row) => sum + row.amount, 0),
  }
}
```

Ne pas importer `isNotNull` à ce stade : il ne sert qu'à la Task 3, et un import inutilisé fait échouer `pnpm lint`.

- [ ] **Step 4: Run test to verify it passes**

Run : `pnpm db:reset && pnpm vitest run tests/services/home-money.test.ts`
Expected : PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/services/home.ts tests/services/home-money.test.ts
git commit -m "feat: l'argent en cours se lit d'une seule requete"
```

---

### Task 3 : la file d'attente

**Files:**
- Modify: `src/services/home.ts` (ajout de `pendingTasks`)
- Test: `tests/services/home-tasks.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/services/home-tasks.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, connection } from '@/db/client'
import { quote, insuranceCertificate } from '@/db/schema'
import { pendingTasks } from '@/services/home'
import type { Access } from '@/domain/authorization'
import { createCompany, createProject } from './invoice-fixtures'

/** Memes fixtures partagees que `home-money.test.ts` : `project` exige un client et un logement. */
let COMPANY: string
let PROJECT: string

const now = new Date('2026-08-10T09:00:00Z')

const OWNER: Access = { plan: 'free', role: 'owner' }
const MEMBER: Access = { plan: 'free', role: 'member' }

beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)

  // Un devis envoye il y a plus de sept jours ouvres.
  await db.insert(quote).values({
    id: randomUUID(),
    companyId: COMPANY,
    projectId: PROJECT,
    number: 'D2026-0001',
    status: 'sent',
    sentAt: new Date('2026-07-23T09:00:00Z'),
    validityDays: 90,
    totalExclTax: 100_700,
    totalTax: 0,
    totalInclTax: 100_700,
    publicToken: randomUUID(),
  })

  await db.insert(insuranceCertificate).values({
    id: randomUUID(),
    companyId: COMPANY,
    kind: 'decennale',
    status: 'validated',
    validUntil: new Date('2026-08-31T00:00:00Z'),
    storagePath: `${COMPANY}/attestation.pdf`,
  })
})

afterAll(async () => {
  await connection.end()
})

describe('la file de l accueil', () => {
  it('remonte le devis muet et l attestation qui expire', async () => {
    const tasks = await pendingTasks(COMPANY, OWNER, now)

    expect(tasks.map((t) => t.kind)).toEqual(['certificate', 'silent_quote'])
  })

  it('classe l attestation avant le devis, quelle que soit l anciennete', async () => {
    // L'attestation expire dans 21 jours, le devis attend depuis 18 : un tri
    // par date seule inverserait les deux, alors que seule la premiere coupe
    // la visibilite publique du passeport.
    const [first] = await pendingTasks(COMPANY, OWNER, now)

    expect(first.kind).toBe('certificate')
    expect(first.action).toBe('Déposer l’attestation')
    expect(first.href).toBe('/verification')
  })

  it('porte le montant du devis, pour que la ligne se lise sans l ouvrir', async () => {
    const quoteTask = (await pendingTasks(COMPANY, OWNER, now)).find((t) => t.kind === 'silent_quote')

    expect(quoteTask?.amountInclTax).toBe(100_700)
    expect(quoteTask?.title).toContain('D2026-0001')
  })

  it('ne rend aucune ligne a un compagnon', async () => {
    // Les quatre gestes exigent tous une capacite qu'il n'a pas : sa file est
    // vide, et une bande vide ne s'affiche pas.
    expect(await pendingTasks(COMPANY, MEMBER, now)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run : `pnpm vitest run tests/services/home-tasks.test.ts`
Expected : FAIL — `pendingTasks is not a function`

- [ ] **Step 3: Write the implementation**

Ajouter `isNotNull` et `desc` à l'import de `drizzle-orm` en tête du fichier, puis ajouter en fin de `src/services/home.ts` (les imports suivants remontent en tête, avec les autres) :

```ts
import { can, type Access, type Capability } from '@/domain/authorization'
import { insuranceCertificate } from '@/db/schema'
import {
  certificateIsExpiring,
  completionIsUnbilled,
  orderTasks,
  quoteNeedsFollowUp,
  type Task,
} from '@/domain/home-queue'

const DAY = 86_400_000

/** Ce que chaque nature de ligne exige. Une ligne qu'on ne peut pas traiter ne s'affiche pas. */
const REQUIRED: Record<Task['kind'], Capability> = {
  certificate: 'legal.write',
  overdue_invoice: 'payment.record',
  silent_quote: 'quote.write',
  unbilled_completion: 'invoice.issue',
}

function daysUntil(date: Date, now: Date): number {
  return Math.floor((date.getTime() - now.getTime()) / DAY)
}

function daysSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / DAY)
}

/**
 * Ce qui appelle un geste, et rien d'autre.
 *
 * Chaque ligne est conditionnee par la capacite du geste qu'elle propose : la
 * navigation et la garde lisent deja la meme table, la file la lit aussi.
 * Proposer une action que le serveur refusera est pire que ne rien proposer.
 */
export async function pendingTasks(
  companyId: string,
  access: Access,
  now: Date,
): Promise<Task[]> {
  const tasks: Task[] = []

  if (can(access, REQUIRED.certificate)) {
    /**
     * La PLUS LOINTAINE des attestations validees, et elle seule.
     *
     * Une entreprise en accumule au fil des renouvellements : toutes les
     * remonter afficherait quatre lignes pour une seule echeance, dont trois
     * deja perimees. C'est la derniere qui dit si la couverture court encore.
     */
    const [certificate] = await db
      .select({ validUntil: insuranceCertificate.validUntil })
      .from(insuranceCertificate)
      .where(
        and(
          eq(insuranceCertificate.companyId, companyId),
          eq(insuranceCertificate.status, 'validated'),
          eq(insuranceCertificate.kind, 'decennale'),
          isNotNull(insuranceCertificate.validUntil),
        ),
      )
      .orderBy(desc(insuranceCertificate.validUntil))
      .limit(1)

    const validUntil = certificate?.validUntil
    if (validUntil && certificateIsExpiring(validUntil, now)) {
      const left = daysUntil(validUntil, now)
      tasks.push({
        kind: 'certificate',
        id: `certificate-${validUntil.toISOString()}`,
        title:
          left >= 0
            ? `Votre attestation décennale expire le ${validUntil.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
            : 'Votre attestation décennale a expiré',
        detail: 'Sans elle, votre page publique cesse d’être visible',
        amountInclTax: null,
        delay: { sense: 'remaining', days: left },
        href: '/verification',
        action: 'Déposer l’attestation',
      })
    }
  }

  if (can(access, REQUIRED.silent_quote)) {
    const sent = await db
      .select({
        id: quote.id,
        number: quote.number,
        totalInclTax: quote.totalInclTax,
        sentAt: quote.sentAt,
        validityDays: quote.validityDays,
      })
      .from(quote)
      .where(and(eq(quote.companyId, companyId), eq(quote.status, 'sent'), isNotNull(quote.sentAt)))

    for (const row of sent) {
      const sentAt = row.sentAt!
      if (!quoteNeedsFollowUp({ sentAt, validityDays: row.validityDays }, now)) continue

      tasks.push({
        kind: 'silent_quote',
        id: row.id,
        title: `${row.number} · sans réponse`,
        detail: `Envoyé il y a ${daysSince(sentAt, now)} jours`,
        amountInclTax: row.totalInclTax,
        delay: { sense: 'elapsed', days: daysSince(sentAt, now) },
        href: `/devis/${row.id}`,
        action: 'Relancer',
      })
    }
  }

  const { rows, paid } = await settlements(companyId)

  if (can(access, REQUIRED.overdue_invoice)) {
    for (const row of rows) {
      if (row.type === 'credit_note') continue

      const payments = paid.filter((p) => p.invoiceId === row.id).map((p) => p.amount)
      const { withheld } = retentionState(
        { totalInclTax: row.totalInclTax, rate: row.retentionRate, receivedAt: row.receivedAt },
        now,
      )
      const settlement: Settlement = {
        totalInclTax: row.totalInclTax,
        payments,
        dueAt: row.dueAt,
        withheld,
      }

      if (paymentStatus(settlement, now) !== 'overdue') continue

      tasks.push({
        kind: 'overdue_invoice',
        id: row.id,
        title: `Facture échue`,
        detail: `Échue depuis ${daysSince(row.dueAt, now)} jours · retenue de garantie exclue`,
        amountInclTax: amountDueNow(settlement),
        delay: { sense: 'elapsed', days: daysSince(row.dueAt, now) },
        href: `/factures/${row.id}`,
        action: 'Relancer',
      })
    }
  }

  if (can(access, REQUIRED.unbilled_completion)) {
    const completed = await db
      .select({ id: quote.id, number: quote.number, totalInclTax: quote.totalInclTax, completedAt: quote.completedAt })
      .from(quote)
      .where(
        and(
          eq(quote.companyId, companyId),
          eq(quote.status, 'signed'),
          isNotNull(quote.completedAt),
          isNull(quote.supersedesQuoteId),
        ),
      )

    for (const root of completed) {
      const issued = rows
        .filter((row) => row.quoteId === root.id)
        .map((row) => ({ type: row.type, totalInclTax: row.totalInclTax }))
      const remaining = remainingToInvoice(root.totalInclTax, issued)
      const completedAt = root.completedAt!

      if (!completionIsUnbilled({ completedAt, remaining }, now)) continue

      tasks.push({
        kind: 'unbilled_completion',
        id: root.id,
        title: `${root.number} · chantier terminé, reste à facturer`,
        detail: `Terminé il y a ${daysSince(completedAt, now)} jours`,
        amountInclTax: remaining,
        delay: { sense: 'elapsed', days: daysSince(completedAt, now) },
        href: `/devis/${root.id}`,
        action: 'Facturer',
      })
    }
  }

  return orderTasks(tasks)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run : `pnpm db:reset && pnpm vitest run tests/services/home-tasks.test.ts`
Expected : PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/services/home.ts tests/services/home-tasks.test.ts
git commit -m "feat: la file ne montre que ce qu'on peut traiter"
```

---

### Task 4 : le ton `raised` du bouton

**Files:**
- Modify: `src/ui/atoms/button.tsx`
- Test: `tests/ui/button.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/ui/button.test.ts
import { describe, it, expect } from 'vitest'
import { buttonStyle } from '@/ui/atoms/button'

describe('les tons du bouton', () => {
  it('pose un bouton raised sur une surface elevee et un bord soutenu', () => {
    // Sur un ecran dense, quatre boutons a fond transparent ne se lisent plus
    // comme des commandes. Le `raised` les rend tangibles sans les assombrir.
    const style = buttonStyle('raised', 'md')

    expect(style).toContain('bg-raised')
    expect(style).toContain('border-field')
  })

  it('garde la cible tactile de 44 px', () => {
    expect(buttonStyle('raised', 'md')).toContain('min-h-11')
  })

  it('laisse la terre cuite au seul ton conversion', () => {
    // Un primaire orange a cote d'un danger rouge est une erreur de clic qui
    // coute une facture : `raised` ne doit pas rouvrir cette porte.
    expect(buttonStyle('raised', 'md')).not.toContain('conversion')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run : `pnpm vitest run tests/ui/button.test.ts`
Expected : FAIL — TypeScript refuse `'raised'`, ou l'assertion `bg-raised` échoue

- [ ] **Step 3: Write the implementation**

Dans `src/ui/atoms/button.tsx`, ajouter à la table `TONES`, après `secondary` :

```ts
  /**
   * Un bouton POSE : surface elevee, bord soutenu.
   *
   * Le `secondary` a un fond transparent, et sur un ecran dense — la file de
   * l'accueil en aligne quatre — les boutons transparents cessent de se lire
   * comme des commandes. Celui-ci le reste sans assombrir l'ecran, ce qu'un
   * primaire plein repete quatre fois ferait.
   */
  raised: 'bg-raised border border-field text-ink shadow-e1 dark:shadow-none hover:bg-rule/40',
```

- [ ] **Step 4: Run test to verify it passes**

Run : `pnpm vitest run tests/ui/button.test.ts`
Expected : PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/ui/atoms/button.tsx tests/ui/button.test.ts
git commit -m "feat: un bouton pose, pour les ecrans denses"
```

---

### Task 5 : `TaskRow`, la ligne de la file

**Files:**
- Create: `src/ui/molecules/task-row.tsx`
- Modify: `scripts/check-design-system.mjs`

- [ ] **Step 1: Ajouter l'entrée à l'inventaire**

Dans `scripts/check-design-system.mjs`, ajouter `'TaskRow'` à la fin du tableau `molecules`, et compléter le commentaire de tête de `INVENTORY` avec :

```
 * Deux entrees pour l'accueil (spec « accueil artisan » §9) :
 *
 * - `TaskRow` — une ligne echeance / objet / geste. `RailItem` porte une suite
 *   chronologique et n'a ni colonne d'action ni colonne de montant.
 * - `MoneyFlow` — la barre segmentee de l'argent en cours. Ni `DataTable`
 *   (aucune comparaison) ni `SummaryLine` (aucun total a additionner).
```

- [ ] **Step 2: Vérifier que le contrôle échoue**

Run : `pnpm check:ds`
Expected : FAIL — `TaskRow` est déclaré à l'inventaire mais aucun fichier ne l'exporte

- [ ] **Step 3: Écrire le composant**

```tsx
// src/ui/molecules/task-row.tsx
import { ButtonLink } from '@/ui/atoms/button-link'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import type { Cents } from '@/domain/money'

/**
 * Une ligne de la file d'accueil : quand, quoi, et le geste.
 *
 * Distincte de `RailItem`, qui porte une suite chronologique : celle-ci n'a
 * aucun ordre a signifier, mais une colonne d'action et une colonne de montant.
 *
 * Le carre vient de la marque, comme sur le filet — 7 px, et 9 px en terre
 * cuite quand la ligne est la plus urgente. La couleur ne porte jamais seule :
 * l'urgence est aussi dite par le libelle et par la position.
 */
export function TaskRow({
  when,
  title,
  detail,
  amountInclTax = null,
  href,
  action,
  urgent = false,
  solid = false,
}: {
  /** « 18 j », « dans 21 j ». Deja formate : la molecule ne calcule rien. */
  when: string
  title: string
  detail: string
  amountInclTax?: Cents | null
  href: string
  /** Le verbe. « Relancer », « Facturer » — jamais « Voir ». */
  action: string
  urgent?: boolean
  /**
   * Le bouton plein. **Un seul par ecran** : l'echeance dont le cout est
   * irreversible. Les autres lignes restent en `raised`.
   */
  solid?: boolean
}) {
  return (
    <li className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-x-5 gap-y-3 border-b border-rule py-5 sm:grid-cols-[4.75rem_minmax(0,1fr)_auto]">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={
            urgent ? 'size-[9px] shrink-0 bg-brand' : 'size-[7px] shrink-0 bg-ink-muted'
          }
        />
        <Text size="sm" tone={urgent ? 'soft' : 'muted'} as="span">
          {when}
        </Text>
      </div>

      <div className="min-w-0">
        <Text as="p">{title}</Text>
        <Text size="sm" tone="muted" as="p">
          {detail}
        </Text>
      </div>

      <div className="col-start-2 flex items-center gap-4 sm:col-start-3">
        {amountInclTax === null ? null : <Money cents={amountInclTax} />}
        <ButtonLink href={href} tone={solid ? 'primary' : 'raised'}>
          {action}
        </ButtonLink>
      </div>
    </li>
  )
}
```

- [ ] **Step 4: Vérifier que le contrôle passe**

Run : `pnpm check:ds && pnpm check:size`
Expected : PASS — les deux

- [ ] **Step 5: Commit**

```bash
git add src/ui/molecules/task-row.tsx scripts/check-design-system.mjs
git commit -m "feat: la ligne de file, echeance objet geste"
```

---

### Task 6 : `MoneyFlow`, la barre de l'argent

**Files:**
- Create: `src/ui/organisms/money-flow.tsx`
- Modify: `scripts/check-design-system.mjs`

- [ ] **Step 1: Ajouter l'entrée à l'inventaire**

Ajouter `'MoneyFlow'` à la fin du tableau `organisms` de `scripts/check-design-system.mjs`.

- [ ] **Step 2: Vérifier que le contrôle échoue**

Run : `pnpm check:ds`
Expected : FAIL — `MoneyFlow` déclaré, aucun fichier ne l'exporte

- [ ] **Step 3: Écrire le composant**

```tsx
// src/ui/organisms/money-flow.tsx
import Link from 'next/link'
import { Heading } from '@/ui/atoms/heading'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import type { Cents } from '@/domain/money'

/**
 * L'argent en cours, d'une seule barre.
 *
 * **Aucune carte, et c'est la decision du composant.** Trois cartes de
 * statistiques decouperaient le flux en trois faits sans rapport ; la largeur
 * de chaque segment dit ce que le chiffre seul ne dit pas — ce qui bloque se
 * voit avant d'etre lu.
 *
 * La terre cuite va au premier segment, celui qui attend un geste de l'artisan,
 * jamais a l'encaisse : l'accent designe ce qui bloque, pas ce qui est fini.
 *
 * Le retard est hachure ET rouge : la couleur seule ne porte pas l'information.
 */
export interface MoneySegment {
  label: string
  amountInclTax: Cents
  note: string
  href: string
  fill: 'brand' | 'muted' | 'late'
}

const BAR = {
  brand: 'bg-brand',
  muted: 'bg-ink-soft/45',
  late: 'bg-danger bg-[repeating-linear-gradient(-45deg,transparent_0_4px,var(--dq-hatch)_4px_8px)]',
} as const

const SWATCH = {
  brand: 'bg-brand',
  muted: 'bg-ink-soft/45',
  late: 'bg-danger',
} as const

export function MoneyFlow({
  totalInclTax,
  caption,
  segments,
}: {
  totalInclTax: Cents
  caption: string
  segments: MoneySegment[]
}) {
  const total = segments.reduce((sum, segment) => sum + segment.amountInclTax, 0)

  return (
    <section className="flex flex-col gap-8">
      <div>
        <Heading level="display" as="p">
          <Money cents={totalInclTax} emphasis="strong" testId="money-in-flight" />
        </Heading>
        <Text size="sm" tone="muted" as="p">
          {caption}
        </Text>
      </div>

      {total === 0 ? null : (
        <div className="flex h-[18px] w-full gap-0.5">
          {segments.map((segment) =>
            segment.amountInclTax === 0 ? null : (
              <Link
                key={segment.label}
                href={segment.href}
                aria-label={segment.label}
                style={{ flexGrow: segment.amountInclTax }}
                className={`rounded-badge ${BAR[segment.fill]}`}
              />
            ),
          )}
        </div>
      )}

      <div className="grid gap-10 sm:grid-cols-3">
        {segments.map((segment) => (
          <div key={segment.label} className="flex flex-col gap-2 border-t border-rule pt-4">
            <div className="flex items-center gap-2">
              <span aria-hidden className={`size-[7px] shrink-0 ${SWATCH[segment.fill]}`} />
              <Text size="sm" tone="muted" as="span">
                {segment.label}
              </Text>
            </div>
            <Money cents={segment.amountInclTax} emphasis="strong" />
            <Text size="sm" tone="muted" as="p">
              {segment.note}
            </Text>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Déclarer la variable de hachure**

Dans `src/ui/tokens.css`, ajouter `--dq-hatch: rgba(255,255,255,.5);` au bloc clair et `--dq-hatch: rgba(20,17,14,.4);` aux **deux** blocs sombres (`[data-theme='dark']` et la requête `prefers-color-scheme`). `tests/ui/tokens.test.ts` vérifie que les deux blocs sombres restent identiques — les oublier fait échouer ce test, ce qui est le comportement voulu.

- [ ] **Step 5: Vérifier**

Run : `pnpm check:ds && pnpm vitest run tests/ui/tokens.test.ts`
Expected : PASS — les deux

- [ ] **Step 6: Commit**

```bash
git add src/ui/organisms/money-flow.tsx src/ui/tokens.css scripts/check-design-system.mjs
git commit -m "feat: l'argent en cours tient dans une barre, pas trois cartes"
```

---

### Task 7 : les bandes de l'accueil

**Files:**
- Create: `src/app/_home/money.tsx`, `src/app/_home/queue.tsx`, `src/app/_home/today.tsx`, `src/app/_home/metrics.tsx`, `src/app/_home/onboarding.tsx`

Aucun test unitaire ici : ce sont des composants de présentation sans logique, couverts par le parcours de la Task 11. La logique qu'ils auraient portée vit en Task 1 et 3.

- [ ] **Step 1: La bande de l'argent**

```tsx
// src/app/_home/money.tsx
import { MoneyFlow } from '@/ui/organisms/money-flow'
import type { MoneyInFlight } from '@/services/home'

/** `MoneyBand` et non `Money` : l'atome du design system porte déjà ce nom. */
export function MoneyBand({ money, signedCount }: { money: MoneyInFlight; signedCount: number }) {
  const total = money.signedNotInvoiced + money.invoicedOnTime + money.overdue

  return (
    <MoneyFlow
      totalInclTax={total}
      caption={`signés et pas encore encaissés, sur ${signedCount} chantiers`}
      segments={[
        {
          label: 'Signé, pas encore facturé',
          amountInclTax: money.signedNotInvoiced,
          note: 'votre carnet de commandes',
          href: '/devis',
          fill: 'brand',
        },
        {
          label: 'Facturé, dans les délais',
          amountInclTax: money.invoicedOnTime,
          note: 'échéances à venir',
          href: '/factures',
          fill: 'muted',
        },
        {
          label: 'En retard de paiement',
          amountInclTax: money.overdue,
          note: 'retenue de garantie exclue',
          href: '/factures',
          fill: 'late',
        },
      ]}
    />
  )
}
```

- [ ] **Step 2: La file**

```tsx
// src/app/_home/queue.tsx
import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { TaskRow } from '@/ui/molecules/task-row'
import type { Task } from '@/domain/home-queue'

/** Au-dela, la file annonce le reste plutot que de le taire. */
const VISIBLE = 8

/**
 * Le delai se lit sur son sens, pas sur la nature de la ligne.
 *
 * Brancher sur `kind` obligerait cet écran à savoir lesquelles des quatre
 * natures comptent à rebours — un savoir qui vit déjà dans le domaine.
 */
function when(task: Task): string {
  if (task.delay.sense === 'elapsed') return `${task.delay.days} j`
  return task.delay.days >= 0 ? `dans ${task.delay.days} j` : 'expirée'
}

export function Queue({ tasks }: { tasks: Task[] }) {
  const shown = tasks.slice(0, VISIBLE)
  const hidden = tasks.length - shown.length

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-6">
        <Heading level={3} as="h2">
          Ce qui m’attend
        </Heading>
        <ButtonLink href="/devis/nouveau" tone="secondary">
          Établir un devis
        </ButtonLink>
      </div>

      <ul className="flex flex-col border-t border-rule">
        {shown.map((task, index) => (
          <TaskRow
            key={task.id}
            when={when(task)}
            title={task.title}
            detail={task.detail}
            amountInclTax={task.amountInclTax}
            href={task.href}
            action={task.action}
            urgent={index === 0}
            solid={task.kind === 'certificate'}
          />
        ))}
      </ul>

      {hidden > 0 ? (
        <Text size="sm" tone="muted" as="p">
          et {hidden} autres
        </Text>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 3: La journée**

```tsx
// src/app/_home/today.tsx
import { Card } from '@/ui/molecules/card'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'

export interface Slot {
  id: string
  time: string
  label: string
  place: string
}

/**
 * Deux jours, pas la semaine.
 *
 * Au-dela ce n'est plus une urgence mais une consultation, et l'agenda existe
 * pour ca. Une journee vide le dit — un ecran muet laisse croire a une panne.
 */
export function Today({ today, tomorrow }: { today: Slot[]; tomorrow: Slot[] }) {
  return (
    <Card>
      <div className="flex flex-col gap-4">
        <Heading level={3} as="h2">
          Aujourd’hui
        </Heading>
        <Day slots={today} />

        <Heading level={4} as="h3">
          Demain
        </Heading>
        <Day slots={tomorrow} />

        <Link href="/agenda">Ouvrir l’agenda</Link>
      </div>
    </Card>
  )
}

function Day({ slots }: { slots: Slot[] }) {
  if (slots.length === 0) {
    return (
      <Text size="sm" tone="muted" as="p">
        Rien de prévu.
      </Text>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {slots.map((slot) => (
        <li key={slot.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3">
          <Text size="sm" tone="soft" as="span">
            {slot.time}
          </Text>
          <div>
            <Text size="sm" as="p">
              {slot.label}
            </Text>
            <Text size="sm" tone="muted" as="p">
              {slot.place}
            </Text>
          </div>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Les mesures**

```tsx
// src/app/_home/metrics.tsx
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'

export interface Metric {
  label: string
  value: string
  note: string
}

/**
 * Deux bandes, jamais une.
 *
 * Deux de ces chiffres figurent sur la fiche que les clients consultent, deux
 * non. Les melanger ferait passer une mesure interne pour une mesure publique.
 */
export function Metrics({
  title,
  subtitle,
  metrics,
  detailHref,
}: {
  title: string
  subtitle?: string
  metrics: Metric[]
  detailHref?: string
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <Heading level={3} as="h2">
          {title}
        </Heading>
        {subtitle ? (
          <Text size="sm" tone="muted" as="span">
            {subtitle}
          </Text>
        ) : null}
      </div>

      <div className="grid gap-10 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex flex-col gap-2 border-t border-rule pt-4">
            <Text size="sm" tone="muted" as="p">
              {metric.label}
            </Text>
            <Heading level={2} as="p">
              {metric.value}
            </Heading>
            <Text size="sm" tone="muted" as="p">
              {metric.note}
            </Text>
          </div>
        ))}
      </div>

      {detailHref ? <Link href={detailHref}>Voir votre passeport</Link> : null}
    </section>
  )
}
```

- [ ] **Step 5: Le compte neuf**

```tsx
// src/app/_home/onboarding.tsx
import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { StepCard } from '@/ui/molecules/step-card'

/**
 * L'accueil tant qu'aucun devis n'existe.
 *
 * Un accueil complet servi a un nouvel inscrit est un mur de zeros : le pire
 * premier contact possible avec un outil. La bascule se fait sur l'existence
 * d'un devis et non sur l'achevement des trois etapes — un artisan qui a
 * etabli un devis a compris l'outil, et l'attestation reviendra d'elle-meme
 * dans la file.
 */
export function Onboarding({
  legalMentionsDone,
  certificateDone,
}: {
  legalMentionsDone: boolean
  certificateDone: boolean
}) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Heading level={1}>Trois choses, et vous êtes prêt</Heading>
        <Text tone="soft">
          Vos devis et vos factures sont gratuits à vie. Il reste à les rendre conformes.
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* `StepCard` prend ses enfants, pas une prop `description`. */}
        <StepCard step={1} title="Vos mentions obligatoires">
          {legalMentionsDone
            ? 'Renseignées. Vos devis sont conformes.'
            : 'Sans elles, un devis adressé à un particulier n’est pas conforme.'}
        </StepCard>
        <StepCard step={2} title="Votre attestation décennale">
          {certificateDone
            ? 'Déposée. Votre passeport est visible.'
            : 'Elle rend votre page publique visible par vos clients.'}
        </StepCard>
        <StepCard step={3} title="Votre premier devis">
          C’est là que tout commence.
        </StepCard>
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/devis/nouveau">Établir un devis</ButtonLink>
        {legalMentionsDone ? null : (
          <ButtonLink href="/mentions" tone="raised">
            Compléter mes mentions
          </ButtonLink>
        )}
        {certificateDone ? null : (
          <ButtonLink href="/verification" tone="raised">
            Déposer mon attestation
          </ButtonLink>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Vérifier la compilation et les tailles**

Run : `pnpm check:size && pnpm check:ds && npx tsc --noEmit`
Expected : PASS — les trois. Si `StepCard` n'accepte pas `step`/`title`/`description`, lire `src/ui/molecules/step-card.tsx` et adapter l'appel à sa signature réelle **sans modifier le composant**.

- [ ] **Step 7: Commit**

```bash
git add src/app/_home
git commit -m "feat: les cinq bandes de l'accueil, une par fichier"
```

---

### Task 8 : la composition et l'aiguillage

**Files:**
- Create: `src/app/_home/home.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: La composition par capacités**

```tsx
// src/app/_home/home.tsx
import { and, count, eq, gte, isNull, lt } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointment, insuranceCertificate, quote } from '@/db/schema'
import { can, type Access } from '@/domain/authorization'
import { moneyInFlight, pendingTasks } from '@/services/home'
import { companyMetrics } from '@/services/passport-metrics'
import { AppShell } from '@/ui/shells/app-shell'
import { Money } from './money'
import { Metrics } from './metrics'
import { Onboarding } from './onboarding'
import { Queue } from './queue'
import { Today, type Slot } from './today'

const DAY = 86_400_000

function startOfDay(date: Date): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

/**
 * `appointment` ne porte NI libelle NI adresse : il porte un `kind` et un
 * projet. L'agenda compose déjà son intitulé de la même façon — voir
 * `services/agenda-feed.ts`, qui joint `project.label`.
 */
function slotsOf(
  rows: { id: string; startsAt: Date; kind: 'visit' | 'work'; projectLabel: string }[],
): Slot[] {
  return rows.map((row) => ({
    id: row.id,
    time: row.startsAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    label: row.kind === 'visit' ? 'Visite' : 'Intervention',
    place: row.projectLabel,
  }))
}

export async function Home({
  session,
  companyName,
  now,
}: {
  session: Access & { companyId: string }
  companyName: string
  now: Date
}) {
  const [quotes] = await db
    .select({ total: count() })
    .from(quote)
    .where(eq(quote.companyId, session.companyId))

  if (quotes.total === 0) {
    const [certificate] = await db
      .select({ id: insuranceCertificate.id })
      .from(insuranceCertificate)
      .where(eq(insuranceCertificate.companyId, session.companyId))
      .limit(1)

    const [legal] = await db
      .select({ registrationNumber: company.registrationNumber })
      .from(company)
      .where(eq(company.id, session.companyId))

    return (
      <AppShell access={session} companyName={companyName}>
        <Onboarding
          legalMentionsDone={legal?.registrationNumber !== null}
          certificateDone={certificate !== undefined}
        />
      </AppShell>
    )
  }

  const today = startOfDay(now)
  const tomorrow = new Date(today.getTime() + DAY)
  const afterTomorrow = new Date(today.getTime() + 2 * DAY)

  const appointments = await db
    .select({
      id: appointment.id,
      startsAt: appointment.startsAt,
      kind: appointment.kind,
      projectLabel: project.label,
    })
    .from(appointment)
    .innerJoin(project, eq(appointment.projectId, project.id))
    .where(
      and(
        eq(appointment.companyId, session.companyId),
        eq(appointment.status, 'scheduled'),
        gte(appointment.startsAt, today),
        lt(appointment.startsAt, afterTomorrow),
      ),
    )
    .orderBy(appointment.startsAt)

  const tasks = await pendingTasks(session.companyId, session, now)

  const aside = can(session, 'agenda.manage') ? (
    <Today
      today={slotsOf(appointments.filter((a) => a.startsAt < tomorrow))}
      tomorrow={slotsOf(appointments.filter((a) => a.startsAt >= tomorrow))}
    />
  ) : undefined

  const money = can(session, 'invoice.issue') ? await moneyInFlight(session.companyId, now) : null
  const signed = await db
    .select({ total: count() })
    .from(quote)
    .where(
      and(
        eq(quote.companyId, session.companyId),
        eq(quote.status, 'signed'),
        isNull(quote.supersedesQuoteId),
      ),
    )

  // Le mois en cours, pour la bande interne.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const [issued] = await db
    .select({ total: count() })
    .from(quote)
    .where(and(eq(quote.companyId, session.companyId), gte(quote.createdAt, monthStart)))
  const [signedThisMonth] = await db
    .select({ total: count() })
    .from(quote)
    .where(and(eq(quote.companyId, session.companyId), gte(quote.signedAt, monthStart)))

  const leadTime = await companyQuoteLeadTime(session.companyId, now)

  const passport = can(session, 'passport.manage')
    ? await companyMetrics(session.companyId, now)
    : null

  /**
   * `Rate` rend `{ value, volume }`, et `value` vaut `null` sous les dix
   * observations de `MINIMUM_OBSERVATIONS`. On annonce alors ce qui manque,
   * jamais un taux fabriqué sur trop peu de chantiers.
   */
  const rate = (measure: { value: number | null; volume: number }, unit: string) =>
    measure.value === null
      ? {
          value: `Encore ${Math.max(0, 10 - measure.volume)} chantiers`,
          note: 'la mesure s’affiche à partir de 10',
        }
      : {
          value: `${measure.value} ${unit}`,
          note: `sur ${measure.volume} chantiers livrés en 12 mois`,
        }

  return (
    <AppShell access={session} companyName={companyName} aside={aside}>
      {money ? <MoneyBand money={money} signedCount={signed[0].total} /> : null}
      {tasks.length > 0 ? <Queue tasks={tasks} /> : null}

      <Metrics
        title="Votre mois"
        metrics={[
          {
            label: `Devis établis en ${now.toLocaleDateString('fr-FR', { month: 'long' })}`,
            value: String(issued.total),
            note: `dont ${signedThisMonth.total} signés`,
          },
          {
            label: 'Délai de remise après visite',
            value: leadTime.value === null ? 'Pas encore mesuré' : `${leadTime.value} j`,
            note:
              leadTime.value === null
                ? 'la mesure demande dix devis remis après visite'
                : `médiane sur ${leadTime.volume} devis remis en 12 mois`,
          },
        ]}
      />

      {passport ? (
        <Metrics
          title="Votre passeport"
          subtitle="visible par vos clients"
          detailHref="/mon-passeport"
          metrics={[
            { label: 'Délai annoncé respecté', ...rate(passport.leadTimeRespect, '%') },
            { label: 'Écart devis → facture', ...rate(passport.quoteToInvoiceGap, '%') },
          ]}
        />
      ) : null}
    </AppShell>
  )
}
```

Imports à compléter en tête du fichier : `company`, `project` depuis `@/db/schema`, et `companyQuoteLeadTime` depuis `@/services/quote-lead-time`.

- [ ] **Step 2: L'aiguillage**

Remplacer le corps de `src/app/page.tsx` :

```tsx
import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { LandingShell } from '@/ui/shells/landing-shell'
import { currentCompany } from '@/lib/session'
import { Home } from './_home/home'
import { Hero } from './_landing/pro/hero'
import { Mentions } from './_landing/pro/mentions'
import { Next } from './_landing/pro/next'
import { Passport } from './_landing/pro/passport'
import { Pricing } from './_landing/pro/pricing'
import { Principles } from './_landing/pro/principles'
import { Sequence } from './_landing/pro/sequence'
import { Steps } from './_landing/pro/steps'

export const metadata: Metadata = {
  title: "D'équerre — devis, factures et assurance vérifiée pour le bâtiment",
  description:
    'Vos devis et vos factures, gratuits à vie, conformes aux mentions obligatoires du bâtiment. Et une page publique qui prouve que votre assurance est à jour.',
  alternates: { canonical: '/' },
}

/**
 * La racine sert les deux publics.
 *
 * L'artisan membre d'une entreprise y voit son accueil ; tout autre visiteur y
 * voit la landing, inchangee. Le cout est reel — la racine passe en rendu
 * dynamique — et il est faible : la landing est faite de huit composants sans
 * aucun acces aux donnees, et rien de ce qui compte pour le referencement ne
 * change. Un artisan connecte ne doit jamais retomber sur l'argumentaire qui
 * lui a vendu le produit.
 *
 * `Steps` passe devant `Mentions` : on montre d'abord ce que l'outil fait, on
 * dit ensuite ce qu'il evite.
 */
export default async function RootPage() {
  // `currentCompany` leve `SessionError` pour les DEUX rejets — session absente
  // ou compte sans entreprise. Ici les deux mènent au même endroit : la
  // landing. Aucune redirection : un visiteur anonyme sur `/` est chez lui.
  const session = await currentCompany().catch(() => null)

  if (session) {
    const [myCompany] = await db
      .select({ legalName: company.legalName })
      .from(company)
      .where(eq(company.id, session.companyId))

    return <Home session={session} companyName={myCompany.legalName} now={new Date()} />
  }

  return (
    <LandingShell audience="pro">
      <Hero />
      <Steps />
      <Mentions />
      <Sequence />
      <Passport />
      <Principles />
      <Next />
      <Pricing />
    </LandingShell>
  )
}
```

Le composant exporté par défaut s'appelle `RootPage` et non `Home` : le nom est déjà pris par l'import de `./_home/home`.

- [ ] **Step 3: Vérifier**

Run : `npx tsc --noEmit && pnpm build`
Expected : PASS — la construction aboutit

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/_home/home.tsx
git commit -m "feat: la racine sert la landing au visiteur et l'accueil a l'artisan"
```

---

### Task 9 : les trois points d'entrée

**Files:**
- Modify: `src/domain/requester.ts`, `src/ui/molecules/app-nav-routes.ts`, `src/ui/organisms/app-header.tsx`
- Test: `tests/domain/requester.test.ts`, `tests/ui/app-nav.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/domain/requester.test.ts`, remplacer l'attente `'/devis'` par `'/'` :

```ts
it('envoie l artisan sur son accueil, et non sur sa liste de devis', () => {
  // La liste des devis faisait office d'accueil faute d'accueil. Elle redevient
  // ce qu'elle est.
  expect(resolveDestination({ hasCompany: true, hasRequester: false })).toBe('/')
})
```

Dans `tests/ui/app-nav.test.ts`, ajouter :

```ts
it('ouvre le suivi quotidien par l accueil, sans capacite requise', () => {
  const [daily] = visibleGroups({ plan: 'free', role: 'member' })

  expect(daily.entries[0]).toEqual({ href: '/', label: 'Accueil' })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run : `pnpm vitest run tests/domain/requester.test.ts tests/ui/app-nav.test.ts`
Expected : FAIL — deux assertions

- [ ] **Step 3: Appliquer les trois changements**

`src/domain/requester.ts` :

```ts
export type Destination = '/' | '/mes-logements' | '/inscription'

export function resolveDestination(input: {
  hasCompany: boolean
  hasRequester: boolean
}): Destination {
  if (input.hasCompany) return '/'
  if (input.hasRequester) return '/mes-logements'
  return '/inscription'
}
```

`src/ui/molecules/app-nav-routes.ts`, en tête du groupe *Suivi quotidien* :

```ts
      { href: '/', label: 'Accueil' },
```

`src/ui/organisms/app-header.tsx`, ligne 29 :

```tsx
        <Link href="/" className="rounded-badge" aria-label="Accueil">
```

- [ ] **Step 4: Vérifier**

Run : `pnpm vitest run tests/domain/requester.test.ts tests/ui/app-nav.test.ts`
Expected : PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/requester.ts src/ui/molecules/app-nav-routes.ts src/ui/organisms/app-header.tsx tests
git commit -m "fix: le logo « Accueil » mene enfin a un accueil"
```

---

### Task 10 : `/devis` redevient une liste

**Files:**
- Modify: `src/app/(app)/devis/page.tsx`

- [ ] **Step 1: Retirer le bloc titre d'entreprise**

Supprimer le `<div className="flex flex-col gap-1">` qui porte `<Heading level={1}>{myCompany.legalName}</Heading>` et la ligne SIRET, et le remplacer par :

```tsx
      <PageHeader title="Vos devis" />
```

Retirer alors la requête `myCompany` **sauf** ce que `AppShell` consomme (`companyName`), et le `Heading level={3}` « Vos devis » devenu redondant. Retirer les imports rendus inutiles.

- [ ] **Step 2: Vérifier**

Run : `npx tsc --noEmit && pnpm check:size`
Expected : PASS

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/devis/page.tsx"
git commit -m "refactor: la liste des devis cesse de jouer l'accueil"
```

---

### Task 11 : le parcours

**Files:**
- Create: `tests/e2e/accueil.spec.ts`

- [ ] **Step 1: Écrire le parcours**

Il n'existe **aucune aide `signIn`** : les parcours du dépôt se connectent par lien magique via `magicLinkFor`, et se donnent une entreprise via les fixtures. Ce parcours fait de même.

```ts
// tests/e2e/accueil.spec.ts
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor } from './helpers'
import { signedQuoteFor } from './fixtures'

const ARTISAN = 'accueil-e2e@test.local'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/connexion')
  await page.getByLabel('E-mail').fill(email)
  await page.getByRole('button', { name: 'Recevoir le lien' }).click()
  await expect(page.getByRole('status')).toContainText(email)
  await page.goto(await magicLinkFor(email))
}

test.describe('l accueil de l artisan', () => {
  test('sert la landing au visiteur', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Commencer' }).first()).toBeVisible()
  })

  test('sert l accueil a l artisan connecte, et le logo y ramene', async ({ page }) => {
    await clearMailbox()
    // La fixture cree l'entreprise, le chantier et un devis signe : sans devis,
    // l'accueil rendrait la mise en route, qui est un autre ecran.
    await signedQuoteFor(ARTISAN)
    await signIn(page, ARTISAN)

    // La connexion mene desormais a `/` et non plus a `/devis`.
    await expect(page).toHaveURL('/')
    await expect(page.getByTestId('money-in-flight')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Votre mois' })).toBeVisible()

    await page.goto('/devis')
    await page.getByRole('link', { name: 'Accueil' }).first().click()
    await expect(page).toHaveURL('/')
  })
})
```

`signedQuoteFor(email)` est `quoteFor(email, 'signed')` : elle crée l'entreprise rattachée à cette adresse, son chantier, son devis signé et ses lignes, et renvoie la ligne du devis. Elle ne prend pas de `page`.

- [ ] **Step 2: Lancer**

Run : `pnpm test:e2e tests/e2e/accueil.spec.ts`
Expected : PASS — 3 tests

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/accueil.spec.ts
git commit -m "test: le parcours d'accueil, des deux cotes de la connexion"
```

---

### Task 12 : la validation complète

- [ ] **Step 1: Tout lancer**

Run : `pnpm validate`
Expected : PASS — environnement, tailles, design system, isolation, construction, tests

- [ ] **Step 2: Vérifier à l'œil, dans les deux thèmes**

Ouvrir `/` connecté en clair puis en sombre. Contrôler :

- un seul bouton plein sur l'écran — l'attestation ;
- le segment en retard est hachuré **et** rouge ;
- l'`aside` passe au-dessus de la file sous 900 px ;
- aucune barre de défilement horizontale à 375 px.

- [ ] **Step 3: Commit final si des retouches ont été nécessaires**

```bash
git add -A
git commit -m "fix: les retouches de la relecture a l'ecran"
```

---

## Ce que ce plan ne fait pas

- **Aucun sélecteur de période** — l'en-cours est un stock, et la fenêtre du passeport est publique donc non négociable (spec §7).
- **Aucune notification** — le travail de fond quotidien prévient déjà.
- **Aucune action de masse** — relancer trois factures en un clic transformerait un service en publipostage.
