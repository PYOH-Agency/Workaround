# Travailler sur plusieurs worktrees à la fois

Par défaut, tous les worktrees d'un dépôt partagent une seule pile Supabase
locale — mêmes conteneurs, mêmes ports 54320-54329 — et un seul serveur de
développement sur le port 3000. Deux branches ouvertes en parallèle se marchent
alors dessus de deux façons, dont aucune ne se diagnostique facilement :

- le `db reset` de l'une efface la base de l'autre en plein milieu d'une suite
  de tests, et une table dont la migration n'existe que sur une branche
  disparaît sans que rien ne l'explique ;
- `reuseExistingServer` de Playwright s'attache au serveur qui écoute déjà sur
  3000, si bien que les parcours d'un worktree s'exécutent contre
  l'**application d'un autre**, branchée sur une autre base. Tout répond 200,
  et les échecs semblent venir du code qu'on vient d'écrire.

## Donner sa propre pile à un worktree

```bash
pnpm db:worktree
pnpm db:start
```

`pnpm db:worktree` crée `.supabase-local/` — non versionné — avec :

- un `project_id` distinct, donc des conteneurs Docker distincts ;
- une bande de dix ports libres, cherchée et non devinée, puis figée : les ports
  d'un worktree ne bougent plus tant qu'il existe ;
- un port d'application dérivé de cette bande (décalage de 10 → port 3010) ;
- des liens vers `supabase/migrations`, `seed.sql` et `templates` : un fichier,
  une vérité.

Les fichiers `.env.local` et `.env.test` sont réécrits en conséquence — ports de
la base, de l'API, du collecteur de courrier, du SMTP, et `APP_URL`. Ils ne sont
pas versionnés, donc cela n'engage que ce worktree.

Toutes les commandes suivent : `pnpm dev`, `pnpm db:reset`, `pnpm test:e2e`.
Un worktree sans `.supabase-local/` — le principal, typiquement — garde
exactement le comportement d'avant : `supabase/` et le port 3000.

Pour y renoncer : `pnpm db:stop`, puis supprimer `.supabase-local/`, et remettre
les ports d'origine dans les fichiers `.env`.

## Deux pièges rencontrés

**`docker restart` sur le proxy Kong ne répare rien et casse la pile.** La CLI
injecte la configuration de Kong au démarrage du conteneur ; elle ne survit pas
à un redémarrage, et le conteneur sort en 127. Si l'authentification répond 502,
c'est `pnpm db:stop` puis `pnpm db:start`.

**La CLI Supabase doit être en 2.113 ou plus.** En 2.111, un `db reset` recréait
le conteneur d'authentification avec une nouvelle adresse Docker que Kong ne
rechargeait pas : toutes les requêtes d'authentification répondaient 502 et les
liens magiques n'arrivaient plus. Le symptôme — « aucun message après 10 s » —
ne désignait pas sa cause.
