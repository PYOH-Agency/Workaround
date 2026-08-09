# M8 — L'offre payante

> Spec de conception · Date : 2026-08-10 · Statut : à valider
>
> **Trois plans d'implémentation en découlent**, exécutés dans cet ordre. Chacun produit un logiciel utilisable seul :
> **A · Le plan et l'équipe** → **B · Les situations et la retenue** → **C · Les relances**.

**Références :** [spec P1 §11](2026-08-07-socle-artisan-design.md) · [spec M5](2026-08-08-m5-metriques-design.md) · [spec M6](2026-08-09-espace-demandeur-design.md)

---

## 1. Ce que l'examen a révélé

| Constat | Conséquence |
|---|---|
| `member.role` existe depuis M1 et **aucune ligne de code ne le lit** | La seule autorisation du produit est le périmètre par entreprise. Tout est à écrire |
| Les factures `progress` ont des **lignes en texte libre**, sans lien avec le devis | Rien n'empêche de facturer 120 % d'une ligne : seul le total global est gardé |
| `paymentStatus` rend déjà `overdue` | L'impayé est **détecté** ; c'est le geste qui manque |
| Aucune notion de retenue de garantie | Une relance chasserait des sommes que le client a le droit de retenir — voir §4.3 |

## 2. Le plan, et pourquoi la porte vient d'abord

> **Décision.** M8 livre les fonctions Pro et **la porte qui les garde**. Il ne livre **pas** l'encaissement.

`company.plan` vaut `free` ou `pro`. Le passage se fait à la main, depuis le backoffice de supervision.

**Pourquoi la porte dès maintenant.** L'ajouter plus tard reviendrait à **retirer quelque chose à des gens qui l'avaient** — c'est le pire geste qu'un produit puisse faire, et il est irréparable en confiance. La porte existe donc avant le premier client Pro.

**Pourquoi pas l'encaissement.** Nos propres factures, notre TVA, nos propres relances d'abonnement : c'est un produit à part entière, et il ne sert personne tant qu'aucun artisan n'est inscrit. Les dix premiers clients d'un abonnement se basculent à la main de toute façon — et cela laisse apprendre le prix avant de l'automatiser.

> **Le capteur reste gratuit à vie.** Devis, facture, passeport, agenda, espace demandeur : rien de ce qui existe aujourd'hui ne passe derrière la porte. **Aucune régression de périmètre**, sans exception — c'est ce qui fait vivre le label, et le monnayer le tuerait.

Ce qui passe derrière la porte, et rien d'autre :

| Fonction | Pourquoi elle est Pro |
|---|---|
| Équipe et rôles | N'a de sens qu'à partir de deux personnes — donc d'une entreprise qui a du revenu |
| Situations de travaux | Le chantier long et découpé, pas le chauffe-eau du samedi |
| Relances d'impayés | Le suivi qui coûte du temps quand il y a du volume |

## 3. L'équipe et les rôles

> **Décision. Deux rôles, et pas un de plus.**

| Rôle | Ce qu'il peut | Ce qu'il ne peut pas |
|---|---|---|
| `owner` | Tout | — |
| `member` | L'agenda, le fil de chantier, consulter les devis | **Toucher à l'argent** : émettre, encaisser, relancer, ni voir le passeport |

Trois rôles auraient produit une matrice que personne ne sait remplir. Deux se décrivent en une phrase : **le compagnon fait le chantier, le patron fait l'argent.**

> **Décision. L'autorisation vit dans le code, testable — jamais dans une politique de base de données.** C'est la règle posée dès M1 et elle ne change pas ici : `currentCompany()` rend déjà le rôle, il suffit de le lire.

**L'invitation** se fait par adresse électronique, avec le lien magique déjà en place. Un membre invité qui se connecte rejoint l'entreprise ; il n'a pas de page publique — §5 de la spec produit, et la raison y est dite : *un patron ne veut pas que ses compagnons aient une vitrine personnelle avec agenda*.

> **Un membre retiré ne disparaît pas.** Il perd l'accès, ses publications au fil de chantier restent. Effacer sa trace réécrirait un chantier.

## 4. Les situations de travaux

### 4.1 Ce qui manque aujourd'hui

Une facture `progress` porte des lignes libres. La situation de travaux du bâtiment, elle, énonce **l'avancement de chaque ligne du devis**, en cumulé.

> **Décision.** Une situation déclare un **pourcentage d'avancement par ligne du devis**. Le montant de la facture est la **différence avec la situation précédente**.

Trois conséquences, toutes bonnes :

- **On ne peut plus facturer 120 % d'une ligne** — la garde descend du total global à la ligne.
- L'historique se lit : situation n° 3 dit où en est le chantier, pas seulement ce qui reste dû.
- La métrique « écart devis → facture » de M5 s'en trouve **plus difficile à contourner**, puisque chaque euro facturé se rattache à une ligne devisée.

**Les avenants s'y ajoutent naturellement** : un avenant signé apporte ses lignes, qui deviennent avançables comme les autres.

### 4.2 Ce qu'une situation n'est pas

- **Ni un métré**, ni un attachement : on déclare un pourcentage, pas des quantités réalisées. Le métré appartient au conducteur de travaux, et il ne se saisit pas sur un téléphone.
- **Ni une révision de prix**. L'indexation BT01 relève des marchés longs et des maîtres d'œuvre — hors P1, et personne ne l'a demandée.

### 4.3 La retenue de garantie

**Vérifié dans le texte**, parce qu'une erreur ici priverait un artisan de 5 % de son chantier ou ferait chasser un client pour une somme qu'il a le droit de garder.

| Ce que dit la loi n° 71-584 du 16 juillet 1971 | Ce que le produit en fait |
|---|---|
| Elle est **facultative et contractuelle** — « peuvent être amputés » | Elle se stipule **au devis**, jamais par défaut |
| **5 % au plus** des acomptes | Le taux est saisi, et borné à 5 |
| Le maître d'ouvrage **doit consigner** les sommes chez un tiers | **Nous ne consignons rien** — l'écran le dit, c'est son obligation |
| Libérée **un an après la réception**, sauf opposition motivée | L'échéance se calcule depuis la **réception déclarée en M6·B** |

> **Décision structurante.** Une somme retenue **n'est pas un impayé**. Elle sort du montant exigible et n'entre dans aucune relance.

Sans cette règle, la séquence de relances du §5 poursuivrait un client pour 5 % qu'il est en droit de garder pendant un an — et l'artisan qui découvrirait ce message se retournerait contre l'outil, à juste titre.

La réception déclarée par le client en M6·B trouve ici son second usage : elle ouvre les garanties légales, **et** elle démarre le compte à rebours de la retenue. Une date, deux effets, aucun doublon.

## 5. Les relances d'impayés

> **Décision. Armées par l'artisan, puis automatiques.**

À l'émission d'une facture, il arme la relance et **voit le calendrier avant de le déclencher**. C'est l'automatisme qui a de la valeur — l'oubli est le problème — mais il doit l'avoir voulu : un message part à **son** client, en **son** nom.

| Échéance | Ton | Ce que le message porte |
|---|---|---|
| J+7 après l'échéance | Courtoise | « Cette facture est peut-être passée inaperçue » |
| J+21 | Ferme | Le montant, la date d'échéance, le moyen de régler |
| J+45 | Formelle | Les **pénalités et l'indemnité de 40 €** déjà imprimées sur la facture (art. L441-10) |

**Trois arrêts, et ils sont tous automatiques :**

- Un **paiement enregistré** arrête la séquence, quel qu'en soit le montant restant.
- Un **avoir** l'arrête aussi : la facture n'est plus due.
- L'artisan peut l'arrêter à tout moment, sans avoir à se justifier.

> **Aucune quatrième relance.** Au-delà, ce n'est plus une relance, c'est une mise en demeure — un acte juridique qui engage, et qui ne se déclenche pas tout seul. L'outil s'arrête là et le dit.

**Un seul message par échéance, jamais deux.** Même règle qu'au rappel de rendez-vous de M7 : l'événement n'est écrit **que si le message est parti**, sans quoi le journal attesterait d'une relance jamais envoyée.

## 6. Modèle de données

```
company.plan            text    -- 'free' | 'pro', bascule a la main

member                  (existant) -- role enfin LU par le code
member_invitation
  id, company_id, email, role, token, invited_at, accepted_at, revoked_at

quote.retention_rate    integer -- en points de pourcentage, 0 a 5. 0 = aucune
quote.received_at       (existant, M6·B) -- demarre le compte a rebours d'un an

situation
  id, quote_id, company_id, number, issued_at, invoice_id
situation_line
  situation_id, quote_line_id, progress_percent   -- CUMULE, pas incremental

dunning_plan
  invoice_id, armed_at, stopped_at, stopped_reason
  unique (invoice_id)
```

Aucun montant n'est stocké dans `situation` : ils se **recalculent** depuis les lignes du devis et les pourcentages — comme le reste à facturer de M2, la visibilité de M3 et les métriques de M5.

## 7. Ce que M8 ne fait pas

- **Aucun encaissement d'abonnement.** §2.
- **Aucune régression du gratuit.** Rien de ce qui existe ne passe derrière la porte.
- **Aucune mise en demeure**, aucun recouvrement, aucune cession de créance. §5.
- **Aucune consignation de fonds.** Nous n'en avons ni le droit ni l'envie. §4.3.
- **Aucun métré, aucune révision de prix.** §4.2.
- **Aucun troisième rôle.** §3.
- **Aucune page publique pour un compagnon.** Décision de la spec produit, inchangée.

## 8. Vérification

- **La porte** : un test montre qu'une entreprise `free` ne peut ni ouvrir ni appeler les fonctions Pro — la garde est portée par le service, pas par l'écran.
- **Aucune régression** : un test montre qu'une entreprise `free` fait toujours tout ce qu'elle faisait avant. C'est le test le plus important du jalon.
- **Le rôle** : un `member` se voit refuser l'émission d'une facture **par le service**, et l'écran ne la lui propose pas.
- **La situation** : un test montre qu'on ne peut pas dépasser 100 % sur une ligne, et qu'une facture vaut la différence avec la situation précédente.
- **La retenue** : un test montre qu'une somme retenue n'entre pas dans le montant exigible, et **qu'aucune relance ne la poursuit**.
- **Les relances** : un paiement arrête la séquence ; une relance non partie ne s'inscrit pas au journal ; il n'y a jamais de quatrième.
- **Le parcours** : d'une entreprise basculée en Pro à une situation facturée, puis relancée.

## 9. Ce qui reste ouvert

- **Le prix n'est pas décidé.** La spec produit annonce 30–80 €/mois par comparaison ; rien ne le confirme sur le terrain. La bascule manuelle est précisément ce qui permet de l'apprendre.
- **La retenue de garantie suppose une réception déclarée.** Sans elle, la date de libération reste inconnue et l'écran le dit — mais un client qui ne déclare jamais sa réception bloque de fait la retenue de son artisan. À surveiller : c'est le genre de blocage qui se règle par téléphone, et le produit doit au moins le rendre visible.
- **Un membre ne peut pas être rattaché à plusieurs entreprises.** `member.user_id` est unique. Un intérimaire ou un sous-traitant y buterait ; personne ne l'a demandé.
- **La relance ne connaît pas les jours fériés ni les congés d'août.** Une relance ferme le 15 août tombe mal. À revoir sur usage réel.
