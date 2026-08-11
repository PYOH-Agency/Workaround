import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'

/**
 * L'en-tete d'un ecran de travail.
 *
 * Le bloc titre etait recopie sur les treize ecrans, avec trois espacements
 * differents. Plus genant : le retour vivait **en bas de page**, apres le
 * contenu. Un retour place la n'est lu que par qui a deja fini de lire — or on
 * revient surtout quand on s'est trompe d'ecran, c'est-a-dire avant.
 *
 * `back` est un lien et non un bouton : c'est une navigation vers une adresse
 * connue, pas un `history.back()` qui renverrait ailleurs selon d'ou l'on
 * vient. Le libelle nomme la destination — « Retour au devis », jamais
 * « Retour » seul, qui n'apprend rien.
 *
 * `title` passe toujours par `Heading level={1}` : chaque ecran a un et un seul
 * titre de premier niveau, et c'est ce composant qui le garantit.
 */
export function PageHeader({
  back,
  title,
  subtitle,
  actions,
}: {
  back?: { href: string; label: string }
  title: string
  /**
   * `React.ReactNode` et non `string` : plusieurs ecrans y posent un lien ou un
   * montant. Reste une ligne — ce qui deborde appartient au contenu.
   */
  subtitle?: React.ReactNode
  /** L'action principale de l'ecran, alignee au titre plutot que sous lui. */
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-col gap-1">
        {back ? (
          <Link href={back.href} tone="bare">
            <span className="inline-flex min-h-8 items-center gap-1.5 text-sm">
              <Icon name="back" size="sm" />
              {back.label}
            </span>
          </Link>
        ) : null}

        <Heading level={1}>{title}</Heading>

        {subtitle ? (
          <Text size="sm" tone="soft" as="div">
            {subtitle}
          </Text>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}
