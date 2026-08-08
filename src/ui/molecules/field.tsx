import { useId } from 'react'

/**
 * Cable l'accessibilite d'un champ, et personne d'autre ne le fait.
 *
 * Genere l'`id`, relie le `label`, branche `aria-describedby` sur l'aide et
 * l'erreur, pose `aria-invalid`. Un controle de saisie nu, hors d'un `Field`,
 * est un defaut de revue.
 *
 * `children` est une fonction plutot qu'un element clone : ainsi TypeScript
 * verifie que le controle accepte reellement les attributs qu'on lui passe.
 *
 * `useId` fonctionne au rendu serveur — c'est meme sa raison d'etre : produire
 * un identifiant stable entre serveur et client. Aucun 'use client' necessaire.
 */

type ControlProps = {
  id: string
  required: boolean
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

export function Field({
  label,
  help,
  error,
  required = false,
  layout = 'stack',
  children,
}: {
  label: string
  help?: string
  error?: string
  required?: boolean
  /** `checkbox` place l'etiquette a droite et lui fait porter les 44 px de cible tactile. */
  layout?: 'stack' | 'checkbox'
  children: (props: ControlProps) => React.ReactNode
}) {
  const id = useId()
  const helpId = help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined

  const control = children({
    id,
    required,
    'aria-describedby': [helpId, errorId].filter(Boolean).join(' ') || undefined,
    'aria-invalid': error ? true : undefined,
  })

  /**
   * L'asterisque vit **en dehors** de l'element `<label>`, et c'est structurant.
   *
   * `aria-hidden` ne suffit pas : Playwright resout `getByLabel` sur le contenu
   * texte de l'etiquette, pas sur le nom accessible calcule. Une asterisque
   * placee dans le label donnait « Client * », et les correspondances exactes
   * echouaient — verifie a l'execution, pas suppose.
   *
   * Aucune doublure « (obligatoire) » en `sr-only` non plus : l'attribut
   * `required` pose sur le controle est deja annonce par tous les lecteurs
   * d'ecran, et elle polluerait le nom accessible.
   */
  const requiredMark = required ? (
    <span className="text-danger" aria-hidden="true">
      *
    </span>
  ) : null

  const messages = (
    <>
      {help ? (
        <p id={helpId} className="text-xs text-ink-muted">
          {help}
        </p>
      ) : null}
      {/* `role="alert"` fait annoncer l'erreur des son apparition, sans voler le focus. */}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </>
  )

  if (layout === 'checkbox') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex min-h-11 items-center gap-1">
          <label htmlFor={id} className="flex items-center gap-3 text-sm text-ink">
            {control}
            <span>{label}</span>
          </label>
          {requiredMark}
        </div>
        {messages}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-1">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {requiredMark}
      </div>
      {control}
      {messages}
    </div>
  )
}
