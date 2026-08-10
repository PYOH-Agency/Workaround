# La navigation de l'espace artisan

> Spec de conception · Date : 2026-08-09 · Statut : implémentée

**Références :** [spec image de marque §6.1](2026-08-08-image-de-marque-design.md) · [plan M7·A, tâche 5](../plans/2026-08-09-m7a-rendez-vous.md) · [spec annuaire](2026-08-08-annuaire-design.md) · [plan M3 — vérification](../plans/2026-08-08-m3-verification.md)

---

## 1. L'état des lieux, vérifié

M7 a doté `AppHeader` d'une navigation — **Devis · Factures · Agenda** — et a signalé, sans le corriger, ce qui restait :

> `/mon-passeport`, `/verification` et `/annuaire` n'ont eux non plus **aucun point d'entrée** aujourd'hui — c'est un défaut préexistant, signalé à part, que ce jalon ne corrige pas.
>
> — plan M7·A, tâche 5, step 2

C'est ce défaut que cette spec ferme. Le relevé exact au moment de l'écrire :

| Attendu | État |
|---|---|
| Navigation dans `AppHeader` | ✅ trois entrées |
| `/mon-passeport`, `/verification` atteignables | ❌ aucun lien dans `src/` |
| `/annuaire` atteignable depuis l'espace connecté | ❌ aucun lien |
| État actif de la page courante | ❌ **planifié en M7, non livré** |
| Repli mobile | ❌ le `<nav>` est un `flex` qui ne se replie pas |
| Cible tactile des liens | ❌ ~20 px, là où le socle impose 44 px |

Un artisan qui vient de déposer son attestation ne peut pas revenir sur `/verification` pour en suivre l'examen. Un artisan à qui l'on annonce un passeport ne peut pas l'ouvrir. Ces écrans sont construits, testés, et inatteignables.

## 2. Cinq entrées, deux groupes

> **Décision.** L'en-tête porte **Devis · Factures · Agenda** et **Passeport · Vérification**, en deux groupes distincts.

| Groupe | Entrées | Ce qui les réunit |
|---|---|---|
| Suivi quotidien | Devis, Factures, Agenda | Ce que l'artisan ouvre chaque jour |
| Mon entreprise | Passeport, Vérification | Ce qu'il consulte quand son statut bouge — dépôt d'attestation, publication du passeport |

Les deux groupes n'ont pas la même fréquence d'usage. Les aplatir en une rangée de cinq donnerait le même poids à « établir un devis » et à « voir où en est mon attestation », ce qui est faux, et rendrait la rangée illisible au repli.

### 2.1 Pourquoi `/annuaire` reste dehors

> **Décision.** `/annuaire` n'entre pas dans l'en-tête connecté.

Ce n'est pas un écran d'artisan. Il vit hors du groupe `(app)`, en `PublicShell`, et c'est l'écran où un **client** cherche un artisan. Y envoyer l'artisan depuis son en-tête le fait sortir de son espace vers un gabarit qui n'offre aucun retour.

Le besoin réel derrière « l'annuaire » — *à quoi ressemble ma fiche vue du dehors* — est servi au §5, et mieux servi là.

## 3. `AppNav`, une molécule cliente

> **Décision.** Un fichier nouveau, `src/ui/molecules/app-nav.tsx`, en `'use client'`. `AppHeader` reste serveur.

`AppHeader` est un composant serveur et il n'existe aucun `layout.tsx` de groupe : les seize pages appellent `AppShell` elles-mêmes. Un composant serveur ne peut pas lire l'URL courante. Trois voies s'offraient :

| Voie | Coût | Verdict |
|---|---|---|
| Prop `current` transmise par chaque page | Seize pages à modifier, et chaque écran futur doit y penser | **Rejetée** — c'est la classe de défaut qu'on corrige, déplacée d'un cran |
| `'use client'` sur `app-header.tsx` | `Lockup` et `Text` partent au client pour un seul `usePathname()` | **Rejetée** — la frontière serveur/client devient implicite |
| Molécule `AppNav` cliente | Une addition à l'inventaire, à justifier | **Retenue** |

Aucune page n'est modifiée, et une route ajoutée plus tard ne peut pas oublier de se déclarer.

### 3.1 L'addition à l'inventaire

L'inventaire de `scripts/check-design-system.mjs` est fermé. `AppNav` s'y ajoute avec sa justification, au format des additions existantes (`ButtonLink`, `ChantierTimeline`) :

> `AppNav` — la navigation doit connaître la page courante, et un composant serveur ne peut pas lire l'URL. L'isoler garde `AppHeader` côté serveur au lieu d'y verser `Lockup` et `Text` pour un seul `usePathname()`. **Molécule** et non organisme : elle ne compose que des atomes.

## 4. Ce que l'en-tête montre, et comment

### 4.1 L'état actif

Correspondance par préfixe : `pathname === href || pathname.startsWith(href + '/')`. `/devis/42/chantier` allume donc **Devis**. Les cinq préfixes ne se recouvrent pas.

Trois marques simultanées, parce que le socle interdit que la couleur porte seule une information :

| Marque | Rôle |
|---|---|
| `aria-current="page"` sur l'ancre | La seule qui compte pour un lecteur d'écran |
| `Text tone="default"` au lieu de `tone="muted"` | Le contraste monte sur l'entrée courante |
| Barre de 2 px en `border-link` | Ce qu'un œil voit sans lire |

Les entrées inactives portent `border-transparent` et gagnent `border-field` au survol. Le survol ne change pas la couleur du texte : `Text` fixe la sienne, et se battre en spécificité contre elle produirait un résultat dépendant de l'ordre des classes Tailwind.

Le filet de survol prend `field` et non `rule` : `rule` est un filet de séparation, son contraste est volontairement faible et WCAG ne lui impose rien — 1,43:1 sur `card`. Un indicateur d'état interactif doit tenir 3:1, et `field` est déjà le jeton des bordures perceptibles de contrôles (`Input`, `Checkbox`, `Button` secondaire).

`ink-muted` sur `card` est déjà vérifié à 4.5 par `tests/ui/contrast.test.ts`. Aucun jeton nouveau, aucune couverture nouvelle.

### 4.2 Le repli mobile

> **Décision.** Passage à la ligne. Pas de menu, pas de défilement horizontal.

L'artisan est sur un chantier, une main prise. Une cible visible bat un menu à ouvrir, et le défilement horizontal reproduit exactement le défaut qu'on corrige : des entrées qui existent sans que rien ne le signale.

- `flex-wrap` sur le `<nav>` ; sur 375 px les entrées s'étalent sur deux lignes
- chaque ancre passe en `inline-flex min-h-11 items-center px-2` — 44 px, le seuil que le socle s'impose déjà pour `Input`

Pas de `Separator` entre les groupes : l'atome est décoratif, `aria-hidden`, et son propre commentaire interdit qu'il porte seul une frontière. Les groupes sont **deux `<ul>` distincts**, chacun avec son `aria-label` (« Suivi quotidien », « Mon entreprise »), séparés par un écart plus large. Au repli, ils cassent là où la structure le dit.

### 4.3 Le backoffice n'a pas cette navigation

> **Décision.** `AppNav` ne rend rien sous `/supervision` et `/attestations`.

Les trois écrans de `(admin)` utilisent `AppShell`, donc l'en-tête de l'artisan. Le défaut date de M7 ; passer de trois à cinq entrées l'aggrave, et le corriger ici coûte deux lignes puisque `AppNav` connaît déjà l'URL.

L'arbitrage assumé : la liste est **négative**. Une route de backoffice ajoutée plus tard hériterait de la navigation d'artisan tant qu'on ne l'y inscrit pas. C'est le moindre mal — une route d'artisan nouvelle est un événement bien plus fréquent qu'une route de backoffice, et les deux préfixes existants sont voisins dans le fichier.

La correction propre serait un gabarit distinct pour le backoffice. Elle demande un `AdminShell` absent de l'inventaire, donc une seconde addition, pour un espace interne à trois écrans. **Hors périmètre**, et consigné ici pour que le choix soit relisible.

## 5. La fiche publique, depuis le passeport

> **Décision.** `/mon-passeport` porte un lien vers sa propre page publique.

`passportUrl()` rend déjà `null` quand aucune activité n'est couverte — précisément pour ne jamais poser un lien qui répond 404. Deux états, donc :

| État de l'entreprise | Ce que l'écran montre |
|---|---|
| Au moins une activité couverte | Un lien vers sa page publique |
| Aucune couverture | Pas de lien mort, mais un renvoi vers `/verification` qui dit ce qui manque |

La boucle **vérification → visibilité** se ferme : l'artisan voit ce qui lui manque, le dépose, et revient constater qu'il est visible. C'est ce qu'il cherche quand il pense « annuaire », et l'annuaire lui-même ne le lui donnait pas.

## 6. Tests

Vitest tourne en environnement `node`, sans jsdom : `tests/ui/status-badge.test.ts` le constate déjà — *« Le rendu n'est pas testable en environnement `node`, mais la table de correspondance l'est — et c'est elle qui porte le risque. »* La logique de navigation vit donc dans un `.ts` sans import React, testable sans ajouter de dépendance.

| Ce qui est vérifié | Où |
|---|---|
| Cinq entrées, dans l'ordre, sans préfixe recouvrant | `tests/ui/app-nav.test.ts` |
| `/devis/42/chantier` allume Devis, `/devis-types` non | `tests/ui/app-nav.test.ts` |
| `showsNav` est faux sous `/supervision` et `/attestations` | `tests/ui/app-nav.test.ts` |
| Les **cinq** écrans s'atteignent par la navigation, chacun avec `aria-current` | `tests/e2e/verification-journey.spec.ts` |
| À 375 px : cinq entrées, 44 px chacune, plus d'une ligne, rien hors écran | `tests/e2e/verification-journey.spec.ts` |
| Le backoffice n'affiche aucune navigation d'artisan | `tests/e2e/verification-journey.spec.ts` |
| Le passeport pointe vers `/artisan/`, jamais vers `/p/` | `tests/e2e/verification-journey.spec.ts` |
| L'inventaire accepte `AppNav` | `pnpm check:ds`, dans `pnpm validate` |

Le parcours e2e est le garde-fou qui compte. Un test unitaire prouve que la règle est juste ; seul un parcours qui **navigue** prouve que l'écran est atteignable — et c'est la propriété dont l'absence a produit ce défaut.

## 7. Ce que cette spec ne fait pas

- **Aucun menu, aucun état client au-delà de `usePathname()`.** Pas de piège à focus, pas d'échappement à gérer.
- **Aucun gabarit nouveau.** Le backoffice garde `AppShell`, sans la navigation.
- **`/annuaire` reste sans lien depuis l'espace connecté**, par décision (§2.1) et non par omission.
- **Aucune déconnexion dans l'en-tête.** Elle n'existe nulle part aujourd'hui ; l'ajouter ici serait un sujet distinct, avec sa propre action serveur.
