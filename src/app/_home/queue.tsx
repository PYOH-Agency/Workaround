import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { TaskRow } from '@/ui/molecules/task-row'
import type { Task } from '@/domain/home-queue'

/** Au-delà, la file annonce le reste plutôt que de le taire. */
const VISIBLE = 8

/**
 * Le délai se lit sur son sens, pas sur la nature de la ligne.
 *
 * Brancher sur `kind` obligerait cet écran à savoir lesquelles des quatre
 * natures comptent à rebours — un savoir qui vit déjà dans le domaine.
 */
function when(task: Task): string {
  if (task.delay.sense === 'elapsed') return `${task.delay.days} j`
  return task.delay.days >= 0 ? `dans ${task.delay.days} j` : 'expirée'
}

export function Queue({ tasks }: { tasks: Task[] }) {
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

      {hidden > 0 ? (
        <Text size="sm" tone="muted" as="p">
          et {hidden} autres
        </Text>
      ) : null}
    </section>
  )
}
