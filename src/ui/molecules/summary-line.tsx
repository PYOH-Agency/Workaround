import type { Cents } from '@/domain/money'
import { Money } from '@/ui/atoms/money'
import { cn } from '@/ui/cn'

/**
 * Une ligne libelle / montant.
 *
 * Le libelle et le montant sont pousses aux extremites, et le montant est en
 * chiffres tabulaires : c'est ce qui fait que plusieurs lignes empilees
 * s'alignent sur la virgule.
 */
export function SummaryLine({
  label,
  cents,
  emphasis = 'normal',
  testId,
}: {
  label: React.ReactNode
  cents: Cents
  emphasis?: 'normal' | 'muted' | 'total'
  testId?: string
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-1',
        emphasis === 'total' && 'mt-1 border-t border-rule pt-2',
      )}
    >
      <span className={cn('text-sm', emphasis === 'muted' ? 'text-ink-muted' : 'text-ink')}>
        {label}
      </span>
      <Money
        cents={cents}
        emphasis={emphasis === 'total' ? 'strong' : 'normal'}
        testId={testId}
      />
    </div>
  )
}
