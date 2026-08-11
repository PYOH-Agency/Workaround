import { notFound } from 'next/navigation'
import { desc, ilike, or, type SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { currentStaff } from '@/lib/staff-session'
import { SessionError } from '@/lib/session'
import { Badge } from '@/ui/atoms/badge'
import { Button } from '@/ui/atoms/button'
import { Icon } from '@/ui/atoms/icon'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { EmptyState } from '@/ui/molecules/empty-state'
import { Field } from '@/ui/molecules/field'
import { PageHeader } from '@/ui/molecules/page-header'
import { DataTable } from '@/ui/organisms/data-table'
import { AdminShell } from '@/ui/shells/admin-shell'
import { PlanButton } from './PlanButton'

const LIMIT = 200

/**
 * Les entreprises inscrites, et leur abonnement.
 *
 * Un ecran de gestion, pas un tableau de bord : aucune courbe, aucun compteur.
 * La seule question a laquelle il repond est « cette entreprise a-t-elle
 * l'offre Pro ? », et le seul geste qu'il offre est d'y repondre.
 *
 * **Le filtre est cote base et non cote client**, parce que la liste est bornee
 * a 200 lignes : filtrer apres la coupe aurait cherche dans les 200 dernieres
 * inscrites, jamais dans les autres — un filtre qui ne trouve pas ce qui existe
 * est pire que pas de filtre.
 */
export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  try {
    await currentStaff()
  } catch (e) {
    if (e instanceof SessionError) notFound()
    throw e
  }

  const { q } = await searchParams
  const needle = q?.trim() ?? ''

  // Le SIRET se cherche colle ou espace, selon qu'il vient d'un courriel ou
  // d'une saisie a la main.
  const filter: SQL | undefined =
    needle.length > 0
      ? or(
          ilike(company.legalName, `%${needle}%`),
          ilike(company.siret, `%${needle.replace(/\s/g, '')}%`),
        )
      : undefined

  const companies = await db
    .select({
      id: company.id,
      legalName: company.legalName,
      siret: company.siret,
      plan: company.plan,
    })
    .from(company)
    .where(filter)
    .orderBy(desc(company.createdAt))
    .limit(LIMIT)

  return (
    <AdminShell>
      <PageHeader
        title="Entreprises"
        subtitle="L’abonnement se bascule ici, à la main. Aucun encaissement n’est automatisé."
      />

      {/* Formulaire en GET : la recherche est une adresse, donc elle se partage
          et se recharge. Une action serveur aurait rendu le resultat introuvable
          au rafraichissement. */}
      <form className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-sm">
          <Field label="Chercher une entreprise">
            {(p) => (
              <Input {...p} type="search" name="q" defaultValue={needle} placeholder="Nom ou SIRET" />
            )}
          </Field>
        </div>
        <Button type="submit" tone="secondary">
          <Icon name="search" size="sm" />
          Chercher
        </Button>
      </form>

      {companies.length === 0 ? (
        /* `action` est requis par le composant : `null` quand il n'y a rien à proposer. */
        <EmptyState
          title={needle ? 'Aucune entreprise ne correspond' : 'Aucune entreprise inscrite'}
          description={
            needle
              ? 'Vérifiez le nom ou le SIRET, ou videz la recherche pour retrouver la liste.'
              : 'La première inscription apparaîtra ici.'
          }
          action={null}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <DataTable
            testId="liste-entreprises"
            caption="Les entreprises inscrites et leur abonnement"
            columns={[
              { label: 'Entreprise' },
              { label: 'Abonnement' },
              { label: 'Action', hideLabel: true, align: 'right' },
            ]}
            rows={companies.map((row) => ({
              id: row.id,
              cells: [
                <div key="who" className="flex flex-col gap-0.5">
                  <Text as="span">{row.legalName}</Text>
                  <Text size="sm" tone="muted" as="span">
                    SIRET {row.siret}
                  </Text>
                </div>,
                /* `icon` est obligatoire : la couleur ne porte jamais seule
                   l'information. */
                <Badge
                  key="plan"
                  tone={row.plan === 'pro' ? 'verified' : 'neutral'}
                  icon={<Icon name={row.plan === 'pro' ? 'check' : 'clock'} size="sm" />}
                >
                  {row.plan === 'pro' ? 'Pro' : 'Gratuit'}
                </Badge>,
                <div key="do" className="flex justify-end">
                  <PlanButton companyId={row.id} companyName={row.legalName} plan={row.plan} />
                </div>,
              ],
            }))}
          />

          {/* Une coupe silencieuse ferait croire que la liste est complete. */}
          {companies.length === LIMIT && (
            <Text size="sm" tone="muted">
              Les {LIMIT} inscriptions les plus récentes. Cherchez par nom ou SIRET pour atteindre
              les autres.
            </Text>
          )}
        </div>
      )}
    </AdminShell>
  )
}
