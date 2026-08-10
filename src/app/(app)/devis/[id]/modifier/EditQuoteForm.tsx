'use client'

import { useActionState, useMemo, useState } from 'react'
import { toCents } from '@/domain/money'
import { computeTotals } from '@/domain/quote-totals'
import { Button } from '@/ui/atoms/button'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { TotalsPanel } from '@/ui/organisms/totals-panel'
import { emptyLine, QuoteLineRow, type LineDraft } from '../../nouveau/QuoteLines'
import type { QuoteFormState } from '../../actions'
import { editQuote } from './actions'

const initialState: QuoteFormState = {}

/**
 * La modification d'un brouillon.
 *
 * Volontairement plus court que la redaction : **on ne redemande ni le client
 * ni le chantier**. Ils appartiennent au projet, et les changer serait une
 * autre operation — pas une correction de devis.
 */
export function EditQuoteForm({
  quoteId,
  number,
  initialLines,
  committedLeadTimeDays,
  retentionRate,
}: {
  quoteId: string
  number: string
  initialLines: LineDraft[]
  committedLeadTimeDays: number | null
  retentionRate: number
}) {
  const [state, action, pending] = useActionState(editQuote.bind(null, quoteId), initialState)
  const [lines, setLines] = useState<LineDraft[]>(
    initialLines.length > 0 ? initialLines : [emptyLine()],
  )

  const update = (index: number, key: keyof LineDraft, value: string | number) =>
    setLines((all) => all.map((line, i) => (i === index ? { ...line, [key]: value } : line)))

  // Memes fonctions pures que le serveur : une seule implementation du calcul.
  const totals = useMemo(() => {
    try {
      return computeTotals(
        lines
          .filter((line) => line.label.trim())
          .map((line) => ({
            quantity: line.quantity || '0',
            unitPriceExclTax: toCents(line.price || '0'),
            taxRate: line.taxRate,
          })),
      )
    } catch {
      return null
    }
  }, [lines])

  return (
    <div className="flex flex-col gap-8">
      <Heading level={1}>Modifier {number}</Heading>

      <form action={action} className="flex flex-col gap-10">
        <section className="flex flex-col gap-4">
          <Heading level={3} as="h2">
            Les prestations
          </Heading>

          <div className="flex flex-col gap-3">
            {lines.map((line, i) => (
              <QuoteLineRow key={i} index={i} line={line} onChange={update} />
            ))}
          </div>

          <div className="self-start">
            <Button tone="secondary" onClick={() => setLines((all) => [...all, emptyLine()])}>
              <Icon name="plus" size="sm" />
              Ajouter une ligne
            </Button>
          </div>

          <Text size="sm" tone="muted">
            Le taux de TVA est de votre responsabilité : l’outil ne le détermine pas à votre place.
          </Text>
        </section>

        <section className="flex flex-col gap-6">
          <div className="sm:max-w-xs">
            <Field
              label="Délai d’exécution (jours ouvrés)"
              help="Obligatoire : c’est l’engagement que votre passeport mesurera."
              required
            >
              {(p) => (
                <Input
                  {...p}
                  name="delai"
                  type="number"
                  min="1"
                  defaultValue={committedLeadTimeDays ?? ''}
                />
              )}
            </Field>
          </div>

          <div className="sm:max-w-xs">
            <Field
              label="Retenue de garantie"
              help="Facultative, 5 % au maximum (loi n° 71-584). Votre client consigne cette somme auprès d’un tiers ; elle vous est due un an après la réception des travaux."
            >
              {(p) => (
                <Select {...p} name="retenue" defaultValue={String(retentionRate)}>
                  <option value="0">Aucune</option>
                  <option value="1">1 %</option>
                  <option value="2">2 %</option>
                  <option value="3">3 %</option>
                  <option value="4">4 %</option>
                  <option value="5">5 %</option>
                </Select>
              )}
            </Field>
          </div>

          {totals && <TotalsPanel totals={totals} />}
        </section>

        {state.error && (
          <div
            role="alert"
            className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
          >
            {state.error}
          </div>
        )}

        <div className="self-start">
          <Button type="submit" size="lg" pending={pending}>
            {pending ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </div>
  )
}
