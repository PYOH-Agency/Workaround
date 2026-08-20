import { describe, it, expect } from 'vitest'
import {
  AccessError,
  CAPABILITIES,
  assertCan,
  can,
  denial,
  type Access,
  type Capability,
} from '@/domain/authorization'

const PATRON: Access = { plan: 'free', role: 'owner' }
const COMPAGNON: Access = { plan: 'free', role: 'member' }
const PATRON_PRO: Access = { plan: 'pro', role: 'owner' }
const COMPAGNON_PRO: Access = { plan: 'pro', role: 'member' }

describe('la porte du plan', () => {
  it('refuse l equipe a une entreprise gratuite', () => {
    expect(denial(PATRON, 'team.manage')).toBe('plan')
  })

  it('l ouvre a une entreprise Pro', () => {
    expect(can(PATRON_PRO, 'team.manage')).toBe(true)
  })

  it('AUCUNE fonction existante ne passe derriere la porte', () => {
    // **Le test le plus important du jalon** (spec §8). Cette liste EST la
    // decision : y ajouter une ligne, c'est retirer quelque chose a des gens
    // qui l'avaient. Elle doit donc se modifier a la main, jamais par accident.
    const pro = Object.entries(CAPABILITIES)
      .filter(([, required]) => required.plan === 'pro')
      .map(([name]) => name)

    // **Mise a jour en M8·B, en connaissance de cause.** `situation.issue` est
    // une fonction NEUVE : la facturation a l'avancement au pourcentage global
    // (`issueProgress`) reste ouverte a tous, inchangee. Rien n'a ete retire.
    expect(pro).toEqual(['team.manage', 'situation.issue'])
  })

  it('laisse une entreprise gratuite faire tout le reste', () => {
    const free = (Object.keys(CAPABILITIES) as Capability[]).filter(
      (capability) => CAPABILITIES[capability].plan === 'free',
    )

    for (const capability of free) expect(can(PATRON, capability)).toBe(true)
  })
})

describe('la porte du role', () => {
  it('laisse le compagnon tenir l agenda et publier au fil de chantier', () => {
    expect(can(COMPAGNON, 'agenda.manage')).toBe(true)
    expect(can(COMPAGNON, 'chantier.post')).toBe(true)
    expect(can(COMPAGNON, 'quote.read')).toBe(true)
  })

  it('lui refuse TOUT ce qui touche a l argent', () => {
    // « Le compagnon fait le chantier, le patron fait l'argent. »
    expect(can(COMPAGNON, 'invoice.issue')).toBe(false)
    expect(can(COMPAGNON, 'payment.record')).toBe(false)
    expect(can(COMPAGNON, 'quote.write')).toBe(false)
    expect(can(COMPAGNON, 'passport.manage')).toBe(false)
  })

  it('donne au responsable tout ce que le compagnon a', () => {
    const ofMember = (Object.keys(CAPABILITIES) as Capability[]).filter(
      (capability) => CAPABILITIES[capability].role === 'member',
    )

    for (const capability of ofMember) expect(can(PATRON, capability)).toBe(true)
  })
})

describe('le refus', () => {
  it('annonce le ROLE avant le plan quand les deux manquent', () => {
    // Dire « offre Pro » a un compagnon lui vendrait quelque chose dont il ne
    // pourrait rien faire, meme une fois l'entreprise abonnee.
    expect(denial(COMPAGNON, 'team.manage')).toBe('role')
    expect(denial(COMPAGNON_PRO, 'team.manage')).toBe('role')
  })

  it('porte sa raison, pour que l ecran reponde autrement dans chaque cas', () => {
    try {
      assertCan(PATRON, 'team.manage')
      expect.unreachable('assertCan aurait du refuser')
    } catch (e) {
      expect(e).toBeInstanceOf(AccessError)
      expect((e as AccessError).reason).toBe('plan')
      expect((e as AccessError).message).toMatch(/Pro/)
    }
  })

  it('dit CE QUI est refuse, pas seulement que c est refuse', () => {
    expect(() => assertCan(COMPAGNON, 'invoice.issue')).toThrow(/facturer/)
    expect(() => assertCan(COMPAGNON, 'payment.record')).toThrow(/paiement/)
  })

  it('ne leve rien quand la capacite est accordee', () => {
    expect(() => assertCan(PATRON, 'invoice.issue')).not.toThrow()
  })
})
