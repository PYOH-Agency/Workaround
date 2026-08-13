import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  appointment,
  chantierPhoto,
  chantierPost,
  company,
  invoice,
  payment,
  project,
  quote,
  signature,
} from '@/db/schema'
import { buildTimeline, type TimelineEntry } from '@/domain/timeline'
import { guaranteeDeadlines, type Deadline } from '@/domain/guarantees'
import { quoteVersions } from '@/services/amendments'

export interface ChantierFile {
  quoteId: string
  number: string
  companyName: string
  committedLeadTimeDays: number | null
  completedAt: Date | null
  receivedAt: Date | null
  /** Les reserves emises a la reception. `null` = reception sans reserve. */
  reserves: string | null
  /** La levee des reserves, si declaree. */
  reservesLiftedAt: Date | null
  timeline: TimelineEntry[]
  /** `null` sans reception declaree : aucune date n'est affirmee. */
  deadlines: Deadline[] | null
  documents: { label: string; href: string }[]
}

interface Head {
  id: string
  number: string
  publicToken: string
  companyName: string
  signedAt: Date | null
  completedAt: Date | null
  receivedAt: Date | null
  reserves: string | null
  reservesLiftedAt: Date | null
  committedLeadTimeDays: number | null
}

/**
 * Le dossier d'un chantier, ouvert au SIGNATAIRE du devis.
 *
 * **L'exclusion est portee par la requete** : la jointure sur `signature` est
 * la condition d'acces, pas un filtre applique ensuite. Un ecran qui
 * l'oublierait ouvrirait le chantier d'un tiers.
 */
export async function chantierFileFor(
  requesterId: string,
  quoteId: string,
): Promise<ChantierFile | null> {
  const [head] = await db
    .select(HEAD)
    .from(signature)
    .innerJoin(quote, eq(quote.id, signature.quoteId))
    .innerJoin(company, eq(company.id, quote.companyId))
    .where(and(eq(signature.requesterId, requesterId), eq(signature.quoteId, quoteId)))

  return head ? assemble(head) : null
}

/**
 * Le MEME dossier, vu par l'entreprise qui tient le chantier.
 *
 * L'assemblage est partage a dessein : deux assemblages divergeraient, et
 * l'artisan cesserait de voir ce que voit son client — ce qui est la moitie de
 * l'interet de l'ecran.
 */
export async function companyChantierFile(
  companyId: string,
  quoteId: string,
): Promise<ChantierFile | null> {
  const [head] = await db
    .select(HEAD)
    .from(quote)
    .innerJoin(company, eq(company.id, quote.companyId))
    .where(and(eq(quote.companyId, companyId), eq(quote.id, quoteId)))

  return head ? assemble(head) : null
}

const HEAD = {
  id: quote.id,
  number: quote.number,
  publicToken: quote.publicToken,
  companyName: company.legalName,
  signedAt: quote.signedAt,
  completedAt: quote.completedAt,
  receivedAt: quote.receivedAt,
  reserves: quote.receptionReserves,
  reservesLiftedAt: quote.reservesLiftedAt,
  committedLeadTimeDays: quote.committedLeadTimeDays,
}

async function assemble(head: Head): Promise<ChantierFile | null> {
  if (!head.signedAt) return null

  const [versions, invoices, posts] = await Promise.all([
    quoteVersions(head.id),
    db
      .select({
        type: invoice.type,
        issuedAt: invoice.issuedAt,
        totalInclTax: invoice.totalInclTax,
        number: invoice.number,
        publicToken: invoice.publicToken,
      })
      .from(invoice)
      .where(eq(invoice.quoteId, head.id))
      .orderBy(asc(invoice.issuedAt)),
    db
      .select({ id: chantierPost.id, body: chantierPost.body, createdAt: chantierPost.createdAt })
      .from(chantierPost)
      .where(eq(chantierPost.quoteId, head.id))
      .orderBy(asc(chantierPost.createdAt)),
  ])

  // Bornees aux publications de CE chantier : une selection sans filtre
  // ramenerait les photos de tous les logements de la base.
  const photos = posts.length
    ? await db
        .select({ postId: chantierPhoto.postId, storagePath: chantierPhoto.storagePath })
        .from(chantierPhoto)
        .where(
          inArray(
            chantierPhoto.postId,
            posts.map((post) => post.id),
          ),
        )
    : []

  const received = await db
    .select({ receivedAt: payment.receivedAt, amount: payment.amount })
    .from(payment)
    .innerJoin(invoice, eq(invoice.id, payment.invoiceId))
    .where(eq(invoice.quoteId, head.id))

  /*
    Le devis porte le chantier, le rendez-vous porte le PROJET. Un projet
    pouvant porter plusieurs devis, un rendez-vous apparaitrait alors dans deux
    dossiers ; en P1 un projet n'a qu'une chaine de versions. Le corriger
    supposerait de poser le rendez-vous sur le devis, ce qui le rendrait
    impossible avant le premier devis — c'est-a-dire pour une visite.

    `scheduled` seulement : la chronologie du client ne lui promet pas une
    visite qui n'aura pas lieu.
  */
  const meetings = await db
    .select({ at: appointment.startsAt })
    .from(appointment)
    .innerJoin(project, eq(project.id, appointment.projectId))
    .innerJoin(quote, eq(quote.projectId, project.id))
    .where(and(eq(quote.id, head.id), eq(appointment.status, 'scheduled')))

  const timeline = buildTimeline({
    signedAt: head.signedAt,
    completedAt: head.completedAt,
    // La version 1 est le devis d'origine : elle est deja la premiere entree.
    amendments: versions
      .filter((v) => v.version > 1 && v.status === 'signed' && v.signedAt !== null)
      .map((v) => ({ version: v.version, signedAt: v.signedAt! })),
    invoices,
    payments: received,
    posts: posts.map((post) => ({
      createdAt: post.createdAt,
      body: post.body,
      photoPaths: photos.filter((p) => p.postId === post.id).map((p) => p.storagePath),
    })),
    appointments: meetings,
  })

  return {
    quoteId: head.id,
    number: head.number,
    companyName: head.companyName,
    committedLeadTimeDays: head.committedLeadTimeDays,
    completedAt: head.completedAt,
    receivedAt: head.receivedAt,
    reserves: head.reserves,
    reservesLiftedAt: head.reservesLiftedAt,
    timeline,
    deadlines: guaranteeDeadlines(head.receivedAt),
    // Les PDF existent depuis M1 et M2 : le dossier n'en fabrique aucun, il
    // renvoie aux liens que le client a deja recus.
    documents: [
      { label: `Devis ${head.number}`, href: `/d/${head.publicToken}/pdf` },
      ...invoices.map((i) => ({
        label: `${i.type === 'credit_note' ? 'Avoir' : 'Facture'} ${i.number}`,
        href: `/f/${i.publicToken}/pdf`,
      })),
    ],
  }
}
