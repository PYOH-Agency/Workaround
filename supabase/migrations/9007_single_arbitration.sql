-- Une contestation se repond UNE FOIS.
--
-- L'unicite par chantier est portee par la contrainte de la table ; celle de la
-- reponse ne peut pas l'etre, puisque la ligne nait sans verdict et en recoit un
-- ensuite. Sans ce declencheur, un double envoi du formulaire ou un defaut de
-- code reecrirait un arbitrage deja rendu — et personne ne le verrait.
--
-- Comme pour la facture et le journal d'evenements, la regle est imposee par la
-- base plutot que par une convention : une convention se contourne par accident.

CREATE OR REPLACE FUNCTION reject_dispute_rewrite()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Une contestation ne se supprime pas';
  END IF;

  IF OLD.verdict IS NOT NULL THEN
    RAISE EXCEPTION 'Cette contestation a deja ete arbitree';
  END IF;

  -- Le motif, le jeton et l'echeance sont figes a l'ouverture : seule la
  -- reponse du client s'ecrit ensuite. Repousser `expires_at` reviendrait a
  -- prolonger l'exclusion du chantier du calcul.
  IF NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.public_token IS DISTINCT FROM OLD.public_token
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.opened_at IS DISTINCT FROM OLD.opened_at
     OR NEW.quote_id IS DISTINCT FROM OLD.quote_id THEN
    RAISE EXCEPTION 'Seule la reponse du client peut etre ecrite';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER metric_dispute_single_arbitration
BEFORE UPDATE OR DELETE ON metric_dispute
FOR EACH ROW EXECUTE FUNCTION reject_dispute_rewrite();
