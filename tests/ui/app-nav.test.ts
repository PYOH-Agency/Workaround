import { describe, expect, it } from 'vitest'
import { isCurrent, navGroups, showsNav } from '@/ui/molecules/app-nav-routes'

/** Tous les liens de la barre, dans l'ordre d'affichage. */
const hrefs = navGroups.flatMap((group) => group.entries.map((entry) => entry.href))

describe('les entrées de la navigation', () => {
  it('couvre les cinq écrans de l’artisan', () => {
    expect(hrefs).toEqual(['/devis', '/factures', '/agenda', '/mon-passeport', '/verification'])
  })

  it('ne pose aucun préfixe qui en recouvre un autre', () => {
    // Sans quoi deux entrees s'allumeraient ensemble, et « actif » ne voudrait
    // plus rien dire.
    for (const href of hrefs) {
      const others = hrefs.filter((candidate) => candidate !== href)
      expect(others.filter((candidate) => isCurrent(candidate, href))).toEqual([])
    }
  })

  it('donne à chaque groupe une étiquette annonçable', () => {
    for (const group of navGroups) expect(group.label).toBeTruthy()
  })
})

describe('la page courante', () => {
  it('reconnaît la page elle-même', () => {
    expect(isCurrent('/devis', '/devis')).toBe(true)
  })

  it('reconnaît un sous-chemin', () => {
    expect(isCurrent('/devis/42/chantier', '/devis')).toBe(true)
  })

  it('ne se laisse pas prendre à un préfixe de chaîne', () => {
    // « /devis-types » commence par « /devis » sans en etre un sous-chemin.
    expect(isCurrent('/devis-types', '/devis')).toBe(false)
  })

  it('n’allume rien sur un écran hors navigation', () => {
    const lit = navGroups.flatMap((g) => g.entries).filter((e) => isCurrent('/mentions', e.href))
    expect(lit).toEqual([])
  })
})

describe('les écrans qui portent la navigation', () => {
  it('la portent sur les écrans de l’artisan', () => {
    expect(showsNav('/devis')).toBe(true)
    expect(showsNav('/mentions')).toBe(true)
  })

  it('ne la portent pas dans le backoffice', () => {
    expect(showsNav('/supervision')).toBe(false)
    expect(showsNav('/attestations')).toBe(false)
    expect(showsNav('/attestations/8f2a')).toBe(false)
  })
})
