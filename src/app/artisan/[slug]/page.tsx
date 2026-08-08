import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { sirenFromSlug } from '@/domain/slug'
import { publicProfile } from '@/services/public-profile'
import { DateText } from '@/ui/atoms/date-text'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { SealBadge } from '@/ui/molecules/seal-badge'
import { PublicShell } from '@/ui/shells/public-shell'
import { ContactForm } from './ContactForm'
import { CoveredActivities } from './CoveredActivities'
import { Qualifications } from './Qualifications'

/**
 * La page publique d'une entreprise.
 *
 * Elle porte la phrase que personne d'autre en France ne peut prononcer : pour
 * chaque activite affichee ici, une attestation d'assurance adaptee a cette
 * activite precise a ete relevee et controlee.
 *
 * L'affirmation est datee, jamais au present : nous connaissons l'echeance du
 * document, pas l'etat du contrat. Voir `CoveredActivities`.
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

  const trades = profile.activities.map((a) => a.label.split(' —')[0]).join(', ')

  return (
    <PublicShell>
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Heading level="display">{profile.legalName}</Heading>
          <Text size="sm" tone="soft">
            {profile.city}
            {years !== null && ` · ${years} ans d’activité`}
          </Text>
          <Text size="sm" tone="muted">
            SIRET {profile.siret}
          </Text>
        </div>

        {/*
          Le sceau, enfin honnete : la verification existe reellement ici, et
          chaque activite listee est couverte par une assurance adaptee. Format
          « page » : l'adresse du passeport est celle de cette page, l'afficher
          n'apprendrait rien.
        */}
        <SealBadge format="page" activities={trades} />
      </header>

      <section className="flex flex-col gap-4">
        <Heading level={3} as="h2">
          Activités vérifiées
        </Heading>
        <Text size="sm" tone="soft">
          Pour chacune, nous avons relevé une attestation d’assurance adaptée à l’activité et nous
          affichons son échéance. C’est ce que nous avons vérifié, et rien de plus.
        </Text>
        <CoveredActivities activities={profile.activities} />
      </section>

      {profile.qualifications.length > 0 && (
        <section className="flex flex-col gap-4">
          <Heading level={3} as="h2">
            Qualifications
          </Heading>
          <Qualifications qualifications={profile.qualifications} />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <Heading level={3} as="h2">
          Contacter cette entreprise
        </Heading>
        <ContactForm companyId={profile.companyId} legalName={profile.legalName} />
      </section>

      {/* Mentions imposees par l'article L243-2 du Code des assurances. */}
      <section className="flex flex-col gap-0.5 border-t border-rule pt-5">
        <Text size="label" tone="muted">
          Assurance professionnelle
        </Text>
        <Text size="sm" tone="muted">
          {profile.insurer.name}
        </Text>
        <Text size="sm" tone="muted">
          Contrat n° {profile.insurer.policyNumber}
        </Text>
        {profile.insurer.validUntil && (
          <Text size="sm" tone="muted">
            Valide jusqu’au <DateText value={profile.insurer.validUntil} format="short" />
          </Text>
        )}
      </section>
    </PublicShell>
  )
}
