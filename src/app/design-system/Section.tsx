import { Heading } from '@/ui/atoms/heading'

/** Un bloc de la vitrine : un titre, et ce qu'il demontre. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <Heading level={2}>{title}</Heading>
      {children}
    </section>
  )
}
