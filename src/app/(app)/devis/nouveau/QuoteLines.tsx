'use client'

const TAX_RATES = [
  { value: 550, label: '5,5 %' },
  { value: 1000, label: '10 %' },
  { value: 2000, label: '20 %' },
]

export interface LineDraft {
  label: string
  unit: string
  quantity: string
  price: string
  taxRate: number
}

export const emptyLine = (): LineDraft => ({
  label: '',
  unit: 'u',
  quantity: '1',
  price: '',
  taxRate: 1000,
})

const field = 'rounded-lg border border-black/15 px-3 py-2 dark:border-white/20'

/**
 * Une ligne de prestation.
 *
 * Les intitules ne sont affiches que sur la premiere ligne : la grille se lit
 * comme un tableau, et les repeter a chaque ligne la rendrait illisible.
 */
export function QuoteLineRow({
  index,
  line,
  onChange,
}: {
  index: number
  line: LineDraft
  onChange: (index: number, key: keyof LineDraft, value: string | number) => void
}) {
  const heading = (label: string) => index === 0 && label

  return (
    <div className="grid gap-3 sm:grid-cols-12">
      <label className="flex flex-col gap-1 text-sm sm:col-span-5">
        {heading('Désignation')}
        <input
          aria-label="Désignation"
          name={`ligne[${index}][libelle]`}
          value={line.label}
          onChange={(e) => onChange(index, 'label', e.target.value)}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        {heading('Quantité')}
        <input
          aria-label="Quantité"
          name={`ligne[${index}][quantite]`}
          inputMode="decimal"
          value={line.quantity}
          onChange={(e) => onChange(index, 'quantity', e.target.value)}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-3">
        {heading('Prix unitaire HT')}
        <input
          aria-label="Prix unitaire HT"
          name={`ligne[${index}][prix]`}
          inputMode="decimal"
          placeholder="0.00"
          value={line.price}
          onChange={(e) => onChange(index, 'price', e.target.value)}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        {heading('TVA')}
        <select
          aria-label="TVA"
          name={`ligne[${index}][tva]`}
          value={line.taxRate}
          onChange={(e) => onChange(index, 'taxRate', Number(e.target.value))}
          className={field}
        >
          {TAX_RATES.map((rate) => (
            <option key={rate.value} value={rate.value}>
              {rate.label}
            </option>
          ))}
        </select>
      </label>

      <input type="hidden" name={`ligne[${index}][unite]`} value={line.unit} />
    </div>
  )
}
