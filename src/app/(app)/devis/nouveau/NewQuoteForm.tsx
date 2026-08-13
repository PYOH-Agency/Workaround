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
import { saveQuote, type QuoteFormState } from '../actions'
import { emptyLine, QuoteLineRow, type LineDraft } from './QuoteLines'

const initialState: QuoteFormState = {}

export function NewQuoteForm({ validityDays }: { validityDays: number }) {
  const [state, action, pending] = useActionState(saveQuote, initialState)
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])
  const [customerType, setCustomerType] = useState<'particulier' | 'professionnel'>('particulier')

  const update = (index: number, key: keyof LineDraft, value: string | number) =>
    setLines((all) => all.map((line, i) => (i === index ? { ...line, [key]: value } : line)))

  const remove = (index: number) => setLines((all) => all.filter((_, i) => i !== index))

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
      <Heading level={1}>Nouveau devis</Heading>

      <form action={action} className="flex flex-col gap-10">
        <input type="hidden" name="validity_days" value={validityDays} />

        <section className="flex flex-col gap-5">
          <Heading level={3} as="h2">
            Le client
          </Heading>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Client" required>
              {(p) => <Input {...p} name="client_nom" />}
            </Field>

            <Field label="Type de client">
              {(p) => (
                <Select
                  {...p}
                  name="client_type"
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value as typeof customerType)}
                >
                  <option value="particulier">Particulier</option>
                  <option value="professionnel">Professionnel</option>
                </Select>
              )}
            </Field>

            <Field label="E-mail du client" required>
              {(p) => <Input {...p} name="client_email" type="email" />}
            </Field>

            <Field
              label="Téléphone du client"
              help="Sert à identifier le signataire par SMS."
              required
            >
              {(p) => <Input {...p} name="client_telephone" type="tel" />}
            </Field>

            {customerType === 'professionnel' && (
              <Field
                label="SIRET du client"
                help="Exigé pour la facturation électronique."
                required
              >
                {(p) => <Input {...p} name="client_siret" inputMode="numeric" />}
              </Field>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <Heading level={3} as="h2">
            Le chantier
          </Heading>

          <Field label="Intitulé" required>
            {(p) => <Input {...p} name="libelle" placeholder="Rénovation salle de bain" />}
          </Field>

          <Field label="Adresse du chantier" required>
            {(p) => <Input {...p} name="adresse_ligne1" />}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Code postal" required>
              {(p) => <Input {...p} name="adresse_code_postal" inputMode="numeric" />}
            </Field>
            <Field label="Ville" required>
              {(p) => <Input {...p} name="adresse_ville" />}
            </Field>
          </div>

          <div className="sm:max-w-xs">
            <Field
              label="Retenue de garantie"
              help="Facultative, 5 % au maximum (loi n° 71-584). Votre client consigne cette somme auprès d’un tiers ; elle vous est due un an après la réception des travaux."
            >
              {(p) => (
                <Select {...p} name="retenue" defaultValue="0">
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
        </section>

        <section className="flex flex-col gap-4">
          <Heading level={3} as="h2">
            Les prestations
          </Heading>

          <div className="flex flex-col gap-3">
            {lines.map((line, i) => (
              <QuoteLineRow
                key={i}
                index={i}
                line={line}
                onChange={update}
                onRemove={lines.length > 1 ? remove : undefined}
              />
            ))}
          </div>

          <div className="self-start">
            <Button
              tone="secondary"
              onClick={() => setLines((all) => [...all, emptyLine()])}
            >
              <Icon name="plus" size="sm" />
              Ajouter une ligne
            </Button>
          </div>

          <Text size="sm" tone="muted">
            Le taux de TVA est de votre responsabilité : l’outil ne le détermine pas à votre
            place.
          </Text>
        </section>

        <section className="flex flex-col gap-6">
          <div className="sm:max-w-xs">
            <Field
              label="Délai d’exécution (jours ouvrés)"
              help="Obligatoire : c’est l’engagement que votre passeport mesurera."
              required
            >
              {(p) => <Input {...p} name="delai" type="number" min="1" />}
            </Field>
          </div>

          <Text size="sm" tone="muted">
            Validité du devis : {validityDays} jours (modifiable dans vos mentions)
          </Text>

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
            {pending ? 'Enregistrement…' : 'Enregistrer le devis'}
          </Button>
        </div>
      </form>
    </div>
  )
}
