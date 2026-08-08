# Image de marque et design system — Design

> Spec de l'identité de marque et du design system atomique.
> Date : 2026-08-08 · Statut : à valider
> Dépend de : [Socle Artisan — Design P1](2026-08-07-socle-artisan-design.md)

---

## 1. Ce que la marque doit porter

Le produit s'adresse d'abord à **l'entreprise artisanale**, qui adopte l'outil, paie l'abonnement Pro et alimente le capteur. Il s'adresse ensuite au **demandeur** — prioritairement le bailleur — qui signe, valide et consulte son carnet. Et il s'expose enfin à **n'importe qui** via le passeport public indexé.

Trois surfaces, une seule marque.

> **Décision.** Une marque unique couvre l'outil, le passeport et l'espace demandeur. Deux notoriétés à financer sur une ville et sans budget média est un luxe qu'on ne peut pas s'offrir. Conséquence directe : le logo doit être conçu d'emblée comme un **sceau** — lisible à 16 px, en une seule encre, sur un devis photocopié.

La marque doit tenir ensemble deux registres que le secteur oppose d'habitude : la **gravité** (assurance, preuve, obligation légale, amende de 15 000 €) et **l'usage quotidien** (un outil qu'on ouvre dix fois par jour sur un chantier).

## 2. Le benchmark

Relevé le 2026-08-08 directement sur les sites, en lisant les couleurs calculées et les polices réellement chargées.

| Marque | Rôle | Couleur | Typo | Rayon |
|---|---|---|---|---|
| Obat | Leader FR, 25–79 €/mois | `#1591F0` bleu | Aeonik / Poppins 500 | 99 px |
| Tolteck | 19–25 €/mois | `#0DA9C8` cyan | Montserrat 500 | 30 px |
| Doctolib | L'analogie de la thèse | `#107ACA` bleu | Roboto | 8 px |
| Jobber | Leader US du logiciel artisan | `#012939` + `#A8E300` + `#F2F0EA` | propriétaire 900 | 4 px |
| Pennylane | Pros du chiffre et du juridique | `#003D3D` + `#00F872` + `#F8F4F1` | Manrope 600 | 4–6 px |

**Le code dominant du secteur artisan français** : bleu ou cyan saturé, boutons en pilule, Poppins ou Montserrat, gris froids, et la même promesse — « gagner du temps ». Aucun acteur n'est reconnaissable sans son logo.

**Le code des marques professionnelles crédibles** : une couleur de marque très sombre et désaturée qui sert de texte et de surface plutôt que de bouton, **un seul** accent vif réservé à l'action, un neutre **chaud** au lieu d'un gris froid, un rayon petit, une graisse forte en titrage. Jobber et Pennylane sont reconnaissables sur un aplat, sans logo.

> **Décision.** Pas de bleu. C'est le territoire le plus encombré et le moins défendable du secteur ; le prendre rendrait la différenciation invisible avant même qu'on lise la promesse.

## 3. Le nom

### 3.1 Ce qui a été écarté

**Workaround** était un nom de code. En anglais, un *workaround* est une rustine, un contournement provisoire — le contraire exact d'une thèse fondée sur la preuve non falsifiable et la mémoire permanente. Le mot est par ailleurs du jargon informatique anglo-saxon, illisible pour un artisan français, et générique au point d'être inréférençable.

**Aplomb** a été retenu puis abandonné. Le double sens était idéal — le fil à plomb vérifie la verticalité, « avoir de l'aplomb » désigne l'assurance — mais la vérification DNS a révélé trois homonymes installés dans le secteur :

| Domaine | Occupant |
|---|---|
| `aplomb.fr` | APLOMB — « une expertise à la hauteur de vos projets » |
| `aplomb.pro` | APLOMB — diagnostics avant travaux, Paris |
| `aplomb.build` | Aplomb — **éditeur de logiciel de contrôle qualité pour le bâtiment** |

Un dépôt en classes 9 et 42 se serait fait contre eux, et le référencement aussi.

### 3.2 Le nom retenu

> **Décision. La marque est « D'équerre », le domaine est `dequerre.fr`, la signature est « Tout est d'équerre. »**

« Être d'équerre » signifie dans la langue courante **être en règle, en ordre, droit**. Dans le métier, c'est l'angle vérifié — l'équerre ne mesure pas, elle **contrôle**. Le mot porte donc simultanément la rectitude technique et la fiabilité morale, dans un vocabulaire que l'artisan emploie déjà.

**Disponibilité vérifiée le 2026-08-08** — libres : `dequerre.fr`, `dequerre.app`, `equerre.pro`, `equerre.build`, `equerre.io`. Occupés : `equerre.fr` (enregistré mais renvoie une erreur 521, donc dormant et peut-être rachetable), `dequerre.com`, `equerre.co`.

> **Réserve ouverte, non bloquante.** Le DNS n'est pas le registre des marques. Une **recherche d'antériorité INPI en classes 9, 35 et 42** doit être conduite avant tout dépôt. Elle est indépendante du design system et n'en bloque aucune étape : seuls les fichiers `public/brand/` et le logotype seraient à reprendre en cas de conflit.

## 4. Le système de logo

Deux dessins, deux fonctions. Ce ne sont pas deux logos concurrents.

### 4.1 La marque — bicolore

Une équerre de maçon vue de face. Le bras vertical en encre, la lame horizontale en terre cuite, et un carré logé dans l'angle intérieur — **le signe conventionnel de l'angle droit vérifié**, celui qu'on trace sur un plan pour dire « ici, c'est contrôlé ». C'est le passeport réduit à sa plus simple expression.

```
viewBox 0 0 48 48
bras vertical  M8 4  H19 V29 H8 Z         encre
lame           M8 29 H44 V40 H8 Z         terre cuite
angle vérifié  rect x=19 y=22 w=7 h=7     encre
```

**Usage :** partout où la marque s'exprime — en-tête d'application, logotype, site, signature d'e-mail, en-tête de PDF. **Jamais dans un cadre.**

En une seule encre, les deux bras se rejoignent : le monochrome est natif, sans variante à maintenir.

### 4.2 Le sceau — médaillon

L'équerre en réserve dans un carré arrondi plein, avec l'angle vérifié en terre cuite.

```
viewBox 0 0 48 48
médaillon      rect 0 0 48 48 rx=11       encre
équerre        M13 10 H21 V28 H38 V36 H13 Z   craie (réserve)
angle vérifié  rect x=21 y=21 w=7 h=7     terre cuite
```

**Usage :** partout où la marque s'appose — favicon, icône d'application, sceau de vérification, tampon. **Toujours seul**, jamais accompagné du logotype.

Le choix est dicté par l'usage, pas par le goût : à 16 px la masse sombre tient l'espace là où la marque bicolore flotte ; l'icône d'application est de toute façon enfermée par l'OS dans un carré arrondi ; et sur un devis photocopié en une seule encre le bicolore perd tout son intérêt.

> **Garde-fou.** Les deux ne se côtoient jamais dans un même écran. Sur une page qui porte l'en-tête de la marque, le sceau n'apparaît que sur le passeport d'une **autre** entreprise — jamais comme seconde expression de la nôtre.

### 4.3 Le logotype

**Archivo 800**, bas de casse, chasse resserrée de 3,5 %. Les capitales sont un usage secondaire réservé aux tampons, à la gravure et à la signalétique.

Deux points de rigueur typographique : l'apostrophe est une **apostrophe typographique** (`’`), jamais l'apostrophe droite du clavier ; l'**accent aigu est conservé sur le É en capitales**.

### 4.4 Zone de protection et tailles

- Zone de protection : la largeur d'un bras de l'équerre sur les quatre côtés.
- Taille minimale : **24 px** pour le verrouillage complet, **16 px** pour le symbole seul.
- **Sous 24 px, le carré terre cuite disparaît** — il se refermerait en tache.

### 4.5 Le sceau de vérification

L'objet le plus stratégique de l'identité : c'est ce que l'artisan diffuse lui-même, gratuitement, parce que ça lui sert d'argument commercial. Trois formats — widget web sur fond sombre, bloc PDF en une encre, compact pour carte de visite.

> **Règle non négociable.** Le sceau porte **toujours** l'activité couverte et l'URL du passeport. Un sceau qui affiche « vérifiée » sans dire de quoi ni où le vérifier est exactement le mensonge que le produit existe pour supprimer.

### 4.6 Interdits

Déformer, appliquer un dégradé, faire pivoter, affiner le trait, et poser la marque en bleu.

## 5. La charte graphique

### 5.1 Les rampes

Aucun gris froid : toute la neutralité tire vers le brun. C'est ce qui sépare « bureau d'études » d'« atelier ».

**Craie → Encre** — neutres chauds, l'ossature

| | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|---|
| | `#FDFCF8` | `#F5F1E8` | `#EBE5D9` | `#DCD4C4` | `#C4BBA8` | `#8C8375` | `#6B6357` | `#4A4239` | `#2E2822` | `#1C1714` |

**Terre cuite** — la marque, l'accent, jamais un statut

| 50 | 100 | 200 | 300 | 500 | 600 | 700 | 900 |
|---|---|---|---|---|---|---|---|
| `#FDF2EC` | `#FBE0D2` | `#F5BE9B` | `#F0A87E` | `#E2652B` | `#C4501C` | `#9E3E14` | `#5C2409` |

**Bronze** — vérifié, signé, payé

| 50 | 100 | 300 | 400 | 600 | 700 |
|---|---|---|---|---|---|
| `#EDF1E4` | `#D9E2C9` | `#9CBB7E` | `#6B8C4F` | `#4F6B3A` | `#3B5229` |

**Laiton** — échéance proche, à traiter

| 50 | 100 | 300 | 500 | 600 | 700 |
|---|---|---|---|---|---|
| `#FBF3DF` | `#F5E9C9` | `#DDB661` | `#C79A3E` | `#A67D28` | `#7A5C16` |

**Brique** — périmé, en retard, destructif

| 50 | 100 | 300 | 500 | 600 | 700 |
|---|---|---|---|---|---|
| `#FBEAE8` | `#F5CFCB` | `#EC8B80` | `#C22B22` | `#9B1C1C` | `#8E1B15` |

### 5.2 Pourquoi le laiton ne dit pas « vérifié »

L'intention initiale était d'attribuer le laiton aux états vérifiés. Elle ne tient pas : si le laiton dit « vérifié », plus aucune couleur ne reste pour dire « attention », sauf la terre cuite — qui est la marque. On obtiendrait un accent de marque signifiant « problème ».

> **Décision.** Le laiton porte l'alerte, le bronze porte la vérification. Les trois états de l'assurance forment alors un dégradé lisible instantanément, version chaude du feu tricolore :
> **bronze « décennale à jour » → laiton « expire dans 24 jours » → brique « attestation périmée »**.
>
> Chaque état porte **un pictogramme distinct**. La couleur ne porte jamais l'information seule — condition pour que l'écran reste lisible par un daltonien comme sur un devis photocopié.

### 5.3 Les rôles sémantiques

Ratios WCAG calculés, pas estimés. Le script de vérification est rejoué en CI (§7.3).

| Rôle | Clair | Ratio | Sombre | Ratio |
|---|---|---|---|---|
| `surface` | `#F5F1E8` | — | `#14110E` | — |
| `surface-card` | `#FDFCF8` | — | `#1F1A16` | — |
| `surface-raised` | `#FFFFFF` | — | `#2A2320` | — |
| `text-primary` | `#1C1714` | 15,76 AAA | `#F5F1E8` | 15,30 AAA |
| `text-secondary` | `#4A4239` | 8,75 AAA | `#B8AE9B` | 7,86 AAA |
| `text-muted` | `#6B6357` | 5,25 AA | `#918878` | 4,93 AA |
| `link` | `#9E3E14` | 5,91 AA | `#F0844D` | 6,66 AA |
| `border-field` | `#8C8375` | 3,32 AA-UI | `#8C8375` | 4,61 AA-UI |
| `ring` | `#C4501C` | 3,71 AA-UI | `#F0844D` | 6,66 AA-UI |
| `button-primary` | `#1C1714` | 15,76 AAA | `#F5F1E8` | 16,69 AAA |
| `verified` | `#3B5229` | 7,55 AAA | `#9CBB7E` | 8,07 AAA |
| `warning` | `#7A5C16` | 5,63 AA | `#DDB661` | 8,98 AAA |
| `danger` | `#8E1B15` | 7,78 AAA | `#EC8B80` | 7,04 AAA |

**Base de mesure.** Les rôles de texte, `link`, `border-field` et `ring` sont mesurés contre `surface` et `surface-card`, en retenant la valeur la plus défavorable. Les rôles `verified`, `warning` et `danger` sont mesurés en clair contre leur propre fond teinté (`bronze-50`, `laiton-50`, `brique-50`), et en sombre contre `surface-card`. `button-primary` est mesuré contre sa propre étiquette : craie sur encre en clair, encre sur craie en sombre.

En mode sombre, le bouton primaire est donc **craie sur encre inversée** — la transposition directe de la règle du §5.4, et non la terre cuite, qui resterait confusable avec le danger.

Trois valeurs de la première proposition ne passaient pas et ont été corrigées : le lien terre cuite (`#C4501C` → `#9E3E14`, 4,13 → 5,91), la bordure de champ (`#C4BBA8` → `#8C8375`, 1,86 → 3,32) et l'anneau de focus (`#E2652B` → `#C4501C`, 2,73 → 3,71, mesuré sur la surface la plus défavorable).

`#8C8375` franchit les 3:1 sur les cinq surfaces des deux modes : **`border-field` est le seul rôle dont la valeur est identique en clair et en sombre.**

Les **séparateurs** à 1,31:1 sont conformes — WCAG n'impose aucun seuil aux éléments décoratifs. Règle qui en découle : **un séparateur ne porte jamais seul une information de structure.**

### 5.4 Le bouton primaire

> **Décision.** Le bouton primaire est en **encre**, pas en terre cuite.

Sur un écran de facturation, une action destructive est toujours à portée — annuler un devis, supprimer une ligne, émettre un avoir. Un primaire orange et un danger rouge côte à côte, c'est une erreur de clic qui coûte une facture. L'encre à 15,76:1 ne se confond avec rien.

**Exception unique :** sur une page publique — signature d'un devis, passeport — il n'y a qu'une seule action et aucune action destructive. La terre cuite `#C4501C` y devient le bouton de conversion. C'est le seul endroit du produit où elle sert de fond.

### 5.5 Typographie

Deux familles, pas trois. **Archivo** en titrage, **Inter** en corps, toutes deux libres et auto-hébergées via `next/font/google` — aucune requête sortante, ce qui sert aussi le cadrage RGPD.

| Rôle | Police | Taille / interligne | Chasse |
|---|---|---|---|
| `display` | Archivo 800 | 40 / 44 | −3 % |
| `h1` | Archivo 800 | 32 / 38 | −2,5 % |
| `h2` | Archivo 700 | 24 / 30 | −2 % |
| `h3` | Archivo 700 | 19 / 26 | −1,5 % |
| `body` | Inter 400 | 16 / 26 | 0 |
| `body-sm` | Inter 400 | 14 / 21 | 0 |
| `label` | Inter 600 | 11 / 14 | +8 %, capitales |

Les champs de saisie sont à **16 px minimum** en toutes circonstances, pour éviter le zoom automatique d'iOS.

> **Règle non négociable.** `font-variant-numeric: tabular-nums` sur **tout** montant, quantité, taux, date, numéro de devis, de facture, de SIRET et de TVA. Sur un produit de facturation, des colonnes de chiffres qui ne s'alignent pas font un produit qui a l'air faux.

### 5.6 Rayons, ombres, espacement, icônes

**Rayons** — 3 (badge) · 6 (bouton, champ) · 10 (carte) · 14 (modale) · plein (avatar uniquement). **Aucun bouton en pilule** : c'est le marqueur le plus daté du secteur, où Obat est à 99 px et Tolteck à 30 px.

**Ombres** — teintées d'encre, jamais du noir pur.

| | Valeur |
|---|---|
| `e1` repos | `0 1px 2px rgba(28,23,20,.06)` |
| `e2` carte | `0 2px 6px rgba(28,23,20,.09), 0 1px 2px rgba(28,23,20,.05)` |
| `e3` menu | `0 8px 24px rgba(28,23,20,.11), 0 2px 6px rgba(28,23,20,.06)` |
| `e4` modale | `0 24px 60px rgba(28,23,20,.19)` |

**En mode sombre, aucune ombre.** Une ombre noire sur fond sombre est invisible : l'élévation s'exprime par une surface plus claire (`#1F1A16` → `#2A2320`) et une bordure.

**Espacement** — base 4 : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 80.

**Icônes** — Lucide, famille unique, trait **1,75 px**, trois tailles seulement (16, 20, 24), cible tactile **44 px** quelle que soit la taille du glyphe. **Zéro emoji** dans l'interface.

### 5.7 Mode sombre

Piloté par un attribut `data-theme` sur `<html>` avec trois valeurs — `system` (défaut), `light`, `dark` — et un script inline anti-flash dans le layout racine. Les rôles sémantiques sont des variables CSS redéfinies par thème ; `@theme inline` de Tailwind v4 fait émettre aux utilitaires un `var(--color-*)` plutôt qu'une valeur résolue, ce qui rend la bascule instantanée sans duplication d'utilitaires.

## 6. L'architecture atomique

### 6.1 Les cinq couches

| Couche | Emplacement | Contenu |
|---|---|---|
| **Tokens** | `src/ui/tokens.*` | Primitives (rampes) et rôles. Aucun JSX. |
| **Atomes** | `src/ui/atoms/` | Button, **ButtonLink**, Input, Textarea, Select, Checkbox, Label, HelperText, FieldError, Badge, Icon, Spinner, Link, Heading, Text, Money, DateText, Separator, Skeleton |
| **Molécules** | `src/ui/molecules/` | Field, Card, StatusBadge, SealBadge, LogoLockup, EmptyState, Toast, Tooltip, ButtonGroup, SummaryLine, Dialog, ThemeToggle |
| **Organismes** | `src/ui/organisms/` | AppHeader, QuoteTable, QuoteLineEditor, **QuoteLinesTable**, TotalsPanel, VatBreakdown, LegalMentionsPanel, PaymentTimeline, SignaturePanel |
| **Gabarits** | `src/ui/shells/` | AppShell, PublicShell, PdfShell |

Les trois gabarits correspondent aux trois publics : **AppShell** pour l'artisan connecté (dense, mode sombre disponible), **PublicShell** pour le demandeur qui signe et le passeport indexé (clair par défaut, terre cuite en conversion), **PdfShell** pour le devis et la facture (une seule encre).

> **Décision.** L'inventaire est **fermé** : strictement ce que les écrans existants et le jalon M3 réclament. Pas d'`Accordion`, pas de `Tabs`, pas de `Carousel` tant qu'aucun écran n'en a besoin.
>
> `scripts/check-design-system.mjs` l'applique en CI et au `pre-push`.

**Deux entrées ajoutées après l'implémentation.** L'inventaire ci-dessus a été arrêté avant d'écrire une ligne de code, et deux besoins réels sont apparus en le mettant en œuvre :

- **`ButtonLink`** — le HTML distingue *agir* et *naviguer*. Imbriquer un `<button>` dans un `<a>` est invalide et fait annoncer un rôle incohérent par un lecteur d'écran. « Créer un devis » est une navigation.
- **`QuoteLinesTable`** — distinct de `QuoteLineEditor` : l'un lit, l'autre saisit. Le premier est un `<table>` qui défile dans son conteneur, le second une grille de saisie à `aria-label`. Les confondre aurait dégradé les deux.

Toute autre addition passe par cette spec avant d'arriver dans le script.

### 6.2 Le point dur — le PDF ne parle pas Tailwind

`@react-pdf/renderer` n'a aucune notion de classe CSS : il attend des objets de style JavaScript. Si les couleurs vivent dans le CSS, le PDF dérive de l'interface au premier ajustement — et le PDF est la pièce que le client conserve.

```
tokens.ts ──▶ tokens.css ──▶ utilitaires Tailwind ──▶ atomes, molécules
    └───────▶ import JS direct ──────────────────────▶ quote-pdf.tsx
```

> **Décision.** `tokens.ts` est la source de vérité unique. `tokens.css` en est la projection. La parité est garantie par **un test**, pas par une convention de README : `tests/ui/tokens.test.ts` extrait chaque `--color-*` du CSS et le compare au TS ; toute divergence casse la CI.

### 6.3 Quatre règles d'architecture

1. **Serveur par défaut, `'use client'` par exception.** Un `Button` qui soumet un formulaire ou porte un lien est un composant serveur. Seuls `Select` personnalisé, `Toast`, `Tooltip`, `Dialog` et `ThemeToggle` passent au client. Sans cette règle, la directive remonte en cascade et les pages de devis, aujourd'hui serveur, basculent entièrement côté client.

2. **Pas de `className` arbitraire sur l'ossature.** Les composants exposent des **variantes** (`tone`, `size`, `emphasis`), pas une trappe à classes. C'est ce qui évite `tailwind-merge` et surtout ce qui empêche le système de se faire contourner écran par écran — la façon dont meurent la plupart des design systems. L'échappatoire existe mais elle est nommée `unsafeClassName`, donc elle se repère d'un `grep` à la revue.

3. **`Field` câble l'accessibilité, personne d'autre.** La molécule génère l'`id`, relie le `label`, branche `aria-describedby` sur l'aide et l'erreur, pose `aria-invalid`, et met le focus sur le premier champ invalide après soumission. Un `Input` nu hors d'un `Field` est un défaut de revue. C'est la molécule la plus rentable : les formulaires actuels n'ont ni `id`, ni `htmlFor`, ni erreur reliée au champ.

4. **Zéro nouvelle dépendance runtime.** Pas de `cva`, pas de `clsx`, pas de `tailwind-merge`, pas de librairie de composants : un `cn()` de douze lignes et des tables de variantes en objets simples. Le projet n'a aujourd'hui aucune dépendance d'interface. Seule exception admise : `lucide-react`, en important les icônes une par une.

### 6.4 L'arborescence

```
src/ui/
├── tokens.ts              source de vérité — rampes + rôles clair/sombre
├── tokens.css             vars CSS + @theme inline (Tailwind v4)
├── fonts.ts               next/font/google — Archivo + Inter, self-hostés
├── cn.ts                  fusion de classes
├── atoms/                 button.tsx, input.tsx, badge.tsx, money.tsx…
├── molecules/             field.tsx, card.tsx, status-badge.tsx, seal-badge.tsx…
├── organisms/             app-header.tsx, quote-table.tsx, totals-panel.tsx…
├── shells/                app-shell.tsx, public-shell.tsx, pdf-shell.tsx
└── brand/
    ├── mark.tsx           la marque bicolore
    ├── seal.tsx           le sceau médaillon
    └── lockup.tsx         marque + logotype

public/brand/              mark.svg, seal.svg, favicon.svg, apple-icon.png, og.png
src/app/design-system/     la vitrine — noindex, tous les états de tous les composants
tests/ui/tokens.test.ts    parité tokens.ts ↔ tokens.css
tests/ui/contrast.test.ts  tous les couples de rôles ≥ leur seuil WCAG
```

`src/ui/` et non `src/components/` : le projet nomme ses dossiers d'un mot — `domain`, `services`, `lib`, `db`, `pdf`. Fichiers en kebab-case, exports en PascalCase, conformément à `invoice-number.ts` et `quote-totals.ts`. Identifiants en anglais, interface en français, comme le reste du code.

## 7. La reprise de l'existant

### 7.1 L'ordre

Chaque rang est livrable et testable seul.

| # | Périmètre | Pourquoi à ce rang |
|---|---|---|
| 0 | `tokens`, `fonts`, `brand/`, `public/brand/` | Rien ne peut commencer avant. Remplace `Geist` et supprime les `--background` / `--foreground` hérités de create-next-app. |
| 1 | `atoms/` + `Field` + `Card` | Le socle. `Field` d'abord : il débloque tous les formulaires. |
| 2 | `mentions/LegalMentionsForm` | Quatorze champs, un `const field` en dur, aucun `htmlFor`. Le pire écran, donc le meilleur banc d'essai. |
| 3 | `devis/nouveau/NewQuoteForm` | Le formulaire le plus complexe — lignes, TVA multi-taux. Valide `QuoteLineEditor`, `Money` et les chiffres tabulaires. |
| 4 | `devis/`, `devis/[id]`, `AppShell` | Écrans de consultation. Fait apparaître `QuoteTable`, `TotalsPanel`, `StatusBadge`. |
| 5 | `d/[token]`, `SignatureBlock`, `PublicShell` | **Le plus fort enjeu de marque** : c'est là qu'un client découvre l'entreprise, et la seule page où la terre cuite devient bouton de conversion. |
| 6 | `pdf/quote-pdf.tsx`, `PdfShell`, `SealBadge` | Le document que le client conserve. Une seule encre. |
| 7 | `connexion`, `inscription`, `page.tsx`, `confidentialite` | Faible surface. La page d'accueil est encore le gabarit create-next-app. |
| 8 | `app/design-system/` | En dernier : une vitrine construite avant les composants ment toujours. |

### 7.2 Le filet

Les tests Playwright existants — de la connexion à la signature — doivent rester verts à chaque rang. Un rang qui les casse a cassé un parcours.

### 7.3 Les deux tests propres au design system

- **`tokens.test.ts`** — parité entre `tokens.ts` et `tokens.css`.
- **`contrast.test.ts`** — rejoue le calcul WCAG sur chaque couple de rôles, dans les deux modes. Le jour où un token est éclairci « juste un peu », la CI dit lequel et de combien. L'accessibilité cesse d'être une intention.

## 8. Ce qui reste ouvert

| # | Sujet | Traitement |
|---|---|---|
| 1 | **Antériorité INPI** sur « Équerre » / « D'équerre » en classes 9, 35 et 42 | Recherche à conduire avant dépôt. N'est bloquante pour aucune étape du design system : en cas de conflit, seuls `public/brand/` et le logotype sont à reprendre. |
| 2 | **Acquisition de `equerre.fr`** | Domaine enregistré mais dormant (erreur 521). À tenter, sans en dépendre — `dequerre.fr` suffit. |
| 3 | **Le passeport public (M3)** n'est pas encore dessiné | Le `PublicShell` et le `SealBadge` le préparent, mais la page elle-même relèvera de son propre exercice de design. |
| 4 | **Illustration et photographie** | Aucun parti pris arrêté. À traiter quand une page marketing existera ; le produit n'en a pas besoin avant. |
