import { notFound } from 'next/navigation'
import { currentStaff } from '@/lib/staff-session'
import { SessionError } from '@/lib/session'

/**
 * Le garde du groupe interne.
 *
 * **Il ne dispense d'aucun garde d'action serveur** : un layout ne s'interpose
 * pas devant une server action, et croire l'inverse est exactement ainsi qu'on
 * ouvre un back-office. Chaque page et chaque action sous `(admin)` continue
 * d'appeler `currentStaff` — `pnpm check:admin` echoue sinon.
 *
 * `notFound` plutot qu'une redirection : un artisan qui tombe sur cette adresse
 * n'a pas a apprendre qu'elle existe.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await currentStaff()
  } catch (e) {
    if (e instanceof SessionError) notFound()
    throw e
  }

  return children
}
