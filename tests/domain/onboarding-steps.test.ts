import { existsSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { ONBOARDING_STEP, ONBOARDING_STEPS } from '@/domain/onboarding-steps'

describe('les trois etapes de la mise en route', () => {
  it('sont ordonnees : les mentions, l’attestation, puis le devis', () => {
    // L'ordre est lu tel quel par l'inscription et par l'accueil. Deux ordres
    // differents de part et d'autre du lien magique desorienteraient autant
    // que deux libelles.
    expect(ONBOARDING_STEPS.map((step) => step.key)).toEqual([
      'mentions',
      'certificate',
      'quote',
    ])
  })

  it('portent les libelles annonces a l’inscription, mot pour mot', () => {
    expect(ONBOARDING_STEPS.map((step) => step.title)).toEqual([
      'Vos mentions obligatoires',
      'Votre attestation décennale',
      'Votre premier devis',
    ])
  })

  it('menent chacune a un ecran qui existe', () => {
    // C'est ce qui les distingue des groupes de mentions qu'elles remplacent :
    // une etape actionnable mene quelque part. Une adresse qui ne repond plus
    // ferait de la mise en route trois impasses.
    for (const step of ONBOARDING_STEPS) {
      expect(existsSync(`src/app/(app)${step.href}/page.tsx`), step.href).toBe(true)
    }
  })

  it('sont toutes joignables par leur cle', () => {
    for (const step of ONBOARDING_STEPS) {
      expect(ONBOARDING_STEP[step.key]).toBe(step)
    }
  })
})
