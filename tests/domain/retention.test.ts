import { describe, it, expect } from 'vitest'
import {
  MAX_RETENTION_RATE,
  assertRetentionRate,
  releaseDate,
  retainedAmount,
  retentionState,
  type Reception,
} from '@/domain/retention'

const RECEIVED = new Date('2026-03-15T00:00:00Z')

/** Une reception sans reserve, sauf ce qu'on surcharge. */
const reception = (overrides: Partial<Reception> = {}): Reception => ({
  receivedAt: RECEIVED,
  reserves: null,
  reservesLiftedAt: null,
  ...overrides,
})

describe('le taux', () => {
  it('accepte l absence de retenue', () => {
    // Elle est FACULTATIVE : « peuvent etre amputes », dit la loi. Zero par
    // defaut, et jamais autrement.
    expect(() => assertRetentionRate(0)).not.toThrow()
  })

  it('accepte le plafond legal', () => {
    expect(MAX_RETENTION_RATE).toBe(5)
    expect(() => assertRetentionRate(5)).not.toThrow()
  })

  it('REFUSE au-dela de 5 %', () => {
    // Depasser le plafond priverait l'artisan d'une part de son chantier que le
    // client n'avait pas le droit de retenir.
    expect(() => assertRetentionRate(6)).toThrow(/5 %/)
    expect(() => assertRetentionRate(10)).toThrow(/71-584/)
  })

  it('refuse un taux negatif ou fractionnaire', () => {
    expect(() => assertRetentionRate(-1)).toThrow()
    expect(() => assertRetentionRate(2.5)).toThrow()
  })
})

describe('le montant retenu', () => {
  it('vaut le pourcentage du TTC', () => {
    // « 5 p. 100 de leur montant » : le montant des paiements, donc le TTC.
    expect(retainedAmount(100_700, 5)).toBe(5_035)
  })

  it('vaut zero sans retenue stipulee', () => {
    expect(retainedAmount(100_700, 0)).toBe(0)
  })

  it('s arrondit au centime, jamais en flottant', () => {
    expect(retainedAmount(333, 5)).toBe(17)
  })
})

describe('la date de liberation', () => {
  it('tombe un an apres la reception', () => {
    expect(releaseDate(reception())).toEqual(new Date('2027-03-15T00:00:00Z'))
  })

  it('est INCONNUE sans reception declaree', () => {
    // Nous n'etablissons pas la reception : nous enregistrons une declaration.
    // Sans elle, aucune date — et surtout pas une date inventee.
    expect(releaseDate(reception({ receivedAt: null }))).toBeNull()
  })

  it('coincide avec la garantie de parfait achevement', () => {
    // Ce n'est pas une coincidence : la retenue existe pour la couvrir.
    expect(releaseDate(reception({ receivedAt: new Date('2028-02-29T00:00:00Z') }))).toEqual(
      new Date('2029-02-28T00:00:00Z'),
    )
  })
})

describe('la date de liberation avec des reserves', () => {
  it('est INCONNUE tant que les reserves ne sont pas levees', () => {
    // Des reserves sont l'opposition motivee de la loi : la somme reste due au
    // client, sans terme, jusqu'a la levee.
    expect(releaseDate(reception({ reserves: 'Joint du bac a douche a reprendre' }))).toBeNull()
  })

  it('ne descend jamais sous le terme d un an, meme si les reserves sont levees plus tot', () => {
    // La retenue couvre l'annee de parfait achevement : lever une reserve au
    // troisieme mois ne libere pas la somme au troisieme mois.
    expect(
      releaseDate(
        reception({
          reserves: 'Peinture a reprendre',
          reservesLiftedAt: new Date('2026-06-15T00:00:00Z'),
        }),
      ),
    ).toEqual(new Date('2027-03-15T00:00:00Z'))
  })

  it('tombe a la levee quand celle-ci depasse le terme d un an', () => {
    // Des reserves ne peuvent que retarder la liberation.
    expect(
      releaseDate(
        reception({
          reserves: 'Infiltration a traiter',
          reservesLiftedAt: new Date('2027-09-01T00:00:00Z'),
        }),
      ),
    ).toEqual(new Date('2027-09-01T00:00:00Z'))
  })
})

describe('l etat de la retenue', () => {
  const invoice = { totalInclTax: 100_700, rate: 5, reception: reception() }

  it('retient tant que l annee n est pas ecoulee', () => {
    const state = retentionState(invoice, new Date('2027-03-14T12:00:00Z'))

    expect(state.amount).toBe(5_035)
    expect(state.withheld).toBe(5_035)
    expect(state.releasesOn).toEqual(new Date('2027-03-15T00:00:00Z'))
    expect(state.reservesPending).toBe(false)
  })

  it('libere le jour dit', () => {
    expect(retentionState(invoice, new Date('2027-03-15T00:00:00Z')).withheld).toBe(0)
  })

  it('RETIENT indefiniment sans reception declaree', () => {
    // Un blocage reel, et assume : nous ne connaissons pas la date, donc nous
    // ne reclamons pas la somme. L'ecran le MONTRE au lieu de le masquer.
    const state = retentionState(
      { ...invoice, reception: reception({ receivedAt: null }) },
      new Date('2099-01-01'),
    )

    expect(state.amount).toBe(5_035)
    expect(state.withheld).toBe(5_035)
    expect(state.releasesOn).toBeNull()
    expect(state.reservesPending).toBe(false)
  })

  it('RETIENT tant que des reserves tiennent, et le signale', () => {
    const state = retentionState(
      { ...invoice, reception: reception({ reserves: 'Carrelage a reprendre' }) },
      new Date('2099-01-01'),
    )

    expect(state.withheld).toBe(5_035)
    expect(state.releasesOn).toBeNull()
    // La distinction que l'ecran doit rendre : ici ce sont les reserves qui
    // bloquent, pas une reception manquante.
    expect(state.reservesPending).toBe(true)
  })

  it('libere une fois les reserves levees et le terme passe', () => {
    const state = retentionState(
      {
        ...invoice,
        reception: reception({
          reserves: 'Carrelage a reprendre',
          reservesLiftedAt: new Date('2027-01-10T00:00:00Z'),
        }),
      },
      new Date('2027-03-16T00:00:00Z'),
    )

    expect(state.withheld).toBe(0)
    expect(state.reservesPending).toBe(false)
  })

  it('ne retient rien quand aucune retenue n est stipulee', () => {
    const state = retentionState(
      { ...invoice, rate: 0, reception: reception({ receivedAt: null }) },
      new Date('2026-01-01'),
    )

    expect(state.amount).toBe(0)
    expect(state.withheld).toBe(0)
  })
})
