-- Les besoins courants, dans les mots du demandeur.
--
-- C'est une DONNEE : elle s'enrichit par une nouvelle migration, sans toucher
-- au schema ni redeployer. Le catalogue de depart est volontairement court —
-- il grandira avec les recherches reellement faites, pas avec celles qu'on
-- imagine.
--
-- REGLE : un besoin, une activite. Un besoin qui en toucherait plusieurs
-- (« refaire une salle de bain ») ferait croire qu'un seul artisan couvre le
-- tout. Le multi-corps d'etat est P6.

INSERT INTO need (slug, label, activity_code) VALUES
  ('fuite-eau',            'Réparer une fuite d''eau',                  '30'),
  ('remplacer-chauffe-eau','Remplacer un chauffe-eau',                  '30'),
  ('installer-douche',     'Installer une douche ou une baignoire',     '30'),
  ('changer-chaudiere',    'Changer une chaudière',                     '31'),
  ('installer-pompe',      'Installer une pompe à chaleur',             '31'),
  ('poser-climatisation',  'Poser une climatisation',                   '33'),
  ('refaire-electricite',  'Refaire une installation électrique',       '34'),
  ('poser-tableau',        'Poser ou remplacer un tableau électrique',  '34'),
  ('changer-fenetres',     'Changer des fenêtres',                      '18'),
  ('poser-porte-entree',   'Poser une porte d''entrée',                 '18'),
  ('refaire-toiture',      'Refaire une toiture',                       '14'),
  ('reparer-fuite-toit',   'Réparer une fuite en toiture',              '14'),
  ('isoler-combles',       'Isoler des combles',                        '29'),
  ('isoler-murs',          'Isoler des murs',                           '29'),
  ('peindre-interieur',    'Repeindre un intérieur',                    '26'),
  ('poser-carrelage',      'Poser du carrelage',                        '28'),
  ('poser-parquet',        'Poser un parquet ou un sol souple',         '27'),
  ('poser-cloison',        'Poser une cloison ou un faux plafond',      '23'),
  ('poser-cuisine',        'Poser une cuisine',                         '18.1'),
  ('construire-mur',       'Construire un mur ou une extension',        '10'),
  ('ramoner-cheminee',     'Entretenir un conduit de cheminée',         '32'),
  ('creuser-piscine',      'Construire une piscine',                    '37'),
  ('amenager-jardin',      'Aménager un jardin',                        '4.1')
ON CONFLICT (slug) DO NOTHING;
