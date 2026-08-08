/**
 * Qualifications RGE, telles que le jeu ouvert de l'ADEME les expose.
 *
 * Le RGE n'est pas un booleen : c'est une LISTE DATEE par qualification. Une
 * entreprise peut etre RGE pour le remplacement de chaudiere et pas pour
 * l'isolation. Afficher « RGE » sans dire pour quoi reproduirait exactement le
 * piege de l'assurance que ce produit pretend corriger.
 */
export interface RgeRow {
  /** La recherche de l'ADEME est en texte integral : le filtre exact en depend. */
  siret: string
  code_qualification: string
  nom_qualification: string
  domaine: string | null
  meta_domaine: string | null
  organisme: string | null
  nom_certificat: string | null
  url_qualification: string | null
  lien_date_debut: string | null
  lien_date_fin: string | null
}

export interface Qualification {
  code: string
  label: string
  organisation: string | null
  certificateUrl: string | null
  validUntil: Date
}

export function activeQualifications(rows: RgeRow[], now: Date): Qualification[] {
  const byCode = new Map<string, Qualification>()

  for (const row of rows) {
    // Sans date de fin, on ne peut rien affirmer. La croire eternelle
    // reviendrait a afficher une qualification peut-etre perimee.
    if (!row.lien_date_fin) continue

    const validUntil = new Date(row.lien_date_fin)
    const validFrom = row.lien_date_debut ? new Date(row.lien_date_debut) : new Date(0)
    if (now < validFrom || now > validUntil) continue

    // L'API renvoie une ligne par domaine de travaux : on dedoublonne.
    if (byCode.has(row.code_qualification)) continue

    byCode.set(row.code_qualification, {
      code: row.code_qualification,
      label: row.nom_qualification,
      organisation: row.organisme,
      certificateUrl: row.url_qualification,
      validUntil,
    })
  }

  return [...byCode.values()]
}
