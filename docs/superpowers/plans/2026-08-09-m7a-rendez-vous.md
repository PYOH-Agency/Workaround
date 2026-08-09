# M7·A — Le rendez-vous et l'agenda · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que l'artisan prenne ses rendez-vous là où sont ses chantiers — avec l'adresse, le client et son numéro — et qu'il voie sa semaine.

**Architecture:** Le créneau et la semaine sont des **fonctions pures**. Rien n'est calculé en base : la semaine se groupe à la lecture, en heure de Paris. Un rendez-vous se pose **toujours sur un chantier** — c'est la seule chose qui distingue cet agenda de celui de son téléphone.

**Tech Stack:** Identique. Aucune dépendance nouvelle — la zone horaire passe par `Intl`, déjà présent dans Node.

> **Contraintes de l'atelier.** 250 lignes par fichier, aucune fonctionnalité n'importe d'une autre, design system obligatoire.
>
> **Déviation de format, comme aux jalons précédents.** Les écrans dont la structure existe renvoient à leurs équivalents ; le code complet est donné là où la logique est neuve.
>
> **Migrations :** `supabase/MIGRATIONS.md` — les `0xxx_` sont générés par Drizzle et ne se renomment jamais, les `9xxx_` s'écrivent à la main.

**Références :** [spec M7](../specs/2026-08-09-agenda-design.md) · [spec P1 §6](2026-08-07-socle-artisan-design.md) · [plan M6·B](2026-08-09-m6b-dossier-chantier.md)

---

## Décisions verrouillées

**Un rendez-vous se pose toujours sur un chantier.** Sans l'adresse, le client et son numéro, ce serait une ligne de calendrier de plus — et elle n'aurait aucune raison d'être saisie ici plutôt que sur son téléphone.

**Le chevauchement avertit, il n'interdit pas.** Un artisan peut légitimement poser deux rendez-vous qui se croisent — un compagnon prend l'un, il passe en coup de vent sur l'autre. Bloquer le ferait mentir sur les horaires, ou repartir vers son téléphone.

**On annule, on ne supprime pas, et on ne déplace pas.** Un rendez-vous pris puis annulé est un fait : le client a été prévenu que quelqu'un viendrait. Déplacer se fait en annulant et en reprenant — deux lignes plutôt qu'une, ce qui est plus simple **et** plus honnête, puisque le déplacement reste lisible.

**La semaine se groupe en heure de Paris**, pas en UTC. Le produit est bordelais ; un fuseau par entreprise viendra quand une entreprise sera ailleurs.

**Rien de la semaine n'est stocké.** Elle se calcule à la lecture, comme tout le reste.

---

## Deux choix de mise en œuvre qui méritent d'être dits

### La grille de la semaine est une liste

Sept colonnes horaires sur un téléphone tenu d'une main sur un chantier ne se lisent pas. **La semaine est une liste groupée par jour**, avec une navigation semaine précédente / suivante. C'est aussi ce que le design system sait déjà faire — aucune primitive de grille n'existe, et en inventer une pour cet écran serait le pire moment.

### Le fuseau ne sort jamais du calendrier

Convertir « minuit à Paris » en instant UTC demande de connaître le décalage du jour — arithmétique fragile et sans bibliothèque ici.

> **Décision.** Le service interroge une fenêtre UTC **volontairement trop large d'un jour de chaque côté**, et la fonction pure décide, jour de Paris par jour de Paris, ce qui appartient à quoi. Sur-lire vingt-quatre heures ne coûte rien et retire tout calcul de décalage du service.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/appointment.ts` | Recevabilité d'un créneau, chevauchement — **pur** |
| `src/domain/agenda-week.ts` | La semaine, en heure de Paris — **pur** |
| `src/db/schema/appointment.ts` | `appointment` |
| `src/services/appointments.ts` | Prendre, annuler, lister |
| `src/app/(app)/agenda/**` | La semaine, et le rendez-vous de visite |
| `src/app/(app)/devis/[id]/BookWorkForm.tsx` | Le rendez-vous d'intervention |
| `src/ui/organisms/app-header.tsx` | *(modifié)* l'agenda devient atteignable |
| `src/domain/timeline.ts` · `src/services/chantier-file.ts` | *(modifiés)* le rendez-vous au fil de chantier |

---

## Task 1 : Le créneau

Fonction pure.

**Files:**
- Create: `src/domain/appointment.ts`
- Test: `tests/domain/appointment.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/appointment.test.ts
import { describe, it, expect } from 'vitest'
import {
  MAX_HOURS,
  MIN_MINUTES,
  assertSchedulable,
  conflicts,
  overlaps,
  type Slot,
} from '@/domain/appointment'

const at = (iso: string) => new Date(iso)
const slot = (from: string, to: string): Slot => ({ startsAt: at(from), endsAt: at(to) })

describe('recevabilite d un creneau', () => {
  it('accepte un rendez-vous d une heure', () => {
    expect(() => assertSchedulable(slot('2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z'))).not.toThrow()
  })

  it('refuse une fin avant le debut', () => {
    expect(() => assertSchedulable(slot('2026-09-01T09:00:00Z', '2026-09-01T08:00:00Z'))).toThrow(
      /après/,
    )
  })

  it('refuse une duree nulle', () => {
    expect(() => assertSchedulable(slot('2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'))).toThrow(
      /après/,
    )
  })

  it('refuse un creneau plus court que le minimum', () => {
    expect(() => assertSchedulable(slot('2026-09-01T08:00:00Z', '2026-09-01T08:05:00Z'))).toThrow(
      new RegExp(`${MIN_MINUTES} minutes`),
    )
  })

  it('refuse un creneau plus long que le maximum', () => {
    // Au-dela, ce n'est plus un rendez-vous : c'est une journee de chantier, et
    // l'agenda deviendrait illisible.
    expect(() => assertSchedulable(slot('2026-09-01T06:00:00Z', '2026-09-01T20:00:00Z'))).toThrow(
      new RegExp(`${MAX_HOURS} heures`),
    )
  })

  it('accepte un rendez-vous PASSE', () => {
    // Il saisit souvent apres coup, le soir. Refuser le passe lui ferait
    // renoncer a saisir — et le delai de remise du devis n'aurait plus de
    // premier bout.
    expect(() => assertSchedulable(slot('2020-01-01T08:00:00Z', '2020-01-01T09:00:00Z'))).not.toThrow()
  })
})

describe('chevauchement', () => {
  const morning = slot('2026-09-01T08:00:00Z', '2026-09-01T10:00:00Z')

  it('detecte un croisement partiel', () => {
    expect(overlaps(morning, slot('2026-09-01T09:00:00Z', '2026-09-01T11:00:00Z'))).toBe(true)
  })

  it('detecte un englobement', () => {
    expect(overlaps(morning, slot('2026-09-01T07:00:00Z', '2026-09-01T12:00:00Z'))).toBe(true)
  })

  it('ne compte PAS deux creneaux qui se touchent', () => {
    // Dix heures pile a l'un, dix heures pile a l'autre : c'est un enchainement,
    // pas un conflit. L'inverse ferait crier l'ecran sur une journee normale.
    expect(overlaps(morning, slot('2026-09-01T10:00:00Z', '2026-09-01T11:00:00Z'))).toBe(false)
  })

  it('ne compte pas deux jours differents', () => {
    expect(overlaps(morning, slot('2026-09-02T08:00:00Z', '2026-09-02T10:00:00Z'))).toBe(false)
  })

  it('rend les creneaux en conflit, pas un booleen', () => {
    // L'ecran doit pouvoir DIRE avec quoi ca se chevauche : « vous avez deja
    // un rendez-vous a 9 h » vaut mieux qu'un avertissement muet.
    const others = [
      slot('2026-09-01T09:00:00Z', '2026-09-01T11:00:00Z'),
      slot('2026-09-01T14:00:00Z', '2026-09-01T15:00:00Z'),
    ]

    expect(conflicts(morning, others)).toHaveLength(1)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/domain/appointment.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "@/domain/appointment"`.

- [ ] **Step 3 : Écrire l'implémentation**

```typescript
// src/domain/appointment.ts

/**
 * Le rendez-vous, vu comme un creneau.
 *
 * **Il se pose toujours sur un chantier** — c'est la seule chose qui distingue
 * cet agenda de celui de son telephone : le rendez-vous y porte l'adresse, le
 * client et son numero.
 */
export type AppointmentKind = 'visit' | 'work'

export interface Slot {
  startsAt: Date
  endsAt: Date
}

/** En deca, c'est une erreur de saisie, pas un rendez-vous. */
export const MIN_MINUTES = 15

/** Au-dela, c'est une journee de chantier, et l'agenda devient illisible. */
export const MAX_HOURS = 12

export function assertSchedulable(slot: Slot): void {
  const minutes = (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000

  if (minutes <= 0) throw new Error('La fin doit être après le début')
  if (minutes < MIN_MINUTES) throw new Error(`Un rendez-vous dure au moins ${MIN_MINUTES} minutes`)
  if (minutes > MAX_HOURS * 60) throw new Error(`Un rendez-vous dure au plus ${MAX_HOURS} heures`)

  // Aucune borne sur le passe : l'artisan saisit souvent le soir, apres coup.
  // Le lui refuser le ferait renoncer a saisir.
}

/**
 * Deux creneaux se chevauchent-ils ?
 *
 * Deux creneaux qui se **touchent** ne se chevauchent pas : dix heures pile a
 * l'un, dix heures pile a l'autre, c'est un enchainement. L'inverse ferait
 * crier l'ecran sur une journee normale, et un avertissement qui crie toujours
 * finit ignore.
 */
export function overlaps(a: Slot, b: Slot): boolean {
  return a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime()
}

/**
 * Les creneaux en conflit, et non un simple booleen.
 *
 * L'ecran doit pouvoir dire AVEC QUOI : « vous avez deja un rendez-vous a 9 h »
 * vaut mieux qu'un avertissement muet, qu'on apprend a cliquer sans lire.
 */
export function conflicts<T extends Slot>(slot: Slot, others: T[]): T[] {
  return others.filter((other) => overlaps(slot, other))
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
pnpm vitest run tests/domain/appointment.test.ts
```

Attendu : 11 tests verts.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/appointment.ts tests/domain/appointment.test.ts
git commit -m "feat: le creneau, et le chevauchement qui avertit sans interdire"
```

---

## Task 2 : La semaine, en heure de Paris

**Files:**
- Create: `src/domain/agenda-week.ts`
- Test: `tests/domain/agenda-week.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/agenda-week.test.ts
import { describe, it, expect } from 'vitest'
import { dayKeyOf, groupByDay, weekOf } from '@/domain/agenda-week'

describe('le jour de Paris', () => {
  it('rend le jour local, pas le jour UTC', () => {
    // 30 juin 23 h 30 UTC = 1er juillet 1 h 30 a Paris. Grouper en UTC
    // placerait ce rendez-vous la veille.
    expect(dayKeyOf(new Date('2026-06-30T23:30:00Z'))).toBe('2026-07-01')
  })

  it('tient en hiver comme en ete', () => {
    // +1 en janvier, +2 en juillet : la meme heure UTC ne donne pas le meme
    // jour local selon la saison.
    expect(dayKeyOf(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16')
    expect(dayKeyOf(new Date('2026-07-15T08:00:00Z'))).toBe('2026-07-15')
  })
})

describe('la semaine', () => {
  it('commence le lundi', () => {
    // Le 2 septembre 2026 est un mercredi.
    expect(weekOf(new Date('2026-09-02T10:00:00Z'))[0]).toBe('2026-08-31')
  })

  it('compte sept jours', () => {
    expect(weekOf(new Date('2026-09-02T10:00:00Z'))).toHaveLength(7)
  })

  it('ne bouge pas quand on part du lundi lui-meme', () => {
    expect(weekOf(new Date('2026-08-31T10:00:00Z'))[0]).toBe('2026-08-31')
  })

  it('recule d une semaine complete quand on part du dimanche', () => {
    // Le dimanche appartient a la semaine qui l'a precede, pas a la suivante.
    expect(weekOf(new Date('2026-09-06T10:00:00Z'))).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ])
  })

  it('franchit un changement de mois et d annee', () => {
    expect(weekOf(new Date('2027-01-01T10:00:00Z'))[0]).toBe('2026-12-28')
  })
})

describe('le groupement', () => {
  const item = (iso: string, label: string) => ({ startsAt: new Date(iso), label })

  it('range chaque rendez-vous dans son jour de Paris', () => {
    const days = groupByDay(
      [item('2026-09-01T08:00:00Z', 'matin'), item('2026-09-02T09:00:00Z', 'lendemain')],
      weekOf(new Date('2026-09-02T10:00:00Z')),
    )

    expect(days.find((d) => d.day === '2026-09-01')!.items).toHaveLength(1)
    expect(days.find((d) => d.day === '2026-09-02')!.items).toHaveLength(1)
  })

  it('rend les sept jours, meme vides', () => {
    // Une semaine sans rendez-vous doit rester une semaine : sauter les jours
    // vides ferait sauter le lecteur d'une date a l'autre.
    const days = groupByDay([], weekOf(new Date('2026-09-02T10:00:00Z')))

    expect(days).toHaveLength(7)
    expect(days.every((d) => d.items.length === 0)).toBe(true)
  })

  it('classe les rendez-vous d un jour par heure', () => {
    const days = groupByDay(
      [item('2026-09-01T14:00:00Z', 'apres-midi'), item('2026-09-01T08:00:00Z', 'matin')],
      weekOf(new Date('2026-09-01T10:00:00Z')),
    )

    expect(days.find((d) => d.day === '2026-09-01')!.items.map((i) => i.label)).toEqual([
      'matin',
      'apres-midi',
    ])
  })

  it('ignore ce qui tombe hors de la semaine', () => {
    // Le service sur-lit volontairement d'un jour de chaque cote : c'est ici
    // que le surplus est ecarte.
    const days = groupByDay(
      [item('2026-09-20T08:00:00Z', 'plus tard')],
      weekOf(new Date('2026-09-02T10:00:00Z')),
    )

    expect(days.every((d) => d.items.length === 0)).toBe(true)
  })
})
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

```bash
pnpm vitest run tests/domain/agenda-week.test.ts
```

- [ ] **Step 3 : Écrire l'implémentation**

```typescript
// src/domain/agenda-week.ts

/**
 * La semaine de l'artisan, groupee en heure LOCALE.
 *
 * Grouper en UTC placerait un rendez-vous du 1er juillet a 1 h 30 la veille :
 * Paris est a +1 en hiver et +2 en ete, et l'ecart traverse minuit.
 *
 * Le fuseau est fige : le produit est bordelais en P1. Un fuseau par entreprise
 * viendra quand une entreprise sera ailleurs — pas avant, et le nommer ici
 * evite qu'on l'oublie.
 */
const ZONE = 'Europe/Paris'

/** `fr-CA` rend `AAAA-MM-JJ`, seul format ISO parmi les locales usuelles. */
const DAY_FORMAT = new Intl.DateTimeFormat('fr-CA', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Le jour calendaire local d'un instant, sous la forme `AAAA-MM-JJ`. */
export function dayKeyOf(instant: Date): string {
  return DAY_FORMAT.format(instant)
}

/**
 * Les sept jours de la semaine contenant cet instant, du lundi au dimanche.
 *
 * Une fois le jour local obtenu, tout le calcul se fait sur des dates
 * calendaires : un 31 aout a un jour de semaine bien defini, sans fuseau.
 */
export function weekOf(instant: Date): string[] {
  const [year, month, day] = dayKeyOf(instant).split('-').map(Number)

  const noon = Date.UTC(year, month - 1, day)
  // `getUTCDay` rend 0 pour dimanche : on le ramene a 6 pour un lundi premier.
  const weekday = (new Date(noon).getUTCDay() + 6) % 7
  const monday = noon - weekday * 86_400_000

  return Array.from({ length: 7 }, (_, index) =>
    new Date(monday + index * 86_400_000).toISOString().slice(0, 10),
  )
}

export interface Day<T> {
  day: string
  items: T[]
}

/**
 * Range des elements dates dans les jours d'une semaine.
 *
 * **Les sept jours sont rendus, meme vides** : sauter les jours sans
 * rendez-vous ferait sauter le lecteur d'une date a l'autre, et une semaine
 * creuse ne se lirait plus comme une semaine.
 *
 * Ce qui tombe hors de la semaine est ecarte — le service sur-lit d'un jour de
 * chaque cote pour n'avoir aucun decalage de fuseau a calculer.
 */
export function groupByDay<T extends { startsAt: Date }>(items: T[], week: string[]): Day<T>[] {
  return week.map((day) => ({
    day,
    items: items
      .filter((item) => dayKeyOf(item.startsAt) === day)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
  }))
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
pnpm vitest run tests/domain/agenda-week.test.ts
```

Attendu : 10 tests verts.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/agenda-week.ts tests/domain/agenda-week.test.ts
git commit -m "feat: la semaine groupee en heure de Paris, jamais en UTC"
```

---

## Task 3 : Le schéma

**Files:**
- Create: `src/db/schema/appointment.ts`
- Modify: `src/db/schema/index.ts`

- [ ] **Step 1 : Écrire le schéma**

```typescript
// src/db/schema/appointment.ts
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company } from './company'
import { project } from './project'

/**
 * Un rendez-vous, pose sur un chantier.
 *
 * **Jamais dans le vide** : sans l'adresse, le client et son numero, ce serait
 * une ligne de calendrier de plus, et elle n'aurait aucune raison d'etre saisie
 * ici plutot que sur son telephone.
 *
 * On **annule**, on ne supprime pas, et on ne deplace pas : un rendez-vous pris
 * puis annule est un fait — le client a ete prevenu que quelqu'un viendrait.
 * Deplacer se fait en annulant et en reprenant, ce qui laisse les deux lisibles.
 */
export const appointment = pgTable(
  'appointment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    /**
     * `visit` precede le devis et ouvre le delai de remise ; `work` suit la
     * signature et s'inscrit au fil de chantier.
     */
    kind: text('kind', { enum: ['visit', 'work'] }).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: text('status', { enum: ['scheduled', 'cancelled'] })
      .notNull()
      .default('scheduled'),
    note: text('note'),
    /**
     * Horodatage de SAISIE, distinct de `starts_at`.
     *
     * C'est lui qui rend la date non antidatable utilement : un rendez-vous de
     * visite cree apres l'envoi du devis se verrait.
     */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (t) => [
    index('appointment_company_starts_idx').on(t.companyId, t.startsAt),
    index('appointment_project_idx').on(t.projectId),
  ],
)

export const appointmentRelations = relations(appointment, ({ one }) => ({
  project: one(project, { fields: [appointment.projectId], references: [project.id] }),
}))
```

Ajouter `export * from './appointment'` à `src/db/schema/index.ts`.

- [ ] **Step 2 : Générer et appliquer**

```bash
pnpm db:generate && pnpm db:reset
```

Attendu : un `0014_*.sql` créant `appointment`. **Ne pas le renommer** — voir `supabase/MIGRATIONS.md`.

- [ ] **Step 3 : Commit**

```bash
git add src/db/schema supabase/migrations
git commit -m "feat: le schema du rendez-vous, pose sur un chantier"
```

---

## Task 4 : Le service

**Files:**
- Create: `src/services/appointments.ts`
- Test: `tests/services/appointments.test.ts`

- [ ] **Step 1 : Écrire le service**

```typescript
// src/services/appointments.ts
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointment, customer, project, property } from '@/db/schema'
import { assertSchedulable, conflicts, type AppointmentKind } from '@/domain/appointment'
import { groupByDay, weekOf, type Day } from '@/domain/agenda-week'

export interface BookedAppointment {
  id: string
  projectId: string
  kind: AppointmentKind
  startsAt: Date
  endsAt: Date
  note: string | null
  customerName: string
  customerPhone: string | null
  address: string
  projectLabel: string
}

/**
 * Prend un rendez-vous sur un chantier de cette entreprise.
 *
 * Le chevauchement **avertit sans interdire** : un artisan peut legitimement
 * poser deux rendez-vous qui se croisent. L'appelant recoit la liste des
 * conflits et decide de ce qu'il en dit.
 */
export async function bookAppointment(input: {
  companyId: string
  projectId: string
  kind: AppointmentKind
  startsAt: Date
  endsAt: Date
  note: string
}) {
  assertSchedulable(input)

  const [owned] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, input.projectId), eq(project.companyId, input.companyId)))
  if (!owned) throw new Error('Chantier introuvable')

  const [created] = await db
    .insert(appointment)
    .values({
      projectId: input.projectId,
      companyId: input.companyId,
      kind: input.kind,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      note: input.note.trim() || null,
    })
    .returning()

  return created
}

/** Les rendez-vous de cette entreprise qui chevauchent ce creneau. */
export async function conflictingAppointments(
  companyId: string,
  slot: { startsAt: Date; endsAt: Date },
): Promise<BookedAppointment[]> {
  const sameDay = await appointmentsBetween(
    companyId,
    new Date(slot.startsAt.getTime() - 86_400_000),
    new Date(slot.endsAt.getTime() + 86_400_000),
  )

  return conflicts(slot, sameDay)
}

/**
 * Annule. **Ne supprime pas** : le client a ete prevenu que quelqu'un viendrait.
 */
export async function cancelAppointment(companyId: string, appointmentId: string) {
  const [cancelled] = await db
    .update(appointment)
    .set({ status: 'cancelled', cancelledAt: new Date() })
    .where(and(eq(appointment.id, appointmentId), eq(appointment.companyId, companyId)))
    .returning()

  if (!cancelled) throw new Error('Rendez-vous introuvable')
  return cancelled
}

/**
 * La semaine contenant cet instant, groupee par jour de Paris.
 *
 * La fenetre interrogee deborde **volontairement d'un jour de chaque cote** :
 * convertir « minuit a Paris » en instant UTC demanderait le decalage du jour,
 * et sur-lire vingt-quatre heures retire ce calcul du service. La fonction pure
 * ecarte ensuite le surplus.
 */
export async function weekAgenda(
  companyId: string,
  around: Date,
): Promise<Day<BookedAppointment>[]> {
  const week = weekOf(around)
  const from = new Date(`${week[0]}T00:00:00Z`)
  const to = new Date(`${week[6]}T00:00:00Z`)

  const rows = await appointmentsBetween(
    companyId,
    new Date(from.getTime() - 86_400_000),
    new Date(to.getTime() + 2 * 86_400_000),
  )

  return groupByDay(rows, week)
}

async function appointmentsBetween(
  companyId: string,
  from: Date,
  to: Date,
): Promise<BookedAppointment[]> {
  return db
    .select({
      id: appointment.id,
      projectId: appointment.projectId,
      kind: appointment.kind,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      note: appointment.note,
      customerName: customer.name,
      customerPhone: customer.phone,
      addressLine1: property.addressLine1,
      postalCode: property.postalCode,
      city: property.city,
      projectLabel: project.label,
    })
    .from(appointment)
    .innerJoin(project, eq(project.id, appointment.projectId))
    .innerJoin(customer, eq(customer.id, project.customerId))
    .innerJoin(property, eq(property.id, project.propertyId))
    .where(
      and(
        // La condition d'acces est portee par la requete, comme partout ailleurs.
        eq(appointment.companyId, companyId),
        eq(appointment.status, 'scheduled'),
        gte(appointment.startsAt, from),
        lte(appointment.startsAt, to),
      ),
    )
    .orderBy(asc(appointment.startsAt))
    .then((rows) =>
      rows.map(({ addressLine1, postalCode, city, ...rest }) => ({
        ...rest,
        address: `${addressLine1}, ${postalCode} ${city}`,
      })),
    )
}
```

- [ ] **Step 2 : Écrire les tests**

```typescript
// tests/services/appointments.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { appointment } from '@/db/schema'
import {
  bookAppointment,
  cancelAppointment,
  conflictingAppointments,
  weekAgenda,
} from '@/services/appointments'
import { createCompany, createProject } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const at = (iso: string) => new Date(iso)

async function site() {
  const companyId = await createCompany()
  return { companyId, projectId: await createProject(companyId) }
}

const book = (companyId: string, projectId: string, from: string, to: string) =>
  bookAppointment({
    companyId,
    projectId,
    kind: 'visit',
    startsAt: at(from),
    endsAt: at(to),
    note: '',
  })

describe('prendre un rendez-vous', () => {
  it('le pose sur le chantier', async () => {
    const { companyId, projectId } = await site()

    const created = await book(companyId, projectId, '2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z')

    expect(created.projectId).toBe(projectId)
    expect(created.status).toBe('scheduled')
  })

  it('REFUSE le chantier d une autre entreprise', async () => {
    const { projectId } = await site()
    const rival = await createCompany()

    await expect(
      book(rival, projectId, '2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z'),
    ).rejects.toThrow(/introuvable/)
  })

  it('refuse un creneau irrecevable', async () => {
    const { companyId, projectId } = await site()

    await expect(
      book(companyId, projectId, '2026-09-01T09:00:00Z', '2026-09-01T08:00:00Z'),
    ).rejects.toThrow(/après/)
  })
})

describe('le chevauchement', () => {
  it('signale sans empecher', async () => {
    // La decision du jalon : on avertit, on n'interdit pas. Le second
    // rendez-vous EXISTE apres l'appel.
    const { companyId, projectId } = await site()
    await book(companyId, projectId, '2026-09-01T08:00:00Z', '2026-09-01T10:00:00Z')

    const found = await conflictingAppointments(companyId, {
      startsAt: at('2026-09-01T09:00:00Z'),
      endsAt: at('2026-09-01T11:00:00Z'),
    })
    const second = await book(
      companyId,
      projectId,
      '2026-09-01T09:00:00Z',
      '2026-09-01T11:00:00Z',
    )

    expect(found).toHaveLength(1)
    expect(second.id).toBeDefined()
  })

  it('ne voit pas les rendez-vous d une autre entreprise', async () => {
    const { companyId, projectId } = await site()
    await book(companyId, projectId, '2026-09-01T08:00:00Z', '2026-09-01T10:00:00Z')
    const other = await createCompany()

    expect(
      await conflictingAppointments(other, {
        startsAt: at('2026-09-01T09:00:00Z'),
        endsAt: at('2026-09-01T11:00:00Z'),
      }),
    ).toEqual([])
  })
})

describe('annuler', () => {
  it('ne supprime pas la ligne', async () => {
    const { companyId, projectId } = await site()
    const created = await book(
      companyId,
      projectId,
      '2026-09-01T08:00:00Z',
      '2026-09-01T09:00:00Z',
    )

    await cancelAppointment(companyId, created.id)

    const [row] = await db.select().from(appointment).where(eq(appointment.id, created.id))
    expect(row.status).toBe('cancelled')
    expect(row.cancelledAt).not.toBeNull()
  })

  it('retire le rendez-vous de la semaine', async () => {
    const { companyId, projectId } = await site()
    const created = await book(
      companyId,
      projectId,
      '2026-09-01T08:00:00Z',
      '2026-09-01T09:00:00Z',
    )
    await cancelAppointment(companyId, created.id)

    const days = await weekAgenda(companyId, at('2026-09-02T10:00:00Z'))

    expect(days.every((d) => d.items.length === 0)).toBe(true)
  })

  it('REFUSE le rendez-vous d une autre entreprise', async () => {
    const { companyId, projectId } = await site()
    const created = await book(
      companyId,
      projectId,
      '2026-09-01T08:00:00Z',
      '2026-09-01T09:00:00Z',
    )

    await expect(cancelAppointment(await createCompany(), created.id)).rejects.toThrow(
      /introuvable/,
    )
  })
})

describe('la semaine', () => {
  it('porte l adresse, le client et son numero', async () => {
    // C'est tout l'interet : sans eux, ce serait une ligne de calendrier.
    const { companyId, projectId } = await site()
    await book(companyId, projectId, '2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z')

    const days = await weekAgenda(companyId, at('2026-09-02T10:00:00Z'))
    const [found] = days.flatMap((d) => d.items)

    expect(found.address).toContain('Bordeaux')
    expect(found.customerName).toBeTruthy()
  })

  it('rend les sept jours et ecarte ce qui n en est pas', async () => {
    const { companyId, projectId } = await site()
    await book(companyId, projectId, '2026-09-20T08:00:00Z', '2026-09-20T09:00:00Z')

    const days = await weekAgenda(companyId, at('2026-09-02T10:00:00Z'))

    expect(days).toHaveLength(7)
    expect(days.every((d) => d.items.length === 0)).toBe(true)
  })

  it('range un rendez-vous du soir dans son jour LOCAL', async () => {
    // 31 aout 23 h 30 UTC = 1er septembre 1 h 30 a Paris.
    const { companyId, projectId } = await site()
    await book(companyId, projectId, '2026-08-31T23:30:00Z', '2026-09-01T00:30:00Z')

    const days = await weekAgenda(companyId, at('2026-09-02T10:00:00Z'))

    expect(days.find((d) => d.day === '2026-09-01')!.items).toHaveLength(1)
  })
})
```

- [ ] **Step 3 : Lancer les tests**

```bash
pnpm vitest run tests/services/appointments.test.ts
```

Attendu : 11 tests verts.

- [ ] **Step 4 : Vérifier que le contrôle d'accès discrimine**

Retirer `eq(appointment.companyId, companyId)` de `appointmentsBetween` et relancer : « ne voit pas les rendez-vous d une autre entreprise » **doit échouer**. Le remettre.

- [ ] **Step 5 : Commit**

```bash
git add src/services/appointments.ts tests/services/appointments.test.ts
git commit -m "feat: prendre, annuler et lire la semaine des rendez-vous"
```

---

## Task 5 : L'écran de l'agenda

**Files:**
- Create: `src/app/(app)/agenda/page.tsx`
- Create: `src/app/(app)/agenda/CancelButton.tsx`
- Create: `src/app/(app)/agenda/actions.ts`
- Modify: `src/ui/organisms/app-header.tsx`

- [ ] **Step 1 : L'écran**

`AppShell`, `currentCompany()` avec la redirection habituelle. La semaine se lit dans la chaîne de requête — `?semaine=2026-09-02` — et par défaut, aujourd'hui.

**Une liste groupée par jour, pas une grille.** Sept colonnes horaires sur un téléphone tenu d'une main sur un chantier ne se lisent pas, et le design system n'a aucune primitive de grille — en inventer une pour cet écran serait le pire moment.

Chaque jour : sa date en toutes lettres, puis ses rendez-vous. Chaque rendez-vous :

| Ce qui s'affiche | Pourquoi |
|---|---|
| Heure de début et de fin | — |
| `visit` / `work` en `Badge` | Les deux ne se préparent pas pareil |
| Nom du client, **et son numéro cliquable** (`tel:`) | Il appelle depuis la route |
| Adresse | C'est là qu'il va |
| Libellé du chantier, lien vers le devis | Le contexte |
| Annuler | — |

Un jour sans rendez-vous garde sa ligne de date. `data-testid="agenda"` sur la liste, `data-testid="semaine"` sur l'intitulé de la semaine.

Navigation : deux `ButtonLink` vers `?semaine=` de la semaine précédente et suivante, calculées à partir de `weekOf`.

- [ ] **Step 2 : L'agenda devient atteignable**

Ajouter dans `AppHeader` une navigation minimale — **Devis · Factures · Agenda** — avec l'état actif de la page courante.

Des `Link` du design system directement dans `AppHeader` — **aucun composant nouveau**, donc aucune addition à l'inventaire de `check:ds`, qui est fermé.

> **Un écran qu'on ne peut pas atteindre n'existe pas**, et c'est exactement le mode d'échec contre lequel toute cette spec est écrite. `/mon-passeport`, `/verification` et `/annuaire` n'ont eux non plus **aucun point d'entrée** aujourd'hui — c'est un défaut préexistant, signalé à part, que ce jalon ne corrige pas.

- [ ] **Step 3 : L'annulation**

`actions.ts` sur le modèle de `completeChantier` : `currentCompany()`, `try/catch` qui renvoie `{ error }`, `revalidatePath('/agenda')`.

`CancelButton` demande confirmation avant d'agir — un clic malheureux sur un chantier ferait manquer un rendez-vous. Reprendre `Dialog` du design system.

- [ ] **Step 4 : Vérifier à l'écran, puis les garde-fous**

```bash
pnpm validate
```

- [ ] **Step 5 : Commit**

```bash
git add "src/app/(app)/agenda" src/ui/organisms/app-header.tsx
git commit -m "feat: l'agenda de la semaine, et sa porte d'entree"
```

---

## Task 6 : Le rendez-vous de visite crée son chantier

C'est le seul parcours du jalon qui ne part pas d'un chantier existant — la visite précède le devis.

**Files:**
- Create: `src/app/(app)/agenda/nouveau/page.tsx`
- Create: `src/app/(app)/agenda/nouveau/VisitForm.tsx`
- Create: `src/app/(app)/agenda/nouveau/actions.ts`

- [ ] **Step 1 : L'action**

Elle enchaîne `createProject` puis `bookAppointment`, dans cet ordre. Un formulaire, deux écritures :

```typescript
export async function bookVisit(_state: BookVisitState, form: FormData): Promise<BookVisitState> {
  const { companyId } = await currentCompany()

  try {
    // Le chantier d'abord : le rendez-vous n'existe pas sans lui, et l'artisan
    // devra le creer de toute facon pour etablir son devis.
    const project = await createProject({
      companyId,
      customer: {
        name: String(form.get('client') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('telephone') ?? ''),
        type: 'individual',
      },
      address: {
        line1: String(form.get('adresse') ?? ''),
        postalCode: String(form.get('code_postal') ?? ''),
        city: String(form.get('ville') ?? ''),
      },
      label: String(form.get('objet') ?? ''),
    })

    await bookAppointment({
      companyId,
      projectId: project.id,
      kind: 'visit',
      startsAt: new Date(String(form.get('debut'))),
      endsAt: new Date(String(form.get('fin'))),
      note: String(form.get('note') ?? ''),
    })
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Hors du bloc `try` : `redirect` signale la navigation en levant une
  // exception, qu'un `catch` afficherait comme une erreur.
  redirect('/agenda')
}
```

> **Un chantier créé sans rendez-vous en cas d'échec du second appel.** C'est acceptable et volontaire : le chantier est réutilisable, l'artisan reprendra rendez-vous dessus. L'inverse — perdre le client saisi parce que l'heure était mal formée — serait bien pire. `assertSchedulable` étant appelé en premier dans `bookAppointment`, le cas courant est déjà écarté.

- [ ] **Step 2 : Le formulaire**

Reprendre la structure de `NewQuoteForm` : `Field` + `Input` pour le client, l'e-mail, le téléphone, l'adresse, le code postal, la ville et l'objet ; deux `Input type="datetime-local"` pour le créneau ; `Textarea` pour la note.

`data-testid="client-visite"` sur le nom, `data-testid="debut-visite"` sur le début.

Une phrase dit ce que le geste fait, parce qu'il en fait deux :

> « Prendre ce rendez-vous crée aussi le chantier. Vous y établirez votre devis ensuite. »

- [ ] **Step 3 : Vérifier à l'écran**

Prendre un rendez-vous de visite, vérifier qu'il apparaît dans la semaine avec l'adresse et le numéro, et que le chantier est utilisable depuis `/devis/nouveau`.

- [ ] **Step 4 : Commit**

```bash
git add "src/app/(app)/agenda/nouveau"
git commit -m "feat: le rendez-vous de visite cree son chantier"
```

---

## Task 7 : Le rendez-vous d'intervention

**Files:**
- Create: `src/app/(app)/devis/[id]/BookWorkForm.tsx`
- Modify: `src/app/(app)/devis/[id]/actions.ts`
- Modify: `src/app/(app)/devis/[id]/page.tsx`

- [ ] **Step 1 : L'action et le formulaire**

`bookWork(quoteId, state, form)` : `currentCompany()`, lit `projectId` depuis le devis, puis `bookAppointment` avec `kind: 'work'`.

**Avant d'écrire, elle appelle `conflictingAppointments`** et renvoie les conflits dans l'état. Le formulaire les affiche sans bloquer :

> « Vous avez déjà un rendez-vous le 1er septembre de 9 h à 11 h. Vous pouvez quand même prendre celui-ci. »

C'est la décision du jalon rendue visible : on avertit, on n'interdit pas.

- [ ] **Step 2 : Le brancher sur la fiche devis**

Le formulaire prend place dans la section « Chantier » de `/devis/[id]`, **visible dès que le devis est signé** — on n'intervient pas sur un devis qui n'engage personne.

`src/app/(app)/devis/[id]/page.tsx` est à 203 lignes pour une limite de 250 : ajouter le composant, pas son contenu.

- [ ] **Step 3 : Vérifier à l'écran, puis les garde-fous**

```bash
pnpm validate
```

- [ ] **Step 4 : Commit**

```bash
git add "src/app/(app)/devis"
git commit -m "feat: le rendez-vous d'intervention, avec l'avertissement de chevauchement"
```

---

## Task 8 : Le rendez-vous au fil de chantier

Le client voit déjà sa chronologie depuis M6·B. Un rendez-vous d'intervention y a toute sa place — et il n'en coûte qu'une entrée.

**Files:**
- Modify: `src/domain/timeline.ts`
- Modify: `src/services/chantier-file.ts`
- Modify: `tests/domain/timeline.test.ts`

- [ ] **Step 1 : Ajouter le test qui échoue**

```typescript
it('inscrit les rendez-vous a leur date', () => {
  const entries = buildTimeline(
    bare({
      appointments: [{ at: d('2026-03-10T08:00:00Z'), kind: 'work' }],
      completedAt: d('2026-04-20T17:00:00Z'),
    }),
  )

  expect(entries.map((e) => e.kind)).toEqual(['quote_signed', 'appointment', 'completed'])
})

it('n inscrit PAS un rendez-vous annule', () => {
  // Le service ne rend que les rendez-vous en cours : la chronologie du client
  // ne doit pas lui promettre une visite qui n'aura pas lieu.
  expect(buildTimeline(bare({ appointments: [] })).map((e) => e.kind)).toEqual(['quote_signed'])
})
```

Ajouter `appointments: []` au fixture `bare`, et étendre `ChantierFacts` :

```typescript
  appointments: { at: Date; kind: 'visit' | 'work' }[]
```

`TimelineKind` gagne `'appointment'`, et `RANK` lui donne le rang `1` — un rendez-vous se prend avant qu'une facture ne parte.

- [ ] **Step 2 : Brancher le service**

Dans `assemble` de `src/services/chantier-file.ts`, lire les rendez-vous **en cours** du projet du devis, et les passer à `buildTimeline`. Une jointure de plus, `status = 'scheduled'`.

> **Le devis porte le chantier, le rendez-vous porte le projet.** Un projet peut porter plusieurs devis, et le rendez-vous apparaîtrait alors dans deux dossiers. En P1 un projet n'a qu'une chaîne de versions ; le noter suffit, le corriger supposerait de déplacer le rendez-vous sur le devis, ce qui le rendrait impossible avant le premier devis — c'est-à-dire pour une visite.

- [ ] **Step 3 : Le libellé côté écran**

Dans `src/ui/organisms/chantier-timeline.tsx`, ajouter `appointment: 'Rendez-vous'` à `LABELS`.

- [ ] **Step 4 : Lancer les tests**

```bash
pnpm vitest run tests/domain/timeline.test.ts tests/services/chantier-file.test.ts
```

- [ ] **Step 5 : Commit**

```bash
git add src/domain/timeline.ts src/services/chantier-file.ts src/ui/organisms/chantier-timeline.tsx tests/
git commit -m "feat: le rendez-vous s'inscrit au fil que lit le client"
```

---

## Task 9 : Le parcours de bout en bout

**Files:**
- Create: `tests/e2e/agenda-journey.spec.ts`

- [ ] **Step 1 : Écrire le parcours**

```typescript
import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor } from './helpers'

/**
 * Le parcours de M7·A : de la prise de rendez-vous de visite a la semaine.
 *
 * Artisan neuf a chaque lancement : le parcours compte des rendez-vous.
 */
const ARTISAN = `artisan-m7-${randomUUID().slice(0, 8)}@test.local`

test('de la prise de rendez-vous à la semaine', async ({ page }) => {
  await clearMailbox()

  await test.step('connexion de l’artisan', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(ARTISAN)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(ARTISAN))
  })

  await test.step('l’agenda est atteignable depuis l’en-tête', async () => {
    // Un ecran qu'on ne peut pas atteindre n'existe pas.
    await page.getByRole('link', { name: 'Agenda' }).click()
    await expect(page).toHaveURL(/\/agenda$/)
  })

  await test.step('il prend un rendez-vous de visite, qui crée le chantier', async () => {
    await page.getByRole('link', { name: 'Prendre un rendez-vous' }).click()

    await page.getByTestId('client-visite').fill('Madame Rey')
    await page.getByLabel('E-mail').fill('rey@test.local')
    await page.getByLabel('Téléphone').fill('0612345678')
    await page.getByLabel('Adresse').fill('8 rue Sainte-Catherine')
    await page.getByLabel('Code postal').fill('33000')
    await page.getByLabel('Ville').fill('Bordeaux')
    await page.getByLabel('Objet').fill('Remplacement chaudière')
    await page.getByTestId('debut-visite').fill('2026-09-01T09:00')
    await page.getByLabel('Fin').fill('2026-09-01T10:00')

    await page.getByRole('button', { name: 'Prendre le rendez-vous' }).click()
    await expect(page).toHaveURL(/\/agenda$/)
  })

  await test.step('la semaine porte l’adresse et le numéro', async () => {
    // C'est tout l'interet : sans eux, ce serait une ligne de calendrier de
    // plus, et il la noterait sur son telephone.
    await page.goto('/agenda?semaine=2026-09-01')

    await expect(page.getByTestId('agenda')).toContainText('Madame Rey')
    await expect(page.getByTestId('agenda')).toContainText('8 rue Sainte-Catherine')
    await expect(page.getByTestId('agenda')).toContainText('Remplacement chaudière')
  })

  await test.step('la semaine précédente est vide, et le reste une semaine', async () => {
    await page.goto('/agenda?semaine=2026-08-25')

    await expect(page.getByTestId('agenda')).not.toContainText('Madame Rey')
    // Sept jours, meme vides : sauter les jours creux ferait sauter le lecteur.
    await expect(page.getByTestId('agenda').getByRole('listitem')).toHaveCount(7)
  })

  await test.step('il annule, et le rendez-vous quitte la semaine', async () => {
    await page.goto('/agenda?semaine=2026-09-01')
    await page.getByRole('button', { name: 'Annuler' }).first().click()
    await page.getByRole('button', { name: 'Confirmer l’annulation' }).click()

    await expect(page.getByTestId('agenda')).not.toContainText('Madame Rey')
  })
})
```

- [ ] **Step 2 : Lancer le parcours**

```bash
pnpm test:e2e
```

> `pnpm db:reset` en fait désormais partie, et chaque worktree a sa propre pile depuis `pnpm db:worktree`.

- [ ] **Step 3 : Vérification finale**

```bash
pnpm validate && pnpm test:e2e
```

- [ ] **Step 4 : Commit**

```bash
git add tests/e2e/agenda-journey.spec.ts
git commit -m "test: de la prise de rendez-vous a la semaine"
```

---

## Vérification du jalon

| Exigence de la spec | Où elle est vérifiée |
|---|---|
| Un rendez-vous se pose sur un chantier | Task 4, Task 6 |
| Il porte l'adresse, le client et son numéro | Task 4, Task 9 |
| Le chevauchement avertit sans interdire | Task 1, Task 4, Task 7 |
| On annule, on ne supprime pas | Task 4 |
| La semaine se groupe en heure de Paris | Task 2, Task 4 |
| Une entreprise ne voit que ses rendez-vous | Task 4 — le test discriminant |
| Le rendez-vous s'inscrit au fil du client | Task 8 |
| L'agenda est atteignable | Task 5, Task 9 |

## Ce qui reste aux plans B et C

**B — la synchronisation** : le flux iCalendar sortant, l'import Google et Microsoft, et l'écran qui dit pourquoi Apple n'y est pas.

**C — le rappel et la mesure** : le courriel de la veille, et le délai médian de remise du devis dans le passeport privé.

## Ce qui reste ouvert

- **Aucun déplacement de rendez-vous.** Annuler puis reprendre laisse deux lignes, ce qui est plus lisible — mais si le geste se révèle fréquent, il méritera son propre bouton, qui devra alors tracer l'ancienne date.
- **Le fuseau est figé sur Paris.** Une entreprise ailleurs demanderait un fuseau par entreprise, et tout le calcul de la semaine le supporte déjà — seule la constante changerait.
- **Aucune affectation à un compagnon.** Les rôles d'équipe sont M8.
