# Opérateur SMS — décision

> Point bloquant identifié à la clôture de M1.
> Date : 2026-08-08 · Statut : conclu, avec une démarche administrative à lancer

**Décision : Brevo, pour l'e-mail et le SMS. Et une déclaration d'émetteur à engager sans attendre.**

---

## 1. Pourquoi c'est bloquant

Le code à usage unique envoyé par SMS porte **l'identification du signataire**. En signature électronique simple, la charge de la preuve pèse sur celui qui s'en prévaut ; sans ce canal, il ne reste que le clic dans un e-mail, qui prouve le contrôle d'une boîte de réception et non une identité.

Sans opérateur, la signature ne vaut donc pas grand-chose — et la signature est le pivot du système de mesure du passeport.

## 2. Le choix

**Brevo**, pour trois raisons :

- **Un seul fournisseur pour l'e-mail et le SMS.** Nous n'avons pas non plus de service d'e-mail en production : aujourd'hui les liens de devis partent vers un collecteur local. Deux besoins, un contrat.
- **Hébergement européen, ISO 27001 et SOC 2, sans transfert hors UE.** Ce point pèsera lourd au cadrage RGPD : un sous-traitant certifié et européen est infiniment plus simple à justifier.
- **Maturité.** L'alternative sérieuse, Sweego, est plus séduisante sur la souveraineté — française, hébergée chez OVH et Scaleway, positionnement anti-CLOUD Act — mais l'éditeur reconnaît lui-même n'avoir *« aucune certification de sécurité formelle à ce jour »*, et le produit, lancé en 2024, présente encore des manques (authentification des webhooks, gestion d'équipe). Sur un produit dont l'argument central est la confiance, c'est un handicap.

À revoir si la souveraineté devient un argument commercial explicite, notamment auprès des bailleurs sociaux et des collectivités.

**Ordre de grandeur du coût :** de 0,035 à 0,059 € par SMS selon le volume. À 200 entreprises et 20 devis par mois, en comptant un code par signature, on reste sous 200 € mensuels.

## 3. La démarche à lancer maintenant

> **L'émetteur alphanumérique doit être déclaré au registre tenu par l'AF2M**, l'association des opérateurs. Obligatoire depuis 2022, et **durci au 1er mars 2026** : les nouvelles exigences s'appliquent à tout trafic SMS acheminé vers les réseaux mobiles français, quel que soit le pays d'origine de l'expéditeur.

Ce que ça implique :

- déclaration auprès de l'opérateur, qui la relaie au registre ;
- **vérification du droit d'usage de la marque** — il faut pouvoir justifier de « Workaround » ;
- **seuls les caractères A-Z et 0-9 sont admis** : ni espace, ni tiret, ni tiret bas, ni point.

C'est un **délai administratif**, pas une ligne de code. À engager dès que le nom commercial est arrêté, sans attendre le déploiement : un SMS émis sous un émetteur non déclaré sera filtré par les opérateurs, et la signature deviendra impossible en production alors qu'elle fonctionne en développement.

## 4. Ce qui est implémenté

- `src/services/sms.ts` — aiguillage par `SMS_PROVIDER`. Vide en développement : le message part vers le collecteur de mail local, et le parcours reste vérifiable sans compte tiers ni frais. `brevo` en production. Tout autre valeur lève une erreur plutôt que d'envoyer dans le vide.
- `src/domain/phone.ts` — normalisation au format international attendu par les opérateurs, et **refus des numéros fixes** : un code SMS n'y arrivera jamais.
- La validation du numéro se fait **à la création du devis**, pas à la signature. Sinon l'artisan enverrait son devis sans rien remarquer, et c'est le client qui découvrirait le problème, au pire moment.
- Le corps des réponses de l'opérateur n'est jamais remonté dans une erreur : il contient le numéro du destinataire, qui n'a rien à faire dans un journal.

## 5. Sources

- [Nouvelle réglementation sur les expéditeurs SMS en France — LINK Mobility](https://www.linkmobility.com/fr/news/nouvelle-reglementation-sur-les-expediteurs-sms-en-france)
- [Réglementation SMS 2026 : nouvelles règles au 1er mars](https://isee-u.fr/blog/reglementation-af2m-expediteur-sms-2026/)
- [Sweego — API e-mail et SMS transactionnels](https://www.sweego.io/transactional-sms)
- [Comparatif des API SMS en France](https://www.smspartner.fr/blog/meilleure-api-sms/)
- [Les meilleures API e-mail pour développeurs — Brevo](https://www.brevo.com/fr/blog/meilleures-email-api-pour-developpeurs/)
