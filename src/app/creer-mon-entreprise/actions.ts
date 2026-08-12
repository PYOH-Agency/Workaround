'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { findEstablishment, type Establishment } from '@/services/company-lookup'
import { createCompanyFor, RegistrationError } from '@/services/registration'
import { recordIntent } from '@/services/registration-intent'
import { createServerSupabase } from '@/lib/supabase-server'

export interface LookupState {
  error?: string
  found?: Establishment
  /**
   * Vrai si la personne est DEJA connectee.
   *
   * Cette page a deux publics, et on l'avait oublie. Le visiteur anonyme venu
   * de la landing doit passer par le lien magique. Mais `resolveDestination`
   * envoie ici un compte deja authentifie qui n'a ni entreprise, ni dossier,
   * ni role interne — celui qui a abandonne en cours de route, ou dont
   * l'invitation a ete revoquee. Lui redemander son adresse et un second
   * aller-retour par la boite mail alors qu'il est deja chez nous serait
   * absurde : pour lui, l'etape 2 cree l'entreprise et ouvre l'atelier.
   */
  signedIn?: boolean
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

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Aucun calcul de ce qui manque : l'etape 2 annonce les trois etapes de la
  // mise en route, qui sont toutes a faire tant que l'entreprise n'existe pas.
  return { found, signedIn: Boolean(user) }
}

/**
 * L'entreprise, tout de suite, pour qui est deja connecte.
 *
 * Le pendant de `recordCompanyIntent` : la ou le visiteur anonyme passe par la
 * boite aux lettres pour prouver son adresse, celui-ci l'a deja prouvee en se
 * connectant. Il n'y a donc aucune intention a memoriser — on cree, et on ouvre
 * l'atelier.
 *
 * `createCompanyFor` rappelle l'API et refuse un etablissement cesse ou une
 * entreprise deja prise : les memes garde-fous que par l'autre chemin, portes
 * par le meme service.
 */
export async function createCompanyNow(siret: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return { error: 'Session expirée. Reconnectez-vous.' }

  try {
    await createCompanyFor(user.id, user.email, siret)
  } catch (e) {
    if (e instanceof RegistrationError) return { error: e.message }
    throw e
  }

  // Hors du bloc `try` : `redirect` signale la navigation en levant.
  //
  // La racine, et non `/devis` : elle sert son accueil a l'artisan la ou elle
  // sert la landing au visiteur. Le poser devant une liste vide le jour de son
  // inscription serait le pire premier ecran possible.
  redirect('/')
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
