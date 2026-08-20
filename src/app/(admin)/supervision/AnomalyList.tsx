import type { Anomaly, Severity } from '@/domain/anomaly'
import { Badge } from '@/ui/atoms/badge'
import { Icon, type IconName } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { ReviewForm } from './ReviewForm'

const LABELS: Record<Severity, string> = {
  blocking: 'Bloquant',
  attention: 'À traiter',
  signal: 'À regarder',
}

/** Le ton du badge. La couleur ne porte jamais seule l'information : le mot et
 * l'icone la doublent, et c'est le compilateur qui l'impose. */
const TONES: Record<Severity, 'danger' | 'warning' | 'neutral'> = {
  blocking: 'danger',
  attention: 'warning',
  signal: 'neutral',
}

const ICONS: Record<Severity, IconName> = {
  blocking: 'alert',
  attention: 'clock',
  signal: 'document',
}

const days = (since: Date, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - since.getTime()) / 86_400_000))

/**
 * L'anciennete, en francais plutot qu'en arithmetique.
 *
 * « depuis 0 j » se lisait sur la file — un compte de jours rendu tel quel,
 * qui oblige le relecteur a traduire zero en « aujourd'hui ». Le singulier
 * manquait aussi : « depuis 1 j ».
 */
function since(from: Date, now: Date): string {
  const count = days(from, now)
  if (count === 0) return "depuis aujourd’hui"
  if (count === 1) return 'depuis hier'
  return `depuis ${count} jours`
}

export function AnomalyList({ anomalies, now }: { anomalies: Anomaly[]; now: Date }) {
  return (
    <ul className="flex flex-col gap-3">
      {anomalies.map((anomaly) => (
        <li key={`${anomaly.type}-${anomaly.subjectId}`}>
          <Card elevation="e1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Badge tone={TONES[anomaly.severity]} icon={<Icon name={ICONS[anomaly.severity]} size="sm" />}>
                {LABELS[anomaly.severity]}
              </Badge>
              <Text as="span" size="sm">
                {anomaly.detail}
              </Text>
              <Text as="span" size="sm" tone="muted">
                {since(anomaly.since, now)}
              </Text>
              <span className="ml-auto text-sm">
                <Link href={anomaly.href} standalone>Ouvrir</Link>
              </span>
            </div>

            {/* Seuls les signaux s'examinent : les autres se resolvent en etant traites. */}
            {anomaly.severity === 'signal' && <ReviewForm anomaly={anomaly} />}
          </Card>
        </li>
      ))}
    </ul>
  )
}
