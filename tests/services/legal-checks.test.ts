import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchCollectiveProceedings } from '@/services/legal-checks'

afterEach(() => vi.restoreAllMocks())

const bodaccResponse = (families: string[]) => ({
  total_count: families.length,
  results: families.map((familleavis) => ({ familleavis, dateparution: '2026-01-01' })),
})

describe('recuperation des avis BODACC', () => {
  it('remonte les familles des avis trouves', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => bodaccResponse(['collective', 'dpc']) }),
    )

    expect(await fetchCollectiveProceedings('507698207')).toEqual(['collective', 'dpc'])
  })

  it('renvoie une liste vide quand aucune annonce n existe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => bodaccResponse([]) }))
    expect(await fetchCollectiveProceedings('000000000')).toEqual([])
  })

  it('ne bloque jamais une entreprise sur une panne de source', async () => {
    // Une indisponibilite du BODACC ne doit pas suspendre des entreprises
    // saines. On leve, et l'appelant conserve le dernier controle connu.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    await expect(fetchCollectiveProceedings('507698207')).rejects.toThrow('BODACC')
  })
})
