'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Checkbox } from '@/ui/atoms/checkbox'
import { Input } from '@/ui/atoms/input'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { requestAttestation, type RequestState } from './actions'

const initialState: RequestState = {}

/**
 * Le premier des deux chemins : nous ecrivons a l'entreprise, en son nom.
 *
 * **Le texte de succes ne promet que ce que nous savons tenir**, et il doit
 * rester vrai dans le cas ou rien n'est parti — l'action ne distingue pas un
 * envoi d'un refus, donc ce bloc s'affiche aussi sur un refus. Il ne peut donc
 * annoncer ni un mail parti, ni une notification a venir : il dit notre regle
 * de contact, qui est vraie dans tous les cas, et prepare au silence. Meme
 * exigence que `sendRequestConfirmation`, qui dit « nous venons d'ecrire » et
 * jamais « nous avons transmis » : ce qui est certain est le geste, pas sa
 * reception.
 */
export function RequestForm({ siret }: { siret: string }) {
  const [state, action, pending] = useActionState(requestAttestation, initialState)

  if (state.sent) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <Text>Nous nous en occupons.</Text>
        <Text size="sm" tone="soft">
          Nous écrivons à une entreprise au plus une fois par semaine, et jamais si elle nous a
          demandé de ne plus la solliciter. Une entreprise n’est pas tenue de nous répondre : sans
          nouvelle, demandez-lui directement son attestation.
        </Text>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="siret" value={siret} />
      <input type="hidden" name="channel" value="sent" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Votre prénom" error={state.errors?.requesterName} required>
          {(p) => <Input {...p} name="requesterName" autoComplete="given-name" />}
        </Field>
        <Field label="Votre e-mail" error={state.errors?.requesterEmail} required>
          {(p) => <Input {...p} name="requesterEmail" type="email" autoComplete="email" />}
        </Field>
        <Field
          label="E-mail de l’entreprise"
          help="Celui de son devis, de son site ou de sa carte."
          error={state.errors?.artisanEmail}
          required
        >
          {(p) => <Input {...p} name="artisanEmail" type="email" />}
        </Field>
      </div>

      {/*
        Cochee par defaut : le demandeur vient de lire que nous ne pouvons rien
        affirmer, et il n'a aucune raison de revenir voir tout seul. La
        decocher reste a un clic, et l'adresse ne sert alors qu'a l'envoi.
      */}
      <Field label="Prévenez-moi dès que son attestation est vérifiée" layout="checkbox">
        {(p) => <Checkbox {...p} name="notify" defaultChecked />}
      </Field>

      {state.errors?.siret && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.errors.siret}
        </div>
      )}

      <div className="self-start">
        <Button type="submit" tone="conversion" size="lg" pending={pending}>
          Demander l’attestation
        </Button>
      </div>

      {/*
        La phrase qui suit n'est pas une formalite : toute la base legale de
        l'envoi tient sur elle. Nous ecrivons a un artisan qui ne nous a rien
        demande, et ce qui rend cet envoi legitime est qu'il vient de quelqu'un
        avec qui il est reellement en affaires. Tant que rien ne le disait a
        l'ecran, saisir une adresse n'attestait de rien — et la mise en balance
        reposait sur un fait que rien n'etablissait.
      */}
      <Text size="sm" tone="muted">
        En envoyant, vous confirmez envisager des travaux avec cette entreprise. Nous lui écrivons
        en votre nom, avec votre prénom et votre e-mail pour qu’elle puisse vous répondre — au plus
        une fois par semaine, et jamais si elle nous a demandé de ne plus la solliciter.{' '}
        <Link href="/confidentialite" newTab>
          Protection des données
        </Link>
      </Text>
    </form>
  )
}
