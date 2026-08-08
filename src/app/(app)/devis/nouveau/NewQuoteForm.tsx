'use client'

import { useActionState, useMemo, useState } from 'react'
import { saveQuote, type QuoteFormState } from '../actions'
import { computeTotals } from '@/domain/quote-totals'
import { toCents, format } from '@/domain/money'

const TAX_RATES = [
  { value: 550, label: '5,5 %' },
  { value: 1000, label: '10 %' },
  { value: 2000, label: '20 %' },
]

interface LineDraft {
  label: string
  unit: string
  quantity: string
  price: string
  taxRate: number
}

const emptyLine = (): LineDraft => ({
  label: '',
  unit: 'u',
  quantity: '1',
  price: '',
  taxRate: 1000,
})

const initialState: QuoteFormState = {}

const formatRate = (rate: number) => `${(rate / 100).toFixed(1).replace('.', ',')} %`

export function NewQuoteForm({ validityDays }: { validityDays: number }) {
  const [state, action, pending] = useActionState(saveQuote, initialState)
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])
  const [customerType, setCustomerType] = useState<'particulier' | 'professionnel'>('particulier')

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

  const field = 'rounded-lg border border-black/15 px-3 py-2 dark:border-white/20'

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <h1 className="text-2xl font-semibold">Nouveau devis</h1>

      <form action={action} className="flex flex-col gap-8">
        <input type="hidden" name="validity_days" value={validityDays} />
        <section className="flex flex-col gap-4">
          <h2 className="font-medium">Le client</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              Client
              <input name="client_nom" required className={field} />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Type de client
              <select
                name="client_type"
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as typeof customerType)}
                className={field}
              >
                <option value="particulier">Particulier</option>
                <option value="professionnel">Professionnel</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              E-mail du client
              <input name="client_email" type="email" required className={field} />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Téléphone du client
              <input name="client_telephone" required className={field} />
              <span className="text-xs opacity-60">Sert à identifier le signataire par SMS.</span>
            </label>

            {customerType === 'professionnel' && (
              <label className="flex flex-col gap-2 text-sm">
                SIRET du client
                <input name="client_siret" required className={`${field} font-mono`} />
                <span className="text-xs opacity-60">Exigé pour la facturation électronique.</span>
              </label>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-medium">Le chantier</h2>

          <label className="flex flex-col gap-2 text-sm">
            Intitulé
            <input name="libelle" required placeholder="Rénovation salle de bain" className={field} />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Adresse du chantier
            <input name="adresse_ligne1" required className={field} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              Code postal
              <input name="adresse_code_postal" required inputMode="numeric" className={field} />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Ville
              <input name="adresse_ville" required className={field} />
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-medium">Les prestations</h2>

          {lines.map((line, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-12">
              <label className="flex flex-col gap-1 text-sm sm:col-span-5">
                {i === 0 && 'Désignation'}
                <input
                  aria-label="Désignation"
                  name={`ligne[${i}][libelle]`}
                  value={line.label}
                  onChange={(e) => update(i, 'label', e.target.value)}
                  className={field}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                {i === 0 && 'Quantité'}
                <input
                  aria-label="Quantité"
                  name={`ligne[${i}][quantite]`}
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(e) => update(i, 'quantity', e.target.value)}
                  className={field}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm sm:col-span-3">
                {i === 0 && 'Prix unitaire HT'}
                <input
                  aria-label="Prix unitaire HT"
                  name={`ligne[${i}][prix]`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={line.price}
                  onChange={(e) => update(i, 'price', e.target.value)}
                  className={field}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                {i === 0 && 'TVA'}
                <select
                  aria-label="TVA"
                  name={`ligne[${i}][tva]`}
                  value={line.taxRate}
                  onChange={(e) => update(i, 'taxRate', Number(e.target.value))}
                  className={field}
                >
                  {TAX_RATES.map((rate) => (
                    <option key={rate.value} value={rate.value}>
                      {rate.label}
                    </option>
                  ))}
                </select>
              </label>

              <input type="hidden" name={`ligne[${i}][unite]`} value={line.unit} />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setLines((all) => [...all, emptyLine()])}
            className="self-start rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20"
          >
            Ajouter une ligne
          </button>

          <p className="text-xs opacity-60">
            Le taux de TVA est de votre responsabilité : l’outil ne le détermine pas à votre place.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm sm:max-w-xs">
            Délai d’exécution (jours ouvrés)
            <input name="delai" type="number" min="1" required className={field} />
            <span className="text-xs opacity-60">
              Obligatoire : c’est l’engagement que votre passeport mesurera.
            </span>
          </label>

          <label className="flex flex-col gap-2 text-sm sm:max-w-xs">
            <span className="opacity-70">
              Validité du devis : {validityDays} jours (modifiable dans vos mentions)
            </span>
          </label>

          {totals && (
            <div className="rounded-xl border border-black/10 p-5 text-sm dark:border-white/15">
              <div className="flex justify-between">
                <span>Total HT</span>
                <span data-testid="total-ht">{format(totals.totalExclTax)}</span>
              </div>
              {totals.byRate.map((b) => (
                <div key={b.rate} className="flex justify-between opacity-70">
                  <span>
                    TVA {formatRate(b.rate)} sur {format(b.baseExclTax)}
                  </span>
                  <span>{format(b.taxAmount)}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-black/10 pt-2 font-semibold dark:border-white/15">
                <span>Total TTC</span>
                <span data-testid="total-ttc">{format(totals.totalInclTax)}</span>
              </div>
            </div>
          )}
        </section>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-foreground px-5 py-2.5 font-medium text-background disabled:opacity-50"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer le devis'}
        </button>
      </form>
    </main>
  )
}
