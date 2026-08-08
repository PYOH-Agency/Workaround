# Exigences de la facture — cadrage de M2

> Date : 2026-08-08 · Statut : conclu

**Le choix de la plateforme agréée n'est pas un préalable à M2.** Les trois formats du socle — Factur-X, UBL, CII — transportent les mêmes termes métier de la norme **EN 16931**, et toute plateforme agréée sait les produire à partir de données structurées. Ce qu'il faut respecter, c'est la norme ; le fournisseur se choisit au moment de transmettre.

---

## 1. Mentions obligatoires d'une facture

Au-delà de celles déjà portées par le devis :

| Mention | Portée |
|---|---|
| **Numéro unique et chronologique** | Toujours |
| Date d'émission | Toujours |
| Identité complète du vendeur — SIRET, RCS ou RM, adresse | Toujours |
| Identité de l'acheteur | Toujours |
| Description précise, quantités, prix unitaires HT | Toujours |
| Taux et montant de TVA par taux | Toujours |
| Total HT et total TTC | Toujours |
| Conditions et **date d'échéance** du paiement | Toujours |
| **Taux des pénalités de retard** | **Entre professionnels** |
| **Indemnité forfaitaire de 40 € pour frais de recouvrement** | **Entre professionnels** |

Les deux dernières découlent des articles L441-9 et D441-5 du Code de commerce. Le taux minimal des pénalités est de **trois fois le taux d'intérêt légal**.

**Sanction : 15 € par mention manquante, plafonnée à 25 % du montant de la facture.** Sur une facture de 8 000 €, cela peut atteindre 2 000 €.

## 2. La règle qui change le modèle de données

> **Une facture est immuable et sa numérotation est une séquence continue, sans trou.**

C'est la différence majeure avec le devis. On ne peut ni supprimer une facture, ni la modifier, ni sauter un numéro : une facture erronée se corrige par un **avoir**, qui est lui-même une facture et consomme un numéro.

Conséquences directes :

- pas de suppression, pas de brouillon effaçable dans la séquence — le numéro ne s'attribue qu'à l'émission ;
- l'attribution du numéro doit être **sérialisée** : deux factures émises simultanément ne peuvent pas se voir attribuer le même, et la reprise sur collision utilisée pour les devis ne suffit pas, car elle laisserait un trou en cas d'échec ;
- l'avoir porte une référence à la facture qu'il corrige.

## 3. Champs exigés par EN 16931 et l'extension française

La norme définit plus de 160 termes métier, dont une partie seulement est obligatoire selon le profil. L'extension française **EXT-FR-FE** y ajoute ses propres règles.

À porter dans notre modèle :

| Champ | Statut chez nous |
|---|---|
| SIREN/SIRET du vendeur | ✅ déjà présent |
| **SIRET de l'acheteur** | ✅ **déjà collecté en M1** — la décision de le demander dès le devis paie ici |
| Mention de franchise de TVA | ✅ `vatExempt` |
| Pénalités de retard | ❌ à ajouter |
| **Type d'opération** — livraison de biens, prestation de services, ou mixte | ❌ à ajouter |
| **Code de routage** de la plateforme agréée du destinataire | ❌ à ajouter, alimenté à la transmission |

Le type d'opération n'est pas cosmétique : pour une prestation de services, la TVA est exigible **à l'encaissement**, ce qui commande le e-reporting des données de paiement.

## 4. Ce que M2 couvre, et ce qu'il ne couvre pas

**Dans M2** — facture d'acompte, situation de travaux, facture de solde, avoir ; mentions légales complètes ; PDF ; suivi des encaissements ; modèle de données conforme à EN 16931.

**Hors M2** — la transmission effective à une plateforme agréée. Elle exige un contrat, un raccordement et des tests d'interopérabilité. L'échéance légale pour les TPE est le **1er septembre 2027** : le modèle doit être prêt bien avant, la connexion peut suivre.

Le suivi des encaissements n'est pas un confort de gestion : sans lui, le e-reporting des données de paiement est impossible.

## 5. Sources

- [Mentions obligatoires d'une facture en 2026](https://www.kelyseo.com/blog/mentions-obligatoires-facture-france-2026)
- [Délai de paiement, pénalités et indemnité de 40 €](https://www.mondevisfacile.fr/blog/delai-de-paiement-facture-regles-penalites-et-40eu)
- [EN 16931 : le modèle sémantique européen](https://ma-facture-electronique.org/formats-normes/en-16931/)
- [Champs obligatoires EN 16931 et Factur-X](https://facturxapi.com/blog/champs-obligatoires-en16931-facturx-mapping-erp)
- [Les trois formats du socle](https://www.monauditpa.fr/formats-facture-electronique)
