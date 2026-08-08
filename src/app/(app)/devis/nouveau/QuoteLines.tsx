'use client'

import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Text } from '@/ui/atoms/text'

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

/**
 * L'intitule d'une colonne, affiche sur la premiere ligne seulement.
 *
 * La grille se lit comme un tableau : repeter « Designation » a chaque ligne la
 * rendrait illisible. Chaque controle porte malgre tout un `aria-label`, ce qui
 * le laisse nomme pour un lecteur d'ecran.
 */
function ColumnLabel({ show, children }: { show: boolean; children: string }) {
  if (!show) return null
  return (
    <Text size="label" tone="muted" as="span">
      {children}
    </Text>
  )
}

/**
 * Une ligne de prestation.
 *
 * Volontairement pas de `Field` ici : c'est une grille de saisie, pas une pile
 * de champs.
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
  const first = index === 0

  return (
    <div className="grid gap-3 sm:grid-cols-12">
      <div className="flex flex-col gap-1 sm:col-span-5">
        <ColumnLabel show={first}>Désignation</ColumnLabel>
        <Input
          aria-label="Désignation"
          name={`ligne[${index}][libelle]`}
          value={line.label}
          onChange={(e) => onChange(index, 'label', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1 sm:col-span-2">
        <ColumnLabel show={first}>Quantité</ColumnLabel>
        <Input
          aria-label="Quantité"
          name={`ligne[${index}][quantite]`}
          inputMode="decimal"
          value={line.quantity}
          onChange={(e) => onChange(index, 'quantity', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1 sm:col-span-3">
        <ColumnLabel show={first}>Prix unitaire HT</ColumnLabel>
        <Input
          aria-label="Prix unitaire HT"
          name={`ligne[${index}][prix]`}
          inputMode="decimal"
          placeholder="0.00"
          value={line.price}
          onChange={(e) => onChange(index, 'price', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1 sm:col-span-2">
        <ColumnLabel show={first}>TVA</ColumnLabel>
        <Select
          aria-label="TVA"
          name={`ligne[${index}][tva]`}
          value={line.taxRate}
          onChange={(e) => onChange(index, 'taxRate', Number(e.target.value))}
        >
          {TAX_RATES.map((rate) => (
            <option key={rate.value} value={rate.value}>
              {rate.label}
            </option>
          ))}
        </Select>
      </div>

      <input type="hidden" name={`ligne[${index}][unite]`} value={line.unit} />
    </div>
  )
}
