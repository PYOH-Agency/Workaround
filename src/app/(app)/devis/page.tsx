import Link from 'next/link'
import { redirect } from 'next/navigation'
import { entrepriseCourante, ErreurSession } from '@/lib/session'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { entreprise } from '@/db/schema'

/**
 * Ecran d'accueil de l'espace entreprise.
 *
 * Volontairement minimal : la redaction de devis arrive en Task 11. Il existe
 * pour que le parcours inscription -> espace soit verifiable de bout en bout
 * des maintenant.
 */
export default async function Devis() {
  let session
  try {
    session = await entrepriseCourante()
  } catch (e) {
    if (e instanceof ErreurSession) {
      redirect(e.message.includes('Aucune entreprise') ? '/inscription' : '/connexion')
    }
    throw e
  }

  const [ent] = await db.select().from(entreprise).where(eq(entreprise.id, session.entrepriseId))

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">{ent.raisonSociale}</h1>
        <p className="mt-1 text-sm opacity-70">
          SIRET {ent.siret} · {ent.ville}
        </p>
      </div>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="font-medium">Vos devis</h2>
        <p className="mt-2 text-sm opacity-70">Aucun devis pour l’instant.</p>
        <Link
          href="/devis/nouveau"
          className="mt-4 inline-block rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Créer un devis
        </Link>
      </section>
    </main>
  )
}
