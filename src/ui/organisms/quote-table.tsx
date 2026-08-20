import Link from 'next/link'
import type { Cents } from '@/domain/money'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { StatusBadge } from '@/ui/molecules/status-badge'

export type QuoteRow = {
  id: string
  number: string | null
  label: string
  totalInclTax: Cents
  status: string
}

/**
 * La liste des devis.
 *
 * Une liste de cartes cliquables plutot qu'un `<table>` : sur mobile, un tableau
 * a cinq colonnes force le defilement horizontal, et l'artisan consulte ses
 * devis depuis un chantier, pas depuis un bureau.
 */
export function QuoteTable({ quotes }: { quotes: QuoteRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {quotes.map((q) => (
        <li key={q.id}>
          <Link href={`/devis/${q.id}`} className="block rounded-card">
            <Card elevation="e1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {/*
                  Un PLANCHER, la ou `min-w-0` mettait zero — et c'est ce zero
                  qui cassait la rangee sur telephone. Mesure en 375 px : la
                  colonne du libelle tombait a 78 px sur 285 disponibles, et
                  « Remplacement chauffe-eau » se brisait en trois lignes, jusqu'a
                  couper le mot, pendant que la pastille et le montant gardaient
                  leur largeur intacte a cote.

                  `flex-wrap` etait pourtant la : il ne se declenchait jamais,
                  parce qu'une colonne sans largeur minimale se laisse ecraser
                  indefiniment plutot que de pousser ses voisines a la ligne. En
                  posant 10rem, le repli se produit — pastille et montant passent
                  dessous, le libelle recupere la rangee entiere.
                */}
                <div className="flex min-w-40 flex-1 flex-col gap-0.5">
                  <Text size="sm" tone="muted" as="span">
                    {q.number ?? 'Brouillon'}
                  </Text>
                  <Text as="span">{q.label}</Text>
                </div>
                <StatusBadge kind="quote" status={q.status} />
                <Money cents={q.totalInclTax} emphasis="strong" />
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
