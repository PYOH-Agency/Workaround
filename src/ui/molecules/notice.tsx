import { Icon, type IconName } from '@/ui/atoms/icon'
import { cn } from '@/ui/cn'

const TONES = {
  danger: 'border-danger bg-danger-bg text-danger',
  warning: 'border-warning bg-warning-bg text-warning',
  verified: 'border-verified bg-verified-bg text-verified',
} as const

const GLYPHS: Record<keyof typeof TONES, IconName> = {
  danger: 'alert',
  warning: 'alert',
  verified: 'check',
}

/**
 * Un encart qui interrompt la lecture.
 *
 * Il existait deja, ecrit a la main cinq fois — `SituationForm`, `TeamPanel`,
 * `CancelButton`, la synchronisation d'agenda, le repertoire — avec la meme
 * chaine de classes recopiee, et deja deux espacements divergents. Le nommer
 * n'ouvre pas une extension : il arrete une derive.
 *
 * **`alert` n'est pas le defaut**, et c'est la seule decision de ce composant.
 * `role="alert"` fait interrompre le lecteur d'ecran des l'apparition du nœud :
 * c'est juste pour une erreur qui vient de survenir, et faux pour une mise en
 * garde permanente — le repertoire en affiche une a chaque rendu, qui parlerait
 * a chaque navigation. Le poser demande donc de le demander.
 *
 * Le pictogramme accompagne la couleur sans la doubler exactement : ici c'est
 * la phrase qui porte l'information, contrairement a `Badge` ou un seul mot
 * doit se lire sans couleur.
 */
export function Notice({
  tone,
  alert = false,
  testId,
  children,
}: {
  tone: keyof typeof TONES
  /** A reserver a ce qui vient d'echouer. Voir ci-dessus. */
  alert?: boolean
  testId?: string
  children: React.ReactNode
}) {
  return (
    <div
      role={alert ? 'alert' : undefined}
      data-testid={testId}
      className={cn('flex items-start gap-3 rounded-card border px-4 py-3 text-sm', TONES[tone])}
    >
      <span aria-hidden="true" className="mt-0.5 inline-flex shrink-0">
        <Icon name={GLYPHS[tone]} size="sm" />
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
