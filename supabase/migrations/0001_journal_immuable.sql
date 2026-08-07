-- Le journal d'evenements est la source unique des metriques du passeport.
-- Son immuabilite ne peut pas etre une convention de code : elle est imposee
-- par la base, pour que personne — y compris nous — ne puisse reecrire
-- l'historique sur lequel repose la reputation d'une entreprise.

CREATE OR REPLACE FUNCTION refuser_modification_evenement()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Le journal d''evenements est append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evenement_immuable
BEFORE UPDATE OR DELETE ON evenement
FOR EACH ROW EXECUTE FUNCTION refuser_modification_evenement();
