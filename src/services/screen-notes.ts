import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { screenNoteDismissal } from '@/db/schema'
import { SCREEN_NOTES, type ScreenNoteKey } from '@/domain/screen-notes'
import { recordEvent } from '@/services/events'

/**
 * Ce que cette personne a deja referme.
 *
 * Un ensemble et non une liste : l'ecran ne pose qu'une question, « celle-ci
 * est-elle fermee ? », et il la pose une fois par page.
 *
 * Le type reste `string` : la base peut porter la cle d'un ecran retire du
 * catalogue depuis, et l'annoncer `ScreenNoteKey` serait une promesse que la
 * table ne tient pas. Une cle inconnue ne repond simplement a aucune carte.
 */
export async function dismissedNotes(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ noteKey: screenNoteDismissal.noteKey })
    .from(screenNoteDismissal)
    .where(eq(screenNoteDismissal.userId, userId))

  return new Set(rows.map((row) => row.noteKey))
}

/**
 * Refermer, c'est ecrire la ligne.
 *
 * `onConflictDoNothing` parce que le geste se repete sans le vouloir : deux
 * clics sur un reseau lent, ou la meme carte fermee dans deux onglets. Le
 * second appel ne doit pas remonter une violation de cle primaire jusqu'a
 * l'ecran, et il n'a rien a rafraichir non plus — c'est la premiere fermeture
 * qui fait foi.
 *
 * **Le fait n'est consigne que si la ligne est nee** (spec §7). Le seuil des
 * deux mois se lit en parts de personnes, pas en clics : compter le second
 * onglet gonflerait le numerateur sans qu'une carte de plus ait ete lue, et le
 * journal etant ineffacable, l'erreur ne se rattraperait pas.
 */
export async function dismissNote(userId: string, noteKey: ScreenNoteKey): Promise<void> {
  const inserted = await db
    .insert(screenNoteDismissal)
    .values({ userId, noteKey })
    .onConflictDoNothing()
    .returning({ noteKey: screenNoteDismissal.noteKey })

  if (inserted.length === 0) return

  await recordEvent({
    type: 'note.dismissed',
    // Le sujet est le compte : la cle d'ecran n'est pas un UUID, et cette table
    // n'est adossee a rien d'autre qu'`auth.users`.
    subjectType: 'user',
    subjectId: userId,
    // Deduit du catalogue, seule chose que ce service sache du public : les
    // deux coquilles appellent la meme action, qui ne lui passe qu'un compte.
    actorType: SCREEN_NOTES[noteKey].audience === 'company' ? 'company' : 'customer',
    actorId: userId,
    // La cle, et rien d'autre. Un declencheur rend le journal ineffacable : y
    // ecrire une adresse ou un nom rendrait le droit a l'effacement
    // structurellement impossible a honorer. L'identifiant, lui, est deja dans
    // `actor_id`.
    payload: { key: noteKey },
  })
}

/**
 * « Revoir les explications » : on efface les rejets, on n'en pose pas un
 * second drapeau. Deux mecanismes pour un meme etat divergeraient (spec §4).
 *
 * **Le filtre sur `userId` est porte par la requete.** L'oublier ne casserait
 * aucun test qui ne le cherche pas : le geste ferait exactement ce qu'on
 * attend chez celui qui le declenche, et rouvrirait au passage les notices de
 * tout le monde.
 */
export async function reopenNotes(userId: string): Promise<void> {
  await db.delete(screenNoteDismissal).where(eq(screenNoteDismissal.userId, userId))
}
