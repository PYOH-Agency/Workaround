'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { entreprise, membre } from '@/db/schema'
import { rechercherEtablissement } from '@/services/entreprise-publique'
import { enregistrerEvenement } from '@/services/evenements'
import { creerClientServeur } from '@/lib/supabase-serveur'

export interface EtatInscription {
  erreur?: string
}

export async function inscrire(
  _etat: EtatInscription,
  donnees: FormData,
): Promise<EtatInscription> {
  const supabase = await creerClientServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { erreur: 'Session expirée. Reconnectez-vous.' }

  const dejaRattache = await db.query.membre.findFirst({
    where: eq(membre.utilisateurId, user.id),
  })
  if (dejaRattache) redirect('/devis')

  let etablissement
  try {
    etablissement = await rechercherEtablissement(String(donnees.get('siret') ?? ''))
  } catch (e) {
    return { erreur: (e as Error).message }
  }

  if (!etablissement.actif) {
    return { erreur: "Cet établissement n'est plus actif au répertoire des entreprises." }
  }

  const dejaInscrite = await db.query.entreprise.findFirst({
    where: eq(entreprise.siret, etablissement.siret),
  })
  if (dejaInscrite) {
    return { erreur: 'Cette entreprise est déjà inscrite. Demandez une invitation à son responsable.' }
  }

  const [nouvelle] = await db
    .insert(entreprise)
    .values({
      siret: etablissement.siret,
      raisonSociale: etablissement.raisonSociale,
      formeJuridique: etablissement.formeJuridique,
      adresseLigne1: etablissement.adresseLigne1,
      codePostal: etablissement.codePostal,
      ville: etablissement.ville,
      dateCreationEntreprise: etablissement.dateCreation,
    })
    .returning()

  await db.insert(membre).values({
    entrepriseId: nouvelle.id,
    utilisateurId: user.id,
    email: user.email!,
    role: 'proprietaire',
  })

  await enregistrerEvenement({
    type: 'entreprise.creee',
    sujetType: 'entreprise',
    sujetId: nouvelle.id,
    entrepriseId: nouvelle.id,
    acteurType: 'entreprise',
    acteurId: user.id,
    // Le RGE est releve des l'inscription : c'est l'une des habilitations
    // bloquantes de M3, et l'API la donne gratuitement.
    payload: { siret: nouvelle.siret, rge: etablissement.rge },
  })

  redirect('/devis')
}
