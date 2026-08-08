import { cn } from '@/ui/cn'

const SHADOWS = {
  flat: '',
  e1: 'shadow-e1 dark:shadow-none',
  e2: 'shadow-e2 dark:shadow-none',
} as const

/**
 * Une surface elevee.
 *
 * En mode sombre les ombres sont retirees : une ombre noire sur fond sombre est
 * invisible. L'elevation s'y exprime par une surface plus claire que le fond et
 * par la bordure, qui reste presente dans les deux themes.
 */
export function Card({
  elevation = 'e1',
  as: Tag = 'div',
  children,
}: {
  elevation?: keyof typeof SHADOWS
  as?: 'div' | 'section' | 'article' | 'li'
  children: React.ReactNode
}) {
  return (
    <Tag className={cn('rounded-card border border-rule bg-card p-5', SHADOWS[elevation])}>
      {children}
    </Tag>
  )
}
