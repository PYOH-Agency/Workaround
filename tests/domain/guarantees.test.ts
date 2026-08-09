import { describe, it, expect } from 'vitest'
import { assertReceivable, guaranteeDeadlines } from '@/domain/guarantees'

const d = (iso: string) => new Date(iso)

describe('les echeances', () => {
  it('ne rend AUCUNE date sans reception declaree', () => {
    // LA decision du jalon. La reception tacite exige deux criteres cumulatifs
    // — prise de possession sans reserve et paiement integral — et nous n'en
    // connaissons qu'un. Imprimer une date fausse ferait manquer un delai de
    // forclusion.
    expect(guaranteeDeadlines(null)).toBeNull()
  })

  it('rend les trois echeances a partir de la reception', () => {
    expect(guaranteeDeadlines(d('2026-04-20T00:00:00Z'))).toEqual([
      {
        key: 'perfect_completion',
        years: 1,
        article: 'article 1792-6',
        endsAt: d('2027-04-20T00:00:00Z'),
      },
      {
        key: 'proper_function',
        years: 2,
        article: 'article 1792-3',
        endsAt: d('2028-04-20T00:00:00Z'),
      },
      { key: 'decennial', years: 10, article: 'article 1792', endsAt: d('2036-04-20T00:00:00Z') },
    ])
  })

  it('gere une reception un 29 fevrier', () => {
    // 2028 est bissextile, 2029 ne l'est pas : sans precaution, la date
    // deborderait sur le 1er mars.
    const [first] = guaranteeDeadlines(d('2028-02-29T00:00:00Z'))!

    expect(first.endsAt.toISOString().slice(0, 10)).toBe('2029-02-28')
  })
})

describe('recevabilite d une declaration de reception', () => {
  const base = {
    signedAt: d('2026-03-02T00:00:00Z'),
    completedAt: d('2026-04-20T00:00:00Z'),
    declaredAt: d('2026-04-25T00:00:00Z'),
    now: d('2026-05-01T00:00:00Z'),
  }

  it('accepte une date posterieure a la fin des travaux', () => {
    expect(() => assertReceivable(base)).not.toThrow()
  })

  it('refuse tant que le chantier n est pas termine', () => {
    // On ne recoit pas des travaux qui ne sont pas finis.
    expect(() => assertReceivable({ ...base, completedAt: null })).toThrow(/terminé/)
  })

  it('accepte une reception le JOUR MEME de la signature', () => {
    // Une reception est un jour, pas un instant : le client saisit une date,
    // qui vaut minuit. Comparee a un horodatage de l'apres-midi, elle serait
    // refusee — alors que signer le matin et recevoir le soir est ordinaire
    // sur un petit chantier.
    expect(() =>
      assertReceivable({
        signedAt: d('2026-08-09T14:30:00Z'),
        completedAt: d('2026-08-09T18:00:00Z'),
        declaredAt: d('2026-08-09T00:00:00Z'),
        now: d('2026-08-09T19:00:00Z'),
      }),
    ).not.toThrow()
  })

  it('accepte une reception declaree aujourd hui', () => {
    expect(() =>
      assertReceivable({ ...base, declaredAt: d('2026-05-01T00:00:00Z'), now: d('2026-05-01T09:00:00Z') }),
    ).not.toThrow()
  })

  it('refuse une date anterieure a la signature', () => {
    expect(() => assertReceivable({ ...base, declaredAt: d('2026-01-01T00:00:00Z') })).toThrow(
      /antérieure à la signature/,
    )
  })

  it('refuse une date a venir', () => {
    expect(() => assertReceivable({ ...base, declaredAt: d('2026-06-01T00:00:00Z') })).toThrow(
      /à venir/,
    )
  })
})
