# Design system

Architecture, inventaire, tokens et ordre de reprise : voir
[la spec image de marque](../../docs/superpowers/specs/2026-08-08-image-de-marque-design.md), §6 et §7.

Ce fichier ne documente que ce que le pre-push vérifie automatiquement
(`scripts/check-design-system.mjs`).

## 1. Aucun écran ne recrée une primitive du DS

| Composant   | Interdit dans `src/app` dès qu'il existe |
| ----------- | ---------------------------------------- |
| `Button`    | `<button>`                               |
| `Input`     | `<input>`                                |
| `Textarea`  | `<textarea>`                             |
| `Select`    | `<select>`                               |
| `Label`     | `<label>`                                |
| `Link`      | `<a>`                                    |
| `Text`      | `<p>`                                    |
| `Separator` | `<hr>`                                   |
| `Heading`   | `<h1>` … `<h6>`                          |

Le contrôle est **incrémental** : tant que `atoms/button.tsx` n'existe pas, `<button>` reste
autorisé partout. Le jour où il est livré, les 16 `<button>` restants dans `src/app` bloquent le
push. Conséquence assumée : **livrer un atome, c'est migrer les écrans dans la foulée** — c'est
exactement l'ordre des rangs de la spec §7.1, et c'est ce qui empêche le système de se faire
contourner écran par écran.

`src/pdf` est exempté : `@react-pdf/renderer` n'a pas de balises HTML et consomme `tokens.ts`
directement (§6.2).

## 2. L'inventaire est fermé

Tout export en PascalCase sous `atoms/`, `molecules/`, `organisms/`, `shells/` et `brand/` doit
figurer dans l'inventaire de la spec §6.1, **et dans la bonne couche**. Un `Card` rangé dans
`atoms/` échoue, un `Accordion` que personne n'a décidé aussi.

`tokens.ts`, `tokens.css`, `cn.ts` et `fonts.ts` ne sont pas des composants : ils ne sont pas
inspectés.

## 3. Ce qui est seulement signalé

Un composant livré mais consommé nulle part apparaît en avertissement, sans bloquer : la reprise
se fait par rangs, et le rang 1 livre les atomes avant les écrans qui les utilisent.

## Non vérifié automatiquement

Les règles §6.3 restent à la revue : composant serveur par défaut, `unsafeClassName` comme seule
échappatoire (repérable au `grep`), et `Input` toujours à l'intérieur d'un `Field`.
