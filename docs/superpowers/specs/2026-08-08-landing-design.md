# Landing — Design

> Les deux pages d'entrée publiques : l'artisan et le demandeur.
> Date : 2026-08-08 · Statut : à valider
> Dépend de : [Socle Artisan](2026-08-07-socle-artisan-design.md) · [Image de marque](2026-08-08-image-de-marque-design.md)

---

## 1. Ce que ces pages doivent obtenir

**La page pro** vise une seule action : entrer dans le parcours d'inscription. Tout le reste sert cette action ou la crédibilise. L'artisan est l'utilisateur qui adopte, qui paie l'abonnement Pro et qui alimente le capteur ; sans lui, il n'y a ni label ni carnet.

> **Décision, prise en cours d'implémentation.** L'accroche pro portait initialement un **champ SIRET**. Elle ne le peut pas : `signUp` exige une session authentifiée, et le parcours réel est connexion, puis SIRET. Un champ SIRET en accroche aurait donc soit créé un compte impossible, soit renvoyé l'artisan vers un passeport public — pas vers une inscription.
>
> L'accroche porte donc un **bouton**, pas un champ. Sa destination est l'onboarding, **qui n'est pas encore construit**. En attendant, il pointe sur `/connexion`, qui est le début réel du parcours artisan aujourd'hui. La destination vit dans une constante nommée : le repointage sera d'une ligne.
>
> Une landing dont l'action principale renvoie une 404 serait pire que pas de landing — c'est la raison de ce provisoire, et il doit rester visible dans le code.

L'authentification par mot de passe et par Google est un **chantier distinct**, décidé et volontairement reporté après cette landing. Il rouvrira l'arbitrage inscrit dans `src/app/connexion/page.tsx` — « l'artisan est sur un chantier, avec des gants et une 4G médiocre » — et devra le réécrire plutôt que le contredire en silence.

**La page demandeur** vise la vérification d'une entreprise. C'est le seul geste qu'un demandeur fait spontanément *avant* de signer, et c'est le différenciateur du produit rendu tangible.

> **Décision.** `/` est la page pro, `/verifier` la page demandeur. Pas d'écran de choix à l'entrée : il ajoute un clic à tout le monde pour n'aider personne. L'artisan arrive par la recherche, le demandeur par un lien de devis ou par le SIRET lu sur ce devis. Chaque page porte un lien vers l'autre, en haut et en bas.

## 2. Ce que ces pages ne promettent pas

Cette section existe parce que la tentation est forte et que l'erreur serait coûteuse.

Le **dépôt de projet** auquel des artisans répondraient, et la **prise de rendez-vous par un demandeur**, sont exclus de P1 par le §4 du socle — pas différés dans un jalon, exclus d'une phase entière :

> - **Aucune marketplace.** Pas de dépôt de projet, pas d'appel d'offres, pas de mise en relation, pas de recherche d'artisan à l'intérieur du produit.
> - Pas de réservation de créneau par un demandeur (→ P2).

Annoncer l'un ou l'autre comme disponible attirerait des artisans venus pour recevoir des demandes. Ils repartiraient — et ce sont précisément eux qui font vivre le capteur.

> **Décision.** La mise en relation est annoncée **comme direction, sans date et sans « bientôt »**, dans une section qui énonce d'abord la règle qu'elle respectera (§4.6). C'est l'engagement qui rend la promesse crédible, pas l'inverse.

**Rappel du calendrier réel**, la numérotation ayant changé : M1 à M3 sont livrés. M4 est l'annuaire — *être trouvé et recevoir des appels*. M6 est l'espace demandeur. M7 est l'agenda **de l'artisan**, pas la réservation par le client.

## 3. Le modèle économique sur la page

| Ce qu'on écrit | Ce qu'on n'écrit pas |
|---|---|
| Le capteur est gratuit à vie — devis, facture, signature, page publique | Aucun prix, nulle part |
| L'abonnement Pro portera sur ce qui vient après : équipe, planning, situations, relances | « À partir de X €/mois » |
| Nous ne vendrons jamais votre place dans un classement | — |
| Nous ne prendrons jamais de commission sur vos propres clients | — |

**Aucun prix.** Le §11 du socle donne 30–80 €/mois comme *consentement observé du marché*, pas comme décision. Publier un chiffre engagerait avant l'arbitrage, et un prix qu'on monte ensuite est bien plus coûteux qu'un prix qu'on baisse.

> **Décision.** La mention « sans limite de volume » est **conservée**. Elle n'est pas une générosité ajoutée mais une conséquence du principe n° 2 : « si l'on taxe tout, l'artisan sort ses vrais chantiers de l'outil — et l'on perd le capteur, donc le label, donc le produit entier ». Un plafond de devis gratuits produit exactement cela.

Les principes n° 1 et n° 2 sont **le meilleur argument commercial de la page**. Un artisan du bâtiment a été démarché dix fois par des vendeurs de leads ; aucun concurrent ne peut écrire ces deux phrases. Elles ne sont donc pas une mention légale en bas de page mais une section à part entière.

## 4. La page pro — `/`

Sept sections. Une seule action, présentée deux fois, jamais concurrencée.

> **Amendement du 10 août 2026 — l'ordre d'accueil.** « Comment ça marche » (§4.3) passe **devant** « le coût de l'erreur » (§4.2). La page enchaînait l'accroche et une amende de 15 000 € : l'argument est juste, c'est la douleur réelle du métier, mais le placer en deuxième section fait ouvrir la conversation sur une menace, à un artisan qui ne nous connaît pas. On montre d'abord ce que l'outil fait, on dit ensuite ce qu'il évite. Aucun contenu n'est retiré, aucune section n'est ajoutée : seul l'ordre change.

### 4.1 Accroche
« Vos devis et vos factures, gratuits à vie. » Sous-titre sur les mentions obligatoires et la signature. **Bouton en encre** vers le parcours d'inscription — pas de champ, voir la décision du §1. Mention de réassurance : trente secondes, aucune carte bancaire.

### 4.2 Le coût de l'erreur
L'article L243-2 et les 3 000 € / 15 000 € d'amende **par infraction constatée**. C'est la douleur réelle et vérifiable, et c'est ce que le produit supprime dès le premier devis.

### 4.3 Comment ça marche
Trois étapes — SIRET, rédaction, signature par code SMS. Cadence *calepinage*.

### 4.4 Le passeport
L'assurance vérifiée activité par activité, avec l'exemple du plombier qui refait un tableau électrique. Trois pastilles de statut réelles, reprises de `StatusBadge`. Phrase de clôture : les activités non couvertes n'apparaissent pas, et c'est ce qui rend la page crédible.

### 4.5 Ce que nous ne ferons jamais
Les principes n° 1 et n° 2, énoncés en propre.

### 4.6 La suite
La mise en relation, **sans date**, encadrée par la règle de la section précédente. Formulation à respecter : elle décrit une direction et un engagement, jamais une disponibilité.

### 4.7 Ce que ça coûte, et reprise
La dernière section porte deux choses à la fois, et c'est voulu : l'énoncé du modèle — l'outil gratuit pour toujours, l'abonnement Pro sur ce qui vient après — et la **reprise du bouton**. Un visiteur qui a lu jusqu'ici a la question du prix en tête ; y répondre juste avant l'action est le meilleur endroit, et évite une section de plus.

## 5. La page demandeur — `/verifier`

> **Amendement du 10 août 2026 — la contrepartie.** Livrée avec quatre sections, la page n'énonçait que des raisons de se méfier : une question inquiète, « le piège », un formulaire de dépannage, une promesse à venir. Aucune ne disait ce que le demandeur **gagne**. Une page qui met en garde sans rassurer obtient de la vigilance, pas de la confiance — et c'est le seul public qui arrive sans rien connaître de nous.
>
> Trois corrections, toutes fondées sur des écrans **déjà livrés** :
>
> 1. **L'accroche reçoit sa scène** (§5.5). Sa moitié droite était vide là où la page pro porte `Squaring`. Ce vide se lisait : la page de l'artisan paraissait soignée, celle du client bâclée.
> 2. **L'annuaire apparaît** (§5.6). `/annuaire` est public et indexé depuis M4, et cette page ne le mentionnait nulle part : un demandeur sans SIRET en main n'avait rien à y faire.
> 3. **Le carnet cesse d'être « bientôt »** (§5.4). L'espace demandeur est livré depuis M6. Annoncer comme à venir ce qui existe est le défaut le plus coûteux qu'une page de confiance puisse porter.
>
> L'ordre alterne désormais l'avertissement et la contrepartie — le piège, puis l'annuaire ; ce qu'on garde, puis le carnet. `Retrieve` descend en fin de page : c'est un service rendu à qui a perdu son lien, pas un argument.

### 5.1 Accroche
« Votre artisan est-il assuré pour ce qu'il va faire ? » Champ SIRET + bouton **en terre cuite** — seule page du produit où la terre cuite est autorisée en fond, faute d'action destructive alentour (charte §5.4). Mention : gratuit, sans compte, le SIRET figure sur le devis.

### 5.2 Le piège
Assuré ne veut pas dire assuré pour tout. Premier motif de refus d'indemnisation du secteur. Trois cartes en cadence *calepinage*.

### 5.3 Retrouver mon devis
Action **secondaire**, en bouton contour. Champ e-mail, renvoi du lien.

### 5.4 Le carnet
L'espace demandeur, ouvert **à la signature du prochain devis** — cohérent avec la décision structurante du §10 du socle. Mention explicite : *aucune inscription, nous ne collectons pas votre adresse.* C'est la contrepartie de l'absence de liste d'attente, et c'est un argument.

> **L'étiquette « Bientôt » est retirée.** Elle était juste à la livraison de la landing ; M6 l'a périmée. Ce qui reste vrai, et qui est dit à sa place, c'est que l'espace **s'ouvre à la signature** — une conséquence de la décision du §10 du socle, pas une file d'attente.

### 5.5 La scène de l'accroche
Le pendant de `Squaring`, et son exact contraire de point de vue : la scène pro montre l'artisan qui met son devis d'équerre, celle-ci montre le demandeur qui **lit** une attestation. Elle se présente, ses activités se lisent une à une, chaque verdict tombe, et le sceau se pose.

> **Décision.** Une des trois activités n'est **pas** couverte, et la scène ne s'en cache pas. C'est la thèse de la page : la réassurance n'est pas que l'entreprise soit parfaite, c'est que vous le sachiez avant de signer. Une scène qui cocherait trois lignes sur trois mentirait sur le produit et sur le secteur.

Tracée plutôt que capturée, comme côté pro, et dans le même cadre de 400 × 340 pour que les deux accroches aient la même assise. Chronologie interne en module CSS, sans script — même régime que `squaring.module.css`, et la même règle tenue : **le sceau ne pivote pas**, il grandit et se pose (charte §4.6).

### 5.6 Trouver une entreprise déjà vérifiée
Renvoi vers `/annuaire`, en **bouton contour** : la page garde une seule action de conversion, la vérification par SIRET, et deux boutons pleins l'auraient mise en concurrence avec elle-même.

> **Ce n'est pas la mise en relation exclue du §2.** Aucun dépôt de projet, aucun appel d'offres, aucune commission — une liste d'entreprises dont la couverture a été vérifiée, où l'artisan figure sans l'avoir achetée. La section le dit en toutes lettres, avec les deux mêmes engagements que la page pro.

### 5.7 Avant, pendant, après
Ce que le demandeur obtient aux trois temps d'un chantier : il vérifie, il suit, il garde. Le rang est numéroté parce que l'ordre porte l'information — on vérifie avant de signer, jamais après —, même motif que la frise du §4.3 bis. Les trois étapes correspondent à trois écrans livrés : la vérification, le dossier de chantier, le répertoire.

## 6. Les deux actions serveur

### 6.1 Vérifier une entreprise

`publicProfile(siren, now)` prend déjà un SIREN ; `companySlug()` produit l'adresse. L'action normalise la saisie (14 chiffres, espaces admis), en extrait le SIREN, et redirige vers `/artisan/<slug>`.

> **Décision de sécurité.** Une entreprise introuvable et une entreprise sans activité couverte reçoivent **le même message**. `publicProfile` renvoyant `null` dans les deux cas, l'indistinction est acquise par construction — il ne faut surtout pas l'affiner. Le message : « Cette entreprise n'a pas encore de page publique sur D'équerre. »

Aucune donnée nouvelle traitée : la page cible est déjà publique et indexée.

### 6.2 Renvoyer un lien de devis

Recherche des devis d'un `customer.email`, envoi du lien via `sendQuoteLink()` — déjà écrit.

> **Décision de sécurité.** La réponse est **toujours la même**, qu'un devis existe ou non : « Si un devis a été envoyé à cette adresse, vous allez le recevoir. » Sans cela, le formulaire devient un test d'existence d'adresse. Le lien n'est **jamais affiché** à l'écran, uniquement envoyé.

Seuls les devis dont le statut autorise déjà la vue publique sont concernés — jamais un brouillon.

> **Point ouvert, à trancher au plan.** Ce formulaire déclenche un envoi d'e-mail depuis une page publique : il lui faut une **limitation de débit**, sans quoi il devient un vecteur d'envoi en masse. Le mécanisme reste à choisir.

**RGPD :** l'envoi lui-même n'ajoute rien — l'adresse est déjà dans `customer`,
la finalité est identique à l'envoi initial. **La limitation de débit, elle, est
un traitement nouveau**, si minuscule soit-il : finalité **lutte contre l'abus**,
base **intérêt légitime**, rétention **24 heures**, purge à chaque écriture. À
reporter au registre.

## 7. Le design system

### 7.1 Huit entrées ajoutées à l'inventaire

| Couche | Composant | Justification |
|---|---|---|
| molecules | `SectionHeader` | Étiquette, titre, chapeau. Onze occurrences sur les deux pages. |
| molecules | `StepCard` | Numéro, titre, texte. |
| molecules | `Reveal` | Le geste de **mise d'équerre**, encapsulé. Sans lui, chaque section réimplémente l'animation et oublie `prefers-reduced-motion`. |
| molecules | `Stagger` | La cadence de **calepinage**, même raison. |
| organisms | `SiretLookup` | Le champ SIRET et son action. Deux tons : encre côté pro, terre cuite côté demandeur. |
| organisms | `QuoteLinkForm` | Le renvoi de lien de devis. |
| organisms | `PrinciplePanel` | Les engagements du §12 du socle. |
| shells | `LandingShell` | Navigation à lien croisé et pied de page marketing. `PublicShell` est un gabarit de **document** — lui greffer une navigation commerciale le dénaturerait. |

L'inventaire de `scripts/check-design-system.mjs` et le §6.1 de la spec de marque sont mis à jour ensemble, avec la raison de chaque ajout.

### 7.2 Où vivent les sections

Les huit composants ci-dessus sont génériques et vont dans `src/ui/`. Les **compositions de section**, spécifiques à une page, vivent dans un dossier privé à côté de la route :

```
src/app/page.tsx              composition de la page pro
src/app/_landing/pro/*.tsx    ses sept sections
src/app/verifier/page.tsx     composition de la page demandeur
src/app/_landing/verifier/*.tsx  ses quatre sections
```

Le préfixe `_` est la convention de dossier privé de Next : le contenu n'est pas routable. Ces fichiers restent des « écrans » aux yeux du contrôle du design system, donc soumis à l'interdiction des balises brutes — c'est voulu.

Ce découpage n'est pas cosmétique : `scripts/check-file-size.mjs` plafonne à **250 lignes**, et une page de sept sections le dépasserait largement.

## 8. Le régime de mouvement

La charte §5.6 impose 150–300 ms et interdit l'animation décorative. Elle régit **l'outil**, où l'artisan vient travailler et où une animation lente est une gêne.

> **Amendement.** Un régime distinct s'applique aux **pages publiques de marque** — `/`, `/verifier`, et plus tard le passeport : durées jusqu'à **600 ms**, gestes narratifs autorisés. Trois règles ne bougent pas :
>
> 1. `prefers-reduced-motion` respecté — le contenu apparaît, sans mouvement ;
> 2. `transform` et `opacity` uniquement, jamais de propriété qui déclenche un recalcul de mise en page ;
> 3. aucune animation ne bloque une interaction, et aucune ne retarde l'affichage d'un texte.

### Les deux gestes retenus

**La mise d'équerre** (`Reveal`) — le bloc arrive à −1,6° et 16 px plus bas, puis se redresse ; le carré terre cuite se pose à l'instant où l'alignement est atteint. C'est le nom de la marque, joué. **Un seul par écran**, réservé aux blocs qui portent une promesse.

**Le calepinage** (`Stagger`) — les éléments d'une grille se posent un à un, décalés de 70 ms, comme on pose du carrelage. Ce n'est pas un geste mais une **cadence** : elle ne concurrence rien et peut cohabiter avec le premier.

> **Amendement du 10 août 2026 — le calepinage porte enfin le chantier.** Les deux gestes de la marque disaient déjà les deux moments du métier : la mise d'équerre est celui du **contrat**, le calepinage celui du **chantier**. Mais la cadence ne servait que des grilles d'arguments, et la frise qui raconte vraiment un chantier — de la signature à la facture — s'en passait, faute d'un `Stagger` à cinq colonnes.
>
> `Stagger` accepte donc `cols={5}` et `as="ol"`. Les deux vont ensemble : une frise dont l'ordre porte l'information est une liste ordonnée, et poser des `div` dans une `<ol>` aurait rendu le balisage invalide — c'est précisément ce qui l'en empêchait. Aucun troisième geste n'est créé, aucun régime n'est ajouté : la cadence existante s'applique enfin au contenu qui la justifie.

Deux gestes ont été écartés après essai : le **tracé au trait** (joli une fois, puis il retarde la lecture) et le **fil à plomb** (3,4 s de cycle — une accroche, pas un motif).

## 9. Référencement et partage

Chaque page porte son `title`, sa `description` et son `canonical`. L'image de partage est **générée par code** via la convention `opengraph-image.tsx`, avec les tokens de marque et les fichiers de police déjà embarqués pour le PDF (`src/pdf/fonts/`). Une image générée ne diverge pas de la charte ; une image dessinée à la main, si.

`/` et `/verifier` sont indexables. Rappel : `/design-system` reste en `noindex`.

## 10. Ce qui reste ouvert

| # | Sujet | Traitement |
|---|---|---|
| 1 | **Limitation de débit** sur le renvoi de lien de devis | À trancher au plan. Bloquant avant mise en ligne : sans elle, le formulaire est un vecteur d'envoi en masse. |
| 2 | **Prix de l'abonnement Pro** | Hors périmètre de cette spec. La page n'affiche aucun chiffre tant qu'il n'est pas arrêté. |
| 3 | **Formulation exacte de la section « la suite »** | Le principe est arrêté — direction, sans date. La rédaction finale se valide à la relecture des maquettes. |
| 5 | **L'onboarding artisan n'existe pas** | Le bouton de la page pro pointe provisoirement sur `/connexion` via la constante `ONBOARDING_HREF`. À repointer quand l'onboarding sera construit — une ligne. |
| 6 | **Authentification par mot de passe et par Google** | Décidée, et volontairement reportée après cette landing. Chantier distinct : elle rouvre l'arbitrage du lien magique, touche la configuration Supabase, et fait entrer Google comme tiers dans le cadrage RGPD. |
| 4 | **Photographie et illustration** | Aucune. Les deux pages reposent sur la typographie, la couleur et le mouvement. À reconsidérer quand des chantiers réels seront photographiables. |

## 11. Les textes de référence

Les maquettes validées vivent sous `.superpowers/brainstorm/`, qui est **gitigné** : les textes sont donc consignés ici, sinon ils seraient perdus. Ce sont eux qui font foi à l'implémentation.

### Page pro

| Emplacement | Texte |
|---|---|
| Accroche | **Vos devis et vos factures, gratuits à vie.** |
| Chapeau | Conformes aux mentions obligatoires du bâtiment, signés par vos clients en deux minutes. Et une page publique qui prouve que votre assurance est à jour. |
| Action | Bouton **Commencer**, en encre. Destination : `ONBOARDING_HREF`, provisoirement `/connexion`. |
| Réassurance | Trente secondes. Aucune carte bancaire. |
| §4.2 étiquette | Ce que ça vous évite |
| §4.2 titre | **Un devis sans mention d'assurance coûte 15 000 €.** |
| §4.2 chapeau | L'article L243-2 impose sur chaque devis le nom de l'assureur, la référence du contrat, les activités garanties et la zone couverte. Par infraction constatée. On les écrit pour vous, une fois, et elles apparaissent partout. |
| §4.3 étapes | **Vous saisissez votre SIRET** — Raison sociale, adresse, forme juridique : récupérées automatiquement. · **Vous rédigez votre devis** — TVA multi-taux, mentions obligatoires, PDF conforme. · **Votre client signe** — Par lien et code SMS. Horodaté, avec piste d'audit. |
| §4.4 étiquette | Ce que personne d'autre ne fait |
| §4.4 titre | **Votre assurance, vérifiée activité par activité.** |
| §4.4 chapeau | Un artisan assuré en plomberie qui refait un tableau électrique n'est pas couvert — et son client n'a aucun recours. Nous croisons votre attestation avec vos activités déclarées, et nous affichons le résultat en clair. |
| §4.4 clôture | Chaque activité couverte apparaît sur votre page publique. Les autres n'y figurent pas — c'est ce qui rend la page crédible. |
| §4.5 titre | **Ce que nous ne ferons jamais.** |
| §4.5 corps | Nous ne vendrons jamais votre place dans un classement. Nous ne prendrons jamais de commission sur vos propres clients. |
| §4.7 étiquette | Ce que ça coûte |
| §4.7 titre | **L'outil est gratuit. Pour toujours.** |
| §4.7 chapeau | Devis, factures, signature, page publique : gratuits à vie, sans limite de volume. L'abonnement Pro ne concerne que ce qui vient après — équipe, planning, situations de travaux, relances d'impayés. |

### Page demandeur

| Emplacement | Texte |
|---|---|
| Accroche | **Votre artisan est-il assuré pour ce qu'il va faire ?** |
| Chapeau | Une assurance décennale ne couvre que les activités qu'elle nomme. Entrez le SIRET de l'entreprise : nous affichons ce qui est couvert, et ce qui ne l'est pas. |
| Champ | *SIRET de l'entreprise* · bouton **Vérifier** (terre cuite) |
| Réassurance | Gratuit, sans compte. Le SIRET figure sur son devis. |
| §5.2 étiquette | Le piège |
| §5.2 titre | **Assuré ne veut pas dire assuré pour tout.** |
| §5.2 chapeau | C'est le premier motif de refus d'indemnisation du secteur. L'attestation liste des activités précises ; les travaux qui n'y figurent pas ne sont pas couverts, même si l'entreprise est parfaitement en règle par ailleurs. |
| §5.3 étiquette | Vous attendiez un devis ? |
| §5.3 titre | **On vous renvoie le lien.** |
| §5.3 chapeau | Le devis vous a été adressé par e-mail et par SMS. Si vous ne le retrouvez pas, saisissez l'adresse à laquelle il a été envoyé. |
| §5.4 étiquette | Bientôt |
| §5.4 titre | **Le carnet de votre logement.** |
| §5.4 chapeau | Chaque intervention, chaque équipement posé, chaque garantie en cours — rassemblés, et à vous. Votre espace s'ouvrira **à la signature de votre prochain devis** : rien à créer, rien à retenir. |
| §5.4 mention | Aucune inscription pour l'instant. Nous ne collectons pas votre adresse. |

**La section « la suite » (§4.6) n'a volontairement pas de texte ici.** Son principe est arrêté — une direction, aucune date — mais sa rédaction est le point ouvert n° 3 du §10 : c'est la seule de la page dont la formulation exacte engage l'entreprise sur l'avenir, elle se valide à la relecture.

### Liens croisés

En-tête pro : *Vous êtes un particulier ?* → **Se connecter** est réservé à l'artisan ; le lien vers `/verifier` porte le libellé **Vérifier un artisan**.
En-tête demandeur : *Vous êtes artisan ?* → **Créer mon compte**.
Pied de page des deux : le lien réciproque, en fin de ligne.

> **Réserve de rédaction.** L'étiquette « Bientôt » du §5.4 est la seule occurrence tolérée du mot, parce qu'elle porte une **condition explicite** — la signature d'un devis — et non une date. La section « la suite » de la page pro ne l'emploie pas.
