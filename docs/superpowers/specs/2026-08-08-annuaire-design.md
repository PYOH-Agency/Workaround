# M4 — L'annuaire

> Spec de conception · Date : 2026-08-08 · Statut : à valider
> La ligne M4 de la spec produit mentionne aussi un « backoffice d'observation » : **il est livré**, hors séquence. Le périmètre se réduit d'autant.

**Références :** [spec P1 §4, §8, §12, risque 11](2026-08-07-socle-artisan-design.md) · [AIPD du passeport](../rgpd/2026-08-08-aipd-passeport.md)

---

## 1. Le problème

M3 a livré des pages publiques référençables. Personne ne peut les chercher.

C'est le risque n° 11 de la spec produit, et il est de moi : la ligne de partage entre P1 et P2 était tracée avec soin pour le demandeur — on lui montre une échéance sans lui laisser cliquer, et cette frustration deviendra la demande de P2. **Rien d'équivalent n'existait côté artisan.** Entre la vérification et la marketplace, il gagne un outil de devis sur un marché encombré et un passeport que personne ne cherche.

> Un artisan qui ne reçoit aucun chantier part — et emporte la donnée, donc le label, donc le produit.

L'annuaire est ce qui fait que le passeport commence à rapporter.

## 2. Ce que ce n'est pas

Trois interdits du modèle économique restent entiers : **ni agrégation de demande, ni matching, ni lead vendu.**

Le discriminant tient en une phrase :

> **Le demandeur choisit l'entreprise. Nous ne choisissons jamais pour lui.**

Une recherche qu'il pilote, des résultats qu'il compare, une entreprise qu'il désigne. Pas de dépôt de projet, pas de diffusion à plusieurs, pas d'appel d'offres. Le §4 de la spec produit reste respecté à la lettre.

## 3. La recherche

`/annuaire` — deux filtres, et rien de plus : une **activité** du référentiel (41 entrées) et une **zone** (code postal ou commune).

### 3.1 La règle qui porte tout le jalon

> **Une entreprise n'apparaît pour une activité que si cette activité précise est couverte.**

Chercher « électricité » ne doit jamais faire remonter un plombier visible au titre de la plomberie. C'est la suspension granulaire de M3 rendue visible.

Sans cette règle, l'annuaire dirait *« assuré »* là où M3 dit *« assuré pour ça »* — et la promesse s'effondrerait au premier sinistre, en emportant la seule chose que le produit vend.

Conséquence d'implémentation, dans la lignée de l'AIPD : **le filtre est porté par la requête, jamais par l'affichage.** Une liste complète filtrée à l'écran finirait par laisser passer une entreprise au premier remaniement.

### 3.2 Le vocabulaire du demandeur

Le référentiel dit « Menuiseries extérieures ». Le demandeur pense « changer mes fenêtres ». Lui demander de traduire, c'est lui demander de connaître la nomenclature des assureurs — l'inverse de rassurant.

> **Décision.** Un référentiel de **besoins courants**, en français de demandeur, chacun pointant vers une activité. Une donnée, comme le référentiel d'activités : elle s'enrichit par migration, sans redéploiement.

La recherche accepte donc soit un besoin (« Remplacer un chauffe-eau »), soit une activité pour qui connaît le vocabulaire.

> **Un besoin ne pointe que vers UNE activité.**

« Refaire une salle de bain » toucherait la plomberie, le carrelage, l'électricité et la menuiserie. Renvoyer un plombier en laissant croire qu'il fait le tout serait la promesse floue qu'on reproche au secteur. Les besoins multi-corps d'état demandent un séquençage : c'est **P6**, pas M4.

### 3.3 Pourquoi pas de moteur de correspondance

L'idée revient naturellement quand on cherche à rassurer. Elle est écartée pour deux raisons, et la seconde suffirait.

**Elle contredit le discriminant du §2** : un moteur choisit à la place du demandeur.

**Et surtout, il n'aurait rien sur quoi correspondre.** Les métriques arrivent en M5. On ne dispose aujourd'hui que de la couverture et de la proximité — exactement ce que la recherche fait déjà. Un « match » serait la même chose sous un nom promettant un jugement qu'on n'est pas en état de porter : le mensonge le plus coûteux possible sur un produit qui vend la confiance.

## 4. Le classement

Aucune métrique n'existe encore — elles arrivent en M5. Il faut pourtant ordonner, et **ce qu'on choisit devient la monnaie que les artisans chercheront à optimiser.**

### 4.1 Trois rangs de proximité

Calculés sur ce que la base porte déjà : code postal et commune. Aucun géocodage.

**La saisie est interprétée par sa forme** : cinq chiffres valent un code postal, tout le reste vaut un nom de commune, normalisé comme les adresses de M1 — sans accents, sans ponctuation.

| Rang | Correspondance |
|---|---|
| 0 | Code postal exact, ou commune exacte selon la saisie |
| 1 | Même département — les deux premiers caractères du code postal |
| 2 | Le reste |

Quand la saisie est une **commune**, le département se déduit du code postal des entreprises qui y siègent. Si aucune n'y siège, le rang 1 n'existe pas et tout le reste tombe au rang 2 — voir §10.

La proximité est ce que le demandeur veut réellement, et elle **ne s'achète pas** : une entreprise ne déménage pas pour un référencement.

### 4.2 À rang égal, une rotation stable

> **Décision.** L'ordre au sein d'un rang dérive d'une empreinte de `(identifiant d'entreprise, date du jour)`.

Stable dans la journée — la pagination tient, recharger ne rebat pas les cartes — et il tourne d'un jour à l'autre.

Sans cela, l'ordre d'insertion en base deviendrait une rente : **les premiers inscrits prendraient tous les appels, à jamais**, et aucun comportement ne pourrait changer leur position. C'est le défaut qu'on reproche aux annuaires du secteur.

Fonction pure, donc testable.

### 4.3 Ce qui n'entre pas dans le classement

- **Aucune mise en avant payante.** Principe n° 1, non négociable.
- **Aucun score de complétude.** Récompenser le nombre d'activités déclarées pousserait à la sur-déclaration — l'inverse de ce que le produit mesure.
- **Aucune ancienneté.** Un classement figé à vie n'est pas un classement, c'est une rente.

## 5. Le contact

Les coordonnées de l'entreprise s'affichent — téléphone et courriel figurent déjà sur chacun de ses devis, au titre des mentions obligatoires. S'y ajoute un formulaire vers **une entreprise choisie**, relayé par courriel.

### 5.1 Le garde-fou structurel

> **Décision. On ne stocke jamais le contenu d'une demande.** Elle est relayée, puis oubliée.

Ce n'est pas une économie de table. C'est ce qui rend l'interdit tenable :

**Il n'existe aucune base de leads à revendre.** *« Vendre des leads »* cesse d'être une promesse pour devenir une impossibilité. Y revenir supposerait de créer la table — un acte visible et délibéré, pas un réglage qu'on active un mauvais jour.

**Aucune donnée personnelle n'entre dans le journal immuable.** C'est la leçon de M1, où une adresse en clair avait rendu le droit à l'effacement structurellement impossible. Le journal enregistre **le fait** — telle entreprise a reçu une demande, à telle date — et rien d'autre.

Ce fait suffit à l'attribution : *« 3 demandes via D'équerre ce mois-ci »*. Et l'attribution est exactement ce qui répond au problème du §1 — sans elle, l'artisan ne sait pas si l'outil lui rapporte, donc il part.

### 5.3 La conversation sort du produit, et c'est voulu

Le demandeur écrit depuis le site ; **l'artisan reçoit un courriel et répond directement**, par téléphone ou par mail. Aucun fil de discussion, aucune boîte de réception, aucun compte.

Tenir la conversation serait le premier pas vers tenir le lead. Le coût est assumé : on voit le premier contact, jamais la suite.

**Mais la boucle se referme ailleurs.** Si le contact devient un chantier, l'artisan rédige un devis dans l'outil — et M1 le capte déjà. Il n'y a pas besoin d'une messagerie pour savoir si l'annuaire produit du travail.

### 5.2 Contre l'abus

Un formulaire public qui envoie des courriels sans limite est un relais de spam.

Une table `contact_throttle` — empreinte d'adresse IP et horodatage — plafonne les envois par heure. **Séparée du journal, donc effaçable**, et purgée à 24 h **par le travail de fond quotidien existant** — aucune planification de plus, pour la même raison qu'en M3 : chaque planification supplémentaire est une façon de plus de tomber en panne sans qu'on le sache.

C'est une mesure anti-abus de durée courte, fondée sur l'intérêt légitime.

## 6. Modèle de données

**Une seule table**, et elle ne contient rien du demandeur en clair.

```
contact_throttle
  id            uuid
  ip_hash       text         -- empreinte, jamais l'adresse
  created_at    timestamptz
  index (ip_hash, created_at)
```

Le journal d'événements reçoit un `directory.contact` portant l'entreprise et la date. Aucun nom, aucune adresse, aucun message.

S'y ajoute le référentiel des besoins — `need(slug, label, activity_code)` —, alimenté par migration comme celui des activités.

Rien d'autre : la recherche lit ce que M3 a déjà posé — `company`, `company_activity`, `insurance_certificate`, `certificate_activity`.

## 7. Protection des données

| Donnée | Traitement |
|---|---|
| Nom, courriel, téléphone, message du demandeur | **Relayés, jamais stockés** |
| Empreinte d'IP | 24 h, anti-abus, table dédiée effaçable |
| Fait du contact | Journal immuable, sans donnée personnelle |

Le formulaire porte un lien vers `/confidentialite` et une phrase disant à qui le message est transmis. Un demandeur qui écrit à un artisan doit savoir que nous ne conservons pas son message — c'est vrai, et c'est un argument.

## 8. Ce que l'annuaire ne fait pas

- **Aucun dépôt de projet ouvert.** Le demandeur désigne toujours une entreprise.
- **Aucune diffusion à plusieurs.** Une demande, une destinataire.
- **Aucun compte demandeur.** M6.
- **Aucune métrique dans les résultats.** M5. L'annuaire dit déjà *« tous ces artisans sont assurés pour ce qu'ils font »*, ce que personne d'autre ne peut dire.
- **Aucune carte.** Sans géocodage, elle serait fausse ; avec, elle serait un projet.
- **Aucun avis, aucune note.** Jamais.

## 9. Vérification

- **Le classement** : fonction pure, testée sur les trois rangs et sur la stabilité de la rotation — même jour, même ordre ; jour suivant, ordre différent.
- **Le filtre par activité** : un test montre qu'une entreprise couverte en plomberie **n'apparaît pas** dans une recherche d'électricité, alors qu'elle a bien déclaré l'électricité.
- **Le contact** : testé avec un envoi simulé. Un test vérifie qu'**aucune ligne ne contient le message** après envoi.
- **Le plafond** : testé au seuil, juste en dessous et juste au-dessus.
- **Le parcours** : de la recherche à la demande reçue.

## 10. Ce qui reste ouvert

- **Le plafond horaire** par empreinte d'IP est un pari. À revoir sur trafic réel.
- **La saisie d'une commune inconnue** de la base ne permet pas de déduire un département : tous les résultats tombent alors au rang 2. Acceptable au démarrage ; une table des communes le corrigerait, et ce serait un projet.
- **Le géocodage** — donc le rayon en kilomètres — attendra que la densité d'entreprises rende la commune insuffisante.
