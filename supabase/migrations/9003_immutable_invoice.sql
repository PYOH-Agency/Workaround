-- Une facture emise ne se modifie ni ne se supprime : c'est une obligation
-- comptable. Une erreur se corrige par un avoir, qui est lui-meme une facture.
-- Comme pour le journal d'evenements, la regle est imposee par la base et non
-- par une convention de code : une convention se contourne par accident.
--
-- Les lignes suivent le meme sort : modifier une ligne reviendrait a modifier
-- la facture.
--
-- Le compteur de sequence, lui, reste mutable — c'est sa raison d'etre.

CREATE OR REPLACE FUNCTION reject_invoice_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Une facture emise est immuable : emettez un avoir';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_immutable
BEFORE UPDATE OR DELETE ON invoice
FOR EACH ROW EXECUTE FUNCTION reject_invoice_mutation();

CREATE TRIGGER invoice_line_immutable
BEFORE UPDATE OR DELETE ON invoice_line
FOR EACH ROW EXECUTE FUNCTION reject_invoice_mutation();
