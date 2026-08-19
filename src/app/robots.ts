import type { MetadataRoute } from 'next'

/**
 * Le `noindex` de `/verification/[siret]` suffit a Google, mais pas a un robot
 * qui ne lit que ce fichier. Les deux disent la meme chose, et c'est voulu.
 *
 * `/verification/` constate l'absence de couverture d'un tiers qui n'a rien
 * demande ; `/stop` porte un jeton d'opposition dans son URL. Ni l'un ni l'autre
 * n'a de raison d'exister dans un index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/verification/', '/stop'] },
  }
}
