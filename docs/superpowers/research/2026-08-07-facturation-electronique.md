# Facturation électronique — décision

> Risque n°5 du spec [Socle Artisan P1](../specs/2026-08-07-socle-artisan-design.md). Bloque M2.
> Date : 2026-08-07 · Statut : conclu

**Décision : nous serons une Solution Compatible raccordée à une Plateforme Agréée. Nous ne demandons pas l'agrément. Une correction mineure s'impose dès M1 — voir §5.**

---

## 1. Le calendrier

| Échéance | Qui | Quoi |
|---|---|---|
| **1er septembre 2026** | **Toutes** les entreprises assujetties à la TVA | **Réception** de factures électroniques |
| 1er septembre 2026 | Grandes entreprises et ETI | Émission + e-reporting |
| **1er septembre 2027** | **PME, TPE, micro-entreprises** | Émission + e-reporting |

Aucun seuil de chiffre d'affaires, aucun critère de taille : une micro-entreprise assujettie à la TVA est concernée au même titre qu'un grand groupe.

**La réception devient obligatoire dans trois semaines.** L'émission pour nos artisans — tous des TPE — tombe le **1er septembre 2027**, soit environ treize mois. M2 arrive exactement dans cette fenêtre.

**Sanctions :** 15 € par facture non émise au format électronique, et 500 € par manquement au e-reporting, dans les deux cas plafonnés à 15 000 € par an.

## 2. Nous ne demandons pas l'agrément

Trois statuts coexistent :

| Statut | Peut faire | Ne peut pas faire |
|---|---|---|
| **PPF** (portail public) | Annuaire, concentrateur | — |
| **PA** — Plateforme Agréée (ex-PDP) | Transmettre à l'administration | — |
| **SC** — Solution Compatible (ex-OD) | Créer, émettre, recevoir des factures | **Transmettre à l'administration** |

L'administration est explicite : sans immatriculation, un opérateur « n'aura pas le statut de plateforme agréée et ne sera donc pas autorisé à transmettre les factures électroniques ni les données à l'administration ».

**Demander l'agrément est hors de question à ce stade.** L'immatriculation suppose un cahier des charges technique strict, l'interopérabilité PEPPOL, un audit de sécurité, une phase pilote avec traitement de factures réelles sous supervision de la DGFiP, et une procédure de six à douze mois — le tout renouvelable tous les trois ans. Pour un produit qui n'a pas encore un utilisateur, c'est absurde.

Et c'est inutile : **plus de 130 plateformes agréées sont déjà immatriculées**, à des tarifs de l'ordre de 5 à 30 € par mois pour une TPE. Le marché est fait.

→ **Nous sommes une Solution Compatible. Nous choisissons une PA partenaire et nous nous y raccordons par API.**

## 3. Le soulagement architectural

Les PA acceptent des **données structurées en JSON** et produisent elles-mêmes le format réglementaire du socle — Factur-X (PDF/A-3 avec XML embarqué), UBL ou CII.

**Nous n'avons donc pas à maîtriser Factur-X ni PDF/A-3.** Notre travail se limite à produire des données propres et complètes. C'est une contrainte de **modèle de données**, pas de rendu — et c'est une très bonne nouvelle pour le choix de `@react-pdf/renderer` fait en M1.

> À vérifier au moment de choisir la PA : certaines API acceptent « votre PDF existant + les données JSON » et embarquent le XML dans votre document. C'est la variante à privilégier — elle préserve la mise en page de l'artisan au lieu de lui imposer un gabarit générique.

## 4. Ce que personne ne dit et qui nous concerne le plus

**Nos artisans facturent majoritairement des particuliers. Leur obligation dominante n'est donc pas le e-invoicing, c'est le e-reporting.**

| Client | Obligation |
|---|---|
| Entreprise assujettie (syndic, agence, autre artisan) | **E-invoicing** — la facture transite par une PA |
| Particulier | **E-reporting** — transmission périodique des données de transaction |

Un artisan du bâtiment qui travaille pour des professionnels **et** pour des particuliers est soumis **aux deux**. Notre produit doit donc gérer les deux chemins, pas un seul.

**Et un troisième point, le plus facile à manquer :** les artisans sont des prestataires de services, dont la TVA est exigible à l'**encaissement** et non à la facturation. À ce titre, **les données de paiement doivent elles aussi être transmises** — pour les clients professionnels comme pour les particuliers.

→ **Le suivi des paiements n'est pas un confort de gestion, c'est une obligation réglementaire.** Il était déjà prévu dans M2 ; il en devient un élément non négociable.

## 5. Conséquences sur le plan

**Sur M1 — une correction, mineure maintenant, coûteuse plus tard.**

La table `client` ne porte aujourd'hui que nom, e-mail et téléphone. Or la nature du client détermine l'obligation applicable, et une facture B2B exige le **SIRET du client**.

→ Ajouter dès M1 `client.type` (`particulier` | `professionnel`) et `client.siret` (obligatoire si `professionnel`).

Le coût aujourd'hui est de deux colonnes. Le coût en M2 serait une migration **plus une campagne de re-collecte auprès de tous les clients déjà saisis** — qu'on n'obtiendrait jamais entièrement.

**Sur M2 — le périmètre est confirmé et contraint.**

- Raccordement à une PA par API : **structurant, à choisir avant d'écrire le module de facturation.**
- Deux chemins distincts : e-invoicing B2B, e-reporting B2C.
- Transmission des données de paiement, donc suivi des encaissements obligatoire.
- Jalon de conformité : **1er septembre 2027.**

## 6. L'opportunité, confirmée

L'hypothèse posée dans le spec se vérifie : **toutes les TPE artisanales de France doivent s'équiper d'ici le 1er septembre 2027**, sous peine de sanctions. Ce n'est pas une envie, c'est une contrainte légale datée.

C'est une fenêtre d'entrée rare pour un outil de facturation — mais elle se referme. Un artisan qui aura choisi son outil en 2027 n'en changera pas de sitôt. **Ce calendrier est un argument pour ne pas laisser M2 dériver.**

## 7. Sources

- [Facturation électronique et plateformes agréées — impots.gouv.fr](https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees)
- [La facturation électronique — Urssaf](https://www.urssaf.fr/accueil/actualites/facturation-electronique.html)
- [Guide du e-reporting des données de transaction et de paiement — France Num](https://www.francenum.gouv.fr/guides-et-conseils/pilotage-de-lentreprise/dematerialisation-des-documents/facturation-1)
- [Facturation électronique BTP : B2B, e-reporting et ventes B2C expliqués aux artisans](https://www.batappli.fr/blog-du-logiciel-batiment/facturation-electronique-btp-b2b-domestique-e-reporting-et-ventes-b2c-expliques-aux-artisans)
- [PDP, PA, SC, OD, PPF : quelle différence ?](https://compafacturation.com/reforme-facturation-electronique-2026/pdp-vs-pa-vs-od)
- [Liste des plateformes agréées immatriculées DGFiP](https://comparateur-efacturation.fr/guide/liste-plateformes-agreees)
- [Calendrier facture électronique 2026-2027 — Pennylane](https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/facturation-electronique-dates-cles-et-calendrier)
- [Comprendre les formats de la facturation électronique — Pennylane](https://help.pennylane.com/fr/articles/367168-comprendre-les-formats-de-la-facturation-electronique)
