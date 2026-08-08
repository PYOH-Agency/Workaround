import { describe, it, expect } from 'vitest'
import {
  computeMetrics,
  MINIMUM_OBSERVATIONS,
  WINDOW_MONTHS,
  type CompletedChantier,
} from '@/domain/passport-metrics'

const NOW = new Date('2026-08-08T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

/** Un chantier tenu : facture au prix du devis, fini dans les temps. */
const kept = (overrides: Partial<CompletedChantier> = {}): CompletedChantier => ({
  signedAt: daysAgo(30),
  completedAt: daysAgo(20),
  committedLeadTimeDays: 10,
  initialTotalInclTax: 100000,
  invoicedInclTax: 100000,
  ...overrides,
})

const many = (n: number, overrides: Partial<CompletedChantier> = {}) =>
  Array.from({ length: n }, () => kept(overrides))

describe('seuil d affichage', () => {
  it('exige dix observations', () => {
    expect(MINIMUM_OBSERVATIONS).toBe(10)
  })

  it('ne rend aucun taux en dessous du seuil', () => {
    // Une entreprise a trois chantiers parfaits paraitrait meilleure qu'une
    // entreprise a deux cents chantiers a 96 %.
    const metrics = computeMetrics(many(9), NOW)

    expect(metrics.quoteToInvoiceGap.value).toBeNull()
    expect(metrics.leadTimeRespect.value).toBeNull()
  })

  it('rend le volume MEME quand le taux est masque', () => {
    // C'est la reponse au biais de selection : le volume n'est jamais cache,
    // parce qu'il dit sur quoi le taux porte — ou ne porte pas.
    const metrics = computeMetrics(many(9), NOW)

    expect(metrics.quoteToInvoiceGap.volume).toBe(9)
    expect(metrics.leadTimeRespect.volume).toBe(9)
  })

  it('rend le taux des le seuil atteint', () => {
    expect(computeMetrics(many(10), NOW).quoteToInvoiceGap.value).toBe(100)
  })
})

describe('ecart devis vers facture', () => {
  it('compte un chantier facture au prix du devis comme tenu', () => {
    expect(computeMetrics(many(10), NOW).quoteToInvoiceGap.value).toBe(100)
  })

  it('compte un depassement d un seul centime comme non tenu', () => {
    // Sans tolerance : les montants sont des entiers en centimes et l'outil les
    // controle de bout en bout.
    const chantiers = [...many(9), kept({ invoicedInclTax: 100001 })]
    expect(computeMetrics(chantiers, NOW).quoteToInvoiceGap.value).toBe(90)
  })

  it('compte comme tenu un chantier facture MOINS que le devis', () => {
    const chantiers = [...many(9), kept({ invoicedInclTax: 50000 })]
    expect(computeMetrics(chantiers, NOW).quoteToInvoiceGap.value).toBe(100)
  })

  it('compare au devis INITIAL, pas au dernier avenant', () => {
    // Un artisan qui sous-devise puis rattrape par avenants doit obtenir un
    // mauvais chiffre : c'est le comportement dont le marche se plaint, et la
    // question du demandeur est « quand il annonce 1 000, combien je paie ».
    const withAmendment = kept({ initialTotalInclTax: 100000, invoicedInclTax: 200000 })
    expect(computeMetrics([...many(9), withAmendment], NOW).quoteToInvoiceGap.value).toBe(90)
  })
})

describe('respect du delai annonce', () => {
  it('compte en jours OUVRES, comme le devis l annonce', () => {
    // Signe un vendredi, fini le mardi suivant : deux jours ouvres, pas quatre.
    const chantiers = many(10, {
      signedAt: new Date('2026-08-07T10:00:00Z'),
      completedAt: new Date('2026-08-11T10:00:00Z'),
      committedLeadTimeDays: 2,
    })

    expect(computeMetrics(chantiers, new Date('2026-08-12T10:00:00Z')).leadTimeRespect.value).toBe(100)
  })

  it('compte comme non tenu un depassement du delai', () => {
    const late = kept({ signedAt: daysAgo(40), completedAt: daysAgo(1), committedLeadTimeDays: 5 })
    expect(computeMetrics([...many(9), late], NOW).leadTimeRespect.value).toBe(90)
  })

  it('ecarte du calcul un chantier sans delai engage', () => {
    // Sans engagement declare, il n'y a rien a comparer : le compter comme
    // tenu flatterait, le compter comme manque punirait. On ne le compte pas.
    const metrics = computeMetrics([...many(10), kept({ committedLeadTimeDays: null })], NOW)

    expect(metrics.leadTimeRespect.volume).toBe(10)
    expect(metrics.quoteToInvoiceGap.volume).toBe(11)
  })
})

describe('fenetre glissante', () => {
  it('porte sur douze mois', () => {
    expect(WINDOW_MONTHS).toBe(12)
  })

  it('ecarte un chantier termine hors fenetre', () => {
    const metrics = computeMetrics([...many(10), kept({ completedAt: daysAgo(400) })], NOW)
    expect(metrics.quoteToInvoiceGap.volume).toBe(10)
  })

  it('compte le volume total, lui, sans fenetre', () => {
    // Le total dit l'anciennete de la pratique ; la fenetre dit l'actualite.
    const metrics = computeMetrics([...many(10), kept({ completedAt: daysAgo(400) })], NOW)

    expect(metrics.completed.window).toBe(10)
    expect(metrics.completed.total).toBe(11)
  })
})
