'use client'

import { useActionState, useMemo, useState } from 'react'
import { applyRate, format } from '@/domain/money'
import { remainingByRate, type RatedAmount } from '@/domain/invoice-balance'
import { situationByRate, type SituationLine } from '@/domain/situation'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { Notice } from '@/ui/molecules/notice'
import { SummaryLine } from '@/ui/molecules/summary-line'
import { ProgressGauge } from './ProgressGauge'
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
 *
 * **Le dock est rendu ici et non par `AppShell aside`**, contrairement au suivi
 * de chantier. La raison est technique et pas esthetique : le montant se
 * recalcule a chaque frappe, donc le dock et les champs doivent partager un
 * etat — or deux emplacements d'un gabarit sont deux sous-arbres frere, et
 * aucun etat ne peut vivre entre eux sans remonter dans le gabarit lui-meme.
 * La grille est donc dupliquee une fois, sciemment.
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
    <form action={action} className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
      <div className="flex min-w-0 flex-col divide-y divide-rule" data-testid="situation">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-3 py-4 first:pt-0">
            <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Text as="span">{row.label}</Text>
                <Text size="sm" tone="muted" as="span">
                  {format(row.totalExclTax)} € HT au devis
                </Text>
              </div>

              {/* 9 rem : la largeur a laquelle « Avancement (%) » tient sur une
                  ligne. En dessous, l'etiquette passait a deux lignes et
                  remontait au-dessus du libelle de la ligne, qu'elle avait
                  alors l'air de titrer. Le libelle est fige — un parcours le
                  designe mot pour mot —, c'est donc la colonne qui cede. */}
              <div className="w-36">
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

            <ProgressGauge
              totalExclTax={row.totalExclTax}
              previousPercent={row.previousPercent}
              percent={Number(percents[row.id]) || 0}
            />
          </div>
        ))}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-8">
        <div className="flex flex-col gap-4 rounded-card border border-rule bg-card p-5 shadow-e2 dark:shadow-none">
          <SummaryLine
            label="Cette situation facturera"
            cents={preview}
            emphasis="total"
            testId="montant-situation"
          />

          <Button type="submit" pending={pending} disabled={preview <= 0}>
            {pending ? 'Émission…' : 'Établir la situation'}
          </Button>

          {preview <= 0 && (
            <Text size="sm" tone="muted">
              Cette situation ne facturerait rien de plus que la précédente. Un recul se corrige
              par un avoir, pas par une situation.
            </Text>
          )}

          <Text size="sm" tone="muted">
            L’avancement se déclare en <strong>cumulé</strong> : ce que cette situation ajoute — la
            part mise en avant sur la jauge — est repris dans le montant ci-dessus, acompte compris.
          </Text>
        </div>

        {state.error && (
          <Notice tone="danger" alert>
            {state.error}
          </Notice>
        )}
      </aside>
    </form>
  )
}
