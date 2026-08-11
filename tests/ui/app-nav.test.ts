import { describe, expect, it } from 'vitest'
import type { Access } from '@/domain/authorization'
import { isCurrent, navGroups, showsNav, visibleGroups } from '@/ui/molecules/app-nav-routes'

/** Tous les liens de la barre, dans l'ordre d'affichage. */
const hrefs = navGroups.flatMap((group) => group.entries.map((entry) => entry.href))

const linksFor = (access: Access) =>
  visibleGroups(access).flatMap((group) => group.entries.map((entry) => entry.href))

const PATRON: Access = { plan: 'free', role: 'owner' }
const PATRON_PRO: Access = { plan: 'pro', role: 'owner' }
const COMPAGNON: Access = { plan: 'free', role: 'member' }

describe('les entrées de la navigation', () => {
  it('couvre les six écrans de l’artisan', () => {
    expect(hrefs).toEqual([
      '/devis',
      '/factures',
      '/agenda',
      '/mon-passeport',
      '/verification',
      '/equipe',
    ])
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

describe('ce que la navigation propose', () => {
  it('donne au patron tout sauf ce qu’il n’a pas payé', () => {
    expect(linksFor(PATRON)).toEqual([
      '/devis',
      '/factures',
      '/agenda',
      '/mon-passeport',
      '/verification',
    ])
  })

  it('ouvre l’équipe une fois l’entreprise en Pro', () => {
    expect(linksFor(PATRON_PRO)).toContain('/equipe')
  })

  it('ne propose au compagnon RIEN qui le refuserait', () => {
    // La regle du jalon : un lien qui mene a un refus est pire que pas de lien.
    expect(linksFor(COMPAGNON)).toEqual(['/devis', '/agenda'])
  })

  it('efface le groupe dont toutes les entrées tombent', () => {
    // Une etiquette de groupe annoncee sur une liste vide est un bruit pour le
    // lecteur d'ecran.
    expect(visibleGroups(COMPAGNON).map((group) => group.label)).toEqual(['Suivi quotidien'])
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
    expect(showsNav('/entreprises')).toBe(false)
  })
})
