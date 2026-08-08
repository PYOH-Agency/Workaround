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
  newTab = false,
  children,
}: {
  href: string
  tone?: keyof typeof TONES
  /**
   * A reserver aux liens qui ne doivent pas faire perdre la page en cours.
   *
   * Le cas qui l'a rendu necessaire : la mention d'information sur la page de
   * signature. Quitter la page pour la lire obligerait le client a redemander
   * un code SMS, et une friction sur cet ecran coute une signature.
   */
  newTab?: boolean
  children: React.ReactNode
}) {
  const className = cn('rounded-badge', TONES[tone])

  // Un lien sortant ouvre toujours un onglet et coupe la reference — `next/link`
  // ne sert a rien hors de l'application.
  if (href.startsWith('http') || newTab) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }

  return (
    <NextLink href={href} className={className}>
      {children}
    </NextLink>
  )
}
