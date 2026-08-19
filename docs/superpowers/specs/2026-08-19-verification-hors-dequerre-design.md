# Vérification d'un artisan hors D'équerre — Design

> Spec du parcours déclenché par un SIRET sans couverture publiée : ce que voit
> le demandeur, ce que reçoit l'artisan, ce que mesure l'admin.
> Date : 2026-08-19 · Statut : à valider
> S'appuie sur : [Sources de vérification — cadrage M3](../research/2026-08-08-sources-de-verification.md),
> [AIPD du passeport](../rgpd/2026-08-08-aipd-passeport.md)

---

## 1. Le problème

Aujourd'hui, un demandeur qui saisit le SIRET d'une entreprise absente de
D'équerre reçoit une fin de non-recevoir : *« Cette entreprise n'a pas encore de
page publique sur D'équerre. »* Il repart sans réponse, et l'artisan n'apprend
jamais qu'on l'a cherché.

Trois sources ouvertes sont pourtant déjà intégrées et testées en direct —
[`company-lookup`](../../../src/services/company-lookup.ts) (recherche-entreprises),
[`rge-lookup`](../../../src/services/rge-lookup.ts) (ADEME),
[`legal-checks`](../../../src/services/legal-checks.ts) (BODACC). Elles répondent
pour n'importe quel SIRET, inscrit ou non.

**Mais aucune ne dit un mot de l'assurance décennale**, et la décennale est tout
le produit. API Entreprise nous est fermée structurellement : ce que nous ne
récupérons pas, l'artisan doit le fournir.

> **Le risque, donc.** Une page qui affiche « entreprise active ✓, aucune
> procédure ✓, RGE ✓ » produit trois coches vertes et un silence exactement là où
> le risque se trouve. C'est le piège que [`/verifier`](../../../src/app/verifier/page.tsx)
> dénonce sur une page entière, reproduit par nos soins. Un demandeur rassuré par
> une fiche muette sur la couverture, c'est le dommage précis que D'équerre
> prétend éviter.

Toute la spec découle de ce renversement : **la page n'est pas une vérification,
c'est le constat d'une absence** — et l'absence est le message.

---

## 2. Les deux publics, deux surfaces

Le parcours sert à parts égales le demandeur et l'acquisition artisan. Mais les
deux ne lisent jamais le même écran.

| | Demandeur | Artisan |
|---|---|---|
| Surface | La page `/verification/[siret]` | Un mail, déclenché par son client |
| Message | Ce qu'on ne peut pas affirmer | Ce qu'on sait déjà de lui, et ce qui manque |
| Moment | Immédiat | Après action du demandeur |

> **Décision.** Parts égales dans le résultat, jamais sur le même écran. Une page
> qui plaide sa cause auprès de l'artisan devant le demandeur trahit le
> demandeur ; l'inverse gâche le meilleur canal d'acquisition disponible — un
> artisan sollicité par son propre client.

---

## 3. Le parcours et les routes

### 3.1 L'aiguillage

Le champ de [`SiretLookup`](../../../src/ui/organisms/siret-lookup.tsx) reste
inchangé sur `/` et `/verifier`. C'est
[`lookupCompany`](../../../src/actions/public.ts) qui change de branchement.

| Cas | Aujourd'hui | Demain |
|---|---|---|
| SIRET mal formé | erreur de champ | inchangé |
| **A** — couverture publiée | `redirect('/artisan/[slug]')` | inchangé |
| **B** — inscrit, aucune activité couverte | message « pas de page publique » | `redirect('/verification/[siret]')` |
| **C** — non inscrit | même message | `redirect('/verification/[siret]')` |

### 3.2 L'invariant qui survit

`publicProfile` renvoie `null` pour B comme pour C, et le commentaire d'origine
posait que **l'indistinction est acquise par construction, et qu'il ne faut
surtout pas l'affiner, sinon le formulaire devient un test d'existence.**

> **Décision.** B et C partagent la redirection **et** la page. L'indistinction
> change de branche mais ne change pas de nature. Aucune phrase de la page ne
> mentionne jamais l'appartenance à D'équerre — ni pour la nier, ni pour la
> confirmer, ni pour l'adoucir. Le serveur, lui, connaît la différence : elle ne
> sert qu'à choisir le corps du mail envoyé à l'artisan.

### 3.3 La page

`/verification/[siret]`, server component.

- `metadata.robots = { index: false, follow: false }`, plus une règle dans
  `robots.txt`
- **pas de slug nominatif** : le SIRET dans l'URL, jamais le nom
- l'open data est refetché à chaque visite ; **la page n'écrit rien**, ne fige
  rien en base
- adressable et partageable : le demandeur transmet le lien, l'artisan voit ce
  que son client a vu

> **Décision.** `noindex`, et pas de page publique référencée. Publier une fiche
> non sollicitée sur un tiers, c'est le modèle societe.com : une AIPD à rouvrir,
> et une contradiction frontale avec un produit dont l'argument est la confiance.

### 3.4 Le journal de consultation s'écrit dans l'action, pas dans la page

Une page qui écrit au rendu compte les préchargements, les robots et les
rechargements — et `/verification/[siret]` est partageable, donc revisitée.

> **Décision.** `verification_lookup` est écrit par `lookupCompany` — un POST,
> déclenché par un humain qui a tapé un SIRET. La mesure porte sur les
> **recherches**, pas sur les affichages.

---

## 4. Ce que voit le demandeur

Trois blocs, et l'ordre est le message.

### 4.1 Le verdict, en tête

Il porte sur nous, jamais sur l'artisan.

> **Nous ne pouvons rien affirmer sur l'assurance de cette entreprise.**
> Aucune attestation vérifiée ne nous a été transmise. Une garantie décennale ne
> figure dans aucun registre public : seule l'attestation de l'assureur la nomme,
> activité par activité.

Ce que la phrase ne dit jamais : « n'est pas inscrit » (fuite du cas B), « n'est
pas assuré » (faux, et diffamatoire), « n'est pas fiable ».

### 4.2 L'identité, pour lever le doute d'homonymie

Raison sociale, forme juridique, commune, date de création. Sa seule fonction est
de confirmer qu'on parle de la bonne entreprise. **Ni dirigeants, ni effectif, ni
RGE, ni chiffres.**

### 4.3 Les alertes, seulement si elles existent

Via [`legal-checks`](../../../src/services/legal-checks.ts), qui lit déjà BODACC
et distingue la conciliation (signal, non bloquant) de la liquidation : cessation
d'activité, procédure collective, radiation, rétablissement professionnel.

Une alerte remonte **au-dessus** du verdict : « cette entreprise est en
liquidation judiciaire » prime sur tout le reste.

### 4.4 La règle qui tient l'écran

> **Décision. Aucune coche verte nulle part.** Pas de « ✓ entreprise active »,
> pas de score, pas de badge, pas de RGE. La page ne peut jamais rassurer —
> seulement identifier ou alerter. Le silence reste du silence, et il est nommé
> comme tel :
>
> *« L'absence d'alerte ne signifie pas que tout va bien. Nous n'affichons que ce
> que les registres signalent. »*

C'est la règle qui empêche la page de devenir la caution qu'elle prétend refuser.
Toute proposition ultérieure d'y ajouter un signal positif doit être lue comme
une régression, pas comme un enrichissement.

### 4.5 L'action, en pied de page

Un bloc, deux chemins :

- **« Demander l'attestation pour moi »** — prénom, adresse du demandeur, adresse
  de l'artisan, case *« prévenez-moi dès que c'est vérifié »* **cochée par
  défaut**
- **« Copier le message »** — un texte prêt à coller avec le lien de la page,
  pour SMS ou WhatsApp

> **Décision.** Le champ « envoyer pour moi » ne prend **que** l'adresse mail,
> pas le mobile. Un SMS non sollicité à un professionnel relève d'un régime de
> consentement bien plus strict. Le canal mobile existe — c'est « copier le
> message », envoyé par le demandeur depuis son propre téléphone — mais il ne
> part jamais de nos serveurs.

---

## 5. Les messages

### 5.1 À l'artisan, cas C (non inscrit)

Objet : **« [Prénom] vous demande votre attestation décennale »**. Expéditeur
D'équerre, `reply-to` le demandeur. Le corps dit, dans l'ordre : qui demande, ce
qui est demandé, où déposer.

Puis l'accroche, **seulement si elle existe** :

> Nous savons déjà que vous êtes RGE — Qualibat, remplacement de chaudière
> gaz/fioul, valide jusqu'au 7 mars 2028. Il ne manque que votre décennale.

> **Décision.** Le détail RGE de l'ADEME (qualification, organisme, dates) vit
> **dans le mail à l'artisan**, où il prouve qu'on connaît son métier — et pas
> sur la page du demandeur, où il rassurerait à tort.

Le lien mène à l'inscription **avec le SIRET pré-rempli**.

### 5.2 À l'artisan, cas B (inscrit)

Même objet, autre corps : on ne lui demande pas de s'inscrire. Selon son état —
attestation expirée (« votre client attend, déposez la nouvelle »), en cours de
revue (« nous la vérifions, votre client sera prévenu »). Une attestation refusée
n'est pas rappelée ici : elle l'a déjà été par le circuit de contestation.

### 5.3 Les gardes de l'envoi

- **un seul envoi, jamais de relance automatique**
- un lien *« je ne souhaite pas être contacté par D'équerre »* qui inscrit
  l'adresse dans `mail_optout`, consultée avant tout envoi

Sans ces deux points, l'intérêt légitime ne tient pas.

### 5.4 Au demandeur, trois mails au maximum

1. confirmation d'envoi, avec le lien de la page
2. **la couverture est publiée** → « voici ce qui est couvert », lien vers
   `/artisan/[slug]`
3. à J+30, si rien n'est arrivé → « nous n'avons rien reçu ; demandez-lui
   l'attestation directement, voici quoi y regarder » — puis la demande est
   anonymisée

---

## 6. Le modèle de données

Deux tables, dans un nouveau `src/db/schema/lead.ts`.

### 6.1 `verification_lookup` — l'événement, sans personne dedans

```
id, siret, outcome, entry, looked_up_at
```

- `outcome` ∈ `covered` | `uncovered_member` | `stranger` | `unknown_siret`
- `entry` ∈ `pro` | `demandeur`

> **Décision.** Le cas A (`covered`) est journalisé lui aussi. Sans lui,
> l'entonnoir n'a pas de dénominateur et on ne peut pas dire quelle part des
> recherches tombe dans le vide.

Rien d'autre : **pas d'IP, pas de session, pas d'agent**.

### 6.2 `attestation_request` — la demande

```
id, siret, company_id?, requester_name?, requester_email?, artisan_email?,
channel, notify, requested_at,
registered_at?, covered_at?, covered_notified_at?, expiry_notified_at?
```

- `channel` ∈ `sent` | `copied`. En `copied` on n'enregistre que l'intention —
  aucun contact, aucun mail, `notify` à `false`. En `sent`, prénom, adresse du
  demandeur et adresse de l'artisan sont requis.
- `company_id` n'est renseigné qu'au cas B.

> **Décision. Aucun `status` stocké.** L'état d'une demande se recalcule à la
> lecture, comme la visibilité, la retenue de garantie et les métriques du
> passeport. Les colonnes `registered_at`, `covered_at` et `*_notified_at` ne
> sont pas des états mais des **faits** : les deux premières figent une
> attribution avant l'anonymisation (§ 6.4), les deux dernières rendent les
> envois idempotents.

### 6.3 Les gardes

Sur le modèle éprouvé de
[`quote_link_request`](../../../src/db/schema/quote-link-request.ts) et
[`isRateLimited`](../../../src/domain/rate-limit.ts) :

| Garde | Valeur | Protège |
|---|---|---|
| Demandes par adresse de demandeur | 3 / heure | Nos serveurs |
| Demandes par couple (SIRET, demandeur) | 1 / 24 h | L'artisan |
| **Mails par artisan, tous demandeurs confondus** | **1 / 7 jours** | **L'artisan** |
| Liste d'opposition `mail_optout` | consultée avant tout envoi | L'artisan |

La troisième est celle qui compte : elle empêche un harcèlement que nous aurions
industrialisé.

### 6.4 La rétention, par anonymisation

> **Décision.** À 30 jours — ou dès l'envoi du mail « couverture publiée », qui
> rend les contacts inutiles — on efface `requester_name`, `requester_email`,
> `artisan_email` **et `siret`**. La ligne survit comme compteur pur : canal,
> dates, jalons d'attribution. L'entonnoir garde son histoire sans garder
> personne.

`verification_lookup` se purge à 12 mois. Les deux passes vivent dans le cron
[`echeances`](../../../src/app/api/cron/echeances/route.ts), qui tourne déjà.

Une demande d'effacement se traite alors en une requête par adresse, et ne laisse
rien derrière.

> **Pourquoi le SIRET compte comme donnée personnelle.** Chez un entrepreneur
> individuel — la forme dominante du métier — le SIRET identifie une personne
> physique. Journaliser des consultations n'est donc pas un compteur anodin, et
> l'anonymisation doit l'emporter aussi.

### 6.5 Ce qui doit être ajouté à l'AIPD

L'[AIPD du passeport](../rgpd/2026-08-08-aipd-passeport.md) ne couvre que des
personnes qui ont adhéré. Ce parcours traite des données de **tiers qui n'ont
rien demandé**. Quatre points à y verser avant la mise en ligne :

1. **La base légale de l'envoi à l'artisan** — intérêt légitime, adossé à une
   relation d'affaires réelle et actuelle entre le demandeur et l'artisan, dont
   le demandeur atteste en saisissant l'adresse
2. **Le droit d'opposition** — le lien de `mail_optout`, effectif dès le premier
   mail
3. **Les durées** — 30 jours pour la demande, 12 mois pour la consultation, et
   l'anonymisation plutôt que la suppression, avec sa justification
4. **Le SIRET comme donnée personnelle** chez l'entrepreneur individuel

---

## 7. L'écran admin

`/(admin)/leads`, derrière [`staff-session`](../../../src/lib/staff-session.ts)
comme les trois écrans existants.

### 7.1 L'attribution se fige avant l'anonymisation

Effacer le SIRET à 30 jours interdit de rattacher **après coup** une inscription
à la demande qui l'a provoquée.

> **Décision.** Le rapprochement se fait dans le cron `echeances`, tant que le
> SIRET est encore là. Pour chaque demande ouverte, une passe quotidienne :
> résoudre le SIRET, estampiller `registered_at` / `covered_at`, envoyer le mail
> 2 si `notify`, envoyer le mail 3 à J+30, puis anonymiser. Un seul endroit, un
> seul passage — et l'entonnoir compte des dates, donc il survit à
> l'anonymisation.

### 7.2 L'entonnoir, sur 7 / 30 / 90 jours

```
Recherches                    1 240
  dont sans couverture          890   (72 %)
Demandes                        210   (24 % des sans-couverture)
  envoyées par nous             160
  copiées par le demandeur       50
Inscriptions                     34   (16 %)
Attestations déposées            28   (82 %)
Couvertures publiées             21   (75 %)
```

> **Le taux qui compte n'est pas le dernier, c'est le deuxième : 890 → 210.** Il
> dit si la page convainc. Les suivants mesurent le circuit de revue, qu'on
> connaît déjà par ailleurs.

### 7.3 La liste actionnable

Les demandes ouvertes de moins de 30 jours : entreprise (raison sociale au cas B,
SIRET seul sinon), date, canal, âge, statut calculé, lien vers la page.

Une seule action : **relancer une fois à la main**, soumise aux mêmes gardes que
l'envoi automatique (7 jours, liste d'opposition). Pas de notes, pas de tags, pas
d'assignation — la ligne disparaît d'elle-même à 30 jours.

### 7.4 Pas de CRM externe

> **Décision.** Aucune synchronisation vers un CRM tiers.

La valeur d'un CRM est de se souvenir pour toujours ; toute la § 6.4 tient sur
l'oubli à 30 jours. Les deux sont contradictoires, et l'export créerait une copie
permanente, hors de notre contrôle, d'adresses qu'on a promis d'effacer — plus un
sous-traitant, un DPA, et l'AIPD à rouvrir. Pour quelques centaines de lignes qui
ne vivent jamais plus d'un mois, et sans personne pour faire de la prospection.

Deux coutures gratuites suffisent à ne pas se fermer la porte :

1. **Un export CSV** de l'entonnoir et de la liste ouverte depuis l'écran admin
2. **Des événements nommés** — `lead.requested`, `lead.registered`,
   `lead.covered` — via le service [`events`](../../../src/services/events.ts)
   existant, qui donneront un point d'accroche unique le jour venu

**Le déclencheur pour rouvrir la question :** quelqu'un passe une demi-journée par
semaine à relancer des artisans à la main.

---

## 8. Erreurs

**Une source indisponible ne change jamais le verdict.** Le verdict de couverture
vient de notre base, pas des registres : la page reste servable même si tout
l'open data tombe. Les deux appels open data se font **en parallèle**, et chacun
échoue seul.

| Panne | Comportement |
|---|---|
| `recherche-entreprises` KO | Verdict et actions affichés ; le bloc identité indique « registres momentanément indisponibles » |
| BODACC KO | Aucune alerte affichée — la ligne du § 4.4 couvre déjà ce cas, jamais de faux « rien à signaler » |
| ADEME KO | Le mail artisan part sans son accroche RGE |
| SMTP KO | La demande reste enregistrée ; le cron réessaie tant que `*_notified_at` est nul |

Trois états de page à tenir : SIRET absent des registres (« aucune entreprise à
ce numéro »), registres indisponibles, entreprise fermée ou radiée (l'alerte
passe devant tout).

---

## 9. Tests

**Domaine, pur**
- l'aiguillage A / B / C de `lookupCompany`
- le calcul de l'entonnoir à partir d'un jeu de lignes
- les trois gardes de cadence (3/h, 24 h par couple, 7 jours par artisan)
- la sélection du corps de mail selon l'état de l'artisan

**Services, avec fixtures**
- **le test qui garde l'invariant : un cas B et un cas C produisent un rendu
  identique au caractère près, hors bloc identité.** Il doit échouer bruyamment
  le jour où quelqu'un ajoute une phrase gentille pour les inscrits.
- l'anonymisation à 30 jours : colonnes personnelles nulles, dates et canal
  intacts, entonnoir identique avant et après

**Intégration, en appel réel**

La leçon de M1 et de M3 — des fixtures écrites à la main ont déjà validé deux
fois un champ que l'API ne renvoyait pas : un test sur un SIRET réel pour
`findEstablishment` et `fetchRgeRows`.

**Playwright**

Le parcours entier : SIRET saisi → page → demande envoyée → mail reçu.

---

## 10. Hors périmètre

- l'attribution multi-touch
- la relance automatique
- le SMS sortant depuis nos serveurs
- le référencement de la page de vérification
- la fiche par entreprise prospectée (mini-CRM)
- l'attestation de vigilance URSSAF, déjà hors périmètre depuis le cadrage M3
