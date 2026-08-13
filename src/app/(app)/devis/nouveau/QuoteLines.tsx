'use client'

import { Button } from '@/ui/atoms/button'
import { Icon } from '@/ui/atoms/icon'
import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Text } from '@/ui/atoms/text'

const TAX_RATES = [
  { value: 550, label: '5,5 %' },
  { value: 1000, label: '10 %' },
  { value: 2000, label: '20 %' },
]

/**
 * Les unites d'une ligne de devis dans le batiment.
 *
 * `value` est ce qui s'imprime sur le devis, apres la quantite : « 12 m² »,
 * « 1 forfait ». Le champ etait fige a « u » par un input cache — un plombier
 * qui chiffre un lineaire ou un forfait devait donc ecrire « 3 u » et corriger
 * a la main sur le PDF. La donnee, elle, acceptait deja n'importe quelle
 * chaine : seule la saisie manquait.
 */
const UNITS = [
  { value: 'u', label: 'unité' },
  { value: 'forfait', label: 'forfait' },
  { value: 'm²', label: 'm²' },
  { value: 'm³', label: 'm³' },
  { value: 'ml', label: 'ml' },
  { value: 'h', label: 'heure' },
  { value: 'j', label: 'jour' },
  { value: 'kg', label: 'kg' },
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
  onRemove,
}: {
  index: number
  line: LineDraft
  onChange: (index: number, key: keyof LineDraft, value: string | number) => void
  /**
   * Absent tant qu'il ne reste qu'une ligne : un devis a besoin d'au moins une
   * prestation, et un bouton qui viderait la table est un piege, pas un geste.
   */
  onRemove?: (index: number) => void
}) {
  const first = index === 0

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
    <div className="grid flex-1 gap-3 sm:grid-cols-12">
      <div className="flex flex-col gap-1 sm:col-span-4">
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

      <div className="flex flex-col gap-1 sm:col-span-2">
        <ColumnLabel show={first}>Unité</ColumnLabel>
        <Select
          aria-label="Unité"
          name={`ligne[${index}][unite]`}
          value={line.unit}
          onChange={(e) => onChange(index, 'unit', e.target.value)}
        >
          {UNITS.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1 sm:col-span-2">
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
      </div>

      {onRemove && (
        <div className="flex flex-col gap-1">
          {/* Reserve la hauteur de l'etiquette : sur la premiere ligne, les
              champs sont pousses vers le bas par leur `ColumnLabel`, et le
              bouton doit s'aligner sur eux, pas sur le haut de la colonne. */}
          {first && <ColumnLabel show>{' '}</ColumnLabel>}
          <Button tone="danger" onClick={() => onRemove(index)}>
            <Icon name="trash" size="sm" />
            Retirer
          </Button>
        </div>
      )}
    </div>
  )
}
