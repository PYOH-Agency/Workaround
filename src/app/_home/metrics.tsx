import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'

export interface Metric {
  label: string
  value: string
  note: string
}

/**
 * Deux bandes, jamais une.
 *
 * Deux de ces chiffres figurent sur la fiche que les clients consultent, deux
 * non. Les melanger ferait passer une mesure interne pour une mesure publique.
 */
export function Metrics({
  title,
  subtitle,
  metrics,
  detailHref,
}: {
  title: string
  subtitle?: string
  metrics: Metric[]
  detailHref?: string
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <Heading level={3} as="h2">
          {title}
        </Heading>
        {subtitle ? (
          <Text size="sm" tone="muted" as="span">
            {subtitle}
          </Text>
        ) : null}
      </div>

      <div className="grid gap-10 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex flex-col gap-2 border-t border-rule pt-4">
            <Text size="sm" tone="muted" as="p">
              {metric.label}
            </Text>
            <Heading level={2} as="p">
              {metric.value}
            </Heading>
            <Text size="sm" tone="muted" as="p">
              {metric.note}
            </Text>
          </div>
        ))}
      </div>

      {detailHref ? <Link href={detailHref} standalone>Voir votre passeport</Link> : null}
    </section>
  )
}
