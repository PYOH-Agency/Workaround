-- Une publication au fil de chantier est definitive.
--
-- L'artisan ecrit a son client : il doit savoir, en publiant, que ce qu'il
-- ecrit a ete lu et ne se reprend pas. Un fil reecrivable ne vaudrait rien
-- comme trace — et c'est la seule chose qui distingue ce fil d'une messagerie.
--
-- Une erreur se corrige par une publication qui la rectifie, comme un avoir
-- corrige une facture sans la modifier.
--
-- Les photos suivent : les detacher reviendrait a reecrire la publication.

CREATE OR REPLACE FUNCTION reject_post_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Une publication est definitive : publiez une rectification';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chantier_post_immutable
BEFORE UPDATE OR DELETE ON chantier_post
FOR EACH ROW EXECUTE FUNCTION reject_post_mutation();

CREATE TRIGGER chantier_photo_immutable
BEFORE UPDATE OR DELETE ON chantier_photo
FOR EACH ROW EXECUTE FUNCTION reject_post_mutation();
