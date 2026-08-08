# Cadrage RGPD

> Troisième point bloquant identifié à la clôture de M1.
> Date : 2026-08-08 · Statut : cadré, avec des travaux datés

---

## 1. Le partage des rôles, et pourquoi il n'est pas anodin

| Traitement | Responsable | Nous sommes |
|---|---|---|
| Compte de l'entreprise, membres | **Nous** | Responsable de traitement |
| Clients de l'artisan, devis, signatures | **L'artisan** | Sous-traitant |
| **Le passeport public** | **Nous** | Responsable de traitement |

Les deux premières lignes sont le partage classique d'un logiciel de gestion : l'artisan décide qui il facture, nous fournissons l'outil. Cela nous impose un **contrat de sous-traitance** (article 28) dans nos conditions générales, et une obligation d'agir sur ses seules instructions.

La troisième ligne est celle qui compte.

## 2. Le passeport traite des données personnelles, et l'AIPD est due

**La majorité des entreprises du bâtiment sont des entreprises individuelles.** Pour elles, l'entreprise *est* une personne physique. Publier « 94 % de devis honorés dans le délai annoncé » à propos de Fabrice Cassou, entrepreneur individuel, c'est publier une donnée personnelle à portée réputationnelle sur un individu identifié.

Une analyse d'impact est obligatoire dès que le traitement remplit **au moins deux des neuf critères** des lignes directrices du G29. Le passeport en remplit largement assez.

> ~~**L'AIPD doit être menée avant M4.**~~ **Elle est menée** : [AIPD du passeport](../rgpd/2026-08-08-aipd-passeport.md), 2026-08-08.

Le décompte annoncé ici — six critères — était **trop généreux**. L'examen rigoureux mené dans l'AIPD en retient **cinq certains** (évaluation, décision automatisée, croisement, usage innovant, blocage d'un service) et **deux partiels** (surveillance systématique, donnée hautement personnelle). La grande échelle n'est pas atteinte au lancement, et les artisans ne sont pas des personnes vulnérables au sens du G29. Cinq suffisent très largement ; un décompte gonflé se retourne contre celui qui l'invoque.

Les trois points que l'AIPD devait trancher le sont :

- **La base légale : intérêt légitime**, avec mise en balance écrite. La nécessité contractuelle, pourtant plaidable, a été écartée **délibérément** : elle aurait supprimé le droit d'opposition, l'article 21 ne s'appliquant qu'aux traitements fondés sur 6.1.e et 6.1.f.
- **Le droit d'opposition : retrait intégral de la vitrine, sans condition.** L'hésitation formulée ici est tranchée, et dans l'autre sens que suggéré : la CNIL écrit qu'une demande de retrait global d'un annuaire de notation « doit, en principe, être facilement acceptée ». L'artisan garde son outil — devis, factures, historique — et perd sa visibilité. **Il n'existe pas de fiche publique sans passeport.**
- **Le droit à la rectification : il porte sur l'événement, jamais sur la métrique.** Un événement rectificatif neutralise le précédent sans modifier le journal — exactement comme un avoir corrige une facture. Plus un droit de déclaration complémentaire, fondé sur l'article 16, qui permet d'attacher un contexte à un chantier sans toucher au chiffre.

## 3. Ce que le cadrage a révélé dans le code — corrigé

**Un e-mail en clair dans une table volontairement ineffaçable.** Le journal d'événements stockait l'adresse du signataire dans `actor_id`. Or ce journal refuse `UPDATE` et `DELETE` par déclencheur — c'était précisément le point. Résultat : le droit à l'effacement y devenait **structurellement impossible à honorer**. Remplacé par un identifiant.

C'est la leçon générale à retenir : **un journal immuable ne doit jamais contenir de donnée personnelle en clair**, seulement des références. Toute donnée écrite là devient inexpugnable par construction.

**Un numéro de téléphone conservé sans fin.** Les codes SMS restaient en base longtemps après avoir servi, avec le numéro du destinataire. Ils sont désormais supprimés dès la signature aboutie, et les codes périmés d'un devis sont purgés avant d'en émettre un nouveau. La preuve de la validation, elle, survit dans `signature` — c'est elle qui a une finalité.

**Aucune information des personnes.** Le client donnait son nom, son e-mail, son téléphone et son adresse IP sans qu'on lui dise quoi que ce soit. Une page `/confidentialite` a été écrite et est liée depuis les deux points de collecte.

## 4. Durées de conservation retenues

| Donnée | Durée | Fondement |
|---|---|---|
| Devis non signé | 3 ans après le dernier échange | Prospection, doctrine CNIL |
| Devis signé, facture, pièces comptables | 10 ans | Obligation comptable |
| Preuve de signature (code validé, IP, empreinte) | 10 ans | Alignée sur la garantie décennale |
| PDF signé archivé | 10 ans | Idem |
| Code SMS | Supprimé dès usage ou expiration | Plus de finalité |
| Compte inactif | 3 ans après le dernier accès | Doctrine CNIL |

**Rien de tout cela n'est encore automatisé.** Une purge périodique reste à écrire — c'est le principal reste à faire de ce cadrage.

## 5. Sous-traitants, et une incohérence de notre pile

| Sous-traitant | Rôle | Localisation |
|---|---|---|
| Supabase | Base, authentification, stockage | Région UE au déploiement |
| Brevo | E-mails et SMS | Europe, ISO 27001 et SOC 2 |
| FreeTSA | Horodatage | Allemagne — ne reçoit **qu'une empreinte**, jamais le document |
| **Vercel** | Hébergement applicatif | **Société américaine**, régions UE disponibles |

**Il faut assumer l'incohérence : j'ai écarté un fournisseur d'identité américain au nom de la souveraineté des données, puis retenu un hébergeur américain.** Vercel propose la résidence en UE, un accord de sous-traitance et des clauses contractuelles types, ce qui rend le montage défendable — mais le CLOUD Act reste l'argument qui m'avait fait écarter Clerk.

Deux façons de trancher, et c'est une décision produit : soit on assume Vercel et on cesse d'invoquer la souveraineté comme argument, soit on regarde un hébergeur européen (Scaleway, Clever Cloud, OVHcloud) avant que la migration ne devienne coûteuse. Le bon moment pour choisir, c'est maintenant — au premier déploiement.

## 6. Reste à faire, par ordre d'échéance

1. **Purge automatique** selon le tableau du §4. Rien n'expire aujourd'hui.
2. **Export des données** d'un artisan — droit à la portabilité.
3. **Contrat de sous-traitance** (article 28) dans les conditions générales : nous sommes sous-traitant de l'artisan sur les données de ses clients.
4. **Registre des traitements** — obligatoire, ce document en est l'ébauche.
5. **Trancher l'hébergeur** avant le premier déploiement.
6. ~~**AIPD du passeport — avant M4.**~~ **Menée le 2026-08-08.** Elle ajoute douze chantiers datés, listés dans sa conclusion — dont l'information du client sur son rôle de témoin, à corriger avant M4.
7. **Photos de chantier** : non implémentées en M1, mais une photo d'intérieur est une donnée personnelle du demandeur. À cadrer avant M5.

## 7. Sources

- [Ce qu'il faut savoir sur l'analyse d'impact (AIPD) — CNIL](https://www.cnil.fr/fr/ce-quil-faut-savoir-sur-lanalyse-dimpact-relative-la-protection-des-donnees-aipd)
- [Liste des traitements pour lesquels une AIPD est requise — CNIL](https://www.cnil.fr/fr/analyse-dimpact-relative-la-protection-des-donnees-publication-dune-liste-des-traitements-pour)
- [Référentiel CNIL sur les durées de conservation](https://www.cnil.fr/sites/default/files/2026-04/referentiel_durees_de_conservation_gestion_des_ressources_humaines.pdf)
- [Durées de conservation RGPD : tableaux par secteur](https://www.donneespersonnelles.fr/tableau-duree-conservation-donnees)
