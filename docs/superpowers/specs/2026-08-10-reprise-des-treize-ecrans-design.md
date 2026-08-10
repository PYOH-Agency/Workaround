# Reprise des treize écrans — design

**10 août 2026.** Les treize écrans arrivés sur `main` depuis le 9 août — agenda, équipe,
situation de travaux, suivi de chantier, espace du demandeur, arbitrage, backoffice des
entreprises — ont été livrés écran par écran, chacun correct isolément. Lus ensemble, ils
partagent trois défauts de structure et une poignée de défauts nommés.

Cette spec ne rouvre ni la palette, ni la typographie, ni la voix. Elle ne traite que la
**structure** et complète l'inventaire de [l'image de marque](2026-08-08-image-de-marque-design.md)
§6.1, comme celle-ci l'exige de toute addition.

## 1. Le constat

### 1.1 Une seule colonne, quelle que soit la largeur

`AppShell` offre `max-w-5xl`. Les écrans y versent tantôt `max-w-xl`, tantôt `max-w-2xl`,
tantôt rien : trois mesures pour une même famille d'écrans, sans qu'aucune règle ne les
départage. Et aucun n'utilise la seconde dimension. Sur l'écran où l'artisan cale sa
semaine, l'agenda d'une semaine de cinq rendez-vous demande trois défilements et laisse la
moitié droite vide.

### 1.2 Tout est une carte

Chaque élément de liste est une `Card elevation="e1"` — bordure, fond, ombre. Un répertoire
de six entreprises, six boîtes ; une situation de douze lignes, douze. Quand tout est élevé,
plus rien ne l'est, et l'élévation cesse de vouloir dire quelque chose.

La carte n'est pas en cause : son emploi l'est. Elle désigne un **objet détaché** — un
récapitulatif, un encart d'exception. Pas une ligne de liste.

### 1.3 Le même bloc, recopié

| Recopié | Fois | Où |
|---|---|---|
| L'encart d'alerte `role="alert"` et sa chaîne de classes | 5 | `SituationForm`, `TeamPanel`, `CancelButton`, `agenda/synchronisation`, `mon-repertoire` |
| Le bloc titre `Heading` + `Text size="sm"` | 13 | tous |
| Le lien « ← Retour à… », en **bas** de page | 7 | situation, chantier, agenda ×2, mes-chantiers, mon-repertoire ×2 |

Un bloc recopié cinq fois a déjà commencé à diverger : deux des cinq encarts n'ont pas le
même espacement interne.

## 2. Les trois gestes

### 2.1 La règle remplace la boîte

> **Décision.** Une liste qui est une **suite** se pose sur un filet vertical marqué du carré
> de l'angle droit. Une liste qui est une **comparaison** devient un tableau. La carte reste
> pour l'objet détaché.

Le motif vient de la marque, pas d'un catalogue : `Mark` est une équerre dont le carré
intérieur — le signe conventionnel de l'angle droit vérifié — mesure 7 unités sur 48. Le
carré du `RailItem` mesure 7 px, et celui de l'élément courant 9 px en terre cuite.

Ce que ça rend : une **continuité**. Un fil de chantier est une suite d'événements, pas six
objets côte à côte. La structure dit enfin quelque chose de vrai sur le contenu — et à
hauteur d'écran constante, le fil passe de deux à quatre entrées lisibles.

### 2.2 Le dock

> **Décision.** `AppShell` gagne une **disposition** à deux colonnes — une colonne principale
> et un `aside` collant de 296 px — et non un composant. Sous 900 px, l'`aside` s'empile
> après la colonne principale.

Ce n'est pas une entrée d'inventaire : c'est une variante de gabarit, au même titre que
`max-w-5xl` en est une.

Le dock porte ce qu'on consulte **pendant** qu'on agit : le montant d'une situation en cours
de saisie, les documents d'un chantier. Aujourd'hui ces blocs sont sous la colonne, donc hors
du champ de vision au moment exact où ils comptent.

Deux écrans n'en reçoivent pas, et pour deux raisons distinctes :

- **`/devis/[id]/chantier`** — il n'a rien à docker. L'état de l'argent n'existe pas dans
  `companyChantierFile` ; l'inventer aurait été un travail de service, pas de dessin.
- **`/c/[token]`** — `PublicShell` est un gabarit de document, et l'arbitrage se lit d'un
  trait. Ce qui l'encombrait, ce sont quatre cartes empilées, pas l'absence d'une colonne :
  les faits deviennent une liste de définitions à deux colonnes, l'explication de
  l'entreprise un bloc au filet. **L'ordre ne bouge pas** — les faits précèdent le motif, et
  le motif précède la question, qui porte littéralement sur « cette explication ».

### 2.3 La latte graduée

> **Décision.** L'avancement d'une ligne de situation se dessine en trois segments —
> **acquis**, **déclaré aujourd'hui**, **reste** — gradués au quart.

L'écran de situation porte un paragraphe pour expliquer que l'avancement se déclare en
cumulé et non en delta. Un paragraphe qui explique une règle est le signe qu'un dessin la
dirait mieux. Le segment sombre est acquis et ne peut pas être repris ; le segment terre
cuite est ce qu'on ajoute. Un recul se voit : le segment terre cuite disparaît.

Les graduations au quart ne sont pas décoratives — un quart, la moitié, trois quarts, c'est
ainsi qu'un avancement se parle sur un chantier.

**Le calcul ne bouge pas.** `situationByRate` reste la fonction unique partagée avec le
serveur : c'est elle qui garantit que l'aperçu ne ment pas. Seule la position du résultat
change.

## 3. L'agenda récupère sa semaine

`agenda/page.tsx` justifiait la liste par jour : « sept colonnes horaires sur un téléphone
ne se lisent pas ». C'est vrai — sur un téléphone. Sur l'écran où l'artisan cale réellement
sa semaine, la liste coûte sept titres de jour, cinq « Rien de prévu », et interdit la seule
question que pose un agenda : *où est le trou ?*

> **Décision.** Une **bande de sept jours** au-dessus de la liste — un jour par colonne, un
> carré par rendez-vous, ancrée sur la section du jour. Et **pas** une grille horaire.

La grille horaire était le geste évident, et elle est écartée après essai. Un rendez-vous y
devient un bloc de la hauteur de sa durée : une visite d'une heure fait 44 px, trop peu pour
porter l'adresse **et** le bouton d'annulation. Il aurait fallu déporter le détail dans un
écran dédié — une décision de produit, pas de dessin, et une route qui n'existe pas. Une
grille qui retire à l'artisan la possibilité d'annuler un rendez-vous depuis son agenda
n'est pas une amélioration.

La bande donne ce que la grille promettait — *où est le trou*, combien de rendez-vous, quel
jour est chargé — sans rien retirer à la liste, qui garde tous ses gestes.

La `<ul>` porte toujours **sept `<li>`**, un par jour, et les sept sont rendus y compris
vides : sauter les jours creux ferait sauter le lecteur d'une date à l'autre. C'est aussi la
propriété gardée par `agenda-journey`, qui reste vraie sans qu'on touche au test.

Le jour courant se marque **trois fois** : le filet terre cuite sous sa colonne, la couleur
de son étiquette, et `aria-current="date"` sur la colonne comme sur la section. Même
discipline qu'`AppNav` — la couleur ne porte jamais seule.

## 4. Les défauts nommés

Indépendants des trois gestes, et corrigés d'abord parce qu'ils ne coûtent aucun composant.

| Écran | Défaut | Correction |
|---|---|---|
| `/equipe` | L'écran de refus « plan » est la **seule surface de monétisation du produit**, et il finit sur « Écrivez-nous » avec `action={null}` — aucun bouton, aucun lien. Cul-de-sac. | Un `ButtonLink` vers `mailto:`, avec objet pré-rempli. |
| `/equipe` | La pastille de rôle porte `tone="neutral" icon={check}` pour *responsable* comme pour *compagnon* : le picto ne distingue rien, ce que la règle de `Badge` interdit. | Deux glyphes — clé pour le responsable, marteau pour le compagnon. |
| `/mon-repertoire/[companyId]` | Le téléphone est du texte, sur la page qui s'appelle *Recontacter*. | Un lien `tel:`. |
| `/mon-repertoire` | « Nous ne les avons pas vérifiées » est en `tone="muted"` — le ton le plus effacé du système pour la mise en garde la plus importante de la page. | Un `Notice` laiton. |
| `/agenda/synchronisation` | L'adresse d'abonnement est dans un `<code>` sans bouton copier, alors que la page dit « collez-la dans Google Agenda ». | `CopyField`, avec retour d'état. |
| `/entreprises` | 200 lignes sans recherche, et « Repasser au gratuit » s'exécute au premier clic. | Un filtre sur nom et SIRET ; une confirmation, de la même forme que `CancelButton`. |
| Espace demandeur | `/verifier` n'est liée nulle part depuis l'espace. | Un lien depuis le répertoire. |

## 5. Les additions à l'inventaire

Quatre entrées. Chacune est **déjà écrite à la main** dans les écrans ; les nommer arrête
une dérive commencée plutôt qu'elle n'ouvre une extension.

| Entrée | Couche | Raison |
|---|---|---|
| `Notice` | molécule | L'encart d'alerte, recopié cinq fois avec la même chaîne de classes et deux espacements divergents. Tons `danger`, `warning`, `verified`. `role="alert"` quand il annonce une erreur, jamais autrement — un `alert` sur une mise en garde permanente ferait parler le lecteur d'écran à chaque rendu. |
| `PageHeader` | molécule | Fil d'Ariane, titre, sous-titre, actions. Le retour passe **en haut**, où on le cherche : en bas de page, il n'est lu que par qui a déjà fini. Tranche aussi la question des trois mesures de colonne. |
| `Rail`, `RailItem` | molécules | Le filet et son carré. `ChantierTimeline` en est le premier consommateur. |
| `DataTable` | organisme | Le tableau de comparaison. `QuoteLinesTable` montre que le produit sait le faire ; il n'a simplement pas été généralisé. Distinct de lui comme `QuoteLineEditor` l'est déjà : celui-là connaît les lignes d'un devis, celui-ci ne connaît rien de son contenu. |

### 5.1 Ce qui ne monte **pas** dans le design system

> **Décision.** Un composant consommé par un seul écran reste **auprès de son écran**, comme
> `SituationForm`, `CancelButton` ou `BusyNotice`.

- **`WeekGrid`** — la grille horaire. Elle ne sert qu'à l'agenda et connaît ses rendez-vous.
- **`ProgressGauge`** — la latte. Elle ne sert qu'à la situation et connaît le cumulé.
- **`CopyField`** — le copier. Il ne sert qu'à l'adresse d'abonnement.

`ChantierTimeline` est monté dans le design system pour une raison qui ne vaut pas ici : le
client et l'entreprise doivent lire **la même chose**, et la loger d'un côté aurait obligé
l'autre à importer une fonctionnalité voisine. Aucun de ces trois n'a de second lecteur.

### 5.2 Deux glyphes de plus

`key` et `hammer` rejoignent `Icon`. Ce n'est pas une addition d'inventaire — `Icon` est un
composant unique dont la table est interne — mais elle est notée ici parce qu'elle est la
condition de la correction du badge de rôle.

## 6. L'ordre de reprise

Chaque rang est livrable et testable seul, et les parcours Playwright restent verts à chaque
rang. Un rang qui les casse a cassé un parcours — sauf mention explicite ci-dessous.

| # | Périmètre | Pourquoi à ce rang |
|---|---|---|
| 0 | Les défauts nommés (§4), hors `CopyField` | Aucun composant nouveau, aucune structure touchée, et l'un d'eux est la seule porte payante du produit. |
| 1 | `Notice`, `PageHeader` + les treize écrans | Aucune décision de dessin à prendre : les deux arrêtent une recopie. Tous les écrans en bénéficient d'un coup, et la question des trois mesures se tranche là. |
| 2 | `Rail`, `RailItem` + `ChantierTimeline`, `/mes-logements` | Le composant, puis son premier consommateur dans la foulée — l'ordre des rangs du design system. |
| 3 | `DataTable` + `/mon-repertoire`, `/equipe`, `/entreprises` | Trois écrans, un seul motif. |
| 4 | Le dock + `ProgressGauge` | Le gabarit se prouve sur la situation — l'écran où le montant compte le plus — avant d'être généralisé au chantier, à `/mes-chantiers` et à `/c/[token]`. |
| 5 | `WeekGrid`, `CopyField` | Les deux seuls gestes qui inventent plutôt qu'ils ne rangent. En dernier, quand le reste est calme. |

**Aucun rang ne modifie un test existant.** La grille horaire l'aurait exigé ; la bande, non
(§3). Les parcours gagnent en revanche deux assertions : la bande de semaine sur `/agenda`,
et le lien de l'offre Pro sur `/equipe` — la seule surface payante du produit ne doit plus
jamais redevenir un cul-de-sac sans que la CI le dise.

## 7. Ce qui reste ouvert

| # | Sujet | Traitement |
|---|---|---|
| 1 | **L'adresse de contact de l'offre Pro** | `bonjour@dequerre.fr` est posé faute d'adresse existante dans le code. À confirmer avant mise en ligne — c'est le lien de la seule surface payante. |
| 2 | **Poser un rendez-vous depuis un créneau de la grille** | La grille rend le geste évident, et `/agenda/nouveau` sait déjà tout faire. Le pré-remplissage par `?debut=` est laissé au jalon qui en aura besoin. |
| 3 | **Le tri et la pagination de `DataTable`** | Le backoffice plafonne à 200 lignes et le répertoire d'un particulier en compte cinq. Le filtre suffit ; le tri attendra un écran qui le réclame. |
