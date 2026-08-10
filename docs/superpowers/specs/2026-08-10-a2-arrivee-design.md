# A2 — L'arrivée

> Spec de conception · Date : 2026-08-10 · Statut : à valider

**Références :** [A1 — Les portes](2026-08-10-a1-portes-design.md) · [A1 — Les écrans des portes](2026-08-10-a1-ecrans-design.md) · [image de marque](2026-08-08-image-de-marque-design.md) · [espace demandeur](2026-08-09-espace-demandeur-design.md)

---

## 1. Le problème que A2 résout

A1 amène les gens à l'intérieur. Personne n'a décidé de ce qu'ils y trouvent.

| Constat | Conséquence |
|---|---|
| Entre « compte créé » et « premier devis envoyable », il y a huit champs obligatoires | Le mur tombe au moment de l'envoi — l'artisan a saisi les lignes d'un vrai devis, pour un vrai client, et c'est là qu'on lui apprend qu'il manque son numéro de police |
| `SignatureBlock` s'arrête à « Devis signé. Vous en recevrez une copie. » | Le demandeur ne sait pas que l'espace existe, alors que `sendSignatureReceipt` le lui écrit dans un courriel qu'il lira peut-être dans trois semaines |
| Rien ne présente les écrans | Le passeport, l'agenda, la vérification existent et ne se cherchent pas — on ne se réveille pas en voulant un « passeport » |
| Les états vides disent quoi faire, pas ce que c'est | `EmptyState` exige une `action`, ce qui est déjà bien ; il ne montre jamais à quoi ressemble le résultat |

## 2. Ce qui a été écarté, et pourquoi

### 2.1 Le tutoriel pas-à-pas en surbrillance

> **Décision. Pas de tour guidé avec spotlight, encadrés et bouton « Suivant ».**

Le coût d'abord : le design system n'a ni modale, ni popover, ni overlay — l'inventaire s'arrête à `badge`, `input`, `spinner`. Il faudrait un composant de projecteur, une poignée `data-tour` stable posée dans `app-nav`, `app-header`, `quote-table` et les états vides — et qui doit survivre à chaque refonte, sinon le tutoriel pointe le vide en silence —, un séquenceur au-dessus du routeur puisque « Suivant » navigue de `/devis` à `/mon-passeport`, et un registre d'étapes partagé, `check:feature-isolation` refusant ailleurs que dans `src/ui` un module qui connaît quatre fonctionnalités.

Deux défauts ensuite, qu'aucun budget ne corrige :

- **Le tutoriel s'exécute quand il n'y a rien à montrer.** Jour un, l'artisan a zéro devis. La surbrillance encadre un tableau vide et annonce « voici vos devis ».
- **L'écran fait 375 pixels de large.** Un projecteur sur la navigation couvre la navigation. Les coach marks sont un motif de tableau de bord de bureau ; le terrain ici est un écran de poche, avec des gants.

Et un doublon : la liste de premiers pas fait déjà le séquencement, en contexte, au moment où la personne a une raison d'agir.

### 2.2 Les données fictives

> **Décision. Aucune donnée de démonstration, dans aucun compte réel.**

`EmptyState` porte déjà la doctrine : *« Un écran vide dit toujours quoi faire ensuite… c'est précisément l'écran que voit un artisan à sa première connexion. »*

Trois raisons de ne pas en dévier :

1. **Le passeport.** `passport-metrics` se calcule à la lecture, sur les chantiers réels. Un devis fictif signé entre dans le dénominateur, donc dans le taux affiché publiquement, donc dans `directory-ranking`. On pourrait poser un drapeau `isDemo` et filtrer — mais chaque lecture devrait s'en souvenir, et [my-properties.ts:52](../../../src/services/my-properties.ts) écrit que l'exclusion doit être portée par la requête, jamais par un filtre d'affichage.
2. **Rien ne s'efface.** Journal (`9001`), facture (`9003`), publication de chantier (`9009`) sont immuables par déclencheur. « Supprimable » n'est pas une option que le schéma propose.
3. **Le risque bête.** Un devis d'exemple dans la liste finit un jour envoyé à un vrai client.

### 2.3 Ce qu'on fait à la place — et la condition pour y revenir

> **Décision.** Le mot d'accueil par écran, et la mesure de la découverte.

Si, dans deux mois, le journal montre que les artisans n'ouvrent toujours pas leur passeport, alors on construira — **en sachant quelles étapes couvrir au lieu de les deviner** — soit le tutoriel, soit un atelier d'exemple à part : une route en lecture seule, entièrement fictive, jamais rattachée à un compte, jamais comptée nulle part. Coût réel, risque nul. Après la mesure, pas avant.

## 3. La liste de premiers pas

> **Décision.** Tant que le compte est neuf, `/devis` s'ouvre sur une liste de premiers pas. **Rien n'est bloquant.**

```
│  Bienvenue chez PLOMBERIE MARTIN         │
│  Trois choses avant votre premier devis. │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ✓  Votre entreprise                │  │
│  │    SARL · SIRET · TVA · adresse    │  │
│  ├────────────────────────────────────┤  │
│  │ ○  Vos coordonnées          →      │  │
│  │    Téléphone et immatriculation    │  │
│  ├────────────────────────────────────┤  │
│  │ ○  Votre assurance décennale →     │  │
│  │    Assureur, police, activités     │  │
│  ├────────────────────────────────────┤  │
│  │ ○  Vos conditions de règlement →   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │        Établir un devis            │  │
│  └────────────────────────────────────┘  │
│  Vous pourrez l'envoyer une fois les     │
│  trois lignes cochées.                   │
```

> **Décision structurante.** Les lignes viennent de `missingMentionGroups`, jamais d'une liste écrite en dur.

Ce sont **exactement** les trois lignes déjà vues à l'étape 2 de l'inscription, dans le même ordre. C'est ce qui fait qu'arriver dans l'atelier ne surprend pas : l'artisan reconnaît un travail qu'on lui a annoncé avant qu'il ne s'engage.

Deux listes de champs obligatoires divergeraient, et l'écran finirait par cocher ce que le serveur refuse — la même erreur que la table des capacités évite côté droits.

> **Décision. La première ligne est déjà cochée.**

Forme juridique, SIRET, TVA, adresse arrivent de l'API. On commence à une sur quatre, pas à zéro, et c'est vrai. Une liste qui démarre vide donne l'impression d'un produit qui n'a rien fait ; celle-ci prouve le contraire dès la première seconde.

> **Décision. « Établir un devis » reste actif.**

Le refus tombe à l'envoi, où il tombe déjà. Interdire la rédaction reviendrait à faire le tunnel qu'on a écarté, en le déguisant.

**Disparition.** La liste s'efface quand `missingMentionGroups` rend un tableau vide **et** qu'un devis existe. Pas de préférence à stocker : l'état de la liste *est* l'état du compte.

## 4. Le mot d'accueil par écran

> **Décision.** À la première visite d'un écran, une carte refermable en haut : deux phrases, et le seul geste qui compte.

Pas d'incrustation, pas de séquence, pas d'ancrage au DOM. Chaque page possède la sienne — donc aucun couplage transverse, donc `check:feature-isolation` reste vert. Sur mobile elle est *dans* le flux : elle ne couvre rien.

| Écran | Ce que dit la carte |
|---|---|
| `/devis` | Remplacée par la liste de premiers pas tant qu'elle existe |
| `/mon-passeport` | « Cette page est publique. Vos clients y voient vos assurances vérifiées et vos délais tenus. » |
| `/agenda` | « Vos rendez-vous, et ceux que vous pouvez proposer à vos clients. » |
| `/verification` | « Déposez vos attestations : c'est ce qui fait passer votre passeport en vérifié. » |
| `/mes-logements` | « Tous vos chantiers, toutes entreprises confondues. Vous êtes le seul à les voir réunis. » |
| `/mon-repertoire` | « Les artisans que vous voulez pouvoir rappeler — y compris ceux qu'on ne connaît pas. » |

> **Décision. Le rejet se stocke en base, pas dans le navigateur.**

L'artisan saisit au bureau et consulte sur le chantier. Un rejet en `localStorage` lui reservirait chaque carte sur le second appareil — l'inverse exact de « ne pas être perdu ».

```
screen_note_dismissal
  user_id      uuid  notnull        -- auth.users, pas member : le demandeur en a aussi
  note_key     text  notnull        -- 'passeport', 'agenda', 'mes-logements'…
  dismissed_at timestamptz notnull default now()
  primary key (user_id, note_key)
```

`user_id` plutôt que `member_id` ou `requester_id` : les deux publics ont des cartes, et une seule table vaut mieux que deux qui font la même chose.

> **Décision. « Revoir les explications » vit dans le menu du compte, et supprime les lignes.**

Rejouer, c'est effacer le rejet — pas poser un second drapeau. Deux mécanismes pour un état divergeraient.

## 5. Les états vides enseignent

> **Décision.** L'état vide de `/devis` montre à quoi ressemble un devis — **en illustration, jamais en ligne de tableau.**

C'est la réponse à « comment enseigner sans données fictives ». On enseigne la forme sans polluer les faits : un aperçu visiblement statique, à côté de « Établir mon premier devis ». Rien n'entre en base, rien n'entre dans une métrique, rien ne peut être envoyé par erreur.

`EmptyState` gagne un `illustration` facultatif. Facultatif, parce que la plupart des vides n'en ont pas besoin : une file d'attestations vide est une bonne nouvelle, pas une leçon.

## 6. L'écran de confirmation après signature

> **Décision.** `SignatureBlock` nomme l'espace. Le courriel existe déjà et ne bouge pas.

```
│  ✓ Devis signé.                          │
│                                          │
│  Une copie part vers paul@exemple.fr.    │
│                                          │
│  Vous pourrez suivre ce chantier — les   │
│  photos, l'avancement, la réception —    │
│  sur votre espace. Le lien est dans le   │
│  courriel.                               │
```

> **Décision. Aucun bouton, aucun champ, aucune création de compte sur cet écran.**

La personne vient de s'engager sur plusieurs milliers d'euros ; elle ne va pas créer un compte dans la foulée, et la lui proposer ici coûterait des signatures pour rien. C'est le courriel qui travaille, trois semaines plus tard, quand elle se demandera où en est le chantier. Cet écran ne fait qu'annoncer que le courriel contient quelque chose.

Rien ne change à `sendSignatureReceipt` ni à son appel hors du chemin critique.

## 7. La mesure

> **Décision.** La découverte s'instrumente, et c'est ce qui décidera d'A2-bis.

Le journal d'événements existe. Trois faits suffisent :

| Événement | Ce qu'il répond |
|---|---|
| `onboarding.step_completed` (groupe) | Où les artisans s'arrêtent dans les trois lignes |
| `screen.first_visit` (clé d'écran) | Quels écrans ne sont jamais ouverts |
| `note.dismissed` (clé d'écran) | Les cartes lues, distinguées des cartes ignorées |

Aucune donnée personnelle : une clé d'écran et un identifiant déjà présent dans `actor_id`.

Le seuil est écrit d'avance, pour que personne ne le négocie après coup : **si à deux mois moins d'un artisan sur trois a ouvert son passeport**, la carte d'accueil n'a pas suffi, et le tutoriel ou l'atelier d'exemple redeviennent une question ouverte.

## 8. Ce que A2 ne fait pas

- **Le tutoriel en surbrillance** — §2.1, et la condition pour y revenir en §7.
- **L'atelier d'exemple** — même condition.
- **Toute donnée fictive dans un compte réel** — §2.2, définitivement.
- **Le mot de passe optionnel et la passkey** → A3.
- **Une refonte des écrans existants.** A2 ajoute une carte en haut et un aperçu dans un vide. Rien d'autre ne bouge.

## 9. Vérification

| Ce qui est vérifié | Comment |
|---|---|
| Les lignes de la liste viennent de `missingMentionGroups` | Test unitaire : une entreprise sans assurance affiche la ligne assurance, une entreprise complète n'affiche pas la liste |
| La première ligne est cochée dès l'inscription | Parcours e2e : après création, « Votre entreprise » est cochée |
| L'ordre est identique à celui de l'étape 2 de l'inscription | Test unitaire sur `missingMentionGroups`, déjà écrit en A1 |
| La liste disparaît une fois les mentions complètes **et** un devis émis | Test d'intégration |
| « Établir un devis » reste actif malgré des mentions manquantes | Parcours e2e |
| Une carte rejetée ne revient pas sur un autre appareil | Test d'intégration : rejet, puis lecture avec une session neuve du même compte |
| « Revoir les explications » fait revenir les cartes | Test d'intégration |
| L'écran de signature nomme l'espace | Parcours e2e, dans `space-journey` |

## 10. Ce qui reste ouvert

- **Le nom de l'artisan.** `member.name` est nullable et A1 ne le demande pas. Il n'entre pas dans les trois lignes — ce n'est pas une mention obligatoire — mais l'en-tête dit « Bienvenue chez PLOMBERIE MARTIN », ce qui suffit peut-être.
- **La carte d'accueil de `/factures` et `/equipe`.** Non listées en §4 : la facture s'atteint depuis un devis, et l'équipe est derrière le plan Pro. À trancher quand les deux écrans auront un premier usage réel.
- **Le seuil de deux mois.** Choisi par défaut d'expérience. À recaler dès qu'un premier cohort existe.
