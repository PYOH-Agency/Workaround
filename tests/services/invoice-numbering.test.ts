import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db, connection } from '@/db/client'
import { allocateInvoiceNumber } from '@/services/invoices'
import { createCompany } from './invoice-fixtures'

let COMPANY: string

beforeAll(async () => {
  COMPANY = await createCompany()
})

afterAll(async () => {
  await connection.end()
})

describe('attribution du numero de facture', () => {
  it('produit une sequence continue', async () => {
    const first = await allocateInvoiceNumber(COMPANY, 2030)
    const second = await allocateInvoiceNumber(COMPANY, 2030)
    const third = await allocateInvoiceNumber(COMPANY, 2030)

    expect(first).toBe('F2030-0001')
    expect(second).toBe('F2030-0002')
    expect(third).toBe('F2030-0003')
  })

  it('ne laisse aucun trou sous concurrence', async () => {
    // Dix attributions simultanees doivent produire dix rangs consecutifs.
    // C'est precisement ce que la reprise sur collision des devis ne garantit
    // pas, et pourquoi la facture exige un compteur incremente en base.
    const numbers = await Promise.all(
      Array.from({ length: 10 }, () => allocateInvoiceNumber(COMPANY, 2031)),
    )

    const sequences = numbers.map((n) => Number(n.split('-')[1])).sort((a, b) => a - b)
    expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('repart a 1 sur une nouvelle annee', async () => {
    expect(await allocateInvoiceNumber(COMPANY, 2032)).toBe('F2032-0001')
  })

  it('rend le rang si la transaction echoue', async () => {
    // La raison d'etre du parametre de transaction. Attribuer le rang hors de
    // la transaction qui insere la facture laisserait un trou au premier echec
    // — precisement le manquement comptable que toute cette conception evite.
    expect(await allocateInvoiceNumber(COMPANY, 2033)).toBe('F2033-0001')

    await db
      .transaction(async (tx) => {
        await allocateInvoiceNumber(COMPANY, 2033, tx)
        throw new Error('echec apres attribution')
      })
      .catch(() => {})

    expect(await allocateInvoiceNumber(COMPANY, 2033)).toBe('F2033-0002')
  })
})
