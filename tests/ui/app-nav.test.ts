import { describe, expect, it } from 'vitest'
import type { Access } from '@/domain/authorization'
import {
  isCurrent,
  navGroups,
  spaceNavGroups,
  staffNavGroups,
  visibleGroups,
} from '@/ui/molecules/app-nav-routes'

/** Tous les liens de la barre, dans l'ordre d'affichage. */
const hrefs = navGroups.flatMap((group) => group.entries.map((entry) => entry.href))

const linksFor = (access: Access) =>
  visibleGroups(access).flatMap((group) => group.entries.map((entry) => entry.href))

const PATRON: Access = { plan: 'free', role: 'owner' }
const PATRON_PRO: Access = { plan: 'pro', role: 'owner' }
const COMPAGNON: Access = { plan: 'free', role: 'member' }

describe('les entrées de la navigation', () => {
  it('couvre les huit écrans de l’artisan', () => {
    expect(hrefs).toEqual([
      '/',
      '/devis',
      '/factures',
      '/agenda',
      '/mon-passeport',
      '/verification',
      '/equipe',
      '/offre-pro',
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
  it('propose au patron gratuit la porte de l’offre Pro, pas l’équipe', () => {
    // « Équipe » est derriere le plan, donc masquee ; « Offre Pro » prend sa
    // place — sans elle, l'offre n'aurait aucun point d'entree dans la barre.
    expect(linksFor(PATRON)).toEqual([
      '/',
      '/devis',
      '/factures',
      '/agenda',
      '/mon-passeport',
      '/verification',
      '/offre-pro',
    ])
  })

  it('ouvre l’équipe une fois l’entreprise en Pro, et retire la porte de l’offre', () => {
    const links = linksFor(PATRON_PRO)
    expect(links).toContain('/equipe')
    // Une entreprise qui a deja Pro n'a plus rien a decouvrir.
    expect(links).not.toContain('/offre-pro')
  })

  it('ne propose au compagnon RIEN qui le refuserait', () => {
    // La regle du jalon : un lien qui mene a un refus est pire que pas de lien.
    expect(linksFor(COMPAGNON)).toEqual(['/', '/devis', '/agenda'])
  })

  it('ouvre le suivi quotidien par l accueil, sans capacite requise', () => {
    const [daily] = visibleGroups({ plan: 'free', role: 'member' })

    expect(daily.entries[0]).toEqual({ href: '/', label: 'Accueil' })
  })

  it('efface le groupe dont toutes les entrées tombent', () => {
    // Une etiquette de groupe annoncee sur une liste vide est un bruit pour le
    // lecteur d'ecran.
    expect(visibleGroups(COMPAGNON).map((group) => group.label)).toEqual(['Suivi quotidien'])
  })
})

describe('la navigation du demandeur', () => {
  const spaceHrefs = spaceNavGroups.flatMap((group) => group.entries.map((entry) => entry.href))

  it('mène aux deux destinations de son dossier', () => {
    expect(spaceHrefs).toEqual(['/mes-logements', '/mon-repertoire'])
  })

  it('n’exige aucune capacité', () => {
    // Le demandeur n'appartient a aucune entreprise : une entree qui exigerait
    // une capacite disparaitrait pour tout le monde, sans que rien le dise.
    const entries = spaceNavGroups.flatMap((group) => group.entries)
    expect(entries.filter((entry) => entry.capability)).toEqual([])
  })

  it('ne propose aucun écran de l’artisan', () => {
    // Les deux tables vivent dans le meme fichier : une entree copiee d'un
    // groupe a l'autre mènerait le demandeur droit sur un refus de session.
    expect(spaceHrefs.filter((href) => hrefs.includes(href))).toEqual([])
  })

  it('ne pose aucun préfixe qui en recouvre un autre', () => {
    for (const href of spaceHrefs) {
      const others = spaceHrefs.filter((candidate) => candidate !== href)
      expect(others.filter((candidate) => isCurrent(candidate, href))).toEqual([])
    }
  })
})

describe('la navigation du backoffice', () => {
  const staffHrefs = staffNavGroups.flatMap((group) => group.entries.map((entry) => entry.href))

  it('couvre les quatre écrans internes', () => {
    // Quatre depuis les leads. L'assertion est exhaustive et ordonnee a
    // dessein : ce que le relecteur voit dans son en-tete est la seule liste
    // de ses destinations, et un ecran interne ajoute sans y figurer serait un
    // ecran qu'on n'atteint qu'en tapant son adresse.
    expect(staffHrefs).toEqual(['/supervision', '/attestations', '/entreprises', '/leads'])
  })

  it('ne partage AUCUNE entrée avec celle de l’artisan', () => {
    // La garantie a change de nature. Elle reposait sur une liste de prefixes
    // qu'`AppNav` consultait pour deviner a qui elle s'adressait — une regle a
    // tenir a jour, dont l'oubli donnait au relecteur la navigation de
    // l'artisan. `AdminShell` passe desormais ces entrees explicitement : ce
    // qu'il reste a verifier, c'est qu'aucune des deux tables ne deborde sur
    // l'autre.
    const artisanHrefs = navGroups.flatMap((group) => group.entries.map((entry) => entry.href))

    for (const href of staffHrefs) expect(artisanHrefs).not.toContain(href)
  })
})
