# M7·C — Le rappel et la mesure · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que le client soit rappelé la veille, et que l'artisan voie enfin combien de temps il met à rendre ses devis.

**Architecture:** Le rappel part du travail de fond qui tourne déjà depuis M3, et suit sa règle : **l'événement n'est écrit que si le message est parti**. La médiane est une **fonction pure**, calculée à la lecture, avec son volume indissociable — comme tout ce que porte le passeport.

**Tech Stack:** Identique. Aucune dépendance nouvelle.

> **Contraintes de l'atelier.** 250 lignes par fichier, aucune fonctionnalité n'importe d'une autre, design system obligatoire.
>
> **Déviation de format, comme aux jalons précédents.** Les écrans dont la structure existe renvoient à leurs équivalents ; le code complet est donné là où la logique est neuve.

**Références :** [spec M7 §4 et §5](../specs/2026-08-09-agenda-design.md) · [plan M7·A](2026-08-09-m7a-rendez-vous.md) · [spec M5 §4](2026-08-08-m5-metriques-design.md)

---

## Décisions verrouillées

**Un seul rappel, aucune relance.** Relancer transformerait un service rendu en pression exercée sur un particulier — et le produit existe pour l'inverse.

**Un rappel qui n'est pas parti ne s'inscrit pas au journal.** C'est la leçon de M3, où un préavis jamais envoyé s'était consigné comme envoyé, fabriquant une fausse preuve. Ici l'enjeu est moindre, la règle est la même.

**Un rendez-vous annulé n'en déclenche aucun.** Le service ne lit que les `scheduled`.

**Le délai se compte en jours calendaires.** C'est l'attente réellement vécue par celui qui espère son devis. Le jour ouvré sert à mesurer un engagement annoncé — c'est le délai de chantier de M5 —, pas une attente subie.

**Le seuil est dix, comme les autres.** La spec produit annonçait cinq ; deux seuils sur un même passeport seraient indéfendables.

**Jamais un chiffre sans son volume.** La médiane et son nombre d'observations forment une seule valeur de retour, que le type rend indissociables.

---

## Une décision qu'il faut argumenter : pas de signature exigée

Les deux métriques de M5 exigent un **devis signé** : sans cela, l'artisan saisirait son propre devis et sa propre facture, et la mesure serait auto-déclarée.

**Ce délai-ci ne l'exige pas**, et ce n'est pas un oubli.

| Métrique | Ce qu'elle décrit | Ce qui l'authentifie |
|---|---|---|
| Écart devis → facture | Le **chantier** | La signature du client |
| Délai de chantier | Le **chantier** | La signature du client |
| **Délai de remise du devis** | **Notre propre horodatage** | Le rendez-vous créé chez nous, le devis envoyé par nous |

Exiger la signature reviendrait à mesurer *« le délai de remise des devis qui ont fini par être acceptés »* — une population biaisée vers le rapide-et-retenu, ce qui est précisément l'inverse de ce que la métrique doit dire.

**Deux gardes remplacent la signature :**

- Le devis doit avoir été **réellement envoyé** par l'outil — `sentAt` est écrit au moment de l'envoi.
- Le rendez-vous doit avoir été **créé avant cet envoi**. `appointment.created_at` est posé par la base ; un rendez-vous de visite antidaté après coup ne compte pas.

**Ce qui reste exposé, et qu'il faut dire :** un artisan pourrait fabriquer des visites et s'envoyer des devis. C'est de la fabrication pure, elle laisse une trace complète au journal, et elle relève de la file d'anomalies du backoffice — pas d'une règle de calcul.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/reminder.ts` | Qui rappeler, et quand — **pur** |
| `src/domain/quote-lead-time.ts` | La médiane et son volume — **pur** |
| `src/services/appointment-reminder.ts` | Le message de rappel |
| `src/services/quote-lead-time.ts` | L'instantané, puis le calcul |
| `src/app/api/cron/echeances/route.ts` | *(modifié)* le rappel s'y ajoute |
| `src/app/(app)/mon-passeport/page.tsx` | *(modifié)* la troisième mesure |
| `src/app/passeport/definitions/page.tsx` | *(modifié)* sa définition publique |

---

## Task 1 : Qui rappeler, et quand

Fonction pure.

**Files:**
- Create: `src/domain/reminder.ts`
- Test: `tests/domain/reminder.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/reminder.test.ts
import { describe, it, expect } from 'vitest'
import { remindersDue, type Remindable } from '@/domain/reminder'

const NOW = new Date('2026-08-31T06:00:00Z')

const item = (overrides: Partial<Remindable> = {}): Remindable => ({
  id: 'a1',
  startsAt: new Date('2026-09-01T08:00:00Z'),
  status: 'scheduled',
  alreadyReminded: false,
  ...overrides,
})

describe('la veille', () => {
  it('rappelle un rendez-vous de demain', () => {
    expect(remindersDue([item()], NOW)).toHaveLength(1)
  })

  it('ne rappelle PAS un rendez-vous d aujourd hui', () => {
    // Le travail de fond tourne le matin : un rendez-vous du jour meme se
    // rappellerait trop tard pour servir a quoi que ce soit.
    expect(remindersDue([item({ startsAt: new Date('2026-08-31T15:00:00Z') })], NOW)).toEqual([])
  })

  it('ne rappelle pas un rendez-vous d apres-demain', () => {
    expect(remindersDue([item({ startsAt: new Date('2026-09-02T08:00:00Z') })], NOW)).toEqual([])
  })

  it('compte les jours a PARIS, pas en UTC', () => {
    // 31 aout 23 h 30 UTC = 1er septembre 1 h 30 a Paris : c'est bien demain.
    expect(remindersDue([item({ startsAt: new Date('2026-08-31T23:30:00Z') })], NOW)).toHaveLength(
      1,
    )
  })

  it('franchit un changement de mois', () => {
    const eve = new Date('2026-09-30T06:00:00Z')
    const next = item({ startsAt: new Date('2026-10-01T08:00:00Z') })

    expect(remindersDue([next], eve)).toHaveLength(1)
  })
})

describe('ce qui ne se rappelle pas', () => {
  it('ecarte un rendez-vous annule', () => {
    // Le client a deja ete prevenu de l'annulation, ou va l'etre : lui
    // rappeler un rendez-vous qui n'aura pas lieu serait pire que rien.
    expect(remindersDue([item({ status: 'cancelled' })], NOW)).toEqual([])
  })

  it('ecarte un rendez-vous DEJA rappele', () => {
    // Un seul rappel, aucune relance : relancer transformerait un service
    // rendu en pression exercee sur un particulier.
    expect(remindersDue([item({ alreadyReminded: true })], NOW)).toEqual([])
  })
})
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

```bash
pnpm vitest run tests/domain/reminder.test.ts
```

- [ ] **Step 3 : Écrire l'implémentation**

```typescript
// src/domain/reminder.ts
import { dayKeyOf } from './agenda-week'

/**
 * Qui rappeler la veille.
 *
 * **Un seul rappel, aucune relance.** Relancer transformerait un service rendu
 * en pression exercee sur un particulier — et le produit existe pour l'inverse.
 */
export interface Remindable {
  id: string
  startsAt: Date
  status: 'scheduled' | 'cancelled'
  alreadyReminded: boolean
}

/** Le jour suivant, en heure de Paris. */
function tomorrowKey(now: Date): string {
  return dayKeyOf(new Date(now.getTime() + 86_400_000))
}

export function remindersDue<T extends Remindable>(items: T[], now: Date): T[] {
  const target = tomorrowKey(now)

  return items.filter(
    (item) =>
      item.status === 'scheduled' &&
      !item.alreadyReminded &&
      dayKeyOf(item.startsAt) === target,
  )
}
```

> **`now + 24 h` plutôt qu'un calcul de calendrier** : le passage à l'heure d'été décale d'une heure, jamais d'un jour, et `dayKeyOf` retombe sur le bon jour local dans les deux cas.

- [ ] **Step 4 : Lancer les tests, puis commit**

```bash
pnpm vitest run tests/domain/reminder.test.ts
```

```bash
git add src/domain/reminder.ts tests/domain/reminder.test.ts
git commit -m "feat: le rappel de la veille, un seul et jamais sur un annule"
```

---

## Task 2 : La médiane du délai de remise

**Files:**
- Create: `src/domain/quote-lead-time.ts`
- Test: `tests/domain/quote-lead-time.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/quote-lead-time.test.ts
import { describe, it, expect } from 'vitest'
import { medianQuoteLeadTime, type QuoteLeadTime } from '@/domain/quote-lead-time'
import { MINIMUM_OBSERVATIONS } from '@/domain/passport-metrics'

const NOW = new Date('2026-08-31T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

/** Une visite, puis un devis envoye `delay` jours plus tard. */
const measured = (delay: number, overrides: Partial<QuoteLeadTime> = {}): QuoteLeadTime => ({
  visitAt: daysAgo(30 + delay),
  visitCreatedAt: daysAgo(31 + delay),
  quoteSentAt: daysAgo(30),
  ...overrides,
})

const many = (n: number, delay: number) => Array.from({ length: n }, () => measured(delay))

describe('le seuil', () => {
  it('est celui des autres mesures du passeport', () => {
    // Deux seuils sur un meme passeport seraient indefendables.
    expect(MINIMUM_OBSERVATIONS).toBe(10)
  })

  it('ne rend aucune mediane en dessous', () => {
    expect(medianQuoteLeadTime(many(9, 3), NOW).value).toBeNull()
  })

  it('rend le volume MEME quand la mediane est masquee', () => {
    expect(medianQuoteLeadTime(many(9, 3), NOW).volume).toBe(9)
  })

  it('rend la mediane des le seuil atteint', () => {
    expect(medianQuoteLeadTime(many(10, 3), NOW).value).toBe(3)
  })
})

describe('la mediane', () => {
  it('prend la valeur du milieu sur un nombre impair', () => {
    const items = [...many(5, 1), ...many(5, 10), measured(4)]

    expect(medianQuoteLeadTime(items, NOW).value).toBe(4)
  })

  it('moyenne les deux valeurs centrales sur un nombre pair', () => {
    const items = [...many(5, 2), ...many(5, 4)]

    expect(medianQuoteLeadTime(items, NOW).value).toBe(3)
  })

  it('resiste a une valeur extreme, contrairement a une moyenne', () => {
    // C'est pourquoi la spec demande une mediane : un devis oublie six mois
    // ne doit pas deplacer le chiffre de tous les autres.
    const items = [...many(9, 2), measured(180)]

    expect(medianQuoteLeadTime(items, NOW).value).toBe(2)
  })

  it('compte en jours CALENDAIRES', () => {
    // C'est l'attente reellement vecue par celui qui espere son devis ; le
    // jour ouvre sert a mesurer un engagement annonce, pas une attente subie.
    // Vendredi 28 aout au lundi 31 : trois jours, pas un.
    const items = many(10, 0).map(() => ({
      visitAt: new Date('2026-08-28T09:00:00Z'),
      visitCreatedAt: new Date('2026-08-27T09:00:00Z'),
      quoteSentAt: new Date('2026-08-31T09:00:00Z'),
    }))

    expect(medianQuoteLeadTime(items, NOW).value).toBe(3)
  })
})

describe('ce qui n entre pas dans le calcul', () => {
  it('ECARTE un rendez-vous cree apres l envoi du devis', () => {
    // La garde anti-antidatage : `created_at` est pose par la base, et un
    // rendez-vous invente apres coup ne compte pas.
    const forged = measured(3, { visitCreatedAt: NOW })
    const items = [...many(10, 5), forged]

    expect(medianQuoteLeadTime(items, NOW).volume).toBe(10)
  })

  it('ecarte un devis envoye AVANT la visite', () => {
    // Ce n'est pas un delai de remise : le devis existait deja.
    const inverted = measured(3, { quoteSentAt: daysAgo(40) })
    const items = [...many(10, 5), inverted]

    expect(medianQuoteLeadTime(items, NOW).volume).toBe(10)
  })

  it('ecarte ce qui est hors de la fenetre de douze mois', () => {
    const old = measured(3, { quoteSentAt: daysAgo(400), visitAt: daysAgo(403), visitCreatedAt: daysAgo(404) })
    const items = [...many(10, 5), old]

    expect(medianQuoteLeadTime(items, NOW).volume).toBe(10)
  })

  it('ne rend rien du tout sans aucune observation', () => {
    expect(medianQuoteLeadTime([], NOW)).toEqual({ value: null, volume: 0 })
  })
})
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

- [ ] **Step 3 : Écrire l'implémentation**

```typescript
// src/domain/quote-lead-time.ts
import { MINIMUM_OBSERVATIONS, WINDOW_MONTHS } from './passport-metrics'

/**
 * Le delai de remise du devis : de la visite a l'envoi.
 *
 * **Aucune signature n'est exigee**, contrairement aux deux mesures de M5. Ces
 * deux-la decrivent le chantier, et seul le client peut l'authentifier ;
 * celle-ci decrit NOS PROPRES horodatages — le rendez-vous cree chez nous, le
 * devis envoye par nous.
 *
 * Exiger la signature reviendrait a mesurer « le delai de remise des devis qui
 * ont fini par etre acceptes », population biaisee vers le rapide-et-retenu,
 * ce qui est l'inverse de ce que la mesure doit dire.
 */
export interface QuoteLeadTime {
  visitAt: Date
  /** Horodatage de SAISIE du rendez-vous : la garde anti-antidatage. */
  visitCreatedAt: Date
  quoteSentAt: Date
}

/**
 * Une mediane et le volume sur lequel elle porte, **indissociables**.
 *
 * Meme discipline que le couple taux-volume de M5 : aucun ecran ne peut
 * afficher l'un sans l'autre, et le compilateur applique la regle plutot que
 * la revue.
 */
export interface MedianDays {
  /** En jours calendaires, ou `null` sous le seuil. */
  value: number | null
  /** Le nombre d'observations. Toujours rendu, meme quand `value` est `null`. */
  volume: number
}

const DAY = 86_400_000

function withinWindow(item: QuoteLeadTime, now: Date): boolean {
  const start = new Date(now)
  start.setMonth(start.getMonth() - WINDOW_MONTHS)
  return item.quoteSentAt >= start
}

/**
 * Mesurable ? Deux gardes remplacent la signature :
 *
 *   - le devis est parti APRES la visite — sinon ce n'est pas un delai de remise ;
 *   - le rendez-vous existait AVANT cet envoi — sinon il a ete invente apres coup.
 */
function measurable(item: QuoteLeadTime): boolean {
  return (
    item.quoteSentAt.getTime() >= item.visitAt.getTime() &&
    item.visitCreatedAt.getTime() <= item.quoteSentAt.getTime()
  )
}

export function medianQuoteLeadTime(items: QuoteLeadTime[], now: Date): MedianDays {
  const days = items
    .filter((item) => withinWindow(item, now) && measurable(item))
    .map((item) => Math.round((item.quoteSentAt.getTime() - item.visitAt.getTime()) / DAY))
    .sort((a, b) => a - b)

  if (days.length < MINIMUM_OBSERVATIONS) return { value: null, volume: days.length }

  const middle = Math.floor(days.length / 2)
  const value =
    days.length % 2 === 1 ? days[middle] : (days[middle - 1] + days[middle]) / 2

  return { value, volume: days.length }
}
```

- [ ] **Step 4 : Lancer les tests, puis commit**

```bash
git add src/domain/quote-lead-time.ts tests/domain/quote-lead-time.test.ts
git commit -m "feat: la mediane du delai de remise, en jours calendaires"
```

---

## Task 3 : Le message de rappel

**Files:**
- Create: `src/services/appointment-reminder.ts`
- Test: `tests/services/appointment-reminder.test.ts`

- [ ] **Step 1 : Écrire le service**

```typescript
// src/services/appointment-reminder.ts
import { sendRawMail } from '@/services/email'

const MOMENT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Le rappel de la veille. Rend `false` si aucune adresse ne permet de l'envoyer.
 *
 * **Un seul, aucune relance.** Et le message dit quoi faire si le client ne
 * peut plus : il n'a pas de compte, il ne peut pas annuler lui-meme, et le lui
 * cacher ferait un rendez-vous manque plutot qu'un rendez-vous deplace.
 */
export async function sendAppointmentReminder(input: {
  to: string | null
  customerName: string
  companyName: string
  companyPhone: string | null
  startsAt: Date
  address: string
  label: string
}): Promise<boolean> {
  if (!input.to?.trim()) return false

  await sendRawMail({
    to: input.to,
    subject: `Rendez-vous demain avec ${input.companyName}`,
    text: [
      `Bonjour ${input.customerName},`,
      '',
      `${input.companyName} passe ${MOMENT.format(input.startsAt)} pour : ${input.label}.`,
      `Adresse : ${input.address}`,
      '',
      input.companyPhone
        ? `Si vous ne pouvez pas être présent, prévenez-la au ${input.companyPhone}.`
        : 'Si vous ne pouvez pas être présent, prévenez-la.',
    ].join('\n'),
  })

  return true
}
```

- [ ] **Step 2 : Écrire les tests**

Sur le modèle de `tests/services/email.test.ts`, qui espionne `sendRawMail`. Cas :

```typescript
it('annonce le jour, l heure et l adresse', ...)
it('donne le numero de l entreprise pour prevenir', ...)
it('reste envoyable sans numero', ...)
it('rend false sans adresse, et n envoie RIEN', ...)
```

Le dernier compte : c'est lui qui garantit que le journal ne consignera pas un rappel jamais parti.

- [ ] **Step 3 : Lancer, puis commit**

```bash
git add src/services/appointment-reminder.ts tests/services/appointment-reminder.test.ts
git commit -m "feat: le message de rappel, et le faux qu'il refuse d'envoyer"
```

---

## Task 4 : Le rappel dans le travail de fond

**Files:**
- Modify: `src/app/api/cron/echeances/route.ts`
- Create: `src/services/due-reminders.ts`
- Test: `tests/services/due-reminders.test.ts`

- [ ] **Step 1 : Le service**

`runAppointmentReminders(now)` :

1. Lit les rendez-vous `scheduled` dont le début tombe dans les deux jours qui viennent — **fenêtre large, tri par la fonction pure** : la même raison qu'en M7·A, on ne calcule aucun décalage de fuseau côté service.
2. Pour chacun, lit si un `appointment.reminded` figure déjà au journal.
3. `remindersDue` tranche.
4. Envoie. **L'événement n'est écrit que si le message est parti.**
5. Rend `{ sent, unreachable }`.

```typescript
    if (!(await sendAppointmentReminder({ ... }))) {
      unreachable++
      continue
    }

    // Ecrit APRES l'envoi, et seulement s'il a eu lieu. C'est la lecon de M3 :
    // un preavis jamais envoye s'y etait consigne comme envoye, et l'artisan
    // suspendu se serait vu opposer notre journal.
    await recordEvent({
      type: 'appointment.reminded',
      subjectType: 'appointment',
      subjectId: item.id,
      companyId: item.companyId,
      actorType: 'system',
    })
```

- [ ] **Step 2 : Le brancher**

Dans le travail de fond, après les préavis d'échéance et **avant** le calcul des anomalies — l'ordre n'a pas d'importance fonctionnelle ici, mais grouper les envois avant les lectures garde la route lisible. Ajouter `reminders` au bilan rendu.

- [ ] **Step 3 : Les tests**

```typescript
it('envoie un rappel pour un rendez-vous de demain', ...)
it('n en envoie PAS deux fois', ...)              // rejoue le service, compte les messages
it('n envoie rien pour un rendez-vous annule', ...)
it('n ecrit AUCUN evenement quand le message n a pas pu partir', ...)
```

Le dernier en toutes lettres — c'est la règle de M3 :

```typescript
it('n ecrit AUCUN evenement quand le message n a pas pu partir', async () => {
  // Un rappel consigne mais jamais envoye fabriquerait une preuve fausse.
  const { companyId, appointmentId } = await tomorrowVisit()
  await db.update(customer).set({ email: '' }).where(eq(customer.companyId, companyId))

  const result = await runAppointmentReminders(NOW)

  expect(result.unreachable).toBe(1)
  const journal = await db.select().from(event).where(eq(event.subjectId, appointmentId))
  expect(journal).toEqual([])
})
```

- [ ] **Step 4 : Lancer, puis commit**

```bash
git add src/services/due-reminders.ts src/app/api/cron tests/services/due-reminders.test.ts
git commit -m "feat: le rappel de la veille dans le travail de fond"
```

---

## Task 5 : L'assemblage de la mesure

**Files:**
- Create: `src/services/quote-lead-time.ts`
- Test: `tests/services/quote-lead-time.test.ts`

- [ ] **Step 1 : Le service**

`companyQuoteLeadTime(companyId, now)` :

- Un chantier = un `project` de cette entreprise.
- La **première** visite du projet : `min(starts_at)` sur `kind = 'visit'`, avec son `created_at`.
- Le **premier** devis envoyé du projet : `min(sent_at)` sur les devis `sent_at IS NOT NULL`.
- Les projets sans l'un des deux sont écartés — **par la requête**, comme partout.

> Un rendez-vous **annulé compte quand même** s'il a précédé le devis : la visite a eu lieu, c'est le rendez-vous qui a été retiré de l'agenda ensuite. L'exclure ferait disparaître des mesures valides. Ce point mérite d'être relu si l'annulation se met à servir d'effaceur.

- [ ] **Step 2 : Les tests**

```typescript
it('mesure de la premiere visite au premier devis envoye', ...)
it('ECARTE un projet sans visite', ...)
it('ecarte un projet dont le devis n a jamais ete envoye', ...)
it('ne voit pas les projets d une autre entreprise', ...)   // le test discriminant
it('rend le volume sous le seuil, sans mediane', ...)
```

- [ ] **Step 3 : Vérifier que le contrôle d'accès discrimine**

Retirer la condition sur `companyId` et relancer : le quatrième test **doit échouer**.

- [ ] **Step 4 : Commit**

```bash
git add src/services/quote-lead-time.ts tests/services/quote-lead-time.test.ts
git commit -m "feat: le delai de remise assemble, exclusions portees par la requete"
```

---

## Task 6 : Le passeport et sa définition publique

**Files:**
- Modify: `src/app/(app)/mon-passeport/page.tsx`
- Create: `src/app/(app)/mon-passeport/MedianCard.tsx`
- Modify: `src/app/passeport/definitions/page.tsx`

- [ ] **Step 1 : La carte**

`MedianCard` reprend exactement la discipline de `MetricCard` : elle reçoit l'objet `MedianDays` **entier**, jamais deux propriétés séparées.

- Sous le seuil : « Pas encore assez de données ».
- Au-dessus : « 4 jours » — et `1 jour` au singulier, `3,5 jours` quand la médiane tombe entre deux.
- **Toujours** : « sur {volume} devis remis après une visite ».

`data-testid="delai-remise"`.

- [ ] **Step 2 : L'écran**

Troisième carte du passeport, après les deux taux. Sa définition courte :

> « Le temps que vous mettez à envoyer un devis après une visite, en jours calendaires. »

- [ ] **Step 3 : La définition publique**

Ajouter à `METRICS` de `/passeport/definitions` :

```typescript
{
  label: 'Délai de remise du devis',
  measures:
    'Le temps médian entre une visite chez un client et l’envoi du devis correspondant, en jours calendaires.',
  method:
    'Du premier rendez-vous de visite enregistré dans l’outil au premier devis envoyé pour ce chantier. La médiane, et non la moyenne : un devis oublié six mois ne doit pas déplacer le chiffre de tous les autres.',
  silent:
    'Un délai long peut venir du client — qui ne répond pas, ou qui change d’avis — comme de l’entreprise. Et il ne porte que sur les chantiers dont la visite a été prise dans l’outil : une visite notée sur un carnet n’y figure pas.',
}
```

> La dernière phrase n'est pas une précaution : c'est la même mention de périmètre que partout, et elle est ici **plus forte qu'ailleurs**, puisque l'artisan choisit lui-même quelles visites saisir.

- [ ] **Step 4 : Vérifier à l'écran, puis les garde-fous**

```bash
pnpm validate
```

- [ ] **Step 5 : Commit**

```bash
git add "src/app/(app)/mon-passeport" src/app/passeport
git commit -m "feat: le delai de remise au passeport, et sa definition publique"
```

---

## Task 7 : Le parcours de bout en bout

**Files:**
- Modify: `tests/e2e/agenda-journey.spec.ts`

- [ ] **Step 1 : Étendre le parcours**

Deux étapes, l'une pour le rappel, l'autre pour la mesure.

```typescript
await test.step('le client est rappelé la veille', async () => {
  // Le travail de fond tourne : c'est lui qui envoie, pas l'ecran.
  const run = await page.request.get('/api/cron/echeances', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })

  expect(run.ok()).toBe(true)
  expect(await reminderFor('rey@test.local')).toContain('8 rue Sainte-Catherine')
})

await test.step('le passeport compte la visite, sans encore afficher de médiane', async () => {
  // Une seule observation : sous le seuil, aucun chiffre — mais le volume est
  // la, comme partout ailleurs sur ce passeport.
  await page.goto('/mon-passeport')

  await expect(page.getByTestId('delai-remise')).toContainText('Pas encore assez de données')
  await expect(page.getByTestId('delai-remise')).toContainText('1 devis')
})
```

> **Le rendez-vous du parcours est daté du 1er septembre 2026** ; pour que le rappel parte, il faut soit décaler cette date à demain, soit — mieux — ajouter au parcours **une seconde visite datée de demain**, qui ne perturbe aucune des assertions existantes.

Ajouter à `tests/e2e/helpers.ts` :

```typescript
/** Le rappel de la veille adresse au client. */
export async function reminderFor(email: string): Promise<string> {
  return waitForMail(
    (mail) => mail.To.some((to) => to.Address === email) && /Rendez-vous demain/.test(mail.Subject),
    `rappel pour ${email}`,
  )
}
```

- [ ] **Step 2 : Lancer, puis vérification finale**

```bash
pnpm validate && pnpm test:e2e
```

- [ ] **Step 3 : Commit**

```bash
git add tests/e2e
git commit -m "test: du rappel de la veille au delai au passeport"
```

---

## Vérification du jalon

| Exigence de la spec | Où elle est vérifiée |
|---|---|
| Un rappel la veille, par courriel | Task 1, Task 4, Task 7 |
| Un seul, aucune relance | Task 1, Task 4 |
| Rien pour un rendez-vous annulé | Task 1, Task 4 |
| Un rappel non parti ne s'inscrit pas au journal | Task 3, Task 4 — le test qui compte |
| Le délai en jours calendaires | Task 2 |
| Médiane, pas moyenne | Task 2 |
| Seuil à dix, comme les autres | Task 2 |
| Jamais un chiffre sans son volume | Task 2, Task 6 |
| Une entreprise ne voit que ses projets | Task 5 — le test discriminant |
| La définition est publique, périmètre compris | Task 6 |

## M7 après ce plan

Les trois plans livrés, l'agenda tient : rendez-vous attachés au chantier, semaine, abonnement iCalendar, import Google et Microsoft, rappel client, délai de remise.

**Le taux de présence reste non construit**, et le tableau des métriques de la spec produit doit être corrigé en conséquence — c'est la dernière chose à faire de ce jalon.

**Et le second verrou de l'AIPD reste entier** : le recueil de l'avis des artisans, article 35.9. Aucune métrique ne peut être publiée avant, celle-ci pas plus que les autres.

## Ce qui reste ouvert

- **L'heure du rappel dépend de la planification de l'hébergeur.** Un travail de fond qui tourne à 23 h enverrait le rappel la veille au soir, ce qui est tard. À fixer au moment du déploiement, pas ici.
- **Un rendez-vous pris la veille pour le lendemain matin** n'est jamais rappelé si le travail de fond est déjà passé. C'est acceptable — le client vient de le prendre — mais cela mérite d'être su.
- **L'annulation pourrait servir d'effaceur** de mesure si un artisan annulait ses visites lentes. Elle ne le peut pas aujourd'hui : une visite annulée compte quand même dans le délai. À relire si le comportement change.
