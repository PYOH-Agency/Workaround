# Récupération des données d'entreprise — décision

> Task 10 du plan [M1 — Le devis qui se signe](../plans/2026-08-07-m1-devis-signe.md).
> Date : 2026-08-08 · Statut : conclu

**Décision : on utilise l'API Recherche d'Entreprises de data.gouv, pas l'API Sirene de l'INSEE. Aucune clé, aucune inscription, aucun jeton à faire tourner.**

---

## 1. Pourquoi pas l'API Sirene de l'INSEE

Elle fonctionne, mais elle impose une inscription sur `portail-api.insee.fr`, la création d'une application, la génération de clés, et un en-tête d'authentification propriétaire. Le portail et ses modalités ont déjà changé plusieurs fois, et l'autorité de certification a encore migré en avril 2026 — c'est une dépendance qui demande de l'entretien.

Surtout : **elle bloquerait le développement sur l'obtention d'une clé**, pour une donnée qui est par ailleurs entièrement publique.

## 2. Ce qu'on utilise

```
GET https://recherche-entreprises.api.gouv.fr/search
    ?q=<siret>
    &minimal=true
    &include=matching_etablissements
    &per_page=1
```

Pas d'en-tête, pas de jeton. Données issues de Sirene et du RNE, mises à jour quotidiennement. C'est le moteur de l'Annuaire des Entreprises.

### Deux subtilités qui font échouer une intégration naïve

**`q=<siret>` fait une recherche plein texte et renvoie l'unité légale avec son *siège*, pas l'établissement demandé.** Interroger le SIRET `55210055400021` renvoie un objet dont `siege.siret` vaut `55210055400054`. Il faut demander `include=matching_etablissements` et lire `matching_etablissements[0]` — qui contient bien l'établissement exact.

Corollaire défensif : **vérifier que le SIRET retourné est celui demandé** avant de l'utiliser. La recherche est floue par nature.

**`include` exige `minimal=true`.** Sans lui, l'API répond une erreur explicite.

### La subtilité qui compte le plus pour nous

**Pour un entrepreneur individuel, `nom_raison_sociale` est `null`.** Le nom se trouve dans `nom_complet`, qui porte le nom de la personne suivi de l'enseigne entre parenthèses :

```
nom_complet        : "FABRICE CASSOU (FCMI PLOMBERIE)"
nom_raison_sociale : null
nature_juridique   : "1000"
```

Ce n'est pas un cas marginal : sur les plombiers de Gironde, on compte 157 entrepreneurs individuels. C'est la forme dominante du métier, exactement comme le spec le supposait.

→ **Toujours lire `nom_complet`, jamais `nom_raison_sociale`.**

## 3. Correspondance des champs

| Notre modèle | Source |
|---|---|
| `siret` | `matching_etablissements[0].siret` |
| `raisonSociale` | `nom_complet` |
| `formeJuridique` | `nature_juridique` (code, ex. `1000` pour EI, `5710` pour SASU) |
| `dateCreation` | `date_creation` (unité légale) |
| `actif` | `etat_administratif === 'A'` sur l'établissement |
| `adresseLigne1` | `matching_etablissements[0].adresse`, privé de son code postal et de sa commune |
| `codePostal` | `matching_etablissements[0].code_postal` |
| `ville` | `matching_etablissements[0].libelle_commune` |

L'adresse d'un `matching_etablissement` n'est **pas décomposée** (`numero_voie`, `type_voie`, `libelle_voie` sont nuls) — seule la chaîne complète est fournie. C'est sans conséquence : l'adresse de l'entreprise est de l'affichage. L'adresse d'un chantier, elle, passe par notre propre normalisation, qui porte la déduplication du logement.

## 4. Un gain inattendu pour M3

L'API expose **`complements.est_rge`** et **`liste_rge`** par établissement, gratuitement.

Le RGE est l'une des habilitations bloquantes du niveau 3 de notre dispositif de vérification — sans lui, le client perd MaPrimeRénov', les CEE et l'éco-PTZ. On pensait devoir traiter l'open data ADEME ; c'est déjà là, dans le même appel que l'inscription. **Vérifié sur des données réelles** : une entreprise de plomberie de Bassens ressort à `est_rge: true`.

Sont également exposés `est_entrepreneur_individuel`, `est_qualiopi`, `est_ess`, ainsi que la convention collective — autant de signaux exploitables plus tard.

## 5. Risques

| Risque | Traitement |
|---|---|
| **Aucun engagement de service** — API publique et gratuite | L'échec de la recherche ne doit jamais bloquer l'inscription : prévoir une saisie manuelle en repli |
| **Limitation de débit** par IP (de l'ordre de quelques requêtes par seconde sur l'instance publique) | Sans objet à notre volume — une recherche par inscription. À revérifier si on l'utilise ailleurs |
| **Recherche floue** — `q` n'est pas une clé primaire | Rejeter toute réponse dont le SIRET ne correspond pas exactement à la demande |
| **Codes de forme juridique non libellés** | Stocker le code. Le libellé viendra d'une nomenclature publique quand un écran en aura besoin |

## 6. Sources

- [API Recherche d'Entreprises — data.gouv.fr](https://www.data.gouv.fr/dataservices/api-recherche-dentreprises)
- [Code source de l'API](https://github.com/annuaire-entreprises-data-gouv-fr/search-api)
- [Annuaire des Entreprises](https://annuaire-entreprises.data.gouv.fr)
- [Catalogue des API de l'Insee](https://portail-api.insee.fr/)
- [Modalités de connexion aux API de l'Insee (PDF)](https://www.sirene.fr/static-resources/documentation/Insee_API_publique_modalites_connexion.pdf)
