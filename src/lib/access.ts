import { assertCan, type Capability } from '@/domain/authorization'
import { currentCompany, type Session } from './session'

/**
 * La session, ET la capacite verifiee.
 *
 * A appeler a la place de `currentCompany()` dans toute action qui fait plus
 * que lire. Le refus remonte tel quel : `AccessError` porte sa raison — plan ou
 * role —, et l'appelant s'en sert pour repondre autrement dans chaque cas.
 *
 * Deliberement minuscule : toute la decision vit dans la table des capacites,
 * qui est pure et testee exhaustivement. Ce qui se verifie ici, c'est seulement
 * qu'on a bien appele — et cela se verifie de bout en bout.
 */
export async function requireCapability(capability: Capability): Promise<Session> {
  const session = await currentCompany()
  assertCan(session, capability)
  return session
}
