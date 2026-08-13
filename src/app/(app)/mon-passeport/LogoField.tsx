'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { saveLogo, removeLogo, type LogoState } from './actions'

const initial: LogoState = {}

export function LogoField({ logoUrl }: { logoUrl: string | null }) {
  const [state, action, pending] = useActionState(saveLogo, initial)

  return (
    <Card elevation="flat">
      <div className="flex flex-col gap-3" data-testid="logo">
        <div className="flex flex-col gap-1">
          <Text size="label" tone="muted" as="h2">
            Logo
          </Text>
          <Text size="sm" tone="soft">
            Il apparaît sur votre fiche publique. PNG, JPEG ou WebP, 1 Mo maximum.
          </Text>
        </div>

        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- le socle n'utilise pas next/image
          <img
            src={logoUrl}
            alt="Votre logo"
            width={64}
            height={64}
            className="h-16 w-16 rounded-card object-contain"
          />
        ) : (
          <Text size="sm" tone="muted">
            Aucun logo pour l’instant.
          </Text>
        )}

        <form action={action} className="flex flex-col gap-2">
          <Input type="file" name="logo" accept="image/png,image/jpeg,image/webp" />
          {state.error && (
            <div
              role="alert"
              className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
            >
              {state.error}
            </div>
          )}
          <Button type="submit" tone="secondary" pending={pending}>
            {logoUrl ? 'Remplacer le logo' : 'Téléverser un logo'}
          </Button>
        </form>

        {logoUrl && (
          <form action={removeLogo}>
            <Button type="submit" tone="ghost">
              Retirer le logo
            </Button>
          </form>
        )}
      </div>
    </Card>
  )
}
