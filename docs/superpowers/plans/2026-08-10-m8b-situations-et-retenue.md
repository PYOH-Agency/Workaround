# M8·B — Les situations et la retenue · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qu'un chantier long se facture à l'avancement ligne par ligne, et qu'une somme légalement retenue cesse d'être comptée comme un impayé.

**Architecture:** Deux fonctions pures neuves. La **retenue** est un état dérivé — montant, date de libération, part encore retenue — recalculé à chaque lecture depuis le taux figé sur la facture et la réception déclarée en M6·B. La **situation** déclare un avancement *cumulé* par ligne du devis ; le montant facturé est la différence entre ce cumul et ce qui a déjà été facturé, jamais un delta stocké.

**Tech Stack:** Identique. Aucune dépendance nouvelle.

> **Contraintes de l'atelier.** 250 lignes par fichier, aucune fonctionnalité n'importe d'une autre, design system obligatoire.
>
> **Déviation de format, comme aux jalons précédents.** Le code complet est donné pour le domaine et les services ; les écrans dont la structure existe sont décrits et renvoient à leurs équivalents.
>
> **Migrations :** `supabase/MIGRATIONS.md` — les `0xxx_` sont générés par Drizzle et ne se renomment jamais, les `9xxx_` s'écrivent à la main.

**Références :** [spec M8 §4](../specs/2026-08-10-offre-payante-design.md) · [plan M8·A](2026-08-10-m8a-plan-et-equipe.md) · [plan M6·B](2026-08-09-m6b-dossier-chantier.md)

---

## L'ordre d'exécution, et pourquoi il s'inverse

Le titre dit « les situations et la retenue » ; **on livre la retenue d'abord**, pour deux raisons :

1. Elle modifie `paymentStatus`, que trois écrans lisent. Le faire après les situations obligerait à rouvrir l'écran de facture deux fois.
2. C'est la partie où une erreur coûte de l'argent à quelqu'un. Elle passe en premier, pendant qu'on a la tête claire.

---

## Décisions verrouillées

**Une somme retenue n'est pas un impayé.** C'est la décision structurante du jalon, et elle vit dans une seule ligne de `paymentStatus` : le test de la retenue est examiné **avant** celui du retard.

**Le taux est stipulé au devis, et figé sur la facture.** Comme `latePaymentRate` et `recoveryIndemnity` depuis M2 : une facture est immuable, ses mentions aussi. Un artisan qui change son taux demain ne doit pas modifier une facture déjà remise.

**Nous ne consignons rien**, et les deux écrans le disent. La loi met la consignation à la charge du maître d'ouvrage, auprès d'un tiers convenu. Laisser croire que nous tenons les fonds serait un mensonge coûteux.

**La retenue n'est PAS derrière la porte Pro.** La spec ne liste que trois fonctions payantes — équipe, situations, relances. Faire payer une protection légale serait indéfendable.

**Sans réception déclarée, la retenue reste retenue.** Nous ne connaissons pas la date de libération, donc nous ne la réclamons pas. C'est un blocage réel, et l'écran le **montre** au lieu de le masquer.

**Une situation déclare un cumul, pas un delta.** Le montant facturé est `cumul déclaré − déjà facturé`. C'est ainsi que fonctionne une situation de travaux réelle, et cela survit aux avenants sans arithmétique de rattrapage.

**Aucun montant n'est stocké dans `situation`.** Les pourcentages, oui — ils sont la déclaration de l'artisan. Les euros, jamais : ils se recalculent.

---

## Deux choix de mise en œuvre qui méritent d'être dits

### La date de libération est celle de la garantie de parfait achèvement

La retenue se libère un an après la réception (loi n° 71-584). La garantie de parfait achèvement dure un an après la réception (art. 1792-6). **Ce n'est pas une coïncidence** : la retenue existe pour couvrir cette garantie-là.

> **Décision.** `releaseDate` dérive de `guaranteeDeadlines` plutôt que de refaire l'arithmétique calendaire. Une seule fonction sait ajouter un an à une date, et le 29 février n'a qu'un seul comportement dans tout le produit.

### Le report des pourcentages d'une situation à l'autre est un confort de saisie, pas une source d'argent

Après un avenant, les lignes du devis sont de **nouvelles lignes**, avec de nouveaux identifiants : le report des pourcentages précédents ne les retrouve pas et affiche 0.

Cela ne coûte pas un euro. Le montant facturé ne dépend que de deux choses : le **cumul déclaré sur la version qui fait foi**, et **ce qui a déjà été facturé** — lu depuis les factures elles-mêmes, qui sont immuables.

> Un report faux coûte une ressaisie. Il ne peut pas produire une facture fausse.

C'est ce qui permet de garder le modèle simple : pas d'identité de ligne stable entre versions, pas de recopie de pourcentages à la création d'un avenant.

**Corollaire, qui est le comportement attendu :** un acompte déjà émis se **déduit** de la première situation, puisque la soustraction porte sur tout ce qui a été facturé. C'est exactement la pratique du bâtiment — l'acompte est une avance sur le marché, pas un supplément.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/retention.ts` | Montant retenu, date de libération, part encore retenue — **pur** |
| `src/domain/payment-status.ts` | *(modifié)* `withheld` entre dans le statut |
| `src/domain/situation.ts` | Recevabilité d'un avancement, cumul par taux — **pur** |
| `src/domain/invoice-balance.ts` | *(modifié)* `ratedLines`, remontée depuis les actions |
| `src/domain/authorization.ts` | *(modifié)* `situation.issue` |
| `src/db/schema/quote.ts` | *(modifié)* `quote.retention_rate` |
| `src/db/schema/invoice.ts` | *(modifié)* `invoice.retention_rate` |
| `src/db/schema/situation.ts` | `situation`, `situation_line` |
| `src/services/quote-edit.ts` | *(modifié)* le taux se stipule au brouillon |
| `src/services/invoices.ts` | *(modifié)* le taux se fige à l'émission |
| `src/services/retention.ts` | L'état de la retenue d'une facture |
| `src/services/situations.ts` | Établir une situation, lire la précédente |
| `src/app/(app)/devis/[id]/situation/**` | L'écran de saisie |
| `src/ui/molecules/status-badge.tsx` | *(modifié)* `withheld` |
| `src/pdf/quote-pdf.tsx` · `src/pdf/invoice-pdf.tsx` | *(modifiés)* la mention imprimée |

---

## Task 1 : Le domaine de la retenue

Fonction pure.

**Files:**
- Create: `src/domain/retention.ts`
- Test: `tests/domain/retention.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/retention.test.ts
import { describe, it, expect } from 'vitest'
import {
  MAX_RETENTION_RATE,
  assertRetentionRate,
  releaseDate,
  retainedAmount,
  retentionState,
} from '@/domain/retention'

const RECEIVED = new Date('2026-03-15T00:00:00Z')

describe('le taux', () => {
  it('accepte l absence de retenue', () => {
    // Elle est FACULTATIVE : « peuvent etre amputes », dit la loi. Zero par
    // defaut, et jamais autrement.
    expect(() => assertRetentionRate(0)).not.toThrow()
  })

  it('accepte le plafond legal', () => {
    expect(MAX_RETENTION_RATE).toBe(5)
    expect(() => assertRetentionRate(5)).not.toThrow()
  })

  it('REFUSE au-dela de 5 %', () => {
    // Depasser le plafond priverait l'artisan d'une part de son chantier que le
    // client n'avait pas le droit de retenir.
    expect(() => assertRetentionRate(6)).toThrow(/5 %/)
    expect(() => assertRetentionRate(10)).toThrow(/71-584/)
  })

  it('refuse un taux negatif ou fractionnaire', () => {
    expect(() => assertRetentionRate(-1)).toThrow()
    expect(() => assertRetentionRate(2.5)).toThrow()
  })
})

describe('le montant retenu', () => {
  it('vaut le pourcentage du TTC', () => {
    // « 5 p. 100 de leur montant » : le montant des paiements, donc le TTC.
    expect(retainedAmount(100_700, 5)).toBe(5_035)
  })

  it('vaut zero sans retenue stipulee', () => {
    expect(retainedAmount(100_700, 0)).toBe(0)
  })

  it('s arrondit au centime, jamais en flottant', () => {
    expect(retainedAmount(333, 5)).toBe(17)
  })
})

describe('la date de liberation', () => {
  it('tombe un an apres la reception', () => {
    expect(releaseDate(RECEIVED)).toEqual(new Date('2027-03-15T00:00:00Z'))
  })

  it('est INCONNUE sans reception declaree', () => {
    // Nous n'etablissons pas la reception : nous enregistrons une declaration.
    // Sans elle, aucune date — et surtout pas une date inventee.
    expect(releaseDate(null)).toBeNull()
  })

  it('coincide avec la garantie de parfait achevement', () => {
    // Ce n'est pas une coincidence : la retenue existe pour la couvrir.
    expect(releaseDate(new Date('2028-02-29T00:00:00Z'))).toEqual(
      new Date('2029-02-28T00:00:00Z'),
    )
  })
})

describe('l etat de la retenue', () => {
  const invoice = { totalInclTax: 100_700, rate: 5, receivedAt: RECEIVED }

  it('retient tant que l annee n est pas ecoulee', () => {
    const state = retentionState(invoice, new Date('2027-03-14T12:00:00Z'))

    expect(state.amount).toBe(5_035)
    expect(state.withheld).toBe(5_035)
    expect(state.releasesOn).toEqual(new Date('2027-03-15T00:00:00Z'))
  })

  it('libere le jour dit', () => {
    expect(retentionState(invoice, new Date('2027-03-15T00:00:00Z')).withheld).toBe(0)
  })

  it('RETIENT indefiniment sans reception declaree', () => {
    // Un blocage reel, et assume : nous ne connaissons pas la date, donc nous
    // ne reclamons pas la somme. L'ecran le MONTRE au lieu de le masquer.
    const state = retentionState({ ...invoice, receivedAt: null }, new Date('2099-01-01'))

    expect(state.amount).toBe(5_035)
    expect(state.withheld).toBe(5_035)
    expect(state.releasesOn).toBeNull()
  })

  it('ne retient rien quand aucune retenue n est stipulee', () => {
    const state = retentionState({ ...invoice, rate: 0, receivedAt: null }, new Date('2026-01-01'))

    expect(state.amount).toBe(0)
    expect(state.withheld).toBe(0)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/domain/retention.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "@/domain/retention"`.

- [ ] **Step 3 : Écrire le module**

```typescript
// src/domain/retention.ts
import { guaranteeDeadlines } from './guarantees'
import type { Cents } from './money'

/**
 * La retenue de garantie — loi n° 71-584 du 16 juillet 1971.
 *
 * Quatre regles, verifiees dans le texte parce qu'une erreur ici priverait un
 * artisan de 5 % de son chantier, ou ferait chasser un client pour une somme
 * qu'il a le droit de garder :
 *
 * 1. Elle est **facultative et contractuelle** — « peuvent etre amputes ». Elle
 *    se stipule au devis, jamais par defaut.
 * 2. **5 % au plus** des acomptes.
 * 3. Le maitre d'ouvrage **doit consigner** les sommes aupres d'un tiers.
 *    **Nous ne consignons rien**, et les ecrans le disent.
 * 4. Elle est liberee **un an apres la reception**, sauf opposition motivee.
 *
 * **Une somme retenue n'est pas un impaye.** C'est la consequence qui compte
 * pour le produit : elle sort du montant exigible et n'entre dans aucune
 * relance.
 */

export const MAX_RETENTION_RATE = 5

/** Le taux stipule, en points de pourcentage entiers. `0` = aucune retenue. */
export function assertRetentionRate(rate: number): void {
  if (!Number.isInteger(rate) || rate < 0 || rate > MAX_RETENTION_RATE) {
    throw new Error(
      `La retenue de garantie est facultative et plafonnée à ${MAX_RETENTION_RATE} % (loi n° 71-584).`,
    )
  }
}

/**
 * « 5 p. 100 de leur montant », dit la loi des paiements d'acomptes : le
 * montant PAYE, donc le TTC. Prendre le HT retiendrait moins que ce que le
 * client est en droit de retenir, et l'ecart se decouvrirait a la fin.
 */
export function retainedAmount(totalInclTax: Cents, rate: number): Cents {
  return Math.round((totalInclTax * rate) / 100)
}

/**
 * Le jour ou la somme retenue devient exigible.
 *
 * Derive de `guaranteeDeadlines` plutot que de refaire l'arithmetique
 * calendaire : la retenue se libere au terme de la garantie de parfait
 * achevement, et ce n'est pas une coincidence — elle existe pour la couvrir.
 * Une seule fonction du produit sait ajouter un an a une date, et le 29 fevrier
 * n'y a qu'un seul comportement.
 *
 * `null` sans reception declaree : nous n'etablissons pas la reception, nous
 * enregistrons une declaration. Sans elle, aucune date — et surtout pas une
 * date inventee.
 */
export function releaseDate(receivedAt: Date | null): Date | null {
  const deadlines = guaranteeDeadlines(receivedAt)
  return deadlines?.find((deadline) => deadline.key === 'perfect_completion')?.endsAt ?? null
}

export interface RetentionState {
  /** Le montant stipule, qu'il soit encore retenu ou non. */
  amount: Cents
  /** Le jour ou il devient exigible. `null` tant qu'aucune reception n'est declaree. */
  releasesOn: Date | null
  /** Ce que le client a le droit de retenir AUJOURD'HUI. */
  withheld: Cents
}

export function retentionState(
  input: { totalInclTax: Cents; rate: number; receivedAt: Date | null },
  now: Date,
): RetentionState {
  const amount = retainedAmount(input.totalInclTax, input.rate)
  const releasesOn = releaseDate(input.receivedAt)

  // Sans date connue, la somme reste retenue. Le blocage est reel — un client
  // qui ne declare jamais sa reception bloque la retenue de son artisan —, et
  // c'est a l'ecran de le rendre visible, pas a cette fonction de l'effacer.
  const released = releasesOn !== null && now.getTime() >= releasesOn.getTime()

  return { amount, releasesOn, withheld: released ? 0 : amount }
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
pnpm vitest run tests/domain/retention.test.ts
```

Attendu : PASS, 13 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/retention.ts tests/domain/retention.test.ts
git commit -m "feat: la retenue de garantie, plafonnee et datee par la loi"
```

---

## Task 2 : Une somme retenue n'est pas un impayé

Le cœur du jalon tient dans l'ordre de deux lignes.

**Files:**
- Modify: `src/domain/payment-status.ts`
- Modify: `tests/domain/payment-status.test.ts`
- Modify: `src/ui/molecules/status-badge.tsx`
- Modify: `src/app/(app)/factures/page.tsx`, `src/app/(app)/factures/[id]/page.tsx`, `src/services/invoice-public.ts`

- [ ] **Step 1 : Réécrire les tests**

Remplacer entièrement `tests/domain/payment-status.test.ts` :

```typescript
import { describe, it, expect } from 'vitest'
import { amountDueNow, outstanding, paymentStatus } from '@/domain/payment-status'

const TOTAL = 100_700
const DUE = new Date('2026-02-01')

/** Une facture ordinaire, sans retenue stipulee. */
const plain = (payments: number[]) => ({
  totalInclTax: TOTAL,
  payments,
  dueAt: DUE,
  withheld: 0,
})

/** La meme, avec 5 % legalement retenus. */
const withRetention = (payments: number[]) => ({ ...plain(payments), withheld: 5_035 })

describe('le statut de reglement', () => {
  it('part de « en attente »', () => {
    expect(paymentStatus(plain([]), new Date('2026-01-01'))).toBe('unpaid')
  })

  it('reconnait un reglement partiel', () => {
    expect(paymentStatus(plain([30_000]), new Date('2026-01-01'))).toBe('partially_paid')
  })

  it('reconnait une facture soldee', () => {
    expect(paymentStatus(plain([30_000, 70_700]), new Date('2026-01-01'))).toBe('paid')
  })

  it('tolere un trop-percu', () => {
    expect(paymentStatus(plain([110_000]), new Date('2026-01-01'))).toBe('paid')
  })

  it('passe en retard apres l echeance', () => {
    expect(paymentStatus(plain([]), new Date('2026-02-02'))).toBe('overdue')
  })

  it('le reglement l emporte sur le retard', () => {
    // Une facture soldee apres l'echeance n'est plus en retard, elle est payee.
    expect(paymentStatus(plain([100_700]), new Date('2026-06-01'))).toBe('paid')
  })
})

describe('la retenue de garantie', () => {
  it('N EST PAS un impaye, meme apres l echeance', () => {
    // **La decision structurante du jalon.** Sans cette regle, la sequence de
    // relances poursuivrait le client pour 5 % qu'il est en droit de garder
    // pendant un an — et l'artisan qui decouvrirait ce message parti en son nom
    // se retournerait contre l'outil, a juste titre.
    expect(paymentStatus(withRetention([95_665]), new Date('2026-06-01'))).toBe('withheld')
  })

  it('ne masque PAS un vrai retard', () => {
    // 900,00 recus sur 1 007,00 : 51,65 sont retenus, le reste est en retard.
    expect(paymentStatus(withRetention([90_000]), new Date('2026-06-01'))).toBe('overdue')
  })

  it('laisse « payee » quand tout est encaisse, retenue comprise', () => {
    expect(paymentStatus(withRetention([100_700]), new Date('2026-06-01'))).toBe('paid')
  })

  it('redevient exigible une fois la retenue liberee', () => {
    // `withheld` tombe a zero : la meme facture bascule en retard, et c'est
    // exactement ce qu'on veut — la somme est due.
    expect(paymentStatus(plain([95_665]), new Date('2027-06-01'))).toBe('overdue')
  })
})

describe('le reste du, et ce qu on peut reclamer', () => {
  it('distingue les deux', () => {
    // `outstanding` est comptable, `amountDueNow` est ce qu'on ose reclamer.
    expect(outstanding(TOTAL, [95_665])).toBe(5_035)
    expect(amountDueNow(withRetention([95_665]))).toBe(0)
  })

  it('ne descend jamais sous zero', () => {
    expect(amountDueNow(withRetention([110_000]))).toBe(0)
  })

  it('reclame le retard au-dela de la retenue', () => {
    expect(amountDueNow(withRetention([90_000]))).toBe(5_665)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/domain/payment-status.test.ts
```

Attendu : ÉCHEC — `paymentStatus` prend encore quatre arguments.

- [ ] **Step 3 : Réécrire le module**

```typescript
// src/domain/payment-status.ts
import type { Cents } from './money'

/**
 * Statut de reglement d'une facture.
 *
 * Fonction pure prenant la date courante en parametre : un statut qui depend de
 * l'horloge est intestable si l'horloge est implicite.
 */
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'withheld' | 'overdue'

/**
 * Ce qu'il faut savoir pour statuer.
 *
 * **`withheld` est OBLIGATOIRE**, et ce n'est pas un oubli d'`?` : un appelant
 * qui l'omettrait reclamerait une somme que son client a le droit de garder.
 * Le rendre requis fait chercher les points d'appel par le compilateur plutot
 * que par la revue.
 */
export interface Settlement {
  totalInclTax: Cents
  payments: Cents[]
  dueAt: Date
  /** Ce que le client a le droit de retenir aujourd'hui — voir `retentionState`. */
  withheld: Cents
}

export function outstanding(totalInclTax: Cents, payments: Cents[]): Cents {
  const received = payments.reduce((sum, amount) => sum + amount, 0)
  return Math.max(0, totalInclTax - received)
}

/**
 * Ce qu'on peut reclamer AUJOURD'HUI.
 *
 * Distinct du reste du, qui est comptable : une somme legalement retenue reste
 * due, elle n'est simplement pas encore exigible. C'est ce montant-la, et lui
 * seul, que les relances poursuivront.
 */
export function amountDueNow(settlement: Settlement): Cents {
  const remaining = outstanding(settlement.totalInclTax, settlement.payments)
  return Math.max(0, remaining - settlement.withheld)
}

export function paymentStatus(settlement: Settlement, now: Date): PaymentStatus {
  const remaining = outstanding(settlement.totalInclTax, settlement.payments)

  // Le reglement l'emporte sur le retard : une facture soldee apres l'echeance
  // n'est plus en retard, elle est payee.
  if (remaining === 0) return 'paid'

  // **AVANT le retard, et c'est toute la decision du jalon.** Une somme retenue
  // n'est pas un impaye : ce qui reste est legitimement garde, pas oublie.
  if (remaining <= settlement.withheld) return 'withheld'

  if (now.getTime() > settlement.dueAt.getTime()) return 'overdue'

  return settlement.payments.length > 0 ? 'partially_paid' : 'unpaid'
}
```

- [ ] **Step 4 : Ajouter la pastille**

Dans `src/ui/molecules/status-badge.tsx`, à `paymentBadges` :

```typescript
  /**
   * Ni payee, ni en retard. Le vocabulaire compte : « en attente » suggererait
   * un oubli du client, alors qu'il applique une clause du devis.
   */
  withheld: { tone: 'neutral', label: 'Retenue en cours', icon: <Icon name="clock" size="sm" /> },
```

> `paymentBadges` est un `Record<PaymentStatus, Entry>` : sans cette entrée, la compilation échoue. C'est voulu — un statut ajouté au domaine ne peut pas passer inaperçu à l'écran.

- [ ] **Step 5 : Corriger les trois points d'appel**

`tsc` les désigne. Pour l'instant, **passer `withheld: 0`** partout : la Task 4 branchera la vraie valeur.

```typescript
// src/app/(app)/factures/page.tsx
const status = paymentStatus(
  { totalInclTax: row.totalInclTax, payments: received, dueAt: row.dueAt, withheld: 0 },
  now,
)
```

Idem dans `src/app/(app)/factures/[id]/page.tsx` et `src/services/invoice-public.ts`.

> **Laisser un `TODO` serait un défaut** : ces trois `withheld: 0` sont corrects tant qu'aucune facture ne porte de taux — et la Task 3 est celle qui en crée. Les deux tâches s'enchaînent sans commit intermédiaire.

- [ ] **Step 6 : Lancer les tests**

```bash
pnpm vitest run tests/domain/payment-status.test.ts && pnpm build
```

Attendu : PASS, 13 tests, compilation verte.

---

## Task 3 : Le taux au devis, figé sur la facture

**Files:**
- Modify: `src/db/schema/quote.ts`, `src/db/schema/invoice.ts`
- Modify: `src/services/quote-edit.ts`, `src/services/invoices.ts`
- Modify: `src/app/(app)/devis/actions.ts`, `src/app/(app)/devis/[id]/modifier/actions.ts`
- Modify: `src/app/(app)/devis/[id]/modifier/EditQuoteForm.tsx`, `src/app/(app)/devis/nouveau/**`
- Modify: `src/pdf/quote-pdf.tsx`
- Test: `tests/services/retention.test.ts`

- [ ] **Step 1 : Ajouter les colonnes**

Dans `src/db/schema/quote.ts`, sur `quote`, avant `createdAt` :

```typescript
    /**
     * La retenue de garantie stipulee, en points de pourcentage. `0` = aucune.
     *
     * **Elle se stipule ICI**, au devis : la loi n° 71-584 la veut facultative
     * et contractuelle. Une retenue appliquee sans stipulation serait une
     * amputation illegale du paiement de l'artisan.
     */
    retentionRate: integer('retention_rate').notNull().default(0),
```

Dans `src/db/schema/invoice.ts`, sur `invoice`, à côté de `latePaymentRate` :

```typescript
    /**
     * Le taux de retenue, **fige a l'emission** comme les autres mentions.
     *
     * Une facture est immuable : un artisan qui modifierait le taux de son
     * devis demain ne doit pas changer retroactivement un document deja remis
     * a son client.
     */
    retentionRate: integer('retention_rate').notNull().default(0),
```

- [ ] **Step 2 : Générer la migration**

```bash
pnpm db:generate && pnpm db:reset
```

Attendu : un `0018_*.sql` avec deux `ADD COLUMN "retention_rate"`. **Ne pas le renommer.**

- [ ] **Step 3 : Écrire les tests qui échouent**

```typescript
// tests/services/retention.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { invoice, quote } from '@/db/schema'
import { updateDraftQuote } from '@/services/quote-edit'
import { issueInvoice } from '@/services/invoices'
import { createCompany, createProject, signedQuote } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const LINE = { label: 'Pose', unit: 'u', quantity: '1', unitPriceExclTax: 100_000, taxRate: 1000 }

describe('stipuler la retenue au devis', () => {
  it('l enregistre sur le brouillon', async () => {
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const draft = await signedQuote(companyId, projectId, 'draft')

    await updateDraftQuote(companyId, draft.id, {
      lines: [LINE],
      committedLeadTimeDays: null,
      retentionRate: 5,
    })

    const [row] = await db.select().from(quote).where(eq(quote.id, draft.id))
    expect(row.retentionRate).toBe(5)
  })

  it('REFUSE un taux superieur au plafond legal', async () => {
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const draft = await signedQuote(companyId, projectId, 'draft')

    await expect(
      updateDraftQuote(companyId, draft.id, {
        lines: [LINE],
        committedLeadTimeDays: null,
        retentionRate: 10,
      }),
    ).rejects.toThrow(/71-584/)
  })

  it('vaut ZERO par defaut', async () => {
    // Facultative : « peuvent etre amputes ». Une retenue par defaut serait une
    // clause imposee au client comme a l'artisan.
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const draft = await signedQuote(companyId, projectId, 'draft')

    const [row] = await db.select().from(quote).where(eq(quote.id, draft.id))
    expect(row.retentionRate).toBe(0)
  })
})

describe('figer la retenue sur la facture', () => {
  it('recopie le taux du devis a l emission', async () => {
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const source = await signedQuote(companyId, projectId, 'signed')
    await db.update(quote).set({ retentionRate: 5 }).where(eq(quote.id, source.id))

    const created = await issueInvoice({
      companyId,
      quoteId: source.id,
      type: 'deposit',
      dueInDays: 30,
      lines: [{ ...LINE, unitPriceExclTax: 10_000 }],
    })

    const [row] = await db.select().from(invoice).where(eq(invoice.id, created.id))
    expect(row.retentionRate).toBe(5)
  })

  it('ne bouge PLUS quand le devis change ensuite', async () => {
    // Une facture est immuable, ses mentions aussi.
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const source = await signedQuote(companyId, projectId, 'signed')
    await db.update(quote).set({ retentionRate: 5 }).where(eq(quote.id, source.id))

    const created = await issueInvoice({
      companyId,
      quoteId: source.id,
      type: 'deposit',
      dueInDays: 30,
      lines: [{ ...LINE, unitPriceExclTax: 10_000 }],
    })

    await db.update(quote).set({ retentionRate: 0 }).where(eq(quote.id, source.id))

    const [row] = await db.select().from(invoice).where(eq(invoice.id, created.id))
    expect(row.retentionRate).toBe(5)
  })

  it('n en met AUCUNE sur un avoir', async () => {
    // Un avoir rend de l'argent : rien n'y est retenu.
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const source = await signedQuote(companyId, projectId, 'signed')
    await db.update(quote).set({ retentionRate: 5 }).where(eq(quote.id, source.id))

    const invoiced = await issueInvoice({
      companyId,
      quoteId: source.id,
      type: 'deposit',
      dueInDays: 30,
      lines: [{ ...LINE, unitPriceExclTax: 10_000 }],
    })

    const credit = await issueInvoice({
      companyId,
      quoteId: source.id,
      type: 'credit_note',
      dueInDays: 0,
      correctsInvoiceId: invoiced.id,
      lines: [{ ...LINE, unitPriceExclTax: 10_000 }],
    })

    const [row] = await db.select().from(invoice).where(eq(invoice.id, credit.id))
    expect(row.retentionRate).toBe(0)
  })
})
```

- [ ] **Step 3 bis : Ouvrir la fixture au brouillon**

`signedQuote` n'accepte aujourd'hui que `'sent' | 'signed'`. Dans `tests/services/invoice-fixtures.ts` :

```typescript
export async function signedQuote(
  companyId: string,
  projectId: string,
  status: 'draft' | 'sent' | 'signed' = 'signed',
) {
```

Le reste est inchangé : `signedAt` reste `null` pour tout ce qui n'est pas `'signed'`.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/services/retention.test.ts
```

Attendu : ÉCHEC — `retentionRate` n'existe pas sur `QuoteEdit`.

- [ ] **Step 5 : Porter le taux dans les services**

Dans `src/services/quote-edit.ts` :

```typescript
import { assertRetentionRate } from '@/domain/retention'

export interface QuoteEdit {
  lines: EditableLine[]
  committedLeadTimeDays: number | null
  /** En points de pourcentage, 0 à 5. `0` = aucune retenue stipulée. */
  retentionRate: number
}
```

Après la garde sur `status !== 'draft'` :

```typescript
  assertRetentionRate(edit.retentionRate)
```

Et dans le `.set({ ... })` de la transaction :

```typescript
        retentionRate: edit.retentionRate,
```

Dans `src/services/invoices.ts`, à l'insertion de la facture, à côté de `latePaymentRate` :

```typescript
        // Fige a l'emission, comme les autres mentions. **Jamais sur un
        // avoir** : un avoir rend de l'argent, rien n'y est retenu.
        retentionRate: input.type === 'credit_note' ? 0 : source.retentionRate,
```

- [ ] **Step 6 : Brancher le formulaire**

Dans `src/app/(app)/devis/[id]/modifier/actions.ts`, la modification passe par `updateDraftQuote` : une ligne suffit.

```typescript
    await updateDraftQuote(companyId, quoteId, {
      lines: readLines(form),
      committedLeadTimeDays: delay ? Number(delay) : null,
      retentionRate: Number(form.get('retenue') ?? 0),
    })
```

La **création**, elle, n'y passe pas : `saveQuote` insère directement via `insertWithNumber`, qui prend déjà six paramètres positionnels. Y en ajouter un septième rendrait les appels illisibles — regrouper les trois réglages du devis :

```typescript
// src/app/(app)/devis/actions.ts

/** Les reglages du devis, distincts de son contenu. Un objet plutot qu'une
 *  quatrieme, cinquieme et sixieme position : `(…, null, 90, 5)` ne se relit
 *  pas, et une inversion de deux nombres ne se verrait jamais. */
interface QuoteSettings {
  committedLeadTimeDays: number | null
  validityDays: number
  retentionRate: number
}

async function insertWithNumber(
  companyId: string,
  projectId: string,
  totals: Totals,
  settings: QuoteSettings,
  lines: LineFormInput[],
) {
```

Dans le corps, remplacer les usages de `committedLeadTimeDays` et `validityDays` par `settings.committedLeadTimeDays` / `settings.validityDays`, et ajouter `retentionRate: settings.retentionRate` au `.values({ … })`.

Puis, au point d'appel :

```typescript
    created = await insertWithNumber(companyId, project.id, totals, {
      committedLeadTimeDays: form.get('delai') ? Number(form.get('delai')) : null,
      validityDays: Number(form.get('validity_days')) || 90,
      retentionRate: Number(form.get('retenue') ?? 0),
    }, lines)
```

> `assertRetentionRate` n'est pas appelée ici : `insertWithNumber` écrit en base sans passer par `updateDraftQuote`. **L'ajouter explicitement** juste avant l'insertion — une garde qui ne couvre qu'un des deux chemins d'écriture n'en est pas une.

Dans `EditQuoteForm.tsx` — et son équivalent de création —, un `Field` sous le délai engagé :

```tsx
        <Field
          label="Retenue de garantie"
          help="Facultative, 5 % au maximum (loi n° 71-584). Votre client consigne cette somme auprès d’un tiers ; elle vous est due un an après la réception des travaux."
        >
          {(p) => (
            <Select {...p} name="retenue" defaultValue={String(defaults.retentionRate ?? 0)}>
              <option value="0">Aucune</option>
              <option value="1">1 %</option>
              <option value="2">2 %</option>
              <option value="3">3 %</option>
              <option value="4">4 %</option>
              <option value="5">5 %</option>
            </Select>
          )}
        </Field>
```

> **Un `Select`, pas un `Input`** : le plafond légal devient impossible à dépasser à la saisie, et la garde du service reste là pour tout ce qui n'est pas le formulaire.

- [ ] **Step 7 : L'imprimer sur le devis**

Dans `src/pdf/quote-pdf.tsx`, sous le bloc des totaux, quand `quote.retentionRate > 0` :

```tsx
        <Text style={styles.legal}>
          Retenue de garantie de {quote.retentionRate} % (loi n° 71-584 du 16 juillet 1971), soit{' '}
          {format(retainedAmount(quote.totalInclTax, quote.retentionRate))} € TTC. Cette somme est
          consignée par le maître d’ouvrage auprès d’un tiers convenu entre les parties, et lui est
          restituée un an après la réception des travaux.
        </Text>
```

> La stipulation doit figurer **au devis** : c'est le contrat. Une retenue appliquée sans stipulation écrite est une amputation illégale du paiement.

- [ ] **Step 8 : Lancer les tests**

```bash
pnpm vitest run tests/services/retention.test.ts && pnpm build
```

Attendu : PASS, 7 tests.

- [ ] **Step 9 : Commit**

```bash
git add -A
git commit -m "feat: la retenue stipulee au devis, figee sur la facture"
```

---

## Task 4 : Ce que les écrans en disent

**Files:**
- Create: `src/services/retention.ts`
- Modify: `src/app/(app)/factures/[id]/page.tsx`, `src/app/(app)/factures/page.tsx`
- Modify: `src/services/invoice-public.ts`, `src/app/f/[token]/page.tsx`
- Modify: `src/pdf/invoice-pdf.tsx`

- [ ] **Step 1 : Écrire le service**

```typescript
// src/services/retention.ts
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote } from '@/db/schema'
import { retentionState, type RetentionState } from '@/domain/retention'

/**
 * L'etat de la retenue d'une facture.
 *
 * Rien n'est stocke : le taux est fige sur la facture, la reception est
 * declaree sur le devis, et l'etat se recalcule a chaque lecture. Un montant
 * retenu stocke finirait par mentir le jour ou la reception est declaree — ou
 * corrigee, ce que M6·B autorise expressement.
 *
 * La reception vit sur la RACINE de la chaine de versions, comme les factures.
 */
export async function retentionOf(
  invoiceRow: { totalInclTax: number; retentionRate: number; quoteId: string | null },
  now: Date,
): Promise<RetentionState> {
  if (invoiceRow.retentionRate === 0 || !invoiceRow.quoteId) {
    return retentionState({ totalInclTax: 0, rate: 0, receivedAt: null }, now)
  }

  const [row] = await db
    .select({ receivedAt: quote.receivedAt })
    .from(quote)
    .where(eq(quote.id, invoiceRow.quoteId))

  return retentionState(
    {
      totalInclTax: invoiceRow.totalInclTax,
      rate: invoiceRow.retentionRate,
      receivedAt: row?.receivedAt ?? null,
    },
    now,
  )
}
```

- [ ] **Step 2 : Brancher l'écran de facture**

Dans `src/app/(app)/factures/[id]/page.tsx`, remplacer le calcul du statut :

```typescript
  const now = new Date()
  const retention = await retentionOf(found, now)
  const settlement = {
    totalInclTax: found.totalInclTax,
    payments: received,
    dueAt: found.dueAt,
    withheld: retention.withheld,
  }
  const due = outstanding(found.totalInclTax, received)
  const status = paymentStatus(settlement, now)
```

Sous la ligne « Reste dû », quand `retention.amount > 0` :

```tsx
            <SummaryLine label="Dont retenue de garantie" cents={retention.amount} />
            <Text size="sm" tone="muted">
              {retention.releasesOn ? (
                <>
                  Libérable le <DateText value={retention.releasesOn} format="short" /> — un an
                  après la réception déclarée par votre client.
                </>
              ) : (
                // Le blocage se MONTRE. Il se regle par un coup de telephone,
                // et l'artisan doit savoir qu'il a un appel a passer.
                <>
                  Votre client n’a pas encore déclaré la réception des travaux : la date de
                  libération reste inconnue, et cette somme n’est pas exigible.
                </>
              )}{' '}
              Elle est consignée par le maître d’ouvrage auprès d’un tiers — <strong>nous ne
              détenons aucun fonds</strong>.
            </Text>
```

Et le bloc d'encaissement se rend sur `amountDueNow(settlement) > 0` plutôt que `due > 0` — inutile de proposer d'encaisser ce qui n'est pas exigible.

- [ ] **Step 3 : Brancher la liste des factures**

`src/app/(app)/factures/page.tsx` charge déjà les factures avec leurs paiements. **Une seule requête supplémentaire pour toute la liste** — appeler `retentionOf` par ligne en ferait N :

```typescript
  const now = new Date()

  // Les receptions des devis concernes, en UNE requete. `retentionState` est
  // pure : l'appeler en boucle ensuite ne coute rien.
  const quoteIds = [...new Set(rows.map((row) => row.quoteId).filter((id) => id !== null))]
  const receptions = quoteIds.length
    ? await db
        .select({ id: quote.id, receivedAt: quote.receivedAt })
        .from(quote)
        .where(inArray(quote.id, quoteIds))
    : []

  const receivedAtOf = new Map(receptions.map((row) => [row.id, row.receivedAt]))
```

puis, dans la boucle de rendu :

```typescript
            const received = row.payments.map((p) => p.amount)
            const { withheld } = retentionState(
              {
                totalInclTax: row.totalInclTax,
                rate: row.retentionRate,
                receivedAt: row.quoteId ? (receivedAtOf.get(row.quoteId) ?? null) : null,
              },
              now,
            )
            const status = paymentStatus(
              { totalInclTax: row.totalInclTax, payments: received, dueAt: row.dueAt, withheld },
              now,
            )
```

Le montant affiché à droite devient `amountDueNow({ … })` plutôt que `outstanding(…)` : c'est ce que l'artisan peut réclamer, et c'est ce chiffre-là qu'il compare quand il décide d'appeler un client.

Ajouter les imports : `inArray` de `drizzle-orm`, `quote` de `@/db/schema`, `retentionState` de `@/domain/retention`, `amountDueNow` de `@/domain/payment-status`.

- [ ] **Step 4 : Brancher la page publique du client**

`src/services/invoice-public.ts` : ajouter au `PublicInvoice`

```typescript
  /** Ce que le client a le droit de retenir, et depuis quand il ne l'a plus. */
  retention: RetentionState
  /** Ce qu'on lui demande de payer aujourd'hui. */
  dueNowInclTax: number
```

et sur `src/app/f/[token]/page.tsx`, sous le total, la même mention — **rédigée pour lui** :

> « Vous pouvez retenir 50,35 € au titre de la garantie (loi n° 71-584 du 16 juillet 1971). Cette somme est à consigner auprès d’un tiers convenu ; elle sera due à l’entreprise le 15/03/2027. Montant à régler aujourd’hui : 956,65 €. »

- [ ] **Step 5 : L'imprimer sur la facture**

Dans `src/pdf/invoice-pdf.tsx`, à côté des mentions de pénalités (art. L441-10) déjà présentes, quand `invoice.retentionRate > 0`. Le PDF **n'imprime pas la date de libération** si elle est inconnue : il imprime la règle.

- [ ] **Step 6 : Vérifier**

```bash
pnpm build && pnpm vitest run
```

- [ ] **Step 7 : Commit**

```bash
git add -A
git commit -m "feat: une somme retenue n'est pas un impaye, et l'ecran le dit"
```

---

## Task 5 : Le domaine de la situation

Fonction pure.

**Files:**
- Create: `src/domain/situation.ts`
- Modify: `src/domain/invoice-balance.ts`
- Test: `tests/domain/situation.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/situation.test.ts
import { describe, it, expect } from 'vitest'
import { MAX_PERCENT, assertSituation, situationByRate, type SituationLine } from '@/domain/situation'

/** Deux lignes, deux taux : 850,00 a 10 % et 60,00 a 20 %. */
const lines = (a: number, b: number): SituationLine[] => [
  { quoteLineId: 'l1', taxRate: 1000, totalExclTax: 85_000, percent: a },
  { quoteLineId: 'l2', taxRate: 2000, totalExclTax: 6_000, percent: b },
]

describe('recevabilite d un avancement', () => {
  it('accepte un avancement partiel', () => {
    expect(() => assertSituation(lines(50, 25))).not.toThrow()
  })

  it('accepte zero et cent', () => {
    expect(MAX_PERCENT).toBe(100)
    expect(() => assertSituation(lines(0, 100))).not.toThrow()
  })

  it('REFUSE au-dela de cent', () => {
    // La garde qui manquait : une facture `progress` a lignes libres laissait
    // facturer 120 % d'une ligne, seul le total global etant plafonne.
    expect(() => assertSituation(lines(120, 0))).toThrow(/entre 0 et 100/)
  })

  it('refuse un pourcentage negatif ou fractionnaire', () => {
    expect(() => assertSituation(lines(-10, 0))).toThrow()
    expect(() => assertSituation(lines(33.5, 0))).toThrow()
  })

  it('refuse une situation sans aucune ligne', () => {
    expect(() => assertSituation([])).toThrow(/au moins une ligne/)
  })
})

describe('la valeur cumulee declaree', () => {
  it('ventile par taux de TVA', () => {
    expect(situationByRate(lines(50, 50))).toEqual([
      { rate: 1000, baseExclTax: 42_500, taxAmount: 4_250 },
      { rate: 2000, baseExclTax: 3_000, taxAmount: 600 },
    ])
  })

  it('vaut EXACTEMENT le devis a cent pour cent', () => {
    // La propriete qui compte : a 100 %, aucun residu de centimes ne peut
    // subsister. C'est ce qui garantit qu'une derniere situation solde le
    // chantier au centime — donc que la metrique « ecart devis vers facture »
    // du passeport a un sens.
    expect(situationByRate(lines(100, 100))).toEqual([
      { rate: 1000, baseExclTax: 85_000, taxAmount: 8_500 },
      { rate: 2000, baseExclTax: 6_000, taxAmount: 1_200 },
    ])
  })

  it('vaut zero a zero pour cent', () => {
    expect(situationByRate(lines(0, 0))).toEqual([
      { rate: 1000, baseExclTax: 0, taxAmount: 0 },
      { rate: 2000, baseExclTax: 0, taxAmount: 0 },
    ])
  })

  it('regroupe deux lignes de meme taux', () => {
    const same: SituationLine[] = [
      { quoteLineId: 'l1', taxRate: 1000, totalExclTax: 10_000, percent: 50 },
      { quoteLineId: 'l2', taxRate: 1000, totalExclTax: 20_000, percent: 25 },
    ]

    expect(situationByRate(same)).toEqual([{ rate: 1000, baseExclTax: 10_000, taxAmount: 1_000 }])
  })

  it('arrondit ligne par ligne, jamais sur le total', () => {
    // 333 a 33 % = 109,89 -> 110. Arrondir apres sommation donnerait un autre
    // centime, et deux situations successives ne se raccorderaient plus.
    const odd: SituationLine[] = [
      { quoteLineId: 'l1', taxRate: 2000, totalExclTax: 333, percent: 33 },
    ]

    expect(situationByRate(odd)[0].baseExclTax).toBe(110)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/domain/situation.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "@/domain/situation"`.

- [ ] **Step 3 : Écrire le module**

```typescript
// src/domain/situation.ts
import { applyRate, type Cents, type Rate } from './money'
import type { TaxBreakdown } from './quote-totals'

/**
 * La situation de travaux.
 *
 * Elle enonce **l'avancement CUMULE de chaque ligne du devis**, jamais un
 * delta. Le montant a facturer se deduit ailleurs : c'est la difference entre
 * cette valeur cumulee et ce qui a deja ete facture, lu depuis les factures
 * elles-memes, qui sont immuables.
 *
 * Deux consequences, toutes deux voulues :
 *
 * - **On ne peut plus facturer 120 % d'une ligne.** La garde descend du total
 *   global — seul plafond que connaissait la facture `progress` a lignes
 *   libres — jusqu'a la ligne.
 * - **Le modele survit aux avenants** sans arithmetique de rattrapage : un
 *   avenant apporte de nouvelles lignes, le cumul se declare sur la version qui
 *   fait foi, et la soustraction se charge du reste.
 */

export const MAX_PERCENT = 100

export interface SituationLine {
  quoteLineId: string
  taxRate: Rate
  /** Le total HT de la ligne du devis, quantite comprise. */
  totalExclTax: Cents
  /** L'avancement CUMULE declare, en pourcentage entier. */
  percent: number
}

export function assertSituation(lines: SituationLine[]): void {
  if (lines.length === 0) throw new Error('Une situation porte sur au moins une ligne du devis')

  for (const line of lines) {
    if (!Number.isInteger(line.percent) || line.percent < 0 || line.percent > MAX_PERCENT) {
      throw new Error('Un avancement se déclare en pourcentage entier, entre 0 et 100')
    }
  }
}

/**
 * La valeur cumulee des travaux declares, base de TVA par base de TVA.
 *
 * **L'arrondi se fait ligne par ligne**, jamais sur le total : deux situations
 * successives doivent se raccorder au centime, et arrondir apres sommation
 * ferait apparaitre un centime de plus ou de moins selon le decoupage.
 *
 * A 100 % sur toutes les lignes, la valeur egale EXACTEMENT le devis — aucun
 * residu ne peut subsister, puisque `round(total * 100 / 100) === total`.
 */
export function situationByRate(lines: SituationLine[]): TaxBreakdown[] {
  const bases = new Map<Rate, Cents>()

  for (const line of lines) {
    const cumulative = Math.round((line.totalExclTax * line.percent) / 100)
    bases.set(line.taxRate, (bases.get(line.taxRate) ?? 0) + cumulative)
  }

  return [...bases.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, baseExclTax]) => ({ rate, baseExclTax, taxAmount: applyRate(baseExclTax, rate) }))
}
```

- [ ] **Step 4 : Remonter `ratedLines` dans le domaine**

`src/actions/invoices.ts` définit `formatRate` et `labelled` en local. La situation en a besoin aussi, et un service ne doit pas importer d'une action. Les déplacer dans `src/domain/invoice-balance.ts` :

```typescript
const formatRate = (rate: Rate) => `${(rate / 100).toFixed(1).replace('.', ',')} %`

/**
 * Des montants ventiles, transformes en lignes de facture.
 *
 * Un devis multi-taux produit une ligne par taux. Sans le taux dans le libelle,
 * le client lit deux lignes identiques aux montants differents.
 */
export function ratedLines(lines: RatedAmount[], base: string) {
  return lines.map((line) => ({
    label: lines.length > 1 ? `${base} — base TVA ${formatRate(line.rate)}` : base,
    unit: 'u',
    quantity: '1',
    unitPriceExclTax: line.unitPriceExclTax,
    taxRate: line.rate,
  }))
}
```

Puis, dans `src/actions/invoices.ts`, supprimer les deux définitions locales et remplacer les appels `labelled(...)` par `ratedLines(...)`.

- [ ] **Step 5 : Lancer les tests**

```bash
pnpm vitest run tests/domain/situation.test.ts tests/domain/invoice-balance.test.ts && pnpm build
```

Attendu : PASS, 10 tests neufs, rien de cassé.

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat: la situation declare un cumul par ligne, jamais un delta"
```

---

## Task 6 : Les tables et le service des situations

**Files:**
- Create: `src/db/schema/situation.ts`
- Modify: `src/db/schema/index.ts`
- Create: `supabase/migrations/9011_single_situation_number.sql`
- Create: `src/services/situations.ts`
- Modify: `src/domain/authorization.ts` et `tests/domain/authorization.test.ts`
- Test: `tests/services/situations.test.ts`

- [ ] **Step 1 : Le schéma**

```typescript
// src/db/schema/situation.ts
import { pgTable, uuid, integer, timestamp, primaryKey, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company } from './company'
import { quote, quoteLine } from './quote'
import { invoice } from './invoice'

/**
 * Une situation de travaux : ce que l'artisan DECLARE avoir avance.
 *
 * **Aucun montant n'est stocke ici.** Les euros se recalculent depuis les
 * lignes du devis et les pourcentages — comme le reste a facturer de M2, la
 * visibilite de M3 et les metriques de M5. La situation est la trace d'une
 * declaration, pas la source d'un montant : c'est pourquoi elle peut echouer a
 * s'ecrire sans qu'aucune facture ne devienne fausse.
 *
 * `quote_id` designe la RACINE de la chaine de versions, comme les factures.
 */
export const situation = pgTable(
  'situation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quote.id),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    /** Rang dans le chantier : « situation n° 3 ». */
    number: integer('number').notNull(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoice.id),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('situation_quote_idx').on(t.quoteId, t.number)],
)

/**
 * L'avancement declare d'une ligne, **en cumule**.
 *
 * Une ligne appartient a une version precise du devis. Apres un avenant, les
 * lignes sont neuves : le report des pourcentages ne les retrouve pas et
 * affiche 0. Cela ne coute pas un euro — le montant facture ne depend que du
 * cumul declare et de ce qui a deja ete facture. Un report faux coute une
 * ressaisie, jamais une facture fausse.
 */
export const situationLine = pgTable(
  'situation_line',
  {
    situationId: uuid('situation_id')
      .notNull()
      .references(() => situation.id, { onDelete: 'cascade' }),
    quoteLineId: uuid('quote_line_id')
      .notNull()
      .references(() => quoteLine.id, { onDelete: 'cascade' }),
    progressPercent: integer('progress_percent').notNull(),
  },
  (t) => [primaryKey({ name: 'situation_line_pk', columns: [t.situationId, t.quoteLineId] })],
)

export const situationRelations = relations(situation, ({ one, many }) => ({
  invoice: one(invoice, { fields: [situation.invoiceId], references: [invoice.id] }),
  lines: many(situationLine),
}))

export const situationLineRelations = relations(situationLine, ({ one }) => ({
  situation: one(situation, { fields: [situationLine.situationId], references: [situation.id] }),
}))
```

Ajouter `export * from './situation'` à `src/db/schema/index.ts`.

- [ ] **Step 2 : Générer, puis écrire l'index d'unicité**

```bash
pnpm db:generate
```

```sql
-- supabase/migrations/9011_single_situation_number.sql

-- Un seul rang par chantier : « situation n° 3 » ne peut pas designer deux
-- declarations. Ecrit en index plutot qu'en verification applicative : deux
-- emissions simultanees liraient toutes deux « il y en a 2 » et creeraient deux
-- situations n° 3, ce qu'aucune relecture du code ne rattraperait ensuite.
CREATE UNIQUE INDEX situation_number_uq ON situation (quote_id, number);
```

```bash
pnpm db:reset
```

- [ ] **Step 3 : Ouvrir la capacité — et mettre à jour le capteur**

Dans `src/domain/authorization.ts`, ajouter à `CAPABILITIES` :

```typescript
  'situation.issue': { plan: 'pro', role: 'owner', label: 'établir une situation de travaux' },
```

Dans `tests/domain/authorization.test.ts`, le test « AUCUNE fonction existante ne passe derrière la porte » devient :

```typescript
    expect(pro).toEqual(['team.manage', 'situation.issue'])
```

> **C'est le capteur de M8·A qui se déclenche, et c'est sa raison d'être.** La modification est une décision, prise ici en connaissance de cause : la situation de travaux est une fonction **neuve**, elle ne retire rien à personne. Une entreprise gratuite continue de facturer à l'avancement par le pourcentage global — voir `issueProgress`, inchangé.

- [ ] **Step 4 : Écrire les tests qui échouent**

```typescript
// tests/services/situations.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { invoice, situation, situationLine } from '@/db/schema'
import { issueSituation, previousProgress } from '@/services/situations'
import { switchPlan } from '@/services/plan'
import { createCompany, createProject, signedQuote } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

/** Une entreprise Pro, un devis signe a deux taux : 910,00 HT / 1 007,00 TTC. */
async function chantier() {
  const companyId = await createCompany()
  await switchPlan({ companyId, plan: 'pro', by: randomUUID() })
  const projectId = await createProject(companyId)
  const row = await signedQuote(companyId, projectId, 'signed')

  const lines = await db.query.quoteLine.findMany({ where: eq(quoteLine.quoteId, row.id) })
  return { companyId, quoteId: row.id, lines: [...lines].sort((a, b) => a.position - b.position) }
}

const at = (lines: { id: string }[], ...percents: number[]) =>
  lines.map((line, i) => ({ quoteLineId: line.id, percent: percents[i] }))

describe('etablir une situation', () => {
  it('REFUSE une entreprise gratuite, au niveau du service', async () => {
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const row = await signedQuote(companyId, projectId, 'signed')
    const lines = await db.query.quoteLine.findMany({ where: eq(quoteLine.quoteId, row.id) })

    await expect(
      issueSituation({ companyId, quoteId: row.id, progress: at(lines, 50, 50) }),
    ).rejects.toThrow(/Pro/)
  })

  it('facture le cumul declare', async () => {
    // 50 % de 910,00 HT = 455,00 HT, soit 503,50 TTC.
    const { companyId, quoteId, lines } = await chantier()

    await issueSituation({ companyId, quoteId, progress: at(lines, 50, 50) })

    const [row] = await db.select().from(invoice).where(eq(invoice.quoteId, quoteId))
    expect(row.type).toBe('progress')
    expect(row.totalInclTax).toBe(50_350)
  })

  it('ne facture que la DIFFERENCE avec la precedente', async () => {
    const { companyId, quoteId, lines } = await chantier()

    await issueSituation({ companyId, quoteId, progress: at(lines, 50, 50) })
    await issueSituation({ companyId, quoteId, progress: at(lines, 80, 80) })

    const rows = await db.select().from(invoice).where(eq(invoice.quoteId, quoteId))
    const totals = rows.map((row) => row.totalInclTax).sort((a, b) => a - b)

    expect(totals).toEqual([30_210, 50_350])
  })

  it('solde le chantier AU CENTIME a cent pour cent', async () => {
    // La propriete qui fait tenir la metrique « ecart devis vers facture ».
    const { companyId, quoteId, lines } = await chantier()

    await issueSituation({ companyId, quoteId, progress: at(lines, 33, 66) })
    await issueSituation({ companyId, quoteId, progress: at(lines, 100, 100) })

    const rows = await db.select().from(invoice).where(eq(invoice.quoteId, quoteId))
    const invoiced = rows.reduce((sum, row) => sum + row.totalInclTax, 0)

    expect(invoiced).toBe(100_700)
  })

  it('REFUSE une situation qui ne facture rien de plus', async () => {
    const { companyId, quoteId, lines } = await chantier()
    await issueSituation({ companyId, quoteId, progress: at(lines, 50, 50) })

    await expect(
      issueSituation({ companyId, quoteId, progress: at(lines, 50, 50) }),
    ).rejects.toThrow(/rien de plus/)
  })

  it('refuse un avancement au-dela de cent pour cent', async () => {
    const { companyId, quoteId, lines } = await chantier()

    await expect(
      issueSituation({ companyId, quoteId, progress: at(lines, 120, 0) }),
    ).rejects.toThrow(/entre 0 et 100/)
  })

  it('numerote les situations dans l ordre', async () => {
    const { companyId, quoteId, lines } = await chantier()

    await issueSituation({ companyId, quoteId, progress: at(lines, 30, 30) })
    await issueSituation({ companyId, quoteId, progress: at(lines, 60, 60) })

    const rows = await db.select().from(situation).where(eq(situation.quoteId, quoteId))
    expect(rows.map((row) => row.number).sort()).toEqual([1, 2])
  })

  it('garde la DECLARATION, pas le montant', async () => {
    // Aucun euro dans `situation` : ils se recalculent.
    const { companyId, quoteId, lines } = await chantier()
    await issueSituation({ companyId, quoteId, progress: at(lines, 40, 70) })

    const [row] = await db.select().from(situation).where(eq(situation.quoteId, quoteId))
    const declared = await db
      .select()
      .from(situationLine)
      .where(eq(situationLine.situationId, row.id))

    expect(declared.map((line) => line.progressPercent).sort((a, b) => a - b)).toEqual([40, 70])
  })

  it('ne voit PAS le chantier d une autre entreprise', async () => {
    const mine = await chantier()
    const rival = await chantier()

    await expect(
      issueSituation({
        companyId: mine.companyId,
        quoteId: rival.quoteId,
        progress: at(rival.lines, 50, 50),
      }),
    ).rejects.toThrow(/introuvable/)
  })
})

describe('le report des pourcentages', () => {
  it('rend zero sur un chantier neuf', async () => {
    const { quoteId, lines } = await chantier()

    expect(await previousProgress(quoteId)).toEqual({})
    expect(lines.length).toBeGreaterThan(0)
  })

  it('rend les pourcentages de la DERNIERE situation', async () => {
    const { companyId, quoteId, lines } = await chantier()

    await issueSituation({ companyId, quoteId, progress: at(lines, 30, 30) })
    await issueSituation({ companyId, quoteId, progress: at(lines, 60, 45) })

    expect(await previousProgress(quoteId)).toEqual({
      [lines[0].id]: 60,
      [lines[1].id]: 45,
    })
  })
})
```

> Compléter l'import : `import { quoteLine } from '@/db/schema'`.

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/services/situations.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "@/services/situations"`.

- [ ] **Step 6 : Écrire le service**

```typescript
// src/services/situations.ts
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote, quoteLine, situation, situationLine } from '@/db/schema'
import { multiply } from '@/domain/money'
import { ratedLines, remainingByRate } from '@/domain/invoice-balance'
import { assertSituation, situationByRate, type SituationLine } from '@/domain/situation'
import { referenceVersion } from '@/domain/quote-versions'
import { quoteVersions, rootQuoteId } from '@/services/amendments'
import { issueInvoice, issuedAgainstQuote } from '@/services/invoices'
import { assertProPlan } from '@/services/plan'
import { recordEvent } from '@/services/events'

export interface DeclaredProgress {
  quoteLineId: string
  percent: number
}

/**
 * Les pourcentages de la DERNIERE situation, par ligne de devis.
 *
 * **Un confort de saisie, pas une source d'argent.** Apres un avenant, les
 * lignes sont neuves : ce report ne les retrouve pas et rend un objet vide.
 * Cela ne coute pas un euro — le montant facture ne depend que du cumul declare
 * et de ce qui a deja ete facture. Un report faux coute une ressaisie.
 */
export async function previousProgress(anyVersionId: string): Promise<Record<string, number>> {
  const root = await rootQuoteId(anyVersionId)

  const [last] = await db
    .select({ id: situation.id })
    .from(situation)
    .where(eq(situation.quoteId, root))
    .orderBy(desc(situation.number))
    .limit(1)

  if (!last) return {}

  const declared = await db
    .select({ quoteLineId: situationLine.quoteLineId, percent: situationLine.progressPercent })
    .from(situationLine)
    .where(eq(situationLine.situationId, last.id))

  return Object.fromEntries(declared.map((line) => [line.quoteLineId, line.percent]))
}

/**
 * Les lignes de la version qui fait foi, avec leur avancement declare.
 *
 * Une ligne absente de `progress` vaut zero : declarer explicitement chaque
 * ligne serait plus sur, mais l'ecran les envoie toutes, et un oubli cote
 * serveur ne doit pas facturer plus que ce que l'artisan a vu.
 */
async function referenceLines(
  companyId: string,
  quoteId: string,
  progress: DeclaredProgress[],
): Promise<{ root: string; lines: SituationLine[] }> {
  const [owned] = await db
    .select({ id: quote.id })
    .from(quote)
    .where(and(eq(quote.id, quoteId), eq(quote.companyId, companyId)))

  if (!owned) throw new Error('Devis introuvable')

  const root = await rootQuoteId(quoteId)
  const reference = referenceVersion(await quoteVersions(root))
  if (!reference) throw new Error('Seul un devis signé peut être facturé')

  const rows = await db.select().from(quoteLine).where(eq(quoteLine.quoteId, reference.id))
  const declared = new Map(progress.map((line) => [line.quoteLineId, line.percent]))

  return {
    root,
    lines: rows.map((row) => ({
      quoteLineId: row.id,
      taxRate: row.taxRate,
      totalExclTax: multiply(row.unitPriceExclTax, row.quantity),
      percent: declared.get(row.id) ?? 0,
    })),
  }
}

/**
 * Etablit une situation de travaux, et la facture qui va avec.
 *
 * Le montant est **la difference entre le cumul declare et ce qui a deja ete
 * facture** — jamais un delta saisi. `remainingByRate` fait la soustraction,
 * base par base : la meme fonction que le solde de M2, donc la meme garantie
 * qu'aucun residu de centimes ne peut subsister.
 *
 * La facture est creee AVANT la trace de la declaration. L'ordre est voulu :
 * si l'ecriture de la situation echouait, la facture resterait juste et la
 * situation suivante calculerait le bon montant — puisqu'elle ne lit que les
 * factures. L'inverse laisserait une declaration sans facture, c'est-a-dire un
 * mensonge.
 */
export async function issueSituation(input: {
  companyId: string
  quoteId: string
  progress: DeclaredProgress[]
  dueInDays?: number
}) {
  await assertProPlan(input.companyId)

  const { root, lines } = await referenceLines(input.companyId, input.quoteId, input.progress)
  assertSituation(lines)

  const target = situationByRate(lines)
  const issued = await issuedAgainstQuote(root)
  const delta = remainingByRate(target, issued).filter((line) => line.unitPriceExclTax > 0)

  if (delta.length === 0) {
    throw new Error('Cette situation ne facture rien de plus que la précédente.')
  }

  const [last] = await db
    .select({ number: situation.number })
    .from(situation)
    .where(eq(situation.quoteId, root))
    .orderBy(desc(situation.number))
    .limit(1)

  const number = (last?.number ?? 0) + 1

  const created = await issueInvoice({
    companyId: input.companyId,
    quoteId: root,
    type: 'progress',
    dueInDays: input.dueInDays ?? 30,
    lines: ratedLines(delta, `Situation de travaux n° ${number}`),
  })

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(situation)
      .values({
        quoteId: root,
        companyId: input.companyId,
        number,
        invoiceId: created.id,
      })
      .returning()

    await tx.insert(situationLine).values(
      lines.map((line) => ({
        situationId: row.id,
        quoteLineId: line.quoteLineId,
        progressPercent: line.percent,
      })),
    )
  })

  await recordEvent({
    type: 'situation.issued',
    subjectType: 'quote',
    subjectId: root,
    companyId: input.companyId,
    actorType: 'company',
    payload: { number, invoiceId: created.id },
  })

  return created
}
```

- [ ] **Step 7 : Lancer les tests**

```bash
pnpm vitest run tests/services/situations.test.ts tests/domain/authorization.test.ts
```

Attendu : PASS, 11 + 12 tests.

- [ ] **Step 8 : Commit**

```bash
git add -A
git commit -m "feat: la situation de travaux, facturee sur la difference de cumul"
```

---

## Task 7 : L'écran de situation

**Files:**
- Create: `src/app/(app)/devis/[id]/situation/page.tsx`
- Create: `src/app/(app)/devis/[id]/situation/actions.ts`
- Create: `src/app/(app)/devis/[id]/situation/SituationForm.tsx`
- Modify: `src/app/(app)/devis/[id]/InvoiceActions.tsx`, `src/app/(app)/devis/[id]/page.tsx`

- [ ] **Step 1 : L'action**

```typescript
// src/app/(app)/devis/[id]/situation/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { requireCapability } from '@/lib/access'
import { issueSituation, type DeclaredProgress } from '@/services/situations'

export interface SituationState {
  error?: string
}

/**
 * Les pourcentages arrivent en champs `avancement-<id>` : un champ par ligne du
 * devis, nomme par l'identifiant de la ligne. Un tableau indexe se
 * desynchroniserait de l'ordre des lignes au premier avenant.
 */
export async function submitSituation(
  quoteId: string,
  _state: SituationState,
  form: FormData,
): Promise<SituationState> {
  const { companyId } = await requireCapability('situation.issue')

  const progress: DeclaredProgress[] = []
  for (const [name, value] of form.entries()) {
    if (!name.startsWith('avancement-')) continue
    progress.push({ quoteLineId: name.slice('avancement-'.length), percent: Number(value) })
  }

  let created
  try {
    created = await issueSituation({ companyId, quoteId, progress })
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Hors du bloc try : `redirect` signale la navigation en levant une
  // exception, qu'un catch afficherait comme une erreur.
  redirect(`/factures/${created.id}`)
}
```

- [ ] **Step 2 : La page**

`src/app/(app)/devis/[id]/situation/page.tsx` — composant serveur qui :

1. Charge la session, redirige vers `/devis` si `!can(session, 'situation.issue')` — même discipline que les six pages de M8·A.
2. Charge le devis via `quoteDetail`, `notFound()` s'il est absent.
3. Charge les lignes de la version qui fait foi, `previousProgress(id)`, et `issuedAgainstQuote(root)`.
4. Rend `<SituationForm>` avec : les lignes (`id`, `label`, `totalExclTax`, `taxRate`), les pourcentages précédents, et la ventilation déjà facturée.

- [ ] **Step 3 : Le formulaire**

`SituationForm.tsx` — composant client (`'use client'`), sur le modèle de `EditQuoteForm.tsx` pour `useActionState`.

Un tableau : libellé de la ligne, son total HT, un `Input` `inputMode="numeric"` nommé `avancement-<id>`, prérempli au pourcentage précédent, et le montant que cette ligne apportera.

> **Le montant se calcule à l'écran avec la MÊME fonction que le serveur.**
> `src/domain/situation.ts` est pur, sans I/O : le composant client importe `situationByRate`, et `remainingByRate` pour la soustraction. L'aperçu ne peut donc pas mentir — c'est le même arrondi, la même ventilation, le même code.
>
> Réécrire le calcul en JavaScript « juste pour l'aperçu » produirait tôt ou tard un écran qui annonce 503,49 pour une facture de 503,50, et l'artisan cesserait de croire l'écran.

Contraintes :
- `data-testid="situation"` sur le tableau, `data-testid="montant-situation"` sur le total prévisionnel.
- Aucune balise nue : `check:ds` refuse.
- Fichier sous 250 lignes ; sinon extraire la ligne de tableau dans `SituationRow.tsx`.

- [ ] **Step 4 : Le point d'entrée**

Dans `src/app/(app)/devis/[id]/page.tsx`, passer la capacité au panneau :

```tsx
        <InvoiceActions
          quoteId={quote.id}
          remaining={format(detail.remaining)}
          canIssueSituation={can(session, 'situation.issue')}
        />
```

Dans `InvoiceActions.tsx`, à côté des trois boutons :

```tsx
      {canIssueSituation && (
        <ButtonLink href={`/devis/${quoteId}/situation`} tone="secondary">
          Nouvelle situation
        </ButtonLink>
      )}
```

> **`ButtonLink`, pas `Button`** : le HTML distingue agir et naviguer, et l'inventaire du design system porte les deux pour cette raison.
>
> Le bouton « Situation de travaux » existant **reste** : c'est le chemin des entreprises gratuites, au pourcentage global. Le retirer serait une régression du gratuit.

- [ ] **Step 5 : Vérifier**

```bash
pnpm check:ds && pnpm check:size && pnpm check:isolation && pnpm build
```

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat: l'ecran de situation, dont l'apercu ne peut pas mentir"
```

---

## Task 8 : Le parcours de bout en bout

**Files:**
- Create: `tests/e2e/situation-journey.spec.ts`
- Modify: `tests/e2e/fixtures.ts`

- [ ] **Step 1 : Étendre la fixture**

`quoteFor` doit pouvoir poser une retenue. Ajouter un paramètre optionnel :

```typescript
export async function quoteFor(
  email: string,
  status: 'draft' | 'signed' = 'signed',
  retentionRate = 0,
)
```

et le passer au `db.insert(quote).values({ ..., retentionRate })`.

- [ ] **Step 2 : Écrire le parcours**

```typescript
// tests/e2e/situation-journey.spec.ts
import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor } from './helpers'
import { quoteFor, switchToPro } from './fixtures'

/**
 * Le parcours de M8·B : d'un chantier découpé en situations à une retenue de
 * garantie qui n'est pas un impayé.
 */
const PATRON = `patron-m8b-${randomUUID().slice(0, 8)}@test.local`

test('des situations de travaux à la retenue de garantie', async ({ page }) => {
  await clearMailbox()

  await test.step('connexion', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(PATRON)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(PATRON))
  })

  // Devis signé, 1 007,00 TTC, retenue de garantie de 5 % stipulée.
  const quote = await quoteFor(PATRON, 'signed', 5)
  await switchToPro(PATRON)

  await test.step('l’écran de situation propose chaque ligne du devis', async () => {
    await page.goto(`/devis/${quote.id}`)
    await page.getByRole('link', { name: 'Nouvelle situation' }).click()

    await expect(page.getByTestId('situation')).toBeVisible()
  })

  await test.step('déclarer 50 % facture la moitié du devis', async () => {
    for (const field of await page.getByLabel('Avancement').all()) await field.fill('50')

    await page.getByRole('button', { name: 'Établir la situation' }).click()

    await expect(page.getByTestId('numero-facture')).toBeVisible()
    await expect(page.getByTestId('reste-du')).toContainText('503,50')
  })

  await test.step('la retenue de garantie s’affiche, et nous ne détenons rien', async () => {
    await expect(page.getByText('Dont retenue de garantie')).toBeVisible()
    await expect(page.getByText(/nous ne détenons aucun fonds/)).toBeVisible()

    // Sans réception déclarée, la date reste inconnue — et l'écran le dit
    // plutôt que d'inventer.
    await expect(page.getByText(/n’a pas encore déclaré la réception/)).toBeVisible()
  })

  await test.step('encaisser tout sauf la retenue ne laisse PAS un impayé', async () => {
    // 503,50 − 25,18 de retenue = 478,32.
    await page.getByLabel('Montant').fill('478.32')
    await page.getByLabel('Date').fill('2026-08-10')
    await page.getByRole('button', { name: 'Enregistrer' }).click()

    // **La décision structurante du jalon, vérifiée à l'écran.**
    await expect(page.getByTestId('statut-reglement')).toHaveText('Retenue en cours')
  })

  await test.step('la situation suivante ne facture que la différence', async () => {
    await page.goto(`/devis/${quote.id}/situation`)
    for (const field of await page.getByLabel('Avancement').all()) await field.fill('100')

    await page.getByRole('button', { name: 'Établir la situation' }).click()

    await expect(page.getByTestId('reste-du')).toContainText('503,50')
  })

  await test.step('le devis est soldé au centime', async () => {
    await page.goto(`/devis/${quote.id}`)
    await expect(page.getByTestId('reste-a-facturer')).toHaveText('0,00')
  })
})
```

> **Les libellés attendus** (`Avancement`, `Établir la situation`, `Montant`, `Date`, `Enregistrer`) doivent correspondre exactement à ceux des formulaires écrits aux Tasks 4 et 7 — les relire avant de lancer.

- [ ] **Step 3 : Lancer le parcours**

```bash
pnpm test:e2e tests/e2e/situation-journey.spec.ts
```

- [ ] **Step 4 : Lancer tout**

```bash
pnpm validate && pnpm test:e2e
```

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "test: des situations de travaux a la retenue de garantie"
```

---

## Vérification par mutation

Après le vert intégral, retirer chaque garde une par une et **confirmer que le test échoue**, puis la remettre.

| Ce qu'on retire | Ce qui doit échouer |
|---|---|
| `if (remaining <= settlement.withheld) return 'withheld'` | `payment-status.test.ts` : « N'EST PAS un impayé, même après l'échéance » |
| Déplacer cette ligne **après** le test de retard | Le même test — c'est l'ORDRE qui porte la décision |
| `assertRetentionRate` dans `updateDraftQuote` | `retention.test.ts` : « REFUSE un taux supérieur au plafond légal » |
| `input.type === 'credit_note' ? 0 :` dans `issueInvoice` | `retention.test.ts` : « n'en met AUCUNE sur un avoir » |
| `releasesOn !== null &&` dans `retentionState` | `retention.test.ts` : « RETIENT indéfiniment sans réception déclarée » |
| `assertSituation(lines)` dans `issueSituation` | `situations.test.ts` : « refuse un avancement au-delà de cent pour cent » |
| `await assertProPlan(...)` dans `issueSituation` | `situations.test.ts` : « REFUSE une entreprise gratuite » |
| `eq(quote.companyId, companyId)` dans `referenceLines` | `situations.test.ts` : « ne voit PAS le chantier d'une autre entreprise » |
| `.filter((line) => line.unitPriceExclTax > 0)` sur `delta` | `situations.test.ts` : « REFUSE une situation qui ne facture rien de plus » |

> Une mutation qui laisse la suite verte signale un test qui ne mesure rien. **Le corriger avant de continuer.**

---

## Vérification manuelle

- [ ] Sur un devis en brouillon, choisir « 5 % » de retenue, puis ouvrir le PDF : la stipulation y figure avec le montant.
- [ ] Émettre une facture, puis **changer le taux du devis** : la facture déjà émise ne bouge pas.
- [ ] Sur la page publique de la facture (`/f/<jeton>`), le client lit ce qu'il peut retenir, ce qu'il doit consigner, et **combien régler aujourd'hui**.
- [ ] Déclarer la réception depuis l'espace client (`/mes-chantiers/<id>`) : la date de libération apparaît côté artisan.
- [ ] Une fois la date passée (basculer l'horloge en base sur `received_at`), le statut repasse de « Retenue en cours » à « En retard ».
- [ ] Sur l'écran de situation, changer un pourcentage : le montant prévisionnel bouge **et vaut exactement** celui de la facture émise ensuite.
- [ ] Une entreprise **gratuite** ne voit pas « Nouvelle situation », et son bouton « Situation de travaux » au pourcentage global fonctionne toujours.

---

## Ce que ce plan ne fait pas

- **Aucune consignation de fonds.** Nous n'en avons ni le droit ni l'envie. Les écrans le disent.
- **Aucune opposition motivée.** La loi permet au maître d'ouvrage de s'opposer à la libération ; nous ne modélisons pas cette procédure — voir ci-dessous.
- **Aucune caution bancaire de substitution**, alternative légale à la retenue. Personne ne l'a demandée.
- **Aucun métré, aucun attachement, aucune révision de prix.** Spec §4.2.
- **Aucune relance.** Plan C — c'est lui qui consommera `amountDueNow`.
- **Aucune régression du gratuit** : `issueProgress` au pourcentage global reste, inchangé.

## Ce qui reste ouvert

- **L'opposition motivée n'existe pas dans le produit.** Un maître d'ouvrage qui refuse de libérer la retenue le fera hors de l'outil, et l'écran continuera d'annoncer une somme exigible qu'il ne paiera pas. À revoir si le cas se présente — le construire d'avance reviendrait à outiller un conflit que nous n'avons jamais vu.
- **Un client qui ne déclare jamais sa réception bloque la retenue de son artisan.** Le produit le rend visible, il ne le résout pas. C'est le genre de blocage qui se règle par téléphone, et l'artisan doit au moins savoir qu'il a un appel à passer.
- **Les avancements sont des entiers.** Un lot déclaré à 33,5 % ne se saisit pas. Aucun artisan interrogé ne l'a demandé ; le jour où l'un le fera, la colonne devient un `numeric` et la fonction pure suit.
- **Le report des pourcentages ne survit pas à un avenant.** Documenté, sans conséquence financière — mais c'est une ressaisie de toutes les lignes, et sur un devis de trente lignes ce sera perçu comme un défaut.
