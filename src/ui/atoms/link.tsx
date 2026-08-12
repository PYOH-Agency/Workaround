import NextLink from 'next/link'
import { cn } from '@/ui/cn'

const TONES = {
  /**
   * Souligne par defaut : la couleur ne porte jamais seule l'information
   * « ceci est un lien ».
   */
  default: 'text-link underline underline-offset-2 hover:no-underline',
  /** Pour un lien qui enveloppe une carte entiere, ou le soulignement nuirait. */
  bare: 'text-ink hover:text-link',
} as const

export function Link({
  href,
  tone = 'default',
  standalone = false,
  newTab = false,
  testId,
  children,
}: {
  href: string
  tone?: keyof typeof TONES
  /**
   * Un lien qui est une ACTION a lui seul, et non un mot dans une phrase.
   *
   * Il porte alors les 44 px de cible tactile que la charte impose partout
   * ailleurs. Mesure avant : « Ouvrir » dans la file de supervision faisait
   * **17 px** — moins de la moitie —, « Voir votre passeport » et « Ouvrir
   * l'agenda » 24 px. Sept « Ouvrir » empiles a 17 px sur un telephone, c'est
   * une erreur de clic par ligne.
   *
   * Pas de reglage sur `Link` tout court : un lien au fil d'une phrase ne doit
   * PAS faire 44 px de haut, il creverait l'interligne. C'est l'appelant qui
   * sait lequel des deux il pose, et le nom le lui demande.
   */
  standalone?: boolean
  /**
   * A reserver aux liens qui ne doivent pas faire perdre la page en cours.
   *
   * Le cas qui l'a rendu necessaire : la mention d'information sur la page de
   * signature. Quitter la page pour la lire obligerait le client a redemander
   * un code SMS, et une friction sur cet ecran coute une signature.
   */
  newTab?: boolean
  /**
   * Crochet de test, pose sur l'ancre elle-meme.
   *
   * L'envelopper dans un `<span>` porteur du `data-testid` paraissait plus
   * propre, mais un parcours lit `getAttribute('href')` dessus : le span n'en a
   * pas, et le test partait vers `null`. Le crochet doit etre sur l'element qui
   * porte l'information.
   */
  testId?: string
  children: React.ReactNode
}) {
  // `inline-flex` et non `block` : le lien garde sa largeur de texte, donc il
  // reste posable dans une rangee sans s'etaler sur toute la ligne.
  const className = cn(
    'rounded-badge',
    TONES[tone],
    standalone && 'inline-flex min-h-11 items-center',
  )

  // Un lien sortant ouvre toujours un onglet et coupe la reference — `next/link`
  // ne sert a rien hors de l'application.
  if (href.startsWith('http') || newTab) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        data-testid={testId}
      >
        {children}
      </a>
    )
  }

  return (
    <NextLink href={href} className={className} data-testid={testId}>
      {children}
    </NextLink>
  )
}
