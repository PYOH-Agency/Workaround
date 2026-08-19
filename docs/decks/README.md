# Les decks

Une seule page, trois decks, une bascule en haut : **artisans**, **demandeurs**,
**partenaires**. Ils partagent la charte du produit — jetons de `src/ui/tokens.css`,
Bricolage Grotesque en titrage, Archivo pour le logotype — et la règle des deux
bandes d'encre par deck.

| Fichier | Contenu |
|---|---|
| [2026-08-19-decks-dequerre.html](2026-08-19-decks-dequerre.html) | Les trois decks, autonomes dans un seul fichier |

**Pourquoi trois publics dans un seul fichier.** Une charte qui vit en trois
exemplaires diverge au premier amendement. La bascule coûte quinze lignes de
script et garantit que les trois disent la même chose de la même façon.

**Ouvrir.** Le fichier se double-clique. Les polices sont embarquées en base64
depuis `src/pdf/fonts` : il n'y a aucune requête sortante, et il s'envoie par
courriel sans rien perdre. C'est aussi ce qui explique ses 400 ko.

**Présenter.** Flèches, `Page haut` / `Page bas`, `Début` / `Fin`, ou le rail à
droite. `Ctrl/⌘ + P` sort un PDF à une diapositive par page — seul le deck
affiché est imprimé.

**Ce que les decks ne racontent pas.** Aucun chiffre d'usage, aucun client cité,
aucune fonction annoncée qui n'existe pas. La diapositive « ce qu'on peut faire
ensemble » du deck partenaires dit en toutes lettres que la vue par parc reste à
écrire : le produit est conçu pour l'entreprise artisanale et pour le
particulier qui signe.
