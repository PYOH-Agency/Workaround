import { MENTION_GROUP_LABELS, type MentionGroup } from '@/domain/legal-mentions'
import { Badge } from '@/ui/atoms/badge'
import { Button } from '@/ui/atoms/button'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { SectionHeader } from '@/ui/molecules/section-header'
import type { Establishment } from '@/services/company-lookup'

/**
 * Le deuxieme temps, et l'element signature de tout l'onboarding.
 *
 * Ce bloc n'est pas une fiche de confirmation : **c'est l'en-tete legal des
 * futurs devis de cette entreprise**, montre avant qu'elle n'ait rien saisi.
 * Il convertit, il explique le produit, et il annonce le travail restant — les
 * memes trois lignes que la liste de premiers pas. Personne n'est perdu parce
 * que personne n'est surpris.
 *
 * Aucun etat, aucun evenement autre que ceux du parent : le fichier n'a pas
 * besoin de 'use client', il entre dans le paquet client par son parent.
 *
 * **C'est ici que les deux publics de la page divergent.** Le visiteur anonyme
 * passe a l'etape 3 pour prouver son adresse par la boite aux lettres ; celui
 * qui est deja connecte l'a deja prouvee, et son entreprise se cree sur ce
 * bouton. Le libelle ne change pas : il enonce le meme engagement.
 */
export function ConfirmStep({
  establishment,
  missing,
  error,
  pending = false,
  onConfirm,
  onReject,
}: {
  establishment: Establishment
  missing: MentionGroup[]
  /** Le refus tardif : l'etablissement a cesse, ou l'entreprise vient d'etre prise. */
  error?: string
  pending?: boolean
  onConfirm: () => void
  onReject: () => void
}) {
  return (
    <>
      <SectionHeader as="h1" label="Étape 2 sur 3" title="C’est bien votre entreprise ?" />

      <Card elevation="e2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Text as="p">
              <strong>{establishment.legalName}</strong>
            </Text>
            {/*
              `neutral`, pas `verified` : nous n'avons rien verifie, nous
              repetons ce que dit le repertoire. Le sceau de verification se
              merite ailleurs, et le confondre avec un echo d'annuaire viderait
              de sens la seule promesse du produit.
            */}
            {establishment.rge ? (
              <Badge tone="neutral" icon={<Icon name="document" size="sm" />}>
                RGE
              </Badge>
            ) : null}
          </div>

          <Text size="sm" tone="soft">
            {[establishment.legalFormLabel, `SIRET ${establishment.siret}`]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {establishment.vatNumber ? (
            <Text size="sm" tone="soft">
              TVA {establishment.vatNumber}
            </Text>
          ) : null}
          <Text size="sm" tone="soft">
            {establishment.addressLine1}, {establishment.postalCode} {establishment.city}
          </Text>

          {missing.length > 0 ? (
            <div className="mt-3 flex flex-col gap-1 border-t border-rule pt-3">
              {missing.map((group) => (
                <div key={group} className="flex justify-between gap-4">
                  <Text size="sm" tone="muted" as="span">
                    {MENTION_GROUP_LABELS[group]}
                  </Text>
                  <Text size="sm" tone="muted" as="span">
                    à compléter
                  </Text>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <Text size="sm" tone="soft">
        Voilà l’en-tête de vos devis. Les lignes grises sont obligatoires — on s’en occupe une fois
        entré.
      </Text>

      {error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button type="button" size="lg" pending={pending} onClick={onConfirm}>
          C’est bien mon entreprise
        </Button>
        <Button type="button" tone="ghost" onClick={onReject}>
          Ce n’est pas la bonne
        </Button>
      </div>
    </>
  )
}
