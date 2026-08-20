'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Link } from '@/ui/atoms/link'
import { Separator } from '@/ui/atoms/separator'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { SectionHeader } from '@/ui/molecules/section-header'
import { lookupForSignUp, type LookupState } from './actions'

const initialState: LookupState = {}

/**
 * Le premier temps.
 *
 * L'aide du champ dit **ou trouver le SIRET**, pas son format : personne ne
 * bloque sur « quatorze chiffres », on bloque sur « c'est lequel, deja, le
 * SIRET ou le SIREN ». Le format est porte par le `placeholder`.
 *
 * La sortie du bas recupere l'invite : `claimInvitation` court-circuite
 * l'inscription, mais rien ne le lui disait. Il saisissait le SIRET de son
 * patron et se faisait refuser pour « entreprise deja inscrite » — un message
 * exact et totalement decourageant.
 */
export function SiretStep({
  /**
   * Le SIRET deja trouve, quand on revient de l'etape 2 par « Ce n'est pas la
   * bonne ». Le champ vide obligerait a retaper quatorze chiffres pour corriger
   * un seul — c'est le genre de detail qui fait abandonner.
   */
  initialSiret = '',
  onFound,
}: {
  initialSiret?: string
  onFound: (state: LookupState) => void
}) {
  const [state, action, pending] = useActionState(
    async (previous: LookupState, form: FormData) => {
      const next = await lookupForSignUp(previous, form)
      if (next.found) onFound(next)
      return next
    },
    initialState,
  )

  return (
    <>
      <SectionHeader
        as="h1"
        label="Étape 1 sur 3"
        title="Votre entreprise, en 14 chiffres"
        lead="On lit le répertoire officiel des entreprises. Raison sociale, forme juridique, TVA, adresse : vous ne recopierez rien."
      />

      <form action={action} className="flex flex-col gap-5">
        <Field
          label="SIRET"
          help="Sur votre Kbis, vos factures, ou votre carte de visite."
          error={state.error}
          required
        >
          {(p) => (
            <Input
              {...p}
              name="siret"
              inputMode="numeric"
              defaultValue={initialSiret}
              placeholder="123 456 789 00012"
            />
          )}
        </Field>

        <Button type="submit" size="lg" pending={pending}>
          {pending ? 'Recherche…' : 'Continuer'}
        </Button>
      </form>

      <Separator />

      {/*
        La sortie sur sa propre ligne, comme sur `/connexion`.

        Au fil de la phrase, l'ancre ne faisait que 38 px de haut — sous les
        44 px que la charte impose. La detacher lui donne sa cible sans crever
        l'interligne d'un paragraphe, et aligne cet ecran sur la porte de retour,
        qui pose deja ses deux sorties ainsi.
      */}
      <div className="flex flex-col gap-2">
        <Text size="sm" tone="muted">
          On vous a invité à rejoindre une entreprise ?
        </Text>
        <Link href="/connexion" standalone>
          Connectez-vous
        </Link>
      </div>
    </>
  )
}
