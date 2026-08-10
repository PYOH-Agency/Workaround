# L'accueil de l'artisan

> Spec de conception · Date : 2026-08-10 · Statut : à implémenter

**Références :** [spec navigation artisan](2026-08-09-navigation-artisan-design.md) · [spec image de marque §6.1](2026-08-08-image-de-marque-design.md) · [spec M5 — métriques](2026-08-08-m5-metriques-design.md) · [spec offre payante](2026-08-10-offre-payante-design.md) · [spec reprise des treize écrans §5](2026-08-10-reprise-des-treize-ecrans-design.md)

---

## 1. L'état des lieux, vérifié

L'espace connecté n'a pas d'accueil. Le relevé exact au moment d'écrire :

| Attendu | État |
|---|---|
| Une page d'accueil dans le groupe `(app)` | ❌ aucune `page.tsx` à la racine du groupe |
| Destination après connexion | `/devis` — [`resolveDestination`](../../../src/domain/requester.ts) |
| Cible du logo de l'en-tête | `/devis`, avec `aria-label="Accueil"` — [`app-header.tsx:29`](../../../src/ui/organisms/app-header.tsx) |
| Vue d'ensemble de l'argent | ❌ nulle part : le devis connaît son solde, la facture le sien, personne ne les additionne |
| Ce qui est en retard | ❌ il faut ouvrir `/devis` puis `/factures` et comparer de tête |

La liste des devis fait donc office de tableau de bord, et l'en-tête annonce « Accueil » en pointant ailleurs. Ce n'est pas un défaut cosmétique : **aucun écran ne répond aujourd'hui à « qu'est-ce qui m'attend »**, alors que les faits sont tous en base — devis envoyés sans réponse, factures échues, attestation qui expire, chantiers livrés non soldés.

## 2. La racine sert les deux publics

> **Décision.** `src/app/page.tsx` devient un aiguillage : l'artisan membre d'une entreprise y voit son accueil, tout autre visiteur y voit la landing pro, inchangée.

Trois voies étaient ouvertes :

| Voie | Coût | Verdict |
|---|---|---|
| La racine lit la session | La landing passe en rendu dynamique | **Retenue** |
| Réécriture dans `proxy.ts` vers `/accueil` | Le proxy ne connaît que l'utilisateur, pas son appartenance : un **demandeur** connecté serait réécrit vers un accueil artisan. L'éviter demanderait une requête base à chaque requête HTTP, sur toutes les routes | Rejetée |
| Accueil sur `/tableau-de-bord` | L'artisan connecté qui clique le logo retombe sur une page de vente | Rejetée |

Le coût de la voie retenue est réel mais faible : la landing est faite de huit composants sans aucun accès aux données, et rien de ce qui compte pour le référencement — contenu, `canonical`, image OG — ne change. Un artisan connecté ne doit jamais retomber sur l'argumentaire qui lui a vendu le produit.

Quatre conséquences mécaniques :

- `resolveDestination` renvoie `/` là où elle renvoyait `/devis` ; `/mes-logements` et `/inscription` ne bougent pas ;
- le logo de l'en-tête pointe sur `/` — son `aria-label` cesse d'être un mensonge ;
- une entrée **Accueil** ouvre le groupe *Suivi quotidien* de `navGroups`, sans capacité requise ;
- `/devis` perd son bloc titre d'entreprise, qui n'était là que faute d'accueil.

## 3. L'accueil se compose, il ne s'affiche pas

> **Décision.** Chaque bande est conditionnée par une capacité, lue dans la **même table** que les gardes serveur.

Un compagnon (`role: 'member'`) n'a ni `invoice.issue`, ni `payment.record`, ni `passport.manage` ([`authorization.ts`](../../../src/domain/authorization.ts)). Un accueil fixe lui montrerait l'argent de l'entreprise et des mesures qu'il ne peut pas défendre.

| Bande | Capacité requise | Compagnon |
|---|---|---|
| L'argent en cours | `invoice.issue` | masquée |
| Ce qui m'attend | filtrée ligne à ligne, selon la capacité du geste | vide, donc absente |
| Aujourd'hui | `agenda.manage` | visible |
| Votre mois | `quote.read` | visible |
| Votre passeport | `passport.manage` | masquée |

Chaque ligne de la file est conditionnée par la capacité du geste qu'elle propose — `legal.write` pour l'attestation, `invoice.issue` pour facturer, `payment.record` pour une relance de facture, `quote.write` pour un devis. Un compagnon n'en a aucune : sa file est vide, et une bande vide ne s'affiche pas.

Son accueil se réduit donc à sa journée et aux chiffres du mois. C'est peu, et c'est exact : c'est ce qu'il fait. Aucune bande ne dit « réservé » — annoncer ce qu'on ne peut pas avoir est une vexation, pas une information.

## 4. Bande 1 — l'argent en cours

> **Décision.** Une seule barre, trois segments, lue de gauche à droite comme l'argent circule. Aucune carte.

| Segment | Définition | Source |
|---|---|---|
| Signé, pas encore facturé | Σ `remainingToInvoice` sur les devis `signed` | [`invoice-balance.ts`](../../../src/domain/invoice-balance.ts) |
| Facturé, dans les délais | Σ restant dû, retenue déduite, `dueAt` non échue | [`payment-status.ts`](../../../src/domain/payment-status.ts) |
| En retard de paiement | Σ des factures dont le statut est `overdue` | idem |

**Le libellé du premier segment est « Signé, pas encore facturé », jamais « travaux faits ».** Un devis signé dont le chantier n'a pas commencé n'est pas du travail fait ; le nommer ainsi ferait passer un carnet de commandes pour une créance.

Quatre décisions de forme, chacune contre un réflexe :

- **La terre cuite va au premier segment**, celui qui attend un geste de l'artisan — jamais à l'encaissé. L'accent désigne ce qui bloque, pas ce qui est fini.
- **L'encaissé sur 12 mois sort de la barre.** À l'échelle réelle il occupe les trois quarts de la largeur et écrase les deux segments qui appellent une action. Il reste, en petit, à droite : c'est un contexte.
- **Le retard est hachuré et pas seulement rouge.** La couleur seule ne porte jamais l'information.
- **Aucune carte.** Trois cartes de statistiques découperaient le flux en trois faits sans rapport ; la largeur de chaque segment dit ce que le chiffre seul ne dit pas.

La retenue de garantie est exclue du retard, comme `payment-status` l'impose déjà : réclamer ce que le client a le droit de garder est une faute que l'accueil ne doit pas industrialiser. La ligne le dit en toutes lettres — *retenue de garantie exclue*.

## 5. Bande 2 — ce qui m'attend

> **Décision.** Quatre natures de signal, et **une ligne n'y figure que si elle appelle un geste**. Elle disparaît quand le geste est fait.

| Nature | Entre dans la file quand | Geste |
|---|---|---|
| Attestation décennale | `validUntil` à 60 jours ou moins — le premier palier de [`NOTICE_DAYS`](../../../src/domain/expiry.ts) | Déposer l'attestation |
| Facture en retard | `payment-status` renvoie `overdue` | Relancer |
| Devis sans réponse | `status = 'sent'` et **7 jours ouvrés** depuis `sentAt` ([`businessDaysSince`](../../../src/domain/business-days.ts)), ou validité expirant sous 15 jours | Relancer |
| Reste à facturer | `completedAt` non nul et `remainingToInvoice > 0` depuis 3 jours ouvrés | Facturer |

**Sept jours ouvrés, et non sept jours.** Un devis envoyé le vendredi soir ne « traîne » pas le lundi matin. Le seuil est assez long pour ne pas harceler un particulier qui réfléchit, assez court pour qu'il se souvienne encore de la visite. Les trois jours ouvrés avant de réclamer une facturation servent le même équilibre : un chantier fini le jeudi n'a pas à figurer sur l'accueil du vendredi.

**Le tri se fait par nature, puis par ancienneté** — pas par date seule. Une facture échue depuis quatre jours passerait sinon devant une attestation qui expire dans trois semaines, alors que les deux ne coûtent pas la même chose : la seconde coupe la visibilité publique du passeport. L'ordre des natures est celui du tableau ci-dessus.

**Aucune troncature muette.** Au-delà de huit lignes, la file annonce le reste (« et 5 autres ») et le lien mène à l'écran concerné.

**Cette file ne relance personne.** Elle propose un geste ; l'envoi reste un acte de l'artisan. La règle du domaine — *« un seul rappel, aucune relance »* ([`reminder.ts`](../../../src/domain/reminder.ts)) — porte sur ce que **nous** envoyons au particulier, et elle n'est pas entamée.

### 5.1 Une seule action pleine sur l'écran

Le bouton plein est réservé à l'attestation : c'est la seule échéance dont le coût est irréversible. Les autres gestes sont **posés** — fond `raised`, bord `field`, 44 px. Rien n'est en terre cuite : le composant `Button` réserve ce fond aux pages publiques sans action destructive alentour, *« un primaire orange et un danger rouge côte à côte, c'est une erreur de clic qui coûte une facture »* ([`button.tsx`](../../../src/ui/atoms/button.tsx)).

`Établir un devis` se tient en tête de bande, en contour. Une action toujours disponible, déjà présente sur `/devis`, n'a pas à crier plus fort qu'une échéance.

## 6. Bande 2 bis — la journée

> **Décision.** Aujourd'hui et demain, dans l'`aside` que `AppShell` propose déjà.

Deux jours, pas la semaine : au-delà ce n'est plus une urgence mais une consultation, et l'agenda existe pour ça. L'`aside` est `sticky` sur écran large et s'empile en tête sur mobile — le gabarit le fait déjà, il n'y a rien à écrire.

Une journée vide affiche « Rien de prévu. » et non un vide : un écran muet laisse croire à une panne.

## 7. Bande 3 — deux natures de mesures, et aucun sélecteur de période

> **Décision.** Deux bandes distinctes — *Votre mois* et *Votre passeport* — et **aucun sélecteur de période sur la page**.

| Bande | Mesures | Nature |
|---|---|---|
| Votre mois | Devis établis et signés ce mois, délai médian de remise après visite | Interne |
| Votre passeport | Délai annoncé respecté, écart devis → facture | **Public** |

Les mélanger serait un mensonge : deux de ces chiffres figurent sur la fiche que les clients consultent, deux non. La seconde bande le dit dans son titre — *visible par vos clients*.

L'écart devis → facture affiche « Encore N chantiers » tant que `MINIMUM_OBSERVATIONS` n'est pas atteint, jamais un taux fabriqué sur trop peu d'observations.

**Pourquoi pas de sélecteur de période.** Les trois bandes n'ont pas la même nature temporelle, et un menu unique en haut de page mentirait sur deux d'entre elles :

- l'argent en cours est un **stock**, vrai à aujourd'hui ; il n'a pas plus de période qu'un solde bancaire ;
- la file n'en a pas non plus : une facture échue l'est, quel que soit le filtre ;
- le passeport a une fenêtre **fixée à 12 mois** dans le domaine ([`passport-metrics.ts`](../../../src/domain/passport-metrics.ts)) et ses mesures sont publiques. Laisser l'artisan choisir sa fenêtre, c'est lui laisser choisir la plus flatteuse, et afficher chez lui un chiffre différent de celui que son client voit.

Seuls les deux flux — encaissé, devis du mois — auraient une période légitime. Si le besoin se confirme à l'usage, il portera sur la seule bande *Votre mois*, avec deux choix figés, via un paramètre d'URL : la page reste serveur, aucun état client.

## 8. Le compte neuf

> **Décision.** Tant qu'aucun devis n'existe, l'accueil affiche une mise en route à trois étapes, et rien d'autre.

Un accueil complet servi à un nouvel inscrit est un mur de zéros et de bandes vides — le pire premier contact possible avec un outil.

| Étape | Pourquoi elle est là | Écran |
|---|---|---|
| Compléter les mentions obligatoires | Sans elles, un devis n'est pas conforme | `/mentions` |
| Déposer l'attestation d'assurance | Sans elle, pas de passeport public | `/verification` |
| Établir le premier devis | C'est le produit | `/devis/nouveau` |

La bascule se fait sur l'existence d'un devis, pas sur l'achèvement des trois étapes : un artisan qui a établi un devis a compris l'outil, même s'il n'a pas déposé son attestation — l'attestation reviendra d'elle-même dans la file du §5.

Les deux premières étapes se marquent faites en lisant l'état réel, jamais un drapeau stocké : un état stocké survit à la correction du fait qui l'a produit.

## 9. Ce que ça ajoute au design system

L'inventaire de `check:ds` est **fermé** ([`check-design-system.mjs`](../../../scripts/check-design-system.mjs)). Cette spec l'ouvre de deux entrées, et de deux seulement :

| Entrée | Couche | Pourquoi elle ne peut pas être autre chose |
|---|---|---|
| `MoneyFlow` | organisme | Une barre segmentée dont chaque segment est un lien, et sa légende. Ni `DataTable` (aucune comparaison) ni `SummaryLine` (aucun total à additionner) |
| `TaskRow` | molécule | Une ligne échéance / objet / geste, posée sur un filet. `RailItem` porte une **suite chronologique** et n'a ni colonne d'action ni colonne de montant |

Tout le reste réutilise l'existant : `AppShell` et son `aside`, `Button`, `Money`, `DateText`, `Heading`, `Text`, `EmptyState`, `StepCard` pour la mise en route.

Le ton `raised` des boutons posés est une **addition à la table `TONES`**, pas un composant : le `secondary` actuel a un fond transparent, et sur un écran dense quatre boutons transparents ne se lisent plus comme des commandes.

## 10. Où vit le code

L'isolation des fonctionnalités interdit à la racine d'importer `(app)/devis` ou `(app)/factures` ([`check-feature-isolation.mjs`](../../../scripts/check-feature-isolation.mjs)). Toute la composition remonte donc dans les couches partagées — ce qui est de toute façon la bonne place :

| Fichier | Rôle |
|---|---|
| `src/domain/home-queue.ts` | Les seuils du §5, en fonctions **pures** prenant `now` en paramètre. C'est ce qui est testé |
| `src/services/home.ts` | Les requêtes, et l'assemblage du modèle de l'accueil |
| `src/app/page.tsx` | L'aiguillage du §2, et rien d'autre |
| `src/app/_home/*.tsx` | Une bande par fichier — la limite de 250 lignes l'impose, et le découpage la précède |

`src/app/_home/` est un dossier privé : il ne définit aucune frontière de fonctionnalité, au même titre que `_landing/`.

## 11. Ce que cette spec ne fait pas

- **Aucune notification, aucun courriel.** L'accueil montre ; le travail de fond quotidien prévient déjà pour ce qui doit l'être.
- **Aucune courbe, aucune série temporelle.** La règle du backoffice vaut ici : *« un tableau de bord qu'on regarde par curiosité n'est pas un outil »*.
- **Aucun réglage.** Ni seuil de relance paramétrable, ni bandes réordonnables. Un accueil qui se configure est un accueil dont personne n'a décidé la forme.
- **Aucune action de masse.** Relancer trois factures en un clic transformerait un service en publipostage.
