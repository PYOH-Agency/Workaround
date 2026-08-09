# M7 — L'agenda et les rendez-vous

> Spec de conception · Date : 2026-08-09 · Statut : à valider

**Références :** [spec P1 §6 et §9](2026-08-07-socle-artisan-design.md) · [spec M5](2026-08-08-m5-metriques-design.md) · [AIPD](../rgpd/2026-08-08-aipd-passeport.md)

---

## 1. Ce que l'examen a révélé

### Un agenda qui ne rejoint pas son téléphone est un deuxième agenda

Et un deuxième agenda perd toujours. L'artisan note ses rendez-vous là où il les note déjà ; le nôtre se vide en deux semaines, et les métriques qui en dépendent deviennent fausses sans que rien ne le signale.

> **La synchronisation n'est pas un confort de ce jalon : c'en est la condition de survie.**

### Les deux métriques bloquées ne se débloquent pas également

| Métrique promise | Ce qu'elle exige | Constat |
|---|---|---|
| Délai médian de remise du devis | RDV de visite → envoi du devis | **Mesurable** : les deux bouts sont des faits que l'outil tient |
| Taux de présence aux RDV | Un témoin de la présence | **Sans témoin fiable** — voir §5.2 |

### Ce que le code sait déjà faire

`createProject` crée le client, le logement et le chantier d'un seul geste ; le travail de fond quotidien tourne depuis M3 ; l'envoi de courriel depuis M1. **Rien de l'infrastructure n'est à inventer** — seuls le rendez-vous, la synchronisation et une métrique le sont.

## 2. Le rendez-vous appartient au chantier

> **Décision.** Un rendez-vous se pose **toujours sur un chantier**, jamais dans le vide.

C'est la seule chose qui distingue notre agenda de celui de son téléphone : le rendez-vous y porte **l'adresse, le client, son numéro** — et, pour une intervention, le devis. Un rendez-vous sans chantier serait une ligne de calendrier de plus, et il n'aurait aucune raison d'être saisi ici.

Conséquence de parcours : prendre un rendez-vous de visite commence par créer le chantier. Ce n'est pas une friction ajoutée — l'artisan devra le créer de toute façon pour établir son devis, et le faire d'abord donne au délai de remise ses deux extrémités.

Deux types, et ils ne se ressemblent pas :

| Type | Quand | Ce qu'il précède ou suit |
|---|---|---|
| **Visite** | Avant le devis | C'est lui qui ouvre le délai de remise |
| **Intervention** | Après la signature | Il s'inscrit au fil de chantier de M6·B |

## 3. La synchronisation

### 3.1 Le flux sortant : un abonnement privé

> **Décision.** Une adresse d'abonnement **iCalendar** (RFC 5545), propre à l'entreprise, qu'elle colle dans Google, Apple ou Outlook.

Ses rendez-vous D'équerre apparaissent alors partout, en lecture seule, sans qu'aucun compte ne soit connecté. **C'est le seul mécanisme qui marche chez les trois**, et il ne coûte qu'une route.

Le jeton de l'adresse **est** l'autorisation : il doit être révocable et régénérable d'un clic, et l'écran doit dire ce que le flux contient — nom du client, adresse, téléphone. Le coller dans Google, c'est confier ces informations à Google ; c'est le geste de l'artisan, sur les données de ses propres clients, et il doit le faire en le sachant.

### 3.2 L'import : Google et Microsoft, et pourquoi pas Apple

> **Décision.** Import des **créneaux occupés** chez Google et Microsoft, par OAuth. **Apple est exclu**, et l'écran le dit.

La raison n'est pas la difficulté, c'est la nature de ce qu'il faudrait détenir.

| Fournisseur | Mécanisme | Ce que nous devrions garder |
|---|---|---|
| **Google** | OAuth, portée `calendar.freebusy` | Un jeton de rafraîchissement **limité aux créneaux occupés**, révocable par l'artisan depuis son compte Google |
| **Microsoft** | OAuth, permission `Calendars.ReadBasic` | Idem |
| **Apple** | CalDAV uniquement | Un **mot de passe d'application iCloud**, à seize caractères, qu'il génère à la main — et qui ouvre ses services iCloud par ces protocoles, pas seulement son agenda |

Le jeton Google ne donne accès qu'aux intervalles d'occupation et se révoque en un clic côté Google. Le mot de passe Apple ne se limite à rien et ne se révoque que chez Apple. **Ce serait le premier secret d'utilisateur que le produit conserverait, et il serait le plus large possible.**

> **Conséquence assumée.** Un artisan sur iPhone verra ses rendez-vous D'équerre dans son agenda, mais nous ne lirons pas le sien. L'écran doit le dire en toutes lettres plutôt que de laisser un bouton grisé sans explication.

**Un chantier à ouvrir avant toute mise en ligne publique :** lire un agenda est une portée *sensible* chez Google, ce qui impose une **vérification de l'application** — domaine vérifié, politique de confidentialité, vidéo de démonstration, revue de plusieurs semaines. Le Calendrier ne figure en revanche pas parmi les portées *restreintes* : **aucun audit de sécurité annuel** n'est exigé, contrairement à Gmail ou Drive.

### 3.3 Rien de son agenda n'est conservé

> **Décision structurante.** Les créneaux occupés sont interrogés **à la lecture**, jamais stockés, jamais mis en cache.

C'est la même règle que partout ailleurs — la visibilité de M3, le classement de M4, les métriques de M5 — et ici elle a une conséquence supplémentaire : nous ne détenons à aucun moment l'agenda personnel de l'artisan.

Les deux API choisies vont dans le même sens : `freebusy.query` chez Google et `getSchedule` chez Microsoft ne rendent **que des intervalles d'occupation, sans aucun titre**. Nous ne savons pas qu'il est chez le dentiste ; nous savons qu'il est pris.

> **Et une panne n'affiche jamais « libre ».** Si l'appel échoue, l'écran dit que la disponibilité n'a pas pu être lue. Afficher un créneau libre faute de réponse le ferait se doubler un rendez-vous.

## 4. Le rappel au client

> **Décision.** Un **courriel**, la veille. Un seul, aucune relance.

Le client qui a oublié fait perdre une demi-journée à l'artisan, et c'est une de ses plaintes les plus concrètes. Ce n'est pas de la génération de demande — le rendez-vous est déjà pris — donc ce n'est pas P3.

Pas de SMS en P1 : il coûte à chaque envoi, il est plus intrusif, et rien ne prouve encore qu'il change quoi que ce soit. Le courriel se compare à lui-même le jour où la question se posera.

Le rappel part du travail de fond quotidien qui tourne déjà. **Un rendez-vous annulé n'en déclenche aucun**, et un rappel qui n'a pas pu partir ne s'inscrit pas au journal — c'est la leçon de M3, où un préavis jamais envoyé s'était consigné comme envoyé.

## 5. Ce que M7 mesure, et ce qu'il ne mesure pas

### 5.1 Le délai de remise du devis

> **Décision.** Du **premier rendez-vous de visite** du chantier à l'**envoi du premier devis**, en **jours calendaires**, médiane sur douze mois glissants.

Jours calendaires, et non ouvrés : c'est le délai que la personne qui attend son devis a réellement vécu. Le jour ouvré sert à mesurer un engagement annoncé — c'est le cas du délai de chantier de M5 —, pas une attente subie.

**Le rendez-vous n'est pas antidatable utilement.** Sa date est saisie par l'artisan, mais le journal horodate sa création : un rendez-vous créé après l'envoi du devis se verrait.

> **Correction de la spec produit.** Le tableau des métriques annonce un seuil de **5 observations** pour cette métrique, quand M5 en a verrouillé **10** pour les autres. Deux seuils différents sur un même passeport seraient indéfendables — *« pourquoi dix ici et cinq là ? »* — et l'argument des dix vaut identiquement : cinq délais parfaits ne disent rien de plus que cinq délais. **Le seuil est dix.**

Et comme en M5·B, **jamais un chiffre sans son volume**. La médiane et le nombre d'observations forment une seule valeur de retour, que le type rend indissociables.

### 5.2 La présence : pourquoi elle attend

Le taux de présence exige un témoin. Au moment d'un rendez-vous de visite, le prospect **n'a pas de compte, pas de devis signé, aucun lien avec nous** — il est peut-être en train de faire venir trois entreprises.

On pourrait lui envoyer un lien à jeton, comme l'arbitrage de M5. Mais ceux qui répondraient seraient ceux que la visite a fâchés, et le volume affiché à côté du taux ne corrigerait rien : **en M5·B le volume dit sur quoi le taux porte ; ici, le volume lui-même serait biaisé.** Un taux de 60 % sur trois réponses pour quarante rendez-vous n'est pas un chiffre imprécis, c'est un chiffre faux.

> **Décision. M7 ne construit pas le taux de présence.** Il attend un mécanisme qui produise une observation non biaisée. Le tableau des métriques de la spec produit doit être corrigé en conséquence.

C'est la même règle qu'en M5, où quatre métriques sur sept ont été écartées : **une métrique qu'on ne peut pas mesurer honnêtement ne se publie pas à moitié.**

## 6. Modèle de données

```
appointment
  id            uuid
  project_id    uuid          -- un rendez-vous se pose TOUJOURS sur un chantier
  company_id    uuid
  kind          text          -- 'visit' | 'work'
  starts_at     timestamptz
  ends_at       timestamptz
  status        text          -- 'scheduled' | 'cancelled'
  note          text
  created_at    timestamptz   -- horodatage de saisie : c'est lui qui rend la date non antidatable
  cancelled_at  timestamptz

company.agenda_feed_token   text  -- l'abonnement iCalendar, revocable

calendar_connection
  id                 uuid
  company_id         uuid
  provider           text        -- 'google' | 'microsoft'
  account_email      text        -- pour qu'il sache QUEL compte est connecte
  refresh_token_enc  text        -- chiffre au repos, cle hors depot
  connected_at       timestamptz
  revoked_at         timestamptz
  unique (company_id, provider)
```

**Aucune table de disponibilité.** Les créneaux occupés ne sont jamais écrits : §3.3.

## 7. Ce que M7 ne fait pas

- **Aucune réservation par le demandeur.** C'est la marketplace — P2. Savoir quand l'artisan est libre ne sert qu'à lui proposer un créneau, et c'est précisément ce que P1 s'interdit.
- **Aucun « créneau vert »** — l'artisan qui passe déjà dans le quartier. P2.
- **Aucun taux de présence.** §5.2.
- **Aucun import Apple.** §3.2.
- **Aucun rappel par SMS.** §4.
- **Aucune écriture dans son agenda externe.** Le flux est sortant et en lecture seule ; écrire chez Google supposerait la portée large que nous refusons.
- **Aucune gestion d'équipe.** Affecter un rendez-vous à un compagnon suppose les rôles, qui sont M8.

## 8. Vérification

- **Le flux iCalendar** : un test lit le flux produit et vérifie qu'il est valide, qu'il contient les rendez-vous de cette entreprise **et d'aucune autre**, et qu'un jeton révoqué ne rend plus rien.
- **L'import ne stocke rien** : un test vérifie qu'aucune table ne contient de créneau après consultation de l'écran.
- **La panne n'affiche pas « libre »** : un test simule l'échec de l'appel et exige que l'écran le dise.
- **Le rappel** : un test montre qu'un rendez-vous annulé n'en déclenche aucun, et qu'un envoi échoué ne s'inscrit pas au journal.
- **Le délai de remise** : fonction pure, testée au seuil — juste en dessous, juste au-dessus — et sur un chantier dont le devis a précédé la visite, qui doit être écarté.
- **Le parcours** : de la prise de rendez-vous à l'apparition du délai dans le passeport privé.

## 9. Ce qui reste ouvert

- **La vérification Google** est un chantier administratif à lancer bien avant la mise en ligne publique : plusieurs semaines, et elle conditionne l'import pour tout le monde sauf les comptes de test.
- **Le chiffrement des jetons** suppose une clé hors dépôt, à faire figurer au contrôle d'environnement. Sa rotation n'est pas conçue.
- **Apple restera exclu** tant qu'Apple n'ouvrira pas d'OAuth calendrier. Si la population d'artisans se révèle massivement sur iPhone, la question reviendra — et la réponse ne sera toujours pas de détenir leur mot de passe iCloud.
- **Le rappel client n'a pas de préférence de désabonnement.** Un rendez-vous étant un service rendu et non une prospection, cela se défend en P1 ; cela ne se défendra plus le jour où le produit enverra autre chose.
