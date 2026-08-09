# M6·B — Le dossier de chantier · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que le client ouvre son chantier et y trouve une chronologie complète — même si son artisan n'a jamais rien publié — ses documents, et ses garanties, sans qu'aucune date légale ne soit affirmée à sa place.

**Architecture:** La chronologie est une **fonction pure** sur des faits déjà en base ; ce que l'artisan publie vient s'y intercaler. Les échéances de garantie sont une fonction pure d'une **date déclarée par le maître d'ouvrage** — sans elle, aucune date n'est rendue. Rien de dérivé n'est stocké.

**Tech Stack:** Identique. Aucune dépendance nouvelle.

> **Contraintes de l'atelier.** 250 lignes par fichier, aucune fonctionnalité n'importe d'une autre, design system obligatoire.
>
> **Déviation de format, comme aux jalons précédents.** Les écrans dont la structure existe renvoient à leurs équivalents ; le code complet est donné là où la logique est neuve.

**Références :** [spec M6 §5 et §6](../specs/2026-08-09-espace-demandeur-design.md) · [plan M6·A](2026-08-09-m6a-compte-demandeur.md) · [AIPD](../rgpd/2026-08-08-aipd-passeport.md)

---

## Décisions verrouillées

**Le fil ne peut pas être vide.** Sa colonne vertébrale est **dérivée** — devis signé, avenant, acompte demandé, acompte encaissé, situation, solde, avoir, chantier terminé. Ce que l'artisan publie s'y intercale. C'est la seule forme sous laquelle l'obligation nouvelle ne se retourne pas contre la page qu'elle devait servir : s'il ne publie rien, la page reste vraie.

**Une publication est définitive.** Ni modification, ni suppression — imposées par déclencheur, comme la facture et le journal. Un fil réécrivable ne vaudrait rien comme trace, et l'artisan doit savoir en écrivant que son client a lu. Une erreur se corrige par une publication qui la rectifie.

**Aucune date de garantie sans réception déclarée.** La réception tacite exige deux critères cumulatifs — prise de possession sans réserve **et** paiement intégral — et des réserves exprimées, même verbalement, suffisent à l'écarter. Nous connaissons le paiement ; nous ignorons le reste. Imprimer une date fausse ferait manquer un délai de forclusion.

**La réception se déclare par le maître d'ouvrage**, et **elle est visible des deux côtés**. Nous n'établissons pas la réception : nous enregistrons une déclaration sur un fait partagé, et un fait partagé ne se consigne pas en secret.

**Les photos ne sont jamais servies directement.** Dépôt privé, adresse signée à durée courte — comme les attestations de M3. Elles montrent l'intérieur du logement de quelqu'un.

**L'exclusion est portée par la requête.** Le dossier ne s'ouvre qu'au signataire du devis. Comme M3, M4, M5 et M6·A.

---

## Ce que ce plan ne fait pas, et pourquoi

**Le logement ajouté à la main sort du périmètre.** La spec le justifie par le bailleur dont tous les lots n'ont pas encore fait l'objet d'un chantier. Mais un logement sans chantier n'affiche **rien** : ni fil, ni document, ni garantie. Ce serait une adresse stockée présentée comme un service. Il prend son sens en P2, quand on pourra y déposer un projet — et la table s'écrira alors avec l'écran qui la remplit.

**Aucun pourcentage d'avancement.** C'est une situation de travaux, c'est-à-dire un document comptable : M8. Le mettre dans un fil d'actualité produirait un chiffre qui ressemble à une facture sans en être une.

**Aucun type de jalon, aucun planning.** Un message et des photos. Une taxonomie de jalons se remplirait mal et se lirait comme un engagement.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/timeline.ts` | La chronologie, dérivée puis enrichie — **pur** |
| `src/domain/guarantees.ts` | Les échéances légales, et la recevabilité d'une réception — **pur** |
| `src/db/schema/chantier.ts` | `chantier_post`, `chantier_photo` |
| `src/db/schema/quote.ts` | *(modifié)* `received_at`, `received_by` |
| `supabase/migrations/9008_chantier_photos_bucket.sql` | Dépôt privé |
| `supabase/migrations/9009_immutable_post.sql` | Publication définitive |
| `src/services/chantier-file.ts` | Le dossier assemblé — exclusion portée par la requête |
| `src/services/chantier-posts.ts` | Publier, déposer les photos, les servir |
| `src/services/reception.ts` | Déclarer la réception |
| `src/app/(espace)/mes-chantiers/[id]/**` | Le dossier, côté client |
| `src/app/(app)/devis/[id]/chantier/**` | Le même fil, côté artisan, avec le formulaire |

> **Pourquoi une route dédiée côté artisan.** `/devis/[id]` est à 238 lignes pour une limite de 250. Mais ce n'est pas la vraie raison : `/devis/[id]/chantier` montre à l'artisan **exactement ce que son client voit**, ce qu'un encart en bas de la page de devis ne dirait pas.

---

## Task 1 : La chronologie dérivée

Le cœur du jalon. Fonction pure.

**Files:**
- Create: `src/domain/timeline.ts`
- Test: `tests/domain/timeline.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/timeline.test.ts
import { describe, it, expect } from 'vitest'
import { buildTimeline, type ChantierFacts } from '@/domain/timeline'

const d = (iso: string) => new Date(iso)

const bare = (overrides: Partial<ChantierFacts> = {}): ChantierFacts => ({
  signedAt: d('2026-03-02T09:00:00Z'),
  completedAt: null,
  amendments: [],
  invoices: [],
  payments: [],
  posts: [],
  ...overrides,
})

describe('la colonne vertebrale', () => {
  it('rend une chronologie MEME quand l artisan n a rien publie', () => {
    // La decision qui porte le jalon : un fil vide afficherait « aucune
    // actualite depuis trois semaines » et degraderait la page qu'il devait
    // servir. La colonne vertebrale est derivee, elle ne depend de personne.
    const entries = buildTimeline(
      bare({
        completedAt: d('2026-04-20T17:00:00Z'),
        invoices: [
          { type: 'deposit', issuedAt: d('2026-03-03T10:00:00Z'), totalInclTax: 30000 },
          { type: 'balance', issuedAt: d('2026-04-20T17:00:00Z'), totalInclTax: 70000 },
        ],
        payments: [{ receivedAt: d('2026-03-10T00:00:00Z'), amount: 30000 }],
      }),
    )

    expect(entries.map((e) => e.kind)).toEqual([
      'quote_signed',
      'invoice_deposit',
      'payment',
      'invoice_balance',
      'completed',
    ])
  })

  it('se lit dans le sens du temps', () => {
    const entries = buildTimeline(bare({ completedAt: d('2026-04-20T17:00:00Z') }))
    expect(entries[0].kind).toBe('quote_signed')
    expect(entries.at(-1)!.kind).toBe('completed')
  })

  it('ne rend pas de fin de chantier tant qu il n est pas termine', () => {
    expect(buildTimeline(bare()).map((e) => e.kind)).toEqual(['quote_signed'])
  })

  it('porte le montant des factures et des paiements', () => {
    const entries = buildTimeline(
      bare({
        invoices: [{ type: 'progress', issuedAt: d('2026-03-15T10:00:00Z'), totalInclTax: 45000 }],
      }),
    )

    expect(entries[1]).toMatchObject({ kind: 'invoice_progress', amountInclTax: 45000 })
  })

  it('distingue l avoir des autres factures', () => {
    // Un avoir corrige : le confondre avec une facture ferait lire deux
    // demandes d'argent la ou il y en a une, puis son annulation.
    const entries = buildTimeline(
      bare({
        invoices: [
          { type: 'credit_note', issuedAt: d('2026-03-20T10:00:00Z'), totalInclTax: 45000 },
        ],
      }),
    )

    expect(entries[1].kind).toBe('invoice_credit_note')
  })

  it('numerote les avenants', () => {
    const entries = buildTimeline(
      bare({ amendments: [{ version: 2, signedAt: d('2026-03-25T10:00:00Z') }] }),
    )

    expect(entries[1]).toMatchObject({ kind: 'amendment_signed', version: 2 })
  })
})

describe('ce que l artisan publie', () => {
  it('s intercale a sa date, pas a la fin', () => {
    const entries = buildTimeline(
      bare({
        completedAt: d('2026-04-20T17:00:00Z'),
        posts: [
          { createdAt: d('2026-03-12T08:00:00Z'), body: 'Dépose terminée.', photoPaths: [] },
        ],
      }),
    )

    expect(entries.map((e) => e.kind)).toEqual(['quote_signed', 'post', 'completed'])
    expect(entries[1].body).toBe('Dépose terminée.')
  })

  it('porte ses photos', () => {
    const entries = buildTimeline(
      bare({
        posts: [{ createdAt: d('2026-03-12T08:00:00Z'), body: 'Voilà.', photoPaths: ['a/1.jpg'] }],
      }),
    )

    expect(entries[1].photoPaths).toEqual(['a/1.jpg'])
  })

  it('range deux evenements du meme instant de facon deterministe', () => {
    // Un solde emis le jour de la fin de chantier : l'ordre ne doit pas
    // dependre de l'ordre des lignes rendues par la base.
    const facts = bare({
      completedAt: d('2026-04-20T17:00:00Z'),
      invoices: [{ type: 'balance', issuedAt: d('2026-04-20T17:00:00Z'), totalInclTax: 70000 }],
    })

    expect(buildTimeline(facts).map((e) => e.kind)).toEqual(
      buildTimeline(facts).map((e) => e.kind),
    )
    expect(buildTimeline(facts).at(-1)!.kind).toBe('completed')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/domain/timeline.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "@/domain/timeline"`.

- [ ] **Step 3 : Écrire l'implémentation**

```typescript
// src/domain/timeline.ts
import type { Cents } from './money'

/**
 * La chronologie d'un chantier, vue par son client.
 *
 * **Sa colonne vertebrale est derivee** de faits que l'outil detient deja : ce
 * que l'artisan publie vient s'y intercaler, il ne la constitue pas. C'est la
 * seule forme sous laquelle une obligation nouvelle — publier — ne se retourne
 * pas contre la page qu'elle devait servir : s'il ne publie rien, la page reste
 * vraie et lisible.
 *
 * Rien n'est stocke : la chronologie se recalcule a chaque lecture, comme la
 * visibilite de M3, le classement de M4 et les metriques de M5.
 */
export type TimelineKind =
  | 'quote_signed'
  | 'amendment_signed'
  | 'invoice_deposit'
  | 'invoice_progress'
  | 'invoice_balance'
  | 'invoice_credit_note'
  | 'payment'
  | 'completed'
  | 'post'

export interface TimelineEntry {
  at: Date
  kind: TimelineKind
  amountInclTax?: Cents
  body?: string
  photoPaths?: string[]
  version?: number
}

export interface ChantierFacts {
  signedAt: Date
  completedAt: Date | null
  amendments: { version: number; signedAt: Date }[]
  invoices: {
    type: 'deposit' | 'progress' | 'balance' | 'credit_note'
    issuedAt: Date
    totalInclTax: Cents
  }[]
  payments: { receivedAt: Date; amount: Cents }[]
  posts: { createdAt: Date; body: string; photoPaths: string[] }[]
}

const INVOICE_KINDS = {
  deposit: 'invoice_deposit',
  progress: 'invoice_progress',
  balance: 'invoice_balance',
  credit_note: 'invoice_credit_note',
} as const

/**
 * A instant egal, l'ordre du recit : ce qui est demande precede ce qui est
 * encaisse, et la fin de chantier ferme toujours la journee. Sans cet ordre,
 * l'affichage dependrait de l'ordre des lignes rendues par la base.
 */
const RANK: Record<TimelineKind, number> = {
  quote_signed: 0,
  amendment_signed: 1,
  invoice_deposit: 2,
  invoice_progress: 2,
  invoice_balance: 2,
  invoice_credit_note: 2,
  payment: 3,
  post: 4,
  completed: 5,
}

export function buildTimeline(facts: ChantierFacts): TimelineEntry[] {
  const entries: TimelineEntry[] = [{ at: facts.signedAt, kind: 'quote_signed' }]

  for (const amendment of facts.amendments) {
    entries.push({ at: amendment.signedAt, kind: 'amendment_signed', version: amendment.version })
  }

  for (const invoice of facts.invoices) {
    entries.push({
      at: invoice.issuedAt,
      kind: INVOICE_KINDS[invoice.type],
      amountInclTax: invoice.totalInclTax,
    })
  }

  for (const received of facts.payments) {
    entries.push({ at: received.receivedAt, kind: 'payment', amountInclTax: received.amount })
  }

  for (const post of facts.posts) {
    entries.push({
      at: post.createdAt,
      kind: 'post',
      body: post.body,
      photoPaths: post.photoPaths,
    })
  }

  if (facts.completedAt) entries.push({ at: facts.completedAt, kind: 'completed' })

  // Dans le sens du temps : un chantier se lit en avancant.
  return entries.sort(
    (a, b) => a.at.getTime() - b.at.getTime() || RANK[a.kind] - RANK[b.kind],
  )
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
pnpm vitest run tests/domain/timeline.test.ts
```

Attendu : 9 tests verts.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/timeline.ts tests/domain/timeline.test.ts
git commit -m "feat: la chronologie du chantier, derivee avant d'etre enrichie"
```

---

## Task 2 : Les échéances de garantie

**Files:**
- Create: `src/domain/guarantees.ts`
- Test: `tests/domain/guarantees.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/guarantees.test.ts
import { describe, it, expect } from 'vitest'
import { assertReceivable, guaranteeDeadlines } from '@/domain/guarantees'

const d = (iso: string) => new Date(iso)

describe('les echeances', () => {
  it('ne rend AUCUNE date sans reception declaree', () => {
    // LA decision du jalon. La reception tacite exige deux criteres cumulatifs
    // — prise de possession sans reserve et paiement integral — et nous n'en
    // connaissons qu'un. Imprimer une date fausse ferait manquer un delai de
    // forclusion.
    expect(guaranteeDeadlines(null)).toBeNull()
  })

  it('rend les trois echeances a partir de la reception', () => {
    expect(guaranteeDeadlines(d('2026-04-20T00:00:00Z'))).toEqual([
      { key: 'perfect_completion', years: 1, article: 'article 1792-6', endsAt: d('2027-04-20T00:00:00Z') },
      { key: 'proper_function', years: 2, article: 'article 1792-3', endsAt: d('2028-04-20T00:00:00Z') },
      { key: 'decennial', years: 10, article: 'article 1792', endsAt: d('2036-04-20T00:00:00Z') },
    ])
  })

  it('gere une reception un 29 fevrier', () => {
    // 2028 est bissextile, 2029 ne l'est pas : sans precaution, la date
    // deborderait sur le 1er mars.
    const [first] = guaranteeDeadlines(d('2028-02-29T00:00:00Z'))!
    expect(first.endsAt.toISOString().slice(0, 10)).toBe('2029-02-28')
  })
})

describe('recevabilite d une declaration de reception', () => {
  const base = {
    signedAt: d('2026-03-02T00:00:00Z'),
    completedAt: d('2026-04-20T00:00:00Z'),
    declaredAt: d('2026-04-25T00:00:00Z'),
    now: d('2026-05-01T00:00:00Z'),
  }

  it('accepte une date posterieure a la fin des travaux', () => {
    expect(() => assertReceivable(base)).not.toThrow()
  })

  it('refuse tant que le chantier n est pas termine', () => {
    // On ne recoit pas des travaux qui ne sont pas finis.
    expect(() => assertReceivable({ ...base, completedAt: null })).toThrow(/terminé/)
  })

  it('refuse une date anterieure a la signature', () => {
    expect(() => assertReceivable({ ...base, declaredAt: d('2026-01-01T00:00:00Z') })).toThrow(
      /avant la signature/,
    )
  })

  it('refuse une date a venir', () => {
    // Une reception future ouvrirait des garanties qui n'ont pas commence.
    expect(() => assertReceivable({ ...base, declaredAt: d('2026-06-01T00:00:00Z') })).toThrow(
      /à venir/,
    )
  })
})
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

```bash
pnpm vitest run tests/domain/guarantees.test.ts
```

Attendu : ÉCHEC — module introuvable.

- [ ] **Step 3 : Écrire l'implémentation**

```typescript
// src/domain/guarantees.ts

/**
 * Les garanties legales de la construction, comptees depuis la RECEPTION.
 *
 * La reception est un acte juridique, et `completed_at` n'en est pas un : il
 * vaut soit declaration de l'artisan, soit emission du solde. La reception
 * tacite, elle, exige **deux criteres cumulatifs** — prise de possession sans
 * reserve et paiement integral — et des reserves exprimees, meme verbalement,
 * suffisent a l'ecarter.
 *
 * Nous connaissons le paiement. Nous ignorons la prise de possession et les
 * reserves. **Nous n'affirmons donc jamais une date que nous n'avons pas
 * constatee** : c'est le maitre d'ouvrage qui declare.
 */
export const GUARANTEES = [
  { key: 'perfect_completion', years: 1, article: 'article 1792-6' },
  { key: 'proper_function', years: 2, article: 'article 1792-3' },
  { key: 'decennial', years: 10, article: 'article 1792' },
] as const

export type GuaranteeKey = (typeof GUARANTEES)[number]['key']

export interface Deadline {
  key: GuaranteeKey
  years: number
  article: string
  endsAt: Date
}

/** Meme jour, N annees plus tard — sans deborder sur le mois suivant. */
function plusYears(from: Date, years: number): Date {
  const target = new Date(from)
  const day = target.getUTCDate()
  target.setUTCFullYear(target.getUTCFullYear() + years)
  // Un 29 fevrier reporte sur une annee non bissextile deviendrait le 1er mars.
  if (target.getUTCDate() !== day) target.setUTCDate(0)
  return target
}

/** `null` sans reception : aucune date, seulement la regle et ses conditions. */
export function guaranteeDeadlines(receivedAt: Date | null): Deadline[] | null {
  if (!receivedAt) return null

  return GUARANTEES.map((guarantee) => ({
    ...guarantee,
    endsAt: plusYears(receivedAt, guarantee.years),
  }))
}

export interface ReceivableInput {
  signedAt: Date
  completedAt: Date | null
  declaredAt: Date
  now: Date
}

export function assertReceivable(input: ReceivableInput): void {
  if (input.completedAt === null) {
    throw new Error('Ce chantier n’est pas encore terminé')
  }
  if (input.declaredAt.getTime() < input.signedAt.getTime()) {
    throw new Error('Une réception ne peut pas être antérieure à la signature du devis')
  }
  if (input.declaredAt.getTime() > input.now.getTime()) {
    throw new Error('Une réception à venir ne peut pas être déclarée')
  }
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
pnpm vitest run tests/domain/guarantees.test.ts
```

Attendu : 7 tests verts.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/guarantees.ts tests/domain/guarantees.test.ts
git commit -m "feat: les echeances de garantie, aucune date sans reception declaree"
```

---

## Task 3 : Le schéma, le dépôt et l'immuabilité

**Files:**
- Create: `src/db/schema/chantier.ts`
- Modify: `src/db/schema/index.ts`, `src/db/schema/quote.ts`
- Create: `supabase/migrations/9008_chantier_photos_bucket.sql`
- Create: `supabase/migrations/9009_immutable_post.sql`
- Test: `tests/services/post-immutability.test.ts`

- [ ] **Step 1 : Écrire le schéma**

```typescript
// src/db/schema/chantier.ts
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company } from './company'
import { quote } from './quote'

/**
 * Ce que l'artisan publie sur son chantier, a destination de son client.
 *
 * **Definitive.** Ni modification ni suppression — imposees par declencheur,
 * comme la facture et le journal. Un fil reecrivable ne vaudrait rien comme
 * trace, et l'artisan doit savoir en ecrivant que son client a lu. Une erreur
 * se corrige par une publication qui la rectifie, comme un avoir corrige une
 * facture.
 */
export const chantierPost = pgTable(
  'chantier_post',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** La RACINE de la chaine de versions, comme les factures et la fin de chantier. */
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quote.id),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('chantier_post_quote_idx').on(t.quoteId)],
)

/**
 * Les photos d'une publication.
 *
 * Elles montrent l'interieur du logement de quelqu'un : depot PRIVE, jamais
 * servi directement, et **aucune duree de conservation propre** — elles suivent
 * le sort du chantier. Leur donner une vie autonome ferait un album, c'est-a-dire
 * un autre produit.
 */
export const chantierPhoto = pgTable('chantier_photo', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => chantierPost.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const chantierPostRelations = relations(chantierPost, ({ one, many }) => ({
  quote: one(quote, { fields: [chantierPost.quoteId], references: [quote.id] }),
  photos: many(chantierPhoto),
}))

export const chantierPhotoRelations = relations(chantierPhoto, ({ one }) => ({
  post: one(chantierPost, { fields: [chantierPhoto.postId], references: [chantierPost.id] }),
}))
```

Dans `src/db/schema/quote.ts`, après `completionSource` :

```typescript
    /**
     * La reception DECLAREE par le maitre d'ouvrage.
     *
     * Distincte de `completed_at` : celle-ci constate la fin des travaux,
     * celle-la est un acte juridique qui fait courir les garanties legales.
     * Nous ne l'etablissons pas — nous enregistrons une declaration, et nous
     * la montrons **aux deux parties**, parce qu'un fait partage ne se consigne
     * pas en secret.
     */
    receivedAt: timestamp('received_at', { withTimezone: true }),
    receivedBy: uuid('received_by').references(() => requester.id),
```

Ajouter `export * from './chantier'` à `src/db/schema/index.ts`.

- [ ] **Step 2 : Le dépôt privé**

```sql
-- supabase/migrations/9008_chantier_photos_bucket.sql

-- Photos de chantier. Compartiment PRIVE : elles montrent l'interieur du
-- logement de quelqu'un. Elles sont lues par l'application avec la cle de
-- service et servies par une adresse signee a duree courte, jamais
-- directement — comme les attestations d'assurance.

INSERT INTO storage.buckets (id, name, public)
VALUES ('chantier-photos', 'chantier-photos', false)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 3 : L'immuabilité**

```sql
-- supabase/migrations/9009_immutable_post.sql

-- Une publication au fil de chantier est definitive.
--
-- L'artisan ecrit a son client : il doit savoir, en publiant, que ce qu'il
-- ecrit a ete lu et ne se reprend pas. Un fil reecrivable ne vaudrait rien
-- comme trace — et c'est la seule chose qui distingue ce fil d'une messagerie.
--
-- Une erreur se corrige par une publication qui la rectifie, comme un avoir
-- corrige une facture sans la modifier.
--
-- Les photos suivent : les detacher reviendrait a reecrire la publication.

CREATE OR REPLACE FUNCTION reject_post_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Une publication est definitive : publiez une rectification';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chantier_post_immutable
BEFORE UPDATE OR DELETE ON chantier_post
FOR EACH ROW EXECUTE FUNCTION reject_post_mutation();

CREATE TRIGGER chantier_photo_immutable
BEFORE UPDATE OR DELETE ON chantier_photo
FOR EACH ROW EXECUTE FUNCTION reject_post_mutation();
```

- [ ] **Step 4 : Générer, appliquer, vérifier**

```bash
pnpm drizzle-kit generate && pnpm supabase db reset
```

```typescript
// tests/services/post-immutability.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { chantierPost } from '@/db/schema'
import { lateChantier } from './dispute-fixtures'

/**
 * La verification porte sur des LIGNES REELLES : un `UPDATE` sur une table vide
 * ne declenche rien et passe toujours.
 */
let postId: string

beforeAll(async () => {
  const { companyId, quoteId } = await lateChantier()
  const [row] = await db
    .insert(chantierPost)
    .values({ quoteId, companyId, body: 'Dépose terminée.' })
    .returning()
  postId = row.id
})

afterAll(async () => {
  await connection.end()
})

/** Le message de PostgreSQL, pas l'enveloppe « Failed query » de Drizzle. */
async function refusalReason(work: Promise<unknown>): Promise<string> {
  try {
    await work
  } catch (e) {
    return (e as { cause?: Error }).cause?.message ?? (e as Error).message
  }
  throw new Error('Cette opération aurait dû être refusée')
}

describe('une publication est definitive', () => {
  it('refuse la modification', async () => {
    const reason = await refusalReason(
      db.update(chantierPost).set({ body: 'Autre chose.' }).where(eq(chantierPost.id, postId)),
    )
    expect(reason).toMatch(/definitive/)
  })

  it('refuse la suppression', async () => {
    const reason = await refusalReason(
      db.delete(chantierPost).where(eq(chantierPost.id, postId)),
    )
    expect(reason).toMatch(/definitive/)
  })
})
```

- [ ] **Step 5 : Lancer**

```bash
pnpm vitest run tests/services/post-immutability.test.ts
```

Attendu : 2 tests verts, refusés **pour la raison annoncée**.

- [ ] **Step 6 : Commit**

```bash
git add src/db/schema supabase/migrations tests/services/post-immutability.test.ts
git commit -m "feat: le fil de chantier, definitif et depose en prive"
```

---

## Task 4 : Le dossier assemblé

**Files:**
- Create: `src/services/chantier-file.ts`
- Test: `tests/services/chantier-file.test.ts`

- [ ] **Step 1 : Écrire le service**

```typescript
// src/services/chantier-file.ts
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import { chantierPhoto, chantierPost, company, invoice, payment, quote, signature } from '@/db/schema'
import { buildTimeline, type TimelineEntry } from '@/domain/timeline'
import { guaranteeDeadlines, type Deadline } from '@/domain/guarantees'
import { quoteVersions } from '@/services/amendments'

export interface ChantierFile {
  quoteId: string
  number: string
  companyName: string
  quoteToken: string
  committedLeadTimeDays: number | null
  completedAt: Date | null
  receivedAt: Date | null
  timeline: TimelineEntry[]
  /** `null` sans reception declaree : aucune date n'est affirmee. */
  deadlines: Deadline[] | null
  documents: { label: string; href: string }[]
}

/**
 * Le dossier d'un chantier, ouvert au SIGNATAIRE du devis.
 *
 * **L'exclusion est portee par la requete** : la jointure sur `signature` est
 * la condition d'acces, pas un filtre applique ensuite. Un ecran qui
 * l'oublierait ouvrirait le chantier d'un tiers.
 */
export async function chantierFileFor(
  requesterId: string,
  quoteId: string,
): Promise<ChantierFile | null> {
  const [row] = await db
    .select({
      id: quote.id,
      number: quote.number,
      publicToken: quote.publicToken,
      companyName: company.legalName,
      signedAt: quote.signedAt,
      completedAt: quote.completedAt,
      receivedAt: quote.receivedAt,
      committedLeadTimeDays: quote.committedLeadTimeDays,
    })
    .from(signature)
    .innerJoin(quote, eq(quote.id, signature.quoteId))
    .innerJoin(company, eq(company.id, quote.companyId))
    .where(and(eq(signature.requesterId, requesterId), eq(signature.quoteId, quoteId)))

  if (!row?.signedAt) return null

  const [versions, invoices, posts] = await Promise.all([
    quoteVersions(row.id),
    db
      .select({
        id: invoice.id,
        type: invoice.type,
        issuedAt: invoice.issuedAt,
        totalInclTax: invoice.totalInclTax,
        number: invoice.number,
        publicToken: invoice.publicToken,
      })
      .from(invoice)
      .where(eq(invoice.quoteId, row.id))
      .orderBy(asc(invoice.issuedAt)),
    db
      .select({ id: chantierPost.id, body: chantierPost.body, createdAt: chantierPost.createdAt })
      .from(chantierPost)
      .where(eq(chantierPost.quoteId, row.id))
      .orderBy(asc(chantierPost.createdAt)),
  ])

  // Bornees aux publications de CE chantier : une selection sans filtre
  // ramenerait les photos de tous les logements de la base.
  const photos = posts.length
    ? await db
        .select({ postId: chantierPhoto.postId, storagePath: chantierPhoto.storagePath })
        .from(chantierPhoto)
        .where(inArray(chantierPhoto.postId, posts.map((post) => post.id)))
    : []

  const received = await db
    .select({ receivedAt: payment.receivedAt, amount: payment.amount })
    .from(payment)
    .innerJoin(invoice, eq(invoice.id, payment.invoiceId))
    .where(eq(invoice.quoteId, row.id))

  const timeline = buildTimeline({
    signedAt: row.signedAt,
    completedAt: row.completedAt,
    // La version 1 est le devis d'origine : elle est deja la premiere entree.
    amendments: versions
      .filter((v) => v.version > 1 && v.status === 'signed')
      .map((v) => ({ version: v.version, signedAt: row.signedAt! })),
    invoices,
    payments: received,
    posts: posts.map((post) => ({
      createdAt: post.createdAt,
      body: post.body,
      photoPaths: photos.filter((p) => p.postId === post.id).map((p) => p.storagePath),
    })),
  })

  return {
    quoteId: row.id,
    number: row.number,
    companyName: row.companyName,
    quoteToken: row.publicToken,
    committedLeadTimeDays: row.committedLeadTimeDays,
    completedAt: row.completedAt,
    receivedAt: row.receivedAt,
    timeline,
    deadlines: guaranteeDeadlines(row.receivedAt),
    // Les PDF existent depuis M1 et M2 : le dossier n'en fabrique aucun, il
    // renvoie aux liens que le client a deja recus.
    documents: [
      { label: `Devis ${row.number}`, href: `/d/${row.publicToken}/pdf` },
      ...invoices.map((i) => ({ label: `Facture ${i.number}`, href: `/f/${i.publicToken}/pdf` })),
    ],
  }
}
```

> **`amendments` reprend `signedAt` de la racine** : la date de signature de l'avenant vit sur sa propre ligne, que `quoteVersions` ne rend pas. **À corriger dans la tâche** — étendre `quoteVersions` pour rendre `signedAt`, et l'utiliser ici. Un avenant daté du jour du devis d'origine serait un mensonge dans la chronologie.

- [ ] **Step 2 : Étendre `quoteVersions`**

Dans `src/services/amendments.ts`, ajouter `signedAt: quote.signedAt` à la sélection, et le champ correspondant à `QuoteVersion` dans `src/domain/quote-versions.ts`. Vérifier que les tests existants de `tests/domain/quote-versions.test.ts` et `tests/services/amendments.test.ts` passent toujours.

Puis, dans `chantier-file.ts` :

```typescript
    amendments: versions
      .filter((v) => v.version > 1 && v.status === 'signed' && v.signedAt !== null)
      .map((v) => ({ version: v.version, signedAt: v.signedAt! })),
```

- [ ] **Step 3 : Écrire les tests**

```typescript
// tests/services/chantier-file.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { chantierPost, quote, signature } from '@/db/schema'
import { chantierFileFor } from '@/services/chantier-file'
import { requesterFromSignature } from '@/services/requesters'
import { createCompany, createProject, depositLines, signedQuote } from './invoice-fixtures'
import { issueInvoice } from '@/services/invoices'

afterAll(async () => {
  await connection.end()
})

const someone = () => requesterFromSignature({ email: `p-${randomUUID()}@t.local`, name: 'Paul' })

async function signFor(companyId: string, projectId: string, requesterId: string) {
  const row = await signedQuote(companyId, projectId, 'signed')
  await db.insert(signature).values({
    quoteId: row.id,
    requesterId,
    signerName: 'Paul Martin',
    signerEmail: `s-${randomUUID().slice(0, 8)}@t.local`,
    signerPhone: '0600000000',
    codeValidatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    documentHash: 'a'.repeat(64),
    archivedPdfPath: `${companyId}/${row.id}.pdf`,
  })
  return row
}

describe('le dossier de chantier', () => {
  it('rend une chronologie MEME sans aucune publication', async () => {
    const me = await someone()
    const c = await createCompany()
    const p = await createProject(c)
    const q = await signFor(c, p, me.id)
    await issueInvoice({
      companyId: c,
      quoteId: q.id,
      type: 'deposit',
      dueInDays: 30,
      lines: depositLines(30),
    })

    const file = await chantierFileFor(me.id, q.id)

    expect(file!.timeline.map((e) => e.kind)).toEqual(['quote_signed', 'invoice_deposit'])
  })

  it('intercale ce que l artisan publie', async () => {
    const me = await someone()
    const c = await createCompany()
    const p = await createProject(c)
    const q = await signFor(c, p, me.id)
    await db.insert(chantierPost).values({ quoteId: q.id, companyId: c, body: 'Dépose faite.' })

    const file = await chantierFileFor(me.id, q.id)

    expect(file!.timeline.map((e) => e.kind)).toEqual(['quote_signed', 'post'])
    expect(file!.timeline[1].body).toBe('Dépose faite.')
  })

  it('n affiche AUCUNE date de garantie sans reception', async () => {
    const me = await someone()
    const c = await createCompany()
    const p = await createProject(c)
    const q = await signFor(c, p, me.id)

    expect((await chantierFileFor(me.id, q.id))!.deadlines).toBeNull()
  })

  it('rend les trois echeances une fois la reception declaree', async () => {
    const me = await someone()
    const c = await createCompany()
    const p = await createProject(c)
    const q = await signFor(c, p, me.id)
    await db
      .update(quote)
      .set({ completedAt: new Date(), receivedAt: new Date('2026-04-20T00:00:00Z') })
      .where(eq(quote.id, q.id))

    const file = await chantierFileFor(me.id, q.id)

    expect(file!.deadlines).toHaveLength(3)
    expect(file!.deadlines!.at(-1)!.endsAt.getUTCFullYear()).toBe(2036)
  })

  it('REFUSE le chantier d un autre signataire', async () => {
    // Le controle le plus important du jalon : la jointure sur `signature` est
    // la condition d'acces, pas un filtre d'affichage.
    const me = await someone()
    const other = await someone()
    const c = await createCompany()
    const p = await createProject(c)
    const q = await signFor(c, p, other.id)

    expect(await chantierFileFor(me.id, q.id)).toBeNull()
  })

  it('renvoie aux PDF deja produits, sans en fabriquer', async () => {
    const me = await someone()
    const c = await createCompany()
    const p = await createProject(c)
    const q = await signFor(c, p, me.id)

    const file = await chantierFileFor(me.id, q.id)

    expect(file!.documents[0].href).toMatch(/^\/d\/[A-Za-z0-9_-]+\/pdf$/)
  })
})
```

- [ ] **Step 4 : Lancer, puis vérifier que le contrôle d'accès discrimine**

```bash
pnpm vitest run tests/services/chantier-file.test.ts
```

Attendu : 6 tests verts.

Retirer temporairement `eq(signature.requesterId, requesterId)` de la clause `where` et relancer : le test « REFUSE le chantier d un autre signataire » **doit échouer**. Le remettre.

- [ ] **Step 5 : Commit**

```bash
git add src/services/chantier-file.ts src/services/amendments.ts src/domain/quote-versions.ts tests/
git commit -m "feat: le dossier de chantier, ouvert au seul signataire"
```

---

## Task 5 : Publier au fil

**Files:**
- Create: `src/services/chantier-posts.ts`
- Test: `tests/services/chantier-posts.test.ts`

- [ ] **Step 1 : Écrire le service**

```typescript
// src/services/chantier-posts.ts
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { chantierPhoto, chantierPost, quote } from '@/db/schema'
import { rootQuoteId } from '@/services/amendments'
import { recordEvent } from '@/services/events'
import { createServiceSupabase } from '@/lib/supabase-server'

/** Un message de chantier, lu par un particulier. Au-dela, c'est un rapport. */
export const MAX_POST_LENGTH = 500

/**
 * Quatre photos par publication.
 *
 * La borne n'est pas technique : sans elle le fil devient un album, c'est-a-dire
 * un autre produit — avec sa conservation, sa moderation et ses attentes.
 */
export const MAX_PHOTOS = 4

const SIGNED_URL_SECONDS = 300

export async function publishPost(input: {
  companyId: string
  quoteId: string
  body: string
  photos: File[]
}) {
  const body = input.body.trim()
  if (!body) throw new Error('Le message est vide')
  if (body.length > MAX_POST_LENGTH) {
    throw new Error(`Message trop long (${MAX_POST_LENGTH} caractères maximum)`)
  }
  if (input.photos.length > MAX_PHOTOS) {
    throw new Error(`${MAX_PHOTOS} photos au maximum par publication`)
  }

  const root = await rootQuoteId(input.quoteId)

  const [owned] = await db
    .select({ id: quote.id, signedAt: quote.signedAt })
    .from(quote)
    .where(and(eq(quote.id, root), eq(quote.companyId, input.companyId)))
  if (!owned) throw new Error('Devis introuvable')
  if (!owned.signedAt) throw new Error('Ce devis n’est pas signé')

  const [post] = await db
    .insert(chantierPost)
    .values({ quoteId: root, companyId: input.companyId, body })
    .returning()

  const storage = createServiceSupabase()

  for (const [index, photo] of input.photos.entries()) {
    const path = `${input.companyId}/${post.id}/${index}`
    const { error } = await storage.storage
      .from('chantier-photos')
      .upload(path, await photo.arrayBuffer(), { contentType: photo.type })

    if (error) throw new Error('Le dépôt de la photo a échoué')

    await db.insert(chantierPhoto).values({ postId: post.id, storagePath: path })
  }

  // Le journal porte le fait, jamais le texte : la publication est deja
  // immuable dans sa table, et l'y recopier n'ajouterait rien.
  await recordEvent({
    type: 'chantier.post_published',
    subjectType: 'quote',
    subjectId: root,
    companyId: input.companyId,
    actorType: 'company',
    payload: { photos: input.photos.length },
  })

  return post
}

/**
 * Les adresses signees des photos d'un dossier.
 *
 * **Jamais servies directement** : elles montrent l'interieur du logement de
 * quelqu'un. Duree courte, comme les attestations de M3.
 */
export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}

  const storage = createServiceSupabase()
  const { data } = await storage.storage
    .from('chantier-photos')
    .createSignedUrls(paths, SIGNED_URL_SECONDS)

  return Object.fromEntries(
    (data ?? [])
      .filter((entry) => entry.signedUrl && entry.path)
      .map((entry) => [entry.path!, entry.signedUrl]),
  )
}
```

- [ ] **Step 2 : Écrire les tests**

Reprendre la structure de `tests/services/chantier-file.test.ts`. Cas à couvrir :

```typescript
it('publie un message', ...)                          // le cas nominal
it('refuse un message vide', ...)                     // /vide/
it('refuse un message trop long', ...)                // /trop long/
it('refuse plus de quatre photos', ...)               // /photos au maximum/
it('refuse le chantier d une AUTRE entreprise', ...)  // /introuvable/
it('attache la publication a la RACINE de la chaine', ...)
```

Les deux qui ne vont pas de soi, en toutes lettres :

```typescript
const photo = () => new File([new Uint8Array([1, 2, 3])], 'p.jpg', { type: 'image/jpeg' })

it('refuse plus de quatre photos', async () => {
  const { companyId, quoteId } = await lateChantier()

  await expect(
    publishPost({ companyId, quoteId, body: 'Cinq.', photos: Array.from({ length: 5 }, photo) }),
  ).rejects.toThrow(/photos au maximum/)
})

it('attache la publication a la RACINE de la chaine', async () => {
  // Publier sur un avenant scinderait le fil en deux a la premiere version 2,
  // et le client verrait deux chantiers la ou il n'y en a qu'un.
  const { companyId, quoteId } = await lateChantier()
  const [amendment] = await db
    .insert(quote)
    .values({
      projectId: (await db.select().from(quote).where(eq(quote.id, quoteId)))[0].projectId,
      companyId,
      number: 'D2026-AVENANT',
      version: 2,
      status: 'signed',
      publicToken: randomUUID(),
      supersedesQuoteId: quoteId,
      signedAt: new Date(),
    })
    .returning()

  const post = await publishPost({ companyId, quoteId: amendment.id, body: 'Suite.', photos: [] })

  expect(post.quoteId).toBe(quoteId)
})
```

- [ ] **Step 3 : Lancer les tests**

```bash
pnpm vitest run tests/services/chantier-posts.test.ts
```

- [ ] **Step 4 : Commit**

```bash
git add src/services/chantier-posts.ts tests/services/chantier-posts.test.ts
git commit -m "feat: publier au fil de chantier, photos deposees en prive"
```

---

## Task 6 : La réception déclarée

**Files:**
- Create: `src/services/reception.ts`
- Test: `tests/services/reception.test.ts`

- [ ] **Step 1 : Écrire le service**

```typescript
// src/services/reception.ts
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote, signature } from '@/db/schema'
import { assertReceivable } from '@/domain/guarantees'
import { recordEvent } from '@/services/events'

/**
 * Le maitre d'ouvrage declare la reception de ses travaux.
 *
 * **C'est son acte, pas le notre et pas celui de l'entreprise.** Nous
 * n'etablissons pas la reception : nous enregistrons une declaration, elle fait
 * courir les garanties legales affichees, et elle est visible des deux cotes —
 * un fait partage ne se consigne pas en secret.
 *
 * Corrigible : une date erronee lui couterait un delai de forclusion, et il est
 * le seul a savoir. Chaque correction passe par le journal.
 */
export async function declareReception(input: {
  requesterId: string
  quoteId: string
  declaredAt: Date
  now: Date
}) {
  const [row] = await db
    .select({
      id: quote.id,
      companyId: quote.companyId,
      signedAt: quote.signedAt,
      completedAt: quote.completedAt,
    })
    .from(signature)
    .innerJoin(quote, eq(quote.id, signature.quoteId))
    // La condition d'acces est portee par la requete, comme partout ailleurs.
    .where(and(eq(signature.requesterId, input.requesterId), eq(signature.quoteId, input.quoteId)))

  if (!row?.signedAt) throw new Error('Chantier introuvable')

  assertReceivable({
    signedAt: row.signedAt,
    completedAt: row.completedAt,
    declaredAt: input.declaredAt,
    now: input.now,
  })

  await db
    .update(quote)
    .set({ receivedAt: input.declaredAt, receivedBy: input.requesterId })
    .where(eq(quote.id, row.id))

  await recordEvent({
    type: 'chantier.received',
    subjectType: 'quote',
    subjectId: row.id,
    companyId: row.companyId,
    actorType: 'customer',
    // Un identifiant, jamais une adresse : ce journal est ineffacable.
    actorId: input.requesterId,
    payload: { at: input.declaredAt.toISOString() },
  })
}
```

- [ ] **Step 2 : Écrire les tests**

Cas à couvrir, en réutilisant `signFor` :

```typescript
it('enregistre la reception et ouvre les garanties', ...)
it('refuse tant que le chantier n est pas termine', ...)     // /terminé/
it('refuse une date anterieure a la signature', ...)          // /avant la signature/
it('refuse une date a venir', ...)                            // /à venir/
it('REFUSE la declaration d un autre que le signataire', ...) // /introuvable/
it('se corrige, et chaque correction passe au journal', ...)
```

Le dernier, en toutes lettres — c'est celui qui dit que la déclaration appartient à son auteur :

```typescript
it('se corrige, et chaque correction passe au journal', async () => {
  // Une date erronee lui couterait un delai de forclusion, et il est le seul a
  // savoir. La corriger est son droit ; la tracer est notre devoir.
  const me = await someone()
  const c = await createCompany()
  const p = await createProject(c)
  const q = await signFor(c, p, me.id)
  await db.update(quote).set({ completedAt: new Date('2026-04-20') }).where(eq(quote.id, q.id))

  const now = new Date('2026-05-01')
  await declareReception({ requesterId: me.id, quoteId: q.id, declaredAt: new Date('2026-04-21'), now })
  await declareReception({ requesterId: me.id, quoteId: q.id, declaredAt: new Date('2026-04-22'), now })

  const [row] = await db.select().from(quote).where(eq(quote.id, q.id))
  expect(row.receivedAt!.toISOString().slice(0, 10)).toBe('2026-04-22')

  const journal = await db.select().from(event).where(eq(event.subjectId, q.id))
  expect(journal.filter((e) => e.type === 'chantier.received')).toHaveLength(2)
})
```

- [ ] **Step 3 : Lancer les tests**

```bash
pnpm vitest run tests/services/reception.test.ts
```

- [ ] **Step 4 : Commit**

```bash
git add src/services/reception.ts tests/services/reception.test.ts
git commit -m "feat: la reception declaree par le maitre d'ouvrage"
```

---

## Task 7 : Le dossier, côté client

**Files:**
- Create: `src/app/(espace)/mes-chantiers/[id]/page.tsx`
- Create: `src/app/(espace)/mes-chantiers/[id]/Timeline.tsx`
- Create: `src/app/(espace)/mes-chantiers/[id]/ReceptionForm.tsx`
- Create: `src/app/(espace)/mes-chantiers/[id]/actions.ts`
- Modify: `src/app/(espace)/mes-logements/page.tsx`

- [ ] **Step 1 : Les libellés de la chronologie**

Le domaine rend un `kind` ; l'écran le traduit. Le français vit ici parce que le libellé dépend du formatage d'un montant, qui est une affaire d'affichage.

```tsx
const LABELS: Record<TimelineKind, string> = {
  quote_signed: 'Devis signé',
  amendment_signed: 'Avenant signé',
  invoice_deposit: 'Acompte demandé',
  invoice_progress: 'Situation de travaux',
  invoice_balance: 'Solde demandé',
  invoice_credit_note: 'Avoir émis',
  payment: 'Paiement reçu',
  completed: 'Chantier terminé',
  post: '',
}
```

`Timeline` rend une `<ol>` : la date, le libellé, le montant via `Money` quand il existe, le corps du message et ses photos quand c'est une publication. `data-testid="fil"` sur la liste.

- [ ] **Step 2 : Le bloc des garanties**

Deux états, et ils ne disent pas la même chose :

**Sans réception déclarée** — aucune date, la règle et ses deux conditions :

> « Vos garanties courent à partir de la **réception des travaux**, qui est un acte de votre part : vous prenez possession de l'ouvrage sans réserve et vous avez réglé l'intégralité du prix. **Nous ne pouvons pas la constater à votre place.** Indiquez-en la date pour voir vos échéances. »

**Avec réception** — les trois échéances, chacune avec son article, et la mention que la date est déclarative :

> « Date déclarée par vos soins le {date}. Elle n'engage pas les parties : en cas de litige, c'est la réception réellement intervenue qui compte. »

- [ ] **Step 3 : Le formulaire de réception**

Sur le modèle de `CompleteButton` : `Card`, `useActionState`, `Field` + `Input type="date"`, bouton `tone="secondary"`, bloc d'erreur `role="alert"`. `data-testid="date-reception"`.

N'apparaît que si `completedAt !== null` — on ne reçoit pas des travaux inachevés, et proposer le champ avant serait promettre ce que le service refusera.

- [ ] **Step 4 : La page**

`SpaceShell`, `currentRequester()` avec la même redirection qu'en M6·A, `chantierFileFor(session.requesterId, id)` puis `notFound()` si `null`. Blocs dans l'ordre : en-tête (numéro, entreprise, délai engagé), fil, garanties, documents.

- [ ] **Step 5 : Relier depuis l'index**

Dans `src/app/(espace)/mes-logements/page.tsx`, chaque chantier devient un `Link` vers `/mes-chantiers/{quoteId}`. C'est la seule modification de M6·A.

- [ ] **Step 6 : Vérifier à l'écran, puis les garde-fous**

```bash
pnpm validate
```

- [ ] **Step 7 : Commit**

```bash
git add "src/app/(espace)"
git commit -m "feat: le dossier de chantier vu par le client"
```

---

## Task 8 : Le même fil, côté artisan

**Files:**
- Create: `src/app/(app)/devis/[id]/chantier/page.tsx`
- Create: `src/app/(app)/devis/[id]/chantier/PostForm.tsx`
- Create: `src/app/(app)/devis/[id]/chantier/actions.ts`
- Modify: `src/app/(app)/devis/[id]/page.tsx`

- [ ] **Step 1 : L'écran**

Titre : **« Ce que voit votre client »**. C'est la moitié de l'intérêt de la page — l'artisan publie mieux quand il voit la page telle qu'elle est lue.

Il faut une lecture côté entreprise du même dossier : ajouter à `src/services/chantier-file.ts` une fonction `companyChantierFile(companyId, quoteId)` qui **partage tout l'assemblage** et ne change que la condition d'accès — `eq(quote.companyId, companyId)` au lieu de la jointure sur `signature`. Extraire le corps commun plutôt que de le dupliquer : deux assemblages divergeraient, et l'artisan cesserait de voir ce que voit son client.

- [ ] **Step 2 : Le formulaire de publication**

`Textarea` + un `<input type="file" multiple accept="image/*">`, compteur sur `MAX_POST_LENGTH`, `data-testid="message-chantier"`.

Le texte doit dire ce que le geste engage :

> « Votre client reçoit cette publication dans son dossier. **Elle est définitive** : une erreur se corrige par une nouvelle publication. »

- [ ] **Step 3 : Le lien depuis la page du devis**

Un lien « Suivi de chantier » sur `/devis/[id]`, visible dès que le devis est signé. **Une ligne**, pas un encart : la page est à 238 lignes pour une limite de 250.

- [ ] **Step 4 : Vérifier à l'écran**

Publier un message avec deux photos, puis ouvrir le dossier côté client et vérifier que les photos s'affichent par une adresse signée — et qu'un accès direct au chemin de stockage échoue.

- [ ] **Step 5 : Commit**

```bash
git add "src/app/(app)/devis" src/services/chantier-file.ts
git commit -m "feat: l'artisan publie, et voit ce que voit son client"
```

---

## Task 9 : Le parcours de bout en bout

**Files:**
- Modify: `tests/e2e/space-journey.spec.ts`

- [ ] **Step 1 : Étendre le parcours de M6·A**

Après l'étape « il voit son chantier, et le nom de l'entreprise », ajouter :

```typescript
  await test.step('le dossier affiche une chronologie, sans aucune publication', async () => {
    // La decision qui porte le jalon : le fil est derive avant d'etre enrichi.
    await page.getByRole('link', { name: /devis D2026-0001/ }).click()

    await expect(page.getByTestId('fil')).toContainText('Devis signé')
  })

  await test.step('aucune date de garantie n’est affirmée', async () => {
    // La reception tacite exige deux criteres cumulatifs, et nous n'en
    // connaissons qu'un : imprimer une date ferait manquer un delai.
    await expect(page.getByTestId('garanties')).toContainText('réception des travaux')
    await expect(page.getByTestId('garanties')).not.toContainText('2036')
  })

  await test.step('l’artisan publie, et le client le voit', async () => {
    // Un contexte separe : le client reste connecte dans le sien, et les deux
    // sessions ne doivent pas se marcher dessus.
    const shop = await page.context().browser()!.newContext()
    const artisan = await shop.newPage()

    await artisan.goto('/connexion')
    await artisan.getByLabel('E-mail').fill(ARTISAN)
    await artisan.getByRole('button', { name: 'Recevoir le lien' }).click()
    await artisan.goto(await magicLinkFor(ARTISAN))

    await artisan.goto(`/devis/${quote.id}/chantier`)
    await artisan.getByTestId('message-chantier').fill('Dépose terminée, pose demain.')
    await artisan.getByRole('button', { name: 'Publier' }).click()
    await expect(artisan.getByTestId('fil')).toContainText('Dépose terminée')

    await shop.close()

    await page.reload()
    await expect(page.getByTestId('fil')).toContainText('Dépose terminée')
  })

  await test.step('le client déclare sa réception, et ses garanties s’ouvrent', async () => {
    await page.getByTestId('date-reception').fill('2026-04-20')
    await page.getByRole('button', { name: 'Enregistrer la réception' }).click()

    await expect(page.getByTestId('garanties')).toContainText('2036')
  })
```

> Le chantier doit être **terminé** pour que le formulaire de réception apparaisse : ajouter au parcours l'émission du solde par l'artisan, ou marquer la fin depuis `/devis/[id]`, avant l'étape de réception.

- [ ] **Step 2 : Lancer le parcours**

```bash
pkill -f "next dev"; pkill -f "next-server"; pnpm test:e2e
```

- [ ] **Step 3 : Vérification finale**

```bash
pnpm supabase db reset && pnpm validate && pnpm test:e2e
```

- [ ] **Step 4 : Commit**

```bash
git add tests/e2e
git commit -m "test: du fil derive a la reception declaree"
```

---

## Vérification du jalon

| Exigence de la spec | Où elle est vérifiée |
|---|---|
| Le fil ne peut pas être vide | Task 1, Task 4, Task 9 |
| Ce que l'artisan publie s'intercale à sa date | Task 1, Task 4, Task 9 |
| Une publication est définitive | Task 3 |
| Les photos ne sont jamais servies directement | Task 5, Task 8 step 4 |
| Le dossier n'est ouvert qu'au signataire | Task 4 — le test discriminant |
| Aucune date de garantie sans réception déclarée | Task 2, Task 4, Task 9 |
| La réception appartient au maître d'ouvrage | Task 6 |
| Elle est visible des deux côtés | Task 8 |
| Les documents ne sont pas refabriqués | Task 4 |

## Ce qui reste au plan C

Le répertoire d'entreprises et la reprise de contact. Le logement ajouté à la main n'y va pas non plus — voir « ce que ce plan ne fait pas ».

## Ce qui reste ouvert

- **La conservation des photos** suit le chantier, dont la fin n'a pas de durée définie. À trancher avec la purge automatique, chantier déjà listé par l'AIPD.
- **La réception déclarée n'est auditée par rien**, contrairement à la fin de chantier de M5. Si elle se révèle rarement déclarée, il faudra décider si le paiement intégral peut valoir présomption affichée — ce que le droit permet, mais sous deux conditions dont l'une nous échappe.
- **Le fil n'a aucune notification.** Le client découvre les publications en ouvrant son dossier. Prévenir par courriel à chaque publication ferait de l'artisan un émetteur de notifications, ce qu'aucune décision n'a arbitré.
