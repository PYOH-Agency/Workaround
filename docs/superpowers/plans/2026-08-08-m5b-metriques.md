# M5·B — Le calcul et le passeport privé · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que l'artisan voie son passeport se remplir, comprenne comment chaque chiffre est calculé — et puisse le contester avant que quiconque ne le voie.

**Architecture:** Les métriques sont des **fonctions pures** sur un instantané de chantiers terminés. Rien n'est stocké : elles se calculent à la lecture, comme la visibilité de M3, le reste à facturer de M2 et la file d'anomalies du backoffice. **Aucune publication publique** — voir les décisions verrouillées.

**Tech Stack:** Identique. Aucune dépendance nouvelle.

> **Contraintes de l'atelier.** 250 lignes par fichier, aucune fonctionnalité n'importe d'une autre, design system obligatoire.
>
> **Déviation de format, comme aux jalons précédents.** Les écrans dont la structure existe renvoient à leurs équivalents ; le code complet est donné là où la logique est neuve.

**Références :** [spec M5](../specs/2026-08-08-m5-metriques-design.md) · [spec P1 §9](../specs/2026-08-07-socle-artisan-design.md) · [AIPD](../rgpd/2026-08-08-aipd-passeport.md)

---

## Décisions verrouillées

**Un taux et son volume forment une seule valeur de retour.** Jamais deux champs qu'un écran pourrait dissocier. C'est la réponse au biais de sélection : le seuil empêche d'afficher un chiffre non significatif, le volume empêche de lire un chiffre significatif comme s'il était exhaustif. **Le type l'impose, pas la revue.**

**La fenêtre glissante est imposée par le code du calcul.** Les événements vivent dix ans au titre de l'obligation comptable ; la lecture ne va jamais au-delà de douze mois.

**Aucune publication.** L'article 35.9 exige l'avis des personnes concernées, et aucun artisan n'est inscrit. M5·B calcule et montre **à l'artisan seul**.

**Chaque définition publique énonce son périmètre** : les chantiers passés par l'outil, non l'activité de l'entreprise.

**L'authentifié l'emporte sur le déclaré.** Une fin déclarée compte immédiatement ; une facture de solde postérieure fait foi et déclenche le recalcul.

---

## Une correction de la spec, faite en planifiant

La spec place la fin de chantier sur `project`. **C'est le mauvais porteur.**

L'unité de mesure est le **devis signé** : c'est lui qui porte le délai engagé, la date de signature et les factures. Un projet peut porter plusieurs devis, et il n'aurait alors qu'une seule date de fin pour des chantiers distincts — la métrique de délai deviendrait inintelligible.

> **La fin de chantier se porte sur la racine de la chaîne de versions**, là où M5·A a déjà placé les factures.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/passport-metrics.ts` | Les trois métriques, fenêtre et seuils — **pur** |
| `src/db/schema/quote.ts` | *(modifié)* `completed_at`, `completion_source` |
| `src/services/completion.ts` | Déclarer la fin, l'auditer par le solde |
| `src/services/passport-metrics.ts` | Assemble l'instantané, calcule |
| `src/domain/detectors/completion.ts` | Divergence déclaré / soldé — **pur** |
| `src/app/(app)/passeport/**` | Le passeport privé |
| `src/app/passeport/definitions/page.tsx` | Les définitions publiques |

---

## Task 1 : Les trois métriques

Le cœur du jalon. Fonction pure.

**Files:**
- Create: `src/domain/passport-metrics.ts`
- Test: `tests/domain/passport-metrics.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/passport-metrics.test.ts
import { describe, it, expect } from 'vitest'
import {
  computeMetrics,
  MINIMUM_OBSERVATIONS,
  WINDOW_MONTHS,
  type CompletedChantier,
} from '@/domain/passport-metrics'

const NOW = new Date('2026-08-08T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

/** Un chantier tenu : facturé au prix du devis, fini dans les temps. */
const kept = (overrides: Partial<CompletedChantier> = {}): CompletedChantier => ({
  signedAt: daysAgo(30),
  completedAt: daysAgo(20),
  committedLeadTimeDays: 10,
  initialTotalInclTax: 100000,
  invoicedInclTax: 100000,
  ...overrides,
})

const many = (n: number, overrides: Partial<CompletedChantier> = {}) =>
  Array.from({ length: n }, () => kept(overrides))

describe('seuil d affichage', () => {
  it('exige dix observations', () => {
    expect(MINIMUM_OBSERVATIONS).toBe(10)
  })

  it('ne rend aucun taux en dessous du seuil', () => {
    // Une entreprise a trois chantiers parfaits paraitrait meilleure qu'une
    // entreprise a deux cents chantiers a 96 %.
    const metrics = computeMetrics(many(9), NOW)

    expect(metrics.quoteToInvoiceGap.value).toBeNull()
    expect(metrics.leadTimeRespect.value).toBeNull()
  })

  it('rend le volume MEME quand le taux est masque', () => {
    // C'est la reponse au biais de selection : le volume n'est jamais cache,
    // parce qu'il dit sur quoi le taux porte — ou ne porte pas.
    const metrics = computeMetrics(many(9), NOW)

    expect(metrics.quoteToInvoiceGap.volume).toBe(9)
    expect(metrics.leadTimeRespect.volume).toBe(9)
  })

  it('rend le taux des le seuil atteint', () => {
    expect(computeMetrics(many(10), NOW).quoteToInvoiceGap.value).toBe(100)
  })
})

describe('ecart devis vers facture', () => {
  it('compte un chantier facture au prix du devis comme tenu', () => {
    expect(computeMetrics(many(10), NOW).quoteToInvoiceGap.value).toBe(100)
  })

  it('compte un depassement d un seul centime comme non tenu', () => {
    // Sans tolerance : les montants sont des entiers en centimes et l'outil les
    // controle de bout en bout.
    const chantiers = [...many(9), kept({ invoicedInclTax: 100001 })]
    expect(computeMetrics(chantiers, NOW).quoteToInvoiceGap.value).toBe(90)
  })

  it('compte comme tenu un chantier facture MOINS que le devis', () => {
    const chantiers = [...many(9), kept({ invoicedInclTax: 50000 })]
    expect(computeMetrics(chantiers, NOW).quoteToInvoiceGap.value).toBe(100)
  })

  it('compare au devis INITIAL, pas au dernier avenant', () => {
    // Un artisan qui sous-devise puis rattrape par avenants doit obtenir un
    // mauvais chiffre : c'est le comportement dont le marche se plaint, et la
    // question du demandeur est « quand il annonce 1 000, combien je paie ».
    const withAmendment = kept({ initialTotalInclTax: 100000, invoicedInclTax: 200000 })
    const chantiers = [...many(9), withAmendment]

    expect(computeMetrics(chantiers, NOW).quoteToInvoiceGap.value).toBe(90)
  })
})

describe('respect du delai annonce', () => {
  it('compte en jours OUVRES, comme le devis l annonce', () => {
    // Signe un vendredi, fini le mardi suivant : deux jours ouvres, pas quatre.
    const friday = new Date('2026-08-07T10:00:00Z')
    const tuesday = new Date('2026-08-11T10:00:00Z')
    const chantiers = many(10, {
      signedAt: friday,
      completedAt: tuesday,
      committedLeadTimeDays: 2,
    })

    expect(computeMetrics(chantiers, new Date('2026-08-12T10:00:00Z')).leadTimeRespect.value).toBe(100)
  })

  it('compte comme non tenu un depassement du delai', () => {
    const late = kept({ signedAt: daysAgo(40), completedAt: daysAgo(1), committedLeadTimeDays: 5 })
    expect(computeMetrics([...many(9), late], NOW).leadTimeRespect.value).toBe(90)
  })

  it('ecarte du calcul un chantier sans delai engage', () => {
    // Sans engagement declare, il n'y a rien a comparer : le compter comme
    // tenu flatterait, le compter comme manque punirait. On ne le compte pas.
    const chantiers = [...many(10), kept({ committedLeadTimeDays: null })]
    const metrics = computeMetrics(chantiers, NOW)

    expect(metrics.leadTimeRespect.volume).toBe(10)
    expect(metrics.quoteToInvoiceGap.volume).toBe(11)
  })
})

describe('fenetre glissante', () => {
  it('porte sur douze mois', () => {
    expect(WINDOW_MONTHS).toBe(12)
  })

  it('ecarte un chantier termine hors fenetre', () => {
    const old = kept({ completedAt: daysAgo(400) })
    const metrics = computeMetrics([...many(10), old], NOW)

    expect(metrics.quoteToInvoiceGap.volume).toBe(10)
  })

  it('compte le volume total, lui, sans fenetre', () => {
    // Le total dit l'anciennete de la pratique ; la fenetre dit l'actualite.
    const metrics = computeMetrics([...many(10), kept({ completedAt: daysAgo(400) })], NOW)

    expect(metrics.completed.window).toBe(10)
    expect(metrics.completed.total).toBe(11)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/domain/passport-metrics.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/domain/passport-metrics.ts
import type { Cents } from './money'
import { businessDaysSince } from './business-days'

/**
 * Les metriques du passeport.
 *
 * Elles se calculent a la lecture, jamais ne se stockent : un chiffre stocke
 * survivrait a la correction du fait qui l'a produit.
 */
export const WINDOW_MONTHS = 12

/**
 * En deca, aucun taux n'est rendu.
 *
 * Une entreprise a trois chantiers parfaits paraitrait meilleure qu'une
 * entreprise a deux cents chantiers a 96 %.
 */
export const MINIMUM_OBSERVATIONS = 10

export interface CompletedChantier {
  signedAt: Date
  completedAt: Date
  /** En jours ouvres, comme le devis l'annonce. `null` : rien a comparer. */
  committedLeadTimeDays: number | null
  /** Le devis d'ORIGINE, avenants exclus. */
  initialTotalInclTax: Cents
  /** Le total facture, avoirs deduits, avenants compris. */
  invoicedInclTax: Cents
}

/**
 * Un taux et le volume sur lequel il porte, **indissociables**.
 *
 * C'est la reponse au biais de selection. La signature client empeche
 * d'inventer un chantier, pas d'en omettre un : l'artisan qui sort ses chantiers
 * difficiles de l'outil obtiendrait un taux exact et trompeur. Le seuil empeche
 * d'afficher un chiffre non significatif ; **le volume empeche de lire un
 * chiffre significatif comme s'il etait exhaustif**.
 *
 * Les rendre dans le meme objet fait appliquer la regle par le compilateur
 * plutot que par la revue : aucun ecran ne peut afficher l'un sans l'autre.
 */
export interface Rate {
  /** Le taux en pourcent, ou `null` sous le seuil. */
  value: number | null
  /** Le nombre d'observations. Toujours rendu, meme quand `value` est `null`. */
  volume: number
}

export interface Metrics {
  quoteToInvoiceGap: Rate
  leadTimeRespect: Rate
  completed: { window: number; total: number }
}

function rate(kept: number, total: number): Rate {
  return {
    value: total >= MINIMUM_OBSERVATIONS ? Math.round((kept / total) * 100) : null,
    volume: total,
  }
}

function withinWindow(chantier: CompletedChantier, now: Date): boolean {
  const start = new Date(now)
  start.setMonth(start.getMonth() - WINDOW_MONTHS)
  return chantier.completedAt >= start
}

export function computeMetrics(chantiers: CompletedChantier[], now: Date): Metrics {
  // La fenetre est appliquee ICI, dans le calcul. Les evenements vivent dix ans
  // au titre de l'obligation comptable ; les lire au-dela serait une faute que
  // la discipline seule n'empecherait pas.
  const recent = chantiers.filter((c) => withinWindow(c, now))

  const onBudget = recent.filter((c) => c.invoicedInclTax <= c.initialTotalInclTax)

  // Sans engagement declare, il n'y a rien a comparer : compter le chantier
  // comme tenu flatterait, le compter comme manque punirait.
  const withCommitment = recent.filter((c) => c.committedLeadTimeDays !== null)
  const onTime = withCommitment.filter(
    (c) => businessDaysSince(c.signedAt, c.completedAt) <= c.committedLeadTimeDays!,
  )

  return {
    quoteToInvoiceGap: rate(onBudget.length, recent.length),
    leadTimeRespect: rate(onTime.length, withCommitment.length),
    completed: { window: recent.length, total: chantiers.length },
  }
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/passport-metrics.test.ts`
Expected: PASS — 13 tests

- [ ] **Step 5 : Commit**

```bash
git add src/domain/passport-metrics.ts tests/domain/passport-metrics.test.ts
git commit -m "feat: les trois metriques du passeport, taux et volume indissociables"
```

---

## Task 2 : La fin de chantier

**Files:**
- Modify: `src/db/schema/quote.ts`
- Create: `src/services/completion.ts`
- Test: `tests/services/completion.test.ts`

- [ ] **Step 1 : Ajouter les colonnes**

Dans `src/db/schema/quote.ts`, à la suite de `signedAt` :

```typescript
    /**
     * Fin du chantier. Portee par la RACINE de la chaine de versions, comme les
     * factures : un projet peut porter plusieurs devis, et n'aurait alors
     * qu'une seule date pour des chantiers distincts.
     */
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /**
     * D'ou vient cette date. `invoiced` — l'emission du solde — est un acte
     * comptable ; `declared` est la parole de l'artisan. L'authentifie l'emporte
     * toujours sur le declare.
     */
    completionSource: text('completion_source', { enum: ['declared', 'invoiced'] }),
```

Run: `pnpm drizzle-kit generate && pnpm supabase db reset`

- [ ] **Step 2 : Écrire le test qui échoue**

```typescript
// tests/services/completion.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { quote } from '@/db/schema'
import { declareCompleted, recordInvoicedCompletion } from '@/services/completion'
import { createCompany, createProject, depositLines, signedQuote } from './invoice-fixtures'
import { issueInvoice } from '@/services/invoices'

let COMPANY: string
let PROJECT: string

beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)
})

afterAll(async () => {
  await connection.end()
})

const chantier = () => signedQuote(COMPANY, PROJECT, 'signed')

describe('declaration de fin de chantier', () => {
  it('inscrit la date et sa source', async () => {
    const source = await chantier()
    const done = new Date('2026-08-01T10:00:00Z')

    await declareCompleted(COMPANY, source.id, done)

    const [row] = await db.select().from(quote).where(eq(quote.id, source.id))
    expect(row.completedAt).toEqual(done)
    expect(row.completionSource).toBe('declared')
  })

  it('refuse un devis non signe', async () => {
    const draft = await signedQuote(COMPANY, PROJECT, 'sent')
    await expect(declareCompleted(COMPANY, draft.id, new Date())).rejects.toThrow('signé')
  })

  it('refuse un devis d une autre entreprise', async () => {
    const other = await createCompany()
    const source = await chantier()
    await expect(declareCompleted(other, source.id, new Date())).rejects.toThrow('introuvable')
  })
})

describe('audit par la facture de solde', () => {
  it('remplace une date declaree', async () => {
    // L'acte comptable ne se discute pas contre une declaration.
    const source = await chantier()
    await declareCompleted(COMPANY, source.id, new Date('2026-07-01T10:00:00Z'))

    await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'balance',
      dueInDays: 30,
      lines: depositLines(100),
    })

    const [row] = await db.select().from(quote).where(eq(quote.id, source.id))
    expect(row.completionSource).toBe('invoiced')
    expect(row.completedAt!.getTime()).toBeGreaterThan(new Date('2026-07-01').getTime())
  })

  it('ne bouge pas sur un acompte', async () => {
    // Seul le SOLDE constate la reception des travaux.
    const source = await chantier()
    await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'deposit',
      dueInDays: 30,
      lines: depositLines(30),
    })

    const [row] = await db.select().from(quote).where(eq(quote.id, source.id))
    expect(row.completedAt).toBeNull()
  })

  it('est idempotente', async () => {
    const source = await chantier()
    await recordInvoicedCompletion(source.id, new Date('2026-08-01T10:00:00Z'))
    await recordInvoicedCompletion(source.id, new Date('2026-08-05T10:00:00Z'))

    const [row] = await db.select().from(quote).where(eq(quote.id, source.id))
    // La premiere emission fait foi : une seconde ne reecrit pas l'histoire.
    expect(row.completedAt).toEqual(new Date('2026-08-01T10:00:00Z'))
  })
})
```

- [ ] **Step 3 : Implémenter**

```typescript
// src/services/completion.ts
import { and, eq, isNull, or } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote } from '@/db/schema'
import { referenceVersion } from '@/domain/quote-versions'
import { quoteVersions, rootQuoteId } from '@/services/amendments'
import { recordEvent } from '@/services/events'

/**
 * L'artisan declare son chantier termine.
 *
 * Une date declaree compte immediatement dans les metriques : refuser la
 * declaration penaliserait l'artisan honnete qui ne solde pas tout de suite.
 * Mais elle reste une parole — et l'emission du solde l'auditera.
 */
export async function declareCompleted(companyId: string, quoteId: string, at: Date) {
  const root = await rootQuoteId(quoteId)
  const versions = await quoteVersions(root)

  const [target] = await db
    .select()
    .from(quote)
    .where(and(eq(quote.id, root), eq(quote.companyId, companyId)))

  if (!target) throw new Error('Devis introuvable')
  if (!referenceVersion(versions)) {
    throw new Error('Un chantier ne se termine que sur un devis signé')
  }

  await db
    .update(quote)
    .set({ completedAt: at, completionSource: 'declared' })
    .where(eq(quote.id, root))

  await recordEvent({
    type: 'chantier.completed',
    subjectType: 'quote',
    subjectId: root,
    companyId,
    actorType: 'company',
    payload: { source: 'declared', at: at.toISOString() },
  })
}

/**
 * L'emission d'une facture de solde constate la reception des travaux.
 *
 * **C'est l'emission qui compte, jamais l'encaissement** : un artisan qui a
 * envoye sa facture et attend son virement a un chantier termine.
 *
 * L'authentifie l'emporte sur le declare, quelle que soit l'ampleur de l'ecart.
 * Mais une seconde emission ne reecrit pas l'histoire : la premiere fait foi.
 */
export async function recordInvoicedCompletion(rootQuoteIdValue: string, at: Date) {
  const [updated] = await db
    .update(quote)
    .set({ completedAt: at, completionSource: 'invoiced' })
    .where(
      and(
        eq(quote.id, rootQuoteIdValue),
        // Seule une fin declaree — ou aucune — se laisse ecraser. La condition
        // doit etre un predicat SQL, pas un test JavaScript : un ternaire ici
        // s'evaluerait une fois a la construction de la requete, et non ligne
        // par ligne.
        or(isNull(quote.completionSource), eq(quote.completionSource, 'declared')),
      ),
    )
    .returning()

  return updated ?? null
}
```

Le test « est idempotente » verrouille cette condition : sans elle, une seconde émission de solde réécrirait la date, et l'histoire du chantier changerait après coup.

- [ ] **Step 4 : Brancher sur l'émission du solde**

Dans `src/services/invoices.ts`, après l'insertion de la facture :

```typescript
  // Le solde constate la reception des travaux. Le calcul est isole du reste :
  // une panne ici ne doit jamais empecher l'emission d'une facture, qui est une
  // obligation legale.
  if (input.type === 'balance') {
    await recordInvoicedCompletion(root, now).catch(() => null)
  }
```

- [ ] **Step 5 : Lancer les tests**

Run: `pnpm vitest run tests/services/completion.test.ts tests/services/invoices.test.ts`
Expected: PASS — les nouveaux **et** ceux de M2

- [ ] **Step 6 : Commit**

```bash
git add src/db/schema supabase/migrations src/services tests/services/completion.test.ts
git commit -m "feat: fin de chantier, declaree puis auditee par le solde"
```

---

## Task 3 : L'assemblage

**Files:**
- Create: `src/services/passport-metrics.ts`
- Test: `tests/services/passport-metrics.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```typescript
// tests/services/passport-metrics.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { quote } from '@/db/schema'
import { companyMetrics } from '@/services/passport-metrics'
import { createCompany, createProject, depositLines, signedQuote } from './invoice-fixtures'
import { issueInvoice } from '@/services/invoices'
import { declareCompleted } from '@/services/completion'

let COMPANY: string
let PROJECT: string

/** Dix chantiers termines, dont un facture au-dela de son devis initial. */
beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)

  for (let i = 0; i < 10; i++) {
    const source = await signedQuote(COMPANY, PROJECT, 'signed')

    await issueInvoice({
      companyId: COMPANY,
      quoteId: source.id,
      type: 'balance',
      dueInDays: 30,
      lines: depositLines(100),
    })

    // Le dixieme depasse : un avenant signe porte le total, et l'on facture
    // au-dela du devis d'origine.
    if (i === 9) {
      await db
        .insert(quote)
        .values({
          projectId: PROJECT,
          companyId: COMPANY,
          number: source.number,
          version: 2,
          status: 'signed',
          totalInclTax: 201400,
          publicToken: `amend-${source.id}`,
          supersedesQuoteId: source.id,
          signedAt: new Date(),
        })
      await issueInvoice({
        companyId: COMPANY,
        quoteId: source.id,
        type: 'progress',
        dueInDays: 30,
        lines: depositLines(50),
      })
    }
  }
})

afterAll(async () => {
  await connection.end()
})

describe('metriques d une entreprise', () => {
  it('rend le taux et le volume ensemble', async () => {
    const metrics = await companyMetrics(COMPANY, new Date())

    // Neuf chantiers sur dix factures au prix du devis initial.
    expect(metrics.quoteToInvoiceGap.value).toBe(90)
    expect(metrics.quoteToInvoiceGap.volume).toBe(10)
  })

  it('ne compte pas l avenant comme un chantier de plus', async () => {
    // Un avenant est une version, pas un nouveau chantier : le compter
    // gonflerait le volume sans qu'aucun travail supplementaire ait eu lieu.
    expect((await companyMetrics(COMPANY, new Date())).completed.total).toBe(10)
  })

  it("ne compte jamais un chantier dont le devis n'est pas signe", async () => {
    // Sans signature, l'artisan saisirait son propre devis et sa propre
    // facture : la metrique serait auto-declaree.
    const unsigned = await signedQuote(COMPANY, PROJECT, 'sent')
    await db
      .update(quote)
      .set({ completedAt: new Date(), completionSource: 'declared' })
      .where(eq(quote.id, unsigned.id))

    expect((await companyMetrics(COMPANY, new Date())).completed.total).toBe(10)
  })

  it('compte un chantier declare termine sans facture de solde', async () => {
    // La declaration compte immediatement : refuser penaliserait l'artisan
    // honnete qui ne solde pas tout de suite.
    const source = await signedQuote(COMPANY, PROJECT, 'signed')
    await declareCompleted(COMPANY, source.id, new Date())

    expect((await companyMetrics(COMPANY, new Date())).completed.total).toBe(11)
  })
})
```

- [ ] **Step 2 : Implémenter**

```typescript
// src/services/passport-metrics.ts
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, quote } from '@/db/schema'
import { computeMetrics, type CompletedChantier, type Metrics } from '@/domain/passport-metrics'

/**
 * L'instantane des chantiers termines d'une entreprise, puis le calcul.
 *
 * **Les exclusions sont portees par la requete**, jamais par un filtre
 * d'affichage — comme l'exige l'AIPD pour tout ce qui est publie. Un chantier
 * n'entre que s'il est signe, termine, et racine de sa chaine de versions.
 */
export async function companyMetrics(companyId: string, now: Date): Promise<Metrics> {
  const roots = await db
    .select({
      id: quote.id,
      signedAt: quote.signedAt,
      completedAt: quote.completedAt,
      committedLeadTimeDays: quote.committedLeadTimeDays,
      initialTotalInclTax: quote.totalInclTax,
    })
    .from(quote)
    .where(
      and(
        eq(quote.companyId, companyId),
        eq(quote.status, 'signed'),
        isNotNull(quote.completedAt),
        isNotNull(quote.signedAt),
        // La racine seule : un avenant n'est pas un chantier de plus.
        isNull(quote.supersedesQuoteId),
      ),
    )

  const chantiers: CompletedChantier[] = []

  for (const root of roots) {
    const issued = await db
      .select({ type: invoice.type, totalInclTax: invoice.totalInclTax })
      .from(invoice)
      .where(eq(invoice.quoteId, root.id))

    const invoiced = issued.reduce(
      (sum, i) => (i.type === 'credit_note' ? sum - i.totalInclTax : sum + i.totalInclTax),
      0,
    )

    chantiers.push({
      signedAt: root.signedAt!,
      completedAt: root.completedAt!,
      committedLeadTimeDays: root.committedLeadTimeDays,
      initialTotalInclTax: root.initialTotalInclTax,
      invoicedInclTax: invoiced,
    })
  }

  return computeMetrics(chantiers, now)
}
```

> **Attention :** `initialTotalInclTax` lit le total de la **racine**, qui n'est pas modifié par les avenants — M5·A crée une nouvelle ligne plutôt que de toucher la précédente. C'est exactement ce que la métrique demande.

- [ ] **Step 3 : Lancer les tests et commiter**

```bash
git add src/services/passport-metrics.ts tests/services/passport-metrics.test.ts
git commit -m "feat: assemblage des metriques, exclusions portees par la requete"
```

---

## Task 4 : La divergence déclaré / soldé

**Files:**
- Create: `src/domain/detectors/completion.ts`
- Modify: `src/services/anomalies.ts`
- Test: `tests/domain/detectors/completion.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/detectors/completion.test.ts
import { describe, it, expect } from 'vitest'
import { detectCompletionDrift, type CompletionRecord } from '@/domain/detectors/completion'

const record = (overrides: Partial<CompletionRecord> = {}): CompletionRecord => ({
  quoteId: 'q1',
  companyName: 'PLOMBERIE TEST',
  declaredAt: new Date('2026-08-01'),
  invoicedAt: new Date('2026-08-03'),
  ...overrides,
})

describe('divergence entre fin declaree et solde', () => {
  it('ne signale rien en deca de sept jours', () => {
    // L'ecart s'explique par le delai normal entre la fin des travaux et
    // l'emission du solde.
    expect(detectCompletionDrift([record()])).toEqual([])
  })

  it('signale au-dela de sept jours', () => {
    const drift = record({ invoicedAt: new Date('2026-08-20') })
    const found = detectCompletionDrift([drift])

    expect(found).toHaveLength(1)
    expect(found[0].severity).toBe('signal')
  })

  it('signale aussi une declaration POSTERIEURE au solde', () => {
    // Declarer apres avoir solde n'a aucun sens : c'est un signe de saisie
    // approximative, ou de rattrapage.
    const backwards = record({ declaredAt: new Date('2026-08-20') })
    expect(detectCompletionDrift([backwards])).toHaveLength(1)
  })

  it('ignore un chantier sans declaration prealable', () => {
    expect(detectCompletionDrift([record({ declaredAt: null })])).toEqual([])
  })
})
```

- [ ] **Step 2 : Implémenter**

```typescript
// src/domain/detectors/completion.ts
import type { Anomaly } from '../anomaly'

/**
 * En deca, l'ecart s'explique par le delai normal entre la fin des travaux et
 * l'emission du solde. Au-dela, il demande un regard.
 */
const DRIFT_LIMIT_DAYS = 7

export interface CompletionRecord {
  quoteId: string
  companyName: string
  /** `null` quand aucune declaration n'a precede le solde. */
  declaredAt: Date | null
  invoicedAt: Date
}

/**
 * L'ecart entre une fin declaree et la facture de solde qui l'a auditee.
 *
 * Classe `signal` : un ecart de dates n'accuse personne, il designe un dossier
 * a regarder. C'est le meme classement que `shared_signer`, et pour la meme
 * raison — un detecteur qui crie fort sur des cas explicables finit ignore.
 */
export function detectCompletionDrift(records: CompletionRecord[]): Anomaly[] {
  return records
    .filter((r) => r.declaredAt !== null)
    .map((r) => ({ ...r, drift: Math.round((r.invoicedAt.getTime() - r.declaredAt!.getTime()) / 86_400_000) }))
    .filter((r) => Math.abs(r.drift) > DRIFT_LIMIT_DAYS)
    .map((r) => ({
      type: 'completion_drift' as const,
      severity: 'signal' as const,
      subjectId: r.quoteId,
      since: r.declaredAt!,
      detail:
        r.drift > 0
          ? `${r.companyName} a déclaré un chantier terminé ${r.drift} jours avant d’en émettre le solde`
          : `${r.companyName} a déclaré un chantier terminé ${-r.drift} jours après en avoir émis le solde`,
      href: '/supervision',
      fingerprint: `${r.quoteId}|${r.declaredAt!.toISOString()}|${r.invoicedAt.toISOString()}`,
    }))
}
```

- [ ] **Step 3 : Brancher**

Ajouter `completion_drift` au type `AnomalyType` de `src/domain/anomaly.ts`, au `enum` de `anomaly_review` — donc une migration —, et l'appel dans `currentAnomalies`.

- [ ] **Step 4 : Commit**

```bash
git add src/domain/detectors/completion.ts src/domain/anomaly.ts src/services/anomalies.ts supabase/migrations tests/domain/detectors
git commit -m "feat: detecteur de divergence entre fin declaree et solde"
```

---

## Task 5 : Le passeport privé

**Files:**
- Create: `src/app/(app)/passeport/page.tsx`, `MetricCard.tsx`
- Create: `src/app/(app)/devis/[id]/CompleteButton.tsx`
- Modify: `src/app/(app)/devis/[id]/page.tsx`, `actions.ts`

- [ ] **Step 1 : Le bouton « chantier terminé »**

Sur la fiche d'un devis signé et non terminé, un bouton avec **confirmation** — comme l'avenant et l'avoir. Le texte dit ce qui se passe :

> *« Marquer ce chantier terminé alimente votre passeport : le délai que vous aviez engagé sera comparé à cette date. Émettre la facture de solde mettra la date à jour automatiquement. »*

Un champ de date, pré-rempli à aujourd'hui — un chantier fini vendredi et déclaré lundi ne doit pas coûter deux jours.

- [ ] **Step 2 : L'écran du passeport**

`src/app/(app)/passeport/page.tsx` — garde de session comme les autres écrans de `(app)`.

**`MetricCard.tsx`** rend une `Rate`. Le composant reçoit **l'objet entier**, jamais deux propriétés séparées :

```tsx
export function MetricCard({ label, rate, definition }: { label: string; rate: Rate; definition: string }) {
  return (
    <Card elevation="e1">
      <div className="flex flex-col gap-1">
        <Text size="label" tone="muted">{label}</Text>
        {rate.value === null ? (
          <Text tone="muted">Pas encore assez de données</Text>
        ) : (
          <Heading level={2}>{rate.value} %</Heading>
        )}
        {/* Le volume est TOUJOURS rendu, y compris sous le seuil. */}
        <Text size="sm" tone="soft">sur {rate.volume} chantier{rate.volume > 1 ? 's' : ''} passé{rate.volume > 1 ? 's' : ''} par l’outil</Text>
        <Text size="sm" tone="muted">{definition}</Text>
      </div>
    </Card>
  )
}
```

En tête de l'écran, un bandeau qui dit l'essentiel :

> *« Votre passeport n'est pas encore public. Vous le voyez avant tout le monde, pour pouvoir le vérifier. »*

- [ ] **Step 3 : Vérifier le build et les garde-fous**

Run: `pnpm build && pnpm check:ds && pnpm check:size && pnpm check:isolation`

- [ ] **Step 4 : Commit**

```bash
git add src/app/\(app\)/passeport src/app/\(app\)/devis
git commit -m "feat: le passeport prive de l'artisan"
```

---

## Task 6 : Les définitions publiques

**Files:**
- Create: `src/app/passeport/definitions/page.tsx`

- [ ] **Step 1 : Écrire la page**

Page publique, sans session, sous `PublicShell`. Une section par métrique : **ce qu'elle mesure, comment elle se calcule, sur quoi elle porte, et ce qu'elle ne dit pas.**

L'AIPD l'exige : *un chiffre dont on ignore la règle de calcul est incontestable, donc arbitraire — et un droit de rectification qu'on ne peut pas exercer faute de comprendre le calcul n'est pas un droit.*

Chaque définition porte la mention de périmètre, qui n'est pas une précaution mais une correction :

> **Ces chiffres portent sur les chantiers passés par cet outil, pas sur l'activité de l'entreprise.** Un artisan peut travailler par ailleurs sans que rien n'apparaisse ici.

Et le seuil est expliqué, pas subi : *« En dessous de dix chantiers, aucun taux n'est affiché — trois chantiers parfaits ne disent rien de plus que trois chantiers. »*

- [ ] **Step 2 : Relier depuis le passeport privé**

Un lien depuis chaque carte de métrique.

- [ ] **Step 3 : Commit**

```bash
git add src/app/passeport
git commit -m "feat: definitions publiques des metriques, avec leur perimetre"
```

---

## Task 7 : Le parcours de bout en bout

**Files:**
- Modify: `tests/e2e/invoice-journey.spec.ts`

- [ ] **Step 1 : Étendre le parcours**

Après l'avenant de M5·A, deux étapes :

```typescript
  await test.step('le solde marque le chantier terminé', async () => {
    await page.goto('/passeport')
    await expect(page.getByTestId('volume-chantiers')).toContainText('1')
  })

  await test.step('aucun taux sous le seuil, mais le volume est là', async () => {
    // La reponse au biais de selection, vue de l'artisan : on ne lui cache pas
    // sur quoi le calcul porte, meme quand il ne porte sur rien encore.
    await expect(page.getByTestId('taux-ecart')).toContainText('Pas encore assez de données')
    await expect(page.getByTestId('taux-ecart')).toContainText('1 chantier')
  })
```

- [ ] **Step 2 : Lancer les parcours et la suite complète**

Run: `pnpm test:e2e && pnpm supabase db reset && pnpm validate`
Expected: tout passe

- [ ] **Step 3 : Commit**

```bash
git add tests/e2e
git commit -m "test: le passeport prive se remplit apres le solde"
```

---

## Ce que le plan B ne fait pas

- **Aucune publication.** L'article 35.9 exige l'avis des personnes concernées, et aucun artisan n'est inscrit. La bascule vers le public sera un geste explicite, après l'information du client sur son rôle de témoin et le recueil de ces avis.
- **Aucune contestation.** C'est le plan C.
- **Aucune métrique dépendant de l'agenda** — présence aux rendez-vous, délai de remise du devis. M7.
- **Aucun classement de l'annuaire par métrique.** C'est le moment où le passeport devient une monnaie : ça mérite d'être décidé seul, pas en passant.
- **Aucune détection indirecte du biais de sélection** — par incohérence entre volume déclaré, ancienneté et effectif. La spec produit la mentionne comme ouverte ; elle demande des données qu'on n'a pas encore.
