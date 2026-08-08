import { cn } from '@/ui/cn'

const SIZES = {
  md: 'text-base leading-[1.625]',
  sm: 'text-sm leading-[1.5]',
  label: 'text-[0.6875rem] leading-[0.875rem] font-semibold uppercase tracking-[0.08em]',
} as const

const TONES = {
  default: 'text-ink',
  soft: 'text-ink-soft',
  muted: 'text-ink-muted',
} as const

export function Text({
  size = 'md',
  tone = 'default',
  as: Tag = 'p',
  children,
}: {
  size?: keyof typeof SIZES
  tone?: keyof typeof TONES
  as?: 'p' | 'span' | 'div' | 'dt' | 'dd'
  children: React.ReactNode
}) {
  return <Tag className={cn(SIZES[size], TONES[tone])}>{children}</Tag>
}
