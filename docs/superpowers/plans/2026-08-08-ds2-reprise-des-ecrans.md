# DS2 — La reprise des écrans · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer les 1 409 lignes d'interface existantes sur le design system D'équerre, PDF inclus, sans casser un seul parcours.

**Architecture :** Le socle DS1 est en place. On ajoute les molécules et organismes que les écrans réclament — au fur et à mesure, jamais en avance — les trois gabarits, et le pont de tokens vers `@react-pdf/renderer`. Chaque rang est un commit livrable, validé par les tests Playwright existants.

**Tech Stack :** Next.js 16.3, React 19.2, Tailwind v4, `@react-pdf/renderer` 4.5, Vitest 4, Playwright.

**Prérequis :** `.env.local` et `.env.test` présents dans le worktree, sinon `src/proxy.ts` fait échouer chaque requête et rien n'est vérifiable.

**Référence :** [Spec image de marque](../specs/2026-08-08-image-de-marque-design.md) · [Plan DS1](2026-08-08-ds1-socle-marque.md)

---

## Décisions prises avant d'écrire une ligne

### 1. Les polices du PDF

`@react-pdf/renderer` ignore `next/font` : il lui faut des fichiers de police enregistrés via `Font.register`. Trois options, et une seule tient.

| Option | Verdict |
|---|---|
| Garder Helvetica | Rejetée. Le PDF est **la pièce que le client conserve** — c'est le pire endroit du produit pour perdre la marque. |
| Enregistrer depuis une URL Google Fonts | Rejetée. Une requête réseau à chaque rendu de PDF, sur un chemin qui doit rester fiable hors ligne. |
| **Embarquer les `.ttf` dans le dépôt** | **Retenue.** Quatre fichiers, environ 600 Ko au total. Archivo et Inter sont sous licence OFL : l'embarquement est explicitement autorisé. |

### 2. `unsafeClassName` n'est pas ouvert dans DS2

La spec prévoit cette échappatoire. Elle n'est **volontairement pas implémentée** dans cette reprise : si un écran en a besoin, c'est le signe qu'une variante manque au composant. On l'ajoutera quand un cas réel résistera, pas par anticipation.

### 3. Ce que la reprise ne touche pas

Aucune server action, aucun accès base, aucune règle métier. Si un diff de DS2 modifie un fichier de `src/domain`, `src/services` ou `src/db`, c'est une erreur. Cette frontière est ce qui rend les tests Playwright utilisables comme filet : ils doivent rester verts **sans modification**.

### 4. Le contrat des sélecteurs de test — à lire avant toute chose

Les tests de parcours interrogent l'interface par **26 `getByLabel`**, 9 `getByRole('button')`, 4 `getByRole('heading')`, 3 `getByTestId` et 6 `getByText`. Ils forment un contrat que la reprise ne peut pas rompre.

| Contrainte | Conséquence |
|---|---|
| `getByLabel('Client', { exact: true })` | Le **nom accessible** d'un champ doit rester exactement son étiquette. Tout ajout — même en `sr-only` — le casse. `Field` a été corrigé en conséquence : l'astérisque des champs obligatoires est `aria-hidden`, et c'est l'attribut `required` qui porte l'information pour les lecteurs d'écran. |
| 26 étiquettes citées mot pour mot | Aucun libellé ne change, pas même une majuscule ou une apostrophe. La reprise est une reprise de forme, pas de vocabulaire. |
| `getByTestId('statut-devis')` | `StatusBadge` doit pouvoir porter cet identifiant : d'où la prop `testId`, propagée jusqu'à `Badge`. |
| `getByTestId('lien-public')`, `getByTestId('total-ttc')` | À préserver sur les éléments correspondants de `devis/[id]` et du panneau de totaux. |
| `getByRole('status')` | Un élément porte `role="status"`. Le repérer avant de reprendre l'écran et le conserver. |
| `getByRole('heading', { name: … })` × 4 | Les titres doivent rester des `<h*>` réels avec le même texte. `Heading` le garantit, à condition d'utiliser `as` quand le niveau visuel diffère du niveau sémantique. |

Avant de commencer la Task 4, garder cette commande sous les yeux :

```bash
grep -rhoE "getBy(TestId|Role|Label|Text|Placeholder)\([^)]*\)" tests/e2e | sort -u
```

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/ui/molecules/status-badge.tsx` | Traduit un statut métier en `Badge` + picto. Le seul endroit qui connaît la correspondance. |
| `src/ui/molecules/seal-badge.tsx` | Le sceau de vérification, trois formats. |
| `src/ui/molecules/empty-state.tsx` | Écran vide avec une action. |
| `src/ui/molecules/summary-line.tsx` | Une ligne libellé / montant, alignée. |
| `src/ui/atoms/icon.tsx` | Les pictos Lucide utilisés, un par export nommé. |
| `src/ui/shells/app-shell.tsx` | L'artisan connecté. En-tête, largeur, thème. |
| `src/ui/shells/public-shell.tsx` | Le demandeur et le passeport. |
| `src/ui/organisms/app-header.tsx` | Verrouillage, entreprise, bascule de thème. |
| `src/ui/organisms/quote-table.tsx` | La liste des devis. |
| `src/ui/organisms/quote-lines-table.tsx` | Les lignes d'un devis en lecture. |
| `src/ui/organisms/totals-panel.tsx` | Totaux et ventilation de TVA. |
| `src/ui/organisms/legal-mentions-panel.tsx` | Le bloc de mentions obligatoires. |
| `src/ui/molecules/theme-toggle.tsx` | Client. Écrit `dq-theme` et `data-theme`. |
| `src/pdf/tokens.ts` | Le pont : rôles `light` → objets de style react-pdf. |
| `src/pdf/fonts.ts` | `Font.register` d'Archivo et Inter. |
| `src/pdf/fonts/*.ttf` | Les fichiers de police. |

---

## Task 1 : Les pictogrammes

**Files:**
- Modify: `package.json`
- Create: `src/ui/atoms/icon.tsx`

- [ ] **Step 1 : Installer Lucide**

Run : `pnpm add lucide-react`
Expected : une seule dépendance ajoutée.

- [ ] **Step 2 : Écrire `icon.tsx`**

```tsx
// src/ui/atoms/icon.tsx
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Moon,
  Plus,
  Send,
  Sun,
  Trash2,
  X,
} from 'lucide-react'

/**
 * Les seuls pictogrammes du produit.
 *
 * Passer par ce fichier plutot que d'importer Lucide partout impose le trait de
 * 1,75 px et les trois tailles, et rend l'inventaire visible : on voit d'un coup
 * d'oeil si un ecran introduit un picto de plus.
 */

const SIZES = { sm: 16, md: 20, lg: 24 } as const

type IconProps = { size?: keyof typeof SIZES }

function make(Glyph: typeof Check) {
  return function Icon({ size = 'md' }: IconProps) {
    return <Glyph size={SIZES[size]} strokeWidth={1.75} aria-hidden="true" />
  }
}

export const IconCheck = make(Check)
export const IconClock = make(Clock)
export const IconAlert = make(AlertTriangle)
export const IconClose = make(X)
export const IconPlus = make(Plus)
export const IconSend = make(Send)
export const IconTrash = make(Trash2)
export const IconBack = make(ArrowLeft)
export const IconNext = make(ChevronRight)
export const IconDocument = make(FileText)
export const IconSun = make(Sun)
export const IconMoon = make(Moon)
```

- [ ] **Step 3 : Vérifier**

Run : `pnpm exec tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add package.json pnpm-lock.yaml src/ui/atoms/icon.tsx
git commit -m "feat: les pictogrammes Lucide du produit, trait 1.75 et trois tailles"
```

---

## Task 2 : `StatusBadge` et la bascule de thème

**Files:**
- Create: `src/ui/molecules/status-badge.tsx`
- Create: `src/ui/molecules/theme-toggle.tsx`
- Create: `tests/ui/status-badge.test.ts`

- [ ] **Step 1 : Le test de la correspondance des statuts**

Le rendu n'est pas testable en environnement `node`, mais la **table de correspondance** l'est — et c'est elle qui porte le risque : un statut oublié afficherait une pastille neutre sans que personne ne s'en aperçoive.

```ts
// tests/ui/status-badge.test.ts
import { describe, expect, it } from 'vitest'
import { QUOTE_STATUS, PAYMENT_STATUS } from '@/ui/molecules/status-badge'

describe('correspondance des statuts', () => {
  it('couvre tous les statuts de devis du schema', () => {
    expect(Object.keys(QUOTE_STATUS).sort()).toEqual(
      ['draft', 'sent', 'signed', 'refused', 'expired'].sort(),
    )
  })

  it('couvre tous les statuts de paiement du schema', () => {
    expect(Object.keys(PAYMENT_STATUS).sort()).toEqual(
      ['unpaid', 'partial', 'paid', 'late'].sort(),
    )
  })

  it('n\'utilise jamais le ton neutre pour un etat problematique', () => {
    expect(QUOTE_STATUS.refused.tone).toBe('danger')
    expect(PAYMENT_STATUS.late.tone).toBe('danger')
  })
})
```

**Avant d'écrire le test, lire `src/db/schema/quote.ts` et `src/db/schema/invoice.ts` et remplacer les deux listes ci-dessus par les valeurs réelles du schéma.** Les cinq et quatre valeurs écrites ici sont l'hypothèse de départ, pas la vérité.

- [ ] **Step 2 : Lancer le test, le voir échouer**

Run : `pnpm exec vitest run tests/ui/status-badge.test.ts`
Expected : ÉCHEC — `Cannot find module '@/ui/molecules/status-badge'`.

- [ ] **Step 3 : Écrire `status-badge.tsx`**

```tsx
// src/ui/molecules/status-badge.tsx
import { Badge } from '@/ui/atoms/badge'
import { IconAlert, IconCheck, IconClock, IconClose, IconDocument } from '@/ui/atoms/icon'

/**
 * Le seul endroit du produit qui sait quelle couleur porte quel statut.
 *
 * Disperser cette correspondance dans les ecrans garantit qu'un jour « refuse »
 * sera vert quelque part. Un test verifie que tous les statuts du schema sont
 * couverts.
 */

type Entry = {
  tone: 'neutral' | 'verified' | 'warning' | 'danger'
  label: string
  icon: React.ReactNode
}

export const QUOTE_STATUS: Record<string, Entry> = {
  draft: { tone: 'neutral', label: 'Brouillon', icon: <IconDocument size="sm" /> },
  sent: { tone: 'warning', label: 'Envoyé', icon: <IconClock size="sm" /> },
  signed: { tone: 'verified', label: 'Signé', icon: <IconCheck size="sm" /> },
  refused: { tone: 'danger', label: 'Refusé', icon: <IconClose size="sm" /> },
  expired: { tone: 'danger', label: 'Expiré', icon: <IconAlert size="sm" /> },
}

export const PAYMENT_STATUS: Record<string, Entry> = {
  unpaid: { tone: 'warning', label: 'À encaisser', icon: <IconClock size="sm" /> },
  partial: { tone: 'warning', label: 'Partiellement payée', icon: <IconClock size="sm" /> },
  paid: { tone: 'verified', label: 'Payée', icon: <IconCheck size="sm" /> },
  late: { tone: 'danger', label: 'En retard', icon: <IconAlert size="sm" /> },
}

export function StatusBadge({
  kind,
  status,
  testId,
}: {
  kind: 'quote' | 'payment'
  status: string
  testId?: string
}) {
  const entry = (kind === 'quote' ? QUOTE_STATUS : PAYMENT_STATUS)[status]
  if (!entry) return null
  return (
    <Badge tone={entry.tone} icon={entry.icon} testId={testId}>
      {entry.label}
    </Badge>
  )
}
```

`Badge` accepte déjà `testId` (ajouté en DS1 pour cette raison). Sur la fiche de devis, l'appel sera `<StatusBadge kind="quote" status={quote.status} testId="statut-devis" />`.

- [ ] **Step 4 : Lancer le test**

Run : `pnpm exec vitest run tests/ui/status-badge.test.ts`
Expected : PASS. Si un statut du schéma manque, l'ajouter à la table — jamais retirer l'assertion.

- [ ] **Step 5 : Écrire `theme-toggle.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { IconMoon, IconSun } from '@/ui/atoms/icon'

type Choice = 'light' | 'dark'

/**
 * Client, et c'est l'un des cinq composants qui le sont.
 *
 * On ne propose que clair et sombre, pas de troisieme etat « systeme » : trois
 * positions dans un bouton a bascule sont illisibles, et le defaut est deja le
 * systeme tant que rien n'est stocke.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice | null>(null)

  useEffect(() => {
    const stored = document.documentElement.dataset.theme
    if (stored === 'light' || stored === 'dark') setChoice(stored)
    else
      setChoice(
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      )
  }, [])

  function apply(next: Choice) {
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('dq-theme', next)
    } catch {
      // Navigation privee : la preference ne survit pas a l'onglet, ce n'est pas grave.
    }
    setChoice(next)
  }

  // Avant l'effet, on ne sait pas quel theme est actif : afficher une icone au
  // hasard ferait clignoter le bouton. On reserve la place.
  if (choice === null) return <span className="inline-block size-11" />

  const next: Choice = choice === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => apply(next)}
      aria-label={next === 'dark' ? 'Passer en mode sombre' : 'Passer en mode clair'}
      className="inline-flex size-11 items-center justify-center rounded-control text-ink-soft hover:bg-rule/40"
    >
      {choice === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  )
}
```

- [ ] **Step 6 : Commit**

```bash
git add src/ui/molecules/status-badge.tsx src/ui/molecules/theme-toggle.tsx tests/ui/status-badge.test.ts
git commit -m "feat: correspondance des statuts metier et bascule de theme"
```

---

## Task 3 : Les gabarits

**Files:**
- Create: `src/ui/organisms/app-header.tsx`
- Create: `src/ui/shells/app-shell.tsx`
- Create: `src/ui/shells/public-shell.tsx`

- [ ] **Step 1 : `app-header.tsx`**

```tsx
// src/ui/organisms/app-header.tsx
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { ThemeToggle } from '@/ui/molecules/theme-toggle'

/**
 * L'en-tete de l'artisan connecte.
 *
 * Porte le verrouillage de la marque — donc `Mark`, jamais `Seal` : sur cet
 * ecran la marque s'exprime. Le sceau n'y apparaitra que sur le passeport d'une
 * autre entreprise.
 */
export function AppHeader({ companyName }: { companyName?: string }) {
  return (
    <header className="border-b border-rule bg-card">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3">
        <a href="/devis" className="rounded-badge">
          <Lockup size="sm" />
        </a>
        {companyName ? (
          <Text size="sm" tone="muted" as="span">
            {companyName}
          </Text>
        ) : null}
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2 : `app-shell.tsx`**

```tsx
// src/ui/shells/app-shell.tsx
import { AppHeader } from '@/ui/organisms/app-header'

/**
 * Le gabarit de l'artisan connecte : dense, mode sombre disponible.
 *
 * `max-w-5xl` plutot que le `max-w-2xl` des ecrans actuels : les tableaux de
 * devis et la ventilation de TVA etouffent en dessous.
 */
export function AppShell({
  companyName,
  children,
}: {
  companyName?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <AppHeader companyName={companyName} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3 : `public-shell.tsx`**

```tsx
// src/ui/shells/public-shell.tsx
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'

/**
 * Le gabarit du demandeur et du passeport.
 *
 * Clair par defaut et sans bascule de theme : c'est un document, il doit avoir
 * la meme tete pour tout le monde et ressembler au PDF qu'il accompagne.
 * `data-theme="light"` force le clair meme si le systeme est en sombre.
 *
 * La terre cuite n'est autorisee en fond de bouton que sous ce gabarit.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-rule bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center px-6 py-3">
          <Lockup size="sm" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-2xl px-6 py-8">
        <Text size="sm" tone="muted">
          Document émis avec D’équerre. Les mentions d’assurance et de
          rétractation y sont vérifiées à l’émission.
        </Text>
      </footer>
    </div>
  )
}
```

`data-theme="light"` sur un conteneur fonctionne parce que les variables `--dq-*` sont héritées : la variante `dark:` définie en DS1 cible `[data-theme='dark'] *`, donc elle ne s'active pas sous ce nœud.

- [ ] **Step 4 : Vérifier et committer**

Run : `pnpm exec tsc --noEmit`
Expected : aucune erreur.

```bash
git add src/ui/organisms/app-header.tsx src/ui/shells
git commit -m "feat: les gabarits de l'application et des pages publiques"
```

---

## Task 4 : Rang 2 — `LegalMentionsForm`

Le pire écran du projet : quatorze champs, un `const field = 'rounded-lg border border-black/15 …'` en dur, et aucun `htmlFor`. C'est le banc d'essai de `Field`.

**Files:**
- Modify: `src/app/(app)/mentions/LegalMentionsForm.tsx`
- Modify: `src/app/(app)/mentions/page.tsx`

- [ ] **Step 1 : Relire l'écran en entier**

Run : `cat 'src/app/(app)/mentions/LegalMentionsForm.tsx'`
Noter les quatorze `name=` : ils sont lus par la server action et **ne doivent pas changer**.

- [ ] **Step 2 : Remplacer chaque champ par un `Field`**

Le motif à appliquer, pour chaque champ. Avant :

```tsx
<label className="flex flex-col gap-2 text-sm">
  Numéro d’immatriculation
  <input
    name="registration_number"
    required
    placeholder="RCS Bordeaux 507 698 207"
    defaultValue={defaults.registrationNumber}
    className={field}
  />
  <span className="text-xs opacity-60">RCS ou Répertoire des métiers, avec la ville.</span>
</label>
```

Après :

```tsx
<Field
  label="Numéro d’immatriculation"
  help="RCS ou Répertoire des métiers, avec la ville."
  required
  error={state.errors?.registration_number}
>
  {(p) => (
    <Input
      {...p}
      name="registration_number"
      placeholder="RCS Bordeaux 507 698 207"
      defaultValue={defaults.registrationNumber}
    />
  )}
</Field>
```

Trois gains à chaque champ : l'étiquette est reliée par `htmlFor`, l'aide est reliée par `aria-describedby`, et l'erreur du `LegalFormState` s'affiche **sous son champ** au lieu de nulle part.

- [ ] **Step 3 : Vérifier la forme réelle des erreurs**

Run : `cat 'src/app/(app)/mentions/actions.ts'`
`LegalFormState` porte peut-être un message global plutôt qu'un dictionnaire par champ. Si c'est le cas, **ne pas modifier l'action** : afficher le message global au-dessus du formulaire dans un `Card`, et laisser `error` vide sur les `Field`. Élargir l'action est un chantier métier, pas de la reprise d'interface — le noter en fin de plan.

- [ ] **Step 4 : Supprimer la constante morte**

La ligne `const field = 'rounded-lg border border-black/15 px-3 py-2 dark:border-white/20'` doit disparaître. C'est la vérification la plus simple que la reprise est complète.

Run : `grep -n "border-black/15" 'src/app/(app)/mentions/LegalMentionsForm.tsx'`
Expected : aucun résultat.

- [ ] **Step 5 : Envelopper la page dans `AppShell`**

Dans `src/app/(app)/mentions/page.tsx`, remplacer le `<main className="mx-auto …">` par `<AppShell companyName={myCompany.legalName}>`.

- [ ] **Step 6 : Vérifier**

Run : `pnpm exec tsc --noEmit && pnpm lint && pnpm test:e2e`
Expected : aucune erreur, parcours verts.

- [ ] **Step 7 : Commit**

```bash
git add 'src/app/(app)/mentions'
git commit -m "refactor: les mentions legales passent sur Field, avec erreurs reliees aux champs"
```

---

## Task 5 : Rang 3 — `NewQuoteForm`

**Files:**
- Modify: `src/app/(app)/devis/nouveau/NewQuoteForm.tsx`
- Modify: `src/app/(app)/devis/nouveau/page.tsx`
- Create: `src/ui/molecules/summary-line.tsx`
- Create: `src/ui/organisms/totals-panel.tsx`

- [ ] **Step 1 : `summary-line.tsx`**

```tsx
// src/ui/molecules/summary-line.tsx
import { Money } from '@/ui/atoms/money'
import { cn } from '@/ui/cn'

/**
 * Une ligne libelle / montant.
 *
 * Le libelle et le montant sont pousses aux extremites, et le montant est en
 * chiffres tabulaires : c'est ce qui fait que plusieurs lignes empilees
 * s'alignent sur la virgule.
 */
export function SummaryLine({
  label,
  cents,
  emphasis = 'normal',
  testId,
}: {
  label: React.ReactNode
  cents: number
  emphasis?: 'normal' | 'muted' | 'total'
  testId?: string
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-1',
        emphasis === 'total' && 'border-t border-rule pt-2 mt-1',
      )}
    >
      <span className={cn('text-sm', emphasis === 'muted' ? 'text-ink-muted' : 'text-ink')}>
        {label}
      </span>
      <span data-testid={testId}>
        <Money cents={cents} emphasis={emphasis === 'total' ? 'strong' : 'normal'} />
      </span>
    </div>
  )
}
```

`data-testId` est indispensable : `NewQuoteForm` porte déjà `data-testid="total-ht"` et `data-testid="total-ttc"`, et les tests Playwright s'appuient dessus. **Les perdre casserait les tests.**

- [ ] **Step 2 : `totals-panel.tsx`**

```tsx
// src/ui/organisms/totals-panel.tsx
import { SummaryLine } from '@/ui/molecules/summary-line'

/** Le taux est en centiemes de pourcent : 2000 => « 20,0 % ». */
function formatRate(rate: number): string {
  return `${(rate / 100).toFixed(1).replace('.', ',')} %`
}

export function TotalsPanel({
  totals,
}: {
  totals: {
    totalExclTax: number
    totalInclTax: number
    byRate: Array<{ rate: number; baseExclTax: number; taxAmount: number }>
  }
}) {
  return (
    <div className="ml-auto w-full max-w-xs">
      <SummaryLine label="Total HT" cents={totals.totalExclTax} testId="total-ht" />
      {totals.byRate.map((b) => (
        <SummaryLine
          key={b.rate}
          label={`TVA ${formatRate(b.rate)} sur ${b.baseExclTax / 100} €`}
          cents={b.taxAmount}
          emphasis="muted"
        />
      ))}
      <SummaryLine
        label="Total TTC"
        cents={totals.totalInclTax}
        emphasis="total"
        testId="total-ttc"
      />
    </div>
  )
}
```

**Attention :** `formatRate` existe déjà dans le projet — `grep -rn "formatRate" src/` avant d'écrire ce fichier, et l'importer plutôt que le redéfinir.

- [ ] **Step 3 : Reprendre le formulaire**

Appliquer le motif `Field` de la Task 4 aux champs de l'en-tête (client, adresse, délai). Pour les lignes de devis, garder la structure de tableau existante mais remplacer chaque `<input>` par `<Input>` et chaque `<select>` par `<Select>`. Remplacer le bloc de totaux par `<TotalsPanel totals={totals} />`.

- [ ] **Step 4 : Vérifier que les identifiants de test survivent**

Run : `grep -n "data-testid" 'src/app/(app)/devis/nouveau/NewQuoteForm.tsx' src/ui/organisms/totals-panel.tsx src/ui/molecules/summary-line.tsx`
Expected : `total-ht` et `total-ttc` présents.

Run : `pnpm test:e2e`
Expected : verts.

- [ ] **Step 5 : Commit**

```bash
git add 'src/app/(app)/devis/nouveau' src/ui/molecules/summary-line.tsx src/ui/organisms/totals-panel.tsx
git commit -m "refactor: la redaction de devis passe sur le design system"
```

---

## Task 6 : Rang 4 — la liste et la fiche de devis

**Files:**
- Modify: `src/app/(app)/devis/page.tsx`
- Modify: `src/app/(app)/devis/[id]/page.tsx`
- Modify: `src/app/(app)/devis/[id]/SendButton.tsx`
- Create: `src/ui/organisms/quote-table.tsx`
- Create: `src/ui/organisms/quote-lines-table.tsx`
- Create: `src/ui/molecules/empty-state.tsx`

- [ ] **Step 1 : `empty-state.tsx`**

```tsx
// src/ui/molecules/empty-state.tsx
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

/**
 * Un ecran vide dit toujours quoi faire ensuite.
 *
 * `action` est requis : un vide sans porte de sortie est un cul-de-sac, et c'est
 * exactement l'ecran que voit un artisan a sa premiere connexion.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <Card elevation="flat">
      <div className="flex flex-col items-start gap-3 py-6">
        <Heading level={3}>{title}</Heading>
        <Text tone="soft">{description}</Text>
        <div className="mt-2">{action}</div>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2 : `quote-table.tsx`**

```tsx
// src/ui/organisms/quote-table.tsx
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { StatusBadge } from '@/ui/molecules/status-badge'
import Link from 'next/link'

export type QuoteRow = {
  id: string
  number: string | null
  label: string
  totalInclTax: number
  status: string
}

/**
 * La liste des devis.
 *
 * Une liste de cartes cliquables plutot qu'un `<table>` : sur mobile un tableau
 * a cinq colonnes force le defilement horizontal, et l'artisan consulte ses
 * devis depuis un chantier.
 */
export function QuoteTable({ quotes }: { quotes: QuoteRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {quotes.map((q) => (
        <li key={q.id}>
          <Link href={`/devis/${q.id}`} className="block rounded-card">
            <Card elevation="e1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Text size="sm" tone="muted" as="span">
                    {q.number ?? 'Brouillon'}
                  </Text>
                  <Text as="span">{q.label}</Text>
                </div>
                <StatusBadge kind="quote" status={q.status} />
                <Money cents={q.totalInclTax} emphasis="strong" />
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3 : `quote-lines-table.tsx`**

```tsx
// src/ui/organisms/quote-lines-table.tsx
import { Money } from '@/ui/atoms/money'

/** Le taux est en centiemes de pourcent : 2000 => « 20,0 % ». */
function formatRate(rate: number): string {
  return `${(rate / 100).toFixed(1).replace('.', ',')} %`
}

export type QuoteLine = {
  label: string
  quantity: string
  unit: string
  unitPriceExclTax: number
  taxRate: number
}

/**
 * Les lignes d'un devis en lecture.
 *
 * Ici le `<table>` est le bon choix, contrairement a la liste des devis : c'est
 * de la donnee tabulaire, avec des colonnes de montants qui doivent s'aligner.
 * Le conteneur defile horizontalement plutot que la page.
 */
export function QuoteLinesTable({ lines }: { lines: QuoteLine[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-md text-sm">
        <thead>
          <tr className="border-b border-field text-left">
            <th className="py-2 font-semibold text-ink">Désignation</th>
            <th className="py-2 text-right font-semibold text-ink">Qté</th>
            <th className="py-2 text-right font-semibold text-ink">P.U. HT</th>
            <th className="py-2 text-right font-semibold text-ink">TVA</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="border-b border-rule">
              <td className="py-2 text-ink">{line.label}</td>
              <td className="py-2 text-right tabular-nums text-ink-soft">
                {line.quantity} {line.unit}
              </td>
              <td className="py-2 text-right">
                <Money cents={line.unitPriceExclTax} currency={false} />
              </td>
              <td className="py-2 text-right tabular-nums text-ink-soft">
                {formatRate(line.taxRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4 : Reprendre les deux pages**

Envelopper dans `AppShell`, remplacer les titres par `Heading`, le lien « Créer un devis » par `<Button>` dans un `Link`, la liste par `QuoteTable`, le tableau de lignes par `QuoteLinesTable`, les totaux par `TotalsPanel`, et ajouter `EmptyState` quand `quotes.length === 0` — l'écran de première connexion, aujourd'hui vide.

- [ ] **Step 5 : Vérifier et committer**

Run : `pnpm exec tsc --noEmit && pnpm lint && pnpm test:e2e`

```bash
git add 'src/app/(app)/devis' src/ui/organisms src/ui/molecules/empty-state.tsx
git commit -m "refactor: liste et fiche de devis sur le design system, avec ecran vide"
```

---

## Task 7 : Rang 5 — la page publique de signature

**Le plus fort enjeu de marque du produit.** C'est là qu'un client découvre l'entreprise, et la seule page où la terre cuite devient bouton de conversion.

**Files:**
- Modify: `src/app/d/[token]/page.tsx`
- Modify: `src/app/d/[token]/SignatureBlock.tsx`
- Create: `src/ui/molecules/seal-badge.tsx`
- Create: `src/ui/organisms/legal-mentions-panel.tsx`

- [ ] **Step 1 : `seal-badge.tsx`**

```tsx
// src/ui/molecules/seal-badge.tsx
import { Text } from '@/ui/atoms/text'
import { Seal } from '@/ui/brand/seal'

/**
 * Le sceau de verification — l'objet que l'artisan diffuse lui-meme.
 *
 * Il porte TOUJOURS l'activite couverte et l'URL du passeport. Un sceau qui
 * affiche « verifiee » sans dire de quoi ni ou le verifier est exactement le
 * mensonge que le produit existe pour supprimer : les deux props sont donc
 * requises, et c'est le compilateur qui le fait respecter.
 */
export function SealBadge({
  activities,
  passportUrl,
  format = 'block',
}: {
  activities: string
  passportUrl: string
  format?: 'block' | 'compact'
}) {
  if (format === 'compact') {
    return (
      <span className="inline-flex items-center gap-2 rounded-control border border-rule bg-card px-3 py-2">
        <Seal size={24} />
        <span className="text-xs font-semibold text-ink">Entreprise vérifiée</span>
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-card border border-rule bg-card p-4">
      <Seal size={36} />
      <div className="flex min-w-0 flex-col">
        <Text size="sm" as="span">
          <strong>Entreprise vérifiée</strong>
        </Text>
        <Text size="sm" tone="muted" as="span">
          Assurance à jour · {activities}
        </Text>
        <Text size="sm" tone="muted" as="span">
          {passportUrl}
        </Text>
      </div>
    </div>
  )
}
```

**Note de périmètre :** en M2, la vérification n'existe pas encore — `EntrepriseActivite` arrive en M3. Ce composant ne doit donc **pas** être affiché sur la page de signature tant que la donnée est déclarative : afficher « vérifiée » sur du déclaratif serait le mensonge décrit ci-dessus. Il est créé ici parce que le PDF (Task 8) en a besoin en variante `compact` **sans** la mention « vérifiée » — voir Task 8, Step 3.

- [ ] **Step 2 : `legal-mentions-panel.tsx`**

```tsx
// src/ui/organisms/legal-mentions-panel.tsx
import { Text } from '@/ui/atoms/text'

/**
 * Les mentions imposees par l'article L243-2 du Code des assurances.
 *
 * Leur absence expose l'artisan a 3 000 EUR d'amende, 15 000 EUR pour une
 * societe, par infraction constatee. Ce composant n'a donc aucune prop
 * optionnelle : un champ manquant est une erreur de compilation, pas un bloc
 * qui s'affiche a moitie.
 */
export function LegalMentionsPanel({
  insurerName,
  insurerAddress,
  policyNumber,
  coveredActivities,
  coverageArea,
}: {
  insurerName: string
  insurerAddress: string
  policyNumber: string
  coveredActivities: string
  coverageArea: string
}) {
  return (
    <section className="border-t border-rule pt-4">
      <Text size="label" tone="muted">
        Assurance professionnelle
      </Text>
      <div className="mt-2 flex flex-col gap-0.5">
        <Text size="sm" tone="soft">
          {insurerName} — {insurerAddress}
        </Text>
        <Text size="sm" tone="soft">
          Contrat n° {policyNumber}
        </Text>
        <Text size="sm" tone="soft">
          Activités garanties : {coveredActivities}
        </Text>
        <Text size="sm" tone="soft">
          Couverture géographique : {coverageArea}
        </Text>
      </div>
    </section>
  )
}
```

- [ ] **Step 3 : Reprendre la page**

Envelopper dans `PublicShell`. Le bouton de signature passe en `<Button tone="conversion" size="lg">`. Les totaux passent par `TotalsPanel`, les lignes par `QuoteLinesTable`, les mentions d'assurance par `LegalMentionsPanel`.

- [ ] **Step 4 : Vérifier que le parcours de signature tient**

Run : `pnpm test:e2e`
Expected : verts. C'est le parcours couvert de bout en bout par `tests/e2e` — s'il casse ici, la reprise a touché à autre chose que la présentation.

- [ ] **Step 5 : Commit**

```bash
git add 'src/app/d' src/ui/molecules/seal-badge.tsx src/ui/organisms/legal-mentions-panel.tsx
git commit -m "refactor: la page publique de signature sur le gabarit public"
```

---

## Task 8 : Rang 6 — le PDF

**Files:**
- Create: `src/pdf/fonts/` — quatre `.ttf`
- Create: `src/pdf/fonts.ts`
- Create: `src/pdf/tokens.ts`
- Create: `tests/ui/pdf-tokens.test.ts`
- Modify: `src/pdf/quote-pdf.tsx`

- [ ] **Step 1 : Récupérer les fichiers de police**

```bash
mkdir -p src/pdf/fonts
curl -sL -o src/pdf/fonts/Inter-Regular.ttf \
  "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf"
curl -sL -o src/pdf/fonts/Inter-SemiBold.ttf \
  "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-SemiBold.ttf"
curl -sL -o src/pdf/fonts/Archivo-Bold.ttf \
  "https://github.com/Omnibus-Type/Archivo/raw/master/fonts/ttf/Archivo-Bold.ttf"
curl -sL -o src/pdf/fonts/Archivo-ExtraBold.ttf \
  "https://github.com/Omnibus-Type/Archivo/raw/master/fonts/ttf/Archivo-ExtraBold.ttf"
```

Vérifier que les quatre fichiers pèsent plus de 100 Ko chacun : `ls -la src/pdf/fonts/`. Un fichier de 9 octets est une page d'erreur GitHub, pas une police. Si une URL a bougé, prendre les fichiers depuis `node_modules/.pnpm` — `next/font` les a déjà téléchargés au premier build.

- [ ] **Step 2 : `src/pdf/fonts.ts`**

```ts
// src/pdf/fonts.ts
import { Font } from '@react-pdf/renderer'
import { join } from 'node:path'

/**
 * Enregistre les polices de la marque pour le PDF.
 *
 * `@react-pdf/renderer` ignore `next/font` : il lui faut des fichiers. On les
 * embarque plutot que de les charger depuis une URL, parce qu'un rendu de PDF
 * ne doit dependre d'aucun reseau.
 *
 * Appele une seule fois a l'import du module de rendu.
 */
let registered = false

export function registerBrandFonts(): void {
  if (registered) return

  const dir = join(process.cwd(), 'src', 'pdf', 'fonts')

  Font.register({
    family: 'Inter',
    fonts: [
      { src: join(dir, 'Inter-Regular.ttf'), fontWeight: 400 },
      { src: join(dir, 'Inter-SemiBold.ttf'), fontWeight: 600 },
    ],
  })

  Font.register({
    family: 'Archivo',
    fonts: [
      { src: join(dir, 'Archivo-Bold.ttf'), fontWeight: 700 },
      { src: join(dir, 'Archivo-ExtraBold.ttf'), fontWeight: 800 },
    ],
  })

  // Sans ca, react-pdf coupe les mots francais n'importe ou.
  Font.registerHyphenationCallback((word) => [word])

  registered = true
}
```

- [ ] **Step 3 : `src/pdf/tokens.ts`**

```ts
// src/pdf/tokens.ts
import { roles } from '@/ui/tokens'

/**
 * Le pont entre les tokens et `@react-pdf/renderer`.
 *
 * Un PDF n'a pas de mode sombre : il utilise toujours les roles `light`. Il
 * n'a pas non plus de terre cuite — un aplat de couleur boit l'encre et une
 * photocopie le rend gris. Le document est donc monochrome par construction, et
 * seul le sceau y apparait, en une encre.
 */
export const pdf = {
  ink: roles.light.ink,
  soft: roles.light['ink-soft'],
  muted: roles.light['ink-muted'],
  rule: roles.light.rule,
  field: roles.light.field,
  paper: '#FFFFFF',
} as const
```

- [ ] **Step 4 : Le test qui empêche la dérive**

```ts
// tests/ui/pdf-tokens.test.ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { pdf } from '@/pdf/tokens'
import { roles } from '@/ui/tokens'

const source = readFileSync(
  fileURLToPath(new URL('../../src/pdf/quote-pdf.tsx', import.meta.url)),
  'utf8',
)

describe('le PDF ne contient aucune couleur en dur', () => {
  it('aucun litteral hexadecimal dans quote-pdf.tsx', () => {
    const found = source.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? []
    expect(found).toEqual([])
  })

  it('les couleurs du PDF viennent des roles clairs', () => {
    expect(pdf.ink).toBe(roles.light.ink)
    expect(pdf.muted).toBe(roles.light['ink-muted'])
    expect(pdf.rule).toBe(roles.light.rule)
  })
})
```

- [ ] **Step 5 : Lancer le test, le voir échouer**

Run : `pnpm exec vitest run tests/ui/pdf-tokens.test.ts`
Expected : ÉCHEC — la liste des hexadécimaux trouvés contient `#1a1a1a`, `#666`, `#ddd`, `#999`, `#ccc`, `#555`, `#888`.

- [ ] **Step 6 : Reprendre `quote-pdf.tsx`**

Appeler `registerBrandFonts()` au niveau du module, remplacer chaque littéral par `pdf.*`, et remplacer `fontFamily: 'Helvetica'` par `'Inter'` et `'Helvetica-Bold'` par `{ fontFamily: 'Archivo', fontWeight: 700 }`. Remplacer aussi les `format(x)} €` par une helper locale pour que le symbole soit posé une seule fois.

- [ ] **Step 7 : Lancer le test et vérifier un PDF réel**

Run : `pnpm exec vitest run tests/ui/pdf-tokens.test.ts`
Expected : PASS.

Run : `pnpm test:e2e`
Expected : verts — un test du parcours télécharge le PDF, donc un échec de police y apparaît.

Ouvrir le PDF téléchargé par Playwright et vérifier à l'œil que les titres sont en Archivo et le corps en Inter. Un `Font.register` qui échoue ne lève pas toujours : il retombe silencieusement sur Helvetica.

- [ ] **Step 8 : Commit**

```bash
git add src/pdf tests/ui/pdf-tokens.test.ts
git commit -m "refactor: le PDF de devis sur les tokens et les polices de la marque"
```

---

## Task 9 : Rang 7 — les écrans restants

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/connexion/page.tsx`
- Modify: `src/app/(app)/inscription/page.tsx`
- Modify: `src/app/confidentialite/page.tsx`
- Modify: `.env.example`

- [ ] **Step 1 : La page d'accueil**

Elle est encore le gabarit `create-next-app` : logo Next.js, « To get started, edit page.tsx », liens vers Vercel. La remplacer par une accroche minimale sous `PublicShell` — verrouillage, la promesse, un lien vers `/connexion`. Ce n'est pas une page marketing, c'est la suppression d'un gabarit de démonstration.

Supprimer aussi les fichiers devenus morts :

```bash
git rm public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg
```

- [ ] **Step 2 : Connexion et inscription**

Envelopper dans `PublicShell`, passer les champs sur `Field` + `Input`, les boutons sur `Button`. Ces deux écrans sont courts et sans piège.

- [ ] **Step 3 : Confidentialité**

Page de texte long. Envelopper dans `PublicShell`, remplacer les titres par `Heading` et les paragraphes par `Text`. Vérifier que la mesure de ligne reste lisible : sous `PublicShell`, `max-w-2xl` donne environ 70 caractères, ce qui est la cible.

- [ ] **Step 4 : Les traces du nom de code**

Dans `.env.example`, remplacer `SMS_SENDER=Workaround` par `SMS_SENDER=DEQUERRE` et `SMTP_FROM=Workaround <devis@workaround.local>` par `SMTP_FROM=D'équerre <devis@dequerre.local>`.

> **À signaler à l'utilisateur, pas à faire dans ce plan :** l'émetteur alphanumérique doit être déclaré au registre de l'AF2M avant d'être utilisé en production, et le `SMS_SENDER` du `.env` de production ne peut donc pas changer le même jour. Le champ `name` de `package.json` reste `workaround` : le renommer touche au verrou de dépendances pour zéro gain fonctionnel.

- [ ] **Step 5 : Vérifier et committer**

Run : `pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test:e2e`

```bash
git add src/app public .env.example
git commit -m "refactor: accueil, connexion, inscription et confidentialite sur le design system"
```

---

## Task 10 : Vérification finale

- [ ] **Step 1 : Aucune couleur en dur ne subsiste dans l'interface**

Run : `grep -rnE "(bg|text|border)-(black|white|zinc|slate|gray|neutral|stone|blue|red|green)-?[0-9]*" src/app src/ui`
Expected : aucun résultat. Chaque occurrence est un écran qui a échappé à la reprise.

- [ ] **Step 2 : Aucune opacité de couleur codée à la main**

Run : `grep -rnE "(black|white)/[0-9]+" src/app src/ui`
Expected : aucun résultat.

- [ ] **Step 3 : La chaîne complète**

Run : `pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build`
Expected : tout vert. `pnpm test` réinitialise la base et lance l'ensemble des tests.

- [ ] **Step 4 : Les deux thèmes, à l'œil**

Run : `pnpm dev`, parcourir `/design-system`, `/devis`, `/devis/nouveau`, une fiche de devis et une page de signature, dans les deux thèmes, à 375 px et en 1440 px.
Expected : aucun défilement horizontal, aucun texte illisible, aucune bordure disparue.

- [ ] **Step 5 : Commit et push**

```bash
git add -A
git commit -m "docs: plan DS2 execute"
git push
```

---

## Auto-revue

**Couverture des rangs de la spec §7.1.** Rang 2 → Task 4. Rang 3 → Task 5. Rang 4 → Task 6. Rang 5 → Task 7. Rang 6 → Task 8. Rang 7 → Task 9. Rang 8 (vitrine) → déjà livré en DS1, puisque les composants existaient au moment de l'écrire. Les Tasks 1 à 3 sont les prérequis transverses que la spec plaçait implicitement dans les rangs.

**Inventaire de la spec §6.1 — ce qui reste non construit, et pourquoi.** `Toast`, `Tooltip`, `Dialog`, `ButtonGroup`, `Skeleton`, `HelperText`, `FieldError` : aucun écran de M1 ni M2 ne les réclame — `Field` porte déjà l'aide et l'erreur, et il n'y a aucune action asynchrone sans rechargement de page. `VatBreakdown` est absorbé par `TotalsPanel`, qui affiche déjà `byRate`. `PaymentTimeline` et `QuoteLineEditor` attendent que M2 ait des écrans de facture — aujourd'hui la facturation n'a pas d'interface. `PdfShell` s'est révélé inutile : `src/pdf/tokens.ts` et `Page style` suffisent, un gabarit de plus serait une couche vide. Ces écarts sont assumés, conformément à la décision d'inventaire fermé.

**Cohérence des types.** `formatRate` est défini deux fois dans ce plan — Task 5 et Task 6 — et les deux Steps signalent d'aller chercher la version existante du projet avant d'écrire. `QuoteRow.status` et `StatusBadge.status` sont tous deux `string`, ce qui est volontaire : le statut vient de la base, et le test de Task 2 garantit la couverture de la table plutôt que le type. `SummaryLine.cents` et `Money.cents` sont tous deux `Cents`. `SealBadge` exige `activities` et `passportUrl`, et Task 7 Step 1 explique pourquoi il n'est pas affiché avant M3.

**Le risque principal de ce plan.** Les tests Playwright s'appuient sur `data-testid` et sur des sélecteurs de texte. Task 5 Step 4 vérifie explicitement `total-ht` et `total-ttc`, mais d'autres sélecteurs peuvent exister. Avant de commencer la Task 4, lancer `grep -rn "getByTestId\|getByRole\|getByLabel\|getByText" tests/e2e` et garder la liste sous les yeux pendant toute la reprise.
