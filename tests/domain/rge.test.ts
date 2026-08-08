import { describe, it, expect } from 'vitest'
import { activeQualifications, type RgeRow } from '@/domain/rge'

// Structure reelle du jeu ADEME, relevee sur un appel a l'API.
const row: RgeRow = {
  siret: '50769820700036',
  code_qualification: '5211D101',
  nom_qualification: 'Remplacement de chaudière gaz/fuel en logement individuel',
  domaine: 'Chaudière condensation ou micro-cogénération gaz ou fioul',
  meta_domaine: "Travaux d'efficacité énergétique",
  organisme: 'qualibat',
  nom_certificat: 'QUALIBAT-RGE',
  url_qualification: 'https://www.qualibat.com/…',
  lien_date_debut: '2024-01-24',
  lien_date_fin: '2028-03-07',
}

describe('qualifications RGE actives', () => {
  it('retient une qualification en cours de validite', () => {
    const active = activeQualifications([row], new Date('2026-08-08'))
    expect(active).toHaveLength(1)
    expect(active[0].organisation).toBe('qualibat')
    expect(active[0].validUntil).toEqual(new Date('2028-03-07'))
  })

  it('ecarte une qualification expiree', () => {
    expect(activeQualifications([row], new Date('2029-01-01'))).toEqual([])
  })

  it('ecarte une qualification pas encore entree en vigueur', () => {
    expect(activeQualifications([row], new Date('2023-01-01'))).toEqual([])
  })

  it('dedoublonne les lignes portant le meme code de qualification', () => {
    // L'API renvoie une ligne par domaine de travaux : une meme qualification
    // apparait plusieurs fois.
    expect(activeQualifications([row, { ...row, domaine: 'Autre' }], new Date('2026-08-08'))).toHaveLength(1)
  })

  it('ignore une ligne sans date de fin plutot que de la croire eternelle', () => {
    expect(activeQualifications([{ ...row, lien_date_fin: null }], new Date('2026-08-08'))).toEqual([])
  })
})
