-- Un seul rang par chantier : « situation n° 3 » ne peut pas designer deux
-- declarations. Ecrit en index plutot qu'en verification applicative : deux
-- emissions simultanees liraient toutes deux « il y en a 2 » et creeraient deux
-- situations n° 3, ce qu'aucune relecture du code ne rattraperait ensuite.
CREATE UNIQUE INDEX situation_number_uq ON situation (quote_id, number);
