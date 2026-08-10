'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { missingMentionGroups, type MentionGroup } from '@/domain/legal-mentions'
import { findEstablishment, type Establishment } from '@/services/company-lookup'
import { recordIntent } from '@/services/registration-intent'

export interface LookupState {
  error?: string
  found?: Establishment
  /** Ce qui restera a completer une fois entre. Annonce, jamais exige ici. */
  missing?: MentionGroup[]
}

/**
 * Le SIRET AVANT l'adresse — c'est l'inversion decidee en A1 §4.
 *
 * L'artisan tape quatorze chiffres et l'outil affiche sa raison sociale : c'est
 * le moment ou il comprend ce qu'est le produit. Le depenser apres un
 * aller-retour par la boite mail, c'est le depenser au mauvais endroit.
 *
 * Et surtout : **on refuse avant de creer**. Etablissement cesse, entreprise
 * deja inscrite — ces deux refus tombaient jusqu'ici APRES la creation du
 * compte Supabase, ce qui en faisait la principale fabrique d'orphelins.
 */
export async function lookupForSignUp(_state: LookupState, form: FormData): Promise<LookupState> {
  let found: Establishment
  try {
    found = await findEstablishment(String(form.get('siret') ?? ''))
  } catch (e) {
    return { error: (e as Error).message }
  }

  if (!found.active) {
    return { error: "Cet établissement n'est plus actif au répertoire des entreprises." }
  }

  const taken = await db.query.company.findFirst({ where: eq(company.siret, found.siret) })
  if (taken) {
    return { error: 'Cette entreprise est déjà inscrite. Demandez une invitation à son responsable.' }
  }

  // Ce que l'API a prerempli compte deja : la ligne « Coordonnees » n'est pas
  // vide au depart, et l'annoncer honnetement vaut mieux que partir de zero.
  return {
    found,
    missing: missingMentionGroups({
      legalFormLabel: found.legalFormLabel,
      vatNumber: found.vatNumber,
    }),
  }
}

/**
 * Ecrit l'intention. **N'envoie pas le lien** : l'envoi reste cote client,
 * comme sur `/connexion`, parce que le verificateur du lien magique doit vivre
 * dans les cookies du navigateur qui l'a demande.
 *
 * Appelee AVANT l'envoi : une intention orpheline se purge seule, alors qu'un
 * lien envoye sans intention ferait atterrir la personne sur cette meme page.
 */
export async function recordCompanyIntent(email: string, siret: string): Promise<void> {
  await recordIntent({ email, kind: 'company', siret })
}
