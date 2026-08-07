# Signature électronique du devis — décision

> Task 1 du plan [M1 — Le devis qui se signe](../plans/2026-08-07-m1-devis-signe.md).
> Date : 2026-08-07 · Statut : conclu

**Décision : signature électronique simple, développée en interne, avec vérification du signataire par code SMS, archivage immuable du PDF signé et horodatage RFC 3161 non bloquant. Aucun prestataire payant en M1.**

Deux conséquences imposent une modification du plan — voir §5.

---

## 1. Le cadre juridique

Un devis de travaux est un contrat consensuel : **aucune forme n'est imposée**. La signature électronique simple est donc valable. L'article 25 du règlement eIDAS (n° 910/2014) interdit d'ailleurs de refuser une signature comme preuve au seul motif qu'elle est électronique, et l'article 1366 du Code civil donne à l'écrit électronique la même force probante qu'au papier, sous réserve d'identifier son auteur et de garantir son intégrité.

**Le point qui décide de tout est ailleurs — c'est la charge de la preuve.** L'article 1367 alinéa 2 réserve la **présomption de fiabilité** à la seule signature **qualifiée** :

| Niveau de signature | Qui doit prouver quoi en cas de contestation |
|---|---|
| **Qualifiée** | Celui qui **conteste** doit démontrer que le procédé n'est pas fiable |
| **Avancée ou simple** | Celui qui **s'en prévaut** doit prouver l'intégrité de l'acte, l'identification du signataire, et le lien entre la signature et l'acte |

En signature simple, **c'est donc à nous (et à l'artisan) de produire la preuve**. Ce n'est pas rédhibitoire — c'est une exigence de conception. Notre piste d'audit doit adresser explicitement les **trois** éléments ci-dessus, séparément.

> **À ne jamais faire :** qualifier notre signature d'« avancée » dans l'interface ou la documentation commerciale. Le niveau avancé au sens d'eIDAS suppose notamment que le signataire crée la signature avec des données sous son **contrôle exclusif**, ce qu'un lien e-mail ne procure pas. Sur-vendre le niveau serait un risque juridique à soi seul.

## 2. Ce que la piste d'audit doit prouver

| Exigence légale | Comment on y répond |
|---|---|
| **Intégrité de l'acte** | Empreinte SHA-256 du PDF exact soumis à la signature + **archivage immuable de ce PDF** |
| **Identification du signataire** | Lien e-mail nominatif **+ code à usage unique envoyé par SMS** au numéro fourni par l'artisan |
| **Lien signature ↔ acte** | L'empreinte est scellée dans le jeton d'horodatage et stockée avec la signature |

**L'identification était le point faible de la conception initiale.** Un clic sur un lien e-mail prouve le contrôle d'une boîte de réception, pas l'identité d'une personne. Ajouter un code SMS prouve en plus le contrôle d'un numéro de téléphone que l'artisan a saisi indépendamment — deux canaux distincts, c'est ce qui fait la différence devant un juge. Coût marginal : environ 0,045 € par SMS.

## 3. L'horodatage

**Autorité retenue : [FreeTSA](https://freetsa.org/tsr)** — gratuite, sans restriction d'usage commercial déclarée, SHA-256 supporté, certificat valide jusqu'en 2040, jeton vérifiable hors ligne avec OpenSSL :

```bash
openssl ts -verify -in devis.tsr -queryfile devis.tsq -CAfile cacert.pem -untrusted tsa.crt
```

**Secours : [DFN](http://zeitstempel.dfn.de)** (Deutsches Forschungsnetz), également gratuite.

Trois limites à assumer et à consigner :

- FreeTSA n'offre **aucun engagement de service**. L'horodatage doit donc rester **non bloquant** : si la TSA ne répond pas, la signature est enregistrée sans jeton. C'est déjà ce que prévoit le plan.
- Elle n'est **pas un prestataire de service de confiance qualifié** au sens eIDAS et ne figure pas sur la liste de confiance européenne. Le jeton renforce techniquement la preuve de date et d'intégrité ; **il ne crée aucune présomption légale**.
- Le site demande explicitement de ne pas abuser du service. À 4 000 signatures par mois c'est raisonnable ; à 100 000, il faudra une TSA commerciale (quelques centimes par jeton) ou une convention.

## 4. Le coût d'un prestataire — pourquoi il est reporté

Hypothèse de charge : **200 entreprises × 20 devis par mois = 4 000 signatures mensuelles**, soit 48 000 par an.

| Solution | Coût mensuel estimé | Coût annuel |
|---|---|---|
| **Interne + FreeTSA + SMS** | **~180 €** (SMS uniquement) | **~2 160 €** |
| Yousign, abonnement Pro (25 €HT/mois/utilisateur, 50 envois inclus) | ~5 000 € | ~60 000 € |
| Signature **qualifiée** (10–20 € l'unité selon les prestataires) | 40 000 – 80 000 € | 480 000 € et au-delà |

**Un facteur d'environ 30 face à l'abonnement, et de plusieurs centaines face au qualifié — sur un produit dont M1 est gratuit et ne génère aucun revenu.** La question est tranchée.

> Ces tarifs proviennent de comparateurs, donc de sources secondaires. Ils suffisent largement à trancher un écart de cet ordre, mais devront être **confirmés directement auprès des éditeurs** avant toute décision en M7.

**Position en M7 :** la signature **qualifiée** devient une option facturée de l'abonnement Pro, activable par l'artisan devis par devis. À 10–20 € l'unité, elle n'a de sens qu'au-delà d'un certain montant de chantier — c'est précisément l'arbitrage que l'artisan doit pouvoir faire lui-même.

## 5. Modifications à apporter au plan M1

**A. Archiver le PDF signé — correction d'un défaut réel.**
La Task 14 régénère le PDF au moment de la signature, le hache, puis le jette. Le jour où le gabarit PDF change, la régénération produit un document différent et **l'empreinte stockée ne correspond plus à rien**. Toute la preuve d'intégrité s'effondre silencieusement, et on ne s'en apercevrait qu'en litige.

→ Le PDF exact soumis à la signature doit être **écrit dans Supabase Storage, en écriture unique**, et son chemin conservé dans la table `signature`.

**B. Ajouter la vérification par SMS.**
Envoi d'un code à six chiffres au numéro du client, validité dix minutes, trois tentatives maximum. Le numéro et l'horodatage de la validation rejoignent la piste d'audit.
Conséquence sur le modèle : `client.telephone` devient **obligatoire** dès lors qu'un devis est envoyé.

**C. Compléter la table `signature`** avec `cheminPdfArchive`, `telephoneSignataire` et `codeValideLe`.

## 6. Sources

- [Article 1367 du Code civil](https://www.doctrine.fr/l/texts/codes/LEGITEXT000006070721/articles/LEGIARTI000006438508)
- [La signature électronique à l'épreuve du droit commun de la preuve — Lexbase](https://www.lexbase.fr/article-juridique/133515189-observationslasignatureelectroniquealepreuvedudroitcommundelapreuve)
- [Contestation d'une signature électronique : charge de la preuve — Le Monde du Droit](https://www.lemondedudroit.fr/judiciaire/325-procedure-civile/104238-contestation-d-une-signature-electronique-charge-de-la-preuve.html)
- [Charge de la preuve et signature électronique — Cabinet Murielle Cahen](https://www.murielle-cahen.fr/charge-de-la-preuve-et-signature-electronique/)
- [Signature de devis en ligne : conditions de validité légale — Mondevis](https://mondevis.com/blog/signature-devis-legale/)
- [FreeTSA — Free Time Stamp Authority](https://www.freetsa.org/index_en.php)
- [Liste de serveurs RFC 3161 gratuits](https://gist.github.com/Manouchehri/fd754e402d98430243455713efada710)
- [Yousign vs Universign — comparatif tarifaire 2026](https://tool-advisor.fr/signature-electronique/comparatif/yousign-vs-universign/)
- [Yousign : tarifs 2026 — StackIndep](https://stackindep.fr/signature-electronique/yousign-prix)
