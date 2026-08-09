# M6·C — Le répertoire et la reprise de contact · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que le client retrouve « le plombier qui était venu il y a trois ans », voie **où en est sa vérification aujourd'hui**, y ajoute les entreprises que nous ne connaissons pas, et puisse les recontacter.

**Architecture:** Le répertoire est une **union** — la part dérivée des devis signés, la part saisie par le demandeur. La fusion est une fonction pure. Le statut de vérification se calcule à la lecture, comme en M3 : un drapeau stocké mentirait dès le lendemain d'une expiration.

**Tech Stack:** Identique. Aucune dépendance nouvelle.

> **Contraintes de l'atelier.** 250 lignes par fichier, aucune fonctionnalité n'importe d'une autre, design system obligatoire.
>
> **Déviation de format, comme aux jalons précédents.** Les écrans dont la structure existe renvoient à leurs équivalents ; le code complet est donné là où la logique est neuve.

**Références :** [spec M6 §7 et §8](../specs/2026-08-09-espace-demandeur-design.md) · [plan M6·B](2026-08-09-m6b-dossier-chantier.md) · [spec annuaire](../specs/2026-08-08-annuaire-design.md)

---

## Deux corrections, faites en planifiant

### 1. « L'activité réalisée » n'existe pas

§7 annonce le répertoire *« avec l'activité réalisée »*. **L'outil ne l'enregistre nulle part.** Un devis porte des lignes en texte libre — « Chauffe-eau 200 L posé » — et l'entreprise déclare ses activités au référentiel, mais rien ne relie les deux.

Écrire « Plomberie » à côté d'une intervention reviendrait à **inférer un fait à partir d'une déclaration d'entreprise**, et à le présenter au client comme un constat.

> **Décision.** On montre ce que l'on sait : **le libellé du chantier et sa date** — « Remplacement chauffe-eau, mars 2026 » — et, séparément, **les activités que l'entreprise déclare et leur couverture actuelle**. Jamais « ce qu'elle a fait chez vous ».

### 2. `directory` est déjà pris

M4 a livré `src/db/schema/directory.ts`, `src/services/directory.ts` et la route `/annuaire` : le **répertoire public** des entreprises. Le répertoire du demandeur est son **carnet d'adresses**, un objet privé qui ne lui ressemble en rien.

> **Décision.** `address_book_entry`, `src/services/address-book.ts`, route `/mon-repertoire`. Deux objets qui partagent un nom dans une même base de code, c'est ainsi que la confusion commence — et celle-ci porterait sur la frontière la plus sensible du produit : ce qui est public et ce qui ne l'est pas.

---

## Décisions verrouillées

**Le statut de vérification est celui d'aujourd'hui, pas celui du chantier.** C'est ce qui fait vivre le label après la vente : si la décennale d'une entreprise du répertoire a expiré, **le client le voit**. Le calcul est celui de M3, à la lecture.

**Et on affiche aussi le mauvais état.** Taire qu'une attestation a expiré serait l'exact contraire du service rendu. Une entreprise qui n'est plus couverte apparaît comme telle dans le répertoire de ceux qui l'ont employée.

**Aucune invitation n'est jamais envoyée** à une entreprise saisie à la main. On n'a qu'un seul premier contact avec un artisan, et « votre client vous a ajouté à son répertoire » vaudra en P2, accompagné d'une demande réelle. Le dépenser en P1 pour proposer un logiciel de devis, c'est griller le meilleur signal d'acquisition qui existe.

**Le répertoire appartient au demandeur.** Jamais lisible côté entreprise, jamais agrégé, jamais exporté. Aucune fonction de ce jalon ne prend un `companyId` en entrée pour lire un carnet.

**La reprise de contact n'écrit rien** de ce que le demandeur saisit — la règle de M4 tient sans exception. Ce qui change est le **type d'événement** : `address_book.contact` plutôt que `directory.contact`, parce que distinguer l'acquisition de la fidélisation est la seule mesure que nous aurons de l'utilité de ce jalon.

---

## Un mot sur ce que la reprise de contact apporte vraiment

Elle apporte **moins au demandeur que la spec ne le laisse croire** : il a déjà le téléphone et l'adresse de l'entreprise sur son devis, mentions obligatoires depuis M1.

Ce qu'elle apporte réellement, c'est la **fin du chemin** : le répertoire répond à « c'était qui, le plombier ? », et le bouton se trouve là où la réponse arrive. Plus, côté entreprise, un signal de réachat identifié — du travail sur son propre client, donc sans commission.

C'est une justification plus mince que celle du répertoire lui-même, et elle est peu coûteuse à construire : `relayContact` existe. Elle est donc gardée, mais sans lui prêter une valeur qu'elle n'a pas.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/address-book.ts` | Fusion et tri du carnet — **pur** |
| `src/db/schema/address-book.ts` | `address_book_entry` |
| `src/services/address-book.ts` | Le carnet assemblé, l'ajout manuel |
| `src/services/contact.ts` | *(modifié)* la reprise de contact, événement distinct |
| `src/app/(espace)/mon-repertoire/**` | La liste et l'ajout |
| `src/app/(espace)/mon-repertoire/[companyId]/**` | La fiche et la reprise de contact |
| `src/app/(espace)/mes-logements/page.tsx` | *(modifié)* le lien vers le répertoire |

---

## Task 1 : La fusion du carnet

Fonction pure.

**Files:**
- Create: `src/domain/address-book.ts`
- Test: `tests/domain/address-book.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/address-book.test.ts
import { describe, it, expect } from 'vitest'
import { mergeAddressBook, type ManualEntry, type PastIntervention } from '@/domain/address-book'

const d = (iso: string) => new Date(iso)

const intervention = (overrides: Partial<PastIntervention> = {}): PastIntervention => ({
  companyId: 'c1',
  companyName: 'GARANCE PLOMBERIE',
  chantierLabel: 'Remplacement chauffe-eau',
  at: d('2026-03-02T00:00:00Z'),
  ...overrides,
})

const manual = (overrides: Partial<ManualEntry> = {}): ManualEntry => ({
  id: 'm1',
  freeName: 'Couvreur de 2019',
  phone: '0556000000',
  activityLabel: null,
  note: null,
  createdAt: d('2026-01-01T00:00:00Z'),
  ...overrides,
})

describe('la part deduite des chantiers', () => {
  it('rend une seule ligne par entreprise', () => {
    // Trois interventions du meme plombier ne font pas trois plombiers.
    const entries = mergeAddressBook(
      [
        intervention({ at: d('2026-03-02T00:00:00Z') }),
        intervention({ at: d('2026-06-10T00:00:00Z'), chantierLabel: 'Fuite salle de bain' }),
      ],
      [],
    )

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'company', interventions: 2 })
  })

  it('retient la DERNIERE intervention', () => {
    // C'est celle que le demandeur cherche : « la derniere fois qu'il est venu ».
    const entries = mergeAddressBook(
      [
        intervention({ at: d('2026-03-02T00:00:00Z'), chantierLabel: 'Chauffe-eau' }),
        intervention({ at: d('2026-06-10T00:00:00Z'), chantierLabel: 'Fuite' }),
      ],
      [],
    )

    expect(entries[0]).toMatchObject({ lastChantier: { label: 'Fuite' } })
  })

  it('classe la plus recente en tete', () => {
    const entries = mergeAddressBook(
      [
        intervention({ companyId: 'c1', companyName: 'ANCIEN', at: d('2025-01-01T00:00:00Z') }),
        intervention({ companyId: 'c2', companyName: 'RECENT', at: d('2026-06-10T00:00:00Z') }),
      ],
      [],
    )

    expect(entries.map((e) => e.name)).toEqual(['RECENT', 'ANCIEN'])
  })
})

describe('la part saisie a la main', () => {
  it('vient APRES les entreprises connues', () => {
    // Les entreprises passees par l'outil portent une verification ; celles
    // qu'il a saisies ne portent que sa memoire. L'ordre le dit.
    const entries = mergeAddressBook([intervention()], [manual()])

    expect(entries.map((e) => e.kind)).toEqual(['company', 'manual'])
  })

  it('classe la plus recemment ajoutee en tete', () => {
    const entries = mergeAddressBook(
      [],
      [
        manual({ id: 'm1', freeName: 'VIEUX', createdAt: d('2025-01-01T00:00:00Z') }),
        manual({ id: 'm2', freeName: 'NEUF', createdAt: d('2026-01-01T00:00:00Z') }),
      ],
    )

    expect(entries.map((e) => e.name)).toEqual(['NEUF', 'VIEUX'])
  })

  it('n a ni intervention ni chantier', () => {
    // Rien n'est invente : nous ne savons rien de ce qu'elle a fait.
    const [entry] = mergeAddressBook([], [manual()])

    expect(entry.kind).toBe('manual')
    expect('lastChantier' in entry).toBe(false)
  })
})

describe('un carnet vide', () => {
  it('ne rend rien', () => {
    expect(mergeAddressBook([], [])).toEqual([])
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/domain/address-book.test.ts
```

Attendu : ÉCHEC — module introuvable.

- [ ] **Step 3 : Écrire l'implémentation**

```typescript
// src/domain/address-book.ts

/**
 * Le carnet d'adresses du demandeur.
 *
 * C'est l'objet que les gens perdent reellement — « c'etait qui, le plombier
 * venu il y a trois ans ? » — et qu'ils gerent aujourd'hui avec un aimant sur
 * le frigo. **A ne pas confondre avec l'annuaire de M4** : celui-la est public
 * et sert a decouvrir, celui-ci est prive et sert a retrouver.
 */

export interface PastIntervention {
  companyId: string
  companyName: string
  chantierLabel: string
  at: Date
}

export interface ManualEntry {
  id: string
  freeName: string
  phone: string | null
  activityLabel: string | null
  note: string | null
  createdAt: Date
}

export type AddressBookEntry =
  | {
      kind: 'company'
      name: string
      companyId: string
      lastChantier: { label: string; at: Date }
      interventions: number
    }
  | {
      kind: 'manual'
      name: string
      id: string
      phone: string | null
      activityLabel: string | null
      note: string | null
    }

/**
 * Les entreprises connues d'abord, celles qu'il a saisies ensuite.
 *
 * Ce n'est pas une hierarchie de merite : les premieres portent une
 * **verification que nous pouvons montrer**, les secondes ne portent que sa
 * memoire. Les melanger par date laisserait croire que nous en savons autant
 * des unes que des autres.
 */
export function mergeAddressBook(
  interventions: PastIntervention[],
  manual: ManualEntry[],
): AddressBookEntry[] {
  const byCompany = new Map<string, PastIntervention[]>()

  for (const item of interventions) {
    byCompany.set(item.companyId, [...(byCompany.get(item.companyId) ?? []), item])
  }

  const companies = [...byCompany.values()]
    .map((history) => {
      const sorted = [...history].sort((a, b) => b.at.getTime() - a.at.getTime())
      const [latest] = sorted

      return {
        kind: 'company' as const,
        name: latest.companyName,
        companyId: latest.companyId,
        lastChantier: { label: latest.chantierLabel, at: latest.at },
        interventions: sorted.length,
      }
    })
    .sort((a, b) => b.lastChantier.at.getTime() - a.lastChantier.at.getTime())

  const typed = [...manual]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((entry) => ({
      kind: 'manual' as const,
      name: entry.freeName,
      id: entry.id,
      phone: entry.phone,
      activityLabel: entry.activityLabel,
      note: entry.note,
    }))

  return [...companies, ...typed]
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
pnpm vitest run tests/domain/address-book.test.ts
```

Attendu : 7 tests verts.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/address-book.ts tests/domain/address-book.test.ts
git commit -m "feat: la fusion du carnet, les entreprises connues d'abord"
```

---

## Task 2 : Le schéma

**Files:**
- Create: `src/db/schema/address-book.ts`
- Modify: `src/db/schema/index.ts`

- [ ] **Step 1 : Écrire le schéma**

```typescript
// src/db/schema/address-book.ts
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { activity } from './verification'
import { requester } from './requester'

/**
 * Une entreprise que le demandeur a saisie lui-meme.
 *
 * Le couvreur de 2019, l'electricien du voisin — celles que l'outil ne connait
 * pas. **Sans elles le repertoire est incomplet, donc inutile, donc il ne
 * fidelise personne.**
 *
 * `address_book`, et non `directory` : M4 a livre l'annuaire public sous ce
 * nom. Deux objets qui partagent un nom dans une meme base de code, c'est ainsi
 * que la confusion commence — et celle-ci porterait sur la frontiere la plus
 * sensible du produit, entre ce qui est public et ce qui ne l'est pas.
 *
 * **Cette table appartient au demandeur.** Elle n'est jamais lue cote
 * entreprise, jamais agregee, jamais exportee. Aucune invitation n'en part.
 * Cette ligne doit rester ecrite, sinon quelqu'un lira un jour cette table
 * comme une permission.
 */
export const addressBookEntry = pgTable(
  'address_book_entry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => requester.id),
    freeName: text('free_name').notNull(),
    phone: text('phone'),
    /** Facultative : il sait souvent « le couvreur », pas la nomenclature. */
    activityCode: text('activity_code').references(() => activity.code),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('address_book_requester_idx').on(t.requesterId)],
)
```

Ajouter `export * from './address-book'` à `src/db/schema/index.ts`.

- [ ] **Step 2 : Générer et appliquer**

```bash
pnpm drizzle-kit generate && pnpm supabase db reset
```

- [ ] **Step 3 : Commit**

```bash
git add src/db/schema supabase/migrations
git commit -m "feat: le carnet d'adresses du demandeur, sa table a lui"
```

---

## Task 3 : Le carnet assemblé

**Files:**
- Create: `src/services/address-book.ts`
- Test: `tests/services/address-book.test.ts`

- [ ] **Step 1 : Écrire le service**

```typescript
// src/services/address-book.ts
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { activity, addressBookEntry, company, project, quote, signature } from '@/db/schema'
import {
  mergeAddressBook,
  type AddressBookEntry,
  type PastIntervention,
} from '@/domain/address-book'
import { companyCoverage } from '@/services/visibility'
import { companySlug } from '@/domain/slug'
import { recordEvent } from '@/services/events'

/** Ce qu'on ajoute a une entree d'entreprise : son etat de verification. */
export interface CoverageBadge {
  /** Les activites couvertes aujourd'hui, et elles seules. */
  covered: string[]
  /** Les activites declarees mais plus couvertes. C'est ce qu'il doit voir. */
  lapsed: string[]
  /** `null` si l'entreprise n'a plus de page publique. */
  passportPath: string | null
}

export type BookEntry = AddressBookEntry & { coverage?: CoverageBadge }

/**
 * Le carnet du demandeur : ce qu'il a vecu, et ce qu'il a saisi.
 *
 * **Le statut de verification est celui d'AUJOURD'HUI**, pas celui du chantier.
 * C'est ce qui fait vivre le label apres la vente : si la decennale d'une
 * entreprise a expire depuis, il le voit. Rien n'est stocke — un drapeau
 * mentirait des le lendemain de l'expiration.
 */
export async function addressBookFor(requesterId: string, now: Date): Promise<BookEntry[]> {
  const rows = await db
    .select({
      companyId: company.id,
      companyName: company.legalName,
      siret: company.siret,
      chantierLabel: project.label,
      at: quote.signedAt,
    })
    .from(signature)
    .innerJoin(quote, eq(quote.id, signature.quoteId))
    .innerJoin(project, eq(project.id, quote.projectId))
    .innerJoin(company, eq(company.id, quote.companyId))
    // La condition d'acces est portee par la requete, comme partout ailleurs.
    .where(eq(signature.requesterId, requesterId))

  const interventions: PastIntervention[] = rows
    .filter((row) => row.at !== null)
    .map((row) => ({
      companyId: row.companyId,
      companyName: row.companyName,
      chantierLabel: row.chantierLabel,
      at: row.at!,
    }))

  const typed = await db
    .select({
      id: addressBookEntry.id,
      freeName: addressBookEntry.freeName,
      phone: addressBookEntry.phone,
      activityLabel: activity.label,
      note: addressBookEntry.note,
      createdAt: addressBookEntry.createdAt,
    })
    .from(addressBookEntry)
    .leftJoin(activity, eq(activity.code, addressBookEntry.activityCode))
    .where(eq(addressBookEntry.requesterId, requesterId))

  const merged = mergeAddressBook(interventions, typed)
  const siretOf = new Map(rows.map((row) => [row.companyId, row.siret]))

  // Un appel par entreprise. Le carnet en compte quelques-unes : le jour ou il
  // en compterait des dizaines, ce serait un autre produit.
  return Promise.all(
    merged.map(async (entry) => {
      if (entry.kind !== 'company') return entry

      const coverage = await companyCoverage(entry.companyId, now)

      return {
        ...entry,
        coverage: {
          covered: coverage.activities.filter((a) => a.visible).map((a) => a.label),
          // Ce qu'il DOIT voir : taire une attestation expiree serait l'exact
          // contraire du service rendu.
          lapsed: coverage.activities.filter((a) => !a.visible).map((a) => a.label),
          passportPath: coverage.isPublic
            ? `/p/${companySlug(entry.name, siretOf.get(entry.companyId)!)}`
            : null,
        },
      }
    }),
  )
}

export const MAX_FREE_NAME_LENGTH = 120
export const MAX_NOTE_LENGTH = 300

/**
 * Ajoute une entreprise que nous ne connaissons pas.
 *
 * **Aucune invitation n'est envoyee.** On n'a qu'un seul premier contact avec
 * un artisan, et « votre client vous a ajoute a son repertoire » vaudra en P2,
 * accompagne d'une demande reelle. Le depenser ici pour proposer un logiciel de
 * devis, c'est griller le meilleur signal d'acquisition qui existe.
 */
export async function addManualEntry(input: {
  requesterId: string
  freeName: string
  phone: string
  activityCode: string | null
  note: string
}) {
  const freeName = input.freeName.trim()
  if (!freeName) throw new Error('Le nom est obligatoire')
  if (freeName.length > MAX_FREE_NAME_LENGTH) throw new Error('Ce nom est trop long')
  if (input.note.trim().length > MAX_NOTE_LENGTH) throw new Error('Cette note est trop longue')

  const [created] = await db
    .insert(addressBookEntry)
    .values({
      requesterId: input.requesterId,
      freeName,
      phone: input.phone.trim() || null,
      activityCode: input.activityCode,
      note: input.note.trim() || null,
    })
    .returning()

  // Le journal porte le FAIT, jamais ce qu'il a saisi : ni le nom, ni le
  // telephone d'un tiers qui n'a rien demande et qui ne peut pas s'y opposer.
  await recordEvent({
    type: 'address_book.entry_added',
    subjectType: 'requester',
    subjectId: input.requesterId,
    actorType: 'customer',
    actorId: input.requesterId,
    payload: { withPhone: Boolean(input.phone.trim()) },
  })

  return created
}

/** Une entree d'entreprise du carnet, pour sa fiche. Rendue au seul proprietaire. */
export async function bookedCompany(requesterId: string, companyId: string, now: Date) {
  const [found] = await db
    .select({ id: company.id, legalName: company.legalName, phone: company.phone })
    .from(signature)
    .innerJoin(quote, eq(quote.id, signature.quoteId))
    .innerJoin(company, eq(company.id, quote.companyId))
    .where(and(eq(signature.requesterId, requesterId), eq(quote.companyId, companyId)))
    .limit(1)

  if (!found) return null

  const book = await addressBookFor(requesterId, now)
  const entry = book.find((e) => e.kind === 'company' && e.companyId === companyId)

  return entry ? { ...entry, phone: found.phone } : null
}
```

- [ ] **Step 2 : Écrire les tests**

```typescript
// tests/services/address-book.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { event, insuranceCertificate, signature } from '@/db/schema'
import { addManualEntry, addressBookFor, bookedCompany } from '@/services/address-book'
import { requesterFromSignature } from '@/services/requesters'
import { createCompany, createProject, signedQuote } from './invoice-fixtures'

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

describe('le carnet du demandeur', () => {
  it('reunit les entreprises deja intervenues', async () => {
    const me = await someone()
    const plumber = await createCompany()
    await signFor(plumber, await createProject(plumber), me.id)

    const book = await addressBookFor(me.id, new Date())

    expect(book).toHaveLength(1)
    expect(book[0]).toMatchObject({ kind: 'company', interventions: 1 })
  })

  it('ne montre JAMAIS le carnet d un autre demandeur', async () => {
    const me = await someone()
    const other = await someone()
    const builder = await createCompany()
    await signFor(builder, await createProject(builder), other.id)
    await addManualEntry({
      requesterId: other.id,
      freeName: 'Couvreur du voisin',
      phone: '0556000000',
      activityCode: null,
      note: '',
    })

    expect(await addressBookFor(me.id, new Date())).toEqual([])
  })

  it('ajoute une entreprise que nous ne connaissons pas', async () => {
    const me = await someone()
    await addManualEntry({
      requesterId: me.id,
      freeName: 'Couvreur de 2019',
      phone: '0556000000',
      activityCode: null,
      note: 'Rapide et propre.',
    })

    const book = await addressBookFor(me.id, new Date())

    expect(book[0]).toMatchObject({ kind: 'manual', name: 'Couvreur de 2019' })
  })

  it('n ecrit NI le nom NI le telephone saisis au journal', async () => {
    // Un tiers qui n'a rien demande, et qui ne peut pas s'opposer a une ligne
    // dans un journal immuable.
    const me = await someone()
    await addManualEntry({
      requesterId: me.id,
      freeName: 'Temoin Zorglub',
      phone: '0790112233',
      activityCode: null,
      note: '',
    })

    const journal = await db.select().from(event).where(eq(event.subjectId, me.id))
    const dumped = JSON.stringify(journal)

    expect(journal.some((e) => e.type === 'address_book.entry_added')).toBe(true)
    expect(dumped).not.toContain('Temoin Zorglub')
    expect(dumped).not.toContain('0790112233')
  })

  it('montre l etat de verification d AUJOURD HUI', async () => {
    // Ce qui fait vivre le label apres la vente. Une entreprise sans
    // attestation valide apparait comme non couverte dans le carnet de ceux
    // qui l'ont employee.
    const me = await someone()
    const builder = await createCompany()
    await signFor(builder, await createProject(builder), me.id)

    const [entry] = await addressBookFor(me.id, new Date())

    expect(entry.kind).toBe('company')
    // Aucune activite declaree ni certifiee : rien n'est couvert, et rien
    // n'est promis.
    expect(entry.coverage?.covered).toEqual([])
    expect(entry.coverage?.passportPath).toBeNull()
  })

  it('REFUSE la fiche d une entreprise chez qui il n a rien signe', async () => {
    const me = await someone()
    const stranger = await createCompany()

    expect(await bookedCompany(me.id, stranger, new Date())).toBeNull()
  })
})

describe('aucune invitation', () => {
  it('n envoie AUCUN message a l entreprise saisie', async () => {
    // La decision la plus facile a eroder du jalon : elle ne coute rien a
    // trahir et se verrait six mois plus tard.
    const before = await mailCount()
    const me = await someone()

    await addManualEntry({
      requesterId: me.id,
      freeName: 'Couvreur de 2019',
      phone: '0556000000',
      activityCode: null,
      note: '',
    })

    expect(await mailCount()).toBe(before)
  })
})

/** Le collecteur local : rien ne part en developpement, tout s'y compte. */
async function mailCount(): Promise<number> {
  const response = await fetch('http://127.0.0.1:54324/api/v1/messages?limit=1')
  const { messages_count: count } = (await response.json()) as { messages_count: number }
  return count
}
```

> Si le collecteur ne rend pas `messages_count` sous ce nom, lire la forme réelle de sa réponse et adapter — **sans** remplacer l'assertion par un simple « la fonction ne lève pas », qui ne vérifierait rien.

- [ ] **Step 3 : Lancer les tests**

```bash
pnpm vitest run tests/services/address-book.test.ts
```

Attendu : 7 tests verts.

- [ ] **Step 4 : Vérifier que le test d'accès discrimine**

Retirer `eq(addressBookEntry.requesterId, requesterId)` de la seconde requête et relancer : « ne montre JAMAIS le carnet d un autre demandeur » **doit échouer**. Le remettre.

- [ ] **Step 5 : Commit**

```bash
git add src/services/address-book.ts tests/services/address-book.test.ts
git commit -m "feat: le carnet assemble, avec la verification d'aujourd'hui"
```

---

## Task 4 : La reprise de contact

**Files:**
- Modify: `src/services/contact.ts`
- Modify: `tests/services/contact.test.ts`

- [ ] **Step 1 : Étendre le relais**

Dans `ContactRequest`, ajouter :

```typescript
  /**
   * Le numero du devis deja signe chez cette entreprise, s'il y en a un.
   *
   * Ce n'est pas une decoration : il transforme un message froid en reprise de
   * relation, et il dit a l'artisan qu'il s'agit de son propre client — donc
   * du travail sans commission.
   */
  previousQuoteNumber?: string
```

Dans le corps du message, avant la ligne de réponse :

```typescript
      ...(request.previousQuoteNumber
        ? [`Vous avez déjà travaillé pour cette personne — devis ${request.previousQuoteNumber}.`, '']
        : []),
```

Et l'événement :

```typescript
  // Le fait, et rien d'autre. Le TYPE, lui, distingue l'acquisition de la
  // fidelisation : c'est la seule mesure que nous aurons de l'utilite du
  // repertoire.
  await recordEvent({
    type: request.previousQuoteNumber ? 'address_book.contact' : 'directory.contact',
    subjectType: 'company',
    subjectId: request.companyId,
    companyId: request.companyId,
    actorType: 'customer',
  })
```

- [ ] **Step 2 : Ajouter les tests**

Le fichier existant nomme sa requête `demande`, son entreprise `COMPANY`, et espionne l'envoi par `sendRawMail`. Ajouter, dans son style :

```typescript
describe('reprise de contact', () => {
  const sent = () => sendRawMail.mock.calls[0][0] as { text: string }

  it('dit a l entreprise qu il s agit de son propre client', async () => {
    await relayContact(
      { ...demande, ipHash: randomUUID(), previousQuoteNumber: 'D2026-0001' },
      new Date(),
    )

    expect(sent().text).toContain('Vous avez déjà travaillé pour cette personne')
    expect(sent().text).toContain('D2026-0001')
  })

  it('se distingue de la demande entrante dans le journal', async () => {
    // La seule mesure que nous aurons de l'utilite du repertoire : sans deux
    // types distincts, l'acquisition et la fidelisation se confondent.
    await relayContact(
      { ...demande, ipHash: randomUUID(), previousQuoteNumber: 'D2026-0001' },
      new Date(),
    )

    const journal = await db.select().from(event).where(eq(event.subjectId, COMPANY))
    expect(journal.some((e) => e.type === 'address_book.contact')).toBe(true)
  })

  it('n ecrit TOUJOURS rien de ce que le demandeur saisit', async () => {
    // La regle de M4 tient sans exception : il ne doit exister aucune base de
    // leads, et la reprise de contact n'en cree pas une.
    await relayContact(
      { ...demande, ipHash: randomUUID(), previousQuoteNumber: 'D2026-0001' },
      new Date(),
    )

    const dumped = JSON.stringify(
      await db.select().from(event).where(eq(event.subjectId, COMPANY)),
    )

    expect(dumped).not.toContain(demande.name)
    expect(dumped).not.toContain(demande.email)
    expect(dumped).not.toContain(demande.message)
  })
})
```

- [ ] **Step 3 : Lancer les tests**

```bash
pnpm vitest run tests/services/contact.test.ts
```

- [ ] **Step 4 : Commit**

```bash
git add src/services/contact.ts tests/services/contact.test.ts
git commit -m "feat: la reprise de contact, distinguee de la demande entrante"
```

---

## Task 5 : L'écran du répertoire

**Files:**
- Create: `src/app/(espace)/mon-repertoire/page.tsx`
- Create: `src/app/(espace)/mon-repertoire/AddEntryForm.tsx`
- Create: `src/app/(espace)/mon-repertoire/actions.ts`
- Modify: `src/app/(espace)/mes-logements/page.tsx`

- [ ] **Step 1 : L'action**

Sur le modèle de `declareReceptionAction` : `currentRequester()`, `try/catch` qui renvoie `{ error }`, `revalidatePath('/mon-repertoire')`.

- [ ] **Step 2 : L'écran**

`SpaceShell`, même redirection qu'aux autres écrans de l'espace. Deux sections.

**Les entreprises connues** — pour chacune :

| Ce qui s'affiche | D'où ça vient |
|---|---|
| Nom | `entry.name` |
| « Dernière intervention : {label}, {mois année} » | `lastChantier` |
| « {n} interventions » si n > 1 | `interventions` |
| **L'état de vérification** | `coverage` |
| Lien vers le passeport, s'il en a un | `coverage.passportPath` |
| Lien « Recontacter » vers la fiche | — |

L'état de vérification, en trois cas, et le troisième compte autant que les deux autres :

- `covered` non vide → « Assuré pour : {liste} »
- `covered` vide et `lapsed` non vide → **« Attestation expirée pour : {liste} »**, en `tone` d'alerte
- les deux vides → « Aucune activité déclarée » — l'entreprise n'a jamais rempli sa vérification, et le dire vaut mieux que laisser une case blanche

`data-testid="repertoire"` sur la liste.

**Les entreprises saisies** — nom, téléphone, activité, note. Et **une phrase qui dit ce que nous n'en savons pas** :

> « Vous avez ajouté cette entreprise vous-même. Nous ne l'avons pas vérifiée, et nous ne l'avons pas prévenue. »

Cette phrase n'est pas une précaution : sans elle, les deux sections se lisent comme une seule liste et la vérification semble s'étendre à tout le carnet.

**Le formulaire d'ajout** — `Field` + `Input` pour le nom et le téléphone, `Select` pour l'activité (facultative, alimentée par le référentiel), `Textarea` pour la note. `data-testid="nom-entreprise"`.

- [ ] **Step 3 : Le lien depuis l'index**

Une ligne sur `/mes-logements` : « Mon répertoire — les entreprises déjà intervenues chez vous. »

- [ ] **Step 4 : Vérifier à l'écran, puis les garde-fous**

```bash
pnpm validate
```

- [ ] **Step 5 : Commit**

```bash
git add "src/app/(espace)"
git commit -m "feat: l'ecran du repertoire, verification comprise"
```

---

## Task 6 : La fiche, et la reprise de contact

**Files:**
- Create: `src/app/(espace)/mon-repertoire/[companyId]/page.tsx`
- Create: `src/app/(espace)/mon-repertoire/[companyId]/ContactForm.tsx`
- Create: `src/app/(espace)/mon-repertoire/[companyId]/actions.ts`

- [ ] **Step 1 : L'action**

Sur le modèle de `src/app/artisan/[slug]/actions.ts` — **reprendre son `ipHash`**, sel compris, plutôt que d'en écrire un second : deux sels pour un même plafond rendraient le plafond contournable en changeant de page.

Elle diffère sur deux points :

- `currentRequester()` fournit le nom et l'adresse : **le demandeur ne les retape pas.**
- Elle joint `previousQuoteNumber`, le devis le plus récent signé chez cette entreprise.

- [ ] **Step 2 : La fiche**

`bookedCompany(requesterId, companyId, now)` puis `notFound()` si `null`. Contenu : le nom, l'état de vérification, **le téléphone de l'entreprise** — mention obligatoire de ses devis depuis M1, donc rien qu'il n'ait déjà —, le lien vers le passeport, et le formulaire.

Le texte au-dessus du formulaire dit ce qui se passe :

> « Votre message part directement à {nom}, qui répondra à votre adresse. **Nous n'en gardons aucune trace.** »

Ce n'est pas une formule : `relayContact` n'écrit rien, et c'est ce qui rend impossible — et non pas seulement interdite — la constitution d'une base de contacts.

- [ ] **Step 3 : Vérifier à l'écran**

Envoyer un message et le lire dans le collecteur local : il doit porter la mention du devis déjà signé.

- [ ] **Step 4 : Commit**

```bash
git add "src/app/(espace)/mon-repertoire"
git commit -m "feat: la fiche d'une entreprise du repertoire, et sa reprise de contact"
```

---

## Task 7 : Le parcours de bout en bout

**Files:**
- Modify: `tests/e2e/space-journey.spec.ts`

- [ ] **Step 1 : Étendre le parcours**

Après l'étape de réception :

```typescript
  await test.step('son répertoire retient l’entreprise, et son état de vérification', async () => {
    await page.goto('/mon-repertoire')

    await expect(page.getByTestId('repertoire')).toContainText('PLOMBERIE DU PARCOURS')
    await expect(page.getByTestId('repertoire')).toContainText('Remplacement chauffe-eau')
  })

  await test.step('il ajoute le couvreur que nous ne connaissons pas', async () => {
    await page.getByTestId('nom-entreprise').fill('Couvreur de 2019')
    await page.getByLabel('Téléphone').fill('0556000000')
    await page.getByRole('button', { name: 'Ajouter au répertoire' }).click()

    await expect(page.getByTestId('repertoire')).toContainText('Couvreur de 2019')
    // Ce que nous n'en savons pas est dit, sinon la verification semblerait
    // s'etendre a tout le carnet.
    await expect(page.getByText('Nous ne l’avons pas vérifiée')).toBeVisible()
  })

  await test.step('aucune invitation n’est partie', async () => {
    // La decision la plus facile a eroder du jalon.
    expect(await mailboxHas('Couvreur de 2019')).toBe(false)
  })

  await test.step('il recontacte l’entreprise, qui apprend que c’est son client', async () => {
    await page.getByRole('link', { name: 'Recontacter' }).first().click()
    await page.getByLabel('Votre message').fill('Bonjour, le chauffe-eau refait un bruit.')
    await page.getByRole('button', { name: 'Envoyer' }).click()

    const relayed = await contactMailFor('contact@parcours.local')
    expect(relayed).toContain('Vous avez déjà travaillé pour cette personne')
    expect(relayed).toContain('D2026-0001')
  })
```

- [ ] **Step 2 : Les helpers**

Ajouter à `tests/e2e/helpers.ts`, sur le modèle des existants :

```typescript
/**
 * Vrai si un message du collecteur porte ce texte dans son sujet.
 *
 * **Ne patiente pas**, contrairement a `waitForMail` : elle sert a verifier une
 * ABSENCE, et attendre dix secondes pour conclure qu'il n'y a rien allongerait
 * le parcours sans rien prouver de plus.
 */
export async function mailboxHas(needle: string): Promise<boolean> {
  const response = await fetch(`${MAILBOX}/api/v1/messages?limit=50`)
  const { messages = [] } = (await response.json()) as { messages?: MailSummary[] }
  return messages.some((mail) => mail.Subject.includes(needle))
}

/** La demande relayee a une entreprise. */
export async function contactMailFor(email: string): Promise<string> {
  return waitForMail(
    (mail) => mail.To.some((to) => to.Address === email) && /Demande reçue/.test(mail.Subject),
    `demande relayée à ${email}`,
  )
}
```

- [ ] **Step 3 : Lancer le parcours**

```bash
pkill -f "next dev"; pkill -f "next-server"; pnpm test:e2e
```

- [ ] **Step 4 : Vérification finale**

```bash
pnpm supabase db reset && pnpm validate && pnpm test:e2e
```

- [ ] **Step 5 : Commit**

```bash
git add tests/e2e
git commit -m "test: du repertoire a la reprise de contact"
```

---

## Vérification du jalon

| Exigence de la spec | Où elle est vérifiée |
|---|---|
| Les entreprises déjà intervenues, dédupliquées | Task 1, Task 3 |
| Leur état de vérification **actuel** | Task 3, Task 5 |
| L'ajout d'une entreprise absente | Task 3, Task 7 |
| **Aucune invitation** | Task 3, Task 7 |
| Le carnet n'est jamais lisible d'ailleurs | Task 3 — le test discriminant |
| Rien de saisi n'entre au journal | Task 3, Task 4 |
| La reprise de contact n'écrit rien | Task 4 |
| Elle se distingue de la demande entrante | Task 4 |

## Ce qui reste ouvert

- **Le carnet appelle `companyCoverage` une fois par entreprise.** Quelques-unes, aujourd'hui. Le jour où il en compterait des dizaines, ce serait un autre produit — mais la limite mérite d'être surveillée.
- **Une entreprise saisie à la main peut être un doublon** d'une entreprise connue, sans que nous puissions le savoir : nous n'avons qu'un nom libre. Rapprocher les deux supposerait de chercher dans l'annuaire depuis le carnet, ce qui est la découverte de P2.
- **Rien ne prévient le demandeur** quand l'attestation d'une entreprise de son répertoire expire. Il le voit s'il ouvre la page. Prévenir serait une relance, donc P3 — mais c'est aussi ce qui donnerait tout son sens à « le label vit après la vente ».

## M6 après ce plan

Les trois plans livrés, l'espace demandeur tient : compte à la signature, logements, dossier de chantier, garanties, répertoire, reprise de contact.

**Le second verrou de l'AIPD reste entier** — le recueil de l'avis des artisans, article 35.9 — et il le restera tant qu'aucun artisan ne sera inscrit. Aucune métrique ne peut être publiée avant.
