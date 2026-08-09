# M7·B — La synchronisation · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que les rendez-vous D'équerre apparaissent dans l'agenda que l'artisan consulte déjà, et que ses créneaux occupés apparaissent dans le nôtre — sans que nous détenions son agenda.

**Architecture:** Le flux iCalendar est une **fonction pure**. Les créneaux occupés sont lus **à chaque affichage**, jamais stockés, jamais mis en cache. Le seul secret conservé est un jeton de rafraîchissement, chiffré, et limité aux intervalles d'occupation.

**Tech Stack:** Identique. Aucune dépendance nouvelle — OAuth se fait en `fetch`, le chiffrement par `node:crypto`.

> **Contraintes de l'atelier.** 250 lignes par fichier, aucune fonctionnalité n'importe d'une autre, design system obligatoire.
>
> **Déviation de format, comme aux jalons précédents.** Les écrans dont la structure existe renvoient à leurs équivalents ; le code complet est donné là où la logique est neuve.
>
> **Conflit annoncé.** Une session parallèle réécrit `src/ui/organisms/app-header.tsx` pour donner sa navigation à l'espace artisan. Ce plan n'y touche pas.

**Références :** [spec M7 §3](../specs/2026-08-09-agenda-design.md) · [plan M7·A](2026-08-09-m7a-rendez-vous.md) · [AIPD](../rgpd/2026-08-08-aipd-passeport.md)

---

## Décisions verrouillées

**Le flux sortant marche chez les trois.** Une adresse d'abonnement iCalendar, propre à l'entreprise, révocable. C'est le seul mécanisme que Google, Apple et Outlook acceptent sans compte connecté — et il ne coûte qu'une route.

**L'import s'arrête où commence le secret large.** Google et Microsoft donnent un jeton limité aux **créneaux occupés**, révocable en un clic chez eux. Apple n'a aucun OAuth : il faudrait détenir un mot de passe d'application qui ouvre ses services iCloud. **L'écran le dit** plutôt que de laisser un bouton grisé.

**Rien de son agenda n'est conservé.** `freebusy.query` et `getSchedule` ne rendent **que des intervalles**, sans aucun titre : nous ne savons pas qu'il est chez le dentiste, nous savons qu'il est pris. Et ces intervalles ne sont ni stockés ni mis en cache.

**Une panne n'affiche jamais « libre ».** Elle affiche qu'on n'a pas pu lire. Le type l'impose — voir §*Ce qui rend la règle structurelle*.

**Le flux est borné dans le temps.** Un abonnement est re-téléchargé en entier, à répétition : trois mois en arrière, douze mois en avant.

---

## Ce qui rend la règle structurelle

La règle « une panne n'affiche jamais libre » n'est pas une consigne de revue. Elle est portée par le type, comme le couple taux-volume de M5 :

```typescript
export type BusyState =
  | { kind: 'connected'; intervals: BusyInterval[] }
  | { kind: 'unreadable' }
  | { kind: 'unlinked' }
```

**Aucun écran ne peut confondre « aucun créneau occupé » avec « nous n'avons pas pu demander ».** Un tableau vide et une panne sont deux valeurs différentes du même type ; le compilateur oblige à traiter les trois cas. Rendre `BusyInterval[]` et laisser `[]` signifier les deux aurait fait afficher « libre » au premier incident réseau — et l'artisan se serait doublé un rendez-vous.

---

## Ce que ce plan ne peut pas vérifier de bout en bout

Le va-et-vient OAuth demande un vrai compte Google ou Microsoft. **Aucun parcours automatisé ne peut le jouer**, et prétendre le contraire avec un serveur d'autorisation simulé ne prouverait que le simulateur.

Ce qui **est** vérifié : le flux iCalendar en entier, le chiffrement et sa détection d'altération, la lecture des créneaux à partir d'une réponse de fournisseur figée, la panne qui ne dit pas « libre », et les écrans. Ce qui reste manuel est listé en fin de plan, avec ce qu'il faut regarder.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/ics.ts` | Le flux iCalendar, échappement et pliage — **pur** |
| `src/domain/busy.ts` | `BusyState`, fusion des intervalles — **pur** |
| `src/lib/secrets.ts` | Chiffrement des jetons au repos |
| `src/db/schema/calendar.ts` | `calendar_connection` |
| `src/db/schema/company.ts` | *(modifié)* `agenda_feed_token` |
| `src/services/agenda-feed.ts` | Le flux d'une entreprise |
| `src/services/calendar-providers.ts` | Google et Microsoft : autorisation, jetons, créneaux |
| `src/services/calendar-links.ts` | Raccorder, révoquer, lire les créneaux |
| `src/app/abonnement/[token]/dequerre.ics/route.ts` | Le flux, servi |
| `src/app/(app)/agenda/synchronisation/**` | Les raccordements |
| `src/app/api/calendriers/[provider]/retour/route.ts` | Le retour d'autorisation |

---

## Task 1 : Le flux iCalendar

Fonction pure. C'est là que les flux se cassent en vrai : une virgule non échappée suffit.

**Files:**
- Create: `src/domain/ics.ts`
- Test: `tests/domain/ics.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/ics.test.ts
import { describe, it, expect } from 'vitest'
import { buildIcs, type FeedEvent } from '@/domain/ics'

const STAMP = new Date('2026-08-09T22:00:00Z')

const event = (overrides: Partial<FeedEvent> = {}): FeedEvent => ({
  id: 'a1b2c3',
  startsAt: new Date('2026-09-01T07:00:00Z'),
  endsAt: new Date('2026-09-01T08:00:00Z'),
  summary: 'Visite — Madame Rey',
  location: '8 rue Sainte-Catherine, 33000 Bordeaux',
  description: 'Remplacement chaudière',
  ...overrides,
})

const feed = (events: FeedEvent[]) =>
  buildIcs({ calendarName: 'D’équerre — PLOMBERIE DU PARCOURS', events, stampedAt: STAMP })

describe('l enveloppe', () => {
  it('ouvre et ferme un calendrier', () => {
    const ics = feed([])

    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('reste valide sans aucun rendez-vous', () => {
    // Une semaine vide ne doit pas produire un flux casse : le telephone de
    // l'artisan le retelecharge en boucle, et une erreur d'analyse le ferait
    // se desabonner sans rien dire.
    expect(feed([])).not.toContain('BEGIN:VEVENT')
  })

  it('separe ses lignes par CRLF, jamais par LF seul', () => {
    // RFC 5545. Certains clients refusent le flux entier sur ce seul point.
    const ics = feed([event()])

    expect(ics.split('\n').every((line) => line === '' || line.endsWith('\r'))).toBe(true)
  })
})

describe('un rendez-vous', () => {
  it('porte un identifiant stable', () => {
    // Sans UID stable, chaque rafraichissement creerait des doublons au lieu
    // de mettre a jour.
    expect(feed([event({ id: 'rdv-42' })])).toContain('UID:rdv-42@dequerre')
  })

  it('date en UTC, suffixe Z', () => {
    const ics = feed([event()])

    expect(ics).toContain('DTSTART:20260901T070000Z')
    expect(ics).toContain('DTEND:20260901T080000Z')
  })

  it('ECHAPPE les virgules de l adresse', () => {
    // Nos adresses en contiennent toujours : « 8 rue X, 33000 Bordeaux ». Une
    // virgule nue coupe la valeur, et l'evenement arrive sans ville.
    expect(feed([event()])).toContain(
      'LOCATION:8 rue Sainte-Catherine\\, 33000 Bordeaux',
    )
  })

  it('echappe aussi les points-virgules et les barres obliques inverses', () => {
    const ics = feed([event({ description: 'a;b\\c' })])

    expect(ics).toContain('DESCRIPTION:a\\;b\\\\c')
  })

  it('remplace un retour a la ligne par sa sequence', () => {
    const ics = feed([event({ description: 'Chaudière\n0612345678' })])

    expect(ics).toContain('DESCRIPTION:Chaudière\\n0612345678')
  })

  it('plie les lignes trop longues', () => {
    // RFC 5545 : 75 octets. Un client strict rejette une ligne plus longue.
    const ics = feed([event({ summary: 'x'.repeat(200) })])
    const lines = ics.split('\r\n')

    expect(lines.every((line) => Buffer.byteLength(line, 'utf8') <= 75)).toBe(true)
    // Une ligne pliee reprend par une espace, et rien d'autre.
    expect(lines.some((line) => line.startsWith(' x'))).toBe(true)
  })

  it('ne coupe pas un caractere accentue en deux', () => {
    // Le pliage compte des OCTETS, pas des caracteres : couper « è » au milieu
    // produit deux octets invalides et un flux illisible.
    const ics = feed([event({ summary: `${'é'.repeat(80)}` })])

    expect(() => Buffer.from(ics, 'utf8').toString('utf8')).not.toThrow()
    expect(ics).not.toContain('�')
  })
})

describe('le nom du calendrier', () => {
  it('apparait pour que l abonne sache d ou vient le flux', () => {
    expect(feed([])).toContain('X-WR-CALNAME:D’équerre — PLOMBERIE DU PARCOURS')
  })
})
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

```bash
pnpm vitest run tests/domain/ics.test.ts
```

- [ ] **Step 3 : Écrire l'implémentation**

```typescript
// src/domain/ics.ts

/**
 * Le flux iCalendar de l'agenda — RFC 5545.
 *
 * C'est le seul mecanisme de synchronisation que Google, Apple et Outlook
 * acceptent tous les trois sans compte connecte. Il est donc **la condition de
 * survie du jalon** : un agenda qui ne rejoint pas le telephone de l'artisan
 * est un deuxieme agenda, et un deuxieme agenda perd toujours.
 *
 * Rien ici n'est cosmetique. Une virgule non echappee coupe la valeur et
 * l'evenement arrive sans ville ; une ligne trop longue fait rejeter le flux
 * entier par un client strict ; un saut de ligne en LF seul aussi.
 */
export interface FeedEvent {
  id: string
  startsAt: Date
  endsAt: Date
  summary: string
  location: string
  description: string
}

const CRLF = '\r\n'

/** RFC 5545 §3.3.11 : la barre oblique inverse d'abord, sinon on echappe deux fois. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function stamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
}

/**
 * Plie a 75 OCTETS, en respectant les frontieres de caracteres.
 *
 * Compter les caracteres laisserait passer une ligne de 75 lettres accentuees,
 * soit 150 octets ; couper aveuglement a l'octet 75 casserait un « è » en deux
 * et rendrait le flux illisible.
 */
function fold(line: string): string {
  const parts: string[] = []
  let current = ''
  let bytes = 0
  // La continuation commence par une espace, qui compte dans la limite.
  let limit = 75

  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8')

    if (bytes + size > limit) {
      parts.push(current)
      current = ''
      bytes = 1
      limit = 75
    }

    current += char
    bytes += size
  }

  parts.push(current)

  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join(CRLF)
}

export function buildIcs(input: {
  calendarName: string
  events: FeedEvent[]
  stampedAt: Date
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//D’équerre//Agenda//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(input.calendarName)}`,
  ]

  for (const event of input.events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@dequerre`,
      `DTSTAMP:${stamp(input.stampedAt)}`,
      `DTSTART:${stamp(event.startsAt)}`,
      `DTEND:${stamp(event.endsAt)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `LOCATION:${escapeText(event.location)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  return lines.map(fold).join(CRLF) + CRLF
}
```

> **Le pliage s'applique à `X-WR-CALNAME` comme au reste** : un nom d'entreprise long est un cas ordinaire, pas une curiosité.

- [ ] **Step 4 : Lancer les tests**

```bash
pnpm vitest run tests/domain/ics.test.ts
```

Attendu : 11 tests verts.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/ics.ts tests/domain/ics.test.ts
git commit -m "feat: le flux iCalendar, echappe et plie comme la RFC l'exige"
```

---

## Task 2 : L'abonnement, servi

**Files:**
- Modify: `src/db/schema/company.ts`
- Create: `src/services/agenda-feed.ts`
- Create: `src/app/abonnement/[token]/dequerre.ics/route.ts`
- Test: `tests/services/agenda-feed.test.ts`

- [ ] **Step 1 : Le jeton**

Ajouter à `company` :

```typescript
  /**
   * L'adresse d'abonnement iCalendar. `null` tant qu'elle n'a pas ete demandee.
   *
   * **Ce jeton EST l'autorisation** — il n'y a pas de session derriere une
   * adresse collee dans Google. Il doit donc pouvoir etre regenere, ce qui
   * revoque l'ancienne.
   */
  agendaFeedToken: text('agenda_feed_token').unique(),
```

Puis `pnpm db:generate && pnpm db:reset`. Le fichier généré est un `0015_*` — **ne pas le renommer**.

- [ ] **Step 2 : Le service**

```typescript
// src/services/agenda-feed.ts
import { randomBytes } from 'node:crypto'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointment, company, customer, project, property } from '@/db/schema'
import { buildIcs, type FeedEvent } from '@/domain/ics'

/**
 * Trois mois en arriere, douze en avant.
 *
 * Un abonnement est re-telecharge EN ENTIER, a repetition : un flux non borne
 * grossirait sans fin et le telephone de l'artisan le rechargerait chaque
 * heure.
 */
const PAST_MONTHS = 3
const AHEAD_MONTHS = 12

/** Cree l'adresse d'abonnement si elle n'existe pas, et la rend. */
export async function agendaFeedToken(companyId: string): Promise<string> {
  const [found] = await db
    .select({ token: company.agendaFeedToken })
    .from(company)
    .where(eq(company.id, companyId))

  if (found?.token) return found.token

  const token = randomBytes(24).toString('base64url')
  await db.update(company).set({ agendaFeedToken: token }).where(eq(company.id, companyId))

  return token
}

/** Regenere l'adresse : l'ancienne cesse aussitot de repondre. */
export async function revokeAgendaFeed(companyId: string): Promise<string> {
  const token = randomBytes(24).toString('base64url')
  await db.update(company).set({ agendaFeedToken: token }).where(eq(company.id, companyId))

  return token
}

/**
 * Le flux d'une entreprise, depuis son jeton. `null` si le jeton est inconnu.
 *
 * Le jeton fait office d'autorisation : il n'y a pas de session derriere une
 * adresse collee dans Google.
 */
export async function agendaFeed(token: string, now: Date): Promise<string | null> {
  const [owner] = await db
    .select({ id: company.id, legalName: company.legalName })
    .from(company)
    .where(eq(company.agendaFeedToken, token))

  if (!owner) return null

  const from = new Date(now)
  from.setMonth(from.getMonth() - PAST_MONTHS)
  const to = new Date(now)
  to.setMonth(to.getMonth() + AHEAD_MONTHS)

  const rows = await db
    .select({
      id: appointment.id,
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
        eq(appointment.companyId, owner.id),
        // Les rendez-vous annules sont OMIS : le flux est republie en entier a
        // chaque lecture, et l'omission suffit a les faire disparaitre.
        eq(appointment.status, 'scheduled'),
        gte(appointment.startsAt, from),
        lte(appointment.startsAt, to),
      ),
    )

  const events: FeedEvent[] = rows.map((row) => ({
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    summary: `${row.kind === 'visit' ? 'Visite' : 'Intervention'} — ${row.customerName}`,
    location: `${row.addressLine1}, ${row.postalCode} ${row.city}`,
    description: [row.projectLabel, row.customerPhone, row.note].filter(Boolean).join('\n'),
  }))

  return buildIcs({
    calendarName: `D’équerre — ${owner.legalName}`,
    events,
    stampedAt: now,
  })
}
```

- [ ] **Step 3 : La route**

```typescript
// src/app/abonnement/[token]/dequerre.ics/route.ts
import { agendaFeed } from '@/services/agenda-feed'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Le flux, servi a qui detient l'adresse.
 *
 * `no-store` : un agenda mis en cache par un intermediaire montrerait un
 * rendez-vous annule a un artisan qui l'a annule.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const feed = await agendaFeed(token, new Date())

  if (!feed) return new Response('Introuvable', { status: 404 })

  return new Response(feed, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
```

- [ ] **Step 4 : Écrire les tests**

Cas à couvrir, en réutilisant `createCompany` / `createProject` et `bookAppointment` :

```typescript
it('rend le flux de CETTE entreprise, et d aucune autre', ...)   // le test discriminant
it('rend null sur un jeton inconnu', ...)
it('omet les rendez-vous annules', ...)
it('omet ce qui est hors de la fenetre', ...)
it('regenerer l adresse fait taire l ancienne', ...)
it('porte l adresse et le telephone du client', ...)
```

Le premier en toutes lettres — c'est celui qui protège le plus :

```typescript
it('rend le flux de CETTE entreprise, et d aucune autre', async () => {
  const mine = await createCompany()
  const rival = await createCompany()
  await bookAppointment({
    companyId: mine,
    projectId: await createProject(mine),
    kind: 'visit',
    startsAt: new Date('2026-09-01T08:00:00Z'),
    endsAt: new Date('2026-09-01T09:00:00Z'),
    note: '',
  })
  const hidden = await bookAppointment({
    companyId: rival,
    projectId: await createProject(rival),
    kind: 'visit',
    startsAt: new Date('2026-09-01T08:00:00Z'),
    endsAt: new Date('2026-09-01T09:00:00Z'),
    note: 'secret du voisin',
  })

  const feed = await agendaFeed(await agendaFeedToken(mine), new Date('2026-09-01T00:00:00Z'))

  expect(feed).toContain('BEGIN:VEVENT')
  expect(feed).not.toContain(hidden.id)
  expect(feed).not.toContain('secret du voisin')
})
```

- [ ] **Step 5 : Lancer, puis vérifier que le filtre discrimine**

```bash
pnpm vitest run tests/services/agenda-feed.test.ts
```

Retirer `eq(appointment.companyId, owner.id)` et relancer : le premier test **doit échouer**. Le remettre.

- [ ] **Step 6 : Commit**

```bash
git add src/db/schema src/services/agenda-feed.ts src/app/abonnement supabase/migrations tests/
git commit -m "feat: l'abonnement iCalendar, revocable et borne dans le temps"
```

---

## Task 3 : Le chiffrement des secrets

**Files:**
- Create: `src/lib/secrets.ts`
- Modify: `.env.example`, `scripts/check-environment.mjs`
- Test: `tests/lib/secrets.test.ts`

- [ ] **Step 1 : Écrire les tests**

```typescript
// tests/lib/secrets.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { decryptSecret, encryptSecret } from '@/lib/secrets'

beforeAll(() => {
  process.env.SECRET_KEY = Buffer.alloc(32, 7).toString('base64')
})

describe('chiffrement au repos', () => {
  it('rend le secret d origine', () => {
    expect(decryptSecret(encryptSecret('jeton-de-rafraichissement'))).toBe(
      'jeton-de-rafraichissement',
    )
  })

  it('ne laisse RIEN du secret en clair', () => {
    expect(encryptSecret('jeton-de-rafraichissement')).not.toContain('jeton')
  })

  it('produit un chiffre different a chaque appel', () => {
    // Un vecteur d'initialisation fixe laisserait voir que deux entreprises
    // ont le meme jeton, ou qu'un jeton n'a pas change.
    expect(encryptSecret('meme-valeur')).not.toBe(encryptSecret('meme-valeur'))
  })

  it('REFUSE un chiffre altere', () => {
    // GCM authentifie : sans cela, un octet modifie en base rendrait un jeton
    // silencieusement faux, et l'echec arriverait chez Google.
    const sealed = encryptSecret('jeton')
    const tampered = `${sealed.slice(0, -2)}${sealed.slice(-2) === 'AA' ? 'BB' : 'AA'}`

    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('refuse bruyamment une cle absente', () => {
    // Se rabattre sur du clair serait la pire panne possible : silencieuse.
    const key = process.env.SECRET_KEY
    delete process.env.SECRET_KEY

    expect(() => encryptSecret('jeton')).toThrow(/SECRET_KEY/)

    process.env.SECRET_KEY = key
  })
})
```

- [ ] **Step 2 : Écrire l'implémentation**

`AES-256-GCM` par `node:crypto`. Format stocké : `iv.tag.chiffre`, en base64url, séparés par des points. La clé vient de `SECRET_KEY`, base64 de 32 octets, **absente du dépôt**.

- [ ] **Step 3 : Le contrat d'environnement**

Ajouter à `.env.example` :

```
# Cle de chiffrement des secrets au repos — 32 octets en base64.
# `openssl rand -base64 32`. Jamais dans le depot, jamais partagee entre
# environnements : une cle qui fuit rend lisibles tous les jetons stockes.
SECRET_KEY=
```

**Ne pas l'ajouter à `REQUIRED` de `check:env`** : les tests et le build n'en ont besoin que si un raccordement existe, et l'exiger casserait tout worktree qui ne s'en sert pas. Le manque se signale à l'usage, bruyamment.

- [ ] **Step 4 : Lancer les tests, puis commit**

```bash
pnpm vitest run tests/lib/secrets.test.ts
```

```bash
git add src/lib/secrets.ts tests/lib/secrets.test.ts .env.example
git commit -m "feat: le chiffrement des secrets au repos, qui refuse une cle absente"
```

---

## Task 4 : Le schéma des raccordements

**Files:**
- Create: `src/db/schema/calendar.ts`
- Modify: `src/db/schema/index.ts`

```typescript
/**
 * Un agenda externe raccorde.
 *
 * **Le seul secret que le produit conserve**, et il est volontairement le plus
 * etroit possible : `calendar.freebusy` chez Google, `Calendars.ReadBasic` chez
 * Microsoft. Ces portees ne rendent que des INTERVALLES d'occupation, sans
 * aucun titre — nous ne savons pas qu'il est chez le dentiste, nous savons
 * qu'il est pris.
 *
 * Apple n'y figure pas : son seul acces est CalDAV avec un mot de passe
 * d'application qui ouvre ses services iCloud. Ce serait un secret d'une autre
 * nature, et l'ecran dit pourquoi il n'est pas propose.
 *
 * `revoked_at` plutot qu'une suppression : savoir qu'un raccordement a existe
 * et a ete retire vaut mieux que de ne rien savoir.
 */
export const calendarConnection = pgTable(
  'calendar_connection',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().references(() => company.id),
    provider: text('provider', { enum: ['google', 'microsoft'] }).notNull(),
    /** Pour qu'il sache QUEL compte est raccorde. */
    accountEmail: text('account_email').notNull(),
    /** Chiffre au repos — voir `src/lib/secrets.ts`. */
    refreshTokenEnc: text('refresh_token_enc').notNull(),
    connectedAt: timestamp('connected_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [unique('calendar_connection_uq').on(t.companyId, t.provider)],
)
```

```bash
pnpm db:generate && pnpm db:reset
git add src/db/schema supabase/migrations
git commit -m "feat: le schema des agendas raccordes, un secret etroit et revocable"
```

---

## Task 5 : Les deux fournisseurs

**Files:**
- Create: `src/services/calendar-providers.ts`
- Test: `tests/services/calendar-providers.test.ts`

- [ ] **Step 1 : Le descripteur**

Un objet par fournisseur, même forme, pour que l'appelant n'ait à connaître ni Google ni Microsoft :

```typescript
export interface CalendarProvider {
  id: 'google' | 'microsoft'
  label: string
  authorizeUrl(input: { redirectUri: string; state: string }): string
  exchange(input: { code: string; redirectUri: string }): Promise<{
    refreshToken: string
    accountEmail: string
  }>
  accessToken(refreshToken: string): Promise<string>
  busy(input: { accessToken: string; from: Date; to: Date }): Promise<BusyInterval[]>
}
```

**Google** — autorisation sur `https://accounts.google.com/o/oauth2/v2/auth`, portée `https://www.googleapis.com/auth/calendar.freebusy openid email`, avec `access_type=offline` et `prompt=consent` : sans les deux, **aucun jeton de rafraîchissement n'est rendu à la seconde autorisation**, et le raccordement se coupe silencieusement au bout d'une heure. Créneaux par `POST https://www.googleapis.com/calendar/v3/freeBusy`.

**Microsoft** — autorisation sur `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`, portées `Calendars.ReadBasic offline_access User.Read` — `offline_access` est ce qui donne le jeton de rafraîchissement. Créneaux par `POST https://graph.microsoft.com/v1.0/me/calendar/getSchedule`.

- [ ] **Step 2 : Les tests**

Ils portent sur ce qui est vérifiable sans compte réel : **la forme des adresses d'autorisation** et **la lecture d'une réponse figée**.

```typescript
describe('l autorisation Google', () => {
  it('demande la portee la PLUS ETROITE', () => {
    // `calendar.readonly` donnerait les titres des evenements. Nous n'en
    // voulons pas : la portee est ce qui rend la promesse verifiable.
    const url = google.authorizeUrl({ redirectUri: 'https://x/retour', state: 'abc' })

    expect(url).toContain('calendar.freebusy')
    expect(url).not.toContain('calendar.readonly')
  })

  it('demande un jeton de rafraichissement', () => {
    // Sans `access_type=offline` ET `prompt=consent`, la seconde autorisation
    // ne rend aucun jeton de rafraichissement, et le raccordement se coupe
    // silencieusement au bout d'une heure.
    const url = google.authorizeUrl({ redirectUri: 'https://x/retour', state: 'abc' })

    expect(url).toContain('access_type=offline')
    expect(url).toContain('prompt=consent')
  })
})

describe('la lecture des creneaux', () => {
  it('rend des intervalles, et rien d autre', () => {
    // La reponse de Google ne contient aucun titre : c'est l'API qui garantit
    // la promesse, pas notre discretion.
    expect(
      parseGoogleBusy({ calendars: { primary: { busy: [{ start: '...', end: '...' }] } } }),
    ).toEqual([{ from: new Date('...'), to: new Date('...') }])
  })

  it('rend un tableau vide quand rien n occupe la periode', ...)
  it('remonte une erreur du fournisseur plutot que de rendre vide', ...)
})
```

> Le dernier compte plus que les autres : rendre `[]` sur une erreur ferait afficher « libre ». La fonction **lève**, et l'appelant traduit en `unreadable`.

- [ ] **Step 3 : Lancer les tests, puis commit**

```bash
git add src/services/calendar-providers.ts tests/services/calendar-providers.test.ts
git commit -m "feat: Google et Microsoft, sur la portee la plus etroite"
```

---

## Task 6 : Les créneaux occupés, jamais stockés

**Files:**
- Create: `src/domain/busy.ts`
- Create: `src/services/calendar-links.ts`
- Test: `tests/domain/busy.test.ts`, `tests/services/calendar-links.test.ts`

- [ ] **Step 1 : Le type qui porte la règle**

```typescript
// src/domain/busy.ts

export interface BusyInterval {
  from: Date
  to: Date
}

/**
 * L'etat de l'agenda externe, en TROIS valeurs distinctes.
 *
 * `unreadable` n'est pas `connected` avec un tableau vide, et ce n'est pas un
 * detail de style : rendre `BusyInterval[]` et laisser `[]` signifier les deux
 * ferait afficher « libre » au premier incident reseau, et l'artisan se
 * doublerait un rendez-vous.
 *
 * Le compilateur oblige a traiter les trois cas. C'est la meme discipline que
 * le couple taux-volume de M5 : la regle est portee par le type, pas par la
 * revue.
 */
export type BusyState =
  | { kind: 'connected'; intervals: BusyInterval[] }
  | { kind: 'unreadable' }
  | { kind: 'unlinked' }

/** Fusionne les intervalles qui se touchent ou se chevauchent. */
export function mergeBusy(intervals: BusyInterval[]): BusyInterval[]
```

Tests : fusion de deux intervalles adjacents, de deux qui se chevauchent, préservation de deux disjoints, tri.

- [ ] **Step 2 : Le service**

`busyFor(companyId, from, to)` :

1. Aucun raccordement actif → `{ kind: 'unlinked' }`
2. Déchiffre le jeton, demande un jeton d'accès, lit les créneaux → `{ kind: 'connected', intervals }`
3. **Toute erreur** → `{ kind: 'unreadable' }`, et l'erreur est journalisée côté serveur

> **Rien n'est écrit.** Ni les intervalles, ni un cache, ni un horodatage de dernière lecture. Un test le vérifie en comparant le contenu des tables avant et après.

`linkCalendar` et `unlinkCalendar` complètent : la première chiffre et enregistre, la seconde pose `revoked_at`.

- [ ] **Step 3 : Le test qui compte**

```typescript
it('n ecrit RIEN de l agenda de l artisan', async () => {
  // La promesse du jalon : nous ne detenons pas son agenda. Elle se verifie
  // en regardant la base, pas en la relisant dans une note de conception.
  const before = await tableCounts()

  await busyFor(companyId, from, to)

  expect(await tableCounts()).toEqual(before)
})

it('rend `unreadable`, jamais `connected` avec un tableau vide, quand l appel echoue', ...)
```

- [ ] **Step 4 : Commit**

```bash
git add src/domain/busy.ts src/services/calendar-links.ts tests/
git commit -m "feat: les creneaux occupes, lus a chaque fois et jamais conserves"
```

---

## Task 7 : L'écran des raccordements

**Files:**
- Create: `src/app/(app)/agenda/synchronisation/page.tsx`
- Create: `src/app/(app)/agenda/synchronisation/actions.ts`
- Create: `src/app/api/calendriers/[provider]/retour/route.ts`

- [ ] **Step 1 : L'écran**

Trois blocs, et le troisième est celui qu'on est tenté d'omettre.

**L'abonnement** — l'adresse, un bouton pour la copier, et ce qu'elle contient, dit en clair :

> « Cette adresse donne accès à vos rendez-vous : nom du client, adresse et téléphone. La coller dans Google ou Apple, c'est leur confier ces informations. **Toute personne qui l'obtient voit votre agenda** — régénérez-la si vous l'avez partagée par erreur. »

Ce n'est pas une précaution : le jeton **est** l'autorisation, et l'artisan doit savoir ce qu'il déplace.

**Les raccordements** — Google et Microsoft, chacun avec son état : raccordé à telle adresse depuis telle date, ou un bouton pour raccorder. Et ce qu'on lit :

> « Nous lisons uniquement vos **créneaux occupés** — jamais le titre de vos rendez-vous. »

**Apple** — présent, expliqué, non proposé :

> « Apple ne permet pas de connecter un agenda de cette façon : il faudrait conserver un mot de passe qui ouvre l'ensemble de vos services iCloud, et nous ne le ferons pas. **L'abonnement ci-dessus fonctionne**, lui, dans l'application Calendrier d'Apple. »

Un bouton grisé sans explication passerait pour une fonctionnalité en retard ; c'est une décision.

- [ ] **Step 2 : Le retour d'autorisation**

`/api/calendriers/[provider]/retour` :

1. Compare l'état reçu au nonce déposé en cookie `httpOnly` — sinon un tiers ferait raccorder son agenda au compte de l'artisan.
2. Échange le code, chiffre le jeton, enregistre.
3. Redirige vers `/agenda/synchronisation`.

Fournisseur inconnu, état absent, échec d'échange : **retour à l'écran avec un message**, jamais une trace de pile.

- [ ] **Step 3 : Vérifier à l'écran**

Sans identifiants configurés, l'écran doit rester lisible et dire que le raccordement n'est pas disponible — pas planter.

- [ ] **Step 4 : Commit**

```bash
git add "src/app/(app)/agenda/synchronisation" src/app/api/calendriers
git commit -m "feat: l'ecran des raccordements, Apple explique plutot que grise"
```

---

## Task 8 : Les créneaux occupés dans la semaine

**Files:**
- Modify: `src/app/(app)/agenda/page.tsx`
- Create: `src/app/(app)/agenda/BusyNotice.tsx`

- [ ] **Step 1 : Afficher les trois états**

Sous chaque jour, une ligne discrète :

| État | Ce qui s'affiche |
|---|---|
| `connected` avec intervalles | « Occupé ailleurs : 14 h – 16 h » |
| `connected` sans intervalle | Rien — la journée est libre, et on le sait |
| `unreadable` | **« Vos disponibilités n'ont pas pu être lues. »** |
| `unlinked` | Rien, mais un lien discret vers la synchronisation |

> **Le troisième cas est le seul qui compte vraiment.** Afficher « libre » faute de réponse ferait poser un rendez-vous par-dessus un autre — et l'artisan cesserait de faire confiance à l'écran, ce qui est pire que l'oubli lui-même.

`data-testid="occupation"` sur la ligne.

- [ ] **Step 2 : Les garde-fous**

```bash
pnpm validate
```

- [ ] **Step 3 : Commit**

```bash
git add "src/app/(app)/agenda"
git commit -m "feat: les creneaux occupes dans la semaine, et la panne qui le dit"
```

---

## Task 9 : Le parcours de bout en bout

**Files:**
- Modify: `tests/e2e/agenda-journey.spec.ts`

- [ ] **Step 1 : Étendre le parcours**

Après l'étape de la semaine :

```typescript
await test.step('il obtient son adresse d’abonnement, et sait ce qu’elle contient', async () => {
  await page.goto('/agenda/synchronisation')

  await expect(page.getByTestId('abonnement')).toContainText('/abonnement/')
  await expect(page.getByText('Toute personne qui l’obtient voit votre agenda')).toBeVisible()
})

await test.step('Apple est expliqué, pas grisé', async () => {
  // Une decision, pas une fonctionnalite en retard.
  await expect(page.getByText('nous ne le ferons pas')).toBeVisible()
})

await test.step('le flux est un calendrier valide, et porte son rendez-vous', async () => {
  const href = await page.getByTestId('abonnement').innerText()
  const feed = await page.request.get(href.trim())

  expect(feed.headers()['content-type']).toContain('text/calendar')
  const body = await feed.text()
  expect(body).toContain('BEGIN:VCALENDAR')
  expect(body).toContain('Madame Rey')
  // L'adresse contient une virgule : non echappee, la ville disparaitrait.
  expect(body).toContain('Sainte-Catherine\\,')
})

await test.step('régénérer l’adresse fait taire l’ancienne', async () => {
  const href = (await page.getByTestId('abonnement').innerText()).trim()
  await page.getByRole('button', { name: 'Régénérer l’adresse' }).click()

  expect((await page.request.get(href)).status()).toBe(404)
})
```

- [ ] **Step 2 : Lancer, puis vérification finale**

```bash
pnpm validate && pnpm test:e2e
```

- [ ] **Step 3 : Commit**

```bash
git add tests/e2e/agenda-journey.spec.ts
git commit -m "test: de l'abonnement au flux servi"
```

---

## Vérification du jalon

| Exigence de la spec | Où elle est vérifiée |
|---|---|
| Le flux marche chez les trois | Task 1, Task 9 — format et échappement |
| Il est révocable | Task 2, Task 9 |
| Il est borné dans le temps | Task 2 |
| Une entreprise ne voit que ses rendez-vous | Task 2 — le test discriminant |
| La portée est la plus étroite possible | Task 5 |
| Rien de son agenda n'est conservé | Task 6 — comptage des tables |
| Une panne n'affiche jamais « libre » | Task 6, Task 8 |
| Apple est expliqué | Task 7, Task 9 |

## Ce qui reste à vérifier à la main

Le va-et-vient OAuth ne peut pas être automatisé. À faire une fois, avec un vrai compte, avant toute mise en ligne :

1. Raccorder un compte Google, **fermer la session, revenir le lendemain** : le jeton de rafraîchissement doit encore fonctionner. C'est le défaut que `access_type=offline` sans `prompt=consent` produit, et il ne se voit pas le premier jour.
2. Vérifier dans le compte Google que la permission listée est bien **« Voir votre disponibilité »**, et non « Voir vos agendas ».
3. Révoquer depuis Google, puis recharger l'agenda : l'écran doit dire **« n'ont pas pu être lues »**, pas « libre ».
4. Coller l'adresse d'abonnement dans l'application Calendrier d'Apple, sur iPhone.

## Ce qui reste ouvert

- **La vérification Google** est un chantier administratif de plusieurs semaines, à lancer bien avant la mise en ligne publique. Sans elle, seuls des comptes de test peuvent raccorder.
- **La rotation de `SECRET_KEY`** n'est pas conçue. Elle suppose de rechiffrer les jetons existants, donc de savoir avec quelle clé chacun l'a été.
- **Aucune écriture dans son agenda externe.** Le flux est sortant et en lecture seule ; écrire chez Google supposerait la portée large que ce plan refuse.
