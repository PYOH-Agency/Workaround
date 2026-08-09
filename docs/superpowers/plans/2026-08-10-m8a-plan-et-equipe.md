# M8·A — Le plan et l'équipe · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qu'une entreprise puisse être basculée en Pro, qu'elle invite ses compagnons, et que l'argent reste au patron — sans qu'une seule des fonctions existantes passe derrière la porte.

**Architecture:** Une **table de capacités pure** dit qui peut quoi, sur deux axes indépendants — le plan (ce que l'entreprise a payé) et le rôle (ce que cette personne-là fait dans l'entreprise). Cette table est lue par les actions serveur **et** par la navigation : deux tables divergeraient en trois jalons, et l'écran finirait par proposer ce que le serveur refuse. L'invitation se réclame **par l'adresse électronique**, prouvée par le lien magique — le même mécanisme que le dossier du demandeur en M6·A.

**Tech Stack:** Identique. Aucune dépendance nouvelle.

> **Contraintes de l'atelier.** 250 lignes par fichier, aucune fonctionnalité n'importe d'une autre, design system obligatoire.
>
> **Déviation de format, comme aux jalons précédents.** Les écrans dont la structure existe renvoient à leurs équivalents ; le code complet est donné là où la logique est neuve.
>
> **Migrations :** `supabase/MIGRATIONS.md` — les `0xxx_` sont générés par Drizzle et ne se renomment jamais, les `9xxx_` s'écrivent à la main.

**Références :** [spec M8](../specs/2026-08-10-offre-payante-design.md) · [spec P1 §5](2026-08-07-socle-artisan-design.md) · [plan M6·A](2026-08-09-m6a-compte-demandeur.md)

---

## Décisions verrouillées

**Une seule table de capacités**, lue par les actions serveur, par les pages et par la navigation. C'est elle qui rend vraie la phrase de la spec : *le service refuse, et l'écran ne le propose pas*.

**Le rôle est examiné avant le plan.** Si les deux manquent, c'est le rôle qu'on annonce. Dire « offre Pro » à un compagnon lui vendrait quelque chose dont il ne pourrait de toute façon rien faire — un refus insurmontable prime toujours sur un refus commercial.

**Aucun jeton d'invitation.** L'invitation se réclame par l'**adresse**, prouvée par le lien magique. Un jeton se transfère ; une boîte aux lettres, non. La colonne n'aurait ajouté qu'une surface d'attaque pour affaiblir la preuve.

**On retire un membre, on ne l'efface pas.** `member.removed_at` plutôt qu'un `DELETE` : le journal garde son identifiant Supabase dans `actor_id` sur tout ce qu'il a fait, et supprimer la ligne rendrait ces faits illisibles.

**Une entreprise garde au moins un responsable.** Le dernier `owner` ne peut pas être retiré — sinon l'entreprise devient irrécupérable, et il faudrait nous appeler.

**La bascule du plan est manuelle et journalisée.** Pas d'encaissement. Mais le passage en Pro est un fait commercial daté, et il s'inscrit au journal comme le reste.

---

## Deux choix de mise en œuvre qui méritent d'être dits

### La garde existe à deux niveaux, et ce n'est pas une redondance

`requireCapability()` garde le **bord serveur** — c'est elle qui connaît la session, donc le rôle. `assertProPlan()` garde le **service**, en relisant `company.plan` en base — elle ne connaît aucune session, et c'est exactement pourquoi elle existe : un cron, une migration de données ou une action écrite dans six mois passeraient à côté de la première.

> La spec exige que « la garde soit portée par le service, pas par l'écran ». Le service seul ne peut pas connaître le rôle ; le bord serveur seul se contourne. Les deux, chacun sur ce qu'il sait.

### La session porte désormais le plan, et il faut une jointure

`currentCompany()` lit déjà `member`. Elle lira `member` **joint à sa `company`**, pour la seule colonne `plan`. Une ligne par clé primaire : le coût est nul, et l'alternative — un second appel dans chaque page — se serait oubliée quelque part.

**Et le filtre `removed_at IS NULL` devient porteur** : sans lui, retirer un membre ne lui retire rien. Il figure à la vérification par mutation.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/domain/authorization.ts` | La table des capacités, `can`, `assertCan` — **pur** |
| `src/db/schema/company.ts` | *(modifié)* `company.plan`, `member.removed_at`, `member_invitation` |
| `src/lib/session.ts` | *(modifié)* la session porte le plan et le rôle typés |
| `src/lib/access.ts` | `requireCapability` — le bord serveur |
| `src/services/plan.ts` | `planOf`, `assertProPlan`, `switchPlan` |
| `src/services/team.ts` | Les gestes du patron : lister, inviter, révoquer, retirer |
| `src/services/membership.ts` | Le geste de l'invité : réclamer son invitation |
| `src/services/team-mail.ts` | Le courriel d'invitation |
| `src/app/(app)/equipe/**` | L'écran d'équipe, et la porte quand elle est fermée |
| `src/app/(admin)/entreprises/**` | La bascule du plan |
| `src/ui/organisms/app-header.tsx` | *(modifié)* la navigation filtrée par capacité |
| `src/ui/shells/app-shell.tsx` | *(modifié)* transmet l'accès |
| `src/app/auth/confirm/route.ts` | *(modifié)* réclame l'invitation à l'atterrissage |

---

## Task 1 : La table des capacités

Fonction pure. **C'est le cœur du jalon** — tout le reste la lit.

**Files:**
- Create: `src/domain/authorization.ts`
- Test: `tests/domain/authorization.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/authorization.test.ts
import { describe, it, expect } from 'vitest'
import {
  AccessError,
  CAPABILITIES,
  assertCan,
  can,
  denial,
  type Access,
  type Capability,
} from '@/domain/authorization'

const PATRON: Access = { plan: 'free', role: 'owner' }
const COMPAGNON: Access = { plan: 'free', role: 'member' }
const PATRON_PRO: Access = { plan: 'pro', role: 'owner' }
const COMPAGNON_PRO: Access = { plan: 'pro', role: 'member' }

describe('la porte du plan', () => {
  it('refuse l equipe a une entreprise gratuite', () => {
    expect(denial(PATRON, 'team.manage')).toBe('plan')
  })

  it('l ouvre a une entreprise Pro', () => {
    expect(can(PATRON_PRO, 'team.manage')).toBe(true)
  })

  it('AUCUNE fonction existante ne passe derriere la porte', () => {
    // **Le test le plus important du jalon** (spec §8). Cette liste EST la
    // decision : y ajouter une ligne, c'est retirer quelque chose a des gens
    // qui l'avaient. Elle doit donc se modifier a la main, jamais par accident.
    const pro = Object.entries(CAPABILITIES)
      .filter(([, required]) => required.plan === 'pro')
      .map(([name]) => name)

    expect(pro).toEqual(['team.manage'])
  })

  it('laisse une entreprise gratuite faire tout le reste', () => {
    const free = (Object.keys(CAPABILITIES) as Capability[]).filter(
      (capability) => capability !== 'team.manage',
    )

    for (const capability of free) expect(can(PATRON, capability)).toBe(true)
  })
})

describe('la porte du role', () => {
  it('laisse le compagnon tenir l agenda et publier au fil de chantier', () => {
    expect(can(COMPAGNON, 'agenda.manage')).toBe(true)
    expect(can(COMPAGNON, 'chantier.post')).toBe(true)
    expect(can(COMPAGNON, 'quote.read')).toBe(true)
  })

  it('lui refuse TOUT ce qui touche a l argent', () => {
    // « Le compagnon fait le chantier, le patron fait l'argent. »
    expect(can(COMPAGNON, 'invoice.issue')).toBe(false)
    expect(can(COMPAGNON, 'payment.record')).toBe(false)
    expect(can(COMPAGNON, 'quote.write')).toBe(false)
    expect(can(COMPAGNON, 'passport.manage')).toBe(false)
  })

  it('donne au responsable tout ce que le compagnon a', () => {
    const ofMember = (Object.keys(CAPABILITIES) as Capability[]).filter(
      (capability) => CAPABILITIES[capability].role === 'member',
    )

    for (const capability of ofMember) expect(can(PATRON, capability)).toBe(true)
  })
})

describe('le refus', () => {
  it('annonce le ROLE avant le plan quand les deux manquent', () => {
    // Dire « offre Pro » a un compagnon lui vendrait quelque chose dont il ne
    // pourrait rien faire, meme une fois l'entreprise abonnee.
    expect(denial(COMPAGNON, 'team.manage')).toBe('role')
    expect(denial(COMPAGNON_PRO, 'team.manage')).toBe('role')
  })

  it('porte sa raison, pour que l ecran reponde autrement dans chaque cas', () => {
    try {
      assertCan(PATRON, 'team.manage')
      expect.unreachable('assertCan aurait du refuser')
    } catch (e) {
      expect(e).toBeInstanceOf(AccessError)
      expect((e as AccessError).reason).toBe('plan')
      expect((e as AccessError).message).toMatch(/Pro/)
    }
  })

  it('dit CE QUI est refuse, pas seulement que c est refuse', () => {
    expect(() => assertCan(COMPAGNON, 'invoice.issue')).toThrow(/facturer/)
    expect(() => assertCan(COMPAGNON, 'payment.record')).toThrow(/paiement/)
  })

  it('ne leve rien quand la capacite est accordee', () => {
    expect(() => assertCan(PATRON, 'invoice.issue')).not.toThrow()
  })
})

describe('can sans acces', () => {
  it('refuse tout a un acces inconnu', () => {
    // Les ecrans du backoffice n'ont aucune appartenance : la navigation ne
    // doit rien leur proposer plutot que tout.
    expect(can(undefined, 'invoice.issue')).toBe(false)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/domain/authorization.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "@/domain/authorization"`.

- [ ] **Step 3 : Écrire le module**

```typescript
// src/domain/authorization.ts

/**
 * Qui peut quoi.
 *
 * **Une seule table, lue par tout le monde** : les actions serveur, les pages,
 * et la navigation. Deux tables — une pour la garde, une pour l'affichage —
 * divergeraient en trois jalons, et l'ecran finirait par proposer ce que le
 * serveur refuse.
 *
 * Deux axes INDEPENDANTS, et il faut qu'ils le restent :
 * - le **plan** dit ce que l'entreprise a paye ;
 * - le **role** dit ce que cette personne-la fait dans l'entreprise.
 *
 * Les confondre donnerait « le compagnon d'une entreprise Pro peut facturer »,
 * ce qui est exactement l'inverse du besoin.
 */

export type Plan = 'free' | 'pro'
export type Role = 'owner' | 'member'

export interface Access {
  plan: Plan
  role: Role
}

/** `owner` CONTIENT `member` : un rang superieur possede tout le rang inferieur. */
const RANK: Record<Role, number> = { member: 0, owner: 1 }

interface Requirement {
  /** Le plan MINIMUM. */
  plan: Plan
  /** Le role MINIMUM. */
  role: Role
  /** Ce qui est refuse, a la premiere personne du verbe. Sert au message. */
  label: string
}

/**
 * Ce que chaque capacite exige.
 *
 * **Ce qui porte `plan: 'pro'` sort du gratuit.** La spec l'ecrit sans
 * exception : le capteur — devis, facture, passeport, agenda, espace demandeur
 * — reste gratuit a vie. Un test dedie verifie que cette liste ne compte
 * qu'une entree, et il echouera au premier ajout distrait.
 */
export const CAPABILITIES = {
  'quote.read': { plan: 'free', role: 'member', label: 'consulter les devis' },
  'quote.write': { plan: 'free', role: 'owner', label: 'établir un devis' },
  'invoice.issue': { plan: 'free', role: 'owner', label: 'facturer' },
  'payment.record': { plan: 'free', role: 'owner', label: 'enregistrer un paiement' },
  'passport.manage': { plan: 'free', role: 'owner', label: 'consulter et défendre le passeport' },
  'legal.write': { plan: 'free', role: 'owner', label: 'modifier les informations de l’entreprise' },
  'agenda.manage': { plan: 'free', role: 'member', label: 'tenir l’agenda' },
  'agenda.sync': { plan: 'free', role: 'owner', label: 'raccorder un agenda extérieur' },
  'chantier.post': { plan: 'free', role: 'member', label: 'publier au fil de chantier' },
  'chantier.complete': { plan: 'free', role: 'owner', label: 'déclarer la fin d’un chantier' },
  'team.manage': { plan: 'pro', role: 'owner', label: 'gérer l’équipe' },
} as const satisfies Record<string, Requirement>

export type Capability = keyof typeof CAPABILITIES

/** Ce qui manque. Les deux appellent des reponses tres differentes. */
export type Denial = 'plan' | 'role'

export class AccessError extends Error {
  constructor(
    readonly reason: Denial,
    message: string,
  ) {
    super(message)
  }
}

/**
 * Ce qui manque pour cette capacite, ou `null` si rien ne manque.
 *
 * **Le role est examine AVANT le plan.** Si les deux manquent, c'est le role
 * qu'on annonce : dire « offre Pro » a un compagnon lui vendrait quelque chose
 * dont il ne pourrait de toute facon rien faire. Un refus insurmontable prime
 * sur un refus commercial.
 */
export function denial(access: Access, capability: Capability): Denial | null {
  const required: Requirement = CAPABILITIES[capability]

  if (RANK[access.role] < RANK[required.role]) return 'role'
  if (required.plan === 'pro' && access.plan !== 'pro') return 'plan'

  return null
}

/**
 * La forme qui sert a l'affichage.
 *
 * `undefined` refuse tout : les ecrans du backoffice n'ont aucune appartenance
 * artisanale, et leur proposer la navigation d'un patron serait un defaut.
 */
export function can(access: Access | undefined, capability: Capability): boolean {
  return access !== undefined && denial(access, capability) === null
}

/** La forme qui garde. Leve une `AccessError` porteuse de sa raison. */
export function assertCan(access: Access, capability: Capability): void {
  const missing = denial(access, capability)
  if (!missing) return

  throw new AccessError(
    missing,
    missing === 'plan'
      ? 'Cette fonction fait partie de l’offre Pro.'
      : `Seul le responsable de l’entreprise peut ${CAPABILITIES[capability].label}.`,
  )
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
pnpm vitest run tests/domain/authorization.test.ts
```

Attendu : PASS, 12 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/authorization.ts tests/domain/authorization.test.ts
git commit -m "feat: la table des capacites, un seul endroit qui dit qui peut quoi"
```

---

## Task 2 : Le plan en base, et la session qui le porte

**Files:**
- Modify: `src/db/schema/company.ts`
- Modify: `src/lib/session.ts`
- Modify: `tests/lib/session.test.ts`
- Create: `supabase/migrations/0017_*.sql` *(généré)*

- [ ] **Step 1 : Ajouter les colonnes au schéma**

Dans `src/db/schema/company.ts`, à la fin des colonnes de `company`, **avant** `createdAt` :

```typescript
  /**
   * L'offre a laquelle l'entreprise est abonnee.
   *
   * `free` par defaut, et c'est structurant : le capteur — devis, facture,
   * passeport, agenda, espace demandeur — reste gratuit a vie. Ce qui passe
   * derriere la porte est ecrit noir sur blanc dans la table des capacites
   * (src/domain/authorization.ts), et rien d'autre.
   *
   * La bascule est MANUELLE, depuis le backoffice. Aucun encaissement n'est
   * automatise en M8 : les dix premiers abonnements se signent au telephone de
   * toute facon, et cela laisse apprendre le prix avant de le figer.
   */
  plan: text('plan', { enum: ['free', 'pro'] })
    .notNull()
    .default('free'),
```

Dans `member`, **avant** `createdAt` :

```typescript
  /**
   * Le retrait d'un membre. `null` tant qu'il a l'acces.
   *
   * **On retire, on n'efface pas.** Le journal garde son identifiant Supabase
   * dans `actor_id` sur tout ce qu'il a fait ; supprimer la ligne rendrait ces
   * faits illisibles. Il perd l'acces, sa trace reste.
   */
  removedAt: timestamp('removed_at', { withTimezone: true }),
```

- [ ] **Step 2 : Générer la migration**

```bash
pnpm db:generate
```

Attendu : un `0017_*.sql` contenant `ALTER TABLE "company" ADD COLUMN "plan"` et `ALTER TABLE "member" ADD COLUMN "removed_at"`. **Ne pas le renommer.**

- [ ] **Step 3 : Écrire les tests de session qui échouent**

Remplacer le contenu de `tests/lib/session.test.ts` concernant `resolveCompany` par :

```typescript
import { describe, it, expect } from 'vitest'
import { SessionError, resolveCompany, resolveRequester } from '@/lib/session'

const USER = { id: 'u1', email: 'a@b.fr' }

describe('resolveCompany', () => {
  it('rejette une session sans utilisateur', () => {
    expect(() => resolveCompany(null, null)).toThrow(SessionError)
  })

  it('rejette un utilisateur sans entreprise rattachee', () => {
    expect(() => resolveCompany(USER, null)).toThrow('Aucune entreprise')
  })

  it('renvoie le role ET le plan', () => {
    // La session est ce que lisent la garde et la navigation : si le plan n'y
    // est pas, chaque ecran devra aller le chercher — et l'un d'eux oubliera.
    expect(resolveCompany(USER, { companyId: 'c1', role: 'owner', plan: 'pro' })).toEqual({
      userId: 'u1',
      email: 'a@b.fr',
      companyId: 'c1',
      role: 'owner',
      plan: 'pro',
    })
  })

  it('distingue les deux causes de rejet, pour que l appelant puisse orienter', () => {
    expect(() => resolveCompany(null, null)).toThrow('Session expiree')
    expect(() => resolveCompany(USER, null)).toThrow('Aucune entreprise')
  })
})
```

*(Le bloc `resolveRequester` reste inchangé.)*

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/lib/session.test.ts
```

Attendu : ÉCHEC — l'objet rendu n'a pas de `plan`.

- [ ] **Step 5 : Faire porter le plan à la session**

Dans `src/lib/session.ts` — remplacer le bloc `Membership` / `Session` / `resolveCompany` / `currentCompany` :

```typescript
import { and, eq, isNull } from 'drizzle-orm'
import type { Access, Plan, Role } from '@/domain/authorization'
import { claimInvitation } from '@/services/membership'

export interface Membership {
  companyId: string
  role: Role
  plan: Plan
}

/**
 * La session de l'artisan.
 *
 * Elle etend `Access` : passee telle quelle a `assertCan` ou a `can`, elle
 * suffit. Rien a recomposer au point d'appel, donc rien a y oublier.
 */
export interface Session extends Access {
  userId: string
  email: string
  companyId: string
}

export function resolveCompany(user: AuthUser | null, membership: Membership | null): Session {
  if (!user) throw new SessionError('Session expiree')
  if (!membership) throw new SessionError('Aucune entreprise rattachee a ce compte')

  return {
    userId: user.id,
    email: user.email,
    companyId: membership.companyId,
    role: membership.role,
    plan: membership.plan,
  }
}

/**
 * L'appartenance ACTIVE, jointe au plan de son entreprise.
 *
 * `removed_at IS NULL` est porteur : sans lui, retirer un membre ne lui
 * retirerait rien. La jointure ne lit qu'une colonne d'une ligne par cle
 * primaire — le cout est nul, et l'alternative (un second appel dans chaque
 * page) se serait oubliee quelque part.
 */
async function activeMembership(userId: string) {
  return db.query.member.findFirst({
    where: and(eq(member.userId, userId), isNull(member.removedAt)),
    with: { company: { columns: { plan: true } } },
  })
}

export async function currentCompany(): Promise<Session> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const row = user ? await activeMembership(user.id) : null

  // Une invitation acceptee APRES une premiere connexion se rattache ici, sans
  // qu'il faille se reconnecter. Uniquement quand il n'y a pas d'appartenance :
  // la tentative ne coute donc rien au cas courant, qui est tous les autres.
  const joined =
    !row && user?.email ? await claimInvitation(user.id, user.email).catch(() => null) : null

  const found = row ?? (joined ? await activeMembership(user!.id) : null)

  return resolveCompany(
    user ? { id: user.id, email: user.email! } : null,
    found ? { companyId: found.companyId, role: found.role, plan: found.company.plan } : null,
  )
}
```

> `claimInvitation` n'existe pas encore — la Task 4 la crée. Écrire l'import maintenant fait échouer la compilation jusque-là : c'est voulu, et c'est pourquoi les deux tâches se commitent l'une après l'autre sans build intermédiaire.

- [ ] **Step 6 : Commit (après la Task 4)**

Cette tâche ne compile qu'une fois la Task 4 écrite. **Enchaîner directement sur les Tasks 3 et 4, puis commiter.**

---

## Task 3 : La bascule du plan, au backoffice

**Files:**
- Create: `src/services/plan.ts`
- Create: `src/app/(admin)/entreprises/page.tsx`
- Create: `src/app/(admin)/entreprises/actions.ts`
- Test: `tests/services/plan.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/services/plan.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { event } from '@/db/schema'
import { assertProPlan, planOf, switchPlan } from '@/services/plan'
import { createCompany } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const STAFF = '00000000-0000-4000-8000-000000000001'

describe('le plan d une entreprise', () => {
  it('naît GRATUIT', async () => {
    // Le defaut n'est pas un detail : une entreprise creee Pro par accident
    // devrait etre retrogradee, c'est-a-dire qu'on lui retirerait quelque
    // chose qu'elle avait.
    expect(await planOf(await createCompany())).toBe('free')
  })

  it('bascule, et le fait s inscrit au journal', async () => {
    const companyId = await createCompany()

    await switchPlan({ companyId, plan: 'pro', by: STAFF })

    expect(await planOf(companyId)).toBe('pro')

    const journal = await db.select().from(event).where(eq(event.companyId, companyId))
    const change = journal.find((row) => row.type === 'company.plan_changed')

    expect(change).toBeDefined()
    expect(change!.actorType).toBe('staff')
    expect(change!.payload).toMatchObject({ from: 'free', to: 'pro' })
  })

  it('n inscrit RIEN quand le plan ne change pas', async () => {
    // Un journal qui enregistre des non-evenements cesse d'etre lisible.
    const companyId = await createCompany()
    const before = await db.$count(event, eq(event.companyId, companyId))

    await switchPlan({ companyId, plan: 'free', by: STAFF })

    expect(await db.$count(event, eq(event.companyId, companyId))).toBe(before)
  })
})

describe('la garde de plan, au niveau du service', () => {
  it('refuse une entreprise gratuite', async () => {
    await expect(assertProPlan(await createCompany())).rejects.toThrow(/Pro/)
  })

  it('laisse passer une entreprise Pro', async () => {
    const companyId = await createCompany()
    await switchPlan({ companyId, plan: 'pro', by: STAFF })

    await expect(assertProPlan(companyId)).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/services/plan.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "@/services/plan"`.

- [ ] **Step 3 : Autoriser l'acteur `staff` au journal**

Dans `src/db/schema/event.ts`, élargir l'énumération :

```typescript
    /**
     * `staff` a ete ajoute en M8 : une bascule d'abonnement est faite par un
     * humain de chez nous. La ranger sous `system` aurait laisse croire qu'elle
     * s'est produite toute seule, ce qui est precisement ce qu'elle n'est pas.
     */
    actorType: text('actor_type', {
      enum: ['company', 'customer', 'system', 'staff'],
    }).notNull(),
```

Dans `src/services/events.ts`, élargir `EventInput` de la même façon :

```typescript
  actorType: 'company' | 'customer' | 'system' | 'staff'
```

> Aucune migration : `text(..., { enum })` de Drizzle est une contrainte TypeScript, pas une contrainte SQL. Si `pnpm db:generate` produit tout de même un fichier, c'est qu'autre chose a bougé — le relire avant de l'accepter.

- [ ] **Step 4 : Écrire le service**

```typescript
// src/services/plan.ts
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { AccessError, type Plan } from '@/domain/authorization'
import { recordEvent } from '@/services/events'

export async function planOf(companyId: string): Promise<Plan> {
  const [row] = await db
    .select({ plan: company.plan })
    .from(company)
    .where(eq(company.id, companyId))

  if (!row) throw new Error('Entreprise introuvable')
  return row.plan
}

/**
 * La garde de plan **au niveau du service**.
 *
 * Doublon apparent avec `requireCapability`, qui n'en est pas un : celle-ci ne
 * connait aucune session, et c'est exactement pourquoi elle existe. Un cron,
 * une reprise de donnees ou une action ecrite dans six mois passeraient a cote
 * du bord serveur ; ils ne passent pas a cote d'ici.
 */
export async function assertProPlan(companyId: string): Promise<void> {
  if ((await planOf(companyId)) !== 'pro') {
    throw new AccessError('plan', 'Cette fonction fait partie de l’offre Pro.')
  }
}

/**
 * Bascule l'abonnement, a la main, depuis le backoffice.
 *
 * Le changement s'inscrit au journal : savoir DEPUIS QUAND une entreprise est
 * Pro sera la premiere question posee le jour d'un litige de facturation.
 * Une bascule sans changement n'inscrit rien — un journal qui enregistre des
 * non-evenements cesse d'etre lisible.
 */
export async function switchPlan(input: {
  companyId: string
  plan: Plan
  by: string
}): Promise<void> {
  const from = await planOf(input.companyId)
  if (from === input.plan) return

  await db.update(company).set({ plan: input.plan }).where(eq(company.id, input.companyId))

  await recordEvent({
    type: 'company.plan_changed',
    subjectType: 'company',
    subjectId: input.companyId,
    companyId: input.companyId,
    actorType: 'staff',
    actorId: input.by,
    payload: { from, to: input.plan },
  })
}
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

```bash
pnpm db:reset && pnpm vitest run tests/services/plan.test.ts
```

Attendu : PASS, 5 tests.

- [ ] **Step 6 : Écrire l'écran du backoffice**

```typescript
// src/app/(admin)/entreprises/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { currentStaff } from '@/lib/staff-session'
import { switchPlan } from '@/services/plan'
import type { Plan } from '@/domain/authorization'

/**
 * La bascule, declenchee par un humain de chez nous.
 *
 * Le plan cible est passe EXPLICITEMENT, jamais deduit de l'etat courant : un
 * bouton « inverser » sur une page rechargee deux fois basculerait deux fois.
 */
export async function setPlan(companyId: string, plan: Plan): Promise<void> {
  const { userId } = await currentStaff()

  await switchPlan({ companyId, plan, by: userId })
  revalidatePath('/entreprises')
}
```

```typescript
// src/app/(admin)/entreprises/page.tsx
import { notFound } from 'next/navigation'
import { desc } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { currentStaff } from '@/lib/staff-session'
import { SessionError } from '@/lib/session'
import { Badge } from '@/ui/atoms/badge'
import { Button } from '@/ui/atoms/button'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { EmptyState } from '@/ui/molecules/empty-state'
import { AppShell } from '@/ui/shells/app-shell'
import { setPlan } from './actions'

/**
 * Les entreprises inscrites, et leur abonnement.
 *
 * Un ecran de gestion, pas un tableau de bord : aucune courbe, aucun compteur.
 * La seule question a laquelle il repond est « cette entreprise a-t-elle
 * l'offre Pro ? », et le seul geste qu'il offre est d'y repondre.
 */
export default async function CompaniesPage() {
  try {
    await currentStaff()
  } catch (e) {
    if (e instanceof SessionError) notFound()
    throw e
  }

  const companies = await db
    .select({
      id: company.id,
      legalName: company.legalName,
      siret: company.siret,
      plan: company.plan,
      createdAt: company.createdAt,
    })
    .from(company)
    .orderBy(desc(company.createdAt))
    .limit(200)

  return (
    <AppShell>
      <div className="flex flex-col gap-1">
        <Heading level={1}>Entreprises</Heading>
        <Text size="sm" tone="soft">
          L’abonnement se bascule ici, à la main. Aucun encaissement n’est automatisé.
        </Text>
      </div>

      {companies.length === 0 ? (
        /* `action` est requis par le composant : `null` quand il n'y a rien à proposer. */
        <EmptyState
          title="Aucune entreprise inscrite"
          description="La première inscription apparaîtra ici."
          action={null}
        />
      ) : (
        <div className="flex flex-col gap-3" data-testid="liste-entreprises">
          {companies.map((row) => (
            <Card key={row.id} elevation="e1">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <Text as="span">{row.legalName}</Text>
                  <Text size="sm" tone="muted" as="span">
                    SIRET {row.siret}
                  </Text>
                </div>

                <div className="flex items-center gap-3">
                  {/* `icon` est obligatoire : la couleur ne porte jamais seule
                      l'information. `clock` pour l'attente du gratuit, `check`
                      pour l'abonnement en cours. */}
                  <Badge
                    tone={row.plan === 'pro' ? 'verified' : 'neutral'}
                    icon={<Icon name={row.plan === 'pro' ? 'check' : 'clock'} size="sm" />}
                  >
                    {row.plan === 'pro' ? 'Pro' : 'Gratuit'}
                  </Badge>

                  <form action={setPlan.bind(null, row.id, row.plan === 'pro' ? 'free' : 'pro')}>
                    <Button type="submit" tone="secondary">
                      {row.plan === 'pro' ? 'Repasser au gratuit' : 'Passer en Pro'}
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}
```

> **Vérifier les props réelles** de `Badge` (`tone`), `Button` (`variant`, `size`) et `Card` (`elevation`) dans `src/ui/` avant de compiler : les noms ci-dessus suivent l'usage des écrans existants, mais c'est le code qui fait foi.

- [ ] **Step 7 : Ajouter le lien depuis la supervision**

Dans `src/app/(admin)/supervision/page.tsx`, à côté du lien vers la file des attestations :

```tsx
        <Link href="/entreprises" tone="bare">
          <span className="text-sm">Entreprises</span>
        </Link>
```

- [ ] **Step 8 : Commit (après la Task 4)**

---

## Task 4 : L'invitation — la table et les gestes du patron

**Files:**
- Modify: `src/db/schema/company.ts`
- Create: `supabase/migrations/9010_single_pending_invitation.sql`
- Create: `src/services/team.ts`
- Create: `src/services/team-mail.ts`
- Create: `src/services/membership.ts`
- Test: `tests/services/team.test.ts`

- [ ] **Step 1 : Ajouter la table au schéma**

Dans `src/db/schema/company.ts`, après `member` :

```typescript
/**
 * Une invitation a rejoindre une entreprise.
 *
 * **Aucun jeton.** L'invitation se reclame par l'ADRESSE, prouvee par le lien
 * magique — exactement comme le dossier du demandeur en M6·A. Un jeton se
 * transfere ; une boite aux lettres, non. La colonne n'aurait ajoute qu'une
 * surface d'attaque pour affaiblir la preuve.
 *
 * Ni acceptee ni revoquee : elle est en attente. Les deux dates cohabitent
 * plutot qu'un statut, pour la meme raison qu'ailleurs — un statut se met a
 * jour, une date s'ecrit une fois et repond « quand ? ».
 */
export const memberInvitation = pgTable(
  'member_invitation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    /** **Toujours normalisee** — voir `normalizeEmail`. C'est la cle d'identite. */
    email: text('email').notNull(),
    role: text('role', { enum: ['owner', 'member'] })
      .notNull()
      .default('member'),
    /** L'identifiant Supabase de celui qui a invite, comme `event.actor_id`. */
    invitedBy: uuid('invited_by').notNull(),
    invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [index('member_invitation_email_idx').on(t.email)],
)
```

- [ ] **Step 2 : Générer la migration, puis écrire l'index partiel**

```bash
pnpm db:generate
```

Puis créer à la main :

```sql
-- supabase/migrations/9010_single_pending_invitation.sql

-- Une seule invitation EN ATTENTE par entreprise et par adresse.
--
-- Ecrite en index partiel plutot qu'en verification applicative : deux clics
-- simultanes sur « Inviter » creeraient sinon deux lignes, dont l'une resterait
-- en attente pour toujours dans la liste du patron. Les invitations acceptees
-- ou revoquees sont hors de l'index — reinviter quelqu'un qu'on a retire doit
-- rester possible.
CREATE UNIQUE INDEX member_invitation_pending_idx
  ON member_invitation (company_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
```

- [ ] **Step 3 : Écrire les tests qui échouent**

```typescript
// tests/services/team.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { member, memberInvitation } from '@/db/schema'
import { inviteMember, revokeInvitation, teamOf } from '@/services/team'
import { switchPlan } from '@/services/plan'
import { createCompany } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

/** Une adresse unique : les tests tournent en parallele sur la meme base. */
const someEmail = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}@test.local`

/**
 * Une entreprise Pro, avec son responsable deja en place.
 *
 * **Un identifiant Supabase NEUF a chaque appel.** `member.user_id` est unique :
 * une constante partagee n'aurait dote que la premiere entreprise du fichier
 * d'un responsable, et les tests suivants auraient porte sur une equipe vide
 * sans que rien ne le signale.
 */
async function proCompany() {
  const companyId = await createCompany()
  await switchPlan({ companyId, plan: 'pro', by: randomUUID() })

  const owner = { id: randomUUID(), email: someEmail('patron') }
  await db
    .insert(member)
    .values({ companyId, userId: owner.id, email: owner.email, role: 'owner' })

  return { companyId, owner }
}

describe('inviter', () => {
  it('REFUSE une entreprise gratuite, au niveau du service', async () => {
    // La garde ne peut pas vivre dans l'ecran : un appel ecrit dans six mois
    // n'y passerait pas.
    const companyId = await createCompany()

    await expect(
      inviteMember({ companyId, email: someEmail('compagnon'), role: 'member', by: randomUUID() }),
    ).rejects.toThrow(/Pro/)
  })

  it('normalise l adresse', async () => {
    const { companyId, owner } = await proCompany()

    await inviteMember({
      companyId,
      email: '  Compagnon@Test.LOCAL ',
      role: 'member',
      by: owner.id,
    })

    const [row] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.companyId, companyId))

    expect(row.email).toBe('compagnon@test.local')
  })

  it('n en cree pas deux pour la meme personne', async () => {
    const { companyId, owner } = await proCompany()
    const invite = {
      companyId,
      email: someEmail('compagnon'),
      role: 'member' as const,
      by: owner.id,
    }

    await inviteMember(invite)
    await inviteMember(invite)

    expect(await db.$count(memberInvitation, eq(memberInvitation.companyId, companyId))).toBe(1)
  })

  it('refuse d inviter quelqu un qui est deja de l equipe', async () => {
    const { companyId, owner } = await proCompany()

    await expect(
      inviteMember({ companyId, email: owner.email, role: 'member', by: owner.id }),
    ).rejects.toThrow(/déjà/)
  })
})

describe('revoquer', () => {
  it('sort l invitation de l attente sans effacer la ligne', async () => {
    const { companyId, owner } = await proCompany()
    await inviteMember({
      companyId,
      email: someEmail('compagnon'),
      role: 'member',
      by: owner.id,
    })

    const [pending] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.companyId, companyId))

    await revokeInvitation(companyId, pending.id)

    expect((await teamOf(companyId)).invitations).toEqual([])

    const [row] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.id, pending.id))
    expect(row.revokedAt).not.toBeNull()
  })

  it('ne revoque RIEN chez une autre entreprise', async () => {
    // Le perimetre par entreprise est porte par la REQUETE, comme partout.
    const mine = await proCompany()
    const rival = await proCompany()
    await inviteMember({
      companyId: rival.companyId,
      email: someEmail('cible'),
      role: 'member',
      by: rival.owner.id,
    })

    const [theirs] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.companyId, rival.companyId))

    await expect(revokeInvitation(mine.companyId, theirs.id)).rejects.toThrow(/introuvable/)

    const [row] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.id, theirs.id))
    expect(row.revokedAt).toBeNull()
  })
})

describe('l equipe', () => {
  it('rend les membres actifs et les invitations en attente', async () => {
    const { companyId, owner } = await proCompany()
    const invited = someEmail('compagnon')
    await inviteMember({ companyId, email: invited, role: 'member', by: owner.id })

    const team = await teamOf(companyId)

    expect(team.members).toHaveLength(1)
    expect(team.members[0].role).toBe('owner')
    expect(team.invitations).toHaveLength(1)
    expect(team.invitations[0].email).toBe(invited)
  })

  it('ne voit PAS l equipe d une autre entreprise', async () => {
    const mine = await proCompany()
    const rival = await proCompany()
    await inviteMember({
      companyId: rival.companyId,
      email: someEmail('cible'),
      role: 'member',
      by: rival.owner.id,
    })

    const team = await teamOf(mine.companyId)

    expect(team.invitations).toEqual([])
    expect(team.members).toHaveLength(1)
    expect(team.members[0].email).toBe(mine.owner.email)
  })
})
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm db:reset && pnpm vitest run tests/services/team.test.ts
```

Attendu : ÉCHEC — `Failed to resolve import "@/services/team"`.

- [ ] **Step 5 : Écrire le courriel**

```typescript
// src/services/team-mail.ts
import { sendRawMail } from '@/services/email'

/**
 * L'invitation a rejoindre une entreprise.
 *
 * **Aucun lien porteur d'autorisation.** Le message renvoie vers la page de
 * connexion ordinaire : c'est le lien magique, demande depuis cette adresse-la,
 * qui prouvera l'identite. Un lien d'invitation transferable aurait fait entrer
 * n'importe quel destinataire dans l'entreprise.
 *
 * Le sujet ne contient ni « connexion » ni « devis » : les parcours de bout en
 * bout retrouvent les messages par leur sujet, et une collision ferait suivre
 * le mauvais lien.
 */
export async function sendInvitation(input: {
  to: string
  companyName: string
  link: string
}): Promise<void> {
  await sendRawMail({
    to: input.to,
    subject: `${input.companyName} vous invite à rejoindre son équipe`,
    text: [
      'Bonjour,',
      '',
      `${input.companyName} vous a ajouté à son équipe sur d’équerre.`,
      '',
      `Connectez-vous avec CETTE adresse pour la rejoindre : ${input.link}`,
      '',
      'Aucun mot de passe : vous recevrez un lien à usage unique.',
      "Si vous n'attendiez pas cette invitation, ignorez ce message.",
    ].join('\n'),
  })
}
```

- [ ] **Step 6 : Écrire le service**

```typescript
// src/services/team.ts
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, member, memberInvitation } from '@/db/schema'
import { normalizeEmail } from '@/domain/requester'
import type { Role } from '@/domain/authorization'
import { assertProPlan } from '@/services/plan'
import { recordEvent } from '@/services/events'
import { sendInvitation } from '@/services/team-mail'

/**
 * `normalizeEmail` vient de `@/domain/requester` : l'adresse s'y normalise
 * deja, et en ecrire une seconde version ferait diverger les deux le jour ou
 * l'une apprendra a gerer un cas de plus.
 */

export interface Team {
  /** `userId` sert a l'ecran a reconnaitre la personne connectee, pour ne pas
      lui proposer de se retirer elle-meme. */
  members: { id: string; userId: string; email: string; name: string | null; role: Role }[]
  invitations: { id: string; email: string; role: Role; invitedAt: Date }[]
}

/** L'equipe d'une entreprise : ses membres actifs, ses invitations en attente. */
export async function teamOf(companyId: string): Promise<Team> {
  const [members, invitations] = await Promise.all([
    db
      .select({
        id: member.id,
        userId: member.userId,
        email: member.email,
        name: member.name,
        role: member.role,
      })
      .from(member)
      .where(and(eq(member.companyId, companyId), isNull(member.removedAt)))
      .orderBy(asc(member.createdAt)),
    db
      .select({
        id: memberInvitation.id,
        email: memberInvitation.email,
        role: memberInvitation.role,
        invitedAt: memberInvitation.invitedAt,
      })
      .from(memberInvitation)
      .where(
        and(
          eq(memberInvitation.companyId, companyId),
          isNull(memberInvitation.acceptedAt),
          isNull(memberInvitation.revokedAt),
        ),
      )
      .orderBy(asc(memberInvitation.invitedAt)),
  ])

  return { members, invitations }
}

/**
 * Invite quelqu'un a rejoindre l'entreprise.
 *
 * La garde de plan est ICI, dans le service — pas seulement au bord serveur.
 * Reinviter une personne deja invitee ne cree pas de seconde ligne : le
 * message repart, ce qui est exactement ce que le patron voulait en recliquant.
 */
export async function inviteMember(input: {
  companyId: string
  email: string
  role: Role
  by: string
}): Promise<void> {
  await assertProPlan(input.companyId)

  const email = normalizeEmail(input.email)
  if (!email.includes('@')) throw new Error('Cette adresse n’est pas valide.')

  const already = await db.query.member.findFirst({
    where: and(
      eq(member.companyId, input.companyId),
      eq(member.email, email),
      isNull(member.removedAt),
    ),
  })
  if (already) throw new Error('Cette personne fait déjà partie de votre équipe.')

  const [entreprise] = await db
    .select({ legalName: company.legalName })
    .from(company)
    .where(eq(company.id, input.companyId))

  const pending = await db.query.memberInvitation.findFirst({
    where: and(
      eq(memberInvitation.companyId, input.companyId),
      eq(memberInvitation.email, email),
      isNull(memberInvitation.acceptedAt),
      isNull(memberInvitation.revokedAt),
    ),
  })

  if (!pending) {
    const [created] = await db
      .insert(memberInvitation)
      .values({ companyId: input.companyId, email, role: input.role, invitedBy: input.by })
      .returning()

    await recordEvent({
      type: 'member.invited',
      subjectType: 'member_invitation',
      subjectId: created.id,
      companyId: input.companyId,
      actorType: 'company',
      actorId: input.by,
      // **Aucune adresse dans le journal.** La lecon de M1 : une donnee
      // personnelle inscrite dans un registre immuable rend le droit a
      // l'effacement structurellement impossible.
      payload: { role: input.role },
    })
  }

  await sendInvitation({
    to: email,
    companyName: entreprise.legalName,
    link: `${process.env.NEXT_PUBLIC_APP_URL}/connexion`,
  })
}

/**
 * Revoque une invitation en attente.
 *
 * Le perimetre par entreprise est porte par la REQUETE. Ecrit comme une
 * verification apres lecture, il laisserait revoquer l'invitation d'une autre
 * entreprise en devinant un identifiant.
 */
export async function revokeInvitation(companyId: string, invitationId: string): Promise<void> {
  const [revoked] = await db
    .update(memberInvitation)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(memberInvitation.id, invitationId),
        eq(memberInvitation.companyId, companyId),
        isNull(memberInvitation.acceptedAt),
        isNull(memberInvitation.revokedAt),
      ),
    )
    .returning()

  if (!revoked) throw new Error('Invitation introuvable.')
}
```

- [ ] **Step 7 : Écrire la réclamation (le côté de l'invité)**

```typescript
// src/services/membership.ts
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { member, memberInvitation } from '@/db/schema'
import { normalizeEmail } from '@/domain/requester'
import { recordEvent } from '@/services/events'

/**
 * Rattache un compte a l'entreprise qui l'a invite.
 *
 * Meme discipline que `claimRequester` : la bascule de l'invitation est un
 * PREDICAT SQL, pas un test JavaScript. Ecrite en JavaScript, elle laisserait
 * deux connexions simultanees creer deux appartenances.
 *
 * **Un compte deja rattache a une entreprise ACTIVE ne rejoint pas la
 * seconde** : `member.user_id` est unique, et il n'existe aujourd'hui aucune
 * notion d'appartenance multiple. L'invitation reste alors en attente, visible
 * de celui qui l'a emise — un blocage qui se voit vaut mieux qu'un
 * rattachement silencieux au mauvais employeur.
 *
 * Un membre RETIRE, lui, peut etre reinvite : sa ligne est ressuscitee plutot
 * que dupliquee, ce qui preserve la continuite de sa trace au journal.
 *
 * Vit a part de `services/team.ts` : celui-la porte les gestes du patron,
 * celui-ci le geste de l'invite. La session importe le second, jamais le
 * premier.
 */
export async function claimInvitation(userId: string, rawEmail: string) {
  const email = normalizeEmail(rawEmail)

  const active = await db.query.member.findFirst({
    where: and(eq(member.userId, userId), isNull(member.removedAt)),
  })
  if (active) return null

  // Une seule invitation a la fois : `UPDATE` ne sait pas se limiter a une
  // ligne, et deux entreprises peuvent avoir invite la meme adresse.
  const pending = await db.query.memberInvitation.findFirst({
    where: and(
      eq(memberInvitation.email, email),
      isNull(memberInvitation.acceptedAt),
      isNull(memberInvitation.revokedAt),
    ),
  })
  if (!pending) return null

  const [accepted] = await db
    .update(memberInvitation)
    .set({ acceptedAt: new Date() })
    .where(
      and(
        eq(memberInvitation.id, pending.id),
        isNull(memberInvitation.acceptedAt),
        isNull(memberInvitation.revokedAt),
      ),
    )
    .returning()

  // Revoquee entre la lecture et l'ecriture : le patron a change d'avis, et il
  // a le dernier mot.
  if (!accepted) return null

  const [joined] = await db
    .insert(member)
    .values({ companyId: accepted.companyId, userId, email, role: accepted.role })
    .onConflictDoUpdate({
      target: member.userId,
      set: { companyId: accepted.companyId, email, role: accepted.role, removedAt: null },
    })
    .returning()

  await recordEvent({
    type: 'member.joined',
    subjectType: 'member',
    subjectId: joined.id,
    companyId: joined.companyId,
    actorType: 'company',
    actorId: userId,
    payload: { role: joined.role },
  })

  return joined
}
```

- [ ] **Step 8 : Lancer les tests pour vérifier qu'ils passent**

```bash
pnpm db:reset && pnpm vitest run tests/services/team.test.ts tests/services/plan.test.ts tests/lib/session.test.ts
```

Attendu : PASS.

- [ ] **Step 9 : Vérifier que tout compile, puis commit**

```bash
pnpm build
```

```bash
git add -A
git commit -m "feat: le plan payant, l'invitation, et la session qui porte les deux"
```

---

## Task 5 : La réclamation à l'atterrissage du lien magique

**Files:**
- Modify: `src/app/auth/confirm/route.ts`
- Test: `tests/services/membership.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/services/membership.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { member, memberInvitation } from '@/db/schema'
import { claimInvitation } from '@/services/membership'
import { inviteMember, revokeInvitation } from '@/services/team'
import { switchPlan } from '@/services/plan'
import { createCompany } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

async function proCompany(): Promise<string> {
  const companyId = await createCompany()
  await switchPlan({ companyId, plan: 'pro', by: randomUUID() })
  return companyId
}

describe('reclamer son invitation', () => {
  it('rattache le compte a l entreprise, avec le role invite', async () => {
    const companyId = await proCompany()
    const email = `compagnon-${randomUUID().slice(0, 8)}@test.local`
    await inviteMember({ companyId, email, role: 'member', by: randomUUID() })

    const userId = randomUUID()
    const joined = await claimInvitation(userId, email.toUpperCase())

    expect(joined).not.toBeNull()
    expect(joined!.companyId).toBe(companyId)
    expect(joined!.role).toBe('member')
  })

  it('ne rend RIEN sans invitation', async () => {
    expect(await claimInvitation(randomUUID(), `inconnu-${randomUUID()}@test.local`)).toBeNull()
  })

  it('ne rend RIEN pour une invitation revoquee', async () => {
    // Le patron a le dernier mot, y compris apres l'envoi du message.
    const companyId = await proCompany()
    const email = `annule-${randomUUID().slice(0, 8)}@test.local`
    await inviteMember({ companyId, email, role: 'member', by: randomUUID() })

    const [pending] = await db
      .select()
      .from(memberInvitation)
      .where(eq(memberInvitation.companyId, companyId))
    await revokeInvitation(companyId, pending.id)

    expect(await claimInvitation(randomUUID(), email)).toBeNull()
  })

  it('ne rattache PAS un compte deja membre d une autre entreprise', async () => {
    // `member.user_id` est unique : le rattacher ailleurs lui ferait perdre son
    // entreprise actuelle sans que personne ne l'ait demande.
    const home = await proCompany()
    const userId = randomUUID()
    const email = `deja-${randomUUID().slice(0, 8)}@test.local`
    await db.insert(member).values({ companyId: home, userId, email, role: 'owner' })

    const elsewhere = await proCompany()
    await inviteMember({ companyId: elsewhere, email, role: 'member', by: randomUUID() })

    expect(await claimInvitation(userId, email)).toBeNull()

    const [row] = await db.select().from(member).where(eq(member.userId, userId))
    expect(row.companyId).toBe(home)
  })

  it('ne consomme l invitation qu UNE fois', async () => {
    const companyId = await proCompany()
    const email = `unique-${randomUUID().slice(0, 8)}@test.local`
    await inviteMember({ companyId, email, role: 'member', by: randomUUID() })

    const userId = randomUUID()
    await claimInvitation(userId, email)
    await claimInvitation(userId, email)

    expect(
      await db.$count(member, and(eq(member.companyId, companyId), eq(member.userId, userId))),
    ).toBe(1)
  })
})
```

- [ ] **Step 2 : Lancer les tests**

```bash
pnpm vitest run tests/services/membership.test.ts
```

Attendu : PASS — le service de la Task 4 les satisfait déjà. **Si l'un échoue, c'est le service qu'il faut corriger, pas le test.**

- [ ] **Step 3 : Brancher la réclamation sur l'atterrissage**

Dans `src/app/auth/confirm/route.ts`, remplacer le bloc `Promise.all` par :

```typescript
      // La connexion est le moment ou une invitation rencontre enfin un compte.
      // **Avant** la lecture de l'appartenance, sans quoi celui qui vient de
      // rejoindre serait envoye au formulaire SIRET de l'inscription.
      //
      // **Hors du chemin critique.** Un echec ici ne doit pas empecher de se
      // connecter : la route sert les DEUX publics, et un incident sur une
      // invitation verrouillerait aussi l'atelier des artisans. La reclamation
      // se rejoue de toute facon a chaque lecture de session.
      if (user?.email) await claimInvitation(user.id, user.email).catch(() => null)

      const [company, account] = await Promise.all([
        user ? db.query.member.findFirst({ where: eq(member.userId, user.id) }) : undefined,
        user?.email ? claimRequester(user.id, user.email).catch(() => null) : null,
      ])
```

Et ajouter l'import :

```typescript
import { claimInvitation } from '@/services/membership'
```

- [ ] **Step 4 : Commit**

```bash
git add -A
git commit -m "feat: l'invitation se reclame a la connexion, par l'adresse"
```

---

## Task 6 : Retirer un membre, sans effacer sa trace

**Files:**
- Modify: `src/services/team.ts`
- Modify: `tests/services/team.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à `tests/services/team.test.ts` :

```typescript
/** Un compagnon de plus dans une entreprise. Rend sa ligne. */
async function hire(companyId: string, role: 'owner' | 'member') {
  const [row] = await db
    .insert(member)
    .values({ companyId, userId: randomUUID(), email: someEmail(role), role })
    .returning()
  return row
}

describe('retirer un membre', () => {
  it('lui retire l acces sans supprimer la ligne', async () => {
    const { companyId, owner } = await proCompany()
    const compagnon = await hire(companyId, 'member')

    await removeMember(companyId, compagnon.id, owner.id)

    const team = await teamOf(companyId)
    expect(team.members.map((row) => row.id)).not.toContain(compagnon.id)

    const [row] = await db.select().from(member).where(eq(member.id, compagnon.id))
    expect(row).toBeDefined()
    expect(row.removedAt).not.toBeNull()
  })

  it('REFUSE de retirer le dernier responsable', async () => {
    // Une entreprise sans responsable est irrecuperable : il faudrait nous
    // appeler pour y rentrer.
    const { companyId, owner } = await proCompany()
    const team = await teamOf(companyId)

    await expect(removeMember(companyId, team.members[0].id, owner.id)).rejects.toThrow(
      /au moins un responsable/,
    )
  })

  it('accepte de retirer UN responsable quand il en reste un autre', async () => {
    const { companyId, owner } = await proCompany()
    const second = await hire(companyId, 'owner')

    await expect(removeMember(companyId, second.id, owner.id)).resolves.toBeUndefined()
  })

  it('ne retire RIEN chez une autre entreprise', async () => {
    const mine = await proCompany()
    const rival = await proCompany()
    const theirs = await hire(rival.companyId, 'member')

    await expect(removeMember(mine.companyId, theirs.id, mine.owner.id)).rejects.toThrow(
      /introuvable/,
    )

    const [row] = await db.select().from(member).where(eq(member.id, theirs.id))
    expect(row.removedAt).toBeNull()
  })
})
```

Compléter l'import en tête de fichier : `import { inviteMember, removeMember, revokeInvitation, teamOf } from '@/services/team'`.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm vitest run tests/services/team.test.ts
```

Attendu : ÉCHEC — `removeMember` n'est pas exportée.

- [ ] **Step 3 : Écrire la fonction**

Dans `src/services/team.ts` :

```typescript
/**
 * Retire un membre de l'equipe.
 *
 * **On retire, on n'efface pas** : `removed_at` plutot qu'un `DELETE`. Le
 * journal garde son identifiant Supabase dans `actor_id` sur tout ce qu'il a
 * fait, et supprimer la ligne rendrait ces faits illisibles. Ses publications
 * au fil de chantier restent, elles aussi — effacer sa trace reecrirait un
 * chantier.
 *
 * **Le dernier responsable ne se retire pas.** Le comptage et l'ecriture
 * tiennent dans une transaction avec verrouillage des lignes concernees : sans
 * elle, deux retraits simultanes verraient chacun deux responsables et
 * laisseraient l'entreprise sans aucun.
 */
export async function removeMember(
  companyId: string,
  memberId: string,
  by: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const active = await tx
      .select({ id: member.id, role: member.role })
      .from(member)
      .where(and(eq(member.companyId, companyId), isNull(member.removedAt)))
      .for('update')

    const target = active.find((row) => row.id === memberId)
    if (!target) throw new Error('Ce membre est introuvable dans votre équipe.')

    const owners = active.filter((row) => row.role === 'owner').length
    if (target.role === 'owner' && owners <= 1) {
      throw new Error('Une entreprise garde au moins un responsable.')
    }

    await tx.update(member).set({ removedAt: new Date() }).where(eq(member.id, memberId))

    await tx.insert(event).values({
      type: 'member.removed',
      subjectType: 'member',
      subjectId: memberId,
      companyId,
      actorType: 'company',
      actorId: by,
      payload: { role: target.role },
    })
  })
}
```

Ajouter `event` à l'import du schéma : `import { company, event, member, memberInvitation } from '@/db/schema'`.

> `recordEvent` n'est pas utilisée ici : elle écrit sur `db`, hors de la transaction. Un retrait annulé aurait alors laissé au journal la trace d'un retrait qui n'a pas eu lieu — exactement le défaut corrigé en M3 sur le préavis.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
pnpm vitest run tests/services/team.test.ts
```

Attendu : PASS.

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat: retirer un membre sans effacer sa trace"
```

---

## Task 7 : La garde au bord serveur, et son application

**Files:**
- Create: `src/lib/access.ts`
- Modify: les douze fichiers d'actions et six pages listés ci-dessous

- [ ] **Step 1 : Écrire le bord serveur**

```typescript
// src/lib/access.ts
import { assertCan, type Capability } from '@/domain/authorization'
import { currentCompany, type Session } from './session'

/**
 * La session, ET la capacite verifiee.
 *
 * A appeler a la place de `currentCompany()` dans toute action qui fait plus
 * que lire. Le refus remonte tel quel : `AccessError` porte sa raison — plan ou
 * role —, et l'appelant s'en sert pour repondre autrement dans chaque cas.
 *
 * Deliberement minuscule : toute la decision vit dans la table des capacites,
 * qui est pure et testee exhaustivement. Ce qui se verifie ici, c'est
 * seulement qu'on a bien appele — et cela se verifie de bout en bout.
 */
export async function requireCapability(capability: Capability): Promise<Session> {
  const session = await currentCompany()
  assertCan(session, capability)
  return session
}
```

- [ ] **Step 2 : Appliquer la garde à chaque action**

Dans chaque fichier, remplacer `await currentCompany()` par `await requireCapability('<capacité>')` et corriger l'import.

| Fichier | Fonctions | Capacité |
|---|---|---|
| `src/actions/invoices.ts` | `issueDeposit`, `issueProgress`, `issueBalance`, `issueCreditNote` | `invoice.issue` |
| `src/app/(app)/factures/actions.ts` | `addPayment` | `payment.record` |
| `src/app/(app)/devis/actions.ts` | `saveQuote` | `quote.write` |
| `src/app/(app)/devis/[id]/modifier/actions.ts` | `editQuote` | `quote.write` |
| `src/app/(app)/devis/[id]/envoyer/actions.ts` | `sendQuote` | `quote.write` |
| `src/app/(app)/devis/[id]/actions.ts` | `amendQuote` | `quote.write` |
| `src/app/(app)/devis/[id]/actions.ts` | `completeChantier` | `chantier.complete` |
| `src/app/(app)/devis/[id]/actions.ts` | `disputeLeadTime`, `writeStatement` | `passport.manage` |
| `src/app/(app)/devis/[id]/actions.ts` | `bookWork` | `agenda.manage` |
| `src/app/(app)/devis/[id]/chantier/actions.ts` | `publish` | `chantier.post` |
| `src/app/(app)/mentions/actions.ts` | `saveLegalMentions` | `legal.write` |
| `src/app/(app)/verification/actions.ts` | `declareActivity`, `removeActivity`, `submitCertificate` | `legal.write` |
| `src/app/(app)/agenda/actions.ts` | `cancel` | `agenda.manage` |
| `src/app/(app)/agenda/nouveau/actions.ts` | `bookVisit` | `agenda.manage` |
| `src/app/(app)/agenda/synchronisation/actions.ts` | `regenerateFeed`, `unlink`, `startLink` | `agenda.sync` |

Exemple, dans `src/actions/invoices.ts` :

```typescript
import { requireCapability } from '@/lib/access'
// ...
  const { companyId } = await requireCapability('invoice.issue')
```

> `currentCompany` reste importée là où elle sert encore ; sinon, retirer l'import — ESLint le signalera.

- [ ] **Step 3 : Garder les pages réservées au responsable**

Six pages doivent renvoyer un membre vers l'atelier plutôt que lui montrer un écran qu'il ne peut pas utiliser. Dans chacune, après le `currentCompany()` existant :

```typescript
import { can } from '@/domain/authorization'
// ...
  if (!can(session, 'invoice.issue')) redirect('/devis')
```

| Page | Capacité |
|---|---|
| `src/app/(app)/factures/page.tsx` | `invoice.issue` |
| `src/app/(app)/factures/[id]/page.tsx` | `invoice.issue` |
| `src/app/(app)/mon-passeport/page.tsx` | `passport.manage` |
| `src/app/(app)/mentions/page.tsx` | `legal.write` |
| `src/app/(app)/verification/page.tsx` | `legal.write` |
| `src/app/(app)/agenda/synchronisation/page.tsx` | `agenda.sync` |

> **Une redirection, pas une page d'explication.** La navigation ne propose déjà pas ces écrans à un membre : celui qui y arrive a tapé l'adresse ou suivi un vieux lien, et le renvoyer chez lui est une réponse suffisante. `/equipe` est le seul écran qui explique, parce qu'il est le seul qu'on veuille faire découvrir.

- [ ] **Step 4 : Vérifier que rien n'a régressé**

```bash
pnpm db:reset && pnpm build && pnpm vitest run
```

Attendu : PASS intégral. **Tous les membres existants sont `owner` et toutes les entreprises sont `free` : par construction, aucune de ces gardes ne doit refuser quoi que ce soit aujourd'hui.** Un seul test rouge signale une capacité mal attribuée.

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat: chaque action serveur declare la capacite qu'elle exige"
```

---

## Task 8 : L'écran d'équipe

**Files:**
- Create: `src/app/(app)/equipe/page.tsx`
- Create: `src/app/(app)/equipe/actions.ts`
- Create: `src/app/(app)/equipe/TeamPanel.tsx`

- [ ] **Step 1 : Les actions**

```typescript
// src/app/(app)/equipe/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireCapability } from '@/lib/access'
import { inviteMember, removeMember, revokeInvitation } from '@/services/team'
import type { Role } from '@/domain/authorization'

export interface TeamState {
  error?: string
  /** Compteur de reussites : sert de cle de remontage au formulaire, qui se vide. */
  saved?: number
}

export async function invite(state: TeamState, form: FormData): Promise<TeamState> {
  const { companyId, userId } = await requireCapability('team.manage')

  try {
    await inviteMember({
      companyId,
      email: String(form.get('email') ?? ''),
      role: form.get('role') === 'owner' ? 'owner' : ('member' as Role),
      by: userId,
    })
  } catch (e) {
    return { error: (e as Error).message, saved: state.saved }
  }

  revalidatePath('/equipe')
  return { saved: (state.saved ?? 0) + 1 }
}

export async function revoke(invitationId: string, state: TeamState): Promise<TeamState> {
  const { companyId } = await requireCapability('team.manage')

  try {
    await revokeInvitation(companyId, invitationId)
  } catch (e) {
    return { error: (e as Error).message, saved: state.saved }
  }

  revalidatePath('/equipe')
  return { saved: (state.saved ?? 0) + 1 }
}

export async function remove(memberId: string, state: TeamState): Promise<TeamState> {
  const { companyId, userId } = await requireCapability('team.manage')

  try {
    await removeMember(companyId, memberId, userId)
  } catch (e) {
    return { error: (e as Error).message, saved: state.saved }
  }

  revalidatePath('/equipe')
  return { saved: (state.saved ?? 0) + 1 }
}
```

- [ ] **Step 2 : La page**

```typescript
// src/app/(app)/equipe/page.tsx
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { denial } from '@/domain/authorization'
import { teamOf } from '@/services/team'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { EmptyState } from '@/ui/molecules/empty-state'
import { AppShell } from '@/ui/shells/app-shell'
import { TeamPanel } from './TeamPanel'

/**
 * L'equipe.
 *
 * **Le seul ecran du produit qui explique sa propre porte.** Ailleurs, un
 * membre est renvoye chez lui sans discours ; ici l'entreprise gratuite doit
 * comprendre ce qu'elle ne voit pas, sans quoi l'offre Pro n'existe pour
 * personne. Les deux refus sont distincts : le plan se resout en nous
 * appelant, le role ne se resout pas du tout.
 */
export default async function TeamPage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/inscription' : '/connexion')
    }
    throw e
  }

  const [current] = await db.select().from(company).where(eq(company.id, session.companyId))
  const missing = denial(session, 'team.manage')

  if (missing === 'role') {
    return (
      <AppShell companyName={current.legalName} access={session}>
        <EmptyState
          title="Réservé au responsable"
          description="Seul le responsable de l’entreprise gère les accès de l’équipe."
          action={null}
        />
      </AppShell>
    )
  }

  if (missing === 'plan') {
    return (
      <AppShell companyName={current.legalName} access={session}>
        <div className="flex flex-col gap-2">
          <Heading level={1}>Votre équipe</Heading>
        </div>
        <EmptyState
          title="L’équipe fait partie de l’offre Pro"
          description="Invitez vos compagnons : ils tiennent l’agenda et publient au fil de chantier, sans jamais toucher à la facturation. Écrivez-nous pour activer l’offre Pro."
          action={null}
        />
        <Text size="sm" tone="muted">
          Tout ce que vous faites aujourd’hui — devis, factures, passeport, agenda, espace
          client — reste gratuit, et le restera.
        </Text>
      </AppShell>
    )
  }

  const team = await teamOf(session.companyId)
  // Toujours trouve : la session VIENT d'une appartenance active a cette
  // entreprise, et `teamOf` lit exactement les memes lignes.
  const me = team.members.find((row) => row.userId === session.userId)

  return (
    <AppShell companyName={current.legalName} access={session}>
      <div className="flex w-full max-w-xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Heading level={1}>Votre équipe</Heading>
          <Text size="sm" tone="soft">
            Un <strong>compagnon</strong> tient l’agenda, publie au fil de chantier et consulte
            les devis. Il ne facture pas, n’encaisse pas et ne voit pas le passeport.
          </Text>
        </div>

        <TeamPanel team={team} meMemberId={me!.id} />
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 3 : Le panneau**

`src/app/(app)/equipe/TeamPanel.tsx` — composant client (`'use client'`), sur le modèle de `src/app/(admin)/supervision/ReviewForm.tsx` pour `useActionState`. Signature :

```typescript
export function TeamPanel({ team, meMemberId }: { team: Team; meMemberId: string })
```

> `meMemberId` est l'identifiant de **ligne `member`**, pas le `userId` de la session : c'est lui que porte chaque bouton « Retirer », et comparer sur autre chose obligerait à un second aller-retour. La page le tire de `team.members.find((row) => row.email === session.email)` — ou, plus sûr, en ajoutant `userId` au `select` de `teamOf`.

Il rend :

1. **Le formulaire d'invitation** — un `Field` « E-mail » (`Input type="email"`, requis) et un `Field` « Rôle » (`Select` : *Compagnon* / *Responsable*), puis un `Button` « Inviter ». L'erreur d'action s'affiche dans un bloc `role="alert"`, comme dans `LegalMentionsForm`.
2. **La liste des membres** — nom ou adresse, un `Badge` portant le rôle (`tone="neutral"`, `icon={<Icon name="check" size="sm" />}` — `icon` est **obligatoire**), et un `Button tone="secondary"` « Retirer » pour chacun **sauf soi-même** (`row.id !== meMemberId`).
3. **Les invitations en attente** — l'adresse, la date d'envoi via `DateText`, et un `Button tone="secondary"` « Annuler l'invitation ».

Contraintes :
- `data-testid="equipe"` sur le conteneur, `data-testid="invitations"` sur la liste d'attente — les parcours s'y accrochent.
- `Button` accepte `tone` et `size` (`md` | `lg`), **pas** `variant` ni `size="sm"`.
- Aucune balise `<button>`, `<input>`, `<select>`, `<label>`, `<p>` ou `<a>` nue : `check:ds` refuse.
- Le fichier reste sous 250 lignes ; si l'invitation et les listes le font déborder, extraire le formulaire dans `InviteForm.tsx` — colocalisé, donc sans impact sur l'inventaire du design system.

- [ ] **Step 4 : Vérifier**

```bash
pnpm check:ds && pnpm check:size && pnpm check:isolation && pnpm build
```

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat: l'ecran d'equipe, et la porte qui s'explique"
```

---

## Task 9 : La navigation filtrée par capacité

**Files:**
- Modify: `src/ui/organisms/app-header.tsx`
- Modify: `src/ui/shells/app-shell.tsx`
- Modify: les quatorze pages sous `src/app/(app)/`

- [ ] **Step 1 : Filtrer l'en-tête**

```typescript
// src/ui/organisms/app-header.tsx
import { can, type Access, type Capability } from '@/domain/authorization'

/**
 * Les ecrans quotidiens, et ce qu'ils exigent.
 *
 * **La navigation lit la MEME table que la garde.** Une seconde liste — « ce
 * qu'on affiche » a cote de « ce qu'on autorise » — divergerait en trois
 * jalons, et l'ecran finirait par proposer ce que le serveur refuse. Un lien
 * qui mene a un refus est pire que pas de lien.
 *
 * Sans `access` — les ecrans du backoffice —, seules les entrees sans exigence
 * subsistent : un relecteur n'appartient a aucune entreprise artisanale.
 */
const NAV: { href: string; label: string; capability?: Capability }[] = [
  { href: '/devis', label: 'Devis' },
  { href: '/factures', label: 'Factures', capability: 'invoice.issue' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/equipe', label: 'Équipe', capability: 'team.manage' },
]

export function AppHeader({ companyName, access }: { companyName?: string; access?: Access }) {
  const entries = NAV.filter((entry) => !entry.capability || can(access, entry.capability))
  // ... le reste inchange, en itérant sur `entries` au lieu de `NAV`
}
```

- [ ] **Step 2 : Transmettre depuis le gabarit**

```typescript
// src/ui/shells/app-shell.tsx
export function AppShell({
  companyName,
  access,
  children,
}: {
  companyName?: string
  /**
   * Ce que cette personne peut. Facultatif : les ecrans du backoffice n'ont
   * aucune appartenance artisanale, et la navigation ne leur propose alors que
   * ce qui n'exige rien.
   */
  access?: Access
  children: React.ReactNode
}) {
  // ... <AppHeader companyName={companyName} access={access} />
}
```

- [ ] **Step 3 : Passer la session à chaque page de l'atelier**

Chacune de ces pages appelle déjà `currentCompany()` et garde le résultat dans `session` (ou l'équivalent). `Session` étend `Access` : la passer telle quelle suffit.

```tsx
    <AppShell companyName={...} access={session}>
```

Pages concernées : `devis/page.tsx`, `devis/nouveau/page.tsx`, `devis/[id]/page.tsx`, `devis/[id]/modifier/page.tsx`, `devis/[id]/chantier/page.tsx`, `factures/page.tsx`, `factures/[id]/page.tsx`, `agenda/page.tsx`, `agenda/nouveau/page.tsx`, `agenda/synchronisation/page.tsx`, `mentions/page.tsx`, `mon-passeport/page.tsx`, `verification/page.tsx`, `equipe/page.tsx`.

> Les deux écrans du backoffice (`supervision`, `attestations`, `entreprises`) **ne passent rien** : c'est voulu.

- [ ] **Step 4 : Vérifier**

```bash
pnpm build && pnpm check:ds
```

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat: la navigation lit la meme table que la garde"
```

---

## Task 10 : Le parcours de bout en bout

**Files:**
- Create: `tests/e2e/team-journey.spec.ts`
- Modify: `tests/e2e/fixtures.ts`

- [ ] **Step 1 : Ajouter la bascule aux fixtures**

Dans `tests/e2e/fixtures.ts` :

```typescript
/**
 * Bascule en Pro l'entreprise d'un artisan connecte.
 *
 * Passe par la base plutot que par le backoffice : la bascule elle-meme est
 * couverte par `tests/services/plan.test.ts`, et ouvrir une session de
 * relecteur ici doublerait la duree du parcours sans rien prouver de plus.
 */
export async function switchToPro(email: string): Promise<void> {
  const { db, schema } = await load()
  const { company, member } = schema

  const userId = await userIdFor(email)
  const [row] = await db.select().from(member).where(eq(member.userId, userId))
  if (!row) throw new Error(`Aucune entreprise pour ${email}`)

  await db.update(company).set({ plan: 'pro' }).where(eq(company.id, row.companyId))
}
```

*(Ajouter `eq` à l'import `drizzle-orm`.)*

- [ ] **Step 2 : Écrire le parcours**

```typescript
// tests/e2e/team-journey.spec.ts
import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { clearMailbox, magicLinkFor, mailboxHas } from './helpers'
import { quoteFor, switchToPro } from './fixtures'

/**
 * Le parcours de M8·A : de la porte fermee au compagnon dans l'atelier.
 *
 * **Deux contextes, deux sessions.** Le verificateur PKCE du lien magique vit
 * dans les cookies du contexte qui l'a demande — et c'est aussi plus fidele :
 * le patron et son compagnon ne partagent pas un navigateur.
 */
const PATRON = `patron-m8-${randomUUID().slice(0, 8)}@test.local`
const COMPAGNON = `compagnon-m8-${randomUUID().slice(0, 8)}@test.local`

test('de la porte fermée au compagnon dans l’atelier', async ({ browser }) => {
  await clearMailbox()

  const shop = await browser.newContext()
  const patron = await shop.newPage()

  await test.step('connexion du patron', async () => {
    await patron.goto('/connexion')
    await patron.getByLabel('E-mail').fill(PATRON)
    await patron.getByRole('button', { name: 'Recevoir le lien' }).click()
    await patron.goto(await magicLinkFor(PATRON))
  })

  await quoteFor(PATRON, 'draft')

  await test.step('l’équipe est fermée, et l’écran dit pourquoi', async () => {
    await patron.goto('/equipe')

    await expect(patron.getByText('L’équipe fait partie de l’offre Pro')).toBeVisible()
    // La promesse du jalon, verifiee a l'ecran : rien de ce qui existait ne
    // passe derriere la porte.
    await expect(patron.getByText(/reste gratuit, et le restera/)).toBeVisible()
    await expect(patron.getByLabel('E-mail')).toHaveCount(0)
  })

  await test.step('passée en Pro, l’entreprise peut inviter', async () => {
    await switchToPro(PATRON)
    await patron.goto('/equipe')

    await patron.getByLabel('E-mail').fill(COMPAGNON)
    await patron.getByRole('button', { name: 'Inviter' }).click()

    await expect(patron.getByTestId('invitations')).toContainText(COMPAGNON)
  })

  await test.step('l’invitation part, sans lien porteur d’autorisation', async () => {
    expect(await mailboxHas('vous invite à rejoindre son équipe')).toBe(true)
  })

  const site = await browser.newContext()
  const compagnon = await site.newPage()

  await test.step('le compagnon se connecte et rejoint l’entreprise', async () => {
    await compagnon.goto('/connexion')
    await compagnon.getByLabel('E-mail').fill(COMPAGNON)
    await compagnon.getByRole('button', { name: 'Recevoir le lien' }).click()
    await compagnon.goto(await magicLinkFor(COMPAGNON))

    // Il atterrit dans l'atelier, pas sur le formulaire SIRET de l'inscription.
    await expect(compagnon).toHaveURL(/\/devis$/)
  })

  await test.step('l’argent ne lui est ni proposé, ni accessible', async () => {
    await expect(compagnon.getByRole('link', { name: 'Factures' })).toHaveCount(0)
    await expect(compagnon.getByRole('link', { name: 'Équipe' })).toHaveCount(0)

    // Et la garde ne vit pas dans la navigation : l'adresse tapée à la main est
    // refusée elle aussi.
    await compagnon.goto('/factures')
    await expect(compagnon).toHaveURL(/\/devis$/)
  })

  await test.step('mais l’agenda, oui — c’est son métier', async () => {
    await compagnon.goto('/agenda')
    await expect(compagnon.getByRole('heading', { level: 1 })).toBeVisible()
  })

  await test.step('retiré, il perd l’accès', async () => {
    await patron.goto('/equipe')
    await patron
      .getByTestId('equipe')
      .getByRole('button', { name: 'Retirer' })
      .first()
      .click()

    await expect(patron.getByTestId('equipe')).not.toContainText(COMPAGNON)

    await compagnon.goto('/agenda')
    // Le compte existe toujours, il n'appartient plus a aucune entreprise.
    await expect(compagnon).toHaveURL(/\/inscription$/)
  })
})
```

- [ ] **Step 3 : Lancer le parcours**

```bash
pnpm test:e2e tests/e2e/team-journey.spec.ts
```

Attendu : PASS, 8 étapes.

- [ ] **Step 4 : Lancer la suite entière**

```bash
pnpm validate && pnpm test:e2e
```

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "test: de la porte fermee au compagnon dans l'atelier"
```

---

## Vérification par mutation

Après le vert intégral, retirer chaque garde une par une et **confirmer que le test échoue**, puis la remettre.

| Ce qu'on retire | Ce qui doit échouer |
|---|---|
| `isNull(member.removedAt)` dans `activeMembership` | Parcours : « retiré, il perd l'accès » |
| `await assertProPlan(...)` dans `inviteMember` | `team.test.ts` : « REFUSE une entreprise gratuite » |
| `role: 'owner'` sur `invoice.issue` dans la table | `authorization.test.ts` : « lui refuse TOUT ce qui touche à l'argent » |
| `if (target.role === 'owner' && owners <= 1)` | `team.test.ts` : « REFUSE de retirer le dernier responsable » |
| `eq(memberInvitation.companyId, companyId)` dans `revokeInvitation` | `team.test.ts` : « ne révoque RIEN chez une autre entreprise » |
| `if (active) return null` dans `claimInvitation` | `membership.test.ts` : « ne rattache PAS un compte déjà membre » |
| `if (from === input.plan) return` dans `switchPlan` | `plan.test.ts` : « n'inscrit RIEN quand le plan ne change pas » |

> Une mutation qui laisse la suite verte signale un test qui ne mesure rien. **Le corriger avant de continuer.**

---

## Vérification manuelle

À faire dans le navigateur, une fois la suite verte :

- [ ] `/equipe` sur une entreprise gratuite montre la porte, et **pas** le formulaire d'invitation.
- [ ] Le backoffice `/entreprises` liste l'entreprise, la bascule en Pro, et la remet au gratuit.
- [ ] Après la bascule, `/equipe` montre le formulaire **sans avoir à se reconnecter** (la session relit le plan à chaque requête).
- [ ] Le courriel d'invitation, dans le collecteur local, **ne contient aucun lien vers `/auth/confirm`** — seulement `/connexion`.
- [ ] Connecté en compagnon, l'en-tête ne montre ni « Factures » ni « Équipe ».
- [ ] Le formulaire d'invitation refuse une adresse déjà membre, avec un message lisible.

---

## Ce que ce plan ne fait pas

- **Aucun encaissement.** La bascule reste manuelle — spec §2.
- **Aucune situation de travaux, aucune retenue de garantie.** Plan B.
- **Aucune relance d'impayé.** Plan C.
- **Aucun troisième rôle**, aucune page publique pour un compagnon.
- **Aucune appartenance multiple.** `member.user_id` reste unique : un intérimaire ou un sous-traitant y buterait, et l'invitation resterait visiblement en attente plutôt que d'échouer en silence.

## Ce qui reste ouvert

- **Le compagnon retiré atterrit sur le formulaire SIRET de l'inscription.** `currentCompany()` ne distingue pas « n'a jamais eu d'entreprise » de « vient d'en être retiré », et les deux mènent à `/inscription`. Le parcours le constate explicitement plutôt que de le masquer. Le réparer demande une troisième lecture en base sur le seul chemin d'échec — à faire le jour où un vrai compagnon le rencontre, pas avant.
- **Retirer un membre ne ferme pas sa session en cours.** Elle expire d'elle-même ; d'ici là il garde l'accès. Une révocation immédiate suppose de toucher aux sessions Supabase, ce qui n'est pas un geste de ce jalon.
- **Le rôle est vérifié, la propriété des données ne l'est pas.** Un compagnon voit tous les chantiers de l'entreprise, pas seulement les siens. C'est volontaire — une entreprise de trois personnes n'a pas de secrets internes — mais c'est à réexaminer si une entreprise de vingt s'inscrit.
