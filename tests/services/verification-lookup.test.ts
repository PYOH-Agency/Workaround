import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { company, verificationLookup } from '@/db/schema'
import { classifySiret, recordLookup, purgeLookups } from '@/services/verification-lookup'

const MEMBER = randomUUID()
// Deux SIRET a la cle de Luhn JUSTE, sur des SIREN absents du seed.
// La cle est desormais exigee : `classifySiret` leve sur un SIRET invalide.
// `50769820700036` est ecarte, il y designe BD PLOMBERIE, qui a une couverture
// publiee — elle repondrait `covered`, pas `uncovered_member`.
const MEMBER_SIRET = '78462765400006'
const STRANGER_SIRET = '39315263200005'
const OLD_SIRET = '11111111111111'
const RECENT_SIRET = '22222222222222'

beforeAll(async () => {
  // La base est partagee et n'est pas reinitialisee entre deux passages : on
  // efface nos propres traces AVANT d'ecrire, sans quoi le compte des lignes
  // rendues par la purge depend du nombre de fois que la suite a tourne.
  await db
    .delete(verificationLookup)
    .where(inArray(verificationLookup.siret, [STRANGER_SIRET, OLD_SIRET, RECENT_SIRET]))
  await db.delete(company).where(eq(company.siret, MEMBER_SIRET))

  await db.insert(company).values({
    id: MEMBER,
    siret: MEMBER_SIRET,
    legalName: 'INSCRIT SANS COUVERTURE',
  })
})

afterAll(async () => {
  await connection.end()
})

describe('classifySiret', () => {
  it('reconnait un inscrit sans activite couverte', async () => {
    const result = await classifySiret(MEMBER_SIRET, new Date())
    expect(result).toEqual({ outcome: 'uncovered_member', slug: null })
  })

  it('reconnait un inconnu', async () => {
    const result = await classifySiret(STRANGER_SIRET, new Date())
    expect(result).toEqual({ outcome: 'stranger', slug: null })
  })

  it('leve sur un SIRET trop court', async () => {
    await expect(classifySiret('123', new Date())).rejects.toThrow(/SIRET/)
  })

  /**
   * Le vrai danger, et il est silencieux.
   *
   * `_` est un joker dans un LIKE SQL : il matche UN caractere quelconque. La
   * requete cherche `${siren}%`, donc un underscore place dans les neuf
   * premiers caracteres elargit la recherche au lieu de ne rien trouver.
   * `7846276_400006` n'est le SIRET de personne, mais son prefixe `7846276_4`
   * matche `784627654...` — et l'inconnu ressort `uncovered_member`, l'issue
   * d'une entreprise qui n'est pas la sienne.
   *
   * C'est exactement l'invariant du parcours qui fuit : la reponse devient
   * differente selon l'appartenance a D'equerre. D'ou une exception, et non un
   * repli sur `stranger` — une entree non validee est un defaut de
   * programmation, pas un cas d'usage, et la masquer produirait un affichage
   * plausible sur une donnee fausse.
   */
  it('leve sur un SIRET contenant un joker LIKE', async () => {
    await expect(classifySiret(`7846276_400006`, new Date())).rejects.toThrow(/SIRET/)
  })
})

describe('recordLookup', () => {
  it('ecrit une ligne sans rien de personnel au-dela du SIRET', async () => {
    const now = new Date()
    await recordLookup({ siret: STRANGER_SIRET, outcome: 'stranger', entry: 'demandeur' }, now)

    const [row] = await db
      .select()
      .from(verificationLookup)
      .where(eq(verificationLookup.siret, STRANGER_SIRET))

    expect(row.outcome).toBe('stranger')
    expect(row.entry).toBe('demandeur')
    // L'engagement « ni IP, ni session, ni agent » : aucune colonne de plus que
    // ces cinq. Trie des deux cotes, l'ordre rendu par drizzle n'etant pas une
    // garantie.
    expect([...Object.keys(row)].sort()).toEqual(
      ['id', 'siret', 'outcome', 'entry', 'lookedUpAt'].sort(),
    )
  })
})

describe('purgeLookups', () => {
  it('efface au-dela de douze mois et garde le reste', async () => {
    const now = new Date('2026-08-19T12:00:00Z')
    const old = new Date('2025-01-01T00:00:00Z')

    await db.insert(verificationLookup).values({
      siret: OLD_SIRET,
      outcome: 'covered',
      entry: 'pro',
      lookedUpAt: old,
    })
    await db.insert(verificationLookup).values({
      siret: RECENT_SIRET,
      outcome: 'covered',
      entry: 'pro',
      lookedUpAt: new Date(now.getTime() - 86_400_000),
    })

    await purgeLookups(now)

    const remaining = await db.select({ siret: verificationLookup.siret }).from(verificationLookup)
    const sirets = remaining.map((r) => r.siret)
    expect(sirets).not.toContain(OLD_SIRET)
    expect(sirets).toContain(RECENT_SIRET)
  })
})
