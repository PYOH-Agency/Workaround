# AIPD — Le passeport public de l'artisan

> Analyse d'impact relative à la protection des données, article 35 du RGPD.
> Date : 2026-08-08 · Statut : **menée, décisions prises, mesures à construire**
> Responsable de traitement : Workaround · Traitement concerné : publication du passeport
>
> Elle devait être menée **avant la première métrique publiée** — le jalon des métriques, aujourd'hui M5. Elle l'est.
> L'échéance est **sémantique, pas numérique** : elle tient quel que soit le rang du jalon dans la séquence.
> Elle ouvre `docs/superpowers/rgpd/`, où vivront le registre des traitements et le contrat de sous-traitance.

**Références :** [spec P1 §8–9](../specs/2026-08-07-socle-artisan-design.md) · [cadrage RGPD](../research/2026-08-08-cadrage-rgpd.md)

---

## 0. Ce que cette analyse change dans le produit

Cinq décisions en sortent. Elles ne sont pas des ajouts de conformité posés à côté du produit : elles en modifient la promesse.

| # | Décision | Où elle se construit |
|---|---|---|
| 1 | **Base légale : intérêt légitime.** La nécessité contractuelle est écartée délibérément — elle aurait supprimé le droit d'opposition | CGU, politique de confidentialité |
| 2 | **Pas de vitrine sans passeport.** Un artisan qui s'oppose sort de l'annuaire et garde l'outil. Aucune fiche publique sans métriques | M5 |
| 3 | **La rectification porte sur l'événement, jamais sur la métrique.** Plus un droit de déclaration complémentaire | M5 |
| 4 | **Toute suspension automatique de visibilité ouvre un recours humain**, avec préavis | M3 |
| 5 | **Le régime le plus strict s'applique à toutes les entreprises**, y compris les sociétés dont le passeport n'est pas une donnée personnelle | Partout |

Et un manque assumé, nommé au §5.3 : **l'avis des artisans concernés n'a pas été recueilli**, faute d'artisans. Il doit l'être avant la mise en ligne du premier passeport.

---

## 1. L'AIPD est-elle obligatoire ?

Elle l'est dès que deux des neuf critères des lignes directrices du G29 sont remplis. Le cadrage initial en annonçait six ; l'examen rigoureux en donne **cinq certains et deux partiels**. La correction va dans le bon sens : un décompte gonflé se retourne contre celui qui l'invoque.

| Critère G29 | Rempli ? | Pourquoi |
|---|---|---|
| Évaluation ou notation | **Oui** | C'est la définition même du passeport |
| Décision automatisée à effet significatif | **Oui** | Une attestation périmée retire l'activité de la vitrine, donc l'accès aux demandeurs |
| Croisement de données | **Oui** | Déclaratif, comportement mesuré et sources publiques (Sirene, BODACC, RNE, ADEME) |
| Usage innovant | **Oui** | Un label mesuré sur transaction authentifiée n'existe pas dans le secteur |
| **Blocage d'un droit, d'un service ou d'un contrat** | **Oui** | Sous le seuil d'observations ou sans assurance valide, l'entreprise n'est pas visible |
| Surveillance systématique | *Partiel* | Il y a bien mesure continue du comportement professionnel — mais par un outil que l'artisan a choisi d'utiliser, non par observation subie |
| Données hautement personnelles | *Partiel* | Ni donnée sensible au sens de l'article 9, ni donnée de santé ou d'infraction. Mais une donnée de réputation qui commande l'accès au travail pèse lourd sur la vie quotidienne |
| Grande échelle | **Non aujourd'hui** | Une ville au lancement. Le traitement est conçu pour un secteur entier : le critère basculera |
| Personnes vulnérables | **Non** | Les artisans ne sont pas dans un rapport de subordination ni de dépendance vis-à-vis de nous |

**Cinq critères certains : l'AIPD est obligatoire, sans discussion.**

### 1.1 Pourquoi ce traitement porte sur des données personnelles

**La majorité des entreprises du bâtiment sont des entreprises individuelles.** Pour elles, l'entreprise *est* une personne physique. Publier « 94 % de devis honorés dans le délai annoncé » à propos d'un entrepreneur individuel identifié, c'est publier une donnée personnelle à portée réputationnelle.

Pour une SAS ou une SARL, le passeport porte sur une personne morale et sort du champ du RGPD. Nous obtenons donc, pour une même fonctionnalité, deux régimes juridiques.

> **Décision 5.** On applique le régime le plus strict à toutes les entreprises.

Trois raisons, dans l'ordre de force :
1. Distinguer produirait deux produits, deux parcours, deux jeux de droits — pour une différence que ni l'artisan ni le demandeur ne comprendraient.
2. Le gérant d'une SARL unipersonnelle dont le nom commercial est son patronyme est identifiable de fait. La frontière est poreuse en pratique.
3. Un droit de recours contre une mesure fausse est une bonne idée indépendamment du RGPD. Le réserver aux entrepreneurs individuels serait absurde.

---

## 2. Description du traitement

### 2.1 Finalité

**Permettre à un demandeur de choisir un artisan sur des faits mesurés plutôt que sur des avis déclaratifs.**

Finalité unique et étroite. Le passeport ne sert ni à la prospection, ni à la publicité ciblée, ni à la revente de données, ni à l'établissement d'un score de solvabilité.

### 2.2 Personnes concernées

| Catégorie | Nombre estimé au lancement | Rôle |
|---|---|---|
| Artisans entrepreneurs individuels | Quelques dizaines à Bordeaux | Personnes concernées principales |
| Dirigeants de sociétés artisanales | Idem | Concernés par ricochet — régime le plus strict appliqué |
| Clients signataires | Quelques centaines | Leurs signatures **authentifient** les mesures publiées sur autrui |

La troisième ligne mérite qu'on s'y arrête : le client n'est pas seulement une personne concernée par son propre devis, il est le **témoin** dont la signature donne sa valeur à une métrique publique portant sur un tiers. Il doit le savoir — voir §5.1.

### 2.3 Données traitées

| Catégorie | Exemples | Origine |
|---|---|---|
| Identification de l'entreprise | SIRET, dénomination, forme juridique, ancienneté, adresse | Sirene (INSEE), déclaratif |
| Situation administrative | Absence de procédure collective, immatriculation, qualité d'artisan | BODACC, RNE (INPI) |
| Couverture assurantielle | Assureur, référence de contrat, activités garanties, zone, échéance | Attestation transmise par l'artisan |
| Habilitations | RGE, fluides frigorigènes, PGN/PGP, SS3/SS4 | ADEME, déclaratif + pièces |
| **Comportement professionnel mesuré** | Délai de remise du devis, écart devis → facture, respect du délai annoncé, présence aux rendez-vous, volume de chantiers terminés | **Journal d'événements interne** |

La cinquième ligne porte tout le risque. Les quatre premières sont des faits administratifs largement publics ; la dernière est une évaluation que nous produisons.

### 2.4 Comment la mesure est produite

```
Devis signé électroniquement par le client
        ↓
Événement inscrit au journal (append-only, immuable par déclencheur)
        ↓
Agrégation sur 12 mois glissants, par entreprise
        ↓
Seuil d'observations atteint ? ──non──→ « pas encore assez de données »
        ↓ oui
Métrique publiée sur le passeport
```

Deux propriétés structurelles, décidées pour le produit, qui se trouvent être des garanties de protection des données :

**La signature client authentifie la mesure.** Un chantier ne compte que si le devis a été signé électroniquement par le demandeur. Sans cela, l'artisan saisirait lui-même son devis et sa propre facture : les métriques seraient auto-déclarées et falsifiables. La conséquence côté RGPD est directe — **aucune métrique ne repose sur notre seule parole**, chacune a un témoin identifié.

**Le seuil d'affichage est un plancher d'anonymat.** Cinq observations pour les métriques de délai, dix chantiers pour les métriques d'écart. La règle existe pour une raison produit — une entreprise à trois chantiers parfaits paraîtrait meilleure qu'une entreprise à deux cents chantiers à 96 %. Elle empêche accessoirement qu'une métrique publique se ramène à une transaction unique et donc à un client identifiable.

### 2.5 Destinataires

| Destinataire | Ce qu'il voit |
|---|---|
| **Le public**, sans compte | Le passeport dans son intégralité |
| L'artisan | Son passeport, plus le détail des événements qui le composent |
| Nos sous-traitants techniques | Voir §4.4 |

**Le passeport est public par construction.** Il n'y a pas de contrôle d'accès à concevoir : il est destiné à être vu, cité, exporté en widget et en QR code. La question de la confidentialité ne se pose donc pas dans les termes habituels — voir §6.1.

### 2.6 Durées

| Donnée | Durée de **publication** | Durée de **conservation** |
|---|---|---|
| Métriques du passeport | Fenêtre glissante de 12 mois | Recalculées, jamais stockées comme telles |
| Événements sources | — | 10 ans (obligation comptable) |
| Vérifications d'assurance | Jusqu'à échéance | 10 ans, alignés sur la garantie décennale |
| Passeport après départ ou opposition | **Cesse immédiatement** | — |

> **La durée de publication et la durée de conservation sont deux choses distinctes.** Un artisan qui part cesse d'être publié le jour même ; ses factures restent dix ans en base parce que le Code de commerce l'exige — mais sous une autre finalité, et elles ne nourrissent plus aucun passeport. Confondre les deux conduirait soit à publier un ancien utilisateur, soit à détruire des pièces comptables.

---

## 3. Nécessité et proportionnalité

### 3.1 Base légale : intérêt légitime, et pourquoi pas autre chose

> **Décision 1.** Le traitement repose sur l'**intérêt légitime**, article 6.1.f.

Deux autres bases étaient disponibles. Elles sont écartées, et la raison compte plus que le choix.

**Le consentement (6.1.a) est écarté** parce qu'il viderait le label de son sens. Un consentement se retire à tout moment ; un artisan retirerait le sien le jour où ses chiffres se dégradent. Le passeport ne mesurerait plus que ceux qui vont bien, ce qui n'est pas une mesure mais une publicité. Un dispositif dont on peut sortir au moment défavorable ne prouve rien.

**La nécessité contractuelle (6.1.b) est écartée délibérément, et c'est la décision la moins confortable de ce document.** Elle serait plaidable : l'artisan s'inscrit à un service dont la publication du passeport est l'objet même. Mais l'article 21 ne s'applique qu'aux traitements fondés sur 6.1.e et 6.1.f — **choisir 6.1.b supprimerait purement et simplement le droit d'opposition**. Le gain juridique serait réel et le procédé indéfendable : on ne choisit pas une base légale pour se débarrasser d'un droit. La CNIL le verrait, et nous aurions construit sur un produit dont l'argument est la confiance un montage destiné à retirer un recours.

Reste l'intérêt légitime, qui est de toute façon le bon fondement sur le fond : l'intérêt principal servi n'est pas le nôtre ni celui de l'artisan, **c'est celui du demandeur** — un tiers. C'est précisément la configuration que 6.1.f est fait pour couvrir.

### 3.2 La mise en balance

Elle est exigée par écrit. La voici.

**Notre intérêt et celui des demandeurs.** L'asymétrie d'information entre un particulier et un artisan est massive et documentée : le demandeur ne peut vérifier ni la couverture assurantielle, ni la tenue des délais, ni la fidélité de la facture au devis. Il choisit sur des avis déclaratifs largement optimisés. L'intérêt à disposer de faits mesurés est réel, sérieux et légitime — c'est même un intérêt de protection du consommateur.

**L'impact sur l'artisan.** Il est significatif et il faut le dire sans l'atténuer : une métrique publique défavorable peut coûter des chantiers. Ce n'est pas un traitement anodin.

**Ce qui fait pencher la balance.**

| Ce qui pèse en faveur du traitement | Ce qui pèse contre |
|---|---|
| L'artisan **choisit** de s'inscrire ; il n'est pas collecté à son insu | L'impact réputationnel est réel |
| Les données sont **professionnelles**, produites dans l'exercice d'une activité commerciale — pas de la vie privée | Un entrepreneur individuel ne peut séparer sa personne de son entreprise |
| Chaque mesure est **authentifiée par un client témoin** | Un client peut se tromper ou être de mauvaise foi |
| Les seuils empêchent de publier un chiffre non significatif | Le seuil lui-même exclut les nouveaux entrants de la vitrine |
| Le passeport est **dérivé**, donc non manipulable par nous | Il est aussi non corrigeable directement par l'artisan |
| **L'opposition est honorée sans condition** (§3.4) | — |
| Aucune finalité secondaire : ni revente, ni ciblage, ni scoring de solvabilité | — |

**Conclusion de la mise en balance : l'intérêt légitime prévaut, à trois conditions strictes** — l'opposition est honorée sans discussion, la contestation d'une mesure est possible et effective, et aucune décision automatique défavorable ne s'applique sans recours humain. Ces trois conditions ne sont pas des vœux : elles sont les décisions 2, 3 et 4, et sans elles la balance ne penche plus.

### 3.3 Minimisation

Le passeport ne publie **aucune donnée de contact personnelle** : ni téléphone personnel, ni adresse du domicile, ni adresse électronique privée. Les coordonnées publiées sont celles de l'établissement, telles qu'elles figurent déjà au répertoire Sirene.

Il ne publie **aucun montant**. Ni chiffre d'affaires, ni prix moyen, ni valeur des chantiers. L'écart devis → facture est un **pourcentage**, jamais une somme. Cette règle n'était initialement qu'un choix produit ; elle devient ici une mesure de minimisation, et à ce titre elle n'est plus révocable sans repasser par cette analyse.

Il ne publie **aucun nom de client**, aucune adresse de chantier, aucune information permettant de remonter à une transaction précise.

### 3.4 Le droit d'opposition — la question la plus difficile

L'article 21 permet au responsable de traitement de refuser une opposition s'il démontre des « motifs légitimes et impérieux » prévalant sur les droits de la personne. La tentation était d'invoquer l'intérêt des demandeurs pour maintenir un artisan dans l'annuaire contre son gré.

**Elle est écartée, et la position de la CNIL est la raison principale.** Sur les annuaires de notation de professionnels, la CNIL écrit qu'une demande de retrait global « doit, en principe, être facilement acceptée ». La formulation ne laisse pas beaucoup de marge. Un refus nous placerait en position de devoir démontrer l'impérieux, sur un terrain où l'autorité a déjà indiqué son inclination.

> **Décision 2.** Un artisan qui s'oppose est retiré de la vitrine publique. Intégralement, sans délai, sans condition. **Il n'existe pas de fiche publique sans passeport.**

Le cadrage initial hésitait entre le retrait et le maintien d'une fiche sans métriques. **Le maintien sans métriques est la mauvaise réponse**, pour une raison qui n'est pas juridique : elle créerait une catégorie d'artisans visibles dont on ne mesure rien. Tout artisan aux chiffres médiocres s'y réfugierait, la catégorie deviendrait le signal qu'elle prétendait éviter, et le label perdrait son sens en deux mouvements. Un dispositif dont on peut désactiver la partie gênante ne mesure rien.

Ce que cette décision suppose, et qui est déjà vrai dans la conception :

**L'outil et la vitrine sont séparés.** La spécification pose déjà que « l'outil est ouvert à tous » tandis que « la vitrine publique exige une assurance valide ». Un artisan qui s'oppose conserve donc son compte, ses devis, ses factures et son historique. **Il perd sa visibilité, pas son outil de travail.** Sans cette séparation, le droit d'opposition serait illusoire — s'opposer coûterait la facturation de l'entreprise, ce qui n'est pas un choix libre.

C'est aussi la réponse à l'objection commerciale évidente : peu d'artisans s'opposeront, puisque le passeport est leur argument de vente. Ceux qui le feront disparaissent de la vitrine, donc de la vue des demandeurs. Le mécanisme s'auto-régule.

### 3.5 Le droit de rectification — comment tenir deux exigences contraires

Le passeport est **dérivé et non éditable**. C'est ce qui le rend crédible : un chiffre que son sujet peut modifier ne vaut rien. L'article 16 donne pourtant le droit d'obtenir la correction d'une donnée inexacte. Les deux semblent inconciliables.

Ils ne le sont pas, à condition de distinguer la donnée de son calcul.

> **Décision 3.** La rectification porte sur **l'événement sous-jacent**, jamais sur la métrique. Corriger l'événement recalcule la métrique.

Concrètement, trois mécanismes à construire en M5 :

**Contester un événement.** L'artisan peut signaler qu'un chantier est marqué en retard à tort, qu'une date de fin est erronée, qu'une facture rattachée au mauvais devis fausse l'écart. Le journal étant immuable, une correction s'inscrit comme un **événement rectificatif** qui neutralise le précédent — la piste d'audit reste entière, exactement comme un avoir corrige une facture sans la modifier. La cohérence avec le modèle comptable de M2 n'est pas un hasard : c'est la même règle.

**La déclaration complémentaire.** L'article 16 donne le droit de compléter des données incomplètes par une déclaration additionnelle. C'est le fondement exact du droit de réponse : l'artisan ne peut pas changer le chiffre, mais il peut attacher un commentaire contextuel à un chantier — *« retard imputable à l'indisponibilité du client »*. Le chiffre reste intact, le contexte est publié à côté.

**L'arbitrage.** Le client a co-signé le devis : il est le témoin naturel d'un désaccord sur les faits. La procédure exacte — arbitrage par le client, revue interne, ou neutralisation provisoire du chantier contesté pendant l'instruction — reste à trancher au moment de construire M5. Ce que l'AIPD exige, c'est **qu'une procédure existe, qu'elle soit accessible et qu'elle aboutisse dans un délai d'un mois**.

### 3.6 La décision automatisée

Une attestation d'assurance périmée retire immédiatement de la vitrine les activités qu'elle couvrait. Pour un entrepreneur individuel, c'est une décision automatisée qui l'affecte de manière significative : elle lui coupe l'accès aux demandeurs.

**Base au titre de l'article 22.2.a : la nécessité contractuelle.** La règle de visibilité est constitutive du service auquel l'artisan a souscrit — c'est même la phrase qui fait le produit : *« tout professionnel visible ici est assuré pour ce qu'il fait »*. Personne ne peut souscrire à cette promesse et exiger d'y échapper.

Mais l'article 22.3 impose alors des garanties, et elles ne sont pas facultatives.

> **Décision 4.** Toute suspension automatique s'accompagne d'un préavis, d'une voie de rétablissement et d'un recours humain.

À construire en M3 :

| Garantie | Mise en œuvre |
|---|---|
| Information préalable | Alerte à J-60, J-30 et J-7 de l'échéance de l'attestation |
| Explication | La notification indique **quelle activité** est retirée et **pourquoi** — jamais une suspension muette |
| Voie de rétablissement | Dépôt d'une nouvelle attestation, rétablissement dès validation |
| **Intervention humaine** | Contestation possible ; une personne réexamine le dossier |

La spécification prévoyait déjà que l'assurance manquante soit « signalée à l'artisan plutôt que de le rejeter silencieusement ». L'AIPD transforme cette intention en obligation, et y ajoute le recours humain qui manquait.

---

## 4. Conformité aux autres obligations

### 4.1 Information des personnes

La CNIL considère que sur ce type de service, « une information individuelle et complète doit, en principe, être fournie ».

| Personne | Support | État |
|---|---|---|
| Artisan | Politique de confidentialité + information à l'inscription | **À compléter** — la publication du passeport n'y figure pas |
| Artisan | Notification individuelle avant la première publication de son passeport | **À construire en M5** |
| Client signataire | `/confidentialite`, liée depuis les deux points de collecte | Existe, **à compléter** (§5.1) |

### 4.2 Exercice des droits

| Droit | Réponse |
|---|---|
| Accès | L'artisan voit le détail des événements composant son passeport |
| Rectification | §3.5 — sur l'événement, plus déclaration complémentaire |
| Effacement | Fermeture de compte : publication interrompue immédiatement. Les pièces comptables survivent 10 ans sous obligation légale |
| Opposition | §3.4 — retrait intégral de la vitrine, sans condition |
| Portabilité | Le passeport est déjà exportable — widget, bloc sur devis, QR code |
| Limitation | Suspension de la publication pendant l'instruction d'une contestation |
| Ne pas faire l'objet d'une décision automatisée | §3.6 |

Délai de réponse : **un mois**, prolongeable de deux en cas de complexité, refus motivé.

### 4.3 Un point que le cadrage avait manqué

Les métriques du passeport se calculent sur **12 mois glissants**, mais les événements sources sont conservés **10 ans** au titre de l'obligation comptable. Un événement de 2027 sera donc encore en base en 2036, largement hors de toute fenêtre de calcul.

Ce n'est pas une non-conformité — les deux finalités sont distinctes et la seconde est une obligation légale. Mais cela impose une règle explicite, faute de quoi elle sera enfreinte par accident au premier changement de fenêtre :

> **Le calcul du passeport ne lit jamais au-delà de la fenêtre glissante.** Une donnée conservée pour la comptabilité n'est pas disponible pour la mesure. La limite doit être portée par le code du calcul, pas par la discipline de celui qui l'écrit.

### 4.4 Sous-traitants et transferts

| Sous-traitant | Rôle | Localisation | Voit-il les données du passeport ? |
|---|---|---|---|
| Supabase | Base, authentification, stockage | Région UE au déploiement | Oui, en hébergement |
| Brevo | E-mails et SMS | Europe, ISO 27001 et SOC 2 | Non |
| FreeTSA | Horodatage | Allemagne | Non — reçoit une **empreinte**, jamais un document |
| **Vercel** | Hébergement applicatif | **Société américaine**, régions UE disponibles | Oui, en exécution |

**L'incohérence de la pile reste ouverte et n'est pas résolue par cette analyse.** Un fournisseur d'identité américain a été écarté au nom de la souveraineté des données, puis un hébergeur américain retenu. Vercel propose la résidence en UE, un accord de sous-traitance et des clauses contractuelles types, ce qui rend le montage défendable — mais le CLOUD Act reste l'argument qui avait fait écarter Clerk.

L'AIPD n'ajoute qu'une chose à ce constat, et elle est de poids : **le passeport est le seul traitement de la plateforme où la personne concernée n'est pas notre client mais son sujet.** C'est celui où la question de la juridiction se plaide le moins bien. **À trancher au premier déploiement**, pas après.

Aucun transfert hors UE n'est effectué à ce jour. Le maintien de cette affirmation dépend du choix ci-dessus.

### 4.5 Faut-il désigner un délégué à la protection des données ?

L'article 37.1.b l'impose lorsque les activités de base exigent un suivi régulier et systématique à grande échelle. **Le passeport est exactement cela** — c'est même la définition du produit.

Le critère de la grande échelle n'est pas atteint au lancement. Il le sera. La conclusion honnête :

> Pas obligatoire aujourd'hui. **Le deviendra mécaniquement avec le passage à l'échelle** — un secteur entier sur une métropole y suffira probablement. Désigner un délégué dès maintenant est recommandé, ne serait-ce que parce que cette AIPD devrait être revue par lui.

---

## 5. Les manques, nommés

### 5.1 Le client ne sait pas qu'il authentifie une mesure publique

La page `/confidentialite` explique au client ce que nous faisons de son nom, de son adresse électronique, de son téléphone et de son adresse IP. Elle ne lui dit pas que **sa signature fait de lui le témoin d'une mesure publiée sur son artisan**.

C'est la fonction la plus structurante de sa signature, et elle n'est pas mentionnée. **À corriger avant M5**, dans la page comme dans l'écran de signature.

### 5.2 Les métriques ne sont pas encore calculées

M5 n'est pas construit. Cette analyse porte donc sur un traitement **conçu et décidé**, pas encore en exécution. C'est le bon moment — l'article 35 veut l'analyse *avant* le traitement — mais cela implique une **revue à la mise en service**, pour vérifier que le construit correspond à l'analysé.

### 5.3 L'avis des personnes concernées n'a pas été recueilli

L'article 35.9 prévoit que le responsable de traitement demande l'avis des personnes concernées, ou justifie de ne pas le faire.

**Il n'a pas été recueilli, faute d'artisans inscrits.** La justification est réelle mais elle a une date de péremption : les premières entreprises étant rencontrées physiquement, rien n'empêche de leur poser la question.

> **À faire avant la première publication d'un passeport :** interroger les premiers artisans inscrits sur la publication de leurs métriques, sur la procédure de contestation et sur le retrait de la vitrine. Consigner leurs réponses ici.

C'est aussi, accessoirement, la meilleure étude produit disponible.

---

## 6. Risques

La méthode CNIL structure l'analyse autour de trois événements redoutés. Ils sont traités au §6.1, mais **aucun des trois n'est le risque principal de ce traitement** — celui-là est ajouté au §6.2.

### 6.1 Les trois événements redoutés

| Événement | Gravité | Vraisemblance | Analyse et mesures |
|---|---|---|---|
| **Accès illégitime** | Faible | Faible | Le passeport est **public par construction** : sa confidentialité n'est pas un objectif. Le risque réel est ailleurs — publier ce qui ne doit pas l'être : un artisan ayant exercé son opposition, une métrique sous le seuil, une activité non couverte. **Mesure : ces exclusions sont portées par la requête de publication elle-même, jamais par un filtre d'affichage.** Un filtre en surface s'oublie ; une condition dans la source de données ne s'oublie pas |
| **Modification non désirée** | **Élevée** | Faible | Une métrique falsifiée — par un tiers, ou par l'artisan lui-même. **Mesures déjà construites :** journal en ajout seul imposé par déclencheur, facture immuable par déclencheur, signature client authentifiant chaque chantier compté, métriques dérivées et jamais stockées comme telles. Un artisan ne peut fausser sa mesure sans falsifier une facture signée |
| **Disparition** | Moyenne | Faible | La perte du journal rendrait tout passeport irreconstituible. **Mesures :** journal immuable, sauvegardes de la base gérées par l'hébergeur. **Reste à faire : vérifier une restauration.** Une sauvegarde jamais restaurée n'est pas une sauvegarde |

### 6.2 Le risque principal, qui n'entre dans aucune des trois cases

> **Un système parfaitement sûr publiant un chiffre faux.**

Ni intrusion, ni altération, ni perte : un calcul correct sur une donnée mal qualifiée. Un chantier interrompu par le client compté comme un retard de l'artisan. Une facture complémentaire comptée comme un dépassement. Un rendez-vous annulé par le demandeur compté comme une absence.

**Gravité : élevée.** Un chiffre faux publié sur un entrepreneur individuel lui coûte des chantiers, et il le découvre en le lisant.

**Vraisemblance : élevée.** C'est le mode de défaillance normal de ce genre de système, pas une hypothèse pessimiste.

| Mesure | Où |
|---|---|
| Procédure de contestation accessible et effective | M5 — décision 3 |
| Déclaration complémentaire visible à côté de la métrique | M5 — décision 3 |
| Seuils d'observations : un incident isolé ne fait jamais basculer un chiffre | Déjà spécifié |
| Notification à l'artisan **avant** la première publication, avec délai de contestation | M5 |
| Définition documentée et publique de chaque métrique | M5 — un chiffre dont on ignore la règle de calcul est incontestable, donc arbitraire |

La dernière ligne est celle qu'on oublie. Une métrique dont la définition n'est pas publiée ne peut pas être contestée sérieusement, et un droit de rectification qu'on ne peut pas exercer faute de comprendre le calcul n'est pas un droit.

---

## 7. Conclusion

**Le traitement est licite sous les cinq décisions du §0.** L'intérêt légitime prévaut sur l'impact réputationnel, mais uniquement parce que l'opposition est honorée sans condition, que la mesure est contestable et que toute suspension automatique ouvre un recours humain. Retirer l'une de ces trois conditions renverse la mise en balance et rend le traitement illicite.

**Le risque dominant n'est pas la sécurité, c'est la justesse.** Les mesures de sécurité utiles sont déjà en place — journal immuable, facture immuable, signature client. L'effort à venir porte sur la contestabilité, qui n'est pas construite.

### Ce qui doit être construit, par échéance

| # | Chantier | Échéance |
|---|---|---|
| 1 | Information du client sur son rôle de témoin (`/confidentialite` + écran de signature) | ~~Avant M5~~ — **fait le 2026-08-09 (M6·A)**, avec retard : le passeport a été calculé en M5 avant que le client ne soit informé |
| 2 | Avis des premiers artisans inscrits, consigné ici | **Avant la première publication** |
| 3 | Préavis, explication et recours humain sur toute suspension de visibilité | **M3** |
| 4 | Contestation d'événement, événement rectificatif, déclaration complémentaire | **M5** |
| 5 | Notification individuelle avant la première publication d'un passeport | **M5** |
| 6 | Exclusions portées par la requête de publication, pas par un filtre d'affichage | **M5** |
| 7 | Fenêtre glissante imposée par le code du calcul | **M5** |
| 8 | Définition publique de chaque métrique | **M5** |
| 9 | Trancher l'hébergeur | **Premier déploiement** |
| 10 | Vérifier une restauration de sauvegarde | Premier déploiement |
| 11 | Purge automatique selon le tableau des durées | Non daté — voir le cadrage |
| 12 | Désignation d'un délégué à la protection des données | Avant le passage à l'échelle |

### Revue

Cette analyse est à revoir : **à la mise en service de M5**, à tout élargissement des métriques publiées, au passage à l'échelle nationale, et lors du choix définitif de l'hébergeur.

---

## 8. Sources

- [Ce qu'il faut savoir sur l'analyse d'impact (AIPD) — CNIL](https://www.cnil.fr/fr/ce-quil-faut-savoir-sur-lanalyse-dimpact-relative-la-protection-des-donnees-aipd)
- [Liste des traitements pour lesquels une AIPD est requise — CNIL](https://www.cnil.fr/fr/analyse-dimpact-relative-la-protection-des-donnees-publication-dune-liste-des-traitements-pour)
- [Avis et notations en ligne : quels sont les droits des professionnels ? — CNIL](https://www.cnil.fr/fr/avis-et-notations-en-ligne-quels-sont-les-droits-des-professionnels)
- [Article 21 RGPD — droit d'opposition et motifs légitimes et impérieux](https://www.gdpr-expert.eu/article.html?id=21)
- [AIPD : les 9 critères du G29 et la méthode en 5 étapes](https://www.leto.legal/guides/comment-realiser-son-aipd-en-5-etapes)
