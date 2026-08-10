# A1 — Les portes

> Spec de conception · Date : 2026-08-10 · Statut : à valider

**Références :** [A1 — Les écrans des portes](2026-08-10-a1-ecrans-design.md) · [socle artisan](2026-08-07-socle-artisan-design.md) · [espace demandeur](2026-08-09-espace-demandeur-design.md) · [backoffice supervision](2026-08-08-backoffice-supervision-design.md) · [AIPD](../rgpd/2026-08-08-aipd-passeport.md)

> Cette spec décide les **routes, les tables et l'aiguillage**. Ce que les gens voient — les six écrans, leur enchaînement, leurs mots — est décidé par [A1 — Les écrans des portes](2026-08-10-a1-ecrans-design.md).

---

## 1. Ce que l'examen a révélé

Les trois publics existent déjà, chacun avec son résolveur de session et son groupe de routes. La séparation est bonne et n'est pas remise en cause.

| Public | Garde | Table | Groupe |
|---|---|---|---|
| Entreprise / artisan | `currentCompany()` | `member` + `company.plan` | `(app)` |
| Demandeur | `currentRequester()` | `requester` | `(espace)` |
| Admin | `currentStaff()` | `staff` | `(admin)` |

Ce qui manque n'est pas la structure, ce sont les portes.

| Constat | Conséquence |
|---|---|
| `signInWithOtp` est appelé sans `shouldCreateUser` — il vaut donc `true` | Chaque adresse saisie sur `/connexion` crée un utilisateur Supabase. Les refus d'inscription (établissement cessé, entreprise déjà inscrite) tombent **après** cette création : des comptes orphelins s'accumulent, sans `member` ni `requester`, et rien ne les ramasse |
| `signOut` n'apparaît nulle part dans `src` | Il n'existe aucun moyen de se déconnecter. Un client qui signe depuis le téléphone d'un artisan y reste connecté |
| `resolveDestination` ne connaît que `hasCompany` et `hasRequester` | Un relecteur qui se connecte atterrit sur le formulaire SIRET de l'inscription artisan, et doit taper `/supervision` à la main |
| `ONBOARDING_HREF = '/connexion'` | La landing pro n'a pas d'inscription à proposer. Son propre commentaire annonce la ligne à changer |
| Le demandeur n'a aucune porte d'entrée | Il n'existe que par la signature. Personne d'autre ne peut créer de compte |
| `(admin)` n'a pas de `layout.tsx` et porte `AppShell` | Le garde est rappelé page par page ; un oubli ouvre un écran interne. Et le back-office porte la navigation de l'artisan |

## 2. Deux portes d'inscription, une porte de retour

> **Décision.** L'intention est portée par la **porte d'entrée**, jamais devinée après coup.

Trois formes ont été pesées.

| Forme | Écartée parce que |
|---|---|
| Une porte unique + écran d'aiguillage après le lien | Pose la question au pire moment : la personne a déjà donné son adresse, quitté sa boîte mail, cliqué — et on l'arrête pour lui demander qui elle est, alors que la page d'où elle venait le savait |
| Une porte unique, intention déduite du contexte de navigation | **Le lien magique s'ouvre très souvent sur un autre appareil.** L'artisan remplit au bureau et ouvre le courriel sur son téléphone. Un cookie d'intention meurt exactement là |
| **Deux portes d'entrée, une porte de retour** | Retenue |

| Route | Public | Ce qu'elle fait |
|---|---|---|
| `/creer-mon-entreprise` | Artisan | SIRET → confirmation visuelle → adresse → lien |
| `/creer-mon-compte` | Demandeur | Adresse + nom → lien |
| `/connexion` | Tous | Porte de **retour seule** |
| `/auth/confirm` | — | Échange le jeton, consomme l'intention, aiguille |
| `/deconnexion` | Tous | Action serveur, `signOut()`, retour à `/` |

`ONBOARDING_HREF` passe à `/creer-mon-entreprise` — la ligne unique que son commentaire annonçait.

### 2.1 `/connexion` ne crée plus de compte

> **Décision.** `shouldCreateUser: false`. La création n'a lieu que derrière les deux portes d'inscription.

C'est ce qui tarit la source des comptes orphelins. Deux conséquences à assumer.

**Une adresse inconnue ne reçoit plus rien** — et l'écran affiche pourtant **la même réponse dans les deux cas** : *« Si un compte existe pour cette adresse, le lien est parti. »* Distinguer offrirait à quiconque de tester si telle personne est cliente, sur un formulaire public et sans authentification.

**Le cul-de-sac se rattrape par le bas de l'écran**, pas par le message : sous le formulaire, deux issues nommées — *Vous êtes artisan ? Créez votre entreprise* · *Vous êtes particulier ? Créez votre compte*.

## 3. L'intention se réclame par l'adresse

Le SIRET saisi avant l'envoi du lien doit survivre à l'aller-retour par la boîte mail, changement d'appareil compris. Le faire voyager dans l'URL du lien a été envisagé, puis écarté.

`member_invitation` porte déjà la doctrine : *« Aucun jeton. L'invitation se réclame par l'ADRESSE, prouvée par le lien magique… Un jeton se transfère ; une boîte aux lettres, non. »* Et `quote_link_request` a déjà la forme exacte : une adresse, un instant, purgée à chaque écriture.

> **Décision.** Une table `registration_intent`, écrite avant l'envoi du lien, relue à l'atterrissage **par l'adresse authentifiée**.

Trois propriétés en découlent, et chacune répond à un défaut de l'alternative :

- **Rien dans l'URL.** `additional_redirect_urls` n'accepte que des URL exactes ; aucune entrée à y ajouter, aucun paramètre à faire valider.
- **Aucune donnée personnelle en chaîne de requête.** Le nom du demandeur ne transite pas par une URL, qui se retrouve dans les journaux de serveur et les historiques.
- **Le changement d'appareil est indifférent**, pour la seule bonne raison : c'est la boîte aux lettres qui fait la preuve, pas le lien.

L'intention est **consommée** à l'atterrissage — lue puis supprimée dans la même transaction. Une intention rejouée créerait une seconde entreprise au second clic sur un vieux courriel.

## 4. L'inscription artisan : le SIRET d'abord

> **Décision.** L'ordre est inversé. SIRET → confirmation → adresse → lien. Aujourd'hui c'est adresse → lien → SIRET.

```
/creer-mon-entreprise
  1. 14 chiffres
  2. « SARL DUPONT · SARL · 12 rue des Lilas, 44000 Nantes · RGE »  → C'est bien vous ?
  3. Votre adresse e-mail
  4. « Lien envoyé. Ouvrez-le depuis votre téléphone. »
/auth/confirm
  5. Relecture de l'intention, second appel à l'API, création company + member(owner)
  6. → /devis
```

Trois raisons, dont deux ne sont pas cosmétiques.

**Le SIRET est le moment fort.** L'artisan tape quatorze chiffres et l'outil affiche sa raison sociale, sa forme juridique, son adresse, son RGE. C'est là qu'il comprend ce qu'est le produit. Le dépenser après un aller-retour par la boîte mail, c'est le dépenser au mauvais endroit.

**On refuse avant de créer.** Établissement cessé, entreprise déjà inscrite : ces deux refus tombent aujourd'hui après la création du compte Supabase. Inverser l'ordre supprime la principale fabrique de comptes orphelins.

**C'est gratuit.** `findEstablishment` tape l'API Recherche d'Entreprises de data.gouv : ouverte, sans clé, sans quota. Rien n'empêche de l'appeler avant d'avoir la moindre adresse.

> **Exigence d'implémentation.** L'API est **rappelée à l'atterrissage**, et c'est son résultat qui est écrit — jamais celui mémorisé à l'étape 2. L'intention ne porte que le SIRET, qui est une donnée publique. Entre les deux appels, l'établissement a pu cesser, ou une autre personne a pu inscrire l'entreprise.

**Ce que cela n'ouvre pas.** Rien ne prouve qu'on possède le SIRET qu'on saisit — c'est déjà vrai aujourd'hui sur `/inscription`, et c'est le rôle de `/verification`, qui est un autre étage. A1 ne change ni ne dégrade cette propriété.

Le second chemin de l'artisan — être invité par un patron — n'est pas touché : `claimInvitation` court-circuite l'inscription et continue de le faire.

## 5. L'inscription demandeur

Deux chemins, décidés ensemble.

### 5.1 Le chemin de retour, après signature

Le compte naît de la signature, silencieusement. Cette décision de M6 n'est pas rouverte : *« ajouter une étape à l'écran de signature coûterait des signatures »*, et la signature alimente le passeport, les métriques et le label.

Le courriel qui l'annonce **existe déjà et est branché** : `sendSignatureReceipt` écrit *« Vos chantiers sont réunis ici… Aucun mot de passe : connectez-vous avec cette adresse »*, envoyé hors du chemin critique depuis `d/[token]/actions.ts`.

Ce qui manque est l'écran : `SignatureBlock` s'arrête à *« Devis signé. Vous en recevrez une copie. »* Il gagne la mention de l'espace. **Le travail est un écran, pas un envoi** — et il appartient à A2.

### 5.2 L'inscription autonome

> **Décision.** `/creer-mon-compte` demande **l'adresse et le nom**, rien d'autre.

`requester.name` est `notNull` et sert partout, à commencer par les courriels. L'écrire vide pour gagner un champ, c'est se garantir des « Bonjour , ». Enchaîner sur une première entrée de répertoire a été écarté : ce serait le tunnel qu'on refuse à l'artisan, imposé à quelqu'un qui vient d'arriver.

> **Décision.** L'atterrissage est `/mon-repertoire`, **pas** `/mes-logements`.

`myProperties` dérive les logements **des signatures**, et ce fondement est délibéré — l'asseoir sur l'adresse livrerait au nouvel acquéreur le dossier du précédent propriétaire. Un compte sans signature verra donc `/mes-logements` vide, et structurellement incapable de se remplir. `address_book_entry` appartient au demandeur et se remplit sans aucun artisan en face : c'est la seule surface qui a du sens le premier jour.

> **Décision.** `requester.source` gagne une troisième valeur, `self`.

Le schéma définit `invitation` comme *« un artisan l'a rattaché à un logement existant »*. Réutiliser cette valeur ferait mentir la colonne sur son propre contenu.

## 6. L'aiguillage

`resolveDestination` reste une fonction pure et gagne un troisième signal.

| Signal | Destination |
|---|---|
| `hasCompany` | `/devis` |
| `hasRequester` **et** `hasSignature` | `/mes-logements` |
| `hasRequester` seul | `/mon-repertoire` |
| `hasStaff` | `/supervision` |
| aucun | `/creer-mon-entreprise` |

Quatre signaux, donc, et non trois : `hasSignature` est ce qui distingue un demandeur né d'une signature d'un demandeur venu de lui-même. Sans lui, l'inscription autonome atterrirait sur un écran vide qui ne peut pas se remplir (§5.2). Il reste un booléen calculé par l'appelant — la fonction demeure pure.

> **Décision.** L'entreprise garde la priorité sur `staff`.

La doctrine existante — *« l'atelier est celui où l'on travaille tous les jours »* — reste valable, et le cas où les deux coexistent est précisément celui de l'exploitant du produit. Le passage au back-office se fait par l'en-tête, comme `SpaceShell` propose déjà le passage à l'atelier via `alsoCompany`.

Le repli change : un compte sans rattachement atterrit sur la porte d'inscription artisan, qui **explique ce qu'elle est**, au lieu du formulaire SIRET nu qui ne dit rien à qui n'est pas artisan.

## 7. La sortie

> **Décision.** Une action serveur, `signOut()`, redirection vers `/`. Accessible depuis les trois coquilles.

C'est le manque le plus élémentaire du système actuel, et le plus exposé : la signature se fait souvent sur le téléphone de l'artisan, chez le client. Sans déconnexion, la session du client y survit.

## 8. Les gardes du back-office

> **Décision.** `(admin)` reçoit un `layout.tsx` qui appelle `currentStaff()`, et un `AdminShell` distinct.

**Le garde de layout ne dispense d'aucun garde d'action serveur.** Chaque action sous `(admin)` continue d'appeler `currentStaff()` : un layout ne s'interpose pas devant une action, et croire l'inverse est exactement ainsi qu'on ouvre un back-office.

> **Exigence de vérification.** Un test échoue si une page ou une action sous `(admin)` n'appelle pas `currentStaff` — sur le modèle de `check:feature-isolation`, qui échoue déjà sur un import interdit. C'est le seul filet qui tienne contre l'oubli ; la relecture, non.

`AdminShell` sépare la navigation interne de celle de l'artisan. Aujourd'hui `AppShell` reçoit un `access` facultatif dont le commentaire explique qu'il sert à masquer la navigation artisanale pour le back-office : la coquille dédiée supprime ce détour.

## 9. Le sans-mot-de-passe est une décision, et voici sa condition

Le choix est documenté deux fois dans le code — *« l'artisan est sur un chantier, avec des gants et une 4G médiocre »* — mais sa **condition de viabilité** ne l'est nulle part.

> **Décision structurante.** `[auth.sessions]` reste sans `timebox` ni `inactivity_timeout`, et un commentaire dit pourquoi.

La friction du lien magique est payée **une fois**, pas à chaque connexion — uniquement parce que la session ne meurt jamais. `proxy.ts` renouvelle le jeton à chaque requête ; un artisan qui ouvre l'outil chaque jour ne se reconnecte jamais. Le jour où quelqu'un décommente `timebox = "24h"` pour « faire sérieux », il casse l'ergonomie du produit sans savoir qu'il y touche. La ligne doit porter son avertissement.

Le mot de passe optionnel pour l'artisan et la passkey pour l'admin sont décidés, mais relèvent de **A3**.

## 10. Modèle de données

```
registration_intent
  email        text  notnull unique   -- toujours normalisée (normalizeEmail)
  kind         text  notnull          -- 'company' | 'requester'
  siret        text                   -- kind = 'company'
  name         text                   -- kind = 'requester'
  created_at   timestamptz notnull default now()
```

Purgée à chaque écriture au-delà de 24 heures, comme `quote_link_request` — *« plutôt que par une tâche planifiée qu'on oublierait de surveiller »*. Une réinscription écrase l'intention précédente (`onConflictDoUpdate` sur l'adresse) : c'est le geste le plus récent qui vaut.

```
requester.source   enum += 'self'
```

Aucune migration destructive. Aucune colonne supprimée, aucune contrainte resserrée sur des données existantes.

## 11. Configuration

| Réglage | Aujourd'hui | Après |
|---|---|---|
| `[auth.email.smtp]` | commenté | renseigné — les liens de connexion partent par le même expéditeur que les devis |
| `email_sent` | `2` par heure | relevé, une fois le SMTP applicatif en place |
| `[auth.sessions]` | commenté | **inchangé**, avec un commentaire qui dit pourquoi (§9) |

Le SMTP conditionne l'ouverture de la porte demandeur. Les liens magiques partent aujourd'hui par l'expéditeur par défaut de Supabase : plafonné bas, sans réputation d'envoi. Une porte publique multiplie ces envois, et **un lien de connexion qui tombe en spam est un compte perdu sans trace**. `services/email.ts` a déjà un transport `nodemailer` ; il s'agit de le déclarer aussi côté `[auth]`.

## 12. Ce que A1 ne fait pas

- **La liste de premiers pas, le mot d'accueil par écran, les états vides qui enseignent, l'écran de confirmation après signature** → [A2 — L'arrivée](2026-08-10-a2-arrivee-design.md).
- **Le mot de passe optionnel artisan, la passkey admin** → A3.
- **Le tuto pas-à-pas en surbrillance.** Écarté au profit du mot d'accueil par écran, et la découverte sera instrumentée avant d'y revenir. Motifs consignés en A2.
- **Aucune donnée fictive**, dans aucun compte. Un devis fictif signé entrerait dans `passport-metrics`, donc dans le taux affiché publiquement, donc dans `directory-ranking` — et journal, facture et publication de chantier sont immuables par déclencheur : « supprimable » n'est pas une option que le schéma propose.
- **La vérification de possession du SIRET** reste hors sujet : c'est `/verification`.
- **L'appartenance multiple.** Un compte reste rattaché à une seule entreprise active ; `claimInvitation` documente déjà ce choix.

## 13. Vérification

| Ce qui est vérifié | Comment |
|---|---|
| `resolveDestination` avec les quatre combinaisons, `staff` compris | Test unitaire, fonction pure |
| Une adresse inconnue sur `/connexion` ne crée **aucun** utilisateur | Test d'intégration : compter `auth.users` avant et après |
| La réponse de `/connexion` est identique pour une adresse connue et inconnue | Test unitaire sur l'état rendu |
| Un établissement cessé, ou déjà inscrit, est refusé **avant** toute création de compte | Test d'intégration sur `/creer-mon-entreprise` |
| L'intention est consommée une seule fois | Test d'intégration : deux atterrissages, une seule entreprise |
| L'intention expirée n'est pas honorée | Test d'intégration, horloge avancée |
| Le SIRET écrit est celui du **second** appel à l'API | Test d'intégration, réponse d'API modifiée entre les deux |
| L'inscription demandeur crée un `requester` en `source: 'self'` et atterrit sur `/mon-repertoire` | Test d'intégration |
| La déconnexion invalide la session | Test e2e |
| Toute page **et toute action** sous `(admin)` appelle `currentStaff` | Test statique sur les sources, modèle `check:feature-isolation` |
| Un artisan authentifié atteignant `/supervision` reçoit un refus | Test e2e |

## 14. Ce qui reste ouvert

- **Le nom de l'artisan.** `member.name` est nullable et l'inscription ne le demande pas. A2 décidera s'il entre dans la liste de premiers pas ou reste facultatif.
- **Le relèvement de `email_sent`.** Le plafond juste dépend du volume réel ; à fixer à la mise en service du SMTP applicatif, pas avant.
- **Le rattachement d'un `staff` existant.** Aucune porte ne crée de relecteur : la ligne se pose à la main en base. C'est suffisant tant qu'ils se comptent sur une main, et A1 ne le change pas.
