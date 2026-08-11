# M6 — L'espace demandeur

> Spec de conception · Date : 2026-08-09 · Statut : à valider

**Références :** [spec P1 §10](2026-08-07-socle-artisan-design.md) · [AIPD](../rgpd/2026-08-08-aipd-passeport.md) · [spec annuaire](2026-08-08-annuaire-design.md)

---

## 1. Ce que l'examen a révélé

La spec produit annonce que le compte demandeur se crée à la signature. **Rien de ce mécanisme n'existe**, et deux obstacles le précèdent.

| Constat | Conséquence |
|---|---|
| La signature stocke un nom, un e-mail et un téléphone dans `signature`, et rien d'autre | Aucun compte, aucun accès, aucun lien entre deux chantiers du même client |
| `currentCompany()` est **le seul résolveur de session** | Un demandeur qui se connecte aujourd'hui reçoit `SessionError('Aucune entreprise')` et atterrit sur le formulaire SIRET de l'artisan |
| `customer` appartient à une entreprise et n'est jamais partagé | Deux entreprises intervenant chez la même personne produisent deux lignes sans lien |
| `property` est déjà partagé, avec une empreinte d'adresse | Le logement peut servir d'unité, comme la thèse le demande |

La dernière ligne est la bonne nouvelle du jalon : **le logement existe déjà comme objet partagé.** Tout le reste est à construire.

## 2. Le compte se crée à la signature — sans toucher à la signature

> **Décision.** La signature crée une ligne, **silencieusement**. L'accès arrive ensuite, par courriel.

Le taux de signature est le chiffre le plus porteur du produit : il alimente le passeport, les métriques, le label. Ajouter à cet écran une création de compte — même une case à cocher, même un mot de passe optionnel — coûterait des signatures pour servir un espace que personne ne réclame encore.

Rien ne change donc visuellement dans `/d/[token]`, **à une phrase près**, celle qu'exige l'AIPD (§9). Le compte naît de l'acte, il ne le conditionne pas.

Le courriel qui suit la signature — celui qui porte déjà le devis signé — gagne une ligne : *« votre dossier de travaux est ici »*. S'il ne clique jamais, rien n'est perdu : la ligne existe, et le jour où une seconde entreprise intervient chez lui, son dossier est déjà constitué.

### 2.1 Deux publics, une authentification

Le lien magique reste le seul mécanisme. Ce qui change est la **résolution** après connexion.

> **Décision.** Une fonction pure décide de la destination : entreprise rattachée → l'atelier ; demandeur → ses logements ; ni l'un ni l'autre → l'inscription artisan.

Un même compte peut porter les deux — un plombier fait aussi refaire sa toiture. Dans ce cas **l'entreprise l'emporte** pour la destination par défaut, et l'en-tête propose le passage à l'autre côté. Interdire le cumul serait à la fois faux et hostile.

### 2.2 Le rattachement se fait par la signature, pas par l'e-mail du client

`customer.email` est ce que l'artisan a saisi. `signature.signerEmail` est ce que la personne a elle-même fourni au moment de s'engager. **Ce sont deux choses différentes, et seule la seconde est un acte de la personne.**

> **Décision.** Le compte se rattache au **signataire**, et le lien se pose sur la signature — pas sur le client de l'entreprise.

Conséquence directe : **« mes chantiers » = les devis que j'ai signés.** Aucune inférence d'identité, aucun rapprochement par chaîne de caractères, aucun risque de réunir deux personnes qui partagent une adresse familiale.

## 3. Une correction de la spec produit, faite en concevant

§10 écrit : *« Historique — toutes les interventions du logement, toutes entreprises confondues »*.

Fondé sur l'adresse, cela livrerait **au nouvel acquéreur d'un appartement le dossier de travaux du précédent propriétaire** : montants, entreprises, photos de l'intérieur. Le logement est partagé par empreinte d'adresse ; il ne dit rien de qui l'habite ni depuis quand.

> **Décision. La vue consolidée se fonde sur les chantiers dont il est le signataire**, groupés par logement — jamais sur ce qui est arrivé à l'adresse.

La promesse de la spec est tenue quand même : sur une rénovation, le demandeur a signé les trois devis, donc il voit les trois chantiers là où chaque artisan n'en voit qu'un. **Il reste le seul acteur de la chaîne à posséder la vue consolidée** — sans qu'un déménagement transfère un dossier avec les murs.

## 4. Ce que le demandeur voit, et ce que l'entreprise ne voit pas

> **Décision structurante, reprise de §10.** Le demandeur voit tous ses chantiers sur un logement ; **une entreprise ne voit que les siens.**

Sans cette règle, deux effets rédhibitoires : les artisans liraient les prix de leurs concurrents et refuseraient l'outil, et le dossier exposerait la vie privée du propriétaire à des tiers.

> **Exigence d'implémentation. L'asymétrie est portée par la requête**, comme les exclusions de M3, M4 et M5 — jamais par un filtre d'affichage. Un écran qui oublierait de filtrer publierait le chantier d'un concurrent.

Elle se vérifie par un test qui plante le chantier d'une entreprise tierce sur le même logement et exige qu'il n'apparaisse nulle part côté entreprise.

### 4.0 La navigation — amendement du 10 août 2026

L'espace a été livré **sans navigation**. On n'atteignait le répertoire que par un lien en fin de page des logements, et on n'en revenait que par le retour de l'en-tête d'écran. Deux destinations de premier rang qui ne se voyaient pas l'une l'autre — le défaut qu'`AppNav` avait justement corrigé côté artisan, et qui a été reproduit ici en ne s'y appliquant pas.

> **Décision.** C'est **`AppNav`**, la même que l'atelier, et non une seconde navigation. Elle reçoit désormais ses entrées au lieu de les déduire : ce qu'elle sait faire — marquer la page courante, tenir les 44 px, passer à la ligne — ne dépend pas de qui la regarde ; ce que chacun peut atteindre, si. `AppHeader` calcule les groupes depuis la table des capacités, `SpaceShell` passe les siens.

Deux entrées, un seul groupe : le dossier se consulte quand un chantier bouge, le répertoire quand un problème arrive — aucune fréquence d'usage ne les sépare. Aucune capacité non plus, et c'est structurel : le demandeur n'appartient à aucune entreprise, et la table des capacités régit ce qu'on peut faire **dans** une entreprise.

`/verifier` n'y figure pas bien qu'elle lui serve : c'est une page publique, et la mêler aux deux écrans de son dossier laisserait croire que ce qu'il y cherche est archivé chez nous. Le lien vit dans le répertoire, à l'endroit où la question se pose.

### 4.1 Le contenu

| Bloc | Contenu | Origine |
|---|---|---|
| Mes logements | Adresse, nombre de chantiers, entreprises intervenues | Dérivé |
| Le chantier | Signé le, délai engagé, délai constaté, factures, reste à payer, terminé le | Dérivé |
| Le fil | La chronologie des faits, enrichie par l'artisan | Dérivé **+ saisi** |
| Documents | Devis, avenants, factures — les PDF déjà produits | Existant |
| Garanties | Ce qui dépend de la réception, et la réception déclarée | Dérivé + déclaré |
| Répertoire | Ses entreprises, leur activité, leur vérification actuelle | Dérivé + saisi |

Le demandeur peut **ajouter lui-même un logement** — indispensable au bailleur, dont tous les lots n'ont pas encore fait l'objet d'un chantier.

## 5. Le fil d'avancement

C'est le bloc que la spec produit désigne comme *« le vrai moment de valeur »* : la seule période où le demandeur est activement anxieux, et où il téléphone à un artisan qui ne répond pas.

C'est aussi le seul bloc du jalon qui **demande quelque chose de neuf à l'artisan**, sans contrepartie pour lui. Un fil qu'il n'alimente pas afficherait « aucune actualité depuis trois semaines » — et dégraderait la page qu'il devait servir.

> **Décision. Le fil ne peut pas être vide.** Sa colonne vertébrale est **dérivée** des faits que l'outil détient déjà ; ce que l'artisan publie vient s'y intercaler.

| Fait déjà connu | Ce que le fil en dit |
|---|---|
| `quote.signedAt` | Devis signé |
| `quote.amended` (M5·A) | Avenant signé |
| Facture d'acompte émise | Acompte demandé |
| Paiement enregistré | Acompte encaissé |
| Facture de situation | Situation de travaux |
| Facture de solde | Solde émis |
| `quote.completedAt` | Chantier terminé |

S'il ne publie rien, la page reste vraie et lisible. S'il publie, elle s'enrichit. **L'obligation nouvelle devient facultative sans que la page en souffre** — c'est la seule forme sous laquelle elle ne se retourne pas contre son objet.

### 5.1 Ce que l'artisan ajoute

Un message, et des photos. **Rien d'autre.**

Pas de type de jalon, pas de pourcentage d'avancement, pas de planning : le pourcentage d'avancement est une **situation de travaux**, c'est-à-dire un document comptable, et il appartient à M8. Le confondre avec un fil d'actualité produirait un chiffre qui ressemble à une facture sans en être une.

> **Décision.** Une publication est **définitive**. Ni modification, ni suppression — comme la facture et le journal. Un fil réécrivable ne vaudrait rien comme trace, et l'artisan doit savoir en écrivant que son client a lu.

Une erreur se corrige comme un avoir corrige une facture : par une publication qui la rectifie.

### 5.2 Les photos

Elles montrent l'intérieur du logement de quelqu'un. Trois règles en découlent, toutes structurelles :

- **Dépôt privé**, jamais public, servi par une adresse signée à durée courte — comme les attestations de M3.
- **Visibles du demandeur et de l'entreprise qui les a publiées**, de personne d'autre. C'est l'asymétrie du §4, appliquée au stockage.
- **Elles suivent le sort du chantier** pour la conservation : ni durée propre, ni album, ni galerie. Un album serait un produit différent.

## 6. Les garanties — et pourquoi nous n'affirmons rien

Afficher *« votre garantie décennale court jusqu'au 12/08/2036 »* suppose une **réception des travaux**. C'est un acte juridique, et notre `completedAt` n'en est pas un : il vaut soit déclaration de l'artisan, soit émission du solde.

La réception tacite exige **deux critères cumulatifs** — prise de possession sans réserve **et** paiement intégral — et des réserves exprimées, même verbalement, suffisent à l'écarter. Nous connaissons le paiement ; nous ignorons la prise de possession et les réserves.

> **Décision. Nous n'affirmons jamais une date de garantie que nous n'avons pas constatée.** Le maître d'ouvrage **déclare** sa réception ; à défaut, l'écran dit de quoi la garantie dépend, sans date.

C'est le même mécanisme qu'en M5 — une fin de chantier déclarée, puis auditée par un acte — mais avec le bon acteur : **la réception appartient au maître d'ouvrage**, pas à l'entreprise. C'est aussi la seule chose que le jalon demande au demandeur, sur son propre dossier, à son propre bénéfice.

Une fois la date déclarée, trois échéances se calculent, et rien de plus :

| Garantie | Durée | Fondement |
|---|---|---|
| Parfait achèvement | 1 an | art. 1792-6 |
| Bon fonctionnement | 2 ans | art. 1792-3 |
| Décennale | 10 ans | art. 1792 |

**Sans réception déclarée, aucune date n'est affichée** — seulement la règle et ses deux conditions. Imprimer une date fausse sur l'écran d'un particulier lui ferait manquer un délai de forclusion.

## 7. Le répertoire

Les entreprises déjà intervenues chez lui : activité réalisée, date de dernière intervention, lien vers le passeport, **et leur statut de vérification actuel**.

C'est l'objet que les gens perdent réellement — *« c'était qui, le plombier venu il y a trois ans ? »* — et le meilleur objet de rétention de P1 : le dossier se consulte rarement, le répertoire sert à chaque problème.

**Le demandeur y ajoute lui-même une entreprise absente de la plateforme** — le couvreur de 2019, l'électricien du voisin. Sans cela le répertoire est incomplet, donc inutile, donc il ne fidélise personne.

> **Décision, reprise de §10.** On **stocke** le contact saisi, on **n'envoie aucune invitation**. On n'a qu'un seul premier contact avec un artisan, et « votre client vous a ajouté à son répertoire » vaudra en P2, accompagné d'une demande réelle. Le dépenser en P1 pour proposer un logiciel de devis, c'est griller le meilleur signal d'acquisition qui existe.

> **Décision, à ne pas confondre avec M4.** `relayContact` n'écrit rien, délibérément : il ne doit exister aucune base de leads. Le répertoire, lui, stocke — mais **il appartient au demandeur**. Il n'est jamais lisible côté entreprise, jamais agrégé, jamais exporté. Cette ligne doit rester écrite, sinon quelqu'un lira un jour cette table comme une permission.

## 8. La reprise de contact

Trois actions, et trois seulement, pour le demandeur en P1 : signer, régler, **recontacter une entreprise de son répertoire**.

Elle ne franchit pas la ligne de la marketplace : ni recherche, ni mise en correspondance — c'est un fil avec quelqu'un dont il a déjà le numéro. Côté entreprise, c'est du réachat sur son propre client, donc sans commission.

Pour une entreprise **sur la plateforme**, le message est relayé par le mécanisme de M4, en indiquant qu'il vient d'un client déjà servi. Pour une entreprise **saisie à la main**, il n'y a rien à relayer : on affiche le numéro.

## 9. Le verrou n° 1 de l'AIPD

L'AIPD le date d'« avant M5 », et il n'a pas été fait. M6 touche l'écran de signature : c'est ici qu'il se paie.

> *« La page `/confidentialite` explique au client ce que nous faisons de son nom, de son adresse électronique, de son téléphone et de son adresse IP. Elle ne lui dit pas que sa signature fait de lui le témoin d'une mesure publiée sur son artisan. C'est la fonction la plus structurante de sa signature, et elle n'est pas mentionnée. »*

> **Décision.** L'écran de signature et `/confidentialite` disent cette fonction, **avant la signature**, en clair, avec un lien vers les définitions publiques du passeport.

Cela lève le premier des deux verrous qui bloquent toute publication. **Le second — le recueil de l'avis des artisans, article 35.9 — reste entier** et le restera tant qu'aucun artisan ne sera inscrit.

## 10. Modèle de données

```
requester                       -- la personne
  id, user_id (auth.users, null jusqu'a la 1re connexion),
  email unique, name, source ('signature'|'invitation'), created_at

signature.requester_id          -- le rattachement : l'acte, pas l'adresse saisie

requester_property              -- les logements ajoutes par le demandeur lui-meme
  requester_id, property_id, role ('occupant'|'landlord'), since
  unique (requester_id, property_id)

quote.received_at               -- la reception DECLAREE par le maitre d'ouvrage
quote.received_by               -- requester_id : qui l'a declaree

chantier_post                   -- le fil, partie saisie
  id, quote_id, company_id, body, created_at        -- immuable par declencheur
chantier_photo
  id, post_id, storage_path, created_at

directory_entry                 -- le repertoire du demandeur
  id, requester_id, company_id (null si hors plateforme),
  free_name, phone, activity_code, note, created_at
```

Le fil dérivé n'est **pas** une table : il se calcule à la lecture depuis le devis, les factures, les paiements et le journal — comme la visibilité de M3, le reste à facturer de M2, le classement de M4 et les métriques de M5.

## 11. Ce que M6 ne fait pas

- **Aucun équipement, aucune échéance d'entretien.** Deux modèles de données entièrement saisis à la main par l'artisan, sans contrepartie. Le jour où l'agenda (M7) existe, l'échéance aura où aboutir.
- **Aucune découverte d'entreprise.** Le demandeur recontacte qui il connaît ; chercher relève de l'annuaire, et la mise en relation instrumentée de P2.
- **Aucune relance sur échéance.** Afficher relève de P1, relancer est un moteur de génération de demande — P3.
- **Aucune invitation envoyée** aux entreprises ajoutées à la main. §7.
- **Aucun partage entre entreprises.** L'asymétrie n'a pas d'exception en P1.
- **Aucune situation de travaux.** Le pourcentage d'avancement est un document comptable — M8.

## 12. Vérification

- **L'asymétrie** : un test plante le chantier d'une entreprise tierce sur le même logement et exige qu'il n'apparaisse dans aucune lecture côté entreprise. C'est le test le plus important du jalon.
- **Le rattachement** : deux devis signés par la même personne chez deux entreprises différentes se retrouvent dans le même espace ; un devis signé par quelqu'un d'autre chez le même client n'y est pas.
- **Le fil** : un chantier dont l'artisan n'a rien publié affiche quand même sa chronologie complète.
- **L'immuabilité** : une publication ne se modifie ni ne se supprime, vérifié sur des lignes réelles.
- **Les garanties** : sans réception déclarée, aucune date n'apparaît ; avec, les trois échéances sont exactes.
- **Le parcours** : de la signature du devis à la consultation du dossier par le client, sans compte préalable.

## 13. Ce qui reste ouvert

- **La conservation des photos** suit le chantier, mais la durée du chantier n'a pas de fin définie. À trancher avec la purge automatique, chantier déjà listé par l'AIPD.
- **Le bailleur multi-lots** est le demandeur prioritaire selon la spec produit, et l'invitation par l'artisan (`source = invitation`) reste hors périmètre ici : elle suppose un écran côté artisan que rien ne réclame encore.
- **Le cumul des deux rôles** sur un même compte est autorisé, mais l'ergonomie du passage d'un côté à l'autre mérite d'être revue sur usage réel.
- **La réception déclarée ne fait l'objet d'aucun audit**, contrairement à la fin de chantier de M5. Si elle se révèle rarement déclarée, il faudra décider si le paiement intégral peut valoir présomption affichée — ce que le droit permet, mais sous deux conditions dont l'une nous échappe.
