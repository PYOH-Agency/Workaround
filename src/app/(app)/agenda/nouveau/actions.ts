'use server'

import { redirect } from 'next/navigation'
import { requireCapability } from '@/lib/access'
import { createProject } from '@/services/projects'
import { bookAppointment } from '@/services/appointments'

export interface BookVisitState {
  error?: string
}

/**
 * Prend un rendez-vous de visite, et cree le chantier avec.
 *
 * C'est le seul parcours du jalon qui ne part pas d'un chantier existant : la
 * visite precede le devis, et un rendez-vous ne se pose jamais dans le vide.
 */
export async function bookVisit(_state: BookVisitState, form: FormData): Promise<BookVisitState> {
  const { companyId } = await requireCapability('agenda.manage')

  try {
    const startsAt = new Date(String(form.get('debut')))
    const endsAt = new Date(String(form.get('fin')))
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return { error: 'Créneau invalide.' }
    }

    // Le chantier d'abord : le rendez-vous n'existe pas sans lui, et l'artisan
    // devra le creer de toute facon pour etablir son devis.
    //
    // En cas d'echec du second appel, un chantier reste sans rendez-vous. C'est
    // volontaire : il est reutilisable, alors que perdre le client saisi parce
    // que l'heure etait mal formee serait bien pire.
    const created = await createProject({
      companyId,
      customer: {
        name: String(form.get('client') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('telephone') ?? ''),
        type: 'individual',
      },
      address: {
        line1: String(form.get('adresse') ?? ''),
        postalCode: String(form.get('code_postal') ?? ''),
        city: String(form.get('ville') ?? ''),
      },
      label: String(form.get('objet') ?? ''),
    })

    await bookAppointment({
      companyId,
      projectId: created.project.id,
      kind: 'visit',
      startsAt,
      endsAt,
      note: String(form.get('note') ?? ''),
    })
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Hors du bloc `try` : `redirect` signale la navigation en levant une
  // exception, qu'un `catch` afficherait comme une erreur.
  redirect('/agenda')
}
