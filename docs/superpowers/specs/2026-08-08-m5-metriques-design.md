# M5 — Les métriques

> Spec de conception · Date : 2026-08-08 · Statut : à valider
>
> **Trois plans d'implémentation en découlent**, exécutés dans cet ordre. Chacun produit un logiciel utilisable seul :
> **A · L'avenant** (corrige un trou de M2) → **B · Le calcul et le passeport privé** → **C · La contestation**.

**Références :** [spec P1 §9](2026-08-07-socle-artisan-design.md) · [AIPD du passeport](../rgpd/2026-08-08-aipd-passeport.md)

---

## 1. Ce que l'examen a révélé

La spec produit annonce sept métriques. **Une seule était calculable, et elle ne mesurait rien.**

| Métrique | Ce qu'il faudrait | Constat |
|---|---|---|
| Présence aux rendez-vous | `RendezVous.presence` | **Hors de portée** — l'agenda est M7 |
| Délai médian de remise du devis | RDV de visite → envoi | **Hors de portée** — même raison |
| Écart devis → facture | Devis vs factures | **Vacante** — voir §2 |
| Respect du délai annoncé | Délai engagé vs fin de chantier | **La fin de chantier n'existe pas** — voir §3 |
| Volume de chantiers terminés | Chantiers terminés | Même problème |
| Ancienneté | Date de création | Disponible, mais c'est un fait, pas une mesure |
| Vérifications par activité | — | Livré en M3 |

> **M5 livre donc trois métriques mesurées**, pas six. Les deux qui dépendent de l'agenda attendent M7, et la note de périmètre de la spec produit doit être corrigée en conséquence.

## 2. L'avenant — un trou de M2, pas une fonctionnalité de M5

`assertInvoiceable` refuse tout dépassement avec ce message : *« Un dépassement passe par un avenant au devis. »*

**L'avenant n'existe pas.** `quote.version` figure au schéma depuis M1, la contrainte d'unicité le porte, et aucun écran ne crée jamais de version 2.

Deux conséquences, la seconde plus grave que la première.

**La métrique reine serait vacante.** Aucun dépassement n'étant possible, tout le monde afficherait 100 %. Une métrique que personne ne peut échouer ne mesure rien.

**Et un artisan dont le chantier grossit est dans une impasse.** Il ne peut ni facturer davantage, ni créer l'avenant qu'on lui recommande. Il fera son complément **hors de l'outil** — et l'on perd le capteur, donc le label, donc le produit. C'est le principe n° 2 retourné contre nous : *si l'on taxe tout, l'artisan sort ses vrais chantiers de l'outil.* Ici, ce n'est pas une taxe qui l'en chasse, c'est une impasse.

### 2.1 Ce qu'est un avenant

> **Décision.** Un avenant est une **nouvelle version du devis**, signée par le client avec le parcours de M1.

- Il porte le même `number`, une `version` incrémentée — la contrainte `quote_number_version_uq` existe déjà pour ça.
- Il reprend les lignes de la version précédente, modifiables, et en ajoute.
- **Il se signe.** Sans signature, ce serait une révision unilatérale du prix : exactement ce contre quoi le produit existe.
- Une fois signé, il devient la version de référence ; les précédentes restent lisibles.

`assertInvoiceable` compte alors **devis initial + avenants signés**.

### 2.2 La définition de l'écart, corrigée

La spec produit écrit *« facture finale ≤ devis + avenants signés »*. Cette définition est inopérante : un avenant étant signé, l'artisan qui en fait dix reste à 100 %.

La question du demandeur n'est pas *« a-t-il respecté ses avenants ? »* mais :

> **« Quand cet artisan annonce 1 000 €, combien je paie au final ? »**

> **Décision.** L'écart se mesure entre le **devis initial** et le **total finalement facturé, avenants compris**.

**Sans tolérance.** Les montants sont des entiers en centimes et l'outil les contrôle de bout en bout : un seuil de tolérance ne servirait qu'à absorber des dépassements réels, et il faudrait ensuite le justifier.

Un artisan qui sous-devise puis rattrape par avenants obtient un mauvais chiffre — et c'est exactement le comportement dont le marché se plaint. C'est aussi ce que dit la spec ailleurs : *la vraie peur n'est pas le devis à 1 200 €, c'est la facture à 1 900 €.*

## 3. La fin de chantier

Elle n'existe nulle part : `project.status` comporte `completed`, mais rien ne l'y met et aucune date n'est conservée.

> **Décision.** Deux sources, qui ne pèsent pas pareil.

| Source | Nature | Date retenue |
|---|---|---|
| L'artisan déclare « chantier terminé », avec confirmation | **Déclarée** | Date de la déclaration |
| Une facture de solde est émise | **Authentifiée** | Date d'émission |

**C'est l'émission du solde qui compte, jamais son encaissement.** Un artisan qui a envoyé sa facture et attend son virement a un chantier terminé ; le suivi des règlements est une autre affaire, traitée depuis M2.

### 3.1 L'authentifié audite le déclaré

Une fin déclarée compte **immédiatement** dans les métriques. Mais si une facture de solde arrive ensuite, **la date authentifiée l'emporte et la métrique se recalcule** — quelle que soit l'ampleur de l'écart. Il n'y a pas de tolérance : un acte comptable ne se discute pas contre une déclaration.

Au-delà de **sept jours** d'écart, la divergence remonte comme **anomalie dans le backoffice** — la file et son mécanisme d'examen existent déjà. Sept jours parce qu'en deçà, l'écart s'explique par le délai normal entre la fin des travaux et l'émission du solde ; au-delà, il demande un regard.

Le raisonnement : refuser la déclaration pénaliserait l'artisan honnête qui ne solde pas immédiatement, et lui laisser le dernier mot ferait du délai une métrique auto-déclarée. L'acte comptable finit toujours par trancher.

## 4. Les trois métriques

Chacune se calcule sur une **fenêtre glissante de douze mois**, et n'est affichée qu'au-delà de son seuil.

| Métrique | Définition | Seuil |
|---|---|---|
| **Écart devis → facture** | Part des chantiers terminés dont le total facturé n'excède pas le devis **initial** — au centime près, sans tolérance | 10 chantiers |
| **Respect du délai annoncé** | Part des chantiers terminés dans le délai engagé, compté **en jours ouvrés** de la signature à la fin | 10 chantiers |
| **Volume de chantiers terminés** | Nombre, sur 12 mois et au total | — |

### 4.0 Jamais un taux seul

> **Décision, prise dans la spec produit avant l'écriture de ce jalon** ([§9, *Le biais de sélection*](2026-08-07-socle-artisan-design.md)) : **le volume de chantiers signés dans l'outil s'affiche à côté de chaque taux.** Jamais un taux seul.

La signature client empêche d'**inventer** un chantier. Elle n'empêche pas d'en **omettre** un. Un artisan qui comprend que ces deux taux le pénalisent sortira de l'outil ses chantiers difficiles — l'appartement occupé, le client qui change d'avis. Ce n'est pas de la fraude, c'est un arbitrage rationnel, et il est **invisible par construction** : le backoffice ne voit que ce qui entre.

Le passeport resterait exact ligne à ligne, et deviendrait faux dans ce qu'il laisse croire.

Le biais découle de la règle « seul un devis signé compte », qui est indispensable par ailleurs. On ne peut donc pas le supprimer — **seulement refuser de le masquer**. C'est la règle du seuil, étendue d'un cran : le seuil empêche d'afficher un chiffre non significatif ; le volume affiché empêche de lire un chiffre significatif comme s'il était exhaustif.

**Conséquence d'implémentation :** un taux et son volume forment **une seule valeur de retour**, jamais deux champs qu'un écran pourrait dissocier. Le type les rend indissociables ; le compilateur applique la règle plutôt que la revue.

Le délai engagé est déclaré **en jours ouvrés** — c'est ce que porte le devis depuis M1, et c'est donc ainsi qu'il doit être compté. La fonction `businessDaysSince`, écrite pour le backoffice, sert ici sans modification.

**En dessous du seuil : « pas encore assez de données », jamais un chiffre.** Une entreprise à trois chantiers parfaits paraîtrait meilleure qu'une entreprise à deux cents chantiers à 96 %.

### 4.1 Ce qui entre dans le calcul

Un chantier n'est compté que si **son devis a été signé électroniquement**. C'est la décision structurante de la spec produit : sans elle, l'artisan saisirait son propre devis et sa propre facture, et les métriques seraient auto-déclarées.

Trois exigences de l'AIPD s'appliquent ici, et elles sont d'implémentation :

- **La fenêtre glissante est imposée par le code du calcul**, pas par la discipline. Les événements sont conservés dix ans au titre de l'obligation comptable ; la lecture ne va jamais au-delà de douze mois.
- **Les exclusions sont portées par la requête**, jamais par un filtre d'affichage — comme pour la page publique de M3 et l'annuaire de M4.
- **La définition de chaque métrique est publique.** Un chiffre dont on ignore la règle de calcul est incontestable, donc arbitraire — et un droit de rectification qu'on ne peut pas exercer faute de comprendre le calcul n'est pas un droit.
- **Et elle énonce son périmètre.** Chaque définition dit explicitement qu'elle porte sur **les chantiers passés par l'outil**, non sur l'activité de l'entreprise. Ce que le produit peut promettre est *« voici ce qui s'est passé sur les chantiers que nous avons vus »*, jamais *« voici comment travaille cette entreprise »* — et c'est pourtant la seconde que le lecteur suppose tant qu'on ne le corrige pas.

## 5. La contestation

> **Décision.** C'est le **client qui arbitre**.

Il a co-signé le devis : il est le témoin qui authentifie la mesure, donc le témoin naturel pour trancher un désaccord sur les faits. Une revue interne aurait été moins chère à construire ; elle aurait fait de nous le juge de nos propres chiffres, sur un produit dont l'argument est que **la mesure ne repose pas sur notre parole**.

### 5.1 Le parcours

L'artisan conteste un chantier en motivant — *« le retard vient de l'indisponibilité du client »*. Le client reçoit un lien à jeton, **sans compte**, exactement comme pour la signature de M1. Une question, deux réponses.

Pendant l'instruction, **le chantier sort du calcul** : c'est le droit à la limitation de l'article 18, et cela évite qu'un chiffre disputé reste affiché.

### 5.2 La règle du silence

C'est le point qui décide si le mécanisme est solide ou abusable.

> **Décision. Le silence ne profite jamais à celui qui conteste.** Passé **quatorze jours** sans réponse du client, la mesure initiale s'applique et le chantier réintègre le calcul.

Sans cette règle, un artisan contesterait chaque chantier défavorable et s'appuierait sur le silence pour les neutraliser indéfiniment — ce qui serait pire que de n'avoir aucune contestation.

**Une seule contestation par chantier.** Rejouer la même contestation jusqu'à obtenir une réponse favorable viderait l'arbitrage de son sens.

### 5.3 Ce que produit un arbitrage

**Le client donne raison à l'artisan** → un **événement rectificatif** s'inscrit au journal et neutralise l'événement initial. Le journal reste intact — c'est la même règle que l'avoir qui corrige une facture sans la modifier. La métrique se recalcule.

**Le client donne tort, ou ne répond pas** → la mesure initiale s'applique.

Dans les deux cas, l'artisan conserve un **droit de déclaration complémentaire** (article 16) : il attache un contexte au chantier — *« retard imputable à l'indisponibilité du client »* — publié à côté du chiffre. **Il ne change pas le chiffre.** C'est ce qui concilie « le passeport est dérivé et non éditable » avec le droit de rectification.

## 6. M5 calcule, mais ne publie pas encore

Deux chantiers de l'AIPD conditionnent la première publication, et l'un d'eux est structurellement bloquant.

| # | Exigence | État |
|---|---|---|
| 1 | Information du client sur son rôle de témoin | À écrire — `/confidentialite` et l'écran de signature |
| 2 | **Avis des artisans concernés** (article 35.9) | **Impossible aujourd'hui : aucun artisan n'est inscrit** |

> **Décision.** M5 calcule les métriques et les montre **à l'artisan seul**. La publication attend.

Ce n'est pas un contournement, c'est l'ordre que l'AIPD demande : **notification individuelle et délai de contestation avant la première publication**. L'artisan voit son passeport se remplir, comprend comment il est calculé, et peut contester — avant que quiconque ne le voie.

La bascule vers le public sera un geste explicite, une fois les deux lignes ci-dessus traitées.

## 7. Modèle de données

Le journal d'événements existe et porte déjà l'essentiel. S'ajoutent :

```
quote                  (modifié)  supersedes_quote_id  uuid    -- l'avenant pointe sa version precedente
project                (modifié)  completed_at         timestamptz
                                  completion_source    text    -- 'declared' | 'invoiced'

metric_dispute
  id            uuid
  quote_id      uuid          -- le chantier conteste
  reason        text          -- motive, obligatoire
  public_token  text          -- le lien du client, comme pour la signature
  opened_at     timestamptz
  expires_at    timestamptz   -- quatorze jours
  verdict       text          -- 'upheld' | 'rejected' | 'expired'
  answered_at   timestamptz
  unique (quote_id)           -- une seule contestation par chantier

metric_statement                -- la declaration complementaire, article 16
  id            uuid
  quote_id      uuid
  body          text
  created_at    timestamptz
```

Aucune métrique n'est stockée : **elles se calculent à la lecture**, comme la visibilité de M3, le reste à facturer de M2 et la file d'anomalies du backoffice.

## 8. Ce que M5 ne fait pas

- **Aucune publication publique des métriques.** §6.
- **Aucune métrique dépendant de l'agenda** — présence aux rendez-vous, délai de remise du devis. M7.
- **Aucun classement par métrique dans l'annuaire.** Le classement de M4 reste la proximité : introduire les métriques dans l'ordre des résultats est une décision produit à part entière, et elle mérite son propre examen.
- **Aucune note, aucune étoile.** Jamais.
- **Aucun avenant non signé.** Une révision unilatérale du prix n'est pas un avenant.

## 9. Vérification

- **Les trois métriques** : fonctions pures, testées au seuil — juste en dessous, juste au-dessus — et sur la fenêtre glissante, avec un chantier hors fenêtre qui ne doit pas compter.
- **L'écart** : un test montre qu'un chantier soldé au prix du devis initial compte comme respecté, et qu'un chantier rattrapé par avenant compte comme dépassé. C'est la définition du §2.2, et c'est elle qui rend la métrique non vacante.
- **La fin de chantier** : un test montre qu'une déclaration compte immédiatement, et qu'un solde postérieur à date différente **l'emporte et fait recalculer**.
- **La contestation** : un test montre qu'un chantier contesté sort du calcul, qu'il y revient au bout de quatorze jours sans réponse, et qu'une seconde contestation est refusée.
- **Le parcours** : de l'avenant signé à la métrique recalculée après arbitrage.

## 10. Ce qui reste ouvert

- **Le délai de quatorze jours** est un pari. À revoir sur observation.
- **Le seuil de dix chantiers** vient de la spec produit et n'a jamais été confronté au réel. Il sera probablement trop haut au démarrage — mais l'abaisser publierait des chiffres non significatifs, ce qui est pire.
- **Le classement de l'annuaire par métrique** est délibérément hors périmètre : c'est le moment où le passeport devient une monnaie, et cela mérite d'être décidé seul, pas en passant.
