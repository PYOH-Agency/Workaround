import type { LineInput } from '@/domain/quote-totals'
import { toCents } from '@/domain/money'

/**
 * Lecture des lignes d'un formulaire de devis.
 *
 * Volontairement HORS d'un fichier `'use server'` : un tel fichier ne peut
 * exporter que des fonctions asynchrones, et la creation comme la modification
 * ont besoin de cette lecture.
 */
export interface LineFormInput extends LineInput {
  label: string
  unit: string
}

/** Lit les lignes du formulaire, indexees ligne[0][libelle], ligne[0][prix]… */
export function readLines(form: FormData): LineFormInput[] {
  const lines: LineFormInput[] = []

  for (let i = 0; form.has(`ligne[${i}][libelle]`); i++) {
    const label = String(form.get(`ligne[${i}][libelle]`) ?? '').trim()
    if (!label) continue

    lines.push({
      label,
      unit: String(form.get(`ligne[${i}][unite]`) || 'u'),
      quantity: String(form.get(`ligne[${i}][quantite]`) || '1'),
      unitPriceExclTax: toCents(String(form.get(`ligne[${i}][prix]`) || '0')),
      taxRate: Number(form.get(`ligne[${i}][tva]`) || 1000),
    })
  }

  return lines
}
