# Convention de numérotation

Deux outils écrivent dans ce dossier, et Supabase applique les fichiers dans
l'ordre lexicographique de leur nom.

- `0000_`, `0001_`, … : **générés par `drizzle-kit generate`**. Ne jamais les
  renommer ni les éditer — Drizzle suit sa propre séquence dans `meta/`.
- `9000_` et au-delà : **écrits à la main** (déclencheurs, politiques, données
  de référence). Le préfixe élevé garantit qu'ils s'appliquent après les
  tables, et surtout qu'une future génération Drizzle ne réutilisera jamais
  leur numéro.

Sans cette séparation, `drizzle-kit generate` produit un `0001_…` qui entre en
collision avec un `0001_…` écrit à la main, et l'ordre d'application devient
une affaire de chance alphabétique.
