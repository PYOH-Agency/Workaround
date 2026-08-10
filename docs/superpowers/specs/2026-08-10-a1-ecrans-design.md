# A1 — Les écrans des portes

> Spec de conception · Date : 2026-08-10 · Statut : à valider

**Références :** [A1 — Les portes](2026-08-10-a1-portes-design.md) · [image de marque](2026-08-08-image-de-marque-design.md) · [landing](2026-08-08-landing-design.md)

---

## 1. Ce que cette spec décide, et ce qu'elle refuse

[A1 — Les portes](2026-08-10-a1-portes-design.md) décide les routes, les tables et l'aiguillage. Elle ne dit rien de ce que les gens voient. Cette spec-là comble ce trou, pour les six écrans des portes.

Une recommandation automatisée a été consultée puis **écartée sur sa partie visuelle** : elle proposait Plus Jakarta Sans, un bleu de confiance `#2563EB`, un CTA orange `#EA580C` et un aplat sans ombre. [L'image de marque](2026-08-08-image-de-marque-design.md) décide Archivo + Inter, un primaire encre `#1C1714`, une terre cuite `#C4501C` contrainte, et une échelle d'ombres teintées d'encre. L'appliquer aurait été une refonte de marque déguisée en proposition d'écrans — et `check:ds` l'aurait refusée.

Ce qui en est retenu : le **motif d'entonnoir à trois temps**, avec dévoilement progressif et indicateur d'avancement.

> **Constat à garder en tête.** Crème `#F5F1E8` plus accent terre cuite est, à peu de chose près, le cliché le plus répandu du design généré automatiquement. Ce qui distingue D'équerre n'est pas la palette, c'est la **discipline autour** : une grotesque et non un serif à fort contraste, un primaire encre et non terre cuite, l'orange contraint à un seul contexte. Relâcher cette discipline sur les écrans d'inscription ferait basculer le produit dans le générique — et ces écrans sont les premiers que voit un prospect.

## 2. La thèse

> **Décision. L'onboarding ne montre pas des formulaires. Il montre le produit fini, dès le deuxième écran.**

Quatorze chiffres rendent la raison sociale, la forme juridique, le numéro de TVA et l'adresse. **Ce bloc est exactement l'en-tête légal de tous les futurs devis de cette entreprise.** Il n'est donc pas affiché comme une fiche de confirmation, mais comme l'en-tête d'un devis en train de se composer.

Cet écran fait trois choses d'un coup :

- **il convertit** — l'artisan voit son papier à en-tête se remplir sans qu'il ait rien saisi ;
- **il explique** — il comprend ce que fait le produit sans qu'on le lui dise ;
- **il prépare** — les lignes manquantes, en gris, annoncent le travail restant.

Cette troisième fonction est la réponse à « je ne veux pas que l'utilisateur soit perdu ». **Personne n'est perdu parce que personne n'est surpris** : la liste de premiers pas d'A2 est vue avant d'être demandée.

## 3. Les six écrans

Tous vivent sous `PublicShell variant="plain"`, qui force le thème clair — aucun travail de mode sombre, et le rendu est identique pour tout le monde.

### 3.1 `/creer-mon-entreprise` — étape 1 sur 3

```
┌──────────────────────────────────────────┐
│  ▪ D'ÉQUERRE                             │
├──────────────────────────────────────────┤
│  ÉTAPE 1 SUR 3                           │
│  Votre entreprise, en 14 chiffres        │
│                                          │
│  On lit le répertoire officiel des       │
│  entreprises. Raison sociale, forme      │
│  juridique, TVA, adresse : vous ne       │
│  recopierez rien.                        │
│                                          │
│  SIRET *                                 │
│  ┌────────────────────────────────────┐  │
│  │ 123 456 789 00012                  │  │
│  └────────────────────────────────────┘  │
│  Sur votre Kbis, vos factures, ou        │
│  votre carte de visite.                  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │           Continuer                │  │
│  └────────────────────────────────────┘  │
│  ─────────────────────────────────────   │
│  On vous a invité à rejoindre une        │
│  entreprise ? Connectez-vous.            │
└──────────────────────────────────────────┘
```

> **Décision.** Le texte d'aide dit **où trouver le SIRET**, pas son format.

Personne ne bloque sur « quatorze chiffres ». On bloque sur « c'est lequel, déjà, le SIRET ou le SIREN ». Le format est déjà porté par le `placeholder`.

> **Décision.** La sortie du bas récupère le membre invité.

`claimInvitation` court-circuite l'inscription, mais rien aujourd'hui ne le dit à l'invité qui atterrit ici. Il saisirait le SIRET de son patron et se ferait refuser pour « entreprise déjà inscrite » — un message exact et totalement décourageant.

### 3.2 Étape 2 sur 3 — l'élément signature

```
│  ÉTAPE 2 SUR 3                           │
│  C'est bien votre entreprise ?           │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ PLOMBERIE MARTIN            [RGE]  │  │
│  │ SARL · SIRET 123 456 789 00012     │  │
│  │ TVA FR12345678900                  │  │
│  │ 12 rue des Lilas, 44000 Nantes     │  │
│  │ ·····························      │  │
│  │ Coordonnées             à compléter│  │
│  │ Assurance décennale     à compléter│  │
│  │ Conditions de règlement à compléter│  │
│  └────────────────────────────────────┘  │
│                                          │
│  Voilà l'en-tête de vos devis. Les       │
│  lignes grises sont obligatoires —       │
│  on s'en occupe une fois entré.          │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │      C'est bien mon entreprise     │  │
│  └────────────────────────────────────┘  │
│         Ce n'est pas la bonne            │
```

> **Décision.** Le libellé du bouton énonce l'engagement, pas la mécanique. « C'est bien mon entreprise », jamais « Continuer ».

> **Décision.** Les lignes grisées sont **calculées**, pas écrites en dur.

Elles viennent de `missingLegalMentions` — la même fonction qui garde l'émission de devis. Deux listes de champs obligatoires divergeraient, et l'écran finirait par promettre ce que le serveur refuse. C'est l'erreur que la table des capacités évite déjà côté droits.

> **Décision.** Les champs sont regroupés en **trois groupes nommés** : *Coordonnées*, *Assurance décennale*, *Conditions de règlement*.

`missingLegalMentions` rend onze clés techniques — `registrationNumber`, `coverageArea`, `quoteValidityDays`… Les afficher telles quelles noierait l'artisan sous une liste qui ressemble à un rapport d'erreurs. Le regroupement vit dans `domain/legal-mentions.ts`, à côté de la liste qu'il regroupe, et **il est partagé avec la liste de premiers pas d'A2** : ce sont les mêmes trois lignes, vues deux fois — annoncées ici, actionnables là-bas. C'est ce qui fait qu'arriver dans l'atelier ne surprend pas.

Le badge RGE n'est **pas** un `SealBadge` : celui-ci exige une activité couverte et une adresse de passeport, dont aucune n'existe à l'inscription. Un `Badge` simple, sans prétention de vérification.

### 3.3 Étape 3 sur 3 — l'argument que personne ne dit

```
│  ÉTAPE 3 SUR 3                           │
│  Où vous envoyer votre accès ?           │
│                                          │
│  Pas de mot de passe à retenir. Un lien, │
│  un clic, vous êtes chez vous.           │
│  Une seule fois : ensuite vous restez    │
│  connecté.                               │
│                                          │
│  E-mail *                                │
│  ┌────────────────────────────────────┐  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │        Recevoir mon lien           │  │
│  └────────────────────────────────────┘  │
│  En continuant, vous acceptez notre      │
│  politique de protection des données.    │
```

> **Décision structurante.** « Une seule fois : ensuite vous restez connecté » figure sur cet écran, et cette phrase est liée par contrat à `[auth.sessions]`.

C'est la phrase la plus rentable de l'onboarding, et presque aucun produit sans mot de passe ne la dit. Sans elle, l'artisan suppose qu'il devra ouvrir sa boîte mail chaque matin, et il préfère un concurrent avec mot de passe. Elle est vraie chez nous parce que la session ne meurt pas — [A1 §9](2026-08-10-a1-portes-design.md).

**Les deux vivent ou meurent ensemble.** Le commentaire de `config.toml` doit nommer cet écran, faute de quoi quelqu'un activera `timebox` un jour et transformera cette phrase en mensonge.

### 3.4 L'attente — le vrai trou de conversion

> **Décision.** Dans un produit sans mot de passe, l'entonnoir ne finit pas au clic sur « Recevoir ». **Il finit dans la boîte mail.** Cet écran est donc traité comme un écran, pas comme un encadré de confirmation.

```
│              ✓                           │
│  Un lien part vers                       │
│  paul@plomberie-martin.fr                │
│                                          │
│  Ouvrez-le depuis n'importe quel         │
│  appareil. PLOMBERIE MARTIN vous attend. │
│                                          │
│  Il arrive en moins d'une minute.        │
│  Rien ? Regardez dans les indésirables.  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │      Renvoyer dans 0:47            │  │
│  └────────────────────────────────────┘  │
│      Ce n'est pas la bonne adresse ?     │
```

Quatre choses y sont faites, et chacune répond à une raison connue d'abandon :

| Ligne | Ce qu'elle désamorce |
|---|---|
| « depuis n'importe quel appareil » | « j'ai rempli sur l'ordi, mon mail est sur le téléphone, est-ce que ça va marcher ? » |
| « PLOMBERIE MARTIN vous attend » | Le doute sur ce qui a été enregistré |
| « regardez dans les indésirables » | Dit **avant** qu'il cherche, pas après qu'il ait abandonné |
| Le décompte | `email_sent = 2` par heure. Un bouton « Renvoyer » qui échoue en silence est pire que pas de bouton |

« Ce n'est pas la bonne adresse ? » renvoie à l'étape 3 **en conservant le SIRET**. Une faute de frappe sur l'adresse ne doit pas coûter le tunnel entier.

### 3.5 `/creer-mon-compte` — répondre à « pourquoi »

```
│  Gardez la trace de vos travaux          │
│                                          │
│  ◦ Qui est intervenu chez vous, et quand │
│  ◦ Ce que vous avez signé, et pour       │
│    combien                               │
│  ◦ Les artisans que vous voulez rappeler │
│                                          │
│  Votre nom *      ┌──────────────────┐   │
│  E-mail *         ┌──────────────────┐   │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │        Créer mon compte            │  │
```

> **Décision.** Trois lignes de valeur, jamais un argumentaire.

Le particulier n'a aucune raison de créer un compte : contrairement à l'artisan, rien ne l'y pousse. La **troisième ligne est la seule qui se remplit dès le premier jour** — c'est elle qui justifie l'atterrissage sur `/mon-repertoire` plutôt que sur des logements vides ([A1 §5.2](2026-08-10-a1-portes-design.md)).

### 3.6 `/connexion` — sobre, avec ses deux sorties nommées

Un champ, un bouton, un `Separator`, puis deux liens : *Vous êtes artisan : créez votre entreprise* · *Vous êtes particulier : créez votre compte*.

> **Décision.** Les sorties nomment le public, jamais « Pas encore inscrit ? ».

Quelqu'un qui arrive ici ne sait pas dans quelle catégorie il tombe tant qu'on ne la nomme pas. C'est aussi le seul écran que les trois publics partagent : il doit les trier sans les juger.

## 4. Ne jamais être perdu — trois mécanismes

| Mécanisme | Mise en œuvre | Écrans |
|---|---|---|
| Savoir où l'on en est | `SectionHeader label="Étape 2 sur 3"` | Les trois étapes artisan |
| Pouvoir reculer sans rien perdre | Le retour repréremplit le SIRET | Étapes 2, 3, attente |
| Savoir ce qui vient après | Chaque écran se termine par une phrase sur le suivant | Tous |

Le troisième est le moins coûteux et le plus rare. « Voilà l'en-tête de vos devis », « PLOMBERIE MARTIN vous attend » : chaque écran promet le suivant.

## 5. Ce que cela coûte au design system

**Rien.** L'inventaire fermé de `check-design-system.mjs` a été confronté composant par composant : `SectionHeader`, `Card`, `Field`, `Input`, `Button`, `Text`, `Heading`, `Icon`, `Separator`, `Link` et `Badge` couvrent les six écrans.

- L'indicateur d'avancement est un `label` de `SectionHeader` — pas un composant de progression.
- L'aperçu d'en-tête est une `Card` avec du texte.
- Le décompte de renvoi est un état local de page, pas un composant partagé.

Les deux seules additions à l'inventaire restent celles d'A1 : `SignOut` et `AdminShell`.

## 6. Deux décisions de marque

> **Décision. Le bouton d'appel reste en encre, pas en terre cuite.**

§5.4 de l'image de marque autorise la terre cuite sur une page publique à action unique, et l'inscription qualifie sur la lettre. On s'en abstient : le bouton de la landing pro est en encre ([hero.tsx:45](../../../src/app/_landing/pro/hero.tsx)), et changer de couleur entre le bouton qu'on vient de cliquer et celui qui le suit est une rupture visible, pour un gain supposé. La terre cuite garde plus de force en restant le geste de la signature.

> **Décision. L'aperçu d'en-tête montre les manques dès l'étape 2.**

C'est le pari de toute la spec : dire le travail restant **avant** l'engagement plutôt qu'après. Cela coûte peut-être quelques abandons à l'étape 2 ; cela évite des comptes créés qui n'émettront jamais de devis parce qu'ils ont découvert huit champs obligatoires au pire moment — devant un vrai client.

## 7. Vérification

| Ce qui est vérifié | Comment |
|---|---|
| Les trois étapes annoncent leur rang | Parcours e2e : `Étape 1 sur 3`, `2 sur 3`, `3 sur 3` visibles |
| L'aperçu d'en-tête affiche la raison sociale trouvée | Parcours e2e sur `/creer-mon-entreprise` |
| Les manques affichés viennent de `missingLegalMentions` | Test unitaire : une entreprise sans assurance liste `insurerName`, une entreprise complète n'en liste aucun |
| Le retour depuis l'étape 3 conserve le SIRET | Parcours e2e |
| Le renvoi est refusé pendant le décompte | Test unitaire sur l'état du bouton |
| Le contraste et les cibles tactiles | `tests/ui/contrast.test.ts`, déjà en place |

## 8. Ce que cette spec ne fait pas

- **La liste de premiers pas dans l'atelier, le mot d'accueil par écran, les états vides qui enseignent** → A2. L'étape 2 ne fait que les annoncer.
- **L'écran de confirmation après signature** → A2.
- **Le mot de passe optionnel** → A3. Le jour où il existe, l'étape 3 gagne un lien secondaire, pas un embranchement.

## 9. Ce qui reste ouvert

- **La durée du décompte de renvoi.** Trente secondes est un choix d'ergonomie ; le plafond réel est d'un envoi toutes les trente minutes tant que `email_sent = 2`. Les deux se recaleront quand le SMTP applicatif sera en service ([A1 §11](2026-08-10-a1-portes-design.md)).
- **L'illustration de l'écran d'attente.** Une coche suffit aujourd'hui. Si la mesure montre que l'attente reste le point de perte, c'est là qu'il faudra investir — pas ailleurs.
