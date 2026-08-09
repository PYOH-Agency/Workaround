# M6·A — Le compte et la session à deux publics · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la signature d'un devis crée un compte au client — sans rien changer à l'acte de signer — et que ce client, en se connectant, arrive chez lui et non sur le formulaire SIRET de l'artisan.

**Architecture:** L'orientation après connexion est une **fonction pure**, comme `resolveCompany`. Le rattachement se pose sur la **signature**, pas sur le client de l'entreprise : c'est un acte de la personne, pas une saisie de l'artisan. La liste des logements est **dérivée** des devis signés, jamais stockée.

**Tech Stack:** Identique. Aucune dépendance nouvelle.

> **Contraintes de l'atelier.** 250 lignes par fichier, aucune fonctionnalité n'importe d'une autre, design system obligatoire.
>
> **Déviation de format, comme aux jalons précédents.** Les écrans dont la structure existe renvoient à leurs équivalents ; le code complet est donné là où la logique est neuve.

**Références :** [spec M6](../specs/2026-08-09-espace-demandeur-design.md) · [spec P1 §10](2026-08-07-socle-artisan-design.md) · [AIPD §5.1](../rgpd/2026-08-08-aipd-passeport.md)

---

## Décisions verrouillées

**La signature ne change pas.** Aucun champ, aucune case, aucune étape. Le compte naît de l'acte sans le conditionner : le taux de signature alimente le passeport, les métriques et le label, et le dégrader pour servir un espace que personne ne réclame encore serait un mauvais échange. Seule une phrase s'ajoute à l'écran — celle qu'exige l'AIPD.

**Le rattachement se pose sur le signataire.** `customer.email` est ce que l'artisan a saisi ; `signature.signerEmail` est ce que la personne a fourni en s'engageant. **Mes chantiers = les devis que j'ai signés** — aucune inférence d'identité, aucun rapprochement par chaîne de caractères.

**L'entreprise l'emporte.** Un compte peut porter les deux rôles — un plombier fait aussi refaire sa toiture. La destination par défaut reste l'atelier ; l'en-tête propose le passage.

**L'adresse électronique est normalisée à l'écriture comme à la lecture.** Sans cela `Paul@Test.fr` et `paul@test.fr` produiraient deux comptes pour une personne, et le second ne verrait jamais le premier chantier.

**Les logements se dérivent, ils ne se stockent pas.** Comme la visibilité de M3, le classement de M4 et les métriques de M5.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/requester.ts` | Normalisation de l'adresse, orientation après connexion — **pur** |
| `src/db/schema/requester.ts` | `requester` |
| `src/db/schema/quote.ts` | *(modifié)* `signature.requester_id` |
| `src/services/requesters.ts` | Créer à la signature, revendiquer à la connexion |
| `src/services/my-properties.ts` | Les logements du demandeur — lecture asymétrique |
| `src/lib/session.ts` | *(modifié)* `currentRequester` |
| `src/app/auth/confirm/route.ts` | *(modifié)* oriente selon le rôle |
| `src/app/(espace)/mes-logements/**` | L'écran du demandeur |
| `src/ui/shells/space-shell.tsx` | Le gabarit du demandeur connecté |
| `src/app/d/[token]/SignatureBlock.tsx` | *(modifié)* le rôle de témoin |
| `src/app/confidentialite/page.tsx` | *(modifié)* idem |
| `src/services/email.ts` | *(modifié)* le courriel qui suit la signature |

---

## Task 1 : L'orientation après connexion

Fonction pure. C'est elle qui empêche un client d'atterrir sur le formulaire SIRET.

**Files:**
- Create: `src/domain/requester.ts`
- Test: `tests/domain/requester.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/requester.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeEmail, resolveDestination } from '@/domain/requester'

describe('normalisation de l adresse', () => {
  it('met en minuscules et retire les espaces', () => {
    // Sans cela, deux comptes pour une personne — et le second ne verrait
    // jamais le chantier du premier.
    expect(normalizeEmail('  Paul.Martin@Test.FR ')).toBe('paul.martin@test.fr')
  })

  it('refuse une adresse vide', () => {
    expect(() => normalizeEmail('   ')).toThrow(/adresse/)
  })
})

describe('destination apres connexion', () => {
  it('envoie l artisan dans son atelier', () => {
    expect(resolveDestination({ hasCompany: true, hasRequester: false })).toBe('/devis')
  })

  it('envoie le demandeur chez lui', () => {
    // Le defaut d'aujourd'hui : SessionError puis /inscription, c'est-a-dire
    // le formulaire SIRET de l'artisan.
    expect(resolveDestination({ hasCompany: false, hasRequester: true })).toBe('/mes-logements')
  })

  it('fait primer l entreprise quand le compte porte les deux roles', () => {
    // Un plombier fait aussi refaire sa toiture. Interdire le cumul serait
    // faux ; ne pas choisir de defaut le laisserait sans destination.
    expect(resolveDestination({ hasCompany: true, hasRequester: true })).toBe('/devis')
  })

  it('envoie a l inscription un compte qui n est ni l un ni l autre', () => {
    expect(resolveDestination({ hasCompany: false, hasRequester: false })).toBe('/inscription')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/domain/requester.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "@/domain/requester"`.

- [ ] **Step 3 : Écrire l'implémentation**

```typescript
// src/domain/requester.ts

/**
 * Le demandeur : la personne qui signe, regle, et consulte son dossier.
 *
 * Elle n'est pas le `customer` d'une entreprise — celui-la appartient a
 * l'entreprise et n'est jamais partage. Le demandeur traverse les entreprises,
 * et c'est ce qui rend possible la vue consolidee de son logement.
 */

/**
 * Une adresse normalisee, et rien d'autre comme cle d'identite.
 *
 * `Paul@Test.fr` et `paul@test.fr` sont la meme personne. Sans cette
 * normalisation, la seconde signature creerait un second compte, qui ne verrait
 * jamais le premier chantier — et le defaut serait invisible jusqu'a ce qu'un
 * client s'en plaigne.
 */
export function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) throw new Error('Adresse électronique manquante')
  return trimmed
}

export type Destination = '/devis' | '/mes-logements' | '/inscription'

/**
 * Ou envoyer un compte qui vient de se connecter.
 *
 * **L'entreprise l'emporte** : un meme compte peut porter les deux roles, et
 * l'atelier est celui ou l'on travaille tous les jours. L'en-tete propose le
 * passage a l'autre cote.
 */
export function resolveDestination(input: {
  hasCompany: boolean
  hasRequester: boolean
}): Destination {
  if (input.hasCompany) return '/devis'
  if (input.hasRequester) return '/mes-logements'
  return '/inscription'
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
pnpm vitest run tests/domain/requester.test.ts
```

Attendu : 6 tests verts.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/requester.ts tests/domain/requester.test.ts
git commit -m "feat: l'orientation apres connexion, l'entreprise l'emporte"
```

---

## Task 2 : Le schéma

**Files:**
- Create: `src/db/schema/requester.ts`
- Modify: `src/db/schema/index.ts`
- Modify: `src/db/schema/quote.ts`

- [ ] **Step 1 : Écrire le schéma**

```typescript
// src/db/schema/requester.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Le demandeur : la personne qui a signe.
 *
 * **Cree par la signature, silencieusement.** Le compte nait de l'acte sans le
 * conditionner : ajouter une etape a l'ecran de signature couterait des
 * signatures, et la signature est ce qui alimente le passeport, les metriques
 * et le label.
 *
 * `user_id` reste vide jusqu'a la premiere connexion : la ligne existe avant
 * que la personne n'ait jamais ouvert l'application, et c'est voulu — le jour
 * ou une seconde entreprise intervient chez elle, son dossier est deja
 * constitue.
 */
export const requester = pgTable('requester', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Identifiant dans `auth.users` de Supabase. Revendique a la 1re connexion. */
  userId: uuid('user_id').unique(),
  /** **Toujours normalisee** — voir `normalizeEmail`. C'est la cle d'identite. */
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /**
   * `signature` — il a signe un devis. `invitation` — un artisan l'a rattache a
   * un logement existant, notamment un bailleur multi-lots. Seule la premiere
   * est produite en M6·A.
   */
  source: text('source', { enum: ['signature', 'invitation'] })
    .notNull()
    .default('signature'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

Dans `src/db/schema/quote.ts`, ajouter à la table `signature`, après `signerPhone` :

```typescript
  /**
   * Le compte du signataire.
   *
   * Le lien se pose ICI et non sur `customer` : `customer.email` est ce que
   * l'artisan a saisi, `signer_email` est ce que la personne a fourni en
   * s'engageant. Seule la seconde est un acte de la personne — et la poser sur
   * le client reunirait deux membres d'un meme foyer sous un seul compte.
   */
  requesterId: uuid('requester_id').references(() => requester.id),
```

Ajouter l'import `import { requester } from './requester'` en tête de `quote.ts`, et `export * from './requester'` à `src/db/schema/index.ts`.

- [ ] **Step 2 : Générer et appliquer la migration**

```bash
pnpm drizzle-kit generate
```

```bash
pnpm supabase db reset
```

Attendu : un fichier `0010_*.sql` créant `requester` et ajoutant `signature.requester_id`.

- [ ] **Step 3 : Commit**

```bash
git add src/db/schema supabase/migrations drizzle
git commit -m "feat: le schema du demandeur, rattache a la signature"
```

---

## Task 3 : La signature crée le compte

**Files:**
- Create: `src/services/requesters.ts`
- Modify: `src/app/d/[token]/actions.ts`
- Test: `tests/services/requesters.test.ts`

- [ ] **Step 1 : Écrire le service**

```typescript
// src/services/requesters.ts
import { eq, isNull, and } from 'drizzle-orm'
import { db } from '@/db/client'
import { requester } from '@/db/schema'
import { normalizeEmail } from '@/domain/requester'

/**
 * Le compte du signataire, cree s'il n'existe pas.
 *
 * **Appele AVANT l'insertion de la signature**, et non apres. Le seul echec
 * realiste — la base indisponible — ferait de toute facon echouer la signature
 * elle-meme : il n'existe pas de mode de panne partiel qui vaille d'etre
 * concu. Un `onConflictDoUpdate` absorbe la course de deux devis signes
 * simultanement par la meme personne.
 *
 * Le nom est mis a jour a chaque signature : c'est celui que la personne vient
 * d'ecrire, donc le plus recent.
 */
export async function requesterFromSignature(input: { email: string; name: string }) {
  const email = normalizeEmail(input.email)

  const [row] = await db
    .insert(requester)
    .values({ email, name: input.name.trim(), source: 'signature' })
    .onConflictDoUpdate({ target: requester.email, set: { name: input.name.trim() } })
    .returning()

  return row
}

/**
 * Rattache le compte Supabase a la ligne creee lors de la signature.
 *
 * La revendication n'a lieu **que si la ligne n'est encore reliee a personne**
 * : la condition est un predicat SQL, pas un test JavaScript, pour qu'une
 * seconde connexion simultanee ne puisse pas rattacher un compte deja pris.
 */
export async function claimRequester(userId: string, rawEmail: string) {
  const email = normalizeEmail(rawEmail)

  const [claimed] = await db
    .update(requester)
    .set({ userId })
    .where(and(eq(requester.email, email), isNull(requester.userId)))
    .returning()

  if (claimed) return claimed

  const [existing] = await db.select().from(requester).where(eq(requester.email, email))
  return existing ?? null
}
```

- [ ] **Step 2 : Brancher sur la signature**

Dans `src/app/d/[token]/actions.ts`, **avant** `await db.insert(signature)`, et en réutilisant l'adresse déjà validée par `buildProof` :

```typescript
  // Le compte du client, cree par l'acte de signer. Rien n'est demande de plus
  // a l'ecran : le compte nait de la signature, il ne la conditionne pas.
  const account = await requesterFromSignature({
    email: proof.signerEmail,
    name: proof.signerName,
  })

  await db.insert(signature).values({ quoteId: found.id, ...proof, requesterId: account.id })
```

Ajouter l'import `import { requesterFromSignature } from '@/services/requesters'`.

- [ ] **Step 3 : Écrire les tests**

```typescript
// tests/services/requesters.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { requester } from '@/db/schema'
import { claimRequester, requesterFromSignature } from '@/services/requesters'

afterAll(async () => {
  await connection.end()
})

const someEmail = () => `paul-${randomUUID().slice(0, 8)}@test.local`

describe('le compte cree par la signature', () => {
  it('cree une ligne sans compte Supabase', async () => {
    const created = await requesterFromSignature({ email: someEmail(), name: 'Paul Martin' })

    expect(created.userId).toBeNull()
    expect(created.source).toBe('signature')
  })

  it('normalise l adresse', async () => {
    const raw = someEmail()
    const created = await requesterFromSignature({ email: `  ${raw.toUpperCase()} `, name: 'Paul' })

    expect(created.email).toBe(raw)
  })

  it('ne cree pas un second compte a la deuxieme signature', async () => {
    // C'est tout l'interet : deux entreprises chez la meme personne doivent
    // aboutir au meme dossier.
    const email = someEmail()
    const first = await requesterFromSignature({ email, name: 'Paul Martin' })
    const second = await requesterFromSignature({ email: email.toUpperCase(), name: 'P. Martin' })

    expect(second.id).toBe(first.id)
    expect(second.name).toBe('P. Martin')
  })
})

describe('la revendication a la connexion', () => {
  it('rattache le compte Supabase a la ligne existante', async () => {
    const email = someEmail()
    await requesterFromSignature({ email, name: 'Paul' })
    const userId = randomUUID()

    const claimed = await claimRequester(userId, email)

    expect(claimed?.userId).toBe(userId)
  })

  it('ne revendique JAMAIS une ligne deja rattachee', async () => {
    // Sinon une adresse recyclee donnerait a un nouveau compte l'acces au
    // dossier d'un autre.
    const email = someEmail()
    await requesterFromSignature({ email, name: 'Paul' })
    const first = randomUUID()
    await claimRequester(first, email)

    const second = await claimRequester(randomUUID(), email)

    expect(second?.userId).toBe(first)
  })

  it('rend null pour une adresse inconnue', async () => {
    expect(await claimRequester(randomUUID(), someEmail())).toBeNull()
  })
})

describe('la signature porte le rattachement', () => {
  it('n a pas de compte cote client de l entreprise', async () => {
    // Le lien est sur la signature, pas sur `customer` : deux membres d'un
    // meme foyer signant chacun un devis chez le meme artisan doivent avoir
    // deux comptes, pas un.
    const rows = await db.select().from(requester).where(eq(requester.email, 'inexistant@x.fr'))
    expect(rows).toHaveLength(0)
  })
})
```

- [ ] **Step 4 : Lancer les tests**

```bash
pnpm vitest run tests/services/requesters.test.ts
```

Attendu : 7 tests verts.

- [ ] **Step 5 : Vérifier que la signature fonctionne toujours**

```bash
pnpm exec playwright test quote-journey
```

Attendu : vert. **C'est la vérification qui compte le plus de la tâche** — le jalon n'a pas le droit de fragiliser l'acte de signer.

- [ ] **Step 6 : Commit**

```bash
git add src/services/requesters.ts "src/app/d/[token]/actions.ts" tests/services/requesters.test.ts
git commit -m "feat: la signature cree le compte du client, sans rien lui demander"
```

---

## Task 4 : La session du demandeur, et l'orientation

**Files:**
- Modify: `src/lib/session.ts`
- Modify: `src/app/auth/confirm/route.ts`
- Modify: `tests/lib/session.test.ts`

- [ ] **Step 1 : Ajouter les tests qui échouent**

```typescript
// à ajouter à tests/lib/session.test.ts
import { resolveRequester } from '@/lib/session'

describe('resolveRequester', () => {
  it('rejette une session sans utilisateur', () => {
    expect(() => resolveRequester(null, null)).toThrow('Session expiree')
  })

  it('rejette un compte sans dossier', () => {
    // Message distinct : l'appelant doit pouvoir orienter vers l'inscription
    // artisan plutot que vers la connexion.
    expect(() => resolveRequester({ id: 'u1', email: 'a@b.fr' }, null)).toThrow('Aucun dossier')
  })

  it('renvoie l identifiant du dossier', () => {
    expect(resolveRequester({ id: 'u1', email: 'a@b.fr' }, { requesterId: 'r1' })).toEqual({
      userId: 'u1',
      email: 'a@b.fr',
      requesterId: 'r1',
    })
  })
})
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

```bash
pnpm vitest run tests/lib/session.test.ts
```

Attendu : ÉCHEC — `resolveRequester` n'est pas exporté.

- [ ] **Step 3 : Écrire l'implémentation**

Ajouter à `src/lib/session.ts` :

```typescript
export interface RequesterSession {
  userId: string
  email: string
  requesterId: string
}

/**
 * Le pendant de `resolveCompany` pour l'autre public.
 *
 * Les deux causes de rejet restent distinctes : « session expiree » renvoie
 * vers la connexion, « aucun dossier » signale un compte qui n'a jamais signe.
 */
export function resolveRequester(
  user: AuthUser | null,
  found: { requesterId: string } | null,
): RequesterSession {
  if (!user) throw new SessionError('Session expiree')
  if (!found) throw new SessionError('Aucun dossier rattache a ce compte')

  return { userId: user.id, email: user.email, requesterId: found.requesterId }
}

export async function currentRequester(): Promise<RequesterSession> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // La revendication a lieu ici plutot qu'a l'atterrissage du lien magique :
  // ainsi un dossier cree APRES la premiere connexion se rattache tout seul,
  // sans que la personne ait a se reconnecter.
  const row = user ? await claimRequester(user.id, user.email!) : null

  return resolveRequester(
    user ? { id: user.id, email: user.email! } : null,
    row ? { requesterId: row.id } : null,
  )
}
```

Ajouter les imports `import { claimRequester } from '@/services/requesters'`.

- [ ] **Step 4 : Orienter à l'atterrissage du lien magique**

Remplacer dans `src/app/auth/confirm/route.ts` le `redirect('/devis')` par :

```typescript
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const [company, account] = await Promise.all([
        user ? db.query.member.findFirst({ where: eq(member.userId, user.id) }) : null,
        user?.email ? claimRequester(user.id, user.email) : null,
      ])

      redirect(
        resolveDestination({ hasCompany: company !== null, hasRequester: account !== null }),
      )
    }
```

Imports à ajouter au fichier : `eq` de `drizzle-orm`, `db` de `@/db/client`, `member` de `@/db/schema`, `claimRequester` de `@/services/requesters`, `resolveDestination` de `@/domain/requester`.

> **`redirect` hors du bloc `try`** si l'un est ajouté : Next signale la navigation en levant une exception, qu'un `catch` afficherait comme une erreur. C'est le défaut trouvé trois fois dans ce projet.

- [ ] **Step 5 : Lancer les tests**

```bash
pnpm vitest run tests/lib/ && pnpm build
```

Attendu : verts.

- [ ] **Step 6 : Commit**

```bash
git add src/lib/session.ts src/app/auth tests/lib/session.test.ts
git commit -m "feat: la session du demandeur, et l'orientation selon le role"
```

---

## Task 5 : Mes logements — la lecture asymétrique

**Le test le plus important du jalon.** Une entreprise qui verrait le chantier d'un concurrent sur le même logement, et le produit est mort.

**Files:**
- Create: `src/services/my-properties.ts`
- Test: `tests/services/my-properties.test.ts`

- [ ] **Step 1 : Écrire le service**

```typescript
// src/services/my-properties.ts
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, project, property, quote, signature } from '@/db/schema'

export interface MyChantier {
  quoteId: string
  number: string
  companyName: string
  signedAt: Date
  completedAt: Date | null
}

export interface MyProperty {
  id: string
  address: string
  chantiers: MyChantier[]
}

/**
 * Les logements du demandeur, deduits des devis QU'IL A SIGNES.
 *
 * **Jamais de ce qui est arrive a l'adresse.** Le logement est partage par
 * empreinte d'adresse et ne dit rien de qui l'habite : fonder la vue sur
 * l'adresse livrerait au nouvel acquereur d'un appartement le dossier de
 * travaux du precedent proprietaire.
 *
 * La promesse tient quand meme : sur une renovation, le demandeur a signe les
 * trois devis, donc il voit les trois chantiers la ou chaque artisan n'en voit
 * qu'un. **Il reste le seul acteur de la chaine a posseder la vue
 * consolidee** — sans qu'un demenagement transfere un dossier avec les murs.
 */
export async function myProperties(requesterId: string): Promise<MyProperty[]> {
  const rows = await db
    .select({
      propertyId: property.id,
      addressLine1: property.addressLine1,
      postalCode: property.postalCode,
      city: property.city,
      quoteId: quote.id,
      number: quote.number,
      companyName: company.legalName,
      signedAt: quote.signedAt,
      completedAt: quote.completedAt,
    })
    .from(signature)
    .innerJoin(quote, eq(quote.id, signature.quoteId))
    .innerJoin(project, eq(project.id, quote.projectId))
    .innerJoin(property, eq(property.id, project.propertyId))
    .innerJoin(company, eq(company.id, quote.companyId))
    // Le filtre est porte par la REQUETE : un ecran qui l'oublierait
    // publierait le chantier d'un tiers.
    .where(eq(signature.requesterId, requesterId))

  const grouped = new Map<string, MyProperty>()

  for (const row of rows) {
    const existing = grouped.get(row.propertyId) ?? {
      id: row.propertyId,
      address: `${row.addressLine1}, ${row.postalCode} ${row.city}`,
      chantiers: [],
    }

    existing.chantiers.push({
      quoteId: row.quoteId,
      number: row.number,
      companyName: row.companyName,
      signedAt: row.signedAt!,
      completedAt: row.completedAt,
    })

    grouped.set(row.propertyId, existing)
  }

  // Le plus recent d'abord, dans chaque logement comme entre logements.
  for (const entry of grouped.values()) {
    entry.chantiers.sort((a, b) => b.signedAt.getTime() - a.signedAt.getTime())
  }

  return [...grouped.values()].sort(
    (a, b) => b.chantiers[0].signedAt.getTime() - a.chantiers[0].signedAt.getTime(),
  )
}
```

- [ ] **Step 2 : Écrire les tests**

```typescript
// tests/services/my-properties.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { project, quote, signature } from '@/db/schema'
import { myProperties } from '@/services/my-properties'
import { requesterFromSignature } from '@/services/requesters'
import { createCompany, createProject, signedQuote } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

/** Signe un devis au nom d'un demandeur donne. */
async function signFor(companyId: string, projectId: string, requesterId: string) {
  const row = await signedQuote(companyId, projectId, 'signed')

  await db.insert(signature).values({
    quoteId: row.id,
    requesterId,
    signerName: 'Paul Martin',
    signerEmail: 'paul@test.local',
    signerPhone: '0600000000',
    codeValidatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    documentHash: 'a'.repeat(64),
    archivedPdfPath: `${companyId}/${row.id}.pdf`,
  })

  return row
}

describe('les logements du demandeur', () => {
  it('reunit les chantiers de DEUX entreprises sur le meme logement', async () => {
    // C'est ce que le jalon apporte : chaque artisan ne voit que son chantier,
    // le demandeur voit les deux.
    const me = await requesterFromSignature({ email: `a-${randomUUID()}@t.local`, name: 'Paul' })

    const plumber = await createCompany()
    const roofer = await createCompany()
    const site = await createProject(plumber)

    // Le second chantier vise le MEME logement.
    const [firstProject] = await db.select().from(project).where(eq(project.id, site))
    const otherSite = await createProject(roofer)
    await db
      .update(project)
      .set({ propertyId: firstProject.propertyId })
      .where(eq(project.id, otherSite))

    await signFor(plumber, site, me.id)
    await signFor(roofer, otherSite, me.id)

    const found = await myProperties(me.id)

    expect(found).toHaveLength(1)
    expect(found[0].chantiers).toHaveLength(2)
  })

  it('ne montre JAMAIS le chantier d un autre signataire au meme logement', async () => {
    // Le defaut qui tuerait le produit : le dossier du precedent proprietaire
    // livre au nouvel acquereur.
    const me = await requesterFromSignature({ email: `b-${randomUUID()}@t.local`, name: 'Paul' })
    const other = await requesterFromSignature({ email: `c-${randomUUID()}@t.local`, name: 'Ana' })

    const builder = await createCompany()
    const site = await createProject(builder)
    const [firstProject] = await db.select().from(project).where(eq(project.id, site))

    const otherSite = await createProject(builder)
    await db
      .update(project)
      .set({ propertyId: firstProject.propertyId })
      .where(eq(project.id, otherSite))

    await signFor(builder, site, me.id)
    const hidden = await signFor(builder, otherSite, other.id)

    const found = await myProperties(me.id)
    const seen = JSON.stringify(found)

    expect(found[0].chantiers).toHaveLength(1)
    expect(seen).not.toContain(hidden.id)
    expect(seen).not.toContain(hidden.number)
  })

  it('ne montre rien a un demandeur qui n a rien signe', async () => {
    const nobody = await requesterFromSignature({ email: `d-${randomUUID()}@t.local`, name: 'X' })
    expect(await myProperties(nobody.id)).toEqual([])
  })

  it('n ouvre AUCUNE lecture nouvelle cote entreprise', async () => {
    // Garde de non-regression : le logement devient une cle de regroupement,
    // et il ne doit pas le devenir cote artisan. Deux entreprises au meme
    // logement, chacune ne voit que ses devis.
    const me = await requesterFromSignature({ email: `e-${randomUUID()}@t.local`, name: 'Paul' })
    const mine = await createCompany()
    const rival = await createCompany()
    const site = await createProject(mine)
    const [firstProject] = await db.select().from(project).where(eq(project.id, site))
    const rivalSite = await createProject(rival)
    await db
      .update(project)
      .set({ propertyId: firstProject.propertyId })
      .where(eq(project.id, rivalSite))

    await signFor(mine, site, me.id)
    const rivalQuote = await signFor(rival, rivalSite, me.id)

    const visibleToMine = await db.select().from(quote).where(eq(quote.companyId, mine))

    expect(visibleToMine.map((q) => q.id)).not.toContain(rivalQuote.id)
  })
})
```

- [ ] **Step 3 : Lancer les tests**

```bash
pnpm vitest run tests/services/my-properties.test.ts
```

Attendu : 4 tests verts.

- [ ] **Step 4 : Vérifier que le second test est discriminant**

Retirer temporairement le `.where(eq(signature.requesterId, requesterId))` du service et relancer.

Attendu : le test « ne montre JAMAIS le chantier d un autre signataire » **échoue**. Le remettre.

> Sans cette vérification, la garantie serait vacante — c'est la leçon des tests d'immuabilité de M2, qui passaient sur une table vide.

- [ ] **Step 5 : Commit**

```bash
git add src/services/my-properties.ts tests/services/my-properties.test.ts
git commit -m "feat: les logements du demandeur, l'asymetrie portee par la requete"
```

---

## Task 6 : L'écran du demandeur

**Files:**
- Create: `src/ui/shells/space-shell.tsx`
- Create: `src/app/(espace)/mes-logements/page.tsx`
- Modify: `scripts/check-design-system.mjs`

- [ ] **Step 1 : Le gabarit**

`SpaceShell` — le pendant d'`AppShell` pour l'autre public. Même structure : un `<header>` avec le `Lockup`, un `<main>` en `max-w-2xl` (le demandeur lit, il ne saisit pas de tableau), le `ThemeToggle`.

Deux différences qui comptent :

- Le lien du logo pointe vers `/mes-logements`, pas `/devis`.
- Si le compte porte **aussi** une entreprise, un lien « Mon atelier » apparaît. C'est la contrepartie de la décision « l'entreprise l'emporte » : sans lui, l'artisan qui fait refaire sa toiture n'atteindrait jamais son dossier.

Ajouter `'SpaceShell'` à l'inventaire `shells` de `scripts/check-design-system.mjs` — l'inventaire est fermé, une addition non déclarée fait échouer le contrôle.

- [ ] **Step 2 : L'écran**

```tsx
// src/app/(espace)/mes-logements/page.tsx
import { redirect } from 'next/navigation'
import { currentRequester, SessionError } from '@/lib/session'
import { myProperties } from '@/services/my-properties'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { EmptyState } from '@/ui/molecules/empty-state'
import { SpaceShell } from '@/ui/shells/space-shell'

/**
 * L'accueil du demandeur.
 *
 * L'unite n'est pas « ma demande » mais **« mon logement »** — un bailleur voit
 * son parc, un occupant voit son bien.
 */
export default async function MyPropertiesPage() {
  let session
  try {
    session = await currentRequester()
  } catch (e) {
    if (e instanceof SessionError) {
      // « Aucun dossier » n'envoie PAS vers l'inscription artisan : ce compte
      // n'est pas un artisan qui n'aurait pas fini, c'est quelqu'un qui n'a
      // simplement rien signe.
      redirect(e.message.includes('Aucun dossier') ? '/' : '/connexion')
    }
    throw e
  }

  const properties = await myProperties(session.requesterId)

  return (
    <SpaceShell>
      <div className="flex flex-col gap-1">
        <Heading level={1}>Mes logements</Heading>
        <Text size="sm" tone="soft">
          Les chantiers que vous avez signés, regroupés par adresse.
        </Text>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="Aucun chantier pour le moment"
          description="Votre dossier se remplit dès que vous signez un devis."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {properties.map((item) => (
            <Card key={item.id} elevation="e1">
              <div className="flex flex-col gap-3" data-testid={`logement-${item.id}`}>
                <Heading level={3} as="h2">
                  {item.address}
                </Heading>
                <ul className="flex flex-col gap-2">
                  {item.chantiers.map((chantier) => (
                    <li key={chantier.quoteId}>
                      <Text size="sm" tone="soft" as="span">
                        <strong>{chantier.companyName}</strong> · devis {chantier.number} · signé le{' '}
                        {chantier.signedAt.toLocaleDateString('fr-FR')}
                        {chantier.completedAt
                          ? ` · terminé le ${chantier.completedAt.toLocaleDateString('fr-FR')}`
                          : ' · en cours'}
                      </Text>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Text size="sm" tone="muted">
        Vos devis et vos factures restent accessibles par les liens que vos entreprises vous ont
        envoyés.{' '}
        <Link href="/confidentialite" newTab>
          Comment vos données sont utilisées
        </Link>
      </Text>
    </SpaceShell>
  )
}
```

> La dernière ligne est une **honnêteté de périmètre**, pas une excuse : le dossier complet — fil d'avancement, documents, garanties — arrive au plan B. Laisser croire qu'il est déjà là ferait chercher au client une page qui n'existe pas.

- [ ] **Step 3 : Vérifier à l'écran**

```bash
pnpm dev
```

Signer un devis de bout en bout, puis se connecter avec l'adresse du signataire et vérifier l'atterrissage sur `/mes-logements`.

- [ ] **Step 4 : Les garde-fous**

```bash
pnpm validate
```

- [ ] **Step 5 : Commit**

```bash
git add src/app "src/ui/shells/space-shell.tsx" scripts/check-design-system.mjs
git commit -m "feat: l'ecran des logements du demandeur"
```

---

## Task 7 : Le verrou n° 1 de l'AIPD

L'AIPD le date d'« avant M5 » et il n'a pas été fait. Il se paie ici, parce que c'est le seul jalon qui touche l'écran de signature.

**Files:**
- Modify: `src/app/d/[token]/SignatureBlock.tsx`
- Modify: `src/app/confidentialite/page.tsx`
- Modify: `docs/superpowers/rgpd/2026-08-08-aipd-passeport.md`

- [ ] **Step 1 : L'écran de signature**

Dans le bloc de mentions qui précède le bouton « Signer le devis », après la phrase existante sur les preuves conservées, ajouter :

```tsx
          <Text size="sm" tone="muted">
            <strong>Votre signature sert aussi de témoignage.</strong> Elle atteste que ce chantier
            a bien eu lieu, à cette date et à ce prix — ce qui rend vérifiables les chiffres publiés
            sur cette entreprise, au lieu qu’elle les déclare elle-même. Aucun de vos éléments
            personnels n’y figure.{' '}
            <Link href="/passeport/definitions" newTab>
              Ce que ces chiffres mesurent
            </Link>
          </Text>
```

> **Avant la signature, pas après.** C'est la fonction la plus structurante de son geste, et l'AIPD la qualifie de non mentionnée. La dire ensuite reviendrait à l'informer d'un traitement auquel il a déjà contribué.

- [ ] **Step 2 : La page de confidentialité**

Ajouter une section après « Ce que nous traitons, et pourquoi » :

```tsx
        <Heading level={3} as="h2">Si vous avez signé un devis</Heading>
        <Text size="sm" tone="soft">
          Votre signature fait de vous le <strong>témoin</strong> d’un chantier. Elle atteste qu’il
          a eu lieu, à cette date et à ce prix — et c’est ce qui permet de publier sur l’entreprise
          des chiffres vérifiables plutôt que déclaratifs. <strong>Rien de ce qui vous identifie
          n’est publié</strong> : ni votre nom, ni votre adresse, ni le montant de vos travaux.
          Seuls des taux agrégés sur douze mois le sont, et jamais en dessous de dix chantiers.
        </Text>
        <Text size="sm" tone="soft">
          L’entreprise peut contester la façon dont son délai a été mesuré. Vous recevez alors une
          question, et vous êtes libre de ne pas y répondre.
        </Text>
```

- [ ] **Step 3 : Fermer la ligne dans l'AIPD**

Dans le tableau des chantiers datés, marquer la ligne 1 comme faite, en indiquant le jalon et la date.

- [ ] **Step 4 : Vérifier à l'écran**

Ouvrir un devis envoyé, demander le code, et vérifier que la mention est visible **avant** le bouton de signature.

- [ ] **Step 5 : Commit**

```bash
git add src/app docs/superpowers/rgpd
git commit -m "feat: le client sait que sa signature temoigne d'une mesure publiee"
```

---

## Task 8 : Le courriel qui suit la signature

Sans lui, le compte existe et personne ne le sait.

**Files:**
- Modify: `src/services/email.ts`
- Modify: `src/app/d/[token]/actions.ts`
- Test: `tests/services/email.test.ts`

- [ ] **Step 1 : Le message**

Ajouter à `src/services/email.ts` :

```typescript
/**
 * La confirmation de signature, adressee au client.
 *
 * **C'est le canal d'acces au dossier**, et le seul. Le compte a ete cree par
 * la signature sans que rien ne soit demande a l'ecran : c'est ici que la
 * personne apprend qu'il existe.
 *
 * Pas de mot de passe a choisir, pas de compte a activer : elle se connectera
 * par lien magique avec l'adresse qu'elle vient d'utiliser.
 */
export async function sendSignatureReceipt(input: {
  to: string
  customerName: string
  companyName: string
  quoteNumber: string
  spaceUrl: string
}): Promise<void> {
  await transport.sendMail({
    from: FROM,
    to: input.to,
    subject: `Votre devis ${input.quoteNumber} est signé — ${input.companyName}`,
    text: [
      `Bonjour ${input.customerName},`,
      '',
      `Votre devis ${input.quoteNumber} est signé. ${input.companyName} en a été informée.`,
      '',
      `Vos chantiers sont réunis ici : ${input.spaceUrl}`,
      "Aucun mot de passe : connectez-vous avec cette adresse, on vous enverra un lien.",
    ].join('\n'),
    html: `
      <p>Bonjour ${input.customerName},</p>
      <p>Votre devis <strong>${input.quoteNumber}</strong> est signé.
         <strong>${input.companyName}</strong> en a été informée.</p>
      <p><a href="${input.spaceUrl}">Retrouver vos chantiers</a></p>
      <p style="color:#666;font-size:12px">Aucun mot de passe : connectez-vous avec cette adresse,
         on vous enverra un lien.</p>
    `,
  })
}
```

- [ ] **Step 2 : L'envoyer après la signature**

À la fin de `signQuote`, **après** `recordEvent` et **avant** `revalidatePath` :

```typescript
  // Hors du chemin critique : un envoi qui echoue ne doit pas defaire une
  // signature valide, archivee et horodatee.
  try {
    await sendSignatureReceipt({
      to: proof.signerEmail,
      customerName: proof.signerName,
      companyName: found.company.legalName,
      quoteNumber: found.number,
      spaceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/mes-logements`,
    })
  } catch {
    // Le compte existe malgre tout : la personne peut se connecter seule.
  }
```

> Ici le `try/catch` est justifié, contrairement à la Task 3 : la signature est **déjà écrite**, et l'annuler pour un défaut de messagerie détruirait une preuve pour rien.

- [ ] **Step 3 : Ajouter le test**

```typescript
it('annonce le dossier sans demander de mot de passe', async () => {
  // Le compte a ete cree par la signature : proposer d'en creer un ici
  // laisserait croire qu'il y a une etape de plus.
  await sendSignatureReceipt({
    to: 'paul@test.local',
    customerName: 'Paul Martin',
    companyName: 'PLOMBERIE DU PARCOURS',
    quoteNumber: 'D2026-0001',
    spaceUrl: 'http://localhost:3000/mes-logements',
  })

  const body = await lastMailTo('paul@test.local')

  expect(body).toContain('/mes-logements')
  expect(body).not.toMatch(/mot de passe.{0,20}(choisir|créer|définir)/i)
})
```

> `lastMailTo` suit le motif déjà employé dans `tests/services/email.test.ts` ; s'il n'existe pas sous ce nom, reprendre l'assertion telle qu'elle y est écrite.

- [ ] **Step 4 : Lancer les tests**

```bash
pnpm vitest run tests/services/email.test.ts
```

- [ ] **Step 5 : Commit**

```bash
git add src/services/email.ts "src/app/d/[token]/actions.ts" tests/services/email.test.ts
git commit -m "feat: la confirmation de signature ouvre l'acces au dossier"
```

---

## Task 9 : Le parcours de bout en bout

**Files:**
- Create: `tests/e2e/space-journey.spec.ts`
- Modify: `tests/e2e/helpers.ts`

- [ ] **Step 1 : Le helper**

Ajouter à `tests/e2e/helpers.ts`, sur le modèle de `disputePathFor` :

```typescript
/** Attend la confirmation de signature adressee au client. */
export async function signatureReceiptFor(email: string): Promise<string> {
  return waitForMail(
    (mail) => mail.To.some((to) => to.Address === email) && /est signé/.test(mail.Subject),
    `confirmation de signature pour ${email}`,
  )
}
```

- [ ] **Step 2 : Un devis au statut `sent`**

`signedQuoteFor` rend un devis **déjà signé**, sans ligne `signature` : ce parcours a besoin de l'inverse — un devis envoyé, que le client signera par l'écran. Plutôt que d'en dupliquer le corps, paramétrer celui qui existe.

Dans `tests/e2e/fixtures.ts`, renommer `signedQuoteFor` en `quoteFor` avec un second paramètre, et rendre l'ancien nom :

```typescript
export async function quoteFor(email: string, status: 'sent' | 'signed' = 'signed') {
  // ...corps inchangé, jusqu'a l'insertion du devis...
      status,
      sentAt: new Date(),
      // Un devis envoye n'est pas encore signe : sans cette distinction, le
      // client trouverait un devis deja conclu et l'ecran de signature ne
      // s'afficherait pas.
      signedAt: status === 'signed' ? new Date() : null,
  // ...suite inchangee...
}

/** L'etat de depart des parcours de M2 et M5, ou la signature est deja acquise. */
export const signedQuoteFor = (email: string) => quoteFor(email, 'signed')
```

**Ne pas dupliquer les lignes du devis** : elles sont écrites une fois, dans le corps partagé.

- [ ] **Step 3 : Écrire le parcours**

```typescript
// tests/e2e/space-journey.spec.ts
import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor, quoteLinkFor, signatureReceiptFor, smsCodeFor } from './helpers'
import { quoteFor } from './fixtures'

/**
 * Le parcours de M6·A : de la signature d'un devis a l'arrivee du client chez
 * lui, sans qu'aucun compte ne lui ait ete demande.
 *
 * Artisan et client neufs a chaque lancement : le parcours compte des
 * chantiers, et un compte reutilise ferait s'accumuler ceux des lancements
 * precedents.
 */
const ARTISAN = `artisan-m6a-${randomUUID().slice(0, 8)}@test.local`
const CLIENT = `client-m6a-${randomUUID().slice(0, 8)}@test.local`

test('de la signature du devis au dossier du client', async ({ page }) => {
  await clearMailbox()

  // — Le parcours complet devis → signature est deja couvert par
  //   quote-journey ; ce qui reste a prouver commence a la signature.
  await test.step('connexion de l’artisan', async () => {
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(ARTISAN)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(ARTISAN))
  })

  // Envoye, pas signe : la signature doit passer par l'ecran du client, sinon
  // rien de ce que ce jalon construit ne serait exerce.
  await quoteFor(ARTISAN, 'sent')

  await test.step('le client signe, sans qu’aucun compte ne lui soit demandé', async () => {
    await page.goto(await quoteLinkFor('client-m2@test.local'))
    await page.getByRole('button', { name: 'Recevoir le code' }).click()

    await page.getByLabel('Votre nom').fill('Paul Martin')
    await page.getByLabel('Votre e-mail').fill(CLIENT)
    await page.getByLabel('Code reçu par SMS').fill(await smsCodeFor('0612345678'))

    // Le verrou n° 1 de l'AIPD : il l'apprend AVANT de signer.
    await expect(page.getByText('Votre signature sert aussi de témoignage')).toBeVisible()

    await page.getByRole('button', { name: 'Signer le devis' }).click()
    await expect(page.getByText('Devis signé')).toBeVisible()
  })

  await test.step('il reçoit l’adresse de son dossier', async () => {
    expect(await signatureReceiptFor(CLIENT)).toContain('/mes-logements')
  })

  await test.step('il se connecte et arrive chez lui, pas sur l’inscription artisan', async () => {
    await page.context().clearCookies()
    await page.goto('/connexion')
    await page.getByLabel('E-mail').fill(CLIENT)
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await page.goto(await magicLinkFor(CLIENT))

    await expect(page).toHaveURL(/\/mes-logements$/)
    await expect(page.getByRole('heading', { name: 'Mes logements' })).toBeVisible()
  })

  await test.step('il voit son chantier, et le nom de l’entreprise', async () => {
    await expect(page.getByText('PLOMBERIE DU PARCOURS')).toBeVisible()
    await expect(page.getByText('12 rue Fondaudège')).toBeVisible()
  })
})
```

- [ ] **Step 4 : Lancer le parcours**

```bash
pkill -f "next dev"; pkill -f "next-server"; pnpm test:e2e
```

Attendu : 6 parcours verts.

- [ ] **Step 5 : Vérification finale**

```bash
pnpm supabase db reset && pnpm validate && pnpm test:e2e
```

- [ ] **Step 6 : Commit**

```bash
git add tests/e2e
git commit -m "test: de la signature du devis au dossier du client"
```

---

## Vérification du jalon

| Exigence de la spec | Où elle est vérifiée |
|---|---|
| Le compte se crée à la signature, silencieusement | Task 3, Task 9 |
| La signature n'est pas dégradée | Task 3 step 5, Task 9 |
| Le rattachement se pose sur le signataire | Task 3, Task 5 |
| Deux entreprises, un seul dossier | Task 5 |
| Le dossier suit la personne, pas l'adresse | Task 5 — le test discriminant |
| Aucune lecture nouvelle côté entreprise | Task 5 |
| L'entreprise l'emporte sur le cumul des rôles | Task 1, Task 6 |
| Le verrou n° 1 de l'AIPD | Task 7, Task 9 |

## Ce qui reste au plan B

Le dossier lui-même : le chantier, le fil d'avancement, les documents, les garanties et la réception déclarée. Le plan A livre l'accès et la liste ; il ne livre pas encore ce qu'il y a dedans — et l'écran le dit, plutôt que de le laisser croire.

**Le logement ajouté à la main** y va aussi, avec sa table `requester_property`. Il est indispensable au bailleur, dont tous les lots n'ont pas encore fait l'objet d'un chantier — mais un logement vide n'a de sens qu'une fois qu'un logement rempli existe.

Le répertoire et la reprise de contact restent au plan C.
