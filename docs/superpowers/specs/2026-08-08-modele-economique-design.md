# Modèle économique — Design

> Révision du §11 du socle, sous contrainte de rentabilité courte.
> Date : 2026-08-08 · Statut : à valider
> Dépend de : [Socle Artisan — Design P1](2026-08-07-socle-artisan-design.md)
> Simulation interactive : `dequerre-simulation.html` (artefact publié)

---

## 1. La contrainte

**2 000 € de MRR au 1ᵉʳ février 2027**, soit six mois après le mois 0 (septembre 2026). Charges fixes hors rémunération : environ 350 €/mois. La contrainte n'est pas un objectif de croissance, c'est un seuil de survie — en dessous, le projet s'arrête.

Cette contrainte n'existait pas quand le §11 du socle a été écrit. Elle invalide trois de ses décisions.

## 2. Le benchmark

Prix relevés le 2026-08-08 sur les pages tarifaires des éditeurs.

| Acteur | Prix HT / mois | Structure |
|---|---|---|
| **Henrri** | **0 €**, illimité — devis, factures, multi-utilisateurs, **conforme e-facture**. Puis Expert 17-19 €, Smart 25-29 €, VIP 49-59 € | Freemium sans plafond, adossé au réseau Rivalis |
| **Tolteck** | 25 € mensuel · 19 € annuel · **−35 % pour les entreprises de moins de 5 ans** (≈ 12,35 €) | Offre unique, aucun palier |
| **Obat** | Micro 25-32 € · Solo TVA et PME 39-49 € (Pro), 69-79 € (Croissance), 109-129 € (Booster) | Segmenté par taille **et** par palier |
| **Graneet · Vertuoza** | Sur devis | PME de 1 à 50 M€ de CA — un autre marché |

### Ce que le relevé établit

**La gratuité n'est pas une position, c'est le prix plancher du marché.** Henrri offre déjà devis et factures illimités, multi-utilisateurs et conformes à la réforme, à 0 €. Le §11 présente « le capteur gratuit à vie » comme un choix stratégique&nbsp;; c'est en réalité un alignement sur un concurrent installé, sans le bénéfice de la différenciation. Et Henrri n'est pas leader du marché — **le gratuit ne fait pas venir les artisans**.

**La cible d'ARPU du §11 est incohérente avec sa propre gratuité.** « 600 à 1 200 € par entreprise active et par an » place l'ARPU entre 50 et 100 €/mois, au-dessus d'Obat Pro et au quadruple de Tolteck — sur le résidu de ce qui reste après avoir donné gratuitement ce que le marché fait payer.

**Le calendrier des jalons rend l'objectif mécaniquement impossible.** L'offre payante est en M8, après agenda, espace demandeur et métriques. Elle ne peut pas exister en février 2027.

## 3. Le déclencheur

| Date | Obligation |
|---|---|
| **1ᵉʳ septembre 2026** | Réception de factures électroniques — **toutes** les entreprises assujetties à la TVA |
| **1ᵉʳ septembre 2027** | Émission — TPE, PME et micro-entreprises |

Sanctions : 15 € par facture non conforme (plafond 15 000 €/an), 250 € par e-reporting manquant (plafond 45 000 €/an).

> **Décision.** La fenêtre d'acquisition est la réforme, pas le passeport. Chaque artisan de France doit prendre ou changer d'outil dans les douze mois — c'est le seul moment de la décennie où il décroche son téléphone pour parler logiciel de facturation. Le socle traite ce point comme un risque de conformité (risque n° 5)&nbsp;; c'est le canal d'acquisition principal, et il est gratuit.

## 4. Le modèle retenu

> **Décision. Offre unique à 79 €/mois HT, plus 390 à 490 € de mise en service facturés une fois.**

La mise en service couvre la reprise de la bibliothèque de prix, le paramétrage des mentions d'assurance obligatoires (art. L243-2), le raccordement e-facture et la création du passeport.

Trois raisons, dans l'ordre :

1. **Elle transforme les heures d'accompagnement en trésorerie** au lieu de les brûler en gratuité. C'est cette ligne qui finance les trois premiers mois, pas l'abonnement.
2. **25 clients, c'est un nombre qu'on connaît un par un.** À 29 €, il en faut 69 — une population qu'une seule personne ne peut ni vendre ni servir.
3. **Le prix se défend par ce que les autres ne font pas** : la conformité L243-2 et le passeport vérifié. À 29 €, on est un Tolteck en moins bon.

### Le palier gratuit est conservé, et plafonné

> **Décision. Gratuit à vie, plafonné à trois devis par mois, sans support.**

Ce n'est plus un moteur de croissance, c'est un alimentateur de capteur et de référencement. Le freemium comme moteur exige 1 500 à 2 500 inscrits pour 50 payants : c'est un modèle de volume, incompatible avec six mois sans budget d'acquisition.

Le principe du §11 — « le capteur est gratuit à vie, non négociable » — est **maintenu dans son intention** (l'artisan occasionnel n'est jamais bloqué, la donnée continue d'entrer) et **révisé dans sa forme** (le plafond existe).

### Ce qui est écarté

| Piste | Motif |
|---|---|
| **Commission sur l'assurance décennale** (150 à 600 €/artisan/an) | Vendre l'assurance qu'on prétend vérifier détruit le label — le seul actif défendable du projet. Statut ORIAS requis par ailleurs. |
| **Prix bas de marché (29 €)** | Concourt frontalement contre Tolteck à 12,35 € pour les entreprises de moins de 5 ans, et contre Henrri à 0 €. Terrain perdu d'avance. |
| **Attendre M8 pour vendre** | Voir §2. |

## 5. Ce que la simulation mesure

Le modèle est dans l'artefact publié. Son apport n'est pas de projeter des euros — c'est de **borner l'acquisition par les heures disponibles**.

```
capacité mensuelle = heures/semaine × 4,333
heures de support  = heures par client × parc          ← croît sans décision
heures vendables   = capacité − développement − support
demande générée    = Σ canaux (contacts, démos, mises en service)
bridage            = min(1, heures vendables / demande)  ← le mur
```

Le support croît avec le parc. Vente et mise en service finissent par dépasser la capacité, et **l'acquisition s'écroule d'elle-même**. Le modèle plafonne l'acquisition au lieu de laisser écrire des signatures qu'aucun humain ne peut servir.

### Résultats aux valeurs de référence

Hypothèses : démarrage commercial au mois 2, 45 h/semaine dont 25 h de développement, 25 contacts terrain par semaine, 25 % de démos signées, 6 h de mise en service, 0,4 h de support par client et par mois, résiliation 2,5 %/mois.

| Scénario | 2 000 € atteints | MRR en fév. 2027 | Trésorerie au plus bas | Saturation |
|---|---|---|---|---|
| **79 € + mise en service** | mars 2027 | 1 942 € (24,6 clients) | −478 € | déc. 2026 |
| 119 € tout compris | mars 2027 | 1 954 € (16,4 clients) | −601 € | nov. 2026 |
| 29 € volume | avr. 2027 | 1 487 € (51,3 clients) | −559 € | déc. 2026 |
| Le plan du spec — gratuit, Pro tardif | **janv. 2028** | 588 € | −697 € | avr. 2027 |

### Les trois enseignements

1. **L'objectif est manqué d'un mois, pas d'un an.** 1 942 € en février contre 2 000 € visés. Le modèle n'est pas à refondre&nbsp;; il faut avancer d'un mois le démarrage commercial, ou signer trois clients de plus.
2. **La saturation arrive au mois 3, avant l'objectif.** Dès décembre 2026 on ne sert plus que 68 % de la demande générée, et 51 % en février. **Le facteur limitant n'est jamais le prix ni le marché — c'est le nombre d'heures.**
3. **Le plan du socle produit 588 €.** Trois fois moins que la cible, avec l'objectif repoussé de onze mois. C'est la mesure du coût de la gratuité sans plafond.

## 6. Conséquences sur le socle

| § du socle | Modification |
|---|---|
| §11 — Business model | Abonnement unique à 79 € + mise en service. Palier gratuit plafonné. Cible d'ARPU alignée sur 948 €/an, dans la fourchette annoncée. |
| §14 — Jalons | **Le payant remonte de M8 à M2.** Ce qui se vend en février 2027, c'est le devis signé, la facture et la conformité — pas la gestion d'équipe. M8 devient un palier supérieur, pas la première monétisation. |
| §13 — Risques | Le risque n° 7 (« zéro revenu si l'abonnement Pro n'est pas adopté ») est requalifié : le revenu ne dépend plus de l'adoption d'une offre Pro tardive. Nouveau risque : **la saturation en heures d'une structure à une personne**, mesurée en §5. |

## 7. Ce qui reste ouvert

- **Le raccordement à une plateforme agréée** est un préalable à l'argument commercial de la conformité. Son coût et son délai ne sont pas chiffrés ici et conditionnent le prix plancher de 79 €.
- **Le taux de résiliation à 2,5 %** est une hypothèse, pas une mesure. Sur un outil de facturation, il est structurellement bas (coût de sortie élevé), mais il n'est pas observé.
- **Le canal prescripteur** (experts-comptables, CAPEB, FFB) est modélisé à 6 contacts par semaine sans qu'aucun accord n'existe. C'est le poste le plus incertain de l'entonnoir.
