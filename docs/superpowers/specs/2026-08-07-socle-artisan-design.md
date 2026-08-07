# Socle Artisan — Design P1

> Spec produit du premier produit d'une vision en 6 temps.
> Date : 2026-08-07 · Statut : à valider

---

## 1. La thèse

Tous les acteurs du secteur ont construit leur produit autour de **la demande**. Une demande est éphémère : elle naît, elle est revendue à plusieurs artisans, elle meurt. D'où le modèle de génération de leads, la guerre à l'acquisition, et le fait que personne ne fidélise personne.

Or le paradoxe structurel du secteur est que **la relation est ponctuelle alors que le bien est permanent**. Un logement consomme des travaux pendant un siècle, mais chaque intervention repart de zéro : nouvel artisan, nouveau diagnostic, aucune mémoire.

Nous déplaçons l'objet racine du produit de **la demande** vers **le logement**.

L'analogie devient alors exacte : le logement est le patient, le carnet est le dossier médical, l'entreprise artisanale est le praticien, l'intervention est la consultation. Doctolib n'a pas gagné grâce à son annuaire — il a gagné grâce au dossier et à l'agenda.

## 2. Le mécanisme central

Nous n'avons ni accès privilégié à l'offre, ni accès à la demande. Le produit doit donc avoir de la valeur **avec zéro utilisateur en face**.

L'outil de devis et de facturation joue trois rôles simultanés, et c'est ce qui rend l'ensemble cohérent :

1. **Il résout le démarrage à froid.** Un artisan seul sur la plateforme s'en sert quand même : faire ses devis et ses factures est une obligation légale qu'il subit aujourd'hui sur Word ou sur un carnet.
2. **Il alimente le label sans effort déclaratif.** L'artisan fait son métier ; les métriques se calculent toutes seules.
3. **Il remplit le carnet du logement.** Personne ne remplirait ce carnet à la main — mais chaque facture contient l'adresse, la nature des travaux, les équipements posés et les dates de garantie.

Trois briques que l'on croyait séparées sont le même objet. **L'outil est le capteur.**

## 3. La boucle

```
1. L'artisan utilise l'outil (valeur immédiate, seul)
        ↓
2. La plateforme mesure son comportement réel
        ↓
3. Le passeport public se remplit (preuve vérifiée, pas d'étoiles)
        ↓
4. Le demandeur trouve et fait confiance
        ↓
5. Le carnet du logement se peuple automatiquement
        ↓
6. Le carnet génère la demande suivante (maintenance prédictive)
        ↺ retour en 1, en s'amplifiant
```

P1 couvre les étapes **1 → 3**, et amorce **5** en silence.

## 4. Périmètre de P1

### Dans le périmètre

| Bloc | Contenu |
|---|---|
| Identité & équipe | Inscription entreprise, membres, rôles |
| Vérification | Pièces, extraction, contrôle de couverture, re-contrôle automatique |
| Devis | Lignes structurées, TVA multi-taux, versions, avenants, signature client |
| Facturation | Acomptes, situations de travaux, factures, avoirs, relances |
| Bibliothèque d'ouvrages | Personnelle : saisie libre, import, extraction depuis les anciens devis |
| Agenda & RDV | Créneaux, synchronisation externe, RDV de visite et d'intervention |
| Suivi de chantier | Jalons, photos, statuts |
| Passeport public | Page SEO, métriques dérivées, vérifications par activité |
| Carnet du logement | Alimenté automatiquement — **non exposé au demandeur en P1** |

### Le périmètre métier

**Tous les métiers dès P1**, sans restriction. P1 étant mono-utilisateur, il n'y a aucun enjeu de liquidité à protéger : chaque métier supplémentaire n'apporte que des passeports, de la surface de référencement et des données de prix.

La borne n'est pas le métier mais **l'objet** : sont concernées toutes les activités qui **interviennent sur un logement ou un bâtiment** — du gros œuvre au paysagisme, en passant par le ramonage, le diagnostic, la pose de cuisine ou la dératisation.

Sont hors sujet les autres secteurs de l'artisanat (alimentation, services à la personne, fabrication) : sans logement, sans chantier et sans assurance de travaux, le modèle de données ne s'applique pas.

### Explicitement hors périmètre

- **Aucune marketplace.** Pas de compte demandeur, pas de dépôt de projet, pas de mise en relation. Le demandeur n'interagit qu'en signant un devis et en validant une facture.
- Pas de paiement ni de séquestre (→ P4).
- Pas de réservation de créneau par un demandeur (→ P2).
- Pas de carnet exposé ni de maintenance prédictive (→ P3).
- Pas de flux professionnels (→ P5), pas de multi-corps d'état (→ P6).

## 5. Les acteurs

- **L'entreprise artisanale** — utilisateur principal. Du solo (majorité des entreprises du bâtiment en France) à la structure de 10 salariés.
- **Le membre d'équipe** — compagnon rattaché à une entreprise. Porte ses propres qualifications, mais **n'a pas de page publique**.
- **Le client final** — n'a pas de compte en P1. Il reçoit un lien, signe un devis, valide une facture. **Son rôle est essentiel : il est le témoin qui authentifie la mesure.**

> **Décision.** La page publique appartient à l'**entreprise**, jamais à l'individu. Un patron ne veut pas que ses compagnons aient une vitrine personnelle avec agenda — c'est un risque de désintermédiation. Le solo est simplement une entreprise à une personne. Cette décision élimine la tension patron/salarié dès le modèle de données.

## 6. Modèle de données

### Objets racines

| Objet | Rôle |
|---|---|
| `Logement` | Permanent. Adresse normalisée, typologie, année, équipements, garanties, historique. |
| `Entreprise` | Le professionnel. SIRET, forme juridique, membres, activités. |
| `Chantier` | Relie un logement et une entreprise. Porte RDV, devis, avenants, factures, photos. |
| `Passeport` | **Dérivé, jamais saisi.** Calculé depuis les événements et les vérifications. |

### Entités

```
Entreprise          siret, raison_sociale, forme, date_creation, adresse, statut
Membre              entreprise, personne, role, qualifications
Activite            code, libelle, metier_parent, assurance_requise,
                    habilitations_requises                                [référentiel]
EntrepriseActivite  entreprise × activite, statut_verification, preuve, controle_le
PieceJustificative  type, fichier, valide_du, valide_au, donnees_extraites, statut_revue
Logement            adresse_normalisee, type, annee, surface
Equipement          logement, type, marque, modele, pose_le, echeance, garantie
Chantier            entreprise, logement, activites, statut, dates
RendezVous          chantier, type (visite|intervention), creneau, statut, presence
Devis               chantier, version, statut, totaux, delai_engage, signe_par_client_le
LigneDevis          devis, ouvrage, quantite, prix_unitaire, taux_tva
Avenant             devis, lignes, signe_le
Facture             chantier, type (acompte|situation|solde|avoir), montants, statut
Ouvrage             entreprise, libelle, unite, prix, tva_defaut, activite [bibliothèque]
Evenement           type, acteur, horodatage, payload                      [journal immuable]
```

> **Décision structurante.** La vérification est portée par le couple `EntrepriseActivite`, **pas par l'entreprise**. Une même entreprise peut être vérifiée en plomberie et non vérifiée en électricité. Le passeport l'affiche activité par activité.

> **Décision structurante.** `Evenement` est un **journal immuable**. Toutes les métriques du passeport en sont dérivées, jamais stockées comme valeur modifiable. C'est ce qui rend le passeport non falsifiable — y compris par nous.

## 7. Découpage en modules

Chaque module a une responsabilité unique, une interface explicite, et peut être compris et testé isolément.

| Module | Fait quoi | Dépend de |
|---|---|---|
| **Identité** | Comptes, entreprises, membres, rôles, permissions | — |
| **Référentiel Activités** | Nomenclature de **toutes** les activités du bâtiment et du logement, assurance et habilitations requises par activité, correspondance avec les libellés d'assurance | — |
| **Vérification** | Collecte de pièces, extraction, contrôle de couverture, re-contrôle planifié, statut par activité | Identité, Référentiel |
| **Logement** | Normalisation d'adresse, déduplication, équipements, garanties | — |
| **Bibliothèque** | Ouvrages **propres à chaque entreprise** : saisie, import, extraction depuis d'anciens devis, agrégation anonymisée | Identité |
| **Chantier** | Agrégat racine : cycle de vie, jalons, photos | Identité, Logement |
| **Devis** | Rédaction, versions, avenants, envoi, signature client | Chantier, Bibliothèque |
| **Facturation** | Acomptes, situations, factures, avoirs, relances | Chantier, Devis |
| **Agenda** | Créneaux, disponibilités, synchronisation externe, RDV | Identité, Chantier |
| **Mesure** | Journalise les faits, calcule les métriques, applique les seuils | Evenement (tous les modules émettent) |
| **Passeport** | Page publique, rendu, SEO, exposition des vérifications | Mesure, Vérification |

Le module **Mesure** est le seul autorisé à calculer une métrique. Aucun autre module ne peut écrire dans le passeport.

## 8. La vérification

### Principe

On ne revérifie pas ce que l'État vérifie déjà. La loi Raffarin impose une qualification (diplôme du métier ou trois ans d'expérience) pour les activités du bâtiment, contrôlée par la Chambre de Métiers à l'immatriculation. Redemander le CAP crée de la friction pour zéro information nouvelle.

**Ce que personne ne vérifie, c'est la couverture.**

### Niveau 1 — Existence légale (automatique, bloquant pour créer un compte)

- SIRET actif, dénomination, ancienneté — API Sirene (INSEE)
- Absence de procédure collective — BODACC
- Immatriculation, qualité d'artisan — RNE (INPI) *(modalités d'accès à confirmer)*

Le code APE/NAF est **déclaratif et non fiable** : il ne détermine jamais ce que l'entreprise a le droit de faire.

### Niveau 2 — La couverture (le différenciateur)

L'assurance est souscrite **par activité déclarée**. Un artisan assuré en plomberie-chauffage qui refait un tableau électrique n'est pas couvert, et le client n'a aucun recours en cas de sinistre. C'est le piège numéro un du secteur et personne ne le contrôle.

**L'assurance requise dépend de l'activité**, portée par `Activite.assurance_requise` :

| Nature de l'activité | Assurance exigée |
|---|---|
| Travaux de construction au sens de l'article 1792 du Code civil (gros œuvre, second œuvre, équipements indissociables) | **Décennale** couvrant l'activité |
| Prestations n'engageant pas la garantie décennale (paysagisme, ramonage, nettoyage, dératisation, diagnostic…) | **RC Pro** couvrant l'activité |

**Contrôle :** croiser les activités listées sur l'attestation avec les activités déclarées sur le profil. Toute activité non couverte n'est pas affichable publiquement.

L'attestation est un PDF non structuré, de format libre selon l'assureur, sans API standard. Traitement : **extraction OCR + LLM, puis revue humaine**. Les premières entreprises étant rencontrées physiquement, la revue humaine est de toute façon disponible au démarrage.

**Re-contrôle automatique à chaque date d'expiration. Attestation périmée → les activités qu'elle couvrait disparaissent du passeport immédiatement.** La suspension est donc granulaire : une entreprise peut perdre la visibilité sur une activité et la garder sur une autre. C'est le point que le marché ne fait pas.

Également collectée : l'attestation de vigilance URSSAF.

### Niveau 3 — Habilitations bloquantes par activité

Sans elles, l'activité est illégale. Aucune tolérance, aucun affichage.

| Activité | Habilitation |
|---|---|
| Climatisation, PAC | Attestation d'aptitude fluides frigorigènes (cat. I–IV) |
| Gaz | Appellation PGN / PGP |
| Amiante | Certification SS3 / SS4 — **critique sur le parc ancien bordelais** |
| Rénovation énergétique | RGE — vérifiable via l'open data ADEME *(format à confirmer)* |
| Selon chantier | Habilitation électrique NF C 18-510, AIPR, CACES, plomb |

### Le seuil de visibilité

> **Décision.** L'outil est ouvert à tous — on entre avec un SIRET en trente secondes, et le capteur ne doit jamais être bloqué. La **vitrine publique** exige une **assurance valide et adaptée à chaque activité affichée** : décennale pour les activités qui l'engagent, RC Pro pour les autres.

Cela donne une phrase que personne d'autre en France ne peut prononcer : *« tout professionnel visible ici est assuré pour ce qu'il fait. »*

La jauge de vérification devient un moteur d'engagement : l'artisan voit son passeport se débloquer. Une assurance absente ou mal dimensionnée est **signalée à l'artisan** plutôt que de le rejeter silencieusement — orientation vers un courtier partenaire à terme.

## 9. Le passeport

### Ce qu'il n'est pas

Pas d'étoiles. Les notes déclaratives existent déjà partout et sont massivement optimisées ; un score maison avec quatre avis ne pèse rien face à quatre-vingts avis Google. Doctolib, d'ailleurs, n'affiche délibérément aucune note sur ses praticiens.

### Les métriques

| Métrique | Source de la mesure | Fenêtre | Seuil d'affichage |
|---|---|---|---|
| Taux de présence aux RDV de visite | `RendezVous.presence` | 12 mois glissants | 5 observations |
| Délai médian de remise du devis | `RendezVous` de visite → envoi du `Devis` | 12 mois glissants | 5 observations |
| **Écart devis → facture** *(facture finale ≤ devis + avenants signés)* | `Devis` + `Avenant` vs `Facture` | 12 mois glissants | 10 chantiers |
| Respect du délai annoncé | `Devis.delai_engage` (champ obligatoire du devis) vs date réelle de fin de chantier | 12 mois glissants | 10 chantiers |
| Volume de chantiers terminés | `Chantier` | 12 mois + total | — |
| Ancienneté | `Entreprise.date_creation` | — | — |
| Vérifications par activité | `EntrepriseActivite` | courant | — |

> **Note de périmètre.** Le *délai de première réponse*, souvent cité comme la métrique la plus parlante, **n'est pas mesurable en P1** : il suppose une sollicitation entrante, donc une marketplace. Il est activé en P2. En P1 le passeport affiche les six métriques ci-dessus, ce qui suffit à faire tourner la boucle.

Le champ `Devis.delai_engage` est **obligatoire** à l'émission d'un devis : sans engagement de délai déclaré, il n'y a rien à comparer et la métrique correspondante n'existe pas.

**En dessous du seuil, on affiche « pas encore assez de données » — jamais un chiffre.** Sans quoi une entreprise à trois chantiers parfaits paraîtrait meilleure qu'une entreprise à deux cents chantiers à 96 %, ce qui serait faux et ruinerait le label dès que quelqu'un le remarquerait.

Fenêtre glissante de douze mois, pour qu'un bon historique ne masque pas une dégradation récente.

### L'authentification de la mesure

> **Décision structurante.** Un chantier ne compte dans le passeport **que si le devis a été signé électroniquement par le client final** (lien envoyé par e-mail ou SMS).

Sans cela, l'artisan saisit lui-même son devis et sa propre facture : les métriques seraient auto-déclarées et falsifiables. La signature client fait du client un **témoin** et co-authentifie l'événement. Elle apporte par ailleurs une vraie valeur juridique à l'artisan, qui en a besoin de toute façon.

Les chantiers non signés existent dans l'outil mais ne comptent pas dans le passeport.

### Portabilité

Le passeport est exportable : widget pour le site de l'entreprise, bloc sur ses devis, QR code. Le label devient son argument commercial, donc il le défend et le diffuse gratuitement.

## 10. Business model

Trois sources de revenus classiques du secteur nous sont **volontairement interdites** : vendre des leads, vendre le classement, facturer l'outil au prix du marché. C'est le prix de la confiance.

**Modèle hybride, retenu :**

- **Le capteur est gratuit à vie** — devis, facture, passeport, agenda. Non négociable : c'est ce qui fait vivre le label.
- **Abonnement Pro payant dès le premier jour** sur ce qui scale — gestion d'équipe, planning, suivi de chantier, situations de travaux, relances d'impayés. Le consentement à payer est déjà prouvé par les acteurs établis à 30–80 €/mois.
- **Commission au succès** (P2, à l'ouverture de la marketplace) : 5–8 % sur le petit chantier, 2–4 % au-delà, ou un forfait plafonné par affaire signée.

Les solos apportent la donnée et le référencement, les entreprises structurées apportent le revenu. Chaque côté donne ce qu'il peut.

**Cible :** 600 à 1 200 € de marge par entreprise active et par an, toutes sources confondues.

## 11. Principes non négociables

1. **Le classement n'est jamais achetable.** Aucune mise en avant payante, jamais. C'est la faute originelle de tous les concurrents.
2. **Jamais de commission sur les clients apportés par l'artisan.** Deux flux visiblement séparés dans le produit. Si l'on taxe tout, l'artisan sort ses vrais chantiers de l'outil — et l'on perd le capteur, donc le label, donc le produit entier.
3. **Le passeport est dérivé, jamais éditable** — ni par l'artisan, ni par un annonceur, ni par nous.
4. **L'outil est ouvert, la vitrine se mérite.**
5. **Aucune donnée identifiante n'est vendue.** Les prix de marché agrégés et anonymisés sont exploitables ; le comportement d'une entreprise identifiable ne l'est jamais.

## 12. Risques et hypothèses à valider

| # | Risque | Traitement |
|---|---|---|
| 1 | **Le périmètre de P1 est important** (option « socle complet » retenue) | Le plan d'implémentation devra le découper en incréments livrables, l'agenda et les situations de travaux venant après le noyau devis/facture/passeport |
| 2 | **Falsification des métriques** en l'absence de paiement transitant par la plateforme | Signature client obligatoire (§9). Risque résiduel assumé : faux clients. Détection d'anomalies à prévoir |
| 3 | **Extraction fiable des attestations de décennale** — PDF hétérogènes, sans standard | Revue humaine systématique au démarrage, automatisation progressive |
| 4 | **Marché des outils de devis/facture mature et concurrentiel** | Notre différenciateur n'est pas l'outil mais le passeport. L'outil doit être bon, pas révolutionnaire |
| 5 | **Facturation électronique obligatoire** — calendrier et obligation de passer par une plateforme agréée | **À vérifier en priorité.** Connaissance non à jour. Probablement un partenariat plutôt qu'un agrément propre |
| 6 | **RGPD** — le carnet du logement contient des données personnelles (adresse, propriétaire), et son transfert à la revente est à cadrer | Cadrage juridique requis avant P3 ; en P1 le carnet n'est pas exposé |
| 7 | **Zéro revenu si l'abonnement Pro n'est pas adopté** | Mesurer tôt le taux de conversion vers l'offre payante sur les entreprises de 3 salariés et plus |
| 8 | **Accès aux sources de vérification** (RNE, URSSAF, RGE, Qualibat) | Vérification technique à mener avant le plan |
| 9 | **Volume du référentiel d'activités** — couvrir tous les métiers demande une nomenclature large, et la correspondance avec les libellés d'assurance est le point dur | Partir d'une nomenclature existante plutôt que d'en créer une. Le référentiel est une donnée, pas du code : il peut s'enrichir en continu sans refonte |
| 10 | **Promesse marketing plus générique** — « l'outil des plombiers bordelais » convertit mieux que « l'outil des artisans » | Problème de go-to-market, pas de produit : acquisition ciblée métier par métier sur un produit générique |

### Hypothèses ouvertes

- **Le métier de départ à Bordeaux** n'a pas besoin d'être tranché en P1 : un outil de devis/facture est transversal et P1 est mono-utilisateur. Ce choix ne devient structurant qu'en P2, quand la liquidité locale compte.
- **Profondeur du référentiel d'activités.** La granularité exacte reste à arrêter. Piste : s'aligner sur une nomenclature existante (Qualibat, listes d'activités des assureurs) plutôt que d'en inventer une — la correspondance avec les libellés d'assurance étant le cœur du contrôle, partir de leur vocabulaire réduit le risque d'écart.

## 13. La suite

| | Produit | Contenu |
|---|---|---|
| **P2** | Agenda & réservation | Créneau de visite réservable, comptes demandeurs, « créneau vert » (l'artisan passe déjà dans le quartier). *La marketplace naît ici.* |
| **P3** | Carnet du logement | Exposé au demandeur, maintenance prédictive, abonnement Logement |
| **P4** | Paiement & séquestre | Acompte bloqué, libération au jalon, garantie, avance de trésorerie |
| **P5** | Flux professionnels | Syndics, bailleurs, agences, assureurs |
| **P6** | Multi-corps d'état | Séquençage automatique des corps d'état. Le sommet. |

Chaque produit fera l'objet de son propre cycle spec → plan → implémentation.
