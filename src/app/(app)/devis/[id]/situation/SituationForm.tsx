'use client'

import { useActionState, useMemo, useState } from 'react'
import { applyRate, format } from '@/domain/money'
import { remainingByRate, type RatedAmount } from '@/domain/invoice-balance'
import { situationByRate, type SituationLine } from '@/domain/situation'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { Field } from '@/ui/molecules/field'
import { SummaryLine } from '@/ui/molecules/summary-line'
import { submitSituation, type SituationState } from './actions'

const initialState: SituationState = {}

export interface SituationRow {
  id: string
  label: string
  taxRate: number
  totalExclTax: number
  previousPercent: number
}

/**
 * La saisie d'une situation de travaux.
 *
 * **L'apercu est calcule par la MEME fonction que le serveur.**
 * `src/domain/situation.ts` est pur, sans I/O : ce composant l'importe tel
 * quel. Reecrire le calcul « juste pour l'apercu » finirait par annoncer 503,49
 * pour une facture de 503,50, et l'artisan cesserait de croire l'ecran.
 */
export function SituationForm({
  quoteId,
  rows,
  issued,
}: {
  quoteId: string
  rows: SituationRow[]
  /** Ce que le chantier a deja facture, ventile par taux. */
  issued: { type: 'deposit' | 'progress' | 'balance' | 'credit_note'; byRate: RatedAmount[] }[]
}) {
  const [state, action, pending] = useActionState(
    submitSituation.bind(null, quoteId),
    initialState,
  )

  const [percents, setPercents] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, String(row.previousPercent)])),
  )

  const preview = useMemo(() => {
    const lines: SituationLine[] = rows.map((row) => ({
      quoteLineId: row.id,
      taxRate: row.taxRate,
      totalExclTax: row.totalExclTax,
      percent: Number(percents[row.id]) || 0,
    }))

    // `applyRate` plutot qu'un arrondi ecrit ici : la regle d'arrondi du
    // produit vit a un seul endroit, et la reecrire ferait diverger l'apercu de
    // la facture d'un centime.
    return remainingByRate(situationByRate(lines), issued).reduce(
      (sum, line) => sum + line.unitPriceExclTax + applyRate(line.unitPriceExclTax, line.rate),
      0,
    )
  }, [rows, percents, issued])

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3" data-testid="situation">
        {rows.map((row) => (
          <Card key={row.id} elevation="e1">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Text as="span">{row.label}</Text>
                <Text size="sm" tone="muted" as="span">
                  {format(row.totalExclTax)} € HT au devis
                </Text>
              </div>

              <div className="w-28">
                <Field label="Avancement (%)">
                  {(p) => (
                    <Input
                      {...p}
                      name={`avancement-${row.id}`}
                      inputMode="numeric"
                      value={percents[row.id] ?? '0'}
                      onChange={(e) =>
                        setPercents((current) => ({ ...current, [row.id]: e.target.value }))
                      }
                    />
                  )}
                </Field>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="ml-auto w-full max-w-xs">
        <SummaryLine
          label="Cette situation facturera"
          cents={preview}
          emphasis="total"
          testId="montant-situation"
        />
      </div>

      <Text size="sm" tone="muted">
        L’avancement se déclare en <strong>cumulé</strong> : 60 % veut dire « 60 % de cette ligne
        est fait depuis le début », pas « 60 % de plus ». Le montant ci-dessus est la différence
        avec ce qui a déjà été facturé, acompte compris.
      </Text>

      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}

      <div className="self-start">
        <Button type="submit" pending={pending} disabled={preview <= 0}>
          {pending ? 'Émission…' : 'Établir la situation'}
        </Button>
      </div>

      {preview <= 0 && (
        <Text size="sm" tone="muted">
          Cette situation ne facturerait rien de plus que la précédente. Un recul se corrige par un
          avoir, pas par une situation.
        </Text>
      )}
    </form>
  )
}
