/**
 * Messages neutres des formulaires publics.
 *
 * Isoles hors de `public.ts` : ce dernier porte la directive `'use server'`
 * en tete de fichier, et une telle marque interdit d'exporter autre chose que
 * des fonctions async (regle React, verifiee a l'execution par ce Next.js).
 * `QUOTE_LINK_CONFIRMATION` est une chaine constante, elle vit donc a part.
 */
export const QUOTE_LINK_CONFIRMATION =
  'Si un devis a été envoyé à cette adresse, vous allez le recevoir.'
