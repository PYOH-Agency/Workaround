import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { sirenFromSlug } from '@/domain/slug'
import { publicProfile } from '@/services/public-profile'
import { CoveredActivities } from './CoveredActivities'
import { Qualifications } from './Qualifications'

/**
 * La page publique d'une entreprise.
 *
 * Elle porte la phrase que personne d'autre en France ne peut prononcer :
 * chaque activite affichee ici est couverte par une assurance en cours de
 * validite, adaptee a cette activite precise.
 *
 * Aucune metrique : elles arrivent avec le jalon des metriques.
 */
async function load(slug: string) {
  const siren = sirenFromSlug(slug)
  if (!siren) return null
  return publicProfile(siren, new Date())
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const profile = await load((await params).slug)
  if (!profile) return { title: 'Entreprise introuvable' }

  const trades = profile.activities.map((a) => a.label.split(' —')[0]).slice(0, 3).join(', ')

  return {
    title: `${profile.legalName}${profile.city ? ` — ${profile.city}` : ''}`,
    description: `${trades}. Assurance vérifiée pour chacune des activités affichées.`,
    alternates: { canonical: `/artisan/${profile.slug}` },
  }
}

export default async function ArtisanPage({ params }: { params: Promise<{ slug: string }> }) {
  const profile = await load((await params).slug)

  // Une entreprise sans aucune activite couverte n'a pas de page : l'exclusion
  // est portee par la requete, jamais par un filtre d'affichage.
  if (!profile) notFound()

  const years = profile.foundedOn
    ? new Date().getFullYear() - profile.foundedOn.getFullYear()
    : null

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{profile.legalName}</h1>
        <p className="text-sm opacity-70">
          {profile.city}
          {years !== null && ` · ${years} ans d’activité`}
        </p>
        <p className="text-sm opacity-70">SIRET {profile.siret}</p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Activités vérifiées</h2>
        <p className="text-sm opacity-70">
          Chacune est couverte par une assurance en cours de validité, adaptée à cette activité.
        </p>
        <CoveredActivities activities={profile.activities} />
      </section>

      {profile.qualifications.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-medium">Qualifications</h2>
          <Qualifications qualifications={profile.qualifications} />
        </section>
      )}

      {/* Mentions imposees par l'article L243-2 du Code des assurances. */}
      <section className="border-t border-black/10 pt-4 text-xs opacity-70 dark:border-white/15">
        <p className="font-medium">Assurance professionnelle</p>
        <p>{profile.insurer.name}</p>
        <p>Contrat n° {profile.insurer.policyNumber}</p>
        {profile.insurer.validUntil && (
          <p>Valide jusqu’au {profile.insurer.validUntil.toLocaleDateString('fr-FR')}</p>
        )}
      </section>
    </main>
  )
}
