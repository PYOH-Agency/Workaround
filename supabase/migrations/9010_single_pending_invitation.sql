-- Une seule invitation EN ATTENTE par entreprise et par adresse.
--
-- Ecrite en index partiel plutot qu'en verification applicative : deux clics
-- simultanes sur « Inviter » creeraient sinon deux lignes, dont l'une resterait
-- en attente pour toujours dans la liste du patron. Les invitations acceptees
-- ou revoquees sont hors de l'index — reinviter quelqu'un qu'on a retire doit
-- rester possible.
CREATE UNIQUE INDEX member_invitation_pending_idx
  ON member_invitation (company_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
