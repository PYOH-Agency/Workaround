import { cn } from '@/ui/cn'
import { controlStyle } from './input'

type TextareaProps = Omit<React.ComponentProps<'textarea'>, 'className' | 'style'>

export function Textarea({ rows = 3, ...props }: TextareaProps) {
  return <textarea {...props} rows={rows} className={cn(controlStyle, 'resize-y')} />
}
