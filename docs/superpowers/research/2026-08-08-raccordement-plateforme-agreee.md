# Raccordement à une plateforme agréée — chiffrage

> Combien coûte, en euros et en jours, le raccordement d'une Solution Compatible à une Plateforme Agréée.
> Date : 2026-08-08
> Prolonge : [Facturation électronique](2026-08-07-facturation-electronique.md) · [Modèle économique](../specs/2026-08-08-modele-economique-design.md)

---

**Conclusion : le coût récurrent est négligeable, le coût d'intégration est du temps de développement, et ce temps ne doit pas être sur le chemin critique de la première vente.**

## 1. Le coût récurrent — chiffré

Le marché est mûr : **153 plateformes agréées immatriculées** en juillet 2026. La concurrence a écrasé les prix au document.

| Plateforme | Tarif affiché | Modèle |
|---|---|---|
| **Super PDP** | Gratuit jusqu'à 1 000 factures/mois. API dégressive : **0,01 € HT** jusqu'à 10 000/mois, 0,005 € jusqu'à 100 000, 0,0025 € au-delà | Public, marque grise pour éditeurs |
| **Iopole** | Sur devis — frais de set-up + coût au volume. Sandbox gratuite | API-first, **marque blanche B2B2B pour éditeurs**, agréée le 11 déc. 2025 |
| Tiime · Cegid · Indy · Dougs | Gratuit, inclus | Inclus dans **leur** produit — inutilisable comme socle neutre |

### Ce que ça représente pour nous

| Parc | Factures/mois¹ | Coût PA/mois | Par client |
|---|---|---|---|
| 25 clients | 500 | 0 à 5 € | **0,05 à 0,20 €** |
| 100 clients | 2 000 | 20 € | 0,20 € |
| 200 clients | 4 000 | 40 € | 0,20 € |

<small>¹ hypothèse de 20 factures par artisan et par mois</small>

> Le coût variable par client du modèle est de 3 €/mois. Le passer à 3,20 € **ne déplace la date d'atteinte de l'objectif d'aucun mois** : 1 942 € en février 2027 dans les deux cas. La ligne est inexistante.

Les frais de set-up d'Iopole ne sont pas publics. À budgéter, mais un one-shot de quelques centaines à quelques milliers d'euros est absorbé par les premières mises en service (450 € × 25 clients = 11 250 €).

## 2. Le coût d'intégration — en jours

Ce qu'une Solution Compatible doit construire, d'après la documentation des PA :

| Brique | Charge estimée² |
|---|---|
| Authentification, envoi des factures, mapping des données structurées vers la PA | 3 à 5 j |
| **Statuts du cycle de vie** — webhooks entrants, machine à états persistée, idempotence, rejeu | 4 à 6 j |
| **E-reporting** — transactions B2C et données d'encaissement | 4 à 6 j |
| Recette en bac à sable : rejets, refus client, cas d'erreur | 4 à 6 j |
| **Réception** des factures fournisseurs — *si on décide de la couvrir* | 5 à 8 j |
| **Total hors réception** | **15 à 23 j** |

<small>² estimation, pas un devis. Hypothèse : le modèle de données de M1 et M2 est propre et porte déjà SIRET des deux parties, TVA par taux et mentions obligatoires.</small>

Le poste dominant n'est pas l'envoi — c'est le **cycle de vie**. Une facture émise change d'état en dehors de notre produit, de façon asynchrone, et notre base doit rester la vérité. C'est un travail de machine à états, pas d'appel d'API.

Deux coûts calendaires s'ajoutent, en jours d'attente et non en jours de travail : la contractualisation et le KYC avec la PA (2 à 6 semaines), et l'accès à l'environnement de recette.

## 3. Le coût du délai — le seul qui fait mal

À 25 h de développement par semaine, 15 à 23 jours représentent **5 à 7 semaines**, soit un mois et demi. Si ce chantier passe avant la première vente, il décale tout.

| Démarrage commercial | 2 000 € atteints | MRR en fév. 2027 | Parc |
|---|---|---|---|
| mois 2 — nov. 2026 *(référence)* | mars 2027 | **1 942 €** | 24,6 |
| mois 3 — déc. 2026 | mars 2027 | 1 554 € | 19,7 |
| **mois 4 — janv. 2027** | **avr. 2027** | **1 155 €** | 14,6 |
| mois 5 — févr. 2027 | mai 2027 | 753 € | 9,5 |

**Chaque mois de retard au démarrage coûte environ 400 € de MRR à l'échéance.** Mettre le raccordement avant la première vente, c'est perdre 40 % de l'objectif.

## 4. La décision

> **Décision. Le raccordement à une plateforme agréée n'est pas un préalable de M2. Il est livré entre mars et août 2027, et vendu dès la première signature comme un engagement daté.**

Trois faits la justifient.

**L'obligation de nos clients est en septembre 2027, pas en février.** L'échéance du 1ᵉʳ septembre 2026 est une obligation de **réception**, et elle ne pèse pas sur notre produit — l'artisan la satisfait avec n'importe quelle plateforme gratuite ou via son comptable. L'obligation d'**émission** des TPE et PME, celle qui touche ce que nous construisons, est au **1ᵉʳ septembre 2027**. Nous avons douze mois, pas trois semaines.

**Ce qui se vend en février 2027, c'est l'engagement, pas la fonctionnalité.** L'artisan n'achète pas un connecteur, il achète de ne pas avoir à y penser. « Conforme au 1ᵉʳ septembre 2027, inclus, sans surcoût » est un argument de vente complet — à condition d'être tenu.

**Le coût du retard est mesuré et le coût de l'attente est nul.** Décaler la première vente coûte 400 € de MRR par mois ; décaler le raccordement ne coûte rien tant qu'il est livré avant septembre 2027.

### Correction

La note du 2026-08-08 sur le modèle économique faisait du raccordement « un préalable de M2 » et le désignait comme la dépendance la plus lourde de la décision M8 → M2. **C'était surévalué.** Le raccordement est un chantier de développement de cinq à sept semaines, sans coût récurrent significatif, dont l'échéance réelle est douze mois après la première vente. Il sort du chemin critique.

## 5. Le piège à ne pas tendre

> **Garde-fou.** L'argument commercial doit nommer **l'émission et l'e-reporting**, jamais « la conformité » tout court.

Un artisan à qui l'on vend « la conformité à la réforme » et qui découvre qu'il doit s'équiper ailleurs pour **recevoir** ses factures fournisseurs a été trompé. Sur un produit dont l'argument central est la preuve, c'est le pire angle mort possible.

Deux réponses acceptables, à trancher avant la première vente :

- **Périmètre annoncé** : nous couvrons l'émission et l'e-reporting&nbsp;; la réception est explicitement hors périmètre et l'artisan est orienté vers une plateforme gratuite.
- **Périmètre étendu** : nous couvrons aussi la réception (+5 à 8 j de développement), et l'argument devient complet.

La seconde est meilleure commercialement et n'est pas coûteuse. Elle n'est pas nécessaire à la première vente.

## 6. Le choix de la plateforme

Non tranché, et il n'a pas à l'être avant début 2027. Deux profils :

- **Iopole** — conçue pour les éditeurs, marque blanche, sandbox gratuite, agréée dans la première vague. Le partenaire par défaut, sous réserve du devis.
- **Super PDP** — le seul à publier ses prix, marque grise, tarif au document imbattable. À évaluer sur la qualité de l'API et la solidité de l'éditeur, pas sur le prix.

> **Critère de choix.** Ni le prix ni les formats — ils sont équivalents et négligeables. Le critère est la **qualité des webhooks de cycle de vie** et la clarté de la documentation de reprise sur erreur : c'est là qu'est la charge de développement, et c'est là qu'elle peut doubler.

## Sources

- [Sanctions et pénalités — l'amende e-reporting passe de 250 € à 500 € par transmission au 1ᵉʳ septembre 2027, plafond 15 000 €/an](https://www.infos-pa.com/articles/sanctions-amendes-facturation-electronique-2026-loi-finances)
- [Iopole — plateforme agréée API-first pour éditeurs](https://facture-electronique-en-ligne.fr/avis-logiciel/iopole)
- [Comparatif des tarifs des plateformes agréées 2026](https://www.groupe-t2f.eu/post/facture-electronique-comparatif-tarifs-plateformes-agreees-2026)
- [API facturation électronique : connecter son logiciel à une PA](https://comparepdp.com/articles/api-facturation-electronique)
- [Liste des plateformes agréées — 153 immatriculées en juillet 2026](https://independant.io/liste-plateforme-dematerialisation-partenaire/)
