import { cn } from '@/ui/cn'

export type TableColumn = {
  label: string
  /** Les colonnes de montants et de dates s'alignent a droite. */
  align?: 'left' | 'right'
  /**
   * Une colonne sans intitule visible — celle des actions de ligne.
   *
   * L'en-tete reste rendu pour le lecteur d'ecran, en `sr-only` : une cellule
   * d'en-tete vide laisse une colonne anonyme dans la table annoncee.
   */
  hideLabel?: boolean
}

export type TableRow = {
  /** Cle de rendu, et rien d'autre : jamais rendue. */
  id: string
  cells: React.ReactNode[]
}

/**
 * Un tableau de comparaison.
 *
 * Distinct de `QuoteLinesTable` comme `QuoteLineEditor` l'est deja de lui :
 * celui-la connait les lignes d'un devis — leurs quantites, leurs taux —, celui
 * -ci ne connait rien de son contenu. Les fusionner aurait rendu l'un ou
 * l'autre parametrable jusqu'a l'illisible.
 *
 * Il existe parce que trois ecrans — le repertoire, l'equipe, les entreprises
 * du backoffice — empilent des cartes la ou l'on cherche **une ligne parmi
 * d'autres, en comparant une colonne**. Six cartes obligent a relire six
 * paragraphes pour repondre a « laquelle a une attestation expiree ? ».
 *
 * Ni tri ni pagination : le backoffice plafonne a 200 lignes et le repertoire
 * d'un particulier en compte cinq. Les ajouter maintenant serait ecrire du code
 * qu'aucun ecran ne reclame — ce que l'inventaire ferme interdit precisement.
 *
 * Sur petit ecran, c'est le conteneur qui defile, jamais la page : meme
 * decision que `QuoteLinesTable`, pour la meme raison.
 */
export function DataTable({
  columns,
  rows,
  caption,
  testId,
}: {
  columns: TableColumn[]
  rows: TableRow[]
  /**
   * Ce que le tableau montre, annonce avant lui par un lecteur d'ecran.
   *
   * Requis : une table sans legende oblige a deviner son sujet a partir de ses
   * en-tetes, et le titre de section qui la precede n'est relie a rien.
   */
  caption: string
  testId?: string
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-rule bg-card">
      <table data-testid={testId} className="w-full min-w-lg text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-rule">
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={cn(
                  'px-4 py-2.5 text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-muted uppercase',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                <span className={cn(column.hideLabel && 'sr-only')}>{column.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-rule last:border-b-0">
              {row.cells.map((cell, index) => (
                <td
                  key={columns[index]?.label ?? index}
                  className={cn(
                    'px-4 py-3 align-middle text-ink',
                    columns[index]?.align === 'right' && 'text-right',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
