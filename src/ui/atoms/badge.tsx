import { cn } from '@/ui/cn'

const TONES = {
  neutral: 'bg-rule/50 text-ink-soft',
  verified: 'bg-verified-bg text-verified',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
} as const

/**
 * Une pastille de statut.
 *
 * `icon` est obligatoire, et ce n'est pas un oubli d'`?` : la couleur ne doit
 * jamais porter seule l'information, sans quoi l'ecran devient illisible pour
 * un daltonien et sur un devis photocopie. Le rendre requis fait appliquer la
 * regle par le compilateur plutot que par la revue.
 */
export function Badge({
  tone,
  icon,
  testId,
  children,
}: {
  tone: keyof typeof TONES
  icon: React.ReactNode
  /**
   * Crochet de test. Les parcours Playwright interrogent la pastille de statut
   * par `data-testid` : sans ce passage, la reprise des ecrans les casserait.
   */
  testId?: string
  children: React.ReactNode
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-badge px-2.5 py-1',
        'text-xs font-semibold',
        TONES[tone],
      )}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
      {children}
    </span>
  )
}
