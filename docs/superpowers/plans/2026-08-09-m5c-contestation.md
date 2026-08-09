# M5·C — La contestation · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qu'un chiffre du passeport puisse être contesté par l'artisan et arbitré par le client — et que le silence ne profite jamais à celui qui conteste.

**Architecture:** La contestation est une **ligne stockée** ; son état, lui, se **calcule à la lecture** — comme tout le reste du produit. Le verdict du client est écrit une fois et la base refuse qu'il soit réécrit. Le calcul des métriques reçoit la contestation en donnée et décide seul : la règle vit dans le pur, pas dans le service.

**Tech Stack:** Identique. Aucune dépendance nouvelle.

> **Contraintes de l'atelier.** 250 lignes par fichier, aucune fonctionnalité n'importe d'une autre, design system obligatoire.
>
> **Déviation de format, comme aux jalons précédents.** Les écrans dont la structure existe renvoient à leurs équivalents ; le code complet est donné là où la logique est neuve.

**Références :** [spec M5 §5](../specs/2026-08-08-m5-metriques-design.md) · [plan M5·B](2026-08-08-m5b-metriques.md) · [AIPD](../rgpd/2026-08-08-aipd-passeport.md)

---

## Trois corrections de la spec, faites en planifiant

### 1. Une seule mesure est contestable : le respect du délai

La spec ouvre la contestation sans dire sur quoi elle porte. Appliquée aux deux taux, **elle détruit celui qu'elle est censée protéger.**

L'écart devis → facture est une soustraction entre deux montants **tous deux authentifiés par une signature du client**. Il n'y a aucun fait à établir. Ce que l'artisan contesterait, c'est l'interprétation — *« c'est le client qui a demandé plus »* — et le client, lui, le confirmerait, parce que c'est vrai : il a signé l'avenant.

> Tout artisan ayant fait signer un avenant obtiendrait donc gain de cause. Le taux retomberait à 100 % pour tout le monde.

C'est **exactement la vacance que le §2.2 de la spec a été écrit pour supprimer**. On la réintroduirait par la porte de derrière.

Le respect du délai, lui, est contestable pour une vraie raison : le nombre est juste, mais **l'imputation peut être fausse**. Le client était absent, un autre corps d'état bloquait le chantier, le client a changé d'avis en cours de route. Le client s'en souvient et peut trancher.

> **Décision. Seul le respect du délai annoncé se conteste.** L'écart devis → facture ne se conteste pas ; il s'accompagne d'une **déclaration complémentaire** (article 16), qui attache le contexte sans toucher au chiffre. C'est précisément l'instrument prévu pour ça.

Conséquence d'implémentation : **pas de colonne `subject`**. Une seconde mesure contestable, si elle vient un jour, aura sa propre question et sa propre règle d'arbitrage — pas une valeur d'énumération.

### 2. `expired` n'est pas un verdict

La spec l'inscrit dans la colonne `verdict` aux côtés de `upheld` et `rejected`. Ce n'en est pas un : c'est **l'absence de réponse passé un délai**, et c'est une information que la date de la contestation contient déjà.

L'écrire supposerait une tâche planifiée qui la balaie. Si cette tâche tombe — et le jalon M3 a montré qu'elles tombent — **un chantier reste exclu du calcul indéfiniment**, sur une exclusion que plus rien ne justifie. C'est un état stocké qui survit à sa cause, l'erreur que ce produit refuse depuis M2.

> **Décision.** `verdict` vaut `'upheld' | 'rejected'`, et **`NULL` tant que le client n'a pas répondu**. L'expiration se déduit de `expires_at` à chaque lecture. Aucune tâche planifiée.

### 3. Une contestation retenue ne compte pas le chantier comme respecté

Le client dit *« le retard ne vient pas de lui »*. Il n'a pas dit *« il était dans les temps »* — il a dit que la mesure n'est pas imputable à l'artisan.

Le compter comme respecté inventerait un fait. Le retirer du calcul, c'est ce que le produit fait déjà pour un chantier sans délai engagé : *sans engagement déclaré, il n'y a rien à comparer*.

> **Décision. Une contestation retenue retire le chantier du taux de délai — numérateur et dénominateur.**

Et c'est ce qui rend le mécanisme **auto-limitant** : le chantier reste compté dans le volume total, mais quitte le volume du taux de délai. Un artisan qui conteste la moitié de ses chantiers affiche un taux portant sur cinq chantiers à côté d'un compteur qui en annonce quinze. **L'abus se voit dans le chiffre au lieu de se cacher derrière lui** — c'est le même mécanisme que le volume affiché du plan B, appliqué à la contestation elle-même. Aucune règle anti-abus supplémentaire n'est nécessaire.

---

## Décisions verrouillées

**Le client arbitre, pas nous.** Une revue interne aurait été moins chère ; elle aurait fait de nous le juge de nos propres chiffres, sur un produit dont l'argument est que la mesure ne repose pas sur notre parole.

**Le silence ne profite jamais au contestant.** Passé quatorze jours, la mesure initiale s'applique. Sans cette règle, un artisan contesterait chaque chantier défavorable et s'appuierait sur le silence pour les neutraliser.

**Une contestation par chantier, une réponse par contestation.** L'unicité est portée par la base ; la réponse unique par un déclencheur, pas par une convention de code.

**Pendant l'instruction, le chantier sort du taux de délai** — article 18. Il reste compté dans le volume de chantiers terminés.

**La question posée au client est factuelle et symétrique.** Pas *« votre artisan a-t-il raison ? »* : il ne nous doit rien, et une question orientée fabriquerait la réponse qu'elle appelle. Deux réponses de même poids, et ne pas répondre est dit comme un choix légitime.

**Un seul message, aucune relance.** Relancer transformerait une demande légitime en pression exercée sur un particulier au bénéfice d'un professionnel.

**Aucune donnée personnelle dans le journal.** L'événement rectificatif porte l'identifiant du chantier et le verdict. Jamais le nom du client, jamais le texte de sa réponse — il n'y a d'ailleurs pas de texte à écrire.

**La contestation ne se conteste pas plus fort que la signature.** Le lien à jeton par e-mail est ce que M1 utilise déjà ; on n'y ajoute pas de code SMS, parce que l'enjeu est une métrique et non un contrat, et parce que l'abus est visible (voir correction n° 3). C'est un pari assumé, listé en fin de plan.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/dispute.ts` | Règle du silence, état d'une contestation, recevabilité — **pur** |
| `src/domain/passport-metrics.ts` | *(modifié)* le taux de délai tient compte de la contestation |
| `src/db/schema/dispute.ts` | `metric_dispute`, `metric_statement` |
| `supabase/migrations/9007_single_arbitration.sql` | Une réponse, une seule, imposée par la base |
| `src/services/disputes.ts` | Ouvrir, charger par jeton, arbitrer |
| `src/services/dispute-mail.ts` | Le message adressé au client |
| `src/services/statements.ts` | La déclaration complémentaire — article 16 |
| `src/services/passport-metrics.ts` | *(modifié)* l'exclusion portée par la requête |
| `src/app/c/[token]/**` | L'arbitrage du client, sans compte |
| `src/app/(app)/devis/[id]/DisputeButton.tsx` | Ouvrir une contestation |
| `src/app/(app)/devis/[id]/StatementForm.tsx` | Écrire la déclaration complémentaire |
| `src/app/(app)/mon-passeport/DisputeList.tsx` | Ce qui est en cours d'instruction |
| `src/app/passeport/definitions/page.tsx` | *(modifié)* la contestation est dite publiquement |

---

## Task 1 : La règle du silence

Le cœur du jalon, et une fonction pure. Tout le reste en découle.

**Files:**
- Create: `src/domain/dispute.ts`
- Test: `tests/domain/dispute.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/dispute.test.ts
import { describe, it, expect } from 'vitest'
import {
  DISPUTE_WINDOW_DAYS,
  MAX_REASON_LENGTH,
  assertDisputable,
  disputeStanding,
  expiryOf,
  type Dispute,
} from '@/domain/dispute'

const NOW = new Date('2026-08-09T12:00:00Z')
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

const open = (overrides: Partial<Dispute> = {}): Dispute => ({
  expiresAt: daysFromNow(14),
  verdict: null,
  ...overrides,
})

describe('la fenetre de reponse', () => {
  it('dure quatorze jours', () => {
    expect(DISPUTE_WINDOW_DAYS).toBe(14)
  })

  it('se calcule depuis l ouverture', () => {
    expect(expiryOf(NOW).toISOString()).toBe('2026-08-23T12:00:00.000Z')
  })
})

describe('etat d une contestation', () => {
  it('est en instruction tant que le delai court', () => {
    expect(disputeStanding(open(), NOW)).toBe('under_review')
  })

  it('est retenue quand le client donne raison a l artisan', () => {
    expect(disputeStanding(open({ verdict: 'upheld' }), NOW)).toBe('upheld')
  })

  it('est close quand le client donne tort', () => {
    expect(disputeStanding(open({ verdict: 'rejected' }), NOW)).toBe('settled')
  })

  it('est close quand le delai est passe sans reponse', () => {
    // LA regle du jalon : le silence ne profite jamais au contestant. Sans
    // elle, l'artisan contesterait chaque chantier defavorable et s'appuierait
    // sur l'absence de reponse pour les neutraliser indefiniment.
    expect(disputeStanding(open({ expiresAt: daysFromNow(-1) }), NOW)).toBe('settled')
  })

  it('traite l instant exact de l expiration comme une cloture', () => {
    // Une inegalite stricte laisserait un chantier en instruction une
    // milliseconde de trop : sans consequence, mais indefendable a expliquer.
    expect(disputeStanding(open({ expiresAt: NOW }), NOW)).toBe('settled')
  })

  it('garde une contestation retenue apres l expiration du delai', () => {
    // Une reponse ne se perime pas. Le delai borne l'attente, pas le verdict.
    expect(disputeStanding(open({ verdict: 'upheld', expiresAt: daysFromNow(-30) }), NOW)).toBe(
      'upheld',
    )
  })
})

describe('recevabilite', () => {
  const base = {
    completedAt: new Date('2026-08-01T10:00:00Z'),
    signedAt: new Date('2026-07-01T10:00:00Z'),
    committedLeadTimeDays: 5,
    businessDaysUsed: 23,
    existing: null,
    reason: 'Le client était absent trois semaines.',
  }

  it('accepte un chantier termine en retard, jamais conteste', () => {
    expect(() => assertDisputable(base)).not.toThrow()
  })

  it('refuse un chantier qui n est pas termine', () => {
    expect(() => assertDisputable({ ...base, completedAt: null })).toThrow(/terminé/)
  })

  it('refuse un chantier sans delai engage', () => {
    // Il ne compte deja pas dans le taux : le contester n'aurait aucun effet.
    expect(() => assertDisputable({ ...base, committedLeadTimeDays: null })).toThrow(/délai/)
  })

  it('refuse un chantier livre dans les temps', () => {
    // Offrir le bouton sur tous les chantiers inviterait a contester par
    // reflexe. On ne conteste que ce qui coute quelque chose.
    expect(() => assertDisputable({ ...base, businessDaysUsed: 4 })).toThrow(/dans le délai/)
  })

  it('refuse une seconde contestation', () => {
    // Rejouer la meme contestation jusqu'a obtenir une reponse favorable
    // viderait l'arbitrage de son sens.
    expect(() => assertDisputable({ ...base, existing: open() })).toThrow(/déjà/)
  })

  it('refuse une seconde contestation MEME apres un verdict defavorable', () => {
    expect(() => assertDisputable({ ...base, existing: open({ verdict: 'rejected' }) })).toThrow(
      /déjà/,
    )
  })

  it('exige un motif', () => {
    expect(() => assertDisputable({ ...base, reason: '   ' })).toThrow(/motif/)
  })

  it('refuse un motif plus long que la limite', () => {
    const tooLong = 'a'.repeat(MAX_REASON_LENGTH + 1)
    expect(() => assertDisputable({ ...base, reason: tooLong })).toThrow(/trop long/)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/domain/dispute.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "@/domain/dispute"`.

- [ ] **Step 3 : Écrire l'implémentation**

```typescript
// src/domain/dispute.ts

/**
 * La contestation d'une mesure du passeport.
 *
 * **Une seule mesure se conteste : le respect du delai.** L'ecart devis →
 * facture est une soustraction entre deux montants tous deux authentifies par
 * une signature du client ; il n'y a aucun fait a etablir, et le client
 * confirmerait toujours avoir demande le supplement — ce qui reduirait le taux
 * a 100 % pour tout le monde. Ce que l'artisan peut y opposer est un contexte,
 * pas un fait : c'est la declaration complementaire de l'article 16.
 *
 * Le delai, lui, se conteste pour une vraie raison : le nombre est juste, mais
 * l'imputation peut etre fausse.
 */

/**
 * Le delai laisse au client pour repondre.
 *
 * Passe ce delai, **la mesure initiale s'applique**. C'est la regle qui decide
 * si le mecanisme est solide ou abusable : sans elle, contester suffirait a
 * neutraliser un chantier indefiniment.
 */
export const DISPUTE_WINDOW_DAYS = 14

/** Le motif est lu par un particulier, a cote d'une seule question. */
export const MAX_REASON_LENGTH = 500

export interface Dispute {
  expiresAt: Date
  /**
   * `null` tant que le client n'a pas repondu.
   *
   * **L'expiration n'est pas un verdict** : elle se deduit de `expiresAt` a
   * chaque lecture. L'ecrire supposerait une tache planifiee dont la panne
   * laisserait un chantier exclu du calcul sans plus aucune raison.
   */
  verdict: 'upheld' | 'rejected' | null
}

/**
 * - `under_review` : le delai court, le chantier sort du calcul (article 18)
 * - `upheld` : le client a donne raison a l'artisan, le retard n'est pas imputable
 * - `settled` : la mesure initiale s'applique — tort donne, ou silence
 */
export type DisputeStanding = 'under_review' | 'upheld' | 'settled'

export function expiryOf(openedAt: Date): Date {
  return new Date(openedAt.getTime() + DISPUTE_WINDOW_DAYS * 86_400_000)
}

export function disputeStanding(dispute: Dispute, now: Date): DisputeStanding {
  // Une reponse ne se perime pas : le delai borne l'attente, pas le verdict.
  if (dispute.verdict === 'upheld') return 'upheld'
  if (dispute.verdict === 'rejected') return 'settled'

  return now.getTime() < dispute.expiresAt.getTime() ? 'under_review' : 'settled'
}

export interface DisputableChantier {
  completedAt: Date | null
  signedAt: Date
  committedLeadTimeDays: number | null
  /** Jours ouvres reellement consommes, calcules par l'appelant. */
  businessDaysUsed: number
  existing: Dispute | null
  reason: string
}

export function assertDisputable(chantier: DisputableChantier): void {
  if (chantier.completedAt === null) {
    throw new Error("Un chantier se conteste une fois terminé")
  }
  if (chantier.committedLeadTimeDays === null) {
    // Sans engagement, le chantier ne compte deja pas dans le taux : le
    // contester n'aurait aucun effet, et le proposer serait mentir.
    throw new Error("Ce devis n'engageait aucun délai : rien à contester")
  }
  if (chantier.businessDaysUsed <= chantier.committedLeadTimeDays) {
    throw new Error('Ce chantier a été terminé dans le délai engagé')
  }
  if (chantier.existing !== null) {
    throw new Error('Ce chantier a déjà fait l’objet d’une contestation')
  }
  if (!chantier.reason.trim()) {
    throw new Error('Le motif est obligatoire')
  }
  if (chantier.reason.length > MAX_REASON_LENGTH) {
    throw new Error(`Ce motif est trop long (${MAX_REASON_LENGTH} caractères maximum)`)
  }
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
pnpm vitest run tests/domain/dispute.test.ts
```

Attendu : 15 tests verts.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/dispute.ts tests/domain/dispute.test.ts
git commit -m "feat: la regle du silence, quatorze jours qui ne profitent pas au contestant"
```

---

## Task 2 : Le taux de délai tient compte de la contestation

**Files:**
- Modify: `src/domain/passport-metrics.ts`
- Modify: `tests/domain/passport-metrics.test.ts`

- [ ] **Step 1 : Ajouter les tests qui échouent**

Le fixture existant `kept()` gagne le champ `dispute`. Ajouter en tête du fichier, dans l'objet retourné par `kept`, la ligne `dispute: null,` — sans quoi le compilateur refuse tout le fichier.

Puis ajouter ce bloc à la fin de `tests/domain/passport-metrics.test.ts` :

```typescript
describe('contestation du delai', () => {
  const openUntil = (days: number) => ({
    expiresAt: new Date(NOW.getTime() + days * 86_400_000),
    verdict: null as null,
  })

  const late = (overrides: Partial<CompletedChantier> = {}) =>
    kept({ signedAt: daysAgo(40), completedAt: daysAgo(1), committedLeadTimeDays: 5, ...overrides })

  it('sort du taux le chantier en cours d instruction', () => {
    // Article 18 : pendant l'instruction, le chiffre dispute ne s'affiche pas.
    const chantiers = [...many(10), late({ dispute: openUntil(7) })]
    const metrics = computeMetrics(chantiers, NOW)

    expect(metrics.leadTimeRespect.volume).toBe(10)
    expect(metrics.leadTimeRespect.value).toBe(100)
  })

  it('y ramene le chantier quand le delai passe sans reponse', () => {
    // La meme contestation, quinze jours plus tard : le silence n'a rien gagne.
    const chantiers = [...many(10), late({ dispute: openUntil(-1) })]
    const metrics = computeMetrics(chantiers, NOW)

    expect(metrics.leadTimeRespect.volume).toBe(11)
    expect(metrics.leadTimeRespect.value).toBe(91)
  })

  it('sort du taux le chantier dont la contestation est retenue', () => {
    const chantiers = [...many(10), late({ dispute: { expiresAt: daysAgo(1), verdict: 'upheld' } })]
    const metrics = computeMetrics(chantiers, NOW)

    expect(metrics.leadTimeRespect.volume).toBe(10)
  })

  it('ne compte JAMAIS un chantier retenu comme respecte', () => {
    // Le client a dit que le retard n'etait pas imputable a l'artisan. Il n'a
    // pas dit qu'il etait dans les temps : le compter comme tenu inventerait
    // un fait.
    const chantiers = [
      ...many(9),
      late({ dispute: { expiresAt: daysAgo(1), verdict: 'upheld' } }),
    ]
    const metrics = computeMetrics(chantiers, NOW)

    // Neuf chantiers seulement : sous le seuil, donc aucun taux.
    expect(metrics.leadTimeRespect.volume).toBe(9)
    expect(metrics.leadTimeRespect.value).toBeNull()
  })

  it('garde le chantier dans le taux quand le client donne tort', () => {
    const chantiers = [
      ...many(10),
      late({ dispute: { expiresAt: daysAgo(1), verdict: 'rejected' } }),
    ]
    expect(computeMetrics(chantiers, NOW).leadTimeRespect.volume).toBe(11)
  })

  it('n a AUCUN effet sur l ecart devis vers facture', () => {
    // La correction n° 1 du plan, verifiee : une contestation du delai ne doit
    // rien pouvoir changer a une soustraction entre deux montants signes.
    const overrun = late({ invoicedInclTax: 200000, dispute: openUntil(7) })
    const chantiers = [...many(9), overrun]

    expect(computeMetrics(chantiers, NOW).quoteToInvoiceGap.volume).toBe(10)
    expect(computeMetrics(chantiers, NOW).quoteToInvoiceGap.value).toBe(90)
  })

  it('laisse le chantier conteste dans le volume de chantiers termines', () => {
    // Ce qui rend le mecanisme auto-limitant : le compteur ne bouge pas, seul
    // le volume du taux baisse. Contester beaucoup se VOIT.
    const chantiers = [...many(10), late({ dispute: openUntil(7) })]
    const metrics = computeMetrics(chantiers, NOW)

    expect(metrics.completed.window).toBe(11)
    expect(metrics.leadTimeRespect.volume).toBe(10)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/domain/passport-metrics.test.ts
```

Attendu : ÉCHEC — la propriété `dispute` n'existe pas sur `CompletedChantier`.

- [ ] **Step 3 : Modifier le domaine**

Dans `src/domain/passport-metrics.ts`, ajouter l'import et le champ :

```typescript
import { disputeStanding, type Dispute } from './dispute'
```

Dans `CompletedChantier`, après `invoicedInclTax` :

```typescript
  /**
   * La contestation du delai, ou `null`. **Elle ne porte que sur le delai** :
   * l'ecart devis → facture est une soustraction entre deux montants signes,
   * qu'aucun arbitrage ne peut deplacer.
   */
  dispute: Dispute | null
```

Remplacer le calcul de `withCommitment` par :

```typescript
  // Sans engagement declare, il n'y a rien a comparer : compter le chantier
  // comme tenu flatterait, le compter comme manque punirait.
  //
  // Une contestation en instruction ou retenue produit le meme effet, et pour
  // la meme raison : dans un cas la mesure est suspendue (article 18), dans
  // l'autre le client a dit que le retard n'etait pas imputable a l'artisan.
  // Ni l'un ni l'autre n'etablit qu'il etait dans les temps.
  const withCommitment = recent.filter((c) => leadTimeMeasured(c, now))
```

Et ajouter la fonction, au-dessus de `computeMetrics` :

```typescript
function leadTimeMeasured(chantier: CompletedChantier, now: Date): boolean {
  if (chantier.committedLeadTimeDays === null) return false
  if (chantier.dispute === null) return true

  return disputeStanding(chantier.dispute, now) === 'settled'
}
```

- [ ] **Step 4 : Lancer toute la suite du domaine**

```bash
pnpm vitest run tests/domain/
```

Attendu : tous verts, dont les 7 nouveaux.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/passport-metrics.ts tests/domain/passport-metrics.test.ts
git commit -m "feat: une contestation retire le chantier du taux, jamais ne le compte tenu"
```

---

## Task 3 : Le schéma, et une réponse qui ne se réécrit pas

**Files:**
- Create: `src/db/schema/dispute.ts`
- Modify: `src/db/schema/index.ts`
- Create: `supabase/migrations/9007_single_arbitration.sql`
- Test: `tests/db/dispute-immutability.test.ts`

- [ ] **Step 1 : Écrire le schéma**

```typescript
// src/db/schema/dispute.ts
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company } from './company'
import { quote } from './quote'

/**
 * La contestation d'une mesure du passeport, arbitree par le client.
 *
 * C'est **le client qui tranche**, parce qu'il a co-signe le devis : il est le
 * temoin qui authentifie la mesure, donc le temoin naturel du desaccord. Une
 * revue interne aurait ete moins chere ; elle aurait fait de nous le juge de
 * nos propres chiffres, sur un produit dont l'argument est que la mesure ne
 * repose pas sur notre parole.
 *
 * **Une seule contestation par chantier** — l'unicite est portee ici. Rejouer
 * la meme contestation jusqu'a obtenir une reponse favorable viderait
 * l'arbitrage de son sens.
 */
export const metricDispute = pgTable(
  'metric_dispute',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** La RACINE de la chaine de versions, comme les factures et la fin de chantier. */
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quote.id)
      .unique(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    /** Motive, obligatoire : c'est ce que le client lit avant de repondre. */
    reason: text('reason').notNull(),
    /** Le lien du client, comme pour la signature de M1. Il n'a pas de compte. */
    publicToken: text('public_token').notNull().unique(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    /**
     * Quatorze jours. **Passe ce delai, la mesure initiale s'applique** — et
     * cela se deduit a la lecture, sans tache planifiee.
     */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /**
     * `null` tant que le client n'a pas repondu.
     *
     * `expired` n'y figure pas : ce n'est pas un verdict, c'est l'absence de
     * reponse passe une date que cette table porte deja.
     */
    verdict: text('verdict', { enum: ['upheld', 'rejected'] }),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
  },
  (t) => [index('metric_dispute_company_idx').on(t.companyId)],
)

/**
 * La declaration complementaire — article 16.
 *
 * Elle attache un contexte au chantier ; **elle ne change pas le chiffre**.
 * C'est ce qui concilie « le passeport est derive et non editable » avec le
 * droit de rectification : l'artisan ne peut pas corriger un fait exact, mais
 * il ne doit pas rester sans voix a cote de lui.
 *
 * Une par chantier, reecrivable : c'est le texte de l'artisan sur lui-meme, pas
 * un fait constate — la regle d'immuabilite du journal ne s'y applique pas.
 */
export const metricStatement = pgTable('metric_statement', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quote.id)
    .unique(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => company.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const metricDisputeRelations = relations(metricDispute, ({ one }) => ({
  quote: one(quote, { fields: [metricDispute.quoteId], references: [quote.id] }),
}))

export const metricStatementRelations = relations(metricStatement, ({ one }) => ({
  quote: one(quote, { fields: [metricStatement.quoteId], references: [quote.id] }),
}))
```

Ajouter à `src/db/schema/index.ts`, après la ligne `export * from './event'` :

```typescript
export * from './dispute'
```

- [ ] **Step 2 : Générer la migration Drizzle**

```bash
pnpm drizzle-kit generate
```

Attendu : un fichier `0009_*.sql` créant les deux tables.

- [ ] **Step 3 : Écrire le déclencheur d'arbitrage unique**

```sql
-- supabase/migrations/9007_single_arbitration.sql

-- Une contestation se repond UNE FOIS.
--
-- L'unicite par chantier est portee par la contrainte de la table ; celle de la
-- reponse ne peut pas l'etre, puisque la ligne nait sans verdict et en recoit un
-- ensuite. Sans ce declencheur, un double envoi du formulaire ou un defaut de
-- code reecrirait un arbitrage deja rendu — et personne ne le verrait.
--
-- Comme pour la facture et le journal, la regle est imposee par la base plutot
-- que par une convention : une convention se contourne par accident.

CREATE OR REPLACE FUNCTION reject_dispute_rewrite()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Une contestation ne se supprime pas';
  END IF;

  IF OLD.verdict IS NOT NULL THEN
    RAISE EXCEPTION 'Cette contestation a deja ete arbitree';
  END IF;

  -- Le motif et le jeton sont figes a l'ouverture : seule la reponse s'ecrit.
  IF NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.public_token IS DISTINCT FROM OLD.public_token
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.quote_id IS DISTINCT FROM OLD.quote_id THEN
    RAISE EXCEPTION 'Seule la reponse du client peut etre ecrite';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER metric_dispute_single_arbitration
BEFORE UPDATE OR DELETE ON metric_dispute
FOR EACH ROW EXECUTE FUNCTION reject_dispute_rewrite();
```

- [ ] **Step 4 : Appliquer et écrire le test de vérification**

```bash
pnpm supabase db reset
```

```typescript
// tests/db/dispute-immutability.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes, randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, customer, project, property, quote, metricDispute } from '@/db/schema'

/**
 * La verification doit porter sur des LIGNES REELLES.
 *
 * Un `UPDATE` sur une table vide ne declenche rien et passe toujours : c'est
 * exactement le piege qui avait rendu vacante la verification d'immuabilite de
 * M2.
 */
let disputeId: string

beforeAll(async () => {
  const [companyRow] = await db
    .insert(company)
    .values({
      siret: randomBytes(7).toString('hex').replace(/\D/g, '').padEnd(14, '1').slice(0, 14),
      legalName: 'CONTESTATION TEST',
      addressLine1: '1 rue du Test',
      postalCode: '33000',
      city: 'Bordeaux',
    })
    .returning()

  const [propertyRow] = await db
    .insert(property)
    .values({ addressLine1: '1 rue du Test', postalCode: '33000', city: 'Bordeaux' })
    .returning()

  const [customerRow] = await db
    .insert(customer)
    .values({ companyId: companyRow.id, name: 'Client', email: 'client@test.local' })
    .returning()

  const [projectRow] = await db
    .insert(project)
    .values({
      companyId: companyRow.id,
      customerId: customerRow.id,
      propertyId: propertyRow.id,
      label: 'Chantier',
    })
    .returning()

  const [quoteRow] = await db
    .insert(quote)
    .values({
      projectId: projectRow.id,
      companyId: companyRow.id,
      number: `D-${randomUUID().slice(0, 8)}`,
      status: 'signed',
      publicToken: randomBytes(16).toString('base64url'),
    })
    .returning()

  const [dispute] = await db
    .insert(metricDispute)
    .values({
      quoteId: quoteRow.id,
      companyId: companyRow.id,
      reason: 'Le client était absent.',
      publicToken: randomBytes(16).toString('base64url'),
      expiresAt: new Date(Date.now() + 14 * 86_400_000),
    })
    .returning()

  disputeId = dispute.id
})

describe('une contestation ne se repond qu une fois', () => {
  it('accepte le premier arbitrage', async () => {
    await db.execute(
      sql`UPDATE metric_dispute SET verdict = 'upheld', answered_at = now() WHERE id = ${disputeId}`,
    )

    const [row] = await db.execute<{ verdict: string }>(
      sql`SELECT verdict FROM metric_dispute WHERE id = ${disputeId}`,
    )
    expect(row.verdict).toBe('upheld')
  })

  it('refuse le second', async () => {
    await expect(
      db.execute(sql`UPDATE metric_dispute SET verdict = 'rejected' WHERE id = ${disputeId}`),
    ).rejects.toThrow(/deja ete arbitree/)
  })

  it('refuse la suppression', async () => {
    await expect(
      db.execute(sql`DELETE FROM metric_dispute WHERE id = ${disputeId}`),
    ).rejects.toThrow(/ne se supprime pas/)
  })
})
```

- [ ] **Step 5 : Lancer le test**

```bash
pnpm vitest run tests/db/dispute-immutability.test.ts
```

Attendu : 3 tests verts. **Vérifier que le second et le troisième échouent bien pour la raison annoncée** — les faire passer sur une base sans le déclencheur doit produire un échec, sinon la garantie est vacante.

- [ ] **Step 6 : Commit**

```bash
git add src/db/schema/dispute.ts src/db/schema/index.ts drizzle/ supabase/migrations/9007_single_arbitration.sql tests/db/dispute-immutability.test.ts
git commit -m "feat: le schema de la contestation, une reponse imposee par la base"
```

---

## Task 4 : Ouvrir une contestation

**Files:**
- Create: `src/services/disputes.ts`
- Create: `src/services/dispute-mail.ts`
- Test: `tests/services/disputes.test.ts`

- [ ] **Step 1 : Écrire le message adressé au client**

```typescript
// src/services/dispute-mail.ts
import { createTransport } from 'nodemailer'

const transport = createTransport({
  host: process.env.SMTP_HOST ?? '127.0.0.1',
  port: Number(process.env.SMTP_PORT ?? 54325),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' }
    : undefined,
})

const FROM = process.env.SMTP_FROM ?? 'D’équerre <devis@dequerre.local>'

/**
 * La demande d'arbitrage.
 *
 * **Un seul message, aucune relance.** Relancer transformerait une demande
 * legitime en pression exercee sur un particulier au benefice d'un
 * professionnel — et le produit existe pour l'inverse.
 *
 * Le message dit ce qu'il en est : ce qu'on lui demande, pourquoi lui, et que
 * ne pas repondre est un choix legitime dont il connait la consequence.
 */
export async function sendDisputeLink(input: {
  to: string
  customerName: string
  companyName: string
  quoteNumber: string
  link: string
}): Promise<void> {
  await transport.sendMail({
    from: FROM,
    to: input.to,
    subject: `Une question sur le chantier ${input.quoteNumber}`,
    text: [
      `Bonjour ${input.customerName},`,
      '',
      `${input.companyName} conteste la façon dont son délai a été mesuré sur le chantier ${input.quoteNumber}, que vous avez signé.`,
      '',
      `Vous êtes la seule personne à savoir ce qui s'est passé. Une question, deux réponses : ${input.link}`,
      '',
      "Vous ne nous devez rien. Si vous ne répondez pas sous quatorze jours, la mesure initiale s'appliquera — c'est-à-dire celle qui est défavorable à l'entreprise.",
    ].join('\n'),
    html: `
      <p>Bonjour ${input.customerName},</p>
      <p><strong>${input.companyName}</strong> conteste la façon dont son délai a été mesuré
         sur le chantier <strong>${input.quoteNumber}</strong>, que vous avez signé.</p>
      <p>Vous êtes la seule personne à savoir ce qui s'est passé.
         <a href="${input.link}">Une question, deux réponses</a>.</p>
      <p style="color:#666;font-size:12px">Vous ne nous devez rien. Si vous ne répondez pas sous
         quatorze jours, la mesure initiale s'appliquera — c'est-à-dire celle qui est défavorable
         à l'entreprise.</p>
    `,
  })
}
```

- [ ] **Step 2 : Écrire le service**

```typescript
// src/services/disputes.ts
import { randomBytes } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { metricDispute, quote } from '@/db/schema'
import { businessDaysSince } from '@/domain/business-days'
import { assertDisputable, disputeStanding, expiryOf, type Dispute } from '@/domain/dispute'
import { rootQuoteId } from '@/services/amendments'
import { recordEvent } from '@/services/events'
import { sendDisputeLink } from '@/services/dispute-mail'

const baseUrl = () => process.env.APP_URL ?? 'http://localhost:3000'

/**
 * L'artisan conteste la mesure de son delai.
 *
 * Le chantier sort du calcul des l'ouverture — article 18 — et y revient de
 * lui-meme au bout de quatorze jours si le client ne repond pas.
 */
export async function openDispute(companyId: string, quoteId: string, reason: string, now: Date) {
  const root = await rootQuoteId(quoteId)

  const found = await db.query.quote.findFirst({
    where: and(eq(quote.id, root), eq(quote.companyId, companyId)),
    with: { project: { with: { company: true, customer: true } } },
  })
  if (!found || !found.signedAt) throw new Error('Devis introuvable')

  const [existing] = await db
    .select({ expiresAt: metricDispute.expiresAt, verdict: metricDispute.verdict })
    .from(metricDispute)
    .where(eq(metricDispute.quoteId, root))

  assertDisputable({
    completedAt: found.completedAt,
    signedAt: found.signedAt,
    committedLeadTimeDays: found.committedLeadTimeDays,
    businessDaysUsed: found.completedAt
      ? businessDaysSince(found.signedAt, found.completedAt)
      : 0,
    existing: existing ?? null,
    reason,
  })

  const token = randomBytes(24).toString('base64url')

  const [created] = await db
    .insert(metricDispute)
    .values({
      quoteId: root,
      companyId,
      reason: reason.trim(),
      publicToken: token,
      openedAt: now,
      expiresAt: expiryOf(now),
    })
    .returning()

  // Le journal porte le fait, jamais la personne : ni le nom du client, ni son
  // adresse. Le motif y figure parce qu'il est ecrit par l'entreprise sur
  // elle-meme.
  await recordEvent({
    type: 'metric.disputed',
    subjectType: 'quote',
    subjectId: root,
    companyId,
    actorType: 'company',
    payload: { measure: 'lead_time', expiresAt: created.expiresAt.toISOString() },
  })

  await sendDisputeLink({
    to: found.project.customer.email,
    customerName: found.project.customer.name,
    companyName: found.project.company.legalName,
    quoteNumber: found.number,
    link: `${baseUrl()}/c/${token}`,
  })

  return created
}

export interface DisputeView {
  quoteNumber: string
  companyName: string
  reason: string
  signedOn: string
  completedOn: string
  committedLeadTimeDays: number
  businessDaysUsed: number
  standing: ReturnType<typeof disputeStanding>
}

/**
 * Charge une contestation depuis son jeton, sans session.
 *
 * Le client n'a pas de compte : le jeton fait office d'autorisation, comme pour
 * la signature de M1. On ne lui montre que le chantier concerne — jamais les
 * metriques de l'entreprise, qui ne le regardent pas.
 */
export async function loadDisputeByToken(token: string, now: Date): Promise<DisputeView | null> {
  const found = await db.query.metricDispute.findFirst({
    where: eq(metricDispute.publicToken, token),
    with: { quote: { with: { project: { with: { company: true } } } } },
  })

  if (!found || !found.quote.signedAt || !found.quote.completedAt) return null

  return {
    quoteNumber: found.quote.number,
    companyName: found.quote.project.company.legalName,
    reason: found.reason,
    signedOn: found.quote.signedAt.toLocaleDateString('fr-FR'),
    completedOn: found.quote.completedAt.toLocaleDateString('fr-FR'),
    committedLeadTimeDays: found.quote.committedLeadTimeDays ?? 0,
    businessDaysUsed: businessDaysSince(found.quote.signedAt, found.quote.completedAt),
    standing: disputeStanding(found as Dispute, now),
  }
}

/**
 * Le client tranche.
 *
 * Le declencheur `metric_dispute_single_arbitration` refuse une seconde
 * ecriture : cette fonction n'a donc pas a la prevenir, elle a a la laisser
 * remonter.
 */
export async function arbitrate(
  token: string,
  verdict: 'upheld' | 'rejected',
  now: Date,
): Promise<void> {
  const [updated] = await db
    .update(metricDispute)
    .set({ verdict, answeredAt: now })
    .where(eq(metricDispute.publicToken, token))
    .returning()

  if (!updated) throw new Error('Contestation introuvable')

  // L'evenement rectificatif. Il neutralise l'evenement initial sans le
  // modifier — la meme regle que l'avoir qui corrige une facture.
  await recordEvent({
    type: 'metric.arbitrated',
    subjectType: 'quote',
    subjectId: updated.quoteId,
    companyId: updated.companyId,
    actorType: 'customer',
    payload: { measure: 'lead_time', verdict },
  })
}
```

- [ ] **Step 3 : Écrire les tests de service**

```typescript
// tests/services/disputes.test.ts
import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { event, metricDispute } from '@/db/schema'
import { openDispute, arbitrate, loadDisputeByToken } from '@/services/disputes'
import { lateChantier } from './helpers/chantier'

/**
 * `lateChantier` cree une entreprise, un client et un devis signe il y a
 * quarante jours, termine hier, avec cinq jours ouvres engages. Voir
 * tests/services/helpers/chantier.ts.
 */
describe('ouvrir une contestation', () => {
  it('cree la contestation et envoie le lien au client', async () => {
    const { companyId, quoteId } = await lateChantier()

    const created = await openDispute(companyId, quoteId, 'Client absent.', new Date())

    expect(created.publicToken).toMatch(/^[A-Za-z0-9_-]{20,}$/)
    expect(created.verdict).toBeNull()
  })

  it('refuse une seconde contestation sur le meme chantier', async () => {
    const { companyId, quoteId } = await lateChantier()
    await openDispute(companyId, quoteId, 'Client absent.', new Date())

    await expect(openDispute(companyId, quoteId, 'Encore.', new Date())).rejects.toThrow(/déjà/)
  })

  it('n ecrit AUCUNE donnee personnelle au journal', async () => {
    // La lecon de M1 : un e-mail en clair dans le journal immuable rendait le
    // droit a l'effacement structurellement impossible.
    const { companyId, quoteId, customerEmail, customerName } = await lateChantier()
    await openDispute(companyId, quoteId, 'Client absent.', new Date())

    const rows = await db.select().from(event).where(eq(event.subjectId, quoteId))
    const dumped = JSON.stringify(rows)

    expect(dumped).not.toContain(customerEmail)
    expect(dumped).not.toContain(customerName)
  })
})

describe('arbitrer', () => {
  it('inscrit le verdict et l evenement rectificatif', async () => {
    const { companyId, quoteId } = await lateChantier()
    const created = await openDispute(companyId, quoteId, 'Client absent.', new Date())

    await arbitrate(created.publicToken, 'upheld', new Date())

    const [row] = await db.select().from(metricDispute).where(eq(metricDispute.id, created.id))
    expect(row.verdict).toBe('upheld')
    expect(row.answeredAt).not.toBeNull()

    const rows = await db.select().from(event).where(eq(event.subjectId, quoteId))
    expect(rows.some((e) => e.type === 'metric.arbitrated')).toBe(true)
  })

  it('refuse un second arbitrage', async () => {
    const { companyId, quoteId } = await lateChantier()
    const created = await openDispute(companyId, quoteId, 'Client absent.', new Date())
    await arbitrate(created.publicToken, 'upheld', new Date())

    await expect(arbitrate(created.publicToken, 'rejected', new Date())).rejects.toThrow(
      /arbitree/,
    )
  })
})

describe('la vue du client', () => {
  it('montre le chantier et le motif, jamais les metriques de l entreprise', async () => {
    const { companyId, quoteId } = await lateChantier()
    const created = await openDispute(companyId, quoteId, 'Client absent trois semaines.', new Date())

    const view = await loadDisputeByToken(created.publicToken, new Date())

    expect(view?.reason).toBe('Client absent trois semaines.')
    expect(view?.committedLeadTimeDays).toBe(5)
    expect(view?.businessDaysUsed).toBeGreaterThan(5)
    expect(view?.standing).toBe('under_review')
    expect(Object.keys(view!)).not.toContain('leadTimeRespect')
  })

  it('rend null sur un jeton inconnu', async () => {
    expect(await loadDisputeByToken('inexistant', new Date())).toBeNull()
  })
})
```

- [ ] **Step 4 : Écrire le fixture de service**

```typescript
// tests/services/helpers/chantier.ts
import { randomBytes, randomUUID } from 'node:crypto'
import { db } from '@/db/client'
import { company, customer, project, property, quote } from '@/db/schema'

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)

/**
 * Un chantier signe il y a quarante jours, termine hier, cinq jours ouvres
 * engages : en retard, donc contestable.
 *
 * Chaque appel cree sa propre entreprise — les tests doivent etre rejouables
 * sans reinitialiser la base.
 */
export async function lateChantier() {
  const [companyRow] = await db
    .insert(company)
    .values({
      siret: randomBytes(7).toString('hex').replace(/\D/g, '').padEnd(14, '2').slice(0, 14),
      legalName: 'RETARD SARL',
      addressLine1: '2 rue du Retard',
      postalCode: '33000',
      city: 'Bordeaux',
    })
    .returning()

  const [propertyRow] = await db
    .insert(property)
    .values({ addressLine1: '2 rue du Retard', postalCode: '33000', city: 'Bordeaux' })
    .returning()

  const customerEmail = `client-${randomUUID().slice(0, 8)}@test.local`
  const customerName = `Client ${randomUUID().slice(0, 6)}`

  const [customerRow] = await db
    .insert(customer)
    .values({ companyId: companyRow.id, name: customerName, email: customerEmail })
    .returning()

  const [projectRow] = await db
    .insert(project)
    .values({
      companyId: companyRow.id,
      customerId: customerRow.id,
      propertyId: propertyRow.id,
      label: 'Chantier en retard',
    })
    .returning()

  const [quoteRow] = await db
    .insert(quote)
    .values({
      projectId: projectRow.id,
      companyId: companyRow.id,
      number: `D-${randomUUID().slice(0, 8)}`,
      status: 'signed',
      committedLeadTimeDays: 5,
      publicToken: randomBytes(16).toString('base64url'),
      signedAt: daysAgo(40),
      completedAt: daysAgo(1),
      completionSource: 'invoiced',
      totalInclTax: 100000,
    })
    .returning()

  return {
    companyId: companyRow.id,
    quoteId: quoteRow.id,
    customerEmail,
    customerName,
  }
}
```

- [ ] **Step 5 : Lancer les tests**

```bash
pnpm vitest run tests/services/disputes.test.ts
```

Attendu : 7 tests verts. Vérifier le message dans le collecteur local (`http://127.0.0.1:54324`) : il doit annoncer la conséquence du silence.

- [ ] **Step 6 : Commit**

```bash
git add src/services/disputes.ts src/services/dispute-mail.ts tests/services/
git commit -m "feat: ouvrir une contestation, un seul message au client sans relance"
```

---

## Task 5 : L'arbitrage du client, sans compte

**Files:**
- Create: `src/app/c/[token]/page.tsx`
- Create: `src/app/c/[token]/actions.ts`
- Create: `src/app/c/[token]/ArbitrationForm.tsx`

- [ ] **Step 1 : Écrire l'action serveur**

```typescript
// src/app/c/[token]/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { arbitrate } from '@/services/disputes'

export interface ArbitrationState {
  error?: string
  done?: 'upheld' | 'rejected'
}

export async function answerDispute(
  token: string,
  _state: ArbitrationState,
  form: FormData,
): Promise<ArbitrationState> {
  const verdict = String(form.get('verdict'))
  if (verdict !== 'upheld' && verdict !== 'rejected') return { error: 'Réponse invalide.' }

  try {
    await arbitrate(token, verdict, new Date())
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath(`/c/${token}`)
  return { done: verdict }
}
```

- [ ] **Step 2 : Écrire le formulaire**

Deux boutons de **même poids visuel** — `tone="secondary"` pour les deux. Un bouton primaire d'un côté ferait pencher la réponse.

```tsx
// src/app/c/[token]/ArbitrationForm.tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { answerDispute, type ArbitrationState } from './actions'

const initialState: ArbitrationState = {}

/**
 * Une question, deux reponses.
 *
 * **Les deux boutons ont le meme poids.** Une question orientee fabriquerait la
 * reponse qu'elle appelle, et le client ne nous doit rien : ni de repondre, ni
 * de repondre dans un sens.
 */
export function ArbitrationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    answerDispute.bind(null, token),
    initialState,
  )

  if (state.done) {
    return (
      <Text tone="soft" testId="reponse-enregistree">
        Merci, votre réponse est enregistrée. Vous n’avez rien d’autre à faire.
      </Text>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="verdict" value="upheld" tone="secondary" pending={pending}>
          Oui, c’est exact
        </Button>
        <Button type="submit" name="verdict" value="rejected" tone="secondary" pending={pending}>
          Non, ce n’est pas ce qui s’est passé
        </Button>
      </div>

      <Text size="sm" tone="muted">
        Vous pouvez aussi ne pas répondre : passé quatorze jours, la mesure initiale s’applique.
      </Text>

      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}
    </form>
  )
}
```

> Si `Button` n'accepte pas `name`/`value`, les ajouter au composant du design system plutôt que de contourner par un `<button>` nu : la porte de sortie est ce qui a fait mourir tous les design systems.

- [ ] **Step 3 : Écrire la page**

Structure calquée sur `src/app/d/[token]/page.tsx` : `PublicShell`, `notFound()` sur jeton inconnu, aucun accès à la session.

Contenu, dans l'ordre :

1. **Titre** — « Une question sur le chantier {quoteNumber} ».
2. **Encart d'information** — ce que l'AIPD appelle l'information de la personne concernée, et qui paie ici une partie du verrou n° 1 :
   > « Vous avez signé ce devis. À ce titre, votre signature sert à mesurer si {companyName} a tenu le délai qu'elle avait annoncé — c'est ce qui rend ce chiffre vérifiable plutôt que déclaratif. **{companyName} conteste cette mesure**, et vous êtes la seule personne à savoir ce qui s'est passé. » Avec un lien vers `/confidentialite`.
3. **Les faits, sans commentaire** — signé le {signedOn}, terminé le {completedOn}, délai engagé {committedLeadTimeDays} jours ouvrés, délai constaté {businessDaysUsed} jours ouvrés.
4. **Le motif de l'entreprise**, cité tel quel, dans une `Card elevation="flat"`, `data-testid="motif"`.
5. **La question** — « Ce retard vous semble-t-il imputable à {companyName} ? » suivie de `<ArbitrationForm token={token} />`.
6. Si `standing !== 'under_review'` : ne pas afficher le formulaire, mais `« Cette question a déjà été tranchée »` ou `« Le délai de réponse est passé »` selon le cas.

- [ ] **Step 4 : Vérifier à l'écran**

```bash
pnpm dev
```

Ouvrir le lien du collecteur de mail, suivre `/c/<token>`, répondre. Vérifier que le second envoi du même formulaire affiche l'erreur d'arbitrage déjà rendu, et non une page blanche.

- [ ] **Step 5 : Commit**

```bash
git add src/app/c
git commit -m "feat: l'arbitrage du client, une question et deux reponses de meme poids"
```

---

## Task 6 : L'exclusion portée par la requête

**Files:**
- Modify: `src/services/passport-metrics.ts`
- Test: `tests/services/passport-metrics.test.ts`

- [ ] **Step 1 : Ajouter le test qui échoue**

```typescript
it('sort du taux de delai un chantier en cours d instruction', async () => {
  // L'exigence de l'AIPD, verifiee au niveau du service : l'exclusion est
  // portee par la REQUETE, jamais par un filtre d'affichage. Un ecran qui
  // oublierait de filtrer publierait un chiffre conteste.
  const { companyId, quoteId } = await lateChantier()

  const before = await companyMetrics(companyId, new Date())
  expect(before.leadTimeRespect.volume).toBe(1)

  await openDispute(companyId, quoteId, 'Client absent.', new Date())

  const after = await companyMetrics(companyId, new Date())
  expect(after.leadTimeRespect.volume).toBe(0)
  // Le chantier reste compte : c'est ce qui rend l'abus visible.
  expect(after.completed.window).toBe(1)
})
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

```bash
pnpm vitest run tests/services/passport-metrics.test.ts
```

Attendu : ÉCHEC — `after.leadTimeRespect.volume` vaut encore 1.

- [ ] **Step 3 : Modifier le service**

Dans `src/services/passport-metrics.ts`, ajouter à la sélection une jointure gauche sur la contestation :

```typescript
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { metricDispute, invoice, quote } from '@/db/schema'
import type { Dispute } from '@/domain/dispute'
```

```typescript
  const roots = await db
    .select({
      id: quote.id,
      signedAt: quote.signedAt,
      completedAt: quote.completedAt,
      committedLeadTimeDays: quote.committedLeadTimeDays,
      initialTotalInclTax: quote.totalInclTax,
      // La contestation vient de la REQUETE, pas d'un filtre applique ensuite.
      disputeExpiresAt: metricDispute.expiresAt,
      disputeVerdict: metricDispute.verdict,
    })
    .from(quote)
    // Jointure GAUCHE : un chantier sans contestation reste dans l'instantane.
    .leftJoin(metricDispute, eq(metricDispute.quoteId, quote.id))
    .where(
      and(
        eq(quote.companyId, companyId),
        eq(quote.status, 'signed'),
        isNotNull(quote.completedAt),
        isNotNull(quote.signedAt),
        isNull(quote.supersedesQuoteId),
      ),
    )
```

Puis, dans la construction de `chantiers` :

```typescript
    const dispute: Dispute | null = root.disputeExpiresAt
      ? { expiresAt: root.disputeExpiresAt, verdict: root.disputeVerdict }
      : null

    chantiers.push({
      // ...champs existants inchangés...
      dispute,
    })
```

- [ ] **Step 4 : Lancer la suite des services**

```bash
pnpm vitest run tests/services/
```

Attendu : tous verts.

- [ ] **Step 5 : Commit**

```bash
git add src/services/passport-metrics.ts tests/services/passport-metrics.test.ts
git commit -m "feat: l'exclusion du chantier conteste, portee par la requete"
```

---

## Task 7 : La déclaration complémentaire

C'est le droit de rectification de l'article 16, rendu exerçable sur un chiffre qu'on ne peut pas corriger.

**Files:**
- Create: `src/services/statements.ts`
- Test: `tests/services/statements.test.ts`

- [ ] **Step 1 : Écrire le service**

```typescript
// src/services/statements.ts
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { metricStatement, quote } from '@/db/schema'
import { rootQuoteId } from '@/services/amendments'
import { recordEvent } from '@/services/events'

/**
 * Elle est publiee a cote d'un chiffre, pas a la place. Au-dela, ce n'est plus
 * un contexte, c'est une reponse.
 */
export const MAX_STATEMENT_LENGTH = 500

/**
 * La declaration complementaire — article 16.
 *
 * Le passeport est **derive et non editable** : l'artisan ne peut pas corriger
 * un fait exact. Mais un droit de rectification qui n'aboutit a rien n'est pas
 * un droit — il doit pouvoir attacher son contexte au chantier.
 *
 * **Elle ne change aucun chiffre.** Aucune metrique ne la lit ; c'est
 * volontaire, et c'est ce qui la distingue de la contestation.
 */
export async function saveStatement(companyId: string, quoteId: string, body: string) {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('La déclaration est vide')
  if (trimmed.length > MAX_STATEMENT_LENGTH) {
    throw new Error(`Déclaration trop longue (${MAX_STATEMENT_LENGTH} caractères maximum)`)
  }

  const root = await rootQuoteId(quoteId)

  const [owned] = await db
    .select({ id: quote.id })
    .from(quote)
    .where(and(eq(quote.id, root), eq(quote.companyId, companyId)))
  if (!owned) throw new Error('Devis introuvable')

  const [saved] = await db
    .insert(metricStatement)
    .values({ quoteId: root, companyId, body: trimmed })
    // C'est le texte de l'artisan sur lui-meme, pas un fait constate : la regle
    // d'immuabilite du journal ne s'y applique pas, il peut le reecrire.
    .onConflictDoUpdate({
      target: metricStatement.quoteId,
      set: { body: trimmed, updatedAt: new Date() },
    })
    .returning()

  await recordEvent({
    type: 'metric.statement_saved',
    subjectType: 'quote',
    subjectId: root,
    companyId,
    actorType: 'company',
    payload: { length: trimmed.length },
  })

  return saved
}

export async function statementFor(quoteId: string) {
  const [row] = await db
    .select({ body: metricStatement.body, updatedAt: metricStatement.updatedAt })
    .from(metricStatement)
    .where(eq(metricStatement.quoteId, quoteId))

  return row ?? null
}
```

- [ ] **Step 2 : Écrire les tests**

```typescript
// tests/services/statements.test.ts
import { describe, it, expect } from 'vitest'
import { saveStatement, statementFor, MAX_STATEMENT_LENGTH } from '@/services/statements'
import { companyMetrics } from '@/services/passport-metrics'
import { lateChantier } from './helpers/chantier'

describe('la declaration complementaire', () => {
  it('s attache au chantier', async () => {
    const { companyId, quoteId } = await lateChantier()
    await saveStatement(companyId, quoteId, 'Retard imputable à l’indisponibilité du client.')

    expect((await statementFor(quoteId))?.body).toContain('indisponibilité')
  })

  it('se reecrit', async () => {
    const { companyId, quoteId } = await lateChantier()
    await saveStatement(companyId, quoteId, 'Première version.')
    await saveStatement(companyId, quoteId, 'Seconde version.')

    expect((await statementFor(quoteId))?.body).toBe('Seconde version.')
  })

  it('ne change AUCUN chiffre', async () => {
    // C'est ce qui la distingue de la contestation, et c'est ce qui concilie
    // « le passeport est derive et non editable » avec le droit de
    // rectification.
    const { companyId, quoteId } = await lateChantier()
    const before = await companyMetrics(companyId, new Date())

    await saveStatement(companyId, quoteId, 'Le client était absent.')

    expect(await companyMetrics(companyId, new Date())).toEqual(before)
  })

  it('refuse une declaration vide', async () => {
    const { companyId, quoteId } = await lateChantier()
    await expect(saveStatement(companyId, quoteId, '   ')).rejects.toThrow(/vide/)
  })

  it('refuse une declaration trop longue', async () => {
    const { companyId, quoteId } = await lateChantier()
    await expect(
      saveStatement(companyId, quoteId, 'a'.repeat(MAX_STATEMENT_LENGTH + 1)),
    ).rejects.toThrow(/trop longue/)
  })

  it('refuse le chantier d une autre entreprise', async () => {
    const { quoteId } = await lateChantier()
    const other = await lateChantier()

    await expect(saveStatement(other.companyId, quoteId, 'Texte.')).rejects.toThrow(/introuvable/)
  })
})
```

- [ ] **Step 3 : Lancer les tests**

```bash
pnpm vitest run tests/services/statements.test.ts
```

Attendu : 6 tests verts.

- [ ] **Step 4 : Commit**

```bash
git add src/services/statements.ts tests/services/statements.test.ts
git commit -m "feat: la declaration complementaire, un contexte qui ne change pas le chiffre"
```

---

## Task 8 : Les écrans

**Files:**
- Create: `src/app/(app)/devis/[id]/DisputeButton.tsx`
- Create: `src/app/(app)/devis/[id]/StatementForm.tsx`
- Modify: `src/app/(app)/devis/[id]/actions.ts`
- Modify: `src/app/(app)/devis/[id]/page.tsx`
- Create: `src/app/(app)/mon-passeport/DisputeList.tsx`
- Modify: `src/app/(app)/mon-passeport/page.tsx`
- Modify: `src/app/passeport/definitions/page.tsx`

- [ ] **Step 1 : Les deux actions serveur**

Ajouter à `src/app/(app)/devis/[id]/actions.ts`, sur le modèle exact de `completeChantier` — `currentCompany()`, `try/catch` qui renvoie `{ error }`, `revalidatePath` :

```typescript
export interface DisputeState {
  error?: string
  opened?: boolean
}

/**
 * L'artisan conteste la mesure de son delai.
 *
 * Le chantier sort du calcul immediatement, et y revient de lui-meme au bout
 * de quatorze jours si le client ne repond pas.
 */
export async function disputeLeadTime(
  quoteId: string,
  _state: DisputeState,
  form: FormData,
): Promise<DisputeState> {
  const { companyId } = await currentCompany()

  try {
    await openDispute(companyId, quoteId, String(form.get('reason') ?? ''), new Date())
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath(`/devis/${quoteId}`)
  return { opened: true }
}

export interface StatementState {
  error?: string
  saved?: boolean
}

export async function writeStatement(
  quoteId: string,
  _state: StatementState,
  form: FormData,
): Promise<StatementState> {
  const { companyId } = await currentCompany()

  try {
    await saveStatement(companyId, quoteId, String(form.get('body') ?? ''))
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath(`/devis/${quoteId}`)
  return { saved: true }
}
```

- [ ] **Step 2 : Le bouton de contestation**

`DisputeButton.tsx`, calqué sur `CompleteButton.tsx` : `Card elevation="e1"`, `useActionState`, `Field` + `Textarea`, bouton `tone="secondary"`, bloc d'erreur `role="alert"`.

Ce que le texte doit dire, parce que l'artisan doit savoir ce qu'il déclenche :

> « Ce chantier a dépassé le délai que vous aviez engagé. Si le retard ne vous est pas imputable, expliquez-le : **votre client sera le seul à trancher.** Le chantier sort du calcul le temps qu'il réponde. **S'il ne répond pas sous quatorze jours, la mesure initiale s'applique.** »

Compteur de caractères sur 500, `data-testid="motif-contestation"` sur le champ.

- [ ] **Step 3 : Le formulaire de déclaration complémentaire**

`StatementForm.tsx`, même structure. Le texte :

> « Vous pouvez attacher un contexte à ce chantier. **Il sera publié à côté du chiffre, et il ne le changera pas.** »

`data-testid="declaration"` sur le champ.

- [ ] **Step 4 : Brancher sur `/devis/[id]`**

Dans `src/app/(app)/devis/[id]/page.tsx`, après le bloc « Chantier terminé le … » :

```tsx
{found.completedAt !== null && (
  <>
    {disputable && <DisputeButton quoteId={found.id} />}
    {dispute !== null && <DisputeStatus dispute={dispute} now={now} />}
    <StatementForm quoteId={found.id} existing={statement?.body ?? ''} />
  </>
)}
```

`disputable` se calcule par un `try/catch` autour de `assertDisputable` — **la même fonction que le service**, pour que l'écran ne puisse pas proposer ce que le service refusera. `DisputeStatus` est un simple `Text` qui rend, selon `disputeStanding` :

| État | Texte |
|---|---|
| `under_review` | « Contestation en cours — votre client a jusqu'au {date} pour répondre. Ce chantier ne compte pas dans votre taux de délai pendant ce temps. » |
| `upheld` | « Votre client a confirmé : ce retard ne vous est pas imputable. Ce chantier ne compte plus dans votre taux de délai. » |
| `settled` | « La mesure initiale s'applique. » |

- [ ] **Step 5 : Le passeport**

`DisputeList.tsx` — la liste des contestations en instruction, à charger par un `disputesInReview(companyId, now)` ajouté à `src/services/disputes.ts`. Rendue **au-dessus** des métriques, parce qu'un chiffre qui bouge sans explication est ce que le jalon existe pour éviter :

> « {n} chantier(s) en cours d'instruction — ils ne comptent pas dans votre taux de délai. »

Extraire dans un fichier séparé plutôt que d'allonger `page.tsx` : la limite de 250 lignes est proche.

- [ ] **Step 6 : Les définitions publiques**

C'est le point le plus important de la tâche. Un mécanisme de contestation **non annoncé** transformerait le taux de délai en chiffre dont le lecteur ne peut pas savoir ce qu'il exclut — exactement ce que la page existe pour empêcher.

Dans `METRICS`, sur « Délai annoncé respecté », remplacer `silent` par :

```typescript
    silent:
      'Les jours fériés ne sont pas décomptés. Un retard causé par le client ou par un autre corps d’état est compté comme un retard — sauf si l’entreprise l’a contesté et que le client lui a donné raison : ce chantier quitte alors le calcul, sans être compté comme respecté.',
```

Et ajouter une carte après les métriques :

```tsx
<Card elevation="flat">
  <div className="flex flex-col gap-1">
    <Text size="label" tone="muted">
      Ce qu’une entreprise peut contester
    </Text>
    <Text size="sm" tone="soft">
      Une entreprise peut contester la mesure de son délai lorsqu’elle estime que le retard ne
      lui est pas imputable. <strong>C’est le client qui tranche</strong>, pas nous : il a signé
      le devis, il sait ce qui s’est passé. S’il ne répond pas sous quatorze jours, la mesure
      initiale s’applique.
    </Text>
    <Text size="sm" tone="soft">
      Un chantier dont la contestation est retenue <strong>quitte le calcul du délai</strong> — il
      n’est jamais compté comme respecté. C’est pourquoi le nombre de chantiers affiché à côté de
      ce taux peut être inférieur au nombre total de chantiers terminés.
    </Text>
    <Text size="sm" tone="muted">
      Le montant facturé, lui, ne se conteste pas : c’est une soustraction entre deux montants que
      le client a signés. Une entreprise peut en revanche y attacher une explication, publiée à
      côté du chiffre.
    </Text>
  </div>
</Card>
```

- [ ] **Step 7 : Vérifier à l'écran, puis les garde-fous**

```bash
pnpm validate
```

Attendu : env, taille, design system et isolation verts ; build et tests verts.

- [ ] **Step 8 : Commit**

```bash
git add src/app
git commit -m "feat: ecrans de la contestation, et la regle dite publiquement"
```

---

## Task 9 : Le parcours de bout en bout

**Files:**
- Create: `tests/e2e/dispute-journey.spec.ts`
- Create: `tests/e2e/fixtures-chantier.ts`

- [ ] **Step 1 : Le fixture**

`tests/e2e/fixtures-chantier.ts` — même contenu que `tests/services/helpers/chantier.ts`, mais passant par `load()` de `fixtures-db.ts` comme le fait `signedQuoteFor`, et rattachant l'entreprise au compte Supabase de l'e-mail fourni via `member`. Fichier séparé de `fixtures.ts` : celui-ci est à 177 lignes et la limite est à 250.

- [ ] **Step 2 : Écrire le parcours**

```typescript
// tests/e2e/dispute-journey.spec.ts
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor } from './helpers'
import { lateChantierFor, disputeLinkFor } from './fixtures-chantier'

/**
 * Le parcours de M5·C : d'un chantier en retard a une metrique corrigee.
 *
 * Ce que les tests unitaires ne peuvent pas voir — que l'ecran de l'artisan,
 * le lien envoye au client, la page sans compte et le recalcul du passeport
 * tiennent ensemble.
 */
const ARTISAN = 'artisan-m5c@test.local'

test('d’un chantier en retard à une mesure arbitrée', async ({ page }) => {
  await clearMailbox()

  await test.step('connexion par lien magique', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(ARTISAN)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(ARTISAN))
  })

  const chantier = await lateChantierFor(ARTISAN)

  await test.step('le chantier en retard pese sur le taux', async () => {
    await page.goto('/mon-passeport')
    // Un seul chantier : sous le seuil, aucun taux — mais le volume est la.
    await expect(page.getByTestId('taux-delai')).toContainText('1 chantier')
  })

  await test.step('l’artisan conteste en motivant', async () => {
    await page.goto(`/devis/${chantier.quoteId}`)
    await page.getByTestId('motif-contestation').fill('Le client était absent trois semaines.')
    await page.getByRole('button', { name: 'Contester cette mesure' }).click()

    await expect(page.getByText('Contestation en cours')).toBeVisible()
  })

  await test.step('le chantier sort aussitot du taux de delai', async () => {
    // Article 18 : pendant l'instruction, le chiffre dispute ne s'affiche pas.
    await page.goto('/mon-passeport')
    await expect(page.getByTestId('taux-delai')).toContainText('0 chantier')
    // Mais il reste compte : c'est ce qui rend l'abus visible.
    await expect(page.getByTestId('volume-chantiers')).toContainText('1')
  })

  await test.step('le client tranche, sans compte', async () => {
    await page.goto(await disputeLinkFor(chantier.customerEmail))

    await expect(page.getByTestId('motif')).toContainText('absent trois semaines')
    // Les metriques de l'entreprise ne le regardent pas.
    await expect(page.getByText('%')).toHaveCount(0)

    await page.getByRole('button', { name: 'Oui, c’est exact' }).click()
    await expect(page.getByTestId('reponse-enregistree')).toBeVisible()
  })

  await test.step('le chantier ne revient PAS compte comme respecte', async () => {
    // Le client a dit que le retard n'etait pas imputable a l'artisan. Il n'a
    // pas dit qu'il etait dans les temps.
    await page.goto('/mon-passeport')
    await expect(page.getByTestId('taux-delai')).toContainText('0 chantier')
    await expect(page.getByTestId('taux-delai')).toContainText('Pas encore assez de données')
  })

  await test.step('une seconde contestation est refusee', async () => {
    await page.goto(`/devis/${chantier.quoteId}`)
    await expect(page.getByTestId('motif-contestation')).toHaveCount(0)
  })

  await test.step('la declaration complementaire ne change pas le chiffre', async () => {
    await page.getByTestId('declaration').fill('Chantier décalé à la demande du client.')
    await page.getByRole('button', { name: 'Enregistrer la déclaration' }).click()

    await page.goto('/mon-passeport')
    await expect(page.getByTestId('taux-delai')).toContainText('0 chantier')
  })
})
```

- [ ] **Step 3 : Lancer le parcours**

```bash
pkill -f "next dev"; pkill -f "next-server"; pnpm test:e2e
```

Attendu : 5 parcours verts. En cas de `Timed out waiting … from config.webServer`, c'est un processus `next dev` resté sur le port — relancer après le `pkill`, ce n'est pas un défaut.

- [ ] **Step 4 : Vérification finale**

```bash
pnpm supabase db reset && pnpm validate && pnpm test:e2e
```

- [ ] **Step 5 : Commit**

```bash
git add tests/e2e
git commit -m "test: d'un chantier en retard a une mesure arbitree par le client"
```

---

## Vérification du jalon

| Exigence de la spec | Où elle est vérifiée |
|---|---|
| Un chantier contesté sort du calcul | Task 2, Task 6, Task 9 |
| Il y revient au bout de quatorze jours sans réponse | Task 1, Task 2 |
| Une seconde contestation est refusée | Task 1, Task 4, Task 9 |
| Le client arbitre, sans compte | Task 5, Task 9 |
| L'événement rectificatif s'inscrit au journal | Task 4 |
| La déclaration complémentaire ne change pas le chiffre | Task 7 |
| Aucune donnée personnelle au journal | Task 4 |
| Les exclusions sont portées par la requête | Task 6 |
| La règle est publique | Task 8 |

## Ce qui reste ouvert

- **Quatorze jours** est un pari, comme le seuil de dix chantiers. À revoir sur observation réelle.
- **L'arbitrage repose sur l'e-mail du client, sans code SMS.** C'est plus faible que la signature de M1, qui en exige un. L'argument est que l'abus est auto-limitant et visible — contester retire le chantier du dénominateur, donc fait baisser le volume affiché à côté du taux. À reprendre si un détecteur du backoffice montre des entreprises dont le volume de délai décroche du volume de chantiers.
- **La publication des déclarations complémentaires n'est pas ouverte.** Un texte libre publié à côté d'un chiffre demande une revue avant publication, et cette revue appartient au jalon de publication — pas à celui-ci. En attendant, la déclaration n'est visible que de son auteur.
- **Les deux verrous de l'AIPD restent entiers** : l'information du client sur son rôle de témoin (partiellement payée par la page `/c/[token]` de la Task 5, mais pas sur l'écran de signature) et le recueil de l'avis des artisans, structurellement bloqué tant qu'aucun n'est inscrit.
