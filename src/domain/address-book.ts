/**
 * Le carnet d'adresses du demandeur.
 *
 * C'est l'objet que les gens perdent reellement — « c'etait qui, le plombier
 * venu il y a trois ans ? » — et qu'ils gerent aujourd'hui avec un aimant sur
 * le frigo. **A ne pas confondre avec l'annuaire de M4** : celui-la est public
 * et sert a decouvrir, celui-ci est prive et sert a retrouver.
 */

export interface PastIntervention {
  companyId: string
  companyName: string
  chantierLabel: string
  at: Date
}

export interface ManualEntry {
  id: string
  freeName: string
  phone: string | null
  activityLabel: string | null
  note: string | null
  createdAt: Date
}

export type AddressBookEntry =
  | {
      kind: 'company'
      name: string
      companyId: string
      lastChantier: { label: string; at: Date }
      interventions: number
    }
  | {
      kind: 'manual'
      name: string
      id: string
      phone: string | null
      activityLabel: string | null
      note: string | null
    }

/**
 * Les entreprises connues d'abord, celles qu'il a saisies ensuite.
 *
 * Ce n'est pas une hierarchie de merite : les premieres portent une
 * **verification que nous pouvons montrer**, les secondes ne portent que sa
 * memoire. Les melanger par date laisserait croire que nous en savons autant
 * des unes que des autres.
 */
export function mergeAddressBook(
  interventions: PastIntervention[],
  manual: ManualEntry[],
): AddressBookEntry[] {
  const byCompany = new Map<string, PastIntervention[]>()

  for (const item of interventions) {
    byCompany.set(item.companyId, [...(byCompany.get(item.companyId) ?? []), item])
  }

  const companies = [...byCompany.values()]
    .map((history) => {
      const sorted = [...history].sort((a, b) => b.at.getTime() - a.at.getTime())
      const [latest] = sorted

      return {
        kind: 'company' as const,
        name: latest.companyName,
        companyId: latest.companyId,
        lastChantier: { label: latest.chantierLabel, at: latest.at },
        interventions: sorted.length,
      }
    })
    .sort((a, b) => b.lastChantier.at.getTime() - a.lastChantier.at.getTime())

  const typed = [...manual]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((entry) => ({
      kind: 'manual' as const,
      name: entry.freeName,
      id: entry.id,
      phone: entry.phone,
      activityLabel: entry.activityLabel,
      note: entry.note,
    }))

  return [...companies, ...typed]
}
