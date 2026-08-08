# Sources de vérification — cadrage de M3

> Date : 2026-08-08 · Statut : conclu
> Lève le risque n° 8 de la spec (« Accès aux sources de vérification — vérification technique à mener avant le plan ») et la décision technique n° 3 (extraction des attestations).

**Toutes les API annoncées comme testées l'ont été en direct, sur le SIRET réel `50769820700036`.** La leçon de M1 tient : des fixtures écrites à la main avaient validé un champ que l'API ne renvoyait pas, et seul un appel réel l'avait révélé.

---

## 1. Ce qui change par rapport à la spec

| Hypothèse de la spec | Réalité |
|---|---|
| RNE (INPI) — « modalités d'accès à confirmer » | **Redondant.** L'API utilisée depuis M1 relaie déjà les données RNE, avec leur date de fraîcheur |
| RGE via open data ADEME — « format à confirmer » | **Confirmé, et bien plus riche qu'attendu** : le détail par qualification, avec dates de validité **et** organisme certificateur |
| Référentiel d'activités : « piste Qualibat » | **Non — la nomenclature France Assureurs.** Qualibat qualifie des compétences ; France Assureurs nomme des activités, et c'est le vocabulaire des attestations |
| Attestation de vigilance URSSAF, collectée | **La voie évidente est fermée.** Une autre existe, hors chemin critique |

---

## 2. Le mur : API Entreprise nous est fermée

C'est la porte d'entrée officielle vers les données administratives certifiées — attestation de vigilance URSSAF, attestation d'immatriculation RNE, actes et bilans. Elle nous est inaccessible.

L'accès est réservé aux administrations au sens de l'article L. 100-3 du CRPA et aux organismes chargés d'une mission de service public. Un éditeur de logiciel privé peut intégrer l'API **pour le compte de ses clients publics**, mais la règle est sans ambiguïté : *« le prestataire ne peut en aucun cas être destinataire des données »*.

**Nous ne sommes pas chargés d'une mission de service public.** Il n'y a pas de contournement, et il n'est pas utile d'en chercher un : demander une habilitation sur un fondement inexact serait une mauvaise idée sur un produit dont l'argument est la confiance.

**Conséquence pratique :** toute donnée que nous vérifions doit venir soit d'une source ouverte, soit de l'artisan lui-même. C'est la contrainte structurante de M3, et elle explique pourquoi le dépôt d'attestation est au centre du jalon plutôt qu'un repli.

---

## 3. Les sources ouvertes, testées

### 3.1 Recherche d'entreprises — déjà en place depuis M1

`https://recherche-entreprises.api.gouv.fr/search` · gratuite, sans clé, sans quota déclaré.

Elle couvre **tout le niveau 1** de la vérification, et davantage :

| Champ | Usage en M3 |
|---|---|
| `etat_administratif`, `date_fermeture` | Existence légale, cessation |
| `date_creation` | Ancienneté du passeport |
| `dirigeants` | Identité du responsable |
| `date_mise_a_jour_rne` | **Fraîcheur des données RNE** — le relais rend l'accès INPI direct largement superflu |
| `complements.est_rge` | Drapeau RGE, à confirmer par le détail ADEME |
| `complements.est_entrepreneur_individuel` | Le champ qui distingue les deux régimes juridiques de l'AIPD |

> **Le RNE direct sort du chemin critique.** Le seul élément qu'il apporterait et que cette API n'expose pas est la **qualité d'artisan**. Or la spec pose déjà qu'« on ne revérifie pas ce que l'État vérifie déjà » : la qualification est contrôlée par la Chambre de Métiers à l'immatriculation. C'est un élément d'affichage, pas une garantie à produire. Il ne justifie ni un compte INPI, ni une dépendance de plus.

### 3.2 BODACC — procédures collectives

`https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/...` · gratuite, **sans clé ni inscription**, licence ouverte.

Testée : 19 annonces retrouvées sur le SIREN d'essai. Les familles d'avis sont normalisées, ce qui évite d'analyser du texte libre :

| `familleavis` | Effet sur la visibilité |
|---|---|
| `collective` | **Bloquant** — redressement, liquidation, sauvegarde |
| `conciliation` | Signal, non bloquant — c'est une procédure de prévention |
| `retablissement_professionnel` | **Bloquant** |
| `radiation` | **Bloquant** — l'entreprise n'existe plus |
| `creation`, `immatriculation`, `modification`, `vente`, `dpc`, `divers` | Sans effet |

La distinction `collective` / `conciliation` mérite d'être tenue : la conciliation est une démarche **volontaire et confidentielle** de prévention. Traiter un dirigeant qui anticipe ses difficultés comme un dirigeant en liquidation punirait exactement le bon comportement.

### 3.3 RGE — ADEME

`https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines` · gratuite, sans clé, 10 appels/s/IP, mise à jour quotidienne.

Testée, et le résultat dépasse ce que la spec attendait. Sur le SIRET d'essai, chaque ligne porte :

```
siret, nom_entreprise
code_qualification    5211D101
nom_qualification     Remplacement de chaudière gaz/fuel en logement individuel
domaine               Chaudière condensation ou micro-cogénération gaz ou fioul
meta_domaine          Travaux d'efficacité énergétique
organisme             qualibat
nom_certificat        QUALIBAT-RGE
url_qualification     …/Certificat-154126-…-RGEAnnexe.pdf
lien_date_debut       2024-01-24
lien_date_fin         2028-03-07
```

Trois conséquences :

**Le RGE n'est pas un booléen, c'est une liste datée par qualification.** Une entreprise peut être RGE pour le remplacement de chaudière et pas pour l'isolation. Afficher « RGE » sans dire pour quoi reproduirait exactement le piège de l'assurance que le produit prétend corriger.

**Qualibat n'est pas un chantier séparé.** Le jeu ADEME porte l'organisme certificateur et un lien vers le certificat. Une entreprise Qualibat-RGE est identifiée comme telle sans qu'aucune intégration Qualibat soit nécessaire. Le risque n° 8 de la spec listait Qualibat comme une source à part : il tombe pour la part qui porte le RGE.

**`lien_date_fin` donne l'expiration gratuitement.** C'est la même mécanique de re-contrôle que pour l'assurance, sur une donnée ouverte et fiable.

### 3.4 URSSAF — la voie qui reste, hors chemin critique

L'attestation de vigilance passe normalement par API Entreprise, donc elle nous est fermée. Une autre porte existe : l'**API Attestations Vérification Code Sécurité** de l'URSSAF (`portailapi.urssaf.fr`), en REST avec OAuth2 client credentials, jusqu'à 100 vérifications par appel. Le principe est différent et il nous convient : **c'est l'artisan qui fournit son attestation**, et le code de sécurité à 15 caractères qu'elle porte sert à en vérifier l'authenticité auprès de l'URSSAF.

Le portail de souscription n'a pas répondu lors de ce cadrage — **les conditions d'éligibilité et un éventuel coût restent à confirmer directement auprès de l'URSSAF**. Ne pas les avoir ne bloque rien :

> **L'attestation de vigilance sort du périmètre de M3.** La spec la mentionne comme « également collectée », pas comme un différenciateur. Le différenciateur est la couverture assurantielle. Ajouter une dépendance dont les conditions d'accès sont inconnues à un jalon qui en compte déjà quatre serait un mauvais calcul.

---

## 4. Le référentiel d'activités : France Assureurs, pas Qualibat

La spec laissait l'hypothèse ouverte, en suggérant Qualibat. **C'est la mauvaise base, et la distinction n'est pas cosmétique.**

| | Qualibat | France Assureurs |
|---|---|---|
| Nomme | Une **compétence** reconnue | Une **activité** exercée |
| Attribué par | Un organisme, sur dossier | Personne — c'est une liste |
| Sert à | Prouver un savoir-faire | **Rédiger les attestations d'assurance** |
| Volume | Plusieurs centaines de qualifications | **50 activités, 5 familles** (révision 2019) |

La nomenclature France Assureurs est le **référentiel commun à tous les assureurs construction**. C'est littéralement le vocabulaire dans lequel sont rédigées les « activités garanties » des attestations que M3 doit lire. Choisir Qualibat obligerait à traduire chaque libellé d'attestation vers une nomenclature étrangère — ajouter une opération de traduction au point le plus fragile de la chaîne.

Deux bénéfices supplémentaires, qui ne se voient qu'après coup :

**Cinquante entrées, c'est un « référentiel minimal » réel.** Le jalon demandait un référentiel minimal ; cinquante activités classées en cinq familles se saisissent comme une donnée, pas comme un projet.

**La frontière décennale / RC Pro se lit dans la nomenclature elle-même.** Ces cinquante activités *sont* celles soumises à la garantie décennale. Le champ `assurance_requise` de la spec devient une conséquence de l'appartenance à la liste, et non un jugement à porter activité par activité.

Restent, hors de cette liste : le paysagisme, le ramonage, le nettoyage, la dératisation, le diagnostic — RC Pro. Ils devront être ajoutés à côté, avec leur propre origine.

---

## 5. L'extraction des attestations — et pourquoi ce n'est pas le point dur

### 5.1 L'état de l'art

Un modèle multimodal lisant le document dans son ensemble atteint 97 à 99 % de fiabilité, les 1 à 3 % de faible confiance partant en revue humaine. C'est nettement supérieur à l'OCR classique, qui butait sur les scans de travers, les tampons et les mises en page inconnues — et une attestation d'assurance est exactement ce genre de document : format libre, un par assureur.

### 5.2 Le vrai point dur est ailleurs

> **Lire « Plomberie — installations sanitaires » sur un PDF est facile. Décider si cela couvre la pose d'un chauffe-eau thermodynamique est difficile — et c'est cette décision qui engage.**

L'extraction produit une chaîne de caractères. Ce que le produit doit établir, c'est une **correspondance** entre ce libellé et une activité du référentiel, et cette correspondance a des conséquences : elle décide de ce qui est affiché publiquement, donc de ce sur quoi un demandeur va s'appuyer. Une extraction juste suivie d'une correspondance fausse produit exactement le dommage que le produit prétend éviter.

La revue humaine doit donc porter **sur la correspondance**, pas sur la relecture de caractères.

### 5.3 Ce qui en découle pour l'ordre des travaux

La spec prévoit une « revue humaine systématique au démarrage ». Prenons-la au sérieux :

> **Si un humain valide chaque attestation au démarrage, l'extraction automatique n'est pas un mécanisme de justesse — c'est un accélérateur de saisie.**

Construire d'abord le pipeline LLM reviendrait donc à construire la partie facultative en premier. L'ordre défendable est l'inverse :

1. **Le dépôt et le circuit de revue humaine** — c'est ce qui doit exister, être traçable et tenir juridiquement.
2. **Le rattachement aux activités du référentiel**, avec sa piste d'audit — qui a validé quoi, quand.
3. **L'extraction automatique en pré-remplissage**, avec un seuil de confiance, une fois qu'on a vu passer de vraies attestations.

Le troisième point gagne d'ailleurs à attendre : on ne connaît pas encore la variété réelle des documents. Écrire l'invite d'extraction avant d'avoir vu vingt attestations, c'est l'écrire contre une variété imaginée.

**Le coût récurrent, question posée par la décision technique n° 3, se règle de lui-même dans cet ordre :** quelques centimes par document, sur un volume qui se compte en dizaines par mois au démarrage. Ce n'était pas le vrai risque. Le vrai risque est le délai de vérification perçu par l'artisan, qui dépend de la revue humaine — donc du circuit, pas du modèle.

---

## 6. Ce que M3 doit intégrer de l'AIPD

Quatre obligations, non négociables, issues de l'[AIPD du passeport](../rgpd/2026-08-08-aipd-passeport.md) :

| Obligation | Origine |
|---|---|
| **Préavis** à J-60, J-30 et J-7 avant expiration d'une attestation | Article 22.3 |
| **Explication** : quelle activité est retirée, et pourquoi. Jamais de suspension muette | Article 22.3 |
| **Voie de rétablissement** : dépôt d'une nouvelle attestation, rétablissement dès validation | Article 22.3 |
| **Recours humain** : contestation possible, réexamen par une personne | Article 22.3 |

Elles ne sont pas des ajouts de conformité : le retrait automatique d'une activité de la vitrine coupe l'artisan de l'accès aux demandeurs. Sans ces garanties, le traitement est illicite — et le produit, brutal.

---

## 7. Conclusion pour le plan

**Quatre sources ouvertes, gratuites, sans clé, testées en direct** — Sirene/recherche-entreprises, BODACC, ADEME RGE — couvrent le niveau 1 et une partie du niveau 3. Aucune ne demande d'habilitation, aucune ne demande de contrat.

**Une source fermée** — API Entreprise — dont la fermeture est structurante : ce que nous ne pouvons pas récupérer, l'artisan doit le fournir.

**Une source reportée** — URSSAF, hors périmètre de M3.

**Un référentiel identifié** — France Assureurs, 50 activités, 5 familles, à saisir comme une donnée.

**Un ordre de travaux inversé** — la revue humaine d'abord, l'extraction automatique ensuite.

Aucun point bloquant ne subsiste. **Le plan de M3 peut être écrit.**

---

## 8. Sources

- [Conditions générales d'utilisation — API Entreprise](https://entreprise.api.gouv.fr/cgu)
- [Accès spécifique éditeurs de logiciels — API Entreprise](https://entreprise.api.gouv.fr/fiches/editeur)
- [API BODACC — DILA](https://www.data.gouv.fr/dataservices/api-bulletin-officiel-des-annonces-civiles-et-commerciales-bodacc)
- [Liste des entreprises RGE — ADEME](https://data.ademe.fr/datasets/liste-des-entreprises-rge-2)
- [API Attestations Vérification Code Sécurité — URSSAF](https://portailapi.urssaf.fr/fr/catalogue-api/prd/avcs/conditions-generales-utilisation)
- [Nomenclature des activités du bâtiment — assurance décennale](https://www.index-habitation.fr/decennale/nomenclature-des-activites-du-btp)
- [L'attestation d'assurance décennale — SMABTP](https://www.smabtp.fr/sma/assurance/infos-assurance/l-attestation-d-assurance-decennale)
- [Accès aux API — Data INPI](https://data.inpi.fr/content/editorial/Acces_API_Entreprises)
