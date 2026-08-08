import Link from 'next/link'
import type { Anomaly, Severity } from '@/domain/anomaly'
import { ReviewForm } from './ReviewForm'

const SEVERITY_LABELS: Record<Severity, string> = {
  blocking: 'Bloquant',
  attention: 'À traiter',
  signal: 'À regarder',
}

const SEVERITY_STYLES: Record<Severity, string> = {
  blocking: 'text-red-600',
  attention: 'text-amber-600',
  signal: 'opacity-60',
}

const days = (since: Date, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - since.getTime()) / 86_400_000))

export function AnomalyList({ anomalies, now }: { anomalies: Anomaly[]; now: Date }) {
  return (
    <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
      {anomalies.map((anomaly) => (
        <li key={`${anomaly.type}-${anomaly.subjectId}`} className="py-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span className={`w-24 ${SEVERITY_STYLES[anomaly.severity]}`}>
              {SEVERITY_LABELS[anomaly.severity]}
            </span>
            <span className="flex-1">{anomaly.detail}</span>
            <span className="opacity-60">depuis {days(anomaly.since, now)} j</span>
            <Link href={anomaly.href} className="underline opacity-70">
              Ouvrir
            </Link>
          </div>

          {/* Seuls les signaux s'examinent : les autres se resolvent en etant traites. */}
          {anomaly.severity === 'signal' && <ReviewForm anomaly={anomaly} />}
        </li>
      ))}
    </ul>
  )
}
