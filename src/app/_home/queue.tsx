import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { TaskRow } from '@/ui/molecules/task-row'
import type { Task } from '@/domain/home-queue'

/** Au-dela, la file annonce le reste plutot que de le taire. */
const VISIBLE = 8

/**
 * Le delai se lit sur son sens, pas sur la nature de la ligne.
 *
 * Brancher sur `kind` obligerait cet ecran a savoir lesquelles des quatre
 * natures comptent a rebours — un savoir qui vit deja dans le domaine.
 */
function when(task: Task): string {
  if (task.delay.sense === 'elapsed') return `${task.delay.days} j`
  return task.delay.days >= 0 ? `dans ${task.delay.days} j` : 'expirée'
}

/**
 * L'en-tete reste meme file vide, mais seulement pour qui peut agir.
 *
 * `canWrite` porte `quote.write` : la bande ne rend `null` que si la file est
 * vide ET que l'artisan n'a rien a y faire — le compagnon sans capacite ne
 * voit toujours rien, la table du §3 de la spec est preservee. L'artisan a
 * jour, lui, garde l'en-tete, une ligne sobre, et le bouton permanent : c'est
 * l'action la plus disponible precisement quand il a le plus de temps pour
 * s'en servir.
 */
export function Queue({ tasks, canWrite }: { tasks: Task[]; canWrite: boolean }) {
  if (tasks.length === 0 && !canWrite) return null

  const shown = tasks.slice(0, VISIBLE)
  const hidden = tasks.length - shown.length

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-6">
        <Heading level={3} as="h2">
          Ce qui m’attend
        </Heading>
        <ButtonLink href="/devis/nouveau" tone="secondary">
          Établir un devis
        </ButtonLink>
      </div>

      {shown.length === 0 ? (
        <Text size="sm" tone="muted" as="p">
          Rien qui presse aujourd’hui.
        </Text>
      ) : (
        <ul className="flex flex-col border-t border-rule">
          {shown.map((task, index) => (
            <TaskRow
              key={task.id}
              when={when(task)}
              title={task.title}
              detail={task.detail}
              amountInclTax={task.amountInclTax}
              href={task.href}
              action={task.action}
              urgent={index === 0}
              solid={task.kind === 'certificate'}
            />
          ))}
        </ul>
      )}

      {hidden > 0 ? (
        <Text size="sm" tone="muted" as="p">
          et {hidden} autres
        </Text>
      ) : null}
    </section>
  )
}
