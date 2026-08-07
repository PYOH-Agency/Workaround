# M1 — Le devis qui se signe · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à une entreprise artisanale de s'inscrire avec son SIRET, de rédiger un devis à lignes libres avec TVA multi-taux, de l'envoyer par lien à son client, et de recueillir sa signature horodatée avec piste d'audit.

**Architecture:** Application Next.js unique (App Router, TypeScript), PostgreSQL hébergé sur Supabase en région UE, accès serveur via Drizzle. Supabase fournit l'authentification (magic link) et le stockage de fichiers ; il est utilisé comme Postgres managé, jamais comme framework — les autorisations vivent dans le code applicatif, RLS en défense en profondeur. Le journal d'événements est une table append-only protégée par trigger, dont les métriques du passeport seront dérivées en M4.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · PostgreSQL (Supabase EU) · Drizzle ORM · Supabase Auth · `@react-pdf/renderer` · Vitest · Playwright · pnpm · Node 24

**Référence produit :** [`docs/superpowers/specs/2026-08-07-socle-artisan-design.md`](../specs/2026-08-07-socle-artisan-design.md)

---

## Décisions de conception verrouillées pour ce jalon

**Les montants sont des entiers en centimes.** Jamais de flottant, jamais de `number` pour de l'argent en base. Une erreur d'arrondi sur une facture est un problème comptable, pas un bug d'affichage.

**Le taux de TVA n'est jamais déterminé automatiquement.** L'application propose les trois taux (5,5 / 10 / 20) dans une liste ; l'artisan choisit ligne par ligne et reste responsable. Déterminer le taux à sa place ferait de nous un moteur fiscal et nous rendrait responsables de ses erreurs de déclaration. Le code manipule donc un taux **par ligne**, sans logique métier fiscale.

**La TVA se calcule par groupe de taux, pas par ligne.** On somme les HT de chaque taux, puis on applique le taux au sous-total, puis on arrondit au centime. Arrondir ligne par ligne produit des écarts d'un centime que les comptables refusent.

**Le devis est versionné et immuable une fois envoyé.** Modifier un devis envoyé crée une nouvelle version. Sans cela, la métrique « écart devis → facture » de M4 n'a aucun sens.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/db/schema/*.ts` | Schéma Drizzle, un fichier par agrégat |
| `src/db/client.ts` | Connexion Postgres |
| `src/domain/money.ts` | Arithmétique en centimes |
| `src/domain/devis-totaux.ts` | Calcul des totaux et de la TVA — **pur, sans I/O** |
| `src/domain/siret.ts` | Validation SIRET (algorithme de Luhn) |
| `src/domain/adresse.ts` | Normalisation et empreinte d'adresse pour déduplication |
| `src/lib/supabase-serveur.ts` | Client Supabase côté serveur |
| `src/lib/session.ts` | Résolution de la session et de l'entreprise courante |
| `src/services/sirene.ts` | Client de l'API Sirene |
| `src/services/chantier.ts` | Création d'un chantier, déduplication du logement |
| `src/services/devis-public.ts` | Chargement par token public, règle d'envoi |
| `src/services/courriel.ts` | Envoi du lien de devis |
| `src/services/horodatage.ts` | Jeton d'horodatage RFC 3161 |
| `src/services/evenements.ts` | Écriture dans le journal |
| `src/services/signature.ts` | Piste d'audit et horodatage |
| `src/pdf/devis-pdf.tsx` | Rendu PDF du devis |
| `src/app/(app)/**` | Interface entreprise, authentifiée |
| `src/app/devis/[token]/**` | Page publique de consultation et signature |
| `tests/**` | Miroir de `src/` |

Le domaine (`src/domain/`) ne connaît ni la base, ni le réseau, ni React. C'est là qu'est la logique qui mérite d'être testée finement.

---

## Task 1 : Lever la question de la signature électronique

Tâche d'investigation. **Aucun code.** Elle bloque la Task 12 et doit être faite en premier — la valeur probante de la signature est le pivot de tout le système de mesure du passeport (§9 du spec).

**Files:**
- Create: `docs/superpowers/research/2026-08-07-signature-electronique.md`

- [ ] **Step 1 : Établir les faits juridiques**

Répondre par écrit, sources à l'appui :
- Quelle est la valeur juridique d'une signature électronique **simple** sur un devis de travaux en droit français ? (point de départ : article 1367 du Code civil)
- Sur qui pèse la charge de la preuve en cas de contestation ?
- Un horodatage qualifié RFC 3161 déplace-t-il cette charge, et dans quelle mesure ?

- [ ] **Step 2 : Choisir une autorité d'horodatage**

Identifier au moins deux autorités d'horodatage (TSA) RFC 3161 utilisables, dont une gratuite. Noter l'URL du service, les limites d'usage et la bibliothèque Node permettant de demander un jeton.

- [ ] **Step 3 : Chiffrer l'alternative payante**

Relever le tarif par document d'au moins deux prestataires français qualifiés eIDAS. Calculer le coût mensuel pour 200 entreprises émettant 20 devis par mois. Ce chiffre décide si l'option prestataire reste bien reportée à M7.

- [ ] **Step 4 : Écrire la décision**

Le document doit conclure par la composition exacte de la piste d'audit à implémenter en Task 12 : quels champs, quel algorithme de hachage, quelle TSA, quelles confirmations envoyées.

- [ ] **Step 5 : Commit**

```bash
git add docs/superpowers/research/2026-08-07-signature-electronique.md
git commit -m "research: valeur probante de la signature electronique du devis"
```

---

## Task 2 : Initialiser le projet

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `drizzle.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1 : Créer l'application**

```bash
pnpm create next-app@latest . --typescript --app --src-dir --eslint --tailwind --turbopack --import-alias "@/*"
```

> **Trois pièges rencontrés à l'exécution :**
> - `pnpm` peut ne pas être installé — `corepack enable pnpm` suffit, Node 24 embarque corepack.
> - Le dossier du projet s'appelle `Workaround`, avec une majuscule que npm refuse comme nom de paquet : `create-next-app .` échoue. Générer dans un dossier temporaire au nom valide, puis rapatrier en excluant `.git`, `node_modules`, `.next`, `README.md` et `.gitignore`.
> - pnpm 11 bloque les scripts de post-installation. `esbuild` (dont dépend Vitest) et `supabase` en ont besoin : les autoriser dans **`pnpm-workspace.yaml`** sous `allowBuilds` — pnpm 11 ne lit plus le champ `pnpm` de `package.json`.

- [ ] **Step 2 : Ajouter les dépendances**

```bash
pnpm add drizzle-orm postgres @supabase/supabase-js @supabase/ssr @react-pdf/renderer zod
pnpm add -D drizzle-kit vitest @vitejs/plugin-react @playwright/test dotenv
```

- [ ] **Step 3 : Configurer Vitest**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
})
```

```typescript
// tests/setup.ts
import { config } from 'dotenv'
config({ path: '.env.test' })
```

Les tests attaquent la base locale. Remettre la base a zero avant une suite complete :

```json
// package.json, extrait
"scripts": {
  "test": "supabase db reset && vitest run",
  "test:unit": "vitest run tests/domain tests/lib"
}
```

`test:unit` ne touche pas la base : le domaine (`src/domain/`) est pur et se teste sans rien demarrer.

- [ ] **Step 4 : Démarrer la pile Supabase locale**

Développement et tests tournent **en local**, pas sur un projet distant. Un seul projet Supabase distant sera créé plus tard, pour le déploiement.

```bash
pnpm add -D supabase
pnpm supabase init
pnpm supabase start
```

`supabase start` lance Postgres, GoTrue (authentification), Storage et un collecteur d'e-mails local. Trois raisons de faire ainsi plutôt que d'ouvrir un projet distant de test :

- **Vitesse.** Les tests attaquent Postgres par une socket locale au lieu d'un aller-retour réseau vers Francfort. Sur une suite entière, c'est l'écart entre quelques secondes et plusieurs minutes.
- **`supabase db reset` remet la base à zéro** et rejoue toutes les migrations. Indispensable : nos tests manipulent des déclencheurs et suppriment des lignes.
- **Auth et Storage sont disponibles localement**, ce dont la Task 15 a besoin — et les e-mails de lien magique sont capturés localement au lieu d'être réellement envoyés.

Prérequis : Docker doit tourner.

- [ ] **Step 5 : Configurer Drizzle vers les migrations Supabase**

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema/*.ts',
  // On ecrit dans le dossier de migrations de Supabase : une seule chaine de
  // migrations, appliquee a l'identique en local (db reset) et en distant (db push).
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config
```

> **Note pour l'implémenteur :** Supabase applique les migrations dans l'ordre lexicographique des noms de fichiers ; Drizzle génère `0000_…`, `0001_…`, ce qui convient. **Vérifier néanmoins qu'un `supabase db reset` rejoue bien les fichiers générés par Drizzle** avant d'aller plus loin — c'est le point de friction connu entre les deux outils. En cas de conflit, renommer les fichiers Drizzle au format horodaté attendu par Supabase.

- [ ] **Step 6 : Déclarer les variables d'environnement**

`supabase start` affiche les URLs et les clés locales. Les reporter dans `.env.local` et `.env.test` :

```bash
# .env.example
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000
SEL_CODE_SMS=
```

- [ ] **Step 7 : Vérifier que tout démarre**

Run: `pnpm dev`
Expected: l'application répond sur `http://localhost:3000`

Run: `pnpm supabase status`
Expected: les services Postgres, Auth, Storage et le collecteur d'e-mails sont listés comme démarrés

Run: `pnpm vitest run`
Expected: `No test files found` — la configuration est valide.

- [ ] **Step 8 : Commit**

```bash
git add -A
git commit -m "chore: initialisation Next.js, Supabase local, Drizzle, Vitest, Playwright"
```

> **Le projet Supabase distant** n'est nécessaire qu'au premier déploiement. Il devra être créé **en région UE** (`eu-west-3` ou `eu-central-1`) — **la région se fixe à la création et ne se change jamais.** Le schéma y sera poussé par `supabase db push`, à partir de la même chaîne de migrations.

---

## Task 3 : L'arithmétique en centimes

Premier vrai code, et il est fondateur : tout le reste en dépend.

**Files:**
- Create: `src/domain/money.ts`
- Test: `tests/domain/money.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/money.test.ts
import { describe, it, expect } from 'vitest'
import { euros, centimes, multiplier, appliquerTaux, formater } from '../../src/domain/money'

describe('money', () => {
  it('convertit des euros en centimes', () => {
    expect(euros('1250.50')).toBe(125050)
    expect(euros('0.01')).toBe(1)
    expect(euros('1250')).toBe(125000)
  })

  it('refuse plus de deux decimales', () => {
    expect(() => euros('10.123')).toThrow('deux decimales')
  })

  it('multiplie un montant par une quantite decimale en arrondissant au centime', () => {
    // 12,50 EUR x 3,5 = 43,75 EUR
    expect(multiplier(1250, '3.5')).toBe(4375)
    // 10,00 EUR x 0,333 = 3,33 EUR (arrondi au superieur a partir de 0,5)
    expect(multiplier(1000, '0.333')).toBe(333)
    expect(multiplier(1000, '0.335')).toBe(335)
  })

  it('applique un taux de TVA en arrondissant au centime superieur a 0,5', () => {
    // 1000,00 EUR a 5,5 % = 55,00 EUR
    expect(appliquerTaux(100000, 550)).toBe(5500)
    // 33,33 EUR a 20 % = 6,666 -> 6,67 EUR
    expect(appliquerTaux(3333, 2000)).toBe(667)
  })

  it('formate en euros', () => {
    expect(formater(125050)).toBe('1 250,50')
    expect(formater(0)).toBe('0,00')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/domain/money.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/domain/money"`

- [ ] **Step 3 : Implémenter**

```typescript
// src/domain/money.ts

/** Tous les montants sont des entiers en centimes. Jamais de flottant. */
export type Centimes = number

/** Un taux est exprime en centiemes de pourcent : 20 % => 2000, 5,5 % => 550. */
export type Taux = number

export function euros(valeur: string): Centimes {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(valeur.trim())
  if (!match) throw new Error(`Montant invalide (au plus deux decimales) : ${valeur}`)

  const [, signe, entier, decimales = ''] = match
  const total = Number(entier) * 100 + Number(decimales.padEnd(2, '0'))

  if (!Number.isSafeInteger(total)) throw new Error(`Montant hors limites : ${valeur}`)

  // Le signe est lu dans la chaine, jamais deduit du nombre : '-0.50' a une
  // partie entiere nulle, dont le signe est perdu des la conversion.
  return signe === '-' ? -total : total
}

export const centimes = (n: number): Centimes => Math.trunc(n)

/** Arrondi commercial : 0,5 s'arrondit vers le haut en valeur absolue. */
function arrondir(valeur: number): number {
  return valeur < 0 ? -Math.round(-valeur) : Math.round(valeur)
}

export function multiplier(montant: Centimes, quantite: string): Centimes {
  const q = Number(quantite)
  if (!Number.isFinite(q)) throw new Error(`Quantite invalide : ${quantite}`)
  return arrondir(montant * q)
}

export function appliquerTaux(montant: Centimes, taux: Taux): Centimes {
  return arrondir((montant * taux) / 10000)
}

export function formater(montant: Centimes): string {
  const signe = montant < 0 ? '-' : ''
  const absolu = Math.abs(montant)
  const entier = Math.trunc(absolu / 100).toLocaleString('fr-FR').replace(/ | /g, ' ')
  const decimales = String(absolu % 100).padStart(2, '0')
  return `${signe}${entier},${decimales}`
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/money.test.ts`
Expected: PASS — 6 tests

> **Deux pièges corrigés à l'exécution :**
> - Le signe ne peut pas être déduit de la partie entière : `-0.50` a une partie entière nulle, dont le signe disparaît à la conversion. Il se lit dans la chaîne. Un test couvre le cas.
> - **Ne pas utiliser de littéraux `BigInt`** (`100n`). L'étape de vérification TypeScript de Next.js impose sa propre cible de compilation, inférieure à ES2020, et les rejette — alors que `tsc` seul les accepte. BigInt était de toute façon inutile : les centimes tiennent dans un entier JS sûr jusqu'à environ 90 000 milliards d'euros.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/money.ts tests/domain/money.test.ts
git commit -m "feat: arithmetique monetaire en centimes"
```

---

## Task 4 : Le calcul des totaux d'un devis

Le cœur métier du jalon. Fonction pure, aucune dépendance.

**Files:**
- Create: `src/domain/devis-totaux.ts`
- Test: `tests/domain/devis-totaux.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/devis-totaux.test.ts
import { describe, it, expect } from 'vitest'
import { calculerTotaux, type LigneCalcul } from '../../src/domain/devis-totaux'

const ligne = (p: Partial<LigneCalcul> = {}): LigneCalcul => ({
  quantite: '1',
  prixUnitaireHT: 10000,
  tauxTVA: 2000,
  ...p,
})

describe('calculerTotaux', () => {
  it('renvoie zero pour un devis vide', () => {
    expect(calculerTotaux([])).toEqual({ totalHT: 0, totalTVA: 0, totalTTC: 0, parTaux: [] })
  })

  it('calcule une ligne simple a 20 %', () => {
    const r = calculerTotaux([ligne()])
    expect(r.totalHT).toBe(10000)
    expect(r.totalTVA).toBe(2000)
    expect(r.totalTTC).toBe(12000)
  })

  it('applique la quantite au prix unitaire', () => {
    const r = calculerTotaux([ligne({ quantite: '2.5', prixUnitaireHT: 4000 })])
    expect(r.totalHT).toBe(10000)
  })

  it('regroupe la TVA par taux et arrondit sur le sous-total, pas ligne par ligne', () => {
    // Trois lignes a 33,33 EUR HT en TVA 20 %.
    // Arrondi ligne par ligne : 6,67 x 3 = 20,01 EUR. Faux.
    // Arrondi sur le sous-total : 99,99 x 20 % = 19,998 -> 20,00 EUR. Correct.
    const lignes = [ligne({ prixUnitaireHT: 3333 }), ligne({ prixUnitaireHT: 3333 }), ligne({ prixUnitaireHT: 3333 })]
    const r = calculerTotaux(lignes)
    expect(r.totalHT).toBe(9999)
    expect(r.totalTVA).toBe(2000)
    expect(r.totalTTC).toBe(11999)
  })

  it('ventile plusieurs taux et les trie par taux croissant', () => {
    const r = calculerTotaux([
      ligne({ prixUnitaireHT: 100000, tauxTVA: 2000 }),
      ligne({ prixUnitaireHT: 200000, tauxTVA: 550 }),
      ligne({ prixUnitaireHT: 50000, tauxTVA: 1000 }),
    ])
    expect(r.totalHT).toBe(350000)
    expect(r.parTaux).toEqual([
      { taux: 550, baseHT: 200000, montantTVA: 11000 },
      { taux: 1000, baseHT: 50000, montantTVA: 5000 },
      { taux: 2000, baseHT: 100000, montantTVA: 20000 },
    ])
    expect(r.totalTVA).toBe(36000)
    expect(r.totalTTC).toBe(386000)
  })

  it('gere une ligne negative (remise)', () => {
    const r = calculerTotaux([ligne({ prixUnitaireHT: 100000 }), ligne({ prixUnitaireHT: -10000 })])
    expect(r.totalHT).toBe(90000)
    expect(r.totalTVA).toBe(18000)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/domain/devis-totaux.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/domain/devis-totaux.ts
import { appliquerTaux, multiplier, type Centimes, type Taux } from './money'

export interface LigneCalcul {
  quantite: string
  prixUnitaireHT: Centimes
  tauxTVA: Taux
}

export interface VentilationTaux {
  taux: Taux
  baseHT: Centimes
  montantTVA: Centimes
}

export interface Totaux {
  totalHT: Centimes
  totalTVA: Centimes
  totalTTC: Centimes
  parTaux: VentilationTaux[]
}

export function calculerTotaux(lignes: LigneCalcul[]): Totaux {
  const bases = new Map<Taux, Centimes>()

  for (const l of lignes) {
    const montantHT = multiplier(l.prixUnitaireHT, l.quantite)
    bases.set(l.tauxTVA, (bases.get(l.tauxTVA) ?? 0) + montantHT)
  }

  const parTaux = [...bases.entries()]
    .sort(([a], [b]) => a - b)
    .map(([taux, baseHT]) => ({ taux, baseHT, montantTVA: appliquerTaux(baseHT, taux) }))

  const totalHT = parTaux.reduce((s, v) => s + v.baseHT, 0)
  const totalTVA = parTaux.reduce((s, v) => s + v.montantTVA, 0)

  return { totalHT, totalTVA, totalTTC: totalHT + totalTVA, parTaux }
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/devis-totaux.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5 : Commit**

```bash
git add src/domain/devis-totaux.ts tests/domain/devis-totaux.test.ts
git commit -m "feat: calcul des totaux de devis avec ventilation TVA par taux"
```

---

## Task 5 : Validation du SIRET

**Files:**
- Create: `src/domain/siret.ts`
- Test: `tests/domain/siret.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/siret.test.ts
import { describe, it, expect } from 'vitest'
import { siretValide, normaliserSiret } from '../../src/domain/siret'

describe('siret', () => {
  it('supprime espaces et points avant validation', () => {
    expect(normaliserSiret(' 552 100 554 00021 ')).toBe('55210055400021')
  })

  it('accepte un SIRET dont la cle de Luhn est correcte', () => {
    expect(siretValide('55210055400021')).toBe(true)
  })

  it('refuse un SIRET dont un chiffre a ete altere', () => {
    expect(siretValide('55210055400022')).toBe(false)
  })

  it('refuse une longueur incorrecte ou des caracteres non numeriques', () => {
    expect(siretValide('123')).toBe(false)
    expect(siretValide('5521005540002A')).toBe(false)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/domain/siret.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/domain/siret.ts

export function normaliserSiret(valeur: string): string {
  return valeur.replace(/[\s.\-]/g, '')
}

/** Cle de Luhn sur 14 chiffres. */
export function siretValide(valeur: string): boolean {
  const s = normaliserSiret(valeur)
  if (!/^\d{14}$/.test(s)) return false

  let somme = 0
  for (let i = 0; i < 14; i++) {
    let chiffre = Number(s[i])
    // Les positions paires (index 0, 2, ...) sont doublees.
    if (i % 2 === 0) {
      chiffre *= 2
      if (chiffre > 9) chiffre -= 9
    }
    somme += chiffre
  }
  return somme % 10 === 0
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/siret.test.ts`
Expected: PASS — 4 tests

> **Note pour l'implémenteur :** La Poste (SIREN 356000000) est une exception documentée à l'algorithme de Luhn. Elle n'est pas gérée ici volontairement — aucune entreprise artisanale n'est concernée. Si un cas réel apparaît, ajouter un test avant de coder l'exception.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/siret.ts tests/domain/siret.test.ts
git commit -m "feat: validation du SIRET par cle de Luhn"
```

---

## Task 6 : Normalisation et empreinte d'adresse

Deux entreprises différentes intervenant sur le même logement doivent aboutir au **même** enregistrement `logement` — c'est ce qui rend possible la vue consolidée du demandeur (§10 du spec).

**Files:**
- Create: `src/domain/adresse.ts`
- Test: `tests/domain/adresse.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/domain/adresse.test.ts
import { describe, it, expect } from 'vitest'
import { empreinteAdresse, normaliserLigne } from '../../src/domain/adresse'

describe('adresse', () => {
  it('normalise casse, accents, ponctuation et abreviations', () => {
    expect(normaliserLigne('12, Rue Fondaudège')).toBe('12 rue fondaudege')
    expect(normaliserLigne('12 R. Fondaudege')).toBe('12 rue fondaudege')
    expect(normaliserLigne('5 BD  du Président Wilson')).toBe('5 boulevard du president wilson')
  })

  it('produit la meme empreinte pour deux ecritures de la meme adresse', () => {
    const a = empreinteAdresse({ ligne1: '12, Rue Fondaudège', codePostal: '33000', ville: 'Bordeaux' })
    const b = empreinteAdresse({ ligne1: '12 r. fondaudege', codePostal: '33 000', ville: 'BORDEAUX' })
    expect(a).toBe(b)
  })

  it('produit des empreintes differentes pour deux numeros differents', () => {
    const a = empreinteAdresse({ ligne1: '12 rue Fondaudege', codePostal: '33000', ville: 'Bordeaux' })
    const b = empreinteAdresse({ ligne1: '14 rue Fondaudege', codePostal: '33000', ville: 'Bordeaux' })
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/domain/adresse.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/domain/adresse.ts
import { createHash } from 'node:crypto'

const ABREVIATIONS: Record<string, string> = {
  r: 'rue', av: 'avenue', ave: 'avenue', bd: 'boulevard', bld: 'boulevard',
  imp: 'impasse', pl: 'place', rte: 'route', che: 'chemin', chem: 'chemin',
  all: 'allee', sq: 'square', crs: 'cours', qu: 'quai', st: 'saint', ste: 'sainte',
}

export function normaliserLigne(valeur: string): string {
  const sansAccents = valeur.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return sansAccents
    .toLowerCase()
    .replace(/[.,;:'"]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((mot) => ABREVIATIONS[mot] ?? mot)
    .join(' ')
}

export interface Adresse {
  ligne1: string
  codePostal: string
  ville: string
}

/** Empreinte stable servant a dedupliquer un logement entre plusieurs entreprises. */
export function empreinteAdresse(adresse: Adresse): string {
  const parties = [
    normaliserLigne(adresse.ligne1),
    adresse.codePostal.replace(/\s/g, ''),
    normaliserLigne(adresse.ville),
  ]
  return createHash('sha256').update(parties.join('|')).digest('hex')
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/domain/adresse.test.ts`
Expected: PASS — 3 tests

> **Limite assumée :** cette empreinte ne distingue pas deux appartements d'un même immeuble si le complément d'adresse n'est pas saisi. C'est acceptable en M1 (le demandeur revendique son logement à la signature) mais devra être traité en M5, quand plusieurs demandeurs pourront revendiquer la même adresse. Ne pas l'oublier.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/adresse.ts tests/domain/adresse.test.ts
git commit -m "feat: normalisation d'adresse et empreinte de deduplication"
```

---

## Task 7 : Le schéma de base

**Files:**
- Create: `src/db/schema/entreprise.ts`, `src/db/schema/chantier.ts`, `src/db/schema/devis.ts`, `src/db/schema/evenement.ts`, `src/db/schema/index.ts`
- Create: `src/db/client.ts`
- Create: `drizzle/0001_journal_immuable.sql`

- [ ] **Step 1 : Écrire le schéma des entreprises et des logements**

```typescript
// src/db/schema/entreprise.ts
import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core'

export const entreprise = pgTable('entreprise', {
  id: uuid('id').primaryKey().defaultRandom(),
  siret: text('siret').notNull().unique(),
  raisonSociale: text('raison_sociale').notNull(),
  formeJuridique: text('forme_juridique'),
  adresseLigne1: text('adresse_ligne1'),
  codePostal: text('code_postal'),
  ville: text('ville'),
  dateCreationEntreprise: timestamp('date_creation_entreprise', { withTimezone: true }),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
})

export const membre = pgTable('membre', {
  id: uuid('id').primaryKey().defaultRandom(),
  entrepriseId: uuid('entreprise_id').notNull().references(() => entreprise.id),
  // Identifiant de l'utilisateur dans auth.users de Supabase.
  utilisateurId: uuid('utilisateur_id').notNull().unique(),
  email: text('email').notNull(),
  nom: text('nom'),
  role: text('role', { enum: ['proprietaire', 'collaborateur'] }).notNull().default('proprietaire'),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
})

export const logement = pgTable('logement', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Empreinte issue de src/domain/adresse.ts — garantit l'unicite entre entreprises.
  empreinte: text('empreinte').notNull().unique(),
  adresseLigne1: text('adresse_ligne1').notNull(),
  complement: text('complement'),
  codePostal: text('code_postal').notNull(),
  ville: text('ville').notNull(),
  anneeConstruction: integer('annee_construction'),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('logement_code_postal_idx').on(t.codePostal)])
```

- [ ] **Step 2 : Écrire le schéma des chantiers et des clients**

```typescript
// src/db/schema/chantier.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { entreprise, logement } from './entreprise'

export const client = pgTable('client', {
  id: uuid('id').primaryKey().defaultRandom(),
  entrepriseId: uuid('entreprise_id').notNull().references(() => entreprise.id),
  nom: text('nom').notNull(),
  email: text('email').notNull(),
  // Obligatoire a l'envoi d'un devis : porte l'identification du signataire par SMS.
  telephone: text('telephone'),
  // Determine l'obligation applicable en M2 : e-invoicing pour un professionnel,
  // e-reporting pour un particulier. Le SIRET du client est exige en B2B.
  // Ajoute des M1 : le collecter plus tard supposerait de rappeler tous les clients deja saisis.
  type: text('type', { enum: ['particulier', 'professionnel'] }).notNull().default('particulier'),
  siret: text('siret'),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
})

export const chantier = pgTable('chantier', {
  id: uuid('id').primaryKey().defaultRandom(),
  entrepriseId: uuid('entreprise_id').notNull().references(() => entreprise.id),
  clientId: uuid('client_id').notNull().references(() => client.id),
  logementId: uuid('logement_id').notNull().references(() => logement.id),
  libelle: text('libelle').notNull(),
  statut: text('statut', { enum: ['brouillon', 'en_cours', 'termine', 'abandonne'] })
    .notNull().default('brouillon'),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 3 : Écrire le schéma des devis**

```typescript
// src/db/schema/devis.ts
import { pgTable, uuid, text, timestamp, integer, numeric, unique } from 'drizzle-orm/pg-core'
import { entreprise } from './entreprise'
import { chantier } from './chantier'

export const devis = pgTable('devis', {
  id: uuid('id').primaryKey().defaultRandom(),
  chantierId: uuid('chantier_id').notNull().references(() => chantier.id),
  numero: text('numero').notNull(),
  version: integer('version').notNull().default(1),
  statut: text('statut', { enum: ['brouillon', 'envoye', 'signe', 'refuse', 'expire'] })
    .notNull().default('brouillon'),
  // Engagement de delai en jours ouvres. Obligatoire a l'envoi (cf. spec §9).
  delaiEngageJours: integer('delai_engage_jours'),
  totalHT: integer('total_ht').notNull().default(0),
  totalTVA: integer('total_tva').notNull().default(0),
  totalTTC: integer('total_ttc').notNull().default(0),
  tokenPublic: text('token_public').notNull().unique(),
  envoyeLe: timestamp('envoye_le', { withTimezone: true }),
  signeLe: timestamp('signe_le', { withTimezone: true }),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique('devis_numero_version_uq').on(t.numero, t.version)])

export const ligneDevis = pgTable('ligne_devis', {
  id: uuid('id').primaryKey().defaultRandom(),
  devisId: uuid('devis_id').notNull().references(() => devis.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  libelle: text('libelle').notNull(),
  unite: text('unite').notNull().default('u'),
  quantite: numeric('quantite', { precision: 12, scale: 3 }).notNull(),
  prixUnitaireHT: integer('prix_unitaire_ht').notNull(),
  tauxTVA: integer('taux_tva').notNull(),
})

/** Code a usage unique envoye par SMS. Le code n'est jamais stocke en clair. */
export const codeSignature = pgTable('code_signature', {
  id: uuid('id').primaryKey().defaultRandom(),
  devisId: uuid('devis_id').notNull().references(() => devis.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  telephone: text('telephone').notNull(),
  expireLe: timestamp('expire_le', { withTimezone: true }).notNull(),
  tentatives: integer('tentatives').notNull().default(0),
  valideLe: timestamp('valide_le', { withTimezone: true }),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
})

export const signature = pgTable('signature', {
  id: uuid('id').primaryKey().defaultRandom(),
  devisId: uuid('devis_id').notNull().references(() => devis.id).unique(),
  nomSignataire: text('nom_signataire').notNull(),
  emailSignataire: text('email_signataire').notNull(),
  telephoneSignataire: text('telephone_signataire').notNull(),
  // Horodatage de la validation du code SMS : c'est la preuve d'identification.
  codeValideLe: timestamp('code_valide_le', { withTimezone: true }).notNull(),
  adresseIp: text('adresse_ip').notNull(),
  userAgent: text('user_agent').notNull(),
  hashDocument: text('hash_document').notNull(),
  // Chemin du PDF exact soumis a la signature, archive en ecriture unique.
  // Sans lui, un changement de gabarit invalide silencieusement toute la preuve.
  cheminPdfArchive: text('chemin_pdf_archive').notNull(),
  jetonHorodatage: text('jeton_horodatage'),
  signeLe: timestamp('signe_le', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 4 : Écrire le journal d'événements**

```typescript
// src/db/schema/evenement.ts
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

/** Journal append-only. Aucun UPDATE, aucun DELETE — garanti par trigger. */
export const evenement = pgTable('evenement', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  entrepriseId: uuid('entreprise_id'),
  sujetType: text('sujet_type').notNull(),
  sujetId: uuid('sujet_id').notNull(),
  acteurType: text('acteur_type', { enum: ['entreprise', 'demandeur', 'systeme'] }).notNull(),
  acteurId: text('acteur_id'),
  payload: jsonb('payload').notNull().default({}),
  horodateLe: timestamp('horodate_le', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('evenement_entreprise_idx').on(t.entrepriseId, t.horodateLe),
  index('evenement_sujet_idx').on(t.sujetType, t.sujetId),
])
```

```typescript
// src/db/schema/index.ts
export * from './entreprise'
export * from './chantier'
export * from './devis'
export * from './evenement'
```

- [ ] **Step 5 : Créer le client de base**

```typescript
// src/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connexion = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle(connexion, { schema })
```

- [ ] **Step 6 : Générer la migration**

Run: `pnpm drizzle-kit generate`
Expected: un fichier SQL apparaît dans `supabase/migrations/`

- [ ] **Step 7 : Rendre le journal réellement immuable**

Créer `supabase/migrations/0001_journal_immuable.sql` :

```sql
CREATE OR REPLACE FUNCTION refuser_modification_evenement()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Le journal d''evenements est append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evenement_immuable
BEFORE UPDATE OR DELETE ON evenement
FOR EACH ROW EXECUTE FUNCTION refuser_modification_evenement();
```

Ce déclencheur fait partie de la chaîne de migrations, il n'est donc jamais à appliquer à la main : tout environnement neuf l'obtient automatiquement.

- [ ] **Step 8 : Appliquer les migrations**

Run: `pnpm supabase db reset`
Expected: la base locale est recréée et toutes les migrations sont rejouées, y compris le déclencheur

- [ ] **Step 9 : Vérifier l'immuabilité**

Run: `psql "$DATABASE_URL" -c "INSERT INTO evenement (type, sujet_type, sujet_id, acteur_type) VALUES ('test', 'devis', gen_random_uuid(), 'systeme'); DELETE FROM evenement WHERE type = 'test';"`
Expected: ERROR — `Le journal d'evenements est append-only`

- [ ] **Step 10 : Commit**

```bash
git add src/db drizzle
git commit -m "feat: schema de base et journal d'evenements immuable"
```

---

## Task 8 : Le service d'écriture du journal

**Files:**
- Create: `src/services/evenements.ts`
- Test: `tests/services/evenements.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```typescript
// tests/services/evenements.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/client'
import { evenement } from '../../src/db/schema'
import { enregistrerEvenement } from '../../src/services/evenements'
import { eq } from 'drizzle-orm'

describe('enregistrerEvenement', () => {
  const sujetId = '11111111-1111-1111-1111-111111111111'

  beforeEach(async () => {
    await db.execute('ALTER TABLE evenement DISABLE TRIGGER evenement_immuable')
    await db.delete(evenement).where(eq(evenement.sujetId, sujetId))
    await db.execute('ALTER TABLE evenement ENABLE TRIGGER evenement_immuable')
  })

  it('ecrit un evenement horodate', async () => {
    await enregistrerEvenement({
      type: 'devis.envoye',
      sujetType: 'devis',
      sujetId,
      acteurType: 'entreprise',
      payload: { totalTTC: 120000 },
    })

    const lignes = await db.select().from(evenement).where(eq(evenement.sujetId, sujetId))
    expect(lignes).toHaveLength(1)
    expect(lignes[0].type).toBe('devis.envoye')
    expect(lignes[0].payload).toEqual({ totalTTC: 120000 })
    expect(lignes[0].horodateLe).toBeInstanceOf(Date)
  })
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `pnpm vitest run tests/services/evenements.test.ts`
Expected: FAIL — module `evenements` introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/services/evenements.ts
import { db } from '../db/client'
import { evenement } from '../db/schema'

export interface EvenementEntrant {
  type: string
  sujetType: string
  sujetId: string
  acteurType: 'entreprise' | 'demandeur' | 'systeme'
  acteurId?: string
  entrepriseId?: string
  payload?: Record<string, unknown>
}

export async function enregistrerEvenement(e: EvenementEntrant): Promise<void> {
  await db.insert(evenement).values({
    type: e.type,
    sujetType: e.sujetType,
    sujetId: e.sujetId,
    acteurType: e.acteurType,
    acteurId: e.acteurId ?? null,
    entrepriseId: e.entrepriseId ?? null,
    payload: e.payload ?? {},
  })
}
```

- [ ] **Step 4 : Lancer le test**

Run: `pnpm vitest run tests/services/evenements.test.ts`
Expected: PASS — 1 test

- [ ] **Step 5 : Commit**

```bash
git add src/services/evenements.ts tests/services/evenements.test.ts
git commit -m "feat: service d'ecriture du journal d'evenements"
```

---

## Task 9 : Authentification et session

Sans cette tâche, `creerClientServeur` et `entrepriseCourante` — utilisés partout ensuite — n'existent pas.

**Files:**
- Create: `src/lib/supabase-serveur.ts`, `src/lib/session.ts`, `src/app/connexion/page.tsx`, `src/app/auth/confirm/route.ts`
- Test: `tests/lib/session.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```typescript
// tests/lib/session.test.ts
import { describe, it, expect } from 'vitest'
import { ErreurSession, resoudreEntreprise } from '../../src/lib/session'

describe('resoudreEntreprise', () => {
  it('rejette une session sans utilisateur', () => {
    expect(() => resoudreEntreprise(null, null)).toThrow(ErreurSession)
  })

  it('rejette un utilisateur sans entreprise rattachee', () => {
    expect(() => resoudreEntreprise({ id: 'u1', email: 'a@b.fr' }, null))
      .toThrow('Aucune entreprise')
  })

  it('renvoie l identifiant d entreprise et le role', () => {
    const r = resoudreEntreprise(
      { id: 'u1', email: 'a@b.fr' },
      { entrepriseId: 'e1', role: 'proprietaire' },
    )
    expect(r).toEqual({ utilisateurId: 'u1', email: 'a@b.fr', entrepriseId: 'e1', role: 'proprietaire' })
  })
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `pnpm vitest run tests/lib/session.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter le client Supabase serveur**

```typescript
// src/lib/supabase-serveur.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function creerClientServeur() {
  const magasin = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => magasin.getAll(),
        setAll: (liste) => {
          try {
            liste.forEach(({ name, value, options }) => magasin.set(name, value, options))
          } catch {
            // Appelé depuis un Server Component : le middleware rafraîchira la session.
          }
        },
      },
    },
  )
}
```

- [ ] **Step 4 : Implémenter la résolution de session**

```typescript
// src/lib/session.ts
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { membre } from '@/db/schema'
import { creerClientServeur } from './supabase-serveur'

export class ErreurSession extends Error {}

export interface Utilisateur { id: string; email: string }
export interface Rattachement { entrepriseId: string; role: string }
export interface Session {
  utilisateurId: string
  email: string
  entrepriseId: string
  role: string
}

/** Fonction pure : toute la logique de decision, aucune I/O. C'est elle qui est testee. */
export function resoudreEntreprise(
  utilisateur: Utilisateur | null,
  rattachement: Rattachement | null,
): Session {
  if (!utilisateur) throw new ErreurSession('Session expiree')
  if (!rattachement) throw new ErreurSession('Aucune entreprise rattachee a ce compte')
  return {
    utilisateurId: utilisateur.id,
    email: utilisateur.email,
    entrepriseId: rattachement.entrepriseId,
    role: rattachement.role,
  }
}

export async function entrepriseCourante(): Promise<Session> {
  const supabase = await creerClientServeur()
  const { data: { user } } = await supabase.auth.getUser()

  const ligne = user
    ? await db.query.membre.findFirst({ where: eq(membre.utilisateurId, user.id) })
    : null

  return resoudreEntreprise(
    user ? { id: user.id, email: user.email! } : null,
    ligne ? { entrepriseId: ligne.entrepriseId, role: ligne.role } : null,
  )
}
```

- [ ] **Step 5 : Écrire la page de connexion par lien magique**

```tsx
// src/app/connexion/page.tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Connexion() {
  const [email, setEmail] = useState('')
  const [envoye, setEnvoye] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm` },
    })
    setEnvoye(true)
  }

  if (envoye) return <p>Lien envoyé à {email}. Ouvrez-le depuis votre téléphone.</p>

  return (
    <form onSubmit={envoyer}>
      <label htmlFor="email">E-mail</label>
      <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit">Recevoir le lien</button>
    </form>
  )
}
```

- [ ] **Step 6 : Écrire la route de confirmation**

```typescript
// src/app/auth/confirm/route.ts
import { redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase-serveur'

export async function GET(requete: Request) {
  const url = new URL(requete.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as 'email' | null

  if (token_hash && type) {
    const supabase = await creerClientServeur()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) redirect('/devis')
  }
  redirect('/connexion?erreur=lien_invalide')
}
```

- [ ] **Step 7 : Lancer les tests**

Run: `pnpm vitest run tests/lib/session.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 8 : Commit**

```bash
git add src/lib src/app/connexion src/app/auth tests/lib
git commit -m "feat: authentification par lien magique et resolution de session"
```

---

## Task 10 : L'inscription par SIRET

**Files:**
- Create: `src/services/sirene.ts`, `src/app/(app)/inscription/page.tsx`, `src/app/(app)/inscription/actions.ts`
- Test: `tests/services/sirene.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```typescript
// tests/services/sirene.test.ts
import { describe, it, expect, vi } from 'vitest'
import { rechercherEtablissement } from '../../src/services/sirene'

describe('rechercherEtablissement', () => {
  it('refuse un SIRET invalide sans appeler le reseau', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(rechercherEtablissement('123')).rejects.toThrow('SIRET invalide')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('mappe la reponse Sirene vers notre modele', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      etablissement: {
        siret: '55210055400021',
        uniteLegale: {
          denominationUniteLegale: 'DUBOIS PLOMBERIE',
          categorieJuridiqueUniteLegale: '5710',
          dateCreationUniteLegale: '2014-03-01',
          etatAdministratifUniteLegale: 'A',
        },
        adresseEtablissement: {
          numeroVoieEtablissement: '12',
          typeVoieEtablissement: 'RUE',
          libelleVoieEtablissement: 'FONDAUDEGE',
          codePostalEtablissement: '33000',
          libelleCommuneEtablissement: 'BORDEAUX',
        },
      },
    }), { status: 200 }))

    const r = await rechercherEtablissement('552 100 554 00021')

    expect(r).toEqual({
      siret: '55210055400021',
      raisonSociale: 'DUBOIS PLOMBERIE',
      formeJuridique: '5710',
      dateCreation: new Date('2014-03-01'),
      actif: true,
      adresseLigne1: '12 RUE FONDAUDEGE',
      codePostal: '33000',
      ville: 'BORDEAUX',
    })
    vi.restoreAllMocks()
  })

  it('signale une entreprise introuvable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }))
    await expect(rechercherEtablissement('55210055400021')).rejects.toThrow('introuvable')
    vi.restoreAllMocks()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/services/sirene.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/services/sirene.ts
import { normaliserSiret, siretValide } from '../domain/siret'

export interface Etablissement {
  siret: string
  raisonSociale: string
  formeJuridique: string | null
  dateCreation: Date | null
  actif: boolean
  adresseLigne1: string
  codePostal: string
  ville: string
}

const BASE = 'https://api.insee.fr/entreprises/sirene/V3.11'

export async function rechercherEtablissement(saisie: string): Promise<Etablissement> {
  const siret = normaliserSiret(saisie)
  if (!siretValide(siret)) throw new Error('SIRET invalide')

  const reponse = await fetch(`${BASE}/siret/${siret}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${process.env.SIRENE_TOKEN}` },
  })

  if (reponse.status === 404) throw new Error('Entreprise introuvable')
  if (!reponse.ok) throw new Error(`Sirene a repondu ${reponse.status}`)

  const { etablissement: e } = await reponse.json()
  const u = e.uniteLegale
  const a = e.adresseEtablissement

  return {
    siret: e.siret,
    raisonSociale: u.denominationUniteLegale ?? [u.prenom1UniteLegale, u.nomUniteLegale].filter(Boolean).join(' '),
    formeJuridique: u.categorieJuridiqueUniteLegale ?? null,
    dateCreation: u.dateCreationUniteLegale ? new Date(u.dateCreationUniteLegale) : null,
    actif: u.etatAdministratifUniteLegale === 'A',
    adresseLigne1: [a.numeroVoieEtablissement, a.typeVoieEtablissement, a.libelleVoieEtablissement]
      .filter(Boolean).join(' '),
    codePostal: a.codePostalEtablissement,
    ville: a.libelleCommuneEtablissement,
  }
}
```

> **Note pour l'implémenteur :** l'API Sirene exige une inscription et un jeton. Les modalités et l'URL de base ont changé plusieurs fois — **vérifier la documentation courante avant d'implémenter** et ajuster `BASE` et l'en-tête d'authentification si nécessaire. Le test étant intégralement mocké, il restera valide ; c'est le mapping qui compte.

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/services/sirene.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5 : Écrire l'action d'inscription**

```typescript
// src/app/(app)/inscription/actions.ts
'use server'

import { db } from '@/db/client'
import { entreprise, membre } from '@/db/schema'
import { rechercherEtablissement } from '@/services/sirene'
import { enregistrerEvenement } from '@/services/evenements'
import { creerClientServeur } from '@/lib/supabase-serveur'
import { redirect } from 'next/navigation'

export async function inscrire(_etat: unknown, donnees: FormData) {
  const supabase = await creerClientServeur()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erreur: 'Session expiree' }

  let etablissement
  try {
    etablissement = await rechercherEtablissement(String(donnees.get('siret')))
  } catch (e) {
    return { erreur: (e as Error).message }
  }

  if (!etablissement.actif) return { erreur: "Cette entreprise n'est plus active au repertoire Sirene" }

  const [nouvelle] = await db.insert(entreprise).values({
    siret: etablissement.siret,
    raisonSociale: etablissement.raisonSociale,
    formeJuridique: etablissement.formeJuridique,
    adresseLigne1: etablissement.adresseLigne1,
    codePostal: etablissement.codePostal,
    ville: etablissement.ville,
    dateCreationEntreprise: etablissement.dateCreation,
  }).returning()

  await db.insert(membre).values({
    entrepriseId: nouvelle.id,
    utilisateurId: user.id,
    email: user.email!,
    role: 'proprietaire',
  })

  await enregistrerEvenement({
    type: 'entreprise.creee',
    sujetType: 'entreprise',
    sujetId: nouvelle.id,
    entrepriseId: nouvelle.id,
    acteurType: 'entreprise',
    acteurId: user.id,
  })

  redirect('/devis')
}
```

- [ ] **Step 6 : Commit**

```bash
git add src/services/sirene.ts tests/services/sirene.test.ts src/app/\(app\)/inscription
git commit -m "feat: inscription d'une entreprise par SIRET via Sirene"
```

---

## Task 11 : Rédaction du devis

**Files:**
- Create: `src/app/(app)/devis/nouveau/page.tsx`, `src/app/(app)/devis/actions.ts`
- Test: `tests/services/devis.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```typescript
// tests/services/devis.test.ts
import { describe, it, expect } from 'vitest'
import { prochainNumero } from '../../src/services/devis'

describe('prochainNumero', () => {
  it('demarre a 0001 pour l annee en cours', () => {
    expect(prochainNumero([], 2026)).toBe('D2026-0001')
  })

  it('incremente a partir du dernier numero de l annee', () => {
    expect(prochainNumero(['D2026-0001', 'D2026-0007'], 2026)).toBe('D2026-0008')
  })

  it('ignore les numeros des annees precedentes', () => {
    expect(prochainNumero(['D2025-0042'], 2026)).toBe('D2026-0001')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/services/devis.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter la numérotation**

```typescript
// src/services/devis.ts
export function prochainNumero(numerosExistants: string[], annee: number): string {
  const prefixe = `D${annee}-`
  const maximum = numerosExistants
    .filter((n) => n.startsWith(prefixe))
    .map((n) => Number(n.slice(prefixe.length)))
    .filter((n) => Number.isInteger(n))
    .reduce((max, n) => Math.max(max, n), 0)

  return `${prefixe}${String(maximum + 1).padStart(4, '0')}`
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/services/devis.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5 : Écrire la création du chantier avec déduplication du logement**

C'est ici qu'`empreinteAdresse` (Task 6) prend son sens : deux entreprises intervenant à la même adresse doivent aboutir au **même** logement.

```typescript
// src/services/chantier.ts
'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { client, chantier, logement } from '@/db/schema'
import { empreinteAdresse, type Adresse } from '@/domain/adresse'

export interface NouveauChantier {
  entrepriseId: string
  client: {
    nom: string
    email: string
    telephone: string
    type: 'particulier' | 'professionnel'
    siret?: string
  }
  adresse: Adresse & { complement?: string }
  libelle: string
}

export async function creerChantier(entree: NouveauChantier) {
  const empreinte = empreinteAdresse(entree.adresse)

  // Le logement est partage entre entreprises : on ne le recree jamais.
  const existant = await db.query.logement.findFirst({ where: eq(logement.empreinte, empreinte) })
  const [lgt] = existant
    ? [existant]
    : await db.insert(logement).values({
        empreinte,
        adresseLigne1: entree.adresse.ligne1,
        complement: entree.adresse.complement ?? null,
        codePostal: entree.adresse.codePostal,
        ville: entree.adresse.ville,
      }).returning()

  // Le client, lui, appartient a l'entreprise et n'est jamais partage.
  // Le SIRET du client sera exige par le e-invoicing B2B en M2 (cf. recherche facturation).
  if (entree.client.type === 'professionnel' && !entree.client.siret) {
    throw new Error('Le SIRET est obligatoire pour un client professionnel')
  }

  const [cli] = await db.insert(client).values({
    entrepriseId: entree.entrepriseId,
    nom: entree.client.nom,
    email: entree.client.email,
    telephone: entree.client.telephone,
    type: entree.client.type,
    siret: entree.client.siret ?? null,
  }).returning()

  const [ch] = await db.insert(chantier).values({
    entrepriseId: entree.entrepriseId,
    clientId: cli.id,
    logementId: lgt.id,
    libelle: entree.libelle,
  }).returning()

  return ch
}
```

- [ ] **Step 6 : Écrire l'action d'enregistrement**

```typescript
// src/app/(app)/devis/actions.ts
'use server'

import { randomBytes } from 'node:crypto'
import { db } from '@/db/client'
import { devis, ligneDevis } from '@/db/schema'
import { calculerTotaux, type LigneCalcul } from '@/domain/devis-totaux'
import { prochainNumero } from '@/services/devis'
import { enregistrerEvenement } from '@/services/evenements'
import { entrepriseCourante } from '@/lib/session'

export interface LigneSaisie {
  libelle: string
  unite: string
  quantite: string
  prixUnitaireHT: number
  tauxTVA: number
}

export async function enregistrerDevis(chantierId: string, lignes: LigneSaisie[]) {
  const { entrepriseId } = await entrepriseCourante()

  const totaux = calculerTotaux(lignes as LigneCalcul[])
  const numeros = await db.query.devis.findMany({ columns: { numero: true } })
  const numero = prochainNumero(numeros.map((d) => d.numero), new Date().getFullYear())

  const [cree] = await db.insert(devis).values({
    chantierId,
    numero,
    tokenPublic: randomBytes(24).toString('base64url'),
    totalHT: totaux.totalHT,
    totalTVA: totaux.totalTVA,
    totalTTC: totaux.totalTTC,
  }).returning()

  await db.insert(ligneDevis).values(
    lignes.map((l, i) => ({ devisId: cree.id, position: i, ...l })),
  )

  await enregistrerEvenement({
    type: 'devis.cree',
    sujetType: 'devis',
    sujetId: cree.id,
    entrepriseId,
    acteurType: 'entreprise',
    payload: { numero, totalTTC: totaux.totalTTC },
  })

  return cree
}
```

- [ ] **Step 7 : Commit**

```bash
git add src/services/devis.ts tests/services/devis.test.ts src/app/\(app\)/devis
git commit -m "feat: redaction et enregistrement d'un devis"
```

---

## Task 12 : L'envoi du devis et son chargement public

Cette tâche définit `chargerDevisParToken`, utilisé par les Tasks 13 et 14, et l'action d'envoi qui produit l'événement `devis.envoye`.

**Files:**
- Create: `src/services/devis-public.ts`, `src/app/(app)/devis/[id]/envoyer/actions.ts`
- Test: `tests/services/devis-public.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```typescript
// tests/services/devis-public.test.ts
import { describe, it, expect } from 'vitest'
import { verifierEnvoiPossible } from '../../src/services/devis-public'

describe('verifierEnvoiPossible', () => {
  const complet = { statut: 'brouillon', delaiEngageJours: 5, nombreLignes: 2, telephoneClient: '0612345678' }

  it('refuse un devis sans ligne', () => {
    expect(() => verifierEnvoiPossible({ ...complet, nombreLignes: 0 })).toThrow('au moins une ligne')
  })

  it('refuse un devis sans delai engage', () => {
    expect(() => verifierEnvoiPossible({ ...complet, delaiEngageJours: null })).toThrow("delai d'execution")
  })

  it('refuse un devis sans telephone client', () => {
    expect(() => verifierEnvoiPossible({ ...complet, telephoneClient: null })).toThrow('telephone du client')
  })

  it('refuse un devis deja envoye', () => {
    expect(() => verifierEnvoiPossible({ ...complet, statut: 'envoye' })).toThrow('deja ete envoye')
  })

  it('accepte un brouillon complet', () => {
    expect(() => verifierEnvoiPossible(complet)).not.toThrow()
  })
})
```

Le délai engagé est **obligatoire à l'envoi** : sans lui, la métrique « respect du délai annoncé » de M4 n'a rien à comparer (spec §9).

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/services/devis-public.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter le chargement public et la règle d'envoi**

```typescript
// src/services/devis-public.ts
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { devis } from '@/db/schema'
import { calculerTotaux } from '@/domain/devis-totaux'
import type { DonneesPdf } from '@/pdf/devis-pdf'

/** Superset de DonneesPdf : le PDF n'a pas besoin de ces champs, les actions si. */
export interface DossierDevis extends DonneesPdf {
  id: string
  statut: 'brouillon' | 'envoye' | 'signe' | 'refuse' | 'expire'
  entrepriseId: string
}

export interface EtatEnvoi {
  statut: string
  delaiEngageJours: number | null
  nombreLignes: number
  telephoneClient: string | null
}

export function verifierEnvoiPossible(etat: EtatEnvoi): void {
  if (etat.statut !== 'brouillon') throw new Error('Ce devis a deja ete envoye')
  if (etat.nombreLignes === 0) throw new Error('Un devis doit comporter au moins une ligne')
  if (etat.delaiEngageJours === null) throw new Error("Le delai d'execution est obligatoire")
  // Le telephone porte l'identification du signataire par SMS (cf. recherche Task 1).
  if (!etat.telephoneClient) throw new Error('Le telephone du client est obligatoire')
}

export async function chargerDevisParToken(token: string): Promise<DossierDevis | null> {
  const d = await db.query.devis.findFirst({
    where: eq(devis.tokenPublic, token),
    with: {
      lignes: true,
      chantier: { with: { entreprise: true, client: true, logement: true } },
    },
  })
  if (!d) return null

  const e = d.chantier.entreprise
  const l = d.chantier.logement

  return {
    id: d.id,
    statut: d.statut,
    entrepriseId: e.id,
    numero: d.numero,
    emisLe: (d.envoyeLe ?? d.creeLe).toLocaleDateString('fr-FR'),
    entreprise: {
      raisonSociale: e.raisonSociale,
      siret: e.siret,
      adresse: [e.adresseLigne1, e.codePostal, e.ville].filter(Boolean).join(' '),
    },
    client: {
      nom: d.chantier.client.nom,
      adresse: [l.adresseLigne1, l.codePostal, l.ville].join(' '),
    },
    delaiEngageJours: d.delaiEngageJours,
    lignes: d.lignes
      .sort((a, b) => a.position - b.position)
      .map((li) => ({
        libelle: li.libelle,
        unite: li.unite,
        quantite: li.quantite,
        prixUnitaireHT: li.prixUnitaireHT,
        tauxTVA: li.tauxTVA,
      })),
    totaux: calculerTotaux(d.lignes),
  }
}
```

> **Note pour l'implémenteur :** `db.query.devis.findFirst` avec `with` exige que les relations Drizzle soient déclarées. Ajouter dans `src/db/schema/devis.ts` les `relations()` correspondantes (`devis` → `lignes`, `devis` → `chantier`, `chantier` → `entreprise`, `client`, `logement`). Sans elles, la requête échoue à l'exécution et non à la compilation.

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/services/devis-public.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5 : Écrire l'action d'envoi**

```typescript
// src/app/(app)/devis/[id]/envoyer/actions.ts
'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { devis } from '@/db/schema'
import { verifierEnvoiPossible } from '@/services/devis-public'
import { enregistrerEvenement } from '@/services/evenements'
import { entrepriseCourante } from '@/lib/session'
import { envoyerLienDevis } from '@/services/courriel'

export async function envoyer(devisId: string) {
  const { entrepriseId } = await entrepriseCourante()

  const d = await db.query.devis.findFirst({
    where: eq(devis.id, devisId),
    with: { lignes: true, chantier: { with: { client: true } } },
  })
  if (!d) return { erreur: 'Devis introuvable' }

  try {
    verifierEnvoiPossible({
      statut: d.statut,
      delaiEngageJours: d.delaiEngageJours,
      nombreLignes: d.lignes.length,
      telephoneClient: d.chantier.client.telephone,
    })
  } catch (e) {
    return { erreur: (e as Error).message }
  }

  const lien = `${process.env.APP_URL}/devis/${d.tokenPublic}`
  await envoyerLienDevis(d.chantier.client.email, d.numero, lien)

  await db.update(devis)
    .set({ statut: 'envoye', envoyeLe: new Date() })
    .where(eq(devis.id, devisId))

  await enregistrerEvenement({
    type: 'devis.envoye',
    sujetType: 'devis',
    sujetId: devisId,
    entrepriseId,
    acteurType: 'entreprise',
    payload: { numero: d.numero, delaiEngageJours: d.delaiEngageJours },
  })

  return { ok: true, lien }
}
```

> **Note pour l'implémenteur :** `src/services/courriel.ts` expose `envoyerLienDevis(destinataire, numero, lien)`. Utiliser Resend ou l'envoi SMTP de Supabase — c'est une décision à faible conséquence. En environnement de test, écrire le lien dans une table `courriel_test` plutôt que de l'envoyer, pour que la Task 15 puisse le lire.

- [ ] **Step 6 : Commit**

```bash
git add src/services/devis-public.ts src/services/courriel.ts tests/services/devis-public.test.ts src/app/\(app\)/devis
git commit -m "feat: envoi du devis au client et chargement par token public"
```

---

## Task 13 : Le PDF du devis

**Files:**
- Create: `src/pdf/devis-pdf.tsx`, `src/app/devis/[token]/pdf/route.ts`

- [ ] **Step 1 : Écrire le rendu PDF**

```tsx
// src/pdf/devis-pdf.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formater } from '@/domain/money'
import type { Totaux } from '@/domain/devis-totaux'

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  titre: { fontSize: 16, marginBottom: 4 },
  bloc: { marginBottom: 18 },
  ligne: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ccc', paddingVertical: 4 },
  entete: { flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 4, fontFamily: 'Helvetica-Bold' },
  col: { flex: 1 },
  colLarge: { flex: 4 },
  droite: { textAlign: 'right' },
})

export interface DonneesPdf {
  numero: string
  emisLe: string
  entreprise: { raisonSociale: string; siret: string; adresse: string }
  client: { nom: string; adresse: string }
  delaiEngageJours: number | null
  lignes: { libelle: string; unite: string; quantite: string; prixUnitaireHT: number; tauxTVA: number }[]
  totaux: Totaux
}

export function DevisPdf({ d }: { d: DonneesPdf }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.bloc}>
          <Text style={s.titre}>Devis {d.numero}</Text>
          <Text>Émis le {d.emisLe}</Text>
        </View>

        <View style={s.bloc}>
          <Text>{d.entreprise.raisonSociale} — SIRET {d.entreprise.siret}</Text>
          <Text>{d.entreprise.adresse}</Text>
        </View>

        <View style={s.bloc}>
          <Text>Client : {d.client.nom}</Text>
          <Text>Chantier : {d.client.adresse}</Text>
        </View>

        <View style={s.entete}>
          <Text style={s.colLarge}>Désignation</Text>
          <Text style={[s.col, s.droite]}>Qté</Text>
          <Text style={[s.col, s.droite]}>P.U. HT</Text>
          <Text style={[s.col, s.droite]}>TVA</Text>
          <Text style={[s.col, s.droite]}>Total HT</Text>
        </View>

        {d.lignes.map((l, i) => (
          <View style={s.ligne} key={i}>
            <Text style={s.colLarge}>{l.libelle}</Text>
            <Text style={[s.col, s.droite]}>{l.quantite} {l.unite}</Text>
            <Text style={[s.col, s.droite]}>{formater(l.prixUnitaireHT)}</Text>
            <Text style={[s.col, s.droite]}>{(l.tauxTVA / 100).toFixed(1)} %</Text>
            <Text style={[s.col, s.droite]}>
              {formater(Math.round(l.prixUnitaireHT * Number(l.quantite)))}
            </Text>
          </View>
        ))}

        <View style={{ marginTop: 18, alignItems: 'flex-end' }}>
          <Text>Total HT : {formater(d.totaux.totalHT)} €</Text>
          {d.totaux.parTaux.map((v) => (
            <Text key={v.taux}>
              TVA {(v.taux / 100).toFixed(1)} % sur {formater(v.baseHT)} € : {formater(v.montantTVA)} €
            </Text>
          ))}
          <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 4 }}>
            Total TTC : {formater(d.totaux.totalTTC)} €
          </Text>
        </View>

        {d.delaiEngageJours !== null && (
          <Text style={{ marginTop: 18 }}>
            Délai d'exécution engagé : {d.delaiEngageJours} jours ouvrés à compter de l'acceptation.
          </Text>
        )}
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2 : Exposer la route de téléchargement**

```typescript
// src/app/devis/[token]/pdf/route.ts
import { renderToBuffer } from '@react-pdf/renderer'
import { DevisPdf } from '@/pdf/devis-pdf'
import { chargerDevisParToken } from '@/services/devis-public'

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const donnees = await chargerDevisParToken(token)
  if (!donnees) return new Response('Introuvable', { status: 404 })

  const buffer = await renderToBuffer(<DevisPdf d={donnees} />)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="devis-${donnees.numero}.pdf"`,
    },
  })
}
```

- [ ] **Step 3 : Vérifier manuellement**

Créer un devis via l'interface, ouvrir `/devis/<token>/pdf`.
Expected: le PDF s'affiche, les totaux correspondent à l'écran, la ventilation de TVA est présente.

- [ ] **Step 4 : Commit**

```bash
git add src/pdf src/app/devis
git commit -m "feat: generation du PDF de devis"
```

---

## Task 14 : La signature et sa piste d'audit

**Task 1 conclue** — voir [la décision](../research/2026-08-07-signature-electronique.md). Deux exigences en découlent, et elles ne sont pas négociables : la charge de la preuve pèse sur **nous** en signature simple (art. 1367 al. 2 : la présomption de fiabilité est réservée au qualifié), et il faut donc prouver séparément **l'intégrité**, **l'identification** et **le lien signature ↔ acte**.

- **Identification par code SMS**, en plus du lien e-mail. Un clic sur un lien prouve le contrôle d'une boîte de réception, pas une identité. Deux canaux distincts, c'est ce qui tient devant un juge.
- **Archivage du PDF exact soumis à la signature.** Le régénérer plus tard depuis un gabarit modifié produirait un document différent, et l'empreinte stockée ne correspondrait plus à rien.

> **Ne jamais qualifier cette signature d'« avancée »** dans l'interface ou la documentation commerciale. Le niveau avancé au sens d'eIDAS suppose un contrôle exclusif du dispositif par le signataire, qu'un lien e-mail ne procure pas. Sur-vendre le niveau serait un risque juridique en soi.

**Files:**
- Create: `src/services/signature.ts`, `src/app/devis/[token]/page.tsx`, `src/app/devis/[token]/signer/actions.ts`
- Test: `tests/services/signature.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// tests/services/signature.test.ts
import { describe, it, expect } from 'vitest'
import {
  empreinteDocument, constituerPreuve, genererCode, hacherCode, verifierCode,
} from '../../src/services/signature'

describe('signature', () => {
  it('produit une empreinte SHA-256 stable du document', () => {
    const buffer = Buffer.from('contenu du devis')
    expect(empreinteDocument(buffer)).toBe(empreinteDocument(Buffer.from('contenu du devis')))
    expect(empreinteDocument(buffer)).toHaveLength(64)
  })

  it('change d empreinte si le document change d un octet', () => {
    expect(empreinteDocument(Buffer.from('devis A')))
      .not.toBe(empreinteDocument(Buffer.from('devis B')))
  })

  const valide = {
    nomSignataire: 'Paul Martin',
    emailSignataire: 'paul@example.com',
    telephoneSignataire: '+33612345678',
    codeValideLe: new Date('2026-08-07T10:00:00Z'),
    adresseIp: '1.2.3.4',
    userAgent: 'Mozilla/5.0',
    hashDocument: 'a'.repeat(64),
    cheminPdfArchive: 'signatures/devis-1.pdf',
  }

  it('refuse de constituer une preuve sans nom de signataire', () => {
    expect(() => constituerPreuve({ ...valide, nomSignataire: '  ' })).toThrow('nom du signataire')
  })

  it('refuse une preuve sans code SMS valide — l identification manquerait', () => {
    expect(() => constituerPreuve({ ...valide, codeValideLe: null as unknown as Date }))
      .toThrow('code SMS')
  })

  it('refuse une preuve sans PDF archive — l integrite ne serait pas prouvable', () => {
    expect(() => constituerPreuve({ ...valide, cheminPdfArchive: '' })).toThrow('PDF archive')
  })

  it('constitue une preuve complete', () => {
    const preuve = constituerPreuve(valide)
    expect(preuve.nomSignataire).toBe('Paul Martin')
    expect(preuve.hashDocument).toBe('a'.repeat(64))
    expect(preuve.cheminPdfArchive).toBe('signatures/devis-1.pdf')
  })
})

describe('code SMS', () => {
  it('genere un code numerique a six chiffres', () => {
    expect(genererCode()).toMatch(/^\d{6}$/)
  })

  it('accepte le bon code avant expiration', () => {
    const code = '123456'
    const etat = { codeHash: hacherCode(code), expireLe: new Date(Date.now() + 60_000), tentatives: 0 }
    expect(verifierCode(etat, code)).toBe(true)
  })

  it('refuse un code expire', () => {
    const code = '123456'
    const etat = { codeHash: hacherCode(code), expireLe: new Date(Date.now() - 1), tentatives: 0 }
    expect(() => verifierCode(etat, code)).toThrow('expire')
  })

  it('refuse au-dela de trois tentatives', () => {
    const etat = { codeHash: hacherCode('123456'), expireLe: new Date(Date.now() + 60_000), tentatives: 3 }
    expect(() => verifierCode(etat, '123456')).toThrow('Trop de tentatives')
  })

  it('renvoie faux sur un mauvais code', () => {
    const etat = { codeHash: hacherCode('123456'), expireLe: new Date(Date.now() + 60_000), tentatives: 0 }
    expect(verifierCode(etat, '000000')).toBe(false)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run tests/services/signature.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : Implémenter**

```typescript
// src/services/signature.ts
import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

export function empreinteDocument(contenu: Buffer): string {
  return createHash('sha256').update(contenu).digest('hex')
}

// --- Preuve -----------------------------------------------------------------

export interface Preuve {
  nomSignataire: string
  emailSignataire: string
  telephoneSignataire: string
  /** Horodatage de la validation du code SMS : c'est la preuve d'identification. */
  codeValideLe: Date
  adresseIp: string
  userAgent: string
  hashDocument: string
  /** Chemin du PDF exact soumis a la signature : c'est la preuve d'integrite. */
  cheminPdfArchive: string
}

export function constituerPreuve(entree: Preuve): Preuve {
  if (!entree.nomSignataire.trim()) throw new Error('Le nom du signataire est obligatoire')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entree.emailSignataire)) {
    throw new Error('Adresse e-mail du signataire invalide')
  }
  if (!/^[0-9a-f]{64}$/.test(entree.hashDocument)) throw new Error('Empreinte de document invalide')
  if (!entree.codeValideLe) throw new Error('Le code SMS doit avoir ete valide avant la signature')
  if (!entree.cheminPdfArchive) throw new Error('Le PDF archive est obligatoire')

  return { ...entree, nomSignataire: entree.nomSignataire.trim() }
}

// --- Code a usage unique ----------------------------------------------------

export function genererCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hacherCode(code: string): string {
  return createHash('sha256').update(`${process.env.SEL_CODE_SMS ?? ''}${code}`).digest('hex')
}

export interface EtatCode {
  codeHash: string
  expireLe: Date
  tentatives: number
}

export const TENTATIVES_MAX = 3

export function verifierCode(etat: EtatCode, saisi: string): boolean {
  if (etat.tentatives >= TENTATIVES_MAX) throw new Error('Trop de tentatives')
  if (etat.expireLe.getTime() <= Date.now()) throw new Error('Ce code a expire')

  const attendu = Buffer.from(etat.codeHash, 'hex')
  const fourni = Buffer.from(hacherCode(saisi), 'hex')
  return attendu.length === fourni.length && timingSafeEqual(attendu, fourni)
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `pnpm vitest run tests/services/signature.test.ts`
Expected: PASS — 11 tests

- [ ] **Step 5 : Écrire l'action de signature**

```typescript
// src/app/devis/[token]/signer/actions.ts
'use server'

import { headers } from 'next/headers'
import { renderToBuffer } from '@react-pdf/renderer'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { devis, signature, codeSignature } from '@/db/schema'
import { creerClientServeur } from '@/lib/supabase-serveur'
import { DevisPdf } from '@/pdf/devis-pdf'
import { chargerDevisParToken } from '@/services/devis-public'
import { empreinteDocument, constituerPreuve } from '@/services/signature'
import { demanderHorodatage } from '@/services/horodatage'
import { enregistrerEvenement } from '@/services/evenements'

export async function signer(token: string, donnees: FormData) {
  const enTetes = await headers()
  const dossier = await chargerDevisParToken(token)
  if (!dossier) return { erreur: 'Devis introuvable' }
  if (dossier.statut !== 'envoye') return { erreur: 'Ce devis ne peut plus etre signe' }

  // 1. Identification : le code SMS doit avoir ete valide.
  const code = await db.query.codeSignature.findFirst({
    where: eq(codeSignature.devisId, dossier.id),
    orderBy: (c, { desc }) => [desc(c.creeLe)],
  })
  if (!code?.valideLe) return { erreur: 'Validez le code recu par SMS avant de signer' }

  // 2. Integrite : on rend le PDF UNE fois, on le hache, et on l'archive tel quel.
  // Le regenerer plus tard depuis un gabarit modifie invaliderait l'empreinte.
  const pdf = await renderToBuffer(<DevisPdf d={dossier} />)
  const hash = empreinteDocument(pdf)
  const cheminPdfArchive = `signatures/${dossier.id}.pdf`

  const stockage = await creerClientServeur()
  const { error: erreurStockage } = await stockage.storage
    .from('devis-signes')
    .upload(cheminPdfArchive, pdf, { contentType: 'application/pdf', upsert: false })
  if (erreurStockage) return { erreur: "Impossible d'archiver le devis signe" }

  let preuve
  try {
    preuve = constituerPreuve({
      nomSignataire: String(donnees.get('nom') ?? ''),
      emailSignataire: String(donnees.get('email') ?? ''),
      telephoneSignataire: code.telephone,
      codeValideLe: code.valideLe,
      adresseIp: enTetes.get('x-forwarded-for')?.split(',')[0].trim() ?? 'inconnue',
      userAgent: enTetes.get('user-agent') ?? 'inconnu',
      hashDocument: hash,
      cheminPdfArchive,
    })
  } catch (e) {
    return { erreur: (e as Error).message }
  }

  // L'horodatage qualifie ne doit jamais bloquer la signature : on l'attache si on l'obtient.
  const jeton = await demanderHorodatage(hash).catch(() => null)

  await db.insert(signature).values({ devisId: dossier.id, ...preuve, jetonHorodatage: jeton })
  await db.update(devis).set({ statut: 'signe', signeLe: new Date() }).where(eq(devis.id, dossier.id))

  await enregistrerEvenement({
    type: 'devis.signe',
    sujetType: 'devis',
    sujetId: dossier.id,
    entrepriseId: dossier.entrepriseId,
    acteurType: 'demandeur',
    acteurId: preuve.emailSignataire,
    payload: { hashDocument: hash, horodatageObtenu: jeton !== null },
  })

  return { ok: true }
}
```

> **Note pour l'implémenteur :** `src/services/horodatage.ts` implémente la demande de jeton RFC 3161 auprès de la TSA retenue en Task 1. Si la Task 1 conclut qu'aucune TSA gratuite n'est exploitable, retourner `null` et **le consigner explicitement** dans le document de recherche — la piste d'audit reste valide sans le jeton, mais sa valeur probante est moindre.

- [ ] **Step 6 : Commit**

```bash
git add src/services/signature.ts src/services/horodatage.ts tests/services/signature.test.ts src/app/devis
git commit -m "feat: signature du devis avec piste d'audit et horodatage"
```

---

## Task 15 : Le parcours complet de bout en bout

**Files:**
- Create: `tests/e2e/parcours-devis.spec.ts`

- [ ] **Step 1 : Écrire le test E2E**

```typescript
// tests/e2e/parcours-devis.spec.ts
import { test, expect } from '@playwright/test'

test('une entreprise redige un devis, l envoie, et le client le signe', async ({ page, context }) => {
  await page.goto('/connexion')
  await page.getByLabel('E-mail').fill('artisan@test.local')
  await page.getByRole('button', { name: 'Recevoir le lien' }).click()
  await page.goto(await lienMagiqueDeTest('artisan@test.local'))

  await page.goto('/devis/nouveau')
  await page.getByLabel('Client').fill('Paul Martin')
  await page.getByLabel('E-mail du client').fill('client@test.local')
  await page.getByLabel('Téléphone du client').fill('0612345678')
  await page.getByLabel('Type de client').selectOption('particulier')
  await page.getByLabel('Adresse du chantier').fill('12 rue Fondaudege')
  await page.getByLabel('Code postal').fill('33000')
  await page.getByLabel('Ville').fill('Bordeaux')

  await page.getByRole('button', { name: 'Ajouter une ligne' }).click()
  await page.getByLabel('Désignation').fill('Remplacement chauffe-eau 200 L')
  await page.getByLabel('Quantité').fill('1')
  await page.getByLabel('Prix unitaire HT').fill('850.00')
  await page.getByLabel('TVA').selectOption('1000')

  await page.getByLabel("Délai d'exécution (jours ouvrés)").fill('5')
  await expect(page.getByTestId('total-ttc')).toHaveText('935,00')

  await page.getByRole('button', { name: 'Envoyer au client' }).click()
  const lien = await page.getByTestId('lien-public').innerText()

  const pageClient = await context.newPage()
  await pageClient.goto(lien)
  await expect(pageClient.getByText('Remplacement chauffe-eau 200 L')).toBeVisible()
  await expect(pageClient.getByTestId('total-ttc')).toHaveText('935,00')

  await pageClient.getByLabel('Votre nom').fill('Paul Martin')
  await pageClient.getByLabel('Votre e-mail').fill('client@test.local')

  // Identification par SMS : sans code valide, la signature est refusee.
  await pageClient.getByRole('button', { name: 'Recevoir le code' }).click()
  await pageClient.getByLabel('Code recu par SMS').fill(await codeSmsDeTest(devisId))
  await pageClient.getByRole('button', { name: 'Valider le code' }).click()

  await pageClient.getByRole('button', { name: 'Signer le devis' }).click()

  await expect(pageClient.getByText('Devis signé')).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('statut-devis')).toHaveText('Signé')
})
```

> `lienMagiqueDeTest` et `codeSmsDeTest` sont des utilitaires à écrire dans `tests/e2e/helpers.ts` — le second lit `code_signature` en base plutôt que d'envoyer un vrai SMS. `devisId` est extrait de l'URL après l'enregistrement du devis. Le premier lit le lien de connexion dans le **collecteur d'e-mails de la pile Supabase locale**, qui capture les messages au lieu de les envoyer. Aucun des deux ne fonctionne ailleurs qu'en local — c'est exactement la garantie voulue.

- [ ] **Step 2 : Lancer le test**

Run: `pnpm playwright test tests/e2e/parcours-devis.spec.ts`
Expected: PASS

- [ ] **Step 3 : Vérifier que le journal a tout enregistré**

Run: `psql "$DATABASE_URL" -c "SELECT type FROM evenement ORDER BY horodate_le;"`
Expected: `entreprise.creee`, `devis.cree`, `devis.envoye`, `devis.signe`

Ces quatre événements sont la matière première des métriques de M4. Si l'un manque, le passeport sera faux.

- [ ] **Step 4 : Lancer toute la suite**

Run: `pnpm vitest run && pnpm playwright test`
Expected: tous les tests passent

- [ ] **Step 5 : Commit**

```bash
git add tests/e2e
git commit -m "test: parcours complet de la redaction a la signature du devis"
```

---

## Ce que M1 ne fait pas

À vérifier avant de déclarer le jalon terminé — ces absences sont volontaires, elles ne sont pas des oublis :

- **Aucune facture.** M2. La question de la plateforme agréée doit être levée avant.
- **Aucune vérification d'assurance, aucun passeport public.** M3.
- **Aucune métrique calculée.** M4 — mais le journal les alimente déjà.
- **Aucun compte demandeur.** M5. En M1 le client signe sans compte, via le lien.
- **Aucun agenda.** M6.
- **Aucune gestion d'équipe.** M7. Un membre unique, rôle `proprietaire`.
- **Aucune transmission à une plateforme agréée.** M2. Mais `client.type` et `client.siret` sont collectés dès M1 — voir [la recherche facturation électronique](../research/2026-08-07-facturation-electronique.md).
- **Aucune bibliothèque d'ouvrages.** Les lignes de devis sont saisies librement. La table `ouvrage` a été délibérément retirée du schéma : tant qu'aucun écran ne l'utilise, c'est du schéma mort. Elle arrivera avec l'écran qui la remplit.
