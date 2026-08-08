# Le backoffice — supervision et contrôle

> Spec de conception · Date : 2026-08-08 · Statut : à valider
> **Hors séquence**, comme l'observatoire des prix. Ce n'est pas un jalon produit : il n'apporte rien à l'artisan ni au demandeur. Il rend opérable ce qui est déjà livré, et il ne doit pas déplacer M4.

**Références :** [spec P1 §12](2026-08-07-socle-artisan-design.md) · [AIPD du passeport](../rgpd/2026-08-08-aipd-passeport.md)

---

## 1. Le problème

M3 a livré de la machinerie opérationnelle sans poste de pilotage :

- une **file de revue humaine** des attestations, que personne ne surveille — un dépôt du vendredi soir peut dormir une semaine ;
- une **suspension automatique** de visibilité à l'expiration, qui peut frapper une entreprise qu'on n'a pas pu prévenir ;
- des **contrôles sur sources ouvertes** écrits pour n'écrire aucun constat quand une source tombe. C'est la bonne décision pour la justesse — et elle rend les pannes muettes.

S'y ajoute un risque jamais traité : la **falsification des métriques** par de faux clients (risque n° 2 de la spec produit).

## 2. Le principe, déjà inscrit

> **Le backoffice agit sur les faits, jamais sur les chiffres.**

Aucun opérateur ne peut ajuster une métrique, faire remonter ou descendre une entreprise, ni retirer un label par appréciation. Un label qu'un humain peut baisser n'est plus mesuré : il est arbitré, donc négociable. L'AIPD y ajoute un argument juridique — la légitimité du traitement repose sur le fait que **la mesure est authentifiée par le client, pas par nous**.

Cette spec ne fait qu'appliquer ce principe.

## 3. Ce que la conception a écarté

Trois besoins avaient été énoncés — exploitation, supervision technique, contrôle des engagements. Les traiter comme trois écrans distincts aurait produit **trois fois le travail et trois choses à consulter chaque jour** ; le jour où l'on en oublie une est celui où elle comptait.

En les regardant ensemble, ce sont trois vues du même objet : **quelque chose ne va pas et demande un humain.**

> **Décision.** Une file d'anomalies unique, typée et triée par gravité. Un nouveau détecteur s'ajoute sans nouvel écran.

## 4. Le modèle

### 4.1 Une anomalie se calcule, elle ne se stocke pas

Même règle que la visibilité de M3 et le reste à facturer de M2. Une liste stockée dériverait de la vérité dès qu'une attestation est relue : l'anomalie survivrait à sa cause.

### 4.2 Un détecteur est une fonction pure

```
detecteur(instantane, maintenant) → Anomalie[]
```

Testable seul, sans base ni réseau — comme `activityVisibility` ou `noticesDue`. Le service assemble les instantanés et concatène les résultats ; les détecteurs ne connaissent ni Drizzle ni `fetch`.

```typescript
type Severity = 'blocking' | 'attention' | 'signal'

interface Anomaly {
  type: AnomalyType
  severity: Severity
  /** Ce sur quoi elle porte : une attestation, une entreprise, une source. */
  subjectId: string
  since: Date
  /** Ce qui ne va pas, en clair. Destiné à être lu, pas décodé. */
  detail: string
  /** Où aller pour la traiter. */
  href: string
  /**
   * Les faits observés, sous forme stable et comparable — voir §4.3.
   * N'a d'usage que pour les anomalies examinables, c'est-à-dire de gravité
   * `signal` : les autres se résolvent en étant traitées.
   */
  fingerprint: string
}
```

### 4.3 Seul l'examen est stocké — et il porte l'empreinte des faits

Un signal de fraude vérifié et jugé sain doit se taire, sinon il harcèle et finit ignoré. Une table `anomaly_review` enregistre le verdict, son motif, qui et quand.

> **Décision.** Une anomalie n'est masquée que par un examen portant **la même empreinte de faits**.

Sans cela, un dossier examiné une fois deviendrait aveugle pour toujours : trois clients partageant un téléphone seraient écartés comme bénins, et le quatrième passerait inaperçu. L'empreinte est la liste triée des faits observés — pour `shared_signer`, les identifiants des clients concernés. Un fait nouveau change l'empreinte et fait resurgir l'anomalie.

Les anomalies d'exploitation n'ont pas besoin d'être écartées : **les traiter les fait disparaître.**

Le motif est **obligatoire** : un verdict sans raison ne vaut rien six mois plus tard, et c'est la seule trace que l'examen a eu lieu.

## 5. Les quatre détecteurs

| Type | Gravité | Seuil | Source |
|---|---|---|---|
| `certificate_waiting` | attention | En attente depuis plus de **2 jours ouvrés** | `insurance_certificate.status = 'pending'` |
| `unreachable_company` | **blocking** | Échéance dans moins de 60 jours **et** entreprise sans adresse | `insurance_certificate` × `company.email` |
| `source_silent` | **blocking** | Aucun constat réussi depuis **48 h** | `legal_check.checked_at` |
| `shared_signer` | signal | **3 clients distincts** d'une même entreprise, même téléphone signataire | `signature.signer_phone` |

### 5.1 Le silence comme signal

> **Une garde indispensable : le détecteur ne se déclenche que s'il existe au moins une entreprise à contrôler.** Sur une base vide, aucun constat n'a jamais été écrit, et le détecteur crierait à la panne dès le premier jour — un faux positif au tout premier lancement est le meilleur moyen de faire ignorer l'outil pour toujours.

`source_silent` ne fonctionne que parce que M3 a décidé qu'une source indisponible **n'écrit rien** plutôt que d'écrire un constat faux. La date du dernier constat vieillit, et c'est cela qu'on lit. Une conception défensive prise pour la justesse rend la supervision possible ; l'inverse — écrire « actif » en cas de panne — aurait produit un système silencieux et faux.

### 5.2 Le piège du détecteur de fraude

Le premier réflexe est l'adresse IP : plusieurs signatures depuis la même. **C'est un mauvais détecteur.**

Le parcours parfaitement légitime — l'artisan est chez son client, celui-ci signe depuis le même réseau — produit exactement cette signature. Le taux de faux positifs serait tel que le détecteur serait ignoré en une semaine, et **un détecteur ignoré ne détecte rien**.

Le **téléphone du signataire** est bien meilleur : le code SMS part vers un numéro, et le même numéro pour trois clients différents ne s'explique pas par une visite à domicile.

Le seuil est à **trois** clients, pas deux : un même particulier saisi deux fois sous deux fiches est un accident de saisie courant. Trois est difficile à expliquer. Le seuil est déclaré dans le code du détecteur et se règle sans refonte.

> Ce détecteur est classé `signal` et ne déclenche jamais de sanction. Il désigne un dossier à regarder — conformément au principe du §2.

## 6. L'écran

`src/app/(admin)/supervision` — l'espace interne existe depuis M3, gardé par `currentStaff`. La file d'attestations reste où elle est ; la supervision y renvoie plutôt que de la ré-implémenter.

Une liste, triée par gravité puis par ancienneté. Chaque ligne : le type, ce qui ne va pas, depuis quand, un lien pour agir. Les anomalies de type `signal` portent en plus un formulaire d'examen — verdict et motif.

**Rien d'autre.** Pas de courbe, pas de compteur décoratif. La question à laquelle l'écran répond est binaire : *quelque chose demande-t-il un humain ?* Une liste vide est la bonne réponse la plupart des jours.

## 7. L'alerte

Le travail de fond quotidien existe déjà (`/api/cron/echeances`). Il calcule les anomalies au passage et, **s'il en existe de bloquantes**, envoie **un seul relevé** aux adresses de `staff`.

Aucune nouvelle planification : une planification de plus, c'est une façon de plus de tomber en panne sans qu'on le sache.

> **Seules les `blocking` alertent.** Une attestation qui attend deux jours n'a pas à réveiller quelqu'un un dimanche ; une source morte, si. Alerter sur tout revient à n'alerter sur rien.

## 8. Modèle de données

Une seule table.

```
anomaly_review
  id                 uuid
  type               text        -- le type d'anomalie
  subject_id         uuid        -- ce qu'on a examiné
  facts_fingerprint  text        -- l'état examiné (§4.3)
  verdict            text        -- 'benign' | 'confirmed'
  note               text        -- obligatoire
  reviewed_by        uuid        -- staff.user_id
  reviewed_at        timestamptz
  unique (type, subject_id, facts_fingerprint)
```

`confirmed` n'entraîne **aucune action automatique**. Il enregistre qu'un humain a constaté un problème réel ; la suite — contact, suspension pour fait vérifiable, invalidation d'un événement frauduleux — relève de gestes distincts et tracés, hors périmètre de cette spec.

## 9. Ce que le backoffice ne fait pas

Des refus, pas des oublis.

- **Aucune surveillance de disponibilité du site.** C'est le métier de l'hébergeur, il le fait mieux et gratuitement.
- **Aucune courbe, aucune série temporelle.** Un tableau de bord qu'on regarde par curiosité n'est pas un outil.
- **Aucune agrégation de journaux.**
- **Aucune analyse par entreprise.** C'est le passeport — M5.
- **Aucun pouvoir sur les chiffres.** Rien ici ne modifie un label, un classement ou une métrique.
- **Aucune action de masse.** Un geste sur une entreprise se fait dossier par dossier, et se trace.

## 10. Vérification

- **Les quatre détecteurs** : tests unitaires, sur instantanés construits à la main. Chaque seuil a son cas juste en dessous et juste au-dessus.
- **La suppression par examen** : un test montre qu'une anomalie examinée disparaît, et qu'elle **réapparaît quand un fait nouveau change l'empreinte**. C'est la propriété qui empêche l'aveuglement.
- **Le relevé** : testé avec un envoi simulé, comme `expiry-notice` — on vérifie qu'il ne part pas quand rien ne bloque.
- **L'assemblage** : un test d'intégration sur la file complète.

## 11. Ce qui reste ouvert

- **Le seuil de trois clients** de `shared_signer` est un pari. À revoir dès qu'on aura observé de vrais dossiers.
- **`certificate_waiting` ignore les jours fériés.** Deux jours ouvrés calculés sur le seul week-end suffisent au démarrage ; un calendrier des fériés serait du travail pour un gain nul à ce volume.
- **Les gestes qui suivent un `confirmed`** — invalider un événement frauduleux, suspendre pour fait vérifiable — sont hors périmètre. L'AIPD a défini le mécanisme (l'événement rectificatif) ; il se construira avec les métriques, en M5.
